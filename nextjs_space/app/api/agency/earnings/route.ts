import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const membership = await prisma.agencyUser.findUnique({
      where: { userId: authUser.id },
    })

    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = 20

    const [earnings, total] = await Promise.all([
      prisma.agencyEarning.findMany({
        where: { agencyId: membership.agencyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.agencyEarning.count({ where: { agencyId: membership.agencyId } }),
    ])

    // Get summary stats
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [weeklyEarnings, monthlyEarnings] = await Promise.all([
      prisma.agencyEarning.aggregate({
        where: { agencyId: membership.agencyId, createdAt: { gte: weekAgo } },
        _sum: { amount: true },
      }),
      prisma.agencyEarning.aggregate({
        where: { agencyId: membership.agencyId, createdAt: { gte: monthAgo } },
        _sum: { amount: true },
      }),
    ])

    // Daily breakdown for chart (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const dailyEarningsRaw = await prisma.agencyEarning.findMany({
      where: { agencyId: membership.agencyId, createdAt: { gte: thirtyDaysAgo } },
      select: { amount: true, createdAt: true },
    })

    // Group by day
    const dailyMap: Record<string, number> = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      dailyMap[key] = 0
    }
    for (const e of dailyEarningsRaw) {
      const key = new Date(e.createdAt).toISOString().slice(0, 10)
      if (dailyMap[key] !== undefined) {
        dailyMap[key] += e.amount
      }
    }
    const dailyChart = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount: Math.floor(amount) }))

    // Source type breakdown
    const sourceBreakdownRaw = await prisma.agencyEarning.groupBy({
      by: ['sourceType'],
      where: { agencyId: membership.agencyId, createdAt: { gte: monthAgo } },
      _sum: { amount: true },
      _count: true,
    })
    const sourceBreakdown = sourceBreakdownRaw.map(s => ({
      source: s.sourceType,
      amount: Math.floor(s._sum.amount || 0),
      count: s._count,
    }))

    // Per-member earnings (top performers)
    const memberEarningsRaw = await prisma.agencyEarning.groupBy({
      by: ['userId'],
      where: { agencyId: membership.agencyId, createdAt: { gte: monthAgo } },
      _sum: { amount: true },
      _count: true,
    })
    const memberIds = memberEarningsRaw.map(m => m.userId)
    const memberUsers = memberIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true, username: true, image: true },
    }) : []
    const userMap = Object.fromEntries(memberUsers.map(u => [u.id, u]))
    const memberPerformance = memberEarningsRaw
      .map(m => ({
        userId: m.userId,
        name: userMap[m.userId]?.name || 'Bilinmeyen',
        username: userMap[m.userId]?.username || null,
        image: userMap[m.userId]?.image || null,
        totalEarnings: Math.floor(m._sum.amount || 0),
        transactionCount: m._count,
      }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 10)

    return NextResponse.json({
      earnings,
      total,
      pages: Math.ceil(total / limit),
      summary: {
        weekly: weeklyEarnings._sum.amount || 0,
        monthly: monthlyEarnings._sum.amount || 0,
      },
      dailyChart,
      sourceBreakdown,
      memberPerformance,
    })
  } catch (error: any) {
    console.error('[Agency Earnings] Error:', error)
    return NextResponse.json({ error: 'Kazançlar alınamadı' }, { status: 500 })
  }
}
