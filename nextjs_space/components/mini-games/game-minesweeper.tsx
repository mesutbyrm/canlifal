'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Flag } from 'lucide-react'

type CellState = {
  mine: boolean
  revealed: boolean
  flagged: boolean
  adjacent: number
}

const DIFFICULTIES = [
  { label: 'Kolay', rows: 8, cols: 8, mines: 10 },
  { label: 'Orta', rows: 10, cols: 10, mines: 20 },
  { label: 'Zor', rows: 12, cols: 12, mines: 35 },
]

function createBoard(rows: number, cols: number, mines: number, firstR?: number, firstC?: number): CellState[][] {
  const board: CellState[][] = Array(rows).fill(null).map(() =>
    Array(cols).fill(null).map(() => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  )
  let placed = 0
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows)
    const c = Math.floor(Math.random() * cols)
    if (board[r][c].mine) continue
    if (firstR !== undefined && firstC !== undefined && Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1) continue
    board[r][c].mine = true
    placed++
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++
      }
      board[r][c].adjacent = count
    }
  }
  return board
}

function reveal(board: CellState[][], r: number, c: number): CellState[][] {
  const b = board.map(row => row.map(cell => ({ ...cell })))
  const rows = b.length, cols = b[0].length
  const stack: [number, number][] = [[r, c]]
  while (stack.length > 0) {
    const [cr, cc] = stack.pop()!
    if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue
    if (b[cr][cc].revealed || b[cr][cc].flagged) continue
    b[cr][cc].revealed = true
    if (b[cr][cc].adjacent === 0 && !b[cr][cc].mine) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        stack.push([cr + dr, cc + dc])
      }
    }
  }
  return b
}

const NUM_COLORS = ['', 'text-blue-400', 'text-green-400', 'text-red-400', 'text-purple-400', 'text-amber-400', 'text-cyan-400', 'text-pink-400', 'text-white']

interface Props {
  onComplete: (score: number) => void
}

export default function GameMinesweeper({ onComplete }: Props) {
  const [diff, setDiff] = useState(0)
  const [board, setBoard] = useState<CellState[][] | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [flagMode, setFlagMode] = useState(false)
  const [firstClick, setFirstClick] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [time, setTime] = useState(0)
  const [timerRef, setTimerRef] = useState<NodeJS.Timeout | null>(null)

  const d = DIFFICULTIES[diff]

  const startGame = useCallback(() => {
    setBoard(null)
    setGameOver(false)
    setWon(false)
    setFlagMode(false)
    setFirstClick(true)
    setSubmitted(false)
    setTime(0)
    if (timerRef) clearInterval(timerRef)
    setTimerRef(null)
  }, [timerRef])

  const handleClick = (r: number, c: number) => {
    if (gameOver || won) return
    let b = board
    if (firstClick || !b) {
      b = createBoard(d.rows, d.cols, d.mines, r, c)
      setFirstClick(false)
      const t = setInterval(() => setTime(prev => prev + 1), 1000)
      setTimerRef(t)
    }

    if (flagMode) {
      if (b[r][c].revealed) return
      const nb = b.map(row => row.map(cell => ({ ...cell })))
      nb[r][c].flagged = !nb[r][c].flagged
      setBoard(nb)
      return
    }

    if (b[r][c].flagged || b[r][c].revealed) return

    if (b[r][c].mine) {
      const nb = b.map(row => row.map(cell => ({ ...cell, revealed: true })))
      setBoard(nb)
      setGameOver(true)
      if (timerRef) clearInterval(timerRef)
      return
    }

    const nb = reveal(b, r, c)
    setBoard(nb)

    // Check win
    const totalCells = d.rows * d.cols
    const revealedCount = nb.flat().filter(cell => cell.revealed).length
    if (revealedCount === totalCells - d.mines) {
      setWon(true)
      if (timerRef) clearInterval(timerRef)
      if (!submitted) {
        setSubmitted(true)
        const score = Math.max(100 - time, 10) + (diff + 1) * 20
        onComplete(score)
      }
    }
  }

  const flagCount = board ? board.flat().filter(c => c.flagged).length : 0
  const currentBoard = board || createBoard(d.rows, d.cols, 0)

  if (!board && !gameOver) {
    // Show difficulty selection + empty board
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {DIFFICULTIES.map((dd, i) => (
            <button key={i} onClick={() => { setDiff(i); startGame() }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${diff === i ? 'bg-fuchsia-600 border-fuchsia-400 text-white' : 'bg-purple-900/40 border-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-800/30'}`}>
              {dd.label} ({dd.rows}×{dd.cols})
            </button>
          ))}
        </div>
        <div className={`grid gap-0.5`} style={{ gridTemplateColumns: `repeat(${d.cols}, minmax(0, 1fr))` }}>
          {Array(d.rows * d.cols).fill(0).map((_, i) => (
            <div key={i} onClick={() => handleClick(Math.floor(i / d.cols), i % d.cols)}
              className="w-6 h-6 sm:w-7 sm:h-7 bg-purple-800/40 border border-fuchsia-500/20 rounded cursor-pointer hover:bg-fuchsia-700/30 transition" />
          ))}
        </div>
        <p className="text-fuchsia-400/40 text-[10px]">Bir kareye tıklayarak başla</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 w-full max-w-xs justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-3.5 h-3.5 text-red-400" />
          <span className="text-white text-sm font-bold">{d.mines - flagCount}</span>
        </div>
        <div className="text-fuchsia-300 text-sm">⏱ {time}s</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFlagMode(!flagMode)} className={`p-1.5 rounded-lg border text-xs transition ${flagMode ? 'bg-red-600/50 border-red-400 text-white' : 'bg-purple-900/40 border-fuchsia-500/20 text-fuchsia-300'}`}>
            <Flag className="w-3.5 h-3.5" />
          </button>
          <button onClick={startGame} className="p-1.5 bg-fuchsia-700/50 hover:bg-fuchsia-600/50 rounded-lg transition">
            <RotateCcw className="w-3.5 h-3.5 text-fuchsia-300" />
          </button>
        </div>
      </div>

      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${d.cols}, minmax(0, 1fr))` }}>
        {(board || currentBoard).flat().map((cell, i) => {
          const r = Math.floor(i / d.cols), c = i % d.cols
          let content = ''
          let cellClass = 'bg-purple-800/40 border-fuchsia-500/20 cursor-pointer hover:bg-fuchsia-700/30'
          if (cell.revealed) {
            cellClass = cell.mine ? 'bg-red-900/60 border-red-500/40' : 'bg-purple-950/60 border-purple-700/20'
            if (cell.mine) content = '💣'
            else if (cell.adjacent > 0) content = String(cell.adjacent)
          } else if (cell.flagged) {
            content = '🚩'
          }
          return (
            <div key={i}
              onClick={() => handleClick(r, c)}
              onContextMenu={(e) => { e.preventDefault(); if (!cell.revealed && board) { const nb = board.map(row => row.map(c => ({ ...c }))); nb[r][c].flagged = !nb[r][c].flagged; setBoard(nb) } }}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded border flex items-center justify-center text-[10px] sm:text-xs font-bold transition ${cellClass} ${cell.revealed && cell.adjacent > 0 ? NUM_COLORS[cell.adjacent] : ''}`}
            >{content}</div>
          )
        })}
      </div>

      {(gameOver || won) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className={`font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>{won ? '🎉 Kazandın!' : '💣 Mayına bastın!'}</p>
          <p className="text-fuchsia-300/60 text-xs">Süre: {time}s</p>
          <button onClick={startGame} className="mt-2 px-4 py-1.5 bg-fuchsia-600 text-white rounded-full text-xs">Tekrar Oyna</button>
        </motion.div>
      )}
    </div>
  )
}
