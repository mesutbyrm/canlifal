/**
 * BÖLÜM 20 — Üyelik karşılaştırma matrisi (§27, §28).
 * Herkese açık. Admin panelindeki her değişiklik burada anında yansır.
 * Hücre durumları: available | unlimited | limited | locked
 */
import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/api-response'
import { getTiers, getMatrix, resolveTierFeatures } from '@/lib/vip-entitlements'

export const dynamic = 'force-dynamic'

/** Yüzde (x100) olarak saklanan çarpan alanları — kullanıcıya ×1.10 biçiminde gösterilir. */
const MULTIPLIER_FEATURES = new Set(['vip.discovery_priority', 'vip.xp_multiplier'])

function formatLimit(featureKey: string, limit: number): string {
  if (MULTIPLIER_FEATURES.has(featureKey)) return `×${(limit / 100).toFixed(2)}`
  return String(limit)
}

export async function GET(_req: NextRequest) {
  const [tiers, matrix] = await Promise.all([getTiers(), getMatrix()])

  const perTier: Record<string, Record<string, any>> = {}
  for (const tier of tiers) {
    perTier[tier.key] = await resolveTierFeatures(tier.key)
  }

  const features = matrix.features.map((f) => {
    const cells: Record<string, any> = {}
    for (const tier of tiers) {
      const grant = perTier[tier.key]?.[f.key]
      if (!grant || !grant.enabled) {
        cells[tier.key] = { status: 'locked', display: '🔒', enabled: false }
        continue
      }
      const limit = grant.dailyLimit ?? grant.limit ?? null
      if (f.valueType === 'number' && limit != null) {
        cells[tier.key] = {
          status: 'limited',
          display: formatLimit(f.key, limit),
          enabled: true,
          limit,
          dailyLimit: grant.dailyLimit ?? null,
          monthlyLimit: grant.monthlyLimit ?? null,
        }
      } else if (limit == null && f.valueType === 'number') {
        cells[tier.key] = { status: 'unlimited', display: '∞', enabled: true, limit: null }
      } else {
        cells[tier.key] = {
          status: 'available',
          display: '✓',
          enabled: true,
          assetRef: grant.assetRef ?? null,
          priority: grant.priority ?? 0,
        }
      }
    }
    return {
      key: f.key,
      name: f.name,
      nameEn: f.nameEn,
      category: f.category,
      description: f.description,
      valueType: f.valueType,
      unit: f.unit,
      sortOrder: f.sortOrder,
      cells,
    }
  })

  const categories = Array.from(new Set(features.map((f) => f.category)))

  return apiSuccess({ tiers, categories, features })
}
