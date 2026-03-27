import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const count = await prisma.gameRoomViewer.count({ where: { roomId: params.roomId } })
    return NextResponse.json({ viewerCount: count })
  } catch { return NextResponse.json({ error: 'Hata' }, { status: 500 }) }
}

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    const userName = (session.user as any)?.name || 'İzleyici'
    await prisma.gameRoomViewer.upsert({
      where: { roomId_userId: { roomId: params.roomId, userId: session.user.id } },
      update: { joinedAt: new Date() },
      create: { roomId: params.roomId, userId: session.user.id, userName },
    })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Katılınamadı' }, { status: 500 }) }
}

export async function DELETE(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    await prisma.gameRoomViewer.deleteMany({ where: { roomId: params.roomId, userId: session.user.id } })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Hata' }, { status: 500 }) }
}
