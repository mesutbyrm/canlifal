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
        },
        sessions: {
          where: { status: { in: ['active', 'pending'] } },
          select: { id: true, status: true, userId: true },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: [
        { isOnline: 'desc' },
        { rating: 'desc' },
        { totalSessions: 'desc' }
      ]
    });

    // Check for active video streams for each teller
    const tellerUserIds = tellers.map((t: { userId: string }) => t.userId);
    const activeStreams = await prisma.videoStream.findMany({
      where: {
        userId: { in: tellerUserIds },
        status: 'live'
      },
      select: { userId: true, id: true }
    });
    const streamingUserIds = new Set(activeStreams.map((s: { userId: string }) => s.userId));

    // Get current user for queue position
    const userSession = await getServerSession(authOptions);
    const currentUserId = userSession?.user?.id;

    const enrichedTellers = tellers.map((teller: typeof tellers[number]) => {
      const isStreaming = streamingUserIds.has(teller.userId);
      const activeSessions = teller.sessions.filter((s: { status: string }) => s.status === 'active');
      const pendingSessions = teller.sessions.filter((s: { status: string }) => s.status === 'pending');
      const isInSession = activeSessions.length > 0;

      // Calculate queue position for current user
      let queuePosition = 0;
      if (currentUserId && pendingSessions.length > 0) {
        const userIndex = pendingSessions.findIndex((s: { userId: string }) => s.userId === currentUserId);
        if (userIndex >= 0) queuePosition = userIndex + 1;
      }

      // Remove sessions from response to keep payload small
      const { sessions, ...tellerData } = teller;
      return {
        ...tellerData,
        isStreaming,
        isInSession,
        pendingCount: pendingSessions.length,
        queuePosition
      };
    });

    return NextResponse.json({ tellers: enrichedTellers });
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
