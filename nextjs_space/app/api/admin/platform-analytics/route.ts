import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

/**
 * §41 Admin Dashboard KPI'lar + §56 Analitik
 * DAU/WAU/MAU, üyelik dağılımı, jeton/CFC hareketleri, oda/yayın istatistikleri
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'analytics.view')
  if (auth instanceof NextResponse) return auth

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)

  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn() } catch { return fallback }
  }

  const [
    totalUsers,
    dauCount,
    wauCount,
    mauCount,
    onlineCount,
    membershipBreakdown,
    bannedCount,
    frozenCount,
    activeAgencies,
    activeTellers,
    activeBroadcasters,
    activeRooms,
    activeLiveStreams,
    todayJetonIn,
    todayJetonOut,
    todayCfcIn,
    todayCfcOut,
    newUsersToday,
    newUsersWeek,
    newUsersMonth,
    totalGiftsToday,
    vipConversionsMonth,
  ] = await Promise.all([
    // Total users
    safe(() => prisma.user.count({ where: { isBot: false } }), 0),
    // DAU (active today)
    safe(() => prisma.user.count({ where: { lastActiveAt: { gte: today }, isBot: false } }), 0),
    // WAU
    safe(() => prisma.user.count({ where: { lastActiveAt: { gte: sevenDaysAgo }, isBot: false } }), 0),
    // MAU
    safe(() => prisma.user.count({ where: { lastActiveAt: { gte: thirtyDaysAgo }, isBot: false } }), 0),
    // Online (5 min)
    safe(() => prisma.user.count({ where: { lastActiveAt: { gte: fiveMinAgo }, isBot: false } }), 0),
    // Membership breakdown
    safe(async () => {
      const groups = await prisma.user.groupBy({ by: ['membership'], _count: true, where: { isBot: false } })
      const result: Record<string, number> = {}
      for (const g of groups) result[g.membership] = g._count
      return result
    }, {} as Record<string, number>),
    // Banned
    safe(() => prisma.user.count({ where: { isBanned: true } }), 0),
    // Frozen
    safe(() => prisma.user.count({ where: { isFrozen: true } }), 0),
    // Active agencies
    safe(() => prisma.agency.count({ where: { status: 'active' } }), 0),
    // Active tellers
    safe(() => prisma.liveFortuneTeller.count({ where: { isActive: true, isBanned: false, isFrozen: false } }), 0),
    // Active broadcasters
    safe(() => prisma.user.count({ where: { canBroadcast: true, isBanned: false } }), 0),
    // Active voice rooms
    safe(() => prisma.chatRoom.count({ where: { isActive: true } }), 0),
    // Active live streams
    safe(() => prisma.videoStream.count({ where: { status: 'live' } }), 0),
    // Today jeton in (credits purchased)
    safe(async () => {
      const r = await prisma.jetonTransaction.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: today }, type: { in: ['purchase', 'admin_grant', 'bonus'] } } })
      return r._sum.amount || 0
    }, 0),
    // Today jeton out (spent)
    safe(async () => {
      const r = await prisma.jetonTransaction.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: today }, type: { in: ['spend', 'gift', 'session_payment', 'fortune_payment'] } } })
      return Math.abs(r._sum.amount || 0)
    }, 0),
    // Today CFC in
    safe(async () => {
      const r = await prisma.creditTransaction.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: today }, amount: { gt: 0 } } })
      return r._sum.amount || 0
    }, 0),
    // Today CFC out
    safe(async () => {
      const r = await prisma.creditTransaction.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: today }, amount: { lt: 0 } } })
      return Math.abs(r._sum.amount || 0)
    }, 0),
    // New users today
    safe(() => prisma.user.count({ where: { createdAt: { gte: today }, isBot: false } }), 0),
    // New users this week
    safe(() => prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo }, isBot: false } }), 0),
    // New users this month
    safe(() => prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo }, isBot: false } }), 0),
    // Gifts today
    safe(async () => {
      const r = await prisma.streamGift.aggregate({ _sum: { totalPrice: true }, where: { createdAt: { gte: today } } })
      return r._sum.totalPrice || 0
    }, 0),
    // VIP conversions this month
    safe(() => prisma.user.count({ where: { membership: { not: 'basic' }, membershipExpiresAt: { gte: thirtyDaysAgo } } }), 0),
  ])

  // Retention: users active today who were also active 7 days ago
  const retentionRate = await safe(async () => {
    if (dauCount === 0) return 0
    const sevenDaysAgoStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const sevenDaysAgoEnd = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
    const activeLastWeek = await prisma.user.count({ where: { lastActiveAt: { gte: sevenDaysAgoStart, lt: sevenDaysAgoEnd }, isBot: false } })
    if (activeLastWeek === 0) return 0
    return Math.round((dauCount / activeLastWeek) * 100)
  }, 0)

  return NextResponse.json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        dau: dauCount,
        wau: wauCount,
        mau: mauCount,
        online: onlineCount,
        banned: bannedCount,
        frozen: frozenCount,
        retentionRate,
        newToday: newUsersToday,
        newWeek: newUsersWeek,
        newMonth: newUsersMonth,
      },
      memberships: membershipBreakdown,
      platform: {
        activeAgencies,
        activeTellers,
        activeBroadcasters,
        activeRooms,
        activeLiveStreams,
      },
      economy: {
        jetonInToday: todayJetonIn,
        jetonOutToday: todayJetonOut,
        cfcInToday: todayCfcIn,
        cfcOutToday: todayCfcOut,
        giftsToday: totalGiftsToday,
        vipConversionsMonth,
      },
      generatedAt: now.toISOString(),
    },
  })
}
