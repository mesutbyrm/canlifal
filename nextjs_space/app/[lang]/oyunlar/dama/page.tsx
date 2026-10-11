'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { damaAI, damaMove } from '@/lib/game-logic'
import { useEffect, useRef, useState, useMemo } from 'react'

export default function DamaPage() {
  return (
    <GameShell
      gameType="dama"
      gameName="Dama"
      gameEmoji="🏁"
      gameDesc="Klasik Türk daması! Taşları çapraz taşı, rakip taşları ye!"
      supportsAI={true}
    >
      {(props) => <DamaBoard {...props} />}
    </GameShell>
  )
}

function DamaBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const [selected, setSelected] = useState<number | null>(null)
  const aiTimerRef = useRef<any>(null)
  const size = 8
  const board: string[] = state?.board || Array(64).fill('')
  const mine = playerNum === 1 ? ['w', 'W'] : ['b', 'B']

  const p1Count = board.filter((c: string) => c === 'w' || c === 'W').length
  const p2Count = board.filter((c: string) => c === 'b' || c === 'B').length

  // Calculate valid moves for selected piece
  const validTargets = useMemo(() => {
    if (selected === null || !isMyTurn || room.status !== 'active') return new Set<number>()
    const targets = new Set<number>()
    // Calculate moves for selected piece
    const opp = playerNum === 1 ? ['b', 'B'] : ['w', 'W']
    const dir = playerNum === 1 ? -1 : 1
    const r = Math.floor(selected / size), c = selected % size
    const piece = board[selected]
    const isKing = piece === 'W' || piece === 'B'
    const dirs = isKing ? [-1, 1] : [dir]
    // Check all pieces for captures first
    let hasCaptureGlobal = false
    for (let i = 0; i < 64; i++) {
      if (!mine.includes(board[i])) continue
      const pr = Math.floor(i / size), pc = i % size
      const pIsKing = board[i] === 'W' || board[i] === 'B'
      const pDirs = pIsKing ? [-1, 1] : [dir]
      for (const dr of pDirs) {
        for (const dc of [-1, 1]) {
          const mr = pr + dr, mc = pc + dc, jr = pr + 2 * dr, jc = pc + 2 * dc
          if (jr < 0 || jr >= size || jc < 0 || jc >= size) continue
          if (opp.includes(board[mr * size + mc]) && board[jr * size + jc] === '') hasCaptureGlobal = true
        }
      }
    }
    for (const dr of dirs) {
      for (const dc of [-1, 1]) {
        if (hasCaptureGlobal) {
          const mr = r + dr, mc = c + dc, jr = r + 2 * dr, jc = c + 2 * dc
          if (jr >= 0 && jr < size && jc >= 0 && jc < size && opp.includes(board[mr * size + mc]) && board[jr * size + jc] === '') {
            targets.add(jr * size + jc)
          }
        } else {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr * size + nc] === '') targets.add(nr * size + nc)
        }
      }
    }
    // King extra directions
    if (isKing) {
      for (const dr of [-1, 1]) {
        for (const dc of [-1, 1]) {
          if (hasCaptureGlobal) {
            const mr = r + dr, mc = c + dc, jr = r + 2 * dr, jc = c + 2 * dc
            if (jr >= 0 && jr < size && jc >= 0 && jc < size && opp.includes(board[mr * size + mc]) && board[jr * size + jc] === '' && !targets.has(jr * size + jc)) {
              targets.add(jr * size + jc)
            }
          } else {
            const nr = r + dr, nc = c + dc
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr * size + nc] === '' && !targets.has(nr * size + nc)) targets.add(nr * size + nc)
          }
        }
      }
    }
    return targets
  }, [selected, board, isMyTurn, room.status, playerNum])

  // AI auto-play
  const aiPlayerNum = room.disconnectedPlayerId === room.player1Id ? 1 : 2
  const humanPlayerNum = aiPlayerNum === 1 ? 2 : 1
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || room.currentTurn !== aiPlayerNum) return
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    aiTimerRef.current = setTimeout(async () => {
      const aiMv = damaAI(state, aiPlayerNum)
      if (aiMv) {
        const result = damaMove(state, aiMv.from, aiMv.to, aiPlayerNum)
        if (!result.error) {
          await sendAIState({
            state: result.state,
            player1Score: room.player1Score,
            player2Score: room.player2Score,
            currentTurn: humanPlayerNum,
            status: result.winner ? 'completed' : 'active',
            winnerId: result.winner === 1 ? room.player1Id : result.winner === 2 ? room.player2Id : null,
          })
        }
      }
    }, 1000)
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [room, state, aiPlayerNum, humanPlayerNum])

  const handleClick = async (idx: number) => {
    if (!isMyTurn || isSpectator || room.status !== 'active') return
    if (selected === null) {
      if (mine.includes(board[idx])) setSelected(idx)
    } else {
      if (idx === selected) { setSelected(null); return }
      if (mine.includes(board[idx])) { setSelected(idx); return }
      if (validTargets.has(idx)) {
        await sendMove({ from: selected, to: idx })
        setSelected(null)
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-6 text-sm">
        <span>⬜ Beyaz: {p1Count}</span>
        <span>⬛ Siyah: {p2Count}</span>
      </div>
      <div className="text-xs text-fuchsia-300/80">
        {room.status === 'completed' ? '🏆 Oyun bitti!' : isMyTurn ? 'Senin sıran! Taş seç ve hamle yap.' : 'Rakip düşünüyor...'}
      </div>
      <div className="rounded-xl overflow-hidden border border-amber-400/30">
        <div className="grid grid-cols-8">
          {board.map((cell, i) => {
            const r = Math.floor(i / size), c = i % size
            const isDark = (r + c) % 2 === 1
            const isSelected = selected === i
            const isTarget = validTargets.has(i)
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                className={`w-10 h-10 flex items-center justify-center relative transition-all ${
                  isDark ? 'bg-amber-900/60' : 'bg-amber-100/20'
                } ${isSelected ? 'ring-2 ring-fuchsia-400 z-10' : ''} ${isTarget ? 'ring-2 ring-green-400/60' : ''}`}
              >
                {cell === 'w' && <div className="w-7 h-7 rounded-full bg-gradient-to-b from-gray-100 to-gray-300 border-2 border-gray-400 shadow" />}
                {cell === 'W' && <div className="w-7 h-7 rounded-full bg-gradient-to-b from-yellow-200 to-yellow-400 border-2 border-yellow-500 shadow font-bold text-xs flex items-center justify-center">👑</div>}
                {cell === 'b' && <div className="w-7 h-7 rounded-full bg-gradient-to-b from-gray-700 to-gray-900 border-2 border-gray-500 shadow" />}
                {cell === 'B' && <div className="w-7 h-7 rounded-full bg-gradient-to-b from-gray-600 to-gray-800 border-2 border-yellow-500 shadow font-bold text-xs flex items-center justify-center">👑</div>}
                {isTarget && !cell && <div className="w-3 h-3 rounded-full bg-green-400/50" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
