import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET /api/supporter-levels?broadcasterId=... — top supporters of a broadcaster
// GET /api/supporter-levels (no param) — the authenticated user's own supporter levels
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const broadcasterId = searchParams.get('broadcasterId')

    if (broadcasterId) {
      const top = await prisma.supporterLevel.findMany({
        where: { broadcasterId },
        orderBy: { totalContributed: 'desc' },
        take: 50,
        select: {
          userId: true, totalContributed: true, level: true,
          levelName: true, lastContributedAt: true,
        },
      })
      return apiSuccess(top)
    }

    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()
    const mine = await prisma.supporterLevel.findMany({
      where: { userId: user.id },
      orderBy: { totalContributed: 'desc' },
      take: 100,
      select: {
        broadcasterId: true, totalContributed: true, level: true,
        levelName: true, lastContributedAt: true,
      },
    })
    return apiSuccess(mine)
  } catch (err) {
    console.error('[supporter-levels GET]', err)
    return apiError('INTERNAL_ERROR', 'Destekçi seviyeleri getirilemedi', 500)
  }
}
