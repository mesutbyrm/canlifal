import prisma from '@/lib/db'
import { loadPkUsers } from '@/lib/pk-match'

export async function computePkStatsForUser(userId: string) {
  const battles = await prisma.pKBattle.findMany({
    where: {
      status: 'completed',
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    select: {
      user1Id: true,
      user2Id: true,
      winnerId: true,
      isDraw: true,
      score1: true,
      score2: true,
    },
  })

  let wins = 0
  let losses = 0
  let draws = 0
  let totalScore = 0
  let bestScore = 0

  for (const battle of battles) {
    const isHost = battle.user1Id === userId
    const score = isHost ? battle.score1 || 0 : battle.score2 || 0
    totalScore += score
    if (score > bestScore) bestScore = score
    if (battle.isDraw || !battle.winnerId) draws++
    else if (battle.winnerId === userId) wins++
    else losses++
  }

  const total = wins + losses + draws
  const winRate = total === 0 ? 0 : Math.round((wins / total) * 100)
  return { wins, losses, draws, totalScore, bestScore, streak: 0, winRate }
}

export async function listPkHistoryForUser(userId: string, page: number, limit: number) {
  const skip = Math.max(0, (page - 1) * limit)
  const take = Math.min(50, Math.max(1, limit))
  const battles = await prisma.pKBattle.findMany({
    where: { status: 'completed', OR: [{ user1Id: userId }, { user2Id: userId }] },
    orderBy: { endedAt: 'desc' },
    skip,
    take,
  })
  const users = await loadPkUsers(battles)
  return battles.map((battle) => {
    const isHost = battle.user1Id === userId
    const opponentId = isHost ? battle.user2Id : battle.user1Id
    const opponent = users.get(opponentId)
    const myScore = isHost ? battle.score1 || 0 : battle.score2 || 0
    const opponentScore = isHost ? battle.score2 || 0 : battle.score1 || 0
    let result = 'draw'
    if (battle.winnerId === userId) result = 'win'
    else if (battle.winnerId && battle.winnerId !== userId) result = 'loss'
    const endedAt = battle.endedAt ? new Date(battle.endedAt).toISOString() : null
    return {
      id: battle.id,
      matchId: battle.id,
      result,
      mode: battle.mode || '1v1',
      opponentName: opponent?.name ?? null,
      myScore,
      opponentScore,
      coins: myScore,
      durationSec: battle.duration || 0,
      at: endedAt,
      createdAt: endedAt,
      endedAt,
    }
  })
}
