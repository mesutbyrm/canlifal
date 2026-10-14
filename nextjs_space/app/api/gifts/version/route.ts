import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCached } from '@/lib/cache';
import { notDeletedGiftWhere } from '@/lib/gift-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gifts/version
 * Lightweight version check for Flutter/web cache invalidation.
 * Returns current max contentVersion for gifts and room themes.
 * Flutter calls this first; if version > local, calls /api/gifts/catalog?sinceVersion=X
 */
export async function GET(request: NextRequest) {
  try {
    const result = await getCached('gifts:version-check', 5, async () => {
      const [giftVersion, themeVersion, giftCount, themeCount] = await Promise.all([
        // Tüm hediyeler: pasif/silinen hediyenin sürümü de istemcileri tetiklemeli.
        prisma.giftType.aggregate({ _max: { contentVersion: true } }),
        prisma.roomTheme.aggregate({ where: { isActive: true }, _max: { contentVersion: true } }),
        prisma.giftType.count({ where: { isActive: true, ...notDeletedGiftWhere } }),
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

    // Kısa önbellek: isim/fiyat değişikliği her APK'da saniyeler içinde görünsün.
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=5, stale-while-revalidate=10',
      },
    });
  } catch (error) {
    console.error('Gift version check error:', error);
    return NextResponse.json({ error: 'Versiyon kontrolü başarısız' }, { status: 500 });
  }
}
