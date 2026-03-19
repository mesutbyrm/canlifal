import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const dream = await prisma.dreamInterpretation.findUnique({
      where: { slug, isPublished: true },
    })

    if (!dream) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Increment views
    await prisma.dreamInterpretation.update({
      where: { id: dream.id },
      data: { views: { increment: 1 } },
    }).catch(() => {})

    // Get similar dreams based on keywords AND category (enhanced)
    const keywordConditions = dream.keywords.length > 0
      ? [{ keywords: { hasSome: dream.keywords } }]
      : []
    
    const similar = await prisma.dreamInterpretation.findMany({
      where: {
        isPublished: true,
        id: { not: dream.id },
        OR: [
          ...keywordConditions,
          { category: dream.category },
        ],
      },
      orderBy: { views: 'desc' },
      take: 8,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        category: true,
        keywords: true,
        views: true,
      },
    })

    // Sort by relevance: keyword match count + same category bonus
    const scored = similar.map(s => {
      let score = 0
      if (s.category === dream.category) score += 3
      const matchingKw = s.keywords.filter(k => dream.keywords.includes(k))
      score += matchingKw.length * 2
      return { ...s, _score: score }
    }).sort((a, b) => b._score - a._score).slice(0, 6)

    // Experience stats for this dream
    const experienceStats = await prisma.dreamComment.groupBy({
      by: ['experienceType'],
      where: { dreamId: dream.id },
      _count: true,
    })

    const cameTrue = await prisma.dreamComment.count({
      where: { dreamId: dream.id, didComeTrue: true },
    })
    const didNotComeTrue = await prisma.dreamComment.count({
      where: { dreamId: dream.id, didComeTrue: false },
    })

    return NextResponse.json({
      dream,
      similar: scored.map(({ _score, ...rest }) => rest),
      experienceStats: {
        comments: experienceStats.find(e => e.experienceType === 'yorum')?._count || 0,
        experiences: experienceStats.find(e => e.experienceType === 'deneyim')?._count || 0,
        cameTrue,
        didNotComeTrue,
      },
    })
  } catch (error) {
    console.error('Dream detail error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
