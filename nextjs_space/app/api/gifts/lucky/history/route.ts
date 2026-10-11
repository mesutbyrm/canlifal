import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/lucky/history
 * Query: ?scope=me|global  &limit=
 * - me (default): the authenticated user's own lucky-gift outcomes + summary
 * - global: recent big wins / jackpots feed (public leaderboard-style)
 * Dual-auth.
 */
export async function GET(request: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(request)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || (webSession?.user as any)?.id

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'me'
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '30') || 30)

    if (scope === 'global') {
      const rewards = await prisma.luckyGiftReward.findMany({
        where: { OR: [{ isJackpot: true }, { multiplier: { gte: 10 } }] },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      const userIds = Array.from(new Set(rewards.map(r => r.userId)))
      const giftIds = Array.from(new Set(rewards.map(r => r.giftTypeId)))
      const [users, gifts] = await Promise.all([
        prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, username: true, image: true } }),
        prisma.giftType.findMany({ where: { id: { in: giftIds } }, select: { id: true, name: true, icon: true, iconImageUrl: true } }),
      ])
      const uMap = new Map(users.map(u => [u.id, u]))
      const gMap = new Map(gifts.map(g => [g.id, g]))
      const feed = rewards.map(r => ({
        id: r.id,
        user: uMap.get(r.userId) || null,
        gift: gMap.get(r.giftTypeId) || null,
        multiplier: r.multiplier,
        wonJetons: r.wonJetons,
        isJackpot: r.isJackpot,
        createdAt: r.createdAt,
      }))
      return NextResponse.json({ scope: 'global', feed })
    }

    // scope=me
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const [rewards, agg] = await Promise.all([
      prisma.luckyGiftReward.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.luckyGiftReward.aggregate({
        where: { userId },
        _sum: { betJetons: true, wonJetons: true, netJetons: true },
        _count: true,
        _max: { multiplier: true },
      }),
    ])

    const giftIds = Array.from(new Set(rewards.map(r => r.giftTypeId)))
    const gifts = await prisma.giftType.findMany({
      where: { id: { in: giftIds } },
      select: { id: true, name: true, icon: true, iconImageUrl: true },
    })
    const gMap = new Map(gifts.map(g => [g.id, g]))

    return NextResponse.json({
      scope: 'me',
      summary: {
        totalPlays: agg._count || 0,
        totalBet: agg._sum.betJetons || 0,
        totalWon: agg._sum.wonJetons || 0,
        netJetons: agg._sum.netJetons || 0,
        bestMultiplier: agg._max.multiplier || 0,
      },
      history: rewards.map(r => ({
        id: r.id,
        gift: gMap.get(r.giftTypeId) || null,
        betJetons: r.betJetons,
        quantity: r.quantity,
        multiplier: r.multiplier,
        wonJetons: r.wonJetons,
        netJetons: r.netJetons,
        isJackpot: r.isJackpot,
        createdAt: r.createdAt,
      })),
    })
  } catch (e) {
    console.error('[lucky/history] error', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
