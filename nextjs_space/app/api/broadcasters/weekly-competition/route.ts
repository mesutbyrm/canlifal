// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// ── Haftalık Yayıncı Yarışması ──────────────────────────────────────────────
// GET /api/broadcasters/weekly-competition
// Skor, mevcut ISO haftası (Pazartesi 00:00 UTC → sonraki Pazartesi) içindeki
// yayın/hediye verilerinden CANLI hesaplanır. Ayrı bir DB tablosu ya da
// zamanlanmış "reset" işine gerek yoktur: hafta filtresi her Pazartesi 00:00
// UTC'de skoru doğal olarak sıfırlar. Sonuç 10 dk boyunca cache'lenir.

const PARTICIPANT_LIMIT = 20 // en az top 10 döndürülür
const WINNER_LIMIT = 3

// Puanlama katsayıları (WEEKLY_BROADCASTER_COMPETITION_BACKEND.md tavsiyesi)
const POINTS_PER_STREAM = 10 // canlı yayın başlatma
const POINTS_PER_LIKE = 1 // yayın beğenisi
const POINTS_PER_GIFT = 5 // alınan hediye (adet)

/** Mevcut haftanın Pazartesi 00:00 UTC başlangıcını döndürür. */
function getWeekStartUtc(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = d.getUTCDay() // 0 = Pazar, 1 = Pazartesi ...
  const diff = (day + 6) % 7 // Pazartesi'ye kadar geri gidilecek gün sayısı
  d.setUTCDate(d.getUTCDate() - diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/** ISO 8601 hafta numarası. */
function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3) // haftanın Perşembe'si
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000))
}

async function fetchWeeklyCompetition() {
  const now = new Date()
  const weekStart = getWeekStartUtc(now)
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 3600 * 1000)
  const endsAt = new Date(weekEnd.getTime() - 1000) // Pazar 23:59:59 UTC
  const week = getIsoWeek(now)

  const scores: Record<string, number> = {}
  const add = (userId: string, pts: number) => {
    if (!userId) return
    scores[userId] = (scores[userId] || 0) + pts
  }

  // 1) Bu hafta başlatılan yayınlar: yayın sayısı + toplam beğeni
  const streamAgg = await prisma.videoStream.groupBy({
    by: ['userId'],
    where: { startedAt: { gte: weekStart, lt: weekEnd } },
    _count: { _all: true },
    _sum: { likeCount: true },
  })
  for (const s of streamAgg) {
    add(s.userId, (s._count?._all || 0) * POINTS_PER_STREAM)
    add(s.userId, (s._sum?.likeCount || 0) * POINTS_PER_LIKE)
  }

  // 2) Bu hafta alınan hediyeler (yayıncı = stream.userId)
  const giftAgg = await prisma.streamGift.groupBy({
    by: ['streamId'],
    where: { createdAt: { gte: weekStart, lt: weekEnd } },
    _count: { _all: true },
  })
  const giftStreamIds = giftAgg.map((g) => g.streamId)
  if (giftStreamIds.length > 0) {
    const giftStreams = await prisma.videoStream.findMany({
      where: { id: { in: giftStreamIds } },
      select: { id: true, userId: true },
    })
    const streamOwner: Record<string, string> = {}
    for (const gs of giftStreams) streamOwner[gs.id] = gs.userId
    for (const g of giftAgg) {
      const ownerId = streamOwner[g.streamId]
      if (ownerId) add(ownerId, (g._count?._all || 0) * POINTS_PER_GIFT)
    }
  }

  // Skora göre sırala, top N katılımcıyı al
  const ranked = Object.entries(scores)
    .map(([userId, score]) => ({ userId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, PARTICIPANT_LIMIT)

  if (ranked.length === 0) {
    return { week, participants: [], winners: [], endsAt: endsAt.toISOString() }
  }

  // Kullanıcı bilgilerini getir
  const users = await prisma.user.findMany({
    where: { id: { in: ranked.map((r) => r.userId) } },
    select: { id: true, name: true, username: true, image: true },
  })
  const userMap: Record<string, any> = {}
  for (const u of users) userMap[u.id] = u

  const participants = ranked.map((r, i) => {
    const u = userMap[r.userId] || {}
    return {
      rank: i + 1,
      userId: r.userId,
      displayName: u.name || u.username || 'Yayıncı',
      avatarUrl: u.image || '',
      score: r.score,
      isWinner: i < WINNER_LIMIT,
    }
  })

  const winners = participants.filter((p) => p.isWinner).slice(0, WINNER_LIMIT)

  return { week, participants, winners, endsAt: endsAt.toISOString() }
}

export async function GET(_request: NextRequest) {
  try {
    // Sunucu tarafı 10 dk cache (mobil TTL ile uyumlu)
    const data = await getCached('broadcasters:weekly-competition', 600, fetchWeeklyCompetition)

    // Veri yoksa UI zarifçe gizlenebilsin diye 204 döndür
    if (!data || !data.participants || data.participants.length === 0) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=300' },
    })
  } catch (error) {
    console.error('Weekly broadcaster competition error:', error)
    return NextResponse.json({ error: 'Yarışma verileri alınamadı' }, { status: 500 })
  }
}
