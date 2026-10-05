import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getCachedPlatformSetting } from '@/lib/cache'
import { getWithdrawalTaxPercent, round2 } from '@/lib/jeton-pricing'

export const dynamic = 'force-dynamic'

/**
 * Para çekim ön hesabı — kullanıcıya "eline geçecek tahmini tutar" gösterir.
 * GET /api/withdrawals/quote?amount=5000
 */
export async function GET(req: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || (session?.user as any)?.id
    if (!userId) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const requested = Math.max(0, Math.floor(Number(searchParams.get('amount') || '0')))

    const [user, rateStr, minStr, taxPercent] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { jetonBalance: true, withdrawalLimit: true } }),
      getCachedPlatformSetting('jeton_tl_rate', '0.5'),
      getCachedPlatformSetting('min_withdrawal', '100'),
      getWithdrawalTaxPercent(),
    ])

    const rate = parseFloat(rateStr) || 0.5
    const minWithdrawal = parseInt(minStr) || 100
    const balance = user?.jetonBalance || 0
    const amount = requested > 0 ? requested : balance

    const grossTL = round2(amount * rate)
    const taxAmount = round2((grossTL * taxPercent) / 100)
    const netAmountTL = round2(grossTL - taxAmount)

    // Toplam kazanç (onaylanmış/tamamlanmış geçmiş çekimler dahil)
    const past = await prisma.withdrawalRequest.aggregate({
      where: { userId, status: { in: ['approved', 'completed'] } },
      _sum: { amountTL: true, netAmountTL: true, taxAmount: true },
    })

    return NextResponse.json({
      jetonAmount: amount,
      jetonBalance: balance,
      rate,
      minWithdrawal,
      grossTL,
      taxPercent,
      taxAmount,
      netAmountTL,
      lifetime: {
        grossTL: past._sum.amountTL || 0,
        netTL: past._sum.netAmountTL || 0,
        taxTL: past._sum.taxAmount || 0,
      },
      labels: {
        gross: 'Toplam kazandığınız',
        tax: taxPercent > 0 ? `Kesinti (%${taxPercent})` : 'Kesinti yok',
        net: 'Elinize geçecek tahmini tutar',
      },
    })
  } catch (e) {
    console.error('withdrawal quote error', e)
    return NextResponse.json({ error: 'Hesaplama yapılamadı' }, { status: 500 })
  }
}
