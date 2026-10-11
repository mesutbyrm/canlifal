/**
 * BÖLÜM 20 §17/§19 — Kullanıcının kademesine göre görüntüleyebileceği etkinlik takvimi.
 * Filtreleme SUNUCUDA yapılır; istemci gizleme yeterli değildir (§21).
 */
import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUserId } from '@/lib/vip-guard'
import { getUserEntitlements, userTierRank, normalizeTierKey, getTiers } from '@/lib/vip-entitlements'
import { apiSuccess, apiUnauthorized } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = await resolveUserId(request)
  if (!userId) return apiUnauthorized()
  const ent = await getUserEntitlements(userId)
  const tier = ent?.tier || 'basic'
  const rank = await userTierRank(userId)

  const now = new Date()
  const rows = await prisma.membershipEvent.findMany({
    where: { isActive: true, endsAt: { gte: now } },
    orderBy: [{ priority: 'desc' }, { startsAt: 'asc' }],
    take: 100,
  })

  const tiers = await getTiers()
  const tierKeys = tiers.map((t: any) => t.key)
  const rankOf = (key: string) => {
    const t = tiers.find((x: any) => x.key === normalizeTierKey(key, tierKeys))
    return t ? t.rank : 0
  }

  const visible = rows.filter((ev) => {
    if (ev.allowedTiers && ev.allowedTiers.length > 0) {
      return ev.allowedTiers.includes(tier)
    }
    if (ev.minTierKey) return rank >= rankOf(ev.minTierKey)
    return true
  })

  return apiSuccess({
    tier,
    events: visible.map((ev) => ({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      bannerUrl: ev.bannerUrl,
      ctaUrl: ev.ctaUrl,
      startsAt: ev.startsAt,
      endsAt: ev.endsAt,
      isLive: ev.startsAt <= now && ev.endsAt >= now,
      minTierKey: ev.minTierKey,
      allowedTiers: ev.allowedTiers,
    })),
  })
}
