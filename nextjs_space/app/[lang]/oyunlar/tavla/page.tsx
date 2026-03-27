'use client'

import GameShell from '@/components/game-shell'
import { DiceRollAnimation, DiceButton } from '@/components/dice-3d'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [preview, setPreview] = useState<number[]>([])
  const [diceRolling, setDiceRolling] = useState(false)
  const [lastDice, setLastDice] = useState<number[]>([])
  const aiRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)

  const board: number[] = state?.board || Array(24).fill(0)
  const bar: number[] = state?.bar || [0, 0]
  const off: number[] = state?.off || [0, 0]
  const dice: number[] = state?.dice || []
  const movesLeft: number[] = state?.movesLeft || []
  const phase = state?.phase || 'roll'

  // Sync dice display
  useEffect(() => {
    if (dice.length > 0 && (dice[0] !== lastDice[0] || dice[1] !== lastDice[1])) {
      setDiceRolling(true)
      setLastDice(dice)
      setTimeout(() => setDiceRolling(false), 700)
    }
  }, [dice])

  // Clear selection when turn changes
  useEffect(() => { setSelected(null); setPreview([]) }, [room.currentTurn, phase])

  // AI logic
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || room.currentTurn !== 2) return
    if (aiRef.current) clearTimeout(aiRef.current)

    aiRef.current = setTimeout(async () => {
      let currentState = { ...state }
      if (currentState.phase === 'roll') {
        const rollResult = tavlaRollDice(currentState, 2)
        currentState = rollResult.state
      }
      let moves = 0
      while (currentState.movesLeft && currentState.movesLeft.length > 0 && moves < 10) {
        const aiMove = tavlaAIMove(currentState)
        if (!aiMove) break
        const moveResult = tavlaMove(currentState, aiMove.from, 2)
        if (moveResult.error) break
        currentState = moveResult.state
        if (moveResult.winner) {
          await sendAIState({ state: currentState, player1Score: room.player1Score, player2Score: room.player2Score, currentTurn: 1, status: 'completed', winnerId: moveResult.winner === 1 ? room.player1Id : room.player2Id })
          return
        }
        moves++
      }
      currentState.phase = 'roll'
      await sendAIState({ state: currentState, player1Score: room.player1Score, player2Score: room.player2Score, currentTurn: 1, status: 'active', winnerId: null })
    }, 1200)

    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state])

  const handleRoll = async () => {
    if (!isMyTurn || isSpectator || phase !== 'roll' || room.status !== 'active') return
    setDiceRolling(true)
    await sendMove({ type: 'roll' })
  }

  // Calculate possible destinations for a selected piece
  const getDestinations = (from: number): number[] => {
    if (!movesLeft || movesLeft.length === 0) return []
    const dir = playerNum === 1 ? 1 : -1
    const sign = playerNum === 1 ? 1 : -1
    const dests: number[] = []
    const uniqueDice = [...new Set(movesLeft)]
    for (const die of uniqueDice) {
      let to: number
      if (from === -1) {
        to = playerNum === 1 ? die - 1 : 24 - die
      } else {
        to = from + die * dir
      }
      // Bearing off
      if ((playerNum === 1 && to >= 24) || (playerNum === 2 && to < 0)) {
        dests.push(playerNum === 1 ? 24 : -1) // special marker for bearing off
        continue
      }
      if (to >= 0 && to < 24 && board[to] * sign >= -1) {
        dests.push(to)
      }
    }
    return [...new Set(dests)]
  }

  const handlePointClick = (index: number) => {
    if (!isMyTurn || isSpectator || phase !== 'move' || room.status !== 'active') return
    setError(null)

    // If bar has pieces, must move from bar first
    if (bar[playerNum - 1] > 0) {
      if (selected === -1) {
        // Already selected bar, clicking destination or re-clicking bar
        // Actually send move from bar
        sendMoveWithFeedback(-1)
        return
      }
      // Select bar piece
      setSelected(-1)
      setPreview(getDestinations(-1))
      return
    }

    const sign = playerNum === 1 ? 1 : -1
    const isMyPiece = board[index] * sign > 0

    if (selected !== null && selected !== index) {
      // If clicked on a destination preview, send the move from the selected piece
      if (preview.includes(index) || (preview.includes(24) && index >= 24) || (preview.includes(-1) && index < 0)) {
        sendMoveWithFeedback(selected)
        return
      }
    }

    if (isMyPiece) {
      if (selected === index) {
        // Double-click: execute move
        sendMoveWithFeedback(index)
        return
      }
      // First click: select and show preview
      setSelected(index)
      setPreview(getDestinations(index))
    }
  }

  const handleBearOff = () => {
    if (selected !== null) {
      sendMoveWithFeedback(selected)
    }
  }

  const sendMoveWithFeedback = async (from: number) => {
    const result = await sendMove({ from })
    if (result && !result.success && result.error) {
      setError(result.error)
      setTimeout(() => setError(null), 2000)
    } else {
      setSelected(null)
      setPreview([])
    }
  }

  // Board rendering - realistic tavla look
  const renderPoint = (index: number, isTop: boolean) => {
    const count = board[index]
    const absc = Math.abs(count)
    const isP1 = count > 0
    const pieceColor = isP1 ? 'bg-amber-100 border-amber-300 shadow-amber-200/30' : 'bg-gray-800 border-gray-600 shadow-gray-700/30'
    const pieceTextColor = isP1 ? 'text-amber-900' : 'text-gray-200'
    const sign = playerNum === 1 ? 1 : -1
    const isMyPiece = count * sign > 0
    const isSelected = selected === index
    const isPreviewDest = preview.includes(index)
    const canSelect = isMyTurn && phase === 'move' && isMyPiece && bar[playerNum - 1] === 0

    // Triangle colors
    const triColor = index % 2 === 0
      ? (isTop ? 'border-t-amber-800' : 'border-b-amber-800')
      : (isTop ? 'border-t-[#3a1a0a]' : 'border-b-[#3a1a0a]')

    return (
      <div
        key={index}
        onClick={() => handlePointClick(index)}
        className={`flex flex-col ${isTop ? 'items-center' : 'items-center flex-col-reverse'} w-full h-full relative
          ${canSelect ? 'cursor-pointer' : ''}
          ${isSelected ? 'bg-yellow-500/20 rounded' : ''}
          ${isPreviewDest ? 'bg-green-500/20 rounded' : ''}
        `}
      >
        {/* Triangle */}
        <div className={`w-0 h-0 border-l-[calc(100%/2-1px)] border-r-[calc(100%/2-1px)] border-l-transparent border-r-transparent
          ${isTop ? `border-t-[60px] sm:border-t-[80px] ${triColor}` : `border-b-[60px] sm:border-b-[80px] ${triColor}`}
          absolute ${isTop ? 'top-0' : 'bottom-0'} z-0 opacity-60`}
        />
        {/* Pieces */}
        <div className={`flex flex-col ${isTop ? '' : 'flex-col-reverse'} items-center gap-0.5 py-1 relative z-10`}>
          {Array.from({ length: Math.min(absc, 5) }).map((_, pi) => (
            <motion.div
              key={pi}
              layout
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${pieceColor} border-2 shadow-md text-[8px] flex items-center justify-center font-bold ${pieceTextColor}
                ${isSelected && pi === 0 ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent' : ''}`}
            >
              {pi === 0 && absc > 5 ? absc : ''}
            </motion.div>
          ))}
        </div>
        {/* Preview dot */}
        {isPreviewDest && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <div className="w-4 h-4 bg-green-400/60 rounded-full border-2 border-green-300 shadow-lg shadow-green-400/40" />
          </motion.div>
        )}
      </div>
    )
  }

  // Top: points 12-23, Bottom: points 11-0
  const topPoints = Array.from({ length: 12 }, (_, i) => 12 + i)
  const bottomPoints = Array.from({ length: 12 }, (_, i) => 11 - i)

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Info bar */}
      <div className="flex items-center justify-between w-full text-xs">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-amber-100 border-2 border-amber-300 inline-block shadow" />
          <span className="text-amber-200 font-medium">{room.player1Name} ({off[0]}/15)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-300 font-medium">{room.player2Name} ({off[1]}/15)</span>
          <span className="w-5 h-5 rounded-full bg-gray-800 border-2 border-gray-600 inline-block shadow" />
        </div>
      </div>

      {/* Dice display */}
      {dice.length > 0 && (
        <div className="flex flex-col items-center gap-1">
          <DiceRollAnimation dice={dice} rolling={diceRolling} size={40} />
          {movesLeft.length > 0 && (
            <span className="text-amber-300 text-xs font-medium">Kalan hamle: {movesLeft.join(', ')}</span>
          )}
        </div>
      )}

      {/* Board - realistic wood look */}
      <div className="w-full bg-gradient-to-b from-[#5a3015] via-[#4a2810] to-[#3a1e0c] border-2 border-amber-900/60 rounded-xl p-1.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] overflow-hidden">
        {/* Top half */}
        <div className="grid grid-cols-12 gap-px h-24 sm:h-32 bg-[#2a1508]/40 rounded-t">
          {topPoints.map(i => renderPoint(i, true))}
        </div>
        {/* Bar */}
        <div className="flex items-center justify-center gap-4 py-1.5 bg-[#2a1508]/60 border-y border-amber-900/40">
          {bar[0] > 0 && (
            <button
              onClick={() => { if (playerNum === 1 && isMyTurn && phase === 'move') { setSelected(-1); setPreview(getDestinations(-1)) } }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${selected === -1 && playerNum === 1 ? 'bg-yellow-500/30 border border-yellow-400' : 'bg-amber-900/40'}`}
            >
              <span className="w-4 h-4 rounded-full bg-amber-100 border border-amber-300 inline-block" />
              <span className="text-amber-200">{bar[0]}</span>
            </button>
          )}
          {bar[0] === 0 && bar[1] === 0 && <span className="text-amber-700/40 text-xs font-medium">─── BAR ───</span>}
          {bar[1] > 0 && (
            <button
              onClick={() => { if (playerNum === 2 && isMyTurn && phase === 'move') { setSelected(-1); setPreview(getDestinations(-1)) } }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${selected === -1 && playerNum === 2 ? 'bg-yellow-500/30 border border-yellow-400' : 'bg-gray-900/40'}`}
            >
              <span className="w-4 h-4 rounded-full bg-gray-800 border border-gray-600 inline-block" />
              <span className="text-gray-300">{bar[1]}</span>
            </button>
          )}
        </div>
        {/* Bottom half */}
        <div className="grid grid-cols-12 gap-px h-24 sm:h-32 bg-[#2a1508]/40 rounded-b">
          {bottomPoints.map(i => renderPoint(i, false))}
        </div>
      </div>

      {/* Bearing off area */}
      {(preview.includes(24) || preview.includes(-1)) && selected !== null && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleBearOff}
          className="px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-full text-sm shadow-lg"
        >
          ✅ Taşı Çıkar (Bear Off)
        </motion.button>
      )}

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Actions */}
      {isMyTurn && !isSpectator && room.status === 'active' && (
        <div className="flex flex-col items-center gap-2">
          {phase === 'roll' && (
            <DiceButton onRoll={handleRoll} disabled={diceRolling} />
          )}
          {phase === 'move' && bar[playerNum - 1] > 0 && selected !== -1 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setSelected(-1); setPreview(getDestinations(-1)) }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold rounded-full text-sm"
            >
              Bar'dan Çıkar
            </motion.button>
          )}
          {phase === 'move' && movesLeft.length > 0 && selected === null && bar[playerNum - 1] === 0 && (
            <p className="text-xs text-amber-300">Taşına tıkla → hedefi gör → tekrar tıkla</p>
          )}
          {selected !== null && preview.length > 0 && !preview.includes(24) && !preview.includes(-1) && (
            <p className="text-xs text-green-300">Yeşil noktaya veya taşa tekrar tıkla</p>
          )}
        </div>
      )}

      {!isMyTurn && room.status === 'active' && !isSpectator && (
        <p className="text-fuchsia-400/60 text-sm">Rakibin sırası...</p>
      )}
    </div>
  )
}
