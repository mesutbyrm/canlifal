import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

// Send a WebRTC signal
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
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

    const isUser = liveSession.userId === authUser.id;
    const isTeller = liveSession.teller.userId === authUser.id;

    if (!isUser && !isTeller) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }

    // Create the signal
    const signal = await prisma.roomSignal.create({
      data: {
        sessionId,
        senderId: authUser.id,
        receiverId,
        signalType,
        signalData: JSON.stringify(signalData)
      }
    });

    return NextResponse.json(signal);
  } catch (error) {
    console.error('Signal send error:', error);
    return NextResponse.json({ error: 'Sinyal gönderilemedi' }, { status: 500 });
  }
}

// Delete old signals for reconnection
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Delete all signals for this session (both sent and received by this user)
    await prisma.roomSignal.deleteMany({
      where: {
        sessionId,
        OR: [
          { senderId: authUser.id },
          { receiverId: authUser.id }
        ]
      }
    });

    return NextResponse.json({ cleared: true });
  } catch (error) {
    console.error('Clear signals error:', error);
    return NextResponse.json({ error: 'Sinyaller temizlenemedi' }, { status: 500 });
  }
}

// Get pending signals for current user
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
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
        receiverId: authUser.id,
        processed: false
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark them as processed
    if (signals.length > 0) {
      await prisma.roomSignal.updateMany({
        where: {
          id: { in: signals.map((s: { id: string }) => s.id) }
        },
        data: { processed: true }
      });
    }

    // Parse signal data
    const parsedSignals = signals.map((s: { id: string; signalData: string; signalType: string; senderId: string; receiverId: string }) => ({
      ...s,
      signalData: JSON.parse(s.signalData)
    }));

    return NextResponse.json(parsedSignals);
  } catch (error) {
    console.error('Get signals error:', error);
    return NextResponse.json({ error: 'Sinyaller alınamadı' }, { status: 500 });
  }
}
