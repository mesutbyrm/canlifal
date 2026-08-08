// Ortak sıralama (leaderboard) servis katmanı.
// Hem kanonik /api/leaderboards ucu hem de geriye dönük uyumluluk için tutulan
// /api/leaderboard ucu bu tek kaynağı kullanır — iş mantığı tek yerde durur.

import prisma from '@/lib/db'
import { getCached } from '@/lib/cache'

export interface LeaderboardEntry {
  id: string
  name: string | null
  image: string | null
  role?: string | null
  membership?: string | null
  count: number
}

export interface CommunityLeaderboards {
  topReferrers: LeaderboardEntry[]
  topFortuneUsers: LeaderboardEntry[]
  topSharers: LeaderboardEntry[]
}

const userSelect = {
  id: true,
  name: true,
  image: true,
  role: true,
  membership: true,
}

function mapUser(u: any, countField: string): LeaderboardEntry {
  return {
    id: u.id,
    name: u.name,
    image: u.image,
    role: u.role,
    membership: u.membership,
    count: u._count?.[countField] ?? 0,
  }
}

/**
 * Topluluk sıralamaları: en çok davet eden, en çok fal baktıran, en çok paylaşan.
 * 30 sn önbelleklenir.
 */
export async function getCommunityLeaderboards(): Promise<CommunityLeaderboards> {
  return getCached('leaderboards:community', 30, async () => {
    const [topReferrers, topFortuneUsers, topSharers] = await Promise.all([
      prisma.user.findMany({
        where: { referrals: { some: {} } },
        select: { ...userSelect, _count: { select: { referrals: true } } },
        orderBy: { referrals: { _count: 'desc' } },
        take: 20,
      }),
      prisma.user.findMany({
        where: { fortunes: { some: {} } },
        select: { ...userSelect, _count: { select: { fortunes: true } } },
        orderBy: { fortunes: { _count: 'desc' } },
        take: 20,
      }),
      prisma.user.findMany({
        where: { socialPosts: { some: {} } },
        select: { ...userSelect, _count: { select: { socialPosts: true } } },
        orderBy: { socialPosts: { _count: 'desc' } },
        take: 20,
      }),
    ])

    return {
      topReferrers: topReferrers.map((u: any) => mapUser(u, 'referrals')),
      topFortuneUsers: topFortuneUsers.map((u: any) => mapUser(u, 'fortunes')),
      topSharers: topSharers.map((u: any) => mapUser(u, 'socialPosts')),
    }
  })
}
