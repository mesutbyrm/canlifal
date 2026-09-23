export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getMediaInactivityTimeoutMs } from '@/lib/stream-auto-close'

/**
 * POST /api/video-streams/:streamId/media-heartbeat
 *
 * Called by the BROADCASTER client every ~30s while it is actually publishing
 * audio/video. Refreshes `lastMediaAt`, which the media-inactivity auto-close
 * rule uses. Auth: Bearer JWT (mobile) or NextAuth session (web).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      select: { id: true, userId: true, status: true },
    })
    if (!stream) {
      return NextResponse.json(
        { success: false, error: { code: 'STREAM_NOT_FOUND', message: 'Yayın bulunamadı' } },
        { status: 404 }
      )
    }
    if (stream.userId !== authUser.id) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_OWNER', message: 'Yetkiniz yok' } },
        { status: 403 }
      )
    }
    if (stream.status !== 'live') {
      return NextResponse.json(
        { success: false, error: { code: 'STREAM_NOT_LIVE', message: 'Yayın aktif değil' } },
        { status: 400 }
      )
    }

    const now = new Date()
    await prisma.videoStream.update({
      where: { id: stream.id },
      data: { lastMediaAt: now },
    })

    const timeoutMs = await getMediaInactivityTimeoutMs()
    return NextResponse.json({
      success: true,
      data: {
        streamId: stream.id,
        lastMediaAt: now.toISOString(),
        timeoutMinutes: timeoutMs > 0 ? Math.round(timeoutMs / 60000) : 0,
        recommendedIntervalSeconds: 30,
      },
    })
  } catch (e) {
    console.error('[media-heartbeat] error:', e)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Bir hata oluştu' } },
      { status: 500 }
    )
  }
}
