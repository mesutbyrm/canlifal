import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - List all live tellers with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, rejected, all
    const banned = searchParams.get('banned'); // true, false
    const frozen = searchParams.get('frozen'); // true, false

    const where: Record<string, unknown> = {};
    
    if (status && status !== 'all') {
      where.applicationStatus = status;
    }
    if (banned === 'true') {
      where.isBanned = true;
    } else if (banned === 'false') {
      where.isBanned = false;
    }
    if (frozen === 'true') {
      where.isFrozen = true;
    } else if (frozen === 'false') {
      where.isFrozen = false;
    }

    const tellers = await prisma.liveFortuneTeller.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
        warnings: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            sessions: true,
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tellers });
  } catch (error) {
    console.error('Error fetching live tellers:', error);
    return NextResponse.json({ error: 'Falcılar alınamadı' }, { status: 500 });
  }
}

// POST - Create a new live teller (admin adding)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { userId, displayName, bio, specialties, pricePerSession, isVerified } = await request.json();

    if (!userId || !displayName) {
      return NextResponse.json({ error: 'User ID and display name required' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Check if already a teller
    const existing = await prisma.liveFortuneTeller.findUnique({ where: { userId } });
    if (existing) {
      return NextResponse.json({ error: 'User is already a fortune teller' }, { status: 400 });
    }

    const teller = await prisma.liveFortuneTeller.create({
      data: {
        userId,
        displayName,
        bio: bio || '',
        specialties: specialties || [],
        pricePerSession: pricePerSession || 100,
        isVerified: isVerified || false,
        applicationStatus: 'approved',
        approvedAt: new Date(),
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return NextResponse.json({ teller });
  } catch (error) {
    console.error('Error creating live teller:', error);
    return NextResponse.json({ error: 'Falcı oluşturulamadı' }, { status: 500 });
  }
}
