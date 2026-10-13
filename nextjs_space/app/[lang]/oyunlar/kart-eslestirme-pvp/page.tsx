'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { kartEslestirmePvpAI, kartEslestirmePvpMove } from '@/lib/game-logic'
import { useEffect, useRef, useState } from 'react'

export default function KartEslestirmePvpPage() {
  return (
    <GameShell
      gameType="kart_eslestirme_pvp"
      gameName="Kart Eşleştirme PvP"
      gameEmoji="🃏🎭"
      gameDesc="Kartları çevir, eşlerini bul, rakibini yen!"
      supportsAI={true}
    >
      {(props) => <MemoryPvPBoard {...props} />}
    </GameShell>
  )
}

function MemoryPvPBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const aiTimerRef = useRef<any>(null)
  const [showFlipped, setShowFlipped] = useState<number[]>([])
  const [flipCooldown, setFlipCooldown] = useState(false)
  const cards: string[] = state?.cards || []
  const matched: boolean[] = state?.matched || Array(16).fill(false)
  const flipped: number[] = state?.flipped || []
  const p1Score = state?.p1Score || 0
  const p2Score = state?.p2Score || 0
  const lastFlip = state?.lastFlip

  // Show last flip briefly
  useEffect(() => {
    if (lastFlip && !lastFlip.isMatch) {
      setShowFlipped([lastFlip.first, lastFlip.second])
      setFlipCooldown(true)
      const t = setTimeout(() => { setShowFlipped([]); setFlipCooldown(false) }, 1000)
      return () => clearTimeout(t)
    } else {
      setShowFlipped([])
      setFlipCooldown(false)
    }
  }, [lastFlip?.first, lastFlip?.second])

  // AI
  const aiPlayerNum = room.disconnectedPlayerId === room.player1Id ? 1 : 2
  const humanPlayerNum = aiPlayerNum === 1 ? 2 : 1
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || room.currentTurn !== aiPlayerNum) return
    if (flipCooldown) return
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    aiTimerRef.current = setTimeout(async () => {
      const aiIdx = kartEslestirmePvpAI(state)
      if (aiIdx !== undefined && aiIdx !== null) {
        const result = kartEslestirmePvpMove(state, { index: aiIdx }, aiPlayerNum)
        if (!result.error) {
          const nextTurn = result.noTurnSwitch ? aiPlayerNum : humanPlayerNum
          await sendAIState({
            state: result.state,
            player1Score: result.player1Score ?? p1Score,
            player2Score: result.player2Score ?? p2Score,
            currentTurn: nextTurn,
            status: result.winner !== undefined && result.winner !== null || result.isDraw ? 'completed' : 'active',
            winnerId: result.winner === 1 ? room.player1Id : result.winner === 2 ? room.player2Id : result.isDraw ? null : null,
          })
        }
      }
    }, 800)
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [room, state, aiPlayerNum, humanPlayerNum, flipCooldown])

  const handleFlip = async (index: number) => {
    if (!isMyTurn || isSpectator || room.status !== 'active' || flipCooldown) return
    if (matched[index] || flipped.includes(index)) return
    await sendMove({ index })
  }

  const isRevealed = (i: number) => matched[i] || flipped.includes(i) || showFlipped.includes(i)

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score */}
      <div className="flex items-center gap-8 text-lg">
        <div className={`text-center px-3 py-1 rounded-lg ${room.currentTurn === 1 ? 'bg-fuchsia-800/30 border border-fuchsia-400/30' : ''}`}>
          <div className="text-xs text-fuchsia-300/60">{room.player1Name || 'Oyuncu 1'}</div>
          <div className="text-2xl font-bold text-amber-300">{p1Score}</div>
        </div>
        <div className="text-fuchsia-400 text-2xl">🃏</div>
        <div className={`text-center px-3 py-1 rounded-lg ${room.currentTurn === 2 ? 'bg-fuchsia-800/30 border border-fuchsia-400/30' : ''}`}>
          <div className="text-xs text-fuchsia-300/60">{room.player2Name || 'Oyuncu 2'}</div>
          <div className="text-2xl font-bold text-amber-300">{p2Score}</div>
        </div>
      </div>

      {/* Status */}
      <div className="text-sm text-fuchsia-300/80">
        {room.status === 'completed'
          ? (room.winnerId ? '🏆 Oyun bitti!' : '🤝 Berabere!')
          : isMyTurn ? '🎴 Bir kart seç!' : '⏳ Rakibin sırası...'}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, i) => {
          const revealed = isRevealed(i)
          return (
            <motion.button
              key={i}
              onClick={() => handleFlip(i)}
              whileHover={!revealed && isMyTurn ? { scale: 1.08, y: -3 } : {}}
              whileTap={!revealed ? { scale: 0.95 } : {}}
              animate={revealed ? { rotateY: 0 } : { rotateY: 180 }}
              transition={{ duration: 0.3 }}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl border-2 transition-all ${
                matched[i] ? 'bg-green-900/30 border-green-400/40 opacity-60' :
                revealed ? 'bg-gradient-to-b from-purple-800/50 to-fuchsia-900/50 border-fuchsia-400/40' :
                'bg-gradient-to-b from-indigo-800/50 to-purple-900/50 border-indigo-400/30 hover:border-fuchsia-400 cursor-pointer'
              }`}
            >
              {revealed ? card : '❓'}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
