export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { safeInt } from '@/lib/short-videos'

/**
 * GET /api/hashtags/search?q=
 * # yazılırken öneri (isim geçen, kullanım sayısına göre).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim().replace(/^#/, '').toLocaleLowerCase('tr-TR')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10') || 10, 20)

    const hashtags = await prisma.hashtag.findMany({
      where: q.length > 0 ? { name: { contains: q } } : {},
      orderBy: { videosCount: 'desc' },
      take: limit,
      select: { id: true, name: true, videosCount: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        hashtags: hashtags.map((h) => ({
          id: h.id,
          name: h.name,
          tag: `#${h.name}`,
          videosCount: safeInt(h.videosCount),
        })),
      },
    })
  } catch (error: any) {
    console.error('[hashtags] search error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Hashtag araması başarısız' } },
      { status: 500 }
    )
  }
}
