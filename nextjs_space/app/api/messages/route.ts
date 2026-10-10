import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { isCursorMode, parseCursorParams, fetchCursorPage } from '@/lib/pagination'
import { apiPaginated } from '@/lib/api-response'
import { getPeerPresence } from '@/lib/peer-presence'

// GET conversations list or unread count
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  try {
    const userId = auth.id
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

    // Opt-in imleç sayfalama (yalnızca ?cursor= / ?paginate=cursor ile)
    if (isCursorMode(request)) {
      const { cursor, limit } = parseCursorParams(request, 30, 100)
      const { items, meta } = await fetchCursorPage(
        (args) => prisma.conversation.findMany(args),
        cursor,
        limit,
        {
          where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
          orderBy: { lastMessageAt: 'desc' },
          include: {
            user1: { select: { id: true, name: true, username: true, image: true } },
            user2: { select: { id: true, name: true, username: true, image: true } },
          },
        }
      )
      const unreadGroupsC = await prisma.directMessage.groupBy({
        by: ['senderId'],
        where: { receiverId: userId, isRead: false },
        _count: { _all: true },
      })
      const unreadMapC = new Map<string, number>(
        unreadGroupsC.map((g: { senderId: string; _count: { _all: number } }) => [g.senderId, g._count._all])
      )
      const presenceC = await getPeerPresence(
        items.map((conv: any) => (conv.user1Id === userId ? conv.user2Id : conv.user1Id))
      ).catch(() => new Map())
      return apiPaginated(
        items.map((conv: any) => {
          const other = conv.user1Id === userId ? conv.user2 : conv.user1
          const pres = presenceC.get(other.id)
          return {
            id: conv.id,
            user: other,
            lastMessage: conv.lastMessageText,
            lastMessageAt: conv.lastMessageAt,
            unreadCount: unreadMapC.get(other.id) ?? 0,
            isOnline: pres?.isOnline ?? false,
            lastSeenAt: pres?.lastSeenAt ?? null,
          }
        }),
        meta
      )
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

    // Get unread counts for ALL conversations in a single grouped query instead
    // of one COUNT per conversation (removes the N+1). Groups this user's unread
    // incoming messages by sender, then maps each conversation to its counterpart.
    const unreadGroups = await prisma.directMessage.groupBy({
      by: ['senderId'],
      where: {
        receiverId: userId,
        isRead: false,
      },
      _count: { _all: true },
    })
    const unreadBySender = new Map<string, number>(
      unreadGroups.map((g: { senderId: string; _count: { _all: number } }) => [g.senderId, g._count._all])
    )

    const presence = await getPeerPresence(
      conversations.map((c: { user1Id: string; user2Id: string }) => (c.user1Id === userId ? c.user2Id : c.user1Id))
    ).catch(() => new Map())

    const conversationsWithUnread = conversations.map((conv: { id: string; user1Id: string; user2Id: string; user1: { id: string; name: string | null; username: string | null; image: string | null }; user2: { id: string; name: string | null; username: string | null; image: string | null }; lastMessageText: string | null; lastMessageAt: Date | null }) => {
      const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1
      return {
        id: conv.id,
        user: otherUser,
        lastMessage: conv.lastMessageText,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: unreadBySender.get(otherUser.id) ?? 0,
        isOnline: presence.get(otherUser.id)?.isOnline ?? false,
        lastSeenAt: presence.get(otherUser.id)?.lastSeenAt ?? null,
      }
    })

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
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
