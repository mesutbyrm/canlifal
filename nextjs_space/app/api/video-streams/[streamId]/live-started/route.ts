import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { sendPushToMultipleUsers } from '@/lib/onesignal'

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

    // Get followers (max 500)
    const followers = await prisma.follow.findMany({
      where: { followingId: authUser.id },
      select: { followerId: true },
      take: 500,
    })

    if (followers.length > 0) {
      const followerIds = followers.map((f: any) => f.followerId)
      const userName = stream.user.name || authUser.name || 'Falcı'
      const title = `${userName} canlı yayında`
      const body = stream.title || 'Canlı Fal'

      // Create in-app notifications
      await prisma.notification.createMany({
        data: followerIds.map((fId: string) => ({
          userId: fId,
          type: 'stream_live',
          title: `🔴 ${title}`,
          message: body,
          fromUserId: authUser.id,
          fromUserName: userName,
          data: JSON.stringify({ streamId: stream.id }),
        })),
      })

      // Send push to followers
      sendPushToMultipleUsers(followerIds, {
        title: `🔴 ${title}`,
        body,
        type: 'live',
        targetPath: '/live',
        targetId: stream.id,
        urgent: true,
      }).catch(err => console.error('live-started push error:', err))
    }

    return NextResponse.json({ success: true, notifiedCount: followers.length })
  } catch (error) {
    console.error('live-started error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
