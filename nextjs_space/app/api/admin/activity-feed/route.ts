import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator']

export async function GET() {
  try {
    const session = await getStaffSession()
    const role = (session?.user as any)?.role
    if (!role || !(await staffCan(role, (session?.user as any)?.id, 'analytics.dashboard.view', ADMIN_ROLES))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    let config = await prisma.activityFeedConfig.findFirst()
    if (!config) {
      config = await prisma.activityFeedConfig.create({
        data: { isEnabled: true, maxItems: 20 },
      })
    }

    // Also get recent activities for preview
    const recentActivities = await prisma.liveActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        userName: true,
        activityType: true,
        detail: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ config, recentActivities })
  } catch (error) {
    console.error('Admin activity feed error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getStaffSession()
    const role = (session?.user as any)?.role
    if (!role || !(await staffCan(role, (session?.user as any)?.id, 'analytics.dashboard.view', ADMIN_ROLES))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const {
      isEnabled,
      maxItems,
      visibleToGuests,
      visibleToBasic,
      visibleToPremium,
      visibleToGold,
      visibleToDiamond,
      visibleToModerator,
      visibleToAdmin,
      specificUserIds,
    } = body

    let config = await prisma.activityFeedConfig.findFirst()

    const data = {
      isEnabled: isEnabled ?? true,
      maxItems: maxItems ?? 20,
      visibleToGuests: visibleToGuests ?? true,
      visibleToBasic: visibleToBasic ?? true,
      visibleToPremium: visibleToPremium ?? true,
      visibleToGold: visibleToGold ?? true,
      visibleToDiamond: visibleToDiamond ?? true,
      visibleToModerator: visibleToModerator ?? true,
      visibleToAdmin: visibleToAdmin ?? true,
      specificUserIds: specificUserIds || null,
    }

    if (config) {
      config = await prisma.activityFeedConfig.update({
        where: { id: config.id },
        data,
      })
    } else {
      config = await prisma.activityFeedConfig.create({ data })
    }

    return NextResponse.json({ config, success: true })
  } catch (error) {
    console.error('Admin activity feed update error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
