import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/requests/{id}/cancel — kullanıcı KENDİ bekleyen CFC yükleme
 * talebini iptal eder. Body: `{ reason?: string }`
 * Koşullu geçiş (`status: 'pending'`): admin onayı ile aynı anda gelirse yalnız biri kazanır.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await authenticateRequest(request)
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const reason = String(body?.reason || '').trim().slice(0, 300)

  const pr = await prisma.cfcPaymentRequest.findUnique({ where: { id: params.id } })
  if (!pr || pr.userId !== authUser.id) {
    return NextResponse.json({ success: false, error: 'Talep bulunamadı' }, { status: 404 })
  }
  if (pr.status !== 'pending') {
    return NextResponse.json(
      { success: false, error: `Yalnızca bekleyen talepler iptal edilebilir (durum: ${pr.status})` },
      { status: 400 },
    )
  }

  const moved = await prisma.cfcPaymentRequest.updateMany({
    where: { id: pr.id, userId: authUser.id, status: 'pending' },
    data: {
      status: 'cancelled',
      reviewedBy: authUser.id,
      reviewNote: `[İptal — kullanıcı] ${reason || 'Gerekçe belirtilmedi'}`,
    },
  })
  if (moved.count !== 1) {
    return NextResponse.json(
      { success: false, error: 'Talep bu sırada işleme alındı; iptal edilemedi' },
      { status: 409 },
    )
  }

  recordAudit({
    actorId: authUser.id,
    action: 'cfc_payment_cancel_by_user',
    targetType: 'cfc_payment_request',
    targetId: pr.id,
    ip: getAuditIp(request),
    metadata: { amount: pr.amount, reason },
  }).catch(() => {})

  return NextResponse.json({ success: true, data: { id: pr.id, status: 'cancelled' } })
}
