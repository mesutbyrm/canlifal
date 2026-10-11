export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/system-stats
 *
 * §74 Observability — Üretim izleme metrikleri.
 * Admin rolü gerekli.
 *
 * Döndürdüğü veriler:
 * - Aktif odalar, canlı yayınlar, PK oturumları
 * - Son 1 saatteki hediye hataları, cüzdan hataları
 * - Son 1 saatteki API hata sayıları (risk events)
 * - Veritabanı gecikme testi
 * - Bildirim kuyruğu özeti
 * - WebRTC telemetri özeti (son 1 saat)
 */

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response'
import { resolveUser, isAdminRole } from '@/lib/rbac'
import prisma from '@/lib/db'
import { getRtcTelemetrySummary } from '@/lib/rtc-telemetry'

export async function GET(request: NextRequest) {
  // Auth
  const user = await resolveUser(request)
  if (!user) return apiUnauthorized()
  if (!isAdminRole(user.role)) {
    return apiError('FORBIDDEN', 'Yönetici yetkisi gerekli', 403)
  }

  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  try {
    // Paralel sorgular
    const [
      dbLatency,
      activeRooms,
      activeLiveStreams,
      activePkSessions,
      activeVideoStreams,
      recentRiskEvents,
      recentAuditLogs,
      totalUsers,
      onlineUsers,
      rtcSummary,
    ] = await Promise.all([
      // DB latency
      (async () => {
        const s = Date.now()
        await prisma.$queryRaw`SELECT 1`
        return Date.now() - s
      })(),

      // Aktif sesli sohbet odaları
      prisma.chatRoom.count({ where: { isActive: true } }).catch(() => null),

      // Aktif canlı falcı oturumları
      prisma.liveSession.count({ where: { status: 'active' } }).catch(() => null),

      // Aktif PK oturumları
      prisma.pKBattle.count({ where: { status: 'active' } }).catch(() => null),

      // Aktif video yayınları
      prisma.videoStream.count({ where: { status: 'live' } }).catch(() => null),

      // Son 1 saatteki risk olayları
      prisma.riskEvent.count({ where: { createdAt: { gte: oneHourAgo } } }).catch(() => null),

      // Son 1 saatteki denetim kayıtları
      prisma.auditLog.count({ where: { createdAt: { gte: oneHourAgo } } }).catch(() => null),

      // Toplam kullanıcı
      prisma.user.count().catch(() => null),

      // Son 5 dakikada aktif olan kullanıcılar
      prisma.user.count({
        where: { lastActiveAt: { gte: new Date(now.getTime() - 5 * 60 * 1000) } },
      }).catch(() => null),

      // WebRTC telemetri özeti (son 1 saat)
      getRtcTelemetrySummary(1).catch(() => null),
    ])

    return apiSuccess({
      timestamp: now.toISOString(),
      uptime: process.uptime(),
      dbLatencyMs: dbLatency,
      users: {
        total: totalUsers,
        online: onlineUsers,
      },
      realtime: {
        activeRooms,
        activeLiveStreams,
        activePkSessions,
        activeVideoStreams,
      },
      activity: {
        riskEventsLastHour: recentRiskEvents,
        auditLogsLastHour: recentAuditLogs,
      },
      rtcTelemetry: rtcSummary,
    })
  } catch (err: any) {
    console.error('[SystemStats]', err)
    return apiError('INTERNAL_ERROR', 'Sistem istatistikleri alınamadı', 500)
  }
}
