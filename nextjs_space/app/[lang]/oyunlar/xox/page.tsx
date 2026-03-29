'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { xoxAI, xoxMove } from '@/lib/game-logic'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

export default function XoxPage() {
  const [gridSizes, setGridSizes] = useState<number[]>([3])

  useEffect(() => {
    fetch('/api/games/grid-settings')
      .then(r => r.json())
      .then(d => { if (d.xoxGridSizes?.length) setGridSizes(d.xoxGridSizes) })
      .catch(() => {})
  }, [])

  const desc = gridSizes.length > 1 && gridSizes.some((s: number) => s > 4)
    ? 'Klasik XOX veya büyük tahtalarda 5\'li sıra yapan kazanır!'
    : 'Klasik 3x3 XOX oyunu. 3\'lü sıra yapan kazanır!'

  return (
    <GameShell
      gameType="xox"
      gameName="XOX"
      gameEmoji="❌⭕"
      gameDesc={desc}
      supportsAI={true}
      gridSizeOptions={gridSizes}
    >
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }) => (
        <XoxBoard room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator} playerNum={playerNum} sendMove={sendMove} sendAIState={sendAIState} />
      )}
    </GameShell>
  )
}

function XoxBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const aiTimerRef = useRef<any>(null)
  const size: number = state?.size || 3
  const winLength: number = state?.winLength || (size <= 4 ? size : 5)

  // AI auto-play
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || room.currentTurn !== 2) return
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    aiTimerRef.current = setTimeout(async () => {
      const aiIndex = xoxAI(state)
      if (aiIndex !== null) {
        const result = xoxMove(state, aiIndex, 2)
        if (!result.error) {
          const winner = result.winner
          const isDraw = result.isDraw
          await sendAIState({
            state: result.state,
            player1Score: room.player1Score,
            player2Score: room.player2Score,
            currentTurn: 1,
            status: winner ? 'completed' : isDraw ? 'completed' : 'active',
            winnerId: winner === 1 ? room.player1Id : winner === 2 ? room.player2Id : isDraw ? null : null,
          })
        }
      }
    }, size > 10 ? 1200 : 800)
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [room, state, size])

  const board: string[] = state?.board || Array(size * size).fill('')
  const mySymbol = playerNum === 1 ? 'X' : 'O'

  const handleClick = async (index: number) => {
    if (!isMyTurn || isSpectator || board[index] !== '' || room.status !== 'active') return
    await sendMove({ index })
  }

  // Find winning cells dynamically
  const winCells = useMemo(() => {
    const cells = new Set<number>()
    const directions = [[0,1],[1,0],[1,1],[1,-1]]
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = board[r * size + c]
        if (!cell) continue
        for (const [dr, dc] of directions) {
          const endR = r + dr * (winLength - 1)
          const endC = c + dc * (winLength - 1)
          if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue
          let match = true
          for (let k = 1; k < winLength; k++) {
            if (board[(r + dr * k) * size + (c + dc * k)] !== cell) { match = false; break }
          }
          if (match) {
            for (let k = 0; k < winLength; k++) cells.add((r + dr * k) * size + (c + dc * k))
          }
        }
      }
    }
    return cells
  }, [board, size, winLength])

  // Dynamic cell sizing based on board size
  const cellClass = size <= 3 ? 'w-20 h-20 sm:w-24 sm:h-24 text-3xl sm:text-4xl rounded-xl' :
    size <= 6 ? 'w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl rounded-lg' :
    size <= 10 ? 'w-8 h-8 sm:w-10 sm:h-10 text-sm sm:text-base rounded-md' :
    size <= 16 ? 'w-6 h-6 sm:w-7 sm:h-7 text-xs rounded-md' :
    'w-4 h-4 sm:w-5 sm:h-5 text-[8px] rounded-sm'

  const gapClass = size <= 3 ? 'gap-2' : size <= 10 ? 'gap-1' : 'gap-0.5'

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 text-sm">
        <span className={`px-3 py-1 rounded-full ${room.currentTurn === 1 ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-300' : 'bg-purple-900/30 text-purple-400'}`}>
          ❌ {room.player1Name || 'Oyuncu 1'}
        </span>
        <span className="text-fuchsia-400">vs</span>
        <span className={`px-3 py-1 rounded-full ${room.currentTurn === 2 ? 'bg-pink-500/30 border border-pink-400 text-pink-300' : 'bg-purple-900/30 text-purple-400'}`}>
          ⭕ {room.player2Name || 'Oyuncu 2'}
        </span>
      </div>

      {size > 3 && (
        <div className="text-xs text-gray-400 bg-purple-900/30 px-3 py-1 rounded-full">
          {size}x{size} • {winLength} sıra yapan kazanır
        </div>
      )}

      {isMyTurn && room.status === 'active' && (
        <p className="text-green-400 text-sm animate-pulse">Senin sıran! ({mySymbol})</p>
      )}
      {!isMyTurn && room.status === 'active' && !isSpectator && (
        <p className="text-fuchsia-400/60 text-sm">Rakip düşünüyor...</p>
      )}

      <div className={`grid ${gapClass} overflow-auto max-w-full`} style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {board.map((cell: string, i: number) => (
          <motion.button
            key={i}
            whileHover={isMyTurn && cell === '' ? { scale: 1.05 } : {}}
            whileTap={isMyTurn && cell === '' ? { scale: 0.95 } : {}}
            onClick={() => handleClick(i)}
            className={`${cellClass} font-bold flex items-center justify-center border transition-all ${
              winCells.has(i)
                ? 'bg-green-800/40 border-green-400 shadow-lg shadow-green-500/30'
                : cell === ''
                  ? isMyTurn ? 'bg-purple-900/30 border-fuchsia-500/40 hover:border-fuchsia-300 cursor-pointer' : 'bg-purple-900/20 border-fuchsia-500/20'
                  : 'bg-purple-900/40 border-fuchsia-500/30'
            }`}
          >
            {size <= 10 ? (
              <span className={cell === 'X' ? 'text-cyan-400' : cell === 'O' ? 'text-pink-400' : ''}>
                {cell === 'X' ? '❌' : cell === 'O' ? '⭕' : ''}
              </span>
            ) : (
              <span className={cell === 'X' ? 'text-cyan-400 font-bold' : cell === 'O' ? 'text-pink-400 font-bold' : ''}>
                {cell || ''}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
