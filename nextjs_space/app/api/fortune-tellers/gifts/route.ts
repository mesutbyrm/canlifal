import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get recent gifts for a teller (last 7 days)
export async function GET(request: NextRequest) {
  try {
    const tellerId = request.nextUrl.searchParams.get('tellerId')
    if (!tellerId) {
      return NextResponse.json({ error: 'tellerId required' }, { status: 400 })
    }

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const gifts = await prisma.tellerGift.findMany({
      where: {
        tellerId,
        createdAt: { gte: oneWeekAgo }
      },
      orderBy: { totalPrice: 'desc' },
      take: 20,
    })

    // Group by sender and sum total
    const senderMap: Record<string, { senderId: string; totalAmount: number; giftCount: number }> = {}
    for (const g of gifts) {
      if (!senderMap[g.senderId]) {
        senderMap[g.senderId] = { senderId: g.senderId, totalAmount: 0, giftCount: 0 }
      }
      senderMap[g.senderId].totalAmount += g.totalPrice
      senderMap[g.senderId].giftCount += g.quantity
    }

    const senderIds = Object.keys(senderMap)
    const users = senderIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, image: true, username: true }
    }) : []

    const userMap: Record<string, { name: string; image: string | null; username: string | null }> = {}
    users.forEach((u: any) => { userMap[u.id] = { name: u.name, image: u.image, username: u.username } })

    const result = Object.values(senderMap)
      .map(s => ({
        ...s,
        senderName: userMap[s.senderId]?.name || 'Anonim',
        senderImage: userMap[s.senderId]?.image || null,
        senderUsername: userMap[s.senderId]?.username || null,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Fetch teller gifts error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
