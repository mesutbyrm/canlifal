import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { canUserSpeak, getUserRole, getUserPermissions, isUserBanned, ROLE_SYMBOLS } from '@/lib/chat-permissions'

export const dynamic = 'force-dynamic'

// GET messages for a room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    // Dual auth: web session OR mobile JWT
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const currentUserId = mobileUser?.id || session?.user?.id
    const currentUserName = mobileUser?.name || session?.user?.name
    
    const { roomId } = await params
    const { searchParams } = new URL(request.url)
    const after = searchParams.get('after') // For polling new messages
    const limit = parseInt(searchParams.get('limit') || '100')

    // Check if user is banned (if logged in)
    if (currentUserId) {
      const banned = await isUserBanned(roomId, currentUserId)
      if (banned) {
        return NextResponse.json({ error: 'You are banned from this room' }, { status: 403 })
      }
    }

    const whereClause: {
      roomId: string
      createdAt?: { gt: Date }
    } = { roomId }

    if (after) {
      whereClause.createdAt = { gt: new Date(after) }
    }

    // Run messages query + room status in parallel
    const [messages, room] = await Promise.all([
      prisma.chatMessage.findMany({
        where: whereClause,
        select: {
          id: true,
          roomId: true,
          userId: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              membership: true,
            }
          }
        },
        orderBy: { createdAt: after ? 'asc' : 'desc' },
        take: after ? 100 : limit
      }),
      prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { isMuted: true }
      })
    ])

    // Get user roles, nicknames and permissions in parallel
    const userIds = [...new Set(messages.map((m: any) => m.userId))]
    const parallelQueries: [Promise<any>, Promise<any>, Promise<any> | null, Promise<any> | null] = [
      prisma.chatUserRole.findMany({
        where: { roomId, userId: { in: userIds } },
        select: { userId: true, role: true }
      }),
      prisma.chatPresence.findMany({
        where: { roomId, userId: { in: userIds } },
        select: { userId: true, nickname: true }
      }),
      currentUserId ? getUserPermissions(roomId, currentUserId) : null,
      currentUserId ? prisma.chatPresence.findUnique({
        where: { roomId_userId: { roomId, userId: currentUserId } },
        select: { nickname: true }
      }) : null
    ]
    const [userRoles, userPresences, myPermissions, myPresence] = await Promise.all(
      parallelQueries.map(p => p || Promise.resolve(null))
    )
    const myNickname = myPresence?.nickname || currentUserName

    const roleMap = new Map(userRoles.map((r: any) => [r.userId, r.role]))
    const nicknameMap = new Map(userPresences.map((p: any) => [p.userId, p.nickname]))

    // Add role symbol and nickname to messages
    const messagesWithRoles = messages.map((msg: any) => {
      const globalAdminRoles = ['admin', 'moderator', 'site_manager']
      const chatRole = roleMap.get(msg.userId) || (globalAdminRoles.includes(msg.user.role) ? 'superadmin' : null)
      const roleSymbol = chatRole ? ROLE_SYMBOLS[chatRole as keyof typeof ROLE_SYMBOLS] || '' : ''
      const nickname = nicknameMap.get(msg.userId) || msg.user.name
      return {
        ...msg,
        user: {
          ...msg.user,
          nickname,
          chatRole,
          roleSymbol
        }
      }
    })

    // If not polling (initial load), reverse to show oldest first
    const orderedMessages = after ? messagesWithRoles : messagesWithRoles.reverse()

    return NextResponse.json({
      messages: orderedMessages,
      roomMuted: room?.isMuted || false,
      myPermissions,
      myNickname
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// DELETE messages (clear all or single message - moderator+)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const mobileUserDel = await authenticateRequest(request)
    const sessionDel = !mobileUserDel ? await getServerSession(authOptions) : null
    const delUserId = mobileUserDel?.id || sessionDel?.user?.id
    if (!delUserId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const { roomId } = await params
    const permissions = await getUserPermissions(roomId, delUserId)
    const canMod = permissions.isRoomOwner || permissions.isGlobalAdmin || 
      (permissions.role && ['superadmin', 'founder', 'sop', 'admin', 'op'].includes(permissions.role))
    if (!canMod) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }
    
    // Check if single message delete
    const messageId = request.nextUrl.searchParams.get('messageId')
    if (messageId) {
      // Delete single message
      const msg = await prisma.chatMessage.findFirst({ where: { id: messageId, roomId } })
      if (!msg) {
        return NextResponse.json({ error: 'Mesaj bulunamadı' }, { status: 404 })
      }
      await prisma.chatMessage.delete({ where: { id: messageId } })
      return NextResponse.json({ success: true, deletedUserId: msg.userId })
    }
    
    await prisma.chatMessage.deleteMany({ where: { roomId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing messages:', error)
    return NextResponse.json({ error: 'Mesajlar silinemedi' }, { status: 500 })
  }
}

// POST a new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const mobileUserPost = await authenticateRequest(request)
    const sessionPost = !mobileUserPost ? await getServerSession(authOptions) : null
    const postUserId = mobileUserPost?.id || sessionPost?.user?.id
    
    if (!postUserId) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      )
    }

    const { roomId } = await params
    const { content, nickname } = await request.json()

    // Check if user can speak
    const speakCheck = await canUserSpeak(roomId, postUserId)
    if (!speakCheck.canSpeak) {
      const errorMessages: Record<string, string> = {
        banned: 'You are banned from this room',
        muted: 'You are muted in this room',
        room_muted: 'Room is muted. Only users with voice (+) or higher can speak.'
      }
      return NextResponse.json(
        { error: errorMessages[speakCheck.reason || ''] || 'Cannot speak' },
        { status: 403 }
      )
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Message too long (max 500 characters)' },
        { status: 400 }
      )
    }

    // Verify room exists
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Get user's role for the response
    const userRole = await getUserRole(roomId, postUserId)
    const roleSymbol = userRole !== 'none' ? ROLE_SYMBOLS[userRole] || '' : ''

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        userId: postUserId,
        content: content.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            membership: true,
          }
        }
      }
    })

    // Update presence
    await prisma.chatPresence.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId: postUserId
        }
      },
      update: { lastSeen: new Date() },
      create: {
        roomId,
        userId: postUserId
      }
    })
    
    // Messages are NOT auto-deleted - only deleted when room empties

    const responsePayload = {
      ...message,
      user: {
        ...message.user,
        chatRole: userRole !== 'none' ? userRole : null,
        roleSymbol
      }
    }

    // Emit to in-memory event bus for SSE consumers
    try {
      const { emitChatEvent } = await import('@/lib/chat-events')
      emitChatEvent(roomId, 'message', responsePayload)
    } catch {}

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Mesaj gönderilemedi' },
      { status: 500 }
    )
  }
}