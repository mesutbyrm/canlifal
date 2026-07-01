export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { safeInt } from '@/lib/short-videos'

/**
 * GET /api/hashtags/trending
 * Trend hashtag'ler (kullanım sayısına göre).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 50)

    const hashtags = await prisma.hashtag.findMany({
      where: { videosCount: { gt: 0 } },
      orderBy: [{ videosCount: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      select: { id: true, name: true, videosCount: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        hashtags: hashtags.map((h, i) => ({
          id: h.id,
          name: h.name,
          tag: `#${h.name}`,
          videosCount: safeInt(h.videosCount),
          rank: i + 1,
        })),
      },
    })
  } catch (error: any) {
    console.error('[hashtags] trending error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Trend hashtag alınamadı' } },
      { status: 500 }
    )
  }
}
