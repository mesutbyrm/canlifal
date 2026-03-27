import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: Get game state
export async function GET(req: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const game = await prisma.sosGame.findUnique({ where: { id: params.gameId } })
    if (!game) return NextResponse.json({ error: 'Oyun bulunamadı' }, { status: 404 })
    return NextResponse.json(game)
  } catch (error: any) {
    console.error('SOS get error:', error)
    return NextResponse.json({ error: 'Oyun yüklenemedi' }, { status: 500 })
  }
}

// POST: Join a waiting game
export async function POST(req: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const game = await prisma.sosGame.findUnique({ where: { id: params.gameId } })
    if (!game) return NextResponse.json({ error: 'Oyun bulunamadı' }, { status: 404 })
    if (game.status !== 'waiting') return NextResponse.json({ error: 'Bu oyuna katılınamaz' }, { status: 400 })
    if (game.player1Id === session.user.id) return NextResponse.json({ error: 'Kendi oyununuza katılamazsınız' }, { status: 400 })

    // Check & deduct balance for bet
    if (game.betAmount > 0) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { credits: true, jetonBalance: true }
      })
      if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

      if (game.betCurrency === 'CFC' && user.credits < game.betAmount) {
        return NextResponse.json({ error: 'Yetersiz CFC bakiyesi' }, { status: 400 })
      }
      if (game.betCurrency === 'JETON' && user.jetonBalance < game.betAmount) {
        return NextResponse.json({ error: 'Yetersiz Jeton bakiyesi' }, { status: 400 })
      }

      await prisma.user.update({
        where: { id: session.user.id },
        data: game.betCurrency === 'CFC'
          ? { credits: { decrement: game.betAmount } }
          : { jetonBalance: { decrement: game.betAmount } }
      })
    }

    const userName = (session.user as any)?.name || 'Oyuncu 2'

    const updated = await prisma.sosGame.update({
      where: { id: params.gameId },
      data: {
        player2Id: session.user.id,
        player2Name: userName,
        status: 'active',
      },
    })

    return NextResponse.json({ success: true, game: updated })
  } catch (error: any) {
    console.error('SOS join error:', error)
    return NextResponse.json({ error: 'Oyuna katılınamadı' }, { status: 500 })
  }
}

// PATCH: Make a move
export async function PATCH(req: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { row, col, letter, aiMoves } = await req.json()

    const game = await prisma.sosGame.findUnique({ where: { id: params.gameId } })
    if (!game) return NextResponse.json({ error: 'Oyun bulunamadı' }, { status: 404 })
    if (game.status !== 'active') return NextResponse.json({ error: 'Oyun aktif değil' }, { status: 400 })

    const isPlayer1 = game.player1Id === session.user.id
    const isPlayer2 = game.player2Id === session.user.id
    if (!isPlayer1 && !isPlayer2) return NextResponse.json({ error: 'Bu oyuna dahil değilsiniz' }, { status: 403 })

    // For AI games, accept bulk moves (player + AI)
    if (game.isAI && aiMoves) {
      // Client sends final state for AI games
      const { board: newBoard, lines: newLines, player1Score: p1s, player2Score: p2s, currentTurn, gameOver, winnerId } = aiMoves

      const updateData: any = {
        board: JSON.stringify(newBoard),
        lines: JSON.stringify(newLines),
        player1Score: p1s,
        player2Score: p2s,
        currentTurn: currentTurn,
      }

      if (gameOver) {
        updateData.status = 'completed'
        updateData.winnerId = winnerId // null for draw

        // Settle bets for AI games
        if (game.betAmount > 0 && winnerId) {
          const totalPot = game.betAmount * 2
          const commission = Math.floor(totalPot * 0.10)
          const winnerPayout = totalPot - commission

          if (winnerId === session.user.id) {
            // Player wins
            await prisma.user.update({
              where: { id: session.user.id },
              data: game.betCurrency === 'CFC'
                ? { credits: { increment: winnerPayout } }
                : { jetonBalance: { increment: winnerPayout } }
            })
          }
          // If AI wins, player already lost their bet (deducted at creation)
        } else if (game.betAmount > 0 && !winnerId) {
          // Draw - refund player
          await prisma.user.update({
            where: { id: session.user.id },
            data: game.betCurrency === 'CFC'
              ? { credits: { increment: game.betAmount } }
              : { jetonBalance: { increment: game.betAmount } }
          })
        }
      }

      const updated = await prisma.sosGame.update({
        where: { id: params.gameId },
        data: updateData,
      })

      return NextResponse.json({ success: true, game: updated })
    }

    // Regular 2-player move
    const playerNum = isPlayer1 ? 1 : 2
    if (game.currentTurn !== playerNum) {
      return NextResponse.json({ error: 'Sıra sizde değil' }, { status: 400 })
    }

    const board: string[][] = JSON.parse(game.board)
    const existingLines: number[][] = JSON.parse(game.lines)

    if (row < 0 || row >= game.gridSize || col < 0 || col >= game.gridSize) {
      return NextResponse.json({ error: 'Geçersiz pozisyon' }, { status: 400 })
    }
    if (board[row][col] !== '') {
      return NextResponse.json({ error: 'Bu hücre dolu' }, { status: 400 })
    }
    if (letter !== 'S' && letter !== 'O') {
      return NextResponse.json({ error: 'Geçersiz harf' }, { status: 400 })
    }

    board[row][col] = letter

    // Check for new SOS formations
    const newLines = findNewSOS(board, row, col, existingLines, game.gridSize)
    const allLines = [...existingLines, ...newLines]
    const scoredPoints = newLines.length

    let p1Score = game.player1Score
    let p2Score = game.player2Score
    if (playerNum === 1) p1Score += scoredPoints
    else p2Score += scoredPoints

    // If scored, same player plays again. Otherwise, switch turn.
    const isBoardFull = board.every(r => r.every(c => c !== ''))
    let nextTurn = scoredPoints > 0 ? playerNum : (playerNum === 1 ? 2 : 1)
    let status = game.status
    let winnerId: string | null = null

    if (isBoardFull) {
      status = 'completed'
      if (p1Score > p2Score) winnerId = game.player1Id
      else if (p2Score > p1Score) winnerId = game.player2Id || null
      // null = draw

      // Settle bets
      if (game.betAmount > 0) {
        const totalPot = game.betAmount * 2
        const commission = Math.floor(totalPot * 0.10)
        const winnerPayout = totalPot - commission

        if (winnerId) {
          await prisma.user.update({
            where: { id: winnerId },
            data: game.betCurrency === 'CFC'
              ? { credits: { increment: winnerPayout } }
              : { jetonBalance: { increment: winnerPayout } }
          })
        } else {
          // Draw: refund both
          const refundField = game.betCurrency === 'CFC' ? 'credits' : 'jetonBalance'
          await prisma.$transaction([
            prisma.user.update({
              where: { id: game.player1Id },
              data: { [refundField]: { increment: game.betAmount } }
            }),
            ...(game.player2Id ? [prisma.user.update({
              where: { id: game.player2Id },
              data: { [refundField]: { increment: game.betAmount } }
            })] : []),
          ])
        }
      }
    }

    const updated = await prisma.sosGame.update({
      where: { id: params.gameId },
      data: {
        board: JSON.stringify(board),
        lines: JSON.stringify(allLines),
        player1Score: p1Score,
        player2Score: p2Score,
        currentTurn: nextTurn,
        status,
        winnerId,
      },
    })

    return NextResponse.json({ success: true, game: updated, newLines, scoredPoints })
  } catch (error: any) {
    console.error('SOS move error:', error)
    return NextResponse.json({ error: 'Hamle yapılamadı' }, { status: 500 })
  }
}

// DELETE: Cancel a waiting game
export async function DELETE(req: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const game = await prisma.sosGame.findUnique({ where: { id: params.gameId } })
    if (!game) return NextResponse.json({ error: 'Oyun bulunamadı' }, { status: 404 })
    if (game.player1Id !== session.user.id) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    if (game.status !== 'waiting') return NextResponse.json({ error: 'Sadece bekleyen oyunlar iptal edilebilir' }, { status: 400 })

    // Refund bet
    if (game.betAmount > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: game.betCurrency === 'CFC'
          ? { credits: { increment: game.betAmount } }
          : { jetonBalance: { increment: game.betAmount } }
      })
    }

    await prisma.sosGame.update({
      where: { id: params.gameId },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('SOS cancel error:', error)
    return NextResponse.json({ error: 'İptal edilemedi' }, { status: 500 })
  }
}

// Helper: Find new SOS lines formed by placing a letter at (row, col)
function findNewSOS(board: string[][], row: number, col: number, existingLines: number[][], gridSize: number): number[][] {
  const newLines: number[][] = []
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal down-left
  ]

  const lineKey = (r1: number, c1: number, r2: number, c2: number, r3: number, c3: number) =>
    [r1, c1, r2, c2, r3, c3]

  const existingSet = new Set(existingLines.map(l => l.join(',')))

  for (const [dr, dc] of directions) {
    // Check 3 possible SOS patterns involving (row, col)
    // Pattern 1: (row,col) is the S at start
    const checks = [
      // Current cell is start of SOS
      { positions: [[row, col], [row + dr, col + dc], [row + 2*dr, col + 2*dc]], expected: ['S', 'O', 'S'] },
      // Current cell is middle O
      { positions: [[row - dr, col - dc], [row, col], [row + dr, col + dc]], expected: ['S', 'O', 'S'] },
      // Current cell is end S
      { positions: [[row - 2*dr, col - 2*dc], [row - dr, col - dc], [row, col]], expected: ['S', 'O', 'S'] },
    ]

    for (const check of checks) {
      const { positions, expected } = check
      const allInBounds = positions.every(([r, c]) => r >= 0 && r < gridSize && c >= 0 && c < gridSize)
      if (!allInBounds) continue

      const matches = positions.every(([r, c], i) => board[r][c] === expected[i])
      if (!matches) continue

      const key = lineKey(positions[0][0], positions[0][1], positions[1][0], positions[1][1], positions[2][0], positions[2][1])
      if (!existingSet.has(key.join(','))) {
        newLines.push(key)
        existingSet.add(key.join(','))
      }
    }
  }

  return newLines
}
