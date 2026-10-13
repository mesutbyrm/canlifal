import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET /api/admin/live-stats?days=N (1–90, varsayılan 7)
// Tanımlar:
//   activeStreams / activeBroadcasters / totalViewers → şu an status='live' olan yayınlar;
//     totalViewers = bu yayınların viewerCount toplamı (anlık).
//   giftRevenue / totalGiftsValue → seçilen dönemdeki hediyelerin totalPrice toplamı (kredi/jeton, brüt).
//   series → her gün için o gün yayına katılan tekil izleyici sayısı (video_stream_viewers.joinedAt).
export async function GET(req: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(req)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId: string | undefined = mobileUser?.id || (webSession?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    const allowed = await staffCan(me?.role, userId, 'analytics.dashboard.view', ['admin', 'yonetici', 'moderator'])
    if (!allowed) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const daysRaw = parseInt(new URL(req.url).searchParams.get('days') || '7', 10)
    const days = Math.min(90, Math.max(1, Number.isFinite(daysRaw) ? daysRaw : 7))
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    since.setUTCHours(0, 0, 0, 0)

    const [live, giftAgg, perDay] = await Promise.all([
      prisma.videoStream.findMany({
        where: { status: 'live' },
        select: { userId: true, viewerCount: true },
      }),
      prisma.streamGift.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { totalPrice: true },
      }),
      prisma.$queryRaw<{ day: string; viewers: number }[]>`
        SELECT to_char("joinedAt", 'YYYY-MM-DD') AS day,
               COUNT(DISTINCT "viewerId")::int AS viewers
        FROM video_stream_viewers
        WHERE "joinedAt" >= ${since}
        GROUP BY 1
        ORDER BY 1
      `,
    ])

    const byDay = new Map<string, number>(
      perDay.map((r): [string, number] => [r.day, Number(r.viewers)])
    )
    const series: { date: string; viewers: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      series.push({ date: d, viewers: byDay.get(d) ?? 0 })
    }

    const giftRevenue = Number(giftAgg._sum.totalPrice ?? 0)
    return NextResponse.json({
      days,
      activeStreams: live.length,
      activeBroadcasters: new Set(live.map((s) => s.userId)).size,
      totalViewers: live.reduce((sum, s) => sum + (s.viewerCount || 0), 0),
      giftRevenue,
      totalGiftsValue: giftRevenue,
      series,
    })
  } catch (error: any) {
    console.error('[Admin Live Stats GET] Error:', error)
    return NextResponse.json({ error: 'Canlı istatistikler alınamadı' }, { status: 500 })
  }
}
