import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser, isAdminRole } from '@/lib/rbac'
import { apiSuccess, apiError, apiForbidden, apiUnauthorized, apiNotFound } from '@/lib/api-response'
import { invalidateCache } from '@/lib/cache'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/effect-rules/[ruleId] — update a rule
export async function PATCH(req: NextRequest, { params }: { params: { ruleId: string } }) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()
    if (!isAdminRole(user.role)) return apiForbidden()

    const existing = await prisma.effectRule.findUnique({ where: { id: params.ruleId } })
    if (!existing) return apiNotFound('Efekt kuralı bulunamadı')

    const body = await req.json().catch(() => ({}))
    const data: any = {}
    if (typeof body.name === 'string') data.name = body.name.trim()
    if (typeof body.description === 'string') data.description = body.description.slice(0, 500) || null
    if (typeof body.effectType === 'string') data.effectType = body.effectType.trim()
    if (typeof body.effectRefId === 'string') data.effectRefId = body.effectRefId.trim() || null
    if (typeof body.conditionType === 'string') data.conditionType = body.conditionType.trim()
    if (Number.isFinite(body.threshold)) data.threshold = Math.trunc(body.threshold)
    if (typeof body.conditionValue === 'string') data.conditionValue = body.conditionValue.trim() || null
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    if (Number.isFinite(body.priority)) data.priority = Math.trunc(body.priority)

    const rule = await prisma.effectRule.update({ where: { id: params.ruleId }, data })
    invalidateCache('effect_rules:active')
    recordAudit({
      actorId: user.id, actorRole: user.role, action: 'effect_rule_update',
      targetType: 'EffectRule', targetId: rule.id, before: existing as any, after: rule as any, ip: getAuditIp(req),
    }).catch(() => {})
    return apiSuccess(rule)
  } catch (err) {
    console.error('[admin/effect-rules/:id PATCH]', err)
    return apiError('INTERNAL_ERROR', 'Efekt kuralı güncellenemedi', 500)
  }
}

// DELETE /api/admin/effect-rules/[ruleId]
export async function DELETE(req: NextRequest, { params }: { params: { ruleId: string } }) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()
    if (!isAdminRole(user.role)) return apiForbidden()

    const existing = await prisma.effectRule.findUnique({ where: { id: params.ruleId } })
    if (!existing) return apiNotFound('Efekt kuralı bulunamadı')

    await prisma.effectRule.delete({ where: { id: params.ruleId } })
    invalidateCache('effect_rules:active')
    recordAudit({
      actorId: user.id, actorRole: user.role, action: 'effect_rule_delete',
      targetType: 'EffectRule', targetId: params.ruleId, before: existing as any, ip: getAuditIp(req),
    }).catch(() => {})
    return apiSuccess({ deleted: true })
  } catch (err) {
    console.error('[admin/effect-rules/:id DELETE]', err)
    return apiError('INTERNAL_ERROR', 'Efekt kuralı silinemedi', 500)
  }
}
