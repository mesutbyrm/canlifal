import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Yayın hediye liderlik tablosu (mobil).
// ?period=session|weekly|monthly  (varsayılan: session = yayının tamamı)
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const url = new URL(request.url)
    const period = (url.searchParams.get('period') || url.searchParams.get('range') || 'session').toLowerCase()
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 100)

    const where: any = { streamId: params.streamId }
    if (period === 'weekly' || period === 'monthly') {
      const days = period === 'weekly' ? 7 : 30
      where.createdAt = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
    }

    const grouped = await prisma.streamGift.groupBy({
      by: ['senderId'],
      where,
      _sum: { totalPrice: true, quantity: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit,
    })

    const senderIds = grouped.map((g) => g.senderId)
    const users = senderIds.length
      ? await prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, name: true, username: true, image: true, city: true, country: true, level: true },
        })
      : []
    const userMap = new Map(users.map((u) => [u.id, u]))

    const leaders = grouped.map((g, index) => {
      const u = userMap.get(g.senderId)
      return {
        rank: index + 1,
        userId: g.senderId,
        displayName: u?.name || u?.username || 'Kullanıcı',
        avatarUrl: u?.image || null,
        city: u?.city || null,
        country: u?.country || null,
        level: (u as any)?.level ?? null,
        totalCoins: g._sum.totalPrice || 0,
        giftCount: g._sum.quantity || 0,
      }
    })

    return NextResponse.json({ period, leaders, items: leaders, total: leaders.length })
  } catch (error) {
    console.error('Error building stream gift leaderboard:', error)
    return NextResponse.json({ period: 'session', leaders: [], items: [], total: 0 })
  }
}
