export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitStreamEvent } from '@/lib/stream-events'

// POST - Manuel PK puanı ekleme (yalnızca yönetici).
// Hediye kaynaklı puanlar sunucu tarafında /api/live/gift/send içinde işlenir;
// bu uç istemciden gelen puana güvendiği için yetki zorunludur.
const MAX_MANUAL_POINTS = 10

export async function POST(req: NextRequest) {
  try {
    // Çift kimlik doğrulama: mobil JWT veya web oturumu
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const currentUserId = mobileUser?.id || session?.user?.id
    if (!currentUserId) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const actor = await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } })
    if (!actor || (actor.role !== 'admin' && actor.role !== 'yonetici')) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const { battleId, streamId, points: rawPoints } = await req.json()

    if (!battleId || !streamId || !rawPoints) {
      return NextResponse.json({ error: 'battleId, streamId ve points gerekli' }, { status: 400 })
    }

    const points = Math.min(Math.max(Math.floor(Number(rawPoints) || 0), 1), MAX_MANUAL_POINTS)

    const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
    if (!battle || battle.status !== 'active') {
      return NextResponse.json({ error: 'Aktif PK bulunamadı' }, { status: 404 })
    }

    // Determine which side gets the points
    const isStream1 = battle.stream1Id === streamId
    const isStream2 = battle.stream2Id === streamId
    
    if (!isStream1 && !isStream2) {
      return NextResponse.json({ error: 'Stream bu PK\'ya ait değil' }, { status: 400 })
    }

    const updated = await prisma.pKBattle.update({
      where: { id: battleId },
      data: isStream1 ? { score1: { increment: points } } : { score2: { increment: points } }
    })

    const scoreData = {
      type: 'pk',
      battleId: battle.id,
      action: 'score_update',
      room1Id: battle.stream1Id,
      room2Id: battle.stream2Id,
      score1: updated.score1,
      score2: updated.score2,
      addedAmount: points,
      addedSide: isStream1 ? 'room1' : 'room2',
      eventType: 'PK_SCORE_UPDATE',
      source: 'admin',
    }
    emitStreamEvent(battle.stream1Id, 'pk', scoreData)
    emitStreamEvent(battle.stream2Id, 'pk', scoreData)

    return NextResponse.json({
      score1: updated.score1,
      score2: updated.score2
    })
  } catch (e) {
    console.error('PK score error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
