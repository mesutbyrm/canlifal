'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Eraser, Lightbulb } from 'lucide-react'

function generateSudoku(): { puzzle: number[][]; solution: number[][] } {
  const solution = Array(9).fill(null).map(() => Array(9).fill(0))
  
  function isValid(board: number[][], row: number, col: number, num: number): boolean {
    for (let c = 0; c < 9; c++) if (board[row][c] === num) return false
    for (let r = 0; r < 9; r++) if (board[r][col] === num) return false
    const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3
    for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) if (board[r][c] === num) return false
    return true
  }

  function solve(board: number[][]): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5)
          for (const n of nums) {
            if (isValid(board, r, c, n)) {
              board[r][c] = n
              if (solve(board)) return true
              board[r][c] = 0
            }
          }
          return false
        }
      }
    }
    return true
  }

  solve(solution)
  const puzzle = solution.map(r => [...r])
  
  // Remove cells (easy: 35 removed, medium: 45, hard: 55)
  let removals = 40
  const cells = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5)
  for (const idx of cells) {
    if (removals <= 0) break
    const r = Math.floor(idx / 9), c = idx % 9
    puzzle[r][c] = 0
    removals--
  }

  return { puzzle, solution }
}

interface Props {
  onComplete: (score: number) => void
}

export default function GameSudoku({ onComplete }: Props) {
  const [{ puzzle, solution }, setGame] = useState(() => generateSudoku())
  const [board, setBoard] = useState<number[][]>(() => puzzle.map(r => [...r]))
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [errors, setErrors] = useState<Set<string>>(new Set())
  const [won, setWon] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hints, setHints] = useState(3)

  const isGiven = useMemo(() => puzzle.map(r => r.map(v => v !== 0)), [puzzle])

  const handleInput = useCallback((num: number) => {
    if (!selected || won) return
    const [r, c] = selected
    if (isGiven[r][c]) return

    const nb = board.map(row => [...row])
    nb[r][c] = num
    setBoard(nb)

    const newErrors = new Set<string>()
    if (num !== 0 && num !== solution[r][c]) {
      newErrors.add(`${r}-${c}`)
    }
    // Remove error if corrected
    const prevErrors = new Set(errors)
    prevErrors.delete(`${r}-${c}`)
    if (num !== 0 && num !== solution[r][c]) prevErrors.add(`${r}-${c}`)
    setErrors(prevErrors)

    // Check win
    let complete = true
    for (let rr = 0; rr < 9; rr++) for (let cc = 0; cc < 9; cc++) {
      if (nb[rr][cc] !== solution[rr][cc]) complete = false
    }
    if (complete) {
      setWon(true)
      if (!submitted) { setSubmitted(true); onComplete(100) }
    }
  }, [selected, board, won, isGiven, solution, errors, submitted, onComplete])

  const handleHint = () => {
    if (hints <= 0 || !selected || won) return
    const [r, c] = selected
    if (isGiven[r][c]) return
    const nb = board.map(row => [...row])
    nb[r][c] = solution[r][c]
    setBoard(nb)
    setHints(h => h - 1)
    const newErrors = new Set(errors)
    newErrors.delete(`${r}-${c}`)
    setErrors(newErrors)
  }

  const reset = () => {
    const g = generateSudoku()
    setGame(g)
    setBoard(g.puzzle.map(r => [...r]))
    setSelected(null)
    setErrors(new Set())
    setWon(false)
    setSubmitted(false)
    setHints(3)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <button onClick={handleHint} disabled={hints <= 0} className="flex items-center gap-1 px-3 py-1.5 bg-amber-700/40 border border-amber-500/30 rounded-lg text-xs text-amber-300 disabled:opacity-40">
          <Lightbulb className="w-3 h-3" /> İpucu ({hints})
        </button>
        <button onClick={reset} className="p-1.5 bg-fuchsia-700/50 hover:bg-fuchsia-600/50 rounded-lg transition">
          <RotateCcw className="w-3.5 h-3.5 text-fuchsia-300" />
        </button>
      </div>

      {/* Board */}
      <div className="grid grid-cols-9 gap-0 border-2 border-fuchsia-400/50 rounded-lg overflow-hidden">
        {board.flat().map((val, i) => {
          const r = Math.floor(i / 9), c = i % 9
          const isSelected = selected && selected[0] === r && selected[1] === c
          const given = isGiven[r][c]
          const hasError = errors.has(`${r}-${c}`)
          const borderR = c % 3 === 2 && c !== 8 ? 'border-r-2 border-r-fuchsia-400/40' : 'border-r border-r-purple-700/30'
          const borderB = r % 3 === 2 && r !== 8 ? 'border-b-2 border-b-fuchsia-400/40' : 'border-b border-b-purple-700/30'
          const sameNum = selected && val > 0 && board[selected[0]][selected[1]] === val

          return (
            <div key={i}
              onClick={() => setSelected([r, c])}
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold cursor-pointer transition-all
                ${borderR} ${borderB}
                ${isSelected ? 'bg-fuchsia-600/40' : sameNum ? 'bg-fuchsia-900/40' : 'bg-purple-950/60 hover:bg-purple-900/40'}
                ${hasError ? 'text-red-400' : given ? 'text-white' : 'text-cyan-300'}
              `}
            >
              {val > 0 ? val : ''}
            </div>
          )
        })}
      </div>

      {/* Number pad */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => handleInput(n)}
            className="w-8 h-8 sm:w-9 sm:h-9 bg-purple-800/50 hover:bg-fuchsia-700/50 border border-fuchsia-500/20 rounded-lg text-white font-bold text-sm transition">
            {n}
          </button>
        ))}
        <button onClick={() => handleInput(0)} className="w-8 h-8 sm:w-9 sm:h-9 bg-purple-900/40 hover:bg-red-700/30 border border-red-500/20 rounded-lg transition">
          <Eraser className="w-3.5 h-3.5 text-red-400 mx-auto" />
        </button>
      </div>

      {won && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <p className="text-green-400 font-bold">🎉 Tebrikler!</p>
          <p className="text-fuchsia-300/60 text-xs">Sudoku tamamlandı!</p>
          <button onClick={reset} className="mt-2 px-4 py-1.5 bg-fuchsia-600 text-white rounded-full text-xs">Yeni Oyun</button>
        </motion.div>
      )}
    </div>
  )
}
