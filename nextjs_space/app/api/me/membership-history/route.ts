/**
 * BÖLÜM 20 §19 — Üyelik geçmişi, kalan süre ve otomatik yenileme.
 * GET /api/me/membership-history
 * PUT /api/me/membership-history   { auto_renew: boolean }
 *
 * Jeton/CFC bakiyelerine dokunmaz; yalnızca üyelik kayıtlarını okur/yazar.
 */
import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { apiSuccess, apiError, apiUnauthorized, apiInternalError, ErrorCodes } from '@/lib/api-response'
import { resolveUserId } from '@/lib/vip-guard'
import { getUserEntitlements } from '@/lib/vip-entitlements'
import { apiLimiter } from '@/lib/rate-limiter'
import { recordAudit } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

function daysLeft(expiresAt: Date | null | undefined): number | null {
  if (!expiresAt) return null
  const ms = new Date(expiresAt).getTime() - Date.now()
  return ms <= 0 ? 0 : Math.ceil(ms / 86400000)
}

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return apiUnauthorized()

    const ent = await getUserEntitlements(userId)
    if (!ent) return apiUnauthorized()

    const [grants, purchases] = await Promise.all([
      prisma.membershipGrant.findMany({
        where: { receiverId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true, tierKey: true, previousTier: true, source: true, status: true,
          startsAt: true, expiresAt: true, autoRenew: true, transactionId: true,
          note: true, createdAt: true,
          giver: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.membershipPurchase.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true, priceType: true, pricePaid: true, currency: true,
          startsAt: true, expiresAt: true, status: true, createdAt: true,
          plan: { select: { id: true, name: true } },
        },
      }),
    ])

    const active = grants.find((g) => g.status === 'active') || null

    return apiSuccess({
      current: {
        tier: ent.tier,
        stored_tier: ent.storedTier,
        expires_at: ent.expiresAt,
        is_expired: ent.isExpired,
        days_remaining: ent.daysRemaining ?? daysLeft(ent.expiresAt as any),
        auto_renew: active?.autoRenew ?? false,
        active_grant_id: active?.id ?? null,
        source: active?.source ?? null,
        gifted_by: active?.giver ?? null,
      },
      // §19 yükseltme/düşürme izi — previousTier alanından türetilir
      grants: grants.map((g) => ({
        ...g,
        days_remaining: daysLeft(g.expiresAt),
        change: !g.previousTier || g.previousTier === g.tierKey ? 'renewal' : 'change',
      })),
      purchases,
    })
  } catch (e) {
    console.error('[me/membership-history] GET hatası:', e)
    return apiInternalError()
  }
}

/** Aktif üyelik kaydının otomatik yenileme tercihini günceller (§19 altyapı). */
export async function PUT(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return apiUnauthorized()

    const { success: rlOk } = apiLimiter.check(`membership-history:${userId}`)
    if (!rlOk) return apiError(ErrorCodes.RATE_LIMITED, 'Çok fazla istek gönderildi', 429)

    const body = await req.json().catch(() => ({}))
    if (typeof body?.auto_renew !== 'boolean') {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'auto_renew alanı boolean olmalı', 400)
    }

    const active = await prisma.membershipGrant.findFirst({
      where: { receiverId: userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, tierKey: true },
    })
    if (!active) {
      return apiError(ErrorCodes.NOT_FOUND, 'Aktif bir üyelik kaydınız bulunmuyor', 404)
    }

    await prisma.membershipGrant.update({
      where: { id: active.id },
      data: { autoRenew: body.auto_renew },
    })

    await recordAudit({
      actorId: userId,
      action: body.auto_renew ? 'membership.auto_renew.on' : 'membership.auto_renew.off',
      targetType: 'membership_grant',
      targetId: active.id,
      description: `Otomatik yenileme ${body.auto_renew ? 'açıldı' : 'kapatıldı'} (${active.tierKey})`,
    })

    return apiSuccess({ auto_renew: body.auto_renew, grant_id: active.id })
  } catch (e) {
    console.error('[me/membership-history] PUT hatası:', e)
    return apiInternalError()
  }
}
