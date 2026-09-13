export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/advisors/online
 * Auth: yok
 * Onaylanmış ve çevrimiçi falcıları döndürür.
 * Flutter ana sayfa şeridi: homeAdvisorsOnline yedek olarak fortuneTellers’ı da deniyor.
 */
export async function GET() {
  try {
    const tellers = await prisma.liveFortuneTeller.findMany({
      where: {
        isActive: true,
        applicationStatus: 'approved',
        isBanned: false,
        isOnline: true,
      },
      orderBy: [{ rating: 'desc' }, { totalSessions: 'desc' }],
      take: 20,
      select: {
        id: true,
        displayName: true,
        avatar: true,
        specialties: true,
        rating: true,
        totalReviews: true,
        pricePerSession: true,
        isOnline: true,
        bio: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        advisors: tellers.map((t: any) => ({
          id: t.id,
          name: t.displayName,
          displayName: t.displayName,
          avatar: t.avatar,
          specialties: t.specialties || [],
          rating: t.rating,
          totalReviews: t.totalReviews,
          pricePerSession: t.pricePerSession,
          isOnline: t.isOnline,
          bio: t.bio,
        })),
        tellers: tellers,
        items: tellers,
      },
    })
  } catch (error: any) {
    console.error('[advisors] online error:', error)
    return NextResponse.json({ success: true, data: { advisors: [], tellers: [], items: [] } })
  }
}
