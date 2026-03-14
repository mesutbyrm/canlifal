import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // 1. Online users (active in last 5 minutes)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    
    // Get total count of online registered users
    const onlineRegisteredCount = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: fiveMinutesAgo
        }
      }
    })
    
    const onlineUsers = await prisma.user.findMany({
      where: {
        lastActiveAt: {
          gte: fiveMinutesAgo
        }
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true
      },
      take: 20,
      orderBy: {
        lastActiveAt: 'desc'
      }
    })

    // Get guest visitors (SitePresence without userId, active in last 2 minutes)
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)
    const guestPresences = await prisma.sitePresence.findMany({
      where: {
        userId: null,
        lastSeen: {
          gte: twoMinutesAgo
        }
      },
      select: {
        visitorId: true,
        lastSeen: true
      },
      take: 30,
      orderBy: {
        lastSeen: 'desc'
      }
    })

    // Create guest user entries as "faluser"
    const guestUsers = guestPresences.map((guest: { visitorId: string }, index: number) => ({
      id: `guest-${guest.visitorId}`,
      name: `faluser${index + 1}`,
      username: null,
      image: null,
      isGuest: true
    }))

    // Total online count includes both registered users and guests
    const onlineCount = onlineRegisteredCount + guestPresences.length

    // Combine registered users and guests for display
    const allOnlineUsers = [
      ...onlineUsers.map((u: { id: string; name: string | null; username: string | null; image: string | null }) => ({ ...u, isGuest: false })),
      ...guestUsers
    ]

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

    // 3. Big gifts (1000+ in single transaction) in last 24 hours
    const bigGifts = await prisma.streamGift.findMany({
      where: {
        totalPrice: {
          gte: 1000
        },
        createdAt: {
          gte: twentyFourHoursAgo
        }
      },
      select: {
        id: true,
        totalPrice: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        },
        stream: {
          select: {
            id: true,
            title: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true
              }
            }
          }
        },
        giftType: {
          select: {
            name: true,
            icon: true
          }
        }
      },
      take: 20,
      orderBy: {
        totalPrice: 'desc'
      }
    })

    // 4. Custom ticker messages from admin
    const customMessages = await prisma.tickerMessage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, text: true, icon: true },
    })

    return NextResponse.json({
      onlineUsers: allOnlineUsers,
      onlineCount,
      recentPurchasers: recentPurchasersWithInfo,
      bigGifts,
      customMessages,
    })
  } catch (error) {
    console.error('Homepage ticker error:', error)
    return NextResponse.json({
      onlineUsers: [],
      onlineCount: 0,
      recentPurchasers: [],
      bigGifts: [],
      customMessages: [],
    })
  }
}
