import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { canRespondToJoinRequests, fail, resolveAuthAndRoom } from '@/lib/room-join-auth'
import { emitJoinRequestResolved } from '@/lib/voice-room-events'
import { createNotificationWithPush } from '@/lib/notify'
import { recordAudit } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

/** POST /api/live/rooms/{roomId}/join-request/{requestId}/reject — yalnızca oda sahibi / yönetici. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; requestId: string }> }
) {
  try {
    const { roomId, requestId } = await params
    const ctx = await resolveAuthAndRoom(request, roomId)
    if ('error' in ctx) return ctx.error
    const { user, room } = ctx

    if (!(await canRespondToJoinRequests(room, user.id, user.role))) {
      return fail(403, 'FORBIDDEN', 'Bu işlem için yetkiniz yok')
    }

    const jr = await prisma.roomJoinRequest.findFirst({ where: { id: requestId, roomId: room.id } })
    if (!jr) return fail(404, 'REQUEST_NOT_FOUND', 'İstek bulunamadı')
    if (jr.status !== 'pending') {
      return fail(409, 'ALREADY_RESOLVED', 'Bu istek zaten yanıtlandı', { status: jr.status })
    }

    // Yarış koşulu: yalnızca hâlâ "pending" ise güncelle.
    const res = await prisma.roomJoinRequest.updateMany({
      where: { id: jr.id, status: 'pending' },
      data: { status: 'rejected', respondedAt: new Date() },
    })
    if (res.count === 0) return fail(409, 'ALREADY_RESOLVED', 'Bu istek zaten yanıtlandı')

    emitJoinRequestResolved(room.id, { requestId: jr.id, userId: jr.requesterId, status: 'rejected', handledBy: user.id })
    createNotificationWithPush({
      userId: jr.requesterId,
      type: 'room_join_request_result',
      title: 'Oda giriş isteği',
      message: 'Oda sahibi giriş isteğinizi reddetti.',
      fromUserId: user.id,
      targetPath: '/voice-room/' + (room.slug || room.id),
      targetId: room.id,
      urgent: true,
    }).catch(() => {})
    await recordAudit({
      actorId: user.id,
      action: 'room_join_request_reject',
      targetType: 'RoomJoinRequest',
      targetId: jr.id,
      description: 'Giriş isteği rejected',
      metadata: { roomId: room.id, requesterId: jr.requesterId },
    })
    return NextResponse.json({ success: true, data: { requestId: jr.id, status: 'rejected' } })
  } catch (e) {
    console.error('join-request reject error:', e)
    return fail(500, 'INTERNAL_ERROR', 'İşlem yapılamadı')
  }
}
