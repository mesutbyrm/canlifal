'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Lightbulb } from 'lucide-react'

const PUZZLES = [
  { word: 'ASTROLOJI', hint: 'Yıldızları inceleyen bilim', category: 'Bilim' },
  { word: 'GEZEGEN', hint: 'Güneş etrafında döner', category: 'Uzay' },
  { word: 'DOLUNAY', hint: 'Ayın en parlak hali', category: 'Gök' },
  { word: 'KEHANET', hint: 'Geleceği önceden bildirme', category: 'Mistik' },
  { word: 'KRISTAL', hint: 'Şifacıların kullandığı taş', category: 'Mistik' },
  { word: 'MEDYUM', hint: 'Altıncı his sahibi kişi', category: 'Mistik' },
  { word: 'ZODYAK', hint: '12 burçluk kuşak', category: 'Astroloji' },
  { word: 'TUTULMA', hint: 'Güneş veya ayın kapanması', category: 'Gök' },
  { word: 'MERKUR', hint: 'İletişim gezegeni', category: 'Astroloji' },
  { word: 'FIRTINA', hint: 'Şiddetli hava olayı', category: 'Doğa' },
  { word: 'YILDIZ', hint: 'Gökte parlayan cisim', category: 'Uzay' },
  { word: 'GALAKSI', hint: 'Yıldız sistemi topluluğu', category: 'Uzay' },
  { word: 'TILSIM', hint: 'Büyülü koruma nesnesi', category: 'Mistik' },
  { word: 'SEZGI', hint: 'İçsel his, altıncı his', category: 'Psikoloji' },
  { word: 'KARMA', hint: 'Evrensel denge yasası', category: 'Felsefe' },
  { word: 'BULUTSU', hint: 'Uzaydaki gaz ve toz bulutu', category: 'Uzay' },
  { word: 'KUYRUKYILDIZ', hint: 'Kuyruklu gök cismi', category: 'Uzay' },
  { word: 'METEOR', hint: 'Atmosfere giren kayaç', category: 'Uzay' },
  { word: 'CAKRA', hint: 'Enerji merkezi noktası', category: 'Spiritüel' },
  { word: 'REHBER', hint: 'Yol gösteren varlık', category: 'Spiritüel' },
]

function shuffleWord(word: string): string {
  const arr = word.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const result = arr.join('')
  if (result === word && word.length > 1) return shuffleWord(word)
  return result
}

interface Props {
  onComplete: (score: number) => void
}

export default function GameWordPuzzle({ onComplete }: Props) {
  const [puzzleIdx, setPuzzleIdx] = useState(() => Math.floor(Math.random() * PUZZLES.length))
  const puzzle = PUZZLES[puzzleIdx]
  const [shuffled, setShuffled] = useState(() => shuffleWord(puzzle.word))
  const [selected, setSelected] = useState<number[]>([])
  const [answer, setAnswer] = useState<string[]>([])
  const [won, setWon] = useState(false)
  const [wrong, setWrong] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hints, setHints] = useState(2)
  const [hintRevealed, setHintRevealed] = useState<Set<number>>(new Set())

  const handleSelect = useCallback((idx: number) => {
    if (won || selected.includes(idx)) return
    const newSel = [...selected, idx]
    const newAns = [...answer, shuffled[idx]]
    setSelected(newSel)
    setAnswer(newAns)

    if (newAns.length === puzzle.word.length) {
      const guess = newAns.join('')
      if (guess === puzzle.word) {
        setWon(true)
        if (!submitted) {
          setSubmitted(true)
          onComplete(Math.max(100 - (selected.length - puzzle.word.length) * 10, 20))
        }
      } else {
        setWrong(true)
        setTimeout(() => {
          setSelected(Array.from(hintRevealed))
          setAnswer(Array.from(hintRevealed).map(i => shuffled[i]))
          setWrong(false)
        }, 800)
      }
    }
  }, [won, selected, answer, shuffled, puzzle.word, submitted, onComplete, hintRevealed])

  const handleRemove = (idx: number) => {
    if (won || hintRevealed.has(selected[idx])) return
    const newSel = selected.filter((_, i) => i !== idx)
    const newAns = answer.filter((_, i) => i !== idx)
    setSelected(newSel)
    setAnswer(newAns)
  }

  const useHint = () => {
    if (hints <= 0 || won) return
    // Reveal the next correct letter
    const nextPos = answer.length
    if (nextPos >= puzzle.word.length) return
    const correctLetter = puzzle.word[nextPos]
    const availableIdx = shuffled.split('').findIndex((l, i) => l === correctLetter && !selected.includes(i))
    if (availableIdx === -1) return
    setHints(h => h - 1)
    const newHR = new Set(hintRevealed)
    newHR.add(availableIdx)
    setHintRevealed(newHR)
    handleSelect(availableIdx)
  }

  const reset = () => {
    const newIdx = Math.floor(Math.random() * PUZZLES.length)
    setPuzzleIdx(newIdx)
    const newPuzzle = PUZZLES[newIdx]
    setShuffled(shuffleWord(newPuzzle.word))
    setSelected([])
    setAnswer([])
    setWon(false)
    setWrong(false)
    setSubmitted(false)
    setHints(2)
    setHintRevealed(new Set())
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center">
        <span className="text-[10px] px-2 py-0.5 bg-fuchsia-700/40 text-fuchsia-300 rounded-full">{puzzle.category}</span>
        <p className="text-amber-400/80 text-xs mt-1">💡 {puzzle.hint}</p>
      </div>

      {/* Answer slots */}
      <div className="flex gap-1 flex-wrap justify-center">
        {puzzle.word.split('').map((_, i) => (
          <div key={i}
            onClick={() => i < answer.length && handleRemove(i)}
            className={`w-8 h-10 rounded-lg border-2 flex items-center justify-center font-bold text-sm cursor-pointer transition
              ${wrong ? 'border-red-500 bg-red-900/30 text-red-400 shake' :
                i < answer.length ? 'border-fuchsia-400 bg-fuchsia-900/40 text-white' :
                'border-fuchsia-500/20 bg-purple-900/30'}`}
          >
            {i < answer.length ? answer[i] : ''}
          </div>
        ))}
      </div>

      {/* Shuffled letters */}
      <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
        {shuffled.split('').map((letter, i) => {
          const used = selected.includes(i)
          return (
            <motion.button
              key={i}
              onClick={() => !used && handleSelect(i)}
              whileHover={!used ? { scale: 1.1 } : {}}
              whileTap={!used ? { scale: 0.9 } : {}}
              disabled={used}
              className={`w-9 h-10 rounded-lg border-2 font-bold text-sm transition
                ${used ? 'bg-purple-950/30 border-purple-800/20 text-transparent' :
                'bg-purple-800/50 border-fuchsia-500/30 text-white hover:border-fuchsia-400 hover:bg-fuchsia-700/40'}`}
            >
              {letter}
            </motion.button>
          )
        })}
      </div>

      <div className="flex gap-2">
        <button onClick={useHint} disabled={hints <= 0 || won}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-700/40 border border-amber-500/30 rounded-lg text-xs text-amber-300 disabled:opacity-40">
          <Lightbulb className="w-3 h-3" /> İpucu ({hints})
        </button>
        <button onClick={reset} className="p-1.5 bg-fuchsia-700/50 hover:bg-fuchsia-600/50 rounded-lg transition">
          <RotateCcw className="w-3.5 h-3.5 text-fuchsia-300" />
        </button>
      </div>

      {won && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <p className="text-green-400 font-bold">🎉 Doğru! {puzzle.word}</p>
          <button onClick={reset} className="mt-2 px-4 py-1.5 bg-fuchsia-600 text-white rounded-full text-xs">Sonraki Kelime</button>
        </motion.div>
      )}
    </div>
  )
}
