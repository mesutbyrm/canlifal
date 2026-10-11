export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'
import { hasPermission } from '@/lib/permissions'

/**
 * GET  /api/admin/payment-notifications — admin ödeme bildirimleri listesi
 * POST /api/admin/payment-notifications — mobil'den ödeme bildirimi oluştur
 */
export async function GET(req: NextRequest) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
  if (!(await hasPermission(actor.role, 'payment.view', actor.id)))
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'all'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))

  const where: any = {}
  if (status !== 'all') where.status = status

  try {
    const [items, total] = await Promise.all([
      (prisma as any).paymentNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, username: true, email: true, image: true } } },
      }),
      prisma.paymentNotification.count({ where }),
    ])
    return NextResponse.json({ items, total, page, limit })
  } catch (e) {
    console.error('[payment-notifications GET]', e)
    return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })

  try {
    const body = await req.json()
    const { type, requestType, coins, amount, method, packageTitle, source, senderInfo } = body || {}

    // Mobil admin bildirimi — mevcut PaymentNotification kaydı oluşturma
    const notif = await prisma.paymentNotification.create({
      data: {
        userId: actor.id,
        username: actor.email || 'mobile',
        paymentMethod: method || 'unknown',
        amount: parseFloat(amount) || 0,
        productType: requestType || type || 'jeton',
        requestedAmount: parseInt(coins) || null,
        notes: [packageTitle, source, senderInfo].filter(Boolean).join(' | ') || null,
        status: 'pending',
      },
    })
    return NextResponse.json({ success: true, id: notif.id })
  } catch (e) {
    console.error('[payment-notifications POST]', e)
    return NextResponse.json({ error: 'Bildirim oluşturulamadı' }, { status: 500 })
  }
}
