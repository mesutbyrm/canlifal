import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '7' // days
    const daysAgo = Math.min(90, Math.max(1, parseInt(period)))
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - daysAgo)

    // Most viewed dreams in period
    const trendingDreams = await prisma.$queryRaw`
      SELECT di.id, di.title, di.slug, di.summary, di.category, di.keywords, di.views,
             COUNT(dv.id)::int as "recentViews"
      FROM dream_interpretations di
      LEFT JOIN dream_views dv ON dv."dreamId" = di.id AND dv."createdAt" >= ${sinceDate}
      WHERE di."isPublished" = true
      GROUP BY di.id
      ORDER BY "recentViews" DESC
      LIMIT 10
    ` as any[]

    // Most commented dreams in period
    const mostDiscussed = await prisma.$queryRaw`
      SELECT di.id, di.title, di.slug, di.summary, di.category,
             COUNT(dc.id)::int as "commentCount"
      FROM dream_interpretations di
      LEFT JOIN dream_comments dc ON dc."dreamId" = di.id AND dc."createdAt" >= ${sinceDate}
      WHERE di."isPublished" = true
      GROUP BY di.id
      HAVING COUNT(dc.id) > 0
      ORDER BY "commentCount" DESC
      LIMIT 10
    ` as any[]

    // Trending symbols/keywords
    const allKeywords = await prisma.$queryRaw`
      SELECT unnest(keywords) as keyword, COUNT(*)::int as count
      FROM dream_interpretations
      WHERE "isPublished" = true
      GROUP BY keyword
      ORDER BY count DESC
      LIMIT 20
    ` as Array<{ keyword: string; count: number }>

    // Category distribution
    const categoryStats = await prisma.$queryRaw`
      SELECT category, COUNT(*)::int as count,
             COALESCE(SUM(views), 0)::int as "totalViews"
      FROM dream_interpretations
      WHERE "isPublished" = true
      GROUP BY category
      ORDER BY count DESC
    ` as Array<{ category: string; count: number; totalViews: number }>

    // Zodiac-dream correlation (which zodiac views which dreams most)
    const zodiacTrends = await prisma.$queryRaw`
      SELECT u."zodiacSign", di.category, COUNT(*)::int as "viewCount"
      FROM dream_views dv
      JOIN users u ON u.id = dv."userId"
      JOIN dream_interpretations di ON di.id = dv."dreamId"
      WHERE u."zodiacSign" IS NOT NULL
        AND dv."createdAt" >= ${sinceDate}
        AND di."isPublished" = true
      GROUP BY u."zodiacSign", di.category
      ORDER BY "viewCount" DESC
      LIMIT 30
    ` as Array<{ zodiacSign: string; category: string; viewCount: number }>

    // Recent diary moods distribution
    const moodStats = await prisma.$queryRaw`
      SELECT mood, COUNT(*)::int as count
      FROM dream_diary_entries
      WHERE "createdAt" >= ${sinceDate}
        AND mood IS NOT NULL
      GROUP BY mood
      ORDER BY count DESC
    ` as Array<{ mood: string; count: number }>

    // Experience stats (from comments)
    const experienceStats = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN "experienceType" = 'deneyim' THEN 1 END)::int as "totalExperiences",
        COUNT(CASE WHEN "didComeTrue" = true THEN 1 END)::int as "cameTrue",
        COUNT(CASE WHEN "didComeTrue" = false THEN 1 END)::int as "didNotComeTrue"
      FROM dream_comments
      WHERE "createdAt" >= ${sinceDate}
    ` as any[]

    return NextResponse.json({
      trendingDreams,
      mostDiscussed,
      trendingKeywords: allKeywords,
      categoryStats,
      zodiacTrends,
      moodStats,
      experienceStats: experienceStats[0] || { totalExperiences: 0, cameTrue: 0, didNotComeTrue: 0 },
      period: daysAgo,
    })
  } catch (error) {
    console.error('Dream trends error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
