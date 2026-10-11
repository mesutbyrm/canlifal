/**
 * GET /api/admin/finance/summary
 * Kompakt ekonomi özeti: gelir, gider, net sonuç.
 * ?period=daily|weekly|monthly|yearly|custom&from=&to=&excludeTest=true
 * Mobil ve Flutter admin paneli için optimize.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'
import { getExcludedUserIds } from '@/lib/admin-check'
import { getCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

function getDateRange(period: string, from?: string | null, to?: string | null) {
  const now = new Date()
  if (period === 'daily') {
    return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), to: now }
  }
  if (period === 'weekly') {
    const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0)
    return { from: d, to: now }
  }
  if (period === 'monthly') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
  }
  if (period === 'yearly') {
    return { from: new Date(now.getFullYear(), 0, 1), to: now }
  }
  if (period === 'custom' && from) {
    const f = new Date(from); f.setHours(0, 0, 0, 0)
    const t = to ? new Date(to) : now; t.setHours(23, 59, 59, 999)
    return { from: f, to: t }
  }
  return { from: null, to: null }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getStaffSession()
    if (
      !session?.user?.id ||
      !(await staffCan(
        (session.user as any).role,
        (session.user as any).id,
        'finance.report.view',
        ['admin', 'yonetici', 'finans']
      ))
    ) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const sp = new URL(request.url).searchParams
    const period = sp.get('period') || 'monthly'
    const { from: dateFrom, to: dateTo } = getDateRange(period, sp.get('from'), sp.get('to'))
    const excludeTest = sp.get('excludeTest') !== 'false' // default true

    const dateFilter = dateFrom && dateTo ? { createdAt: { gte: dateFrom, lte: dateTo } } : {}
    const excludedUserIds = excludeTest ? await getExcludedUserIds() : []
    const exSender = excludedUserIds.length > 0 ? { senderId: { notIn: excludedUserIds } } : {}
    const exUser = excludedUserIds.length > 0 ? { userId: { notIn: excludedUserIds } } : {}

    const [
      revenue,
      streamGifts,
      chatGifts,
      tellerGifts,
      sessionCharges,
      membershipPurchases,
      withdrawals,
      refunds,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: 'completed', ...dateFilter },
        _sum: { amount: true, creditsAwarded: true },
        _count: true,
      }),
      prisma.streamGift.aggregate({
        where: { ...dateFilter, ...exSender },
        _sum: { totalPrice: true, siteAmount: true },
        _count: true,
      }),
      prisma.chatRoomGift.aggregate({
        where: { ...dateFilter, ...exSender },
        _sum: { totalPrice: true, commissionAmount: true },
        _count: true,
      }),
      prisma.tellerGift.aggregate({
        where: { ...dateFilter, ...exSender },
        _sum: { totalPrice: true },
        _count: true,
      }),
      prisma.liveSession.aggregate({
        where: { status: { in: ['completed', 'active'] }, ...dateFilter, ...exUser },
        _sum: { creditsCharged: true },
        _count: true,
      }),
      prisma.membershipPurchase.aggregate({
        where: { status: 'active', ...dateFilter, ...exUser },
        _sum: { pricePaid: true },
        _count: true,
      }).catch(() => ({ _sum: { pricePaid: 0 }, _count: 0 })),
      prisma.withdrawalRequest.aggregate({
        where: { status: 'completed', ...dateFilter },
        _sum: { amountTL: true },
        _count: true,
      }).catch(() => ({ _sum: { amountTL: 0 }, _count: 0 })),
      prisma.payment.aggregate({
        where: { status: 'refunded', ...dateFilter },
        _sum: { amount: true },
        _count: true,
      }).catch(() => ({ _sum: { amount: 0 }, _count: 0 })),
    ])

    const totalGiftSpent =
      (streamGifts._sum.totalPrice || 0) +
      (chatGifts._sum.totalPrice || 0) +
      (tellerGifts._sum.totalPrice || 0)
    const totalGiftCommission =
      (streamGifts._sum.siteAmount || 0) + (chatGifts._sum.commissionAmount || 0)

    const totalRevenueTL = revenue._sum.amount || 0
    const totalWithdrawalTL = (withdrawals as any)._sum?.amountTL || 0
    const totalRefundTL = refunds._sum.amount || 0

    const summary = {
      period,
      dateRange: { from: dateFrom?.toISOString() || null, to: dateTo?.toISOString() || null },
      excludeTestTransactions: excludeTest,
      revenue: {
        totalTL: totalRevenueTL,
        creditsAwarded: revenue._sum.creditsAwarded || 0,
        transactionCount: (revenue as any)._count || 0,
      },
      spending: {
        gifts: {
          total: totalGiftSpent,
          stream: streamGifts._sum.totalPrice || 0,
          chatRoom: chatGifts._sum.totalPrice || 0,
          teller: tellerGifts._sum.totalPrice || 0,
          count: ((streamGifts as any)._count || 0) + ((chatGifts as any)._count || 0) + ((tellerGifts as any)._count || 0),
        },
        sessions: {
          total: sessionCharges._sum.creditsCharged || 0,
          count: (sessionCharges as any)._count || 0,
        },
        memberships: {
          total: (membershipPurchases as any)._sum?.pricePaid || 0,
          count: (membershipPurchases as any)._count || 0,
        },
      },
      commission: {
        fromGifts: totalGiftCommission,
      },
      withdrawals: {
        totalTL: totalWithdrawalTL,
        count: (withdrawals as any)._count || 0,
      },
      refunds: {
        totalTL: totalRefundTL,
        count: (refunds as any)._count || 0,
      },
      net: {
        revenueTL: totalRevenueTL - totalRefundTL - totalWithdrawalTL,
      },
    }

    return NextResponse.json({ success: true, data: summary })
  } catch (error) {
    console.error('[admin/finance/summary] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Finans özeti alınamadı' },
      { status: 500 }
    )
  }
}
