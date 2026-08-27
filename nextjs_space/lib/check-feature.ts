/**
 * Feature flag kontrol yardımcısı.
 *
 * Kullanım:
 *   import { isFeatureEnabled, requireFeature } from '@/lib/check-feature'
 *
 *   // Kontrol (boolean döner)
 *   if (await isFeatureEnabled('GIFTS_ENABLED')) { ... }
 *
 *   // Guard (kapalıysa 403 yanıtı döner, açıksa null döner)
 *   const blocked = await requireFeature('PK_ENABLED')
 *   if (blocked) return blocked  // NextResponse 403
 */

import { NextResponse } from 'next/server'
import { getCached } from '@/lib/cache'
import prisma from '@/lib/db'
import { ErrorCodes, apiError } from '@/lib/api-response'

// Cache TTL: 30 saniye — admin bayrağı değiştirince max 30sn içinde etkili olur
const FLAG_CACHE_TTL = 30

/**
 * Bir özellik bayrağının açık olup olmadığını kontrol eder.
 * Bayrak DB'de yoksa varsayılan olarak açık kabul edilir (çalışan özellikleri bozmamak için).
 */
export async function isFeatureEnabled(
  key: string,
  platform: string = 'all'
): Promise<boolean> {
  const flag = await getCached(`feature:${key}`, FLAG_CACHE_TTL, async () => {
    return prisma.featureFlag.findUnique({
      where: { key },
      select: { enabled: true, platform: true, percentage: true },
    })
  })

  // Bayrak DB'de yoksa → özellik açık (geriye dönük uyumluluk)
  if (!flag) return true

  // Platform filtresi
  if (flag.platform !== 'all' && flag.platform !== platform) return true

  // Kademeli açma (percentage < 100 ise rastgele kontrol)
  if (flag.enabled && flag.percentage < 100) {
    return Math.random() * 100 < flag.percentage
  }

  return flag.enabled
}

/**
 * Özellik açık değilse 403 FEATURE_DISABLED yanıtı döner.
 * Açıksa null döner — route devam edebilir.
 *
 * Kullanım:
 *   const blocked = await requireFeature('GIFTS_ENABLED')
 *   if (blocked) return blocked
 */
export async function requireFeature(
  key: string,
  platform: string = 'all'
): Promise<NextResponse | null> {
  const enabled = await isFeatureEnabled(key, platform)
  if (!enabled) {
    return apiError(
      ErrorCodes.FEATURE_DISABLED,
      `Bu özellik şu an kapalı (${key})`,
      403
    )
  }
  return null
}

/**
 * Birden fazla bayrağı toplu kontrol (admin dashboard, config endpoint için).
 */
export async function getFeatureFlags(
  platform: string = 'all'
): Promise<Record<string, boolean>> {
  const flags = await getCached(`features:all:${platform}`, FLAG_CACHE_TTL, async () => {
    return prisma.featureFlag.findMany({
      where: {
        OR: [{ platform: 'all' }, { platform }],
      },
      select: { key: true, enabled: true, percentage: true },
    })
  })

  const result: Record<string, boolean> = {}
  for (const f of flags) {
    result[f.key] = f.enabled && f.percentage >= 100
  }
  return result
}
