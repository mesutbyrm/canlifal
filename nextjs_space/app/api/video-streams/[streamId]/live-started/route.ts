import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { notifyFollowersLiveStart } from '@/lib/live-start-notify'

export const dynamic = 'force-dynamic'

/**
 * POST /api/video-streams/:streamId/live-started
 * Called by mobile app when stream actually goes live.
 * Triggers push notifications to followers if not already sent during create.
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
      select: {
        id: true,
        userId: true,
        title: true,
        status: true,
        user: { select: { name: true } },
      },
    })

    if (!stream) {
      return NextResponse.json({ error: 'Yayın bulunamadı' }, { status: 404 })
    }

    if (stream.userId !== authUser.id) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    // Yayın oluşturulurken bildirim zaten gittiyse ortak dedupeKey ikinci kez göndermez.
    const notifiedCount = await notifyFollowersLiveStart({
      streamerId: authUser.id,
      streamerName: stream.user.name || authUser.name || 'Falcı',
      streamId: stream.id,
      streamTitle: stream.title,
    })

    return NextResponse.json({ success: true, notifiedCount })
  } catch (error) {
    console.error('live-started error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
