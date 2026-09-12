import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

/* Yarışma detayı + katılımcılar + takımlar + skor geçmişi */
export async function GET(req: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = await requirePermission(req, 'contest.manage')
  if (auth instanceof NextResponse) return auth

  const sp = req.nextUrl.searchParams
  const section = sp.get('section') || 'overview'
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit = Math.min(100, parseInt(sp.get('limit') || '50'))

  const contest = await prisma.cfcContest.findUnique({
    where: { id: params.contestId },
    include: {
      season: { select: { id: true, name: true } },
      _count: { select: { participants: true, teams: true, scoreLogs: true } },
    },
  })
  if (!contest) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Yarışma bulunamadı' } }, { status: 404 })

  if (section === 'overview') {
    return NextResponse.json({ success: true, data: { contest } })
  }

  if (section === 'participants') {
    const participants = await prisma.cfcParticipant.findMany({
      where: { contestId: params.contestId },
      orderBy: { rank: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { team: { select: { id: true, name: true, color: true, badgeEmoji: true } } },
    })
    // Enrich with user names
    const userIds = participants.filter(p => p.userId).map(p => p.userId as string)
    const users = userIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, username: true, image: true } }) : []
    const userMap = new Map(users.map(u => [u.id, u]))
    const enriched = participants.map(p => ({ ...p, user: p.userId ? userMap.get(p.userId) || null : null }))
    const total = await prisma.cfcParticipant.count({ where: { contestId: params.contestId } })
    return NextResponse.json({ success: true, data: { contest: { id: contest.id, name: contest.name }, participants: enriched, total, page, limit } })
  }

  if (section === 'teams') {
    const teams = await prisma.cfcTeam.findMany({
      where: { contestId: params.contestId },
      orderBy: { rank: 'asc' },
      include: { _count: { select: { members: true } } },
    })
    return NextResponse.json({ success: true, data: { contest: { id: contest.id, name: contest.name }, teams } })
  }

  if (section === 'scores') {
    const logs = await prisma.cfcScoreLog.findMany({
      where: { contestId: params.contestId },
      orderBy: { calculatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })
    const total = await prisma.cfcScoreLog.count({ where: { contestId: params.contestId } })
    return NextResponse.json({ success: true, data: { logs, total, page, limit } })
  }

  return NextResponse.json({ success: true, data: { contest } })
}
