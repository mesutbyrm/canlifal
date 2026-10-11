import { NextRequest, NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db';
import { invalidateCache } from '@/lib/cache';
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic';

// Get all credit packages
export async function GET() {
  try {
    const session = await getStaffSession();
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const packages = await prisma.creditPackage.findMany({
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json(packages);
  } catch (error) {
    console.error('Fetch packages error:', error);
    return NextResponse.json({ error: 'Paketler alınamadı' }, { status: 500 });
  }
}

// Create a new credit package
export async function POST(request: NextRequest) {
  try {
    const session = await getStaffSession();
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json();
    const { name, nameEn, credits, price, currency, bonusCredits, isFeatured, sortOrder } = body;

    if (!name || !credits || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newPackage = await prisma.creditPackage.create({
      data: {
        name,
        nameEn: nameEn || name,
        credits: parseInt(credits),
        price: parseFloat(price),
        currency: currency || 'TRY',
        bonusCredits: parseInt(bonusCredits) || 0,
        isFeatured: isFeatured || false,
        sortOrder: parseInt(sortOrder) || 0,
        isActive: true
      }
    });

    invalidateCache('payments:packages')
    return NextResponse.json(newPackage, { status: 201 });
  } catch (error) {
    console.error('Create package error:', error);
    return NextResponse.json({ error: 'Paket oluşturulamadı' }, { status: 500 });
  }
}
