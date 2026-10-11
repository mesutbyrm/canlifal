import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { serializePkMatch, loadPkUsers } from '@/lib/pk-match'
import { expirePendingPK } from '@/lib/pk-expiry'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pk/{matchId}
 * Birleşik PK maç detayı.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { matchId: string } },
) {
  try {
    let battle = await prisma.pKBattle.findUnique({ where: { id: params.matchId } })
    if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })

    if (battle.status === 'pending') {
      await expirePendingPK(battle)
      battle = await prisma.pKBattle.findUnique({ where: { id: params.matchId } })
    }
    if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })

    const users = await loadPkUsers([battle])
    return NextResponse.json(serializePkMatch(battle, users))
  } catch (e) {
    console.error('[pk/matchId] error:', e)
    return NextResponse.json({ error: 'PK bilgisi alınamadı' }, { status: 500 })
  }
}
