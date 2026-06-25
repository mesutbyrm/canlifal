export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { contestId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) return NextResponse.json({ error: 'Giriş yapın' }, { status: 401 })
    const userId = authUser.id

    const { entryId } = await req.json()
    if (!entryId) return NextResponse.json({ error: 'Entry ID gerekli' }, { status: 400 })

    const entry = await prisma.dreamContestEntry.findUnique({ where: { id: entryId } })
    if (!entry || entry.contestId !== params.contestId) {
      return NextResponse.json({ error: 'Giriş bulunamadı' }, { status: 404 })
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
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 })
  }
}
