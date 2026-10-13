import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'
import { lockGiftBalances, saveGiftReceipt } from '@/lib/gift-recipient'
import { atomicDebitJeton } from '@/lib/balance-guard'
import { recordMultiLeg, type LedgerLeg } from '@/lib/ledger'
import { processAgencyCommission } from '@/lib/agency-commission'
import { recordContribution } from '@/lib/supporter-level'
import { recordTeamPoints } from '@/lib/team-points'

export async function settleDirectGift(p: {
  senderId: string; recipientId: string; amount: number; commission: number;
  giftTypeId?: string; name: string; source: 'real' | 'fake'; skipDeduction: boolean;
  receiptId: string | null; response: Record<string, unknown>;
}) {
  return prisma.$transaction(async tx => {
    await lockGiftBalances(tx, [p.senderId, p.recipientId])
    const sender = await tx.user.findUniqueOrThrow({ where: { id: p.senderId }, select: { jetonBalance: true, fakeJetonBalance: true } })
    const receiver = await tx.user.findUniqueOrThrow({ where: { id: p.recipientId }, select: { jetonBalance: true } })
    if (!p.skipDeduction) await atomicDebitJeton(tx, p.senderId, p.amount, p.source)
    const finance = p.source === 'real'
    const net = finance ? p.amount - p.commission : 0
    const sourceId = randomUUID()
    const options = { client: tx, strict: true }
    if (finance) {
      await tx.jetonTransaction.create({ data: { userId: p.senderId, type: 'gift_sent', amount: -p.amount,
        balanceBefore: sender.jetonBalance, balanceAfter: sender.jetonBalance - p.amount, description: p.name } })
      if (net > 0) {
        await tx.user.update({ where: { id: p.recipientId }, data: { jetonBalance: { increment: net } } })
        await tx.jetonTransaction.create({ data: { userId: p.recipientId, type: 'gift_received', amount: net,
          balanceBefore: receiver.jetonBalance, balanceAfter: receiver.jetonBalance + net, description: p.name } })
        await processAgencyCommission({ userId: p.recipientId, earnedAmount: net, sourceType: 'direct_gift', sourceId }, options)
      }
      const legs: LedgerLeg[] = [{ accountType: 'user_jeton', accountId: p.senderId, direction: 'debit', amount: p.amount,
        balanceBefore: sender.jetonBalance, balanceAfter: sender.jetonBalance - p.amount }]
      if (net) legs.push({ accountType: 'user_jeton', accountId: p.recipientId, direction: 'credit', amount: net,
        balanceBefore: receiver.jetonBalance, balanceAfter: receiver.jetonBalance + net })
      if (p.commission) legs.push({ accountType: 'platform_jeton', accountId: 'platform', direction: 'credit', amount: p.commission })
      await recordMultiLeg({ legs, category: 'gift_send', currency: 'jeton', referenceType: 'GiftHistory', referenceId: sourceId,
        actorId: p.senderId, description: p.name, metadata: { recipientId: p.recipientId, jetonSource: p.source } }, options)
    }
    await tx.giftHistory.create({ data: { id: sourceId, context: 'profile', contextId: p.recipientId,
      senderId: p.senderId, receiverId: p.recipientId, giftTypeId: p.giftTypeId || 'jeton', quantity: 1,
      coinAmount: finance ? p.amount : 0, pointAmount: p.amount, jetonSource: p.source } })
    await recordContribution(p.senderId, p.recipientId, p.amount, options)
    await recordTeamPoints(p.senderId, p.amount, options)
    const response = { ...p.response, transactionId: sourceId, newBalance: sender.jetonBalance - (finance ? p.amount : 0) }
    await saveGiftReceipt(tx, p.receiptId, response)
    return response
  }, { timeout: 20000 })
}
