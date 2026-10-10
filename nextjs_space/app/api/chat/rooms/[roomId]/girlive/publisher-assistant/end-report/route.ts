export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { buildVoiceRoomReport } from '@/lib/girlive-publisher'
import { emitChatEvent } from '@/lib/chat-events'
import { getGirLiveBotId } from '@/lib/girlive-bot'

/**
 * GET /api/chat/rooms/{roomId}/girlive/publisher-assistant/end-report
 * Oda kapanınca gün sonu özeti. Aynı sessionId ile idempotent.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } },
) {
  const mobile = await authenticateRequest(req)
  const web = !mobile ? await getServerSession(authOptions) : null
  const userId = mobile?.id || web?.user?.id
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  const { roomId } = params

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { ownerId: true },
  })
  if (!room) {
    return NextResponse.json({ success: false, error: 'Oda bulunamadı' }, { status: 404 })
  }
  if (room.ownerId !== userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!['admin', 'yonetici'].includes(user?.role || '')) {
      return NextResponse.json({ success: false, error: 'Yetkiniz yok' }, { status: 403 })
    }
  }

  const url = new URL(req.url)
  const sessionId = url.searchParams.get('sessionId') || `end-${roomId}-${new Date().toISOString().slice(0, 10)}`

  const report = await buildVoiceRoomReport(roomId, room.ownerId!, 'day', sessionId)
  report.endedAt = new Date().toISOString()

  // Yayıncıya özel SSE gönder (herkese açık sohbete yazmıyoruz)
  try {
    emitChatEvent(roomId, 'room', {
      event: 'girlive_publisher',
      roomId,
      targetUserId: room.ownerId,
      kind: 'end_report',
      text: `📊 Gün sonu: ${report.grossGiftJeton} brüt jeton, ${report.uniqueVisitors} ziyaretçi, ${report.pkCompleted} PK`,
      sessionId,
      report,
    })
  } catch (e) {
    console.error('[GirLive] end-report SSE hatası:', e)
  }

  return NextResponse.json({ success: true, report })
}
