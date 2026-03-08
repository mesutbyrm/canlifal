import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get all statistics in parallel
    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalFortunes,
      fortunesWithViews,
      fortunesByType,
      totalSocialPosts,
      socialPostsToday,
      totalLikes,
      totalComments,
      totalDirectMessages,
      messagesThisWeek,
      totalConversations,
      totalFollows,
      totalVideoStreams,
      activeVideoStreams,
      totalStreamGifts,
      totalStreamLikes,
      totalCreditsInCirculation,
      premiumUsers,
      vipUsers,
    ] = await Promise.all([
      // User stats
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      
      // Fortune stats
      prisma.fortune.count(),
      prisma.fortune.aggregate({ _sum: { viewCount: true } }),
      prisma.fortune.groupBy({
        by: ['fortuneType'],
        _count: { fortuneType: true }
      }),
      
      // Social stats
      prisma.socialPost.count(),
      prisma.socialPost.count({ where: { createdAt: { gte: today } } }),
      prisma.socialLike.count(),
      prisma.socialComment.count(),
      
      // Message stats
      prisma.directMessage.count(),
      prisma.directMessage.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.conversation.count(),
      
      // Follow stats
      prisma.follow.count(),
      
      // Video stream stats
      prisma.videoStream.count(),
      prisma.videoStream.count({ where: { status: 'live' } }),
      prisma.streamGift.aggregate({ _sum: { totalPrice: true } }),
      prisma.videoStreamLike.count(),
      
      // Credit stats
      prisma.user.aggregate({ _sum: { credits: true } }),
      
      // Membership stats
      prisma.user.count({ where: { membership: 'premium' } }),
      prisma.user.count({ where: { membership: 'vip' } }),
    ])

    // Format fortune stats by type
    const fortunesByTypeFormatted: Record<string, number> = {}
    fortunesByType.forEach((stat: { fortuneType: string; _count: { fortuneType: number } }) => {
      fortunesByTypeFormatted[stat.fortuneType] = stat._count.fortuneType
    })

    return NextResponse.json({
      // Basic stats (original)
      totalUsers,
      totalFortunes,
      fortunesByType: fortunesByTypeFormatted,
      
      // User growth
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
        premium: premiumUsers,
        vip: vipUsers,
      },
      
      // Fortune engagement
      fortunes: {
        total: totalFortunes,
        totalViews: fortunesWithViews._sum.viewCount || 0,
        byType: fortunesByTypeFormatted,
      },
      
      // Social engagement
      social: {
        totalPosts: totalSocialPosts,
        postsToday: socialPostsToday,
        totalLikes: totalLikes,
        totalComments: totalComments,
        totalShares: 0, // Not tracked separately
      },
      
      // Messaging
      messaging: {
        totalMessages: totalDirectMessages,
        messagesThisWeek: messagesThisWeek,
        totalConversations: totalConversations,
      },
      
      // Community
      community: {
        totalFollows: totalFollows,
      },
      
      // Live streams
      streams: {
        total: totalVideoStreams,
        active: activeVideoStreams,
        totalGiftsValue: totalStreamGifts._sum?.totalPrice || 0,
        totalLikes: totalStreamLikes,
      },
      
      // Economy
      economy: {
        creditsInCirculation: totalCreditsInCirculation._sum.credits || 0,
        creditsSpent: 0, // Not tracked separately
      },
    })
  } catch (error) {
    console.error('Statistics error:', error)
    return NextResponse.json({ 
      totalUsers: 0, 
      totalFortunes: 0, 
      fortunesByType: {} 
    })
  }
}
