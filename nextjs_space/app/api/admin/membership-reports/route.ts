/**
 * BÖLÜM 20 — Admin: üyelik raporları (§24).
 * Kademe dağılımı, süresi yaklaşanlar, süresi dolanlar, yükseltme/düşürme oranları,
 * en çok kullanılan VIP özellikler ve elde tutma.
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { apiSuccess } from '@/lib/api-response'
import { requireRole } from '@/lib/rbac'
import { getTiers } from '@/lib/vip-entitlements'
import { membershipsExpiringWithin } from '@/lib/membership-lifecycle'

export const dynamic = 'force-dynamic'

const REPORT_ROLES = ['admin', 'yonetici', 'finans', 'moderator']

export async function GET(req: NextRequest) {
  const denied = await requireRole(req, REPORT_ROLES)
  if (denied) return denied

  const now = new Date()
  const day = 86400000
  const since30 = new Date(now.getTime() - 30 * day)
  const since1 = new Date(now.getTime() - day)

  const tiers = await getTiers()
  const rankOf = new Map(tiers.map((t) => [t.key, t.rank]))

  const [byTier, activeVip, expiredNow, grants30, grantsToday, prefRows, visitTotal] = await Promise.all([
    prisma.user.groupBy({ by: ['membership'], _count: { _all: true } }),
    prisma.user.count({
      where: { membership: { not: 'basic' }, OR: [{ membershipExpiresAt: null }, { membershipExpiresAt: { gt: now } }] },
    }),
    prisma.user.count({ where: { membership: { not: 'basic' }, membershipExpiresAt: { lt: now } } }),
    prisma.membershipGrant.findMany({
      where: { createdAt: { gte: since30 } },
      select: { tierKey: true, previousTier: true, source: true, createdAt: true, receiverId: true },
      take: 5000,
    }),
    prisma.membershipGrant.count({ where: { createdAt: { gte: since1 } } }),
    prisma.userVipPreference.findMany({ take: 5000 }),
    prisma.profileVisit.count(),
  ])

  // Kademe dağılımı
  const distribution = tiers.map((t) => ({
    tierKey: t.key,
    name: t.name,
    color: t.color,
    userCount: byTier.find((b) => (b.membership || 'basic').toLowerCase() === t.key)?._count._all ?? 0,
  }))

  // Yükseltme / düşürme / yenileme
  let upgrades = 0, downgrades = 0, renewals = 0, gifts = 0, newVip = 0
  const tierPopularity: Record<string, number> = {}
  for (const g of grants30) {
    tierPopularity[g.tierKey] = (tierPopularity[g.tierKey] ?? 0) + 1
    if (g.source === 'gift') gifts++
    const prev = rankOf.get((g.previousTier || 'basic').toLowerCase()) ?? 0
    const next = rankOf.get(g.tierKey) ?? 0
    if (next > prev) { upgrades++; if (prev === 0) newVip++ }
    else if (next < prev) downgrades++
    else renewals++
  }

  const mostUpgradedTier = Object.entries(tierPopularity).sort((a, b) => b[1] - a[1])[0] ?? null

  // Süresi yaklaşanlar
  const [exp3, exp7, exp30] = await Promise.all([
    membershipsExpiringWithin(3, 100),
    membershipsExpiringWithin(7, 200),
    membershipsExpiringWithin(30, 500),
  ])

  // En çok kullanılan VIP gizlilik özellikleri
  const prefUsage = {
    hideVipBadge: prefRows.filter((p) => p.hideVipBadge).length,
    hideOnlineStatus: prefRows.filter((p) => p.hideOnlineStatus).length,
    hideLastSeen: prefRows.filter((p) => p.hideLastSeen).length,
    hideProfileVisit: prefRows.filter((p) => p.hideProfileVisit).length,
    hiddenRoomEntry: prefRows.filter((p) => p.hiddenRoomEntry).length,
    hideVipStatus: prefRows.filter((p) => p.hideVipStatus).length,
    disableEntranceEffects: prefRows.filter((p) => p.disableEntranceEffects).length,
    muteOthersEntrance: prefRows.filter((p) => p.muteOthersEntrance).length,
  }

  const totalGrants30 = grants30.length || 1

  return apiSuccess({
    generatedAt: now.toISOString(),
    summary: {
      activeVip,
      expiredPending: expiredNow,
      grantsLast24h: grantsToday,
      grantsLast30d: grants30.length,
      profileVisitsTotal: visitTotal,
    },
    distribution,
    lifecycle: {
      upgrades,
      downgrades,
      renewals,
      gifts,
      newVip,
      upgradeRate: Math.round((upgrades / totalGrants30) * 1000) / 10,
      downgradeRate: Math.round((downgrades / totalGrants30) * 1000) / 10,
      retentionRate: Math.round((renewals / totalGrants30) * 1000) / 10,
      mostUpgradedTier: mostUpgradedTier ? { tierKey: mostUpgradedTier[0], count: mostUpgradedTier[1] } : null,
    },
    expiring: {
      in3Days: exp3.length,
      in7Days: exp7.length,
      in30Days: exp30.length,
      list: exp7.slice(0, 50),
    },
    featureUsage: prefUsage,
  })
}
