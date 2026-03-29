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

    // ===== ROOM DISTRIBUTION (pie chart data) =====
    if (section === 'room_distribution') {
      const gameTypes = ['xox', 'sos', 'tombala', 'tavla', 'pisti', 'sayi_tahmin', 'zar', 'okey', 'okey101', 'yuzbirokey']
      const dist = await Promise.all(
        gameTypes.map(async (gt) => {
          const count = await prisma.gameRoom.count({
            where: { gameType: gt, status: { in: ['active', 'waiting'] } },
          })
          return { gameType: gt, count }
        })
      )
      const total = dist.reduce((s, d) => s + d.count, 0)
      return NextResponse.json({
        distribution: dist.map(d => ({ ...d, percentage: total > 0 ? Math.round((d.count / total) * 100) : 0 })),
        total,
      })
    }

    // ===== RECOMMENDED TABLES (smart suggestions) =====
    if (section === 'recommended') {
      // Get waiting rooms sorted by recency, prioritize rooms with bets
      const rooms = await prisma.gameRoom.findMany({
        where: { status: 'waiting', isAI: false },
        orderBy: [{ betAmount: 'desc' }, { createdAt: 'desc' }],
        take: 6,
        include: { _count: { select: { viewers: true } } },
      })

      // Also get popular active games to suggest
      const popularActive = await prisma.gameRoom.findMany({
        where: { status: 'active', isAI: false },
        orderBy: { updatedAt: 'desc' },
        take: 4,
        include: { _count: { select: { viewers: true } } },
      })

      return NextResponse.json({
        waitingRooms: rooms.map((r: any) => ({
          id: r.id,
          gameType: r.gameType,
          player1Name: r.player1Name,
          betAmount: r.betAmount,
          betCurrency: r.betCurrency,
          viewerCount: r._count.viewers,
          createdAt: r.createdAt,
        })),
        popularGames: popularActive.map((r: any) => ({
          id: r.id,
          gameType: r.gameType,
          player1Name: r.player1Name,
          player2Name: r.player2Name,
          player1Score: r.player1Score,
          player2Score: r.player2Score,
          viewerCount: r._count.viewers,
          betAmount: r.betAmount,
          betCurrency: r.betCurrency,
        })),
      })
    }

    // ===== TOURNAMENTS (upcoming/active/completed) =====
    if (section === 'tournaments') {
      // Generate tournament data from recent high-activity games
      // Since we don't have a tournament model, we create virtual tournaments
      // based on game activity patterns
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)

      // Count today's completed games per type for "daily tournament" progress
      const gameTypes = ['xox', 'sos', 'tombala', 'tavla', 'pisti', 'okey']
      const tournamentData = await Promise.all(
        gameTypes.map(async (gt) => {
          const [completedToday, totalPlayers] = await Promise.all([
            prisma.gameRoom.count({
              where: { gameType: gt, status: 'completed', updatedAt: { gte: todayStart } },
            }),
            prisma.gameRoom.count({
              where: { gameType: gt, status: { in: ['active', 'waiting', 'completed'] }, updatedAt: { gte: todayStart } },
            }),
          ])

          // Get top winner of the day for this game type
          const dayWinners = await prisma.gameRoom.findMany({
            where: { gameType: gt, status: 'completed', winnerId: { not: null }, updatedAt: { gte: todayStart } },
            select: { winnerId: true },
          })

          const winCounts = new Map<string, number>()
          for (const w of dayWinners) {
            if (w.winnerId) winCounts.set(w.winnerId, (winCounts.get(w.winnerId) || 0) + 1)
          }
          const topWinnerId = Array.from(winCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
          let topWinnerName = null
          if (topWinnerId) {
            const user = await prisma.user.findUnique({ where: { id: topWinnerId }, select: { name: true, username: true } })
            topWinnerName = user?.username || user?.name || 'Anonim'
          }

          return {
            gameType: gt,
            completedGames: completedToday,
            totalParticipants: totalPlayers,
            topWinner: topWinnerName,
            topWinnerWins: topWinnerId ? (winCounts.get(topWinnerId) || 0) : 0,
          }
        })
      )

      // Create virtual tournaments
      const tournaments = [
        {
          id: 'daily-championship',
          name: 'Günlük Şampiyona',
          description: 'Her gün sıfırdan başlayan şampiyonluk yarışı! En çok kazanan şampiyon.',
          type: 'daily',
          status: 'active' as const,
          prizePool: 500,
          currency: 'CFC',
          startTime: todayStart.toISOString(),
          endTime: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          games: tournamentData.filter(t => t.completedGames > 0),
          totalParticipants: tournamentData.reduce((s, t) => s + t.totalParticipants, 0),
          totalGames: tournamentData.reduce((s, t) => s + t.completedGames, 0),
        },
        {
          id: 'weekend-battle',
          name: 'Hafta Sonu Savaşı',
          description: 'Cumartesi-Pazar arası en çok galibiyet alan kazanır!',
          type: 'weekly',
          status: (now.getDay() === 0 || now.getDay() === 6 ? 'active' : 'upcoming') as 'active' | 'upcoming',
          prizePool: 2000,
          currency: 'CFC',
          startTime: (() => {
            const sat = new Date(now)
            sat.setDate(now.getDate() - now.getDay() + 6)
            sat.setHours(0, 0, 0, 0)
            return sat.toISOString()
          })(),
          endTime: (() => {
            const sun = new Date(now)
            sun.setDate(now.getDate() - now.getDay() + 7)
            sun.setHours(23, 59, 59, 999)
            return sun.toISOString()
          })(),
          games: [],
          totalParticipants: 0,
          totalGames: 0,
        },
        {
          id: 'xox-masters',
          name: 'XOX Ustaları Turnuvası',
          description: 'Sadece XOX! En iyi stratejist kazanır.',
          type: 'special',
          status: 'upcoming' as const,
          prizePool: 1000,
          currency: 'CFC',
          gameType: 'xox',
          startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
          games: tournamentData.filter(t => t.gameType === 'xox'),
          totalParticipants: tournamentData.find(t => t.gameType === 'xox')?.totalParticipants || 0,
          totalGames: tournamentData.find(t => t.gameType === 'xox')?.completedGames || 0,
        },
      ]

      return NextResponse.json({ tournaments })
    }

    // ===== SPECTATOR: Most watched active games =====
    if (section === 'spectator') {
      const rooms = await prisma.gameRoom.findMany({
        where: { status: 'active', isAI: false },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: { _count: { select: { viewers: true } } },
      })

      // Sort by viewer count desc
      const sorted = rooms
        .map((r: any) => ({
          id: r.id,
          gameType: r.gameType,
          player1Name: r.player1Name,
          player2Name: r.player2Name,
          player1Score: r.player1Score,
          player2Score: r.player2Score,
          betAmount: r.betAmount,
          betCurrency: r.betCurrency,
          viewerCount: r._count.viewers,
          currentTurn: r.currentTurn,
          turnTimer: r.turnTimer,
          startedAt: r.createdAt,
          lastMoveAt: r.lastMoveAt,
        }))
        .sort((a: any, b: any) => b.viewerCount - a.viewerCount)

      return NextResponse.json({ games: sorted })
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
