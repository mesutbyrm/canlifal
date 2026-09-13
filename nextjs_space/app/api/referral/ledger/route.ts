import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET /api/referral/ledger — davet komisyonu defteri. */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0
    const type = searchParams.get('type')

    const where: any = { earnerId: auth.id }
    if (type && type !== 'all') where.commissionType = type

    const [rows, total] = await Promise.all([
      prisma.referralCommission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          sourceUserId: true,
          commissionType: true,
          sourceType: true,
          topupAmount: true,
          topupCurrency: true,
          rate: true,
          amount: true,
          currency: true,
          createdAt: true,
        },
      }),
      prisma.referralCommission.count({ where }),
    ])

    const items = rows.map((r) => ({
      id: r.id,
      referredUserId: r.sourceUserId,
      sourceType: r.sourceType,
      commissionType: r.commissionType,
      grossJeton: r.topupAmount,
      topupCurrency: r.topupCurrency,
      beneficiaryShare: r.rate,
      referralCommission: r.amount,
      currency: r.currency,
      status: 'settled',
      cappedAmount: 0,
      createdAt: r.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: { items, total, limit, offset },
    })
  } catch (error) {
    console.error('[Referral ledger] Error:', error)
    return NextResponse.json({ error: 'Davet defteri alınamadı' }, { status: 500 })
  }
}
