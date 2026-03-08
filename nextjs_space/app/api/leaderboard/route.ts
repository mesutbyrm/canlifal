import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Top referrers
    const topReferrers = await prisma.user.findMany({
      where: {
        referrals: { some: {} }
      },
      select: {
        id: true,
        name: true,
        image: true,
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
        id: true,
        name: true,
        image: true,
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
        id: true,
        name: true,
        image: true,
        _count: { select: { socialPosts: true } }
      },
      orderBy: {
        socialPosts: { _count: 'desc' }
      },
      take: 20
    });

    return NextResponse.json({
      topReferrers: topReferrers.map((u: { id: string; name: string | null; image: string | null; _count: { referrals: number } }) => ({
        id: u.id,
        name: u.name,
        image: u.image,
        count: u._count.referrals
      })),
      topFortuneUsers: topFortuneUsers.map((u: { id: string; name: string | null; image: string | null; _count: { fortunes: number } }) => ({
        id: u.id,
        name: u.name,
        image: u.image,
        count: u._count.fortunes
      })),
      topSharers: topSharers.map((u: { id: string; name: string | null; image: string | null; _count: { socialPosts: number } }) => ({
        id: u.id,
        name: u.name,
        image: u.image,
        count: u._count.socialPosts
      }))
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
