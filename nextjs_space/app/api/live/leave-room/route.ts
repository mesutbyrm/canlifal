import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/leave-room
 * Cleanup endpoint for Flutter — marks user as left in the appropriate room.
 *
 * Body: { roomId, roomType: 'stream' | 'voice' }
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
    const { roomId, roomType } = body

    if (!roomId || !roomType) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_PARAMS', message: 'roomId ve roomType gereklidir' } },
        { status: 400 }
      )
    }

    if (roomType === 'stream') {
      // ─── Leave Live Stream ───
      // Find the stream by id or roomId
      const stream = await prisma.videoStream.findFirst({
        where: { OR: [{ id: roomId }, { roomId }] },
        select: { id: true, userId: true }
      })

      if (stream) {
        // If the leaving user is the host, end the stream
        if (stream.userId === authUser.id) {
          await prisma.videoStream.update({
            where: { id: stream.id },
            data: { status: 'ended', endedAt: new Date() }
          })
          // Mark all viewers as left
          await prisma.videoStreamViewer.updateMany({
            where: { streamId: stream.id, leftAt: null },
            data: { leftAt: new Date() }
          })
          console.log(`[LIVE/leave-room] Host ended stream. streamId=${stream.id} userId=${authUser.id}`)
        } else {
          // Mark this viewer as left
          await prisma.videoStreamViewer.updateMany({
            where: { streamId: stream.id, viewerId: authUser.id, leftAt: null },
            data: { leftAt: new Date() }
          })
          console.log(`[LIVE/leave-room] Viewer left stream. streamId=${stream.id} userId=${authUser.id}`)
        }
      }

    } else if (roomType === 'voice') {
      // ─── Leave Voice Room ───
      // Find room by id or slug
      const room = await prisma.chatRoom.findFirst({
        where: { OR: [{ id: roomId }, { slug: roomId }] },
        select: { id: true }
      })

      if (room) {
        // Set presence to distant past (effectively removes from active list)
        try {
          await prisma.chatPresence.update({
            where: { roomId_userId: { roomId: room.id, userId: authUser.id } },
            data: { lastSeen: new Date(0), seatIndex: -1 }
          })
        } catch { /* presence record might not exist */ }

        // Deactivate voice session if any
        await prisma.voiceSession.updateMany({
          where: { roomId: room.id, userId: authUser.id, isActive: true },
          data: { isActive: false }
        })

        // Leave system message
        const displayName = authUser.name || 'Kullanıcı'
        await prisma.chatMessage.create({
          data: {
            roomId: room.id,
            userId: authUser.id,
            content: `[SYSTEM_LEAVE]${displayName}`
          }
        })

        console.log(`[LIVE/leave-room] User left voice room. roomId=${room.id} userId=${authUser.id}`)
      }
    }

    return NextResponse.json({ success: true, data: { message: 'Odadan çıkıldı' } })

  } catch (error) {
    console.error('[LIVE/leave-room] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Odadan çıkış başarısız' } },
      { status: 500 }
    )
  }
}
