import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Returns recent high-value gifts (lion gifts or 1000+ jeton gifts) from the last 15 minutes
export async function GET() {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)

    // Get recent gift_received notifications that are high value
    const recentGiftNotifs = await prisma.notification.findMany({
      where: {
        type: 'gift_received',
        createdAt: { gte: fifteenMinutesAgo }
      },
      include: {
        user: { select: { name: true, username: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    const notifications: Array<{
      id: string
      senderName: string
      recipientName: string
      giftType: string
      giftIcon: string
      amount: number
      createdAt: string
    }> = []

    for (const notif of recentGiftNotifs) {
      if (!notif.data) continue
      try {
        const data = JSON.parse(notif.data as string)

        // Check if it's a big jeton gift (500+)
        if (data.type === 'jeton' && data.amount >= 500) {
          notifications.push({
            id: notif.id,
            senderName: data.senderName || 'Anonim',
            recipientName: notif.user.name || 'Anonim',
            giftType: 'Jeton',
            giftIcon: '🪙',
            amount: data.amount,
            createdAt: notif.createdAt.toISOString()
          })
        } else if (data.giftName) {
          // Check if this gift is a high-value one (price >= 500)
          const giftType = await prisma.giftType.findFirst({
            where: { name: data.giftName, price: { gte: 500 } }
          })
          if (giftType) {
            notifications.push({
              id: notif.id,
              senderName: data.senderName || 'Anonim',
              recipientName: notif.user.name || 'Anonim',
              giftType: giftType.name,
              giftIcon: giftType.icon || data.giftIcon || '🎁',
              amount: giftType.price,
              createdAt: notif.createdAt.toISOString()
            })
          }
        }
      } catch {
        // Skip malformed data
      }
    }

    // Sort by date desc and return up to 5
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json(notifications.slice(0, 5))
  } catch (error) {
    console.error('Recent big gifts error:', error)
    return NextResponse.json([])
  }
}
