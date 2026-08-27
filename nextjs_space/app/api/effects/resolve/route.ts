import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { resolveEffects, EffectContext } from '@/lib/effect-rules'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/effects/resolve
 * Returns the resolved cosmetic effects for the current user, based on their
 * level, supporter level, membership tier, and total spend.
 *
 * Query params (all optional — provide to override auto-detect):
 *   ?broadcasterId=xxx  — context broadcaster for supporter level lookup
 */
export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    // Build context from the user's profile
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { level: true, membership: true },
    })

    const ctx: EffectContext = {
      level: profile?.level ?? undefined,
      membershipTier: profile?.membership ?? undefined,
    }

    // Supporter level for a specific broadcaster?
    const broadcasterId = req.nextUrl.searchParams.get('broadcasterId')
    if (broadcasterId) {
      const sl = await prisma.supporterLevel.findUnique({
        where: { userId_broadcasterId: { userId: user.id, broadcasterId } },
        select: { level: true },
      })
      if (sl) ctx.supporterLevel = sl.level
    }

    // Total spend (absolute debit sum from CreditTransaction)
    const spendAgg = await prisma.creditTransaction.aggregate({
      where: { userId: user.id, amount: { lt: 0 } },
      _sum: { amount: true },
    })
    ctx.totalSpent = Math.abs(spendAgg._sum.amount ?? 0)

    const effects = await resolveEffects(ctx)
    return apiSuccess({ effects, context: ctx })
  } catch (err) {
    console.error('[effects/resolve GET]', err)
    return apiError('INTERNAL_ERROR', 'Efektler çözümlenemedi', 500)
  }
}
