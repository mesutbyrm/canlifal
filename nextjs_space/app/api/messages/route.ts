import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

// GET conversations list or unread count
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    
    // If only unread count is requested
    if (searchParams.get('unreadCount') === 'true') {
      const unreadCount = await prisma.directMessage.count({
        where: {
          receiverId: userId,
          isRead: false
        }
      })
      
      // Also count pending message requests
      const requestCount = await prisma.messageRequest.count({
        where: {
          receiverId: userId,
          status: 'pending'
        }
      })
      
      return NextResponse.json({ unreadCount: unreadCount + requestCount })
    }

    // Get all conversations where user is participant
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        user1: {
          select: { id: true, name: true, username: true, image: true }
        },
        user2: {
          select: { id: true, name: true, username: true, image: true }
        }
      }
    })

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv: { id: string; user1Id: string; user2Id: string; user1: { id: string; name: string | null; username: string | null; image: string | null }; user2: { id: string; name: string | null; username: string | null; image: string | null }; lastMessageText: string | null; lastMessageAt: Date | null }) => {
        const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1
        const unreadCount = await prisma.directMessage.count({
          where: {
            senderId: otherUser.id,
            receiverId: userId,
            isRead: false
          }
        })

        return {
          id: conv.id,
          user: otherUser,
          lastMessage: conv.lastMessageText,
          lastMessageAt: conv.lastMessageAt,
          unreadCount
        }
      })
    )

    // Get pending message requests
    const messageRequests = await prisma.messageRequest.findMany({
      where: {
        receiverId: userId,
        status: 'pending'
      },
      include: {
        sender: {
          select: { id: true, name: true, username: true, image: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      conversations: conversationsWithUnread,
      requests: messageRequests
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
