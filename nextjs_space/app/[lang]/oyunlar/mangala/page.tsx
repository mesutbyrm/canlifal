'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { mangalaAI, mangalaMove } from '@/lib/game-logic'
import { useEffect, useRef } from 'react'

export default function MangalaPage() {
  return (
    <GameShell
      gameType="mangala"
      gameName="Mangala"
      gameEmoji="🫘"
      gameDesc="Antik Türk strateji oyunu! Taşları topla, hazineyi doldur!"
      supportsAI={true}
    >
      {(props) => <MangalaBoard {...props} />}
    </GameShell>
  )
}

function MangalaBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const aiTimerRef = useRef<any>(null)
  const pits: number[] = state?.pits || [4,4,4,4,4,4,4,4,4,4,4,4]
  const stores: number[] = state?.stores || [0, 0]

  // AI auto-play
  const aiPlayerNum = room.disconnectedPlayerId === room.player1Id ? 1 : 2
  const humanPlayerNum = aiPlayerNum === 1 ? 2 : 1
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || room.currentTurn !== aiPlayerNum) return
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    aiTimerRef.current = setTimeout(async () => {
      const aiPit = mangalaAI(state, aiPlayerNum)
      if (aiPit !== null) {
        const result = mangalaMove(state, aiPit, aiPlayerNum)
        if (!result.error) {
          await sendAIState({
            state: result.state,
            player1Score: result.player1Score ?? stores[0],
            player2Score: result.player2Score ?? stores[1],
            currentTurn: result.noTurnSwitch ? aiPlayerNum : humanPlayerNum,
            status: result.winner || result.isDraw ? 'completed' : 'active',
            winnerId: result.winner === 1 ? room.player1Id : result.winner === 2 ? room.player2Id : null,
          })
        }
      }
    }, 900)
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [room, state, aiPlayerNum, humanPlayerNum, stores])

  const handlePit = async (pit: number) => {
    if (!isMyTurn || isSpectator || room.status !== 'active') return
    const myRange = playerNum === 1 ? [0,1,2,3,4,5] : [6,7,8,9,10,11]
    if (!myRange.includes(pit) || pits[pit] === 0) return
    await sendMove({ pit })
  }

  // Player 2 pits (top, right to left): 11, 10, 9, 8, 7, 6
  // Player 1 pits (bottom, left to right): 0, 1, 2, 3, 4, 5
  const p2Pits = [11, 10, 9, 8, 7, 6]
  const p1Pits = [0, 1, 2, 3, 4, 5]
  const isP1 = playerNum === 1

  const renderPit = (pit: number, isOwner: boolean) => (
    <motion.button
      key={pit}
      whileHover={isOwner && isMyTurn && pits[pit] > 0 ? { scale: 1.1 } : {}}
      whileTap={isOwner && isMyTurn && pits[pit] > 0 ? { scale: 0.95 } : {}}
      onClick={() => handlePit(pit)}
      className={`w-14 h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
        isOwner && isMyTurn && pits[pit] > 0
          ? 'bg-amber-800/60 border-2 border-amber-400/60 cursor-pointer hover:bg-amber-700/70'
          : 'bg-amber-900/40 border border-amber-700/30'
      }`}
    >
      <span className="text-lg font-bold text-amber-200">{pits[pit]}</span>
      <span className="text-[8px] text-amber-400/60">{'●'.repeat(Math.min(pits[pit], 6))}</span>
    </motion.button>
  )

  const renderStore = (storeIdx: number) => (
    <div className="w-16 h-36 rounded-2xl bg-gradient-to-b from-amber-700/50 to-amber-900/70 border-2 border-amber-400/40 flex flex-col items-center justify-center">
      <span className="text-2xl font-bold text-amber-100">{stores[storeIdx]}</span>
      <span className="text-[9px] text-amber-300/60 mt-1">{storeIdx === 0 ? 'Oyuncu 1' : 'Oyuncu 2'}</span>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-sm text-fuchsia-300/80">
        {room.status === 'completed'
          ? (room.winnerId ? '🏆 Oyun bitti!' : '🤝 Berabere!')
          : isMyTurn ? 'Senin sıran! Bir çukur seç.' : 'Rakip düşünüyor...'}
      </div>
      <div className="flex items-center gap-2">
        {/* P2 store (left) */}
        {renderStore(1)}
        {/* Pits */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-1">{p2Pits.map(p => renderPit(p, playerNum === 2))}</div>
          <div className="flex gap-1">{p1Pits.map(p => renderPit(p, playerNum === 1))}</div>
        </div>
        {/* P1 store (right) */}
        {renderStore(0)}
      </div>
      <div className="flex items-center gap-4 text-xs text-amber-300/70">
        <span>Oyuncu 1: {stores[0]} puan</span>
        <span>Oyuncu 2: {stores[1]} puan</span>
      </div>
    </div>
  )
}
