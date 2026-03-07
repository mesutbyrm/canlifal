import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Request a session with a fortune teller
export async function POST(
  request: NextRequest,
  { params }: { params: { tellerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fortuneType } = body;

    // Get teller
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { id: params.tellerId }
    });

    if (!teller || !teller.isActive || !teller.isVerified) {
      return NextResponse.json({ error: 'Teller not available' }, { status: 400 });
    }

    // Check user credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true }
    });

    if (!user || user.credits < teller.pricePerSession) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 });
    }

    // Create session and deduct credits
    const [liveSession] = await prisma.$transaction([
      prisma.liveSession.create({
        data: {
          tellerId: teller.id,
          userId: session.user.id,
          fortuneType: fortuneType || 'general',
          creditsCharged: teller.pricePerSession,
          status: 'pending'
        }
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { credits: { decrement: teller.pricePerSession } }
      })
    ]);

    return NextResponse.json(liveSession, { status: 201 });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// Get sessions for this teller (for teller's dashboard)
export async function GET(
  request: NextRequest,
  { params }: { params: { tellerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { id: params.tellerId }
    });

    if (!teller || teller.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sessions = await prisma.liveSession.findMany({
      where: { tellerId: params.tellerId },
      include: {
        user: { select: { name: true, image: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json([]);
  }
}
