import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { ROLE_SYMBOLS, ROLE_HIERARCHY, isUserBanned } from '@/lib/chat-permissions'

export const dynamic = 'force-dynamic'

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
    const userIds = presences.map(p => p.userId)
    const chatRoles = await prisma.chatUserRole.findMany({
      where: {
        roomId,
        userId: { in: userIds }
      }
    })

    const roleMap = new Map(chatRoles.map(r => [r.userId, r.role]))

    // Get room muted status
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { isMuted: true }
    })

    const activeUsers = presences.map(p => {
      // Site admin gets founder role in chat
      const chatRole = roleMap.get(p.user.id) || (p.user.role === 'admin' ? 'founder' : null)
      const roleSymbol = chatRole ? ROLE_SYMBOLS[chatRole] || '' : ''
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
    activeUsers.sort((a, b) => {
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

// POST to update user presence (heartbeat)
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

    // Update presence with nickname
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
    const userIds = presences.map(p => p.userId)
    const chatRoles = await prisma.chatUserRole.findMany({
      where: {
        roomId,
        userId: { in: userIds }
      }
    })

    const roleMap = new Map(chatRoles.map(r => [r.userId, r.role]))

    // Get room muted status
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { isMuted: true }
    })

    const activeUsers = presences.map(p => {
      const chatRole = roleMap.get(p.user.id) || (p.user.role === 'admin' ? 'founder' : null)
      const roleSymbol = chatRole ? ROLE_SYMBOLS[chatRole] || '' : ''
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
    activeUsers.sort((a, b) => {
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
