import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser, isAdminRole } from '@/lib/rbac'
import { apiSuccess, apiError, apiForbidden, apiUnauthorized, apiValidation } from '@/lib/api-response'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

/**
 * F5 - Admin "Premium Entrance Users" yonetimi (spec 23).
 * Admin: kullanici sec, premium giris ac/kapat, Gold zorunlu, ozel efekt, sure, animasyon tipi.
 *
 * GET  /api/admin/premium-entrance?search=&page=&limit=  -> premium giris acik kullanicilar (+arama)
 * POST /api/admin/premium-entrance { action: 'set' | 'disable', ... }
 */

export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()
    if (!isAdminRole(user.role)) return apiForbidden()

    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').trim()
    const onlyEnabled = searchParams.get('enabled') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const where: Record<string, unknown> = {}
    if (onlyEnabled) where.premiumEntranceEnabled = true
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: [{ premiumEntranceEnabled: 'desc' }, { lastActiveAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          image: true,
          membership: true,
          membershipExpiresAt: true,
          premiumEntranceEnabled: true,
          premiumEntranceRequireGold: true,
          premiumEntranceEffectId: true,
          premiumEntranceDurationMs: true,
          premiumEntranceAnimationType: true,
          lastOnlineEventAt: true,
        },
      }),
    ])

    // Secilebilir efektler (Gold tier entrance efektleri).
    const effects = await prisma.entranceEffect.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, assetUrl: true, assetType: true, tier: true, durationMs: true },
    })

    return apiSuccess({
      users,
      effects,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('[admin/premium-entrance GET]', err)
    return apiError('INTERNAL_ERROR', 'Premium giris kullanicilari getirilemedi', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await resolveUser(req)
    if (!admin) return apiUnauthorized()
    if (!isAdminRole(admin.role)) return apiForbidden()

    const body = await req.json().catch(() => ({}))
    const action = body.action as string
    const userId = body.userId as string
    if (!userId) return apiValidation('userId gerekli')

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        premiumEntranceEnabled: true,
        premiumEntranceRequireGold: true,
        premiumEntranceEffectId: true,
        premiumEntranceDurationMs: true,
        premiumEntranceAnimationType: true,
      },
    })
    if (!target) return apiValidation('Kullanici bulunamadi')

    if (action === 'disable') {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { premiumEntranceEnabled: false },
        select: {
          id: true, premiumEntranceEnabled: true, premiumEntranceRequireGold: true,
          premiumEntranceEffectId: true, premiumEntranceDurationMs: true, premiumEntranceAnimationType: true,
        },
      })
      await recordAudit({
        actorId: admin.id, actorRole: admin.role, action: 'premium_entrance.disable',
        targetType: 'user', targetId: userId, before: target, after: updated,
        ip: getAuditIp(req),
      })
      return apiSuccess(updated)
    }

    if (action === 'set') {
      const data: Record<string, unknown> = {}
      if (typeof body.enabled === 'boolean') data.premiumEntranceEnabled = body.enabled
      if (typeof body.requireGold === 'boolean') data.premiumEntranceRequireGold = body.requireGold
      if ('effectId' in body) data.premiumEntranceEffectId = body.effectId || null
      if ('durationMs' in body) {
        const d = body.durationMs
        data.premiumEntranceDurationMs = d === null || d === '' ? null : Math.max(1000, Math.min(15000, parseInt(String(d), 10) || 4000))
      }
      if ('animationType' in body) {
        const t = String(body.animationType || '')
        data.premiumEntranceAnimationType = ['slide_lr', 'fade', 'zoom'].includes(t) ? t : null
      }

      // Efekt id verildiyse gecerliligini dogrula.
      if (data.premiumEntranceEffectId) {
        const eff = await prisma.entranceEffect.findUnique({ where: { id: data.premiumEntranceEffectId as string }, select: { id: true } })
        if (!eff) return apiValidation('Gecersiz efekt id')
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true, premiumEntranceEnabled: true, premiumEntranceRequireGold: true,
          premiumEntranceEffectId: true, premiumEntranceDurationMs: true, premiumEntranceAnimationType: true,
        },
      })
      await recordAudit({
        actorId: admin.id, actorRole: admin.role, action: 'premium_entrance.set',
        targetType: 'user', targetId: userId, before: target, after: updated,
        ip: getAuditIp(req),
      })
      return apiSuccess(updated)
    }

    return apiValidation('Gecersiz action (set | disable)')
  } catch (err) {
    console.error('[admin/premium-entrance POST]', err)
    return apiError('INTERNAL_ERROR', 'Premium giris ayari guncellenemedi', 500)
  }
}
