import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST: Create a new SOS game
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { gridSize, isAI, betAmount, betCurrency } = await req.json()
    const size = [6, 8, 10].includes(gridSize) ? gridSize : 6
    const currency = ['FREE', 'CFC', 'JETON'].includes(betCurrency) ? betCurrency : 'FREE'
    const amount = currency === 'FREE' ? 0 : Math.max(0, Math.floor(betAmount || 0))

    // Check balance
    if (amount > 0) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { credits: true, jetonBalance: true, name: true }
      })
      if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

      if (currency === 'CFC' && user.credits < amount) {
        return NextResponse.json({ error: 'Yetersiz CFC bakiyesi' }, { status: 400 })
      }
      if (currency === 'JETON' && user.jetonBalance < amount) {
        return NextResponse.json({ error: 'Yetersiz Jeton bakiyesi' }, { status: 400 })
      }

      // Deduct bet from player 1
      await prisma.user.update({
        where: { id: session.user.id },
        data: currency === 'CFC'
          ? { credits: { decrement: amount } }
          : { jetonBalance: { decrement: amount } }
      })
    }

    // Create empty board
    const board = Array(size).fill(null).map(() => Array(size).fill(''))

    const userName = (session.user as any)?.name || 'Oyuncu 1'

    const game = await prisma.sosGame.create({
      data: {
        gridSize: size,
        player1Id: session.user.id,
        player2Id: isAI ? 'AI' : null,
        isAI: !!isAI,
        betAmount: amount,
        betCurrency: currency,
        board: JSON.stringify(board),
        lines: '[]',
        currentTurn: 1,
        player1Score: 0,
        player2Score: 0,
        status: isAI ? 'active' : 'waiting',
        player1Name: userName,
        player2Name: isAI ? 'Yapay Zeka' : 'Oyuncu 2',
      },
    })

    return NextResponse.json({ success: true, gameId: game.id })
  } catch (error: any) {
    console.error('SOS create error:', error)
    return NextResponse.json({ error: 'Oyun oluşturulamadı' }, { status: 500 })
  }
}

// GET: List waiting games to join
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    const games = await prisma.sosGame.findMany({
      where: {
        status: 'waiting',
        isAI: false,
        ...(userId ? { player1Id: { not: userId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json(games)
  } catch (error: any) {
    console.error('SOS list error:', error)
    return NextResponse.json({ error: 'Oyunlar yüklenemedi' }, { status: 500 })
  }
}
