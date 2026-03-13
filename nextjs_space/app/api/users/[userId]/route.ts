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
