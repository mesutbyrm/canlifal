import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get user's chat sessions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // 'user' or 'teller'

    let chatSessions;

    if (role === 'teller') {
      // Get teller's chat sessions
      const teller = await prisma.liveFortuneTeller.findUnique({
        where: { userId: session.user.id }
      });

      if (!teller) {
        return NextResponse.json({ error: 'Not a teller' }, { status: 403 });
      }

      chatSessions = await prisma.tellerChatSession.findMany({
        where: { tellerId: teller.id },
        include: {
          liveSession: {
            include: {
              user: { select: { id: true, name: true, image: true } }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Get user's chat sessions
      chatSessions = await prisma.tellerChatSession.findMany({
        where: { userId: session.user.id },
        include: {
          liveSession: {
            include: {
              teller: {
                select: { id: true, displayName: true, avatar: true, isOnline: true }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Add unread count
    const sessionsWithUnread = await Promise.all(
      chatSessions.map(async (cs) => {
        const unreadCount = await prisma.tellerChatMessage.count({
          where: {
            chatSessionId: cs.id,
            isRead: false,
            senderType: role === 'teller' ? 'user' : 'teller'
          }
        });
        return { ...cs, unreadCount };
      })
    );

    return NextResponse.json(sessionsWithUnread);
  } catch (error) {
    console.error('Fetch chat sessions error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
