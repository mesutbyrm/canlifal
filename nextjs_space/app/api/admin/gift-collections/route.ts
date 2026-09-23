import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic';

// GET all collections
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.gift.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const collections = await prisma.giftCollection.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { gifts: true } } },
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error('Gift collections GET error:', error);
    return NextResponse.json({ error: 'Koleksiyonlar yüklenemedi' }, { status: 500 });
  }
}

// POST create collection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.gift.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const body = await request.json();
    const slug = (body.slug || body.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const collection = await prisma.giftCollection.create({
      data: {
        name: body.name,
        nameEn: body.nameEn || body.name,
        slug,
        description: body.description,
        iconEmoji: body.iconEmoji,
        iconUrl: body.iconUrl,
        iconCloudPath: body.iconCloudPath,
        sortOrder: parseInt(body.sortOrder) || 0,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error: any) {
    console.error('Gift collection create error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Koleksiyon oluşturulamadı' }, { status: 500 });
  }
}

// PATCH update collection
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.gift.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id zorunlu' }, { status: 400 });
    }

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.nameEn !== undefined) data.nameEn = body.nameEn;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.description !== undefined) data.description = body.description;
    if (body.iconEmoji !== undefined) data.iconEmoji = body.iconEmoji;
    if (body.iconUrl !== undefined) data.iconUrl = body.iconUrl;
    if (body.iconCloudPath !== undefined) data.iconCloudPath = body.iconCloudPath;
    if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder);
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const collection = await prisma.giftCollection.update({
      where: { id: body.id },
      data,
    });

    return NextResponse.json(collection);
  } catch (error: any) {
    console.error('Gift collection update error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Koleksiyon güncellenemedi' }, { status: 500 });
  }
}
