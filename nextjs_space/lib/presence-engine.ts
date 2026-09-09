/**
 * F5 - Online Presence + Gold Online-Entrance engine.
 *
 * Tasarim ilkeleri (spec 22-26):
 * - Mevcut realtime/heartbeat altyapisi kullanilir (SitePresence + /api/presence).
 * - ONLINE/OFFLINE backend tarafinda takip edilir; kisa network kopmalari icin
 *   grace period uygulanir (frontend tahmin etmez).
 * - Gereksiz DB yazma yuku olusturmaz: pahali islem yalnizca "cevrimdisi -> online"
 *   gecisinde yapilir.
 * - Gold giris karti (USER_ONLINE) her online oturumda TEK KEZ uretilir; refresh /
 *   route change / component mount tekrar tetiklemez (lastOnlineEventAt cooldown).
 */

import prisma from '@/lib/db'

// Bir kullanicinin online sayilacagi pencere (son aktiflik bu sureden yeniyse online).
export const ONLINE_WINDOW_MS = 90 * 1000 // 90 sn (grace period dahil)

// Ayni kullanici icin iki Gold giris karti arasindaki minimum sure.
// login/refresh/route-change spam'ini engeller.
export const ONLINE_EVENT_COOLDOWN_MS = 5 * 60 * 1000 // 5 dk

// online-events feed'inin dondugu zaman penceresi (client polling icin).
export const ONLINE_EVENT_FEED_WINDOW_MS = 30 * 1000 // 30 sn

export type PresenceStatus = 'live' | 'busy' | 'online' | 'offline'

function isGoldActive(membership: string | null | undefined, expiresAt: Date | null | undefined): boolean {
  if (membership !== 'gold') return false
  if (!expiresAt) return true
  return new Date(expiresAt) > new Date()
}

/**
 * Heartbeat isleme + gerekiyorsa Gold giris karti uret.
 * /api/presence POST icinde, kullanicinin lastActiveAt guncellenmeden ONCE cagrilmali
 * (gecis tespiti icin eski lastActiveAt gerekir).
 *
 * @param prevLastActiveAt heartbeat guncellemesinden ONCEKI lastActiveAt degeri
 */
export async function maybeEmitOnlineEntrance(
  userId: string,
  prevLastActiveAt: Date | null | undefined
): Promise<{ emitted: boolean; eventId?: string }> {
  const now = Date.now()

  // "cevrimdisi -> online" gecisi mi? (grace period ile)
  const wasOnline = !!prevLastActiveAt && now - new Date(prevLastActiveAt).getTime() < ONLINE_WINDOW_MS
  if (wasOnline) return { emitted: false } // zaten online, yeni kart yok (spam kontrolu)

  // Kullanici ayarlarini + uyeligi oku.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      membership: true,
      membershipExpiresAt: true,
      premiumEntranceEnabled: true,
      premiumEntranceRequireGold: true,
      premiumEntranceEffectId: true,
      premiumEntranceDurationMs: true,
      premiumEntranceAnimationType: true,
      lastOnlineEventAt: true,
    },
  })
  if (!user) return { emitted: false }

  // Premium giris kapaliysa cikis.
  if (!user.premiumEntranceEnabled) return { emitted: false }

  // Gold zorunluysa ve Gold aktif degilse: otomatik olarak kart alamaz
  // (Gold uyelik sona erdiginde bu kontrol devreye girer - ayrica cron gerekmez).
  if (user.premiumEntranceRequireGold && !isGoldActive(user.membership, user.membershipExpiresAt)) {
    return { emitted: false }
  }

  // Cooldown: son karttan bu yana yeterli sure gecmediyse tekrar uretme.
  if (user.lastOnlineEventAt && now - new Date(user.lastOnlineEventAt).getTime() < ONLINE_EVENT_COOLDOWN_MS) {
    return { emitted: false }
  }

  // Efekt bilgisini coz (varsa).
  let effectUrl: string | null = null
  let effectType: string | null = null
  let durationMs = user.premiumEntranceDurationMs ?? 4000
  if (user.premiumEntranceEffectId) {
    const eff = await prisma.entranceEffect.findUnique({
      where: { id: user.premiumEntranceEffectId },
      select: { assetUrl: true, assetType: true, durationMs: true, isActive: true },
    })
    if (eff?.isActive) {
      effectUrl = eff.assetUrl
      effectType = eff.assetType
      if (!user.premiumEntranceDurationMs) durationMs = eff.durationMs ?? 4000
    }
  }

  // Idempotent dedup: lastOnlineEventAt'i once guncelle (yaris kosulunu daralt).
  // Ayni anda iki heartbeat gelirse yalnizca biri esigi gecer.
  const updated = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [
        { lastOnlineEventAt: null },
        { lastOnlineEventAt: { lt: new Date(now - ONLINE_EVENT_COOLDOWN_MS) } },
      ],
    },
    data: { lastOnlineEventAt: new Date() },
  })
  if (updated.count === 0) return { emitted: false } // baska bir heartbeat kabul etti

  const ev = await prisma.userOnlineEvent.create({
    data: {
      userId: user.id,
      username: user.username || user.name || 'Kullanici',
      avatarUrl: user.image || null,
      effectId: user.premiumEntranceEffectId || null,
      effectUrl,
      effectType,
      durationMs,
      animationType: user.premiumEntranceAnimationType || 'slide_lr',
      tier: 'gold',
    },
    select: { id: true },
  })

  return { emitted: true, eventId: ev.id }
}

/**
 * Global Gold giris kartlari feed'i (client polling).
 * since verilirse ondan sonrasini, verilmezse son ONLINE_EVENT_FEED_WINDOW_MS penceresini doner.
 */
export async function getRecentOnlineEvents(sinceIso?: string | null, limit = 20) {
  const since = sinceIso
    ? new Date(sinceIso)
    : new Date(Date.now() - ONLINE_EVENT_FEED_WINDOW_MS)
  const events = await prisma.userOnlineEvent.findMany({
    where: { createdAt: { gt: since } },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      userId: true,
      username: true,
      avatarUrl: true,
      effectId: true,
      effectUrl: true,
      effectType: true,
      durationMs: true,
      animationType: true,
      tier: true,
      createdAt: true,
    },
  })
  return events
}

/**
 * Eski online-event kayitlarini temizle (feed sisme yapmasin).
 * Feed pencersinden cok daha eski kayitlar silinir.
 */
export async function cleanupOldOnlineEvents(): Promise<number> {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000) // 10 dk
  const res = await prisma.userOnlineEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  return res.count
}

/**
 * Bir falcinin backend-canonical durumunu hesapla.
 * Frontend tahmin etmez; bu deger API'den doner.
 *
 * @param isOnline teller.isOnline bayragi
 * @param lastActiveAt kullanicinin son aktifligi (bayat online'i offline'a cevirir)
 * @param isStreaming aktif canli yayin var mi
 * @param isInSession aktif seans (busy) var mi
 */
export function computeTellerStatus(params: {
  isOnline: boolean
  lastActiveAt?: Date | null
  isStreaming: boolean
  isInSession: boolean
}): PresenceStatus {
  const { isOnline, lastActiveAt, isStreaming, isInSession } = params
  // Bayat online kontrolu: online bayragi var ama son aktiflik penceresi disindaysa cevrimdisi say.
  const freshlyActive = !lastActiveAt || Date.now() - new Date(lastActiveAt).getTime() < ONLINE_WINDOW_MS
  const effectivelyOnline = isOnline && (lastActiveAt ? freshlyActive : true)
  if (!effectivelyOnline) return 'offline'
  if (isStreaming) return 'live'
  if (isInSession) return 'busy'
  return 'online'
}

export const PRESENCE_LABELS: Record<PresenceStatus, { tr: string; en: string }> = {
  live: { tr: 'Canli', en: 'Live' },
  busy: { tr: 'Mesgul', en: 'Busy' },
  online: { tr: 'Online', en: 'Online' },
  offline: { tr: 'Cevrimdisi', en: 'Offline' },
}
