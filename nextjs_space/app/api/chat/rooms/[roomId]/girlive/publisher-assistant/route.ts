export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { buildVoiceRoomReport } from '@/lib/girlive-publisher'

/**
 * GET /api/chat/rooms/{roomId}/girlive/publisher-assistant
 * Yalnız oda sahibi erişebilir. scope=session|day|week|month
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } },
) {
  // Auth
  const mobile = await authenticateRequest(req)
  const web = !mobile ? await getServerSession(authOptions) : null
  const userId = mobile?.id || web?.user?.id
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  const { roomId } = params

  // Oda sahibi kontrolü
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { ownerId: true },
  })
  if (!room) {
    return NextResponse.json({ success: false, error: 'Oda bulunamadı' }, { status: 404 })
  }
  if (room.ownerId !== userId) {
    // Admin/yonetici de görebilir
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!['admin', 'yonetici'].includes(user?.role || '')) {
      return NextResponse.json({ success: false, error: 'Yetkiniz yok' }, { status: 403 })
    }
  }

  const url = new URL(req.url)
  const scope = url.searchParams.get('scope') || 'session'
  const sessionId = url.searchParams.get('sessionId') || null

  if (!['session','day','week','month'].includes(scope)) return NextResponse.json({ error: 'Geçersiz rapor dönemi' }, { status: 400 })
  try {
    const report = await buildVoiceRoomReport(roomId, room.ownerId!, scope, sessionId)
    const sessions = await prisma.roomActivitySession.findMany({ where: { roomId }, orderBy: { startedAt: 'desc' }, take: 20, select: { id: true, startedAt: true, endedAt: true } })
    return NextResponse.json({ success: true, report, sessions })
  } catch (error) {
    console.error('[publisher-report]', error)
    return NextResponse.json({ error: 'Faaliyet oturumu bulunamadı veya rapor alınamadı' }, { status: error instanceof Error && error.message === 'Faaliyet oturumu bulunamadı' ? 404 : 500 })
  }
}
