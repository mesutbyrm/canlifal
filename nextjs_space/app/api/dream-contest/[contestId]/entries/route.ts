export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { contestId: string } }
) {
  try {
    const entries = await prisma.dreamContestEntry.findMany({
      where: { contestId: params.contestId },
      orderBy: { voteCount: 'desc' },
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
        _count: { select: { votes: true } },
      },
    })

    const authUser = await authenticateRequest(request)
    const userId = authUser ? authUser.id : null
    let userVotedEntryIds: string[] = []
    if (userId) {
      const votes = await prisma.dreamContestVote.findMany({
        where: { userId, entry: { contestId: params.contestId } },
        select: { entryId: true },
      })
      userVotedEntryIds = votes.map((v: { entryId: string }) => v.entryId)
    }

    return NextResponse.json({ entries, userVotedEntryIds })
  } catch (error) {
    console.error('Contest entries GET error:', error)
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { contestId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) return NextResponse.json({ error: 'Giriş yapın' }, { status: 401 })
    const userId = authUser.id

    const contest = await prisma.dreamContest.findUnique({ where: { id: params.contestId } })
    if (!contest || !contest.isActive) return NextResponse.json({ error: 'Yarışma bulunamadı' }, { status: 404 })
    const now = new Date()
    if (now > contest.endDate) return NextResponse.json({ error: 'Yarışma sona erdi' }, { status: 400 })

    const { interpretation } = await req.json()
    if (!interpretation || interpretation.length < 20) {
      return NextResponse.json({ error: 'Yorum en az 20 karakter olmalı' }, { status: 400 })
    }

    const entry = await prisma.dreamContestEntry.create({
      data: { contestId: params.contestId, userId, interpretation },
    })

    await prisma.user.update({ where: { id: userId }, data: { xp: { increment: 15 } } })

    return NextResponse.json(entry)
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Zaten katıldınız' }, { status: 400 })
    console.error('Contest entry POST error:', error)
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 })
  }
}
