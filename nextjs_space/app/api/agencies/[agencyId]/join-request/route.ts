import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { createNotificationWithPush } from '@/lib/notify'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

const err = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })

/** POST /api/agencies/{id}/join-request {message?} — kullanıcı ajansa katılma başvurusu yapar. */
export async function POST(req: NextRequest, { params }: { params: { agencyId: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = auth.user
  const limited = await guardRateLimit(req, 'agency_join_request', { userId: user.id, limit: 10, windowMs: 60 * 60 * 1000 }).catch(() => null)
  if (limited) return limited

  const agency = await prisma.agency.findUnique({
    where: { id: params.agencyId },
    select: { id: true, name: true, status: true, ownerId: true, invitesDisabled: true },
  })
  if (!agency || agency.status !== 'approved') return err(404, 'Ajans bulunamadı')
  if (agency.invitesDisabled) return err(400, 'Bu ajans şu anda yeni üye kabul etmiyor')
  if (agency.ownerId === user.id) return err(400, 'Kendi ajansınıza başvuramazsınız')

  const membership = await prisma.agencyUser.findUnique({ where: { userId: user.id }, select: { agencyId: true } })
  if (membership) {
    return err(409, membership.agencyId === agency.id ? 'Zaten bu ajansın üyesisiniz' : 'Önce mevcut ajansınızdan ayrılmalısınız')
  }
  const pending = await prisma.agencyJoinRequest.findFirst({
    where: { agencyId: agency.id, userId: user.id, status: 'pending' },
    select: { id: true },
  })
  if (pending) return err(409, 'Bu ajansa bekleyen başvurunuz var')
  const openCount = await prisma.agencyJoinRequest.count({ where: { userId: user.id, status: 'pending' } })
  if (openCount >= 3) return err(429, 'Aynı anda en fazla 3 ajansa başvurabilirsiniz')

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : null

  const jr = await prisma.agencyJoinRequest.create({
    data: { agencyId: agency.id, userId: user.id, message: message || null },
  })
  createNotificationWithPush({
    userId: agency.ownerId,
    type: 'agency_join_request',
    title: 'Yeni ajans başvurusu',
    message: `Bir kullanıcı ${agency.name} ajansına katılmak istiyor.`,
    fromUserId: user.id,
    targetPath: '/ajans/basvurular',
    targetId: jr.id,
  }).catch(() => {})
  recordAudit({ actorId: user.id, action: 'agency_join_request', targetType: 'agency', targetId: agency.id, metadata: { requestId: jr.id }, ip: getAuditIp(req) }).catch(() => {})
  return NextResponse.json({ success: true, data: { id: jr.id, status: jr.status }, message: 'Başvurunuz ajansa iletildi' })
}

/** DELETE /api/agencies/{id}/join-request — kullanıcı bekleyen başvurusunu geri çeker (kayıt silinmez). */
export async function DELETE(req: NextRequest, { params }: { params: { agencyId: string } }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const res = await prisma.agencyJoinRequest.updateMany({
    where: { agencyId: params.agencyId, userId: auth.user.id, status: 'pending' },
    data: { status: 'cancelled', reviewedAt: new Date(), reviewNote: 'Kullanıcı geri çekti' },
  })
  if (res.count === 0) return err(404, 'Bekleyen başvuru bulunamadı')
  return NextResponse.json({ success: true, message: 'Başvuru geri çekildi' })
}
