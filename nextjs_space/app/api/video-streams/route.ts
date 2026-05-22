import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { sendPushToMultipleUsers } from '@/lib/onesignal'
import { logActivity } from '@/lib/activity-logger'
import { getPlatformSetting } from '@/lib/agency-commission'

/**
 * Notify all followers of a user that they went live.
 */
async function notifyFollowersOfLiveStream(userId: string, userName: string, streamId: string, streamTitle: string) {
  // Get all follower IDs (max 500 for push)
  const followers = await prisma.follow.findMany({
    where: { followingId: userId },
    select: { followerId: true },
    take: 500,
  })

  if (followers.length === 0) return

  const followerIds = followers.map((f: any) => f.followerId)
  const title = `${userName} canlı yayında`
  const body = streamTitle || 'Canlı Fal'

  // Create in-app notifications in bulk
  await prisma.notification.createMany({
    data: followerIds.map((fId: any) => ({
      userId: fId,
      type: 'stream_live',
      title: `🔴 ${title}`,
      message: body,
      fromUserId: userId,
      fromUserName: userName,
      data: JSON.stringify({ streamId }),
    }))
  })

  // Send push notification with mobile navigation data
  sendPushToMultipleUsers(followerIds, {
    title: `🔴 ${title}`,
    body,
    type: 'live',
    targetPath: '/live',
    targetId: streamId,
    urgent: true,
  }).catch(err => console.error('Live stream push error:', err))
}

export async function GET() {
  try {
    // Cache live stream list for 10 seconds - prevents DB storm from concurrent homepage polls
    const { getCached } = await import('@/lib/cache')
    const result = await getCached('streams:live_list', 10, async () => {
      const streams = await prisma.videoStream.findMany({
        where: { status: 'live' },
        orderBy: { startedAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, image: true }
          },
          _count: {
            select: { comments: true, likes: true }
          }
        }
      })

      const streamIds = streams.map((s: any) => s.id)
      const viewerCounts = await prisma.videoStreamViewer.groupBy({
        by: ['streamId'],
        where: { streamId: { in: streamIds }, leftAt: null },
        _count: { id: true }
      })
      const viewerCountMap = new Map(viewerCounts.map((v: any) => [v.streamId, v._count.id]))

      return streams.map((s: any) => ({
        ...s,
        viewerCount: viewerCountMap.get(s.id) || 0,
        likeCount: s._count.likes,
        commentCount: s._count.comments
      }))
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching streams:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Check if user is an approved live fortune teller
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        applicationStatus: true,
        isActive: true,
        isBanned: true,
        isFrozen: true
      }
    })

    // If no teller profile or not approved, deny access
    if (!teller) {
      return NextResponse.json({ 
        error: 'NOT_A_TELLER',
        message: 'You need to apply as a live fortune teller first'
      }, { status: 403 })
    }

    if (teller.applicationStatus !== 'approved') {
      return NextResponse.json({ 
        error: 'NOT_APPROVED',
        message: 'Your live fortune teller application is still pending or was rejected',
        status: teller.applicationStatus
      }, { status: 403 })
    }

    if (!teller.isActive || teller.isBanned || teller.isFrozen) {
      return NextResponse.json({ 
        error: 'ACCOUNT_RESTRICTED',
        message: 'Your live fortune teller account is currently restricted'
      }, { status: 403 })
    }

    // Check cooldown: if user's last stream was auto-closed, enforce cooldown period
    const cooldownStr = await getPlatformSetting('stream_reopen_cooldown', '30')
    const cooldownMinutes = parseInt(cooldownStr) || 30
    
    if (cooldownMinutes > 0) {
      const lastAutoClosedStream = await prisma.videoStream.findFirst({
        where: {
          userId: session.user.id,
          autoClosedAt: { not: null }
        },
        orderBy: { autoClosedAt: 'desc' },
        select: { autoClosedAt: true }
      })

      if (lastAutoClosedStream?.autoClosedAt) {
        const cooldownMs = cooldownMinutes * 60 * 1000
        const elapsed = Date.now() - new Date(lastAutoClosedStream.autoClosedAt).getTime()
        if (elapsed < cooldownMs) {
          const remainingMin = Math.ceil((cooldownMs - elapsed) / 60000)
          return NextResponse.json({
            error: 'COOLDOWN_ACTIVE',
            message: `Yayınınız otomatik kapatıldığı için ${remainingMin} dakika daha beklemeniz gerekiyor.`,
            remainingMinutes: remainingMin
          }, { status: 429 })
        }
      }
    }

    const { title, description, category } = await request.json()

    const stream = await prisma.videoStream.create({
      data: {
        userId: session.user.id,
        title,
        description,
        category: category || 'general',
        status: 'live'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    // Notify followers that this teller went live (fire-and-forget)
    notifyFollowersOfLiveStream(session.user.id, session.user.name || 'Falcı', stream.id, title).catch(err =>
      console.error('Live stream follower notification error:', err)
    )

    // Log activity
    logActivity({
      userId: session.user.id,
      userName: session.user.name || 'Kullanıcı',
      userAvatar: (session.user as any)?.image || null,
      activityType: 'stream_started',
      detail: 'canlı yayın başlattı 🔴',
      targetUrl: `/sohbet/video`,
    })

    return NextResponse.json(stream)
  } catch (error) {
    console.error('Error creating stream:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
