// Supporter Level helper (Phase 7)
//
// Tracks a fan's cumulative contribution to a specific broadcaster/teller and
// derives a tier. Additive & fire-and-forget: call recordContribution after a
// gift/tip so it never blocks the main money path.

import prisma from '@/lib/db'

// Default tier thresholds (cumulative jeton value). Ascending.
export const SUPPORTER_TIERS: { level: number; name: string; min: number }[] = [
  { level: 0, name: 'Yeni', min: 0 },
  { level: 1, name: 'Bronz', min: 100 },
  { level: 2, name: 'Gümüş', min: 1000 },
  { level: 3, name: 'Altın', min: 5000 },
  { level: 4, name: 'Platin', min: 20000 },
  { level: 5, name: 'Elmas', min: 100000 },
]

export function resolveTier(total: number): { level: number; name: string } {
  let current = SUPPORTER_TIERS[0]
  for (const t of SUPPORTER_TIERS) {
    if (total >= t.min) current = t
  }
  return { level: current.level, name: current.name }
}

/**
 * Add `amount` (jeton value) to the supporter's cumulative contribution toward
 * a broadcaster and recompute the tier. Never throws.
 */
export async function recordContribution(
  userId: string,
  broadcasterId: string,
  amount: number,
  options: { client?: any; strict?: boolean } = {},
): Promise<void> {
  if (!userId || !broadcasterId || !amount || amount <= 0) return
  if (userId === broadcasterId) return
  try {
    const prisma = options.client || (await import('@/lib/db')).prisma
    // Serializes every contribution for this sender, including legacy callers.
    const write = async (prisma: any) => {
    await prisma.$queryRawUnsafe('SELECT "id" FROM "users" WHERE "id" = $1 FOR UPDATE', userId)
    const existing = await prisma.supporterLevel.findUnique({
      where: { userId_broadcasterId: { userId, broadcasterId } },
      select: { totalContributed: true },
    })
    const newTotal = (existing?.totalContributed ?? 0) + amount
    const tier = resolveTier(newTotal)
    await prisma.supporterLevel.upsert({
      where: { userId_broadcasterId: { userId, broadcasterId } },
      update: {
        totalContributed: newTotal,
        level: tier.level,
        levelName: tier.name,
        lastContributedAt: new Date(),
      },
      create: {
        userId,
        broadcasterId,
        totalContributed: newTotal,
        level: tier.level,
        levelName: tier.name,
        lastContributedAt: new Date(),
      },
    })
    }
    if (options.client) await write(prisma)
    else await prisma.$transaction(write)
  } catch (err) {
    console.error('[supporter-level] recordContribution failed:', err)
    if (options.strict) throw err
  }
}
