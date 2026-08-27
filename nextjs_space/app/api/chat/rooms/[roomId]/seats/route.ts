import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { ROLE_HIERARCHY } from '@/lib/chat-permissions'
import { emitSeatChanged } from '@/lib/voice-room-events'
import { getReceivedJetonTotals } from '@/lib/voice-room-gifts'
import { SEAT_COUNT, seatStaleThreshold } from '@/lib/voice-room-constants'

export const dynamic = 'force-dynamic'

// GET - standardized seat map for the room (used by web + Flutter).
// Returns SEAT_COUNT seats (0..SEAT_COUNT-1). Each element is null (empty) or the occupant.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    // Short seat-stale window: ghost seats (users who left) free up fast.
    const presenceTimeout = seatStaleThreshold()
    const seated = await prisma.chatPresence.findMany({
      where: { roomId, lastSeen: { gte: presenceTimeout }, seatIndex: { gte: 0, lt: SEAT_COUNT } },
      select: {
        userId: true,
        seatIndex: true,
        nickname: true,
        user: { select: { id: true, name: true, image: true } }
      }
    })
    const activeUserIds = seated.map((s: { userId: string }) => s.userId)
    const micSessions = activeUserIds.length > 0
      ? await prisma.voiceSession.findMany({
          where: { roomId, userId: { in: activeUserIds }, isActive: true },
          select: { userId: true }
        })
      : []
    const micOnSet = new Set(micSessions.map((v: { userId: string }) => v.userId))
    const receivedJetonMap = await getReceivedJetonTotals(roomId, activeUserIds)

    const seats: Array<null | {
      seatIndex: number
      userId: string
      name: string
      nickname: string
      image: string | null
      micOn: boolean
      receivedJetons: number
    }> = new Array(SEAT_COUNT).fill(null)
    for (const s of seated) {
      if (s.seatIndex !== null && s.seatIndex >= 0 && s.seatIndex < SEAT_COUNT) {
        seats[s.seatIndex] = {
          seatIndex: s.seatIndex,
          userId: s.userId,
          name: s.user.name,
          nickname: s.nickname || s.user.name,
          image: s.user.image || null,
          micOn: micOnSet.has(s.userId),
          receivedJetons: receivedJetonMap.get(s.userId) || 0
        }
      }
    }
    return NextResponse.json({ success: true, seats })
  } catch (error) {
    console.error('Error fetching seats:', error)
    return NextResponse.json({ error: 'Koltuklar getirilemedi' }, { status: 500 })
  }
}

// PATCH - Move a user to a different seat (admin/owner only) or claim a seat for self
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const seatUserId = mobileUser?.id || session?.user?.id
    
    if (!seatUserId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const body = await request.json()
    const { targetUserId, seatIndex, forceThrone, forceAssign } = body

    if (typeof seatIndex !== 'number' || seatIndex < -1 || seatIndex >= SEAT_COUNT) {
      return NextResponse.json({ error: 'Geçersiz koltuk numarası' }, { status: 400 })
    }

    const isSelfAction = targetUserId === seatUserId || !targetUserId
    const actualTargetId = targetUserId || seatUserId

    // If moving someone else, check admin/owner permission
    if (!isSelfAction) {
      const currentUser = await prisma.user.findUnique({
        where: { id: seatUserId },
        select: { role: true }
      })
      const isGlobalAdmin = ['admin', 'moderator', 'site_manager'].includes(currentUser?.role || '')

      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { ownerId: true }
      })
      const isOwner = room?.ownerId === seatUserId

      let myRoleLevel = 0
      if (!isGlobalAdmin && !isOwner) {
        const myRole = await prisma.chatUserRole.findUnique({
          where: { roomId_userId: { roomId, userId: seatUserId } }
        })
        myRoleLevel = myRole ? (ROLE_HIERARCHY[myRole.role as keyof typeof ROLE_HIERARCHY] || 0) : 0
      }

      // Need at least sop/owner/superadmin level to move others
      if (!isGlobalAdmin && !isOwner && myRoleLevel < ROLE_HIERARCHY['sop']) {
        return NextResponse.json({ error: 'Kullanıcıları taşıma yetkiniz yok' }, { status: 403 })
      }
    }

    // ── Atomic seat check + assignment (interactive tx → TOCTOU koruması) ──
    const result = await prisma.$transaction(async (tx: any) => {
      const presenceTimeout = seatStaleThreshold()

      if (seatIndex >= 0) {
        const seatTaken = await tx.chatPresence.findFirst({
          where: {
            roomId,
            seatIndex,
            lastSeen: { gte: presenceTimeout },
            userId: { not: actualTargetId }
          }
        })
        if (seatTaken) {
          if ((forceThrone && seatIndex === 0) || forceAssign) {
            const allPresences = await tx.chatPresence.findMany({
              where: { roomId, lastSeen: { gte: presenceTimeout }, seatIndex: { gte: 0, lt: SEAT_COUNT } },
              select: { seatIndex: true }
            })
            const occupiedSet = new Set(allPresences.map((p: any) => p.seatIndex))
            let nextSeat = -1
            for (let i = 1; i < SEAT_COUNT; i++) {
              if (!occupiedSet.has(i)) { nextSeat = i; break }
            }
            await tx.chatPresence.update({
              where: { roomId_userId: { roomId, userId: seatTaken.userId } },
              data: { seatIndex: nextSeat }
            })
          } else {
            return { conflict: true } as const
          }
        }
      }

      // Capture previous seat for the realtime event
      const prevPresence = await tx.chatPresence.findUnique({
        where: { roomId_userId: { roomId, userId: actualTargetId } },
        select: { seatIndex: true }
      })

      // Atomic upsert inside the same tx
      await tx.chatPresence.upsert({
        where: { roomId_userId: { roomId, userId: actualTargetId } },
        update: { seatIndex, lastSeen: new Date() },
        create: { roomId, userId: actualTargetId, seatIndex, lastSeen: new Date() }
      })

      return { conflict: false, prevSeatIndex: prevPresence?.seatIndex ?? -1 } as const
    })

    if (result.conflict) {
      return NextResponse.json({ error: 'Bu koltuk zaten dolu' }, { status: 409 })
    }

    // Broadcast the seat change (web + Flutter via SSE)
    emitSeatChanged(roomId, actualTargetId, seatIndex, result.prevSeatIndex)

    return NextResponse.json({ success: true, seatIndex })
  } catch (error) {
    console.error('Error updating seat:', error)
    return NextResponse.json({ error: 'Koltuk güncellenemedi' }, { status: 500 })
  }
}
