import prisma from '@/lib/db'
import { getNotificationTitle } from '@/lib/onesignal'
import { sendPush, sendPushBulk } from '@/lib/push'
import { buildDeepLink, type DeepLinkType } from '@/lib/deeplink'

interface NotifyParams {
  userId: string
  type: string
  message: string
  title?: string
  postId?: string
  fromUserId?: string
  fromUserName?: string
  data?: string // JSON string
  // Mobile push fields
  targetPath?: string
  targetId?: string
  urgent?: boolean
  // --- Faz 21 (§53) eklemeleri: tamamen opsiyonel ---
  /** Tekilleştirme anahtarı. Verilmezse olay alanlarından türetilir. */
  dedupeKey?: string
  /** Tekilleştirme penceresi (saniye). Verilmezse tipe göre varsayılan. */
  dedupeWindowSeconds?: number
  /** Tekilleştirmeyi bu çağrı için tamamen kapatır. */
  skipDedupe?: boolean
  /** Derin bağlantı tipi (canlifal://<type>/<value>). */
  deepLinkType?: DeepLinkType
  /** Derin bağlantı değeri (id/slug/username/userId). */
  deepLinkValue?: string
}

/**
 * Faz 21 (§53) — Bildirim tekilleştirme.
 *
 * Aynı olay için aynı kullanıcıya kısa bir pencere içinde ikinci bir bildirim
 * üretilmesini engeller. Varsayılan pencere kısa tutulur; böylece çift tıklama,
 * yeniden deneme ve eşzamanlı istek kaynaklı kopyalar elenirken, gerçek tekrar
 * eden olaylar (yeni hediye, yeni mesaj) engellenmez.
 */
export const DEFAULT_DEDUPE_WINDOW_SECONDS = 60

/** Tip bazlı pencere ezmeleri (saniye). */
const DEDUPE_WINDOW_BY_TYPE: Record<string, number> = {
  follow: 21600,        // takip bildirimi 6 saatte bir
  new_follower: 21600,
  like: 3600,           // aynı gönderiye aynı kişiden beğeni 1 saatte bir
  post_like: 3600,
  comment_like: 3600,
  achievement: 86400,   // başarım bildirimi günde bir
  level_up: 86400,
  live_started: 1800,   // yayın başladı bildirimi 30 dakikada bir
  stream_started: 1800,
}

function resolveDedupeWindow(type: string, override?: number): number {
  if (typeof override === 'number' && override >= 0) return override
  return DEDUPE_WINDOW_BY_TYPE[type] ?? DEFAULT_DEDUPE_WINDOW_SECONDS
}

/**
 * Anahtar verilmediyse olayı tanımlayan alanlardan deterministik bir anahtar
 * üretir. Mesaj metni de dahil edilir; böylece farklı içerikli bildirimler
 * birbirini bastırmaz.
 */
export function buildNotificationDedupeKey(params: {
  type: string
  postId?: string
  fromUserId?: string
  message?: string
}): string {
  return [
    params.type,
    params.postId || '-',
    params.fromUserId || '-',
    (params.message || '').slice(0, 120),
  ].join('|')
}

/** Bildirim için derin bağlantı (mobil URI) üretir; üretilemezse null. */
export function resolveNotificationDeepLink(params: {
  type: string
  postId?: string | null
  fromUserId?: string | null
  deepLinkType?: DeepLinkType
  deepLinkValue?: string
}): string | null {
  try {
    if (params.deepLinkType) {
      const link = buildDeepLink(params.deepLinkType, {
        id: params.deepLinkValue,
        slug: params.deepLinkValue,
        username: params.deepLinkValue,
        userId: params.deepLinkValue,
      })
      return link.app
    }
    if (params.postId) {
      return buildDeepLink('post', { id: params.postId }).app
    }
    if (params.fromUserId && /message|mesaj|dm/i.test(params.type)) {
      return buildDeepLink('message', { userId: params.fromUserId }).app
    }
    return null
  } catch {
    return null
  }
}

/** Bildirimin `data` JSON'unu ve kimlik alanlarını push `data`sına taşır (dokunma yönlendirmesi). */
export function pushDataFor(params: {
  data?: string | null
  postId?: string | null
  fromUserId?: string | null
  fromUserName?: string | null
  deepLink?: string | null
}): Record<string, unknown> {
  let parsed: Record<string, unknown> = {}
  if (params.data) {
    try {
      const j = JSON.parse(params.data)
      if (j && typeof j === 'object' && !Array.isArray(j)) parsed = j
    } catch {}
  }
  return {
    ...parsed,
    ...(params.postId ? { postId: params.postId } : {}),
    ...(params.fromUserId ? { fromUserId: params.fromUserId, senderId: (parsed as any).senderId ?? params.fromUserId } : {}),
    ...(params.fromUserName ? { senderName: params.fromUserName } : {}),
    ...(params.deepLink ? { deepLink: params.deepLink } : {}),
  }
}

/**
 * Create a DB notification AND send a push (tek kanal: lib/push → FCM).
 * Push is fire-and-forget: errors logged but never block the response.
 */
export async function createNotificationWithPush(params: NotifyParams) {
  try {
    // 0. Faz 21 (§53) — tekilleştirme kontrolü
    const dedupeKey =
      params.dedupeKey ||
      buildNotificationDedupeKey({
        type: params.type,
        postId: params.postId,
        fromUserId: params.fromUserId,
        message: params.message,
      })
    const windowSeconds = resolveDedupeWindow(params.type, params.dedupeWindowSeconds)

    if (!params.skipDedupe && windowSeconds > 0) {
      const since = new Date(Date.now() - windowSeconds * 1000)
      const existing = await prisma.notification.findFirst({
        where: { userId: params.userId, dedupeKey, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
      })
      if (existing) {
        // Kopya: yeni kayıt da push da üretilmez, mevcut bildirim döner.
        return existing
      }
    }

    const deepLink = resolveNotificationDeepLink({
      type: params.type,
      postId: params.postId,
      fromUserId: params.fromUserId,
      deepLinkType: params.deepLinkType,
      deepLinkValue: params.deepLinkValue,
    })

    // 1. Create DB notification
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        message: params.message,
        title: params.title,
        postId: params.postId,
        fromUserId: params.fromUserId,
        fromUserName: params.fromUserName,
        data: params.data,
        dedupeKey,
        deepLink,
      }
    })

    // 2. Push (tek kanal, fire and forget). Prisma middleware artık push atmaz.
    const pushTitle = params.title || getNotificationTitle(params.type)
    const pushBody = params.fromUserName
      ? `${params.fromUserName} ${params.message}`
      : params.message

    sendPush(params.userId, {
      title: pushTitle,
      body: pushBody.slice(0, 200),
      type: params.type,
      targetPath: params.targetPath || '',
      targetId: params.targetId || '',
      urgent: params.urgent || false,
      notificationId: notification.id,
      data: pushDataFor({ ...params, deepLink }),
    }).catch(err => console.error('Push failed (non-blocking):', err))

    return notification
  } catch (error) {
    console.error('createNotificationWithPush error:', error)
    throw error
  }
}

/**
 * Create DB notifications for multiple users AND send a batch push.
 * Push is fire-and-forget.
 */
export async function createBulkNotificationsWithPush(params: {
  userIds: string[]
  type: string
  title: string
  message: string
  data?: string
  fromUserId?: string
  fromUserName?: string
  targetPath?: string
  targetId?: string
  urgent?: boolean
  // --- Faz 21 (§53) eklemeleri: tamamen opsiyonel ---
  dedupeKey?: string
  dedupeWindowSeconds?: number
  skipDedupe?: boolean
  deepLinkType?: DeepLinkType
  deepLinkValue?: string
}) {
  if (params.userIds.length === 0) return

  try {
    // 0. Faz 21 (§53) — tekilleştirme: pencere içinde aynı anahtarı almış
    // kullanıcılar hedef listesinden çıkarılır.
    const dedupeKey =
      params.dedupeKey ||
      buildNotificationDedupeKey({
        type: params.type,
        fromUserId: params.fromUserId,
        message: params.message,
      })
    const windowSeconds = resolveDedupeWindow(params.type, params.dedupeWindowSeconds)

    let targetUserIds = params.userIds
    if (!params.skipDedupe && windowSeconds > 0) {
      const since = new Date(Date.now() - windowSeconds * 1000)
      const already = await prisma.notification.findMany({
        where: { userId: { in: params.userIds }, dedupeKey, createdAt: { gte: since } },
        select: { userId: true },
      })
      if (already.length > 0) {
        const seen = new Set(already.map(a => a.userId))
        targetUserIds = params.userIds.filter(uid => !seen.has(uid))
      }
    }
    if (targetUserIds.length === 0) return

    const deepLink = resolveNotificationDeepLink({
      type: params.type,
      fromUserId: params.fromUserId,
      deepLinkType: params.deepLinkType,
      deepLinkValue: params.deepLinkValue,
    })

    // 1. Create DB notifications in bulk
    await prisma.notification.createMany({
      data: targetUserIds.map(uid => ({
        userId: uid,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data,
        fromUserId: params.fromUserId,
        fromUserName: params.fromUserName,
        dedupeKey,
        deepLink,
      })),
    })

    // 2. Toplu push (tek kanal, fire and forget)
    sendPushBulk(targetUserIds, {
      title: params.title,
      body: params.message.slice(0, 200),
      type: params.type,
      targetPath: params.targetPath || '',
      targetId: params.targetId || '',
      urgent: params.urgent || false,
      data: pushDataFor({ ...params, deepLink }),
    }).catch(err => console.error('Bulk push failed (non-blocking):', err))
  } catch (error) {
    console.error('createBulkNotificationsWithPush error:', error)
  }
}
