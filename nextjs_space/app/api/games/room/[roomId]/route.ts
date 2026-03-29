import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { processMove } from '@/lib/game-logic'

export const dynamic = 'force-dynamic'

// GET: Get room state (also checks disconnect timeout & auto-close stale waiting rooms)
export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    const roomResult = await prisma.gameRoom.findUnique({
      where: { id: params.roomId },
      include: { _count: { select: { viewers: true } } },
    })
    if (!roomResult) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    let room: any = roomResult

    // Update lastSeen for the polling player
    if (userId && room.status === 'active') {
      const now = new Date()
      if (userId === room.player1Id) {
        await prisma.gameRoom.update({ where: { id: params.roomId }, data: { player1LastSeen: now } })
        room = { ...room, player1LastSeen: now } as any
      } else if (userId === room.player2Id) {
        await prisma.gameRoom.update({ where: { id: params.roomId }, data: { player2LastSeen: now } })
        room = { ...room, player2LastSeen: now } as any
      }
    }

    // Auto-close: if waiting room with no player2 for more than 5 minutes, cancel it
    if (room.status === 'waiting' && !room.player2Id) {
      const waitingTime = (Date.now() - new Date(room.createdAt).getTime()) / 1000
      if (waitingTime > 300) { // 5 minutes
        if (room.betAmount > 0) {
          await prisma.user.update({
            where: { id: room.player1Id },
            data: room.betCurrency === 'CFC' ? { credits: { increment: room.betAmount } } : { jetonBalance: { increment: room.betAmount } },
          })
        }
        const updated = await prisma.gameRoom.update({
          where: { id: params.roomId },
          data: { status: 'cancelled', lastMoveAt: new Date() },
        })
        const { _count: c3, ...d3 } = { ...updated, _count: room._count }
        return NextResponse.json({ ...d3, viewerCount: c3.viewers, autoClosed: true })
      }
    }

    // === Disconnect detection for active PvP games ===
    if (room.status === 'active' && !room.isAI) {
      const now = Date.now()
      const p1LastSeen = room.player1LastSeen ? new Date(room.player1LastSeen).getTime() : now
      const p2LastSeen = room.player2LastSeen ? new Date(room.player2LastSeen).getTime() : now
      const p1Elapsed = (now - p1LastSeen) / 1000
      const p2Elapsed = (now - p2LastSeen) / 1000
      const DISCONNECT_THRESHOLD = 12 // seconds without polling = disconnected

      // Check if a player has disconnected (not polled for 12+ seconds)
      if (p1Elapsed > DISCONNECT_THRESHOLD && room.player1Id) {
        // Player 1 disconnected → AI takes over player 1's slot
        const updated = await prisma.gameRoom.update({
          where: { id: params.roomId },
          data: { isAI: true, disconnectedPlayerId: room.player1Id, lastMoveAt: new Date() },
        })
        room = { ...updated, _count: room._count } as any
      } else if (p2Elapsed > DISCONNECT_THRESHOLD && room.player2Id) {
        // Player 2 disconnected → AI takes over player 2's slot
        const updated = await prisma.gameRoom.update({
          where: { id: params.roomId },
          data: { isAI: true, disconnectedPlayerId: room.player2Id, lastMoveAt: new Date() },
        })
        room = { ...updated, _count: room._count } as any
      }

      // Auto-forfeit: if PvP game with timer, check turn timer expiry (10s grace)
      if (!room.isAI && room.turnTimer > 0 && room.lastMoveAt) {
        const elapsed = (now - new Date(room.lastMoveAt).getTime()) / 1000
        const timeout = room.turnTimer + 10
        if (elapsed > timeout) {
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
    }

    // === Auto-close AI-takeover games when no real players are active ===
    if (room.status === 'active' && room.isAI && room.disconnectedPlayerId) {
      const now = Date.now()
      const p1LastSeen = room.player1LastSeen ? new Date(room.player1LastSeen).getTime() : 0
      const p2LastSeen = room.player2LastSeen ? new Date(room.player2LastSeen).getTime() : 0
      const latestSeen = Math.max(p1LastSeen, p2LastSeen)
      const bothElapsed = latestSeen > 0 ? (now - latestSeen) / 1000 : 999

      if (bothElapsed > 8) {
        // No real player has polled for 8+ seconds → auto-close the room
        // Refund both players' bets (no winner)
        if (room.betAmount > 0) {
          const field = room.betCurrency === 'CFC' ? 'credits' : 'jetonBalance'
          const txns = [prisma.user.update({ where: { id: room.player1Id }, data: { [field]: { increment: room.betAmount } } })]
          if (room.player2Id && room.player2Id !== 'AI') {
            txns.push(prisma.user.update({ where: { id: room.player2Id }, data: { [field]: { increment: room.betAmount } } }))
          }
          await prisma.$transaction(txns)
        }
        const updated = await prisma.gameRoom.update({
          where: { id: params.roomId },
          data: { status: 'cancelled', lastMoveAt: new Date() },
        })
        const { _count: cAuto, ...dAuto } = { ...updated, _count: room._count }
        return NextResponse.json({ ...dAuto, viewerCount: cAuto.viewers, autoClosed: true })
      }
    }

    // === Reconnection: if the polling user is the disconnected player, auto-rejoin ===
    if (userId && room.status === 'active' && room.isAI && room.disconnectedPlayerId === userId) {
      const isP1 = room.player1Id === userId
      const updated = await prisma.gameRoom.update({
        where: { id: params.roomId },
        data: {
          isAI: false,
          disconnectedPlayerId: null,
          lastMoveAt: new Date(),
          ...(isP1 ? { player1LastSeen: new Date() } : { player2LastSeen: new Date() }),
        },
      })
      const { _count: cRecon, ...dRecon } = { ...updated, _count: room._count }
      return NextResponse.json({ ...dRecon, viewerCount: cRecon.viewers, reconnected: true })
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

    // Allow joining waiting rooms OR replacing AI in active games
    const isAIReplace = room.status === 'active' && room.isAI
    if (room.status !== 'waiting' && !isAIReplace) {
      return NextResponse.json({ error: 'Bu odaya katılınamaz' }, { status: 400 })
    }
    // Block self-join unless reconnecting
    if (room.player1Id === session.user.id && room.disconnectedPlayerId !== session.user.id) {
      return NextResponse.json({ error: 'Kendi odanıza katılamazsınız' }, { status: 400 })
    }

    // Skip bet deduction for AI replace (original player already paid)
    if (room.betAmount > 0 && !isAIReplace) {
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
    const updateData: any = { lastMoveAt: new Date() }
    if (isAIReplace) {
      const isReconnecting = room.disconnectedPlayerId === session.user.id
      if (isReconnecting) {
        // Reconnecting original player
        updateData.isAI = false
        updateData.disconnectedPlayerId = null
        const isP1 = room.player1Id === session.user.id
        if (isP1) updateData.player1LastSeen = new Date()
        else updateData.player2LastSeen = new Date()
      } else {
        // New player replacing AI
        updateData.player2Id = session.user.id
        updateData.player2Name = userName
        updateData.isAI = false
        updateData.disconnectedPlayerId = null
        updateData.player2LastSeen = new Date()
      }
    } else {
      updateData.player2Id = session.user.id
      updateData.player2Name = userName
      updateData.status = 'active' // Normal join: waiting -> active
    }
    const updated = await prisma.gameRoom.update({
      where: { id: params.roomId },
      data: updateData,
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

    // Handle leave action
    if (body.action === 'leave') {
      // If already an AI game (started as AI or both disconnected) → just cancel
      if (room.isAI && !room.disconnectedPlayerId) {
        const updated = await prisma.gameRoom.update({
          where: { id: params.roomId },
          data: { status: 'cancelled', lastMoveAt: new Date() },
        })
        return NextResponse.json({ success: true, room: updated })
      }

      // PvP game: AI takes over the leaving player's spot instead of forfeit
      const leaverId = session.user.id
      const updated = await prisma.gameRoom.update({
        where: { id: params.roomId },
        data: {
          isAI: true,
          disconnectedPlayerId: leaverId,
          lastMoveAt: new Date(),
          // Clear the leaving player's lastSeen so auto-close can detect emptiness
          ...(isP1 ? { player1LastSeen: null } : { player2LastSeen: null }),
        },
      })
      return NextResponse.json({ success: true, room: updated, aiTakeover: true })
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
    const noTurnCheck = ['tombala', 'zar', 'tas_kagit_makas', 'kelime_duellosu', 'quiz_1v1', 'amiral_batti'].includes(room.gameType)
    if (!noTurnCheck && room.currentTurn !== playerNum) {
      return NextResponse.json({ error: 'Sıra sizde değil' }, { status: 400 })
    }

    const state = JSON.parse(room.state)
    const result: any = processMove(room.gameType, state, body, playerNum)

    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    // Simultaneous games: if waiting for other player, just save state
    if (result.waiting) {
      const updated = await prisma.gameRoom.update({
        where: { id: params.roomId },
        data: { state: JSON.stringify(result.state), lastMoveAt: new Date() }
      })
      return NextResponse.json({ success: true, room: updated })
    }

    const nextTurn = result.winner || result.isDraw ? room.currentTurn : (result.scored || result.noTurnSwitch ? playerNum : (playerNum === 1 ? 2 : 1))
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
      player1Score: result.player1Score ?? result.p1Score ?? room.player1Score,
      player2Score: result.player2Score ?? result.p2Score ?? room.player2Score,
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
