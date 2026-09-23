import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { getUserPermissions, ROLE_HIERARCHY, ChatRole } from '@/lib/chat-permissions'
import { emitChatEvent } from '@/lib/chat-events'

export const dynamic = 'force-dynamic'

// In-memory kick warning counter: userId -> { roomId -> count }
const kickWarnings = new Map<string, Map<string, { count: number; lastKick: number }>>()
const KICK_WARNING_RESET_MS = 30 * 60 * 1000 // 30 minutes
const MAX_KICKS_BEFORE_BAN = 3

// POST - Perform moderation action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const body = await request.json()
    const { targetUserId, reason, duration, message: announcementMessage, ttl } = body

    // Mobil istemci rolü sembol olarak gönderebiliyor (+ @ & ~). Kanonik ada çevir.
    const ROLE_SYMBOL_TO_NAME: Record<string, string> = {
      '+': 'voice',
      '@': 'op',
      '&': 'sop',
      '~': 'founder',
      '': 'none',
    }
    const rawRole = typeof body?.role === 'string' ? body.role : body?.role
    const role = typeof rawRole === 'string' && ROLE_SYMBOL_TO_NAME[rawRole] !== undefined
      ? ROLE_SYMBOL_TO_NAME[rawRole]
      : rawRole

    // Mobil istemci kısa eylem adları gönderebiliyor ("ban", "mute", ...).
    // Bunları kanonik eylem adlarına eşle; bilinmeyenler default dalına düşer.
    const ACTION_ALIASES: Record<string, string> = {
      ban: 'ban_user',
      unban: 'unban_user',
      mute: 'mute_user',
      unmute: 'unmute_user',
      kick: 'kick_user',
      give_voice: 'set_role',
      give_op: 'set_role',
      give_sop: 'set_role',
      give_founder: 'set_role',
      assign_role: 'set_role',
      take_role: 'remove_role',
    }
    const rawAction = typeof body?.action === 'string' ? body.action : ''
    const action = ACTION_ALIASES[rawAction] ?? rawAction

    const permissions = await getUserPermissions(roomId, authUser.id)
    const actorRoleLevel = ROLE_HIERARCHY[permissions.role]

    // Get target user's role for hierarchy check (only if targetUserId is provided)
    let targetRoleLevel = 0
    let targetUserGlobal: { role: string } | null = null
    if (targetUserId) {
      // Check if target is a protected user (admin, moderator, site_manager)
      targetUserGlobal = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { role: true }
      })
      const protectedRoles = ['admin', 'moderator', 'site_manager']
      const isTargetProtected = targetUserGlobal && protectedRoles.includes(targetUserGlobal.role)
      const isActorProtected = protectedRoles.includes(authUser.role || '')

      // If target is protected and actor is NOT protected, reverse the action
      if (isTargetProtected && !isActorProtected) {
        const reverseAction = action
        if (reverseAction === 'kick_user') {
          // Auto-kick the attacker from the room
          await prisma.chatPresence.deleteMany({
            where: { roomId, userId: authUser.id }
          })
          return NextResponse.json({ error: 'Bu kullanıcıyı atamazsınız! Odadan çıkarıldınız.', reversed: true, reverseAction: 'kicked' }, { status: 403 })
        }
        if (reverseAction === 'mute_user') {
          // Auto-mute the attacker
          await prisma.chatMute.upsert({
            where: { roomId_userId: { roomId, userId: authUser.id } },
            update: { mutedBy: targetUserId, reason: 'Yetkili kullanıcıyı susturmaya çalıştı', expiresAt: new Date(Date.now() + 30 * 60000) },
            create: { roomId, userId: authUser.id, mutedBy: targetUserId, reason: 'Yetkili kullanıcıyı susturmaya çalıştı', expiresAt: new Date(Date.now() + 30 * 60000) }
          })
          return NextResponse.json({ error: 'Bu kullanıcıyı susturamazsınız! Kendiniz susturuldunuz.', reversed: true, reverseAction: 'muted' }, { status: 403 })
        }
        if (reverseAction === 'ban_user') {
          // Auto-kick the attacker and ban them
          await prisma.chatPresence.deleteMany({
            where: { roomId, userId: authUser.id }
          })
          return NextResponse.json({ error: 'Bu kullanıcıyı banlayamazsınız! Odadan çıkarıldınız.', reversed: true, reverseAction: 'kicked' }, { status: 403 })
        }
        // For any other action on protected users, just deny
        return NextResponse.json({ error: 'Bu kullanıcı üzerinde yetkiniz yok' }, { status: 403 })
      }

      const targetRole = await prisma.chatUserRole.findUnique({
        where: { roomId_userId: { roomId, userId: targetUserId } }
      })
      targetRoleLevel = ROLE_HIERARCHY[(targetRole?.role as ChatRole) || 'none']

      // Cannot act on users with same or higher role (except global admin or self-role-assign)
      const isSelfAction = targetUserId === authUser.id
      if (targetRoleLevel >= actorRoleLevel && !permissions.isGlobalAdmin && !isSelfAction) {
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
          update: { mutedBy: authUser.id, reason, expiresAt },
          create: {
            roomId,
            userId: targetUserId,
            mutedBy: authUser.id,
            reason,
            expiresAt
          }
        })

        // SSE: mute notification
        const mutedUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { name: true, username: true }
        })
        emitChatEvent(roomId, 'system', {
          event: 'USER_MUTED',
          userId: targetUserId,
          userName: mutedUser?.name || mutedUser?.username || 'Kullanıcı',
          duration: duration || null,
          moderator: authUser.name || 'Moderatör'
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

        // SSE: unmute notification
        emitChatEvent(roomId, 'system', {
          event: 'USER_UNMUTED',
          userId: targetUserId,
          moderator: authUser.name || 'Moderatör'
        })

        return NextResponse.json({ success: true, message: 'User unmuted' })
      }

      case 'kick_user': {
        if (!permissions.canKickUsers) {
          return NextResponse.json({ error: 'No permission to kick users' }, { status: 403 })
        }

        // Kick warning counter (3 strikes → auto-ban)
        let userKicks = kickWarnings.get(targetUserId)
        if (!userKicks) {
          userKicks = new Map()
          kickWarnings.set(targetUserId, userKicks)
        }
        const roomKick = userKicks.get(roomId) || { count: 0, lastKick: 0 }
        // Reset if too old
        if (Date.now() - roomKick.lastKick > KICK_WARNING_RESET_MS) {
          roomKick.count = 0
        }
        roomKick.count++
        roomKick.lastKick = Date.now()
        userKicks.set(roomId, roomKick)

        // Remove user presence
        await prisma.chatPresence.deleteMany({
          where: { roomId, userId: targetUserId }
        })

        // Get target user name
        const kickedUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { name: true, username: true }
        })
        const kickedName = kickedUser?.name || kickedUser?.username || 'Kullanıcı'

        // 3 strikes → auto-ban
        if (roomKick.count >= MAX_KICKS_BEFORE_BAN) {
          await prisma.chatBan.upsert({
            where: { roomId_userId: { roomId, userId: targetUserId } },
            update: { bannedBy: authUser.id, reason: `${MAX_KICKS_BEFORE_BAN} kez atıldı (otomatik ban)` },
            create: {
              roomId,
              userId: targetUserId,
              bannedBy: authUser.id,
              reason: `${MAX_KICKS_BEFORE_BAN} kez atıldı (otomatik ban)`
            }
          })
          // Reset counter
          userKicks.delete(roomId)
          
          // SSE: ban notification
          emitChatEvent(roomId, 'system', {
            event: 'USER_BANNED',
            userId: targetUserId,
            userName: kickedName,
            reason: `${MAX_KICKS_BEFORE_BAN} kez atıldı (otomatik ban)`,
            moderator: authUser.name || 'Moderatör'
          })

          return NextResponse.json({ success: true, message: 'User auto-banned after 3 kicks', autoBanned: true, kickCount: roomKick.count })
        }

        // SSE: kick notification
        emitChatEvent(roomId, 'system', {
          event: 'USER_KICKED',
          userId: targetUserId,
          userName: kickedName,
          reason: reason || '',
          kickCount: roomKick.count,
          moderator: authUser.name || 'Moderatör'
        })

        return NextResponse.json({ success: true, message: 'User kicked', kickCount: roomKick.count })
      }

      case 'ban_user': {
        if (!permissions.canBanUsers) {
          return NextResponse.json({ error: 'No permission to ban users' }, { status: 403 })
        }

        const banExpiresAt = duration ? new Date(Date.now() + duration * 60000) : null

        await prisma.chatBan.upsert({
          where: { roomId_userId: { roomId, userId: targetUserId } },
          update: { bannedBy: authUser.id, reason, expiresAt: banExpiresAt },
          create: {
            roomId,
            userId: targetUserId,
            bannedBy: authUser.id,
            reason,
            expiresAt: banExpiresAt
          }
        })

        // Also remove presence
        await prisma.chatPresence.deleteMany({
          where: { roomId, userId: targetUserId }
        })

        // SSE: ban notification
        const bannedUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { name: true, username: true }
        })
        emitChatEvent(roomId, 'system', {
          event: 'USER_BANNED',
          userId: targetUserId,
          userName: bannedUser?.name || bannedUser?.username || 'Kullanıcı',
          reason: reason || '',
          moderator: authUser.name || 'Moderatör'
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

        // SSE: room mute notification
        emitChatEvent(roomId, 'system', {
          event: 'ROOM_MUTED',
          moderator: authUser.name || 'Moderatör'
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

        // SSE: room unmute notification
        emitChatEvent(roomId, 'system', {
          event: 'ROOM_UNMUTED',
          moderator: authUser.name || 'Moderatör'
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
        if (newRole === 'sop' && !permissions.canGiveSop) {
          return NextResponse.json({ error: 'No permission to grant SOP role' }, { status: 403 })
        }
        if ((newRole as string) === 'admin' && !permissions.canGiveSop) {
          // backward compat: 'admin' maps to 'sop'
          return NextResponse.json({ error: 'No permission to grant SOP role' }, { status: 403 })
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
          update: { role: newRole, grantedBy: authUser.id },
          create: {
            roomId,
            userId: targetUserId,
            role: newRole,
            grantedBy: authUser.id
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

        // SSE: clear chat notification
        emitChatEvent(roomId, 'system', {
          event: 'CHAT_CLEARED',
          moderator: authUser.name || 'Moderatör'
        })

        return NextResponse.json({ success: true, message: 'Messages cleared' })
      }

      case 'set_owner': {
        // Only global admin can set room owner
        if (!permissions.isGlobalAdmin) {
          return NextResponse.json({ error: 'Only site admin can set room owner' }, { status: 403 })
        }

        await prisma.chatRoom.update({
          where: { id: roomId },
          data: { ownerId: targetUserId || null }
        })

        // If owner is set, also give them founder role in this room
        if (targetUserId) {
          await prisma.chatUserRole.upsert({
            where: { roomId_userId: { roomId, userId: targetUserId } },
            update: { role: 'founder', grantedBy: authUser.id },
            create: {
              roomId,
              userId: targetUserId,
              role: 'founder',
              grantedBy: authUser.id
            }
          })
        }

        return NextResponse.json({ success: true, message: 'Room owner set' })
      }

      case 'remove_owner': {
        // Only global admin can remove room owner
        if (!permissions.isGlobalAdmin) {
          return NextResponse.json({ error: 'Only site admin can remove room owner' }, { status: 403 })
        }

        await prisma.chatRoom.update({
          where: { id: roomId },
          data: { ownerId: null }
        })

        return NextResponse.json({ success: true, message: 'Room owner removed' })
      }

      case 'announce': {
        // !duyuru - Announcement (pinned message with TTL)
        // Requires at least op role
        if (ROLE_HIERARCHY[permissions.role] < ROLE_HIERARCHY.op && !permissions.isGlobalAdmin) {
          return NextResponse.json({ error: 'No permission to make announcements' }, { status: 403 })
        }

        const annText = announcementMessage || reason || ''
        const annTtl = ttl || duration || 15

        if (!annText) {
          return NextResponse.json({ error: 'Duyuru metni gerekiyor' }, { status: 400 })
        }

        // Create system message for announcement
        await prisma.chatMessage.create({
          data: {
            roomId,
            userId: authUser.id,
            content: `[ANNOUNCEMENT]${annText}`,
          }
        })

        // SSE: announcement event
        emitChatEvent(roomId, 'system', {
          event: 'ANNOUNCEMENT',
          text: annText,
          ttl: annTtl, // seconds
          moderator: authUser.name || 'Moderatör',
          timestamp: Date.now()
        })

        return NextResponse.json({ success: true, message: 'Announcement sent', ttl: annTtl })
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
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const permissions = await getUserPermissions(roomId, authUser.id)

    // Only mods can see moderation info
    if (ROLE_HIERARCHY[permissions.role] < ROLE_HIERARCHY.op && !permissions.isGlobalAdmin) {
      return NextResponse.json({ error: 'No permission' }, { status: 403 })
    }

    const [room, mutes, bans, roles] = await Promise.all([
      prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { 
          isMuted: true,
          ownerId: true,
          owner: { select: { id: true, name: true, username: true } }
        }
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
      ownerId: room?.ownerId || null,
      owner: room?.owner || null,
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
