import prisma from '@/lib/db'

/**
 * Aggregate the total gift value (in jeton, gross gift price) each user has
 * RECEIVED inside a given voice chat room. Used to render the "received jeton"
 * badge under each seated user (web + Flutter share the same numbers because
 * they are computed from the same ChatRoomGift table).
 *
 * @param roomId  the ChatRoom id
 * @param userIds optional filter — if provided, only totals for these users
 *                are returned (perf: avoids scanning the whole room history
 *                when we only need the active/seated users).
 * @returns Map<userId, totalReceivedJetons>
 */
export async function getReceivedJetonTotals(
  roomId: string,
  userIds?: string[]
): Promise<Map<string, number>> {
  const totals = new Map<string, number>()
  try {
    if (userIds && userIds.length === 0) return totals

    const where: any = { roomId }
    if (userIds && userIds.length > 0) {
      where.recipientId = { in: userIds }
    }

    const grouped = await prisma.chatRoomGift.groupBy({
      by: ['recipientId'],
      where,
      _sum: { totalPrice: true },
    })

    for (const g of grouped as Array<{ recipientId: string; _sum: { totalPrice: number | null } }>) {
      totals.set(g.recipientId, g._sum.totalPrice || 0)
    }
  } catch (err) {
    console.error('[voice-room-gifts] getReceivedJetonTotals error:', err)
  }
  return totals
}
