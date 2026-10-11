export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser, isAdminRole } from '@/lib/rbac'
import { apiSuccess, apiError, apiForbidden, apiNotFound, apiUnauthorized } from '@/lib/api-response'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

// PATCH /api/admin/risk-events/[eventId] — incelendi olarak işaretle / not ekle
export async function PATCH(req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()
    if (!isAdminRole(user.role)) return apiForbidden()

    const existing = await prisma.riskEvent.findUnique({ where: { id: params.eventId } })
    if (!existing) return apiNotFound('Risk olayı bulunamadı')

    const body = await req.json().catch(() => ({}))
    const reviewed = typeof body.reviewed === 'boolean' ? body.reviewed : true
    const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote : undefined

    const updated = await prisma.riskEvent.update({
      where: { id: params.eventId },
      data: {
        reviewed,
        reviewedBy: reviewed ? user.id : null,
        reviewedAt: reviewed ? new Date() : null,
        ...(reviewNote !== undefined && { reviewNote }),
      },
    })

    recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'risk_event_review',
      targetType: 'RiskEvent',
      targetId: params.eventId,
      before: { reviewed: existing.reviewed, reviewNote: existing.reviewNote },
      after: { reviewed: updated.reviewed, reviewNote: updated.reviewNote },
      description: `Risk olayı ${reviewed ? 'incelendi' : 'incelenmedi'} olarak işaretlendi`,
      ip: getAuditIp(req),
    }).catch((e) => console.error('[Audit] risk_event_review error:', e))

    return apiSuccess(updated)
  } catch (e) {
    console.error('[AdminRiskEvents] PATCH error:', e)
    return apiError('INTERNAL_ERROR', 'Risk olayı güncellenemedi', 500)
  }
}
