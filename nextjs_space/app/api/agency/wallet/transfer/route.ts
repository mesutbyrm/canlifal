import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { requireConfirmation } from '@/lib/critical-confirm'
import { transferToUser, getOrCreateWallet } from '@/lib/agency-wallet'
import { createNotificationWithPush } from '@/lib/notify'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'

export const dynamic = 'force-dynamic'

/** §15 — Ajans sahibinin/yöneticisinin bir kullanıcıya cüzdandan jeton yüklemesi. */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as any).user
  const ip = getAuditIp(req)

  const body = await req.json().catch(() => ({}))
  const targetUserId = String(body.targetUserId || '')
  const amount = Math.floor(Number(body.amount || 0))
  const reason = String(body.reason || '').trim()

  if (!targetUserId || !amount || amount <= 0) {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Kullanıcı ve geçerli bir miktar gereklidir' } }, { status: 400 })
  }

  const membership = await prisma.agencyUser.findUnique({
    where: { userId: user.id },
    select: { agencyId: true, role: true, isActive: true },
  })
  const owned = await prisma.agency.findFirst({ where: { ownerId: user.id }, select: { id: true, name: true } })
  const agencyId = owned?.id || (membership?.isActive && ['owner', 'manager'].includes(membership.role) ? membership.agencyId : null)
  if (!agencyId) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Jeton gönderme yetkiniz yok' } }, { status: 403 })
  }

  const agency = await prisma.agency.findUnique({ where: { id: agencyId }, select: { id: true, name: true, status: true } })
  if (!agency || agency.status !== 'approved') {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Ajansınız onaylı değil' } }, { status: 403 })
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, name: true } })
  const confirmBlock = requireConfirmation('agency_wallet_transfer', body.confirm, {
    amount, targetName: target?.name || targetUserId,
  })
  if (confirmBlock) return confirmBlock

  if (!target) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı' } }, { status: 404 })
  }

  // Kendi üyesi → transfer_member; diğer herkes → transfer_any_user (admin kapatabilir).
  const targetMembership = await prisma.agencyUser.findUnique({
    where: { userId: targetUserId },
    select: { agencyId: true, isActive: true },
  })
  const useKey = targetMembership?.isActive && targetMembership.agencyId === agencyId
    ? 'transfer_member'
    : 'transfer_any_user'

  // Aynı Idempotency-Key ile tekrarlanan istek ikinci kez jeton aktarmaz
  // (DB tabanlı kayıt; eşzamanlı ikinci istek 409 alır).
  const idem = await beginIdempotent(req, 'agency_wallet_transfer', user.id)
  if (idem.response) return idem.response

  let res
  try {
    res = await transferToUser({
      agencyId, targetUserId, amount,
      actorId: user.id, actorName: user.name || user.email || 'Ajans',
      actorRole: user.role, reason,
      idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey) : undefined,
      useKey,
    })
  } catch (e) {
    await releaseIdempotent(idem.record)
    throw e
  }

  if (!res.ok) {
    await releaseIdempotent(idem.record)
    const err = res as any
    const status = err.code === 'NOT_FOUND' ? 404 : (err.code === 'USE_NOT_ALLOWED' || err.code === 'WALLET_LOCKED' || err.code === 'DISABLED') ? 403 : 400
    return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status })
  }

  recordAudit({
    actorId: user.id, action: 'agency_wallet_transfer', targetType: 'user', targetId: targetUserId,
    metadata: { agencyId, amount, reason, txnId: res.txnId, balanceBefore: res.balanceBefore, balanceAfter: res.balanceAfter }, ip,
  }).catch(() => {})

  createNotificationWithPush({
    userId: targetUserId,
    type: 'agency',
    title: 'Ajansınızdan jeton geldi',
    message: `${agency.name} size ${amount} jeton gönderdi.`,
  } as any).catch(() => {})

  const wallet = await getOrCreateWallet(agencyId)
  const payload = {
    success: true,
    message: `${amount} jeton gönderildi`,
    data: { ...(res as any), walletBalance: wallet.jetonBalance },
  }
  await completeIdempotent(idem.record, 200, payload)
  return NextResponse.json(payload)
}
