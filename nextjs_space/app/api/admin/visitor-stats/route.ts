import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const now = new Date();
    
    // Date ranges
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now);
    monthStart.setMonth(monthStart.getMonth() - 1);
    monthStart.setHours(0, 0, 0, 0);
    
    const yearStart = new Date(now);
    yearStart.setFullYear(yearStart.getFullYear() - 1);
    yearStart.setHours(0, 0, 0, 0);

    // Get statistics
    const [todayTotal, todayUnique, weekTotal, weekUnique, monthTotal, monthUnique, yearTotal, yearUnique, countryStats, cityStats, deviceStats, botStats, recentBots, activePresences] = await Promise.all([
      // Today - Total visits
      prisma.siteVisit.count({
        where: { visitedAt: { gte: todayStart } }
      }),
      // Today - Unique visitors
      prisma.siteVisit.groupBy({
        by: ['visitorId'],
        where: { visitedAt: { gte: todayStart } },
        _count: true
      }).then((r: any) => r.length),
      
      // Week - Total visits
      prisma.siteVisit.count({
        where: { visitedAt: { gte: weekStart } }
      }),
      // Week - Unique visitors
      prisma.siteVisit.groupBy({
        by: ['visitorId'],
        where: { visitedAt: { gte: weekStart } },
        _count: true
      }).then((r: any) => r.length),
      
      // Month - Total visits
      prisma.siteVisit.count({
        where: { visitedAt: { gte: monthStart } }
      }),
      // Month - Unique visitors
      prisma.siteVisit.groupBy({
        by: ['visitorId'],
        where: { visitedAt: { gte: monthStart } },
        _count: true
      }).then((r: any) => r.length),
      
      // Year - Total visits
      prisma.siteVisit.count({
        where: { visitedAt: { gte: yearStart } }
      }),
      // Year - Unique visitors
      prisma.siteVisit.groupBy({
        by: ['visitorId'],
        where: { visitedAt: { gte: yearStart } },
        _count: true
      }).then((r: any) => r.length),
      
      // Country statistics (last 30 days)
      prisma.siteVisit.groupBy({
        by: ['country'],
        where: { visitedAt: { gte: monthStart } },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10
      }),
      
      // City statistics (last 30 days)
      prisma.siteVisit.groupBy({
        by: ['city'],
        where: { visitedAt: { gte: monthStart } },
        _count: { city: true },
        orderBy: { _count: { city: 'desc' } },
        take: 10
      }),

      // Device type breakdown (last 30 days)
      prisma.siteVisit.groupBy({
        by: ['deviceType'],
        where: { visitedAt: { gte: monthStart }, isBot: false },
        _count: { deviceType: true },
        orderBy: { _count: { deviceType: 'desc' } }
      }),

      // Bot breakdown (last 30 days)
      prisma.siteVisit.groupBy({
        by: ['botName'],
        where: { visitedAt: { gte: monthStart }, isBot: true },
        _count: { botName: true },
        orderBy: { _count: { botName: 'desc' } },
        take: 15
      }),

      // Recent bots currently active
      prisma.sitePresence.findMany({
        where: {
          isBot: true,
          lastSeen: { gte: new Date(now.getTime() - 5 * 60 * 1000) }
        },
        select: { botName: true, path: true, lastSeen: true, deviceType: true },
        orderBy: { lastSeen: 'desc' },
        take: 20
      }),

      // All currently active presences with details
      prisma.sitePresence.findMany({
        where: { lastSeen: { gte: new Date(now.getTime() - 2 * 60 * 1000) } },
        select: {
          visitorId: true,
          userId: true,
          path: true,
          lastSeen: true,
          deviceType: true,
          isBot: true,
          botName: true,
          userAgent: true
        },
        orderBy: { lastSeen: 'desc' },
        take: 50
      })
    ]);

    // Format country and city stats
    const countries = countryStats.map((c: any) => ({
      country: c.country || 'Bilinmiyor',
      count: c._count.country
    }));

    const cities = cityStats.map((c: any) => ({
      city: c.city || 'Bilinmiyor',
      count: c._count.city
    }));

    // Format device stats
    const devices = deviceStats.map((d: any) => ({
      deviceType: d.deviceType || 'unknown',
      count: d._count.deviceType
    }));

    // Format bot stats
    const bots = botStats.map((b: any) => ({
      botName: b.botName || 'Bilinmeyen Bot',
      count: b._count.botName
    }));

    // Format active presences with user names
    const userIds = activePresences.filter((p: any) => p.userId).map((p: any) => p.userId);
    let userMap = new Map();
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, username: true }
      });
      userMap = new Map(users.map((u: any) => [u.id, u]));
    }

    const activeVisitors = activePresences.map((p: any) => ({
      visitorId: p.visitorId,
      userId: p.userId,
      userName: p.userId ? (userMap.get(p.userId)?.username || userMap.get(p.userId)?.name || 'Kullanıcı') : null,
      path: p.path,
      lastSeen: p.lastSeen,
      deviceType: p.deviceType,
      isBot: p.isBot,
      botName: p.botName,
    }));

    return NextResponse.json({
      today: { total: todayTotal, unique: todayUnique },
      week: { total: weekTotal, unique: weekUnique },
      month: { total: monthTotal, unique: monthUnique },
      year: { total: yearTotal, unique: yearUnique },
      geo: { countries, cities },
      devices,
      bots,
      recentBots,
      activeVisitors
    });
  } catch (error) {
    console.error('Visitor stats error:', error);
    return NextResponse.json({ error: 'İstatistikler alınamadı' }, { status: 500 });
  }
}
