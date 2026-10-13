export const dynamic = 'force-dynamic'

/**
 * GET /api/health (ve /api/v1/health)
 *
 * Basit sağlık kontrolü. Dış izleme servisleri (UptimeRobot, load balancer,
 * k8s liveness probe vb.) tarafından kullanılır.
 *
 * - DB'ye basit bir sorgu atar (SELECT 1) ve süresini ölçer.
 * - Yanıt gövdesi yeni zarf standardında.
 * - Auth YOK (public).
 */

import { apiSuccess, apiError } from '@/lib/api-response'
import prisma from '@/lib/db'

export async function GET() {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    const dbLatencyMs = Date.now() - start

    return apiSuccess(
      {
        status: 'ok',
        uptime: process.uptime(),
        dbLatencyMs,
        timestamp: new Date().toISOString(),
      },
      200,
      {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    )
  } catch (err: any) {
    const dbLatencyMs = Date.now() - start
    return apiError(
      'SERVICE_UNAVAILABLE',
      'Veritabanı bağlantısı kurulamadı',
      503,
      { dbLatencyMs, error: err?.message?.slice(0, 200) }
    )
  }
}
