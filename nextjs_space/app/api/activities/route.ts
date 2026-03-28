import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    const userRole = (session?.user as any)?.role || 'user'
    const userMembership = (session?.user as any)?.membership || 'basic'

    // Get feed config
    let config = await prisma.activityFeedConfig.findFirst()
    if (!config) {
      // Create default config
      config = await prisma.activityFeedConfig.create({
        data: { isEnabled: true, maxItems: 20 },
      })
    }

    if (!config.isEnabled) {
      return NextResponse.json({ activities: [], visible: false })
    }

    // Check specific users first
    if (config.specificUserIds && config.specificUserIds.trim()) {
      const allowedIds = config.specificUserIds.split(',').map((id: string) => id.trim()).filter(Boolean)
      if (allowedIds.length > 0) {
        if (!userId || !allowedIds.includes(userId)) {
          return NextResponse.json({ activities: [], visible: false })
        }
      }
    }

    // Check group visibility
    const isGuest = !session?.user
    const isAdmin = ['admin', 'yonetici'].includes(userRole)
    const isModerator = userRole === 'moderator'

    let canSee = false
    if (isGuest && config.visibleToGuests) canSee = true
    if (!isGuest) {
      if (isAdmin && config.visibleToAdmin) canSee = true
      else if (isModerator && config.visibleToModerator) canSee = true
      else if (userMembership === 'diamond' && config.visibleToDiamond) canSee = true
      else if (userMembership === 'gold' && config.visibleToGold) canSee = true
      else if (userMembership === 'premium' && config.visibleToPremium) canSee = true
      else if (userMembership === 'basic' && config.visibleToBasic) canSee = true
    }

    if (!canSee) {
      return NextResponse.json({ activities: [], visible: false })
    }

    const activities = await prisma.liveActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: config.maxItems || 20,
      select: {
        id: true,
        userName: true,
        userAvatar: true,
        activityType: true,
        detail: true,
        targetUrl: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ activities, visible: true })
  } catch (error) {
    console.error('Activities fetch error:', error)
    return NextResponse.json({ activities: [], visible: false })
  }
}
