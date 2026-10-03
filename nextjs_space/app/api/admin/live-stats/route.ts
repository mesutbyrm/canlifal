/**
 * GET /api/admin/live-stats?days=7
 *
 * Mobil «Canlı Yayın İstatistikleri» ekranı için: 4 özet kart + gün bazında seri.
 * Çift kimlik (web çerezi VEYA mobil Bearer JWT), staff izni: `analytics.live.view`.
 *
 * Şema değişikliği YOK — yalnızca mevcut tablolardan okur.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import { staffCan } from '@/lib/permissions'
import { getCached } from '@/lib/cache'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const STAFF_ROLES = ['admin', 'yonetici', 'moderator', 'finans']

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const session = await getStaffSession(request)
  if (!session?.user) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const role = (session.user as any).role as string | undefined
  if (!role || !(await staffCan(role, session.user.id, 'analytics.live.view', STAFF_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const rawDays = parseInt(searchParams.get('days') || '7', 10)
    const days = Math.min(30, Math.max(1, Number.isFinite(rawDays) ? rawDays : 7))

    const data = await getCached(`admin:live-stats:${days}`, 60, async () => {
      const now = new Date()
      // Seri başlangıcı: bugün dâhil `days` gün (UTC gün sınırı)
      const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const since = new Date(startOfToday.getTime() - (days - 1) * 24 * 60 * 60 * 1000)

      const [activeStreams, activeBroadcasters, periodStreams, periodGifts, periodViewers] = await Promise.all([
        prisma.videoStream.count({ where: { status: 'live', endedAt: null } }),
        prisma.videoStream
          .findMany({
            where: { startedAt: { gte: since } },
            select: { userId: true },
            distinct: ['userId'],
          })
          .then((rows: any[]) => rows.length),
        prisma.videoStream.findMany({
          where: { startedAt: { gte: since } },
          select: { startedAt: true },
        }),
        prisma.streamGift.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true, totalPrice: true },
        }),
        prisma.videoStreamViewer.findMany({
          where: { joinedAt: { gte: since } },
          select: { joinedAt: true },
        }),
      ])

      // Boş günleri 0 ile doldur
      const buckets = new Map<string, { date: string; viewers: number; giftRevenue: number; streams: number }>()
      for (let i = 0; i < days; i++) {
        const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000)
        const k = dayKey(d)
        buckets.set(k, { date: k, viewers: 0, giftRevenue: 0, streams: 0 })
      }

      for (const s of periodStreams as any[]) {
        const b = buckets.get(dayKey(new Date(s.startedAt)))
        if (b) b.streams += 1
      }
      let giftRevenue = 0
      for (const g of periodGifts as any[]) {
        giftRevenue += g.totalPrice || 0
        const b = buckets.get(dayKey(new Date(g.createdAt)))
        if (b) b.giftRevenue += g.totalPrice || 0
      }
      let totalViewers = 0
      for (const v of periodViewers as any[]) {
        totalViewers += 1
        const b = buckets.get(dayKey(new Date(v.joinedAt)))
        if (b) b.viewers += 1
      }

      return {
        activeStreams,
        totalViewers,
        giftRevenue,
        activeBroadcasters,
        days,
        series: Array.from(buckets.values()),
      }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[admin/live-stats]', error)
    return NextResponse.json({ error: 'İstatistikler alınamadı' }, { status: 500 })
  }
}
