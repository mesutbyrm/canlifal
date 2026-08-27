import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { sendPushToMultipleUsers } from '@/lib/onesignal'
import { logActivity } from '@/lib/activity-logger'
import { getPlatformSetting } from '@/lib/agency-commission'
import { requireFeature } from '@/lib/check-feature'
import { guardRateLimit } from '@/lib/rate-limit-guard'

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

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1') || 1
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '30') || 30, 100)
    const skip = (page - 1) * limit

    // Fire-and-forget: close streams whose broadcaster media went silent.
    // Runs outside the cache wrapper so it also fires on cache hits (internally throttled).
    import('@/lib/stream-auto-close')
      .then(m => m.sweepMediaInactiveStreams())
      .catch(() => {})

    // Cache live stream list for 10 seconds - prevents DB storm from concurrent homepage polls
    const { getCached } = await import('@/lib/cache')
    const cacheKey = `streams:live_list:${page}:${limit}`
    const result = await getCached(cacheKey, 10, async () => {
      const [streams, totalCount] = await Promise.all([
        prisma.videoStream.findMany({
          where: { status: 'live' },
          orderBy: { startedAt: 'desc' },
          skip,
          take: limit,
          include: {
            user: {
              select: { id: true, name: true, image: true }
            },
            _count: {
              select: { comments: true, likes: true }
            }
          }
        }),
        prisma.videoStream.count({ where: { status: 'live' } })
      ])

      const streamIds = streams.map((s: any) => s.id)
      const viewerCounts = streamIds.length > 0 ? await prisma.videoStreamViewer.groupBy({
        by: ['streamId'],
        where: { streamId: { in: streamIds }, leftAt: null },
        _count: { id: true }
      }) : []
      const viewerCountMap = new Map(viewerCounts.map((v: any) => [v.streamId, v._count.id]))

      const items = streams.map((s: any) => {
        const vc = viewerCountMap.get(s.id) || 0
        return {
          ...s,
          streamId: s.id,
          isLive: s.status === 'live',
          viewerCount: vc,
          viewers: vc,
          watching: vc,
          likeCount: s._count.likes,
          commentCount: s._count.comments,
          thumbnailUrl: s.thumbnailUrl || s.broadcastImage || null,
          coverUrl: s.thumbnailUrl || s.broadcastImage || null,
          broadcasterId: s.userId,
          hostUserId: s.userId,
          streamerName: s.user?.name || 'Anonim',
        }
      })

      return {
        streams: items,
        items,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        }
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching streams:', error)
    return NextResponse.json({ streams: [], items: [], pagination: { page: 1, limit: 30, total: 0, totalPages: 0 } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Feature flag kontrolü
    const liveBlocked = await requireFeature('LIVE_ENABLED')
    if (liveBlocked) return liveBlocked

    // Dual auth: mobile JWT or web session
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id
    const userName = mobileUser?.name || session?.user?.name || 'Kullanıcı'
    const userImage = mobileUser?.image || (session?.user as any)?.image || null

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const rateLimited = await guardRateLimit(request, 'stream_create', { userId })
    if (rateLimited) return rateLimited

    // Check if user is an approved live fortune teller
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { userId },
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
          userId,
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

    const body = await request.json()
    const { title, description, category, tags, thumbnailUrl, coverUrl } = body

    const stream = await prisma.videoStream.create({
      data: {
        userId,
        title,
        description,
        category: category || 'general',
        thumbnailUrl: thumbnailUrl || coverUrl || null,
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
    notifyFollowersOfLiveStream(userId, userName || 'Falcı', stream.id, title).catch(err =>
      console.error('Live stream follower notification error:', err)
    )

    // Log activity
    logActivity({
      userId,
      userName: userName || 'Kullanıcı',
      userAvatar: userImage,
      activityType: 'stream_started',
      detail: 'canlı yayın başlattı 🔴',
      targetUrl: `/sohbet/video`,
    })

    // Flutter-compatible response
    return NextResponse.json({
      success: true,
      data: {
        ...stream,
        streamId: stream.id,
        isLive: true,
        broadcasterId: userId,
        hostUserId: userId,
        streamerName: userName,
      }
    })
  } catch (error) {
    console.error('Error creating stream:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
