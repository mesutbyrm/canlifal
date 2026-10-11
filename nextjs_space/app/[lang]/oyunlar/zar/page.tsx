'use client'

import GameShell from '@/components/game-shell'
import { DiceRollAnimation, DiceButton } from '@/components/dice-3d'
import { motion } from 'framer-motion'
import { zarRoll } from '@/lib/game-logic'
import { useEffect, useRef, useState } from 'react'

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
  const [rolling, setRolling] = useState(false)
  const [lastRoundIdx, setLastRoundIdx] = useState(-1)

  // AI auto-roll (supports AI as either player for disconnect takeover)
  const aiPlayerNum = room.disconnectedPlayerId === room.player1Id ? 1 : 2
  const humanPlayerNum = aiPlayerNum === 1 ? 2 : 1
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || room.currentTurn !== aiPlayerNum) return
    // Zar: AI rolls after the human has rolled (phase depends on who rolled first)
    if (aiPlayerNum === 2 && state.phase !== 'p1rolled') return
    if (aiPlayerNum === 1 && state.phase !== 'ready') return
    if (aiRef.current) clearTimeout(aiRef.current)
    aiRef.current = setTimeout(async () => {
      const result = zarRoll(state, aiPlayerNum)
      if (!result.error) {
        const p1w = result.p1Score || 0
        const p2w = result.p2Score || 0
        await sendAIState({
          state: result.state,
          player1Score: p1w,
          player2Score: p2w,
          currentTurn: humanPlayerNum,
          status: result.winner || result.isDraw ? 'completed' : 'active',
          winnerId: result.winner === 1 ? room.player1Id : result.winner === 2 ? room.player2Id : null,
        })
      }
    }, 1000)
    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state, aiPlayerNum, humanPlayerNum])

  const rounds = state?.rounds || []
  const phase = state?.phase || 'ready'
  const totalRounds = state?.totalRounds || 3
  const currentRound = state?.currentRound || 0

  // Track new round for animation
  useEffect(() => {
    if (rounds.length > 0 && rounds.length - 1 !== lastRoundIdx) {
      setRolling(true)
      setLastRoundIdx(rounds.length - 1)
      setTimeout(() => setRolling(false), 700)
    }
  }, [rounds.length])

  const canRoll = !isSpectator && room.status === 'active' && (
    (playerNum === 1 && phase === 'ready') ||
    (playerNum === 2 && phase === 'p1rolled')
  )

  const handleRoll = async () => {
    if (!canRoll) return
    setRolling(true)
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

      {/* Rounds */}
      {rounds.length > 0 && (
        <div className="space-y-3 w-full">
          {rounds.map((r: any, idx: number) => {
            const s1 = (r.player1 || []).reduce((a: number, b: number) => a + b, 0)
            const s2 = (r.player2 || []).reduce((a: number, b: number) => a + b, 0)
            const isLast = idx === rounds.length - 1
            const isP1Rolled = r.player1 && r.player1.length > 0
            const isP2Rolled = r.player2 && r.player2.length > 0
            return (
              <motion.div
                key={idx}
                initial={isLast ? { opacity: 0, y: 10 } : {}}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                  isLast && !isP2Rolled
                    ? 'bg-amber-900/20 border-amber-500/30'
                    : s1 > s2 ? 'bg-cyan-900/10 border-cyan-500/20' : s2 > s1 ? 'bg-pink-900/10 border-pink-500/20' : 'bg-purple-900/10 border-purple-500/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isP1Rolled ? (
                    <>
                      <DiceRollAnimation dice={r.player1} rolling={isLast && rolling && !isP2Rolled} size={36} />
                      <span className="text-cyan-300 font-bold text-sm">({s1})</span>
                    </>
                  ) : (
                    <span className="text-fuchsia-400/40 text-sm">🎲🎲</span>
                  )}
                </div>
                <span className="text-fuchsia-400/40 text-xs">El {idx + 1}</span>
                <div className="flex items-center gap-3">
                  {isP2Rolled ? (
                    <>
                      <span className="text-pink-300 font-bold text-sm">({s2})</span>
                      <DiceRollAnimation dice={r.player2} rolling={isLast && rolling && isP2Rolled} size={36} />
                    </>
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
        <DiceButton onRoll={handleRoll} disabled={rolling} label="🎲 Zar At!" />
      )}

      {!canRoll && room.status === 'active' && !isSpectator && (
        <p className="text-fuchsia-400/60 text-sm animate-pulse">Rakibin zarları atması bekleniyor...</p>
      )}
    </div>
  )
}
