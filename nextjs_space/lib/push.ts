// Unified Push — TEK YETKİLİ GÖNDERİM NOKTASI.
//
// Kanal `PUSH_PROVIDER` ortam değişkeniyle seçilir:
//   fcm        — Firebase Cloud Messaging HTTP v1, `user_devices` tokenları (hedef)
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
import { isFcmConfigured, sendFcmToUsers, sendFcmToAllDevices, type FcmSendSummary } from '@/lib/fcm'

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

/**
 * Seçili kanal. Açıkça `PUSH_PROVIDER=fcm|onesignal|off` verilirse o kullanılır.
 * Hiç verilmemişse: FCM kimlik bilgisi varsa `fcm`; yoksa (kod, yapılandırma
 * yapılmadan yayına alınırsa push tamamen kesilmesin diye) eski `onesignal`
 * kanalı uyarı loguyla sürer. Deploy talimatı `PUSH_PROVIDER=fcm` ayarlar.
 */
export function pushProvider(
  env: NodeJS.ProcessEnv = process.env,
  fcmConfigured: () => boolean = isFcmConfigured
): PushProvider {
  const v = (env.PUSH_PROVIDER || '').trim().toLowerCase()
  if (v === 'fcm' || v === 'onesignal' || v === 'off') return v
  if (fcmConfigured()) return 'fcm'
  if (!warnedUnset) {
    warnedUnset = true
    console.warn('[push] PUSH_PROVIDER tanımsız ve FCM yapılandırılmamış — geçici olarak OneSignal kullanılıyor')
  }
  return 'onesignal'
}
let warnedUnset = false


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
