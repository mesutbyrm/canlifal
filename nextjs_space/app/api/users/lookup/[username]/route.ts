import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// GET /api/users/lookup/[username] - Public profile lookup by username
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const auth = await authenticateRequest(request)
    const { username } = params

    if (!username || username.trim().length === 0) {
      return NextResponse.json({ error: 'Kullanıcı adı gerekli' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        createdAt: true,
        zodiacSign: true,
        role: true,
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

    const [followerCount, followingCount, totalLikes] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.socialLike.count({
        where: { post: { userId: user.id, isPublic: true } }
      })
    ])

    let isFollowing = false
    if (auth?.id && auth.id !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: auth.id,
            followingId: user.id
          }
        }
      })
      isFollowing = !!follow
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
      membership: user.membership,
      membershipExpiresAt: user.membershipExpiresAt,
      specialBadges: user.specialBadges,
      profileEffect: user.profileEffect,
      profileFrame: user.adminAssignedFrame || user.profileFrame,
      postCount: user._count.socialPosts,
      followerCount,
      followingCount,
      totalLikes,
      isFollowing
    })
  } catch (error: any) {
    console.error('User lookup error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
