export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  MAX_BANNED_WORDS,
  parseBannedWords,
  resolveChatActor,
  canManageRoomWords,
} from '@/lib/chat-banned-words'

// GET — oda yasaklı kelime listesi
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const userId = await resolveChatActor(request)
  if (!userId) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const room = await prisma.chatRoom.findUnique({
    where: { id: params.roomId },
    select: { bannedWords: true },
  })
  if (!room) {
    return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
  }
  return NextResponse.json({ words: parseBannedWords(room.bannedWords) })
}

// POST { word } — kelime ekle
export async function POST(
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
  const word = String(body?.word ?? '').trim()
  if (!word) {
    return NextResponse.json({ error: 'word gerekli' }, { status: 400 })
  }
  const room = await prisma.chatRoom.findUnique({
    where: { id: params.roomId },
    select: { bannedWords: true },
  })
  if (!room) {
    return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
  }
  const words = parseBannedWords(room.bannedWords)
  const exists = words.some((w) => w.toLocaleLowerCase('tr') === word.toLocaleLowerCase('tr'))
  if (!exists) {
    if (words.length >= MAX_BANNED_WORDS) {
      return NextResponse.json({ error: `En fazla ${MAX_BANNED_WORDS} kelime eklenebilir`, words }, { status: 400 })
    }
    words.push(word)
    await prisma.chatRoom.update({
      where: { id: params.roomId },
      data: { bannedWords: JSON.stringify(words) },
    })
  }
  return NextResponse.json({ success: true, words })
}
