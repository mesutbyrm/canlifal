import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAgencyPanel } from '@/lib/agency-access'
import { recordMembershipLeave } from '@/lib/agency-membership-history'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'
const err = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })

/** GET /api/agency/blocks — ajansın engellediği kullanıcılar. */
export async function GET(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'members')
  if (gate instanceof NextResponse) return gate
  const rows = await prisma.agencyMemberBlock.findMany({
    where: { agencyId: gate.access.agency.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, name: true, username: true, image: true },
  })
  const byId = new Map(users.map((u) => [u.id, u]))
  return NextResponse.json({ success: true, data: rows.map((r) => ({ ...r, user: byId.get(r.userId) ?? null })) })
}

/**
 * POST /api/agency/blocks {userId, reason?}
 * Kullanıcıyı engeller: üyeyse ajanstan çıkarılır (geçmiş kalır), bekleyen başvuru ve
 * davetleri iptal edilir; tekrar başvuru/davet/davet koduyla katılım reddedilir.
 * Ajans sahibi ve yöneticiler bu yolla engellenemez.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'members')
  if (gate instanceof NextResponse) return gate
  const { user, access } = gate
  const body = await req.json().catch(() => ({}))
  const userId = String(body.userId || '')
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : null
  if (!userId) return err(400, 'userId gerekli')
  if (userId === user.id || userId === access.agency.ownerId) return err(400, 'Bu kullanıcı engellenemez')
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!target) return err(404, 'Kullanıcı bulunamadı')

  const member = await prisma.agencyUser.findUnique({ where: { userId } })
  if (member && member.agencyId === access.agency.id && member.role !== 'member' && !access.isOwner) {
    return err(403, 'Yöneticileri yalnız ajans sahibi engelleyebilir')
  }

  try {
    await prisma.agencyMemberBlock.create({ data: { agencyId: access.agency.id, userId, reason, blockedById: user.id } })
  } catch (e: any) {
    if (e?.code === 'P2002') return err(409, 'Kullanıcı zaten engelli')
    throw e
  }

  let removed = false
  if (member && member.agencyId === access.agency.id) {
    const del = await prisma.agencyUser.deleteMany({ where: { id: member.id, agencyId: access.agency.id } })
    if (del.count === 1) {
      removed = true
      await prisma.agency.update({
        where: { id: access.agency.id },
        data: { totalMembers: { decrement: 1 }, ...(member.isActive ? { activeMembers: { decrement: 1 } } : {}) },
      })
      await recordMembershipLeave({ agencyId: access.agency.id, userId, endedBy: 'agency', reason: reason ? `Engellendi: ${reason}` : 'Engellendi', actorId: user.id, joinedAt: member.joinedAt, role: member.role })
    }
  }
  await prisma.agencyJoinRequest.updateMany({
    where: { agencyId: access.agency.id, userId, status: 'pending' },
    data: { status: 'rejected', reviewedById: user.id, reviewedAt: new Date(), reviewNote: 'Engellendi' },
  })
  await prisma.agencyMemberInvite.updateMany({
    where: { agencyId: access.agency.id, userId, status: 'pending' },
    data: { status: 'cancelled', respondedAt: new Date() },
  })
  recordAudit({ actorId: user.id, action: 'agency_member_block', targetType: 'agency', targetId: access.agency.id, metadata: { userId, removed }, ip: getAuditIp(req) }).catch(() => {})
  return NextResponse.json({ success: true, message: removed ? 'Kullanıcı ajanstan çıkarıldı ve engellendi' : 'Kullanıcı engellendi' })
}

/** DELETE /api/agency/blocks?userId= — engeli kaldırır (üyelik geri gelmez). */
export async function DELETE(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'members')
  if (gate instanceof NextResponse) return gate
  const userId = new URL(req.url).searchParams.get('userId') || ''
  const r = await prisma.agencyMemberBlock.deleteMany({ where: { agencyId: gate.access.agency.id, userId } })
  if (r.count === 0) return err(404, 'Engel bulunamadı')
  recordAudit({ actorId: gate.user.id, action: 'agency_member_unblock', targetType: 'agency', targetId: gate.access.agency.id, metadata: { userId }, ip: getAuditIp(req) }).catch(() => {})
  return NextResponse.json({ success: true, message: 'Engel kaldırıldı' })
}
