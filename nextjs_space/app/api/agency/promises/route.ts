import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAgencyPanel } from '@/lib/agency-access'
import { validatePromiseInput, versionView } from '@/lib/agency-promises'
import { promiseRules } from '@/lib/agency-settings'
import { createBulkNotificationsWithPush } from '@/lib/notify'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'
const err = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })

async function notifyAdmins(agencyName: string, title: string, versionId: string) {
  const admins = await prisma.user
    .findMany({ where: { role: { in: ['admin', 'site_manager'] } }, select: { id: true }, take: 50 })
    .catch(() => [] as { id: string }[])
  if (!admins.length) return
  createBulkNotificationsWithPush({
    userIds: admins.map((a) => a.id),
    type: 'admin_agency_promise',
    title: 'Vaat onayı bekliyor',
    message: `${agencyName}: "${title}"`,
    targetPath: '/admin/ajans-yonetimi',
    targetId: versionId,
  }).catch(() => {})
}

/** GET /api/agency/promises — ajansın tüm vaatleri, sürümleri ve kabul sayıları + admin kuralları. */
export async function GET(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'reports')
  if (gate instanceof NextResponse) return gate
  const agencyId = gate.access.agency.id
  const promises = await prisma.agencyPromise.findMany({ where: { agencyId }, orderBy: { createdAt: 'desc' } })
  const versions = await prisma.agencyPromiseVersion.findMany({
    where: { promiseId: { in: promises.map((p) => p.id) } },
    orderBy: { version: 'desc' },
  })
  const counts = await prisma.agencyPromiseAcceptance.groupBy({
    by: ['versionId'],
    where: { agencyId },
    _count: { _all: true },
  })
  const countBy = new Map((counts as any[]).map((c) => [c.versionId as string, c._count._all as number]))
  return NextResponse.json({
    success: true,
    data: {
      rules: await promiseRules(),
      canEdit: gate.access.isOwner,
      promises: promises.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        currentVersionId: p.currentVersionId,
        createdAt: p.createdAt,
        versions: versions
          .filter((v) => v.promiseId === p.id)
          .map((v) => ({ ...versionView(v), acceptedCount: countBy.get(v.id) ?? 0 })),
      })),
    },
  })
}

/**
 * POST /api/agency/promises (yalnız sahip)
 *  {action:'create', title, body, measurement?, targetPeriod?, targetMinutes?, minDays?, bonusJeton?, periodStart?, periodEnd?, requiresReaccept?}
 *  {action:'new_version', promiseId, ...aynı alanlar}  — onaylı sürüm değişmez; yeni sürüm onaya gider
 *  {action:'withdraw', versionId}                    — bekleyen sürümü geri çek
 *  {action:'archive', promiseId}                     — yeni üyelere gösterme (kabul kayıtları kalır)
 */
export async function POST(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'owner')
  if (gate instanceof NextResponse) return gate
  const { user, access } = gate
  if (access.agency.status !== 'approved') return err(400, 'Ajansınız onaylı değil')
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')
  const ip = getAuditIp(req)

  if (action === 'create') {
    const v = await validatePromiseInput(body, true)
    if ('error' in v) return err(400, v.error as string)
    const open = await prisma.agencyPromise.count({ where: { agencyId: access.agency.id, status: { in: ['draft', 'active'] } } })
    if (open >= 10) return err(400, 'En fazla 10 açık vaat olabilir')
    const created = await prisma.$transaction(async (tx: any) => {
      const p = await tx.agencyPromise.create({
        data: { agencyId: access.agency.id, title: v.data.title, status: 'draft', createdById: user.id },
      })
      const ver = await tx.agencyPromiseVersion.create({
        data: {
          promiseId: p.id,
          agencyId: access.agency.id,
          version: 1,
          body: v.data.body,
          measurement: v.data.measurement,
          targetPeriod: v.data.targetPeriod,
          targetMinutes: v.data.targetMinutes,
          minDays: v.data.minDays,
          bonusJeton: v.data.bonusJeton,
          periodStart: v.data.periodStart,
          periodEnd: v.data.periodEnd,
          requiresReaccept: v.data.requiresReaccept,
          createdById: user.id,
        },
      })
      return { p, ver }
    })
    await notifyAdmins(access.agency.name, v.data.title, created.ver.id)
    recordAudit({ actorId: user.id, action: 'agency_promise_create', targetType: 'agency', targetId: access.agency.id, metadata: { promiseId: created.p.id }, ip }).catch(() => {})
    return NextResponse.json({ success: true, data: { promiseId: created.p.id, versionId: created.ver.id }, message: 'Vaat yönetici onayına gönderildi' })
  }

  if (action === 'new_version') {
    const promise = await prisma.agencyPromise.findUnique({ where: { id: String(body.promiseId || '') } })
    if (!promise || promise.agencyId !== access.agency.id) return err(404, 'Vaat bulunamadı')
    if (promise.status === 'archived') return err(400, 'Arşivlenmiş vaada sürüm eklenemez')
    const v = await validatePromiseInput(body, false)
    if ('error' in v) return err(400, v.error as string)
    const pending = await prisma.agencyPromiseVersion.count({ where: { promiseId: promise.id, status: 'pending' } })
    if (pending) return err(409, 'Bu vaadin onay bekleyen sürümü var')
    const last = await prisma.agencyPromiseVersion.findFirst({ where: { promiseId: promise.id }, orderBy: { version: 'desc' } })
    try {
      const ver = await prisma.agencyPromiseVersion.create({
        data: {
          promiseId: promise.id,
          agencyId: access.agency.id,
          version: (last?.version ?? 0) + 1,
          body: v.data.body,
          measurement: v.data.measurement,
          targetPeriod: v.data.targetPeriod,
          targetMinutes: v.data.targetMinutes,
          minDays: v.data.minDays,
          bonusJeton: v.data.bonusJeton,
          periodStart: v.data.periodStart,
          periodEnd: v.data.periodEnd,
          requiresReaccept: v.data.requiresReaccept,
          createdById: user.id,
        },
      })
      await notifyAdmins(access.agency.name, promise.title, ver.id)
      recordAudit({ actorId: user.id, action: 'agency_promise_version', targetType: 'agency', targetId: access.agency.id, metadata: { promiseId: promise.id, version: ver.version }, ip }).catch(() => {})
      return NextResponse.json({ success: true, data: { versionId: ver.id, version: ver.version }, message: `Sürüm ${ver.version} yönetici onayına gönderildi` })
    } catch (e: any) {
      if (e?.code === 'P2002') return err(409, 'Aynı anda başka bir sürüm oluşturuldu, tekrar deneyin')
      throw e
    }
  }

  if (action === 'withdraw') {
    const r = await prisma.agencyPromiseVersion.updateMany({
      where: { id: String(body.versionId || ''), agencyId: access.agency.id, status: 'pending' },
      data: { status: 'withdrawn' },
    })
    if (r.count !== 1) return err(409, 'Yalnız onay bekleyen sürüm geri çekilebilir')
    return NextResponse.json({ success: true, message: 'Sürüm geri çekildi' })
  }

  if (action === 'archive') {
    const r = await prisma.agencyPromise.updateMany({
      where: { id: String(body.promiseId || ''), agencyId: access.agency.id, status: { not: 'archived' } },
      data: { status: 'archived' },
    })
    if (r.count !== 1) return err(404, 'Vaat bulunamadı')
    recordAudit({ actorId: user.id, action: 'agency_promise_archive', targetType: 'agency', targetId: access.agency.id, metadata: { promiseId: body.promiseId }, ip }).catch(() => {})
    return NextResponse.json({ success: true, message: 'Vaat arşivlendi; kabul kayıtları korunur' })
  }

  return err(400, 'Geçersiz işlem')
}
