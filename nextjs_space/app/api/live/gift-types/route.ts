import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { resolveMediaUrl } from '@/lib/media-url'

export const dynamic = 'force-dynamic'

/**
 * GET /api/live/gift-types
 * Returns all active gift types for Flutter gift panel.
 * Cached for 60 seconds to reduce DB load.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    // Use cache to avoid DB storm
    const { getCached } = await import('@/lib/cache')
    const cacheKey = 'live:gift_types'
    const data = await getCached(cacheKey, 60, async () => {
      const giftTypes = await prisma.giftType.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
        select: {
          id: true,
          name: true,
          nameEn: true,
          icon: true,
          animation: true,
          price: true,
          sortOrder: true,
          thumbnailUrl: true,
          assetUrl: true,
          assetType: true
        }
      })
      return giftTypes
    })

    // Normalize: ensure no null in any field
    const safeTypes = (data || []).map((g: any) => ({
      id: g.id || '',
      name: g.name || '',
      nameEn: g.nameEn || '',
      icon: g.icon || '',
      animation: g.animation || '',
      price: typeof g.price === 'number' ? g.price : 0,
      sortOrder: typeof g.sortOrder === 'number' ? g.sortOrder : 0,
      thumbnailUrl: resolveMediaUrl(g.thumbnailUrl) || '',
      assetUrl: resolveMediaUrl(g.assetUrl) || '',
      assetType: g.assetType || '',
    }))

    return NextResponse.json({
      success: true,
      data: {
        giftTypes: safeTypes,
        totalCount: safeTypes.length
      }
    })
  } catch (error) {
    console.error('Error in GET /api/live/gift-types:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Hediye türleri alınamadı' } },
      { status: 500 }
    )
  }
}
