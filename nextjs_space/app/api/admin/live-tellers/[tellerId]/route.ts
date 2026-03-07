import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Get single teller details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tellerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tellerId } = await params;

    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { id: tellerId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            credits: true,
            createdAt: true,
          },
        },
        warnings: {
          orderBy: { createdAt: 'desc' },
        },
        sessions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!teller) {
      return NextResponse.json({ error: 'Teller not found' }, { status: 404 });
    }

    return NextResponse.json({ teller });
  } catch (error) {
    console.error('Error fetching teller:', error);
    return NextResponse.json({ error: 'Failed to fetch teller' }, { status: 500 });
  }
}

// PUT - Update teller details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tellerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tellerId } = await params;
    const body = await request.json();

    const teller = await prisma.liveFortuneTeller.update({
      where: { id: tellerId },
      data: {
        displayName: body.displayName,
        bio: body.bio,
        specialties: body.specialties,
        pricePerSession: body.pricePerSession,
        isVerified: body.isVerified,
        isActive: body.isActive,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ teller });
  } catch (error) {
    console.error('Error updating teller:', error);
    return NextResponse.json({ error: 'Failed to update teller' }, { status: 500 });
  }
}

// DELETE - Remove teller
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tellerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tellerId } = await params;

    await prisma.liveFortuneTeller.delete({
      where: { id: tellerId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting teller:', error);
    return NextResponse.json({ error: 'Failed to delete teller' }, { status: 500 });
  }
}
