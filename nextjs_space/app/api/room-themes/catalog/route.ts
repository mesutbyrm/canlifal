import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/mobile-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getCached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/room-themes/catalog
 * Flutter & web için tüm aktif oda arka planları.
 * Query: sinceVersion, tier, category
 */
export async function GET(request: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(request);
    const webSession = !mobileUser ? await getServerSession(authOptions) : null;
    const userId = mobileUser?.id || webSession?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sinceVersion = parseInt(searchParams.get('sinceVersion') || '0');
    const tier = searchParams.get('tier') || '';
    const category = searchParams.get('category') || '';

    const cacheKey = `room-themes:catalog:${sinceVersion}:${tier}:${category}`;

    const result = await getCached(cacheKey, 120, async () => {
      const where: any = { isActive: true };
      if (sinceVersion > 0) where.contentVersion = { gt: sinceVersion };
      if (tier) where.tier = tier;
      if (category) where.category = category;

      const [themes, maxVersion] = await Promise.all([
        prisma.roomTheme.findMany({
          where,
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        prisma.roomTheme.aggregate({ _max: { contentVersion: true } }),
      ]);

      return {
        themes,
        currentVersion: maxVersion._max.contentVersion || 1,
        totalThemes: themes.length,
        timestamp: new Date().toISOString(),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Room themes catalog error:', error);
    return NextResponse.json({ error: 'Arka planlar yüklenemedi' }, { status: 500 });
  }
}
