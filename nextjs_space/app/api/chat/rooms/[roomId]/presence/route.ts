import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { ROLE_SYMBOLS, ROLE_HIERARCHY, isUserBanned } from '@/lib/chat-permissions'

export const dynamic = 'force-dynamic'

// Auto-clean messages when room becomes empty (keep last 50)
async function cleanEmptyRoom(roomId: string) {
  try {
    // Check if any user is active in the room (lastSeen within last 30 seconds)
    const threshold = new Date(Date.now() - 30000)
    const activeCount = await prisma.chatPresence.count({
      where: {
        roomId,
        lastSeen: { gt: threshold }
      }
    })

    if (activeCount === 0) {
      // Room is empty - delete all messages except the last 50
      const messages = await prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true }
      })

      const keepIds = messages.map((m: { id: string }) => m.id)

      if (keepIds.length > 0) {
        await prisma.chatMessage.deleteMany({
          where: {
            roomId,
            id: { notIn: keepIds }
          }
        })
      } else {
        // No messages to keep, delete all
        await prisma.chatMessage.deleteMany({
          where: { roomId }
        })
      }
    }
  } catch (error) {
    console.error('Error cleaning empty room:', error)
  }
}

// GET active users in a room with their roles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const oneMinuteAgo = new Date(Date.now() - 60000)

    const presences = await prisma.chatPresence.findMany({
      where: {
        roomId,
        lastSeen: { gte: oneMinuteAgo }
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

    // Get chat roles for all active users
    const userIds = presences.map((p: any) => p.userId)
    const chatRoles = await prisma.chatUserRole.findMany({
      where: {
        roomId,
        userId: { in: userIds }
      }
    })

    const roleMap = new Map(chatRoles.map((r: any) => [r.userId, r.role]))

    // Get room muted status
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { isMuted: true }
    })

    const activeUsers = presences.map((p: any) => {
      // Site admin gets founder role in chat
      const chatRole = roleMap.get(p.user.id) || (p.user.role === 'admin' ? 'founder' : null)
      const roleSymbol = chatRole ? ROLE_SYMBOLS[chatRole as keyof typeof ROLE_SYMBOLS] || '' : ''
      const roleLevel = chatRole ? ROLE_HIERARCHY[chatRole as keyof typeof ROLE_HIERARCHY] : 0

      return {
        id: p.user.id,
        name: p.user.name,
        nickname: p.nickname || p.user.name,
        lastSeen: p.lastSeen,
        chatRole,
        roleSymbol,
        roleLevel,
        isAdmin: p.user.role === 'admin'
      }
    })

    // Sort by role level (highest first), then alphabetically
    activeUsers.sort((a: any, b: any) => {
      if (b.roleLevel !== a.roleLevel) return b.roleLevel - a.roleLevel
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      users: activeUsers,
      roomMuted: room?.isMuted || false
    })
  } catch (error) {
    console.error('Error fetching presence:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active users' },
      { status: 500 }
    )
  }
}

// POST to update user presence (heartbeat) or remove presence (with ?_delete=1 via sendBeacon)
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
    
    // Handle sendBeacon delete (page unload)
    const isDelete = request.nextUrl.searchParams.get('_delete') === '1'
    if (isDelete) {
      try {
        await prisma.chatPresence.update({
          where: { roomId_userId: { roomId, userId: session.user.id } },
          data: { lastSeen: new Date(0) }
        })
      } catch { /* ignore */ }
      // Check if room is empty and auto-clean
      cleanEmptyRoom(roomId).catch(() => {})
      return NextResponse.json({ success: true })
    }

    // Parse body for nickname
    let nickname: string | undefined
    try {
      const body = await request.json()
      nickname = body.nickname
    } catch {
      // Body might be empty for GET-like requests
    }

    // Check if user is banned
    const banned = await isUserBanned(roomId, session.user.id)
    if (banned) {
      return NextResponse.json({ error: 'You are banned from this room' }, { status: 403 })
    }

    // Update presence with nickname (handle race condition with retry)
    try {
      await prisma.chatPresence.upsert({
        where: {
          roomId_userId: {
            roomId,
            userId: session.user.id
          }
        },
        update: { 
          lastSeen: new Date(),
          nickname: nickname || undefined
        },
        create: {
          roomId,
          userId: session.user.id,
          nickname: nickname || undefined
        }
      })
    } catch (upsertError: unknown) {
      // Handle unique constraint error (race condition) by trying update only
      if ((upsertError as { code?: string })?.code === 'P2002') {
        await prisma.chatPresence.update({
          where: {
            roomId_userId: {
              roomId,
              userId: session.user.id
            }
          },
          data: { 
            lastSeen: new Date(),
            nickname: nickname || undefined
          }
        })
      } else {
        throw upsertError
      }
    }

    // Return updated active users
    const oneMinuteAgo = new Date(Date.now() - 60000)
    const presences = await prisma.chatPresence.findMany({
      where: {
        roomId,
        lastSeen: { gte: oneMinuteAgo }
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

    // Get chat roles for all active users
    const userIds = presences.map((p: any) => p.userId)
    const chatRoles = await prisma.chatUserRole.findMany({
      where: {
        roomId,
        userId: { in: userIds }
      }
    })

    const roleMap = new Map(chatRoles.map((r: any) => [r.userId, r.role]))

    // Get room muted status
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { isMuted: true }
    })

    const activeUsers = presences.map((p: any) => {
      const chatRole = roleMap.get(p.user.id) || (p.user.role === 'admin' ? 'founder' : null)
      const roleSymbol = chatRole ? ROLE_SYMBOLS[chatRole as keyof typeof ROLE_SYMBOLS] || '' : ''
      const roleLevel = chatRole ? ROLE_HIERARCHY[chatRole as keyof typeof ROLE_HIERARCHY] : 0

      return {
        id: p.user.id,
        name: p.user.name,
        nickname: p.nickname || p.user.name,
        lastSeen: p.lastSeen,
        chatRole,
        roleSymbol,
        roleLevel,
        isAdmin: p.user.role === 'admin'
      }
    })

    // Sort by role level (highest first), then alphabetically by nickname
    activeUsers.sort((a: any, b: any) => {
      if (b.roleLevel !== a.roleLevel) return b.roleLevel - a.roleLevel
      return (a.nickname || a.name).localeCompare(b.nickname || b.name)
    })

    return NextResponse.json({
      users: activeUsers,
      roomMuted: room?.isMuted || false
    })
  } catch (error) {
    console.error('Error updating presence:', error)
    return NextResponse.json(
      { error: 'Failed to update presence' },
      { status: 500 }
    )
  }
}


// DELETE to remove user presence (when leaving room)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = await params

    // Set lastSeen to past so user disappears from active list immediately
    try {
      await prisma.chatPresence.update({
        where: {
          roomId_userId: {
            roomId,
            userId: session.user.id
          }
        },
        data: {
          lastSeen: new Date(0) // epoch - effectively removes from active list
        }
      })
    } catch {
      // Presence record might not exist
    }

    // Check if room is empty and auto-clean
    cleanEmptyRoom(roomId).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing presence:', error)
    return NextResponse.json({ error: 'Failed to remove presence' }, { status: 500 })
  }
}