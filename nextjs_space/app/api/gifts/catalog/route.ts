import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/mobile-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getCached } from '@/lib/cache';
import { notDeletedGiftWhere, normalizeCatalogGift } from '@/lib/gift-admin';
import { serializeGiftMedia } from '@/lib/media-url';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gifts/catalog
 * Full gift catalog for Flutter & web with version-based sync.
 * Query params:
 *   - sinceVersion: number — only return gifts with contentVersion > this
 *   - context: voice_room|live_stream|pk|profile|messaging|trend|stories|fortune|notification|mini|fullscreen
 */
export async function GET(request: NextRequest) {
  try {
    // Dual auth
    const mobileUser = await authenticateRequest(request);
    const webSession = !mobileUser ? await getServerSession(authOptions) : null;
    const userId = mobileUser?.id || webSession?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sinceVersion = parseInt(searchParams.get('sinceVersion') || '0');
    const context = searchParams.get('context') || '';

    // Tam katalog: yalnızca aktif hediyeler. Delta: değişen HER hediye — pasif
    // veya silinen hediyeler isActive:false ile gelir, böylece eski APK'lar da
    // önbelleğindeki kopyayı ezer ve panelden kaldırır.
    const where: any = sinceVersion > 0
      ? { contentVersion: { gt: sinceVersion } }
      : { isActive: true, ...notDeletedGiftWhere };

    // Context-based visibility filtering
    // Sesli oda / canlı yayın / PK: tüm hediyeler her yerde gönderilebilir.
    const contextFieldMap: Record<string, string> = {
      profile: 'visibleInProfile',
      messaging: 'visibleInMessaging',
      trend: 'visibleInTrend',
      stories: 'visibleInStories',
      fortune: 'visibleInFortune',
      notification: 'visibleInNotification',
      mini: 'visibleAsMini',
      fullscreen: 'visibleAsFullscreen',
    };
    if (context && contextFieldMap[context]) {
      where[contextFieldMap[context]] = true;
    }

    const cacheKey = `gifts:catalog:${sinceVersion}:${context}`;
    const ttl = sinceVersion > 0 ? 5 : 15;

    const result = await getCached(cacheKey, ttl, async () => {
      const [gifts, collections, maxVersionResult] = await Promise.all([
        prisma.giftType.findMany({
          where,
          include: { collection: { select: { id: true, name: true, nameEn: true, slug: true, iconEmoji: true } } },
          // Her zaman jeton fiyatına göre: 1 → 100K.
          orderBy: [{ price: 'asc' }, { name: 'asc' }],
        }),
        prisma.giftCollection.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { gifts: true } } },
        }),
        prisma.giftType.aggregate({ _max: { contentVersion: true } }),
      ]);

      return {
        gifts: gifts.map((g) => normalizeCatalogGift(serializeGiftMedia(g))),
        collections,
        currentVersion: maxVersionResult._max.contentVersion || 1,
        totalGifts: gifts.filter((g) => g.isActive).length,
        timestamp: new Date().toISOString(),
      };
    });

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Gift catalog error:', error);
    return NextResponse.json({ error: 'Katalog yüklenemedi' }, { status: 500 });
  }
}
