import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/gifts/stats?giftId=xxx
 * Hediye istatistikleri: gönderim sayısı, toplam kazanç, en çok gönderen/alan,
 * en çok kullanılan oda/yayın, zaman bazlı trend.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getHybridSession(request);
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.gift.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const giftId = searchParams.get('giftId');

    if (!giftId) {
      // Global overview stats
      const [totalGifts, totalEvents, topGifts] = await Promise.all([
        prisma.giftType.count({ where: { isActive: true } }),
        prisma.giftEvent.count(),
        prisma.giftEvent.groupBy({
          by: ['giftTypeId'],
          _count: { id: true },
          _sum: { grossAmount: true },
          orderBy: { _count: { id: 'desc' } },
          take: 20,
        }),
      ]);

      // Enrich top gifts with names
      const giftIds = topGifts.map(g => g.giftTypeId);
      const giftNames = await prisma.giftType.findMany({
        where: { id: { in: giftIds } },
        select: { id: true, name: true, icon: true, price: true, thumbnailUrl: true },
      });
      const nameMap = Object.fromEntries(giftNames.map(g => [g.id, g]));

      return NextResponse.json({
        totalGifts,
        totalEvents,
        topGifts: topGifts.map(g => ({
          giftTypeId: g.giftTypeId,
          gift: nameMap[g.giftTypeId] || null,
          sendCount: g._count.id,
          totalJetons: g._sum.grossAmount || 0,
        })),
      });
    }

    // Per-gift detailed stats
    const [gift, sendCount, totalJetons, topSenders, topReceivers, contextBreakdown, recentTrend] = await Promise.all([
      prisma.giftType.findUnique({ where: { id: giftId }, select: { id: true, name: true, icon: true, price: true } }),
      prisma.giftEvent.count({ where: { giftTypeId: giftId } }),
      prisma.giftEvent.aggregate({ where: { giftTypeId: giftId }, _sum: { grossAmount: true, siteAmount: true, receiverAmount: true } }),
      // Top senders
      prisma.giftEvent.groupBy({
        by: ['senderId'],
        where: { giftTypeId: giftId },
        _count: { id: true },
        _sum: { grossAmount: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      // Top receivers
      prisma.giftEvent.groupBy({
        by: ['receiverId'],
        where: { giftTypeId: giftId },
        _count: { id: true },
        _sum: { grossAmount: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      // Context breakdown
      prisma.giftEvent.groupBy({
        by: ['context'],
        where: { giftTypeId: giftId },
        _count: { id: true },
        _sum: { grossAmount: true },
      }),
      // Recent 7 days daily trend
      prisma.$queryRawUnsafe(`
        SELECT DATE("createdAt") as day, COUNT(*)::int as count, COALESCE(SUM("grossAmount"),0)::int as total
        FROM gift_events WHERE "giftTypeId" = $1 AND "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY DATE("createdAt") ORDER BY day
      `, giftId),
    ]);

    // Enrich senders/receivers with user info
    const userIds = [...topSenders.map(s => s.senderId), ...topReceivers.map(r => r.receiverId)];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    return NextResponse.json({
      gift,
      sendCount,
      totalJetons: totalJetons._sum.grossAmount || 0,
      totalSiteEarnings: totalJetons._sum.siteAmount || 0,
      totalReceiverEarnings: totalJetons._sum.receiverAmount || 0,
      topSenders: topSenders.map(s => ({
        user: userMap[s.senderId] || { id: s.senderId, name: 'Bilinmeyen' },
        count: s._count.id,
        totalSpent: s._sum.grossAmount || 0,
      })),
      topReceivers: topReceivers.map(r => ({
        user: userMap[r.receiverId] || { id: r.receiverId, name: 'Bilinmeyen' },
        count: r._count.id,
        totalReceived: r._sum.grossAmount || 0,
      })),
      contextBreakdown: contextBreakdown.map(c => ({
        context: c.context,
        count: c._count.id,
        totalJetons: c._sum.grossAmount || 0,
      })),
      dailyTrend: recentTrend,
    });
  } catch (error) {
    console.error('Gift stats error:', error);
    return NextResponse.json({ error: 'İstatistikler yüklenemedi' }, { status: 500 });
  }
}
