import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getInitialState } from '@/lib/game-logic'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['xox', 'tombala', 'tavla', 'pisti', 'sayi_tahmin', 'zar', 'okey', 'okey101', 'yuzbirokey', 'connect4', 'reversi', 'dama', 'mangala', 'tas_kagit_makas', 'gomoku', 'amiral_batti', 'kelime_duellosu', 'quiz_1v1', 'kart_eslestirme_pvp']

// POST: Create a new game room
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const { gameType, isAI, betAmount, betCurrency, turnTimer, gridSize: reqGridSize } = await req.json()
    if (!VALID_TYPES.includes(gameType)) return NextResponse.json({ error: 'Geçersiz oyun tipi' }, { status: 400 })

    // AI games are always free - no betting allowed
    const currency = isAI ? 'FREE' : (['FREE', 'CFC', 'JETON'].includes(betCurrency) ? betCurrency : 'FREE')
    const amount = isAI ? 0 : (currency === 'FREE' ? 0 : Math.max(0, Math.floor(betAmount || 0)))
    const timer = [0, 10, 15, 20].includes(turnTimer) ? turnTimer : 0
    // Grid size for XOX (default 3, range 3-30)
    const gridSize = gameType === 'xox' && reqGridSize ? Math.max(3, Math.min(30, Math.floor(reqGridSize))) : undefined

    if (amount > 0) {
      const user = await prisma.user.findUnique({ where: { id: authUser.id }, select: { credits: true, jetonBalance: true, role: true } })
      if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
      const gameStaff = user.role === 'yonetici'
      if (!gameStaff) {
        if (currency === 'CFC' && user.credits < amount) return NextResponse.json({ error: 'Yetersiz CFC bakiyesi' }, { status: 400 })
        if (currency === 'JETON' && user.jetonBalance < amount) return NextResponse.json({ error: 'Yetersiz Jeton bakiyesi' }, { status: 400 })
        await prisma.user.update({
          where: { id: authUser.id },
          data: currency === 'CFC' ? { credits: { decrement: amount } } : { jetonBalance: { decrement: amount } },
        })
      }
    }

    const initialState = getInitialState(gameType, gridSize ? { gridSize } : undefined)
    const userName = (authUser as any)?.name || 'Oyuncu 1'
    const aiNames: Record<string, string> = Object.fromEntries(VALID_TYPES.map(t => [t, 'Yapay Zeka']))

    const room = await prisma.gameRoom.create({
      data: {
        gameType,
        player1Id: authUser.id,
        player2Id: isAI ? 'AI' : null,
        isAI: !!isAI,
        betAmount: amount,
        betCurrency: currency,
        state: JSON.stringify(initialState),
        currentTurn: 1,
        status: isAI ? 'active' : 'waiting',
        player1Name: userName,
        player2Name: isAI ? aiNames[gameType] : 'Oyuncu 2',
        turnTimer: isAI ? 0 : timer,
        lastMoveAt: isAI ? new Date() : null,
      },
    })

    return NextResponse.json({ success: true, roomId: room.id })
  } catch (error: any) {
    console.error('Game room create error:', error)
    return NextResponse.json({ error: 'Oda oluşturulamadı' }, { status: 500 })
  }
}

// GET: List rooms
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    const userId = authUser?.id
    const url = new URL(req.url)
    const type = url.searchParams.get('type')
    const gameType = url.searchParams.get('gameType')

    // Auto-cleanup: cancel stale waiting rooms older than 5 minutes
    try {
      const staleRooms = await prisma.gameRoom.findMany({
        where: { status: 'waiting', createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
        take: 10,
      })
      for (const sr of staleRooms) {
        if (sr.betAmount > 0) {
          await prisma.user.update({
            where: { id: sr.player1Id },
            data: sr.betCurrency === 'CFC' ? { credits: { increment: sr.betAmount } } : { jetonBalance: { increment: sr.betAmount } },
          }).catch(() => {})
        }
        await prisma.gameRoom.update({ where: { id: sr.id }, data: { status: 'cancelled' } }).catch(() => {})
      }
    } catch {}

    if (type === 'stats' && gameType) {
      const [activeCount, waitingCount, recentWinners] = await Promise.all([
        prisma.gameRoom.count({ where: { gameType, status: 'active' } }),
        prisma.gameRoom.count({ where: { gameType, status: 'waiting', isAI: false } }),
        prisma.gameRoom.findMany({
          where: { gameType, status: 'completed', winnerId: { not: null }, betAmount: { gt: 0 } },
          orderBy: { updatedAt: 'desc' },
          take: 10,
          select: { id: true, winnerId: true, player1Id: true, player2Id: true, player1Name: true, player2Name: true, player1Score: true, player2Score: true, betAmount: true, betCurrency: true, updatedAt: true },
        }),
      ])
      return NextResponse.json({
        activePlayers: activeCount * 2,
        waitingRooms: waitingCount,
        recentWinners: recentWinners.map((g: any) => {
          const winnerName = g.winnerId === g.player1Id ? g.player1Name : g.player2Name
          const payout = Math.floor(g.betAmount * 2 * 0.9)
          return { id: g.id, winnerName, payout, currency: g.betCurrency, score: `${g.player1Score}-${g.player2Score}`, time: g.updatedAt }
        }),
      })
    }

    // Reconnect check: find active game room where the user is a player
    if (type === 'reconnect' && gameType && userId) {
      // Check for active games where this user is a player (either as disconnected or still active)
      const activeRoom = await prisma.gameRoom.findFirst({
        where: {
          gameType,
          status: 'active',
          OR: [
            { player1Id: userId },
            { player2Id: userId },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      })
      if (activeRoom) {
        return NextResponse.json({ roomId: activeRoom.id })
      }
      return NextResponse.json({ roomId: null })
    }

    // All active/waiting rooms across all game types (for oyunlar homepage)
    if (type === 'active_rooms') {
      const rooms = await prisma.gameRoom.findMany({
        where: {
          status: { in: ['active', 'waiting'] },
          isAI: false,
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: { _count: { select: { viewers: true } } },
      })
      return NextResponse.json({
        rooms: rooms.map((g: any) => ({
          id: g.id,
          gameType: g.gameType,
          player1Name: g.player1Name,
          player2Name: g.player2Name,
          status: g.status,
          betAmount: g.betAmount,
          betCurrency: g.betCurrency,
          isAI: g.isAI,
          viewerCount: g._count.viewers,
        }))
      })
    }

    if (type === 'active' && gameType) {
      const active = await prisma.gameRoom.findMany({
        where: { gameType, status: 'active', isAI: false },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        include: { _count: { select: { viewers: true } } },
      })
      return NextResponse.json(active.map((g: any) => ({
        id: g.id, player1Name: g.player1Name, player2Name: g.player2Name,
        player1Score: g.player1Score, player2Score: g.player2Score,
        betAmount: g.betAmount, betCurrency: g.betCurrency, turnTimer: g.turnTimer,
        viewerCount: g._count.viewers,
      })))
    }

    if (gameType) {
      const rooms = await prisma.gameRoom.findMany({
        where: { gameType, status: 'waiting', isAI: false, ...(userId ? { player1Id: { not: userId } } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      return NextResponse.json(rooms)
    }

    return NextResponse.json([])
  } catch (error: any) {
    console.error('Game room list error:', error)
    return NextResponse.json({ error: 'Odalar yüklenemedi' }, { status: 500 })
  }
}
