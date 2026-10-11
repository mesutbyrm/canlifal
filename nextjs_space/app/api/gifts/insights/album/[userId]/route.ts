import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { serializeGift } from '@/lib/gift-insights'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/insights/album/{userId}
 * Every distinct gift this user has RECEIVED, with totals — the trophy shelf.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    if (!userId) return NextResponse.json({ totalDistinct: 0, items: [] })

    const grouped = await prisma.giftEvent.groupBy({
      by: ['giftTypeId'],
      where: { receiverId: userId, status: 'completed' },
      _sum: { quantity: true, receiverAmount: true, grossAmount: true },
      _count: { _all: true },
    })

    if (grouped.length === 0) {
      return NextResponse.json({ totalDistinct: 0, items: [] })
    }

    // SECOND backend returns the FULL gift type record inside `gift` — matched exactly.
    const gifts = await prisma.giftType.findMany({
      where: { id: { in: grouped.map(g => g.giftTypeId) } },
    })
    const gMap = new Map(gifts.map(g => [g.id, g]))

    const items = grouped
      .map((g: any) => {
        const gift = gMap.get(g.giftTypeId)
        const totalQuantity = g._sum.quantity || 0
        return {
          gift: { ...(gift as any), ...serializeGift(gift as any, g.giftTypeId) },
          totalQuantity,
          totalEarned: g._sum.receiverAmount || 0,
          totalGross: g._sum.grossAmount || 0,
          times: g._count._all || 0,
          // flat aliases for the mobile client
          giftId: g.giftTypeId,
          id: g.giftTypeId,
          name: gift?.name || '',
          icon: gift?.iconImageUrl || gift?.thumbnailUrl || gift?.icon || null,
          quantity: totalQuantity,
          count: totalQuantity,
          rarity: gift?.tier || 'small',
        }
      })
      .sort((a, b) => b.totalGross - a.totalGross)

    return NextResponse.json({ totalDistinct: items.length, items })
  } catch (error) {
    console.error('[gifts/insights/album]', error)
    return NextResponse.json({ totalDistinct: 0, items: [] })
  }
}
