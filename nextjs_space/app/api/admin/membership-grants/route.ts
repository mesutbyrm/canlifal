/**
 * BÖLÜM 20 — Admin: üyelik atama / hediye / yükseltme / düşürme geçmişi (§19, §20).
 * Jeton/CFC bakiyelerine DOKUNMAZ.
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { apiSuccess, apiError, ErrorCodes } from '@/lib/api-response'
import { requireRole } from '@/lib/rbac'
import { resolveUser } from '@/lib/rbac'
import { applyMembership } from '@/lib/membership-lifecycle'
import { invalidateUserEntitlements } from '@/lib/vip-entitlements'
import { recordAudit } from '@/lib/audit-log'
import { apiLimiter } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

const GRANT_ROLES = ['admin', 'yonetici', 'finans']

export async function GET(req: NextRequest) {
  const denied = await requireRole(req, GRANT_ROLES)
  if (denied) return denied

  const url = new URL(req.url)
  const userId = url.searchParams.get('userId') || undefined
  const tierKey = url.searchParams.get('tierKey') || undefined
  const status = url.searchParams.get('status') || undefined
  const source = url.searchParams.get('source') || undefined
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 200)

  const where: any = {}
  if (userId) where.receiverId = userId
  if (tierKey) where.tierKey = tierKey
  if (status) where.status = status
  if (source) where.source = source

  const [grants, total] = await Promise.all([
    prisma.membershipGrant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        receiver: { select: { id: true, name: true, email: true, membership: true } },
        giver: { select: { id: true, name: true } },
      },
    }),
    prisma.membershipGrant.count({ where }),
  ])

  return apiSuccess({ grants, total })
}

/** Üyelik atar veya hediye eder. */
export async function POST(req: NextRequest) {
  const denied = await requireRole(req, GRANT_ROLES)
  if (denied) return denied
  const actor = await resolveUser(req)
  if (!actor) return apiError(ErrorCodes.UNAUTHORIZED, 'Oturum gerekli', 401)

  const { success: rlOk } = apiLimiter.check(`mgrant:${actor.id}`)
  if (!rlOk) return apiError(ErrorCodes.RATE_LIMITED, 'Çok fazla istek', 429)

  let body: any
  try { body = await req.json() } catch { return apiError(ErrorCodes.VALIDATION_ERROR, 'Geçersiz gövde', 400) }

  const receiverId = String(body?.userId || body?.receiverId || '').trim()
  const tierKey = String(body?.tierKey || '').trim().toLowerCase()
  if (!receiverId || !tierKey) return apiError(ErrorCodes.VALIDATION_ERROR, 'userId ve tierKey zorunludur', 400)

  const durationDays = Number.isFinite(body?.durationDays) ? Math.trunc(body.durationDays) : null
  if (durationDays !== null && (durationDays < 0 || durationDays > 3650)) {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'Süre 0 – 3650 gün aralığında olmalı', 400)
  }

  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } })
  if (!receiver) return apiError(ErrorCodes.NOT_FOUND, 'Kullanıcı bulunamadı', 404)

  const source = ['purchase', 'gift', 'admin', 'renewal', 'migration'].includes(body?.source) ? body.source : 'admin'
  const giverId = source === 'gift' && typeof body?.giverId === 'string' ? body.giverId : null

  const result = await applyMembership({
    userId: receiverId,
    tierKey,
    durationDays,
    source,
    giverId,
    transactionId: body?.transactionId ? String(body.transactionId) : null,
    autoRenew: body?.autoRenew === true,
    note: body?.note ? String(body.note) : null,
    actorId: actor.id,
  })

  if (!result.ok) {
    return apiError(ErrorCodes.VALIDATION_ERROR, (result as { error?: string }).error || 'Üyelik atanamadı', 400)
  }

  return apiSuccess(result, 201)
}

/** Aktif üyeliği iptal eder (Basic'e düşürür). Kozmetik veriler silinmez. */
export async function DELETE(req: NextRequest) {
  const denied = await requireRole(req, GRANT_ROLES)
  if (denied) return denied
  const actor = await resolveUser(req)
  if (!actor) return apiError(ErrorCodes.UNAUTHORIZED, 'Oturum gerekli', 401)

  const url = new URL(req.url)
  const userId = (url.searchParams.get('userId') || '').trim()
  const confirm = url.searchParams.get('confirm')
  if (!userId) return apiError(ErrorCodes.VALIDATION_ERROR, 'userId zorunludur', 400)
  if (confirm !== 'REVOKE') return apiError(ErrorCodes.VALIDATION_ERROR, 'confirm=REVOKE gerekli', 400)

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, membership: true, membershipExpiresAt: true },
  })
  if (!before) return apiError(ErrorCodes.NOT_FOUND, 'Kullanıcı bulunamadı', 404)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { membership: 'basic', membershipExpiresAt: null },
    })
    await tx.membershipGrant.updateMany({
      where: { receiverId: userId, status: 'active' },
      data: { status: 'cancelled' },
    })
  })

  invalidateUserEntitlements(userId)
  await recordAudit({
    actorId: actor.id, actorRole: actor.role, action: 'membership_revoke',
    targetType: 'User', targetId: userId, before: before as any,
    after: { membership: 'basic', membershipExpiresAt: null },
    description: 'Üyelik yönetici tarafından iptal edildi (kozmetik veriler korundu)',
  })

  return apiSuccess({ revoked: true, userId, previousTier: before.membership })
}
