import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get sessions for the current teller (used by teller-incoming-request component)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the teller profile for the current user
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { userId: session.user.id }
    });

    if (!teller) {
      return NextResponse.json({ sessions: [] });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build filter
    const where: any = { tellerId: teller.id };
    if (status) {
      where.status = status;
    }

    const sessions = await prisma.liveSession.findMany({
      where,
      include: {
        user: { 
          select: { 
            id: true,
            name: true, 
            image: true,
            email: true
          } 
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Get teller sessions error:', error);
    return NextResponse.json({ sessions: [], error: 'Failed to fetch sessions' });
  }
}
