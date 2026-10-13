/**
 * BÖLÜM 20 — Admin: yetenek kataloğu + kademe×yetenek matrisi (§1, §2).
 * Buradaki her değişiklik APK güncellemesi olmadan hem web'e hem mobile yansır.
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { apiSuccess, apiError, ErrorCodes } from '@/lib/api-response'
import { requireSuperAdmin } from '@/lib/rbac'
import { recordAudit } from '@/lib/audit-log'
import { invalidateVipCatalog, getTiers, resolveTierFeatures } from '@/lib/vip-entitlements'
import { apiLimiter } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

const FEATURE_KEY_RE = /^[a-z][a-z0-9_.]{2,63}$/

function intOrNull(v: any): number | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return Math.trunc(n)
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const [features, rows, tiers] = await Promise.all([
    prisma.membershipFeature.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }], take: 500 }),
    prisma.membershipTierFeature.findMany({ take: 5000 }),
    getTiers(),
  ])

  // Kalıtımla hesaplanan etkin değerler (admin'e "neyin nereden geldiği" gösterilir)
  const effective: Record<string, Record<string, any>> = {}
  for (const t of tiers) effective[t.key] = await resolveTierFeatures(t.key)

  return apiSuccess({
    tiers,
    features,
    rows,
    effective,
    categories: Array.from(new Set(features.map((f) => f.category))),
  })
}

/** Yeni yetenek tanımı ekler. */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as { user: { id: string; role: string } }).user

  const { success: rlOk } = apiLimiter.check(`mfeat-post:${user.id}`)
  if (!rlOk) return apiError(ErrorCodes.RATE_LIMITED, 'Çok fazla istek', 429)

  let body: any
  try { body = await req.json() } catch { return apiError(ErrorCodes.VALIDATION_ERROR, 'Geçersiz gövde', 400) }

  const key = String(body?.key || '').trim().toLowerCase()
  if (!FEATURE_KEY_RE.test(key)) return apiError(ErrorCodes.VALIDATION_ERROR, 'Geçersiz yetenek anahtarı (örn. vip.profile_frame)', 400)
  const name = String(body?.name || '').trim()
  if (!name) return apiError(ErrorCodes.VALIDATION_ERROR, 'Ad zorunludur', 400)

  const exists = await prisma.membershipFeature.findUnique({ where: { key } })
  if (exists) return apiError('CONFLICT', 'Bu yetenek zaten tanımlı', 409)

  const created = await prisma.membershipFeature.create({
    data: {
      key,
      name,
      nameEn: String(body?.nameEn || name),
      category: String(body?.category || 'general'),
      description: body?.description ? String(body.description) : null,
      valueType: ['boolean', 'number', 'string', 'asset', 'enum'].includes(body?.valueType) ? body.valueType : 'boolean',
      unit: body?.unit ? String(body.unit) : null,
      options: body?.options ?? undefined,
      isActive: body?.isActive !== false,
      sortOrder: Number.isFinite(body?.sortOrder) ? Math.trunc(body.sortOrder) : 0,
    },
  })

  invalidateVipCatalog()
  await recordAudit({
    actorId: user.id, actorRole: user.role, action: 'membership_feature_create',
    targetType: 'MembershipFeature', targetId: created.id, after: created as any,
  })
  return apiSuccess({ feature: created }, 201)
}

/**
 * Güncelleme.
 *  - `feature` gönderilirse yetenek tanımı güncellenir.
 *  - `cells` gönderilirse kademe×yetenek hücreleri toplu upsert edilir.
 */
export async function PUT(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as { user: { id: string; role: string } }).user

  const { success: rlOk } = apiLimiter.check(`mfeat-put:${user.id}`)
  if (!rlOk) return apiError(ErrorCodes.RATE_LIMITED, 'Çok fazla istek', 429)

  let body: any
  try { body = await req.json() } catch { return apiError(ErrorCodes.VALIDATION_ERROR, 'Geçersiz gövde', 400) }

  const result: any = {}

  if (body?.feature && typeof body.feature.key === 'string') {
    const key = body.feature.key.trim().toLowerCase()
    const before = await prisma.membershipFeature.findUnique({ where: { key } })
    if (!before) return apiError(ErrorCodes.NOT_FOUND, 'Yetenek bulunamadı', 404)
    const f = body.feature
    const data: any = {}
    if (typeof f.name === 'string' && f.name.trim()) data.name = f.name.trim()
    if (typeof f.nameEn === 'string') data.nameEn = f.nameEn
    if (typeof f.category === 'string') data.category = f.category
    if (f.description !== undefined) data.description = f.description ? String(f.description) : null
    if (['boolean', 'number', 'string', 'asset', 'enum'].includes(f.valueType)) data.valueType = f.valueType
    if (f.unit !== undefined) data.unit = f.unit ? String(f.unit) : null
    if (f.options !== undefined) data.options = f.options
    if (typeof f.isActive === 'boolean') data.isActive = f.isActive
    if (Number.isFinite(f.sortOrder)) data.sortOrder = Math.trunc(f.sortOrder)
    if (Object.keys(data).length) {
      result.feature = await prisma.membershipFeature.update({ where: { key }, data })
      await recordAudit({
        actorId: user.id, actorRole: user.role, action: 'membership_feature_update',
        targetType: 'MembershipFeature', targetId: before.id, before: before as any, after: result.feature,
      })
    }
  }

  const cells = Array.isArray(body?.cells) ? body.cells : []
  if (cells.length) {
    if (cells.length > 500) return apiError(ErrorCodes.VALIDATION_ERROR, 'Tek seferde en fazla 500 hücre', 400)

    const [tierKeys, featureKeys] = await Promise.all([
      prisma.membershipTierDef.findMany({ select: { key: true }, take: 100 }).then((r) => new Set(r.map((x) => x.key))),
      prisma.membershipFeature.findMany({ select: { key: true }, take: 500 }).then((r) => new Set(r.map((x) => x.key))),
    ])

    const saved: any[] = []
    const skipped: any[] = []
    for (const c of cells) {
      const tierKey = String(c?.tierKey || '').trim().toLowerCase()
      const featureKey = String(c?.featureKey || '').trim().toLowerCase()
      if (!tierKeys.has(tierKey) || !featureKeys.has(featureKey)) {
        skipped.push({ tierKey, featureKey, reason: 'unknown_key' })
        continue
      }
      const payload: any = {
        enabled: typeof c.enabled === 'boolean' ? c.enabled : false,
        priority: Number.isFinite(c.priority) ? Math.trunc(c.priority) : 0,
        updatedBy: user.id,
      }
      const lv = intOrNull(c.limitValue); if (lv !== undefined) payload.limitValue = lv
      const dl = intOrNull(c.dailyLimit); if (dl !== undefined) payload.dailyLimit = dl
      const ml = intOrNull(c.monthlyLimit); if (ml !== undefined) payload.monthlyLimit = ml
      const dd = intOrNull(c.durationDays); if (dd !== undefined) payload.durationDays = dd
      if (c.assetRef !== undefined) payload.assetRef = c.assetRef ? String(c.assetRef) : null
      if (c.defaultValue !== undefined) payload.defaultValue = c.defaultValue
      if (c.metadata !== undefined) payload.metadata = c.metadata

      const row = await prisma.membershipTierFeature.upsert({
        where: { tierKey_featureKey: { tierKey, featureKey } },
        create: { tierKey, featureKey, ...payload },
        update: payload,
      })
      saved.push(row)
    }
    result.cells = saved
    result.skipped = skipped
    await recordAudit({
      actorId: user.id, actorRole: user.role, action: 'membership_matrix_update',
      targetType: 'MembershipTierFeature',
      description: `${saved.length} hücre güncellendi`,
      metadata: { saved: saved.length, skipped: skipped.length },
    })
  }

  if (!result.feature && !result.cells) {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'Güncellenecek veri gönderilmedi', 400)
  }

  invalidateVipCatalog()
  return apiSuccess(result)
}

/** Yetenek tanımını veya tek bir matris hücresini siler. */
export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as { user: { id: string; role: string } }).user

  const url = new URL(req.url)
  const featureKey = (url.searchParams.get('featureKey') || '').trim().toLowerCase()
  const tierKey = (url.searchParams.get('tierKey') || '').trim().toLowerCase()
  const confirm = url.searchParams.get('confirm')
  if (!featureKey) return apiError(ErrorCodes.VALIDATION_ERROR, 'featureKey zorunludur', 400)

  if (tierKey) {
    const row = await prisma.membershipTierFeature.findUnique({
      where: { tierKey_featureKey: { tierKey, featureKey } },
    })
    if (!row) return apiError(ErrorCodes.NOT_FOUND, 'Hücre bulunamadı', 404)
    await prisma.membershipTierFeature.delete({ where: { id: row.id } })
    invalidateVipCatalog()
    await recordAudit({
      actorId: user.id, actorRole: user.role, action: 'membership_matrix_delete',
      targetType: 'MembershipTierFeature', targetId: row.id, before: row as any,
    })
    return apiSuccess({ deleted: true, tierKey, featureKey })
  }

  if (confirm !== 'DELETE') return apiError(ErrorCodes.VALIDATION_ERROR, 'confirm=DELETE gerekli', 400)
  const before = await prisma.membershipFeature.findUnique({ where: { key: featureKey } })
  if (!before) return apiError(ErrorCodes.NOT_FOUND, 'Yetenek bulunamadı', 404)
  await prisma.membershipFeature.delete({ where: { key: featureKey } })
  invalidateVipCatalog()
  await recordAudit({
    actorId: user.id, actorRole: user.role, action: 'membership_feature_delete',
    targetType: 'MembershipFeature', targetId: before.id, before: before as any,
  })
  return apiSuccess({ deleted: true, featureKey })
}
