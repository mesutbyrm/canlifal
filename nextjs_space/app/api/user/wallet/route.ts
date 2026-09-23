import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getCachedPlatformSetting } from '@/lib/cache'
import { getCurrencyBranding } from '@/lib/currency-branding'
import { getCommissionSummary } from '@/lib/referral-commission'

export const dynamic = 'force-dynamic'

interface WalletTx {
  id: string
  currency: 'cfc' | 'jeton'
  amount: number
  type: string
  description: string | null
  balanceAfter: number
  createdAt: Date
}

/**
 * BÖLÜM 7 — Bakiye & Kazanç merkezi.
 * Tek çağrıda: bakiyeler, para birimi markalaması, kazanç özeti,
 * çekim durumu ve birleşik işlem geçmişi.
 */
export async function GET(request: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(request)
    const webSession = mobileUser ? null : await getServerSession(authOptions)
    const userId = mobileUser?.id || webSession?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)
    const currencyFilter = searchParams.get('currency') || 'all' // all | cfc | jeton

    const wantCfc = currencyFilter === 'all' || currencyFilter === 'cfc'
    const wantJeton = currencyFilter === 'all' || currencyFilter === 'jeton'
    // Birleşik listede doğru sıralama için her kaynaktan yeterince satır çekilir.
    const fetchSize = offset + limit

    const [
      user,
      branding,
      summary,
      creditTx,
      jetonTx,
      creditCount,
      jetonCount,
      pendingWithdrawal,
      withdrawals,
      minWithdrawalStr,
      jetonTlRateStr,
      teller,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          credits: true,
          jetonBalance: true,
          cfcBalance: true,
          withdrawalLimit: true,
          referralCode: true,
          referralCreditsEarned: true,
        },
      }),
      getCurrencyBranding(),
      getCommissionSummary(userId),
      wantCfc
        ? prisma.creditTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: fetchSize,
            select: {
              id: true,
              amount: true,
              type: true,
              description: true,
              balance: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      wantJeton
        ? prisma.jetonTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: fetchSize,
            select: {
              id: true,
              amount: true,
              type: true,
              description: true,
              balanceAfter: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      wantCfc ? prisma.creditTransaction.count({ where: { userId } }) : Promise.resolve(0),
      wantJeton ? prisma.jetonTransaction.count({ where: { userId } }) : Promise.resolve(0),
      prisma.withdrawalRequest.findFirst({
        where: { userId, status: { in: ['pending', 'agency_approved', 'processing'] } },
        select: { id: true, amount: true, amountTL: true, status: true, createdAt: true },
      }),
      prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          amount: true,
          amountTL: true,
          method: true,
          status: true,
          adminNote: true,
          createdAt: true,
        },
      }),
      getCachedPlatformSetting('min_withdrawal', '100'),
      getCachedPlatformSetting('jeton_tl_rate', '0.5'),
      prisma.liveFortuneTeller.findFirst({
        where: { userId },
        select: { canWithdraw: true, totalEarnings: true },
      }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const merged: WalletTx[] = [
      ...creditTx.map((t) => ({
        id: `c_${t.id}`,
        currency: 'cfc' as const,
        amount: t.amount,
        type: t.type,
        description: t.description,
        balanceAfter: t.balance,
        createdAt: t.createdAt,
      })),
      ...jetonTx.map((t) => ({
        id: `j_${t.id}`,
        currency: 'jeton' as const,
        amount: t.amount,
        type: t.type,
        description: t.description,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit)

    const minWithdrawal = parseInt(minWithdrawalStr || '100', 10) || 100
    const jetonTlRate = parseFloat(jetonTlRateStr || '0.5') || 0

    return NextResponse.json({
      balances: {
        cfc: user.credits || 0,
        jeton: user.jetonBalance || 0,
        legacyCfc: user.cfcBalance || 0,
      },
      branding,
      rules: {
        convertible: ['jeton'],
        nonConvertible: ['cfc'],
        note: 'CFC paraya çevrilemez; yalnızca Jeton bakiyesi çekilebilir.',
      },
      earnings: {
        ...summary,
        referralCreditsEarned: user.referralCreditsEarned || 0,
        tellerEarnings: teller?.totalEarnings || 0,
      },
      referralCode: user.referralCode || null,
      withdrawal: {
        canWithdraw: Boolean(teller?.canWithdraw),
        minWithdrawal,
        maxWithdrawal: user.withdrawalLimit || 0,
        jetonTlRate,
        estimatedTl: parseFloat(((user.jetonBalance || 0) * jetonTlRate).toFixed(2)),
        pending: pendingWithdrawal,
        history: withdrawals,
      },
      transactions: merged,
      total: creditCount + jetonCount,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[wallet] error:', error)
    return NextResponse.json({ error: 'Cüzdan bilgileri alınamadı' }, { status: 500 })
  }
}
