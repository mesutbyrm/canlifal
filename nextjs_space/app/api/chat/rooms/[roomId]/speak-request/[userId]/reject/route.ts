import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { canModerateSpeakRequests, serializeSpeakRequest, loadRequestUser } from '@/lib/speak-requests'
import { emitVoiceRequestRejected } from '@/lib/voice-room-events'

export const dynamic = 'force-dynamic'

/**
 * POST | DELETE /api/chat/rooms/{roomId}/speak-request/{userId}/reject
 * Body (opsiyonel): { reason? }
 *
 * Oda sahibi / admin / ses yetkisi verebilen roller bekleyen konuşma isteğini reddeder.
 * Odaya SSE `room_event` → { event: 'voice_request_rejected', userId, message } gider.
 */
async function reject(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; userId?: string; targetUserId?: string }> }
) {
  try {
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const currentUserId = mobileUser?.id || session?.user?.id
    if (!currentUserId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const resolved = await params
    const roomId = resolved.roomId
    // Yol varyantı: /speak-request/{userId}/... veya /speak-requests/{targetUserId}/...
    const targetUserId = resolved.userId || resolved.targetUserId || ''
    if (!targetUserId) {
      return NextResponse.json({ error: 'Kullanıcı kimliği gerekli' }, { status: 400 })
    }

    const { canHandle } = await canModerateSpeakRequests(roomId, currentUserId)
    if (!canHandle) {
      return NextResponse.json(
        { error: 'Konuşma isteklerini yönetme yetkiniz yok' },
        { status: 403 }
      )
    }

    let body: any = {}
    try { body = await request.json() } catch { /* body opsiyonel */ }
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 200) : null

    const existing = await prisma.chatSpeakRequest.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Konuşma isteği bulunamadı' }, { status: 404 })
    }

    const updated = await prisma.chatSpeakRequest.update({
      where: { id: existing.id },
      data: { status: 'rejected', reason, handledBy: currentUserId, handledAt: new Date() }
    })

    const [{ userName, avatar }, handler] = await Promise.all([
      loadRequestUser(targetUserId),
      prisma.user.findUnique({ where: { id: currentUserId }, select: { name: true } })
    ])

    emitVoiceRequestRejected(roomId, { userId: targetUserId, userName, avatar }, {
      requestId: updated.id,
      handledBy: currentUserId,
      handledByName: handler?.name || undefined,
      reason: reason ?? undefined,
      message: reason
        ? `Konuşma isteğiniz reddedildi: ${reason}`
        : 'Konuşma isteğiniz reddedildi.'
    })

    return NextResponse.json({
      success: true,
      request: serializeSpeakRequest(updated, { name: userName, image: avatar })
    })
  } catch (error) {
    console.error('[speak-request/reject] error:', error)
    return NextResponse.json({ error: 'Konuşma isteği reddedilemedi' }, { status: 500 })
  }
}

export const POST = reject
export const DELETE = reject
