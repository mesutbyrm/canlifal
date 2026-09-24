// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getCached } from '@/lib/cache'
import { getCommunityLeaderboards } from '@/lib/services/leaderboard-service'
import { withCachePolicy } from '@/lib/perf'

export const dynamic = 'force-dynamic'

// Heavy computation - cache for 30 seconds (12 DB queries reduced to 0 on cache hit)
async function fetchLeaderboardData() {
  // 1. Top Fortune Viewers
  const topFortuneViewers = await prisma.user.findMany({
    where: { fortunes: { some: {} } },
    select: {
      id: true, name: true, username: true, image: true,
      _count: { select: { fortunes: true } }
    },
    orderBy: { fortunes: { _count: 'desc' } },
    take: 10
  })

  // 2. Most Popular Users (by followers)
  const mostPopular = await prisma.user.findMany({
    where: { followers: { some: {} } },
    select: {
      id: true, name: true, username: true, image: true,
      _count: { select: { followers: true } }
    },
    orderBy: { followers: { _count: 'desc' } },
    take: 10
  })

  // 3. Top Live Streamers
  const topStreamers = await prisma.user.findMany({
    where: { videoStreams: { some: {} } },
    select: {
      id: true, name: true, username: true, image: true,
      _count: { select: { videoStreams: true } }
    },
    orderBy: { videoStreams: { _count: 'desc' } },
    take: 10
  })

  // 4. Top Coin Spenders
  const spenderTransactions = await prisma.creditTransaction.groupBy({
    by: ['userId'],
    where: { amount: { lt: 0 } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'asc' } },
    take: 10
  })
  const topSpenderIds = spenderTransactions.map(t => t.userId)
  const topSpenderUsers = await prisma.user.findMany({
    where: { id: { in: topSpenderIds } },
    select: { id: true, name: true, username: true, image: true }
  })
  const topSpenders = spenderTransactions.map(t => {
    const user = topSpenderUsers.find(u => u.id === t.userId)
    return { ...user, totalSpent: Math.abs(t._sum.amount || 0) }
  })

  // 5. Top Coin Earners
  const earnerTransactions = await prisma.creditTransaction.groupBy({
    by: ['userId'],
    where: { amount: { gt: 0 } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 10
  })
  const topEarnerIds = earnerTransactions.map(t => t.userId)
  const topEarnerUsers = await prisma.user.findMany({
    where: { id: { in: topEarnerIds } },
    select: { id: true, name: true, username: true, image: true }
  })
  const topEarners = earnerTransactions.map(t => {
    const user = topEarnerUsers.find(u => u.id === t.userId)
    return { ...user, totalEarned: t._sum.amount || 0 }
  })

  // 6. Top Gift Senders
  const giftTransactions = await prisma.streamGift.groupBy({
    by: ['senderId'],
    _sum: { totalPrice: true },
    orderBy: { _sum: { totalPrice: 'desc' } },
    take: 10
  })
  const topGiftSenderIds = giftTransactions.map(t => t.senderId)
  const topGiftSenderUsers = await prisma.user.findMany({
    where: { id: { in: topGiftSenderIds } },
    select: { id: true, name: true, username: true, image: true }
  })
  const topGiftSenders = giftTransactions.map(t => {
    const user = topGiftSenderUsers.find(u => u.id === t.senderId)
    return { ...user, totalGifted: t._sum.totalPrice || 0 }
  })

  // 7. Most Liked Content Creators
  const likesByUser = await prisma.socialLike.groupBy({ by: ['postId'] })
  const postLikeCounts = await prisma.socialPost.findMany({
    where: { id: { in: likesByUser.map(l => l.postId) } },
    include: { _count: { select: { likes: true } } }
  })
  const likesByCreator: Record<string, number> = {}
  postLikeCounts.forEach(post => {
    likesByCreator[post.userId] = (likesByCreator[post.userId] || 0) + post._count.likes
  })
  const topLikedCreatorIds = Object.entries(likesByCreator)
    .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id)
  const topLikedCreatorUsers = await prisma.user.findMany({
    where: { id: { in: topLikedCreatorIds } },
    select: { id: true, name: true, username: true, image: true }
  })
  const topLikedCreators = topLikedCreatorIds.map(id => {
    const user = topLikedCreatorUsers.find(u => u.id === id)
    return { ...user, totalLikes: likesByCreator[id] || 0 }
  })

  return {
    topFortuneViewers: topFortuneViewers.map((u, i) => ({
      rank: i + 1, id: u.id, name: u.name, username: u.username,
      image: u.image, count: u._count.fortunes
    })),
    mostPopular: mostPopular.map((u, i) => ({
      rank: i + 1, id: u.id, name: u.name, username: u.username,
      image: u.image, followers: u._count.followers
    })),
    topStreamers: topStreamers.map((u, i) => ({
      rank: i + 1, id: u.id, name: u.name, username: u.username,
      image: u.image, streams: u._count.videoStreams
    })),
    topSpenders: topSpenders.map((u, i) => ({ rank: i + 1, ...u })),
    topEarners: topEarners.map((u, i) => ({ rank: i + 1, ...u })),
    topGiftSenders: topGiftSenders.map((u, i) => ({ rank: i + 1, ...u })),
    topLikedCreators: topLikedCreators.map((u, i) => ({ rank: i + 1, ...u })),
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    const currentUserId = authUser?.id

    // Cache leaderboard data for 30 seconds - 12 DB queries saved per cache hit
    // Kanonik uç: eski /api/leaderboard ucunun alanlarını da (topReferrers,
    // topFortuneUsers, topSharers) içerecek şekilde birleştirilmiş üst küme döner.
    const [data, community] = await Promise.all([
      getCached('leaderboards:all', 30, fetchLeaderboardData),
      getCommunityLeaderboards(),
    ])

    // Compute current user ranks (lightweight, not cached)
    let currentUserRanks = null
    if (currentUserId) {
      currentUserRanks = {
        fortune: (data.topFortuneViewers.findIndex((u: any) => u.id === currentUserId) + 1) || null,
        popularity: (data.mostPopular.findIndex((u: any) => u.id === currentUserId) + 1) || null,
        streaming: (data.topStreamers.findIndex((u: any) => u.id === currentUserId) + 1) || null,
        spending: (data.topSpenders.findIndex((u: any) => u.id === currentUserId) + 1) || null,
        earning: (data.topEarners.findIndex((u: any) => u.id === currentUserId) + 1) || null,
      }
    }

    // Kullanıcıya özel sıralama içerdiğinden oturumluysa private, değilse public.
    return withCachePolicy(
      NextResponse.json({ ...data, ...community, currentUserRanks }),
      currentUserId ? 'private-5m' : 'public-1m',
    )
  } catch (error) {
    console.error('Leaderboards error:', error)
    return NextResponse.json({ error: 'Sıralama verileri alınamadı' }, { status: 500 })
  }
}
