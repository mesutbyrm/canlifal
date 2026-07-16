import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitChatEvent } from '@/lib/chat-events'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/pk/score
 * Update PK battle score. Usually called automatically by gift API,
 * but can also be called directly.
 *
 * Body: { battleId?, roomId?, amount, side?: 'room1' | 'room2' }
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { battleId, roomId, amount, side } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_AMOUNT', message: 'amount gerekli ve pozitif olmalı' } },
        { status: 400 }
      )
    }

    // Find active PK
    let battle
    if (battleId) {
      battle = await prisma.pKBattle.findFirst({ where: { id: battleId, status: 'active' } })
    } else if (roomId) {
      battle = await prisma.pKBattle.findFirst({
        where: {
          OR: [{ stream1Id: roomId }, { stream2Id: roomId }],
          status: 'active'
        }
      })
    }

    if (!battle) {
      return NextResponse.json(
        { success: false, error: { code: 'PK_NOT_FOUND', message: 'Aktif PK bulunamadı' } },
        { status: 404 }
      )
    }

    // Determine side
    let isRoom1: boolean
    if (side === 'room1' || side === 'challenger') {
      isRoom1 = true
    } else if (side === 'room2' || side === 'opponent') {
      isRoom1 = false
    } else {
      isRoom1 = battle.stream1Id === roomId
    }

    const updated = await prisma.pKBattle.update({
      where: { id: battle.id },
      data: isRoom1
        ? { score1: { increment: amount } }
        : { score2: { increment: amount } }
    })

    // Emit score update
    const scoreData = {
      battleId: battle.id,
      action: 'score_update',
      score1: updated.score1,
      score2: updated.score2,
      room1Id: battle.stream1Id,
      room2Id: battle.stream2Id,
      addedAmount: amount,
      addedSide: isRoom1 ? 'room1' : 'room2',
    }
    emitChatEvent(battle.stream1Id, 'pk', scoreData)
    emitChatEvent(battle.stream2Id, 'pk', scoreData)

    return NextResponse.json({
      success: true,
      data: {
        battleId: updated.id,
        score1: updated.score1,
        score2: updated.score2,
      }
    })
  } catch (error) {
    console.error('[LIVE/pk/score] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Skor güncellenemedi' } },
      { status: 500 }
    )
  }
}
