import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mobile/user-profile/[userId]
 * Flutter kullanıcı profil sayfası — tek istekle profil + istatistikler + ilişki durumu.
 *
 * Returns: user info, stats, follow/block status, achievements, recent activity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const { userId: rawUserId } = await params
    // Kimlik veya kullanıcı adı (@etiket / paylaşım linki) kabul edilir.
    let userId = rawUserId
    const raw = decodeURIComponent(String(rawUserId || '')).replace(/^@/, '').trim()
    if (raw) {
      const byId = await prisma.user.findUnique({ where: { id: raw }, select: { id: true } })
      if (byId) {
        userId = byId.id
      } else {
        const byName = await prisma.user.findFirst({ where: { username: raw.toLowerCase() }, select: { id: true } })
        if (byName) userId = byName.id
      }
    }
    const isOwnProfile = userId === authUser.id

    // Parallel: user data + relationship + stats
    const [
      targetUser,
      followStatus,
      blockStatus,
      followerCount,
      followingCount,
      shortVideoCount,
      totalVideoLikes,
      achievements,
    ] = await Promise.all([
      // 1. User data
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
          role: true,
          membership: true,
          zodiacSign: true,
          risingSign: true,
          level: true,
          xp: true,
          createdAt: true,
          specialBadges: true,
          profileEffect: true,
          favoriteTeam: true,
        },
      }),

      // 2. Follow status (am I following this user?)
      !isOwnProfile
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: authUser.id, followingId: userId } },
            select: { id: true },
          })
        : null,

      // 3. Block status
      !isOwnProfile
        ? prisma.userBlock.findUnique({
            where: { blockerId_blockedId: { blockerId: authUser.id, blockedId: userId } },
            select: { id: true },
          })
        : null,

      // 4. Follower count
      prisma.follow.count({ where: { followingId: userId } }),

      // 5. Following count
      prisma.follow.count({ where: { followerId: userId } }),

      // 6. Short video count
      prisma.shortVideo.count({ where: { userId, visibility: 'everyone' } }),

      // 7. Total video likes
      prisma.shortVideo.aggregate({
        where: { userId, visibility: 'everyone' },
        _sum: { likesCount: true },
      }),

      // 8. Achievements
      prisma.userAchievement.findMany({
        where: { userId, isCompleted: true },
        select: {
          id: true,
          achievementId: true,
          earnedAt: true,
          progress: true,
        },
        orderBy: { earnedAt: 'desc' },
        take: 20,
      }),
    ])

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı' } },
        { status: 404 }
      )
    }

    // Uygulamadan gelen ziyaretler de «Kim Baktı» listesine yazılır
    // (önceden yalnız web ziyaretleri kaydediliyordu).
    let postCount = 0
    if (!isOwnProfile) {
      try {
        const me = await prisma.user.findUnique({ where: { id: authUser.id }, select: { hideProfileViews: true } })
        await prisma.profileVisit.upsert({
          where: { visitorId_profileId: { visitorId: authUser.id, profileId: userId } },
          update: { visitedAt: new Date(), isHidden: !!me?.hideProfileViews },
          create: { visitorId: authUser.id, profileId: userId, isHidden: !!me?.hideProfileViews },
        })
      } catch { /* ziyaret kaydı profili engellemesin */ }
    }
    try {
      postCount = await prisma.socialPost.count({ where: { userId, isPublic: true } })
    } catch { /* yoksay */ }

    // Check if target blocked me
    let isBlockedByTarget = false
    if (!isOwnProfile) {
      const reverseBlock = await prisma.userBlock.findUnique({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: authUser.id } },
        select: { id: true },
      })
      isBlockedByTarget = !!reverseBlock
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: targetUser.id,
          name: targetUser.name,
          username: targetUser.username,
          image: targetUser.image,
          bio: targetUser.bio,
          role: targetUser.role,
          membership: targetUser.membership,
          zodiacSign: targetUser.zodiacSign,
          risingSign: targetUser.risingSign,
          level: targetUser.level,
          xp: targetUser.xp,
          specialBadges: targetUser.specialBadges,
          profileEffect: targetUser.profileEffect,
          favoriteTeam: targetUser.favoriteTeam,
          joinedAt: targetUser.createdAt,
        },
        stats: {
          followers: followerCount,
          following: followingCount,
          videoCount: shortVideoCount,
          totalLikes: totalVideoLikes._sum?.likesCount || 0,
          // Mobil istemcinin okuduğu adlar (eski sürümler 0 gösteriyordu).
          followerCount,
          followingCount,
          postCount,
          likeCount: totalVideoLikes._sum?.likesCount || 0,
        },
        isOwnProfile,
        role: targetUser.role,
        relationship: {
          isOwnProfile,
          isFollowing: !!followStatus,
          isBlocked: !!blockStatus,
          isBlockedByTarget,
        },
        achievements: achievements.map((a: any) => ({
          id: a.id,
          achievementId: a.achievementId,
          progress: a.progress,
          earnedAt: a.earnedAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error in GET /api/mobile/user-profile:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Profil yüklenemedi' } },
      { status: 500 }
    )
  }
}
