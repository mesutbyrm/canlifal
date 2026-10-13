import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { authenticateRequest } from '@/lib/mobile-auth';
import prisma from '@/lib/db';
import { emitRoomEvent } from '@/lib/room-events';

export const dynamic = 'force-dynamic';

// Get room messages
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(request);
    const webSession = !mobileUser ? await getServerSession(authOptions) : null;
    const userId = mobileUser?.id || webSession?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const after = searchParams.get('after');

    const liveSession = await prisma.liveSession.findUnique({
      where: { id: params.sessionId },
      include: { teller: true }
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user is part of this session
    const isUser = liveSession.userId === userId;
    const isTeller = liveSession.teller.userId === userId;

    if (!isUser && !isTeller) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }

    // Get messages
    const messages = await prisma.liveSessionMessage.findMany({
      where: {
        sessionId: params.sessionId,
        ...(after ? { createdAt: { gt: new Date(after) } } : {})
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Mesajlar alınamadı' }, { status: 500 });
  }
}

// Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(request);
    const webSession = !mobileUser ? await getServerSession(authOptions) : null;
    const userId = mobileUser?.id || webSession?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const liveSession = await prisma.liveSession.findUnique({
      where: { id: params.sessionId },
      include: { teller: true }
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user is part of this session
    const isUser = liveSession.userId === userId;
    const isTeller = liveSession.teller.userId === userId;

    if (!isUser && !isTeller) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }

    if (liveSession.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }

    // Create message
    const newMessage = await prisma.liveSessionMessage.create({
      data: {
        sessionId: params.sessionId,
        senderId: userId,
        message: message.trim()
      }
    });

    // Emit SSE event for real-time delivery
    emitRoomEvent(params.sessionId, 'message', {
      id: newMessage.id,
      senderId: userId,
      message: newMessage.message,
      createdAt: newMessage.createdAt
    });

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Mesaj gönderilemedi' }, { status: 500 });
  }
}
