/**
 * Doğrulanmış yayın süresi (yalnız VİDEO yayını — ürün kararı K6).
 *
 * Kaynak: VideoStream (startedAt, endedAt, lastMediaAt, autoClosedAt).
 * - Görsel modlu yayın (isImageMode) sayılmaz.
 * - Bitiş = endedAt; yoksa (yayın sürüyor) son medya sinyali, o da yoksa şimdi.
 * - Yayın açık kalıp medya kesilmişse (lastMediaAt, bitişten MEDIA_GRACE_MS'den
 *   eski) süre son medya sinyali + tolerans ile biter → boş yayın sayılmaz.
 * - Aralıklar ajans üyelik dönemlerine ve istenen tarih aralığına kırpılır;
 *   çakışan oturumlar birleştirilir (aynı dakika iki kez sayılmaz).
 * - Gün sınırları Türkiye saati (UTC+3) ile hesaplanır.
 */
import prisma from '@/lib/db'
import { membershipWindows, type MembershipWindow } from '@/lib/agency-membership-history'

export const MEDIA_GRACE_MS = 2 * 60 * 1000
const TR_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export type Interval = { start: number; end: number }
export type TargetPeriod = 'daily' | 'weekly' | 'monthly'

type StreamRow = {
  id: string
  userId: string
  title: string | null
  status: string
  startedAt: Date
  endedAt: Date | null
  lastMediaAt: Date | null
  autoClosedAt: Date | null
}

/** Bir yayının doğrulanmış aralığı ve kesinti bilgisi. */
export function streamInterval(s: StreamRow, now = Date.now()): { interval: Interval | null; interrupted: boolean } {
  const start = s.startedAt.getTime()
  let end: number
  if (s.endedAt) end = s.endedAt.getTime()
  else if (s.status === 'live') end = s.lastMediaAt ? Math.min(now, s.lastMediaAt.getTime() + MEDIA_GRACE_MS) : now
  else end = s.lastMediaAt ? s.lastMediaAt.getTime() : start
  let interrupted = !!s.autoClosedAt
  if (s.lastMediaAt) {
    const media = s.lastMediaAt.getTime() + MEDIA_GRACE_MS
    if (media < end) {
      end = Math.max(start, media)
      interrupted = true
    }
  }
  end = Math.min(end, now)
  return { interval: end > start ? { start, end } : null, interrupted }
}

/** Çakışan/bitişik aralıkları birleştirir (sweep). */
export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = list.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start)
  const out: Interval[] = []
  for (const i of sorted) {
    const last = out[out.length - 1]
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end)
    else out.push({ ...i })
  }
  return out
}

/** Aralıkları pencerelerle kesiştirir. */
export function clipToWindows(list: Interval[], windows: Interval[]): Interval[] {
  const out: Interval[] = []
  for (const i of list) {
    for (const w of windows) {
      const start = Math.max(i.start, w.start)
      const end = Math.min(i.end, w.end)
      if (end > start) out.push({ start, end })
    }
  }
  return out
}

export function totalMinutes(list: Interval[]): number {
  return Math.floor(list.reduce((sum, i) => sum + (i.end - i.start), 0) / 60000)
}

/** Türkiye saatine göre YYYY-MM-DD. */
export function trDateKey(ms: number): string {
  return new Date(ms + TR_OFFSET_MS).toISOString().slice(0, 10)
}

/** Günlere bölünmüş dakika dağılımı (birleştirilmiş aralıklardan). */
export function dailyMinutes(merged: Interval[]): Map<string, number> {
  const ms = new Map<string, number>()
  for (const i of merged) {
    let cur = i.start
    while (cur < i.end) {
      const dayStartTr = Math.floor((cur + TR_OFFSET_MS) / DAY_MS) * DAY_MS - TR_OFFSET_MS
      const segEnd = Math.min(i.end, dayStartTr + DAY_MS)
      const key = trDateKey(cur)
      ms.set(key, (ms.get(key) ?? 0) + (segEnd - cur))
      cur = segEnd
    }
  }
  const out = new Map<string, number>()
  Array.from(ms.entries()).forEach(([k, v]) => out.set(k, Math.floor(v / 60000)))
  return out
}

/** Dönem sınırları (Türkiye saati): gün, hafta (Pazartesi), ay. */
export function periodRange(period: TargetPeriod, ref = new Date()): { start: Date; end: Date } {
  const tr = new Date(ref.getTime() + TR_OFFSET_MS)
  const y = tr.getUTCFullYear()
  const m = tr.getUTCMonth()
  const d = tr.getUTCDate()
  let startTr: number
  let endTr: number
  if (period === 'daily') {
    startTr = Date.UTC(y, m, d)
    endTr = startTr + DAY_MS
  } else if (period === 'weekly') {
    const dow = (tr.getUTCDay() + 6) % 7 // Pazartesi = 0
    startTr = Date.UTC(y, m, d) - dow * DAY_MS
    endTr = startTr + 7 * DAY_MS
  } else {
    startTr = Date.UTC(y, m, 1)
    endTr = Date.UTC(y, m + 1, 1)
  }
  return { start: new Date(startTr - TR_OFFSET_MS), end: new Date(endTr - TR_OFFSET_MS) }
}

/** Bir önceki (kapanmış) dönem. */
export function previousPeriod(period: TargetPeriod, ref = new Date()) {
  const cur = periodRange(period, ref)
  return periodRange(period, new Date(cur.start.getTime() - 1))
}

function windowsToIntervals(windows: MembershipWindow[], now: number): Interval[] {
  return windows.map((w) => ({ start: w.start.getTime(), end: w.end ? w.end.getTime() : now }))
}

/** Aktif hedef: bitiş yok ya da bitiş gelecekte (vaat bitiş tarihli olabilir). */
export function activeTargetWhere(now = new Date()) {
  return { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
}

const STREAM_SELECT = {
  id: true,
  userId: true,
  title: true,
  status: true,
  startedAt: true,
  endedAt: true,
  lastMediaAt: true,
  autoClosedAt: true,
} as const

async function streamsFor(userIds: string[], from: Date, to: Date): Promise<StreamRow[]> {
  if (userIds.length === 0) return []
  return prisma.videoStream.findMany({
    where: {
      userId: { in: userIds },
      isImageMode: false,
      startedAt: { lt: to },
      OR: [{ endedAt: null }, { endedAt: { gt: from } }],
    },
    select: STREAM_SELECT,
    orderBy: { startedAt: 'asc' },
    take: 5000,
  }) as unknown as StreamRow[]
}

export type UserPerformance = {
  userId: string
  verifiedMinutes: number
  activeDays: number
  sessionCount: number
  interruptedCount: number
  daily: { date: string; minutes: number }[]
}

/** Çoklu üye özet (ajans paneli listesi). */
export async function computeMembersPerformance(
  agencyId: string,
  userIds: string[],
  from: Date,
  to: Date,
): Promise<Map<string, UserPerformance>> {
  const now = Date.now()
  const range: Interval = { start: from.getTime(), end: Math.min(to.getTime(), now) }
  const streams = await streamsFor(userIds, from, to)
  const byUser = new Map<string, StreamRow[]>()
  for (const s of streams) {
    const arr = byUser.get(s.userId) ?? []
    arr.push(s)
    byUser.set(s.userId, arr)
  }
  const out = new Map<string, UserPerformance>()
  for (const userId of userIds) {
    const windows = windowsToIntervals(await membershipWindows(agencyId, userId), now)
    const allowed = clipToWindows([range], windows)
    const rows = byUser.get(userId) ?? []
    let interruptedCount = 0
    const raw: Interval[] = []
    let sessionCount = 0
    for (const s of rows) {
      const { interval, interrupted } = streamInterval(s, now)
      if (!interval) continue
      const clipped = clipToWindows([interval], allowed)
      if (clipped.length === 0) continue
      sessionCount++
      if (interrupted) interruptedCount++
      raw.push(...clipped)
    }
    const merged = mergeIntervals(raw)
    const daily = dailyMinutes(merged)
    out.set(userId, {
      userId,
      verifiedMinutes: totalMinutes(merged),
      activeDays: Array.from(daily.values()).filter((m) => m >= 1).length,
      sessionCount,
      interruptedCount,
      daily: Array.from(daily.entries())
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([date, minutes]) => ({ date, minutes })),
    })
  }
  return out
}

/** Tek yayıncı ayrıntısı: oturumlar (başlangıç/bitiş/kesinti) dahil. */
export async function computeUserDetail(agencyId: string, userId: string, from: Date, to: Date) {
  const now = Date.now()
  const summary = (await computeMembersPerformance(agencyId, [userId], from, to)).get(userId)!
  const windows = windowsToIntervals(await membershipWindows(agencyId, userId), now)
  const allowed = clipToWindows([{ start: from.getTime(), end: Math.min(to.getTime(), now) }], windows)
  const sessions = (await streamsFor([userId], from, to))
    .map((s) => {
      const { interval, interrupted } = streamInterval(s, now)
      const clipped = interval ? clipToWindows([interval], allowed) : []
      return {
        id: s.id,
        title: s.title,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        live: s.status === 'live' && !s.endedAt,
        interrupted,
        countedMinutes: totalMinutes(mergeIntervals(clipped)),
      }
    })
    .filter((s) => s.countedMinutes > 0 || s.live)
    .reverse()
  return { summary, sessions }
}

/** Ajansa bu üye üzerinden gelen hediye performansı (yalnız bu ajansın kayıtları). */
export async function giftPerformance(agencyId: string, userIds: string[], from: Date, to: Date) {
  if (userIds.length === 0) return new Map<string, { giftJeton: number; agencyShare: number; count: number }>()
  const rows = await prisma.agencyEarning.groupBy({
    by: ['userId'],
    where: { agencyId, userId: { in: userIds }, createdAt: { gte: from, lt: to } },
    _sum: { originalAmount: true, amount: true },
    _count: { _all: true },
  })
  return new Map(
    rows.map((r: any) => [
      r.userId as string,
      {
        giftJeton: Math.round(r._sum.originalAmount ?? 0),
        agencyShare: Math.round(r._sum.amount ?? 0),
        count: r._count._all as number,
      },
    ]),
  )
}

/** Aktif hedef(ler)in güncel dönem ilerlemesi. */
export async function targetProgress(agencyId: string, userId: string) {
  let targets: any[] = []
  try {
    targets = await prisma.broadcasterTarget.findMany({
      where: { agencyId, userId, ...activeTargetWhere() },
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    targets = []
  }
  const out = []
  for (const t of targets) {
    const range = periodRange(t.period as TargetPeriod)
    const perf = (await computeMembersPerformance(agencyId, [userId], range.start, range.end)).get(userId)!
    const minutesOk = perf.verifiedMinutes >= t.targetMinutes
    const daysOk = !t.minDays || perf.activeDays >= t.minDays
    out.push({
      id: t.id,
      period: t.period,
      targetMinutes: t.targetMinutes,
      minDays: t.minDays,
      bonusJeton: t.bonusJeton,
      promiseVersionId: t.promiseVersionId,
      periodStart: range.start,
      periodEnd: range.end,
      verifiedMinutes: perf.verifiedMinutes,
      activeDays: perf.activeDays,
      remainingMinutes: Math.max(0, t.targetMinutes - perf.verifiedMinutes),
      met: minutesOk && daysOk,
    })
  }
  return out
}

/**
 * İstekten tarih aralığı: ?period=daily|weekly|monthly (güncel dönem) ya da
 * ?from=&to= (ISO). En fazla 92 gün. Varsayılan: bu hafta.
 */
export function parseRange(sp: URLSearchParams): { from: Date; to: Date; period: string } | { error: string } {
  const period = sp.get('period')
  if (period === 'daily' || period === 'weekly' || period === 'monthly') {
    const r = periodRange(period)
    return { from: r.start, to: r.end, period }
  }
  const f = sp.get('from')
  const t = sp.get('to')
  if (f || t) {
    const from = new Date(f || '')
    const to = new Date(t || '')
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) return { error: 'Geçersiz tarih aralığı' }
    if (to.getTime() - from.getTime() > 92 * DAY_MS) return { error: 'Tarih aralığı en fazla 92 gün olabilir' }
    return { from, to, period: 'custom' }
  }
  const r = periodRange('weekly')
  return { from: r.start, to: r.end, period: 'weekly' }
}
