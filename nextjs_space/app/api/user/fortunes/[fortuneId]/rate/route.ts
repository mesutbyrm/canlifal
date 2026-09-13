import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/** POST /api/user/fortunes/{id}/rate — falı 1-5 arası puanlar. */
export async function POST(req: NextRequest, { params }: { params: { fortuneId: string } }) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const raw = body?.rating ?? body?.score ?? body?.stars
    const rating = Math.round(Number(raw))
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Puan 1 ile 5 arasında olmalı' }, { status: 400 })
    }
    const note = body?.note ?? body?.comment
    const fortune = await prisma.fortune.findFirst({
      where: { id: params.fortuneId, userId: auth.id },
      select: { id: true },
    })
    if (!fortune) {
      return NextResponse.json({ error: 'Fal bulunamadı' }, { status: 404 })
    }
    const updated = await prisma.fortune.update({
      where: { id: fortune.id },
      data: {
        rating,
        ratingNote: note ? String(note).slice(0, 500) : null,
        ratedAt: new Date(),
      },
      select: { id: true, rating: true, ratingNote: true, ratedAt: true },
    })
    return NextResponse.json({ success: true, ...updated, data: updated })
  } catch (error) {
    console.error('[Fortune rate] Error:', error)
    return NextResponse.json({ error: 'Fal puanlanamadı' }, { status: 500 })
  }
}
