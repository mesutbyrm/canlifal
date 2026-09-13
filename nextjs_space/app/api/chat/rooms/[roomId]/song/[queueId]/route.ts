export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveChatActor, canManageRoomWords } from '@/lib/chat-banned-words'

// DELETE /api/chat/rooms/{roomId}/song/{queueId} — kuyruktan tek şarkı çıkar
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string; queueId: string } }
) {
  const userId = await resolveChatActor(request)
  if (!userId) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const msg = await prisma.chatMessage.findFirst({
    where: { id: params.queueId, roomId: params.roomId },
    select: { id: true, content: true, userId: true },
  })
  if (!msg || !msg.content.startsWith('[SONG_REQUEST')) {
    return NextResponse.json({ error: 'Kuyruk kaydı bulunamadı' }, { status: 404 })
  }
  const isOwnRequest = msg.userId === userId
  if (!isOwnRequest && !(await canManageRoomWords(params.roomId, userId))) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
  }
  if (!msg.content.includes('[PLAYED]')) {
    await prisma.chatMessage.update({
      where: { id: msg.id },
      data: { content: msg.content + '[PLAYED]' },
    })
  }
  return NextResponse.json({ success: true, removedId: msg.id })
}
