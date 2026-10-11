export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/membership/plans
 * Tekil (singular) üyelik planı listesi — İKINCI backend ile aynı payload.
 * Çoğul `/api/memberships/packages` ile aynı tabloyu kullanır.
 */
export async function GET() {
  try {
    const plans = await prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }]
    })
    return NextResponse.json({ plans })
  } catch (e) {
    console.error('membership/plans error:', e)
    return NextResponse.json({ error: 'Üyelik planları alınamadı' }, { status: 500 })
  }
}
