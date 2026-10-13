'use client'

import GameShell from '@/components/game-shell'
import { motion, AnimatePresence } from 'framer-motion'
import { kelimeDuellosuAI, kelimeDuellosuMove } from '@/lib/game-logic'
import { useEffect, useRef, useState } from 'react'

export default function KelimeDuellosuPage() {
  return (
    <GameShell
      gameType="kelime_duellosu"
      gameName="Kelime Düellosu"
      gameEmoji="📝⚔️"
      gameDesc="Karışık harfleri çöz, rakibini yen!"
      supportsAI={true}
    >
      {(props) => <WordDuelBoard {...props} />}
    </GameShell>
  )
}

function WordDuelBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const aiTimerRef = useRef<any>(null)
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const round = state?.round || 1
  const maxRounds = state?.maxRounds || 5
  const p1Score = state?.p1Score || 0
  const p2Score = state?.p2Score || 0
  const scrambled = state?.scrambled || '???'
  const history = state?.history || []

  useEffect(() => { setSubmitted(false); setAnswer('') }, [round])

  // AI
  const aiPlayerNum = room.disconnectedPlayerId === room.player1Id ? 1 : 2
  useEffect(() => {
    if (!room.isAI || room.status !== 'active') return
    const aiAnswer = aiPlayerNum === 1 ? state?.p1Answer : state?.p2Answer
    const humanAnswer = aiPlayerNum === 1 ? state?.p2Answer : state?.p1Answer
    if (humanAnswer === null || aiAnswer !== null) return
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    aiTimerRef.current = setTimeout(async () => {
      const ai = kelimeDuellosuAI(state)
      const result = kelimeDuellosuMove(state, { answer: ai }, aiPlayerNum)
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
    }, 1500)
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [room, state, aiPlayerNum])

  const handleSubmit = async () => {
    if (isSpectator || room.status !== 'active' || submitted || !answer.trim()) return
    setSubmitted(true)
    await sendMove({ answer })
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score */}
      <div className="flex items-center gap-8 text-lg">
        <div className="text-center">
          <div className="text-xs text-fuchsia-300/60">{room.player1Name || 'Oyuncu 1'}</div>
          <div className="text-2xl font-bold text-amber-300">{p1Score}</div>
        </div>
        <div className="text-fuchsia-400 text-sm">Tur {Math.min(round, maxRounds)} / {maxRounds}</div>
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
            className="text-xs text-center text-fuchsia-300/60 bg-fuchsia-900/20 rounded-lg px-3 py-1"
          >
            Son: <span className="text-amber-300">{history[history.length - 1].word}</span>
            {' | '}{history[history.length - 1].p1Correct ? '✅' : '❌'} vs {history[history.length - 1].p2Correct ? '✅' : '❌'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrambled word */}
      {room.status === 'active' && (
        <div className="text-center">
          <div className="text-xs text-fuchsia-300/60 mb-1">Karışık Harfler:</div>
          <div className="flex gap-1 justify-center">
            {scrambled.split('').map((ch: string, i: number) => (
              <motion.span
                key={`${round}-${i}`}
                initial={{ rotateY: 90 }}
                animate={{ rotateY: 0 }}
                transition={{ delay: i * 0.05 }}
                className="w-8 h-10 flex items-center justify-center bg-gradient-to-b from-fuchsia-800/40 to-purple-900/40 rounded-lg border border-fuchsia-400/30 text-lg font-bold text-amber-300"
              >
                {ch}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {room.status === 'active' && !isSpectator && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={submitted}
            placeholder="Cevabını yaz..."
            className="px-3 py-2 rounded-xl bg-purple-900/40 border border-fuchsia-400/30 text-fuchsia-100 text-sm placeholder:text-fuchsia-300/30 focus:outline-none focus:border-fuchsia-400 disabled:opacity-40 w-40"
          />
          <button
            onClick={handleSubmit}
            disabled={submitted || !answer.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold text-sm hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-40"
          >
            {submitted ? '⏳' : '📤 Gönder'}
          </button>
        </div>
      )}

      {/* Status */}
      <div className="text-sm text-fuchsia-300/80">
        {room.status === 'completed'
          ? (room.winnerId ? '🏆 Oyun bitti!' : '🤝 Berabere!')
          : submitted ? '⏳ Rakibin cevabı bekleniyor...' : 'Kelimeyi bul!'}
      </div>
    </div>
  )
}
