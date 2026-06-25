import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const url = new URL(req.url)
    const after = url.searchParams.get('after')
    const messages = await prisma.gameRoomChat.findMany({
      where: { roomId: params.roomId, ...(after ? { createdAt: { gt: new Date(after) } } : {}) },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    return NextResponse.json(messages)
  } catch (error: any) {
    return NextResponse.json({ error: 'Mesajlar yüklenemedi' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const authUser = await authenticateRequest(req)
    const { message } = await req.json()
    if (!message || typeof message !== 'string' || message.trim().length === 0) return NextResponse.json({ error: 'Mesaj boş olamaz' }, { status: 400 })
    const room = await prisma.gameRoom.findUnique({ where: { id: params.roomId } })
    if (!room) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    // Allow guests to chat too
    const userId = authUser?.id || 'guest_' + Math.random().toString(36).slice(2, 8)
    const userName = (authUser as any)?.name || 'Misafir'
    const msg = await prisma.gameRoomChat.create({ data: { roomId: params.roomId, userId, userName, message: message.trim().slice(0, 200) } })
    return NextResponse.json(msg)
  } catch (error: any) {
    return NextResponse.json({ error: 'Mesaj gönderilemedi' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    const room = await prisma.gameRoom.findUnique({ where: { id: params.roomId } })
    if (!room) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    if (room.player1Id !== authUser.id) return NextResponse.json({ error: 'Sadece oda sahibi yönetebilir' }, { status: 403 })
    const { chatEnabled } = await req.json()
    const updated = await prisma.gameRoom.update({ where: { id: params.roomId }, data: { chatEnabled: !!chatEnabled } })
    return NextResponse.json({ chatEnabled: updated.chatEnabled })
  } catch (error: any) {
    return NextResponse.json({ error: 'Sohbet ayarı değiştirilemedi' }, { status: 500 })
  }
}
