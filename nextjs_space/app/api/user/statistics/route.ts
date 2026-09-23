// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { subDays, startOfDay, format } from 'date-fns'
import { getCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const userId = auth.id
    
    // Cache per-user statistics for 30 seconds (heavy query, 16+ DB calls)
    const stats = await getCached(`user:stats:${userId}`, 30, () => fetchUserStatistics(userId))
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching user statistics:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

async function fetchUserStatistics(userId: string) {
  try {
    // Fetch user with all related counts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        credits: true,
        membership: true,
        createdAt: true,
        zodiacSign: true,
        risingSign: true,
        totalTimeSpentMinutes: true,
        lastActiveAt: true,
        birthDate: true,
        birthTime: true,
        _count: {
          select: {
            fortunes: true,
            socialPosts: true,
            followers: true,
            following: true,
            videoStreams: true,
            liveSessions: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // 1. USER ACTIVITY STATISTICS
    const loginSessions = await prisma.userLoginSession.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take: 100
    })

    const totalLogins = loginSessions.length
    const lastLogin = loginSessions[0]?.loginAt || user.lastActiveAt
    const totalSessions = await prisma.userLoginSession.count({ where: { userId } })

    // Hourly activity
    const hourlyActivity = await prisma.userHourlyActivity.findMany({
      where: { userId },
      orderBy: { hour: 'asc' }
    })

    const mostActiveHour = hourlyActivity.reduce((max, h) => 
      h.totalMinutes > (max?.totalMinutes || 0) ? h : max, hourlyActivity[0]
    )?.hour || 0

    // Daily activity for last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30)
    const dailyActivity = await prisma.userDailyActivity.findMany({
      where: { 
        userId,
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: 'asc' }
    })

    // Calculate average daily usage
    const totalMinutesLast30Days = dailyActivity.reduce((sum, d) => sum + d.minutesSpent, 0)
    const averageDailyMinutes = dailyActivity.length > 0 
      ? Math.round(totalMinutesLast30Days / 30) 
      : 0

    // Most active day of week (0-6)
    const dayActivity: Record<number, number> = {}
    dailyActivity.forEach(d => {
      const dayOfWeek = new Date(d.date).getDay()
      dayActivity[dayOfWeek] = (dayActivity[dayOfWeek] || 0) + d.minutesSpent
    })
    const mostActiveDay = Object.entries(dayActivity).reduce((max, [day, mins]) => 
      mins > (max.mins || 0) ? { day: parseInt(day), mins } : max, { day: 0, mins: 0 }
    ).day

    // 2. FORTUNE TELLING STATISTICS
    const fortunes = await prisma.fortune.findMany({
      where: { userId },
      select: { id: true, fortuneType: true, createdAt: true, viewCount: true }
    })

    const fortunesByType: Record<string, number> = {}
    fortunes.forEach(f => {
      fortunesByType[f.fortuneType] = (fortunesByType[f.fortuneType] || 0) + 1
    })

    const mostUsedFortuneType = Object.entries(fortunesByType).reduce((max, [type, count]) => 
      count > (max.count || 0) ? { type, count } : max, { type: '', count: 0 }
    ).type

    // Fortune ratings
    const fortuneRatings = await prisma.fortuneRating.findMany({
      where: { userId }
    })
    const avgSatisfaction = fortuneRatings.length > 0 
      ? fortuneRatings.reduce((sum, r) => sum + (r.satisfaction || 0), 0) / fortuneRatings.filter(r => r.satisfaction).length 
      : 0
    const avgAccuracy = fortuneRatings.length > 0 
      ? fortuneRatings.reduce((sum, r) => sum + (r.accuracy || 0), 0) / fortuneRatings.filter(r => r.accuracy).length 
      : 0

    // Free daily fortunes
    const dailyHoroscopes = fortunes.filter(f => f.fortuneType === 'daily_horoscope').length

    // Last fortune
    const lastFortune = fortunes.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]

    // 3. COIN/TOKEN ECONOMY STATISTICS
    const creditTransactions = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    const totalPurchased = creditTransactions
      .filter(t => t.type === 'purchase')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalSpent = creditTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const totalEarned = creditTransactions
      .filter(t => t.amount > 0 && t.type !== 'purchase')
      .reduce((sum, t) => sum + t.amount, 0)

    const giftsSent = creditTransactions
      .filter(t => t.type === 'gift_sent')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const giftsReceived = creditTransactions
      .filter(t => t.type === 'gift_received')
      .reduce((sum, t) => sum + t.amount, 0)

    const streamSpending = creditTransactions
      .filter(t => t.type === 'stream')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    // Daily spending average
    const spendingByDay: Record<string, number> = {}
    creditTransactions.filter(t => t.amount < 0).forEach(t => {
      const day = format(new Date(t.createdAt), 'yyyy-MM-dd')
      spendingByDay[day] = (spendingByDay[day] || 0) + Math.abs(t.amount)
    })
    const avgDailySpending = Object.values(spendingByDay).length > 0
      ? Math.round(Object.values(spendingByDay).reduce((a, b) => a + b, 0) / Object.values(spendingByDay).length)
      : 0

    const highestSpendingDay = Object.entries(spendingByDay).reduce((max, [day, amount]) => 
      amount > (max.amount || 0) ? { day, amount } : max, { day: '', amount: 0 }
    )

    // Monthly spending graph data
    const monthlySpending: { month: string; amount: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      
      const spending = creditTransactions
        .filter(t => t.amount < 0 && new Date(t.createdAt) >= monthStart && new Date(t.createdAt) < monthEnd)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      
      monthlySpending.push({
        month: format(monthStart, 'MMM'),
        amount: spending
      })
    }

    // 4. SOCIAL INTERACTION STATISTICS
    const likesReceived = await prisma.socialLike.count({
      where: {
        post: { userId }
      }
    })

    const commentsReceived = await prisma.socialComment.count({
      where: {
        post: { userId },
        NOT: { userId }
      }
    })

    // Most liked post
    const mostLikedPost = await prisma.socialPost.findFirst({
      where: { userId },
      orderBy: {
        likes: { _count: 'desc' }
      },
      include: {
        _count: { select: { likes: true, comments: true } }
      }
    })

    // Most commented post
    const mostCommentedPost = await prisma.socialPost.findFirst({
      where: { userId },
      orderBy: {
        comments: { _count: 'desc' }
      },
      include: {
        _count: { select: { likes: true, comments: true } }
      }
    })

    // Profile views
    const profileViews = await prisma.profileView.count({
      where: { viewedUserId: userId }
    })

    // Profile views over time (last 30 days)
    const profileViewsByDay = await prisma.profileView.groupBy({
      by: ['viewedAt'],
      where: {
        viewedUserId: userId,
        viewedAt: { gte: thirtyDaysAgo }
      },
      _count: true
    })

    // Social popularity score (simple formula)
    const popularityScore = Math.round(
      (likesReceived * 2) + 
      (commentsReceived * 3) + 
      (user._count.followers * 5) + 
      (profileViews * 0.5)
    )

    // 5. LIVE STREAM STATISTICS
    const streams = await prisma.videoStream.findMany({
      where: { userId },
      include: {
        _count: { select: { gifts: true, viewers: true, likes: true } },
        gifts: true
      }
    })

    const totalStreamDuration = streams.reduce((sum, s) => {
      if (s.endedAt && s.startedAt) {
        return sum + Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)
      }
      return sum
    }, 0)

    const totalViewers = streams.reduce((sum, s) => sum + s._count.viewers, 0)
    const avgViewersPerStream = streams.length > 0 ? Math.round(totalViewers / streams.length) : 0
    const maxViewers = streams.reduce((max, s) => Math.max(max, s._count.viewers), 0)

    const totalStreamEarnings = streams.reduce((sum, s) => 
      sum + s.gifts.reduce((gSum, g) => gSum + g.totalPrice, 0), 0
    )
    const avgCoinsPerStream = streams.length > 0 ? Math.round(totalStreamEarnings / streams.length) : 0

    // Most successful stream
    const mostSuccessfulStream = streams.sort((a, b) => {
      const aEarnings = a.gifts.reduce((sum, g) => sum + g.totalPrice, 0)
      const bEarnings = b.gifts.reduce((sum, g) => sum + g.totalPrice, 0)
      return bEarnings - aEarnings
    })[0]

    // Top gift sender to user's streams
    const allGifts = streams.flatMap(s => s.gifts)
    const giftsBySender: Record<string, number> = {}
    allGifts.forEach(g => {
      giftsBySender[g.senderId] = (giftsBySender[g.senderId] || 0) + g.totalPrice
    })
    const topGiftSenderId = Object.entries(giftsBySender).sort((a, b) => b[1] - a[1])[0]?.[0]
    
    let topGiftSender = null
    if (topGiftSenderId) {
      topGiftSender = await prisma.user.findUnique({
        where: { id: topGiftSenderId },
        select: { id: true, name: true, username: true, image: true }
      })
    }

    // 6. Activity graph data for last 30 days
    const activityGraphData: { date: string; fortunes: number; streams: number; posts: number; minutes: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const day = subDays(new Date(), i)
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayStart = startOfDay(day)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const dayFortunes = fortunes.filter(f => {
        const fDate = new Date(f.createdAt)
        return fDate >= dayStart && fDate < dayEnd
      }).length

      const dayStreams = streams.filter(s => {
        const sDate = new Date(s.createdAt)
        return sDate >= dayStart && sDate < dayEnd
      }).length

      const dayActivityData = dailyActivity.find(d => 
        format(new Date(d.date), 'yyyy-MM-dd') === dayStr
      )

      activityGraphData.push({
        date: format(day, 'MMM dd'),
        fortunes: dayFortunes,
        streams: dayStreams,
        posts: dayActivityData?.postsCreated || 0,
        minutes: dayActivityData?.minutesSpent || 0
      })
    }

    // Prepare response
    const statistics = {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        credits: user.credits,
        membership: user.membership,
        memberSince: user.createdAt,
        zodiacSign: user.zodiacSign,
        risingSign: user.risingSign,
        birthDate: user.birthDate,
        birthTime: user.birthTime,
        totalTimeSpentMinutes: user.totalTimeSpentMinutes
      },
      activity: {
        totalLogins,
        lastLogin,
        membershipDuration: user.createdAt,
        totalTimeSpentMinutes: user.totalTimeSpentMinutes,
        averageDailyMinutes,
        mostActiveHour,
        mostActiveDay,
        totalSessions,
        activityGraphData,
        hourlyActivity: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          minutes: hourlyActivity.find(h => h.hour === i)?.totalMinutes || 0
        }))
      },
      fortune: {
        total: user._count.fortunes,
        byType: fortunesByType,
        mostUsedType: mostUsedFortuneType,
        dailyHoroscopes,
        lastFortune: lastFortune ? {
          id: lastFortune.id,
          type: lastFortune.fortuneType,
          date: lastFortune.createdAt
        } : null,
        avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
        avgAccuracy: Math.round(avgAccuracy * 10) / 10
      },
      coins: {
        currentBalance: user.credits,
        totalPurchased,
        totalSpent,
        totalEarned,
        giftsSent,
        giftsReceived,
        streamSpending,
        avgDailySpending,
        highestSpendingDay,
        monthlySpending
      },
      social: {
        totalPosts: user._count.socialPosts,
        likesReceived,
        commentsReceived,
        followers: user._count.followers,
        following: user._count.following,
        profileViews,
        popularityScore,
        mostLikedPost: mostLikedPost ? {
          id: mostLikedPost.id,
          likes: mostLikedPost._count.likes,
          comments: mostLikedPost._count.comments
        } : null,
        mostCommentedPost: mostCommentedPost ? {
          id: mostCommentedPost.id,
          likes: mostCommentedPost._count.likes,
          comments: mostCommentedPost._count.comments
        } : null
      },
      streams: {
        totalHosted: user._count.videoStreams,
        totalDurationMinutes: totalStreamDuration,
        avgViewers: avgViewersPerStream,
        maxViewers,
        totalEarnings: totalStreamEarnings,
        avgCoinsPerStream,
        mostSuccessfulStream: mostSuccessfulStream ? {
          id: mostSuccessfulStream.id,
          title: mostSuccessfulStream.title,
          viewers: mostSuccessfulStream._count.viewers,
          earnings: mostSuccessfulStream.gifts.reduce((sum, g) => sum + g.totalPrice, 0)
        } : null,
        topGiftSender
      },
      liveSessions: {
        total: user._count.liveSessions
      }
    }

    return statistics
  } catch (error) {
    console.error('Statistics error:', error)
    return { error: 'Failed to fetch statistics' }
  }
}
