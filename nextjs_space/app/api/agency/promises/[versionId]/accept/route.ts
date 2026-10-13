import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { activeTargetWhere } from '@/lib/agency-performance'

export const dynamic = 'force-dynamic'
const err = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })

/**
 * POST /api/agency/promises/{versionId}/accept {confirm: true}
 * Yayıncı, ajansının yayımlanmış (admin onaylı, güncel) vaat sürümünü açıkça kabul eder.
 * Kabul kaydı: sürüm, kullanıcı, tarih, IP. Sürümde yayın hedefi varsa yayıncıya
 * bu sürüme bağlı hedef açılır (aynı dönemdeki önceki vaat hedefi kapanır).
 */
export async function POST(req: NextRequest, { params }: { params: { versionId: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = auth.user
  const body = await req.json().catch(() => ({}))
  if (body.confirm !== true) return err(400, 'Kabul için açık onay gerekli')

  const version = await prisma.agencyPromiseVersion.findUnique({ where: { id: params.versionId } })
  if (!version || version.status !== 'approved') return err(404, 'Yayımlanmış vaat sürümü bulunamadı')
  const promise = await prisma.agencyPromise.findUnique({ where: { id: version.promiseId } })
  if (!promise || promise.status !== 'active' || promise.currentVersionId !== version.id) {
    return err(409, 'Bu sürüm artık güncel değil; lütfen güncel sürümü inceleyin')
  }
  const member = await prisma.agencyUser.findUnique({ where: { userId: user.id }, select: { agencyId: true, isActive: true } })
  if (!member || member.agencyId !== version.agencyId || !member.isActive) return err(403, 'Yalnız ajansın aktif üyeleri kabul edebilir')

  const ip = getAuditIp(req)
  try {
    await prisma.$transaction(async (tx: any) => {
      await tx.agencyPromiseAcceptance.create({
        data: { versionId: version.id, promiseId: version.promiseId, agencyId: version.agencyId, userId: user.id, ip: ip || null },
      })
      if (version.targetMinutes && version.targetPeriod) {
        const now = new Date()
        // Aynı vaadin önceki sürümünden gelen hedef(ler)i kapat.
        const priorVersions = await tx.agencyPromiseVersion.findMany({
          where: { promiseId: version.promiseId, id: { not: version.id } },
          select: { id: true },
        })
        if (priorVersions.length) {
          await tx.broadcasterTarget.updateMany({
            where: { userId: user.id, agencyId: version.agencyId, ...activeTargetWhere(now), promiseVersionId: { in: priorVersions.map((v: any) => v.id) } },
            data: { endsAt: now },
          })
        }
        await tx.broadcasterTarget.create({
          data: {
            agencyId: version.agencyId,
            userId: user.id,
            period: version.targetPeriod,
            targetMinutes: version.targetMinutes,
            minDays: version.minDays,
            bonusJeton: version.bonusJeton,
            promiseVersionId: version.id,
            startsAt: now > version.periodStart ? now : version.periodStart,
            endsAt: version.periodEnd,
            createdById: user.id,
          },
        })
      }
    })
  } catch (e: any) {
    if (e?.code === 'P2002') return err(409, 'Bu sürümü zaten kabul ettiniz')
    throw e
  }
  recordAudit({ actorId: user.id, action: 'agency_promise_accept', targetType: 'agency', targetId: version.agencyId, metadata: { versionId: version.id, version: version.version }, ip }).catch(() => {})
  return NextResponse.json({ success: true, message: `"${promise.title}" (sürüm ${version.version}) kabul edildi` })
}
