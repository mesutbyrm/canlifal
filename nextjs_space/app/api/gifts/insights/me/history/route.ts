import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import {
  GIFT_SELECT,
  USER_SELECT,
  clampLimit,
  displayNameOf,
  serializeGift,
  serializeUser,
} from '@/lib/gift-insights'
import { isCursorMode, parseCursorParams, fetchCursorPage } from '@/lib/pagination'
import { apiPaginated } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/insights/me/history
 * Query: ?direction=all|sent|received &status= &page= &limit=
 * The authenticated user's own gift ledger. Dual-auth.
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
    const direction = (searchParams.get('direction') || 'all').toLowerCase()
    const status = searchParams.get('status')
    const limit = clampLimit(searchParams.get('limit'), 50, 100)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

    const where: Record<string, any> = {}
    if (direction === 'sent') where.senderId = userId
    else if (direction === 'received') where.receiverId = userId
    else where.OR = [{ senderId: userId }, { receiverId: userId }]
    if (status) where.status = status

    // Faz 19 — opt-in imleç modu (?cursor= veya ?paginate=cursor). Aksi hâlde eski davranış.
    if (isCursorMode(request)) {
      const cp = parseCursorParams(request, 50, 100)
      const { items: cEvents, meta } = await fetchCursorPage(
        (args) => prisma.giftEvent.findMany(args),
        cp.cursor,
        cp.limit,
        { where, orderBy: { createdAt: 'desc' } }
      )
      const shaped = await shapeEvents(cEvents, userId)
      return apiPaginated(shaped, meta)
    }

    const [total, events] = await Promise.all([
      prisma.giftEvent.count({ where }),
      prisma.giftEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    if (events.length === 0) {
      return NextResponse.json({ items: [], page, limit, total, hasMore: false })
    }

    const counterpartyIds = Array.from(
      new Set(events.map(e => (e.senderId === userId ? e.receiverId : e.senderId)))
    )
    const giftIds = Array.from(new Set(events.map(e => e.giftTypeId)))
    const [users, gifts] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: counterpartyIds } }, select: USER_SELECT }),
      prisma.giftType.findMany({ where: { id: { in: giftIds } }, select: GIFT_SELECT }),
    ])
    const uMap = new Map(users.map(u => [u.id, u]))
    const gMap = new Map(gifts.map(g => [g.id, g]))

    const items = events.map(e => {
      const isSent = e.senderId === userId
      const otherId = isSent ? e.receiverId : e.senderId
      const other = uMap.get(otherId)
      const gift = gMap.get(e.giftTypeId)
      return {
        id: e.id,
        direction: isSent ? 'sent' : 'received',
        status: e.status,
        counterparty: serializeUser(other, otherId),
        counterpartyName: displayNameOf(other),
        gift: serializeGift(gift, e.giftTypeId),
        giftName: gift?.name || '',
        giftIcon: gift?.iconImageUrl || gift?.thumbnailUrl || gift?.icon || null,
        quantity: e.quantity,
        amount: isSent ? e.grossAmount : e.receiverAmount,
        grossAmount: e.grossAmount,
        receiverAmount: e.receiverAmount,
        context: e.context,
        contextId: e.contextId,
        createdAt: e.createdAt.toISOString(),
        at: e.createdAt.toISOString(),
      }
    })

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    })
  } catch (error) {
    console.error('[gifts/insights/me/history]', error)
    return NextResponse.json({ error: 'Hediye geçmişi alınamadı' }, { status: 500 })
  }
}

/** Faz 19 — imleç modunda ham GiftEvent kayıtlarını eski gövde şekline dönüştürür. */
async function shapeEvents(events: any[], userId: string) {
  if (events.length === 0) return []
  const counterpartyIds = Array.from(
    new Set(events.map((e) => (e.senderId === userId ? e.receiverId : e.senderId)))
  )
  const giftIds = Array.from(new Set(events.map((e) => e.giftTypeId)))
  const [users, gifts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: counterpartyIds } }, select: USER_SELECT }),
    prisma.giftType.findMany({ where: { id: { in: giftIds } }, select: GIFT_SELECT }),
  ])
  const uMap = new Map(users.map((u) => [u.id, u]))
  const gMap = new Map(gifts.map((g) => [g.id, g]))
  return events.map((e) => {
    const isSent = e.senderId === userId
    const otherId = isSent ? e.receiverId : e.senderId
    const other = uMap.get(otherId)
    const gift = gMap.get(e.giftTypeId)
    return {
      id: e.id,
      direction: isSent ? 'sent' : 'received',
      status: e.status,
      counterparty: serializeUser(other, otherId),
      counterpartyName: displayNameOf(other),
      gift: serializeGift(gift, e.giftTypeId),
      giftName: gift?.name || '',
      giftIcon: gift?.iconImageUrl || gift?.thumbnailUrl || gift?.icon || null,
      quantity: e.quantity,
      amount: isSent ? e.grossAmount : e.receiverAmount,
      grossAmount: e.grossAmount,
      receiverAmount: e.receiverAmount,
      context: e.context,
      contextId: e.contextId,
      createdAt: e.createdAt.toISOString(),
      at: e.createdAt.toISOString(),
    }
  })
}
