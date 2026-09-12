/**
 * lib/sms/service.ts — SMS sağlayıcı yönetim servisi.
 *
 * Sorumluluklar: yapılandırma çözümleme (şifreli DB → env yedeği), sağlayıcı
 * seçimi (manuel / öncelik / fallback / sağlık), otomatik devretme, idempotent
 * OTP gönderimi, sağlık ölçümü ve maskeli teslimat günlüğü.
 *
 * Uygulamanın geri kalanı yalnız `sendOtpSms()` / `sendSmsMessage()` çağırır.
 * DİKKAT: strictNullChecks kapalı → tüm sonuç tipleri DÜZ (flat) tutulur.
 */

import { prisma } from '@/lib/db'
import { SMS_PROVIDERS, getProviderMeta, type SmsProviderMeta } from './catalog'
import { getAdapter, type SmsConfig, type SmsSendResult, type SmsHealthResult, type SmsBalanceResult } from './adapters'
import { getSecret, getProviderConfig, getIntegrationSetting } from '@/lib/integration-secrets'
import { maskPhone, safeError } from '@/lib/log-redact'

export const SMS_SETTING_KEYS = {
  selectionMode: 'sms_selection_mode',      // manual | priority | fallback | health
  manualProvider: 'sms_manual_provider',
  errorRateThreshold: 'sms_error_rate_threshold', // yüzde
  minSamples: 'sms_min_samples',
  cooldownMinutes: 'sms_cooldown_minutes',
  timeoutMs: 'sms_timeout_ms',
  otpTemplate: 'sms_otp_template',
  dedupeSeconds: 'sms_dedupe_seconds',
} as const

export type SelectionMode = 'manual' | 'priority' | 'fallback' | 'health'

export type ProviderState = {
  key: string
  displayName: string
  region: string
  implemented: boolean
  enabled: boolean
  priority: number
  configured: boolean
  missingFields: string[]
  supportsOtp: boolean
  supportsSms: boolean
  supportsBalance: boolean
  liveHealthCheck: boolean
  coverage: string
  docsUrl: string
  notes?: string
  health: {
    status: 'healthy' | 'degraded' | 'disabled' | 'unknown'
    lastSuccessAt: Date | null
    lastFailureAt: Date | null
    lastTestedAt: Date | null
    lastUsedAt: Date | null
    lastError: string | null
    successCount: number
    failureCount: number
    fallbackUseCount: number
    avgLatencyMs: number
    cooldownUntil: Date | null
    errorRate: number
  }
}

// ── yapılandırma çözümleme ──────────────────────────────────────

/** Sağlayıcının tüm alanlarını çözer (secret alanlar şifreli depodan). */
export async function loadProviderConfig(providerKey: string): Promise<SmsConfig> {
  const meta = getProviderMeta(providerKey)
  const cfg: SmsConfig = {}
  if (!meta) return cfg
  for (const f of meta.fields) {
    let value: string | null = null
    if (f.secret) {
      value = await getSecret('sms', providerKey, f.key, f.envName)
    } else {
      value = await getProviderConfig(providerKey, f.key, f.envName)
    }
    if (value) cfg[f.key] = value
  }
  return cfg
}

export async function providerConfigStatus(providerKey: string): Promise<{ configured: boolean; missing: string[] }> {
  const adapter = getAdapter(providerKey)
  const meta = getProviderMeta(providerKey)
  if (!adapter || !meta || !meta.implemented) return { configured: false, missing: ['not_implemented'] }
  const cfg = await loadProviderConfig(providerKey)
  const v = adapter.validateConfig(cfg)
  return { configured: v.ok, missing: v.missing }
}

async function numSetting(key: string, fallback: number): Promise<number> {
  const raw = await getIntegrationSetting(key, String(fallback))
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export async function getSelectionMode(): Promise<SelectionMode> {
  const raw = (await getIntegrationSetting(SMS_SETTING_KEYS.selectionMode, 'fallback')).toLowerCase().trim()
  if (raw === 'manual' || raw === 'priority' || raw === 'health') return raw
  return 'fallback'
}

// ── sağlık ──────────────────────────────────────────────────────

function computeStatus(row: any, threshold: number, minSamples: number, enabled: boolean): 'healthy' | 'degraded' | 'disabled' | 'unknown' {
  if (!enabled) return 'disabled'
  if (!row) return 'unknown'
  if (row.cooldownUntil && new Date(row.cooldownUntil).getTime() > Date.now()) return 'disabled'
  const total = (row.successCount || 0) + (row.failureCount || 0)
  if (total < minSamples) return row.lastFailureAt && !row.lastSuccessAt ? 'degraded' : (total === 0 ? 'unknown' : 'healthy')
  const errRate = (row.failureCount / total) * 100
  if (errRate >= threshold) return 'degraded'
  return 'healthy'
}

async function recordHealth(
  providerKey: string,
  ok: boolean,
  latencyMs: number,
  errorCode: string | null,
  isFallback: boolean,
  isTest: boolean
) {
  try {
    const threshold = await numSetting(SMS_SETTING_KEYS.errorRateThreshold, 50)
    const minSamples = await numSetting(SMS_SETTING_KEYS.minSamples, 5)
    const cooldownMin = await numSetting(SMS_SETTING_KEYS.cooldownMinutes, 10)

    const existing = await prisma.smsProviderHealth.findUnique({ where: { providerKey } })
    const successCount = (existing?.successCount || 0) + (ok ? 1 : 0)
    const failureCount = (existing?.failureCount || 0) + (ok ? 0 : 1)
    const total = successCount + failureCount
    const prevAvg = existing?.avgLatencyMs || 0
    const prevTotal = (existing?.successCount || 0) + (existing?.failureCount || 0)
    const avgLatencyMs = Math.round((prevAvg * prevTotal + latencyMs) / Math.max(1, prevTotal + 1))

    let cooldownUntil: Date | null = existing?.cooldownUntil || null
    const errRate = total > 0 ? (failureCount / total) * 100 : 0
    if (!ok && total >= minSamples && errRate >= threshold) {
      cooldownUntil = new Date(Date.now() + cooldownMin * 60_000)
    }
    if (ok) cooldownUntil = null

    const status = ok ? 'healthy' : (cooldownUntil ? 'disabled' : 'degraded')

    const data: any = {
      status,
      successCount,
      failureCount,
      avgLatencyMs,
      cooldownUntil,
      fallbackUseCount: (existing?.fallbackUseCount || 0) + (isFallback ? 1 : 0),
    }
    if (ok) { data.lastSuccessAt = new Date(); data.lastError = null }
    else { data.lastFailureAt = new Date(); data.lastError = errorCode || 'unknown_error' }
    if (isTest) data.lastTestedAt = new Date()
    else data.lastUsedAt = new Date()

    await prisma.smsProviderHealth.upsert({
      where: { providerKey },
      create: { providerKey, ...data },
      update: data,
    })
  } catch (e) {
    safeError('sms-service', 'sağlık kaydı yazılamadı', e)
  }
}

async function logDelivery(entry: {
  providerKey: string
  phone: string
  purpose: string
  success: boolean
  errorCode?: string | null
  latencyMs: number
  isFallback: boolean
  isTest: boolean
  idempotencyKey?: string | null
  providerMessageId?: string | null
}) {
  try {
    await prisma.smsDeliveryLog.create({
      data: {
        providerKey: entry.providerKey,
        phoneMasked: maskPhone(entry.phone),
        purpose: entry.purpose,
        success: entry.success,
        errorCode: entry.errorCode || null,
        latencyMs: entry.latencyMs,
        isFallback: entry.isFallback,
        isTest: entry.isTest,
        idempotencyKey: entry.idempotencyKey || null,
        providerMessageId: entry.providerMessageId || null,
      },
    })
  } catch (e) {
    safeError('sms-service', 'teslimat günlüğü yazılamadı', e)
  }
}

// ── sağlayıcı listesi / durum ───────────────────────────────────

export async function listProviderStates(): Promise<ProviderState[]> {
  const threshold = await numSetting(SMS_SETTING_KEYS.errorRateThreshold, 50)
  const minSamples = await numSetting(SMS_SETTING_KEYS.minSamples, 5)

  let rows: any[] = []
  let healthRows: any[] = []
  try {
    rows = await prisma.smsProvider.findMany()
    healthRows = await prisma.smsProviderHealth.findMany()
  } catch (e) {
    safeError('sms-service', 'sağlayıcı tabloları okunamadı', e)
  }
  const rowMap = new Map(rows.map((r) => [r.providerKey, r]))
  const healthMap = new Map(healthRows.map((r) => [r.providerKey, r]))

  const out: ProviderState[] = []
  for (const meta of SMS_PROVIDERS) {
    const row = rowMap.get(meta.key)
    const h = healthMap.get(meta.key)
    const enabled = !!row?.enabled
    const st = await providerConfigStatus(meta.key)
    const total = (h?.successCount || 0) + (h?.failureCount || 0)
    out.push({
      key: meta.key,
      displayName: meta.displayName,
      region: meta.region,
      implemented: meta.implemented,
      enabled,
      priority: row?.priority ?? 100,
      configured: st.configured,
      missingFields: st.missing,
      supportsOtp: meta.supportsOtp,
      supportsSms: meta.supportsSms,
      supportsBalance: meta.supportsBalance,
      liveHealthCheck: meta.liveHealthCheck,
      coverage: meta.coverage,
      docsUrl: meta.docsUrl,
      notes: meta.notes,
      health: {
        status: computeStatus(h, threshold, minSamples, enabled),
        lastSuccessAt: h?.lastSuccessAt || null,
        lastFailureAt: h?.lastFailureAt || null,
        lastTestedAt: h?.lastTestedAt || null,
        lastUsedAt: h?.lastUsedAt || null,
        lastError: h?.lastError || null,
        successCount: h?.successCount || 0,
        failureCount: h?.failureCount || 0,
        fallbackUseCount: h?.fallbackUseCount || 0,
        avgLatencyMs: h?.avgLatencyMs || 0,
        cooldownUntil: h?.cooldownUntil || null,
        errorRate: total > 0 ? Math.round(((h?.failureCount || 0) / total) * 100) : 0,
      },
    })
  }
  out.sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key))
  return out
}

/** Gönderim için sıralı aday zinciri. */
export async function resolveProviderChain(): Promise<string[]> {
  const mode = await getSelectionMode()
  const states = await listProviderStates()
  const usable = states.filter((s) => s.implemented && s.enabled && s.configured)

  if (mode === 'manual') {
    const manual = (await getIntegrationSetting(SMS_SETTING_KEYS.manualProvider, '')).trim()
    const found = usable.find((s) => s.key === manual)
    return found ? [found.key] : []
  }
  if (mode === 'priority') {
    const first = usable[0]
    return first ? [first.key] : []
  }
  if (mode === 'health') {
    const ranked = [...usable].sort((a, b) => {
      const rank = (s: ProviderState) => (s.health.status === 'healthy' ? 0 : s.health.status === 'unknown' ? 1 : 2)
      return rank(a) - rank(b) || a.health.errorRate - b.health.errorRate || a.priority - b.priority
    })
    return ranked.map((s) => s.key)
  }
  // fallback: öncelik sırası, cooldown'daki sağlayıcılar sona atılır
  const ordered = [...usable].sort((a, b) => {
    const cd = (s: ProviderState) => (s.health.cooldownUntil && new Date(s.health.cooldownUntil).getTime() > Date.now() ? 1 : 0)
    return cd(a) - cd(b) || a.priority - b.priority
  })
  return ordered.map((s) => s.key)
}

export async function isSmsConfiguredAsync(): Promise<boolean> {
  const chain = await resolveProviderChain()
  return chain.length > 0
}

// ── gönderim ────────────────────────────────────────────────────

export type SendOutcome = {
  ok: boolean
  providerKey?: string
  providerMessageId?: string
  /** Aynı idempotency anahtarı ile yakın zamanda gönderildiği için atlandı. */
  deduped?: boolean
  /** Denenen sağlayıcı sayısı */
  attempts?: number
  errorCode?: string
  /** Sunucu içi teşhis; API yanıtına KONMAZ. */
  errorMessage?: string
}

async function alreadySent(idempotencyKey: string, windowSec: number): Promise<boolean> {
  if (!idempotencyKey) return false
  try {
    const since = new Date(Date.now() - windowSec * 1000)
    const hit = await prisma.smsDeliveryLog.findFirst({
      where: { idempotencyKey, success: true, createdAt: { gte: since } },
      select: { id: true },
    })
    return !!hit
  } catch {
    return false
  }
}

export async function sendSmsMessage(
  phone: string,
  message: string,
  opts?: { purpose?: string; idempotencyKey?: string; isTest?: boolean; forceProvider?: string }
): Promise<SendOutcome> {
  const purpose = opts?.purpose || 'generic'
  const isTest = !!opts?.isTest
  const idempotencyKey = opts?.idempotencyKey || ''
  const dedupeSec = await numSetting(SMS_SETTING_KEYS.dedupeSeconds, 120)
  const timeoutMs = await numSetting(SMS_SETTING_KEYS.timeoutMs, 15000)

  if (idempotencyKey && (await alreadySent(idempotencyKey, dedupeSec))) {
    return { ok: true, deduped: true, attempts: 0 }
  }

  let chain: string[]
  if (opts?.forceProvider) {
    const st = await providerConfigStatus(opts.forceProvider)
    chain = st.configured ? [opts.forceProvider] : []
    if (!chain.length) return { ok: false, errorCode: 'provider_not_configured' }
  } else {
    chain = await resolveProviderChain()
  }
  if (!chain.length) return { ok: false, errorCode: 'sms_not_configured' }

  let attempts = 0
  let lastError = 'sms_send_failed'
  for (const providerKey of chain) {
    const adapter = getAdapter(providerKey)
    if (!adapter) continue
    const cfg = await loadProviderConfig(providerKey)
    const started = Date.now()
    let res: SmsSendResult
    try {
      res = await adapter.sendSms(cfg, phone, message, timeoutMs)
    } catch (e) {
      res = { ok: false, errorCode: 'adapter_exception', errorMessage: e instanceof Error ? e.message : 'exception' }
    }
    const latency = Date.now() - started
    attempts++
    const isFallback = attempts > 1

    await recordHealth(providerKey, res.ok, latency, res.errorCode || null, isFallback, isTest)
    await logDelivery({
      providerKey,
      phone,
      purpose,
      success: res.ok,
      errorCode: res.errorCode,
      latencyMs: latency,
      isFallback,
      isTest,
      idempotencyKey: idempotencyKey || null,
      providerMessageId: res.providerMessageId,
    })

    if (res.ok) {
      return { ok: true, providerKey, providerMessageId: res.providerMessageId, attempts }
    }
    lastError = res.errorCode || 'sms_send_failed'

    // Zaman aşımında sağlayıcı mesajı kabul etmiş olabilir: aynı kodu başka
    // sağlayıcıya tekrar göndermeyip güvenli tarafta kalırız (çift SMS önleme).
    if (res.errorCode === 'timeout') {
      return { ok: false, providerKey, attempts, errorCode: 'timeout' }
    }
  }
  return { ok: false, attempts, errorCode: lastError }
}

/** OTP gönderimi — mesaj şablonu ayarlardan gelir, kod ASLA loglanmaz. */
export async function sendOtpSms(
  phone: string,
  code: string,
  opts?: { idempotencyKey?: string }
): Promise<SendOutcome> {
  const template = await getIntegrationSetting(
    SMS_SETTING_KEYS.otpTemplate,
    'CanliFal dogrulama kodunuz: {code}. Kodu kimseyle paylasmayin.'
  )
  const message = template.includes('{code}') ? template.replace('{code}', code) : `${template} ${code}`
  return sendSmsMessage(phone, message, { purpose: 'otp', idempotencyKey: opts?.idempotencyKey })
}

// ── test / teşhis (admin) ───────────────────────────────────────

export async function testProviderConnection(providerKey: string): Promise<SmsHealthResult> {
  const adapter = getAdapter(providerKey)
  if (!adapter) return { ok: false, live: false, errorCode: 'unknown_provider' }
  const timeoutMs = await numSetting(SMS_SETTING_KEYS.timeoutMs, 15000)
  const cfg = await loadProviderConfig(providerKey)
  const started = Date.now()
  let res: SmsHealthResult
  try {
    res = await adapter.healthCheck(cfg, timeoutMs)
  } catch (e) {
    res = { ok: false, live: true, errorCode: 'adapter_exception', errorMessage: e instanceof Error ? e.message : 'exception' }
  }
  if (res.live) {
    await recordHealth(providerKey, res.ok, Date.now() - started, res.errorCode || null, false, true)
  } else {
    try {
      await prisma.smsProviderHealth.upsert({
        where: { providerKey },
        create: { providerKey, lastTestedAt: new Date(), status: res.ok ? 'healthy' : 'degraded', lastError: res.ok ? null : (res.errorCode || null) },
        update: { lastTestedAt: new Date(), lastError: res.ok ? undefined : (res.errorCode || null) },
      })
    } catch { /* yoksay */ }
  }
  return res
}

export async function checkProviderBalance(providerKey: string): Promise<SmsBalanceResult> {
  const adapter = getAdapter(providerKey)
  if (!adapter) return { ok: false, supported: false, errorCode: 'unknown_provider' }
  const timeoutMs = await numSetting(SMS_SETTING_KEYS.timeoutMs, 15000)
  const cfg = await loadProviderConfig(providerKey)
  try {
    return await adapter.checkBalance(cfg, timeoutMs)
  } catch {
    return { ok: false, supported: true, errorCode: 'adapter_exception' }
  }
}

export { SMS_PROVIDERS, getProviderMeta }
export type { SmsProviderMeta }
