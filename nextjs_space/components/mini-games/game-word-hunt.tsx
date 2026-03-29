'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'

const WORD_LISTS = [
  { theme: 'Hayvanlar 🐾', words: ['KEDI', 'KOPEK', 'KAPLUMBAGA', 'TAVSAN', 'ASLAN'] },
  { theme: 'Meyveler 🍎', words: ['ELMA', 'ARMUT', 'PORTAKAL', 'MANGO', 'KIRAZ'] },
  { theme: 'Renkler 🎨', words: ['KIRMIZI', 'SARI', 'MAVI', 'YESIL', 'TURUNCU'] },
  { theme: 'Ülkeler 🌍', words: ['TURKIYE', 'ALMANYA', 'FRANSA', 'ITALYA', 'ISPANYA'] },
  { theme: 'Spor ⚽', words: ['FUTBOL', 'BASKETBOL', 'VOLEYBOL', 'TENIS', 'YUZME'] },
]

const GRID_SIZE = 10

function placeWord(grid: string[][], word: string, size: number): boolean {
  const dirs = [[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0]]
  const attempts = 50
  for (let a = 0; a < attempts; a++) {
    const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)]
    const r = Math.floor(Math.random() * size)
    const c = Math.floor(Math.random() * size)
    let fits = true
    for (let i = 0; i < word.length; i++) {
      const nr = r + dr * i, nc = c + dc * i
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) { fits = false; break }
      if (grid[nr][nc] !== '' && grid[nr][nc] !== word[i]) { fits = false; break }
    }
    if (fits) {
      for (let i = 0; i < word.length; i++) grid[r + dr * i][c + dc * i] = word[i]
      return true
    }
  }
  return false
}

function generateGrid(words: string[]) {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''))
  const placed: string[] = []
  for (const w of words) {
    if (placeWord(grid, w, GRID_SIZE)) placed.push(w)
  }
  // Fill empty cells
  const letters = 'ABCDEFGHIJKLMNOPRSTUVYZ'
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === '') grid[r][c] = letters[Math.floor(Math.random() * letters.length)]
    }
  }
  return { grid, words: placed }
}

interface WordHuntProps { onComplete: (score: number) => void }

export default function GameWordHunt({ onComplete }: WordHuntProps) {
  const [listData] = useState(() => WORD_LISTS[Math.floor(Math.random() * WORD_LISTS.length)])
  const [{ grid, words }] = useState(() => generateGrid(listData.words))
  const [found, setFound] = useState<Set<string>>(new Set())
  const [selecting, setSelecting] = useState<number[]>([])
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState(false)

  const getSelectedWord = useCallback((cells: number[]) => {
    return cells.map(idx => {
      const r = Math.floor(idx / GRID_SIZE), c = idx % GRID_SIZE
      return grid[r][c]
    }).join('')
  }, [grid])

  const handleCellDown = (idx: number) => {
    setSelecting([idx])
    setSelectedCells(new Set([`${idx}`]))
  }

  const handleCellEnter = (idx: number) => {
    if (selecting.length === 0) return
    if (selecting.includes(idx)) return
    const newSelecting = [...selecting, idx]
    setSelecting(newSelecting)
    setSelectedCells(new Set(newSelecting.map(String)))
  }

  const handleCellUp = () => {
    if (selecting.length < 2) { setSelecting([]); setSelectedCells(new Set()); return }
    const word = getSelectedWord(selecting)
    const reverseWord = getSelectedWord([...selecting].reverse())
    const matched = words.find(w => w === word || w === reverseWord)

    if (matched && !found.has(matched)) {
      const newFound = new Set(found)
      newFound.add(matched)
      setFound(newFound)
      const newFoundCells = new Set(foundCells)
      selecting.forEach(idx => newFoundCells.add(`${idx}`))
      setFoundCells(newFoundCells)

      if (newFound.size === words.length && !completed) {
        setCompleted(true)
        const score = words.length * 20
        setTimeout(() => onComplete(score), 500)
      }
    }
    setSelecting([])
    setSelectedCells(new Set())
  }

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <div className="text-center">
        <h3 className="text-lg font-bold text-amber-300">🔍 Kelime Avı</h3>
        <p className="text-xs text-fuchsia-300/60">Tema: {listData.theme}</p>
      </div>

      {/* Word list */}
      <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
        {words.map(w => (
          <span key={w} className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
            found.has(w) ? 'bg-green-900/40 text-green-400 line-through' : 'bg-purple-900/30 text-fuchsia-300/70'
          }`}>
            {w}
          </span>
        ))}
      </div>

      <div className="text-xs text-amber-300">{found.size} / {words.length} bulundu</div>

      {/* Grid */}
      <div
        className="grid gap-0.5 select-none touch-none"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        onMouseUp={handleCellUp}
        onTouchEnd={handleCellUp}
      >
        {grid.flat().map((letter, idx) => {
          const isFound = foundCells.has(`${idx}`)
          const isSelecting = selectedCells.has(`${idx}`)
          return (
            <motion.div
              key={idx}
              onMouseDown={() => handleCellDown(idx)}
              onMouseEnter={() => handleCellEnter(idx)}
              onTouchStart={() => handleCellDown(idx)}
              onTouchMove={(e) => {
                const touch = e.touches[0]
                const el = document.elementFromPoint(touch.clientX, touch.clientY)
                const cellIdx = el?.getAttribute('data-idx')
                if (cellIdx) handleCellEnter(parseInt(cellIdx))
              }}
              data-idx={idx}
              className={`w-7 h-7 flex items-center justify-center rounded-sm text-xs font-bold cursor-pointer transition-all ${
                isFound ? 'bg-green-600/40 text-green-300' :
                isSelecting ? 'bg-fuchsia-600/40 text-white scale-110' :
                'bg-purple-900/30 text-fuchsia-200/70 hover:bg-fuchsia-900/30'
              }`}
            >
              {letter}
            </motion.div>
          )
        })}
      </div>

      {completed && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <div className="text-lg font-bold text-green-400">🎉 Tüm kelimeleri buldun!</div>
        </motion.div>
      )}
    </div>
  )
}
