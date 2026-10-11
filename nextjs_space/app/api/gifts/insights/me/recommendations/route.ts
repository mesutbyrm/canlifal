import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { GIFT_SELECT, clampLimit, normalizeContext } from '@/lib/gift-insights'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/insights/me/recommendations
 * Query: ?context= &limit=
 *
 * Deterministic, heuristic recommendations (no AI call, no external service):
 *   1. gifts the user sends most often  → "Sık gönderdiğin hediye"
 *   2. featured / popular / new catalog gifts they have never sent
 *   3. affordable filler around the user's typical spend
 * Dual-auth.
 */
export async function GET(request: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(request)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || (webSession?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const context = normalizeContext(searchParams.get('context'))
    const limit = clampLimit(searchParams.get('limit'), 8, 30)

    const catalogWhere: Record<string, any> = { isActive: true, isHidden: false }
    if (context === 'voice_room') catalogWhere.visibleInVoiceRoom = true
    else if (context === 'live_stream') catalogWhere.visibleInLiveStream = true

    const [history, catalog] = await Promise.all([
      prisma.giftEvent.groupBy({
        by: ['giftTypeId'],
        where: { senderId: userId, status: 'completed' },
        _sum: { quantity: true },
        _count: { _all: true },
      }),
      prisma.giftType.findMany({
        where: catalogWhere,
        select: GIFT_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
        take: 200,
      }),
    ])

    const gMap = new Map(catalog.map(g => [g.id, g]))
    const sentCount = new Map(history.map(h => [h.giftTypeId, h._count._all || 0]))

    const recommendations: Array<Record<string, any>> = []
    const seen = new Set<string>()

    const push = (gift: (typeof catalog)[number] | undefined, reason: string) => {
      if (!gift || seen.has(gift.id) || recommendations.length >= limit) return
      seen.add(gift.id)
      recommendations.push({
        giftId: gift.id,
        id: gift.id,
        name: gift.name,
        nameEn: gift.nameEn,
        icon: gift.iconImageUrl || gift.thumbnailUrl || gift.icon,
        iconUrl: gift.iconImageUrl || gift.thumbnailUrl || gift.icon,
        thumbnailUrl: gift.thumbnailUrl,
        price: gift.price,
        tier: gift.tier,
        category: gift.category,
        reason,
      })
    }

    // 1. favourites
    const favourites = history
      .slice()
      .sort((a, b) => (b._count._all || 0) - (a._count._all || 0))
      .slice(0, 3)
    for (const f of favourites) push(gMap.get(f.giftTypeId), 'Sık gönderdiğin hediye')

    // 2. catalog highlights the user has never sent
    const highlights = await prisma.giftType.findMany({
      where: { ...catalogWhere, OR: [{ isFeatured: true }, { isPopular: true }, { isNew: true }] },
      select: GIFT_SELECT,
      orderBy: [{ sortOrder: 'asc' }],
      take: 30,
    })
    for (const g of highlights) {
      if (sentCount.has(g.id)) continue
      push(g, 'Henüz göndermediğin popüler hediye')
    }

    // 3. affordable filler around the user's usual spend
    for (const g of catalog) push(g, 'Sana uygun hediye')

    return NextResponse.json({ recommendations, items: recommendations })
  } catch (error) {
    console.error('[gifts/insights/me/recommendations]', error)
    return NextResponse.json({ error: 'Öneriler alınamadı' }, { status: 500 })
  }
}
