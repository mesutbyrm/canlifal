export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { contestId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Giri\u015f yap\u0131n' }, { status: 401 })
    const userId = (session.user as any).id

    const { entryId } = await req.json()
    if (!entryId) return NextResponse.json({ error: 'Entry ID gerekli' }, { status: 400 })

    const entry = await prisma.dreamContestEntry.findUnique({ where: { id: entryId } })
    if (!entry || entry.contestId !== params.contestId) {
      return NextResponse.json({ error: 'Giri\u015f bulunamad\u0131' }, { status: 404 })
    }
    if (entry.userId === userId) {
      return NextResponse.json({ error: 'Kendi yorumunuza oy veremezsiniz' }, { status: 400 })
    }

    const existing = await prisma.dreamContestVote.findUnique({
      where: { entryId_userId: { entryId, userId } },
    })

    if (existing) {
      await prisma.dreamContestVote.delete({ where: { id: existing.id } })
      await prisma.dreamContestEntry.update({ where: { id: entryId }, data: { voteCount: { decrement: 1 } } })
      return NextResponse.json({ voted: false })
    } else {
      await prisma.dreamContestVote.create({ data: { entryId, userId } })
      await prisma.dreamContestEntry.update({ where: { id: entryId }, data: { voteCount: { increment: 1 } } })
      return NextResponse.json({ voted: true })
    }
  } catch (error) {
    console.error('Contest vote error:', error)
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}
