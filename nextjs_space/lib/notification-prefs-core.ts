/**
 * Bildirim kanalı tercihleri — saf yardımcılar (prisma'sız, test edilebilir).
 * Kanal eşlemesi mobil `AppNotificationChannel.forType` ile birebir aynıdır.
 */

export const NOTIFICATION_CHANNELS = ['messages', 'liveStarters', 'dailyFortune', 'other'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]
export type NotificationPrefs = Record<NotificationChannel, boolean>

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  messages: true,
  liveStarters: true,
  dailyFortune: true,
  other: true,
}

export function channelForType(rawType: string | null | undefined): NotificationChannel {
  const t = String(rawType ?? '').toLowerCase()
  if (t.includes('message') || t.includes('chat') || t === 'dm') return 'messages'
  if (t.includes('live') || t.includes('stream') || t.includes('broadcast')) {
    // Yayın bitti / PK olayları «yayın başlatanlar» değildir.
    if (t.includes('ended') || t.includes('pk')) return 'other'
    return 'liveStarters'
  }
  if (t.includes('daily') || t.includes('horoscope') || t.includes('gunluk') || t.includes('günlük')) {
    return 'dailyFortune'
  }
  return 'other'
}

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  let obj: any = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      obj = null
    }
  }
  const out: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS }
  if (obj && typeof obj === 'object') {
    for (const c of NOTIFICATION_CHANNELS) {
      if (typeof obj[c] === 'boolean') out[c] = obj[c]
    }
  }
  return out
}

export const notificationPrefsKey = (userId: string) => `notif_prefs:${userId}`
