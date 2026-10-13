/**
 * BÖLÜM 20 — Admin: üyelik kademeleri (§1, §2, §14).
 * Yeni kademe eklemek kod değişikliği gerektirmez.
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { apiSuccess, apiError, ErrorCodes } from '@/lib/api-response'
import { requireSuperAdmin } from '@/lib/rbac'
import { recordAudit } from '@/lib/audit-log'
import { invalidateVipCatalog } from '@/lib/vip-entitlements'
import { apiLimiter } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

const KEY_RE = /^[a-z][a-z0-9_]{1,29}$/

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const tiers = await prisma.membershipTierDef.findMany({ orderBy: { rank: 'asc' }, take: 100 })
  const counts = await prisma.user.groupBy({ by: ['membership'], _count: { _all: true } })
  const countMap: Record<string, number> = {}
  for (const c of counts) countMap[(c.membership || 'basic').toLowerCase()] = c._count._all

  return apiSuccess({
    tiers: tiers.map((t) => ({ ...t, userCount: countMap[t.key] ?? 0 })),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as { user: { id: string; role: string } }).user

  const { success: rlOk } = apiLimiter.check(`mtier-post:${user.id}`)
  if (!rlOk) return apiError(ErrorCodes.RATE_LIMITED, 'Çok fazla istek', 429)

  let body: any
  try { body = await req.json() } catch { return apiError(ErrorCodes.VALIDATION_ERROR, 'Geçersiz gövde', 400) }

  const key = String(body?.key || '').trim().toLowerCase()
  if (!KEY_RE.test(key)) return apiError(ErrorCodes.VALIDATION_ERROR, 'Geçersiz kademe anahtarı (a-z, 0-9, _)', 400)
  const name = String(body?.name || '').trim()
  if (!name) return apiError(ErrorCodes.VALIDATION_ERROR, 'Kademe adı zorunludur', 400)

  const exists = await prisma.membershipTierDef.findUnique({ where: { key } })
  if (exists) return apiError('CONFLICT', 'Bu anahtar zaten kullanılıyor', 409)

  const created = await prisma.membershipTierDef.create({
    data: {
      key,
      name,
      nameEn: String(body?.nameEn || name),
      rank: Number.isFinite(body?.rank) ? Math.trunc(body.rank) : 0,
      color: String(body?.color || '#9ca3af'),
      gradient: body?.gradient ? String(body.gradient) : null,
      icon: String(body?.icon || '⭐'),
      badgeUrl: body?.badgeUrl ? String(body.badgeUrl) : null,
      frameUrl: body?.frameUrl ? String(body.frameUrl) : null,
      description: body?.description ? String(body.description) : null,
      discoveryWeight: Number.isFinite(body?.discoveryWeight) ? Number(body.discoveryWeight) : 1.0,
      isActive: body?.isActive !== false,
      sortOrder: Number.isFinite(body?.sortOrder) ? Math.trunc(body.sortOrder) : 0,
    },
  })

  invalidateVipCatalog()
  await recordAudit({
    actorId: user.id, actorRole: user.role, action: 'membership_tier_create',
    targetType: 'MembershipTierDef', targetId: created.id, after: created as any,
  })

  return apiSuccess({ tier: created }, 201)
}

export async function PUT(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as { user: { id: string; role: string } }).user

  const { success: rlOk } = apiLimiter.check(`mtier-put:${user.id}`)
  if (!rlOk) return apiError(ErrorCodes.RATE_LIMITED, 'Çok fazla istek', 429)

  let body: any
  try { body = await req.json() } catch { return apiError(ErrorCodes.VALIDATION_ERROR, 'Geçersiz gövde', 400) }

  const key = String(body?.key || '').trim().toLowerCase()
  if (!key) return apiError(ErrorCodes.VALIDATION_ERROR, 'key zorunludur', 400)

  const before = await prisma.membershipTierDef.findUnique({ where: { key } })
  if (!before) return apiError(ErrorCodes.NOT_FOUND, 'Kademe bulunamadı', 404)

  const data: any = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.nameEn === 'string') data.nameEn = body.nameEn
  if (Number.isFinite(body.rank)) data.rank = Math.trunc(body.rank)
  if (typeof body.color === 'string') data.color = body.color
  if (body.gradient !== undefined) data.gradient = body.gradient ? String(body.gradient) : null
  if (typeof body.icon === 'string') data.icon = body.icon
  if (body.badgeUrl !== undefined) data.badgeUrl = body.badgeUrl ? String(body.badgeUrl) : null
  if (body.frameUrl !== undefined) data.frameUrl = body.frameUrl ? String(body.frameUrl) : null
  if (body.description !== undefined) data.description = body.description ? String(body.description) : null
  if (Number.isFinite(body.discoveryWeight)) {
    const w = Number(body.discoveryWeight)
    if (w < 0.1 || w > 5) return apiError(ErrorCodes.VALIDATION_ERROR, 'Keşfet ağırlığı 0.1 – 5.0 aralığında olmalı', 400)
    data.discoveryWeight = w
  }
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive
  if (Number.isFinite(body.sortOrder)) data.sortOrder = Math.trunc(body.sortOrder)

  if (!Object.keys(data).length) return apiError(ErrorCodes.VALIDATION_ERROR, 'Güncellenecek alan yok', 400)

  const updated = await prisma.membershipTierDef.update({ where: { key }, data })
  invalidateVipCatalog()
  await recordAudit({
    actorId: user.id, actorRole: user.role, action: 'membership_tier_update',
    targetType: 'MembershipTierDef', targetId: updated.id, before: before as any, after: updated as any,
  })

  return apiSuccess({ tier: updated })
}

/** Kademe silmek yerine pasifleştirmek esastır; silme yalnız kullanıcısız kademeler için. */
export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as { user: { id: string; role: string } }).user

  const url = new URL(req.url)
  const key = (url.searchParams.get('key') || '').trim().toLowerCase()
  const confirm = url.searchParams.get('confirm')
  if (!key) return apiError(ErrorCodes.VALIDATION_ERROR, 'key zorunludur', 400)
  if (confirm !== 'DELETE') return apiError(ErrorCodes.VALIDATION_ERROR, 'confirm=DELETE gerekli', 400)
  if (key === 'basic') return apiError(ErrorCodes.FORBIDDEN, 'Temel kademe silinemez', 403)

  const inUse = await prisma.user.count({ where: { membership: key } })
  if (inUse > 0) {
    return apiError('CONFLICT', `Bu kademede ${inUse} kullanıcı var. Önce pasifleştirin.`, 409, { userCount: inUse })
  }

  const before = await prisma.membershipTierDef.findUnique({ where: { key } })
  if (!before) return apiError(ErrorCodes.NOT_FOUND, 'Kademe bulunamadı', 404)

  await prisma.membershipTierDef.delete({ where: { key } })
  invalidateVipCatalog()
  await recordAudit({
    actorId: user.id, actorRole: user.role, action: 'membership_tier_delete',
    targetType: 'MembershipTierDef', targetId: before.id, before: before as any,
  })

  return apiSuccess({ deleted: true, key })
}
