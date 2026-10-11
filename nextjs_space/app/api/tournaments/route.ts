import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { finalizeExpiredTournaments } from '@/lib/tournament-state'

export const dynamic = 'force-dynamic'

// Haftanın başlangıç/bitiş tarihlerini hesapla
function getCurrentWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0=Pazar, 1=Pazartesi
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Pazartesiden başla
  const weekStart = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return { weekStart, weekEnd }
}

async function ensureCurrentTournament() {
  const { weekStart, weekEnd } = getCurrentWeekRange()
  const types = [
    { type: 'jeton_spend', title: 'En Çok Harcayan', description: 'Bu hafta en çok jeton harcayan kullanıcılar' },
    { type: 'fortune_count', title: 'Fal Şampiyonu', description: 'Bu hafta en çok fal baktıran kullanıcılar' },
  ]
  const tournaments = []
  for (const t of types) {
    const existing = await prisma.weeklyTournament.findUnique({
      where: { weekStart_type: { weekStart, type: t.type } },
    })
    if (existing) {
      tournaments.push(existing)
    } else {
      const created = await prisma.weeklyTournament.create({
        data: {
          weekStart,
          weekEnd,
          type: t.type,
          title: t.title,
          description: t.description,
          status: 'active',
          category: 'general',
          rewards: JSON.stringify([{ rank: 1, prize: 500, currency: 'cfc' }, { rank: 2, prize: 300, currency: 'cfc' }, { rank: 3, prize: 100, currency: 'cfc' }]),
        }
      })
      tournaments.push(created)
    }
  }
  return tournaments
}

export async function GET(request: NextRequest) {
  try {
    // Süresi dolmuş aktif turnuvaları kapat (lazy finalize)
    finalizeExpiredTournaments().catch(() => {})

    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || (session?.user as any)?.id || null

    const url = new URL(request.url)
    const filter = url.searchParams.get('filter') // active, completed, all
    const category = url.searchParams.get('category') // stream, voice, general

    let tournaments: any[]

    if (filter === 'all') {
      // Tüm turnuvalar (admin turnuvaları dahil)
      const where: any = { status: { not: 'draft' } }
      if (category) where.category = category
      tournaments = await prisma.weeklyTournament.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    } else if (filter === 'completed') {
      tournaments = await prisma.weeklyTournament.findMany({
        where: { status: { in: ['completed', 'rewarded'] } },
        orderBy: { weekEnd: 'desc' },
        take: 20,
      })
    } else {
      // Varsayılan: bu haftanın otomatik turnuvaları + admin'in açtığı aktifler
      const auto = await ensureCurrentTournament()
      const adminActive = await prisma.weeklyTournament.findMany({
        where: { status: { in: ['registration', 'active'] }, createdBy: { not: null } },
        orderBy: { weekEnd: 'asc' },
        take: 20,
      })
      // Benzersizleştir
      const seen = new Set<string>()
      tournaments = []
      for (const t of [...auto, ...adminActive]) {
        if (!seen.has(t.id)) { seen.add(t.id); tournaments.push(t) }
      }
    }

    // Her turnuva için leaderboard
    const result = await Promise.all(tournaments.map(async (t) => {
      let entries: any[] = []
      
      if (t.type === 'jeton_spend') {
        const spends = (await prisma.$queryRawUnsafe(`
          SELECT user_id, SUM(ABS(amount)) as total_spend
          FROM jeton_transactions
          WHERE amount < 0 AND created_at >= $1 AND created_at <= $2
          GROUP BY user_id ORDER BY total_spend DESC LIMIT 20
        `, t.weekStart, t.weekEnd).catch(() => [])) as any[]
        
        for (const s of spends) {
          const user = await prisma.user.findUnique({ where: { id: s.user_id }, select: { id: true, name: true, username: true, image: true } })
          if (user) entries.push({ userId: s.user_id, score: Number(s.total_spend), user })
        }
      } else if (t.type === 'fortune_count') {
        const fortunes = (await prisma.$queryRawUnsafe(`
          SELECT user_id, COUNT(*) as fortune_count
          FROM fortunes
          WHERE created_at >= $1 AND created_at <= $2
          GROUP BY user_id ORDER BY fortune_count DESC LIMIT 20
        `, t.weekStart, t.weekEnd).catch(() => [])) as any[]
        
        for (const f of fortunes) {
          const user = await prisma.user.findUnique({ where: { id: f.user_id }, select: { id: true, name: true, username: true, image: true } })
          if (user) entries.push({ userId: f.user_id, score: Number(f.fortune_count), user })
        }
      } else if (t.type === 'gift_sent' || t.type === 'pk_score') {
        // Veritabanındaki entry tablosundan al
        const dbEntries = await prisma.weeklyTournamentEntry.findMany({
          where: { tournamentId: t.id },
          orderBy: { score: 'desc' },
          take: 20,
        })
        for (const e of dbEntries) {
          const user = await prisma.user.findUnique({ where: { id: e.userId }, select: { id: true, name: true, username: true, image: true } })
          if (user) entries.push({ userId: e.userId, score: e.score, user })
        }
      }

      // Kullanıcının kendi sıralaması
      let myEntry = null
      if (userId) {
        myEntry = entries.find(e => e.userId === userId) || null
        if (!myEntry) {
          if (t.type === 'jeton_spend') {
            const mySpend = (await prisma.$queryRawUnsafe(`
              SELECT SUM(ABS(amount)) as total_spend FROM jeton_transactions WHERE user_id = $1 AND amount < 0 AND created_at >= $2 AND created_at <= $3
            `, userId, t.weekStart, t.weekEnd).catch(() => [])) as any[]
            if (mySpend[0]?.total_spend) myEntry = { userId, score: Number(mySpend[0].total_spend), rank: null }
          } else if (t.type === 'fortune_count') {
            const myFortune = (await prisma.$queryRawUnsafe(`
              SELECT COUNT(*) as fortune_count FROM fortunes WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
            `, userId, t.weekStart, t.weekEnd).catch(() => [])) as any[]
            if (myFortune[0]?.fortune_count) myEntry = { userId, score: Number(myFortune[0].fortune_count), rank: null }
          } else {
            const dbEntry = await prisma.weeklyTournamentEntry.findUnique({
              where: { tournamentId_userId: { tournamentId: t.id, userId } },
            })
            if (dbEntry) myEntry = { userId, score: dbEntry.score, rank: dbEntry.rank }
          }
        }
      }

      const rewards = t.rewards ? JSON.parse(t.rewards) : []

      // Round / bracket bilgisi (varsa)
      const rounds = await prisma.tournamentRound.findMany({
        where: { tournamentId: t.id },
        orderBy: { roundNumber: 'asc' },
        include: { matches: { orderBy: { matchOrder: 'asc' } } },
      })

      return {
        id: t.id,
        type: t.type,
        title: t.title,
        description: t.description,
        weekStart: t.weekStart.toISOString(),
        weekEnd: t.weekEnd.toISOString(),
        status: t.status,
        category: t.category || 'general',
        coverImage: t.coverImage,
        visibility: t.visibility || 'public',
        scoringType: t.scoringType || 'cumulative',
        eliminationType: t.eliminationType || 'none',
        rewards,
        leaderboard: entries.map((e: any, i: number) => ({ ...e, rank: i + 1 })),
        myEntry: myEntry ? { ...myEntry, rank: entries.findIndex((e: any) => e.userId === userId) + 1 || null } : null,
        rounds: rounds.length > 0 ? rounds : undefined,
      }
    }))

    return NextResponse.json({ tournaments: result })
  } catch (error) {
    console.error('Tournament error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
