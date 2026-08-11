import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  USER_SELECT,
  clampLimit,
  displayAmount,
  displayNameOf,
  ledgerWhere,
  normalizeContext,
  normalizePeriod,
  normalizeScope,
  serializeUser,
} from '@/lib/gift-insights'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/insights/leaderboard
 * Query: ?type=senders|receivers &period=daily|weekly|monthly|yearly|all
 *        &scope=tr|world &context=all|live_stream|... &limit=
 *
 * senders   → ranked by total jetons spent (grossAmount)
 * receivers → ranked by total jetons earned (receiverAmount)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') || 'senders').toLowerCase() === 'receivers'
      ? 'receivers'
      : 'senders'
    const period = normalizePeriod(searchParams.get('period'))
    const scope = normalizeScope(searchParams.get('scope'))
    const contextParam = searchParams.get('context')
    const context = normalizeContext(contextParam)
    const limit = clampLimit(searchParams.get('limit'), 100, 200)

    const where = ledgerWhere({ period, context, scope, scopeField: 'sender' })

    const grouped = await prisma.giftEvent.groupBy({
      by: [type === 'senders' ? 'senderId' : 'receiverId'],
      where,
      _sum: type === 'senders' ? { grossAmount: true } : { receiverAmount: true },
      _count: { _all: true },
    })

    const rows = grouped
      .map((g: any) => ({
        userId: (type === 'senders' ? g.senderId : g.receiverId) as string,
        amount:
          (type === 'senders' ? g._sum.grossAmount : g._sum.receiverAmount) || 0,
        gifts: g._count._all || 0,
      }))
      .filter(r => r.amount > 0)
      .sort((a, b) => b.amount - a.amount || b.gifts - a.gifts)
      .slice(0, limit)

    const users = rows.length
      ? await prisma.user.findMany({
          where: { id: { in: rows.map(r => r.userId) } },
          select: USER_SELECT,
        })
      : []
    const uMap = new Map(users.map(u => [u.id, u]))

    const entries = rows.map((r, i) => {
      const u = uMap.get(r.userId)
      return {
        rank: i + 1,
        user: serializeUser(u, r.userId),
        amount: r.amount,
        displayAmount: displayAmount(r.amount),
        gifts: r.gifts,
        // flat aliases for the mobile client
        userId: r.userId,
        displayName: displayNameOf(u),
        avatarUrl: u?.image ?? null,
        city: u?.city ?? null,
        country: u?.country ?? null,
        totalCoins: r.amount,
        giftCount: r.gifts,
      }
    })

    return NextResponse.json({
      type,
      period,
      scope,
      context: context || 'all',
      entries,
    })
  } catch (error) {
    console.error('[gifts/insights/leaderboard]', error)
    return NextResponse.json({
      type: 'senders',
      period: 'weekly',
      scope: 'tr',
      context: 'all',
      entries: [],
    })
  }
}
