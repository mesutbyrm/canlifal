'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { gomokuAI, gomokuMove } from '@/lib/game-logic'
import { useEffect, useRef, useMemo } from 'react'

export default function GomokuPage() {
  return (
    <GameShell
      gameType="gomoku"
      gameName="Gomoku"
      gameEmoji="⚫⚪"
      gameDesc="15x15 tahtada 5 taşı sırala, kazan!"
      supportsAI={true}
    >
      {(props) => <GomokuBoard {...props} />}
    </GameShell>
  )
}

function GomokuBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const aiTimerRef = useRef<any>(null)
  const size = state?.size || 15
  const board: string[] = state?.board || Array(size * size).fill('')
  const winLength = state?.winLength || 5
  const mySymbol = playerNum === 1 ? 'X' : 'O'

  const aiPlayerNum = room.disconnectedPlayerId === room.player1Id ? 1 : 2
  const humanPlayerNum = aiPlayerNum === 1 ? 2 : 1

  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || room.currentTurn !== aiPlayerNum) return
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    aiTimerRef.current = setTimeout(async () => {
      const aiIdx = gomokuAI(state)
      if (aiIdx !== null) {
        const result = gomokuMove(state, aiIdx, aiPlayerNum)
        if (!result.error) {
          await sendAIState({
            state: result.state,
            player1Score: room.player1Score,
            player2Score: room.player2Score,
            currentTurn: humanPlayerNum,
            status: result.winner || result.isDraw ? 'completed' : 'active',
            winnerId: result.winner === 1 ? room.player1Id : result.winner === 2 ? room.player2Id : result.isDraw ? null : null,
          })
        }
      }
    }, 600)
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [room, state, aiPlayerNum, humanPlayerNum])

  // Detect winning cells
  const winCells = useMemo(() => {
    const cells = new Set<number>()
    const dirs = [[0,1],[1,0],[1,1],[1,-1]]
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = board[r * size + c]
        if (!cell) continue
        for (const [dr, dc] of dirs) {
          const endR = r + dr * (winLength - 1)
          const endC = c + dc * (winLength - 1)
          if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue
          let ok = true
          for (let k = 1; k < winLength; k++) {
            if (board[(r + dr * k) * size + (c + dc * k)] !== cell) { ok = false; break }
          }
          if (ok) { for (let k = 0; k < winLength; k++) cells.add((r + dr * k) * size + (c + dc * k)) }
        }
      }
    }
    return cells
  }, [board, size, winLength])

  const handleClick = async (index: number) => {
    if (!isMyTurn || isSpectator || room.status !== 'active') return
    if (board[index] !== '') return
    await sendMove({ index })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-sm text-fuchsia-300/80">
        {room.status === 'completed'
          ? (room.winnerId ? '🏆 Oyun bitti!' : '🤝 Berabere!')
          : isMyTurn ? `Senin sıran (${mySymbol === 'X' ? '⚫' : '⚪'})` : 'Rakip düşünüyor...'}
      </div>
      <div className="overflow-auto max-w-full">
        <div className="bg-gradient-to-b from-amber-900/40 to-amber-950/60 rounded-xl p-1.5 border border-amber-400/30 inline-block">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, 1.5rem)`, gap: '1px' }}>
            {board.map((cell, i) => {
              const isWin = winCells.has(i)
              return (
                <motion.button
                  key={i}
                  onClick={() => handleClick(i)}
                  whileHover={!cell && isMyTurn ? { scale: 1.2 } : {}}
                  className={`w-6 h-6 rounded-full text-xs flex items-center justify-center transition-all ${
                    cell === 'X' ? `bg-gray-900 border border-gray-600 ${isWin ? 'ring-1 ring-yellow-300 animate-pulse' : ''}` :
                    cell === 'O' ? `bg-white border border-gray-300 ${isWin ? 'ring-1 ring-yellow-300 animate-pulse' : ''}` :
                    'bg-amber-800/30 border border-amber-700/20 hover:bg-amber-700/40 cursor-pointer'
                  }`}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
