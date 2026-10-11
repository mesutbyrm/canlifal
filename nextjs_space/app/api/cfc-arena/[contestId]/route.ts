import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/* Herkese açık: yarışma detayı + sıralama */
export async function GET(req: NextRequest, { params }: { params: { contestId: string } }) {
  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit = Math.min(100, parseInt(sp.get('limit') || '50'))

  const contest = await prisma.cfcContest.findUnique({
    where: { id: params.contestId },
    select: {
      id: true, name: true, slug: true, description: true, type: true, scope: true,
      status: true, startsAt: true, endsAt: true, isFeatured: true, bannerImage: true,
      rewards: true, scoringMetrics: true, rules: true, commissionRate: true,
      _count: { select: { participants: true, teams: true } },
    },
  })
  if (!contest || contest.status === 'draft') {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Yarışma bulunamadı' } }, { status: 404 })
  }

  const participants = await prisma.cfcParticipant.findMany({
    where: { contestId: params.contestId, status: 'active' },
    orderBy: { rank: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
    select: { id: true, userId: true, agencyId: true, roomId: true, displayName: true, score: true, rank: true, teamId: true },
  })

  const userIds = participants.filter(p => p.userId).map(p => p.userId as string)
  const users = userIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, username: true, image: true } }) : []
  const userMap = new Map(users.map(u => [u.id, u]))
  const enriched = participants.map(p => ({ ...p, user: p.userId ? userMap.get(p.userId) || null : null }))

  const teams = await prisma.cfcTeam.findMany({ where: { contestId: params.contestId }, orderBy: { rank: 'asc' }, select: { id: true, name: true, color: true, badgeEmoji: true, totalScore: true, rank: true, _count: { select: { members: true } } } })

  return NextResponse.json({ success: true, data: { contest, leaderboard: enriched, teams, page, limit } })
}
