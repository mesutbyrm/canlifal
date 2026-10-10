// FCM HTTP v1 gönderici — resmî uç: POST https://fcm.googleapis.com/v1/projects/{id}/messages:send
//
// Ek bağımlılık yok: servis hesabı JWT'si Node `crypto` ile imzalanır, OAuth2
// erişim belirteci önbelleğe alınır. Kimlik bilgileri YALNIZ ortam değişkeninden
// okunur; token, anahtar veya JWT asla loglanmaz.
//
// Ortam değişkenleri (biri yeterli):
//   FCM_SERVICE_ACCOUNT_BASE64  — servis hesabı JSON'unun base64 hali (önerilen)
//   FCM_SERVICE_ACCOUNT_JSON    — servis hesabı JSON'u (tek satır)
//   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY

import crypto from 'crypto'
import prisma from '@/lib/db'

export interface ServiceAccount {
  projectId: string
  clientEmail: string
  privateKey: string
}

export interface FcmPayload {
  title: string
  body: string
  type: string
  targetPath?: string
  targetId?: string
  urgent?: boolean
  /** Uygulama içi bildirim kimliği (tekilleştirme etiketi). */
  notificationId?: string
  /** Dokunma yönlendirmesi için ek alanlar (string'e çevrilir). */
  data?: Record<string, unknown>
}

export interface FcmSendSummary {
  configured: boolean
  users: number
  devices: number
  sent: number
  failed: number
  removedTokens: number
  errors: Record<string, number>
}

// ── Yapılandırma ──────────────────────────────────────────────────────────

let cachedAccount: ServiceAccount | null | undefined

export function loadServiceAccount(env: NodeJS.ProcessEnv = process.env): ServiceAccount | null {
  try {
    let raw: any = null
    if (env.FCM_SERVICE_ACCOUNT_BASE64) {
      raw = JSON.parse(Buffer.from(env.FCM_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'))
    } else if (env.FCM_SERVICE_ACCOUNT_JSON) {
      raw = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON)
    }
    const projectId = raw?.project_id || env.FIREBASE_PROJECT_ID
    const clientEmail = raw?.client_email || env.FIREBASE_CLIENT_EMAIL
    const privateKey = (raw?.private_key || env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    if (!projectId || !clientEmail || !privateKey.includes('PRIVATE KEY')) return null
    return { projectId, clientEmail, privateKey }
  } catch {
    console.error('[fcm] servis hesabı ortam değişkeni okunamadı (içerik loglanmadı)')
    return null
  }
}

function account(): ServiceAccount | null {
  if (cachedAccount === undefined) cachedAccount = loadServiceAccount()
  return cachedAccount
}

export function isFcmConfigured(): boolean {
  return account() !== null
}

/** Tanılama: proje kimliği (gizli değil) ve yapılandırma durumu. */
export function fcmConfigInfo(): { configured: boolean; projectId?: string } {
  const sa = account()
  return sa ? { configured: true, projectId: sa.projectId } : { configured: false }
}

// ── OAuth2 erişim belirteci ──────────────────────────────────────────────

let accessToken: { value: string; expiresAt: number } | null = null

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

/** Servis hesabı için imzalı JWT (OAuth2 jwt-bearer). Test edilebilir saf fonksiyon. */
export function signServiceJwt(sa: ServiceAccount, nowSec = Math.floor(Date.now() / 1000)): string {
  const now = nowSec
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(
    JSON.stringify({
      iss: sa.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  )
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  return `${header}.${claims}.${b64url(signer.sign(sa.privateKey))}`
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (accessToken && accessToken.expiresAt - 60_000 > Date.now()) return accessToken.value
  const assertion = signServiceJwt(sa)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
    signal: AbortSignal.timeout(10_000),
  })
  const json: any = await res.json().catch(() => ({}))
  if (!res.ok || !json.access_token) {
    throw new Error(`FCM OAuth hatası: HTTP ${res.status} ${json.error || ''}`.trim())
  }
  accessToken = { value: json.access_token, expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000 }
  return accessToken.value
}

// ── Kanal / öncelik (Flutter AppNotificationChannel ile aynı kimlikler) ──

export type PushChannelId =
  | 'canlifal_messages'
  | 'canlifal_live'
  | 'canlifal_social'
  | 'canlifal_system'
  | 'canlifal_daily_fortune'
  | 'canlifal_other'

const SOCIAL = ['like', 'comment', 'follow', 'share', 'mention', 'reply', 'profile_view', 'story', 'post']
const SYSTEM = [
  'payment', 'cfc', 'jeton', 'withdraw', 'refund', 'gift', 'admin', 'moderation', 'guard', 'security',
  'announcement', 'agency', 'account', 'gold', 'membership', 'referral', 'commission', 'teller_application',
]

/** Bildirim türünden Android kanalı. Flutter `AppNotificationChannel.forType` ile birebir. */
export function channelForType(rawType: string | null | undefined): PushChannelId {
  const t = (rawType || '').toLowerCase()
  if (t.includes('chat_mention')) return 'canlifal_social'
  if (t.includes('message') || t.includes('chat') || t === 'dm') return 'canlifal_messages'
  if (t.includes('live') || t.includes('stream') || t.includes('broadcast')) {
    if (t.includes('ended') || t.includes('closed') || t.includes('pk') || t.includes('gift')) {
      return t.includes('gift') ? 'canlifal_system' : 'canlifal_other'
    }
    return 'canlifal_live'
  }
  if (t.includes('daily') || t.includes('horoscope') || t.includes('gunluk') || t.includes('dream_reminder')) {
    return 'canlifal_daily_fortune'
  }
  if (SOCIAL.some(k => t.includes(k))) return 'canlifal_social'
  if (SYSTEM.some(k => t.includes(k))) return 'canlifal_system'
  return 'canlifal_other'
}

/**
 * Teslimat önceliği: yalnız zamanı önemli olanlar HIGH (mesaj, canlı yayın,
 * davet/istek, ödeme/güvenlik). Diğerleri NORMAL — Android Doze'da pil dostu.
 */
export function isHighPriority(type: string, urgent?: boolean): boolean {
  if (urgent) return true
  const t = (type || '').toLowerCase()
  const ch = channelForType(t)
  if (ch === 'canlifal_messages' || ch === 'canlifal_live') return true
  return ['invite', 'request', 'session', 'call', 'pk', 'payment', 'security', 'guard'].some(k => t.includes(k))
}

function stringData(payload: FcmPayload): Record<string, string> {
  const out: Record<string, string> = {}
  const put = (k: string, v: unknown) => {
    if (v === undefined || v === null || v === '') return
    out[k] = typeof v === 'string' ? v : JSON.stringify(v)
  }
  for (const [k, v] of Object.entries(payload.data || {})) put(k, v)
  put('type', payload.type)
  put('targetPath', payload.targetPath)
  put('targetId', payload.targetId)
  put('title', payload.title)
  put('body', payload.body)
  put('notificationId', payload.notificationId)
  put('id', payload.notificationId)
  return out
}

/** FCM v1 `message` gövdesi (token hariç). Testte doğrudan kullanılır. */
export function buildFcmMessage(payload: FcmPayload): Record<string, any> {
  const channel = channelForType(payload.type)
  const high = isHighPriority(payload.type, payload.urgent)
  const data = stringData(payload)
  // Aynı olay tekrar gönderilirse cihazda yeni bildirim açılmaz, mevcut güncellenir.
  const tag =
    channel === 'canlifal_messages' && (data.senderId || data.fromUserId)
      ? `dm:${data.senderId || data.fromUserId}`
      : payload.notificationId
        ? `n:${payload.notificationId}`
        : `${payload.type}:${payload.targetId || ''}`
  return {
    notification: { title: payload.title.slice(0, 120), body: payload.body.slice(0, 240) },
    data,
    android: {
      priority: high ? 'HIGH' : 'NORMAL',
      ttl: high ? '3600s' : '86400s',
      notification: {
        channel_id: channel,
        tag,
        icon: 'ic_stat_canlifal',
        color: '#7C3AED',
        // Mesaj içeriği kilit ekranında kullanıcının sistem ayarına göre gizlenir.
        visibility: channel === 'canlifal_messages' ? 'PRIVATE' : 'PUBLIC',
        notification_priority: high ? 'PRIORITY_HIGH' : 'PRIORITY_DEFAULT',
      },
    },
    apns: { payload: { aps: { sound: 'default', 'thread-id': channel } } },
  }
}

// ── Gönderim ─────────────────────────────────────────────────────────────

/** Bu hata kodları cihaz token'ının artık geçersiz olduğunu söyler → kayıt silinir. */
const DEAD_TOKEN_CODES = new Set(['UNREGISTERED', 'SENDER_ID_MISMATCH', 'INVALID_ARGUMENT', 'NOT_FOUND'])

interface SendResult {
  ok: boolean
  code?: string
  dead?: boolean
}

async function sendOne(sa: ServiceAccount, token: string, message: Record<string, any>, attempt = 0): Promise<SendResult> {
  try {
    const bearer = await getAccessToken(sa)
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.projectId}/messages:send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` },
      body: JSON.stringify({ message: { ...message, token } }),
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) return { ok: true }
    const json: any = await res.json().catch(() => ({}))
    const fcmCode =
      json?.error?.details?.find((d: any) => d?.errorCode)?.errorCode || json?.error?.status || `HTTP_${res.status}`
    if (res.status === 401 && attempt === 0) {
      accessToken = null
      return sendOne(sa, token, message, attempt + 1)
    }
    if ((res.status === 429 || res.status >= 500) && attempt === 0) {
      await new Promise(r => setTimeout(r, 1000))
      return sendOne(sa, token, message, attempt + 1)
    }
    // INVALID_ARGUMENT yalnız token geçersizse ölü sayılır (mesaj hatası değilse).
    const dead =
      DEAD_TOKEN_CODES.has(fcmCode) &&
      (fcmCode !== 'INVALID_ARGUMENT' || /registration token|token/i.test(json?.error?.message || ''))
    return { ok: false, code: fcmCode, dead }
  } catch (e: any) {
    return { ok: false, code: e?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK' }
  }
}

async function deliver(
  devices: { id: string; token: string }[],
  payload: FcmPayload,
  users: number
): Promise<FcmSendSummary> {
  const summary: FcmSendSummary = {
    configured: true, users, devices: 0, sent: 0, failed: 0, removedTokens: 0, errors: {},
  }
  const sa = account()
  if (!sa) {
    summary.configured = false
    console.error('[fcm] yapılandırılmamış (FCM_SERVICE_ACCOUNT_BASE64 yok) — push gönderilmedi')
    return summary
  }
  // Aynı token birden çok satırda olabilir: cihaza bir kez gönder.
  const byToken = new Map<string, string[]>()
  for (const d of devices) {
    if (!d.token) continue
    byToken.set(d.token, [...(byToken.get(d.token) || []), d.id])
  }
  summary.devices = byToken.size
  if (byToken.size === 0) return summary

  const message = buildFcmMessage(payload)
  const dead: string[] = []
  const entries = [...byToken.entries()]
  for (let i = 0; i < entries.length; i += 25) {
    const batch = entries.slice(i, i + 25)
    const results = await Promise.all(batch.map(([token]) => sendOne(sa, token, message)))
    results.forEach((r, j) => {
      if (r.ok) {
        summary.sent++
      } else {
        summary.failed++
        const code = r.code || 'UNKNOWN'
        summary.errors[code] = (summary.errors[code] || 0) + 1
        if (r.dead) dead.push(...batch[j][1])
      }
    })
  }
  if (dead.length > 0) {
    await prisma.userDevice.deleteMany({ where: { id: { in: dead } } }).catch(() => {})
    summary.removedTokens = dead.length
  }
  // Token/anahtar içermeyen özet log.
  console.log(
    `[fcm] type=${payload.type} users=${summary.users} devices=${summary.devices} sent=${summary.sent} ` +
      `failed=${summary.failed} removed=${summary.removedTokens} errors=${JSON.stringify(summary.errors)}`
  )
  return summary
}

/** Kullanıcıların kayıtlı tüm cihazlarına gönderir. Asla fırlatmaz. */
export async function sendFcmToUsers(userIds: string[], payload: FcmPayload): Promise<FcmSendSummary> {
  const ids = [...new Set(userIds.filter(Boolean))]
  try {
    if (ids.length === 0) return deliver([], payload, 0)
    const devices: { id: string; token: string }[] = []
    for (let i = 0; i < ids.length; i += 500) {
      const rows = await prisma.userDevice.findMany({
        where: { userId: { in: ids.slice(i, i + 500) } },
        select: { id: true, token: true },
      })
      devices.push(...rows)
    }
    return await deliver(devices, payload, ids.length)
  } catch (e) {
    console.error('[fcm] sendFcmToUsers hata:', (e as Error)?.message)
    return { configured: isFcmConfigured(), users: ids.length, devices: 0, sent: 0, failed: 0, removedTokens: 0, errors: { EXCEPTION: 1 } }
  }
}

/** Kayıtlı tüm cihazlara (yönetici duyurusu). Sayfalı okunur. */
export async function sendFcmToAllDevices(payload: FcmPayload): Promise<FcmSendSummary> {
  const total: FcmSendSummary = {
    configured: isFcmConfigured(), users: 0, devices: 0, sent: 0, failed: 0, removedTokens: 0, errors: {},
  }
  if (!total.configured) return deliver([], payload, 0)
  let cursor: string | undefined
  for (;;) {
    const rows: { id: string; token: string; userId: string }[] = await prisma.userDevice.findMany({
      select: { id: true, token: true, userId: true },
      orderBy: { id: 'asc' },
      take: 500,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
    if (rows.length === 0) break
    cursor = rows[rows.length - 1].id
    const part = await deliver(rows, payload, new Set(rows.map(r => r.userId)).size)
    total.users += part.users
    total.devices += part.devices
    total.sent += part.sent
    total.failed += part.failed
    total.removedTokens += part.removedTokens
    for (const [k, v] of Object.entries(part.errors)) total.errors[k] = (total.errors[k] || 0) + v
    if (rows.length < 500) break
  }
  return total
}
