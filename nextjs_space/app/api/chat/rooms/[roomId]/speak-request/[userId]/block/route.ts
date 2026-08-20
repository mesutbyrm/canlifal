import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { canModerateSpeakRequests, loadRequestUser } from '@/lib/speak-requests'
import { emitVoiceRequestBlocked, emitVoiceRequestUnblocked } from '@/lib/voice-room-events'

export const dynamic = 'force-dynamic'

async function authAndAuthorize(request: NextRequest, roomId: string) {
  const mobileUser = await authenticateRequest(request)
  const session = !mobileUser ? await getServerSession(authOptions) : null
  const currentUserId = mobileUser?.id || session?.user?.id
  if (!currentUserId) {
    return { error: NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 }) }
  }
  const { canBlock } = await canModerateSpeakRequests(roomId, currentUserId)
  if (!canBlock) {
    return {
      error: NextResponse.json(
        { error: 'Konuşma isteklerini engelleme yetkiniz yok' },
        { status: 403 }
      )
    }
  }
  return { currentUserId }
}

/**
 * POST /api/chat/rooms/{roomId}/speak-request/{userId}/block
 * Body: { reason?, durationMinutes? }
 *
 * Oda bazlı konuşma isteği engeli. Engellenen kullanıcı tekrar
 * POST /speak-request yaptığında 403 + açık mesaj alır.
 * SSE: room_event → { event: 'voice_request_blocked', userId, message }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; userId?: string; targetUserId?: string }> }
) {
  try {
    const resolved = await params
    const roomId = resolved.roomId
    const targetUserId = resolved.userId || resolved.targetUserId || ''
    if (!targetUserId) {
      return NextResponse.json({ error: 'Kullanıcı kimliği gerekli' }, { status: 400 })
    }
    const gate = await authAndAuthorize(request, roomId)
    if (gate.error) return gate.error
    const currentUserId = gate.currentUserId!

    if (currentUserId === targetUserId) {
      return NextResponse.json({ error: 'Kendinizi engelleyemezsiniz' }, { status: 400 })
    }

    let body: any = {}
    try { body = await request.json() } catch { /* body opsiyonel */ }
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 200) : null
    const durationMinutes = Number(body?.durationMinutes)
    const expiresAt = Number.isFinite(durationMinutes) && durationMinutes > 0
      ? new Date(Date.now() + durationMinutes * 60_000)
      : null

    const block = await prisma.chatSpeakBlock.upsert({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      create: { roomId, userId: targetUserId, blockedBy: currentUserId, reason, expiresAt },
      update: { blockedBy: currentUserId, reason, expiresAt }
    })

    // Bekleyen istek varsa reddedilmiş sayılır
    await prisma.chatSpeakRequest.updateMany({
      where: { roomId, userId: targetUserId, status: 'pending' },
      data: { status: 'rejected', reason: reason || 'Engellendi', handledBy: currentUserId, handledAt: new Date() }
    })

    const [{ userName, avatar }, handler] = await Promise.all([
      loadRequestUser(targetUserId),
      prisma.user.findUnique({ where: { id: currentUserId }, select: { name: true } })
    ])

    emitVoiceRequestBlocked(roomId, { userId: targetUserId, userName, avatar }, {
      handledBy: currentUserId,
      handledByName: handler?.name || undefined,
      reason: reason ?? undefined,
      expiresAt: block.expiresAt ? block.expiresAt.toISOString() : null,
      message: reason
        ? `Bu odada konuşma isteği gönderemezsiniz: ${reason}`
        : 'Bu odada konuşma isteği gönderme izniniz kaldırıldı.'
    })

    return NextResponse.json({
      success: true,
      block: {
        roomId,
        userId: targetUserId,
        blockedBy: currentUserId,
        reason: block.reason ?? null,
        expiresAt: block.expiresAt ? block.expiresAt.toISOString() : null,
        createdAt: block.createdAt.toISOString()
      }
    })
  } catch (error) {
    console.error('[speak-request/block] POST error:', error)
    return NextResponse.json({ error: 'Konuşma isteği engeli uygulanamadı' }, { status: 500 })
  }
}

/**
 * DELETE /api/chat/rooms/{roomId}/speak-request/{userId}/block — engeli kaldırır.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; userId?: string; targetUserId?: string }> }
) {
  try {
    const resolved = await params
    const roomId = resolved.roomId
    const targetUserId = resolved.userId || resolved.targetUserId || ''
    if (!targetUserId) {
      return NextResponse.json({ error: 'Kullanıcı kimliği gerekli' }, { status: 400 })
    }
    const gate = await authAndAuthorize(request, roomId)
    if (gate.error) return gate.error
    const currentUserId = gate.currentUserId!

    const existing = await prisma.chatSpeakBlock.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Engel kaydı bulunamadı' }, { status: 404 })
    }

    await prisma.chatSpeakBlock.delete({ where: { id: existing.id } })

    const { userName, avatar } = await loadRequestUser(targetUserId)
    emitVoiceRequestUnblocked(roomId, { userId: targetUserId, userName, avatar }, currentUserId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[speak-request/block] DELETE error:', error)
    return NextResponse.json({ error: 'Engel kaldırılamadı' }, { status: 500 })
  }
}
