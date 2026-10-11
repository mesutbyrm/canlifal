import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { getOrCreateWallet, getAllowedWalletUses, getBonusRateForLevel, getAgencyJetonRate, getCommissionRules } from '@/lib/agency-wallet'

export const dynamic = 'force-dynamic'

/**
 * §13/§47 — Ajans sahibi/yöneticisi YALNIZCA kendi ajansının cüzdanını görür.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as any).user

  const membership = await prisma.agencyUser.findUnique({
    where: { userId: user.id },
    select: { agencyId: true, role: true, isActive: true },
  })
  const owned = await prisma.agency.findFirst({ where: { ownerId: user.id }, select: { id: true } })

  const agencyId = owned?.id || (membership?.isActive && ['owner', 'manager'].includes(membership.role) ? membership.agencyId : null)
  if (!agencyId) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Ajans cüzdanına erişim yetkiniz yok' } }, { status: 403 })
  }

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { id: true, name: true, level: true, status: true, commissionRate: true, totalEarnings: true },
  })
  if (!agency) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ajans bulunamadı' } }, { status: 404 })

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))

  const [wallet, allowedUses, bonusRate, rate, rules, total, txns] = await Promise.all([
    getOrCreateWallet(agencyId),
    getAllowedWalletUses(),
    getBonusRateForLevel(agency.level || 'bronze'),
    getAgencyJetonRate(),
    getCommissionRules(agencyId),
    prisma.agencyWalletTransaction.count({ where: { agencyId } }),
    prisma.agencyWalletTransaction.findMany({
      where: { agencyId }, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
      select: {
        id: true, type: true, direction: true, amount: true, balanceBefore: true, balanceAfter: true,
        tlAmount: true, rateUsed: true, bonusRate: true, targetUserId: true, targetUserName: true,
        reason: true, createdAt: true,
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      agency, wallet,
      allowed_uses: allowedUses,
      bonus_rate: bonusRate,
      tl_to_jeton_rate: rate.rate,
      commission_rules: rules,
      // §14 — bu bakiye nakde çevrilemez
      cash_withdrawal_allowed: false,
      transactions: txns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  })
}
