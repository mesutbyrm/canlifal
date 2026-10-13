'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { reversiAI, reversiMove } from '@/lib/game-logic'
import { useEffect, useRef, useMemo } from 'react'

export default function ReversiPage() {
  return (
    <GameShell
      gameType="reversi"
      gameName="Reversi"
      gameEmoji="⚫⚪"
      gameDesc="Taşları çevir, tahtayı fethet! En çok taşa sahip olan kazanır."
      supportsAI={true}
    >
      {(props) => <ReversiBoard {...props} />}
    </GameShell>
  )
}

function ReversiBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const aiTimerRef = useRef<any>(null)
  const size = 8
  const board: string[] = state?.board || Array(64).fill('')
  const myColor = playerNum === 1 ? 'B' : 'W'

  const bCount = board.filter((c: string) => c === 'B').length
  const wCount = board.filter((c: string) => c === 'W').length

  // Valid moves for current player
  const validMoves = useMemo(() => {
    if (room.status !== 'active') return new Set<number>()
    const color = room.currentTurn === 1 ? 'B' : 'W'
    const opp = color === 'B' ? 'W' : 'B'
    const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
    const moves = new Set<number>()
    for (let i = 0; i < 64; i++) {
      if (board[i] !== '') continue
      const r = Math.floor(i / size), c = i % size
      for (const [dr, dc] of dirs) {
        let cr = r + dr, cc = c + dc, found = false
        while (cr >= 0 && cr < size && cc >= 0 && cc < size && board[cr * size + cc] === opp) {
          cr += dr; cc += dc; found = true
        }
        if (found && cr >= 0 && cr < size && cc >= 0 && cc < size && board[cr * size + cc] === color) {
          moves.add(i); break
        }
      }
    }
    return moves
  }, [board, room.currentTurn, room.status])

  // AI auto-play
  const aiPlayerNum = room.disconnectedPlayerId === room.player1Id ? 1 : 2
  const humanPlayerNum = aiPlayerNum === 1 ? 2 : 1
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || room.currentTurn !== aiPlayerNum) return
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    aiTimerRef.current = setTimeout(async () => {
      const aiMove = reversiAI(state, aiPlayerNum)
      if (aiMove) {
        const result = reversiMove(state, aiMove.row, aiMove.col, aiPlayerNum)
        if (!result.error) {
          await sendAIState({
            state: result.state,
            player1Score: result.player1Score ?? bCount,
            player2Score: result.player2Score ?? wCount,
            currentTurn: result.noTurnSwitch ? aiPlayerNum : humanPlayerNum,
            status: result.winner || result.isDraw ? 'completed' : 'active',
            winnerId: result.winner === 1 ? room.player1Id : result.winner === 2 ? room.player2Id : null,
          })
        }
      } else {
        // AI has no moves, pass turn
        await sendAIState({ ...room, currentTurn: humanPlayerNum })
      }
    }, 900)
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [room, state, aiPlayerNum, humanPlayerNum, bCount, wCount])

  const handleClick = async (row: number, col: number) => {
    if (!isMyTurn || isSpectator || room.status !== 'active') return
    if (!validMoves.has(row * size + col)) return
    await sendMove({ row, col })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-6 text-sm">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-gray-900 border border-gray-500 inline-block" /> ⚫ {bCount}</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-white border border-gray-300 inline-block" /> ⚪ {wCount}</span>
      </div>
      <div className="text-xs text-fuchsia-300/80">
        {room.status === 'completed' ? (room.winnerId ? '🏆 Oyun bitti!' : '🤝 Berabere!') : isMyTurn ? `Senin sıran (${myColor === 'B' ? '⚫' : '⚪'})` : 'Rakip düşünüyor...'}
      </div>
      <div className="bg-gradient-to-b from-green-900/40 to-green-950/60 rounded-xl p-2 border border-green-400/30">
        <div className="grid grid-cols-8 gap-0.5">
          {board.map((cell, i) => {
            const r = Math.floor(i / size), c = i % size
            const isValid = validMoves.has(i) && isMyTurn
            return (
              <motion.button
                key={i}
                onClick={() => handleClick(r, c)}
                whileHover={isValid ? { scale: 1.1 } : {}}
                className={`w-9 h-9 rounded-sm flex items-center justify-center transition-all ${
                  isValid ? 'bg-green-800/60 cursor-pointer ring-1 ring-fuchsia-400/50' : 'bg-green-800/30'
                }`}
              >
                {cell === 'B' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-7 h-7 rounded-full bg-gray-900 border-2 border-gray-500 shadow-lg" />}
                {cell === 'W' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 shadow-lg" />}
                {!cell && isValid && <div className="w-3 h-3 rounded-full bg-fuchsia-400/30" />}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
