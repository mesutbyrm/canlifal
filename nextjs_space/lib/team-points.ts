import prisma from '@/lib/db'

/**
 * Fire-and-forget: add points to a user's team membership and team total.
 * If the user has no team membership, this is a no-op.
 * 
 * @param userId - The user earning points
 * @param amount - Points to add (typically gift/tip amount)
 */
export async function recordTeamPoints(
  userId: string,
  amount: number,
  options: { client?: any; strict?: boolean } = {},
): Promise<void> {
  if (!userId || !amount || amount <= 0) return

  try {
    const prisma = options.client || (await import('@/lib/db')).prisma
    // Find the user's active team membership
    const membership = await prisma.teamMember.findFirst({
      where: { userId },
      select: { id: true, teamId: true },
    })
    if (!membership) return

    // Atomic: increment member points and team totalPoints
    const writes = [
      prisma.teamMember.update({
        where: { id: membership.id },
        data: { points: { increment: Math.trunc(amount) } },
      }),
      prisma.team.update({
        where: { id: membership.teamId },
        data: { totalPoints: { increment: Math.trunc(amount) } },
      }),
    ]
    if (options.client) { for (const write of writes) await write }
    else await prisma.$transaction(writes)
  } catch (err) {
    // Fire-and-forget — never throw
    console.error('[team-points] recordTeamPoints failed:', err)
    if (options.strict) throw err
  }
}
