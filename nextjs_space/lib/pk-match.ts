import prisma from '@/lib/db'

/**
 * Birleşik PK ("match") serileştiricisi.
 *
 * Ana backend PKBattle modelini, Flutter'ın beklediği birleşik `/api/pk/*`
 * sözleşmesine (ikinci backend ile aynı alan adları) çevirir.
 *   stream1/user1 → host   |   stream2/user2 → guest
 */

export type PkMatch = {
  id: string
  hostUserId: string
  hostStreamId: string
  hostName: string | null
  hostImage: string | null
  guestUserId: string
  guestStreamId: string
  guestName: string | null
  guestImage: string | null
  status: string
  durationSec: number
  hostScore: number
  guestScore: number
  result: string | null
  winnerUserId: string | null
  finalSprint: boolean
  mode: string
  seatCount: number
  leftScore: number
  rightScore: number
  leftName: string | null
  rightName: string | null
  requestedAt: string | null
  respondedAt: string | null
  startedAt: string | null
  endsAt: string | null
  endedAt: string | null
}

/** PKBattle.status → birleşik PK status */
export function mapPkStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'live'
    case 'completed':
      return 'ended'
    default:
      return status
  }
}

type UserLite = { id: string; name: string | null; image: string | null }

export function serializePkMatch(
  battle: any,
  users: Map<string, UserLite>,
): PkMatch {
  const host = users.get(battle.user1Id) || null
  const guest = users.get(battle.user2Id) || null

  const durationSec = battle.duration || 180
  const startedAt: Date | null = battle.startedAt || battle.acceptedAt || null
  const endsAt: Date | null =
    battle.endsAt || (startedAt ? new Date(new Date(startedAt).getTime() + durationSec * 1000) : null)

  // Son 30 saniyede "final sprint" (çifte puan / vurgulu UI) bayrağı
  const finalSprint =
    battle.status === 'active' && !!endsAt
      ? new Date(endsAt).getTime() - Date.now() <= 30_000
      : false

  let result: string | null = null
  if (battle.status === 'completed') {
    if (battle.isDraw || battle.score1 === battle.score2) result = 'draw'
    else result = battle.score1 > battle.score2 ? 'host' : 'guest'
  }

  return {
    id: battle.id,
    hostUserId: battle.user1Id,
    hostStreamId: battle.stream1Id,
    hostName: host?.name ?? null,
    hostImage: host?.image ?? null,
    guestUserId: battle.user2Id,
    guestStreamId: battle.stream2Id,
    guestName: guest?.name ?? null,
    guestImage: guest?.image ?? null,
    status: mapPkStatus(battle.status),
    durationSec,
    hostScore: battle.score1 || 0,
    guestScore: battle.score2 || 0,
    result,
    winnerUserId: battle.winnerId || null,
    finalSprint,
    mode: '1v1',
    seatCount: 2,
    leftScore: battle.score1 || 0,
    rightScore: battle.score2 || 0,
    leftName: host?.name ?? null,
    rightName: guest?.name ?? null,
    requestedAt: battle.createdAt ? new Date(battle.createdAt).toISOString() : null,
    respondedAt: battle.acceptedAt ? new Date(battle.acceptedAt).toISOString() : (battle.startedAt ? new Date(battle.startedAt).toISOString() : null),
    startedAt: startedAt ? new Date(startedAt).toISOString() : null,
    endsAt: endsAt ? new Date(endsAt).toISOString() : null,
    endedAt: battle.endedAt ? new Date(battle.endedAt).toISOString() : null,
  }
}

/** Bir dizi PKBattle için kullanıcı bilgilerini tek sorguda çeker. */
export async function loadPkUsers(battles: any[]): Promise<Map<string, UserLite>> {
  const ids = Array.from(
    new Set(battles.flatMap((b) => [b.user1Id, b.user2Id]).filter(Boolean)),
  )
  if (ids.length === 0) return new Map()
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, image: true },
  })
  return new Map(users.map((u: UserLite) => [u.id, u]))
}

export async function serializePkMatches(battles: any[]): Promise<PkMatch[]> {
  const users = await loadPkUsers(battles)
  return battles.map((b) => serializePkMatch(b, users))
}
