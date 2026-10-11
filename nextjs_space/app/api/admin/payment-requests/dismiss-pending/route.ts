export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'
import { hasPermission } from '@/lib/permissions'

/**
 * POST /api/admin/payment-requests/dismiss-pending
 * Tüm bekleyen ödeme taleplerini iptal eder.
 * body: { reason? }
 */
export async function POST(req: NextRequest) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
  if (!(await hasPermission(actor.role, 'payment.manage', actor.id)))
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })

  try {
    const body = await req.json().catch(() => ({}))
    const reason = body?.reason || 'Admin tarafından toplu iptal'

    const result = await prisma.paymentNotification.updateMany({
      where: { status: 'pending' },
      data: {
        status: 'cancelled',
        processedBy: actor.id,
        processedAt: new Date(),
        adminNote: reason,
      },
    })

    return NextResponse.json({ success: true, dismissed: result.count })
  } catch (e) {
    console.error('[dismiss-pending POST]', e)
    return NextResponse.json({ error: 'İptal işlemi başarısız' }, { status: 500 })
  }
}
