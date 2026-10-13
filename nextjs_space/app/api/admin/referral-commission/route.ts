import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator', 'finans']

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Komisyon defteri listesi + istatistikler */
export async function GET(request: NextRequest) {
  try {
    const session = await getStaffSession()
    const role = (session?.user as any)?.role
    if (!session?.user?.id || !(await staffCan(role, (session?.user as any)?.id, 'finance.report.view', ADMIN_ROLES))) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || undefined
    const q = (searchParams.get('q') || '').trim()
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10) || 30, 200)
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0

    const where: any = {}
    if (type && type !== 'all') where.commissionType = type
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }
    if (q) {
      where.OR = [
        { earner: { name: { contains: q, mode: 'insensitive' } } },
        { earner: { username: { contains: q, mode: 'insensitive' } } },
        { earner: { email: { contains: q, mode: 'insensitive' } } },
        { sourceUser: { name: { contains: q, mode: 'insensitive' } } },
        { sourceUser: { username: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const userSel = { select: { id: true, name: true, username: true, email: true, image: true } }

    const [items, total, allAgg, monthAgg, refAgg, agAgg, earnerCount] = await Promise.all([
      prisma.referralCommission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { earner: userSel, sourceUser: userSel },
      }),
      prisma.referralCommission.count({ where }),
      prisma.referralCommission.aggregate({ _sum: { amount: true, topupAmount: true }, _count: true }),
      prisma.referralCommission.aggregate({
        where: { createdAt: { gte: startOfMonth() } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.referralCommission.aggregate({ where: { commissionType: 'referral' }, _sum: { amount: true }, _count: true }),
      prisma.referralCommission.aggregate({ where: { commissionType: 'agency_invite' }, _sum: { amount: true }, _count: true }),
      prisma.referralCommission.groupBy({ by: ['earnerId'], _count: true }),
    ])

    return NextResponse.json({
      items,
      total,
      limit,
      offset,
      stats: {
        totalPaid: allAgg._sum.amount || 0,
        totalTopup: allAgg._sum.topupAmount || 0,
        totalCount: allAgg._count || 0,
        monthlyPaid: monthAgg._sum.amount || 0,
        monthlyCount: monthAgg._count || 0,
        referralPaid: refAgg._sum.amount || 0,
        referralCount: refAgg._count || 0,
        agencyPaid: agAgg._sum.amount || 0,
        agencyCount: agAgg._count || 0,
        earnerCount: earnerCount.length,
      },
    })
  } catch (error) {
    console.error('[admin referral-commission] error:', error)
    return NextResponse.json({ error: 'Kayıtlar alınamadı' }, { status: 500 })
  }
}
