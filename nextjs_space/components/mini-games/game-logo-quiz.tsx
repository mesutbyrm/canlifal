'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Logo quiz using emoji-based "logos" and brand recognition
const LOGO_QUESTIONS = [
  { clue: '🍎', hint: 'Teknoloji devi, ısırılmış meyve', answer: 'APPLE', letters: 'AELPPMXY' },
  { clue: '🔵🔴🟡🟢', hint: 'Arama motoru', answer: 'GOOGLE', letters: 'GOOLGEXY' },
  { clue: '☕', hint: 'Yeşil deniz kızı logolu kahve zinciri', answer: 'STARBUCKS', letters: 'STARBUCKS' },
  { clue: '🐦🟦', hint: 'Mavi kuş, sosyal medya (eski adı)', answer: 'TWITTER', letters: 'TWITTERZ' },
  { clue: '📷', hint: 'Kare fotoğraf paylaşım uygulaması', answer: 'INSTAGRAM', letters: 'INSTAGRMX' },
  { clue: '🚗⚡', hint: 'Elektrikli otomobil öncüsü', answer: 'TESLA', letters: 'TESLAMXY' },
  { clue: '👟✔️', hint: 'Swoosh logolu spor markası', answer: 'NIKE', letters: 'NIKEXZAB' },
  { clue: '🍔🟡', hint: 'Altın kemerli hamburger zinciri', answer: 'MCDONALDS', letters: 'MCDONALDS' },
  { clue: '🎬🔴', hint: 'Kırmızı N logolu dizi platformu', answer: 'NETFLIX', letters: 'NETFLIXZ' },
  { clue: '🎵🟢', hint: 'Yeşil dalgalı müzik platformu', answer: 'SPOTIFY', letters: 'SPOTIFYZ' },
  { clue: '✈️🇹🇷', hint: 'Türk Hava Yolları', answer: 'THY', letters: 'THYXZWAB' },
  { clue: '📦🟠', hint: 'Gülümseyen ok logolu alışveriş sitesi', answer: 'AMAZON', letters: 'AMAZONXY' },
  { clue: '💬🟢', hint: 'Yeşil mesajlaşma uygulaması', answer: 'WHATSAPP', letters: 'WHATSAPP' },
  { clue: '🎮🔵', hint: 'PlayStation yapımcısı', answer: 'SONY', letters: 'SONYXZAB' },
  { clue: '🌊💻', hint: 'Pencerelerin şirketi', answer: 'MICROSOFT', letters: 'MICROSOFT' },
]

interface LogoQuizProps { onComplete: (score: number) => void }

export default function GameLogoQuiz({ onComplete }: LogoQuizProps) {
  const [questions] = useState(() => [...LOGO_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 8))
  const [qIdx, setQIdx] = useState(0)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [finished, setFinished] = useState(false)
  const [completed, setCompleted] = useState(false)

  const currentQ = questions[qIdx]
  const shuffledLetters = useState(() => questions.map(q => q.letters.split('').sort(() => Math.random() - 0.5)))[0]

  const checkAnswer = useCallback(() => {
    if (result || finished) return
    const correct = input.toUpperCase().trim() === currentQ.answer
    setResult(correct ? 'correct' : 'wrong')
    const hintPenalty = showHint ? 5 : 0
    const newScore = correct ? score + 15 - hintPenalty : score
    if (correct) setScore(newScore)

    setTimeout(() => {
      if (qIdx + 1 >= questions.length) {
        setFinished(true)
        if (!completed) {
          setCompleted(true)
          setTimeout(() => onComplete(newScore), 300)
        }
      } else {
        setQIdx(qIdx + 1)
        setInput('')
        setResult(null)
        setShowHint(false)
      }
    }, 1200)
  }, [input, currentQ, result, finished, qIdx, questions, score, showHint, completed, onComplete])

  const addLetter = (letter: string) => {
    if (result || input.length >= currentQ.answer.length) return
    setInput(input + letter)
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 p-4">
        <div className="text-4xl">🏆</div>
        <div className="text-xl font-bold text-amber-300">Logo Quiz Bitti!</div>
        <div className="text-3xl font-bold text-white">{score} puan</div>
        <div className="text-sm text-fuchsia-300/60">{score >= 80 ? 'Logo ustası! 🌟' : score >= 40 ? 'İyi bildin! 👍' : 'Daha fazla çalış! 💪'}</div>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 p-3 w-full max-w-sm">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs text-fuchsia-300/60">{qIdx + 1}/{questions.length}</span>
        <span className="text-xs text-amber-300 font-bold">Puan: {score}</span>
      </div>

      {/* Clue */}
      <AnimatePresence mode="wait">
        <motion.div key={qIdx} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="text-6xl mb-2">{currentQ.clue}</div>
          {showHint && <div className="text-xs text-fuchsia-300/70 italic">💡 {currentQ.hint}</div>}
          {!showHint && !result && (
            <button onClick={() => setShowHint(true)} className="text-[10px] text-fuchsia-400/50 hover:text-fuchsia-300">İpucu göster (-5 puan)</button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Answer display */}
      <div className="flex gap-1">
        {Array.from({ length: currentQ.answer.length }).map((_, i) => (
          <div key={i} className={`w-8 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-bold ${
            result === 'correct' ? 'border-green-400 bg-green-900/30 text-green-300' :
            result === 'wrong' ? 'border-red-400 bg-red-900/30 text-red-300' :
            input[i] ? 'border-amber-400 bg-amber-900/20 text-amber-200' : 'border-fuchsia-500/30 bg-purple-900/20 text-fuchsia-300/30'
          }`}>
            {result === 'wrong' && !input[i] ? currentQ.answer[i] : (input[i] || '_')}
          </div>
        ))}
      </div>

      {/* Letter buttons */}
      {!result && (
        <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
          {shuffledLetters[qIdx].map((letter, i) => (
            <button
              key={i}
              onClick={() => addLetter(letter)}
              className="w-8 h-8 rounded-lg bg-purple-900/40 border border-fuchsia-500/30 text-white text-xs font-bold hover:bg-fuchsia-900/40 hover:border-fuchsia-400/60 transition-all"
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      {!result && (
        <div className="flex gap-2">
          <button onClick={() => setInput(input.slice(0, -1))} className="px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded-lg hover:bg-red-900/20">← Sil</button>
          <button onClick={checkAnswer} disabled={input.length !== currentQ.answer.length} className="px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-lg hover:opacity-90 disabled:opacity-30">
            Kontrol Et
          </button>
        </div>
      )}

      {result === 'correct' && <div className="text-green-400 font-bold text-sm">✅ Doğru!</div>}
      {result === 'wrong' && <div className="text-red-400 font-bold text-sm">❌ Yanlış! Cevap: {currentQ.answer}</div>}
    </div>
  )
}
