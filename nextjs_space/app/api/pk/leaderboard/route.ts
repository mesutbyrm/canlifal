import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pk/leaderboard?period=weekly&metric=score&limit=50
 *
 * period: daily | weekly | monthly | all
 * metric: score (toplam PK puanı) | wins (galibiyet sayısı)
 * Yanıt: { period, metric, entries: [{ rank, userId, name, image, score, wins, matches }] }
 */
export async function GET(req: NextRequest) {
  try {
    const period = (req.nextUrl.searchParams.get('period') || 'weekly').toLowerCase()
    const metric = (req.nextUrl.searchParams.get('metric') || 'score').toLowerCase()
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10) || 50, 100)

    const now = Date.now()
    const since =
      period === 'daily' ? new Date(now - 24 * 60 * 60 * 1000)
      : period === 'monthly' ? new Date(now - 30 * 24 * 60 * 60 * 1000)
      : period === 'all' ? null
      : new Date(now - 7 * 24 * 60 * 60 * 1000)

    const battles = await prisma.pKBattle.findMany({
      where: {
        status: 'completed',
        ...(since ? { endedAt: { gte: since } } : {}),
      },
      select: {
        user1Id: true, user2Id: true, score1: true, score2: true, winnerId: true,
      },
      take: 2000,
      orderBy: { endedAt: 'desc' },
    })

    const agg = new Map<string, { score: number; wins: number; matches: number }>()
    const bump = (userId: string, score: number, won: boolean) => {
      const cur = agg.get(userId) || { score: 0, wins: 0, matches: 0 }
      cur.score += score
      cur.matches += 1
      if (won) cur.wins += 1
      agg.set(userId, cur)
    }
    for (const b of battles) {
      bump(b.user1Id, b.score1 || 0, b.winnerId === b.user1Id)
      bump(b.user2Id, b.score2 || 0, b.winnerId === b.user2Id)
    }

    const sorted = Array.from(agg.entries())
      .sort((a, z) => (metric === 'wins' ? z[1].wins - a[1].wins : z[1].score - a[1].score))
      .slice(0, limit)

    const users = sorted.length
      ? await prisma.user.findMany({
          where: { id: { in: sorted.map(([id]) => id) } },
          select: { id: true, name: true, image: true },
        })
      : []
    const userMap = new Map(users.map((u: { id: string; name: string | null; image: string | null }) => [u.id, u]))

    const entries = sorted.map(([userId, v], i) => ({
      rank: i + 1,
      userId,
      name: userMap.get(userId)?.name ?? null,
      image: userMap.get(userId)?.image ?? null,
      score: v.score,
      wins: v.wins,
      matches: v.matches,
    }))

    return NextResponse.json({ period, metric, entries })
  } catch (e) {
    console.error('[pk/leaderboard] error:', e)
    return NextResponse.json({ error: 'PK sıralaması alınamadı' }, { status: 500 })
  }
}
