import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const url = new URL(req.url)
    const section = url.searchParams.get('section')

    // ===== LOBBY STATS =====
    if (section === 'stats') {
      const [activeRooms, waitingRooms, totalCompleted, onlineViewers] = await Promise.all([
        prisma.gameRoom.count({ where: { status: 'active' } }),
        prisma.gameRoom.count({ where: { status: 'waiting', isAI: false } }),
        prisma.gameRoom.count({ where: { status: 'completed' } }),
        prisma.gameRoomViewer.count(),
      ])

      return NextResponse.json({
        onlinePlayers: activeRooms * 2 + waitingRooms,
        playingNow: activeRooms * 2,
        watching: onlineViewers,
        openTables: activeRooms + waitingRooms,
        waitingTables: waitingRooms,
        totalGamesPlayed: totalCompleted,
      })
    }

    // ===== TOP GAMES (most played) =====
    if (section === 'top_games') {
      const gameTypes = ['xox', 'sos', 'tombala', 'tavla', 'pisti', 'sayi_tahmin', 'zar', 'okey', 'okey101', 'yuzbirokey']
      
      const stats = await Promise.all(
        gameTypes.map(async (gt) => {
          const [active, waiting, todayPlayed] = await Promise.all([
            prisma.gameRoom.count({ where: { gameType: gt, status: 'active' } }),
            prisma.gameRoom.count({ where: { gameType: gt, status: 'waiting', isAI: false } }),
            prisma.gameRoom.count({
              where: {
                gameType: gt,
                status: 'completed',
                updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
              },
            }),
          ])
          return {
            gameType: gt,
            activePlayers: active * 2,
            activeTables: active,
            waitingTables: waiting,
            todayPlayed,
          }
        })
      )

      // Sort by activity
      stats.sort((a, b) => (b.activePlayers + b.todayPlayed) - (a.activePlayers + a.todayPlayed))
      return NextResponse.json(stats)
    }

    // ===== LIVE TABLES =====
    if (section === 'live_tables') {
      const rooms = await prisma.gameRoom.findMany({
        where: {
          status: { in: ['active', 'waiting'] },
          isAI: false,
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        include: { _count: { select: { viewers: true } } },
      })

      return NextResponse.json({
        tables: rooms.map((r: any) => ({
          id: r.id,
          gameType: r.gameType,
          player1Name: r.player1Name,
          player2Name: r.player2Name,
          player1Id: r.player1Id,
          player2Id: r.player2Id,
          status: r.status,
          betAmount: r.betAmount,
          betCurrency: r.betCurrency,
          viewerCount: r._count.viewers,
          currentTurn: r.currentTurn,
          player1Score: r.player1Score,
          player2Score: r.player2Score,
          turnTimer: r.turnTimer,
          createdAt: r.createdAt,
        })),
      })
    }

    // ===== RECENT WINNERS =====
    if (section === 'recent_winners') {
      const winners = await prisma.gameRoom.findMany({
        where: {
          status: 'completed',
          winnerId: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        take: 15,
        select: {
          id: true,
          gameType: true,
          winnerId: true,
          player1Id: true,
          player2Id: true,
          player1Name: true,
          player2Name: true,
          player1Score: true,
          player2Score: true,
          betAmount: true,
          betCurrency: true,
          updatedAt: true,
        },
      })

      return NextResponse.json({
        winners: winners.map((g: any) => {
          const winnerName = g.winnerId === g.player1Id ? g.player1Name : g.player2Name
          const loserName = g.winnerId === g.player1Id ? g.player2Name : g.player1Name
          const payout = g.betAmount > 0 ? Math.floor(g.betAmount * 2 * 0.9) : 0
          return {
            id: g.id,
            gameType: g.gameType,
            winnerName,
            loserName,
            payout,
            currency: g.betCurrency,
            score: `${g.player1Score}-${g.player2Score}`,
            time: g.updatedAt,
          }
        }),
      })
    }

    // ===== AUTO MATCH =====
    if (section === 'auto_match') {
      const gameType = url.searchParams.get('gameType')
      if (!gameType) return NextResponse.json({ error: 'gameType gerekli' }, { status: 400 })
      if (!session?.user?.id) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

      // Find a waiting room for this game type
      const waitingRoom = await prisma.gameRoom.findFirst({
        where: {
          gameType,
          status: 'waiting',
          isAI: false,
          player1Id: { not: session.user.id },
        },
        orderBy: { createdAt: 'asc' },
      })

      if (waitingRoom) {
        return NextResponse.json({ action: 'join', roomId: waitingRoom.id })
      }

      return NextResponse.json({ action: 'create', message: 'Uygun masa bulunamadı, yeni masa oluşturun' })
    }

    return NextResponse.json({ error: 'Geçersiz section' }, { status: 400 })
  } catch (error: any) {
    console.error('Lobby API error:', error)
    return NextResponse.json({ error: 'Lobi verisi yüklenemedi' }, { status: 500 })
  }
}
