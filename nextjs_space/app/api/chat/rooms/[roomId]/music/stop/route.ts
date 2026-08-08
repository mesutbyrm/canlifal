import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitDjUpdate } from '@/lib/chat-dj-events'
import { canControlMusic } from '../route'

export const dynamic = 'force-dynamic'

// POST /api/chat/rooms/{roomId}/music/stop
// Müziği tamamen durdurur: çalan şarkıyı temizler VE kuyruktaki tüm bekleyen istekleri
// çalınmış olarak işaretler; böylece otomatik olarak yeni şarkı başlamaz.
// (skip ucundan farkı: skip bir sonrakine geçer, stop her şeyi durdurur.)
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const allowed = await canControlMusic(params.roomId, userId)
    if (!allowed) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    // Çalan şarkıyı temizle
    await prisma.chatRoom.update({
      where: { id: params.roomId },
      data: {
        currentMusicVideoId: null,
        currentMusicTitle: null,
        currentMusicStartedAt: null,
        currentMusicDuration: null,
      }
    })

    // Kuyruktaki tüm bekleyen istekleri çalınmış olarak işaretle (otomatik ilerlemeyi durdur)
    const pending = await prisma.chatMessage.findMany({
      where: {
        roomId: params.roomId,
        content: { startsWith: '[SONG_REQUEST' },
        NOT: { content: { contains: '[PLAYED]' } },
      },
      select: { id: true, content: true },
    })
    for (const msg of pending) {
      await prisma.chatMessage.update({
        where: { id: msg.id },
        data: { content: msg.content + '[PLAYED]' },
      })
    }

    await emitDjUpdate(params.roomId)
    return NextResponse.json({ success: true, cleared: pending.length })
  } catch (error) {
    console.error('Stop music error:', error)
    return NextResponse.json({ error: 'Müzik durdurulamadı' }, { status: 500 })
  }
}
