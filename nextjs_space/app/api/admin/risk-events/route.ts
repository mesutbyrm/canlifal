export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser, isAdminRole } from '@/lib/rbac'
import { apiPaginated, apiError, apiForbidden, apiUnauthorized } from '@/lib/api-response'
import { getRiskEvents } from '@/lib/risk-score'

// GET /api/admin/risk-events — sayfalanmış risk olay listesi + özet
export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()
    if (!isAdminRole(user.role)) return apiForbidden()

    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const level = url.searchParams.get('level') || undefined
    const category = url.searchParams.get('category') || undefined
    const userId = url.searchParams.get('userId') || undefined
    const reviewedParam = url.searchParams.get('reviewed')
    const reviewed =
      reviewedParam === 'true' ? true : reviewedParam === 'false' ? false : undefined

    const { items, total } = await getRiskEvents({
      page,
      limit,
      level,
      category,
      userId,
      reviewed,
    })

    // Kullanıcı adlarını tek sorguda zenginleştir
    const userIds = Array.from(new Set(items.map((i) => i.userId)))
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, username: true, email: true },
        })
      : []
    const userMap = new Map(users.map((u) => [u.id, u]))

    const enriched = items.map((i) => ({ ...i, user: userMap.get(i.userId) || null }))

    return apiPaginated(enriched, {
      page,
      limit,
      total,
      hasMore: page * limit < total,
    })
  } catch (e) {
    console.error('[AdminRiskEvents] GET error:', e)
    return apiError('INTERNAL_ERROR', 'Risk olayları alınamadı', 500)
  }
}
