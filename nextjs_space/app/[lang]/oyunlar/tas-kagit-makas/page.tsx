'use client'

import GameShell from '@/components/game-shell'
import { motion, AnimatePresence } from 'framer-motion'
import { tkmAI, tkmMove } from '@/lib/game-logic'
import { useEffect, useRef, useState } from 'react'

export default function TasKagitMakasPage() {
  return (
    <GameShell
      gameType="tas_kagit_makas"
      gameName="Taş Kağıt Makas"
      gameEmoji="✊✋✌️"
      gameDesc="5 el oyna, en çok el kazanan galip!"
      supportsAI={true}
    >
      {(props) => <TKMBoard {...props} />}
    </GameShell>
  )
}

const CHOICES = [
  { id: 'tas', emoji: '🪨', label: 'Taş' },
  { id: 'kagit', emoji: '📄', label: 'Kağıt' },
  { id: 'makas', emoji: '✂️', label: 'Makas' },
]

function TKMBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const aiTimerRef = useRef<any>(null)
  const [chosen, setChosen] = useState(false)
  const round = state?.round || 1
  const maxRounds = state?.maxRounds || 5
  const p1Score = state?.p1Score || 0
  const p2Score = state?.p2Score || 0
  const lastResult = state?.lastResult

  // Reset chosen when round changes
  useEffect(() => { setChosen(false) }, [round])

  // AI auto-play
  const aiPlayerNum = room.disconnectedPlayerId === room.player1Id ? 1 : 2
  const humanPlayerNum = aiPlayerNum === 1 ? 2 : 1
  useEffect(() => {
    if (!room.isAI || room.status !== 'active') return
    // AI plays after human
    const p1Choices = state?.p1Choices || []
    const p2Choices = state?.p2Choices || []
    const aiChoices = aiPlayerNum === 1 ? p1Choices : p2Choices
    const humanChoices = aiPlayerNum === 1 ? p2Choices : p1Choices
    if (humanChoices.length <= aiChoices.length) return
    
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    aiTimerRef.current = setTimeout(async () => {
      const aiChoice = tkmAI()
      const result = tkmMove(state, aiChoice, aiPlayerNum)
      if (!result.error && !result.waiting) {
        await sendAIState({
          state: result.state,
          player1Score: result.player1Score ?? p1Score,
          player2Score: result.player2Score ?? p2Score,
          currentTurn: room.currentTurn,
          status: result.winner !== undefined && result.winner !== null || result.isDraw ? 'completed' : 'active',
          winnerId: result.winner === 1 ? room.player1Id : result.winner === 2 ? room.player2Id : null,
        })
      } else if (result.waiting) {
        await sendAIState({ state: result.state, player1Score: p1Score, player2Score: p2Score, currentTurn: room.currentTurn, status: 'active' })
      }
    }, 600)
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [room, state, aiPlayerNum])

  const handleChoice = async (choice: string) => {
    if (isSpectator || room.status !== 'active' || chosen) return
    setChosen(true)
    await sendMove({ choice })
  }

  const emojiFor = (id: string) => CHOICES.find(c => c.id === id)?.emoji || '❓'

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score */}
      <div className="flex items-center gap-8 text-lg">
        <div className="text-center">
          <div className="text-xs text-fuchsia-300/60">{room.player1Name || 'Oyuncu 1'}</div>
          <div className="text-2xl font-bold text-amber-300">{p1Score}</div>
        </div>
        <div className="text-fuchsia-400 text-sm">El {Math.min(round, maxRounds)} / {maxRounds}</div>
        <div className="text-center">
          <div className="text-xs text-fuchsia-300/60">{room.player2Name || 'Oyuncu 2'}</div>
          <div className="text-2xl font-bold text-amber-300">{p2Score}</div>
        </div>
      </div>

      {/* Last result */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-6 text-3xl"
          >
            <span>{emojiFor(lastResult.p1)}</span>
            <span className="text-sm text-fuchsia-300">vs</span>
            <span>{emojiFor(lastResult.p2)}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status */}
      <div className="text-sm text-fuchsia-300/80">
        {room.status === 'completed'
          ? (room.winnerId ? '🏆 Oyun bitti!' : '🤝 Berabere!')
          : chosen ? '⏳ Rakip seçiyor...' : 'Seçimini yap!'}
      </div>

      {/* Choices */}
      {room.status === 'active' && !isSpectator && (
        <div className="flex gap-4">
          {CHOICES.map(c => (
            <motion.button
              key={c.id}
              whileHover={{ scale: 1.15, y: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleChoice(c.id)}
              disabled={chosen}
              className={`w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${
                chosen ? 'opacity-40 cursor-not-allowed border-gray-600/30 bg-gray-900/30' : 'border-fuchsia-400/40 bg-fuchsia-900/20 hover:border-fuchsia-400 hover:bg-fuchsia-800/30 cursor-pointer'
              }`}
            >
              <span className="text-3xl">{c.emoji}</span>
              <span className="text-[10px] text-fuchsia-300">{c.label}</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
