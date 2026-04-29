import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { ROLE_SYMBOLS, ROLE_HIERARCHY, isUserBanned } from '@/lib/chat-permissions'
import { logActivity } from '@/lib/activity-logger'

export const dynamic = 'force-dynamic'

// Auto-clean disabled — messages are only deleted manually by admins

// GET active users in a room with their roles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const twoMinutesAgo = new Date(Date.now() - 120000)

    const presences = await prisma.chatPresence.findMany({
      where: {
        roomId,
        lastSeen: { gte: twoMinutesAgo }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            image: true
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
      // Global admin/moderator/site_manager gets superadmin role in chat
      const globalAdminRoles = ['admin', 'moderator', 'site_manager']
      const isGlobalAdmin = globalAdminRoles.includes(p.user.role)
      const chatRole = roleMap.get(p.user.id) || (isGlobalAdmin ? 'superadmin' : null)
      const roleSymbol = chatRole ? ROLE_SYMBOLS[chatRole as keyof typeof ROLE_SYMBOLS] || '' : ''
      const roleLevel = chatRole ? ROLE_HIERARCHY[chatRole as keyof typeof ROLE_HIERARCHY] : 0

      return {
        id: p.user.id,
        name: p.user.name,
        nickname: p.nickname || p.user.name,
        image: p.user.image || null,
        lastSeen: p.lastSeen,
        chatRole,
        roleSymbol,
        roleLevel,
        isAdmin: isGlobalAdmin
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

// Helper to check user's special role for entry announcement
async function getUserSpecialRole(roomId: string, userId: string): Promise<{ role: string | null; isSpecial: boolean; entryType: string | null }> {
  // Check if site admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true }
  })
  
  if (user?.role === 'admin') {
    return { role: 'admin', isSpecial: true, entryType: 'ADMIN' }
  }
  
  // Check if room owner
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { ownerId: true }
  })
  
  if (room?.ownerId === userId) {
    return { role: 'owner', isSpecial: true, entryType: 'OWNER' }
  }
  
  // Check chat role
  const chatRole = await prisma.chatUserRole.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true }
  })
  
  if (chatRole?.role === 'superadmin') {
    return { role: 'superadmin', isSpecial: true, entryType: 'SUPERADMIN' }
  }
  if (chatRole?.role === 'founder') {
    return { role: 'founder', isSpecial: true, entryType: 'FOUNDER' }
  }
  if (chatRole?.role === 'sop' || chatRole?.role === 'admin') {
    return { role: 'sop', isSpecial: true, entryType: 'MODERATOR' }
  }
  if (chatRole?.role === 'op') {
    return { role: 'op', isSpecial: true, entryType: 'OP' }
  }
  
  return { role: null, isSpecial: false, entryType: null }
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
        { error: 'Oturum açmanız gerekiyor' },
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

    // Check if this is a NEW join (not a heartbeat)
    const existingPresence = await prisma.chatPresence.findUnique({
      where: { roomId_userId: { roomId, userId: session.user.id } }
    })
    
    const thirtySecondsAgo = new Date(Date.now() - 30000)
    const isNewJoin = !existingPresence || existingPresence.lastSeen < thirtySecondsAgo
    
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
    
    // Log chat join activity (only on new joins)
    if (isNewJoin) {
      logActivity({
        userId: session.user.id,
        userName: nickname || session.user.name || 'Kullanıcı',
        userAvatar: (session.user as any)?.image || null,
        activityType: 'chat_join',
        detail: 'sohbete katıldı 💬',
        targetUrl: `/sohbet`,
      })
    }

    // If new join, create a system message (but only once per 5 minutes)
    if (isNewJoin) {
      // Check if we already announced this user's entry in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const recentJoinMessage = await prisma.chatMessage.findFirst({
        where: {
          roomId,
          userId: session.user.id,
          content: { startsWith: '[SYSTEM_' },
          createdAt: { gte: fiveMinutesAgo }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      // Only create join message if no recent announcement exists
      if (!recentJoinMessage) {
        const displayName = nickname || session.user.name || 'Kullanıcı'
        const specialRole = await getUserSpecialRole(roomId, session.user.id)
        
        // Create entry system message
        let systemContent = `[SYSTEM_JOIN]${displayName}`
        if (specialRole.isSpecial && specialRole.entryType) {
          systemContent = `[SYSTEM_VIP_JOIN:${specialRole.entryType}]${displayName}`
        }
        
        await prisma.chatMessage.create({
          data: {
            roomId,
            userId: session.user.id,
            content: systemContent
          }
        })
        
        // Messages are NOT auto-deleted - only deleted when room empties
      }
    }

    // Return updated active users
    const twoMinutesAgo = new Date(Date.now() - 120000)
    const presences = await prisma.chatPresence.findMany({
      where: {
        roomId,
        lastSeen: { gte: twoMinutesAgo }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            image: true
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
      const globalAdminRoles2 = ['admin', 'moderator', 'site_manager']
      const isGlobalAdmin2 = globalAdminRoles2.includes(p.user.role)
      const chatRole = roleMap.get(p.user.id) || (isGlobalAdmin2 ? 'superadmin' : null)
      const roleSymbol = chatRole ? ROLE_SYMBOLS[chatRole as keyof typeof ROLE_SYMBOLS] || '' : ''
      const roleLevel = chatRole ? ROLE_HIERARCHY[chatRole as keyof typeof ROLE_HIERARCHY] : 0

      return {
        id: p.user.id,
        name: p.user.name,
        nickname: p.nickname || p.user.name,
        image: p.user.image || null,
        lastSeen: p.lastSeen,
        chatRole,
        roleSymbol,
        roleLevel,
        isAdmin: isGlobalAdmin2
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
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    
    // Check if this is an intentional leave (via query param from sendBeacon)
    const isIntentionalLeave = request.nextUrl.searchParams.get('leave') === '1'

    // Get the user's nickname before removing presence
    const presence = await prisma.chatPresence.findUnique({
      where: { roomId_userId: { roomId, userId: session.user.id } },
      select: { nickname: true }
    })
    
    const displayName = presence?.nickname || session.user.name || 'Kullanıcı'

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
    
    // Only create exit message if this is an intentional leave (page close/navigate away)
    if (isIntentionalLeave) {
      await prisma.chatMessage.create({
        data: {
          roomId,
          userId: session.user.id,
          content: `[SYSTEM_LEAVE]${displayName}`
        }
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing presence:', error)
    return NextResponse.json({ error: 'Failed to remove presence' }, { status: 500 })
  }
}