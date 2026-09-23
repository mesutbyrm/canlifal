export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseBannedWords, resolveChatActor, canManageRoomWords } from '@/lib/chat-banned-words'

// DELETE /banned-words/{word} — kelimeyi kaldır
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string; word: string } }
) {
  const userId = await resolveChatActor(request)
  if (!userId) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  if (!(await canManageRoomWords(params.roomId, userId))) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
  }
  const target = decodeURIComponent(params.word || '').trim().toLocaleLowerCase('tr')
  const room = await prisma.chatRoom.findUnique({
    where: { id: params.roomId },
    select: { bannedWords: true },
  })
  if (!room) {
    return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
  }
  const words = parseBannedWords(room.bannedWords)
  const next = words.filter((w) => w.toLocaleLowerCase('tr') !== target)
  if (next.length !== words.length) {
    await prisma.chatRoom.update({
      where: { id: params.roomId },
      data: { bannedWords: next.length > 0 ? JSON.stringify(next) : null },
    })
  }
  return NextResponse.json({ success: true, words: next })
}
