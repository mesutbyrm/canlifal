import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { getUserPermissions, ROLE_HIERARCHY, ChatRole } from '@/lib/chat-permissions'

export const dynamic = 'force-dynamic'

// POST - Perform moderation action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = await params
    const { action, targetUserId, role, reason, duration } = await request.json()

    const permissions = await getUserPermissions(roomId, session.user.id)
    const actorRoleLevel = ROLE_HIERARCHY[permissions.role]

    // Get target user's role for hierarchy check (only if targetUserId is provided)
    let targetRoleLevel = 0
    if (targetUserId) {
      const targetRole = await prisma.chatUserRole.findUnique({
        where: { roomId_userId: { roomId, userId: targetUserId } }
      })
      targetRoleLevel = ROLE_HIERARCHY[(targetRole?.role as ChatRole) || 'none']

      // Cannot act on users with same or higher role (except global admin)
      if (targetRoleLevel >= actorRoleLevel && !permissions.isGlobalAdmin) {
        return NextResponse.json({ error: 'Cannot moderate users with same or higher role' }, { status: 403 })
      }
    }

    switch (action) {
      case 'mute_user': {
        if (!permissions.canMuteUsers) {
          return NextResponse.json({ error: 'No permission to mute users' }, { status: 403 })
        }

        const expiresAt = duration ? new Date(Date.now() + duration * 60000) : null

        await prisma.chatMute.upsert({
          where: { roomId_userId: { roomId, userId: targetUserId } },
          update: { mutedBy: session.user.id, reason, expiresAt },
          create: {
            roomId,
            userId: targetUserId,
            mutedBy: session.user.id,
            reason,
            expiresAt
          }
        })

        return NextResponse.json({ success: true, message: 'User muted' })
      }

      case 'unmute_user': {
        if (!permissions.canMuteUsers) {
          return NextResponse.json({ error: 'No permission to unmute users' }, { status: 403 })
        }

        await prisma.chatMute.deleteMany({
          where: { roomId, userId: targetUserId }
        })

        return NextResponse.json({ success: true, message: 'User unmuted' })
      }

      case 'kick_user': {
        if (!permissions.canKickUsers) {
          return NextResponse.json({ error: 'No permission to kick users' }, { status: 403 })
        }

        // Remove user presence
        await prisma.chatPresence.deleteMany({
          where: { roomId, userId: targetUserId }
        })

        return NextResponse.json({ success: true, message: 'User kicked' })
      }

      case 'ban_user': {
        if (!permissions.canBanUsers) {
          return NextResponse.json({ error: 'No permission to ban users' }, { status: 403 })
        }

        const banExpiresAt = duration ? new Date(Date.now() + duration * 60000) : null

        await prisma.chatBan.upsert({
          where: { roomId_userId: { roomId, userId: targetUserId } },
          update: { bannedBy: session.user.id, reason, expiresAt: banExpiresAt },
          create: {
            roomId,
            userId: targetUserId,
            bannedBy: session.user.id,
            reason,
            expiresAt: banExpiresAt
          }
        })

        // Also remove presence
        await prisma.chatPresence.deleteMany({
          where: { roomId, userId: targetUserId }
        })

        return NextResponse.json({ success: true, message: 'User banned' })
      }

      case 'unban_user': {
        if (!permissions.canBanUsers) {
          return NextResponse.json({ error: 'No permission to unban users' }, { status: 403 })
        }

        await prisma.chatBan.deleteMany({
          where: { roomId, userId: targetUserId }
        })

        return NextResponse.json({ success: true, message: 'User unbanned' })
      }

      case 'mute_room': {
        if (!permissions.canMuteRoom) {
          return NextResponse.json({ error: 'No permission to mute room' }, { status: 403 })
        }

        await prisma.chatRoom.update({
          where: { id: roomId },
          data: { isMuted: true }
        })

        return NextResponse.json({ success: true, message: 'Room muted' })
      }

      case 'unmute_room': {
        if (!permissions.canMuteRoom) {
          return NextResponse.json({ error: 'No permission to unmute room' }, { status: 403 })
        }

        await prisma.chatRoom.update({
          where: { id: roomId },
          data: { isMuted: false }
        })

        return NextResponse.json({ success: true, message: 'Room unmuted' })
      }

      case 'set_role': {
        const newRole = role as ChatRole
        const newRoleLevel = ROLE_HIERARCHY[newRole]

        // Check permission based on role being granted
        if (newRole === 'founder' && !permissions.canGiveFounder) {
          return NextResponse.json({ error: 'Only site admin can grant founder role' }, { status: 403 })
        }
        if (newRole === 'admin' && !permissions.canGiveAdmin) {
          return NextResponse.json({ error: 'No permission to grant admin role' }, { status: 403 })
        }
        if (newRole === 'op' && !permissions.canGiveOp) {
          return NextResponse.json({ error: 'No permission to grant op role' }, { status: 403 })
        }
        if (newRole === 'voice' && !permissions.canGiveVoice) {
          return NextResponse.json({ error: 'No permission to grant voice' }, { status: 403 })
        }

        // Cannot grant role higher than or equal to own (unless global admin)
        if (newRoleLevel >= actorRoleLevel && !permissions.isGlobalAdmin) {
          return NextResponse.json({ error: 'Cannot grant role higher than or equal to your own' }, { status: 403 })
        }

        await prisma.chatUserRole.upsert({
          where: { roomId_userId: { roomId, userId: targetUserId } },
          update: { role: newRole, grantedBy: session.user.id },
          create: {
            roomId,
            userId: targetUserId,
            role: newRole,
            grantedBy: session.user.id
          }
        })

        return NextResponse.json({ success: true, message: `Role set to ${newRole}` })
      }

      case 'remove_role': {
        // Check if actor can remove this role
        if (targetRoleLevel >= actorRoleLevel && !permissions.isGlobalAdmin) {
          return NextResponse.json({ error: 'Cannot remove role from user with same or higher role' }, { status: 403 })
        }

        await prisma.chatUserRole.deleteMany({
          where: { roomId, userId: targetUserId }
        })

        return NextResponse.json({ success: true, message: 'Role removed' })
      }

      case 'clear_messages': {
        // Founder, admin, and op can clear messages
        if (ROLE_HIERARCHY[permissions.role] < ROLE_HIERARCHY.op && !permissions.isGlobalAdmin) {
          return NextResponse.json({ error: 'No permission to clear messages' }, { status: 403 })
        }

        await prisma.chatMessage.deleteMany({
          where: { roomId }
        })

        return NextResponse.json({ success: true, message: 'Messages cleared' })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Moderation error:', error)
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 })
  }
}

// GET - Get room moderation info (mutes, bans, roles)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = await params
    const permissions = await getUserPermissions(roomId, session.user.id)

    // Only mods can see moderation info
    if (ROLE_HIERARCHY[permissions.role] < ROLE_HIERARCHY.op && !permissions.isGlobalAdmin) {
      return NextResponse.json({ error: 'No permission' }, { status: 403 })
    }

    const [room, mutes, bans, roles] = await Promise.all([
      prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { isMuted: true }
      }),
      prisma.chatMute.findMany({
        where: { roomId },
        include: { user: { select: { id: true, name: true } } }
      }),
      prisma.chatBan.findMany({
        where: { roomId },
        include: { user: { select: { id: true, name: true } } }
      }),
      prisma.chatUserRole.findMany({
        where: { roomId },
        include: { user: { select: { id: true, name: true } } }
      })
    ])

    return NextResponse.json({
      roomMuted: room?.isMuted || false,
      mutes,
      bans,
      roles,
      myPermissions: permissions
    })
  } catch (error) {
    console.error('Error fetching moderation info:', error)
    return NextResponse.json({ error: 'Failed to fetch moderation info' }, { status: 500 })
  }
}
