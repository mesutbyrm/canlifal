'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

const WORDS = [
  { word: 'ASTROLOJI', hint: 'Yıldızların bilimi' },
  { word: 'TAROT', hint: 'Fal kartları' },
  { word: 'BURC', hint: 'Zodyak işareti' },
  { word: 'KEHANET', hint: 'Gelecek tahmini' },
  { word: 'MELEK', hint: 'Kanatları olan koruyucu' },
  { word: 'RUYA', hint: 'Uyurken görülen' },
  { word: 'FAL', hint: 'Gelecekten haber verme' },
  { word: 'KARMA', hint: 'Evrensel denge yasası' },
  { word: 'AURA', hint: 'Enerji alanı' },
  { word: 'KRISTAL', hint: 'Şifalı taş' },
  { word: 'CAKRA', hint: 'Enerji merkezi' },
  { word: 'MEDYUM', hint: 'Önsezi sahibi kişi' },
  { word: 'GEZEGEN', hint: 'Güneş etrafında döner' },
  { word: 'KADER', hint: 'Alın yazısı' },
  { word: 'SEZGI', hint: 'İçsel his' },
  { word: 'REHBER', hint: 'Yol gösteren' },
  { word: 'NUMEROLOJI', hint: 'Sayıların gizemi' },
  { word: 'MERKUR', hint: 'İletişim gezegeni' },
  { word: 'VENUS', hint: 'Aşk gezegeni' },
  { word: 'MARS', hint: 'Savaşçı gezegen' },
  { word: 'YILDIZ', hint: 'Gökyüzünde parlar' },
  { word: 'DOLUNAY', hint: 'Ayın en parlak hali' },
  { word: 'TUTULMA', hint: 'Ayın veya güneşin kapanması' },
  { word: 'ZODYAK', hint: '12 burçluk kuşak' },
  { word: 'KAHVE', hint: 'Fincan falı içeceği' },
  { word: 'KURSUN', hint: 'Eritip suya dökülür' },
  { word: 'HAMAM', hint: 'Kese ve köpük yeri' },
  { word: 'NAZAR', hint: 'Kötü gözden korunma' },
  { word: 'TILSIM', hint: 'Büyülü koruma nesnesi' },
  { word: 'PERI', hint: 'Masallardaki sihirli varlık' },
]

const ALPHABET_TR = 'ABCDEFGHIJKLMNOPRSTUVYZÖÜÇŞĞİ'.split('')

const MAX_WRONG = 7

interface Props {
  onComplete: (score: number) => void
}

function HangmanFigure({ wrong }: { wrong: number }) {
  return (
    <svg viewBox="0 0 120 140" className="w-28 h-32 mx-auto">
      {/* Gallows */}
      <line x1="20" y1="130" x2="100" y2="130" stroke="#a855f7" strokeWidth="3" />
      <line x1="40" y1="130" x2="40" y2="10" stroke="#a855f7" strokeWidth="3" />
      <line x1="40" y1="10" x2="80" y2="10" stroke="#a855f7" strokeWidth="3" />
      <line x1="80" y1="10" x2="80" y2="25" stroke="#a855f7" strokeWidth="3" />
      {/* Head */}
      {wrong >= 1 && <circle cx="80" cy="35" r="10" stroke="#f0abfc" strokeWidth="2" fill="none" />}
      {/* Body */}
      {wrong >= 2 && <line x1="80" y1="45" x2="80" y2="80" stroke="#f0abfc" strokeWidth="2" />}
      {/* Left arm */}
      {wrong >= 3 && <line x1="80" y1="55" x2="60" y2="70" stroke="#f0abfc" strokeWidth="2" />}
      {/* Right arm */}
      {wrong >= 4 && <line x1="80" y1="55" x2="100" y2="70" stroke="#f0abfc" strokeWidth="2" />}
      {/* Left leg */}
      {wrong >= 5 && <line x1="80" y1="80" x2="60" y2="100" stroke="#f0abfc" strokeWidth="2" />}
      {/* Right leg */}
      {wrong >= 6 && <line x1="80" y1="80" x2="100" y2="100" stroke="#f0abfc" strokeWidth="2" />}
      {/* Face */}
      {wrong >= 7 && (
        <g>
          <line x1="75" y1="32" x2="78" y2="35" stroke="#f87171" strokeWidth="1.5" />
          <line x1="78" y1="32" x2="75" y2="35" stroke="#f87171" strokeWidth="1.5" />
          <line x1="82" y1="32" x2="85" y2="35" stroke="#f87171" strokeWidth="1.5" />
          <line x1="85" y1="32" x2="82" y2="35" stroke="#f87171" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  )
}

export default function GameHangman({ onComplete }: Props) {
  const [wordData, setWordData] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)])
  const [guessed, setGuessed] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  const wrongCount = Array.from(guessed).filter(l => !wordData.word.includes(l)).length
  const isLost = wrongCount >= MAX_WRONG
  const isWon = wordData.word.split('').every(l => guessed.has(l))
  const gameOver = isLost || isWon

  const handleGuess = useCallback((letter: string) => {
    if (gameOver) return
    if (guessed.has(letter)) return
    const ng = new Set(guessed)
    ng.add(letter)
    setGuessed(ng)

    // Check win after this guess
    const won = wordData.word.split('').every(l => ng.has(l))
    if (won && !submitted) {
      setSubmitted(true)
      const score = Math.max(100 - wrongCount * 15, 20)
      onComplete(score)
    }
  }, [gameOver, guessed, wordData, wrongCount, submitted, onComplete])

  const reset = () => {
    setWordData(WORDS[Math.floor(Math.random() * WORDS.length)])
    setGuessed(new Set())
    setSubmitted(false)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <HangmanFigure wrong={wrongCount} />

      <div className="text-center">
        <p className="text-amber-400/80 text-xs mb-1">💡 İpucu: {wordData.hint}</p>
        <div className="flex gap-1.5 justify-center flex-wrap">
          {wordData.word.split('').map((letter, i) => (
            <div key={i} className={`w-8 h-9 border-b-2 flex items-center justify-center text-lg font-bold
              ${guessed.has(letter) ? 'border-fuchsia-400 text-white' : isLost ? 'border-red-400 text-red-400/60' : 'border-fuchsia-500/30 text-transparent'}`}>
              {guessed.has(letter) || isLost ? letter : '_'}
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-fuchsia-300/60">
        Kalan hak: <span className={`font-bold ${MAX_WRONG - wrongCount <= 2 ? 'text-red-400' : 'text-green-400'}`}>{MAX_WRONG - wrongCount}</span>
      </div>

      {/* Keyboard */}
      <div className="flex flex-wrap gap-1 justify-center max-w-xs">
        {ALPHABET_TR.map(letter => {
          const used = guessed.has(letter)
          const isCorrect = used && wordData.word.includes(letter)
          const isWrong = used && !wordData.word.includes(letter)
          return (
            <button key={letter} onClick={() => handleGuess(letter)} disabled={used || gameOver}
              className={`w-7 h-8 rounded text-xs font-bold border transition
                ${isCorrect ? 'bg-green-700/50 border-green-500 text-green-300' : isWrong ? 'bg-red-900/40 border-red-500/30 text-red-400/40' : 'bg-purple-800/40 border-fuchsia-500/20 text-white hover:bg-fuchsia-700/40 hover:border-fuchsia-400'}
                ${(used || gameOver) ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
            >{letter}</button>
          )
        })}
      </div>

      {gameOver && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className={`font-bold ${isWon ? 'text-green-400' : 'text-red-400'}`}>
            {isWon ? '🎉 Tebrikler!' : `😵 Kaybettin! Kelime: ${wordData.word}`}
          </p>
          <button onClick={reset} className="mt-2 px-4 py-1.5 bg-fuchsia-600 text-white rounded-full text-xs flex items-center gap-1 mx-auto">
            <RotateCcw className="w-3 h-3" /> Yeni Kelime
          </button>
        </motion.div>
      )}
    </div>
  )
}
