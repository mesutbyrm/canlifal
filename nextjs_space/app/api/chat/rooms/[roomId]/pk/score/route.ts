export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitChatEvent } from '@/lib/chat-events'

/**
 * PK Score endpoint for Chat Rooms.
 * POST /api/chat/rooms/{roomId}/pk/score
 * 
 * Adds gift points to the PK battle score.
 * Called by the gift API automatically, but can also be called directly.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    // §90 Fix: Only admin/superadmin can call PK score directly
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })
    }

    const { roomId } = params
    const body = await req.json()
    const { battleId, amount, side } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'amount gerekli ve pozitif olmalı' }, { status: 400 })
    }

    // Find the active PK for this room
    let battle
    if (battleId) {
      battle = await prisma.pKBattle.findFirst({
        where: { id: battleId, status: 'active' }
      })
    } else {
      battle = await prisma.pKBattle.findFirst({
        where: {
          OR: [{ stream1Id: roomId }, { stream2Id: roomId }],
          status: 'active'
        }
      })
    }

    if (!battle) {
      return NextResponse.json({ error: 'Aktif PK bulunamadı' }, { status: 404 })
    }

    // Determine which side to add score to
    let isRoom1: boolean
    if (side === 'room1' || side === 'challenger') {
      isRoom1 = true
    } else if (side === 'room2' || side === 'opponent') {
      isRoom1 = false
    } else {
      // Auto-detect: the room this request is for
      isRoom1 = battle.stream1Id === roomId
    }

    const updated = await prisma.pKBattle.update({
      where: { id: battle.id },
      data: isRoom1
        ? { score1: { increment: amount } }
        : { score2: { increment: amount } }
    })

    // Emit score update to both rooms
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
      battleId: updated.id,
      score1: updated.score1,
      score2: updated.score2
    })
  } catch (e) {
    console.error('Chat PK score error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
