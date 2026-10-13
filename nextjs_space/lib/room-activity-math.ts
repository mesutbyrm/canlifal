export interface ActivitySpan { userId: string; visitId: string; seatIndex: number; startedAt: Date; lastSeenAt: Date; endedAt: Date | null }
export const ACTIVITY_TTL_MS = 60_000
export function spanEnd(span: ActivitySpan, now: Date) {
  return new Date(Math.max(span.startedAt.getTime(), Math.min(now.getTime(), span.endedAt?.getTime() ?? span.lastSeenAt.getTime() + ACTIVITY_TTL_MS)))
}
export function activityTotals(spans: ActivitySpan[], from: Date, to: Date) {
  const visits = new Set<string>(), users = new Set<string>(), seats: Record<string, number> = {}
  let dwell = 0, seated = 0
  for (const span of spans) {
    const start = Math.max(span.startedAt.getTime(), from.getTime())
    const end = Math.min(spanEnd(span, to).getTime(), to.getTime())
    if (end < start) continue
    visits.add(span.visitId); users.add(span.userId)
    const seconds = Math.max(0, end - start) / 1000
    dwell += seconds
    if (span.seatIndex >= 0) { seated += seconds; seats[span.seatIndex] = (seats[span.seatIndex] || 0) + seconds }
  }
  return { totalVisits: visits.size, uniqueVisitors: users.size, returnVisits: Math.max(0, visits.size - users.size),
    totalDwellSeconds: Math.round(dwell), seatSeconds: Math.round(seated),
    avgDwellSeconds: visits.size ? Math.round(dwell / visits.size) : null,
    seats: Object.fromEntries(Object.entries(seats).map(([k,v]) => [k,Math.round(v)])) }
}
