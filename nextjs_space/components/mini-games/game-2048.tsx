'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

type Board = number[][]

const TILE_COLORS: Record<number, string> = {
  0: 'bg-purple-900/30 border-purple-700/20',
  2: 'bg-purple-800/60 border-purple-500/40 text-purple-100',
  4: 'bg-purple-700/60 border-purple-400/40 text-purple-50',
  8: 'bg-fuchsia-700/70 border-fuchsia-400/50 text-white',
  16: 'bg-fuchsia-600/80 border-fuchsia-400/50 text-white',
  32: 'bg-pink-600/80 border-pink-400/50 text-white',
  64: 'bg-rose-600/80 border-rose-400/50 text-white',
  128: 'bg-amber-600/80 border-amber-400/50 text-white',
  256: 'bg-amber-500/90 border-amber-300/60 text-white',
  512: 'bg-yellow-500/90 border-yellow-300/60 text-white',
  1024: 'bg-green-500/80 border-green-300/50 text-white',
  2048: 'bg-cyan-500/80 border-cyan-300/50 text-white font-extrabold',
}

function createEmpty(): Board {
  return Array(4).fill(null).map(() => Array(4).fill(0))
}

function addRandom(board: Board): Board {
  const b = board.map(r => [...r])
  const empty: [number, number][] = []
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (b[r][c] === 0) empty.push([r, c])
  if (empty.length === 0) return b
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  b[r][c] = Math.random() < 0.9 ? 2 : 4
  return b
}

function slideRow(row: number[]): { newRow: number[]; score: number } {
  let score = 0
  const filtered = row.filter(v => v !== 0)
  const result: number[] = []
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2
      result.push(merged)
      score += merged
      i++
    } else {
      result.push(filtered[i])
    }
  }
  while (result.length < 4) result.push(0)
  return { newRow: result, score }
}

function moveLeft(board: Board): { board: Board; score: number; moved: boolean } {
  let totalScore = 0
  let moved = false
  const nb = board.map(row => {
    const { newRow, score } = slideRow(row)
    totalScore += score
    if (row.some((v, i) => v !== newRow[i])) moved = true
    return newRow
  })
  return { board: nb, score: totalScore, moved }
}

function rotate90(board: Board): Board {
  const n = board.length
  const nb = createEmpty()
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) nb[c][n - 1 - r] = board[r][c]
  return nb
}

function move(board: Board, dir: 'left' | 'right' | 'up' | 'down'): { board: Board; score: number; moved: boolean } {
  let b = board
  const rotations = { left: 0, down: 1, right: 2, up: 3 }
  for (let i = 0; i < rotations[dir]; i++) b = rotate90(b)
  const result = moveLeft(b)
  let nb = result.board
  for (let i = 0; i < (4 - rotations[dir]) % 4; i++) nb = rotate90(nb)
  return { board: nb, score: result.score, moved: result.moved }
}

function canMove(board: Board): boolean {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (board[r][c] === 0) return true
    if (c < 3 && board[r][c] === board[r][c + 1]) return true
    if (r < 3 && board[r][c] === board[r + 1][c]) return true
  }
  return false
}

function hasWon(board: Board): boolean {
  return board.some(row => row.some(v => v >= 2048))
}

interface Props {
  onComplete: (score: number) => void
}

export default function Game2048({ onComplete }: Props) {
  const [board, setBoard] = useState<Board>(() => addRandom(addRandom(createEmpty())))
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleMove = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver) return
    setBoard(prev => {
      const result = move(prev, dir)
      if (!result.moved) return prev
      const nb = addRandom(result.board)
      const newScore = score + result.score
      setScore(newScore)
      if (newScore > bestScore) setBestScore(newScore)
      if (hasWon(nb) && !won) setWon(true)
      if (!canMove(nb)) {
        setGameOver(true)
        if (!submitted) { setSubmitted(true); onComplete(newScore) }
      }
      return nb
    })
  }, [gameOver, score, bestScore, won, submitted, onComplete])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleMove('left')
      else if (e.key === 'ArrowRight') handleMove('right')
      else if (e.key === 'ArrowUp') { e.preventDefault(); handleMove('up') }
      else if (e.key === 'ArrowDown') { e.preventDefault(); handleMove('down') }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleMove])

  // Touch support
  useEffect(() => {
    let startX = 0, startY = 0
    const handleTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY }
    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX
      const dy = e.changedTouches[0].clientY - startY
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return
      if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? 'right' : 'left')
      else handleMove(dy > 0 ? 'down' : 'up')
    }
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => { window.removeEventListener('touchstart', handleTouchStart); window.removeEventListener('touchend', handleTouchEnd) }
  }, [handleMove])

  const reset = () => {
    setBoard(addRandom(addRandom(createEmpty())))
    setScore(0)
    setGameOver(false)
    setWon(false)
    setSubmitted(false)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-between w-full max-w-[280px]">
        <div className="text-center">
          <div className="text-[10px] text-fuchsia-400/60 uppercase">Skor</div>
          <div className="text-white font-bold text-lg">{score}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-fuchsia-400/60 uppercase">En İyi</div>
          <div className="text-amber-400 font-bold text-lg">{bestScore}</div>
        </div>
        <button onClick={reset} className="p-2 bg-fuchsia-700/50 hover:bg-fuchsia-600/50 rounded-lg transition"><RotateCcw className="w-4 h-4 text-fuchsia-300" /></button>
      </div>

      <div className="grid grid-cols-4 gap-1.5 bg-purple-950/80 p-2 rounded-xl border border-fuchsia-500/20">
        {board.flat().map((val, i) => {
          const colorClass = TILE_COLORS[val] || 'bg-cyan-400/80 border-cyan-300/60 text-white font-extrabold'
          return (
            <motion.div
              key={i}
              initial={val ? { scale: 0.8 } : false}
              animate={{ scale: 1 }}
              className={`w-[62px] h-[62px] sm:w-[65px] sm:h-[65px] rounded-lg border flex items-center justify-center font-bold transition-colors ${colorClass} ${val >= 1024 ? 'text-sm' : val >= 128 ? 'text-base' : 'text-lg'}`}
            >
              {val > 0 ? val : ''}
            </motion.div>
          )
        })}
      </div>

      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-1 w-32 sm:hidden">
        <div />
        <button onClick={() => handleMove('up')} className="p-2 bg-fuchsia-700/40 rounded-lg text-white text-sm">↑</button>
        <div />
        <button onClick={() => handleMove('left')} className="p-2 bg-fuchsia-700/40 rounded-lg text-white text-sm">←</button>
        <button onClick={() => handleMove('down')} className="p-2 bg-fuchsia-700/40 rounded-lg text-white text-sm">↓</button>
        <button onClick={() => handleMove('right')} className="p-2 bg-fuchsia-700/40 rounded-lg text-white text-sm">→</button>
      </div>

      {gameOver && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className="text-red-400 font-bold">Oyun Bitti!</p>
          <p className="text-fuchsia-300/60 text-xs">Skor: {score}</p>
          <button onClick={reset} className="mt-2 px-4 py-1.5 bg-fuchsia-600 text-white rounded-full text-xs">Tekrar Oyna</button>
        </motion.div>
      )}
      {won && !gameOver && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <p className="text-yellow-400 font-bold text-lg">🎉 2048!</p>
          <p className="text-fuchsia-300/60 text-xs">Devam edebilirsin!</p>
        </motion.div>
      )}
      <p className="text-fuchsia-400/40 text-[10px]">Yön tuşları veya kaydırma ile oyna</p>
    </div>
  )
}
