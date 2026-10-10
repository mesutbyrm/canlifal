/**
 * Yayıncı hedef hak edişleri.
 * - Dönem kapanışı: kapanmış (önceki) dönem için her aktif hedef bir kez
 *   değerlendirilir; (targetId, periodStart) benzersiz → tekrar kapatma çift kayıt üretmez.
 * - Ödeme: earned → paying (koşullu) → ajans cüzdanından aktarım (idempotency
 *   anahtarı accrual:<id>) → paid. Hata olursa earned'a döner; aynı anahtar ikinci
 *   kez Jeton aktarmaz.
 */
import prisma from '@/lib/db'
import { computeMembersPerformance, previousPeriod, type TargetPeriod } from '@/lib/agency-performance'
import { transferToUser } from '@/lib/agency-wallet'

export async function closePeriod(agencyId: string, period: TargetPeriod) {
  const range = previousPeriod(period)
  // Dönem içinde geçerli olmuş hedefler (dönem bitmeden önce başlamış, dönem başlamadan bitmemiş).
  const targets = await prisma.broadcasterTarget.findMany({
    where: {
      agencyId,
      period,
      startsAt: { lt: range.end },
      OR: [{ endsAt: null }, { endsAt: { gt: range.start } }],
    },
  })
  // Aynı kullanıcı için dönem içinde birden çok hedef varsa en son başlayanı esas al.
  const latest = new Map<string, (typeof targets)[number]>()
  for (const t of targets) {
    const cur = latest.get(t.userId)
    if (!cur || t.startsAt > cur.startsAt) latest.set(t.userId, t)
  }
  const list0 = Array.from(latest.values())
  // Zaten kapanmış hedefler yeniden hesaplanmaz (tetik sık çalışabilir).
  const done = list0.length
    ? await prisma.broadcasterAccrual.findMany({
        where: { targetId: { in: list0.map((t) => t.id) }, periodStart: range.start },
        select: { targetId: true },
      })
    : []
  const doneIds = new Set(done.map((d) => d.targetId))
  const list = list0.filter((t) => !doneIds.has(t.id))
  if (list.length === 0) return { periodStart: range.start, periodEnd: range.end, created: 0, skipped: list0.length }
  const perf = await computeMembersPerformance(agencyId, list.map((t) => t.userId), range.start, range.end)
  let created = 0
  let skipped = list0.length - list.length
  for (const t of list) {
    const p = perf.get(t.userId)!
    const met = p.verifiedMinutes >= t.targetMinutes && (!t.minDays || p.activeDays >= t.minDays)
    try {
      await prisma.broadcasterAccrual.create({
        data: {
          agencyId,
          userId: t.userId,
          targetId: t.id,
          period,
          periodStart: range.start,
          periodEnd: range.end,
          targetMinutes: t.targetMinutes,
          verifiedMinutes: p.verifiedMinutes,
          activeDays: p.activeDays,
          met,
          bonusJeton: met ? t.bonusJeton : 0,
          status: met ? (t.bonusJeton > 0 ? 'earned' : 'met') : 'not_met',
        },
      })
      created++
    } catch (e: any) {
      if (e?.code === 'P2002') skipped++
      else throw e
    }
  }
  return { periodStart: range.start, periodEnd: range.end, created, skipped }
}

export async function payAccrual(params: { accrualId: string; agencyId: string; actorId: string; actorName: string }) {
  const acc = await prisma.broadcasterAccrual.findUnique({ where: { id: params.accrualId } })
  if (!acc || acc.agencyId !== params.agencyId) return { ok: false as const, status: 404, message: 'Hak ediş bulunamadı' }
  if (acc.status === 'paid') return { ok: true as const, message: 'Zaten ödenmiş' }
  const claimed = await prisma.broadcasterAccrual.updateMany({
    where: { id: acc.id, status: 'earned' },
    data: { status: 'paying' },
  })
  if (claimed.count !== 1) return { ok: false as const, status: 409, message: 'Hak ediş ödenebilir durumda değil' }

  const membership = await prisma.agencyUser.findUnique({ where: { userId: acc.userId }, select: { agencyId: true, isActive: true } })
  const useKey = membership && membership.agencyId === params.agencyId && membership.isActive ? 'transfer_member' : 'transfer_any_user'
  const res = await transferToUser({
    agencyId: params.agencyId,
    targetUserId: acc.userId,
    amount: acc.bonusJeton,
    actorId: params.actorId,
    actorName: params.actorName,
    reason: `Yayın hedefi bonusu (${acc.period})`,
    idempotencyKey: `accrual:${acc.id}`,
    useKey,
  })
  if (res.ok === false) {
    await prisma.broadcasterAccrual.updateMany({ where: { id: acc.id, status: 'paying' }, data: { status: 'earned' } })
    return { ok: false as const, status: 400, message: res.message }
  }
  await prisma.broadcasterAccrual.update({
    where: { id: acc.id },
    data: { status: 'paid', paidTxnId: res.txnId, paidAt: new Date(), paidById: params.actorId },
  })
  return { ok: true as const, message: `${acc.bonusJeton} Jeton bonus ödendi`, txnId: res.txnId }
}

const lastAutoRun = new Map<string, number>()

/**
 * Kapanmış günlük/haftalık/aylık dönemleri otomatik değerlendirir.
 * - `agencyId` verilirse yalnız o ajans (panel açılınca tetiklenir; ajans başına en çok 10 dk'da bir).
 * - Verilmezse aktif hedefi olan tüm ajanslar (cron).
 * İdempotent: aynı dönem iki kez kapatılmaz.
 */
export async function autoClosePeriods(agencyId?: string) {
  if (agencyId) {
    const last = lastAutoRun.get(agencyId) ?? 0
    if (Date.now() - last < 10 * 60 * 1000) return { agencies: 0, created: 0 }
    lastAutoRun.set(agencyId, Date.now())
  }
  let ids: string[]
  if (agencyId) {
    ids = [agencyId]
  } else {
    const rows = await prisma.broadcasterTarget.findMany({
      where: { OR: [{ endsAt: null }, { endsAt: { gt: new Date(Date.now() - 32 * 86400000) } }] },
      select: { agencyId: true },
      distinct: ['agencyId'],
    })
    ids = rows.map((r) => r.agencyId)
  }
  let created = 0
  for (const id of ids) {
    for (const period of ['daily', 'weekly', 'monthly'] as const) {
      try {
        created += (await closePeriod(id, period)).created
      } catch {
        console.warn('[agency-accruals] otomatik dönem kapatma başarısız')
      }
    }
  }
  return { agencies: ids.length, created }
}
