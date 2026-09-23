'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Timer } from 'lucide-react'

const THEMES = [
  { name: 'Mistik', symbols: ['🔮', '🌙', '⭐', '🌟', '✨', '💫', '🌌', '🌠', '🪐', '🌞', '🌈', '🦋'] },
  { name: 'Hayvan', symbols: ['🐱', '🐶', '🐻', '🦊', '🐰', '🐼', '🦁', '🐯', '🦄', '🐸', '🦋', '🐙'] },
  { name: 'Yemek', symbols: ['🍕', '🍔', '🍣', '🌮', '🍩', '🎂', '🍦', '🧁', '🍫', '🍪', '🥐', '🍜'] },
]

const GRID_SIZES = [
  { label: '4×3', pairs: 6, cols: 4 },
  { label: '4×4', pairs: 8, cols: 4 },
  { label: '6×4', pairs: 12, cols: 6 },
]

interface Card {
  id: number
  symbol: string
  flipped: boolean
  matched: boolean
}

interface Props {
  onComplete: (score: number) => void
}

export default function GameMemoryMatch({ onComplete }: Props) {
  const [themeIdx, setThemeIdx] = useState(0)
  const [sizeIdx, setSizeIdx] = useState(1)
  const [cards, setCards] = useState<Card[]>([])
  const [first, setFirst] = useState<number | null>(null)
  const [moves, setMoves] = useState(0)
  const [matchCount, setMatchCount] = useState(0)
  const [complete, setComplete] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [time, setTime] = useState(0)
  const [timerRef, setTimerRef] = useState<NodeJS.Timeout | null>(null)
  const [started, setStarted] = useState(false)

  const gridSize = GRID_SIZES[sizeIdx]
  const theme = THEMES[themeIdx]

  const initGame = useCallback(() => {
    const symbols = theme.symbols.slice(0, gridSize.pairs)
    const paired = [...symbols, ...symbols]
    const shuffled = paired.sort(() => Math.random() - 0.5)
    setCards(shuffled.map((s, i) => ({ id: i, symbol: s, flipped: false, matched: false })))
    setFirst(null)
    setMoves(0)
    setMatchCount(0)
    setComplete(false)
    setSubmitted(false)
    setTime(0)
    setStarted(false)
    if (timerRef) clearInterval(timerRef)
    setTimerRef(null)
  }, [theme, gridSize, timerRef])

  useEffect(() => { initGame() }, [themeIdx, sizeIdx]) // eslint-disable-line

  const handleFlip = useCallback((idx: number) => {
    if (complete) return
    if (cards[idx].flipped || cards[idx].matched) return

    if (!started) {
      setStarted(true)
      const t = setInterval(() => setTime(prev => prev + 1), 1000)
      setTimerRef(t)
    }

    const nc = cards.map(c => ({ ...c }))
    nc[idx].flipped = true
    setCards(nc)

    if (first === null) {
      setFirst(idx)
    } else {
      setMoves(m => m + 1)
      if (nc[first].symbol === nc[idx].symbol) {
        nc[first].matched = true
        nc[idx].matched = true
        setCards(nc)
        setFirst(null)
        const newMatches = matchCount + 1
        setMatchCount(newMatches)
        if (newMatches === gridSize.pairs) {
          setComplete(true)
          if (timerRef) clearInterval(timerRef)
          if (!submitted) {
            setSubmitted(true)
            const score = Math.max(100 - (moves * 2) - time, 10)
            onComplete(score)
          }
        }
      } else {
        setTimeout(() => {
          const reset = nc.map(c => ({ ...c }))
          reset[first].flipped = false
          reset[idx].flipped = false
          setCards(reset)
          setFirst(null)
        }, 600)
      }
    }
  }, [cards, first, complete, started, matchCount, gridSize.pairs, moves, time, timerRef, submitted, onComplete])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap gap-2 justify-center">
        {THEMES.map((t, i) => (
          <button key={i} onClick={() => setThemeIdx(i)} className={`px-2.5 py-1 rounded-lg text-[10px] border transition ${themeIdx === i ? 'bg-fuchsia-600 border-fuchsia-400 text-white' : 'bg-purple-900/40 border-fuchsia-500/20 text-fuchsia-300'}`}>
            {t.symbols[0]} {t.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {GRID_SIZES.map((s, i) => (
          <button key={i} onClick={() => setSizeIdx(i)} className={`px-2.5 py-1 rounded-lg text-[10px] border transition ${sizeIdx === i ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-purple-900/40 border-fuchsia-500/20 text-fuchsia-300'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="text-fuchsia-300">Hamle: <span className="text-white font-bold">{moves}</span></span>
        <span className="text-fuchsia-300">Eşleşen: <span className="text-green-400 font-bold">{matchCount}/{gridSize.pairs}</span></span>
        <span className="text-fuchsia-300"><Timer className="w-3 h-3 inline" /> <span className="text-white font-bold">{time}s</span></span>
        <button onClick={initGame} className="p-1 bg-fuchsia-700/50 rounded-lg"><RotateCcw className="w-3 h-3 text-fuchsia-300" /></button>
      </div>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${gridSize.cols}, minmax(0, 1fr))` }}>
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            onClick={() => handleFlip(i)}
            whileHover={!card.flipped && !card.matched ? { scale: 1.05 } : {}}
            animate={card.matched ? { scale: [1, 1.15, 1] } : {}}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 flex items-center justify-center text-xl cursor-pointer transition-all
              ${card.matched ? 'bg-green-800/40 border-green-500/40 scale-95' : card.flipped ? 'bg-fuchsia-800/50 border-fuchsia-400' : 'bg-purple-900/50 border-fuchsia-500/30 hover:border-fuchsia-400'}`}
          >
            {card.flipped || card.matched ? card.symbol : '❓'}
          </motion.div>
        ))}
      </div>

      {complete && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <p className="text-green-400 font-bold">🎉 Tebrikler!</p>
          <p className="text-fuchsia-300/60 text-xs">{moves} hamle • {time}s</p>
          <button onClick={initGame} className="mt-2 px-4 py-1.5 bg-fuchsia-600 text-white rounded-full text-xs">Tekrar Oyna</button>
        </motion.div>
      )}
    </div>
  )
}
