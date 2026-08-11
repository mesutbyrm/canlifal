import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { GIFT_SELECT, PublicGift, serializeGift } from '@/lib/gift-insights'

export const dynamic = 'force-dynamic'

type Grouped = {
  giftTypeId: string
  _sum: { quantity: number | null; receiverAmount: number | null; grossAmount: number | null }
  _count: { _all: number }
}

function buildItems(
  grouped: Grouped[],
  gMap: Map<string, PublicGift>,
  amountKey: 'earned' | 'spent'
) {
  return grouped
    .map(g => {
      const gift = gMap.get(g.giftTypeId)
      const quantity = g._sum.quantity || 0
      const amount =
        amountKey === 'earned' ? g._sum.receiverAmount || 0 : g._sum.grossAmount || 0
      return {
        gift: serializeGift(gift, g.giftTypeId),
        quantity,
        amount,
        [amountKey]: amount,
        times: g._count._all || 0,
        // flat aliases for the mobile client
        giftId: g.giftTypeId,
        id: g.giftTypeId,
        name: gift?.name || '',
        icon: gift?.iconImageUrl || gift?.thumbnailUrl || gift?.icon || null,
        count: quantity,
        rarity: gift?.tier || 'small',
      }
    })
    // SECOND backend orders by the monetary amount (earned/spent) descending.
    .sort((a, b) => b.amount - a.amount)
}

/**
 * GET /api/gifts/insights/collection/{userId}
 * Sent + received gift types with a completion percentage over the catalog.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    const empty = {
      completion: { totalGiftTypes: 0, distinctReceived: 0, percent: 0 },
      sent: [],
      received: [],
      distinctSent: 0,
    }
    if (!userId) return NextResponse.json(empty)

    const [totalGiftTypes, receivedRaw, sentRaw] = await Promise.all([
      // SECOND backend counts ALL gift types (no isActive filter) — matched exactly.
      prisma.giftType.count(),
      prisma.giftEvent.groupBy({
        by: ['giftTypeId'],
        where: { receiverId: userId, status: 'completed' },
        _sum: { quantity: true, receiverAmount: true, grossAmount: true },
        _count: { _all: true },
      }),
      prisma.giftEvent.groupBy({
        by: ['giftTypeId'],
        where: { senderId: userId, status: 'completed' },
        _sum: { quantity: true, receiverAmount: true, grossAmount: true },
        _count: { _all: true },
      }),
    ])

    const ids = Array.from(
      new Set([...receivedRaw, ...sentRaw].map(g => g.giftTypeId))
    )
    const gifts = ids.length
      ? await prisma.giftType.findMany({ where: { id: { in: ids } }, select: GIFT_SELECT })
      : []
    const gMap = new Map(gifts.map(g => [g.id, g]))

    const distinctReceived = receivedRaw.length
    const percent =
      totalGiftTypes > 0 ? Math.round((distinctReceived / totalGiftTypes) * 100) : 0

    return NextResponse.json({
      completion: { totalGiftTypes, distinctReceived, percent },
      sent: buildItems(sentRaw as Grouped[], gMap, 'spent'),
      received: buildItems(receivedRaw as Grouped[], gMap, 'earned'),
      distinctSent: sentRaw.length,
    })
  } catch (error) {
    console.error('[gifts/insights/collection]', error)
    return NextResponse.json({
      completion: { totalGiftTypes: 0, distinctReceived: 0, percent: 0 },
      sent: [],
      received: [],
      distinctSent: 0,
    })
  }
}
