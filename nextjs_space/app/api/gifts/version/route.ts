import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gifts/version
 * Lightweight version check for Flutter/web cache invalidation.
 * Returns current max contentVersion for gifts and room themes.
 * Flutter calls this first; if version > local, calls /api/gifts/catalog?sinceVersion=X
 */
export async function GET(request: NextRequest) {
  try {
    const result = await getCached('gifts:version-check', 30, async () => {
      const [giftVersion, themeVersion, giftCount, themeCount] = await Promise.all([
        prisma.giftType.aggregate({ where: { isActive: true }, _max: { contentVersion: true } }),
        prisma.roomTheme.aggregate({ where: { isActive: true }, _max: { contentVersion: true } }),
        prisma.giftType.count({ where: { isActive: true } }),
        prisma.roomTheme.count({ where: { isActive: true } }),
      ]);

      return {
        giftVersion: giftVersion._max.contentVersion || 1,
        themeVersion: themeVersion._max.contentVersion || 1,
        giftCount,
        themeCount,
        timestamp: new Date().toISOString(),
      };
    });

    // Cache-Control: allow client caching for 30s, CDN for 60s
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Gift version check error:', error);
    return NextResponse.json({ error: 'Versiyon kontrolü başarısız' }, { status: 500 });
  }
}
