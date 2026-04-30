import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const membership = await prisma.agencyUser.findUnique({
      where: { userId: session.user.id },
    })

    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = 20

    const [earnings, total] = await Promise.all([
      prisma.agencyEarning.findMany({
        where: { agencyId: membership.agencyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.agencyEarning.count({ where: { agencyId: membership.agencyId } }),
    ])

    // Get summary stats
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [weeklyEarnings, monthlyEarnings] = await Promise.all([
      prisma.agencyEarning.aggregate({
        where: { agencyId: membership.agencyId, createdAt: { gte: weekAgo } },
        _sum: { amount: true },
      }),
      prisma.agencyEarning.aggregate({
        where: { agencyId: membership.agencyId, createdAt: { gte: monthAgo } },
        _sum: { amount: true },
      }),
    ])

    return NextResponse.json({
      earnings,
      total,
      pages: Math.ceil(total / limit),
      summary: {
        weekly: weeklyEarnings._sum.amount || 0,
        monthly: monthlyEarnings._sum.amount || 0,
      }
    })
  } catch (error: any) {
    console.error('[Agency Earnings] Error:', error)
    return NextResponse.json({ error: 'Kazançlar alınamadı' }, { status: 500 })
  }
}
