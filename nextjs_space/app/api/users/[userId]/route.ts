import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const auth = await authenticateRequest(request)
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
        role: true,
        isFounder: true,
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
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Run all counts + follow check in parallel
    const [followerCount, followingCount, totalLikes, followRecord] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.socialLike.count({
        where: { post: { userId: user.id, isPublic: true } }
      }),
      auth?.id && auth.id !== user.id
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: auth.id, followingId: user.id } }
          })
        : Promise.resolve(null)
    ])
    const isFollowing = !!followRecord

    // Check if membership is active (null expiry = lifetime/permanent membership)
    const membershipActive = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) > new Date() : true
    const effectiveMembership = membershipActive ? user.membership : 'basic'

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
    const currentUserId = auth?.id
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
          createNotificationWithPush({
            userId: user.id,
            type: 'profile_view',
            title: '👁️ Profil Görüntüleme',
            message: 'profilinizi görüntüledi',
            fromUserId: currentUserId,
            fromUserName: viewer?.name || viewer?.username || 'Birisi',
            data: JSON.stringify({ viewerId: currentUserId, viewerName: viewer?.name || viewer?.username })
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
      role: user.role,
      isFounder: user.isFounder,
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
      isOwnProfile: auth?.id === user.id
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
