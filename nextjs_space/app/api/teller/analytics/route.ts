export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { userId: authUser.id },
    })
    if (!teller) {
      return NextResponse.json({ error: 'Falcı profili bulunamadı' }, { status: 404 })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get sessions for the last 30 days
    const sessions = await prisma.liveSession.findMany({
      where: {
        tellerId: teller.id,
        status: 'completed',
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        createdAt: true,
        startedAt: true,
        endedAt: true,
        minutesUsed: true,
        creditsCharged: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Best hours analysis (what hours have the most sessions)
    const hourCounts: Record<number, number> = {}
    for (let h = 0; h < 24; h++) hourCounts[h] = 0
    for (const s of sessions) {
      const hour = new Date(s.createdAt).getHours()
      hourCounts[hour]++
    }
    const bestHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Daily session counts (last 7 days)
    const dailySessions: { date: string; count: number; earnings: number }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().slice(0, 10)
      const daySessions = sessions.filter(s => new Date(s.createdAt).toISOString().slice(0, 10) === dateStr)
      dailySessions.push({
        date: dateStr,
        count: daySessions.length,
        earnings: daySessions.reduce((sum, s) => sum + (s.creditsCharged || 0), 0),
      })
    }
    dailySessions.reverse()

    // Average session duration
    const sessionsWithDuration = sessions.filter(s => s.minutesUsed && s.minutesUsed > 0)
    const avgDuration = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, s) => sum + (s.minutesUsed || 0), 0) / sessionsWithDuration.length
      : 0

    // Weekly vs previous week comparison
    const thisWeekSessions = sessions.filter(s => new Date(s.createdAt) >= sevenDaysAgo)
    const prevWeekSessions = sessions.filter(s => {
      const d = new Date(s.createdAt)
      return d >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) && d < sevenDaysAgo
    })
    const thisWeekEarnings = thisWeekSessions.reduce((s, se) => s + (se.creditsCharged || 0), 0)
    const prevWeekEarnings = prevWeekSessions.reduce((s, se) => s + (se.creditsCharged || 0), 0)
    const earningsChange = prevWeekEarnings > 0
      ? Math.round(((thisWeekEarnings - prevWeekEarnings) / prevWeekEarnings) * 100)
      : thisWeekEarnings > 0 ? 100 : 0

    // Reviews summary
    const recentReviews = await prisma.liveTellerReview.findMany({
      where: { tellerId: teller.id, createdAt: { gte: thirtyDaysAgo } },
      select: { rating: true, comment: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    const avgRecentRating = recentReviews.length > 0
      ? recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length
      : teller.rating

    // Performance tips
    const tips: string[] = []
    if (bestHours.length > 0 && bestHours[0].count > 0) {
      const topHour = bestHours[0].hour
      tips.push(`En yoğun saatiniz: ${topHour}:00-${topHour + 1}:00. Bu saatlerde online olmanız önerilir.`)
    }
    if (earningsChange < 0) {
      tips.push('Geçen haftaya göre kazançlarınız düştü. Daha fazla online kalın.')
    }
    if (avgDuration < 5 && sessionsWithDuration.length > 3) {
      tips.push('Ortalama seans süreniz kısa. Daha uzun seanslar daha fazla kazanç sağlar.')
    }
    if (teller.totalReviews < 5) {
      tips.push('Daha fazla yorum almak için kullanıcılardan yorum istemelerine teşvik edin.')
    }
    if (avgRecentRating < 4.0 && recentReviews.length >= 3) {
      tips.push('Son dönem puanınız düşme eğiliminde. Hizmet kalitenizi artırmayı düşünün.')
    }
    if (tips.length === 0) {
      tips.push('Harika gidiyorsunuz! Aktif kalmaya devam edin. ✨')
    }

    return NextResponse.json({
      summary: {
        totalSessions30d: sessions.length,
        totalEarnings30d: Math.floor(sessions.reduce((s, se) => s + (se.creditsCharged || 0), 0)),
        avgDuration: Math.round(avgDuration * 10) / 10,
        avgRating: Math.round(avgRecentRating * 10) / 10,
        thisWeekSessions: thisWeekSessions.length,
        thisWeekEarnings: Math.floor(thisWeekEarnings),
        earningsChange,
      },
      bestHours,
      dailySessions,
      recentReviews,
      tips,
    })
  } catch (error: any) {
    console.error('[TellerAnalytics] Error:', error)
    return NextResponse.json({ error: 'Analitikler alınamadı' }, { status: 500 })
  }
}
