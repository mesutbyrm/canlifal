import { prisma } from '@/lib/db'
import { recordMultiLeg, type LedgerLeg } from '@/lib/ledger'
import { atomicDebitJeton } from '@/lib/balance-guard'
import { assertGiftRecipient, lockGiftBalances, saveGiftReceipt } from '@/lib/gift-recipient'

type Distribution = { receiverNet: number; ownerNet: number; siteAmount: number }
export async function settleRoomGift(p: {
  scope: 'voice' | 'stream'; contextId: string; senderId: string; recipientId: string;
  ownerId: string | null; giftTypeId: string; quantity: number; amount: number;
  source: 'real' | 'fake'; skipDeduction: boolean; dist: Distribution;
  idempotencyRecord: string | null; responseStyle: 'chat' | 'stream' | 'unified';
  giftName: string; giftIcon: string | null;
}) {
  return prisma.$transaction(async (tx: any) => {
    await assertGiftRecipient(tx, p.scope, p.contextId, p.recipientId)
    await lockGiftBalances(tx, [p.senderId, p.recipientId, p.ownerId])
    const sender = await tx.user.findUnique({ where: { id: p.senderId }, select: { jetonBalance: true, fakeJetonBalance: true } })
    const finance = p.source === 'real'
    if (!p.skipDeduction) await atomicDebitJeton(tx, p.senderId, p.amount, p.source)
    const senderBalanceAfter = sender.jetonBalance - (finance ? p.amount : 0)
    if (finance) {
      await tx.jetonTransaction.create({ data: {
        userId: p.senderId, type: p.senderId === p.recipientId ? 'self_gift_sent' : 'gift_sent',
        amount: -p.amount, balanceBefore: sender.jetonBalance, balanceAfter: senderBalanceAfter,
        description: `${p.giftName} x${p.quantity} (${p.scope})`,
      } })
      const credits = new Map<string, number>()
      if (p.dist.receiverNet) credits.set(p.recipientId, p.dist.receiverNet)
      if (p.ownerId && p.dist.ownerNet) credits.set(p.ownerId, (credits.get(p.ownerId) || 0) + p.dist.ownerNet)
      for (const [userId, amount] of credits) {
        const before = await tx.user.findUnique({ where: { id: userId }, select: { jetonBalance: true } })
        await tx.user.update({ where: { id: userId }, data: { jetonBalance: { increment: amount } } })
        await tx.jetonTransaction.create({ data: {
          userId, type: userId === p.recipientId ? 'gift_received' : 'gift_commission', amount,
          balanceBefore: before.jetonBalance, balanceAfter: before.jetonBalance + amount,
          description: `${p.giftName} x${p.quantity} (${p.scope})`,
        } })
      }
    }
    const amounts = {
      totalPrice: finance ? p.amount : 0, pointAmount: p.amount, jetonSource: p.source,
      receiverAmount: finance ? p.dist.receiverNet : 0, ownerAmount: finance ? p.dist.ownerNet : 0,
      transactionType: p.senderId === p.recipientId ? 'self_gift' : 'gift',
    }
    const common = { senderId: p.senderId, giftTypeId: p.giftTypeId, quantity: p.quantity, ...amounts }
    const gift = p.scope === 'voice'
      ? await tx.chatRoomGift.create({ data: { ...common, roomId: p.contextId, recipientId: p.recipientId,
          currencyType: 'jeton', commissionAmount: finance ? p.dist.siteAmount : 0, beneficiaryId: p.ownerId } })
      : await tx.streamGift.create({ data: { ...common, streamId: p.contextId, recipientId: p.recipientId,
          siteAmount: finance ? p.dist.siteAmount : 0 }, include: { sender: { select: { name: true, image: true } }, giftType: true } })
    if (finance) {
      const legs: LedgerLeg[] = [{ accountType: 'user_jeton', accountId: p.senderId, direction: 'debit', amount: p.amount,
        balanceBefore: sender.jetonBalance, balanceAfter: senderBalanceAfter }]
      if (p.dist.receiverNet) legs.push({ accountType: 'user_jeton', accountId: p.recipientId, direction: 'credit', amount: p.dist.receiverNet })
      if (p.ownerId && p.dist.ownerNet) legs.push({ accountType: 'user_jeton', accountId: p.ownerId, direction: 'credit', amount: p.dist.ownerNet })
      if (p.dist.siteAmount) legs.push({ accountType: 'platform_jeton', accountId: 'platform', direction: 'credit', amount: p.dist.siteAmount })
      await recordMultiLeg({ legs, category: 'gift_send', currency: 'jeton', actorId: p.senderId,
        referenceType: p.scope === 'voice' ? 'ChatRoomGift' : 'StreamGift', referenceId: gift.id,
        description: `${p.giftName} x${p.quantity}`, metadata: { contextId: p.contextId, recipientId: p.recipientId,
          jetonSource: p.source, transactionType: amounts.transactionType } }, { client: tx, strict: true })
    }
    if (p.scope === 'voice') {
      await tx.roomRevenueLog.create({ data: {
        roomId: p.contextId, eventType: 'gift', senderId: p.senderId, receiverId: p.recipientId, ownerId: p.ownerId,
        totalAmount: amounts.totalPrice, receiverAmount: amounts.receiverAmount, ownerAmount: amounts.ownerAmount,
        siteAmount: finance ? p.dist.siteAmount : 0,
        metadata: JSON.stringify({ giftId: gift.id, giftTypeId: p.giftTypeId, giftName: p.giftName, quantity: p.quantity,
          pointAmount: p.amount, jetonSource: p.source, transactionType: amounts.transactionType }),
      } })
    } else {
      await tx.videoStream.update({ where: { id: p.contextId }, data: { lastGiftAt: new Date() } })
    }
    const senderAfter = await tx.user.findUnique({ where: { id: p.senderId }, select: { jetonBalance: true, fakeJetonBalance: true } })
    const receiptGift = { ...gift, amount: p.amount, giftId: gift.id, giftName: p.giftName, giftIcon: p.giftIcon, recipientId: p.recipientId }
    const data = { gift: receiptGift, newBalance: senderAfter.jetonBalance, fakeBalance: senderAfter.fakeJetonBalance,
      jetonSource: p.source, countsAsFinance: finance, pointAmount: p.amount, pkUpdate: null }
    const receipt = p.responseStyle === 'unified' ? { success: true, data } : { success: true, ...data }
    // Receipt and charge commit together. A crash after this point cannot charge again.
    await saveGiftReceipt(tx, p.idempotencyRecord, receipt)
    return { gift, receipt, newBalance: senderAfter.jetonBalance, senderBalanceBefore: sender.jetonBalance }
  })
}
