export function parseTargetArrows(value: unknown): 1 | 2 | 3 | null {
  if (value === undefined || value === null) return 1
  return value === 1 || value === 2 || value === 3 ? value : null
}

// Pure round transition. Total gift scores never reset; only round baselines move.
export function advancePkRound(b: any, reason: string, now: Date) {
  const target = parseTargetArrows(b.targetArrows) || 1
  const roundScore1 = b.score1 - (b.roundStartScore1 || 0)
  const roundScore2 = b.score2 - (b.roundStartScore2 || 0)
  const timed = reason === 'TIME_UP'
  const side = roundScore1 > roundScore2 ? 1 : roundScore2 > roundScore1 ? 2 : null
  const arrows1 = (b.arrows1 || 0) + (timed && side === 1 ? 1 : 0)
  const arrows2 = (b.arrows2 || 0) + (timed && side === 2 ? 1 : 0)
  const reached = arrows1 >= target || arrows2 >= target
  const continueSeries = timed && !reached && !(target === 1 && side === null)
  const winnerSide = reached ? (arrows1 >= target ? 1 : 2) : null
  const roundNumber = b.roundNumber || 1
  const history = Array.isArray(b.roundHistory) ? b.roundHistory : []
  const roundHistory = [...history, { round: roundNumber, score1: roundScore1, score2: roundScore2,
    winnerSide: timed ? side : null, reason, endedAt: now.toISOString() }]
  return {
    arrows1, arrows2, roundHistory, endReason: continueSeries ? null : reason,
    ...(continueSeries ? { status: 'active', roundNumber: roundNumber + 1,
      roundStartScore1: b.score1, roundStartScore2: b.score2,
      roundStartedAt: now, endsAt: new Date(now.getTime() + b.duration * 1000) } : {
      status: 'completed', endedAt: now, winnerSide,
      winnerId: winnerSide === 1 ? b.user1Id : winnerSide === 2 ? b.user2Id : null,
      isDraw: timed && side === null && target === 1,
    }),
  }
}

export function pkSeriesFields(b: any) {
  return { targetArrows: b.targetArrows || 1, arrows1: b.arrows1 || 0, arrows2: b.arrows2 || 0,
    roundNumber: b.roundNumber || 1, roundStartScore1: b.roundStartScore1 || 0,
    roundStartScore2: b.roundStartScore2 || 0, roundStartedAt: b.roundStartedAt || b.startedAt,
    roundHistory: b.roundHistory || [], endReason: b.endReason || null }
}
