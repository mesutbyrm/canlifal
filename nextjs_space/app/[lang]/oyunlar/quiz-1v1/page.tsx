'use client'

import GameShell from '@/components/game-shell'
import { motion, AnimatePresence } from 'framer-motion'
import { quiz1v1AI, quiz1v1Move } from '@/lib/game-logic'
import { useEffect, useRef, useState } from 'react'

export default function Quiz1v1Page() {
  return (
    <GameShell
      gameType="quiz_1v1"
      gameName="Quiz 1v1"
      gameEmoji="🧠⚡"
      gameDesc="Bilgi yarışmasında rakibini yen!"
      supportsAI={true}
    >
      {(props) => <QuizPvPBoard {...props} />}
    </GameShell>
  )
}

function QuizPvPBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const aiTimerRef = useRef<any>(null)
  const [answered, setAnswered] = useState(false)
  const round = state?.round || 1
  const maxRounds = state?.maxRounds || 5
  const p1Score = state?.p1Score || 0
  const p2Score = state?.p2Score || 0
  const questions = state?.questions || []
  const currentQ = questions[round - 1]
  const history = state?.history || []

  useEffect(() => { setAnswered(false) }, [round])

  // AI
  const aiPlayerNum = room.disconnectedPlayerId === room.player1Id ? 1 : 2
  useEffect(() => {
    if (!room.isAI || room.status !== 'active') return
    const aiAnswer = aiPlayerNum === 1 ? state?.p1Answer : state?.p2Answer
    const humanAnswer = aiPlayerNum === 1 ? state?.p2Answer : state?.p1Answer
    if (humanAnswer === null || aiAnswer !== null) return
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    aiTimerRef.current = setTimeout(async () => {
      const ai = quiz1v1AI(state)
      const result = quiz1v1Move(state, { answer: ai }, aiPlayerNum)
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
    }, 2000)
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [room, state, aiPlayerNum])

  const handleAnswer = async (optionIdx: number) => {
    if (isSpectator || room.status !== 'active' || answered) return
    setAnswered(true)
    await sendMove({ answer: optionIdx })
  }

  const optionColors = [
    'from-blue-600/40 to-blue-700/40 border-blue-400/40 hover:border-blue-300',
    'from-green-600/40 to-green-700/40 border-green-400/40 hover:border-green-300',
    'from-orange-600/40 to-orange-700/40 border-orange-400/40 hover:border-orange-300',
    'from-purple-600/40 to-purple-700/40 border-purple-400/40 hover:border-purple-300',
  ]

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      {/* Score */}
      <div className="flex items-center gap-8 text-lg">
        <div className="text-center">
          <div className="text-xs text-fuchsia-300/60">{room.player1Name || 'Oyuncu 1'}</div>
          <div className="text-2xl font-bold text-amber-300">{p1Score}</div>
        </div>
        <div className="text-fuchsia-400 text-sm">Soru {Math.min(round, maxRounds)} / {maxRounds}</div>
        <div className="text-center">
          <div className="text-xs text-fuchsia-300/60">{room.player2Name || 'Oyuncu 2'}</div>
          <div className="text-2xl font-bold text-amber-300">{p2Score}</div>
        </div>
      </div>

      {/* Last result */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div
            key={history.length}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-center text-fuchsia-300/60 bg-fuchsia-900/20 rounded-lg px-3 py-1 w-full"
          >
            Son: {history[history.length - 1].p1Correct ? '✅' : '❌'} vs {history[history.length - 1].p2Correct ? '✅' : '❌'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question */}
      {room.status === 'active' && currentQ && (
        <div className="w-full">
          <motion.div
            key={round}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-b from-fuchsia-900/30 to-purple-900/30 rounded-xl p-4 border border-fuchsia-400/20"
          >
            <p className="text-sm text-fuchsia-100 font-semibold mb-3 text-center">{currentQ.q}</p>
            <div className="grid grid-cols-2 gap-2">
              {currentQ.options.map((opt: string, i: number) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAnswer(i)}
                  disabled={answered || isSpectator}
                  className={`px-3 py-2.5 rounded-xl bg-gradient-to-r ${optionColors[i]} border text-xs text-white font-medium transition-all disabled:opacity-40`}
                >
                  {['A', 'B', 'C', 'D'][i]}. {opt}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Status */}
      <div className="text-sm text-fuchsia-300/80">
        {room.status === 'completed'
          ? (room.winnerId ? '🏆 Oyun bitti!' : '🤝 Berabere!')
          : answered ? '⏳ Rakibin cevabı bekleniyor...' : '❓ Cevabını seç!'}
      </div>
    </div>
  )
}
