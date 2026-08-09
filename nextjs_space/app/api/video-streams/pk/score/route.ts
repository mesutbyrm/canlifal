export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { emitStreamEvent } from '@/lib/stream-events'

// POST - Add gift points to a PK battle side
// Called from the gift sending endpoint
export async function POST(req: NextRequest) {
  try {
    const { battleId, streamId, points } = await req.json()
    
    if (!battleId || !streamId || !points) {
      return NextResponse.json({ error: 'battleId, streamId ve points gerekli' }, { status: 400 })
    }

    const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
    if (!battle || battle.status !== 'active') {
      return NextResponse.json({ error: 'Aktif PK bulunamadı' }, { status: 404 })
    }

    // Determine which side gets the points
    const isStream1 = battle.stream1Id === streamId
    const isStream2 = battle.stream2Id === streamId
    
    if (!isStream1 && !isStream2) {
      return NextResponse.json({ error: 'Stream bu PK\'ya ait değil' }, { status: 400 })
    }

    const updated = await prisma.pKBattle.update({
      where: { id: battleId },
      data: isStream1 ? { score1: { increment: points } } : { score2: { increment: points } }
    })

    const scoreData = {
      type: 'pk',
      battleId: battle.id,
      action: 'score_update',
      room1Id: battle.stream1Id,
      room2Id: battle.stream2Id,
      score1: updated.score1,
      score2: updated.score2,
      addedAmount: points,
      addedSide: isStream1 ? 'room1' : 'room2',
    }
    emitStreamEvent(battle.stream1Id, 'pk', scoreData)
    emitStreamEvent(battle.stream2Id, 'pk', scoreData)

    return NextResponse.json({
      score1: updated.score1,
      score2: updated.score2
    })
  } catch (e) {
    console.error('PK score error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
