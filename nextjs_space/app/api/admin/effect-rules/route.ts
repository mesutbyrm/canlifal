import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser, isAdminRole } from '@/lib/rbac'
import { apiSuccess, apiError, apiForbidden, apiUnauthorized, apiValidation } from '@/lib/api-response'
import { invalidateCache } from '@/lib/cache'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

// GET /api/admin/effect-rules — list all rules
export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()
    if (!isAdminRole(user.role)) return apiForbidden()

    const rules = await prisma.effectRule.findMany({ orderBy: [{ effectType: 'asc' }, { priority: 'desc' }] })
    return apiSuccess(rules)
  } catch (err) {
    console.error('[admin/effect-rules GET]', err)
    return apiError('INTERNAL_ERROR', 'Efekt kuralları getirilemedi', 500)
  }
}

// POST /api/admin/effect-rules — create a rule
export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()
    if (!isAdminRole(user.role)) return apiForbidden()

    const body = await req.json().catch(() => ({}))
    const key = (body.key || '').trim()
    const name = (body.name || '').trim()
    const effectType = (body.effectType || '').trim()
    const conditionType = (body.conditionType || '').trim()
    if (!key || !name || !effectType || !conditionType) {
      return apiValidation('key, name, effectType ve conditionType zorunlu')
    }

    const rule = await prisma.effectRule.create({
      data: {
        key, name,
        description: (body.description || '').slice(0, 500) || null,
        effectType,
        effectRefId: (body.effectRefId || '').trim() || null,
        conditionType,
        threshold: Number.isFinite(body.threshold) ? Math.trunc(body.threshold) : 0,
        conditionValue: (body.conditionValue || '').trim() || null,
        isActive: body.isActive !== false,
        priority: Number.isFinite(body.priority) ? Math.trunc(body.priority) : 0,
      },
    })
    invalidateCache('effect_rules:active')
    recordAudit({
      actorId: user.id, actorRole: user.role, action: 'effect_rule_create',
      targetType: 'EffectRule', targetId: rule.id, after: rule as any, ip: getAuditIp(req),
    }).catch(() => {})
    return apiSuccess(rule, 201)
  } catch (err: any) {
    if (err?.code === 'P2002') return apiError('CONFLICT', 'Bu key zaten kullanılıyor', 409)
    console.error('[admin/effect-rules POST]', err)
    return apiError('INTERNAL_ERROR', 'Efekt kuralı oluşturulamadı', 500)
  }
}
