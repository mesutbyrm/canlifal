import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { serializeBattle } from '@/lib/gift-battles'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/battles/[battleId]
 * Single battle state — polled by the client every couple of seconds.
 * Public (no auth), 404 when the battle does not exist.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { battleId: string } }
) {
  try {
    const row = await prisma.giftBattle.findUnique({
      where: { id: params.battleId },
      include: {
        participants: {
          select: { participantId: true, displayName: true, score: true },
        },
      },
    })
    if (!row) {
      return NextResponse.json({ error: 'Hediye savaşı bulunamadı' }, { status: 404 })
    }
    return NextResponse.json(await serializeBattle(row as any))
  } catch (error) {
    console.error('[gifts/battles/:id GET]', error)
    return NextResponse.json({ error: 'Hediye savaşı alınamadı' }, { status: 500 })
  }
}
