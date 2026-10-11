/**
 * BÖLÜM 20 §17 — Kademeye özel etkinlik yönetimi (yönetici).
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { recordAudit } from '@/lib/audit-log'
import { apiError, apiSuccess, ErrorCodes } from '@/lib/api-response'
import { normalizeTierKey, getTiers } from '@/lib/vip-entitlements'

export const dynamic = 'force-dynamic'

const EVENT_ADMIN_ROLES = ['admin', 'yonetici', 'moderator']

export async function GET(request: NextRequest) {
  const denied = await requireRole(request, EVENT_ADMIN_ROLES)
  if (denied) return denied
  const events = await prisma.membershipEvent.findMany({
    orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }],
    take: 200,
  })
  return apiSuccess({ events })
}

export async function POST(request: NextRequest) {
  const denied = await requireRole(request, EVENT_ADMIN_ROLES)
  if (denied) return denied
  try {
    const tierKeys = (await getTiers()).map((t: any) => t.key)
    const body = await request.json()
    const title = String(body?.title || '').trim()
    if (!title) return apiError(ErrorCodes.VALIDATION_ERROR, 'Başlık gerekli', 400)
    const startsAt = body?.startsAt ? new Date(body.startsAt) : new Date()
    const endsAt = body?.endsAt ? new Date(body.endsAt) : new Date(Date.now() + 7 * 86400000)
    if (!(endsAt > startsAt)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Bitiş tarihi başlangıçtan sonra olmalı', 400)
    }
    const allowedTiers: string[] = Array.isArray(body?.allowedTiers)
      ? body.allowedTiers.map((t: any) => normalizeTierKey(String(t), tierKeys)).filter(Boolean)
      : []
    const created = await prisma.membershipEvent.create({
      data: {
        title,
        description: body?.description ? String(body.description) : null,
        bannerUrl: body?.bannerUrl ? String(body.bannerUrl) : null,
        ctaUrl: body?.ctaUrl ? String(body.ctaUrl) : null,
        startsAt,
        endsAt,
        minTierKey: body?.minTierKey ? normalizeTierKey(String(body.minTierKey), tierKeys) : null,
        allowedTiers,
        isActive: body?.isActive !== false,
        priority: Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 0,
        createdBy: null,
      },
    })
    await recordAudit({
      actorId: 'admin',
      action: 'membership_event_create',
      targetType: 'MembershipEvent',
      targetId: created.id,
      after: created as any,
    })
    return apiSuccess({ event: created })
  } catch (e) {
    console.error('membership-events POST', e)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Etkinlik oluşturulamadı', 500)
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireRole(request, EVENT_ADMIN_ROLES)
  if (denied) return denied
  try {
    const tierKeys = (await getTiers()).map((t: any) => t.key)
    const body = await request.json()
    const id = String(body?.id || '')
    if (!id) return apiError(ErrorCodes.VALIDATION_ERROR, 'id gerekli', 400)
    const before = await prisma.membershipEvent.findUnique({ where: { id } })
    if (!before) return apiError(ErrorCodes.NOT_FOUND, 'Etkinlik bulunamadı', 404)

    const data: Record<string, any> = {}
    if (body.title !== undefined) data.title = String(body.title)
    if (body.description !== undefined) data.description = body.description ? String(body.description) : null
    if (body.bannerUrl !== undefined) data.bannerUrl = body.bannerUrl ? String(body.bannerUrl) : null
    if (body.ctaUrl !== undefined) data.ctaUrl = body.ctaUrl ? String(body.ctaUrl) : null
    if (body.startsAt !== undefined) data.startsAt = new Date(body.startsAt)
    if (body.endsAt !== undefined) data.endsAt = new Date(body.endsAt)
    if (body.minTierKey !== undefined) {
      data.minTierKey = body.minTierKey ? normalizeTierKey(String(body.minTierKey), tierKeys) : null
    }
    if (Array.isArray(body.allowedTiers)) {
      data.allowedTiers = body.allowedTiers.map((t: any) => normalizeTierKey(String(t), tierKeys)).filter(Boolean)
    }
    if (body.isActive !== undefined) data.isActive = !!body.isActive
    if (body.priority !== undefined) data.priority = Number(body.priority) || 0

    const updated = await prisma.membershipEvent.update({ where: { id }, data })
    await recordAudit({
      actorId: 'admin',
      action: 'membership_event_update',
      targetType: 'MembershipEvent',
      targetId: id,
      before: before as any,
      after: updated as any,
    })
    return apiSuccess({ event: updated })
  } catch (e) {
    console.error('membership-events PUT', e)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Etkinlik güncellenemedi', 500)
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireRole(request, EVENT_ADMIN_ROLES)
  if (denied) return denied
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') || ''
  if (!id) return apiError(ErrorCodes.VALIDATION_ERROR, 'id gerekli', 400)
  if (searchParams.get('confirm') !== 'DELETE') {
    return apiError('CONFIRMATION_REQUIRED', 'confirm=DELETE parametresi gerekli', 400)
  }
  const before = await prisma.membershipEvent.findUnique({ where: { id } })
  if (!before) return apiError(ErrorCodes.NOT_FOUND, 'Etkinlik bulunamadı', 404)
  await prisma.membershipEvent.delete({ where: { id } })
  await recordAudit({
    actorId: 'admin',
    action: 'membership_event_delete',
    targetType: 'MembershipEvent',
    targetId: id,
    before: before as any,
  })
  return apiSuccess({ deleted: true })
}
