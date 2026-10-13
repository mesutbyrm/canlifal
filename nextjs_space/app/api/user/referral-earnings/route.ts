import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { getCommissionSummary, getCommissionConfig } from '@/lib/referral-commission'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

/** Giriş yapmış kullanıcının referans/ajans komisyon kazançları */
export async function GET(request: NextRequest) {
  try {
    // Çift kimlik doğrulama: mobil JWT veya web oturumu (geriye dönük uyumlu)
    const mobileUser = await authenticateRequest(request)
    const session = mobileUser ? null : await getServerSession(authOptions)
    if (!mobileUser && !session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const userId = mobileUser?.id || session!.user.id
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0
    const type = searchParams.get('type') || undefined

    const where: any = { earnerId: userId }
    if (type && type !== 'all') where.commissionType = type

    const [summary, config, items, total, me] = await Promise.all([
      getCommissionSummary(userId),
      getCommissionConfig(),
      prisma.referralCommission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          commissionType: true,
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
      prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true, referralCreditsEarned: true, credits: true, jetonBalance: true, cfcBalance: true },
      }),
    ])

    return NextResponse.json({
      summary,
      balances: {
        credits: me?.credits || 0,
        jeton: me?.jetonBalance || 0,
        cfc: me?.cfcBalance || 0,
        referralCreditsEarned: me?.referralCreditsEarned || 0,
      },
      referralCode: me?.referralCode || null,
      rates: {
        referralEnabled: config.referralEnabled,
        referralRate: config.referralRate,
        agencyEnabled: config.agencyEnabled,
        agencyRate: config.agencyRate,
      },
      items,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[referral-earnings] error:', error)
    return NextResponse.json({ error: 'Kazançlar alınamadı' }, { status: 500 })
  }
}
