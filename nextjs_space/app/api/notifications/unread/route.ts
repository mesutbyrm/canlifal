import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET /api/notifications/unread — okunmamış bildirim sayısı. */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const count = await prisma.notification.count({
      where: { userId: auth.id, isRead: false },
    })
    return NextResponse.json({ success: true, count, unread: count, unreadCount: count, data: { count, unreadCount: count } })
  } catch (error) {
    console.error('[Notifications unread] Error:', error)
    return NextResponse.json({ error: 'Okunmamış bildirim sayısı alınamadı' }, { status: 500 })
  }
}
