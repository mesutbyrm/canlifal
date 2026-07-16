import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { ROLE_HIERARCHY } from '@/lib/chat-permissions'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/seats
 * Unified seat management for Flutter — take, leave, swap, or force-assign seats in voice rooms.
 *
 * Body: { roomId, action: 'take' | 'leave' | 'swap' | 'force', seatIndex?, targetUserId? }
 *
 * Actions:
 *  - take:  Current user claims seatIndex (0-14)
 *  - leave: Current user vacates their seat (seatIndex = -1)
 *  - swap:  Admin/owner moves targetUserId to seatIndex (displaces if occupied)
 *  - force: Admin/owner forces targetUserId off their seat (seatIndex = -1)
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { roomId, action, seatIndex, targetUserId } = body

    if (!roomId || !action) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'roomId ve action gerekli' } },
        { status: 400 }
      )
    }

    // Verify the room exists and is a voice room (ChatRoom)
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { id: true, ownerId: true }
    })
    if (!room) {
      return NextResponse.json(
        { success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Oda bulunamadı' } },
        { status: 404 }
      )
    }

    const presenceTimeout = new Date(Date.now() - 300000) // 5 min stale

    // ── ACTION: leave ──
    if (action === 'leave') {
      await prisma.chatPresence.upsert({
        where: { roomId_userId: { roomId, userId: authUser.id } },
        update: { seatIndex: -1, lastSeen: new Date() },
        create: { roomId, userId: authUser.id, seatIndex: -1, lastSeen: new Date() }
      })
      return NextResponse.json({
        success: true,
        data: { seatIndex: -1, message: 'Koltuktan ayrıldınız' }
      })
    }

    // ── ACTION: force (kick from seat) ──
    if (action === 'force') {
      if (!targetUserId) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_PARAMS', message: 'targetUserId gerekli' } },
          { status: 400 }
        )
      }
      // Permission check
      const hasPermission = await checkAdminPermission(roomId, room.ownerId, authUser.id)
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok' } },
          { status: 403 }
        )
      }
      await prisma.chatPresence.updateMany({
        where: { roomId, userId: targetUserId },
        data: { seatIndex: -1, lastSeen: new Date() }
      })
      return NextResponse.json({
        success: true,
        data: { targetUserId, seatIndex: -1, message: 'Kullanıcı koltuktan indirildi' }
      })
    }

    // ── validate seatIndex for take/swap ──
    if (typeof seatIndex !== 'number' || seatIndex < 0 || seatIndex > 14) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_SEAT', message: 'Geçersiz koltuk numarası (0-14)' } },
        { status: 400 }
      )
    }

    // ── ACTION: take ──
    if (action === 'take') {
      // Check if seat is occupied by someone else
      const occupant = await prisma.chatPresence.findFirst({
        where: {
          roomId,
          seatIndex,
          lastSeen: { gte: presenceTimeout },
          userId: { not: authUser.id }
        }
      })
      if (occupant) {
        return NextResponse.json(
          { success: false, error: { code: 'SEAT_TAKEN', message: 'Bu koltuk zaten dolu' } },
          { status: 409 }
        )
      }
      await prisma.chatPresence.upsert({
        where: { roomId_userId: { roomId, userId: authUser.id } },
        update: { seatIndex, lastSeen: new Date() },
        create: { roomId, userId: authUser.id, seatIndex, lastSeen: new Date() }
      })
      return NextResponse.json({
        success: true,
        data: { seatIndex, message: `Koltuk ${seatIndex} alındı` }
      })
    }

    // ── ACTION: swap (admin move user) ──
    if (action === 'swap') {
      const actualTarget = targetUserId || authUser.id
      // If moving someone else, check permission
      if (actualTarget !== authUser.id) {
        const hasPermission = await checkAdminPermission(roomId, room.ownerId, authUser.id)
        if (!hasPermission) {
          return NextResponse.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'Kullanıcıları taşıma yetkiniz yok' } },
            { status: 403 }
          )
        }
      }

      // Check if seat is occupied
      const occupant = await prisma.chatPresence.findFirst({
        where: {
          roomId,
          seatIndex,
          lastSeen: { gte: presenceTimeout },
          userId: { not: actualTarget }
        }
      })
      if (occupant) {
        // Displace occupant to next available seat
        const allPresences = await prisma.chatPresence.findMany({
          where: { roomId, lastSeen: { gte: presenceTimeout }, seatIndex: { gte: 0, lt: 15 } },
          select: { seatIndex: true }
        })
        const occupied = new Set(allPresences.map((p: any) => p.seatIndex))
        let nextSeat = -1
        for (let i = 0; i < 15; i++) {
          if (i !== seatIndex && !occupied.has(i)) { nextSeat = i; break }
        }
        await prisma.chatPresence.update({
          where: { roomId_userId: { roomId, userId: occupant.userId } },
          data: { seatIndex: nextSeat }
        })
      }

      await prisma.chatPresence.upsert({
        where: { roomId_userId: { roomId, userId: actualTarget } },
        update: { seatIndex, lastSeen: new Date() },
        create: { roomId, userId: actualTarget, seatIndex, lastSeen: new Date() }
      })
      return NextResponse.json({
        success: true,
        data: { targetUserId: actualTarget, seatIndex, message: `Kullanıcı koltuğa ${seatIndex} taşındı` }
      })
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Geçersiz action: take, leave, swap, force' } },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in /api/live/seats:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Koltuk işlemi başarısız' } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/live/seats?roomId=xxx
 * Returns the current seat map for a voice room.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const roomId = request.nextUrl.searchParams.get('roomId')
    if (!roomId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'roomId gerekli' } },
        { status: 400 }
      )
    }

    const presenceTimeout = new Date(Date.now() - 300000)
    const presences = await prisma.chatPresence.findMany({
      where: {
        roomId,
        lastSeen: { gte: presenceTimeout },
        seatIndex: { gte: 0 }
      },
      select: {
        userId: true,
        seatIndex: true,
        nickname: true,
        user: { select: { id: true, name: true, image: true } }
      },
      orderBy: { seatIndex: 'asc' }
    })

    const seats = presences.map((p: any) => ({
      seatIndex: p.seatIndex,
      userId: p.userId,
      userName: p.nickname || p.user?.name || 'Anonim',
      userImage: p.user?.image || null,
      isMicOn: false
    }))

    return NextResponse.json({
      success: true,
      data: { roomId, seats, totalSeats: 15 }
    })
  } catch (error) {
    console.error('Error in GET /api/live/seats:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Koltuk listesi alınamadı' } },
      { status: 500 }
    )
  }
}

/** Check if user has admin/owner permission in room */
async function checkAdminPermission(roomId: string, ownerId: string | null, userId: string): Promise<boolean> {
  if (ownerId === userId) return true
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (user && ['admin', 'moderator', 'site_manager'].includes(user.role)) return true
  const roomRole = await prisma.chatUserRole.findUnique({
    where: { roomId_userId: { roomId, userId } }
  })
  if (roomRole) {
    const level = ROLE_HIERARCHY[roomRole.role as keyof typeof ROLE_HIERARCHY] || 0
    return level >= ROLE_HIERARCHY['sop']
  }
  return false
}
