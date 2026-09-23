import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { getBonusRateForLevel } from '@/lib/agency-wallet'

export const dynamic = 'force-dynamic'

const AGENCY_LEVELS_THRESHOLDS = [
  { key: 'bronze', label: 'Bronz', minEarning: 0, minBroadcasters: 0, minStreamMin: 0 },
  { key: 'silver', label: 'Silver', minEarning: 5000, minBroadcasters: 5, minStreamMin: 3000 },
  { key: 'gold', label: 'Gold', minEarning: 20000, minBroadcasters: 15, minStreamMin: 15000 },
  { key: 'diamond', label: 'Diamond', minEarning: 100000, minBroadcasters: 50, minStreamMin: 60000 },
]

/**
 * §20 — Ajans Gelişim Paneli
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as any).user

  const isAdmin = ['admin', 'yonetici', 'kurucu', 'moderator'].includes(user.role)
  let agencyId: string | null = null
  const qAgencyId = req.nextUrl.searchParams.get('agencyId')
  if (isAdmin && qAgencyId) {
    agencyId = qAgencyId
  } else {
    const owned = await prisma.agency.findFirst({ where: { ownerId: user.id, status: 'approved' }, select: { id: true } })
    const membership = await prisma.agencyUser.findUnique({ where: { userId: user.id }, select: { agencyId: true, role: true, isActive: true } })
    agencyId = owned?.id || (membership?.isActive && ['owner', 'manager'].includes(membership.role) ? membership.agencyId : null)
  }
  if (!agencyId) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Erişim yetkiniz yok' } }, { status: 403 })
  }

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { id: true, name: true, level: true, commissionRate: true, totalEarnings: true, performanceScore: true, createdAt: true, totalMembers: true, activeMembers: true },
  })
  if (!agency) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ajans bulunamadı' } }, { status: 404 })

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  // Get all active members
  const members = await prisma.agencyUser.findMany({
    where: { agencyId, isActive: true },
    select: { userId: true, role: true, totalEarnings: true, joinedAt: true, user: { select: { name: true, username: true, image: true, lastActiveAt: true } } },
  })
  const userIds = members.map(m => m.userId)

  // Streams this month & last month for comparison
  const [thisMonthStreams, lastMonthStreams, thisMonthEarnings, lastMonthEarnings] = await Promise.all([
    prisma.videoStream.findMany({
      where: { userId: { in: userIds }, startedAt: { gte: thisMonthStart } },
      select: { userId: true, startedAt: true, endedAt: true, viewerCount: true },
    }),
    prisma.videoStream.findMany({
      where: { userId: { in: userIds }, startedAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      select: { userId: true, startedAt: true, endedAt: true, viewerCount: true },
    }),
    prisma.agencyEarning.aggregate({
      where: { agencyId, createdAt: { gte: thisMonthStart } },
      _sum: { amount: true }, _count: true,
    }),
    prisma.agencyEarning.aggregate({
      where: { agencyId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { amount: true }, _count: true,
    }),
  ])

  // Calculate stream minutes
  const calcMinutes = (streams: Array<{ startedAt: Date; endedAt: Date | null }>) =>
    streams.reduce((acc, s) => acc + Math.max(0, Math.min(((s.endedAt || now).getTime() - s.startedAt.getTime()) / 60000, 720)), 0)

  const thisMonthMinutes = Math.round(calcMinutes(thisMonthStreams))
  const lastMonthMinutes = Math.round(calcMinutes(lastMonthStreams))
  const minutesChange = lastMonthMinutes > 0 ? Math.round(((thisMonthMinutes - lastMonthMinutes) / lastMonthMinutes) * 100) : (thisMonthMinutes > 0 ? 100 : 0)

  // Active broadcasters this month
  const activeBroadcasters = new Set(thisMonthStreams.map(s => s.userId))
  const lastMonthBroadcasters = new Set(lastMonthStreams.map(s => s.userId))

  // New members this month
  const newMembers = members.filter(m => new Date(m.joinedAt) >= thisMonthStart)
  // Members who left this month
  const leftCount = await prisma.agencyUser.count({
    where: { agencyId, isActive: false, leftAt: { gte: thisMonthStart } },
  })

  // Per-member performance
  const memberPerf = members.map(m => {
    const myStreams = thisMonthStreams.filter(s => s.userId === m.userId)
    const mins = Math.round(calcMinutes(myStreams))
    const viewers = myStreams.reduce((a, s) => a + (s.viewerCount || 0), 0)
    return { userId: m.userId, name: m.user.name, username: m.user.username, image: m.user.image, role: m.role, totalEarnings: m.totalEarnings, streamCount: myStreams.length, streamMinutes: mins, totalViewers: viewers }
  }).sort((a, b) => b.totalEarnings - a.totalEarnings)

  const topPerformers = memberPerf.filter(m => m.streamMinutes > 0).slice(0, 5)
  const needsImprovement = memberPerf.filter(m => m.streamMinutes === 0 && m.role === 'member').slice(0, 5)

  // Earnings change
  const thisEarnings = thisMonthEarnings._sum.amount || 0
  const lastEarnings = lastMonthEarnings._sum.amount || 0
  const earningsChange = lastEarnings > 0 ? Math.round(((thisEarnings - lastEarnings) / lastEarnings) * 100) : (thisEarnings > 0 ? 100 : 0)

  // Growth rate (member count change)
  const growthRate = agency.totalMembers > 0 ? Math.round(((newMembers.length - leftCount) / agency.totalMembers) * 100) : 0

  // Next level info
  const currentLevelIdx = AGENCY_LEVELS_THRESHOLDS.findIndex(l => l.key === (agency.level || 'bronze'))
  const nextLevel = AGENCY_LEVELS_THRESHOLDS[currentLevelIdx + 1] || null
  const bonusRate = await getBonusRateForLevel(agency.level || 'bronze')

  let nextLevelCriteria: any = null
  if (nextLevel) {
    nextLevelCriteria = {
      level: nextLevel.key,
      label: nextLevel.label,
      criteria: {
        minEarning: { required: nextLevel.minEarning, current: agency.totalEarnings, met: agency.totalEarnings >= nextLevel.minEarning },
        minBroadcasters: { required: nextLevel.minBroadcasters, current: activeBroadcasters.size, met: activeBroadcasters.size >= nextLevel.minBroadcasters },
        minStreamMinutes: { required: nextLevel.minStreamMin, current: thisMonthMinutes, met: thisMonthMinutes >= nextLevel.minStreamMin },
      },
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      agency: { ...agency, bonusRate },
      thisMonth: {
        streamMinutes: thisMonthMinutes,
        streamMinutesChange: minutesChange,
        activeBroadcasters: activeBroadcasters.size,
        lastMonthBroadcasters: lastMonthBroadcasters.size,
        newMembers: newMembers.length,
        leftMembers: leftCount,
        earnings: thisEarnings,
        earningsChange,
        earningsCount: thisMonthEarnings._count || 0,
      },
      performance: agency.performanceScore,
      growthRate,
      topPerformers,
      needsImprovement,
      memberPerformance: memberPerf,
      nextLevelCriteria,
    },
  })
}
