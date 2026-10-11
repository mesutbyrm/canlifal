import { NextResponse } from 'next/server'
import { getCached, CACHE_TTL } from '@/lib/cache'
import { withPerfHeaders, checkETag } from '@/lib/perf'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: List active membership plans for users (cached 10min)
export async function GET(request: Request) {
  const t0 = Date.now()
  try {
    const plans = await getCached('memberships:plans', CACHE_TTL.MEMBERSHIPS, () =>
      prisma.membershipPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      })
    )
    const cached = checkETag(request, plans)
    if (cached) return cached
    return withPerfHeaders(plans, { maxAge: 600, staleWhileRevalidate: 86400, etag: true, requestStart: t0 })
  } catch (error) {
    console.error('Error fetching membership plans:', error)
    return NextResponse.json([], { status: 500 })
  }
}
