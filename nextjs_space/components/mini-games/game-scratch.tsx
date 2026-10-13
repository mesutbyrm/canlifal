'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

const PRIZES = [
  { symbol: '💎', label: 'Elmas', multiplier: 5 },
  { symbol: '⭐', label: 'Yıldız', multiplier: 3 },
  { symbol: '🍀', label: 'Şans', multiplier: 2 },
  { symbol: '🔔', label: 'Zil', multiplier: 1.5 },
  { symbol: '🍒', label: 'Kiraz', multiplier: 1 },
  { symbol: '❌', label: 'Boş', multiplier: 0 },
]

function randomPrize() {
  const r = Math.random()
  if (r < 0.05) return PRIZES[0]  // 5% diamond
  if (r < 0.15) return PRIZES[1]  // 10% star
  if (r < 0.30) return PRIZES[2]  // 15% luck
  if (r < 0.50) return PRIZES[3]  // 20% bell
  if (r < 0.75) return PRIZES[4]  // 25% cherry
  return PRIZES[5]                 // 25% empty
}

function generateCard(): typeof PRIZES[number][][] {
  return Array(3).fill(null).map(() => Array(3).fill(null).map(() => randomPrize()))
}

interface Props {
  onComplete: (score: number) => void
}

export default function GameScratch({ onComplete }: Props) {
  const [card, setCard] = useState(() => generateCard())
  const [scratched, setScratched] = useState(() => Array(3).fill(null).map(() => Array(3).fill(false)))
  const [allRevealed, setAllRevealed] = useState(false)
  const [winMessage, setWinMessage] = useState<string | null>(null)
  const submitted = useRef(false)

  const scratchCell = useCallback((r: number, c: number) => {
    if (scratched[r][c] || allRevealed) return
    const ns = scratched.map(row => [...row])
    ns[r][c] = true
    setScratched(ns)

    // Check if all scratched
    const allDone = ns.every(row => row.every(v => v))
    if (allDone) {
      setAllRevealed(true)
      // Calculate winnings
      const flat = card.flat()
      const counts: Record<string, number> = {}
      flat.forEach(p => { counts[p.symbol] = (counts[p.symbol] || 0) + 1 })

      let bestWin = 0
      let bestMsg = ''
      for (const [sym, count] of Object.entries(counts)) {
        const prize = PRIZES.find(p => p.symbol === sym)
        if (!prize || prize.multiplier === 0) continue
        if (count >= 3) {
          const win = Math.round(prize.multiplier * count * 10)
          if (win > bestWin) {
            bestWin = win
            bestMsg = `${sym} x${count} — ${prize.label} Bonusu!`
          }
        }
      }

      if (bestWin > 0) {
        setWinMessage(`🎉 ${bestMsg}`)
        if (!submitted.current) { submitted.current = true; onComplete(bestWin) }
      } else {
        // Check for any matching pairs
        let pairWin = 0
        for (const [sym, count] of Object.entries(counts)) {
          const prize = PRIZES.find(p => p.symbol === sym)
          if (prize && prize.multiplier > 0 && count >= 2 && prize.multiplier * 10 > pairWin) {
            pairWin = Math.round(prize.multiplier * 10)
          }
        }
        if (pairWin > 0) {
          setWinMessage('✨ İkili eşleşme!')
          if (!submitted.current) { submitted.current = true; onComplete(pairWin) }
        } else {
          setWinMessage('😔 Bu sefer olmadı...')
        }
      }
    }
  }, [scratched, allRevealed, card, onComplete])

  const scratchAll = () => {
    setScratched(Array(3).fill(null).map(() => Array(3).fill(true)))
    // Trigger the check
    setAllRevealed(true)
    const flat = card.flat()
    const counts: Record<string, number> = {}
    flat.forEach(p => { counts[p.symbol] = (counts[p.symbol] || 0) + 1 })
    let bestWin = 0
    let bestMsg = ''
    for (const [sym, count] of Object.entries(counts)) {
      const prize = PRIZES.find(p => p.symbol === sym)
      if (!prize || prize.multiplier === 0) continue
      if (count >= 3) {
        const win = Math.round(prize.multiplier * count * 10)
        if (win > bestWin) { bestWin = win; bestMsg = `${sym} x${count} — ${prize.label} Bonusu!` }
      }
    }
    if (bestWin > 0) {
      setWinMessage(`🎉 ${bestMsg}`)
      if (!submitted.current) { submitted.current = true; onComplete(bestWin) }
    } else {
      let pairWin = 0
      for (const [sym, count] of Object.entries(counts)) {
        const prize = PRIZES.find(p => p.symbol === sym)
        if (prize && prize.multiplier > 0 && count >= 2 && prize.multiplier * 10 > pairWin) pairWin = Math.round(prize.multiplier * 10)
      }
      if (pairWin > 0) {
        setWinMessage('✨ İkili eşleşme!')
        if (!submitted.current) { submitted.current = true; onComplete(pairWin) }
      } else {
        setWinMessage('😔 Bu sefer olmadı...')
      }
    }
  }

  const reset = () => {
    setCard(generateCard())
    setScratched(Array(3).fill(null).map(() => Array(3).fill(false)))
    setAllRevealed(false)
    setWinMessage(null)
    submitted.current = false
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-fuchsia-300/70 text-xs">Kareleri kazı, 3+ aynı sembol bul!</p>

      <div className="bg-gradient-to-br from-amber-900/40 to-yellow-900/30 border-2 border-amber-500/40 rounded-2xl p-3">
        <div className="grid grid-cols-3 gap-2">
          {card.flat().map((prize, i) => {
            const r = Math.floor(i / 3), c = i % 3
            const isScratched = scratched[r][c]
            return (
              <motion.div
                key={i}
                onClick={() => scratchCell(r, c)}
                whileHover={!isScratched ? { scale: 1.05 } : {}}
                whileTap={!isScratched ? { scale: 0.95 } : {}}
                className={`w-20 h-20 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all
                  ${isScratched
                    ? prize.multiplier > 0
                      ? 'bg-gradient-to-br from-amber-900/50 to-yellow-900/40 border-amber-400/50'
                      : 'bg-purple-950/60 border-purple-700/30'
                    : 'bg-gradient-to-br from-amber-600/80 to-yellow-700/80 border-amber-400 hover:border-amber-300'
                  }`}
              >
                {isScratched ? (
                  <span className="text-3xl">{prize.symbol}</span>
                ) : (
                  <span className="text-2xl">🪙</span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {winMessage && (
        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className={`font-bold text-sm text-center ${winMessage.includes('olmadı') ? 'text-fuchsia-300/60' : 'text-amber-300'}`}>
          {winMessage}
        </motion.p>
      )}

      <div className="flex gap-2">
        {!allRevealed && (
          <button onClick={scratchAll} className="px-4 py-2 bg-amber-600/80 text-white rounded-full text-xs font-medium hover:bg-amber-500/80 transition">
            Hepsini Kazı
          </button>
        )}
        {allRevealed && (
          <button onClick={reset} className="px-4 py-2 bg-fuchsia-600 text-white rounded-full text-xs flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Yeni Kart
          </button>
        )}
      </div>

      <div className="text-[10px] text-fuchsia-400/40 text-center">
        <p>💎x3=150 • ⭐x3=90 • 🍀x3=60 • 🔔x3=45 • 🍒x3=30</p>
      </div>
    </div>
  )
}
