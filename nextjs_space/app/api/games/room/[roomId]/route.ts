import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { processMove } from '@/lib/game-logic'

export const dynamic = 'force-dynamic'

// GET: Get room state (also checks disconnect timeout)
export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const room = await prisma.gameRoom.findUnique({
      where: { id: params.roomId },
      include: { _count: { select: { viewers: true } } },
    })
    if (!room) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })

    // Auto-forfeit: if active PvP game with timer, check disconnect (10s after turn timer expires)
    if (room.status === 'active' && !room.isAI && room.turnTimer > 0 && room.lastMoveAt) {
      const elapsed = (Date.now() - new Date(room.lastMoveAt).getTime()) / 1000
      const timeout = room.turnTimer + 10 // grace period of 10s after turn timer
      if (elapsed > timeout) {
        // Current turn player forfeits
        const loserId = room.currentTurn === 1 ? room.player1Id : room.player2Id
        const winnerId = room.currentTurn === 1 ? room.player2Id : room.player1Id
        await settleBet(room, winnerId, loserId || '')
        const updated = await prisma.gameRoom.update({
          where: { id: params.roomId },
          data: { status: 'completed', winnerId, lastMoveAt: new Date() },
        })
        const { _count: c2, ...d2 } = { ...updated, _count: room._count }
        return NextResponse.json({ ...d2, viewerCount: c2.viewers, autoForfeit: true })
      }
    }

    const { _count, ...data } = room
    return NextResponse.json({ ...data, viewerCount: _count.viewers })
  } catch (error: any) {
    console.error('Game room get error:', error)
    return NextResponse.json({ error: 'Oda yüklenemedi' }, { status: 500 })
  }
}

// POST: Join a waiting room
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const room = await prisma.gameRoom.findUnique({ where: { id: params.roomId } })
    if (!room) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    if (room.status !== 'waiting') return NextResponse.json({ error: 'Bu odaya katılınamaz' }, { status: 400 })
    if (room.player1Id === session.user.id) return NextResponse.json({ error: 'Kendi odanıza katılamazsınız' }, { status: 400 })

    if (room.betAmount > 0) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { credits: true, jetonBalance: true } })
      if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
      if (room.betCurrency === 'CFC' && user.credits < room.betAmount) return NextResponse.json({ error: 'Yetersiz CFC bakiyesi' }, { status: 400 })
      if (room.betCurrency === 'JETON' && user.jetonBalance < room.betAmount) return NextResponse.json({ error: 'Yetersiz Jeton bakiyesi' }, { status: 400 })
      await prisma.user.update({
        where: { id: session.user.id },
        data: room.betCurrency === 'CFC' ? { credits: { decrement: room.betAmount } } : { jetonBalance: { decrement: room.betAmount } },
      })
    }

    const userName = (session.user as any)?.name || 'Oyuncu 2'
    const updated = await prisma.gameRoom.update({
      where: { id: params.roomId },
      data: { player2Id: session.user.id, player2Name: userName, status: 'active', lastMoveAt: new Date() },
    })
    return NextResponse.json({ success: true, room: updated })
  } catch (error: any) {
    console.error('Game room join error:', error)
    return NextResponse.json({ error: 'Odaya katılınamadı' }, { status: 500 })
  }
}

// PATCH: Make a move
export async function PATCH(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const body = await req.json()
    const room = await prisma.gameRoom.findUnique({ where: { id: params.roomId } })
    if (!room) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    if (room.status !== 'active') return NextResponse.json({ error: 'Oyun aktif değil' }, { status: 400 })

    const isP1 = room.player1Id === session.user.id
    const isP2 = room.player2Id === session.user.id
    if (!isP1 && !isP2) return NextResponse.json({ error: 'Bu oyuna dahil değilsiniz' }, { status: 403 })

    const playerNum = isP1 ? 1 : 2

    // Handle leave/forfeit action
    if (body.action === 'leave') {
      if (room.isAI) {
        // AI game: just cancel it, no penalty
        const updated = await prisma.gameRoom.update({
          where: { id: params.roomId },
          data: { status: 'cancelled', lastMoveAt: new Date() },
        })
        return NextResponse.json({ success: true, room: updated })
      }
      const leaverId = session.user.id
      const winnerId = leaverId === room.player1Id ? room.player2Id : room.player1Id
      await settleBet(room, winnerId, session.user.id)
      const updated = await prisma.gameRoom.update({
        where: { id: params.roomId },
        data: { status: 'completed', winnerId, lastMoveAt: new Date() },
      })
      return NextResponse.json({ success: true, room: updated })
    }

    // For AI games or okey/okey101 (which manage state client-side), accept full state update
    const clientStateGames = ['okey', 'okey101', 'yuzbirokey']
    if ((room.isAI || clientStateGames.includes(room.gameType)) && body.fullState) {
      const { state, player1Score, player2Score, currentTurn, status: newStatus, winnerId } = body.fullState
      const updateData: any = {
        state: JSON.stringify(state),
        player1Score: player1Score ?? room.player1Score,
        player2Score: player2Score ?? room.player2Score,
        currentTurn: currentTurn ?? room.currentTurn,
        lastMoveAt: new Date(),
      }
      if (newStatus === 'completed') {
        updateData.status = 'completed'
        updateData.winnerId = winnerId
        await settleBet(room, winnerId, session.user.id)
      }
      const updated = await prisma.gameRoom.update({ where: { id: params.roomId }, data: updateData })
      return NextResponse.json({ success: true, room: updated })
    }

    // Some games don't enforce strict turn order (tombala, zar in certain phases)
    const noTurnCheck = ['tombala', 'zar'].includes(room.gameType)
    if (!noTurnCheck && room.currentTurn !== playerNum) {
      return NextResponse.json({ error: 'Sıra sizde değil' }, { status: 400 })
    }

    const state = JSON.parse(room.state)
    const result: any = processMove(room.gameType, state, body, playerNum)

    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    const nextTurn = result.winner || result.isDraw ? room.currentTurn : (result.scored ? playerNum : (playerNum === 1 ? 2 : 1))
    let status = room.status
    let winnerId: string | null = null

    if (result.winner) {
      status = 'completed'
      winnerId = result.winner === 1 ? room.player1Id : (room.player2Id || null)
    } else if (result.isDraw) {
      status = 'completed'
    }

    const updateData: any = {
      state: JSON.stringify(result.state),
      currentTurn: nextTurn,
      player1Score: result.p1Score ?? room.player1Score,
      player2Score: result.p2Score ?? room.player2Score,
      status,
      winnerId,
      lastMoveAt: new Date(),
    }

    if (status === 'completed') {
      await settleBet(room, winnerId, session.user.id)
    }

    const updated = await prisma.gameRoom.update({ where: { id: params.roomId }, data: updateData })
    return NextResponse.json({ success: true, room: updated })
  } catch (error: any) {
    console.error('Game room move error:', error)
    return NextResponse.json({ error: 'Hamle yapılamadı' }, { status: 500 })
  }
}

// DELETE: Cancel waiting room
export async function DELETE(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const room = await prisma.gameRoom.findUnique({ where: { id: params.roomId } })
    if (!room) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    if (room.player1Id !== session.user.id) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    if (room.status !== 'waiting') return NextResponse.json({ error: 'Sadece bekleyen odalar iptal edilebilir' }, { status: 400 })

    if (room.betAmount > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: room.betCurrency === 'CFC' ? { credits: { increment: room.betAmount } } : { jetonBalance: { increment: room.betAmount } },
      })
    }

    await prisma.gameRoom.update({ where: { id: params.roomId }, data: { status: 'cancelled' } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Game room cancel error:', error)
    return NextResponse.json({ error: 'İptal edilemedi' }, { status: 500 })
  }
}

// Helper: Settle bets
async function settleBet(room: any, winnerId: string | null, currentUserId: string) {
  if (room.betAmount <= 0) return
  const totalPot = room.betAmount * 2
  const commission = Math.floor(totalPot * 0.10)
  const winnerPayout = totalPot - commission

  if (winnerId) {
    await prisma.user.update({
      where: { id: winnerId },
      data: room.betCurrency === 'CFC' ? { credits: { increment: winnerPayout } } : { jetonBalance: { increment: winnerPayout } },
    })
  } else {
    // Draw: refund both
    const field = room.betCurrency === 'CFC' ? 'credits' : 'jetonBalance'
    const txns = [prisma.user.update({ where: { id: room.player1Id }, data: { [field]: { increment: room.betAmount } } })]
    if (room.player2Id && room.player2Id !== 'AI') {
      txns.push(prisma.user.update({ where: { id: room.player2Id }, data: { [field]: { increment: room.betAmount } } }))
    }
    await prisma.$transaction(txns)
  }
}
