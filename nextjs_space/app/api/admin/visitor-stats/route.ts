import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const [todayTotal, todayUnique, weekTotal, weekUnique, monthTotal, monthUnique, yearTotal, yearUnique, countryStats, cityStats] = await Promise.all([
      // Today - Total visits
      prisma.siteVisit.count({
        where: { visitedAt: { gte: todayStart } }
      }),
      // Today - Unique visitors
      prisma.siteVisit.groupBy({
        by: ['visitorId'],
        where: { visitedAt: { gte: todayStart } },
        _count: true
      }).then(r => r.length),
      
      // Week - Total visits
      prisma.siteVisit.count({
        where: { visitedAt: { gte: weekStart } }
      }),
      // Week - Unique visitors
      prisma.siteVisit.groupBy({
        by: ['visitorId'],
        where: { visitedAt: { gte: weekStart } },
        _count: true
      }).then(r => r.length),
      
      // Month - Total visits
      prisma.siteVisit.count({
        where: { visitedAt: { gte: monthStart } }
      }),
      // Month - Unique visitors
      prisma.siteVisit.groupBy({
        by: ['visitorId'],
        where: { visitedAt: { gte: monthStart } },
        _count: true
      }).then(r => r.length),
      
      // Year - Total visits
      prisma.siteVisit.count({
        where: { visitedAt: { gte: yearStart } }
      }),
      // Year - Unique visitors
      prisma.siteVisit.groupBy({
        by: ['visitorId'],
        where: { visitedAt: { gte: yearStart } },
        _count: true
      }).then(r => r.length),
      
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
      })
    ]);

    // Format country and city stats
    const countries = countryStats.map(c => ({
      country: c.country || 'Bilinmiyor',
      count: c._count.country
    }));

    const cities = cityStats.map(c => ({
      city: c.city || 'Bilinmiyor',
      count: c._count.city
    }));

    return NextResponse.json({
      today: { total: todayTotal, unique: todayUnique },
      week: { total: weekTotal, unique: weekUnique },
      month: { total: monthTotal, unique: monthUnique },
      year: { total: yearTotal, unique: yearUnique },
      geo: { countries, cities }
    });
  } catch (error) {
    console.error('Visitor stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
