'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { tavlaAIMove, tavlaRollDice, tavlaMove } from '@/lib/game-logic'
import { useEffect, useRef, useState } from 'react'

export default function TavlaPage() {
  return (
    <GameShell
      gameType="tavla"
      gameName="Tavla"
      gameEmoji="🎲"
      gameDesc="Klasik tavla! Zarlarını at, taşlarını taşı, 15'ini çıkar."
      supportsAI={true}
    >
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }) => (
        <TavlaBoard room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator} playerNum={playerNum} sendMove={sendMove} sendAIState={sendAIState} />
      )}
    </GameShell>
  )
}

function TavlaBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const [selected, setSelected] = useState<number | null>(null)
  const aiRef = useRef<any>(null)

  const board: number[] = state?.board || Array(24).fill(0)
  const bar: number[] = state?.bar || [0, 0]
  const off: number[] = state?.off || [0, 0]
  const dice: number[] = state?.dice || []
  const movesLeft: number[] = state?.movesLeft || []
  const phase = state?.phase || 'roll'

  // AI logic
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || room.currentTurn !== 2) return
    if (aiRef.current) clearTimeout(aiRef.current)

    aiRef.current = setTimeout(async () => {
      let currentState = { ...state }

      if (currentState.phase === 'roll') {
        const rollResult = tavlaRollDice(currentState)
        currentState = rollResult.state
      }

      // Make all AI moves
      let moves = 0
      while (currentState.movesLeft && currentState.movesLeft.length > 0 && moves < 10) {
        const aiMove = tavlaAIMove(currentState)
        if (!aiMove) break
        const moveResult = tavlaMove(currentState, aiMove.from, 2)
        if (moveResult.error) break
        currentState = moveResult.state
        if (moveResult.winner) {
          await sendAIState({
            state: currentState,
            player1Score: room.player1Score,
            player2Score: room.player2Score,
            currentTurn: 1,
            status: 'completed',
            winnerId: moveResult.winner === 1 ? room.player1Id : room.player2Id,
          })
          return
        }
        moves++
      }

      currentState.phase = 'roll'
      await sendAIState({
        state: currentState,
        player1Score: room.player1Score,
        player2Score: room.player2Score,
        currentTurn: 1,
        status: 'active',
        winnerId: null,
      })
    }, 1200)

    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state])

  const handleRoll = async () => {
    if (!isMyTurn || isSpectator || phase !== 'roll' || room.status !== 'active') return
    await sendMove({ type: 'roll' })
  }

  const handlePointClick = (index: number) => {
    if (!isMyTurn || isSpectator || phase !== 'move' || room.status !== 'active') return
    // If bar has pieces, must move from bar first
    if (bar[playerNum - 1] > 0) {
      sendMove({ from: -1 })
      return
    }
    sendMove({ from: index })
  }

  // Render a single point with pieces
  const renderPoint = (index: number, isTop: boolean) => {
    const count = board[index]
    const absc = Math.abs(count)
    const isP1 = count > 0
    const color = isP1 ? 'bg-cyan-500' : 'bg-pink-500'
    const selectable = isMyTurn && phase === 'move' && (
      (playerNum === 1 && count > 0) || (playerNum === 2 && count < 0)
    )

    return (
      <div
        key={index}
        onClick={() => selectable && handlePointClick(index)}
        className={`flex flex-col ${isTop ? 'items-center' : 'items-center flex-col-reverse'} w-full h-full ${selectable ? 'cursor-pointer hover:bg-fuchsia-500/10' : ''} relative`}
      >
        {/* Point triangle */}
        <div className={`w-full h-2 ${index % 2 === 0 ? 'bg-amber-800/40' : 'bg-purple-900/40'}`} />
        {/* Pieces */}
        <div className={`flex flex-col ${isTop ? '' : 'flex-col-reverse'} items-center gap-0.5 py-0.5`}>
          {Array.from({ length: Math.min(absc, 5) }).map((_, pi) => (
            <div key={pi} className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${color} border border-white/20 text-[8px] flex items-center justify-center text-white font-bold`}>
              {pi === 0 && absc > 5 ? absc : ''}
            </div>
          ))}
        </div>
        <span className="text-[8px] text-fuchsia-400/30 absolute bottom-0">{index + 1}</span>
      </div>
    )
  }

  // Top row: points 12-23 (left to right), Bottom row: points 11-0 (left to right)
  const topPoints = Array.from({ length: 12 }, (_, i) => 12 + i)
  const bottomPoints = Array.from({ length: 12 }, (_, i) => 11 - i)

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Info bar */}
      <div className="flex items-center justify-between w-full text-xs">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-cyan-500 inline-block" />
          <span className="text-cyan-300">{room.player1Name} ({off[0]}/15)</span>
        </div>
        {dice.length > 0 && (
          <div className="flex gap-1">
            {dice.map((d: number, i: number) => (
              <span key={i} className="text-xl">{['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][d]}</span>
            ))}
            {movesLeft.length > 0 && <span className="text-amber-300 text-xs">({movesLeft.join(',')})</span>}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-pink-300">{room.player2Name} ({off[1]}/15)</span>
          <span className="w-4 h-4 rounded-full bg-pink-500 inline-block" />
        </div>
      </div>

      {/* Board */}
      <div className="w-full bg-amber-950/30 border border-amber-700/30 rounded-xl p-2 overflow-hidden">
        {/* Top half */}
        <div className="grid grid-cols-12 gap-0.5 h-28 sm:h-36">
          {topPoints.map(i => renderPoint(i, true))}
        </div>
        {/* Bar */}
        <div className="flex items-center justify-center gap-4 py-1 border-y border-amber-700/20">
          {bar[0] > 0 && <span className="text-xs text-cyan-400">Bar: {bar[0]} ⚪</span>}
          {bar[1] > 0 && <span className="text-xs text-pink-400">Bar: {bar[1]} 🔴</span>}
          {bar[0] === 0 && bar[1] === 0 && <span className="text-fuchsia-400/20 text-xs">─── bar ───</span>}
        </div>
        {/* Bottom half */}
        <div className="grid grid-cols-12 gap-0.5 h-28 sm:h-36">
          {bottomPoints.map(i => renderPoint(i, false))}
        </div>
      </div>

      {/* Actions */}
      {isMyTurn && !isSpectator && room.status === 'active' && (
        <div className="flex gap-2">
          {phase === 'roll' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRoll}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-full shadow-lg"
            >
              🎲 Zar At
            </motion.button>
          )}
          {phase === 'move' && bar[playerNum - 1] > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => sendMove({ from: -1 })}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold rounded-full"
            >
              Bar'dan Çıkar
            </motion.button>
          )}
          {phase === 'move' && movesLeft.length > 0 && (
            <p className="text-xs text-amber-300 self-center">Bir taşa tıkla ({movesLeft.join(', ')} kaldı)</p>
          )}
        </div>
      )}

      {!isMyTurn && room.status === 'active' && !isSpectator && (
        <p className="text-fuchsia-400/60 text-sm">Rakibin sırası...</p>
      )}
    </div>
  )
}
