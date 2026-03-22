import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userSelect = {
      id: true,
      name: true,
      image: true,
      role: true,
      membership: true,
    }

    // Top referrers
    const topReferrers = await prisma.user.findMany({
      where: {
        referrals: { some: {} }
      },
      select: {
        ...userSelect,
        _count: { select: { referrals: true } }
      },
      orderBy: {
        referrals: { _count: 'desc' }
      },
      take: 20
    });

    // Top fortune users
    const topFortuneUsers = await prisma.user.findMany({
      where: {
        fortunes: { some: {} }
      },
      select: {
        ...userSelect,
        _count: { select: { fortunes: true } }
      },
      orderBy: {
        fortunes: { _count: 'desc' }
      },
      take: 20
    });

    // Top sharers (social posts)
    const topSharers = await prisma.user.findMany({
      where: {
        socialPosts: { some: {} }
      },
      select: {
        ...userSelect,
        _count: { select: { socialPosts: true } }
      },
      orderBy: {
        socialPosts: { _count: 'desc' }
      },
      take: 20
    });

    const mapUser = (u: any, countField: string) => ({
      id: u.id,
      name: u.name,
      image: u.image,
      role: u.role,
      membership: u.membership,
      count: u._count[countField]
    })

    return NextResponse.json({
      topReferrers: topReferrers.map((u: any) => mapUser(u, 'referrals')),
      topFortuneUsers: topFortuneUsers.map((u: any) => mapUser(u, 'fortunes')),
      topSharers: topSharers.map((u: any) => mapUser(u, 'socialPosts'))
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({
      topReferrers: [],
      topFortuneUsers: [],
      topSharers: []
    });
  }
}
