import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Helper to check if user can control music
async function canControlMusic(roomId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  const isGlobalAdmin = user?.role === 'admin' || user?.role === 'yonetici'
  
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId }, select: { ownerId: true } })
  const isOwner = room?.ownerId === userId

  if (isGlobalAdmin || isOwner) return true

  // Check chat role
  const chatRole = await prisma.chatUserRole.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true }
  })
  const modRoles = ['superadmin', 'founder', 'sop', 'admin', 'op']
  return chatRole?.role ? modRoles.includes(chatRole.role) : false
}

// GET: Get currently playing music for a room
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      select: {
        currentMusicVideoId: true,
        currentMusicTitle: true,
        currentMusicStartedAt: true,
      }
    })
    if (!room) {
      return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    }
    return NextResponse.json({
      videoId: room.currentMusicVideoId,
      title: room.currentMusicTitle,
      startedAt: room.currentMusicStartedAt,
    })
  } catch (error) {
    console.error('Get music error:', error)
    return NextResponse.json({ error: 'Müzik bilgisi alınamadı' }, { status: 500 })
  }
}

// POST: Set currently playing music
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const allowed = await canControlMusic(params.roomId, session.user.id)
    if (!allowed) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const { videoId, title } = await req.json()
    if (!videoId || !title) {
      return NextResponse.json({ error: 'Video bilgisi eksik' }, { status: 400 })
    }

    await prisma.chatRoom.update({
      where: { id: params.roomId },
      data: {
        currentMusicVideoId: videoId,
        currentMusicTitle: title,
        currentMusicStartedAt: new Date(),
      }
    })

    // Send a system message about the music
    await prisma.chatMessage.create({
      data: {
        roomId: params.roomId,
        userId: session.user.id,
        content: `🎶 Şu an çalıyor: ${title}`,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Set music error:', error)
    return NextResponse.json({ error: 'Müzik ayarlanamadı' }, { status: 500 })
  }
}

// DELETE: Stop music
export async function DELETE(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const allowed = await canControlMusic(params.roomId, session.user.id)
    if (!allowed) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    await prisma.chatRoom.update({
      where: { id: params.roomId },
      data: {
        currentMusicVideoId: null,
        currentMusicTitle: null,
        currentMusicStartedAt: null,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Stop music error:', error)
    return NextResponse.json({ error: 'Müzik durdurulamadı' }, { status: 500 })
  }
}
