import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET /api/referral/users — davet edilen kullanıcıların listesi. */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where: { referredById: auth.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          createdAt: true,
          isBanned: true,
        },
      }),
      prisma.user.count({ where: { referredById: auth.id } }),
    ])

    const ids = rows.map((r) => r.id)
    const earnings = ids.length
      ? await prisma.referralCommission.groupBy({
          by: ['sourceUserId'],
          where: { earnerId: auth.id, sourceUserId: { in: ids } },
          _sum: { amount: true, topupAmount: true },
        })
      : []
    const byUser = new Map(earnings.map((e) => [e.sourceUserId, e]))

    const items = rows.map((r) => {
      const e = byUser.get(r.id)
      return {
        userId: r.id,
        id: r.id,
        username: r.username,
        displayName: r.name,
        name: r.name,
        avatarUrl: r.image,
        joinedAt: r.createdAt,
        createdAt: r.createdAt,
        status: r.isBanned ? 'banned' : (e ? 'active' : 'pending'),
        referralStatus: r.isBanned ? 'banned' : (e ? 'active' : 'pending'),
        eligibleJetonVolume: e?._sum.topupAmount || 0,
        referralEarnings: e?._sum.amount || 0,
      }
    })

    return NextResponse.json({
      success: true,
      data: { items, users: items, total, limit, offset },
    })
  } catch (error) {
    console.error('[Referral users] Error:', error)
    return NextResponse.json({ error: 'Davet edilenler alınamadı' }, { status: 500 })
  }
}
