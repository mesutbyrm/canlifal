import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { discoveryCards } from '@/lib/agency-discovery'
import { publishedPromises, versionView } from '@/lib/agency-promises'

export const dynamic = 'force-dynamic'

/** GET /api/agencies/{id} — ajans detayı, yayımlanmış vaatler, kullanıcının ilişkisi. */
export async function GET(req: NextRequest, { params }: { params: { agencyId: string } }) {
  const card = (await discoveryCards()).find((c) => c.id === params.agencyId)
  if (!card) return NextResponse.json({ success: false, error: 'Ajans bulunamadı' }, { status: 404 })

  const agency = await prisma.agency.findUnique({
    where: { id: card.id },
    select: { ownerId: true, ownerName: true, invitesDisabled: true, approvedAt: true },
  })
  const owner = agency
    ? await prisma.user.findUnique({ where: { id: agency.ownerId }, select: { id: true, name: true, username: true, image: true } })
    : null
  const members = await prisma.agencyUser.findMany({
    where: { agencyId: card.id, isActive: true },
    select: { role: true, user: { select: { id: true, name: true, username: true, image: true } } },
    orderBy: { joinedAt: 'asc' },
    take: 12,
  })
  const promises = (await publishedPromises(card.id)).map((p) => ({ title: p.title, ...versionView(p.version) }))

  // Kullanıcının bu ajansla ilişkisi (oturum varsa).
  let relation: Record<string, unknown> = { loggedIn: false }
  const user = await resolveUser(req)
  if (user) {
    const membership = await prisma.agencyUser.findUnique({ where: { userId: user.id }, select: { agencyId: true, isActive: true } })
    let pendingRequestId: string | null = null
    try {
      const jr = await prisma.agencyJoinRequest.findFirst({
        where: { agencyId: card.id, userId: user.id, status: 'pending' },
        select: { id: true },
      })
      pendingRequestId = jr?.id ?? null
    } catch {
      pendingRequestId = null
    }
    const invite = await prisma.agencyMemberInvite.findFirst({
      where: { agencyId: card.id, userId: user.id, status: 'pending' },
      select: { id: true },
    })
    relation = {
      loggedIn: true,
      isMember: membership?.agencyId === card.id && membership.isActive,
      inOtherAgency: !!membership && membership.agencyId !== card.id,
      pendingRequestId,
      pendingInviteId: invite?.id ?? null,
      canApply: !membership && !pendingRequestId && !agency?.invitesDisabled,
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      agency: { ...card, approvedAt: agency?.approvedAt ?? null, acceptsApplications: !agency?.invitesDisabled },
      owner: owner ? { id: owner.id, name: owner.name, username: owner.username, image: owner.image } : null,
      members: members.map((m) => ({ ...m.user, role: m.role })),
      promises,
      relation,
    },
  })
}
