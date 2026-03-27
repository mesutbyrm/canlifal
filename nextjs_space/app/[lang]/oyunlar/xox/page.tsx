'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { xoxAI, xoxMove } from '@/lib/game-logic'
import { useEffect, useRef } from 'react'

export default function XoxPage() {
  return (
    <GameShell
      gameType="xox"
      gameName="XOX"
      gameEmoji="❌⭕"
      gameDesc="Klasik 3x3 XOX oyunu. 3'lü sıra yapan kazanır!"
      supportsAI={true}
    >
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }) => (
        <XoxBoard room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator} playerNum={playerNum} sendMove={sendMove} sendAIState={sendAIState} />
      )}
    </GameShell>
  )
}

function XoxBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const aiTimerRef = useRef<any>(null)

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
    }, 800)
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [room, state])

  const board: string[] = state?.board || Array(9).fill('')
  const mySymbol = playerNum === 1 ? 'X' : 'O'

  const handleClick = async (index: number) => {
    if (!isMyTurn || isSpectator || board[index] !== '' || room.status !== 'active') return
    await sendMove({ index })
  }

  const winLines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
  let winLine: number[] | null = null
  for (const [a,b,c] of winLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      winLine = [a,b,c]; break
    }
  }

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

      {isMyTurn && room.status === 'active' && (
        <p className="text-green-400 text-sm animate-pulse">Senin sıran! ({mySymbol})</p>
      )}
      {!isMyTurn && room.status === 'active' && !isSpectator && (
        <p className="text-fuchsia-400/60 text-sm">Rakip düşünüyor...</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {board.map((cell: string, i: number) => (
          <motion.button
            key={i}
            whileHover={isMyTurn && cell === '' ? { scale: 1.05 } : {}}
            whileTap={isMyTurn && cell === '' ? { scale: 0.95 } : {}}
            onClick={() => handleClick(i)}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl text-3xl sm:text-4xl font-bold flex items-center justify-center border-2 transition-all ${
              winLine?.includes(i)
                ? 'bg-green-800/40 border-green-400 shadow-lg shadow-green-500/30'
                : cell === ''
                  ? isMyTurn ? 'bg-purple-900/30 border-fuchsia-500/40 hover:border-fuchsia-300 cursor-pointer' : 'bg-purple-900/20 border-fuchsia-500/20'
                  : 'bg-purple-900/40 border-fuchsia-500/30'
            }`}
          >
            <span className={cell === 'X' ? 'text-cyan-400' : cell === 'O' ? 'text-pink-400' : ''}>
              {cell === 'X' ? '❌' : cell === 'O' ? '⭕' : ''}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
