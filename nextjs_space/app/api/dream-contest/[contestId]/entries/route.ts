export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

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

    const session = await getServerSession(authOptions)
    const userId = session?.user ? (session.user as any).id : null
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
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { contestId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Giri\u015f yap\u0131n' }, { status: 401 })
    const userId = (session.user as any).id

    const contest = await prisma.dreamContest.findUnique({ where: { id: params.contestId } })
    if (!contest || !contest.isActive) return NextResponse.json({ error: 'Yar\u0131\u015fma bulunamad\u0131' }, { status: 404 })
    const now = new Date()
    if (now > contest.endDate) return NextResponse.json({ error: 'Yar\u0131\u015fma sona erdi' }, { status: 400 })

    const { interpretation } = await req.json()
    if (!interpretation || interpretation.length < 20) {
      return NextResponse.json({ error: 'Yorum en az 20 karakter olmal\u0131' }, { status: 400 })
    }

    const entry = await prisma.dreamContestEntry.create({
      data: { contestId: params.contestId, userId, interpretation },
    })

    await prisma.user.update({ where: { id: userId }, data: { xp: { increment: 15 } } })

    return NextResponse.json(entry)
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Zaten kat\u0131ld\u0131n\u0131z' }, { status: 400 })
    console.error('Contest entry POST error:', error)
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}
