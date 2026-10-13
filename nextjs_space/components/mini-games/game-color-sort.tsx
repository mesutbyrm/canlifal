'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'

const TUBE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#ec4899', '#06b6d4']

function generatePuzzle(numColors: number = 4) {
  const colors: string[] = []
  for (let i = 0; i < numColors; i++) {
    for (let j = 0; j < 4; j++) colors.push(TUBE_COLORS[i])
  }
  // Shuffle
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]]
  }
  // Split into tubes of 4 + 2 empty tubes
  const tubes: (string | null)[][] = []
  for (let i = 0; i < numColors; i++) {
    tubes.push(colors.slice(i * 4, i * 4 + 4))
  }
  tubes.push([], []) // 2 empty tubes
  return tubes
}

function isSolved(tubes: (string | null)[][]) {
  for (const tube of tubes) {
    const filled = tube.filter(c => c !== null)
    if (filled.length === 0) continue
    if (filled.length !== 4) return false
    if (!filled.every(c => c === filled[0])) return false
  }
  return true
}

interface ColorSortProps { onComplete: (score: number) => void }

export default function GameColorSort({ onComplete }: ColorSortProps) {
  const [level, setLevel] = useState(1)
  const [tubes, setTubes] = useState<(string | null)[][]>(() => generatePuzzle(4))
  const [selectedTube, setSelectedTube] = useState<number | null>(null)
  const [moves, setMoves] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [totalScore, setTotalScore] = useState(0)

  const handleTubeClick = useCallback((idx: number) => {
    if (completed) return

    if (selectedTube === null) {
      // Select tube if it has colors
      if (tubes[idx].length > 0) setSelectedTube(idx)
      return
    }

    if (selectedTube === idx) { setSelectedTube(null); return }

    // Try to pour
    const from = [...tubes[selectedTube].filter(c => c !== null)]
    const to = [...tubes[idx].filter(c => c !== null)]
    if (from.length === 0) { setSelectedTube(null); return }
    if (to.length >= 4) { setSelectedTube(idx); return }

    const topColor = from[from.length - 1]
    if (to.length > 0 && to[to.length - 1] !== topColor) { setSelectedTube(idx); return }

    // Pour top matching colors
    const newFrom = [...from]
    const newTo = [...to]
    while (newFrom.length > 0 && newTo.length < 4 && newFrom[newFrom.length - 1] === topColor) {
      newTo.push(newFrom.pop()!)
    }

    const newTubes = tubes.map((t, i) => {
      if (i === selectedTube) return [...newFrom]
      if (i === idx) return [...newTo]
      return [...t]
    })

    setTubes(newTubes)
    setMoves(moves + 1)
    setSelectedTube(null)

    if (isSolved(newTubes)) {
      const levelScore = Math.max(10, 50 - moves * 2)
      const newTotal = totalScore + levelScore
      setTotalScore(newTotal)

      if (level >= 3) {
        setCompleted(true)
        setTimeout(() => onComplete(newTotal), 500)
      } else {
        setTimeout(() => {
          setLevel(level + 1)
          setTubes(generatePuzzle(4 + level))
          setMoves(0)
        }, 800)
      }
    }
  }, [selectedTube, tubes, moves, level, totalScore, completed, onComplete])

  const resetLevel = () => {
    setTubes(generatePuzzle(4 + level - 1))
    setMoves(0)
    setSelectedTube(null)
  }

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <div className="text-center">
        <h3 className="text-lg font-bold text-amber-300">🎨 Renk Sıralama</h3>
        <p className="text-xs text-fuchsia-300/60">Tüplerdeki renkleri sırala! Aynı renkleri birleştir.</p>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="text-fuchsia-300/60">Seviye: {level}/3</span>
        <span className="text-amber-300">Hamle: {moves}</span>
        <span className="text-green-400">Puan: {totalScore}</span>
        <button onClick={resetLevel} className="text-red-400/60 hover:text-red-400 text-[10px]">↻ Sıfırla</button>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        {tubes.map((tube, ti) => (
          <motion.button
            key={ti}
            onClick={() => handleTubeClick(ti)}
            whileHover={{ scale: 1.05 }}
            className={`w-12 flex flex-col-reverse items-center rounded-b-xl rounded-t-sm border-2 h-28 relative transition-all ${
              selectedTube === ti ? 'border-amber-400 bg-amber-400/10 -translate-y-2' : 'border-fuchsia-500/30 bg-purple-900/20 hover:border-fuchsia-400/50'
            }`}
          >
            {Array.from({ length: 4 }).map((_, si) => {
              const color = tube[si] || null
              return (
                <motion.div
                  key={si}
                  layout
                  className="w-10 h-6 rounded-sm mx-auto"
                  style={{ backgroundColor: color || 'transparent', border: color ? 'none' : '1px dashed rgba(168,85,247,0.15)' }}
                />
              )
            })}
          </motion.button>
        ))}
      </div>

      {completed && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <div className="text-2xl">🎉</div>
          <div className="text-lg font-bold text-green-400">Tüm seviyeler tamamlandı!</div>
          <div className="text-sm text-amber-300">Toplam: {totalScore} puan</div>
        </motion.div>
      )}
    </div>
  )
}
