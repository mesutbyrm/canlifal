export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { safeInt } from '@/lib/short-videos'

/**
 * GET /api/short-videos/profile/:userId
 * Auth: opsiyonel (isFollowing için gerekir)
 * Kullanıcının kısa video profil istatistikleri.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const authUser = await authenticateRequest(req).catch(() => null)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, name: true, image: true, bio: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı' } },
        { status: 404 }
      )
    }

    const [videoCount, likeAgg, followers, following, isFollowingRec] = await Promise.all([
      prisma.shortVideo.count({ where: { userId } }),
      prisma.shortVideo.aggregate({ where: { userId }, _sum: { likesCount: true } }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      authUser
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: authUser.id, followingId: userId } },
            select: { id: true },
          }).catch(() => null)
        : Promise.resolve(null),
    ])

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          userId: user.id,
          username: user.username || user.name || 'user',
          displayName: user.name || user.username || 'Kullanıcı',
          avatarUrl: user.image ?? null,
          bio: user.bio ?? null,
        },
        stats: {
          videoCount: safeInt(videoCount),
          totalLikes: safeInt(likeAgg?._sum?.likesCount),
          followers: safeInt(followers),
          following: safeInt(following),
        },
        isFollowing: !!isFollowingRec,
        isOwner: authUser?.id === userId,
      },
    })
  } catch (error: any) {
    console.error('[short-videos] Profile stats error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Profil bilgileri alınamadı' } },
      { status: 500 }
    )
  }
}
