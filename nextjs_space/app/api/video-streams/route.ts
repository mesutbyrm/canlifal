import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { sendOneSignalPushToMany } from '@/lib/onesignal'

/**
 * Notify all followers of a user that they went live.
 */
async function notifyFollowersOfLiveStream(userId: string, userName: string, streamId: string, streamTitle: string) {
  // Get all follower IDs
  const followers = await prisma.follow.findMany({
    where: { followingId: userId },
    select: { followerId: true }
  })

  if (followers.length === 0) return

  const followerIds = followers.map(f => f.followerId)
  const baseUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'

  // Create in-app notifications in bulk
  await prisma.notification.createMany({
    data: followerIds.map(fId => ({
      userId: fId,
      type: 'stream_live',
      title: '🔴 Canlı Yayın Başladı!',
      message: `${userName} canlı yayına başladı: ${streamTitle || 'Canlı Fal'}`,
      fromUserId: userId,
      fromUserName: userName,
      data: JSON.stringify({ streamId }),
    }))
  })

  // Send push notification to all followers at once
  await sendOneSignalPushToMany(
    followerIds,
    '🔴 Canlı Yayın Başladı!',
    `${userName} canlı yayına başladı: ${streamTitle || 'Canlı Fal'}`,
    `${baseUrl}/live-room/${streamId}`,
    { streamId, type: 'stream_live' }
  )
}

export async function GET() {
  try {
    const streams = await prisma.videoStream.findMany({
      where: { status: 'live' },
      orderBy: { startedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    })

    // Get active viewer counts for each stream
    const streamIds = streams.map((s: any) => s.id)
    const viewerCounts = await prisma.videoStreamViewer.groupBy({
      by: ['streamId'],
      where: {
        streamId: { in: streamIds },
        leftAt: null
      },
      _count: { id: true }
    })
    const viewerCountMap = new Map(viewerCounts.map((v: any) => [v.streamId, v._count.id]))

    return NextResponse.json(streams.map((s: any) => ({
      ...s,
      viewerCount: viewerCountMap.get(s.id) || 0,
      likeCount: s._count.likes,
      commentCount: s._count.comments
    })))
  } catch (error) {
    console.error('Error fetching streams:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    return NextResponse.json(stream)
  } catch (error) {
    console.error('Error creating stream:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
