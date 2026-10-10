import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'
import { periodRange, computeMembersPerformance, targetProgress } from '@/lib/agency-performance'
import { userMembershipHistory } from '@/lib/agency-membership-history'
import { publishedPromises, versionView } from '@/lib/agency-promises'
import { AUTO_LEAVE_DAYS } from '@/lib/agency-auto-leave'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agency/broadcaster — yayıncı paneli (kendi verisi).
 * Ajans + üyelik durumu, yayımlanmış vaatler ve kabul durumu, hedefler ve
 * ilerleme, gün/hafta/ay doğrulanmış yayın süresi, hak edişler, duyurular,
 * davet/başvuru/ayrılma geçmişi ve ayrılma kuralları.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.user.id

  const membership = await prisma.agencyUser.findUnique({
    where: { userId },
    select: {
      role: true,
      isActive: true,
      joinedAt: true,
      joinedVia: true,
      agency: { select: { id: true, name: true, logoUrl: true, level: true, status: true, ownerId: true } },
    },
  })

  const [history, invites, joinRequests] = await Promise.all([
    userMembershipHistory(userId),
    prisma.agencyMemberInvite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, status: true, createdAt: true, respondedAt: true, agency: { select: { id: true, name: true } } },
    }),
    prisma.agencyJoinRequest
      .findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 })
      .catch(() => [] as any[]),
  ])
  const jrAgencies = await prisma.agency.findMany({
    where: { id: { in: joinRequests.map((r: any) => r.agencyId) } },
    select: { id: true, name: true },
  })
  const jrName = new Map(jrAgencies.map((a) => [a.id, a.name]))

  const rules = {
    singleAgency: 'Aynı anda yalnız bir ajansa üye olabilirsiniz. Başka ajansa geçmek için önce ayrılmanız gerekir.',
    leave: `Ayrılma talebi ajansa iletilir; ${AUTO_LEAVE_DAYS} gün içinde yanıtlanmazsa otomatik onaylanır.`,
    rights: 'Ayrıldığınızda geçmiş üyelik ve kazanılmış hak ediş kayıtlarınız silinmez.',
    measurement: 'Yayın süresi yalnız doğrulanmış canlı video yayınından hesaplanır; çakışan yayınlar tek sayılır.',
  }

  const base = {
    history,
    invites: invites.map((i) => ({ id: i.id, status: i.status, createdAt: i.createdAt, respondedAt: i.respondedAt, agency: i.agency })),
    joinRequests: joinRequests.map((r: any) => ({
      id: r.id,
      agencyId: r.agencyId,
      agencyName: jrName.get(r.agencyId) ?? 'Ajans',
      status: r.status,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
    })),
    rules,
  }

  if (!membership || !membership.isActive) {
    return NextResponse.json({ success: true, data: { membership: null, ...base } })
  }
  const agencyId = membership.agency.id

  const [published, acceptances, targets, announcements, pendingLeave] = await Promise.all([
    publishedPromises(agencyId),
    prisma.agencyPromiseAcceptance.findMany({ where: { userId, agencyId }, orderBy: { acceptedAt: 'desc' } }).catch(() => [] as any[]),
    targetProgress(agencyId, userId),
    prisma.agencyAnnouncement
      .findMany({ where: { agencyId, deletedAt: null }, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }], take: 20 })
      .catch(() => [] as any[]),
    prisma.agencyLeaveRequest.findFirst({ where: { userId, agencyId, status: 'pending' }, select: { id: true, createdAt: true } }),
  ])
  let accruals: any[] = []
  try {
    accruals = await prisma.broadcasterAccrual.findMany({ where: { userId, agencyId }, orderBy: { periodStart: 'desc' }, take: 30 })
  } catch {
    accruals = []
  }

  // Kabul edilen sürümler (geçmiş dahil) — vaat başlıklarıyla.
  const acceptedVersionIds = Array.from(new Set(acceptances.map((a: any) => a.versionId)))
  const acceptedVersions = acceptedVersionIds.length
    ? await prisma.agencyPromiseVersion.findMany({ where: { id: { in: acceptedVersionIds } } })
    : []
  const promiseTitles = acceptedVersions.length
    ? await prisma.agencyPromise.findMany({ where: { id: { in: acceptedVersions.map((v) => v.promiseId) } }, select: { id: true, title: true, status: true } })
    : []
  const titleBy = new Map(promiseTitles.map((p) => [p.id, p]))

  const promises = published.map((p) => {
    const mine = acceptances.find((a: any) => a.versionId === p.version.id)
    const olderAccepted = acceptances.find((a: any) => a.promiseId === p.promiseId && a.versionId !== p.version.id)
    return {
      title: p.title,
      ...versionView(p.version),
      acceptedAt: mine?.acceptedAt ?? null,
      // Yeni sürüm yeniden kabul istiyorsa ve güncel sürüm kabul edilmemişse.
      needsAcceptance: !mine,
      previouslyAcceptedVersion: olderAccepted ? acceptedVersions.find((v) => v.id === olderAccepted.versionId)?.version ?? null : null,
    }
  })

  const ranges = (['daily', 'weekly', 'monthly'] as const).map((p) => ({ p, r: periodRange(p) }))
  const totals: Record<string, { verifiedMinutes: number; activeDays: number }> = {}
  for (const { p, r } of ranges) {
    const perf = (await computeMembersPerformance(agencyId, [userId], r.start, r.end)).get(userId)!
    totals[p] = { verifiedMinutes: perf.verifiedMinutes, activeDays: perf.activeDays }
  }

  return NextResponse.json({
    success: true,
    data: {
      membership: {
        agency: { id: agencyId, name: membership.agency.name, logoUrl: membership.agency.logoUrl, level: membership.agency.level },
        role: membership.role,
        joinedAt: membership.joinedAt,
        joinedVia: membership.joinedVia,
        isOwner: membership.agency.ownerId === userId,
        pendingLeaveRequest: pendingLeave,
      },
      totals,
      targets,
      promises,
      acceptedHistory: acceptances.map((a: any) => {
        const v = acceptedVersions.find((x) => x.id === a.versionId)
        const p = v ? titleBy.get(v.promiseId) : null
        return { versionId: a.versionId, title: p?.title ?? 'Vaat', version: v?.version ?? null, promiseStatus: p?.status ?? null, acceptedAt: a.acceptedAt }
      }),
      accruals,
      bonusTotals: {
        earned: accruals.filter((a) => a.status === 'earned' || a.status === 'paying').reduce((s, a) => s + a.bonusJeton, 0),
        paid: accruals.filter((a) => a.status === 'paid').reduce((s, a) => s + a.bonusJeton, 0),
      },
      announcements,
      ...base,
    },
  })
}
