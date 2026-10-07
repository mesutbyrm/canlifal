import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { invalidateCache } from '@/lib/cache';
import { getFileUrl } from '@/lib/s3';
import { serializeGiftMedia, resolveMediaUrl, deriveAssetFormat, deriveMediaType, deriveMimeType } from '@/lib/media-url';
import { generateVideoThumbnail } from '@/lib/gift-media-probe';
import { recordAudit } from '@/lib/audit-log';
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic';

// GET all gifts (admin list with filters)
export async function GET(request: NextRequest) {
  try {
    const session = await getHybridSession(request);
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
    const sortBy = searchParams.get('sortBy') || 'sortOrder';
    const sortDir = searchParams.get('sortDir') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const where: any = {};

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
        orderBy: { [sortBy]: sortDir },
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

// POST create new gift
export async function POST(request: NextRequest) {
  try {
    const session = await getHybridSession(request);
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

    // ── Derive media descriptors + MIME type from the resolved asset ──
    const resolvedAssetUrl = resolveMediaUrl(assetUrl) ?? assetUrl ?? null;
    const assetFormat = deriveAssetFormat(body.assetType, resolvedAssetUrl, body.animationType);
    const mediaType = deriveMediaType(assetFormat);
    const assetMimeType = body.assetMimeType || deriveMimeType(assetFormat) || undefined;
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

    const gift = await prisma.giftType.create({
      data: {
        name: body.name,
        nameEn: body.nameEn || body.name,
        icon: body.icon || '🎁',
        animation: body.animation,
        price: parseInt(body.price) || 10,
        sortOrder: parseInt(body.sortOrder) || 0,
        isActive: body.isActive ?? true,
        // Asset fields
        thumbnailUrl,
        assetUrl,
        assetType: body.assetType || 'image',
        cloudStoragePath: body.cloudStoragePath,
        thumbnailCloudPath: body.thumbnailCloudPath,
        // Media metadata (nullable / backward-compatible)
        assetWidth,
        assetHeight,
        assetDurationMs,
        assetMimeType,
        category: body.category,
        description: body.description,
        // Premium
        soundUrl,
        soundCloudPath: body.soundCloudPath,
        animationDurationMs: body.animationDurationMs ? parseInt(body.animationDurationMs) : undefined,
        isFullscreen: body.isFullscreen ?? false,
        tier: body.tier || 'small',
        isPopular: body.isPopular ?? false,
        isNew: body.isNew ?? true,
        isSpecialEvent: body.isSpecialEvent ?? false,
        isHidden: body.isHidden ?? false,
        seasonStart: body.seasonStart ? new Date(body.seasonStart) : undefined,
        seasonEnd: body.seasonEnd ? new Date(body.seasonEnd) : undefined,
        isFeatured: body.isFeatured ?? false,
        // Icon/effect
        iconImageUrl,
        iconImageCloudPath: body.iconImageCloudPath,
        effectColor: body.effectColor,
        comboEnabled: body.comboEnabled ?? false,
        isPremium: body.isPremium ?? false,
        isLucky: body.isLucky ?? false,
        // Visibility
        visibleInVoiceRoom: body.visibleInVoiceRoom ?? true,
        visibleInLiveStream: body.visibleInLiveStream ?? true,
        visibleInPK: body.visibleInPK ?? true,
        visibleInProfile: body.visibleInProfile ?? false,
        visibleInMessaging: body.visibleInMessaging ?? false,
        visibleInTrend: body.visibleInTrend ?? false,
        visibleInStories: body.visibleInStories ?? false,
        visibleInFortune: body.visibleInFortune ?? false,
        visibleInNotification: body.visibleInNotification ?? false,
        visibleAsMini: body.visibleAsMini ?? false,
        visibleAsFullscreen: body.visibleAsFullscreen ?? false,
        // Type
        displayType: body.displayType || 'static',
        // Properties
        requiresVip: body.requiresVip ?? false,
        eventOnly: body.eventOnly ?? false,
        pkOnly: body.pkOnly ?? false,
        liveOnly: body.liveOnly ?? false,
        voiceOnly: body.voiceOnly ?? false,
        newUserOnly: body.newUserOnly ?? false,
        timedCampaign: body.timedCampaign ?? false,
        campaignStart: body.campaignStart ? new Date(body.campaignStart) : undefined,
        campaignEnd: body.campaignEnd ? new Date(body.campaignEnd) : undefined,
        isSeasonal: body.isSeasonal ?? false,
        isReusable: body.isReusable ?? true,
        dailySendLimit: body.dailySendLimit ? parseInt(body.dailySendLimit) : undefined,
        // Animation
        startDelayMs: body.startDelayMs ? parseInt(body.startDelayMs) : undefined,
        displayDurationMs: body.displayDurationMs ? parseInt(body.displayDurationMs) : undefined,
        repeatCount: body.repeatCount !== undefined ? parseInt(body.repeatCount) : 1,
        volume: body.volume !== undefined ? parseInt(body.volume) : 100,
        particleEffect: body.particleEffect,
        hasVibration: body.hasVibration ?? false,
        hasColorChange: body.hasColorChange ?? false,
        // Position
        screenPosition: body.screenPosition || 'center',
        animStartPoint: body.animStartPoint,
        animEndPoint: body.animEndPoint,
        // Collection
        collectionId: body.collectionId || undefined,
        // Music
        musicUrl,
        musicCloudPath: body.musicCloudPath,
        // ── Gift Engine attributes (additive) ──
        priority: body.priority || 'MEDIUM',
        animationType: body.animationType || undefined,
        displayArea: body.displayArea || undefined,
        seatEffect: body.seatEffect || undefined,
        seatEffectEnabled: body.seatEffectEnabled ?? true,
        soundEffectEnabled: body.soundEffectEnabled ?? true,
        comboWindowMs: body.comboWindowMs ? parseInt(body.comboWindowMs) : undefined,
        // Version
        contentVersion: 1,
      },
      include: { collection: { select: { id: true, name: true, slug: true } } },
    });

    await invalidateCache('gifts:active');

    recordAudit({ actorId: (session.user as any).id, action: 'gift.create', targetType: 'gift_type', targetId: gift.id, after: { name: gift.name, price: gift.price } }).catch(() => {});
    return NextResponse.json(serializeGiftMedia(gift), { status: 201 });
  } catch (error: any) {
    console.error('Admin gift create error:', error);
    return NextResponse.json({ error: error.message || 'Hediye oluşturulamadı' }, { status: 500 });
  }
}
