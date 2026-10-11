import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { isUserBanned } from '@/lib/chat-permissions'
import {
  getActiveSpeakBlock,
  serializeSpeakRequest,
  loadRequestUser
} from '@/lib/speak-requests'
import { emitVoiceRequest, emitVoiceRequestCancelled } from '@/lib/voice-room-events'

export const dynamic = 'force-dynamic'

async function auth(request: NextRequest) {
  const mobileUser = await authenticateRequest(request)
  const session = !mobileUser ? await getServerSession(authOptions) : null
  return mobileUser?.id || session?.user?.id || null
}

/**
 * GET /api/chat/rooms/{roomId}/speak-request
 * Kullanıcının kendi konuşma isteği durumu + engel bilgisi.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const userId = await auth(request)
    if (!userId) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    const { roomId } = await params

    const [req, block, user] = await Promise.all([
      prisma.chatSpeakRequest.findUnique({ where: { roomId_userId: { roomId, userId } } }),
      getActiveSpeakBlock(roomId, userId),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, image: true } })
    ])

    return NextResponse.json({
      request: req ? serializeSpeakRequest(req, user) : null,
      blocked: !!block,
      blockReason: block?.reason ?? null,
      blockExpiresAt: block?.expiresAt ? block.expiresAt.toISOString() : null
    })
  } catch (error) {
    console.error('[speak-request] GET error:', error)
    return NextResponse.json({ error: 'Konuşma isteği durumu alınamadı' }, { status: 500 })
  }
}

/**
 * POST /api/chat/rooms/{roomId}/speak-request
 * Body: { message? }
 * Kullanıcı el kaldırır. Engelliyse 403 + açık mesaj döner.
 * Oda sahibi/admin/yetkili rollere SSE `voice_request` + `hand_raised` gider.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const userId = await auth(request)
    if (!userId) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    const { roomId } = await params

    const room = await prisma.chatRoom.findUnique({ where: { id: roomId }, select: { id: true } })
    if (!room) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })

    if (await isUserBanned(roomId, userId)) {
      return NextResponse.json({ error: 'Bu odadan yasaklandınız' }, { status: 403 })
    }

    const block = await getActiveSpeakBlock(roomId, userId)
    if (block) {
      return NextResponse.json(
        {
          error: block.reason
            ? `Bu odada konuşma isteği gönderemezsiniz: ${block.reason}`
            : 'Bu odada konuşma isteği gönderme izniniz oda yönetimi tarafından kaldırıldı.',
          blocked: true,
          blockReason: block.reason ?? null,
          blockExpiresAt: block.expiresAt ? block.expiresAt.toISOString() : null
        },
        { status: 403 }
      )
    }

    let body: any = {}
    try { body = await request.json() } catch { /* body opsiyonel */ }
    const message = typeof body?.message === 'string' ? body.message.slice(0, 200) : null

    const req = await prisma.chatSpeakRequest.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId, message, status: 'pending' },
      update: { status: 'pending', message, reason: null, handledBy: null, handledAt: null }
    })

    const { userName, avatar } = await loadRequestUser(userId)
    emitVoiceRequest(roomId, { userId, userName, avatar }, { requestId: req.id, message: message ?? undefined })

    return NextResponse.json({
      success: true,
      request: serializeSpeakRequest(req, { name: userName, image: avatar })
    })
  } catch (error) {
    console.error('[speak-request] POST error:', error)
    return NextResponse.json({ error: 'Konuşma isteği gönderilemedi' }, { status: 500 })
  }
}

/**
 * DELETE /api/chat/rooms/{roomId}/speak-request
 * Kullanıcı kendi bekleyen isteğini iptal eder.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const userId = await auth(request)
    if (!userId) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    const { roomId } = await params

    const existing = await prisma.chatSpeakRequest.findUnique({
      where: { roomId_userId: { roomId, userId } }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Bekleyen konuşma isteği bulunamadı' }, { status: 404 })
    }

    await prisma.chatSpeakRequest.update({
      where: { id: existing.id },
      data: { status: 'cancelled', handledBy: userId, handledAt: new Date() }
    })

    const { userName, avatar } = await loadRequestUser(userId)
    emitVoiceRequestCancelled(roomId, { userId, userName, avatar }, existing.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[speak-request] DELETE error:', error)
    return NextResponse.json({ error: 'Konuşma isteği iptal edilemedi' }, { status: 500 })
  }
}
