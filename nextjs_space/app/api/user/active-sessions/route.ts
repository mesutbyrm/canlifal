import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get user's active sessions with live tellers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeSessions = await prisma.liveSession.findMany({
      where: {
        userId: session.user.id,
        status: 'active'
      },
      select: {
        id: true,
        fortuneType: true,
        status: true,
        maxMinutes: true,
        minutesUsed: true,
        createdAt: true,
        startedAt: true,
        roomId: true,
        teller: {
          select: {
            id: true,
            displayName: true,
            avatar: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    return NextResponse.json(activeSessions);
  } catch (error) {
    console.error('Get active sessions error:', error);
    return NextResponse.json({ error: 'Failed to get active sessions' }, { status: 500 });
  }
}
