import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/* Herkese açık: aktif + tamamlanmış yarışmaları listele */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const status = sp.get('status') || 'active'
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit = Math.min(50, parseInt(sp.get('limit') || '20'))

  const where: any = { isPublic: true }
  if (status === 'active') {
    where.status = 'active'
  } else if (status === 'completed') {
    where.status = 'completed'
  } else if (status === 'all') {
    where.status = { in: ['active', 'completed', 'scheduled'] }
  }

  const [contests, total] = await Promise.all([
    prisma.cfcContest.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { startsAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, name: true, slug: true, description: true, type: true, scope: true,
        status: true, startsAt: true, endsAt: true, isFeatured: true, bannerImage: true,
        rewards: true, scoringMetrics: true,
        _count: { select: { participants: true, teams: true } },
      },
    }),
    prisma.cfcContest.count({ where }),
  ])

  return NextResponse.json({ success: true, data: { contests, total, page, limit } })
}
