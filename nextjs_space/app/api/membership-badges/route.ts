import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCached, CACHE_TTL } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const badges = await getCached('membership:badges', CACHE_TTL.MEMBERSHIPS, async () => {
      return prisma.membershipBadge.findMany({
        where: { isActive: true },
        orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }],
        select: {
          id: true,
          name: true,
          tier: true,
          imageUrl: true,
        },
      })
    })

    return NextResponse.json(badges)
  } catch (error) {
    console.error('Public membership badges fetch error:', error)
    return NextResponse.json([])
  }
}
