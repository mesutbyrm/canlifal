export const dynamic = 'force-dynamic'

/**
 * Faz 15 — GET /api/admin/rtc-telemetry (§74 + §76)
 *
 * Admin için WebRTC kalite telemetrisi: sayfalanmış kayıt listesi + zaman
 * penceresi özeti (ortalama RTT/kayıp/jitter/bitrate, seviye dağılımı).
 * Tamamen yeni bir uçtur.
 */

import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser, isAdminRole } from '@/lib/rbac'
import { apiSuccess, apiError, apiForbidden, apiUnauthorized } from '@/lib/api-response'
import { getRtcTelemetry, getRtcTelemetrySummary } from '@/lib/rtc-telemetry'

export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()
    if (!isAdminRole(user.role)) return apiForbidden()

    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const hours = parseInt(url.searchParams.get('hours') || '24')
    const context = url.searchParams.get('context') || undefined
    const contextId = url.searchParams.get('contextId') || undefined
    const userId = url.searchParams.get('userId') || undefined
    const qualityLevel = url.searchParams.get('level') || undefined
    const platform = url.searchParams.get('platform') || undefined

    const [listed, summary] = await Promise.all([
      getRtcTelemetry({
        page,
        limit,
        hours,
        context,
        contextId,
        userId,
        qualityLevel,
        platform,
      }),
      getRtcTelemetrySummary(hours, { context, platform }),
    ])

    // Kullanıcı adlarını tek sorguda zenginleştir
    const userIds = Array.from(new Set(listed.items.map((i) => i.userId)))
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, username: true },
        })
      : []
    const userMap = new Map(users.map((u) => [u.id, u]))
    const enriched = listed.items.map((i) => ({ ...i, user: userMap.get(i.userId) || null }))

    return apiSuccess({
      items: enriched,
      summary,
      meta: {
        page: listed.page,
        limit: listed.limit,
        total: listed.total,
        hasMore: listed.page * listed.limit < listed.total,
      },
    })
  } catch (e) {
    console.error('[AdminRtcTelemetry] GET error:', e)
    return apiError('INTERNAL_ERROR', 'Telemetri verileri alınamadı', 500)
  }
}
