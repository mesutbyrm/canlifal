import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { invalidateCache } from '@/lib/cache';
import { getFileUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

// GET single gift detail
export async function GET(
  request: NextRequest,
  { params }: { params: { giftId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'yonetici'].includes((session.user as any).role)) {
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

    return NextResponse.json(gift);
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
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'yonetici'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const body = await request.json();

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
    ];
    for (const f of directFields) {
      if (body[f] !== undefined) data[f] = body[f];
    }

    // Integer fields
    const intFields = ['price', 'animationDurationMs', 'startDelayMs', 'displayDurationMs', 'repeatCount', 'volume', 'dailySendLimit'];
    for (const f of intFields) {
      if (body[f] !== undefined) data[f] = body[f] === null ? null : parseInt(body[f]);
    }

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

    // Increment content version for sync
    data.contentVersion = { increment: 1 };

    const gift = await prisma.giftType.update({
      where: { id: params.giftId },
      data,
      include: { collection: { select: { id: true, name: true, slug: true } } },
    });

    await invalidateCache('gifts:active');

    return NextResponse.json(gift);
  } catch (error: any) {
    console.error('Admin gift PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Hediye güncellenemedi' }, { status: 500 });
  }
}

// DELETE gift (soft delete — set isActive=false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { giftId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'yonetici'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    await prisma.giftType.update({
      where: { id: params.giftId },
      data: { isActive: false, contentVersion: { increment: 1 } },
    });

    await invalidateCache('gifts:active');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin gift DELETE error:', error);
    return NextResponse.json({ error: 'Hediye silinemedi' }, { status: 500 });
  }
}
