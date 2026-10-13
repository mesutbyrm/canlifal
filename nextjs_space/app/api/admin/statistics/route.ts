import { NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { getCached } from '@/lib/cache'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getStaffSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (!user || !(await staffCan(user.role, (session?.user as any)?.id, 'analytics.dashboard.view', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    // Cache admin stats for 30 seconds - 32 DB queries saved per cache hit
    const statsData = await getCached('admin:statistics', 30, async () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get all statistics in parallel - batch 1 (core stats)
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
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.fortune.count(),
      prisma.fortune.aggregate({ _sum: { viewCount: true } }),
      prisma.fortune.groupBy({ by: ['fortuneType'], _count: { fortuneType: true } }),
      prisma.socialPost.count(),
      prisma.socialPost.count({ where: { createdAt: { gte: today } } }),
      prisma.socialLike.count(),
      prisma.socialComment.count(),
    ])

    // Batch 2 - messaging & community
    const [
      totalDirectMessages,
      messagesThisWeek,
      totalConversations,
      totalFollows,
      totalVideoStreams,
      activeVideoStreams,
      totalStreamGifts,
      totalStreamLikes,
      premiumUsers,
      vipUsers,
    ] = await Promise.all([
      prisma.directMessage.count(),
      prisma.directMessage.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.conversation.count(),
      prisma.follow.count(),
      prisma.videoStream.count(),
      prisma.videoStream.count({ where: { status: 'live' } }),
      prisma.streamGift.aggregate({ _sum: { totalPrice: true } }),
      prisma.videoStreamLike.count(),
      prisma.user.count({ where: { membership: 'premium' } }),
      prisma.user.count({ where: { membership: 'vip' } }),
    ])

    // Batch 3 - Economy/Finance stats
    const [
      totalCfcInCirculation,
      totalJetonInCirculation,
      jetonLoadedAgg,
      jetonGiftSentAgg,
      jetonGiftReceivedAgg,
      jetonCommissionAgg,
      jetonSpendAgg,
      chatRoomGiftJetonAgg,
      chatRoomGiftCfcAgg,
      chatRoomCommissionAgg,
    ] = await Promise.all([
      prisma.user.aggregate({ _sum: { credits: true } }),
      prisma.user.aggregate({ _sum: { jetonBalance: true } }),
      prisma.jetonTransaction.aggregate({ _sum: { amount: true }, where: { type: 'purchase', amount: { gt: 0 } } }),
      prisma.jetonTransaction.aggregate({ _sum: { amount: true }, where: { type: 'gift_sent' } }),
      prisma.jetonTransaction.aggregate({ _sum: { amount: true }, where: { type: 'gift_received' } }),
      prisma.jetonTransaction.aggregate({ _sum: { amount: true }, where: { type: 'gift_commission' } }),
      prisma.jetonTransaction.aggregate({ _sum: { amount: true }, where: { type: 'spend' } }),
      prisma.chatRoomGift.aggregate({ _sum: { totalPrice: true }, where: { currencyType: 'jeton' } }),
      prisma.chatRoomGift.aggregate({ _sum: { totalPrice: true }, where: { currencyType: 'cfc' } }),
      prisma.chatRoomGift.aggregate({ _sum: { commissionAmount: true }, where: { commissionAmount: { gt: 0 } } }),
    ])

    // Format fortune stats by type
    const fortunesByTypeFormatted: Record<string, number> = {}
    fortunesByType.forEach((stat: { fortuneType: string; _count: { fortuneType: number } }) => {
      fortunesByTypeFormatted[stat.fortuneType] = stat._count.fortuneType
    })

    return {
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
      
      // Economy - detailed breakdown
      economy: {
        cfcInCirculation: totalCfcInCirculation._sum.credits || 0,
        jetonInCirculation: totalJetonInCirculation._sum.jetonBalance || 0,
        jetonLoaded: jetonLoadedAgg._sum.amount || 0,
        jetonGiftSent: Math.abs(jetonGiftSentAgg._sum.amount || 0),
        jetonGiftReceived: jetonGiftReceivedAgg._sum.amount || 0,
        jetonCommission: jetonCommissionAgg._sum.amount || 0,
        jetonSpent: Math.abs(jetonSpendAgg._sum.amount || 0),
        chatGiftJetonTotal: chatRoomGiftJetonAgg._sum.totalPrice || 0,
        chatGiftCfcTotal: chatRoomGiftCfcAgg._sum.totalPrice || 0,
        chatGiftCommissionTotal: chatRoomCommissionAgg._sum.commissionAmount || 0,
        // backward compat
        creditsInCirculation: totalCfcInCirculation._sum.credits || 0,
        creditsSpent: 0,
      },
    }
    }) // end getCached
    return NextResponse.json(statsData)
  } catch (error) {
    console.error('Statistics error:', error)
    return NextResponse.json({ 
      totalUsers: 0, 
      totalFortunes: 0, 
      fortunesByType: {} 
    })
  }
}
