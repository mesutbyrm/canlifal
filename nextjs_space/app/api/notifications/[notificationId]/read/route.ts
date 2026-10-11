import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

async function markRead(req: NextRequest, notificationId: string) {
  const auth = await authenticateRequest(req)
  if (!auth) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  if (!notificationId) {
    return NextResponse.json({ error: 'Bildirim ID gerekli' }, { status: 400 })
  }
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId: auth.id },
    data: { isRead: true },
  })
  if (result.count === 0) {
    return NextResponse.json({ error: 'Bildirim bulunamadı' }, { status: 404 })
  }
  const unreadCount = await prisma.notification.count({
    where: { userId: auth.id, isRead: false },
  })
  return NextResponse.json({ success: true, unreadCount })
}

/** PATCH /api/notifications/{id}/read */
export async function PATCH(req: NextRequest, { params }: { params: { notificationId: string } }) {
  try {
    return await markRead(req, params.notificationId)
  } catch (error) {
    console.error('[Notification read PATCH] Error:', error)
    return NextResponse.json({ error: 'Bildirim güncellenemedi' }, { status: 500 })
  }
}

/** POST /api/notifications/{id}/read — PATCH ile aynı davranış. */
export async function POST(req: NextRequest, { params }: { params: { notificationId: string } }) {
  try {
    return await markRead(req, params.notificationId)
  } catch (error) {
    console.error('[Notification read POST] Error:', error)
    return NextResponse.json({ error: 'Bildirim güncellenemedi' }, { status: 500 })
  }
}
