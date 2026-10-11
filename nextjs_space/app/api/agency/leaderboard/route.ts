import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const period = req.nextUrl.searchParams.get('period') || 'all' // all, monthly, weekly
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 50)

    // Get approved agencies with member counts
    const agencies = await prisma.agency.findMany({
      where: { status: 'approved' },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        totalEarnings: true,
        totalMembers: true,
        activeMembers: true,
        performanceScore: true,
        createdAt: true,
        ownerName: true,
      },
      orderBy: [
        { performanceScore: 'desc' },
        { totalEarnings: 'desc' },
      ],
      take: limit,
    })

    // If period filter, calculate earnings for that period
    if (period !== 'all') {
      const now = new Date()
      const since = period === 'weekly'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const agencyIds = agencies.map(a => a.id)
      const periodEarnings = await prisma.agencyEarning.groupBy({
        by: ['agencyId'],
        where: { agencyId: { in: agencyIds }, createdAt: { gte: since } },
        _sum: { amount: true },
      })
      const earningsMap = Object.fromEntries(
        periodEarnings.map(e => [e.agencyId, e._sum.amount || 0])
      )

      const ranked = agencies.map(a => ({
        ...a,
        periodEarnings: Math.floor(earningsMap[a.id] || 0),
      })).sort((a, b) => b.periodEarnings - a.periodEarnings)

      return NextResponse.json({ agencies: ranked, period })
    }

    return NextResponse.json({
      agencies: agencies.map(a => ({ ...a, periodEarnings: Math.floor(a.totalEarnings) })),
      period: 'all',
    })
  } catch (error: any) {
    console.error('[Agency Leaderboard] Error:', error)
    return NextResponse.json({ error: 'Sıralama alınamadı' }, { status: 500 })
  }
}
