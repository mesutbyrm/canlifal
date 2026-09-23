'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export default function TombalaPage() {
  return (
    <GameShell
      gameType="tombala"
      gameName="Tombala"
      gameEmoji="🎱"
      gameDesc="Sayılar çekilir, sırayı ilk tamamlayan kazanır!"
      supportsAI={true}
    >
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }) => (
        <TombalaBoard room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator} playerNum={playerNum} sendMove={sendMove} sendAIState={sendAIState} />
      )}
    </GameShell>
  )
}

function TombalaBoard({ room, state, isSpectator, playerNum, sendMove }: any) {
  const [lastDrawn, setLastDrawn] = useState<number | null>(null)
  const [drawing, setDrawing] = useState(false)

  const drawnNumbers: number[] = state?.drawnNumbers || []
  const myCard: number[][] = playerNum === 1 ? (state?.player1Card || []) : (state?.player2Card || [])
  const myMarked: boolean[] = playerNum === 1 ? (state?.player1Marked || []) : (state?.player2Marked || [])
  const opCard: number[][] = playerNum === 1 ? (state?.player2Card || []) : (state?.player1Card || [])
  const opMarked: boolean[] = playerNum === 1 ? (state?.player2Marked || []) : (state?.player1Marked || [])

  useEffect(() => {
    if (drawnNumbers.length > 0) setLastDrawn(drawnNumbers[drawnNumbers.length - 1])
  }, [drawnNumbers.length])

  const handleDraw = async () => {
    if (drawing || isSpectator || room.status !== 'active') return
    setDrawing(true)
    await sendMove({})
    setDrawing(false)
  }

  // Auto-draw for AI games (either player can draw)
  const aiRef = useRef<any>(null)
  useEffect(() => {
    if (!room.isAI || room.status !== 'active') return
    if (aiRef.current) clearTimeout(aiRef.current)
    // Auto draw every 2 seconds in AI mode
    aiRef.current = setTimeout(() => {
      if (room.status === 'active') handleDraw()
    }, 2000)
    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state])

  const renderCard = (card: number[][], marked: boolean[], label: string, isMine: boolean) => (
    <div className="w-full">
      <p className={`text-xs font-bold mb-1 ${isMine ? 'text-cyan-400' : 'text-pink-400'}`}>{label}</p>
      <div className="grid grid-cols-9 gap-0.5">
        {card.flat().map((num: number, i: number) => (
          <div
            key={i}
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded text-xs font-bold border transition-all ${
              num === 0
                ? 'bg-purple-950/30 border-purple-900/20'
                : marked[i]
                  ? 'bg-green-700/50 border-green-400 text-green-200 shadow-sm shadow-green-500/20'
                  : num === lastDrawn
                    ? 'bg-amber-700/40 border-amber-400 text-amber-200 animate-pulse'
                    : 'bg-purple-900/30 border-fuchsia-500/20 text-fuchsia-200'
            }`}
          >
            {num > 0 ? num : ''}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Last drawn number */}
      {lastDrawn && (
        <motion.div
          key={lastDrawn}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-amber-500/30"
        >
          {lastDrawn}
        </motion.div>
      )}

      <p className="text-fuchsia-300/60 text-xs">Çekilen: {drawnNumbers.length}/90</p>

      {/* My card */}
      {myCard.length > 0 && renderCard(myCard, myMarked, `Senin Kartın (${room.player1Id === (playerNum === 1 ? room.player1Id : room.player2Id) ? room.player1Name : room.player2Name})`, true)}

      {/* Opponent card */}
      {opCard.length > 0 && renderCard(opCard, opMarked, `Rakip Kartı`, false)}

      {/* Draw button */}
      {!isSpectator && room.status === 'active' && !room.isAI && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDraw}
          disabled={drawing}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-full shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition disabled:opacity-50"
        >
          {drawing ? '⏳ Çekiliyor...' : '🎱 Sayı Çek!'}
        </motion.button>
      )}

      {/* Drawn numbers strip */}
      {drawnNumbers.length > 0 && (
        <div className="w-full">
          <p className="text-xs text-fuchsia-400/50 mb-1">Son çekilen sayılar:</p>
          <div className="flex flex-wrap gap-1">
            {drawnNumbers.slice(-15).map((n: number, i: number) => (
              <span key={i} className="w-6 h-6 rounded bg-purple-900/30 text-fuchsia-300 text-xs flex items-center justify-center">{n}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
