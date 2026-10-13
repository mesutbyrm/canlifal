import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

/** Ajans cüzdan hareketleri — Flutter `GET /api/agency/wallet/transactions` (page, limit). */
async function resolveAgencyWalletAccess(userId: string) {
  const membership = await prisma.agencyUser.findUnique({
    where: { userId },
    select: { agencyId: true, role: true, isActive: true },
  })
  const owned = await prisma.agency.findFirst({ where: { ownerId: userId }, select: { id: true } })
  const agencyId =
    owned?.id ||
    (membership?.isActive && ['owner', 'manager'].includes(membership.role) ? membership.agencyId : null)
  return agencyId
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as { user: { id: string } }).user

  const agencyId = await resolveAgencyWalletAccess(user.id)
  if (!agencyId) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Ajans cüzdanına erişim yetkiniz yok' } },
      { status: 403 },
    )
  }

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20))

  const where = { agencyId }
  const [total, txns] = await Promise.all([
    prisma.agencyWalletTransaction.count({ where }),
    prisma.agencyWalletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        type: true,
        direction: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        tlAmount: true,
        rateUsed: true,
        bonusRate: true,
        targetUserId: true,
        targetUserName: true,
        reason: true,
        createdAt: true,
      },
    }),
  ])

  const pagination = { page, limit, total, pages: Math.ceil(total / limit) || 0 }
  return NextResponse.json({
    success: true,
    data: {
      transactions: txns,
      items: txns,
      txns,
      pagination,
    },
    transactions: txns,
    items: txns,
  })
}
