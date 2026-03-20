import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      // For anonymous users, return popular dreams
      const popular = await prisma.dreamInterpretation.findMany({
        where: { isPublished: true },
        orderBy: { views: 'desc' },
        take: 6,
        select: { id: true, title: true, slug: true, summary: true, views: true, keywords: true },
      })
      return NextResponse.json({ recommendations: popular, type: 'popular' })
    }

    const userId = (session.user as any).id

    // Get user's recent views and favorites to find their interests
    const [recentViews, favorites] = await Promise.all([
      prisma.dreamView.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { dream: { select: { id: true, keywords: true } } },
      }),
      prisma.dreamFavorite.findMany({
        where: { userId },
        select: { dream: { select: { id: true, keywords: true } } },
      }),
    ])

    // Collect all keywords from viewed/favorited dreams
    const viewedDreamIds = new Set(recentViews.map((v: any) => v.dream.id))
    const favDreamIds = new Set(favorites.map((f: any) => f.dream.id))
    const allInteractedIds = new Set([...viewedDreamIds, ...favDreamIds])

    const keywordFreq: Record<string, number> = {}
    for (const v of recentViews) {
      for (const kw of v.dream.keywords) {
        keywordFreq[kw] = (keywordFreq[kw] || 0) + 1
      }
    }
    for (const f of favorites) {
      for (const kw of f.dream.keywords) {
        keywordFreq[kw] = (keywordFreq[kw] || 0) + 2 // favorites weigh more
      }
    }

    // Get top keywords
    const topKeywords = Object.entries(keywordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([kw]) => kw)

    if (topKeywords.length === 0) {
      // No history, return popular
      const popular = await prisma.dreamInterpretation.findMany({
        where: { isPublished: true },
        orderBy: { views: 'desc' },
        take: 6,
        select: { id: true, title: true, slug: true, summary: true, views: true, keywords: true },
      })
      return NextResponse.json({ recommendations: popular, type: 'popular' })
    }

    // Find dreams matching user interests that they haven't seen
    const recommendations = await prisma.dreamInterpretation.findMany({
      where: {
        isPublished: true,
        id: { notIn: Array.from(allInteractedIds) },
        keywords: { hasSome: topKeywords },
      },
      orderBy: { views: 'desc' },
      take: 6,
      select: { id: true, title: true, slug: true, summary: true, views: true, keywords: true },
    })

    // If not enough, fill with popular ones
    if (recommendations.length < 6) {
      const filler = await prisma.dreamInterpretation.findMany({
        where: {
          isPublished: true,
          id: { notIn: [...Array.from(allInteractedIds), ...recommendations.map((r: any) => r.id)] },
        },
        orderBy: { views: 'desc' },
        take: 6 - recommendations.length,
        select: { id: true, title: true, slug: true, summary: true, views: true, keywords: true },
      })
      recommendations.push(...filler)
    }

    return NextResponse.json({ recommendations, type: 'personalized', topKeywords })
  } catch (error) {
    console.error('Dream recommendations error:', error)
    return NextResponse.json({ recommendations: [], type: 'error' })
  }
}
