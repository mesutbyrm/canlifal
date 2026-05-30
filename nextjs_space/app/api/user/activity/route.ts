import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// GET /api/user/activity - Get authenticated user's notifications/activity feed
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 50)
    const type = searchParams.get('type') // filter by notification type
    const unreadOnly = searchParams.get('unread') === 'true'

    const where: any = { userId: auth.id }
    if (type) where.type = type
    if (unreadOnly) where.isRead = false

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          data: true,
          postId: true,
          fromUserId: true,
          fromUserName: true,
          isRead: true,
          createdAt: true
        }
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: auth.id, isRead: false } })
    ])

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Activity feed error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// PATCH /api/user/activity - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, markAllRead } = body

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: auth.id, isRead: false },
        data: { isRead: true }
      })
      return NextResponse.json({ success: true, message: 'Tüm bildirimler okundu olarak işaretlendi' })
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: auth.id
        },
        data: { isRead: true }
      })
      return NextResponse.json({ success: true, message: `${notificationIds.length} bildirim okundu olarak işaretlendi` })
    }

    return NextResponse.json({ error: 'notificationIds veya markAllRead gerekli' }, { status: 400 })
  } catch (error: any) {
    console.error('Mark activity read error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
