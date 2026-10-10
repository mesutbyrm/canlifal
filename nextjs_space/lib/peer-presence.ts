import prisma from '@/lib/db'
import { getTiers, normalizeTierKey } from '@/lib/vip-entitlements'

/** `/api/users/online` ile aynı pencere. */
export const ONLINE_WINDOW_MS = 2 * 60 * 1000

export interface PeerPresence {
  isOnline: boolean
  /** Yalnız çevrimdışıyken ve kullanıcı son görülmeyi gizlemediyse dolu. */
  lastSeenAt: string | null
}

/**
 * Sohbet karşı tarafları için gerçek çevrimiçi / son görülme bilgisi.
 * Premium+ gizlilik tercihleri (`hideOnlineStatus`, `hideLastSeen`) üyelik
 * süresi dolmadıysa uygulanır — `/api/users/online` ile aynı kural.
 */
export async function getPeerPresence(userIds: string[]): Promise<Map<string, PeerPresence>> {
  const out = new Map<string, PeerPresence>()
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return out

  const since = new Date(Date.now() - ONLINE_WINDOW_MS)
  const [presences, users, tiers] = await Promise.all([
    prisma.sitePresence.findMany({
      where: { userId: { in: ids }, lastSeen: { gte: since } },
      select: { userId: true },
    }),
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        lastActiveAt: true,
        membership: true,
        membershipExpiresAt: true,
        vipPreference: { select: { hideOnlineStatus: true, hideLastSeen: true } },
      },
    }),
    getTiers(),
  ])

  const onlineIds = new Set(presences.map((p) => p.userId).filter(Boolean) as string[])
  const known = tiers.map((t) => t.key)
  const rankOf = (key: string | null | undefined) => tiers.find((t) => t.key === normalizeTierKey(key, known))?.rank ?? 0
  const premiumRank = tiers.find((t) => t.key === 'premium')?.rank ?? 20
  const now = Date.now()

  for (const u of users) {
    const expired = u.membershipExpiresAt ? new Date(u.membershipExpiresAt).getTime() <= now : false
    const premium = rankOf(expired ? 'basic' : u.membership) >= premiumRank
    const hideOnline = premium && !!u.vipPreference?.hideOnlineStatus
    const hideLastSeen = premium && !!u.vipPreference?.hideLastSeen
    const isOnline = !hideOnline && onlineIds.has(u.id)
    out.set(u.id, {
      isOnline,
      // Çevrimiçi gizliyse son görülme de verilmez; aksi halde "az önce" çevrimiçi olduğu sızar.
      lastSeenAt: isOnline || hideOnline || hideLastSeen || !u.lastActiveAt ? null : new Date(u.lastActiveAt).toISOString(),
    })
  }
  return out
}
