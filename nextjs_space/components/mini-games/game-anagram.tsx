'use client'

import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Shuffle, Timer } from 'lucide-react'

const ANAGRAM_SETS = [
  { letters: 'ASTRLO', words: ['ASTRO', 'STAR', 'TORS', 'RATS', 'SALT', 'ORAL', 'ALTO'], minWord: 3 },
  { letters: 'BURCYG', words: ['BURC', 'BURG', 'CUYR', 'RUG', 'CUR', 'BUG', 'CUB', 'RUB'], minWord: 3 },
  { letters: 'FALCIN', words: ['FALCI', 'FILAN', 'CANLI', 'FAN', 'CAN', 'FIN', 'ALI'], minWord: 3 },
  { letters: 'YLDIZN', words: ['YILDIZ', 'YILD', 'DIZI', 'DIN', 'NIZ', 'YIL'], minWord: 3 },
  { letters: 'KRMETA', words: ['KARMET', 'KRETA', 'KARMA', 'KART', 'TRAM', 'MARK', 'KAR', 'TAR', 'MET'], minWord: 3 },
  { letters: 'EJNRSI', words: ['ENERJI', 'RESIN', 'SIREN', 'SIN', 'JIN', 'SIR'], minWord: 3 },
]

interface Props {
  onComplete: (score: number) => void
}

export default function GameAnagram({ onComplete }: Props) {
  const [setIdx, setSetIdx] = useState(() => Math.floor(Math.random() * ANAGRAM_SETS.length))
  const currentSet = ANAGRAM_SETS[setIdx]
  const [letters, setLetters] = useState(() => currentSet.letters.split('').sort(() => Math.random() - 0.5))
  const [input, setInput] = useState('')
  const [foundWords, setFoundWords] = useState<string[]>([])
  const [score, setScore] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(60)
  const [started, setStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const submitted = useRef(false)

  const startGame = () => {
    setStarted(true)
    setTimeLeft(60)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setGameOver(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const submitWord = useCallback(() => {
    if (!input || gameOver) return
    const word = input.toUpperCase().trim()
    setInput('')

    if (word.length < currentSet.minWord) {
      setMessage('Çok kısa!')
      setTimeout(() => setMessage(null), 1000)
      return
    }

    if (foundWords.includes(word)) {
      setMessage('Zaten buldun!')
      setTimeout(() => setMessage(null), 1000)
      return
    }

    // Check if word uses only available letters
    const available = [...currentSet.letters]
    for (const ch of word) {
      const idx = available.indexOf(ch)
      if (idx === -1) {
        setMessage('Geçersiz harfler!')
        setTimeout(() => setMessage(null), 1000)
        return
      }
      available.splice(idx, 1)
    }

    // Accept any word of 3+ letters formed from available letters
    const points = word.length * 10
    const newScore = score + points
    setScore(newScore)
    setFoundWords(prev => [...prev, word])
    setMessage(`+${points} puan!`)
    setTimeout(() => setMessage(null), 1000)

    if (!submitted.current && newScore >= 50) {
      submitted.current = true
      onComplete(newScore)
    }
  }, [input, gameOver, currentSet, foundWords, score, onComplete])

  const shuffleLetters = () => {
    setLetters(prev => [...prev].sort(() => Math.random() - 0.5))
  }

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    const newIdx = Math.floor(Math.random() * ANAGRAM_SETS.length)
    setSetIdx(newIdx)
    setLetters(ANAGRAM_SETS[newIdx].letters.split('').sort(() => Math.random() - 0.5))
    setInput('')
    setFoundWords([])
    setScore(0)
    setMessage(null)
    setTimeLeft(60)
    setStarted(false)
    setGameOver(false)
    submitted.current = false
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-fuchsia-300 text-sm">Verilen harflerden kelimeler türet!</p>
          <p className="text-fuchsia-400/50 text-xs">60 saniyede en çok kelimeyi bul</p>
        </div>
        <div className="flex gap-2">
          {letters.map((l, i) => (
            <div key={i} className="w-10 h-12 bg-purple-800/50 border border-fuchsia-500/30 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              {l}
            </div>
          ))}
        </div>
        <button onClick={startGame} className="px-6 py-2.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold rounded-full hover:scale-105 transition">
          🎯 Başla!
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Timer & Score */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-1 text-sm ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-fuchsia-300'}`}>
          <Timer className="w-3.5 h-3.5" /> {timeLeft}s
        </div>
        <div className="text-amber-400 text-sm font-bold">⭐ {score}</div>
        <div className="text-fuchsia-300/60 text-xs">Kelime: {foundWords.length}</div>
      </div>

      {/* Letters */}
      <div className="flex gap-1.5">
        {letters.map((l, i) => (
          <motion.button key={`${l}-${i}`}
            onClick={() => setInput(prev => prev + l)}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-12 bg-purple-800/50 border border-fuchsia-500/30 rounded-lg text-white font-bold text-lg hover:bg-fuchsia-700/40 hover:border-fuchsia-400 transition"
          >
            {l}
          </motion.button>
        ))}
        <button onClick={shuffleLetters} className="p-2 bg-fuchsia-700/40 rounded-lg"><Shuffle className="w-4 h-4 text-fuchsia-300" /></button>
      </div>

      {/* Input */}
      <div className="flex gap-2 w-full max-w-xs">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && submitWord()}
          placeholder="Kelime yaz..."
          disabled={gameOver}
          className="flex-1 px-3 py-2 bg-purple-900/50 border border-fuchsia-500/30 rounded-lg text-white text-center font-bold uppercase focus:outline-none focus:border-fuchsia-400"
        />
        <button onClick={submitWord} disabled={gameOver} className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg font-bold text-sm disabled:opacity-50">Gönder</button>
      </div>

      {message && (
        <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-amber-300 text-xs font-bold">{message}</motion.p>
      )}

      {/* Found words */}
      {foundWords.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center max-w-xs">
          {foundWords.map((w, i) => (
            <span key={i} className="px-2 py-0.5 bg-green-900/40 border border-green-500/30 rounded text-green-300 text-[10px] font-medium">{w}</span>
          ))}
        </div>
      )}

      {gameOver && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className="text-amber-300 font-bold">⏰ Süre doldu!</p>
          <p className="text-fuchsia-300/60 text-xs">{foundWords.length} kelime • {score} puan</p>
          <button onClick={reset} className="mt-2 px-4 py-1.5 bg-fuchsia-600 text-white rounded-full text-xs flex items-center gap-1 mx-auto">
            <RotateCcw className="w-3 h-3" /> Tekrar Oyna
          </button>
        </motion.div>
      )}
    </div>
  )
}
