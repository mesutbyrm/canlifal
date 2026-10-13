import { prisma } from '@/lib/db'

/** Never reprice past gifts from today's catalogue. Unknown legacy Fake points
 * stay unknown (zero fallback), rather than inventing an old price. */
export function giftPointAmount(gift: { pointAmount?: number | null; totalPrice?: number; coinAmount?: number }): number {
  return gift.pointAmount ?? gift.totalPrice ?? gift.coinAmount ?? 0
}

/** Separate aggregates preserve legacy financial amounts without counting new
 * Real gifts twice. Scope must contain the indexed roomId/streamId. */
export async function giftSenderTotals(scope: 'voice' | 'stream', where: any) {
  const model: any = scope === 'voice' ? prisma.chatRoomGift : prisma.streamGift
  const [current, legacy] = await Promise.all([
    model.groupBy({ by: ['senderId'], where: { ...where, pointAmount: { not: null } }, _sum: { pointAmount: true, totalPrice: true, quantity: true } }),
    model.groupBy({ by: ['senderId'], where: { ...where, pointAmount: null }, _sum: { totalPrice: true, quantity: true } }),
  ])
  const totals = new Map<string, { senderId: string; pointAmount: number; financialAmount: number; quantity: number }>()
  for (const row of [...current, ...legacy]) {
    const total = totals.get(row.senderId) || { senderId: row.senderId, pointAmount: 0, financialAmount: 0, quantity: 0 }
    total.pointAmount += row._sum.pointAmount ?? row._sum.totalPrice ?? 0
    total.financialAmount += row._sum.totalPrice || 0
    total.quantity += row._sum.quantity || 0
    totals.set(row.senderId, total)
  }
  return [...totals.values()].sort((a, b) => b.pointAmount - a.pointAmount)
}
