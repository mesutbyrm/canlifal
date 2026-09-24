export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { withCachePolicy } from '@/lib/perf'

function db(): any {
  return prisma as any
}

/**
 * GET /api/site-animations/active
 * Yayında olan (status='active') animasyonların herkese açık listesi.
 * Query: ?category=&membership=&context=&limit=
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const membership = searchParams.get('membership')
    const context = searchParams.get('context')
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)

    const now = new Date()
    const where: any = { status: 'active' }
    if (category && category !== 'all') where.category = category
    if (membership && membership !== 'all') where.membershipLevel = membership

    const rows = await db().animation.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { priority: 'desc' }],
      take: limit,
      select: {
        id: true, name: true, slug: true, category: true, type: true,
        assetUrl: true, thumbnailUrl: true, previewUrl: true, soundUrl: true,
        durationMs: true, priority: true, rarity: true, membershipLevel: true,
        contexts: true, position: true, scale: true, anchor: true,
        cooldownMs: true, canSkip: true, activeFrom: true, activeTo: true,
        sortOrder: true,
      },
    })

    // Zaman penceresi + context filtreleri (bellekte)
    const items = (rows || []).filter((a: any) => {
      if (a.activeFrom && new Date(a.activeFrom) > now) return false
      if (a.activeTo && new Date(a.activeTo) < now) return false
      if (context) {
        const ctxs = Array.isArray(a.contexts) ? a.contexts : []
        if (ctxs.length > 0 && !ctxs.includes(context)) return false
      }
      return true
    })

    return withCachePolicy(
      NextResponse.json({ items, total: items.length }),
      'public-1d',
    )
  } catch (e) {
    console.error('[site-animations/active GET]', e)
    return NextResponse.json({ items: [], total: 0 }, { status: 500 })
  }
}
