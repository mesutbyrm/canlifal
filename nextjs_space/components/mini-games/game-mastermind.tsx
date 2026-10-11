'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316']
const COLOR_NAMES = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Mor', 'Turuncu']
const CODE_LENGTH = 4
const MAX_GUESSES = 10

interface MastermindProps { onComplete: (score: number) => void }

export default function GameMastermind({ onComplete }: MastermindProps) {
  const [secret] = useState(() => Array.from({ length: CODE_LENGTH }, () => Math.floor(Math.random() * COLORS.length)))
  const [guesses, setGuesses] = useState<number[][]>([])
  const [feedback, setFeedback] = useState<{ exact: number; close: number }[]>([])
  const [current, setCurrent] = useState<number[]>([])
  const [won, setWon] = useState(false)
  const [lost, setLost] = useState(false)
  const [completed, setCompleted] = useState(false)

  const checkGuess = useCallback((guess: number[]) => {
    let exact = 0, close = 0
    const sUsed = Array(CODE_LENGTH).fill(false)
    const gUsed = Array(CODE_LENGTH).fill(false)
    for (let i = 0; i < CODE_LENGTH; i++) {
      if (guess[i] === secret[i]) { exact++; sUsed[i] = true; gUsed[i] = true }
    }
    for (let i = 0; i < CODE_LENGTH; i++) {
      if (gUsed[i]) continue
      for (let j = 0; j < CODE_LENGTH; j++) {
        if (sUsed[j]) continue
        if (guess[i] === secret[j]) { close++; sUsed[j] = true; break }
      }
    }
    return { exact, close }
  }, [secret])

  const submitGuess = useCallback(() => {
    if (current.length !== CODE_LENGTH || won || lost) return
    const fb = checkGuess(current)
    const newGuesses = [...guesses, current]
    const newFeedback = [...feedback, fb]
    setGuesses(newGuesses)
    setFeedback(newFeedback)
    setCurrent([])

    if (fb.exact === CODE_LENGTH) {
      setWon(true)
      if (!completed) {
        setCompleted(true)
        const score = Math.max(10, 100 - (newGuesses.length - 1) * 10)
        setTimeout(() => onComplete(score), 500)
      }
    } else if (newGuesses.length >= MAX_GUESSES) {
      setLost(true)
      if (!completed) {
        setCompleted(true)
        setTimeout(() => onComplete(5), 500)
      }
    }
  }, [current, guesses, feedback, won, lost, completed, checkGuess, onComplete])

  const addColor = (colorIdx: number) => {
    if (current.length >= CODE_LENGTH || won || lost) return
    setCurrent([...current, colorIdx])
  }

  const removeLast = () => setCurrent(current.slice(0, -1))

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <div className="text-center">
        <h3 className="text-lg font-bold text-amber-300">🧠 Mastermind</h3>
        <p className="text-xs text-fuchsia-300/60">4 renkli gizli kodu {MAX_GUESSES} denemede bul!</p>
      </div>

      {/* Past guesses */}
      <div className="flex flex-col gap-1.5 w-full max-w-xs">
        {guesses.map((g, gi) => (
          <motion.div key={gi} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 justify-center">
            <span className="text-[10px] text-fuchsia-400/50 w-5">{gi + 1}.</span>
            <div className="flex gap-1">
              {g.map((c, ci) => (
                <div key={ci} className="w-8 h-8 rounded-full border-2 border-white/20" style={{ backgroundColor: COLORS[c] }} />
              ))}
            </div>
            <div className="flex gap-0.5 ml-2">
              {Array(feedback[gi].exact).fill(0).map((_, i) => (
                <div key={`e${i}`} className="w-3 h-3 rounded-full bg-red-500" title="Doğru renk, doğru yer" />
              ))}
              {Array(feedback[gi].close).fill(0).map((_, i) => (
                <div key={`c${i}`} className="w-3 h-3 rounded-full bg-white" title="Doğru renk, yanlış yer" />
              ))}
              {Array(CODE_LENGTH - feedback[gi].exact - feedback[gi].close).fill(0).map((_, i) => (
                <div key={`n${i}`} className="w-3 h-3 rounded-full bg-gray-700" title="Yok" />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Current guess */}
      {!won && !lost && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <div key={i} className={`w-9 h-9 rounded-full border-2 ${
                current[i] !== undefined ? 'border-amber-400/60' : 'border-dashed border-fuchsia-400/30'
              } flex items-center justify-center`} style={current[i] !== undefined ? { backgroundColor: COLORS[current[i]] } : {}}>
                {current[i] === undefined && <span className="text-fuchsia-400/30 text-xs">?</span>}
              </div>
            ))}
          </div>
          {current.length > 0 && (
            <button onClick={removeLast} className="text-xs text-red-400 hover:text-red-300">✘</button>
          )}
          {current.length === CODE_LENGTH && (
            <button onClick={submitGuess} className="px-3 py-1.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-xs rounded-lg font-bold hover:opacity-90">
              Kontrol Et
            </button>
          )}
        </div>
      )}

      {/* Color palette */}
      {!won && !lost && (
        <div className="flex gap-2">
          {COLORS.map((color, i) => (
            <button
              key={i}
              onClick={() => addColor(i)}
              className="w-9 h-9 rounded-full border-2 border-white/20 hover:scale-110 hover:border-white/50 transition-all"
              style={{ backgroundColor: color }}
              title={COLOR_NAMES[i]}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-[9px] text-fuchsia-300/50">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Doğru yer</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white" /> Yanlış yer</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-700" /> Yok</span>
      </div>

      {/* Status */}
      <div className="text-xs text-fuchsia-300/60">Deneme: {guesses.length} / {MAX_GUESSES}</div>

      {won && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-lg font-bold text-green-400">🎉 Kodu kırdın! ({guesses.length} denemede)</motion.div>}
      {lost && (
        <div className="text-center">
          <div className="text-red-400 font-bold">Hakkın bitti!</div>
          <div className="flex gap-1 mt-1 justify-center">
            {secret.map((c, i) => <div key={i} className="w-7 h-7 rounded-full" style={{ backgroundColor: COLORS[c] }} />)}
          </div>
          <div className="text-[10px] text-fuchsia-300/40 mt-1">Gizli kod buydu</div>
        </div>
      )}
    </div>
  )
}
