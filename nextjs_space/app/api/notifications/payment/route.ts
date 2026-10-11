import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Ödeme ile ilgili bildirim türleri. */
const PAYMENT_TYPES = [
  'payment',
  'payment_request',
  'payment_approved',
  'payment_rejected',
  'payment_pending',
  'topup',
  'withdrawal',
  'withdrawal_approved',
  'withdrawal_rejected',
]

/** GET /api/notifications/payment — ödeme bildirimleri. */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const items = await prisma.notification.findMany({
      where: { userId: auth.id, type: { in: PAYMENT_TYPES } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        data: true,
        isRead: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ success: true, data: { items }, items })
  } catch (error) {
    console.error('[Notifications payment GET] Error:', error)
    return NextResponse.json({ error: 'Ödeme bildirimleri alınamadı' }, { status: 500 })
  }
}

/** DELETE /api/notifications/payment — ödeme bildirimlerini temizler. */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const result = await prisma.notification.updateMany({
      where: { userId: auth.id, type: { in: PAYMENT_TYPES }, isRead: false },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true, cleared: result.count })
  } catch (error) {
    console.error('[Notifications payment DELETE] Error:', error)
    return NextResponse.json({ error: 'Ödeme bildirimleri temizlenemedi' }, { status: 500 })
  }
}
