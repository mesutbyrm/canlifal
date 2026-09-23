import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { canModerateSpeakRequests, serializeSpeakRequest, loadRequestUser } from '@/lib/speak-requests'
import { emitVoiceRequestAccepted } from '@/lib/voice-room-events'

export const dynamic = 'force-dynamic'

/**
 * POST /api/chat/rooms/{roomId}/speak-requests/{targetUserId}/approve
 * İsteği onaylar ve kullanıcıya `voice` (+) rolünü verir (daha yüksek rolü varsa dokunmaz).
 * SSE: room_event → { event: 'voice_request_accepted', userId, message }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; targetUserId: string }> }
) {
  try {
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const currentUserId = mobileUser?.id || session?.user?.id
    if (!currentUserId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId, targetUserId } = await params
    const { canHandle } = await canModerateSpeakRequests(roomId, currentUserId)
    if (!canHandle) {
      return NextResponse.json({ error: 'Konuşma isteklerini yönetme yetkiniz yok' }, { status: 403 })
    }

    const existing = await prisma.chatSpeakRequest.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Konuşma isteği bulunamadı' }, { status: 404 })
    }

    const updated = await prisma.chatSpeakRequest.update({
      where: { id: existing.id },
      data: { status: 'approved', reason: null, handledBy: currentUserId, handledAt: new Date() }
    })

    // Ses yetkisi ver (mevcut rolü daha yüksekse koru)
    const currentRole = await prisma.chatUserRole.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } }
    })
    if (!currentRole) {
      await prisma.chatUserRole.create({
        data: { roomId, userId: targetUserId, role: 'voice', grantedBy: currentUserId }
      }).catch(() => {})
    }

    const [{ userName, avatar }, handler] = await Promise.all([
      loadRequestUser(targetUserId),
      prisma.user.findUnique({ where: { id: currentUserId }, select: { name: true } })
    ])

    emitVoiceRequestAccepted(roomId, { userId: targetUserId, userName, avatar }, {
      requestId: updated.id,
      handledBy: currentUserId,
      handledByName: handler?.name || undefined
    })

    return NextResponse.json({
      success: true,
      request: serializeSpeakRequest(updated, { name: userName, image: avatar })
    })
  } catch (error) {
    console.error('[speak-requests/approve] error:', error)
    return NextResponse.json({ error: 'Konuşma isteği onaylanamadı' }, { status: 500 })
  }
}
