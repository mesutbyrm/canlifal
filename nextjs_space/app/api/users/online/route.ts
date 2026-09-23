// @ts-nocheck
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCached } from '@/lib/cache'
import { getTiers, normalizeTierKey } from '@/lib/vip-entitlements'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Cache online users for 10 seconds - polled frequently from sidebar/navbar
    const onlineUsers = await getCached('online:users', 10, async () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

      const presences = await prisma.sitePresence.findMany({
        where: {
          lastSeen: { gte: twoMinutesAgo },
          userId: { not: null }
        },
        select: {
          userId: true,
          path: true,
          lastSeen: true,
        },
        orderBy: { lastSeen: 'desc' },
        take: 50
      })

      const userIds = [...new Set(presences.map(p => p.userId).filter(Boolean))] as string[]
      if (userIds.length === 0) return []

      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          image: true,
          username: true,
          membership: true,
          membershipExpiresAt: true,
          vipPreference: { select: { hideOnlineStatus: true } },
        }
      })

      // ── BÖLÜM 20 §11: Premium+ "çevrimiçi durumunu gizle" (BACKEND zorunlu) ──
      // Üyelik süresi dolduysa gizlilik otomatik kalkar (§23).
      const tiers = await getTiers()
      const rankOf = (key: string | null | undefined) =>
        tiers.find(t => t.key === normalizeTierKey(key, tiers.map(x => x.key)))?.rank ?? 0
      const premiumRank = tiers.find(t => t.key === 'premium')?.rank ?? 20
      const now = Date.now()
      const visible = users.filter(u => {
        if (!u.vipPreference?.hideOnlineStatus) return true
        const expired = u.membershipExpiresAt ? new Date(u.membershipExpiresAt).getTime() <= now : false
        const effectiveTier = expired ? 'basic' : u.membership
        return rankOf(effectiveTier) < premiumRank
      })

      const userMap = new Map(visible.map(u => [u.id, u]))

      return presences
        .filter(p => p.userId && userMap.has(p.userId))
        .map(p => {
          const user = userMap.get(p.userId!)
          return {
            id: user?.id,
            name: user?.name,
            image: user?.image,
            username: user?.username,
            path: p.path,
            lastSeen: p.lastSeen
          }
        })
        .filter((user, index, self) => 
          index === self.findIndex(u => u.id === user.id)
        )
    })

    return NextResponse.json({
      count: onlineUsers.length,
      users: onlineUsers
    })
  } catch (error) {
    console.error('Online users fetch error:', error)
    return NextResponse.json({ count: 0, users: [] })
  }
}
