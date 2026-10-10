// Unified Push — TEK YETKİLİ GÖNDERİM NOKTASI.
//
// Kanal `PUSH_PROVIDER` ortam değişkeniyle seçilir:
//   fcm        (varsayılan) — Firebase Cloud Messaging HTTP v1, `user_devices` tokenları
//   onesignal  — yalnızca acil geri dönüş için eski kanal (normalde kapalı)
//   off        — hiç push gönderilmez (uygulama içi bildirim kaydı sürer)
//
// Aynı olay için iki kanaldan birden gönderim YAPILMAZ: her çağrı yalnız seçili
// kanala gider. Uygulama içi bildirim kaydı (Notification tablosu), SSE ve
// polling bu modülden bağımsızdır ve etkilenmez.

import {
  sendPushToUser as oneSignalSendToUser,
  sendPushToMultipleUsers as oneSignalSendToMany,
} from '@/lib/onesignal'
import { sendFcmToUsers, sendFcmToAllDevices, type FcmSendSummary } from '@/lib/fcm'

export interface UnifiedPushPayload {
  title: string
  body: string
  type: string
  targetPath?: string
  targetId?: string
  urgent?: boolean
  notificationId?: string
  data?: Record<string, unknown>
}

export type PushProvider = 'fcm' | 'onesignal' | 'off'

export function pushProvider(env: NodeJS.ProcessEnv = process.env): PushProvider {
  const v = (env.PUSH_PROVIDER || 'fcm').trim().toLowerCase()
  return v === 'onesignal' || v === 'off' ? v : 'fcm'
}

/** Geriye dönük uyumluluk için (log / tanılama). */
export const PUSH_PROVIDER = pushProvider()

/** Tek kullanıcıya push. Asla fırlatmaz. */
export async function sendPush(userId: string, payload: UnifiedPushPayload): Promise<boolean> {
  return sendPushBulk([userId], payload)
}

/** Birden çok kullanıcıya push. Asla fırlatmaz. */
export async function sendPushBulk(userIds: string[], payload: UnifiedPushPayload): Promise<boolean> {
  const ids = userIds.filter(Boolean)
  if (!ids.length) return false
  const provider = pushProvider()
  try {
    if (provider === 'off') return false
    if (provider === 'onesignal') {
      return ids.length === 1
        ? await oneSignalSendToUser(ids[0], payload)
        : await oneSignalSendToMany(ids, payload)
    }
    const summary = await sendFcmToUsers(ids, payload)
    return summary.sent > 0
  } catch (err) {
    console.error('[push] gönderim hatası (engellemez):', (err as Error)?.message)
    return false
  }
}

/** Ayrıntılı FCM sonucu (tanılama / admin duyurusu). */
export async function sendPushDetailed(userIds: string[], payload: UnifiedPushPayload): Promise<FcmSendSummary> {
  return sendFcmToUsers(userIds, payload)
}

/** Kayıtlı tüm cihazlara (yönetici duyurusu). */
export async function sendPushToAll(payload: UnifiedPushPayload): Promise<FcmSendSummary> {
  return sendFcmToAllDevices(payload)
}
