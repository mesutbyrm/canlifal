import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { recordLedger } from '@/lib/ledger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/withdrawals/{id}/cancel — kullanıcı KENDİ bekleyen çekim talebini iptal eder.
 *
 * - Yalnızca `pending` / `agency_approved` (jeton henüz düşülmemiş) talepler.
 * - Durum geçişi koşullu `updateMany` ile: admin onayı ile aynı anda gelirse
 *   yalnızca biri kazanır (diğeri 409). Onaylanmış talep bu yolla iptal edilmez.
 * - Talep silinmez; iptal gerekçesi, iptal eden ve zaman kayıtta kalır.
 * Body: `{ reason?: string }`
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await authenticateRequest(request)
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const reason = String(body?.reason || '').trim().slice(0, 300)

  const wr = await prisma.withdrawalRequest.findUnique({ where: { id: params.id } })
  if (!wr || wr.userId !== authUser.id) {
    return NextResponse.json({ success: false, error: 'Talep bulunamadı' }, { status: 404 })
  }
  if (!['pending', 'agency_approved'].includes(wr.status)) {
    return NextResponse.json(
      { success: false, error: `Yalnızca bekleyen talepler iptal edilebilir (durum: ${wr.status})` },
      { status: 400 },
    )
  }

  const moved = await prisma.withdrawalRequest.updateMany({
    where: { id: wr.id, userId: authUser.id, status: { in: ['pending', 'agency_approved'] } },
    data: {
      status: 'cancelled',
      adminNote: `[İptal — kullanıcı] ${reason || 'Gerekçe belirtilmedi'}`,
      processedBy: authUser.id,
      processedAt: new Date(),
    },
  })
  if (moved.count !== 1) {
    return NextResponse.json(
      { success: false, error: 'Talep bu sırada işleme alındı; iptal edilemedi' },
      { status: 409 },
    )
  }

  // Talep oluşturulurken yazılan ledger satırının tersi (jeton bakiyesi zaten düşülmemişti).
  recordLedger({
    debit: { accountType: 'platform_jeton', accountId: 'PLATFORM' },
    credit: { accountType: 'user_jeton', accountId: authUser.id },
    amount: wr.amount,
    category: 'withdrawal',
    referenceType: 'WithdrawalRequest',
    referenceId: wr.id,
    actorId: authUser.id,
    description: 'Çekim talebi kullanıcı tarafından iptal edildi (ters kayıt)',
    metadata: { reversal: true },
  }).catch(() => {})

  recordAudit({
    actorId: authUser.id,
    action: 'withdrawal_cancel_by_user',
    targetType: 'WithdrawalRequest',
    targetId: wr.id,
    before: { status: wr.status },
    after: { status: 'cancelled' },
    description: `Çekim talebi kullanıcı tarafından iptal edildi: ${wr.amount} jeton`,
    ip: getAuditIp(request),
  } as any).catch(() => {})

  return NextResponse.json({ success: true, data: { id: wr.id, status: 'cancelled' } })
}
