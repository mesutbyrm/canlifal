import { NextRequest, NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db';
import { recordAudit, getAuditIp } from '@/lib/audit-log';
import { getFileUrl } from '@/lib/s3';
import { serializeGiftMedia, resolveMediaUrl, deriveAssetFormat, deriveMediaType, deriveMimeType } from '@/lib/media-url';
import { generateVideoThumbnail } from '@/lib/gift-media-probe';
import { staffCan } from '@/lib/permissions'
import {
  DELETED_GIFT_CATEGORY,
  notDeletedGiftWhere,
  deriveGiftEngineFields,
  parseDisplayMode,
  nextGiftContentVersion,
  invalidateGiftCaches,
} from '@/lib/gift-admin';
import { GIFT_MEDIA_PATH_FIELDS, deleteGiftMediaKeys, giftMediaKeys } from '@/lib/gift-media-cleanup';

export const dynamic = 'force-dynamic';

// GET single gift detail
export async function GET(
  request: NextRequest,
  { params }: { params: { giftId: string } }
) {
  try {
    const session = await getStaffSession();
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.gift.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const gift = await prisma.giftType.findUnique({
      where: { id: params.giftId },
      include: {
        collection: { select: { id: true, name: true, slug: true, iconEmoji: true } },
        _count: { select: { gifts: true, chatRoomGifts: true, giftEvents: true } },
      },
    });

    if (!gift) {
      return NextResponse.json({ error: 'Hediye bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(serializeGiftMedia(gift));
  } catch (error) {
    console.error('Admin gift GET error:', error);
    return NextResponse.json({ error: 'Hediye yüklenemedi' }, { status: 500 });
  }
}

// PATCH update gift
export async function PATCH(
  request: NextRequest,
  { params }: { params: { giftId: string } }
) {
  try {
    const session = await getStaffSession();
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.gift.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const body = await request.json();

    const existing = await prisma.giftType.findUnique({ where: { id: params.giftId } });
    if (!existing || existing.category === DELETED_GIFT_CATEGORY) {
      return NextResponse.json({ error: 'Hediye bulunamadı' }, { status: 404 });
    }

    const resolveUrl = async (cloudPath: string | undefined | null) => {
      if (!cloudPath) return undefined;
      try { return await getFileUrl(cloudPath, true); } catch { return undefined; }
    };

    // Build update data — only include fields that are explicitly provided
    const data: any = {};
    const directFields = [
      'name', 'nameEn', 'icon', 'animation', 'sortOrder', 'isActive',
      'assetType', 'category', 'description', 'tier',
      'isPopular', 'isNew', 'isSpecialEvent', 'isHidden', 'isFeatured',
      'effectColor', 'comboEnabled', 'isPremium', 'isLucky', 'isFullscreen',
      'visibleInVoiceRoom', 'visibleInLiveStream', 'visibleInPK',
      'visibleInProfile', 'visibleInMessaging', 'visibleInTrend',
      'visibleInStories', 'visibleInFortune', 'visibleInNotification',
      'visibleAsMini', 'visibleAsFullscreen', 'displayType',
      'requiresVip', 'eventOnly', 'pkOnly', 'liveOnly', 'voiceOnly',
      'newUserOnly', 'timedCampaign', 'isSeasonal', 'isReusable',
      'particleEffect', 'hasVibration', 'hasColorChange',
      'screenPosition', 'animStartPoint', 'animEndPoint',
      // ── Gift Engine attributes (additive) ──
      'priority', 'animationType', 'displayArea', 'seatEffect',
      'seatEffectEnabled', 'soundEffectEnabled',
    ];
    for (const f of directFields) {
      if (body[f] !== undefined) data[f] = body[f];
    }

    // Integer fields
    const intFields = ['price', 'animationDurationMs', 'startDelayMs', 'displayDurationMs', 'repeatCount', 'volume', 'dailySendLimit', 'comboWindowMs', 'assetWidth', 'assetHeight', 'assetDurationMs'];
    for (const f of intFields) {
      if (body[f] !== undefined) data[f] = body[f] === null ? null : parseInt(body[f]);
    }
    // Media MIME type (string, nullable)
    if (body.assetMimeType !== undefined) data.assetMimeType = body.assetMimeType || null;

    // Date fields
    const dateFields = ['seasonStart', 'seasonEnd', 'campaignStart', 'campaignEnd', 'firstReleasedAt'];
    for (const f of dateFields) {
      if (body[f] !== undefined) data[f] = body[f] ? new Date(body[f]) : null;
    }

    // Cloud storage path + URL pairs
    if (body.cloudStoragePath !== undefined) {
      data.cloudStoragePath = body.cloudStoragePath;
      data.assetUrl = body.assetUrl || await resolveUrl(body.cloudStoragePath);
    }
    if (body.thumbnailCloudPath !== undefined) {
      data.thumbnailCloudPath = body.thumbnailCloudPath;
      data.thumbnailUrl = body.thumbnailUrl || await resolveUrl(body.thumbnailCloudPath);
    }
    if (body.iconImageCloudPath !== undefined) {
      data.iconImageCloudPath = body.iconImageCloudPath;
      data.iconImageUrl = body.iconImageUrl || await resolveUrl(body.iconImageCloudPath);
    }
    if (body.soundCloudPath !== undefined) {
      data.soundCloudPath = body.soundCloudPath;
      data.soundUrl = body.soundUrl || await resolveUrl(body.soundCloudPath);
    }
    if (body.musicCloudPath !== undefined) {
      data.musicCloudPath = body.musicCloudPath;
      data.musicUrl = body.musicUrl || await resolveUrl(body.musicCloudPath);
    }

    // Direct URL updates
    if (body.assetUrl !== undefined && !body.cloudStoragePath) data.assetUrl = body.assetUrl;
    if (body.thumbnailUrl !== undefined && !body.thumbnailCloudPath) data.thumbnailUrl = body.thumbnailUrl;
    if (body.iconImageUrl !== undefined && !body.iconImageCloudPath) data.iconImageUrl = body.iconImageUrl;
    if (body.soundUrl !== undefined && !body.soundCloudPath) data.soundUrl = body.soundUrl;
    if (body.musicUrl !== undefined && !body.musicCloudPath) data.musicUrl = body.musicUrl;

    // Collection
    if (body.collectionId !== undefined) {
      data.collectionId = body.collectionId || null;
    }

    // ── Derive MIME type + auto-generate poster thumbnail when the asset is a
    //    video that changed and no explicit thumbnail was provided ──
    if (data.assetUrl !== undefined) {
      const resolvedAssetUrl = resolveMediaUrl(data.assetUrl) ?? data.assetUrl ?? null;
      const fmt = deriveAssetFormat(body.assetType, resolvedAssetUrl, body.animationType);
      const mt = deriveMediaType(fmt);
      if (data.assetMimeType === undefined) {
        const derivedMime = deriveMimeType(fmt);
        if (derivedMime) data.assetMimeType = derivedMime;
      }
      const thumbProvided = data.thumbnailUrl != null && data.thumbnailUrl !== '';
      if (mt === 'video' && !thumbProvided && resolvedAssetUrl) {
        try {
          const posterUrl = await generateVideoThumbnail(resolvedAssetUrl);
          if (posterUrl) data.thumbnailUrl = posterUrl;
        } catch (e) {
          console.error('Gift thumbnail auto-generation failed (continuing):', e);
        }
      }
    }

    if (data.name !== undefined) {
      data.name = String(data.name ?? '').trim();
      if (!data.name) {
        return NextResponse.json({ error: 'Hediye adı zorunlu' }, { status: 400 });
      }
      const clash = await prisma.giftType.findFirst({
        where: {
          AND: [notDeletedGiftWhere, { id: { not: params.giftId } }, { name: { equals: data.name, mode: 'insensitive' } }],
        },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json({ error: 'Bu isimde başka bir hediye var', existingId: clash.id }, { status: 409 });
      }
    }
    if (data.price !== undefined && (!Number.isFinite(data.price) || data.price < 1 || data.price > 100000)) {
      return NextResponse.json({ error: 'Jeton fiyatı 1 ile 100.000 arasında olmalı' }, { status: 400 });
    }
    if (data.category === DELETED_GIFT_CATEGORY) delete data.category;
    // Yeni dosya yüklendi ama süresi gelmediyse eski videonun süresi kalmasın.
    if (data.assetUrl !== undefined && data.assetUrl !== existing.assetUrl && body.assetDurationMs === undefined) {
      data.assetDurationMs = null;
    }

    // Motor alanları (süre, konum, öncelik, parçacık, sıra, görünürlük) otomatik.
    const merged = { ...existing, ...data };
    const mode = parseDisplayMode(body.displayMode ?? body.displayArea);
    Object.assign(data, deriveGiftEngineFields(merged, mode));
    if (data.assetMimeType === null) delete data.assetMimeType;

    // Global sürüm — her APK delta ile bu değişikliği alır.
    data.contentVersion = await nextGiftContentVersion();

    const gift = await prisma.giftType.update({
      where: { id: params.giftId },
      data,
      include: { collection: { select: { id: true, name: true, slug: true } } },
    });

    invalidateGiftCaches();

    // Değiştirilen / kaldırılan medyanın eski dosyası depoda kalmasın.
    const replacedKeys = GIFT_MEDIA_PATH_FIELDS.filter(
      (f) => data[f] !== undefined && (existing as any)[f] && (existing as any)[f] !== data[f],
    ).map((f) => String((existing as any)[f]))
    if (replacedKeys.length > 0) {
      deleteGiftMediaKeys(replacedKeys, params.giftId).catch(() => {})
    }

    recordAudit({
      action: 'gift_update',
      targetType: 'GiftType',
      targetId: params.giftId,
      actorId: (session.user as any).id || session.user.email || 'unknown',
      metadata: { updatedFields: Object.keys(data).filter(k => k !== 'contentVersion') },
      ip: getAuditIp(request),
    }).catch(() => {});

    return NextResponse.json(serializeGiftMedia(gift));
  } catch (error: any) {
    console.error('Admin gift PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Hediye güncellenemedi' }, { status: 500 });
  }
}

// DELETE gift — hediyeyi tamamen kaldırır:
//  • Video / görsel / ikon / ses / müzik dosyaları depodan silinir (başka bir
//    hediye aynı dosyayı kullanmıyorsa).
//  • Kayıttaki tüm medya bağlantıları boşaltılır; hediye admin listesinden,
//    kataloglardan ve tüm uygulamalardan düşer.
//  • Satırın kendisi kalır: geçmiş gönderim kayıtları ona bağlıdır ve
//    uygulamalar önbellekteki kopyayı ancak «silindi» işaretli satırı görünce
//    kaldırır (satır tamamen silinirse eski uygulamalarda görünmeye devam eder).
export async function DELETE(
  request: NextRequest,
  { params }: { params: { giftId: string } }
) {
  try {
    const session = await getStaffSession();
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.gift.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const existing = await prisma.giftType.findUnique({ where: { id: params.giftId } });
    if (!existing || existing.category === DELETED_GIFT_CATEGORY) {
      return NextResponse.json({ error: 'Hediye bulunamadı' }, { status: 404 });
    }

    const keys = giftMediaKeys(existing as any);
    await prisma.giftType.update({
      where: { id: params.giftId },
      data: {
        isActive: false,
        isHidden: true,
        category: DELETED_GIFT_CATEGORY,
        collectionId: null,
        assetUrl: null,
        thumbnailUrl: null,
        iconImageUrl: null,
        soundUrl: null,
        musicUrl: null,
        cloudStoragePath: null,
        thumbnailCloudPath: null,
        iconImageCloudPath: null,
        soundCloudPath: null,
        musicCloudPath: null,
        contentVersion: await nextGiftContentVersion(),
      },
    });

    const filesDeleted = await deleteGiftMediaKeys(keys, params.giftId);

    invalidateGiftCaches();

    recordAudit({
      action: 'gift_delete',
      targetType: 'GiftType',
      targetId: params.giftId,
      actorId: (session.user as any).id || session.user.email || 'unknown',
      metadata: { name: existing.name, filesDeleted, mediaKeys: keys.length, removedFromCatalog: true },
      ip: getAuditIp(request),
    }).catch(() => {});

    return NextResponse.json({ success: true, filesDeleted });
  } catch (error) {
    console.error('Admin gift DELETE error:', error);
    return NextResponse.json({ error: 'Hediye silinemedi' }, { status: 500 });
  }
}
