export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAnimationAdmin } from '@/lib/animation-admin'

function db(): any {
  return prisma as any
}

// GET /api/admin/animations/stats -> dashboard sayaclari
export async function GET() {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response

  try {
    const [total, active, inactive, byCategory, assignments, membershipDefaults] = await Promise.all([
      db().animation.count(),
      db().animation.count({ where: { status: 'active' } }),
      db().animation.count({ where: { status: { not: 'active' } } }),
      db().animation.groupBy({ by: ['category'], _count: { _all: true } }),
      db().animationAssignment.count({ where: { isActive: true } }),
      db().animationMembershipDefault.count({ where: { isActive: true } }),
    ])

    const categories: Record<string, number> = {}
    for (const row of byCategory as any[]) {
      categories[row.category] = row._count?._all ?? 0
    }

    return NextResponse.json({
      total,
      active,
      inactive,
      assignments,
      membershipDefaults,
      categories,
      entrance: categories.entrance || 0,
      exit: categories.exit || 0,
      seat: categories.seat || 0,
      vip: categories.vip || 0,
      profileFrame: categories.profile_frame || 0,
      gift: categories.gift || 0,
    })
  } catch (e) {
    console.error('[admin animations stats]', e)
    return NextResponse.json({ error: 'İstatistikler yüklenemedi' }, { status: 500 })
  }
}
