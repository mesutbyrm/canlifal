import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { userId } = params

    // Find user by ID or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { username: userId.toLowerCase() }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        createdAt: true,
        zodiacSign: true,
        membership: true,
        membershipExpiresAt: true,
        specialBadges: true,
        profileEffect: true,
        profileFrameId: true,
        adminAssignedFrameId: true,
        profileFrame: { select: { id: true, name: true, imageUrl: true } },
        adminAssignedFrame: { select: { id: true, name: true, imageUrl: true } },
        _count: {
          select: {
            socialPosts: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get follower and following counts
    const [followerCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } })
    ])

    // Get total likes on user's posts
    const totalLikes = await prisma.socialLike.count({
      where: {
        post: {
          userId: user.id,
          isPublic: true
        }
      }
    })

    // Check if current user is following this user
    let isFollowing = false
    if (session?.user?.id && session.user.id !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: user.id
          }
        }
      })
      isFollowing = !!follow
    }

    // Check if membership is active
    const membershipActive = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) > new Date() : false
    const effectiveMembership = membershipActive ? user.membership : 'faluser'

    // Parse special badges from JSON string
    let specialBadges: string[] = []
    if (user.specialBadges) {
      try {
        specialBadges = JSON.parse(user.specialBadges)
      } catch (e) {
        specialBadges = []
      }
    }

    // Track profile view & send notification (only if viewer is logged in, not own profile)
    const currentUserId = (session?.user as any)?.id
    if (currentUserId && currentUserId !== user.id) {
      // Check if the viewer has hideProfileViews enabled
      const viewer = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { hideProfileViews: true, name: true, username: true }
      })

      // Only record view and notify if viewer is NOT hidden
      if (!viewer?.hideProfileViews) {
        // Record profile view (non-blocking)
        prisma.profileView.create({
          data: {
            viewedUserId: user.id,
            viewerId: currentUserId,
          }
        }).catch((err: any) => console.error('Profile view tracking error:', err))

        // Check if we already sent a notification for this viewer recently (last 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const recentNotification = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: 'profile_view',
            fromUserId: currentUserId,
            createdAt: { gte: oneDayAgo }
          }
        })

        if (!recentNotification) {
          prisma.notification.create({
            data: {
              userId: user.id,
              type: 'profile_view',
              title: '👁️ Profil Görüntüleme',
              message: `${viewer?.name || viewer?.username || 'Birisi'} profilinizi görüntüledi`,
              fromUserId: currentUserId,
              fromUserName: viewer?.name || viewer?.username || null,
            }
          }).catch((err: any) => console.error('Profile view notification error:', err))
        }
      }
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      bio: user.bio,
      createdAt: user.createdAt,
      zodiacSign: user.zodiacSign,
      membership: effectiveMembership,
      membershipExpiresAt: user.membershipExpiresAt,
      specialBadges,
      profileEffect: user.profileEffect,
      profileFrameId: user.profileFrameId,
      adminAssignedFrameId: user.adminAssignedFrameId,
      profileFrame: user.profileFrame,
      adminAssignedFrame: user.adminAssignedFrame,
      followerCount,
      followingCount,
      postCount: user._count.socialPosts,
      totalLikes,
      isFollowing,
      isOwnProfile: session?.user?.id === user.id
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
