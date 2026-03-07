import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get all active fortune tellers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const onlineOnly = searchParams.get('online') === 'true';

    const where: Record<string, unknown> = {
      isActive: true,
      applicationStatus: 'approved',
      isBanned: false,
    };

    if (onlineOnly) {
      where.isOnline = true;
    }

    if (specialty) {
      where.specialties = { has: specialty };
    }

    const tellers = await prisma.liveFortuneTeller.findMany({
      where,
      include: {
        user: {
          select: { name: true, image: true }
        }
      },
      orderBy: [
        { isOnline: 'desc' },
        { rating: 'desc' },
        { totalSessions: 'desc' }
      ]
    });

    return NextResponse.json({ tellers });
  } catch (error) {
    console.error('Fortune tellers error:', error);
    return NextResponse.json({ tellers: [] });
  }
}

// Apply to become a fortune teller
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, bio, specialties, pricePerSession } = body;

    // Check if already has a profile
    const existing = await prisma.liveFortuneTeller.findUnique({
      where: { userId: session.user.id }
    });

    if (existing) {
      return NextResponse.json({ error: 'Already have a profile' }, { status: 400 });
    }

    const teller = await prisma.liveFortuneTeller.create({
      data: {
        userId: session.user.id,
        displayName: displayName || session.user.name || 'Fortune Teller',
        bio: bio || null,
        specialties: specialties || [],
        pricePerSession: pricePerSession || 100,
        isVerified: false, // Admin needs to verify
        isActive: true,
        isOnline: false
      }
    });

    return NextResponse.json(teller, { status: 201 });
  } catch (error) {
    console.error('Create teller error:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}
