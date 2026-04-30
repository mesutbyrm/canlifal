import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

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
          rewards: JSON.stringify([{ rank: 1, prize: 500 }, { rank: 2, prize: 300 }, { rank: 3, prize: 100 }]),
        }
      })
      tournaments.push(created)
    }
  }
  return tournaments
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    // Aktif turnuvaları getir veya oluştur
    const tournaments = await ensureCurrentTournament()

    // Her turnuva için top 20 giriş ve kullanıcı bilgisi
    const result = await Promise.all(tournaments.map(async (t) => {
      // Sıralama için skor hesapla
      let entries: any[] = []
      
      if (t.type === 'jeton_spend') {
        // Bu haftaki jeton harcamaları
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
        // Bu haftaki fal sayıları
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
      }

      // Kullanıcının kendi sıralamasını bul
      let myEntry = null
      if (userId) {
        myEntry = entries.find(e => e.userId === userId) || null
        if (!myEntry) {
          // Kullanıcı top 20'de değil, kendi skorunu hesapla
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
          }
        }
      }

      const rewards = t.rewards ? JSON.parse(t.rewards) : []

      return {
        id: t.id,
        type: t.type,
        title: t.title,
        description: t.description,
        weekStart: t.weekStart.toISOString(),
        weekEnd: t.weekEnd.toISOString(),
        status: t.status,
        rewards,
        leaderboard: entries.map((e, i) => ({ ...e, rank: i + 1 })),
        myEntry: myEntry ? { ...myEntry, rank: entries.findIndex(e => e.userId === userId) + 1 || null } : null,
      }
    }))

    return NextResponse.json({ tournaments: result })
  } catch (error) {
    console.error('Tournament error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
