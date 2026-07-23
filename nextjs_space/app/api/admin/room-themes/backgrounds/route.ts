import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { generatePresignedUploadUrl, getFileUrl } from '@/lib/s3';
import { invalidateCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/room-themes/backgrounds - Tüm arka planları listele (admin detaylı)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'yonetici'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const tier = searchParams.get('tier') || '';
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (category) where.category = category;
    if (tier) where.tier = tier;
    if (isActive !== null && isActive !== '') where.isActive = isActive === 'true';

    const themes = await prisma.roomTheme.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(themes);
  } catch (error) {
    console.error('Admin backgrounds GET error:', error);
    return NextResponse.json({ error: 'Arka planlar yüklenemedi' }, { status: 500 });
  }
}

/**
 * POST /api/admin/room-themes/backgrounds - Yeni arka plan ekle (genişletilmiş)
 */
export async function POST(request: NextRequest) {
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

    const backgroundUrl = body.backgroundUrl || await resolveUrl(body.cloudStoragePath) || '';
    const thumbnailUrl = body.thumbnailUrl || await resolveUrl(body.thumbnailCloudPath);
    const soundUrl = body.soundUrl || await resolveUrl(body.soundCloudPath);

    const theme = await prisma.roomTheme.create({
      data: {
        name: body.name,
        nameEn: body.nameEn || body.name,
        backgroundUrl,
        cloudStoragePath: body.cloudStoragePath,
        thumbnailUrl,
        thumbnailCloudPath: body.thumbnailCloudPath,
        assetType: body.assetType || 'image',
        tier: body.tier || 'free',
        isActive: body.isActive ?? true,
        activeFrom: body.activeFrom ? new Date(body.activeFrom) : undefined,
        activeTo: body.activeTo ? new Date(body.activeTo) : undefined,
        sortOrder: parseInt(body.sortOrder) || 0,
        category: body.category,
        description: body.description,
        animationSpeed: body.animationSpeed ? parseFloat(body.animationSpeed) : 1.0,
        blurAmount: body.blurAmount !== undefined ? parseInt(body.blurAmount) : 0,
        opacity: body.opacity !== undefined ? parseFloat(body.opacity) : 1.0,
        hasParallax: body.hasParallax ?? false,
        hasZoom: body.hasZoom ?? false,
        videoLoop: body.videoLoop ?? true,
        soundUrl,
        soundCloudPath: body.soundCloudPath,
        soundVolume: body.soundVolume !== undefined ? parseInt(body.soundVolume) : 50,
        isPremium: body.isPremium ?? false,
        isVipOnly: body.isVipOnly ?? false,
        isEventOnly: body.isEventOnly ?? false,
        contentVersion: 1,
      },
    });

    await invalidateCache('chat:room-backgrounds');
    return NextResponse.json(theme, { status: 201 });
  } catch (error: any) {
    console.error('Admin background create error:', error);
    return NextResponse.json({ error: error.message || 'Arka plan oluşturulamadı' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/room-themes/backgrounds - Arka plan güncelle
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'yonetici'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id zorunlu' }, { status: 400 });

    const resolveUrl = async (cloudPath: string | undefined | null) => {
      if (!cloudPath) return undefined;
      try { return await getFileUrl(cloudPath, true); } catch { return undefined; }
    };

    const data: any = { contentVersion: { increment: 1 } };

    const directFields = ['name', 'nameEn', 'assetType', 'tier', 'isActive', 'category', 'description',
      'hasParallax', 'hasZoom', 'videoLoop', 'isPremium', 'isVipOnly', 'isEventOnly'];
    for (const f of directFields) {
      if (body[f] !== undefined) data[f] = body[f];
    }

    const intFields = ['sortOrder', 'blurAmount', 'soundVolume'];
    for (const f of intFields) {
      if (body[f] !== undefined) data[f] = body[f] === null ? null : parseInt(body[f]);
    }

    const floatFields = ['animationSpeed', 'opacity'];
    for (const f of floatFields) {
      if (body[f] !== undefined) data[f] = body[f] === null ? null : parseFloat(body[f]);
    }

    const dateFields = ['activeFrom', 'activeTo'];
    for (const f of dateFields) {
      if (body[f] !== undefined) data[f] = body[f] ? new Date(body[f]) : null;
    }

    // Cloud storage paths
    if (body.cloudStoragePath !== undefined) {
      data.cloudStoragePath = body.cloudStoragePath;
      data.backgroundUrl = body.backgroundUrl || await resolveUrl(body.cloudStoragePath);
    }
    if (body.thumbnailCloudPath !== undefined) {
      data.thumbnailCloudPath = body.thumbnailCloudPath;
      data.thumbnailUrl = body.thumbnailUrl || await resolveUrl(body.thumbnailCloudPath);
    }
    if (body.soundCloudPath !== undefined) {
      data.soundCloudPath = body.soundCloudPath;
      data.soundUrl = body.soundUrl || await resolveUrl(body.soundCloudPath);
    }

    // Direct URL updates
    if (body.backgroundUrl !== undefined && !body.cloudStoragePath) data.backgroundUrl = body.backgroundUrl;
    if (body.thumbnailUrl !== undefined && !body.thumbnailCloudPath) data.thumbnailUrl = body.thumbnailUrl;
    if (body.soundUrl !== undefined && !body.soundCloudPath) data.soundUrl = body.soundUrl;

    const theme = await prisma.roomTheme.update({ where: { id: body.id }, data });
    await invalidateCache('chat:room-backgrounds');

    return NextResponse.json(theme);
  } catch (error: any) {
    console.error('Admin background update error:', error);
    return NextResponse.json({ error: error.message || 'Arka plan güncellenemedi' }, { status: 500 });
  }
}
