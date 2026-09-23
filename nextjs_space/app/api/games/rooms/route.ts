export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/games/rooms?gameType=&status=
 * Açık oyun odaları listesi (çoğul). İkinci backend ile aynı payload: { rooms: [...] }
 */
export async function GET(req: NextRequest) {
  try {
    const gameType = req.nextUrl.searchParams.get('gameType') || undefined
    const status = req.nextUrl.searchParams.get('status') || 'waiting'
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10) || 50, 100)

    const rooms = await prisma.gameRoom.findMany({
      where: {
        ...(gameType ? { gameType } : {}),
        ...(status === 'all' ? {} : { status })
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        gameType: true,
        player1Id: true,
        player2Id: true,
        player1Name: true,
        player2Name: true,
        isAI: true,
        betAmount: true,
        betCurrency: true,
        status: true,
        currentTurn: true,
        player1Score: true,
        player2Score: true,
        winnerId: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({ rooms })
  } catch (e) {
    console.error('games/rooms error:', e)
    return NextResponse.json({ error: 'Oyun odaları alınamadı' }, { status: 500 })
  }
}
