import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get the current user's fortune teller profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        displayName: true,
        bio: true,
        avatar: true,
        specialties: true,
        pricePerSession: true,
        rating: true,
        totalSessions: true,
        isOnline: true,
        isVerified: true,
        isActive: true,
        applicationStatus: true,
        totalEarnings: true,
        bonusCredits: true,
        isBanned: true,
        isFrozen: true,
        createdAt: true
      }
    });

    if (!teller) {
      return NextResponse.json({ error: 'Teller profile not found' }, { status: 404 });
    }

    return NextResponse.json(teller);
  } catch (error) {
    console.error('My profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
