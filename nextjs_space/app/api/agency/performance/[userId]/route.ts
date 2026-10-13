import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAgencyPanel } from '@/lib/agency-access'
import { computeUserDetail, giftPerformance, parseRange, targetProgress } from '@/lib/agency-performance'
import { membershipWindows, userMembershipHistory } from '@/lib/agency-membership-history'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agency/performance/{userId}?period=|from=&to=
 * Tek yayıncı: doğrulanmış süre, günlük dağılım, oturumlar (kesinti), hediye,
 * hedef ilerlemesi, hak edişler, üyelik geçmişi, moderasyon kayıtları.
 * Yalnız bu ajansın üyesi olmuş kullanıcılar; veriler üyelik dönemine kırpılır.
 */
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const gate = await requireAgencyPanel(req, 'reports')
  if (gate instanceof NextResponse) return gate
  const agencyId = gate.access.agency.id
  const userId = params.userId
  const range = parseRange(new URL(req.url).searchParams)
  if ('error' in range) return NextResponse.json({ success: false, error: range.error }, { status: 400 })

  const windows = await membershipWindows(agencyId, userId)
  if (windows.length === 0) return NextResponse.json({ success: false, error: 'Bu kullanıcı ajansınızın üyesi olmadı' }, { status: 404 })

  const [user, detail, gifts, targets, history] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, username: true, image: true } }),
    computeUserDetail(agencyId, userId, range.from, range.to),
    giftPerformance(agencyId, [userId], range.from, range.to),
    targetProgress(agencyId, userId),
    userMembershipHistory(userId),
  ])

  let accruals: any[] = []
  try {
    accruals = await prisma.broadcasterAccrual.findMany({
      where: { agencyId, userId },
      orderBy: { periodStart: 'desc' },
      take: 50,
    })
  } catch {
    accruals = []
  }

  // Moderasyon: yalnız üyelik dönemlerindeki kayıtlar; mesaj içeriği/gerekçe metni paylaşılmaz.
  const inWindows = (d: Date) =>
    windows.some((w) => d >= w.start && (!w.end || d <= w.end)) && d >= range.from && d < range.to
  const [warnings, actions] = await Promise.all([
    prisma.userWarning.findMany({
      where: { userId, createdAt: { gte: range.from, lt: range.to } },
      select: { id: true, severity: true, createdAt: true },
      take: 100,
    }),
    prisma.userModerationAction.findMany({
      where: { userId, createdAt: { gte: range.from, lt: range.to } },
      select: { id: true, scope: true, action: true, severity: true, createdAt: true },
      take: 100,
    }),
  ])
  const moderation = [
    ...warnings.filter((w) => inWindows(w.createdAt)).map((w) => ({ id: w.id, kind: 'warning', severity: w.severity, action: 'warn', createdAt: w.createdAt })),
    ...actions.filter((a) => inWindows(a.createdAt)).map((a) => ({ id: a.id, kind: a.scope, severity: a.severity, action: a.action, createdAt: a.createdAt })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const sum = (status: string[]) =>
    accruals.filter((a) => status.includes(a.status)).reduce((s, a) => s + (a.bonusJeton || 0), 0)

  return NextResponse.json({
    success: true,
    data: {
      user,
      from: range.from,
      to: range.to,
      period: range.period,
      summary: detail.summary,
      sessions: detail.sessions.slice(0, 200),
      gifts: gifts.get(userId) ?? { giftJeton: 0, agencyShare: 0, count: 0 },
      targets,
      accruals,
      bonusTotals: { earned: sum(['earned', 'paying']), paid: sum(['paid']), notMet: accruals.filter((a) => a.status === 'not_met').length },
      membershipHistory: history,
      moderation,
    },
  })
}
