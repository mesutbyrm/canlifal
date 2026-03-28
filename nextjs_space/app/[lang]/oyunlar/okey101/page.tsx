'use client'

import GameShell from '@/components/game-shell'
import { motion, AnimatePresence } from 'framer-motion'
import { okeyDraw, okeyDiscard, okeyCheckWin, okeyAIMove, okey101CalcPenalty, okey101NewRound, OkeyTile } from '@/lib/game-logic'
import { useEffect, useRef, useState, useCallback } from 'react'

const COLORS: Record<number, { bg: string; text: string; border: string; name: string; glow: string }> = {
  0: { bg: 'from-red-50 to-red-100', text: 'text-red-600', border: 'border-red-400', name: 'Kırmızı', glow: 'shadow-red-400/40' },
  1: { bg: 'from-blue-50 to-blue-100', text: 'text-blue-600', border: 'border-blue-400', name: 'Mavi', glow: 'shadow-blue-400/40' },
  2: { bg: 'from-green-50 to-green-100', text: 'text-green-600', border: 'border-green-400', name: 'Yeşil', glow: 'shadow-green-400/40' },
  3: { bg: 'from-gray-100 to-gray-200', text: 'text-gray-800', border: 'border-gray-500', name: 'Siyah', glow: 'shadow-gray-500/40' },
  4: { bg: 'from-yellow-100 to-amber-100', text: 'text-amber-700', border: 'border-amber-400', name: 'Joker', glow: 'shadow-amber-400/60' },
}

const SEAT_NAMES = ['Sen', 'Doğu 🤖', 'Kuzey 🤖', 'Batı 🤖']
const SEAT_COLORS = ['text-cyan-400', 'text-pink-400', 'text-amber-400', 'text-green-400']
const DIFF_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  easy: { label: 'Kolay', color: 'text-green-400', emoji: '🟢' },
  medium: { label: 'Orta', color: 'text-amber-400', emoji: '🟡' },
  hard: { label: 'Zor', color: 'text-red-400', emoji: '🔴' },
}

function playTileSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / data.length, 2) * 0.3
    const src = ctx.createBufferSource(); src.buffer = buf
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0.15, ctx.currentTime)
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 1000
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination); src.start()
  } catch {}
}

function playWinSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    ;[523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.15); osc.stop(ctx.currentTime + i * 0.15 + 0.5)
    })
  } catch {}
}

function get101Stats() {
  try { return JSON.parse(localStorage.getItem('okey101_stats') || '{"wins":0,"losses":0,"gamesPlayed":0}') }
  catch { return { wins: 0, losses: 0, gamesPlayed: 0 } }
}
function save101Stats(s: any) { try { localStorage.setItem('okey101_stats', JSON.stringify(s)) } catch {} }

export default function Okey101Page() {
  return (
    <GameShell
      gameType="okey101"
      gameName="101 Okey"
      gameEmoji="💯"
      gameDesc="Çok rauntlu 101 Okey! İlk 101 puana ulaşan elenir."
      supportsAI={true}
    >
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState, soundEnabled }) => (
        <Okey101Board room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator} sendAIState={sendAIState} soundEnabled={soundEnabled} playerNum={playerNum} />
      )}
    </GameShell>
  )
}

function TileView({ tile, selected, onClick, size = 'md', isJoker, glow }: {
  tile: OkeyTile; selected?: boolean; onClick?: () => void; size?: 'sm' | 'md' | 'lg'; isJoker?: boolean; glow?: boolean
}) {
  const c = tile.isFalseJoker ? COLORS[4] : COLORS[tile.color] || COLORS[0]
  const sizeClasses = size === 'sm' ? 'w-6 h-9' : size === 'lg' ? 'w-10 h-14' : 'w-8 h-12'
  const fontSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-base' : 'text-sm'
  return (
    <motion.div layout onClick={onClick}
      whileHover={onClick ? { y: -4, scale: 1.05 } : {}} whileTap={onClick ? { scale: 0.95 } : {}}
      className={`${sizeClasses} rounded-lg bg-gradient-to-b ${c.bg} border-2 ${c.border}
        flex items-center justify-center font-bold ${c.text}
        shadow-md cursor-pointer select-none transition-all relative
        ${selected ? 'ring-2 ring-yellow-400 -translate-y-3 scale-110 z-20' : ''}
        ${isJoker ? `shadow-lg ${c.glow} ring-1 ring-yellow-300/60` : ''}
        ${glow ? 'animate-pulse shadow-lg shadow-green-400/50 ring-2 ring-green-400' : ''}`}
    >
      {tile.isFalseJoker ? <span className={`${fontSize} text-amber-600`}>★</span> : <span className={fontSize}>{tile.number}</span>}
      {isJoker && !tile.isFalseJoker && (
        <span className="absolute -top-1 -right-1 text-[7px] bg-yellow-400 text-yellow-900 rounded-full w-3 h-3 flex items-center justify-center font-black">J</span>
      )}
    </motion.div>
  )
}

function FaceDownTile({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-5 h-8' : 'w-6 h-9'
  return (
    <div className={`${s} rounded-md bg-gradient-to-b from-purple-800 to-purple-950 border border-purple-600/60 shadow-md`}>
      <div className="w-full h-full flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-purple-500/40" /></div>
    </div>
  )
}

function Okey101Board({ room, state, isMyTurn, isSpectator, sendAIState, soundEnabled, playerNum }: any) {
  const mySeat: number = room?.isAI ? 0 : (playerNum === 2 ? 1 : 0)

  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showRoundEnd, setShowRoundEnd] = useState(false)
  const [difficulty, setDifficulty] = useState<string>('medium')
  const [diffSet, setDiffSet] = useState(false)
  const aiRef = useRef<any>(null)
  const lastSeatRef = useRef<number>(-1)
  const roundProcessedRef = useRef<number>(0)
  const statsUpdatedRef = useRef(false)

  const hands: OkeyTile[][] = state?.hands || [[], [], [], []]
  const discards: OkeyTile[][] = state?.discards || [[], [], [], []]
  const pile: OkeyTile[] = state?.pile || []
  const indicator: OkeyTile | null = state?.indicator || null
  const jokerColor: number = state?.jokerColor ?? -1
  const jokerNumber: number = state?.jokerNumber ?? -1
  const currentSeat: number = state?.currentSeat ?? 0
  const phase: string = state?.phase || 'draw'
  const winner: number | null = state?.winner ?? null
  const gameOver: boolean = state?.gameOver ?? false
  const scores: number[] = state?.scores || [0, 0, 0, 0]
  const round: number = state?.round || 1
  const eliminated: boolean[] = state?.eliminated || [false, false, false, false]
  const stateDiff: string = state?.difficulty || 'medium'

  const seatToTurn = (seat: number) => seat === 0 ? 1 : 2
  const isMyCurrentTurn = currentSeat === mySeat
  const opponentSeats = [0, 1, 2, 3].filter(s => s !== mySeat)

  const myHand = hands[mySeat] || []
  const winCount = 21 // 101 Okey uses 21 tiles (22 for dealer at start, discard to 21)
  const canWin = myHand.length === winCount && okeyCheckWin(myHand, jokerColor, jokerNumber)

  const isJokerTile = useCallback((t: OkeyTile) => {
    return !!t.isFalseJoker || (t.color === jokerColor && t.number === jokerNumber)
  }, [jokerColor, jokerNumber])

  // Set difficulty
  useEffect(() => {
    if (state && !diffSet && room?.status === 'active' && !state.difficulty) {
      const ns = { ...state, difficulty }
      sendAIState({ state: ns, currentTurn: seatToTurn(ns.currentSeat), status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
      setDiffSet(true)
    }
  }, [state, room])

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(null), 2500) }

  useEffect(() => {
    if (currentSeat !== lastSeatRef.current) {
      setSelectedTile(null); lastSeatRef.current = currentSeat
      if (isMyCurrentTurn && !isSpectator && room.status === 'active' && !winner) showMsg('Sıra sende!')
    }
  }, [currentSeat])

  // Process round end: calculate penalties and check for game over
  const processRoundEnd = async (cs: any, roundWinner: number) => {
    const newScores = [...(cs.scores || [0, 0, 0, 0])]
    const roundPenalties = [0, 0, 0, 0]
    const jc = cs.jokerColor; const jn = cs.jokerNumber

    for (let s = 0; s < 4; s++) {
      if (s === roundWinner) continue // winner gets 0
      if (cs.eliminated?.[s]) continue
      roundPenalties[s] = okey101CalcPenalty(cs.hands[s] || [], jc, jn)
      newScores[s] += roundPenalties[s]
    }

    const newEliminated = [...(cs.eliminated || [false, false, false, false])]
    for (let s = 0; s < 4; s++) {
      if (newScores[s] >= 101) newEliminated[s] = true
    }

    const activePlayers = newEliminated.filter((e: boolean) => !e).length
    const roundHistory = [...(cs.roundHistory || []), { round: cs.round, winner: roundWinner, penalties: roundPenalties }]

    if (activePlayers <= 1) {
      // Game over — find the last player standing
      const gameWinner = newEliminated.findIndex((e: boolean) => !e)
      const finalState = { ...cs, scores: newScores, eliminated: newEliminated, roundHistory, gameOver: true,
        winner: gameWinner >= 0 ? gameWinner : roundWinner, roundWinner }
      // Update stats
      if (!statsUpdatedRef.current && !isSpectator) {
        statsUpdatedRef.current = true
        const stats = get101Stats(); stats.gamesPlayed++
        if (gameWinner === mySeat) stats.wins++; else stats.losses++
        save101Stats(stats)
      }
      const myWin = gameWinner === mySeat
      await sendAIState({
        state: finalState, player1Score: myWin && playerNum === 1 ? 1 : (!myWin && playerNum !== 1 ? 1 : 0), player2Score: myWin && playerNum === 2 ? 1 : (!myWin && playerNum !== 2 ? 1 : 0),
        currentTurn: 1, status: 'completed',
        winnerId: myWin ? (playerNum === 1 ? room.player1Id : room.player2Id) : (playerNum === 1 ? room.player2Id : room.player1Id),
      })
    } else {
      // Start new round after delay
      const interimState = { ...cs, scores: newScores, eliminated: newEliminated, roundHistory,
        gameOver: false, winner: null, roundWinner, showingRoundResult: true }
      setShowRoundEnd(true)
      await sendAIState({
        state: interimState, currentTurn: 1, status: 'active',
        player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null,
      })
    }
  }

  // Start next round
  const startNextRound = async () => {
    setShowRoundEnd(false)
    const newState = okey101NewRound(state)
    await sendAIState({
      state: newState, currentTurn: seatToTurn(newState.currentSeat), status: 'active',
      player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null,
    })
  }

  // AI logic
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || gameOver) return
    if (state?.showingRoundResult) return
    if (winner !== null && winner !== undefined) return
    if (currentSeat === mySeat) return
    if (aiRef.current) clearTimeout(aiRef.current)
    aiRef.current = setTimeout(async () => {
      let cs = JSON.parse(JSON.stringify(state))
      let seat = cs.currentSeat; let moves = 0
      while (seat !== mySeat && moves < 12 && !cs.gameOver && cs.winner === null && cs.winner === undefined) {
        if (cs.eliminated?.[seat]) { cs.currentSeat = (seat + 1) % 4; seat = cs.currentSeat; continue }
        const move = okeyAIMove(cs)
        if (!move) break
        if (move.action === 'draw') {
          const result = okeyDraw(cs, seat, move.source)
          if (result.error) break; cs = result.state
        } else if (move.action === 'discard') {
          const result = okeyDiscard(cs, seat, move.tileId)
          if (result.error) break; cs = result.state
        }
        seat = cs.currentSeat; moves++
        await new Promise(r => setTimeout(r, 300))
      }
      // Check AI wins (21 tiles for 101 okey)
      for (const s of opponentSeats) {
        if (cs.eliminated?.[s]) continue
        if (cs.hands[s] && cs.hands[s].length === 21 && okeyCheckWin(cs.hands[s], cs.jokerColor, cs.jokerNumber)) {
          await processRoundEnd(cs, s)
          return
        }
      }
      await sendAIState({
        state: cs, player1Score: room.player1Score, player2Score: room.player2Score,
        currentTurn: seatToTurn(cs.currentSeat), status: 'active', winnerId: null,
      })
    }, 800)
    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state, currentSeat])

  const handleDraw = async (source: 'pile' | 'discard') => {
    if (!isMyCurrentTurn || phase !== 'draw' || isSpectator || room.status !== 'active') return
    const result = okeyDraw(state, mySeat, source)
    if (result.error) { showMsg(result.error); return }
    if (soundEnabled) playTileSound()
    await sendAIState({ state: result.state, currentTurn: seatToTurn(mySeat), status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
  }

  const handleDiscard = async (tileId: number) => {
    if (!isMyCurrentTurn || phase !== 'discard' || isSpectator || room.status !== 'active') return
    const result = okeyDiscard(state, mySeat, tileId)
    if (result.error) { showMsg(result.error); return }
    if (soundEnabled) playTileSound()
    const newHand = result.state.hands[mySeat]
    if (newHand.length === 21 && okeyCheckWin(newHand, jokerColor, jokerNumber)) {
      if (soundEnabled) playWinSound()
      await processRoundEnd(result.state, mySeat)
    } else {
      await sendAIState({
        state: result.state, currentTurn: seatToTurn(result.state.currentSeat),
        status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null,
      })
    }
    setSelectedTile(null)
  }

  const handleTileClick = (tileId: number) => {
    if (!isMyCurrentTurn || isSpectator || room.status !== 'active') return
    if (phase === 'discard') {
      if (selectedTile === tileId) handleDiscard(tileId)
      else setSelectedTile(tileId)
    }
  }

  const getTopDiscard = (seat: number): OkeyTile | null => {
    const d = discards[seat]; return d && d.length > 0 ? d[d.length - 1] : null
  }
  const prevSeatDiscard = getTopDiscard((mySeat + 3) % 4)

  const showDiffSelector = room?.isAI && room?.status === 'active' && !diffSet && round === 1 && isMyCurrentTurn && pile.length > 90

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xl mx-auto">
      {/* Scoreboard */}
      <div className="w-full bg-gradient-to-r from-purple-900/40 via-fuchsia-900/30 to-purple-900/40 border border-purple-600/30 rounded-xl px-3 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-fuchsia-300/70 font-bold">💯 101 Okey — Raunt {round}</span>
          {stateDiff && <span className={`text-[10px] ${DIFF_LABELS[stateDiff]?.color || 'text-amber-400'}`}>{DIFF_LABELS[stateDiff]?.emoji} {DIFF_LABELS[stateDiff]?.label}</span>}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {SEAT_NAMES.map((name, i) => (
            <div key={i} className={`text-center px-1 py-0.5 rounded-lg border ${
              eliminated[i] ? 'border-red-800/40 bg-red-950/30 opacity-50' :
              i === 0 ? 'border-cyan-600/40 bg-cyan-900/20' : 'border-purple-700/30 bg-purple-900/20'
            }`}>
              <div className={`text-[9px] font-bold ${SEAT_COLORS[i]} ${eliminated[i] ? 'line-through' : ''}`}>{name.split(' ')[0]}</div>
              <div className={`text-sm font-black ${
                scores[i] >= 80 ? 'text-red-400' : scores[i] >= 50 ? 'text-amber-400' : 'text-green-400'
              }`}>{scores[i]}</div>
              {eliminated[i] && <div className="text-[8px] text-red-400">ELENDİ</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty selector */}
      {showDiffSelector && (
        <div className="flex items-center gap-2 text-xs bg-purple-900/40 border border-purple-600/40 rounded-xl px-3 py-2">
          <span className="text-fuchsia-300/80">Zorluk:</span>
          {(['easy', 'medium', 'hard'] as const).map(d => (
            <button key={d} onClick={() => { setDifficulty(d); setDiffSet(true);
              const ns = { ...state, difficulty: d }
              sendAIState({ state: ns, currentTurn: 1, status: 'active', player1Score: 0, player2Score: 0, winnerId: null })
            }}
              className={`px-3 py-1 rounded-lg border transition-all text-xs font-bold ${
                difficulty === d ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : 'border-purple-700/50 bg-purple-900/30 text-fuchsia-400/70 hover:bg-purple-800/40'
              }`}>
              {DIFF_LABELS[d].emoji} {DIFF_LABELS[d].label}
            </button>
          ))}
        </div>
      )}

      {/* Round end overlay */}
      {(state?.showingRoundResult || showRoundEnd) && !gameOver && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-gradient-to-b from-amber-900/40 to-purple-900/40 border border-amber-600/40 rounded-xl p-4 text-center">
          <h3 className="text-lg font-bold text-yellow-400 mb-2">🏆 Raunt {round} Bitti!</h3>
          <p className="text-sm text-fuchsia-300 mb-3">{SEAT_NAMES[state?.roundWinner ?? 0]} kazandı!</p>
          {state?.roundHistory?.length > 0 && (
            <div className="grid grid-cols-4 gap-1 mb-3">
              {SEAT_NAMES.map((name, i) => {
                const lastRound = state.roundHistory[state.roundHistory.length - 1]
                return (
                  <div key={i} className="text-center">
                    <div className={`text-[9px] ${SEAT_COLORS[i]}`}>{name.split(' ')[0]}</div>
                    <div className="text-red-400 text-xs">+{lastRound?.penalties?.[i] || 0}</div>
                  </div>
                )
              })}
            </div>
          )}
          <button onClick={startNextRound}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all">
            Sonraki Raunt →
          </button>
        </motion.div>
      )}

      {/* Game Over */}
      {gameOver && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-gradient-to-b from-yellow-900/40 to-purple-900/40 border border-yellow-600/40 rounded-xl p-4 text-center">
          <h3 className="text-xl font-bold text-yellow-400 mb-2">🎉 Oyun Bitti!</h3>
          <p className="text-sm text-fuchsia-300 mb-1">{SEAT_NAMES[winner ?? 0]} oyunu kazandı!</p>
          <div className="grid grid-cols-4 gap-1 mt-2">
            {SEAT_NAMES.map((name, i) => (
              <div key={i} className={`text-center p-2 rounded-lg ${
                i === winner ? 'bg-yellow-500/20 border border-yellow-500/40' : 'bg-purple-900/20 border border-purple-700/30'
              }`}>
                <div className={`text-[10px] font-bold ${SEAT_COLORS[i]}`}>{name.split(' ')[0]}</div>
                <div className="text-lg font-black text-white">{scores[i]}</div>
                {i === winner && <div className="text-[9px] text-yellow-400">🏆</div>}
                {eliminated[i] && i !== winner && <div className="text-[8px] text-red-400">ELENDİ</div>}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Game info */}
      {!state?.showingRoundResult && !gameOver && (
        <>
          <div className="flex items-center justify-between w-full text-xs px-1">
            <div className="flex items-center gap-2">
              {indicator && <div className="flex items-center gap-1"><span className="text-amber-400/70 text-[10px]">Gösterge:</span><TileView tile={indicator} size="sm" /></div>}
              <span className="text-fuchsia-400/60">Okey: <span className="text-yellow-300 font-bold">{indicator?.isFalseJoker ? '★' : `${COLORS[jokerColor]?.name} ${jokerNumber}`}</span></span>
            </div>
            <span className="text-fuchsia-400/50">Kalan: {pile.length} taş</span>
          </div>

          {/* Table */}
          <div className="relative w-full bg-gradient-to-br from-[#1a0e06] via-[#2a1810] to-[#1a0e06] border-[3px] border-amber-900/70 rounded-2xl shadow-[inset_0_2px_15px_rgba(0,0,0,0.6),0_4px_20px_rgba(0,0,0,0.5)] p-3 sm:p-4" style={{ minHeight: 360 }}>

            {/* North (seat 2) */}
            <div className="flex flex-col items-center gap-1 mb-2">
              <span className={`text-[10px] font-bold ${SEAT_COLORS[2]} ${eliminated[2] ? 'opacity-30 line-through' : currentSeat === 2 ? 'animate-pulse' : 'opacity-60'}`}>{SEAT_NAMES[2]} ({hands[2]?.length || 0})</span>
              {!eliminated[2] && <div className="flex gap-0.5">{Array.from({ length: Math.min(hands[2]?.length || 0, 15) }).map((_, i) => <FaceDownTile key={i} size="sm" />)}</div>}
              {getTopDiscard(2) && !eliminated[2] && <div className="flex items-center gap-1 mt-0.5"><span className="text-amber-500/40 text-[8px]">attı:</span><TileView tile={getTopDiscard(2)!} size="sm" isJoker={isJokerTile(getTopDiscard(2)!)} /></div>}
            </div>

            <div className="flex items-center justify-between gap-2">
              {/* West (seat 3) */}
              <div className="flex flex-col items-center gap-1 min-w-[40px]">
                <span className={`text-[10px] font-bold ${SEAT_COLORS[3]} ${eliminated[3] ? 'opacity-30 line-through' : currentSeat === 3 ? 'animate-pulse' : 'opacity-60'}`}>{SEAT_NAMES[3]}</span>
                {!eliminated[3] && <><span className="text-fuchsia-400/40 text-[9px]">({hands[3]?.length || 0})</span>
                <div className="flex flex-col gap-0.5">{Array.from({ length: Math.min(hands[3]?.length || 0, 8) }).map((_, i) => <FaceDownTile key={i} size="sm" />)}</div>
                {getTopDiscard(3) && <div className="mt-1"><TileView tile={getTopDiscard(3)!} size="sm" isJoker={isJokerTile(getTopDiscard(3)!)} /></div>}</>}
              </div>

              {/* Center */}
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="flex items-center gap-4">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => handleDraw('pile')} disabled={!isMyCurrentTurn || phase !== 'draw' || isSpectator}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      isMyCurrentTurn && phase === 'draw' && !isSpectator ? 'border-cyan-400/60 bg-cyan-500/10 cursor-pointer hover:bg-cyan-500/20' : 'border-amber-900/30 bg-amber-950/20 opacity-50 cursor-not-allowed'}`}>
                    <div className="relative">
                      <div className="w-10 h-14 rounded-lg bg-gradient-to-b from-purple-700 to-purple-950 border-2 border-purple-500/50 shadow-lg flex items-center justify-center">
                        <span className="text-purple-300/60 text-xs font-bold">{pile.length}</span>
                      </div>
                      <div className="absolute -top-0.5 -left-0.5 w-10 h-14 rounded-lg bg-purple-800/30 border border-purple-600/20 -z-10" />
                    </div>
                    <span className="text-[9px] text-cyan-300/70 font-medium">Yığın</span>
                  </motion.button>

                  {indicator && <div className="flex flex-col items-center gap-1"><TileView tile={indicator} size="lg" isJoker={isJokerTile(indicator)} /><span className="text-[8px] text-amber-400/50">Gösterge</span></div>}

                  {prevSeatDiscard ? (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => handleDraw('discard')} disabled={!isMyCurrentTurn || phase !== 'draw' || isSpectator}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                        isMyCurrentTurn && phase === 'draw' && !isSpectator ? 'border-green-400/60 bg-green-500/10 cursor-pointer hover:bg-green-500/20' : 'border-amber-900/30 bg-amber-950/20 opacity-50 cursor-not-allowed'}`}>
                      <TileView tile={prevSeatDiscard} size="lg" isJoker={isJokerTile(prevSeatDiscard)} />
                      <span className="text-[9px] text-green-300/70 font-medium">Yerden Al</span>
                    </motion.button>
                  ) : (
                    <div className="w-14 h-20 rounded-xl border-2 border-dashed border-amber-900/20 flex items-center justify-center"><span className="text-amber-700/30 text-[8px]">Atık</span></div>
                  )}
                </div>

                <div className={`text-xs font-bold px-3 py-1 rounded-full ${isMyCurrentTurn ? 'bg-cyan-500/20 text-cyan-300 animate-pulse' : 'bg-fuchsia-500/10 text-fuchsia-400/60'}`}>
                  {winner !== null && !state?.showingRoundResult ? <span className="text-yellow-400">🏆 {winner === mySeat ? 'Kazandın!' : `${SEAT_NAMES[winner]} kazandı!`}</span>
                    : <span>{isMyCurrentTurn ? `Sen - ${phase === 'draw' ? 'Taş Çek' : 'Taş At'}` : `${SEAT_NAMES[currentSeat]} düşünüyor...`}</span>}
                </div>
              </div>

              {/* East (seat 1) */}
              <div className="flex flex-col items-center gap-1 min-w-[40px]">
                <span className={`text-[10px] font-bold ${SEAT_COLORS[1]} ${eliminated[1] ? 'opacity-30 line-through' : currentSeat === 1 ? 'animate-pulse' : 'opacity-60'}`}>{SEAT_NAMES[1]}</span>
                {!eliminated[1] && <><span className="text-fuchsia-400/40 text-[9px]">({hands[1]?.length || 0})</span>
                <div className="flex flex-col gap-0.5">{Array.from({ length: Math.min(hands[1]?.length || 0, 8) }).map((_, i) => <FaceDownTile key={i} size="sm" />)}</div>
                {getTopDiscard(1) && <div className="mt-1"><TileView tile={getTopDiscard(1)!} size="sm" isJoker={isJokerTile(getTopDiscard(1)!)} /></div>}</>}
              </div>
            </div>

            {/* Player discards */}
            {getTopDiscard(mySeat) && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="text-amber-500/40 text-[8px]">Senin attıkların:</span>
                <div className="flex gap-0.5 overflow-x-auto max-w-[200px]">
                  {discards[mySeat].slice(-5).map((t: OkeyTile) => <TileView key={t.id} tile={t} size="sm" isJoker={isJokerTile(t)} />)}
                </div>
              </div>
            )}

            {/* Player hand */}
            <div className="mt-3">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className={`text-[10px] font-bold ${SEAT_COLORS[mySeat]} ${isMyCurrentTurn ? 'animate-pulse' : 'opacity-60'}`}>{SEAT_NAMES[mySeat]} ({myHand.length} taş)</span>
                {canWin && phase === 'discard' && (
                  <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                    className="text-[10px] text-green-400 font-bold bg-green-500/20 px-2 py-0.5 rounded-full">✨ Kazanabilirsin!</motion.span>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5 min-h-[56px]">
                <AnimatePresence>
                  {myHand.map((tile: OkeyTile) => (
                    <TileView key={tile.id} tile={tile} size="md" selected={selectedTile === tile.id}
                      onClick={() => handleTileClick(tile.id)} isJoker={isJokerTile(tile)}
                      glow={canWin && phase === 'discard' && selectedTile === tile.id} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-full">{message}</motion.div>
            )}
          </AnimatePresence>

          {isMyCurrentTurn && !isSpectator && room.status === 'active' && !winner && !gameOver && (
            <div className="text-center text-[10px] text-fuchsia-400/50">
              {phase === 'draw' ? <span>Yığından veya yerden taş çek</span>
                : <span>{selectedTile !== null ? 'Tekrar tıkla → at | Başka taşa tıkla → değiştir' : 'Atmak istediğin taşa tıkla'}</span>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
