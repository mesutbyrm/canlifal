'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { amiralBattiAI, amiralBattiMove, amiralBattiPlaceShips } from '@/lib/game-logic'
import { useEffect, useRef, useState, useCallback } from 'react'

const SHIPS = [
  { name: 'Uçak Gemisi', size: 5, emoji: '🛩️' },
  { name: 'Savaş Gemisi', size: 4, emoji: '🚢' },
  { name: 'Kruvazör', size: 3, emoji: '⛵' },
  { name: 'Denizaltı', size: 3, emoji: '🤿' },
  { name: 'Muhrip', size: 2, emoji: '🚤' },
]

export default function AmiralBattiPage() {
  return (
    <GameShell
      gameType="amiral_batti"
      gameName="Amiral Battı"
      gameEmoji="🚢💥"
      gameDesc="Gemileri yerleştir, rakibin filosunu bat!"
      supportsAI={true}
    >
      {(props) => <BattleshipBoard {...props} />}
    </GameShell>
  )
}

function BattleshipBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const aiTimerRef = useRef<any>(null)
  const phase = state?.phase || 'placement'
  const myReady = state?.placedReady?.[playerNum] || false
  const [placements, setPlacements] = useState<{ row: number; col: number; horizontal: boolean }[]>([])
  const [currentShipIdx, setCurrentShipIdx] = useState(0)
  const [horizontal, setHorizontal] = useState(true)
  const [previewBoard, setPreviewBoard] = useState<string[]>(Array(100).fill(''))

  // AI
  const aiPlayerNum = room.disconnectedPlayerId === room.player1Id ? 1 : 2
  const humanPlayerNum = aiPlayerNum === 1 ? 2 : 1

  useEffect(() => {
    if (!room.isAI || room.status !== 'active') return
    if (phase === 'placement' && !state?.placedReady?.[aiPlayerNum]) {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
      aiTimerRef.current = setTimeout(async () => {
        const aiAction = amiralBattiAI(state, aiPlayerNum)
        if (aiAction?.type === 'place') {
          const result = amiralBattiPlaceShips(state, aiPlayerNum, aiAction.placements)
          if (!result.error) {
            await sendAIState({
              state: result.state,
              player1Score: room.player1Score,
              player2Score: room.player2Score,
              currentTurn: room.currentTurn,
              status: 'active',
            })
          }
        }
      }, 500)
      return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
    }
    if (phase === 'battle' && room.currentTurn === aiPlayerNum) {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
      aiTimerRef.current = setTimeout(async () => {
        const aiAction = amiralBattiAI(state, aiPlayerNum)
        if (aiAction?.target !== undefined) {
          const result: any = amiralBattiMove(state, { target: aiAction.target }, aiPlayerNum)
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
      }, 700)
      return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
    }
  }, [room, state, aiPlayerNum, humanPlayerNum, phase])

  const placeShip = useCallback((row: number, col: number) => {
    if (currentShipIdx >= SHIPS.length) return
    const ship = SHIPS[currentShipIdx]
    // Check bounds
    for (let i = 0; i < ship.size; i++) {
      const r = horizontal ? row : row + i
      const c = horizontal ? col + i : col
      if (r >= 10 || c >= 10) return
      if (previewBoard[r * 10 + c] !== '') return
    }
    const newBoard = [...previewBoard]
    for (let i = 0; i < ship.size; i++) {
      const r = horizontal ? row : row + i
      const c = horizontal ? col + i : col
      newBoard[r * 10 + c] = 'S'
    }
    setPreviewBoard(newBoard)
    setPlacements([...placements, { row, col, horizontal }])
    setCurrentShipIdx(currentShipIdx + 1)
  }, [currentShipIdx, horizontal, previewBoard, placements])

  const resetPlacements = () => {
    setPlacements([])
    setCurrentShipIdx(0)
    setPreviewBoard(Array(100).fill(''))
  }

  const confirmPlacement = async () => {
    if (placements.length !== SHIPS.length) return
    await sendMove({ type: 'place', placements })
  }

  const handleAttack = async (target: number) => {
    if (!isMyTurn || isSpectator || room.status !== 'active' || phase !== 'battle') return
    const myAttacks = state?.attacks?.[playerNum] || Array(100).fill('')
    if (myAttacks[target] !== '') return
    await sendMove({ target })
  }

  const myBoard = state?.boards?.[playerNum] || Array(100).fill('')
  const myAttacks = state?.attacks?.[playerNum] || Array(100).fill('')

  const renderGrid = (cells: string[], onClick: ((i: number) => void) | null, isAttack: boolean, label: string) => (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs text-fuchsia-300/70 font-semibold">{label}</div>
      <div className="bg-gradient-to-b from-blue-900/40 to-blue-950/60 rounded-lg p-1 border border-blue-400/20">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1.5rem)', gap: '1px' }}>
          {cells.map((cell, i) => (
            <motion.button
              key={i}
              onClick={() => onClick?.(i)}
              whileHover={onClick && cell === '' ? { scale: 1.15 } : {}}
              className={`w-6 h-6 rounded-sm text-[8px] flex items-center justify-center border transition-all ${
                cell === 'H' ? 'bg-red-500/80 border-red-400 text-white' :
                cell === 'M' ? 'bg-gray-500/40 border-gray-500/30 text-gray-400' :
                cell === 'S' && !isAttack ? 'bg-blue-500/50 border-blue-400/40' :
                'bg-blue-950/40 border-blue-800/20 hover:bg-blue-800/30 cursor-pointer'
              }`}
            >
              {cell === 'H' ? '💥' : cell === 'M' ? '•' : cell === 'S' && !isAttack ? '■' : ''}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )

  if (phase === 'placement' && !myReady && !isSpectator) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm text-fuchsia-300/80">
          {currentShipIdx < SHIPS.length
            ? `${SHIPS[currentShipIdx].emoji} ${SHIPS[currentShipIdx].name} (${SHIPS[currentShipIdx].size}) yerleştir`
            : '✅ Tüm gemiler yerleştirildi!'}
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setHorizontal(!horizontal)} className="px-3 py-1 rounded-lg bg-fuchsia-900/40 border border-fuchsia-400/30 text-xs text-fuchsia-300 hover:bg-fuchsia-800/40">
            {horizontal ? '↔️ Yatay' : '↕️ Dikey'}
          </button>
          <button onClick={resetPlacements} className="px-3 py-1 rounded-lg bg-red-900/40 border border-red-400/30 text-xs text-red-300 hover:bg-red-800/40">
            🔄 Sıfırla
          </button>
        </div>
        {renderGrid(previewBoard, currentShipIdx < SHIPS.length ? (i) => placeShip(Math.floor(i / 10), i % 10) : null, false, 'Gemilerini Yerleştir')}
        {currentShipIdx >= SHIPS.length && (
          <button onClick={confirmPlacement} className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-sm hover:from-green-500 hover:to-emerald-500">
            ✅ Onayla
          </button>
        )}
      </div>
    )
  }

  if (phase === 'placement') {
    return (
      <div className="text-center text-fuchsia-300/80 text-sm">
        ⏳ {myReady ? 'Rakibin gemilerini yerleştirmesi bekleniyor...' : 'Gemilerini yerleştir!'}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-sm text-fuchsia-300/80">
        {room.status === 'completed'
          ? (room.winnerId ? '🏆 Oyun bitti!' : '🤝 Berabere!')
          : isMyTurn ? '🎯 Ateş et!' : '⏳ Rakip ateş ediyor...'}
      </div>
      <div className="flex flex-wrap gap-4 justify-center">
        {renderGrid(myAttacks, isMyTurn && room.status === 'active' ? handleAttack : null, true, '🎯 Rakip Tahtası')}
        {renderGrid(myBoard, null, false, '🚢 Senin Tahtan')}
      </div>
    </div>
  )
}
