import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAgencyPanel } from '@/lib/agency-access'
import { recordMembershipJoin } from '@/lib/agency-membership-history'
import { createNotificationWithPush } from '@/lib/notify'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

const err = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })

/** GET /api/agency/join-requests?status=pending|all — ajansa gelen katılma başvuruları. */
export async function GET(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'members')
  if (gate instanceof NextResponse) return gate
  const status = new URL(req.url).searchParams.get('status') || 'pending'
  const rows = await prisma.agencyJoinRequest.findMany({
    where: { agencyId: gate.access.agency.id, ...(status === 'all' ? {} : { status }) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, name: true, username: true, image: true },
  })
  const byId = new Map(users.map((u) => [u.id, u]))
  return NextResponse.json({
    success: true,
    data: rows.map((r) => ({ ...r, user: byId.get(r.userId) ?? null })),
  })
}

/** POST /api/agency/join-requests {requestId, action: accept|reject, note?} */
export async function POST(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'members')
  if (gate instanceof NextResponse) return gate
  const { user, access } = gate
  if (access.agency.status !== 'approved') return err(400, 'Ajansınız onaylı değil')
  const body = await req.json().catch(() => ({}))
  const requestId = String(body.requestId || '')
  const action = String(body.action || '')
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : null
  if (!requestId || !['accept', 'reject'].includes(action)) return err(400, 'requestId ve action (accept|reject) gerekli')

  const jr = await prisma.agencyJoinRequest.findUnique({ where: { id: requestId } })
  if (!jr || jr.agencyId !== access.agency.id) return err(404, 'Başvuru bulunamadı')
  if (jr.status !== 'pending') return err(409, 'Başvuru zaten işlenmiş')

  if (action === 'reject') {
    const r = await prisma.agencyJoinRequest.updateMany({
      where: { id: jr.id, status: 'pending' },
      data: { status: 'rejected', reviewedById: user.id, reviewedAt: new Date(), reviewNote: note },
    })
    if (r.count !== 1) return err(409, 'Başvuru zaten işlenmiş')
    createNotificationWithPush({
      userId: jr.userId,
      type: 'agency_join_rejected',
      title: 'Ajans başvurusu',
      message: `${access.agency.name} başvurunuzu kabul etmedi.`,
      targetPath: `/ajanslar/${access.agency.id}`,
    }).catch(() => {})
    return NextResponse.json({ success: true, message: 'Başvuru reddedildi' })
  }

  // KABUL — tek aktif ajans: AgencyUser.userId benzersiz; yarışta ikinci kabul düşer.
  try {
    await prisma.$transaction(async (tx: any) => {
      const claimed = await tx.agencyJoinRequest.updateMany({
        where: { id: jr.id, status: 'pending' },
        data: { status: 'accepted', reviewedById: user.id, reviewedAt: new Date(), reviewNote: note },
      })
      if (claimed.count !== 1) throw new Error('ALREADY')
      const existing = await tx.agencyUser.findUnique({ where: { userId: jr.userId } })
      if (existing) throw new Error('IN_AGENCY')
      await tx.agencyUser.create({
        data: { agencyId: access.agency.id, userId: jr.userId, role: 'member', joinedVia: 'application', isActive: true },
      })
      await tx.agency.update({
        where: { id: access.agency.id },
        data: { totalMembers: { increment: 1 }, activeMembers: { increment: 1 } },
      })
      // Kullanıcının diğer bekleyen başvuruları geçersiz.
      await tx.agencyJoinRequest.updateMany({
        where: { userId: jr.userId, status: 'pending', id: { not: jr.id } },
        data: { status: 'cancelled', reviewedAt: new Date(), reviewNote: 'Başka ajansa katıldı' },
      })
    })
  } catch (e: any) {
    if (e?.message === 'ALREADY') return err(409, 'Başvuru zaten işlenmiş')
    if (e?.message === 'IN_AGENCY' || e?.code === 'P2002') return err(409, 'Kullanıcı artık başka bir ajansa üye')
    throw e
  }
  await recordMembershipJoin({ agencyId: access.agency.id, userId: jr.userId, role: 'member', via: 'application', actorId: user.id })
  createNotificationWithPush({
    userId: jr.userId,
    type: 'agency_join_accepted',
    title: 'Ajansa katıldınız',
    message: `${access.agency.name} başvurunuzu kabul etti.`,
    targetPath: '/ajans/yayinci',
  }).catch(() => {})
  recordAudit({ actorId: user.id, action: 'agency_join_accept', targetType: 'agency', targetId: access.agency.id, metadata: { userId: jr.userId }, ip: getAuditIp(req) }).catch(() => {})
  return NextResponse.json({ success: true, message: 'Başvuru kabul edildi' })
}
