'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { zarRoll } from '@/lib/game-logic'
import { useEffect, useRef } from 'react'

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

export default function ZarPage() {
  return (
    <GameShell
      gameType="zar"
      gameName="Zar Atma"
      gameEmoji="🎲"
      gameDesc="3 el zar at, en çok el kazanan galip!"
      supportsAI={true}
    >
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }) => (
        <ZarBoard room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator} playerNum={playerNum} sendMove={sendMove} sendAIState={sendAIState} />
      )}
    </GameShell>
  )
}

function ZarBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const aiRef = useRef<any>(null)

  // AI auto-roll
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || room.currentTurn !== 2) return
    if (state.phase !== 'p1rolled') return
    if (aiRef.current) clearTimeout(aiRef.current)
    aiRef.current = setTimeout(async () => {
      const result = zarRoll(state, 2)
      if (!result.error) {
        const p1w = result.p1Score || 0
        const p2w = result.p2Score || 0
        await sendAIState({
          state: result.state,
          player1Score: p1w,
          player2Score: p2w,
          currentTurn: 1,
          status: result.winner || result.isDraw ? 'completed' : 'active',
          winnerId: result.winner === 1 ? room.player1Id : result.winner === 2 ? room.player2Id : null,
        })
      }
    }, 1000)
    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state])

  const rounds = state?.rounds || []
  const phase = state?.phase || 'ready'
  const totalRounds = state?.totalRounds || 3
  const currentRound = state?.currentRound || 0

  const canRoll = !isSpectator && room.status === 'active' && (
    (playerNum === 1 && phase === 'ready') ||
    (playerNum === 2 && phase === 'p1rolled')
  )

  const handleRoll = async () => {
    if (!canRoll) return
    await sendMove({})
  }

  // Calculate round wins
  let p1Wins = 0, p2Wins = 0
  for (const r of rounds) {
    const s1 = (r.player1 || []).reduce((a: number, b: number) => a + b, 0)
    const s2 = (r.player2 || []).reduce((a: number, b: number) => a + b, 0)
    if (s1 > s2) p1Wins++
    else if (s2 > s1) p2Wins++
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      {/* Scoreboard */}
      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <p className="text-xs text-fuchsia-300/60">{room.player1Name || 'Oyuncu 1'}</p>
          <p className="text-2xl font-bold text-cyan-400">{p1Wins}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-fuchsia-300/40">El {Math.min(currentRound + (phase === 'ready' ? 1 : 0), totalRounds)}/{totalRounds}</p>
          <p className="text-fuchsia-400 text-lg">vs</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-fuchsia-300/60">{room.player2Name || 'Oyuncu 2'}</p>
          <p className="text-2xl font-bold text-pink-400">{p2Wins}</p>
        </div>
      </div>

      {/* Current round dice */}
      {rounds.length > 0 && (
        <div className="space-y-2 w-full">
          {rounds.map((r: any, idx: number) => {
            const s1 = (r.player1 || []).reduce((a: number, b: number) => a + b, 0)
            const s2 = (r.player2 || []).reduce((a: number, b: number) => a + b, 0)
            const isLast = idx === rounds.length - 1
            return (
              <motion.div
                key={idx}
                initial={isLast ? { opacity: 0, y: 10 } : {}}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center justify-between px-4 py-2 rounded-xl border ${
                  isLast && phase === 'p1rolled'
                    ? 'bg-amber-900/20 border-amber-500/30'
                    : s1 > s2 ? 'bg-cyan-900/10 border-cyan-500/20' : s2 > s1 ? 'bg-pink-900/10 border-pink-500/20' : 'bg-purple-900/10 border-purple-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {(r.player1 || []).map((d: number, di: number) => (
                    <span key={di} className="text-2xl">{DICE_FACES[d]}</span>
                  ))}
                  <span className="text-cyan-300 font-bold text-sm">({s1})</span>
                </div>
                <span className="text-fuchsia-400/40 text-xs">El {idx + 1}</span>
                <div className="flex items-center gap-2">
                  <span className="text-pink-300 font-bold text-sm">({s2})</span>
                  {(r.player2 || []).length > 0 ? (
                    (r.player2 || []).map((d: number, di: number) => (
                      <span key={di} className="text-2xl">{DICE_FACES[d]}</span>
                    ))
                  ) : (
                    <span className="text-fuchsia-400/40 text-sm">🎲🎲</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Roll button */}
      {canRoll && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRoll}
          className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-full text-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition"
        >
          🎲 Zar At!
        </motion.button>
      )}

      {!canRoll && room.status === 'active' && !isSpectator && (
        <p className="text-fuchsia-400/60 text-sm animate-pulse">Rakibin zarları atması bekleniyor...</p>
      )}
    </div>
  )
}
