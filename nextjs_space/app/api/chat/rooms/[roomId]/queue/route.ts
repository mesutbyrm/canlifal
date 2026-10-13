export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveChatActor, canManageRoomWords } from '@/lib/chat-banned-words'

// GET /api/chat/rooms/{roomId}/queue → music-queue takma adı
export { GET } from '../music-queue/route'

// DELETE — kuyruğu temizle (bekleyen şarkı isteklerini oynatıldı işaretle)
export async function DELETE(
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
  const pending = await prisma.chatMessage.findMany({
    where: { roomId: params.roomId, content: { startsWith: '[SONG_REQUEST' } },
    select: { id: true, content: true },
  })
  let cleared = 0
  for (const msg of pending) {
    if (msg.content.includes('[PLAYED]')) continue
    await prisma.chatMessage.update({
      where: { id: msg.id },
      data: { content: msg.content + '[PLAYED]' },
    })
    cleared += 1
  }
  return NextResponse.json({ success: true, cleared, queue: [], total: 0 })
}
