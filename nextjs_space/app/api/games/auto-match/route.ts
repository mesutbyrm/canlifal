export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

const VALID_GAME_TYPES = ['xox', 'tombala', 'tavla', 'pisti', 'sayi_tahmin', 'zar']

/**
 * POST /api/games/auto-match
 * Body: { gameType, betAmount?, betCurrency? }
 *
 * Bekleyen bir oyun odası varsa rakip olarak katılır, yoksa yeni bir bekleyen
 * oda açar. İki backend'de de eksik olan bu uç artık ana backend'de.
 */
export async function POST(req: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const gameType: string = body?.gameType ?? body?.type ?? ''
    if (!gameType || !VALID_GAME_TYPES.includes(gameType)) {
      return NextResponse.json({ error: 'Geçersiz gameType' }, { status: 400 })
    }
    const betAmount = Math.max(0, parseInt(String(body?.betAmount ?? 0), 10) || 0)
    const betCurrency = String(body?.betCurrency ?? 'FREE').toUpperCase()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true }
    })
    const displayName = user?.name || user?.username || 'Oyuncu'

    // Zaten aktif bir oyunu var mı?
    const ongoing = await prisma.gameRoom.findFirst({
      where: {
        status: { in: ['waiting', 'playing'] },
        OR: [{ player1Id: userId }, { player2Id: userId }]
      },
      orderBy: { createdAt: 'desc' }
    })
    if (ongoing) {
      return NextResponse.json({ matched: ongoing.status === 'playing', room: ongoing, roomId: ongoing.id })
    }

    // Bekleyen uygun bir oda ara
    const waiting = await prisma.gameRoom.findFirst({
      where: {
        gameType,
        status: 'waiting',
        isAI: false,
        player2Id: null,
        betAmount,
        betCurrency,
        player1Id: { not: userId }
      },
      orderBy: { createdAt: 'asc' }
    })

    if (waiting) {
      const joined = await prisma.gameRoom.update({
        where: { id: waiting.id },
        data: {
          player2Id: userId,
          player2Name: displayName,
          status: 'playing',
          lastMoveAt: new Date(),
          player2LastSeen: new Date()
        }
      })
      return NextResponse.json({ matched: true, room: joined, roomId: joined.id })
    }

    // Yoksa yeni bekleyen oda aç
    const created = await prisma.gameRoom.create({
      data: {
        gameType,
        player1Id: userId,
        player1Name: displayName,
        betAmount,
        betCurrency,
        status: 'waiting',
        player1LastSeen: new Date()
      }
    })
    return NextResponse.json({ matched: false, room: created, roomId: created.id })
  } catch (e) {
    console.error('games/auto-match error:', e)
    return NextResponse.json({ error: 'Eşleştirme yapılamadı' }, { status: 500 })
  }
}
