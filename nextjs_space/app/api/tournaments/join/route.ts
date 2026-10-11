export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

/**
 * POST /api/tournaments/join
 * Kullanıcıyı bir haftalık turnuvaya kaydeder.
 * body: { tournamentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const tournamentId = String(body?.tournamentId || '').trim()
    if (!tournamentId) {
      return NextResponse.json({ error: 'tournamentId gerekli' }, { status: 400 })
    }

    const tournament = await prisma.weeklyTournament.findUnique({
      where: { id: tournamentId },
    })
    if (!tournament) {
      return NextResponse.json({ error: 'Turnuva bulunamadı' }, { status: 404 })
    }
    if (!['active', 'registration'].includes(tournament.status)) {
      return NextResponse.json({ error: 'Bu turnuvaya artık katılamazsınız', code: 'TOURNAMENT_CLOSED' }, { status: 400 })
    }

    // Zaten kayıtlı mı?
    const existing = await prisma.weeklyTournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    })
    if (existing) {
      return NextResponse.json({ success: true, alreadyJoined: true, entry: existing })
    }

    // Katılımcı limiti kontrolü
    if (tournament.maxParticipants && tournament.maxParticipants > 0) {
      const count = await prisma.weeklyTournamentEntry.count({ where: { tournamentId } })
      if (count >= tournament.maxParticipants) {
        return NextResponse.json({ error: 'Turnuva katılımcı limiti dolu', code: 'TOURNAMENT_FULL' }, { status: 400 })
      }
    }

    const entry = await prisma.weeklyTournamentEntry.create({
      data: { tournamentId, userId, score: 0 },
    })

    return NextResponse.json({ success: true, alreadyJoined: false, entry })
  } catch (e) {
    console.error('[tournaments/join POST]', e)
    return NextResponse.json({ error: 'Turnuvaya katılım başarısız' }, { status: 500 })
  }
}
