import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/rbac'
import { computeMembersPerformance, giftPerformance, parseRange } from '@/lib/agency-performance'
import { AGENCY_JETON_PRODUCT, agencyIdFromNotes } from '@/lib/agency-purchase'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

const TYPES = ['wallet', 'performance', 'accruals', 'history', 'acceptances', 'purchases'] as const
type ReportType = (typeof TYPES)[number]

/** CSV hücresi: tırnak kaçışı + formül enjeksiyonu koruması (Excel). */
function cell(v: unknown): string {
  let s = v instanceof Date ? v.toISOString() : v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '﻿'
  const cols = Object.keys(rows[0])
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
}

async function agencyNames(ids: string[]) {
  const rows = await prisma.agency.findMany({ where: { id: { in: Array.from(new Set(ids)) } }, select: { id: true, name: true } })
  return new Map(rows.map((r) => [r.id, r.name]))
}
async function userNames(ids: string[]) {
  const rows = await prisma.user.findMany({ where: { id: { in: Array.from(new Set(ids)) } }, select: { id: true, username: true } })
  return new Map(rows.map((r) => [r.id, r.username ?? '']))
}

/**
 * GET /api/admin/agency-management/reports?type=&agencyId=&from=&to=|period=&format=csv|json
 * Ajans raporları — CSV (Excel uyumlu, UTF-8 BOM) veya JSON.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'agency.report.view')
  if (auth instanceof NextResponse) return auth
  const sp = new URL(req.url).searchParams
  const type = sp.get('type') as ReportType
  if (!TYPES.includes(type)) return NextResponse.json({ success: false, error: `type: ${TYPES.join(', ')}` }, { status: 400 })
  const range = parseRange(sp.has('from') || sp.has('period') ? sp : new URLSearchParams({ period: 'monthly' }))
  if ('error' in range) return NextResponse.json({ success: false, error: range.error }, { status: 400 })
  const agencyId = sp.get('agencyId') || undefined
  const dateWhere = { gte: range.from, lt: range.to }
  let rows: Record<string, unknown>[] = []

  if (type === 'wallet') {
    const txns = await prisma.agencyWalletTransaction.findMany({
      where: { ...(agencyId ? { agencyId } : {}), createdAt: dateWhere },
      orderBy: { createdAt: 'desc' },
      take: 20000,
    })
    const an = await agencyNames(txns.map((t) => t.agencyId))
    rows = txns.map((t) => ({
      id: t.id, tarih: t.createdAt, ajans: an.get(t.agencyId) ?? t.agencyId, tur: t.type, yon: t.direction,
      jeton: t.amount, onceki_bakiye: t.balanceBefore, sonraki_bakiye: t.balanceAfter, tl: t.tlAmount ?? '',
      alici: t.targetUserName ?? t.targetUserId ?? '', islemi_yapan: t.actorName ?? '', gerekce: t.reason ?? '',
      referans_turu: t.referenceType ?? '', referans: t.referenceId ?? '',
    }))
  } else if (type === 'performance') {
    if (!agencyId) return NextResponse.json({ success: false, error: 'performance raporu için agencyId gerekli' }, { status: 400 })
    const members = await prisma.agencyUser.findMany({ where: { agencyId }, select: { userId: true, role: true, isActive: true } })
    const ids = members.map((m) => m.userId)
    const perf = await computeMembersPerformance(agencyId, ids, range.from, range.to)
    const gifts = await giftPerformance(agencyId, ids, range.from, range.to)
    const un = await userNames(ids)
    rows = members.map((m) => {
      const p = perf.get(m.userId)!
      const g = gifts.get(m.userId)
      return {
        kullanici: un.get(m.userId) ?? m.userId, rol: m.role, aktif: m.isActive ? 'evet' : 'hayir',
        dogrulanmis_dakika: p.verifiedMinutes, dogrulanmis_saat: Math.round((p.verifiedMinutes / 60) * 10) / 10,
        aktif_gun: p.activeDays, oturum: p.sessionCount, kesintili_oturum: p.interruptedCount,
        hediye_jeton: g?.giftJeton ?? 0, ajans_payi: g?.agencyShare ?? 0,
      }
    })
  } else if (type === 'accruals') {
    const acc = await prisma.broadcasterAccrual.findMany({
      where: { ...(agencyId ? { agencyId } : {}), periodStart: dateWhere },
      orderBy: { periodStart: 'desc' },
      take: 20000,
    })
    const an = await agencyNames(acc.map((a) => a.agencyId))
    const un = await userNames(acc.map((a) => a.userId))
    rows = acc.map((a) => ({
      id: a.id, ajans: an.get(a.agencyId) ?? a.agencyId, kullanici: un.get(a.userId) ?? a.userId, donem: a.period,
      baslangic: a.periodStart, bitis: a.periodEnd, hedef_dakika: a.targetMinutes, gerceklesen_dakika: a.verifiedMinutes,
      aktif_gun: a.activeDays, hedef_tuttu: a.met ? 'evet' : 'hayir', bonus_jeton: a.bonusJeton, durum: a.status,
      odeme_islem: a.paidTxnId ?? '', odeme_tarihi: a.paidAt ?? '',
    }))
  } else if (type === 'history') {
    const h = await prisma.agencyMembershipHistory.findMany({
      where: { ...(agencyId ? { agencyId } : {}), joinedAt: { lt: range.to }, OR: [{ leftAt: null }, { leftAt: { gte: range.from } }] },
      orderBy: { joinedAt: 'desc' },
      take: 20000,
    })
    const an = await agencyNames(h.map((r) => r.agencyId))
    const un = await userNames(h.map((r) => r.userId))
    rows = h.map((r) => ({
      ajans: an.get(r.agencyId) ?? r.agencyId, kullanici: un.get(r.userId) ?? r.userId, rol: r.role, katilim_yolu: r.joinedVia ?? '',
      katilim: r.joinedAt, ayrilis: r.leftAt ?? '', sonlandiran: r.endedBy ?? '', gerekce: r.leaveReason ?? '',
    }))
  } else if (type === 'acceptances') {
    const a = await prisma.agencyPromiseAcceptance.findMany({
      where: { ...(agencyId ? { agencyId } : {}), acceptedAt: dateWhere },
      orderBy: { acceptedAt: 'desc' },
      take: 20000,
    })
    const versions = await prisma.agencyPromiseVersion.findMany({ where: { id: { in: a.map((x) => x.versionId) } }, select: { id: true, version: true, promiseId: true } })
    const promises = await prisma.agencyPromise.findMany({ where: { id: { in: versions.map((v) => v.promiseId) } }, select: { id: true, title: true } })
    const vBy = new Map(versions.map((v) => [v.id, v]))
    const pBy = new Map(promises.map((p) => [p.id, p.title]))
    const an = await agencyNames(a.map((x) => x.agencyId))
    const un = await userNames(a.map((x) => x.userId))
    rows = a.map((x) => ({
      ajans: an.get(x.agencyId) ?? x.agencyId, kullanici: un.get(x.userId) ?? x.userId,
      vaat: pBy.get(vBy.get(x.versionId)?.promiseId ?? '') ?? '', surum: vBy.get(x.versionId)?.version ?? '', kabul_tarihi: x.acceptedAt,
    }))
  } else if (type === 'purchases') {
    const orders = await prisma.paymentNotification.findMany({
      where: { productType: AGENCY_JETON_PRODUCT, createdAt: dateWhere },
      orderBy: { createdAt: 'desc' },
      take: 20000,
    })
    const filtered = orders.filter((o) => !agencyId || agencyIdFromNotes(o.notes) === agencyId)
    const an = await agencyNames(filtered.map((o) => agencyIdFromNotes(o.notes) || ''))
    rows = filtered.map((o: any) => ({
      id: o.id, tarih: o.createdAt, ajans: an.get(agencyIdFromNotes(o.notes) || '') ?? '', odenen_tl: o.amount,
      istenen_jeton: o.requestedAmount ?? '', yuklenen_jeton: o.jetonLoaded ?? '', yontem: o.paymentMethod, durum: o.status,
      islem_tarihi: o.processedAt ?? '',
    }))
  }

  recordAudit({ actorId: auth.user.id, action: 'admin_agency_report_export', targetType: 'report', targetId: type, metadata: { agencyId: agencyId ?? null, from: range.from, to: range.to, rows: rows.length }, ip: getAuditIp(req) }).catch(() => {})

  if (sp.get('format') === 'json') {
    return NextResponse.json({ success: true, data: { type, from: range.from, to: range.to, rows } })
  }
  const file = `ajans-${type}-${range.from.toISOString().slice(0, 10)}_${range.to.toISOString().slice(0, 10)}.csv`
  return new NextResponse(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${file}"`,
      'Cache-Control': 'no-store',
    },
  })
}
