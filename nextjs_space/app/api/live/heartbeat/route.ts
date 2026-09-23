import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { redisCache } from '@/lib/cache'

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

      // Update viewer's joinedAt as heartbeat (or re-join if leftAt was set)
      await prisma.videoStreamViewer.upsert({
        where: { streamId_viewerId: { streamId: stream.id, viewerId: authUser.id } },
        update: { leftAt: null, joinedAt: new Date() },
        create: { streamId: stream.id, viewerId: authUser.id }
      })

      // Auto-cleanup: mark viewers who haven't heartbeat in 60s as left
      const sixtySecondsAgo = new Date(Date.now() - 60000)
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

      // Update chat presence
      try {
        await prisma.chatPresence.upsert({
          where: { roomId_userId: { roomId: room.id, userId: authUser.id } },
          update: { lastSeen: new Date() },
          create: { roomId: room.id, userId: authUser.id, seatIndex: -1 }
        })
      } catch (e: any) {
        if (e?.code === 'P2002') {
          await prisma.chatPresence.update({
            where: { roomId_userId: { roomId: room.id, userId: authUser.id } },
            data: { lastSeen: new Date() }
          })
        }
      }

      // Update voice session ping if active
      await prisma.voiceSession.updateMany({
        where: { roomId: room.id, userId: authUser.id, isActive: true },
        data: { lastPing: new Date() }
      })

      // Auto-cleanup stale voice sessions (>60s no ping)
      const sixtySecondsAgo = new Date(Date.now() - 60000)
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
      const presenceTimeout = new Date(Date.now() - 300000) // 5 min window
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
