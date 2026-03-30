import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST: Create a new SOS game
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { gridSize, isAI, betAmount, betCurrency, turnTimer } = await req.json()
    // Accept any grid size from 6 to 30 (admin-configurable)
    const size = (typeof gridSize === 'number' && gridSize >= 6 && gridSize <= 30) ? Math.floor(gridSize) : 6
    // AI games are always free - no betting allowed
    const currency = isAI ? 'FREE' : (['FREE', 'CFC', 'JETON'].includes(betCurrency) ? betCurrency : 'FREE')
    const amount = isAI ? 0 : (currency === 'FREE' ? 0 : Math.max(0, Math.floor(betAmount || 0)))
    const timer = [0, 10, 15, 20].includes(turnTimer) ? turnTimer : 0

    // Check balance
    if (amount > 0) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { credits: true, jetonBalance: true, name: true }
      })
      if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

      if (currency === 'CFC' && user.credits < amount) {
        return NextResponse.json({ error: 'Yetersiz CFC bakiyesi' }, { status: 400 })
      }
      if (currency === 'JETON' && user.jetonBalance < amount) {
        return NextResponse.json({ error: 'Yetersiz Jeton bakiyesi' }, { status: 400 })
      }

      // Deduct bet from player 1
      await prisma.user.update({
        where: { id: session.user.id },
        data: currency === 'CFC'
          ? { credits: { decrement: amount } }
          : { jetonBalance: { decrement: amount } }
      })
    }

    // Create empty board
    const board = Array(size).fill(null).map(() => Array(size).fill(''))

    const userName = (session.user as any)?.name || 'Oyuncu 1'

    const game = await prisma.sosGame.create({
      data: {
        gridSize: size,
        player1Id: session.user.id,
        player2Id: isAI ? 'AI' : null,
        isAI: !!isAI,
        betAmount: amount,
        betCurrency: currency,
        board: JSON.stringify(board),
        lines: '[]',
        currentTurn: 1,
        player1Score: 0,
        player2Score: 0,
        status: isAI ? 'active' : 'waiting',
        player1Name: userName,
        player2Name: isAI ? 'Yapay Zeka' : 'Oyuncu 2',
        turnTimer: timer,
        lastMoveAt: isAI ? new Date() : null,
      },
    })

    return NextResponse.json({ success: true, gameId: game.id })
  } catch (error: any) {
    console.error('SOS create error:', error)
    return NextResponse.json({ error: 'Oyun oluşturulamadı' }, { status: 500 })
  }
}

// GET: List waiting games, stats, and recent winners
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    const url = new URL(req.url)
    const type = url.searchParams.get('type')

    if (type === 'stats') {
      const [activeCount, waitingCount, recentWinners] = await Promise.all([
        prisma.sosGame.count({ where: { status: 'active' } }),
        prisma.sosGame.count({ where: { status: 'waiting', isAI: false } }),
        prisma.sosGame.findMany({
          where: { status: 'completed', winnerId: { not: null }, betAmount: { gt: 0 } },
          orderBy: { updatedAt: 'desc' },
          take: 10,
          select: {
            id: true, winnerId: true, player1Id: true, player2Id: true,
            player1Name: true, player2Name: true, player1Score: true, player2Score: true,
            betAmount: true, betCurrency: true, gridSize: true, isAI: true, updatedAt: true,
          },
        }),
      ])

      const winners = recentWinners.map((g: any) => {
        const winnerName = g.winnerId === g.player1Id ? g.player1Name : g.player2Name
        const totalPot = g.betAmount * 2
        const commission = Math.floor(totalPot * 0.10)
        const payout = totalPot - commission
        return {
          id: g.id,
          winnerName,
          payout,
          currency: g.betCurrency,
          score: g.winnerId === g.player1Id ? `${g.player1Score}-${g.player2Score}` : `${g.player2Score}-${g.player1Score}`,
          gridSize: g.gridSize,
          isAI: g.isAI,
          time: g.updatedAt,
        }
      })

      return NextResponse.json({
        activePlayers: activeCount * 2,
        waitingRooms: waitingCount,
        recentWinners: winners,
      })
    }

    // List active games for spectating
    if (type === 'active') {
      const activeGames = await prisma.sosGame.findMany({
        where: { status: 'active', isAI: false },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        include: { _count: { select: { viewers: true } } },
      })
      return NextResponse.json(activeGames.map((g: any) => ({
        id: g.id,
        gridSize: g.gridSize,
        player1Name: g.player1Name,
        player2Name: g.player2Name,
        player1Score: g.player1Score,
        player2Score: g.player2Score,
        betAmount: g.betAmount,
        betCurrency: g.betCurrency,
        turnTimer: g.turnTimer,
        viewerCount: g._count.viewers,
      })))
    }

    const games = await prisma.sosGame.findMany({
      where: {
        status: 'waiting',
        isAI: false,
        ...(userId ? { player1Id: { not: userId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json(games)
  } catch (error: any) {
    console.error('SOS list error:', error)
    return NextResponse.json({ error: 'Oyunlar yüklenemedi' }, { status: 500 })
  }
}
