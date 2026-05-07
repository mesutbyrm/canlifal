import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// 9 DB queries - cache for 15 seconds
async function fetchTickerData() {
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)

  const onlineRegisteredCount = await prisma.user.count({
    where: { lastActiveAt: { gte: fiveMinutesAgo } }
  })

  const onlineUsers = await prisma.user.findMany({
    where: { lastActiveAt: { gte: fiveMinutesAgo } },
    select: {
      id: true, name: true, username: true, image: true,
      membership: true, specialBadges: true
    },
    take: 40,
    orderBy: { lastActiveAt: 'desc' }
  })

  const guestPresences = await prisma.sitePresence.findMany({
    where: { userId: null, lastSeen: { gte: twoMinutesAgo } },
    select: { visitorId: true, deviceType: true, isBot: true, botName: true },
    take: 30,
    orderBy: { lastSeen: 'desc' }
  })

  const guestUsers = guestPresences.map((guest: { visitorId: string; deviceType: string | null; isBot: boolean; botName: string | null }, index: number) => ({
    id: `guest-${guest.visitorId}`,
    name: guest.isBot && guest.botName ? guest.botName : `canlifal${index + 1}`,
    username: null, image: null,
    isGuest: !guest.isBot, isBot: guest.isBot,
    botName: guest.botName, deviceType: guest.deviceType || 'desktop'
  }))

  const onlineCount = onlineRegisteredCount + guestPresences.length

  const registeredPresences = await prisma.sitePresence.findMany({
    where: {
      userId: { in: onlineUsers.map((u: { id: string }) => u.id) },
      lastSeen: { gte: twoMinutesAgo }
    },
    select: { userId: true, deviceType: true }
  })
  const deviceMap = new Map(registeredPresences.map((p: { userId: string | null; deviceType: string | null }) => [p.userId, p.deviceType]))

  const userMemberships = onlineUsers.map((u: any) => u.membership).filter(Boolean)
  const userIds = onlineUsers.map((u: any) => u.id)
  const customBadges = await prisma.customBadge.findMany({
    where: {
      isActive: true,
      OR: [
        { tier: { in: userMemberships } },
        { userId: { in: userIds } }
      ]
    },
    orderBy: { sortOrder: 'asc' }
  })

  const tierBadgeMap = new Map<string, any[]>()
  const userBadgeMap = new Map<string, any[]>()
  customBadges.forEach((b: any) => {
    if (b.userId) {
      const existing = userBadgeMap.get(b.userId) || []
      existing.push({ name: b.name, icon: b.icon, color: b.color, bgColor: b.bgColor })
      userBadgeMap.set(b.userId, existing)
    } else if (b.tier) {
      const existing = tierBadgeMap.get(b.tier) || []
      existing.push({ name: b.name, icon: b.icon, color: b.color, bgColor: b.bgColor })
      tierBadgeMap.set(b.tier, existing)
    }
  })

  const allOnlineUsers = [
    ...onlineUsers.map((u: { id: string; name: string | null; username: string | null; image: string | null; membership: string; specialBadges: string | null }) => ({
      ...u, isGuest: false, isBot: false, botName: null,
      deviceType: deviceMap.get(u.id) || 'desktop',
      customBadges: [
        ...(tierBadgeMap.get(u.membership) || []),
        ...(userBadgeMap.get(u.id) || [])
      ]
    })),
    ...guestUsers
  ]

  const recentPurchases = await prisma.creditTransaction.findMany({
    where: { type: 'purchase', amount: { gt: 0 }, createdAt: { gte: twentyFourHoursAgo } },
    select: { id: true, userId: true, amount: true, createdAt: true },
    take: 20,
    orderBy: { createdAt: 'desc' }
  })

  const purchaserIds = recentPurchases.map((p: { userId: string }) => p.userId)
  const purchasers = await prisma.user.findMany({
    where: { id: { in: purchaserIds } },
    select: { id: true, name: true, username: true, image: true }
  })
  const purchasersMap = new Map(purchasers.map((p: { id: string; name: string | null; username: string | null; image: string | null }) => [p.id, p]))
  const recentPurchasersWithInfo = recentPurchases.map((p: { id: string; userId: string; amount: number; createdAt: Date }) => ({
    ...p,
    user: purchasersMap.get(p.userId) || { id: p.userId, name: 'Kullanıcı', username: null, image: null }
  }))

  const onlineTellerCount = await prisma.liveFortuneTeller.count({
    where: { isOnline: true, isActive: true, isBanned: false, isFrozen: false }
  })

  const customMessages = await prisma.tickerMessage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, text: true, icon: true }
  })

  return {
    onlineUsers: allOnlineUsers,
    onlineCount,
    onlineTellerCount,
    recentPurchasers: recentPurchasersWithInfo,
    customMessages,
  }
}

export async function GET() {
  try {
    // Cache for 15 seconds - 9 DB queries saved per cache hit
    const data = await getCached('ticker:homepage', 15, fetchTickerData)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Homepage ticker error:', error)
    return NextResponse.json({
      onlineUsers: [], onlineCount: 0, onlineTellerCount: 0,
      recentPurchasers: [], customMessages: [],
    })
  }
}
