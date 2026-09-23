// Effect Rule resolver (Phase 7)
//
// Data-driven engine that decides which cosmetic effects (entrance / name /
// chat bubble / mic frame / badge) a user is eligible for, based on active
// EffectRule rows. Additive: it only READS rules; it does not mutate the
// existing cosmetic-ownership tables, so current behavior is unchanged.

import prisma from '@/lib/db'
import { getCached } from '@/lib/cache'

export interface EffectContext {
  level?: number            // user level
  supporterLevel?: number   // max supporter tier the user holds
  membershipTier?: string   // membership key/tier
  totalSpent?: number       // cumulative spend (jeton)
}

export interface ResolvedEffect {
  ruleKey: string
  effectType: string
  effectRefId: string | null
  priority: number
}

/** Load active rules (60s cache). */
async function getActiveRules() {
  return getCached('effect_rules:active', 60, async () => {
    return prisma.effectRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    })
  })
}

function ruleMatches(rule: any, ctx: EffectContext): boolean {
  switch (rule.conditionType) {
    case 'level':
      return (ctx.level ?? 0) >= (rule.threshold ?? 0)
    case 'supporter_level':
      return (ctx.supporterLevel ?? 0) >= (rule.threshold ?? 0)
    case 'spend_threshold':
      return (ctx.totalSpent ?? 0) >= (rule.threshold ?? 0)
    case 'membership':
      return !!ctx.membershipTier && ctx.membershipTier === rule.conditionValue
    case 'manual':
      return false // manual rules are granted explicitly, never auto-matched
    default:
      return false
  }
}

/**
 * Return the highest-priority matching effect for each effectType given the
 * user context. Never throws.
 */
export async function resolveEffects(ctx: EffectContext): Promise<ResolvedEffect[]> {
  try {
    const rules = await getActiveRules()
    const byType = new Map<string, ResolvedEffect>()
    for (const rule of rules as any[]) {
      if (!ruleMatches(rule, ctx)) continue
      const existing = byType.get(rule.effectType)
      if (!existing || rule.priority > existing.priority) {
        byType.set(rule.effectType, {
          ruleKey: rule.key,
          effectType: rule.effectType,
          effectRefId: rule.effectRefId ?? null,
          priority: rule.priority ?? 0,
        })
      }
    }
    return Array.from(byType.values())
  } catch (err) {
    console.error('[effect-rules] resolveEffects failed (non-blocking):', err)
    return []
  }
}
