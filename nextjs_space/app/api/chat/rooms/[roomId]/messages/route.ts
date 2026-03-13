import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { canUserSpeak, getUserRole, getUserPermissions, isUserBanned, ROLE_SYMBOLS } from '@/lib/chat-permissions'

export const dynamic = 'force-dynamic'

// GET messages for a room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { roomId } = await params
    const { searchParams } = new URL(request.url)
    const after = searchParams.get('after') // For polling new messages
    const limit = parseInt(searchParams.get('limit') || '50')

    // Check if user is banned (if logged in)
    if (session?.user?.id) {
      const banned = await isUserBanned(roomId, session.user.id)
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

    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: after ? 'asc' : 'desc' },
      take: after ? 100 : limit
    })

    // Get user roles and nicknames for all message authors
    const userIds = [...new Set(messages.map((m: any) => m.userId))]
    const [userRoles, userPresences] = await Promise.all([
      prisma.chatUserRole.findMany({
        where: {
          roomId,
          userId: { in: userIds }
        }
      }),
      prisma.chatPresence.findMany({
        where: {
          roomId,
          userId: { in: userIds }
        },
        select: {
          userId: true,
          nickname: true
        }
      })
    ])

    const roleMap = new Map(userRoles.map((r: any) => [r.userId, r.role]))
    const nicknameMap = new Map(userPresences.map((p: any) => [p.userId, p.nickname]))

    // Add role symbol and nickname to messages
    const messagesWithRoles = messages.map((msg: any) => {
      const chatRole = roleMap.get(msg.userId) || (msg.user.role === 'admin' ? 'founder' : null)
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

    // Get room muted status and user permissions
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { isMuted: true }
    })

    // Get user permissions if logged in
    let myPermissions = null
    let myNickname = null
    if (session?.user?.id) {
      myPermissions = await getUserPermissions(roomId, session.user.id)
      const presence = await prisma.chatPresence.findUnique({
        where: { roomId_userId: { roomId, userId: session.user.id } },
        select: { nickname: true }
      })
      myNickname = presence?.nickname || session.user.name
    }

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

// POST a new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { roomId } = await params
    const { content, nickname } = await request.json()

    // Check if user can speak
    const speakCheck = await canUserSpeak(roomId, session.user.id)
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
    const userRole = await getUserRole(roomId, session.user.id)
    const roleSymbol = userRole !== 'none' ? ROLE_SYMBOLS[userRole] || '' : ''

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        userId: session.user.id,
        content: content.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })

    // Update presence
    await prisma.chatPresence.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId: session.user.id
        }
      },
      update: { lastSeen: new Date() },
      create: {
        roomId,
        userId: session.user.id
      }
    })

    return NextResponse.json({
      ...message,
      user: {
        ...message.user,
        chatRole: userRole !== 'none' ? userRole : null,
        roleSymbol
      }
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
