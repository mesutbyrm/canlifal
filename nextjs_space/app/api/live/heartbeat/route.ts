import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { redisCache } from '@/lib/cache'
import { presenceCutoff, PRESENCE_TTL_MS } from '@/lib/presence'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/heartbeat
 * Flutter client sends this every 10 seconds to signal liveness.
 * Updates lastSeen / lastPing so the user stays in active lists.
 * Also performs auto-cleanup of stale participants (>60s no heartbeat).
 *
 * Body: { roomId, roomType: 'stream' | 'voice' }
 * Returns: { success, data: { onlineCount, staleRemoved } }
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

    let onlineCount = 0
    let staleRemoved = 0

    if (roomType === 'stream') {
      // ─── Live Stream Heartbeat ───
      const stream = await prisma.videoStream.findFirst({
        where: { OR: [{ id: roomId }, { roomId }], status: 'live' },
        select: { id: true }
      })

      if (!stream) {
        return NextResponse.json(
          { success: false, error: { code: 'STREAM_NOT_FOUND', message: 'Aktif yayın bulunamadı' } },
          { status: 404 }
        )
      }

      // Heartbeat sadece MEVCUT ve aktif izleyici kaydını tazeler.
      // Odaya katılım yalnızca join uçlarından yapılır; aksi halde gecikmiş/yarışan
      // bir heartbeat kullanıcıyı hiç girmediği yayına ekleyebiliyordu.
      await prisma.videoStreamViewer.updateMany({
        where: { streamId: stream.id, viewerId: authUser.id, leftAt: null },
        data: { joinedAt: new Date() }
      })

      // Auto-cleanup: mark viewers who haven't heartbeat within the presence TTL as left
      const sixtySecondsAgo = new Date(Date.now() - PRESENCE_TTL_MS)
      const staleResult = await prisma.videoStreamViewer.updateMany({
        where: {
          streamId: stream.id,
          leftAt: null,
          joinedAt: { lt: sixtySecondsAgo },
          viewerId: { not: authUser.id } // don't clean ourselves
        },
        data: { leftAt: new Date() }
      })
      staleRemoved = staleResult.count

      // Count active viewers
      onlineCount = await prisma.videoStreamViewer.count({
        where: { streamId: stream.id, leftAt: null }
      })

    } else if (roomType === 'voice') {
      // ─── Voice Room Heartbeat ───
      const room = await prisma.chatRoom.findFirst({
        where: { OR: [{ id: roomId }, { slug: roomId }] },
        select: { id: true }
      })

      if (!room) {
        return NextResponse.json(
          { success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Oda bulunamadı' } },
          { status: 404 }
        )
      }

      // Heartbeat sadece MEVCUT varlık kaydını tazeler, yeni kayıt OLUŞTURMAZ.
      // Odaya katılım yalnızca /api/live/join-room ve presence POST üzerinden olur.
      await prisma.chatPresence.updateMany({
        where: { roomId: room.id, userId: authUser.id },
        data: { lastSeen: new Date() }
      })

      // Update voice session ping if active
      await prisma.voiceSession.updateMany({
        where: { roomId: room.id, userId: authUser.id, isActive: true },
        data: { lastPing: new Date() }
      })

      // Auto-cleanup stale voice sessions (presence TTL boyunca ping gelmeyenler)
      const sixtySecondsAgo = new Date(Date.now() - PRESENCE_TTL_MS)
      const staleVoice = await prisma.voiceSession.updateMany({
        where: {
          roomId: room.id,
          isActive: true,
          lastPing: { lt: sixtySecondsAgo }
        },
        data: { isActive: false }
      })
      staleRemoved = staleVoice.count

      // Count active presences
      const presenceTimeout = presenceCutoff()
      onlineCount = await prisma.chatPresence.count({
        where: { roomId: room.id, lastSeen: { gte: presenceTimeout } }
      })
    }

    // Refresh cache presence TTL
    redisCache.sadd(`room:${roomId}:users`, authUser.id)
    redisCache.hset(`user:${authUser.id}:presence`, 'lastSeen', new Date().toISOString())
    redisCache.expire(`user:${authUser.id}:presence`, 600)

    return NextResponse.json({
      success: true,
      data: {
        onlineCount,
        staleRemoved,
        serverTime: new Date().toISOString(),
      }
    })

  } catch (error) {
    console.error('[LIVE/heartbeat] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Heartbeat işlemi başarısız' } },
      { status: 500 }
    )
  }
}
