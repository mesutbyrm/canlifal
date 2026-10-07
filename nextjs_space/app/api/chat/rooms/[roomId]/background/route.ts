export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveChatActor, canManageRoomWords } from '@/lib/chat-banned-words'
import { emitRoomBackgroundChanged } from '@/lib/voice-room-events'

// GET / PATCH /api/chat/rooms/{roomId}/background
// Mobil istemcinin /settings ucuna alternatif kullandığı arka plan kısayolu.
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const room = await prisma.chatRoom.findUnique({
    where: { id: params.roomId },
    select: { backgroundImage: true },
  })
  if (!room) {
    return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
  }
  return NextResponse.json({
    background: room.backgroundImage,
    backgroundImage: room.backgroundImage,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const userId = await resolveChatActor(request)
  if (!userId) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  if (!(await canManageRoomWords(params.roomId, userId))) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
  }
  let body: any = {}
  try { body = await request.json() } catch {}
  const raw = body?.backgroundImage ?? body?.background ?? body?.imageUrl
  const value = typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null
  const room = await prisma.chatRoom.findUnique({
    where: { id: params.roomId },
    select: { id: true },
  })
  if (!room) {
    return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
  }
  await prisma.chatRoom.update({
    where: { id: params.roomId },
    data: { backgroundImage: value },
  })
  emitRoomBackgroundChanged(params.roomId, value)
  return NextResponse.json({ success: true, background: value, backgroundImage: value })
}
