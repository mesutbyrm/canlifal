'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { connect4AI, connect4Move } from '@/lib/game-logic'
import { useEffect, useRef, useMemo } from 'react'

export default function Connect4Page() {
  return (
    <GameShell
      gameType="connect4"
      gameName="Connect 4"
      gameEmoji="🔴🟡"
      gameDesc="Dikey, yatay veya çapraz 4'lü sıra yapan kazanır!"
      supportsAI={true}
    >
      {(props) => <Connect4Board {...props} />}
    </GameShell>
  )
}

function Connect4Board({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const aiTimerRef = useRef<any>(null)
  const rows = 6, cols = 7
  const board: string[] = state?.board || Array(42).fill('')
  const myColor = playerNum === 1 ? 'R' : 'Y'

  // AI auto-play
  const aiPlayerNum = room.disconnectedPlayerId === room.player1Id ? 1 : 2
  const humanPlayerNum = aiPlayerNum === 1 ? 2 : 1
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || room.currentTurn !== aiPlayerNum) return
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    aiTimerRef.current = setTimeout(async () => {
      const aiCol = connect4AI(state)
      if (aiCol !== null) {
        const result = connect4Move(state, aiCol, aiPlayerNum)
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
    }, 800)
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [room, state, aiPlayerNum, humanPlayerNum])

  // Detect winning cells
  const winCells = useMemo(() => {
    const cells = new Set<number>()
    const dirs = [[0,1],[1,0],[1,1],[1,-1]]
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r * cols + c]
        if (!cell) continue
        for (const [dr, dc] of dirs) {
          if (r + dr * 3 < 0 || r + dr * 3 >= rows || c + dc * 3 < 0 || c + dc * 3 >= cols) continue
          let ok = true
          for (let k = 1; k < 4; k++) {
            if (board[(r + dr * k) * cols + (c + dc * k)] !== cell) { ok = false; break }
          }
          if (ok) { for (let k = 0; k < 4; k++) cells.add((r + dr * k) * cols + (c + dc * k)) }
        }
      }
    }
    return cells
  }, [board])

  const handleClick = async (col: number) => {
    if (!isMyTurn || isSpectator || room.status !== 'active') return
    // Check if column has space
    let hasSpace = false
    for (let r = rows - 1; r >= 0; r--) { if (board[r * cols + col] === '') { hasSpace = true; break } }
    if (!hasSpace) return
    await sendMove({ col })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-sm text-fuchsia-300/80">
        {room.status === 'completed' ? (room.winnerId ? '🏆 Oyun bitti!' : '🤝 Berabere!') : isMyTurn ? `Senin sıran (${myColor === 'R' ? '🔴' : '🟡'})` : 'Rakip düşünüyor...'}
      </div>
      {/* Column selectors */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: cols }).map((_, c) => (
          <button
            key={`top-${c}`}
            onClick={() => handleClick(c)}
            className={`w-10 h-6 rounded-t-lg text-xs font-bold transition-all ${
              isMyTurn && room.status === 'active' ? 'hover:bg-fuchsia-500/30 text-fuchsia-300 cursor-pointer' : 'text-transparent cursor-default'
            }`}
          >
            ▼
          </button>
        ))}
      </div>
      {/* Board */}
      <div className="bg-gradient-to-b from-blue-900/60 to-blue-950/80 rounded-xl p-2 border border-blue-400/30">
        <div className="grid grid-cols-7 gap-1">
          {board.map((cell, i) => {
            const isWin = winCells.has(i)
            return (
              <motion.div
                key={i}
                initial={cell ? { scale: 0 } : false}
                animate={cell ? { scale: 1 } : {}}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                  cell === 'R' ? `bg-red-500 border-red-300 ${isWin ? 'ring-2 ring-yellow-300 animate-pulse' : ''}` :
                  cell === 'Y' ? `bg-yellow-400 border-yellow-200 ${isWin ? 'ring-2 ring-yellow-300 animate-pulse' : ''}` :
                  'bg-blue-950/60 border-blue-700/40'
                }`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
