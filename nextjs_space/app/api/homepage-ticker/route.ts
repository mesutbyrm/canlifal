import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // 1. Online count (registered + guests)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)
    
    const [onlineRegisteredCount, guestCount] = await Promise.all([
      prisma.user.count({ where: { lastActiveAt: { gte: fiveMinutesAgo } } }),
      prisma.sitePresence.count({ where: { userId: null, lastSeen: { gte: twoMinutesAgo } } })
    ])
    const onlineCount = onlineRegisteredCount + guestCount

    // 2. Recent credit purchasers (last 24 hours)
    const recentPurchases = await prisma.creditTransaction.findMany({
      where: {
        type: 'purchase',
        amount: {
          gt: 0
        },
        createdAt: {
          gte: twentyFourHoursAgo
        }
      },
      select: {
        id: true,
        userId: true,
        amount: true,
        createdAt: true
      },
      take: 20,
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get user info for purchasers
    const purchaserIds = recentPurchases.map((p: { userId: string }) => p.userId)
    const purchasers = await prisma.user.findMany({
      where: {
        id: { in: purchaserIds }
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true
      }
    })

    const purchasersMap = new Map(purchasers.map((p: { id: string; name: string | null; username: string | null; image: string | null }) => [p.id, p]))
    const recentPurchasersWithInfo = recentPurchases.map((p: { id: string; userId: string; amount: number; createdAt: Date }) => ({
      ...p,
      user: purchasersMap.get(p.userId) || { id: p.userId, name: 'Kullanıcı', username: null, image: null }
    }))

    // 3. Online teller count
    const onlineTellerCount = await prisma.liveFortuneTeller.count({
      where: {
        isOnline: true,
        isActive: true,
        isBanned: false,
        isFrozen: false,
      },
    })

    // 4. Custom ticker messages from admin
    const customMessages = await prisma.tickerMessage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, text: true, icon: true },
    })

    return NextResponse.json({
      onlineCount,
      onlineTellerCount,
      recentPurchasers: recentPurchasersWithInfo,
      customMessages,
    })
  } catch (error) {
    console.error('Homepage ticker error:', error)
    return NextResponse.json({
      onlineCount: 0,
      onlineTellerCount: 0,
      recentPurchasers: [],
      customMessages: [],
    })
  }
}
