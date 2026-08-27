export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCached } from '@/lib/cache'

/**
 * GET /api/config
 * 
 * Public endpoint: feature flags + remote config tek yanıtta.
 * Mobil ve web client'lar açılışta bu ucu çağırır.
 * 
 * Query params:
 *   ?platform=ios|android|web|mobile  (opsiyonel, filtre)
 * 
 * Yanıt 60sn cache'lenir.
 */
export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get('platform') || 'all'

  const data = await getCached('config:public:' + platform, 60, async () => {
    const [flags, configs] = await Promise.all([
      prisma.featureFlag.findMany({
        where: {
          OR: [
            { platform: 'all' },
            { platform },
          ],
        },
        select: {
          key: true,
          enabled: true,
          percentage: true,
          metadata: true,
        },
        orderBy: { key: 'asc' },
      }),
      prisma.remoteConfig.findMany({
        where: {
          OR: [
            { platform: 'all' },
            { platform },
          ],
        },
        select: {
          key: true,
          value: true,
          valueType: true,
          group: true,
        },
        orderBy: { key: 'asc' },
      }),
    ])

    // Feature flags: { key: enabled } basit harita + detaylı dizi
    const featureFlags: Record<string, boolean> = {}
    for (const f of flags) {
      featureFlags[f.key] = f.enabled && f.percentage >= 100
    }

    // Remote config: gruplara göre
    const remoteConfig: Record<string, any> = {}
    for (const c of configs) {
      if (!remoteConfig[c.group]) remoteConfig[c.group] = {}
      remoteConfig[c.group][c.key] = c.value
    }

    return {
      featureFlags,
      featureFlagsDetailed: flags,
      remoteConfig,
    }
  })

  return NextResponse.json(
    { success: true, data, request_id: req.headers.get('x-request-id') || null },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    }
  )
}
