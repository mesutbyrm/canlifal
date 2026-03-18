export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { tellerId: string } }
) {
  try {
    const reviews = await prisma.liveTellerReview.findMany({
      where: { tellerId: params.tellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          select: {
            user: { select: { id: true, name: true, image: true, username: true } },
            fortuneType: true,
          },
        },
      },
      take: 20,
    })

    const stats = await prisma.liveTellerReview.aggregate({
      where: { tellerId: params.tellerId },
      _avg: { rating: true },
      _count: { id: true },
    })

    const ratingDist = await prisma.liveTellerReview.groupBy({
      by: ['rating'],
      where: { tellerId: params.tellerId },
      _count: { id: true },
    })

    return NextResponse.json({
      reviews,
      averageRating: stats._avg.rating || 0,
      totalReviews: stats._count.id,
      ratingDistribution: ratingDist,
    })
  } catch (error) {
    console.error('Teller reviews error:', error)
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}
