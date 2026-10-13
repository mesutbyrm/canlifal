/**
 * Ajans şüpheli işlem / kötüye kullanım uyarıları — kayıt üretmez, mevcut
 * cüzdan hareketlerinden anlık hesaplanır. Eşikler admin ayarıdır.
 */
import prisma from '@/lib/db'
import { AGENCY_MGMT_KEYS, getAgencyMgmtSetting } from '@/lib/agency-settings'
import { AGENCY_JETON_PRODUCT, agencyIdFromNotes } from '@/lib/agency-purchase'
import { trDateKey } from '@/lib/agency-performance'

export type AgencyAlert = {
  kind: 'large_transfer' | 'repeat_target' | 'new_account' | 'self_dealing' | 'daily_outflow' | 'cancelled_orders'
  severity: 'medium' | 'high'
  agencyId: string
  agencyName: string
  message: string
  at: Date
  refs: string[]
}

export async function computeAgencyAlerts(days = 7): Promise<AgencyAlert[]> {
  const since = new Date(Date.now() - Math.min(90, Math.max(1, days)) * 86400000)
  const large = parseFloat(await getAgencyMgmtSetting(AGENCY_MGMT_KEYS.alertTransferJeton)) || 0
  const dailyMax = parseFloat(await getAgencyMgmtSetting(AGENCY_MGMT_KEYS.alertDailyOutflowJeton)) || 0
  const repeatMin = parseInt(await getAgencyMgmtSetting(AGENCY_MGMT_KEYS.alertRepeatCount), 10) || 0
  const newDays = parseInt(await getAgencyMgmtSetting(AGENCY_MGMT_KEYS.alertNewAccountDays), 10) || 0

  const txns = await prisma.agencyWalletTransaction.findMany({
    where: { type: 'transfer', direction: 'debit', createdAt: { gte: since } },
    select: { id: true, agencyId: true, amount: true, targetUserId: true, targetUserName: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })
  const agencyIds = Array.from(new Set(txns.map((t) => t.agencyId)))
  const agencies = await prisma.agency.findMany({ where: { id: { in: agencyIds } }, select: { id: true, name: true, ownerId: true } })
  const agencyBy = new Map(agencies.map((a) => [a.id, a]))
  const name = (id: string) => agencyBy.get(id)?.name ?? 'Ajans'
  const alerts: AgencyAlert[] = []

  // 1) Tek seferde büyük aktarım
  if (large > 0) {
    for (const t of txns.filter((x) => x.amount >= large)) {
      alerts.push({ kind: 'large_transfer', severity: 'medium', agencyId: t.agencyId, agencyName: name(t.agencyId), message: `Tek aktarım ${Math.round(t.amount)} Jeton → @${t.targetUserName ?? t.targetUserId}`, at: t.createdAt, refs: [t.id] })
    }
  }

  // 2) Aynı güne aynı kullanıcıya çok sayıda aktarım; 5) günlük toplam çıkış
  const perTarget = new Map<string, typeof txns>()
  const perDay = new Map<string, { sum: number; ids: string[]; at: Date }>()
  for (const t of txns) {
    const day = trDateKey(t.createdAt.getTime())
    const k = `${t.agencyId}|${t.targetUserId}|${day}`
    perTarget.set(k, [...(perTarget.get(k) ?? []), t])
    const d = `${t.agencyId}|${day}`
    const cur = perDay.get(d) ?? { sum: 0, ids: [], at: t.createdAt }
    cur.sum += t.amount
    cur.ids.push(t.id)
    perDay.set(d, cur)
  }
  if (repeatMin > 0) {
    Array.from(perTarget.entries()).forEach(([k, list]) => {
      if (list.length < repeatMin) return
      const [agencyId, , day] = k.split('|')
      alerts.push({ kind: 'repeat_target', severity: 'medium', agencyId, agencyName: name(agencyId), message: `${day}: aynı kullanıcıya ${list.length} aktarım (@${list[0].targetUserName ?? list[0].targetUserId})`, at: list[0].createdAt, refs: list.map((x) => x.id) })
    })
  }
  if (dailyMax > 0) {
    Array.from(perDay.entries()).forEach(([k, v]) => {
      if (v.sum < dailyMax) return
      const [agencyId, day] = k.split('|')
      alerts.push({ kind: 'daily_outflow', severity: 'high', agencyId, agencyName: name(agencyId), message: `${day}: günlük toplam çıkış ${Math.round(v.sum)} Jeton`, at: v.at, refs: v.ids })
    })
  }

  // 3) Yeni açılmış hesaba aktarım; 4) ajans sahibi/çalışanına aktarım
  const targetIds = Array.from(new Set(txns.map((t) => t.targetUserId).filter(Boolean))) as string[]
  const users = targetIds.length
    ? await prisma.user.findMany({ where: { id: { in: targetIds } }, select: { id: true, createdAt: true } })
    : []
  const createdBy = new Map(users.map((u) => [u.id, u.createdAt]))
  let staff: { agencyId: string; userId: string }[] = []
  try {
    staff = await prisma.agencyStaffPermission.findMany({ where: { agencyId: { in: agencyIds } }, select: { agencyId: true, userId: true } })
  } catch {
    staff = []
  }
  const managers = await prisma.agencyUser.findMany({
    where: { agencyId: { in: agencyIds }, role: { in: ['owner', 'manager'] } },
    select: { agencyId: true, userId: true },
  })
  const insiders = new Set([...staff, ...managers].map((s) => `${s.agencyId}|${s.userId}`))
  for (const t of txns) {
    if (!t.targetUserId) continue
    const created = createdBy.get(t.targetUserId)
    if (newDays > 0 && created && t.createdAt.getTime() - created.getTime() < newDays * 86400000) {
      alerts.push({ kind: 'new_account', severity: 'medium', agencyId: t.agencyId, agencyName: name(t.agencyId), message: `${newDays} günden yeni hesaba ${Math.round(t.amount)} Jeton (@${t.targetUserName ?? t.targetUserId})`, at: t.createdAt, refs: [t.id] })
    }
    if (agencyBy.get(t.agencyId)?.ownerId === t.targetUserId || insiders.has(`${t.agencyId}|${t.targetUserId}`)) {
      alerts.push({ kind: 'self_dealing', severity: 'high', agencyId: t.agencyId, agencyName: name(t.agencyId), message: `Ajans sahibi/yetkilisine ${Math.round(t.amount)} Jeton aktarım`, at: t.createdAt, refs: [t.id] })
    }
  }

  // 6) Çok sayıda iptal edilen ajans siparişi
  const cancelled = await prisma.paymentNotification.findMany({
    where: { productType: AGENCY_JETON_PRODUCT, status: 'cancelled', createdAt: { gte: since } },
    select: { id: true, notes: true },
    take: 2000,
  }).catch(() => [] as { id: string; notes: string | null }[])
  const byAgency = new Map<string, string[]>()
  for (const c of cancelled) {
    const id = agencyIdFromNotes(c.notes)
    if (id) byAgency.set(id, [...(byAgency.get(id) ?? []), c.id])
  }
  if (byAgency.size) {
    const extra = await prisma.agency.findMany({ where: { id: { in: Array.from(byAgency.keys()) } }, select: { id: true, name: true } })
    const n = new Map(extra.map((a) => [a.id, a.name]))
    Array.from(byAgency.entries()).forEach(([agencyId, ids]) => {
      if (ids.length < 3) return
      alerts.push({ kind: 'cancelled_orders', severity: 'medium', agencyId, agencyName: n.get(agencyId) ?? 'Ajans', message: `${ids.length} toplu Jeton siparişi iptal edildi`, at: since, refs: ids })
    })
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? b.at.getTime() - a.at.getTime() : a.severity === 'high' ? -1 : 1))
}
