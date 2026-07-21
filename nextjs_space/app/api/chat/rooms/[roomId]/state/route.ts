import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { ROLE_SYMBOLS, ROLE_HIERARCHY } from '@/lib/chat-permissions'
import { voiceTrtcRoomId, userIdToNumericUid } from '@/lib/trtc-room'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/rooms/[roomId]/state
 *
 * Composite "single source of truth" snapshot of a voice room, designed for
 * the Flutter client (but usable by web too). Returns EVERYTHING needed to
 * render a room in one round-trip, all computed from the SAME PostgreSQL
 * tables the web uses (ChatRoom / ChatPresence / ChatUserRole / VoiceSession):
 *   - room       : room metadata (name, type, owner, cover, muted...)
 *   - participants: active users (sorted identically to /presence), with
 *                   seatIndex, micOn, chatRole, roleSymbol, isAdmin
 *   - seats      : 15-slot seat map (null = empty)
 *   - me         : the caller's own presence/role snapshot
 *   - trtc       : canonical TRTC join info (sdkAppId, trtcRoomId, numericUid)
 *
 * Realtime deltas after this snapshot arrive via the SSE stream endpoint
 * (/api/chat/rooms/[roomId]/stream) as `presence` + `room_event` payloads.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const currentUserId = mobileUser?.id || session?.user?.id
    const { roomId } = await params

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        owner: { select: { id: true, name: true, username: true, image: true } }
      }
    })

    if (!room) {
      return NextResponse.json(
        { success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Oda bulunamadı' } },
        { status: 404 }
      )
    }

    const presenceTimeout = new Date(Date.now() - 300000)
    const presences = await prisma.chatPresence.findMany({
      where: { roomId, lastSeen: { gte: presenceTimeout } },
      select: {
        userId: true,
        nickname: true,
        lastSeen: true,
        seatIndex: true,
        user: { select: { id: true, name: true, role: true, image: true } }
      }
    })

    const activeUserIds = presences.map((p: { userId: string }) => p.userId)
    const [chatRoles, micSessions] = await Promise.all([
      activeUserIds.length > 0
        ? prisma.chatUserRole.findMany({
            where: { roomId, userId: { in: activeUserIds } },
            select: { userId: true, role: true }
          })
        : Promise.resolve([] as { userId: string; role: string }[]),
      activeUserIds.length > 0
        ? prisma.voiceSession.findMany({
            where: { roomId, userId: { in: activeUserIds }, isActive: true },
            select: { userId: true }
          })
        : Promise.resolve([] as { userId: string }[])
    ])

    const roleMap = new Map(chatRoles.map((r: { userId: string; role: string }) => [r.userId, r.role]))
    const micOnSet = new Set(micSessions.map((v: { userId: string }) => v.userId))
    const globalAdminRoles = ['admin', 'moderator', 'site_manager']

    const participants = presences.map((p: { userId: string; nickname: string | null; lastSeen: Date; seatIndex: number | null; user: { id: string; name: string; role: string; image: string | null } }) => {
      const isGlobalAdmin = globalAdminRoles.includes(p.user.role)
      const chatRole = (roleMap.get(p.userId) as string | undefined) || (isGlobalAdmin ? 'superadmin' : null)
      const roleSymbol = chatRole ? (ROLE_SYMBOLS[chatRole as keyof typeof ROLE_SYMBOLS] || '') : ''
      const roleLevel = chatRole ? (ROLE_HIERARCHY[chatRole as keyof typeof ROLE_HIERARCHY] || 0) : 0
      return {
        id: p.userId,
        name: p.user.name,
        nickname: p.nickname || p.user.name,
        image: p.user.image || null,
        lastSeen: p.lastSeen.toISOString(),
        seatIndex: typeof p.seatIndex === 'number' ? p.seatIndex : -1,
        micOn: micOnSet.has(p.userId),
        chatRole,
        roleSymbol,
        roleLevel,
        isAdmin: isGlobalAdmin,
        isOwner: room.ownerId === p.userId
      }
    })

    // Identical sort to /presence: role level desc, then nickname asc
    participants.sort((a, b) => {
      if (b.roleLevel !== a.roleLevel) return b.roleLevel - a.roleLevel
      return (a.nickname || a.name).localeCompare(b.nickname || b.name)
    })

    // 15-slot seat map
    const seats: Array<null | { seatIndex: number; userId: string; name: string; nickname: string; image: string | null; micOn: boolean }> = new Array(15).fill(null)
    for (const p of participants) {
      if (p.seatIndex >= 0 && p.seatIndex < 15) {
        seats[p.seatIndex] = {
          seatIndex: p.seatIndex,
          userId: p.id,
          name: p.name,
          nickname: p.nickname,
          image: p.image,
          micOn: p.micOn
        }
      }
    }

    const me = currentUserId ? participants.find(p => p.id === currentUserId) || null : null

    const sdkAppId = parseInt(
      process.env.TRTC_SDK_APP_ID ||
      process.env.TENCENT_TRTC_SDK_APP_ID ||
      '0'
    )

    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: room.id,
          slug: room.slug,
          nameTr: room.nameTr,
          nameEn: room.nameEn,
          descTr: room.descTr,
          descEn: room.descEn,
          icon: room.icon,
          backgroundImage: room.backgroundImage,
          roomType: room.roomType,
          isActive: room.isActive,
          isMuted: room.isMuted,
          ownerId: room.ownerId,
          owner: room.owner
            ? { id: room.owner.id, name: room.owner.name, username: room.owner.username, image: room.owner.image }
            : null
        },
        participants,
        seats,
        onlineCount: participants.length,
        me,
        trtc: {
          sdkAppId: sdkAppId || 0,
          trtcRoomId: voiceTrtcRoomId(room.id),
          numericUid: currentUserId ? userIdToNumericUid(currentUserId) : 0
        }
      }
    })
  } catch (error) {
    console.error('[chat/rooms/state] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Oda durumu alınamadı' } },
      { status: 500 }
    )
  }
}
