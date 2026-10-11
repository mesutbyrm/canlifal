export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * GET /api/teller/reviews
 * Auth: ZORUNLU (falcı)
 * Seans sonrası değerlendirmeler — falcının kendi değerlendirme özeti.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { userId: authUser.id },
      select: { id: true },
    })
    if (!teller) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_TELLER', message: 'Falcı profili bulunamadı' } },
        { status: 403 }
      )
    }

    const [reviews, stats, ratingDist] = await Promise.all([
      prisma.liveTellerReview.findMany({
        where: { tellerId: teller.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          session: {
            select: {
              user: { select: { id: true, name: true, image: true, username: true } },
              fortuneType: true,
            },
          },
        },
      }),
      prisma.liveTellerReview.aggregate({
        where: { tellerId: teller.id },
        _avg: { rating: true },
        _count: { id: true },
      }),
      prisma.liveTellerReview.groupBy({
        by: ['rating'],
        where: { tellerId: teller.id },
        _count: { id: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count.id,
        ratingDistribution: ratingDist,
      },
    })
  } catch (error: any) {
    console.error('[teller] reviews error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Değerlendirmeler alınamadı' } },
      { status: 500 }
    )
  }
}
