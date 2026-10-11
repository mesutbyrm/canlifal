import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/notify/{id}/cancel — kullanıcı KENDİ bekleyen Jeton/CFC/Gold
 * ödeme bildirimini iptal eder. Body: `{ reason?: string }`
 *
 * - Yalnızca `pending` / `corrected` ve bakiyesi henüz yüklenmemiş (`creditApplied=false`).
 * - Koşullu geçiş: admin onayı bakiyeyi sahiplendiyse iptal 409 döner (onay ile
 *   iptal aynı anda kazanamaz). Kayıt silinmez.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const mobileUser = await authenticateRequest(req)
  const session = !mobileUser ? await getServerSession(authOptions) : null
  const userId = mobileUser?.id || (session?.user as any)?.id
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const reason = String(body?.reason || '').trim().slice(0, 300)

  const pn = await prisma.paymentNotification.findUnique({ where: { id: params.id } })
  if (!pn || pn.userId !== userId) {
    return NextResponse.json({ success: false, error: 'Bildirim bulunamadı' }, { status: 404 })
  }
  if (!['pending', 'corrected'].includes(pn.status) || pn.creditApplied) {
    return NextResponse.json(
      { success: false, error: `Yalnızca bekleyen bildirimler iptal edilebilir (durum: ${pn.status})` },
      { status: 400 },
    )
  }

  const moved = await prisma.paymentNotification.updateMany({
    where: { id: pn.id, userId, status: { in: ['pending', 'corrected'] }, creditApplied: false },
    data: {
      status: 'cancelled',
      processedBy: userId,
      processedByName: 'Kullanıcı',
      processedAt: new Date(),
      adminNote: `[İptal — kullanıcı] ${reason || 'Gerekçe belirtilmedi'}`,
    },
  })
  if (moved.count !== 1) {
    return NextResponse.json(
      { success: false, error: 'Bildirim bu sırada işleme alındı; iptal edilemedi' },
      { status: 409 },
    )
  }

  recordAudit({
    actorId: userId,
    action: 'payment_cancel_by_user',
    targetType: 'payment_notification',
    targetId: pn.id,
    ip: getAuditIp(req),
    metadata: { productType: pn.productType, amountTRY: pn.amount, reason },
  }).catch(() => {})

  return NextResponse.json({ success: true, data: { id: pn.id, status: 'cancelled' } })
}
