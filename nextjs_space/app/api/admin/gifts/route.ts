import { NextRequest, NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db';
import { getFileUrl } from '@/lib/s3';
import { serializeGiftMedia, resolveMediaUrl, deriveAssetFormat, deriveMediaType, deriveMimeType } from '@/lib/media-url';
import { generateVideoThumbnail } from '@/lib/gift-media-probe';
import { recordAudit } from '@/lib/audit-log';
import {
  DELETED_GIFT_CATEGORY,
  notDeletedGiftWhere,
  deriveGiftEngineFields,
  parseDisplayMode,
  nextGiftContentVersion,
  invalidateGiftCaches,
} from '@/lib/gift-admin';
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic';

// GET all gifts (admin list with filters)
export async function GET(request: NextRequest) {
  try {
    const session = await getStaffSession();
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.gift.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const collectionId = searchParams.get('collectionId') || '';
    const displayType = searchParams.get('displayType') || '';
    const isActive = searchParams.get('isActive');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    // Hediyeler her zaman jeton fiyatına göre (1 → 100K) listelenir.
    const SORTABLE = new Set(['price', 'name', 'createdAt', 'updatedAt'])
    const sortByRaw = searchParams.get('sortBy') || 'price';
    const sortBy = SORTABLE.has(sortByRaw) ? sortByRaw : 'price';
    const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // Silinen hediyeler admin listesinde de görünmez.
    const where: any = { AND: [notDeletedGiftWhere] };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (collectionId) where.collectionId = collectionId;
    if (displayType) where.displayType = displayType;
    if (isActive !== null && isActive !== '') where.isActive = isActive === 'true';
    if (minPrice) where.price = { ...where.price, gte: parseInt(minPrice) };
    if (maxPrice) where.price = { ...where.price, lte: parseInt(maxPrice) };

    const [gifts, total] = await Promise.all([
      prisma.giftType.findMany({
        where,
        include: { collection: { select: { id: true, name: true, slug: true, iconEmoji: true } } },
        orderBy: [{ [sortBy]: sortDir }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.giftType.count({ where }),
    ]);

    return NextResponse.json({
      gifts: gifts.map(serializeGiftMedia),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin gifts GET error:', error);
    return NextResponse.json({ error: 'Hediyeler yüklenemedi' }, { status: 500 });
  }
}

// POST create new gift — sade form; motor alanları medyaya göre otomatik.
export async function POST(request: NextRequest) {
  try {
    const session = await getStaffSession();
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.gift.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const body = await request.json();

    // Build public URLs from cloud storage paths
    const resolveUrl = async (cloudPath: string | undefined | null) => {
      if (!cloudPath) return undefined;
      try {
        return await getFileUrl(cloudPath, true);
      } catch { return undefined; }
    };

    const assetUrl = body.assetUrl || await resolveUrl(body.cloudStoragePath);
    let thumbnailUrl = body.thumbnailUrl || await resolveUrl(body.thumbnailCloudPath);
    const iconImageUrl = body.iconImageUrl || await resolveUrl(body.iconImageCloudPath);
    const soundUrl = body.soundUrl || await resolveUrl(body.soundCloudPath);
    const musicUrl = body.musicUrl || await resolveUrl(body.musicCloudPath);

    const name = String(body.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Hediye adı zorunlu' }, { status: 400 });
    }
    const price = parseInt(body.price);
    if (!Number.isFinite(price) || price < 1 || price > 100000) {
      return NextResponse.json({ error: 'Jeton fiyatı 1 ile 100.000 arasında olmalı' }, { status: 400 });
    }

    // Aynı hediye ikinci kez eklenemez — mevcut hediye düzenlenir.
    const duplicate = await prisma.giftType.findFirst({
      where: {
        AND: [
          notDeletedGiftWhere,
          {
            OR: [
              { name: { equals: name, mode: 'insensitive' } },
              ...(assetUrl ? [{ assetUrl }] : []),
            ],
          },
        ],
      },
      select: { id: true, name: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Bu hediye zaten var: "${duplicate.name}". Yeni ekleme yerine mevcut hediyeyi düzenleyin.`, existingId: duplicate.id },
        { status: 409 },
      );
    }

    const resolvedAssetUrl = resolveMediaUrl(assetUrl) ?? assetUrl ?? null;
    const assetFormat = deriveAssetFormat(body.assetType, resolvedAssetUrl, null);
    const mediaType = deriveMediaType(assetFormat);
    const assetWidth = body.assetWidth != null ? parseInt(body.assetWidth) : undefined;
    const assetHeight = body.assetHeight != null ? parseInt(body.assetHeight) : undefined;
    const assetDurationMs = body.assetDurationMs != null ? parseInt(body.assetDurationMs) : undefined;

    // ── Auto-generate a poster thumbnail for videos when none was provided ──
    if (mediaType === 'video' && !thumbnailUrl && resolvedAssetUrl) {
      try {
        const posterUrl = await generateVideoThumbnail(resolvedAssetUrl);
        if (posterUrl) thumbnailUrl = posterUrl;
      } catch (e) {
        console.error('Gift thumbnail auto-generation failed (continuing):', e);
      }
    }

    const engine = deriveGiftEngineFields(
      {
        assetUrl,
        assetType: body.assetType,
        assetMimeType: body.assetMimeType || deriveMimeType(assetFormat),
        assetDurationMs,
        particleEffect: body.particleEffect,
        price,
      },
      parseDisplayMode(body.displayMode ?? body.displayArea) ?? (mediaType === 'video' ? 'full' : 'small'),
    );

    const gift = await prisma.giftType.create({
      data: {
        name,
        nameEn: body.nameEn || name,
        icon: body.icon || '🎁',
        animation: body.animation,
        isActive: body.isActive ?? true,
        thumbnailUrl,
        assetUrl,
        cloudStoragePath: body.cloudStoragePath,
        thumbnailCloudPath: body.thumbnailCloudPath,
        assetWidth,
        assetHeight,
        assetDurationMs,
        category: body.category && body.category !== DELETED_GIFT_CATEGORY ? body.category : undefined,
        description: body.description,
        soundUrl,
        soundCloudPath: body.soundCloudPath,
        iconImageUrl,
        iconImageCloudPath: body.iconImageCloudPath,
        musicUrl,
        musicCloudPath: body.musicCloudPath,
        effectColor: body.effectColor,
        volume: body.volume !== undefined ? parseInt(body.volume) : 100,
        isNew: true,
        ...engine,
        contentVersion: await nextGiftContentVersion(),
      },
      include: { collection: { select: { id: true, name: true, slug: true } } },
    });

    invalidateGiftCaches();

    recordAudit({ actorId: (session.user as any).id, action: 'gift.create', targetType: 'gift_type', targetId: gift.id, after: { name: gift.name, price: gift.price } }).catch(() => {});
    return NextResponse.json(serializeGiftMedia(gift), { status: 201 });
  } catch (error: any) {
    console.error('Admin gift create error:', error);
    return NextResponse.json({ error: error.message || 'Hediye oluşturulamadı' }, { status: 500 });
  }
}
