import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  GIFT_SELECT,
  USER_SELECT,
  clampLimit,
  displayAmount,
  displayNameOf,
  ledgerWhere,
  normalizeContext,
  serializeGift,
  serializeUser,
} from '@/lib/gift-insights'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/insights/feed
 * Query: ?context= &contextId= &limit=
 * Public live gift feed. Hidden gifts are excluded.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const context = normalizeContext(searchParams.get('context'))
    const contextId = searchParams.get('contextId')
    const limit = clampLimit(searchParams.get('limit'), 50, 100)

    const where: Record<string, any> = ledgerWhere({ context })
    if (contextId) where.contextId = contextId

    const events = await prisma.giftEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit * 2, // headroom: hidden gifts are filtered out below
    })

    if (events.length === 0) return NextResponse.json({ items: [] })

    const userIds = Array.from(
      new Set(events.flatMap(e => [e.senderId, e.receiverId]))
    )
    const giftIds = Array.from(new Set(events.map(e => e.giftTypeId)))

    const [users, gifts] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: userIds } }, select: USER_SELECT }),
      prisma.giftType.findMany({ where: { id: { in: giftIds } }, select: GIFT_SELECT }),
    ])
    const uMap = new Map(users.map(u => [u.id, u]))
    const gMap = new Map(gifts.map(g => [g.id, g]))

    const items = events
      .filter(e => gMap.get(e.giftTypeId)?.isHidden !== true)
      .slice(0, limit)
      .map(e => {
        const sender = uMap.get(e.senderId)
        const receiver = uMap.get(e.receiverId)
        const gift = gMap.get(e.giftTypeId)
        return {
          id: e.id,
          sender: serializeUser(sender, e.senderId),
          receiver: serializeUser(receiver, e.receiverId),
          gift: serializeGift(gift, e.giftTypeId),
          quantity: e.quantity,
          context: e.context,
          contextId: e.contextId,
          displayLabel: displayAmount(e.grossAmount),
          createdAt: e.createdAt.toISOString(),
          // flat aliases for the mobile client
          senderId: e.senderId,
          receiverId: e.receiverId,
          senderName: displayNameOf(sender),
          receiverName: displayNameOf(receiver),
          giftName: gift?.name || '',
          giftIcon: gift?.iconImageUrl || gift?.thumbnailUrl || gift?.icon || null,
          amount: e.grossAmount,
          at: e.createdAt.toISOString(),
        }
      })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('[gifts/insights/feed]', error)
    return NextResponse.json({ items: [] })
  }
}
