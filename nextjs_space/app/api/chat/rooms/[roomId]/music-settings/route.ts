export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveChatActor, canManageRoomWords } from '@/lib/chat-banned-words'
import { DEFAULT_MUSIC_SETTINGS, serializeMusicSettings } from '@/lib/chat-music-settings'

// GET / PATCH /api/chat/rooms/{roomId}/music-settings
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const room = await prisma.chatRoom.findUnique({
    where: { id: params.roomId },
    select: {
      musicEnabled: true,
      musicRequestCost: true,
      videoRequestCost: true,
      maxMusicQueue: true,
    },
  })
  if (!room) {
    return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
  }
  return NextResponse.json(serializeMusicSettings(room))
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

  const data: Record<string, unknown> = {}
  if (typeof body?.musicEnabled === 'boolean') data.musicEnabled = body.musicEnabled

  const numeric: Array<[string, number, number]> = [
    ['musicRequestCost', 0, 100000],
    ['videoRequestCost', 0, 100000],
    ['maxMusicQueue', 1, 500],
  ]
  for (const [key, min, max] of numeric) {
    if (body?.[key] === null) { data[key] = null; continue }
    if (body?.[key] === undefined) continue
    const n = Number(body[key])
    if (!Number.isFinite(n) || n < min || n > max) {
      return NextResponse.json({ error: `${key} geçersiz (${min}-${max})` }, { status: 400 })
    }
    data[key] = Math.round(n)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
  }

  const room = await prisma.chatRoom.findUnique({
    where: { id: params.roomId },
    select: { id: true },
  })
  if (!room) {
    return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
  }

  const updated = await prisma.chatRoom.update({
    where: { id: params.roomId },
    data,
    select: {
      musicEnabled: true,
      musicRequestCost: true,
      videoRequestCost: true,
      maxMusicQueue: true,
    },
  })
  return NextResponse.json({ success: true, ...serializeMusicSettings(updated), defaults: DEFAULT_MUSIC_SETTINGS })
}
