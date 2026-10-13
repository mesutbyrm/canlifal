import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/rbac'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { requireConfirmation } from '@/lib/critical-confirm'
import { getOrCreateWallet, topUpWallet, adjustWallet, getAgencyJetonRate, getBonusRateForLevel } from '@/lib/agency-wallet'

export const dynamic = 'force-dynamic'

/** Ajans cüzdanı + değiştirilemez muhasebe geçmişi (§17). */
export async function GET(req: NextRequest, { params }: { params: { agencyId: string } }) {
  const auth = await requirePermission(req, 'agency.wallet.view')
  if (auth instanceof NextResponse) return auth

  const agency = await prisma.agency.findUnique({
    where: { id: params.agencyId },
    select: { id: true, name: true, level: true, status: true, ownerId: true, ownerName: true, commissionRate: true },
  })
  if (!agency) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ajans bulunamadı' } }, { status: 404 })

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25')))
  const type = url.searchParams.get('type') || ''

  const where: any = { agencyId: params.agencyId }
  if (type) where.type = type

  const [wallet, rate, bonusRate, total, txns] = await Promise.all([
    getOrCreateWallet(params.agencyId),
    getAgencyJetonRate(),
    getBonusRateForLevel(agency.level || 'bronze'),
    prisma.agencyWalletTransaction.count({ where }),
    prisma.agencyWalletTransaction.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      agency,
      wallet,
      rate: rate.rate,
      rate_source: rate.source,
      bonus_rate: bonusRate,
      transactions: txns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  })
}

/** topup | adjust | lock | unlock | set_level */
export async function POST(req: NextRequest, { params }: { params: { agencyId: string } }) {
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')

  const permMap: Record<string, string> = {
    topup: 'agency.wallet.topup',
    adjust: 'agency.wallet.topup',
    lock: 'agency.wallet.topup',
    unlock: 'agency.wallet.topup',
    set_level: 'agency.bonus.configure',
  }
  if (!permMap[action]) {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçersiz işlem' } }, { status: 400 })
  }
  const auth = await requirePermission(req, permMap[action])
  if (auth instanceof NextResponse) return auth
  const admin = (auth as any).user
  const ip = getAuditIp(req)

  const agency = await prisma.agency.findUnique({
    where: { id: params.agencyId },
    select: { id: true, name: true, level: true },
  })
  if (!agency) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ajans bulunamadı' } }, { status: 404 })

  const adminName = admin.name || admin.email || 'Admin'
  const reason = String(body.reason || '').trim()

  if (action === 'topup' || action === 'adjust') {
    if (!reason) return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Gerekçe zorunludur' } }, { status: 400 })
    const confirmBlock = requireConfirmation(
      action === 'topup' ? 'agency_wallet_topup' : 'agency_wallet_adjust',
      body.confirm,
      { targetName: agency.name, amount: Number(body.tlAmount || body.jetonAmount || body.amount || 0) } as any
    )
    if (confirmBlock) return confirmBlock
  }

  if (action === 'topup') {
    const res = await topUpWallet({
      agencyId: agency.id,
      tlAmount: body.tlAmount ? parseFloat(body.tlAmount) : undefined,
      jetonAmount: body.jetonAmount ? parseFloat(body.jetonAmount) : undefined,
      actorId: admin.id, actorName: adminName, actorRole: admin.role,
      reason, idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey) : undefined,
    })
    const err = res as any
    if (!res.ok) return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.code === 'NOT_FOUND' ? 404 : 400 })
    recordAudit({
      actorId: admin.id, action: 'agency_wallet_topup', targetType: 'agency', targetId: agency.id,
      before: { balance: res.balanceBefore }, after: { balance: res.balanceAfter },
      metadata: { txnId: res.txnId, bonus: res.bonus, tlAmount: body.tlAmount, jetonAmount: body.jetonAmount, reason }, ip,
    }).catch(() => {})
    return NextResponse.json({ success: true, message: `Bakiye güncellendi: ${res.balanceBefore} → ${res.balanceAfter}`, data: res as any })
  }

  if (action === 'adjust') {
    const res = await adjustWallet({
      agencyId: agency.id, amount: parseFloat(body.amount),
      actorId: admin.id, actorName: adminName, actorRole: admin.role, reason,
    })
    const err = res as any
    if (!res.ok) return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: 400 })
    recordAudit({
      actorId: admin.id, action: 'agency_wallet_adjust', targetType: 'agency', targetId: agency.id,
      before: { balance: res.balanceBefore }, after: { balance: res.balanceAfter },
      metadata: { txnId: res.txnId, amount: body.amount, reason }, ip,
    }).catch(() => {})
    return NextResponse.json({ success: true, message: `Düzeltme kaydedildi: ${res.balanceBefore} → ${res.balanceAfter}`, data: res as any })
  }

  if (action === 'lock' || action === 'unlock') {
    const wallet = await getOrCreateWallet(agency.id)
    await prisma.agencyWallet.update({
      where: { agencyId: agency.id },
      data: { isLocked: action === 'lock', lockReason: action === 'lock' ? (reason || 'Admin kilidi') : null },
    })
    recordAudit({
      actorId: admin.id, action: `agency_wallet_${action}`, targetType: 'agency', targetId: agency.id,
      before: { isLocked: wallet.isLocked }, after: { isLocked: action === 'lock' }, metadata: { reason }, ip,
    }).catch(() => {})
    return NextResponse.json({ success: true, message: action === 'lock' ? 'Cüzdan kilitlendi' : 'Cüzdan kilidi açıldı' })
  }

  if (action === 'set_level') {
    const level = String(body.level || '')
    if (!['bronze', 'silver', 'gold', 'diamond'].includes(level)) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçersiz seviye' } }, { status: 400 })
    }
    await prisma.agency.update({ where: { id: agency.id }, data: { level } })
    recordAudit({
      actorId: admin.id, action: 'agency_level_change', targetType: 'agency', targetId: agency.id,
      before: { level: agency.level }, after: { level }, metadata: { reason }, ip,
    }).catch(() => {})
    return NextResponse.json({ success: true, message: `Ajans seviyesi güncellendi: ${level}` })
  }

  return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçersiz işlem' } }, { status: 400 })
}
