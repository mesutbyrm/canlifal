'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🔔', '⭐', '🍀']
const REEL_SIZE = 12

function buildReel(): string[] {
  const reel: string[] = []
  for (let i = 0; i < REEL_SIZE; i++) reel.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
  return reel
}

interface Props {
  onComplete: (score: number) => void
}

export default function GameSlot({ onComplete }: Props) {
  const [reels, setReels] = useState<string[][]>([buildReel(), buildReel(), buildReel()])
  const [results, setResults] = useState<string[]>(['🍒', '🍋', '🍊'])
  const [spinning, setSpinning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [totalWins, setTotalWins] = useState(0)
  const submitted = useRef(false)

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setMessage(null)

    const newReels = [buildReel(), buildReel(), buildReel()]
    setReels(newReels)

    // Determine final symbols
    const final = newReels.map(r => r[Math.floor(r.length / 2)])

    setTimeout(() => {
      setResults(final)
      setSpinning(false)

      // Check wins
      if (final[0] === final[1] && final[1] === final[2]) {
        const sym = final[0]
        let multiplier = 3
        if (sym === '💎') multiplier = 10
        else if (sym === '7️⃣') multiplier = 7
        else if (sym === '⭐') multiplier = 5
        setMessage(`🎰 JACKPOT! ${sym}${sym}${sym} — ${multiplier}x Ödül!`)
        setTotalWins(w => w + multiplier)
        if (!submitted.current) {
          submitted.current = true
          onComplete(multiplier * 10)
        }
      } else if (final[0] === final[1] || final[1] === final[2] || final[0] === final[2]) {
        setMessage('✨ İkili eşleşme! Küçük ödül!')
        setTotalWins(w => w + 1)
        if (!submitted.current) {
          submitted.current = true
          onComplete(20)
        }
      } else {
        setMessage(null)
      }
    }, 1800)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Slot Machine */}
      <div className="bg-gradient-to-b from-purple-900/60 to-fuchsia-900/40 border-2 border-amber-500/40 rounded-2xl p-4 shadow-lg shadow-amber-500/10">
        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-20 h-24 bg-purple-950/80 border border-fuchsia-500/30 rounded-xl overflow-hidden flex items-center justify-center">
              {spinning ? (
                <motion.div
                  animate={{ y: [-200, 0] }}
                  transition={{ duration: 1.5 + i * 0.3, ease: 'easeOut' }}
                  className="flex flex-col items-center gap-2"
                >
                  {reels[i].map((sym, j) => (
                    <span key={j} className="text-3xl">{sym}</span>
                  ))}
                </motion.div>
              ) : (
                <span className="text-4xl">{results[i]}</span>
              )}
            </div>
          ))}
        </div>

        {/* Payline indicator */}
        <div className="flex justify-center mt-2">
          <div className="h-0.5 w-full max-w-[260px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
        </div>
      </div>

      {/* Message */}
      {message && (
        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-amber-300 font-bold text-sm text-center">
          {message}
        </motion.p>
      )}

      {/* Spin button */}
      <button
        onClick={spin}
        disabled={spinning}
        className="px-8 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold rounded-full text-lg hover:scale-105 transition disabled:opacity-50 shadow-lg shadow-amber-500/30"
      >
        {spinning ? '🎰 Dönüyor...' : '🎰 ÇEVİR'}
      </button>

      <div className="text-xs text-fuchsia-400/50 text-center">
        <p>3 aynı sembol = Jackpot! • 2 aynı = Küçük ödül</p>
        <p>💎=10x • 7️⃣=7x • ⭐=5x • Diğer=3x</p>
      </div>
    </div>
  )
}
