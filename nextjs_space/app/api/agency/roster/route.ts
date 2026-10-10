import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAgencyPanel } from '@/lib/agency-access'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agency/roster — üyeler durumlarına göre:
 * aktif, pasif, bekleyen (başvuru + gönderilen davet), ayrılmış (geçmiş), engellenmiş.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'members')
  if (gate instanceof NextResponse) return gate
  const agencyId = gate.access.agency.id

  const [members, requests, invites, history, blocks] = await Promise.all([
    prisma.agencyUser.findMany({ where: { agencyId }, select: { userId: true, role: true, isActive: true, joinedAt: true }, orderBy: { joinedAt: 'asc' } }),
    prisma.agencyJoinRequest.findMany({ where: { agencyId, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 100 }).catch(() => [] as any[]),
    prisma.agencyMemberInvite.findMany({ where: { agencyId, status: 'pending' }, select: { id: true, userId: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.agencyMembershipHistory.findMany({ where: { agencyId, leftAt: { not: null } }, orderBy: { leftAt: 'desc' }, take: 200 }).catch(() => [] as any[]),
    prisma.agencyMemberBlock.findMany({ where: { agencyId }, orderBy: { createdAt: 'desc' }, take: 200 }).catch(() => [] as any[]),
  ])
  const ids = new Set<string>([
    ...members.map((m) => m.userId),
    ...requests.map((r: any) => r.userId),
    ...invites.map((i) => i.userId),
    ...history.map((h: any) => h.userId),
    ...blocks.map((b: any) => b.userId),
  ])
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(ids) } },
    select: { id: true, name: true, username: true, image: true },
  })
  const u = new Map(users.map((x) => [x.id, x]))
  const ref = (id: string) => u.get(id) ?? { id, name: null, username: null, image: null }
  const currentIds = new Set(members.map((m) => m.userId))

  return NextResponse.json({
    success: true,
    data: {
      active: members.filter((m) => m.isActive).map((m) => ({ user: ref(m.userId), role: m.role, since: m.joinedAt })),
      inactive: members.filter((m) => !m.isActive).map((m) => ({ user: ref(m.userId), role: m.role, since: m.joinedAt })),
      pending: [
        ...requests.map((r: any) => ({ kind: 'request', id: r.id, user: ref(r.userId), since: r.createdAt, note: r.message ?? null })),
        ...invites.map((i) => ({ kind: 'invite', id: i.id, user: ref(i.userId), since: i.createdAt, note: null })),
      ],
      left: history
        .filter((h: any) => !currentIds.has(h.userId))
        .map((h: any) => ({ user: ref(h.userId), since: h.joinedAt, until: h.leftAt, endedBy: h.endedBy ?? null, note: h.leaveReason ?? null })),
      blocked: blocks.map((b: any) => ({ user: ref(b.userId), since: b.createdAt, note: b.reason ?? null })),
    },
  })
}
