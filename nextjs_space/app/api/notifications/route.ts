import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { isCursorMode, parseCursorParams, fetchCursorPage } from '@/lib/pagination'
import { apiPaginated } from '@/lib/api-response'
import { resolveNotificationDeepLink } from '@/lib/notify'
import { withCachePolicy } from '@/lib/perf'

// Faz 21 (§53) — eski kayıtlarda deepLink boş olabilir; okuma anında türetilir.
function withDeepLink<T extends { type: string; postId: string | null; fromUserId: string | null; deepLink: string | null }>(n: T): T {
  if (n.deepLink) return n
  return {
    ...n,
    deepLink: resolveNotificationDeepLink({
      type: n.type,
      postId: n.postId,
      fromUserId: n.fromUserId,
    }),
  }
}

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

    const notificationSelect = {
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
      deepLink: true,
    }

    // Opt-in imleç sayfalama (yalnızca ?cursor= / ?paginate=cursor ile)
    if (isCursorMode(request)) {
      const { cursor, limit } = parseCursorParams(request, 50, 100)
      const [{ items, meta }, unreadCount] = await Promise.all([
        fetchCursorPage(
          (args) => prisma.notification.findMany(args),
          cursor,
          limit,
          { where, orderBy: { createdAt: 'desc' }, select: notificationSelect }
        ),
        prisma.notification.count({ where: { userId, isRead: false } }),
      ])
      return withCachePolicy(apiPaginated(items.map(withDeepLink), { ...meta, total: unreadCount }), 'no-store')
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
          deepLink: true,
        }
      }),
      prisma.notification.count({
        where: { userId, isRead: false }
      })
    ])

    return withCachePolicy(NextResponse.json({ notifications: notifications.map(withDeepLink), unreadCount }), 'no-store')
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
