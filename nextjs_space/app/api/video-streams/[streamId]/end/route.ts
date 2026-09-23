import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitStreamEvent } from '@/lib/stream-events'

export const dynamic = 'force-dynamic'

/**
 * POST /api/video-streams/:streamId/end
 * End a live stream. Only the broadcaster can end it.
 * Auth: Bearer JWT (mobile) or NextAuth session (web).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      select: { id: true, userId: true, status: true }
    })

    if (!stream) {
      return NextResponse.json({ error: 'Yayın bulunamadı' }, { status: 404 })
    }

    // Only broadcaster or admin can end
    const isAdmin = authUser.role === 'admin' || authUser.role === 'yonetici'
    if (stream.userId !== authUser.id && !isAdmin) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    if (stream.status === 'ended') {
      return NextResponse.json({ success: true, message: 'Yayın zaten sona ermiş' })
    }

    // Update stream status
    await prisma.videoStream.update({
      where: { id: params.streamId },
      data: {
        status: 'ended',
        endedAt: new Date(),
      }
    })

    // Mark all active viewers as left
    await prisma.videoStreamViewer.updateMany({
      where: { streamId: params.streamId, leftAt: null },
      data: { leftAt: new Date() }
    })

    // Emit streamEnded event to all SSE listeners
    emitStreamEvent(params.streamId, 'streamEnded', {
      type: 'streamEnded',
      event: 'STREAM_ENDED',
      streamId: params.streamId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Stream end error:', error)
    return NextResponse.json({ error: 'Yayın sonlandırılamadı' }, { status: 500 })
  }
}
