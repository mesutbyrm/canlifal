import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { getCommissionConfig } from '@/lib/referral-commission'

export const dynamic = 'force-dynamic'

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Ajans sahibinin davet komisyonu kazançları */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const agency = await prisma.agency.findFirst({
      where: { ownerId: session.user.id },
      select: { id: true, name: true, status: true, totalEarnings: true, commissionRate: true },
    })
    if (!agency) {
      return NextResponse.json({ error: 'Ajans bulunamadı' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0

    const where = { agencyId: agency.id, commissionType: 'agency_invite' }

    const [config, totalAgg, monthAgg, items, total, memberCount] = await Promise.all([
      getCommissionConfig(),
      prisma.referralCommission.aggregate({ where, _sum: { amount: true } }),
      prisma.referralCommission.aggregate({
        where: { ...where, createdAt: { gte: startOfMonth() } },
        _sum: { amount: true },
      }),
      prisma.referralCommission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          topupAmount: true,
          topupCurrency: true,
          rate: true,
          amount: true,
          currency: true,
          sourceType: true,
          createdAt: true,
          sourceUser: { select: { id: true, name: true, username: true, image: true } },
        },
      }),
      prisma.referralCommission.count({ where }),
      prisma.agencyUser.count({ where: { agencyId: agency.id, isActive: true } }),
    ])

    return NextResponse.json({
      agency: { id: agency.id, name: agency.name, status: agency.status, totalEarnings: agency.totalEarnings },
      summary: {
        totalEarned: totalAgg._sum.amount || 0,
        monthlyEarned: monthAgg._sum.amount || 0,
        transactionCount: total,
        memberCount,
      },
      rates: { agencyEnabled: config.agencyEnabled, agencyRate: config.agencyRate },
      items,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[agency invite-earnings] error:', error)
    return NextResponse.json({ error: 'Kazançlar alınamadı' }, { status: 500 })
  }
}
