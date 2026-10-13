import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdAdmin, DEFAULT_AD_PLACEMENTS } from '@/lib/ad-placements'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdAdmin()
  if (!auth.ok) return auth.response

  try {
    const [total, active, byType, totals, networks, existingKeys] = await Promise.all([
      prisma.adPlacement.count(),
      prisma.adPlacement.count({ where: { isActive: true } }),
      prisma.adPlacement.groupBy({ by: ['adType'], _count: { _all: true } }),
      prisma.adPlacement.aggregate({ _sum: { impressions: true, clicks: true } }),
      prisma.adNetwork.count({ where: { isActive: true } }),
      prisma.adPlacement.findMany({ select: { placementKey: true } }),
    ])

    const have = new Set(existingKeys.map((p: { placementKey: string }) => p.placementKey))
    const missingDefaults = DEFAULT_AD_PLACEMENTS.filter((d) => !have.has(d.placementKey)).length

    const impressions = totals._sum.impressions || 0
    const clicks = totals._sum.clicks || 0

    return NextResponse.json({
      total,
      active,
      inactive: total - active,
      activeNetworks: networks,
      missingDefaults,
      impressions,
      clicks,
      ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      byType: byType.map((r: any) => ({ adType: r.adType, count: r._count._all })),
    })
  } catch (error) {
    console.error('Ad placement stats error:', error)
    return NextResponse.json({ error: 'İstatistikler yüklenemedi' }, { status: 500 })
  }
}
