import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get messages for a chat session
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chatSession = await prisma.tellerChatSession.findUnique({
      where: { id: params.sessionId },
      include: {
        liveSession: {
          include: {
            user: { select: { id: true, name: true, image: true } },
            teller: { select: { id: true, userId: true, displayName: true, avatar: true, isOnline: true } }
          }
        }
      }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user has access
    const isUser = chatSession.userId === session.user.id;
    const isTeller = chatSession.liveSession.teller.userId === session.user.id;

    if (!isUser && !isTeller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get messages
    const messages = await prisma.tellerChatMessage.findMany({
      where: { chatSessionId: params.sessionId },
      orderBy: { createdAt: 'asc' }
    });

    // Mark messages as read
    await prisma.tellerChatMessage.updateMany({
      where: {
        chatSessionId: params.sessionId,
        isRead: false,
        senderType: isUser ? 'teller' : 'user'
      },
      data: { isRead: true }
    });

    return NextResponse.json({
      chatSession,
      messages
    });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, messageType, imageUrl } = body;

    if (!content && !imageUrl) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }

    const chatSession = await prisma.tellerChatSession.findUnique({
      where: { id: params.sessionId },
      include: {
        liveSession: {
          include: {
            teller: { select: { userId: true } }
          }
        }
      }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user has access
    const isUser = chatSession.userId === session.user.id;
    const isTeller = chatSession.liveSession.teller.userId === session.user.id;

    if (!isUser && !isTeller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (chatSession.status === 'closed') {
      return NextResponse.json({ error: 'Chat session is closed' }, { status: 400 });
    }

    // Create message
    const message = await prisma.tellerChatMessage.create({
      data: {
        chatSessionId: params.sessionId,
        senderId: session.user.id,
        senderType: isUser ? 'user' : 'teller',
        content: content || '',
        messageType: messageType || 'text',
        imageUrl: imageUrl || null
      }
    });

    // Create notification for the other party
    const recipientId = isUser ? chatSession.liveSession.teller.userId : chatSession.userId;
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'chat_message',
        title: 'Yeni Mesaj',
        message: content ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : '📷 Resim gönderildi',
        data: JSON.stringify({ chatSessionId: params.sessionId })
      }
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
