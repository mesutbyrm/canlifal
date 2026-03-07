import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Send a WebRTC signal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, receiverId, signalType, signalData } = await request.json();

    if (!sessionId || !receiverId || !signalType || !signalData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is part of this session
    const liveSession = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: { teller: true }
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const isUser = liveSession.userId === session.user.id;
    const isTeller = liveSession.teller.userId === session.user.id;

    if (!isUser && !isTeller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create the signal
    const signal = await prisma.roomSignal.create({
      data: {
        sessionId,
        senderId: session.user.id,
        receiverId,
        signalType,
        signalData: JSON.stringify(signalData)
      }
    });

    return NextResponse.json(signal);
  } catch (error) {
    console.error('Signal send error:', error);
    return NextResponse.json({ error: 'Failed to send signal' }, { status: 500 });
  }
}

// Get pending signals for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get unprocessed signals for this user
    const signals = await prisma.roomSignal.findMany({
      where: {
        sessionId,
        receiverId: session.user.id,
        processed: false
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark them as processed
    if (signals.length > 0) {
      await prisma.roomSignal.updateMany({
        where: {
          id: { in: signals.map(s => s.id) }
        },
        data: { processed: true }
      });
    }

    // Parse signal data
    const parsedSignals = signals.map(s => ({
      ...s,
      signalData: JSON.parse(s.signalData)
    }));

    return NextResponse.json(parsedSignals);
  } catch (error) {
    console.error('Get signals error:', error);
    return NextResponse.json({ error: 'Failed to get signals' }, { status: 500 });
  }
}
