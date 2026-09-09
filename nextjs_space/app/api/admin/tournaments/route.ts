import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import {
  transitionTournament,
  validateTournamentData,
  snapshotRanks,
  type TournamentStatus,
} from '@/lib/tournament-state'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici']

async function requireAdmin(req?: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!role || !ADMIN_ROLES.includes(role)) return null
  return (session?.user as any)?.id as string
}

/**
 * GET /api/admin/tournaments
 * Tüm turnuvaları listeler (sayfalama + filtre).
 */
export async function GET(req: NextRequest) {
  const adminId = await requireAdmin(req)
  if (!adminId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || undefined
  const category = url.searchParams.get('category') || undefined
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))

  const where: any = {}
  if (status) where.status = status
  if (category) where.category = category

  const [total, tournaments] = await Promise.all([
    prisma.weeklyTournament.count({ where }),
    prisma.weeklyTournament.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { entries: true, rounds: true } },
      },
    }),
  ])

  return NextResponse.json({
    tournaments: tournaments.map((t) => ({
      ...t,
      rewards: t.rewards ? JSON.parse(t.rewards) : [],
      entryCount: (t as any)._count?.entries ?? 0,
      roundCount: (t as any)._count?.rounds ?? 0,
    })),
    total,
    page,
    pageCount: Math.ceil(total / limit),
  })
}

/**
 * POST /api/admin/tournaments
 * Yeni turnuva oluşturur VEYA mevcut turnuvada işlem yapar.
 *
 * Gövde işlemi: `action` alanına göre.
 * - action yok / "create" → oluştur
 * - action: "update" → güncelle (id gerekli)
 * - action: "transition" → durum değiştir (id + newStatus gerekli)
 * - action: "delete" → sil (id gerekli, yalnız draft/cancelled)
 * - action: "add_round" → round ekle (id gerekli)
 * - action: "update_match" → maç güncelle (matchId gerekli)
 * - action: "reward" → ödül dağıt (id gerekli, yalnız completed)
 */
export async function POST(req: NextRequest) {
  const adminId = await requireAdmin(req)
  if (!adminId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const body = await req.json()
  const action = body.action || 'create'

  try {
    switch (action) {
      // ────── CREATE ──────
      case 'create': {
        const err = validateTournamentData(body)
        if (err) return NextResponse.json({ error: err }, { status: 400 })

        const tournament = await prisma.weeklyTournament.create({
          data: {
            title: body.title.trim(),
            description: body.description?.trim() || null,
            weekStart: new Date(body.weekStart),
            weekEnd: new Date(body.weekEnd),
            type: body.type || 'jeton_spend',
            status: body.status || 'draft',
            category: body.category || 'general',
            coverImage: body.coverImage || null,
            registrationStart: body.registrationStart ? new Date(body.registrationStart) : null,
            registrationEnd: body.registrationEnd ? new Date(body.registrationEnd) : null,
            minParticipants: body.minParticipants ? parseInt(body.minParticipants) : null,
            maxParticipants: body.maxParticipants ? parseInt(body.maxParticipants) : null,
            visibility: body.visibility || 'public',
            scoringType: body.scoringType || 'cumulative',
            eliminationType: body.eliminationType || 'none',
            roundCount: body.roundCount ? parseInt(body.roundCount) : 1,
            rewards: body.rewards ? JSON.stringify(body.rewards) : null,
            createdBy: adminId,
          },
        })
        return NextResponse.json({ success: true, tournament })
      }

      // ────── UPDATE ──────
      case 'update': {
        if (!body.id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
        const existing = await prisma.weeklyTournament.findUnique({ where: { id: body.id } })
        if (!existing) return NextResponse.json({ error: 'Turnuva bulunamadı' }, { status: 404 })

        const data: any = {}
        const fields = [
          'title', 'description', 'coverImage', 'category', 'type',
          'visibility', 'scoringType', 'eliminationType', 'rewards',
        ]
        for (const f of fields) {
          if (body[f] !== undefined) data[f] = f === 'rewards' ? JSON.stringify(body[f]) : body[f]
        }
        const dateFields = ['weekStart', 'weekEnd', 'registrationStart', 'registrationEnd']
        for (const f of dateFields) {
          if (body[f] !== undefined) data[f] = body[f] ? new Date(body[f]) : null
        }
        const intFields = ['minParticipants', 'maxParticipants', 'roundCount']
        for (const f of intFields) {
          if (body[f] !== undefined) data[f] = body[f] ? parseInt(body[f]) : null
        }

        const updated = await prisma.weeklyTournament.update({ where: { id: body.id }, data })
        return NextResponse.json({ success: true, tournament: updated })
      }

      // ────── TRANSITION ──────
      case 'transition': {
        if (!body.id || !body.newStatus) {
          return NextResponse.json({ error: 'id ve newStatus gerekli' }, { status: 400 })
        }
        // completed geçişi sırasında sıralamaları yaz
        if (body.newStatus === 'completed') {
          await transitionTournament(body.id, 'completed' as TournamentStatus)
          await snapshotRanks(body.id)
          const t = await prisma.weeklyTournament.findUnique({ where: { id: body.id } })
          return NextResponse.json({ success: true, tournament: t })
        }
        const t = await transitionTournament(body.id, body.newStatus as TournamentStatus)
        if (!t) return NextResponse.json({ error: 'Geçiş başarısız' }, { status: 409 })
        return NextResponse.json({ success: true, tournament: t })
      }

      // ────── DELETE ──────
      case 'delete': {
        if (!body.id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
        const t = await prisma.weeklyTournament.findUnique({ where: { id: body.id } })
        if (!t) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })
        if (!['draft', 'cancelled'].includes(t.status)) {
          return NextResponse.json({ error: 'Yalnız draft veya cancelled durumundaki turnuvalar silinebilir' }, { status: 400 })
        }
        await prisma.weeklyTournament.delete({ where: { id: body.id } })
        return NextResponse.json({ success: true })
      }

      // ────── ADD ROUND ──────
      case 'add_round': {
        if (!body.id) return NextResponse.json({ error: 'turnuva id gerekli' }, { status: 400 })
        const lastRound = await prisma.tournamentRound.findFirst({
          where: { tournamentId: body.id },
          orderBy: { roundNumber: 'desc' },
        })
        const nextNum = (lastRound?.roundNumber ?? 0) + 1
        const round = await prisma.tournamentRound.create({
          data: {
            tournamentId: body.id,
            roundNumber: nextNum,
            name: body.name || `Round ${nextNum}`,
            stage: body.stage || null,
            startDate: body.startDate ? new Date(body.startDate) : null,
            endDate: body.endDate ? new Date(body.endDate) : null,
          },
        })
        return NextResponse.json({ success: true, round })
      }

      // ────── ADD MATCH (bir round'a maç ekle) ──────
      case 'add_match': {
        if (!body.roundId) return NextResponse.json({ error: 'roundId gerekli' }, { status: 400 })
        const lastMatch = await prisma.tournamentMatch.findFirst({
          where: { roundId: body.roundId },
          orderBy: { matchOrder: 'desc' },
        })
        const match = await prisma.tournamentMatch.create({
          data: {
            roundId: body.roundId,
            matchOrder: (lastMatch?.matchOrder ?? 0) + 1,
            side1Id: body.side1Id || null,
            side1Name: body.side1Name || null,
            side2Id: body.side2Id || null,
            side2Name: body.side2Name || null,
          },
        })
        return NextResponse.json({ success: true, match })
      }

      // ────── UPDATE MATCH ──────
      case 'update_match': {
        if (!body.matchId) return NextResponse.json({ error: 'matchId gerekli' }, { status: 400 })
        const data: any = {}
        if (body.side1Score !== undefined) data.side1Score = parseInt(body.side1Score) || 0
        if (body.side2Score !== undefined) data.side2Score = parseInt(body.side2Score) || 0
        if (body.winnerId !== undefined) data.winnerId = body.winnerId
        if (body.status !== undefined) data.status = body.status
        if (body.notes !== undefined) data.notes = body.notes
        if (body.side1Id !== undefined) data.side1Id = body.side1Id
        if (body.side1Name !== undefined) data.side1Name = body.side1Name
        if (body.side2Id !== undefined) data.side2Id = body.side2Id
        if (body.side2Name !== undefined) data.side2Name = body.side2Name
        if (body.startedAt !== undefined) data.startedAt = body.startedAt ? new Date(body.startedAt) : null
        if (body.endedAt !== undefined) data.endedAt = body.endedAt ? new Date(body.endedAt) : null
        if (body.pkBattleId !== undefined) data.pkBattleId = body.pkBattleId

        const match = await prisma.tournamentMatch.update({ where: { id: body.matchId }, data })
        return NextResponse.json({ success: true, match })
      }

      // ────── REWARD (ödül dağıt) ──────
      case 'reward': {
        if (!body.id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
        const t = await prisma.weeklyTournament.findUnique({
          where: { id: body.id },
          include: { entries: { orderBy: { rank: 'asc' } } },
        })
        if (!t) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })
        if (t.status !== 'completed') {
          return NextResponse.json({ error: 'Ödül yalnız completed durumunda dağıtılabilir' }, { status: 400 })
        }

        const rewards: { rank: number; prize: number; currency?: string }[] = t.rewards ? JSON.parse(t.rewards) : []
        if (rewards.length === 0) {
          return NextResponse.json({ error: 'Ödül listesi boş' }, { status: 400 })
        }

        const distributed: any[] = []
        for (const entry of t.entries) {
          if (entry.rewarded) continue
          const rewardDef = rewards.find((r) => r.rank === entry.rank)
          if (!rewardDef || !rewardDef.prize) continue

          const currency = rewardDef.currency || 'cfc'
          const field = currency === 'jeton' ? 'jetonBalance' : 'credits'

          await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.update({
              where: { id: entry.userId },
              data: { [field]: { increment: rewardDef.prize } },
              select: { credits: true, jetonBalance: true },
            })
            await tx.weeklyTournamentEntry.update({
              where: { id: entry.id },
              data: { rewarded: true },
            })
            const newBalance = currency === 'jeton' ? user.jetonBalance : user.credits
            await tx.creditTransaction.create({
              data: {
                userId: entry.userId,
                type: 'tournament_reward',
                amount: rewardDef.prize,
                balance: newBalance,
                description: `Turnuva ödülü: ${t.title} (#${entry.rank})`,
              },
            })
          })

          distributed.push({
            userId: entry.userId,
            rank: entry.rank,
            prize: rewardDef.prize,
            currency,
          })
        }

        // Durumu rewarded yap
        await transitionTournament(body.id, 'rewarded' as TournamentStatus)

        return NextResponse.json({ success: true, distributed, count: distributed.length })
      }

      default:
        return NextResponse.json({ error: `Bilinmeyen işlem: ${action}` }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[admin/tournaments]', error)
    return NextResponse.json({ error: error.message || 'Sunucu hatası' }, { status: 500 })
  }
}
