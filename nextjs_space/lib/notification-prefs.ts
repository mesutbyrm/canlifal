/**
 * Kullanıcı bildirim tercihleri — sunucu tarafı.
 *
 * Şema değişikliği olmadan `SiteSetting` tablosunda kullanıcı başına bir
 * satır (`notif_prefs:<userId>`, JSON) tutulur. Push gönderiminden önce
 * kontrol edilir; böylece uygulama kapalıyken de kapatılan kanal gelmez ve
 * tercih tüm cihazlarda geçerli olur.
 */
import prisma from '@/lib/db'
import {
  channelForType,
  notificationPrefsKey,
  parseNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/notification-prefs-core'

export * from '@/lib/notification-prefs-core'

const cache = new Map<string, { prefs: NotificationPrefs; at: number }>()
const TTL_MS = 60_000

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const hit = cache.get(userId)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.prefs
  let prefs = parseNotificationPrefs(null)
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: notificationPrefsKey(userId) } })
    prefs = parseNotificationPrefs(row?.value ?? null)
  } catch {
    // Okunamazsa bildirim engellenmez.
  }
  cache.set(userId, { prefs, at: Date.now() })
  return prefs
}

export async function saveNotificationPrefs(
  userId: string,
  patch: Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  const current = await getNotificationPrefs(userId)
  const next = parseNotificationPrefs({ ...current, ...patch })
  await prisma.siteSetting.upsert({
    where: { key: notificationPrefsKey(userId) },
    create: { key: notificationPrefsKey(userId), value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  })
  cache.set(userId, { prefs: next, at: Date.now() })
  return next
}

/** Bu push gönderilebilir mi? Acil (arama vb.) bildirimler her zaman gider. */
export async function isPushAllowed(userId: string, type: string, urgent = false): Promise<boolean> {
  if (urgent) return true
  const prefs = await getNotificationPrefs(userId)
  return prefs[channelForType(type)] !== false
}

/** Toplu gönderimde kanalı kapalı kullanıcıları ayıklar. */
export async function filterPushRecipients(userIds: string[], type: string, urgent = false): Promise<string[]> {
  if (urgent || userIds.length === 0) return userIds
  const channel = channelForType(type)
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: userIds.map(notificationPrefsKey) } },
      select: { key: true, value: true },
    })
    const blocked = new Set<string>()
    for (const r of rows) {
      if (parseNotificationPrefs(r.value)[channel] === false) {
        blocked.add(r.key.slice('notif_prefs:'.length))
      }
    }
    return userIds.filter((id) => !blocked.has(id))
  } catch {
    return userIds
  }
}
