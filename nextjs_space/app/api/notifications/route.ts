import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// GET - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const userId = authUser.id

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const where: any = { userId }
    if (unreadOnly) {
      where.isRead = false
    }

    // Run both queries in parallel instead of sequentially
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: (page - 1) * 50,
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
          createdAt: true,
        }
      }),
      prisma.notification.count({
        where: { userId, isRead: false }
      })
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Notifications fetch error:', error)
    return NextResponse.json({ error: 'Bildirimler alınamadı' }, { status: 500 })
  }
}

// POST - Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const userId = authUser.id

    const { notificationIds, markAll } = await request.json()

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      })
    } else if (notificationIds?.length > 0) {
      await prisma.notification.updateMany({
        where: { 
          id: { in: notificationIds },
          userId
        },
        data: { isRead: true }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark notifications error:', error)
    return NextResponse.json({ error: 'Bildirimler güncellenemedi' }, { status: 500 })
  }
}

// DELETE - Delete a notification
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json({ error: 'Bildirim ID gerekli' }, { status: 400 })
    }

    await prisma.notification.deleteMany({
      where: { id: notificationId, userId: authUser.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json({ error: 'Bildirim silinemedi' }, { status: 500 })
  }
}
