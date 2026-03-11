// @ts-nocheck
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

    // Get active presences with user details
    const presences = await prisma.sitePresence.findMany({
      where: {
        lastSeen: { gte: twoMinutesAgo },
        userId: { not: null }
      },
      select: {
        userId: true,
        path: true,
        lastSeen: true,
      },
      orderBy: { lastSeen: 'desc' },
      take: 50 // Limit to 50 users
    })

    // Get unique user IDs
    const userIds = [...new Set(presences.map(p => p.userId).filter(Boolean))] as string[]

    // Fetch user details
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        image: true,
        username: true,
      }
    })

    // Create a map for quick lookup
    const userMap = new Map(users.map(u => [u.id, u]))

    // Combine presence with user data
    const onlineUsers = presences
      .filter(p => p.userId && userMap.has(p.userId))
      .map(p => {
        const user = userMap.get(p.userId!)
        return {
          id: user?.id,
          name: user?.name,
          image: user?.image,
          username: user?.username,
          path: p.path,
          lastSeen: p.lastSeen
        }
      })
      // Remove duplicates by user ID
      .filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      )

    return NextResponse.json({
      count: onlineUsers.length,
      users: onlineUsers
    })
  } catch (error) {
    console.error('Online users fetch error:', error)
    return NextResponse.json({ count: 0, users: [] })
  }
}
