/**
 * BÖLÜM 20 — Profil ziyaretçileri (§5 / §11).
 * GET  : ziyaretçi listesi — `vip.profile_visitors` yeteneği gerekir.
 * POST : ziyaret kaydı — ziyaretçi `vip.hide_profile_visit` kullanıyorsa gizli işaretlenir.
 */
import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { apiSuccess, apiError, apiUnauthorized, ErrorCodes } from '@/lib/api-response'
import { resolveUserId, requireCapability, VipGuardResult } from '@/lib/vip-guard'
import { getUserEntitlements } from '@/lib/vip-entitlements'
import { apiLimiter } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = (await requireCapability(req, 'vip.profile_visitors')) as VipGuardResult
  if (!guard.ok) return (guard as { response: any }).response
  const userId = (guard as { userId: string }).userId

  const url = new URL(req.url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 1), 100)

  const [visits, total, hiddenCount] = await Promise.all([
    prisma.profileVisit.findMany({
      where: { profileId: userId, isHidden: false },
      orderBy: { visitedAt: 'desc' },
      take: limit,
      include: {
        visitor: {
          select: { id: true, name: true, image: true, membership: true, membershipExpiresAt: true },
        },
      },
    }),
    prisma.profileVisit.count({ where: { profileId: userId } }),
    prisma.profileVisit.count({ where: { profileId: userId, isHidden: true } }),
  ])

  return apiSuccess({
    visitors: visits.map((v) => ({
      id: v.id,
      visitedAt: v.visitedAt.toISOString(),
      user: v.visitor
        ? {
            id: v.visitor.id,
            name: v.visitor.name,
            image: v.visitor.image,
            membership: v.visitor.membership,
          }
        : null,
    })),
    total,
    hiddenCount,
  })
}

export async function POST(req: NextRequest) {
  const visitorId = await resolveUserId(req)
  if (!visitorId) return apiUnauthorized()

  const { success: rlOk } = apiLimiter.check(`profile-visit:${visitorId}`)
  if (!rlOk) return apiError(ErrorCodes.RATE_LIMITED, 'Çok fazla istek gönderildi', 429)

  let body: any
  try {
    body = await req.json()
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'Geçersiz istek gövdesi', 400)
  }

  const profileId = typeof body?.profileId === 'string' ? body.profileId.trim() : ''
  if (!profileId) return apiError(ErrorCodes.VALIDATION_ERROR, 'profileId zorunludur', 400)
  if (profileId === visitorId) return apiSuccess({ recorded: false, reason: 'self' })

  const target = await prisma.user.findUnique({ where: { id: profileId }, select: { id: true } })
  if (!target) return apiError(ErrorCodes.NOT_FOUND, 'Profil bulunamadı', 404)

  const ent = await getUserEntitlements(visitorId)
  const canHide = !!ent?.features['vip.hide_profile_visit']?.enabled
  const isHidden = canHide && !!ent?.preferences.hideProfileVisit

  await prisma.profileVisit.upsert({
    where: { visitorId_profileId: { visitorId, profileId } },
    create: { visitorId, profileId, isHidden },
    update: { isHidden, visitedAt: new Date() },
  })

  return apiSuccess({ recorded: true, hidden: isHidden })
}
