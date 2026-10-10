import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/rbac'
import { versionView } from '@/lib/agency-promises'
import { createNotificationWithPush, createBulkNotificationsWithPush } from '@/lib/notify'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { invalidateCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'
const err = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })

/** GET /api/admin/agency-management/promises?status=pending|approved|rejected|all */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'agency.manage')
  if (auth instanceof NextResponse) return auth
  const status = new URL(req.url).searchParams.get('status') || 'pending'
  const versions = await prisma.agencyPromiseVersion.findMany({
    where: status === 'all' ? {} : { status },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  const promises = await prisma.agencyPromise.findMany({ where: { id: { in: versions.map((v) => v.promiseId) } } })
  const agencies = await prisma.agency.findMany({
    where: { id: { in: Array.from(new Set(versions.map((v) => v.agencyId))) } },
    select: { id: true, name: true },
  })
  const pBy = new Map(promises.map((p) => [p.id, p]))
  const aBy = new Map(agencies.map((a) => [a.id, a.name]))
  // Önceki onaylı sürüm (karşılaştırma için)
  const currentIds = promises.map((p) => p.currentVersionId).filter(Boolean) as string[]
  const current = currentIds.length ? await prisma.agencyPromiseVersion.findMany({ where: { id: { in: currentIds } } }) : []
  const cBy = new Map(current.map((v) => [v.id, v]))
  return NextResponse.json({
    success: true,
    data: versions.map((v) => {
      const p = pBy.get(v.promiseId)
      const cur = p?.currentVersionId ? cBy.get(p.currentVersionId) : null
      return {
        ...versionView(v),
        title: p?.title ?? '',
        promiseStatus: p?.status ?? null,
        agencyId: v.agencyId,
        agencyName: aBy.get(v.agencyId) ?? 'Ajans',
        currentApproved: cur && cur.id !== v.id ? versionView(cur) : null,
      }
    }),
  })
}

/** POST {versionId, action: approve|reject, note?} — vaat sürümü onayı/reddi. */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'agency.manage')
  if (auth instanceof NextResponse) return auth
  const admin = auth.user
  const body = await req.json().catch(() => ({}))
  const versionId = String(body.versionId || '')
  const action = String(body.action || '')
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : null
  if (!versionId || !['approve', 'reject'].includes(action)) return err(400, 'versionId ve action (approve|reject) gerekli')
  if (action === 'reject' && (!note || note.length < 5)) return err(400, 'Ret gerekçesi en az 5 karakter olmalı')

  const v = await prisma.agencyPromiseVersion.findUnique({ where: { id: versionId } })
  if (!v) return err(404, 'Sürüm bulunamadı')
  const promise = await prisma.agencyPromise.findUnique({ where: { id: v.promiseId } })
  const agency = await prisma.agency.findUnique({ where: { id: v.agencyId }, select: { id: true, name: true, ownerId: true } })
  if (!promise || !agency) return err(404, 'Vaat bulunamadı')

  if (action === 'reject') {
    const r = await prisma.agencyPromiseVersion.updateMany({
      where: { id: v.id, status: 'pending' },
      data: { status: 'rejected', reviewedById: admin.id, reviewedAt: new Date(), reviewNote: note },
    })
    if (r.count !== 1) return err(409, 'Sürüm zaten işlenmiş')
    createNotificationWithPush({
      userId: agency.ownerId,
      type: 'agency_promise_rejected',
      title: 'Vaat reddedildi',
      message: `"${promise.title}" sürüm ${v.version}: ${note}`,
      targetPath: '/ajans/vaatler',
    }).catch(() => {})
    recordAudit({ actorId: admin.id, action: 'admin_agency_promise_reject', targetType: 'agency', targetId: agency.id, metadata: { versionId: v.id }, ip: getAuditIp(req) }).catch(() => {})
    return NextResponse.json({ success: true, message: 'Sürüm reddedildi' })
  }

  // ONAY: sürüm sabitlenir, önceki onaylı sürüm "superseded", vaat bu sürümü gösterir.
  const previousId = promise.currentVersionId
  try {
    await prisma.$transaction(async (tx: any) => {
      const r = await tx.agencyPromiseVersion.updateMany({
        where: { id: v.id, status: 'pending' },
        data: { status: 'approved', reviewedById: admin.id, reviewedAt: new Date(), reviewNote: note },
      })
      if (r.count !== 1) throw new Error('ALREADY')
      if (previousId && previousId !== v.id) {
        await tx.agencyPromiseVersion.updateMany({ where: { id: previousId, status: 'approved' }, data: { status: 'superseded' } })
      }
      await tx.agencyPromise.update({ where: { id: promise.id }, data: { currentVersionId: v.id, status: 'active' } })
    })
  } catch (e: any) {
    if (e?.message === 'ALREADY') return err(409, 'Sürüm zaten işlenmiş')
    throw e
  }
  invalidateCache('agencies:discovery')
  createNotificationWithPush({
    userId: agency.ownerId,
    type: 'agency_promise_approved',
    title: 'Vaat onaylandı',
    message: `"${promise.title}" sürüm ${v.version} yayımlandı.`,
    targetPath: '/ajans/vaatler',
  }).catch(() => {})
  // Yeni şartlar: önceki sürümü kabul etmiş aktif üyelere yeniden kabul bildirimi.
  if (previousId && v.requiresReaccept) {
    const accepted = await prisma.agencyPromiseAcceptance.findMany({ where: { versionId: previousId }, select: { userId: true } })
    const active = await prisma.agencyUser.findMany({
      where: { agencyId: agency.id, isActive: true, userId: { in: accepted.map((a) => a.userId) } },
      select: { userId: true },
    })
    if (active.length) {
      createBulkNotificationsWithPush({
        userIds: active.map((a) => a.userId),
        type: 'agency_promise_reaccept',
        title: 'Ajans şartları güncellendi',
        message: `${agency.name}: "${promise.title}" yeni sürümü onayınızı bekliyor. Önceki kabulünüz kayıtlıdır.`,
        targetPath: '/ajans/yayinci',
        targetId: v.id,
      }).catch(() => {})
    }
  }
  recordAudit({ actorId: admin.id, action: 'admin_agency_promise_approve', targetType: 'agency', targetId: agency.id, metadata: { versionId: v.id, version: v.version }, ip: getAuditIp(req) }).catch(() => {})
  return NextResponse.json({ success: true, message: 'Sürüm onaylandı ve yayımlandı' })
}
