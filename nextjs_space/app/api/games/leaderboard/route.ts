import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// GET: Fetch leaderboard with optional filters
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    const url = new URL(req.url)
    const period = url.searchParams.get('period') || 'all' // all, weekly, monthly
    const gameType = url.searchParams.get('gameType') || 'all'
    const search = url.searchParams.get('search') || ''

    // For period-based filtering, use completed games
    if (period !== 'all') {
      const now = new Date()
      const startDate = new Date()
      if (period === 'weekly') {
        startDate.setDate(now.getDate() - 7)
      } else if (period === 'monthly') {
        startDate.setDate(now.getDate() - 30)
      }

      const where: any = {
        status: 'completed',
        winnerId: { not: null },
        updatedAt: { gte: startDate },
      }
      if (gameType !== 'all') {
        where.gameType = gameType
      }

      const completedGames = await prisma.gameRoom.findMany({
        where,
        select: { winnerId: true, betAmount: true, betCurrency: true },
      })

      // Aggregate wins per user
      const winMap = new Map<string, { wins: number; earnings: number }>()
      for (const g of completedGames) {
        if (!g.winnerId) continue
        const entry = winMap.get(g.winnerId) || { wins: 0, earnings: 0 }
        entry.wins += 1
        entry.earnings += g.betAmount > 0 ? Math.floor(g.betAmount * 2 * 0.9) : 0
        winMap.set(g.winnerId, entry)
      }

      const sortedWinners = Array.from(winMap.entries())
        .sort((a, b) => b[1].wins - a[1].wins)
        .slice(0, 30)

      const userIds = sortedWinners.map(([id]) => id)
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, username: true, image: true },
      })
      const profiles = await prisma.userGameProfile.findMany({
        where: { userId: { in: userIds } },
      })
      const userMap = new Map(users.map((u: any) => [u.id, u]))
      const profMap = new Map(profiles.map((p: any) => [p.userId, p]))

      let leaderboard = sortedWinners.map(([userId, stats], index) => {
        const user = userMap.get(userId) as any
        const prof = profMap.get(userId) as any
        return {
          rank: index + 1,
          userId,
          name: user?.name || 'Anonim',
          username: user?.username || null,
          image: user?.image || null,
          totalJetons: prof?.totalJetons || 0,
          totalGames: prof?.totalGames || 0,
          level: prof?.level || 1,
          levelTitle: prof?.levelTitle || 'Çırak',
          periodWins: stats.wins,
          periodEarnings: stats.earnings,
        }
      })

      if (search) {
        const s = search.toLowerCase()
        leaderboard = leaderboard.filter(e =>
          (e.name?.toLowerCase().includes(s)) || (e.username?.toLowerCase().includes(s))
        )
      }

      return NextResponse.json({
        entries: leaderboard,
        period,
        gameType,
        currentUserId: authUser?.id || null,
      })
    }

    // All-time leaderboard from profiles
    const profiles = await prisma.userGameProfile.findMany({
      orderBy: { totalJetons: 'desc' },
      take: 30,
    })

    const userIds = profiles.map((p: any) => p.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, username: true, image: true },
    })

    const userMap = new Map(users.map((u: any) => [u.id, u]))

    let leaderboard = profiles.map((p: any, index: number) => {
      const user = userMap.get(p.userId) as any
      return {
        rank: index + 1,
        userId: p.userId,
        name: user?.name || 'Anonim',
        username: user?.username || null,
        image: user?.image || null,
        totalJetons: p.totalJetons,
        totalGames: p.totalGames,
        level: p.level,
        levelTitle: p.levelTitle,
        periodWins: 0,
        periodEarnings: 0,
      }
    })

    if (search) {
      const s = search.toLowerCase()
      leaderboard = leaderboard.filter(e =>
        (e.name?.toLowerCase().includes(s)) || (e.username?.toLowerCase().includes(s))
      )
    }

    return NextResponse.json({
      entries: leaderboard,
      period: 'all',
      gameType: 'all',
      currentUserId: authUser?.id || null,
    })
  } catch (error: any) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Liderlik tablosu yüklenemedi' }, { status: 500 })
  }
}
