import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/rbac'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { AGENCY_COMMISSION_SOURCES, getCommissionRules } from '@/lib/agency-wallet'

export const dynamic = 'force-dynamic'

/** §18 — Ajansa özel gelir kaynağı komisyon kuralları. */
export async function GET(req: NextRequest, { params }: { params: { agencyId: string } }) {
  const auth = await requirePermission(req, 'agency.commission.configure')
  if (auth instanceof NextResponse) return auth

  const agency = await prisma.agency.findUnique({
    where: { id: params.agencyId },
    select: { id: true, name: true, level: true, commissionRate: true },
  })
  if (!agency) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ajans bulunamadı' } }, { status: 404 })

  const rules = await getCommissionRules(params.agencyId)
  return NextResponse.json({ success: true, data: { agency, rules, catalog: AGENCY_COMMISSION_SOURCES } })
}

export async function PUT(req: NextRequest, { params }: { params: { agencyId: string } }) {
  const auth = await requirePermission(req, 'agency.commission.configure')
  if (auth instanceof NextResponse) return auth
  const admin = (auth as any).user
  const ip = getAuditIp(req)

  const agency = await prisma.agency.findUnique({ where: { id: params.agencyId }, select: { id: true, name: true, commissionRate: true } })
  if (!agency) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Ajans bulunamadı' } }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const before = await getCommissionRules(params.agencyId)
  const changed: string[] = []

  if (body.baseCommissionRate !== undefined) {
    const v = Math.max(0, Math.min(100, parseFloat(body.baseCommissionRate)))
    if (!isNaN(v)) {
      await prisma.agency.update({ where: { id: agency.id }, data: { commissionRate: v } })
      changed.push('baseCommissionRate')
    }
  }

  if (Array.isArray(body.rules)) {
    for (const r of body.rules) {
      const sourceType = String(r.sourceType || '')
      if (!AGENCY_COMMISSION_SOURCES.some((s) => s.key === sourceType)) continue

      // "inherit" ⇒ ajansa özel kural silinir, global/varsayılan geçerli olur
      if (r.inherit === true) {
        const ex = await prisma.agencyCommissionRule.findFirst({ where: { agencyId: agency.id, sourceType } })
        if (ex) await prisma.agencyCommissionRule.delete({ where: { id: ex.id } })
        changed.push(`${sourceType}:inherit`)
        continue
      }

      const rate = r.rate === null || r.rate === undefined || r.rate === '' ? null : Math.max(0, Math.min(100, parseFloat(r.rate)))
      const existing = await prisma.agencyCommissionRule.findFirst({ where: { agencyId: agency.id, sourceType } })
      if (existing) {
        await prisma.agencyCommissionRule.update({
          where: { id: existing.id },
          data: { enabled: !!r.enabled, rate, note: r.note || null, updatedById: admin.id, updatedByName: admin.name || admin.email },
        })
      } else {
        await prisma.agencyCommissionRule.create({
          data: { agencyId: agency.id, sourceType, enabled: !!r.enabled, rate, note: r.note || null, updatedById: admin.id, updatedByName: admin.name || admin.email },
        })
      }
      changed.push(sourceType)
    }
  }

  const after = await getCommissionRules(params.agencyId)
  recordAudit({
    actorId: admin.id, action: 'agency_commission_update', targetType: 'agency', targetId: agency.id,
    before: { rules: before, baseCommissionRate: agency.commissionRate },
    after: { rules: after, baseCommissionRate: body.baseCommissionRate },
    metadata: { changed }, ip,
  }).catch(() => {})

  return NextResponse.json({ success: true, changed, data: { rules: after } })
}
