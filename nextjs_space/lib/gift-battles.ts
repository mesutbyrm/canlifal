/**
 * Gift battles + gift goals — main-backend helpers.
 *
 * Faz 2 migration: these helpers back the `/api/gifts/battles` and
 * `/api/gifts/goals` routes on the MAIN backend so that the second backend is
 * no longer required for them. The serialized shapes intentionally mirror the
 * second backend's existing response contract 1:1 so the Flutter models
 * (`GiftBattle`, `GiftGoal`) need no change at all.
 *
 * Design notes:
 *  - No writes to `gift/send` and no schema change. Participant scores and goal
 *    progress are DERIVED AT READ TIME from the gifts already recorded by the
 *    main backend (`chat_room_gifts`), combined with any stored value. Nothing
 *    in the existing gift-sending path is modified.
 *  - Expiry (`status`), `secondsLeft` and `winnerId` are computed at read time
 *    as well, so a battle that ran out of time reports as ended without
 *    requiring a background job or a write.
 */
import prisma from '@/lib/db'

export const BATTLE_ALLOWED_DURATIONS = [60, 180, 300, 600] as const
export const BATTLE_DEFAULT_DURATION = 180

/** Last-call window (seconds) — mirrors the second backend's `lastCallActive`. */
const LAST_CALL_SEC = 10

export type SerializedParticipant = {
  rank: number
  participantId: string
  displayName: string
  score: number
  displayScore: string
}

export type SerializedBattle = {
  id: string
  context: string
  contextId: string
  status: string
  durationSec: number
  startedAt: string
  endsAt: string
  secondsLeft: number
  lastCallActive: boolean
  winnerId: string | null
  totalScore: number
  participants: SerializedParticipant[]
}

export type SerializedGoal = {
  id: string
  context: string
  contextId: string
  ownerId: string
  title: string
  targetAmount: number
  currentAmount: number
  status: string
  startedAt: string
  completedAt: string | null
  percent: number
}

type BattleRow = {
  id: string
  context: string
  contextId: string
  createdById: string
  status: string
  durationSec: number
  startedAt: Date
  endsAt: Date
  winnerId: string | null
  totalScore: number
  participants: {
    participantId: string
    displayName: string | null
    score: number
  }[]
}

type GoalRow = {
  id: string
  context: string
  contextId: string
  ownerId: string
  title: string | null
  targetAmount: number
  currentAmount: number
  status: string
  startedAt: Date
  completedAt: Date | null
}

/** Normalise a stored status to the two values the Flutter model understands. */
function normaliseStatus(stored: string, expired: boolean): string {
  const s = (stored || '').toLowerCase()
  if (s === 'cancelled') return 'cancelled'
  if (expired) return 'ended'
  if (s === 'finished' || s === 'ended' || s === 'completed') return 'ended'
  return 'active'
}

function formatScore(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

/**
 * Gifts credited inside a voice room within a time window, grouped by receiver.
 * Read-only aggregation over gifts the main backend already records.
 * Returns an empty map for contexts we cannot attribute per-participant
 * (live streams do not store a per-gift recipient).
 */
async function giftScoresForContext(
  context: string,
  contextId: string,
  from: Date,
  to: Date,
  participantIds: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (!participantIds.length) return out
  if (context !== 'voice_room') return out

  try {
    const rows = await prisma.chatRoomGift.groupBy({
      by: ['recipientId'],
      where: {
        roomId: contextId,
        recipientId: { in: participantIds },
        createdAt: { gte: from, lte: to },
      },
      _sum: { totalPrice: true },
    })
    for (const r of rows) {
      out.set(r.recipientId, r._sum.totalPrice || 0)
    }
  } catch {
    // Aggregation is best-effort: never fail the request because of it.
  }
  return out
}

/** Serialize a battle row into the second backend's exact response shape. */
export async function serializeBattle(row: BattleRow): Promise<SerializedBattle> {
  const now = Date.now()
  const endsAtMs = row.endsAt.getTime()
  const expired = now >= endsAtMs
  const status = normaliseStatus(row.status, expired)
  const secondsLeft = expired ? 0 : Math.max(0, Math.ceil((endsAtMs - now) / 1000))

  const participantIds = row.participants.map(p => p.participantId)
  const derived = await giftScoresForContext(
    row.context,
    row.contextId,
    row.startedAt,
    new Date(Math.min(now, endsAtMs)),
    participantIds
  )

  const scored = row.participants.map(p => ({
    participantId: p.participantId,
    displayName: p.displayName || 'Yarışmacı',
    // Stored score stays authoritative if it is ever written to; the derived
    // value fills the gap without touching the gift-sending path.
    score: Math.max(p.score || 0, derived.get(p.participantId) || 0),
  }))
  scored.sort((a, b) => b.score - a.score)

  const participants: SerializedParticipant[] = scored.map((p, i) => ({
    rank: i + 1,
    participantId: p.participantId,
    displayName: p.displayName,
    score: p.score,
    displayScore: formatScore(p.score),
  }))

  const totalScore = participants.reduce((sum, p) => sum + p.score, 0)

  // Winner: stored value wins; otherwise the leader once the battle is over.
  let winnerId = row.winnerId
  if (!winnerId && status === 'ended' && participants.length) {
    const top = participants[0]
    const tied = participants.filter(p => p.score === top.score).length > 1
    winnerId = tied || top.score <= 0 ? null : top.participantId
  }

  return {
    id: row.id,
    context: row.context,
    contextId: row.contextId,
    status,
    durationSec: row.durationSec,
    startedAt: row.startedAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    secondsLeft,
    lastCallActive: status === 'active' && secondsLeft > 0 && secondsLeft <= LAST_CALL_SEC,
    winnerId: winnerId ?? null,
    totalScore: Math.max(row.totalScore || 0, totalScore),
    participants,
  }
}

/** Serialize a goal row, deriving progress from recorded room gifts. */
export async function serializeGoal(row: GoalRow): Promise<SerializedGoal> {
  const derived = await giftScoresForContext(
    row.context,
    row.contextId,
    row.startedAt,
    row.completedAt ?? new Date(),
    [row.ownerId]
  )
  const currentAmount = Math.max(row.currentAmount || 0, derived.get(row.ownerId) || 0)
  const target = row.targetAmount || 0
  const reached = target > 0 && currentAmount >= target
  const storedStatus = (row.status || 'active').toLowerCase()
  const status =
    storedStatus === 'cancelled'
      ? 'cancelled'
      : storedStatus === 'completed' || reached
        ? 'completed'
        : 'active'

  return {
    id: row.id,
    context: row.context,
    contextId: row.contextId,
    ownerId: row.ownerId,
    title: row.title || 'Hedef',
    targetAmount: target,
    currentAmount,
    status,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    percent: target > 0 ? Math.min(100, Math.round((currentAmount / target) * 100)) : 0,
  }
}

/**
 * Read the `context` / `contextId` pair out of a query string or JSON body,
 * accepting every alias the Flutter client sends (`roomId`, `voiceRoomId`).
 */
export function readContextPair(src: Record<string, any>): {
  context: string | null
  contextId: string | null
} {
  const pick = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = src[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return null
  }
  const contextId = pick('contextId', 'roomId', 'voiceRoomId', 'streamId')
  let context = pick('context', 'contextType', 'roomType')
  if (context === 'voice' || context === 'room') context = 'voice_room'
  if (context === 'stream' || context === 'live') context = 'live_stream'
  return { context, contextId }
}

export function normaliseDuration(raw: any): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return BATTLE_DEFAULT_DURATION
  const allowed = BATTLE_ALLOWED_DURATIONS as readonly number[]
  if (allowed.includes(Math.round(n))) return Math.round(n)
  // Snap to the nearest supported duration instead of rejecting the request.
  return allowed.reduce((best, d) =>
    Math.abs(d - n) < Math.abs(best - n) ? d : best
  , BATTLE_DEFAULT_DURATION)
}
