import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get single fortune teller
export async function GET(
  request: NextRequest,
  { params }: { params: { tellerId: string } }
) {
  try {
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { id: params.tellerId },
      include: {
        user: {
          select: { name: true, image: true }
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            session: {
              include: {
                user: { select: { name: true } }
              }
            }
          }
        }
      }
    });

    if (!teller) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(teller);
  } catch (error) {
    console.error('Fortune teller error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// Update fortune teller (own profile or admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { tellerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { id: params.tellerId }
    });

    if (!teller) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isAdmin = (session.user as { role?: string }).role === 'admin';
    const isOwner = teller.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Owner can update these
    if (body.displayName !== undefined) updateData.displayName = body.displayName;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.specialties !== undefined) updateData.specialties = body.specialties;
    if (body.pricePerSession !== undefined) updateData.pricePerSession = body.pricePerSession;
    if (body.isOnline !== undefined) updateData.isOnline = body.isOnline;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;

    // Only admin can update these
    if (isAdmin) {
      if (body.isVerified !== undefined) updateData.isVerified = body.isVerified;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
    }

    const updated = await prisma.liveFortuneTeller.update({
      where: { id: params.tellerId },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update teller error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
