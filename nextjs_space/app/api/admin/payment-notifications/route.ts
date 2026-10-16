export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'
import { hasPermission } from '@/lib/permissions'

/**
 * GET  /api/admin/payment-notifications — admin ödeme bildirimleri listesi
 * POST /api/admin/payment-notifications — eski mobil gölge kaydı (artık yok sayılır)
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

/**
 * Eski mobil sürümler her ödeme talebinden sonra buraya ikinci bir «gölge»
 * kayıt gönderiyordu: jeton sayısı TL tutarı olarak yazılıyor, CFC talebi de
 * ayrıca jeton bildirimi gibi görünüyordu (admin aynı ödeme için iki farklı
 * talep görüyordu). Gerçek talep `/api/payments/requests` veya
 * `/api/payments/notify` ile zaten oluşturulup adminlere bildiriliyor; bu uç
 * artık kayıt oluşturmaz.
 */
export async function POST(req: NextRequest) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  return NextResponse.json({ success: true, ignored: true })
}
