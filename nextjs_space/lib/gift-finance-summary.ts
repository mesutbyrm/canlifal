import { prisma } from '@/lib/db'
import { getCached } from '@/lib/cache'
import { round2 } from '@/lib/jeton-pricing'

/** Historical gift earnings and actual withdrawal states; never treat approval as paid. */
export async function giftFinanceSummary(userId: string, balance: number, rate: number, canWithdraw: boolean, limit: number) {
  const historical = await getCached(`gift-finance:${userId}`, 5, async () => {
    const [sent, earned, chat, streams, direct, withdrawals] = await Promise.all([
      prisma.jetonTransaction.aggregate({ where: { userId, type: { in: ['gift_sent', 'self_gift_sent'] } }, _sum: { amount: true } }),
      prisma.jetonTransaction.aggregate({ where: { userId, type: { in: ['gift_received', 'gift_commission'] } }, _sum: { amount: true } }),
      prisma.chatRoomGift.aggregate({ where: { recipientId: userId }, _sum: { totalPrice: true, receiverAmount: true, commissionAmount: true } }),
      prisma.streamGift.aggregate({ where: { OR: [{ recipientId: userId }, { recipientId: null, stream: { userId } }] }, _sum: { totalPrice: true, receiverAmount: true, siteAmount: true } }),
      prisma.giftHistory.aggregate({ where: { receiverId: userId, context: 'profile' }, _sum: { coinAmount: true } }),
      prisma.withdrawalRequest.groupBy({ by: ['status'], where: { userId }, _sum: { amount: true, amountTL: true, netAmountTL: true, taxAmount: true }, _count: { _all: true, netAmountTL: true } }),
    ])
    const totals = (statuses: string[]) => withdrawals.filter(x => statuses.includes(x.status)).reduce((a,x) => ({
      jeton: a.jeton + (x._sum.amount || 0), grossTL: round2(a.grossTL + (x._sum.amountTL || 0)),
      // Legacy null net is not silently presented as a known payout.
      recordedNetTL: round2(a.recordedNetTL + (x._sum.netAmountTL || 0)), count: a.count + x._count._all, unknownNetCount: a.unknownNetCount + x._count._all - x._count.netAmountTL,
    }), { jeton: 0, grossTL: 0, recordedNetTL: 0, count: 0, unknownNetCount: 0 })
    return { giftSpentJeton: Math.abs(sent._sum.amount || 0),
      giftGrossReceivedJeton: (chat._sum.totalPrice || 0) + (streams._sum.totalPrice || 0) + (direct._sum.coinAmount || 0),
      giftNetEarnedJeton: earned._sum.amount || 0,
      roomStreamPlatformCommissionJeton: (chat._sum.commissionAmount || 0) + (streams._sum.siteAmount || 0),
      pending: totals(['pending','agency_approved']), approvedNotPaid: totals(['approved','processing']), completed: totals(['completed']),
      coverage: 'Net kazanç işlem kayıtlarından; eksik eski kayıtlar veya eski doğrudan hediye komisyonu yeniden hesaplanmaz.' }
  })
  const available = canWithdraw && !historical.pending.count ? Math.min(balance, limit > 0 ? limit : balance) : 0
  return { ...historical, spendableJeton: balance, withdrawableJeton: Math.max(0, available),
    estimatedNetEarningsTL: round2(historical.giftNetEarnedJeton * rate),
    estimatedWithdrawableGrossTL: round2(Math.max(0, available) * rate),
    conversion: { rate, setting: 'jeton_tl_rate', currency: 'TRY', historicalPayoutsUseStoredTL: true },
    note: 'Çekilebilir tutar ön kontroldür; minimum, yetki, bakiye ve yönetici onayı çekim sırasında yeniden doğrulanır. Onaylanmış talep ödenmiş sayılmaz.' }
}
