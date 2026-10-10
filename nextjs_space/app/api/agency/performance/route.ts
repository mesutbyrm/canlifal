import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAgencyPanel } from '@/lib/agency-access'
import { activeTargetWhere, computeMembersPerformance, giftPerformance, parseRange } from '@/lib/agency-performance'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agency/performance?period=daily|weekly|monthly | from=&to=[&former=1]
 * Ajansın üyeleri için doğrulanmış yayın süresi, aktif gün, hediye, hedef durumu.
 * Yalnız bu ajansın verisi; ayrılmış üyeler yalnız üyelik dönemleriyle (former=1).
 */
export async function GET(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'reports')
  if (gate instanceof NextResponse) return gate
  const agencyId = gate.access.agency.id
  const sp = new URL(req.url).searchParams
  const range = parseRange(sp)
  if ('error' in range) return NextResponse.json({ success: false, error: range.error }, { status: 400 })

  const current = await prisma.agencyUser.findMany({
    where: { agencyId },
    select: { userId: true, role: true, isActive: true, joinedAt: true },
  })
  const ids = new Set(current.map((m) => m.userId))
  let formerIds: string[] = []
  if (sp.get('former') === '1') {
    try {
      const rows = await prisma.agencyMembershipHistory.findMany({
        where: { agencyId, leftAt: { gt: range.from }, joinedAt: { lt: range.to } },
        select: { userId: true },
      })
      formerIds = Array.from(new Set(rows.map((r) => r.userId))).filter((id) => !ids.has(id))
    } catch {
      formerIds = []
    }
  }
  const all = [...Array.from(ids), ...formerIds]
  const perf = await computeMembersPerformance(agencyId, all, range.from, range.to)
  const gifts = await giftPerformance(agencyId, all, range.from, range.to)
  let targets: any[] = []
  try {
    targets = await prisma.broadcasterTarget.findMany({ where: { agencyId, userId: { in: all }, ...activeTargetWhere() } })
  } catch {
    targets = []
  }
  const users = await prisma.user.findMany({
    where: { id: { in: all } },
    select: { id: true, name: true, username: true, image: true },
  })
  const byUser = new Map(users.map((u) => [u.id, u]))
  const memberMeta = new Map(current.map((m) => [m.userId, m]))
  const rangeDays = Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86400000))

  const rows = all.map((id) => {
    const p = perf.get(id)!
    const g = gifts.get(id) ?? { giftJeton: 0, agencyShare: 0, count: 0 }
    const meta = memberMeta.get(id)
    // Seçili aralık hedef dönemiyle aynıysa hedefe ulaşma durumu gösterilir.
    const t = targets.find((x) => x.userId === id && x.period === range.period)
    return {
      user: byUser.get(id) ?? { id, name: null, username: null, image: null },
      status: meta ? (meta.isActive ? 'active' : 'inactive') : 'left',
      role: meta?.role ?? null,
      joinedAt: meta?.joinedAt ?? null,
      verifiedMinutes: p.verifiedMinutes,
      activeDays: p.activeDays,
      sessionCount: p.sessionCount,
      interruptedCount: p.interruptedCount,
      giftJeton: g.giftJeton,
      agencyShare: g.agencyShare,
      target: t ? { targetMinutes: t.targetMinutes, minDays: t.minDays, met: p.verifiedMinutes >= t.targetMinutes && (!t.minDays || p.activeDays >= t.minDays) } : null,
    }
  })
  rows.sort((a, b) => b.verifiedMinutes - a.verifiedMinutes)
  return NextResponse.json({
    success: true,
    data: {
      from: range.from,
      to: range.to,
      period: range.period,
      rangeDays,
      totals: {
        members: rows.filter((r) => r.status !== 'left').length,
        verifiedMinutes: rows.reduce((s, r) => s + r.verifiedMinutes, 0),
        giftJeton: rows.reduce((s, r) => s + r.giftJeton, 0),
        targetsMet: rows.filter((r) => r.target?.met).length,
        targetsTotal: rows.filter((r) => r.target).length,
      },
      members: rows,
    },
  })
}
