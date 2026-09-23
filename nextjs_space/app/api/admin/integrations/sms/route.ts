/**
 * GET  /api/admin/integrations/sms  → sağlayıcı durumları + seçim ayarları
 * PATCH /api/admin/integrations/sms → seçim modu ve eşik ayarlarını günceller
 *
 * Yalnız SÜPER ADMİN. Secret DEĞERLERİ asla dönmez (yalnız maskeli gösterim).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/rbac'
import { apiLimiter } from '@/lib/rate-limiter'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { listProviderStates, SMS_SETTING_KEYS, getSelectionMode } from '@/lib/sms/service'
import { getProviderMeta } from '@/lib/sms/catalog'
import { getIntegrationSetting, setIntegrationSetting, invalidateIntegrationSettings, secretSource, getProviderConfig } from '@/lib/integration-secrets'
import { SECRET_MASK, vaultKeyStatus } from '@/lib/crypto-vault'
import { safeError } from '@/lib/log-redact'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard instanceof NextResponse) return guard
  try {
    const states = await listProviderStates()
    const detailed = [] as any[]
    for (const s of states) {
      const meta = getProviderMeta(s.key)
      const fields = [] as any[]
      for (const f of meta?.fields || []) {
        const src = f.secret
          ? await secretSource('sms', s.key, f.key, f.envName)
          : 'plain'
        const plainValue = f.secret ? undefined : ((await getProviderConfig(s.key, f.key, f.envName)) || '')
        fields.push({
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          secret: f.secret,
          envName: f.envName || null,
          placeholder: f.placeholder || null,
          help: f.help || null,
          // Değer ASLA dönmez; yalnız kaynak ve maskeli gösterim.
          source: f.secret ? src : 'plain',
          masked: f.secret ? SECRET_MASK : undefined,
          value: plainValue,
          hasValue: f.secret ? src !== 'none' : !!plainValue,
        })
      }
      detailed.push({ ...s, fields })
    }

    return NextResponse.json({
      success: true,
      data: {
        providers: detailed,
        settings: {
          selectionMode: await getSelectionMode(),
          manualProvider: await getIntegrationSetting(SMS_SETTING_KEYS.manualProvider, ''),
          errorRateThreshold: await getIntegrationSetting(SMS_SETTING_KEYS.errorRateThreshold, '50'),
          minSamples: await getIntegrationSetting(SMS_SETTING_KEYS.minSamples, '5'),
          cooldownMinutes: await getIntegrationSetting(SMS_SETTING_KEYS.cooldownMinutes, '10'),
          timeoutMs: await getIntegrationSetting(SMS_SETTING_KEYS.timeoutMs, '15000'),
          otpTemplate: await getIntegrationSetting(SMS_SETTING_KEYS.otpTemplate, 'CanliFal dogrulama kodunuz: {code}. Kodu kimseyle paylasmayin.'),
        },
        vault: vaultKeyStatus(),
      },
    })
  } catch (e) {
    safeError('admin-sms', 'liste hatası', e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Liste alınamadı' } }, { status: 500 })
  }
}

const ALLOWED_SETTINGS: Record<string, string> = {
  selectionMode: SMS_SETTING_KEYS.selectionMode,
  manualProvider: SMS_SETTING_KEYS.manualProvider,
  errorRateThreshold: SMS_SETTING_KEYS.errorRateThreshold,
  minSamples: SMS_SETTING_KEYS.minSamples,
  cooldownMinutes: SMS_SETTING_KEYS.cooldownMinutes,
  timeoutMs: SMS_SETTING_KEYS.timeoutMs,
  otpTemplate: SMS_SETTING_KEYS.otpTemplate,
}

export async function PATCH(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard instanceof NextResponse) return guard
  const { user } = guard
  const { success: ok } = apiLimiter.check(`int-sms-settings:${user.id}`)
  if (!ok) return NextResponse.json({ success: false, error: { code: 'RATE_LIMITED', message: 'Çok fazla istek' } }, { status: 429 })

  try {
    const body = await request.json().catch(() => ({}))
    const changed: string[] = []
    for (const [field, key] of Object.entries(ALLOWED_SETTINGS)) {
      if (body[field] === undefined) continue
      const value = String(body[field]).slice(0, 500)
      if (field === 'selectionMode' && !['manual', 'priority', 'fallback', 'health'].includes(value)) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_MODE', message: 'Geçersiz seçim modu' } }, { status: 400 })
      }
      await setIntegrationSetting(key, value)
      changed.push(field)
    }
    invalidateIntegrationSettings()
    await recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'integration_sms_settings_update',
      targetType: 'IntegrationSetting',
      description: `SMS ayarları güncellendi: ${changed.join(', ')}`,
      metadata: { changed },
      ip: getAuditIp(request),
    })
    return NextResponse.json({ success: true, data: { changed } })
  } catch (e) {
    safeError('admin-sms', 'ayar güncelleme hatası', e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ayar kaydedilemedi' } }, { status: 500 })
  }
}
