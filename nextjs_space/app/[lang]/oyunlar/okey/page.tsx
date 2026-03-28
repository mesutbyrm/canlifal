'use client'

import GameShell from '@/components/game-shell'
import { playDiceSound } from '@/components/dice-3d'
import { motion, AnimatePresence } from 'framer-motion'
import { okeyDraw, okeyDiscard, okeyCheckWin, okeyAIMove, okeyInit, OkeyTile } from '@/lib/game-logic'
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

// Stats helper
function getOkeyStats() {
  try { return JSON.parse(localStorage.getItem('okey_stats') || '{"wins":0,"losses":0,"streak":0,"bestStreak":0,"gamesPlayed":0}') }
  catch { return { wins: 0, losses: 0, streak: 0, bestStreak: 0, gamesPlayed: 0 } }
}
function saveOkeyStats(s: any) { try { localStorage.setItem('okey_stats', JSON.stringify(s)) } catch {} }

export default function OkeyPage() {
  return (
    <GameShell
      gameType="okey"
      gameName="Okey"
      gameEmoji="🀄"
      gameDesc="Klasik Türk Okey oyunu! 4 kişilik, 106 taş, strateji ve şans."
      supportsAI={true}
    >
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState, soundEnabled }) => (
        <OkeyBoard room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator} sendAIState={sendAIState} soundEnabled={soundEnabled} />
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

function StatsBar() {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => { setStats(getOkeyStats()) }, [])
  if (!stats || stats.gamesPlayed === 0) return null
  return (
    <div className="flex items-center gap-3 text-[10px] px-3 py-1.5 bg-purple-900/30 border border-purple-700/30 rounded-full">
      <span className="text-green-400">✅ {stats.wins}W</span>
      <span className="text-red-400">❌ {stats.losses}L</span>
      <span className="text-amber-400">🔥 Seri: {stats.streak}</span>
      <span className="text-fuchsia-400">🏆 En İyi: {stats.bestStreak}</span>
      <span className="text-cyan-400/60">{stats.gamesPlayed} oyun</span>
    </div>
  )
}

function OkeyBoard({ room, state, isMyTurn, isSpectator, sendAIState, soundEnabled }: any) {
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<string>('medium')
  const [diffSet, setDiffSet] = useState(false)
  const aiRef = useRef<any>(null)
  const lastSeatRef = useRef<number>(-1)
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
  const stateDiff: string = state?.difficulty || 'medium'

  const myHand = hands[0] || []
  const canWin = myHand.length === 14 && okeyCheckWin(myHand, jokerColor, jokerNumber)

  const isJokerTile = useCallback((t: OkeyTile) => {
    return !!t.isFalseJoker || (t.color === jokerColor && t.number === jokerNumber)
  }, [jokerColor, jokerNumber])

  // Set difficulty on first state
  useEffect(() => {
    if (state && !diffSet && room?.status === 'active' && !state.difficulty) {
      const ns = { ...state, difficulty }
      sendAIState({ state: ns, currentTurn: ns.currentSeat === 0 ? 1 : 2, status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
      setDiffSet(true)
    }
  }, [state, room])

  // Update stats on game end
  useEffect(() => {
    if ((winner !== null || gameOver) && !statsUpdatedRef.current && !isSpectator) {
      statsUpdatedRef.current = true
      const stats = getOkeyStats()
      stats.gamesPlayed++
      if (winner === 0) {
        stats.wins++; stats.streak++
        if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak
      } else {
        stats.losses++; stats.streak = 0
      }
      saveOkeyStats(stats)
    }
  }, [winner, gameOver])

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(null), 2000) }

  useEffect(() => {
    if (currentSeat !== lastSeatRef.current) {
      setSelectedTile(null); lastSeatRef.current = currentSeat
      if (currentSeat === 0 && !isSpectator && room.status === 'active' && !winner) showMsg('Sıra sende!')
    }
  }, [currentSeat])

  // AI logic
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || winner || gameOver) return
    if (currentSeat === 0) return
    if (aiRef.current) clearTimeout(aiRef.current)
    aiRef.current = setTimeout(async () => {
      let cs = JSON.parse(JSON.stringify(state))
      let seat = cs.currentSeat; let moves = 0
      while (seat !== 0 && moves < 12 && !cs.gameOver && !cs.winner) {
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
      for (let s = 1; s <= 3; s++) {
        if (cs.hands[s] && cs.hands[s].length === 14 && okeyCheckWin(cs.hands[s], cs.jokerColor, cs.jokerNumber)) {
          cs.winner = s; cs.gameOver = true; break
        }
      }
      await sendAIState({
        state: cs, player1Score: cs.winner === 0 ? 1 : 0, player2Score: cs.winner && cs.winner > 0 ? 1 : 0,
        currentTurn: cs.currentSeat === 0 ? 1 : 2, status: cs.gameOver ? 'completed' : 'active',
        winnerId: cs.winner === 0 ? room.player1Id : cs.winner ? room.player2Id : null,
      })
    }, 800)
    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state, currentSeat])

  const handleDraw = async (source: 'pile' | 'discard') => {
    if (currentSeat !== 0 || phase !== 'draw' || isSpectator || room.status !== 'active') return
    const result = okeyDraw(state, 0, source)
    if (result.error) { showMsg(result.error); return }
    if (soundEnabled) playTileSound()
    await sendAIState({ state: result.state, currentTurn: 1, status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
  }

  const handleDiscard = async (tileId: number) => {
    if (currentSeat !== 0 || phase !== 'discard' || isSpectator || room.status !== 'active') return
    const result = okeyDiscard(state, 0, tileId)
    if (result.error) { showMsg(result.error); return }
    if (soundEnabled) playTileSound()
    const newHand = result.state.hands[0]
    let isWin = false
    if (newHand.length === 14 && okeyCheckWin(newHand, jokerColor, jokerNumber)) {
      result.state.winner = 0; result.state.gameOver = true; isWin = true
      if (soundEnabled) playWinSound()
    }
    await sendAIState({
      state: result.state, currentTurn: result.state.currentSeat === 0 ? 1 : 2,
      status: isWin || result.state.gameOver ? 'completed' : 'active',
      player1Score: isWin ? 1 : room.player1Score, player2Score: room.player2Score,
      winnerId: isWin ? room.player1Id : null,
    })
    setSelectedTile(null)
  }

  const handleTileClick = (tileId: number) => {
    if (currentSeat !== 0 || isSpectator || room.status !== 'active') return
    if (phase === 'discard') {
      if (selectedTile === tileId) handleDiscard(tileId)
      else setSelectedTile(tileId)
    }
  }

  const getTopDiscard = (seat: number): OkeyTile | null => {
    const d = discards[seat]; return d && d.length > 0 ? d[d.length - 1] : null
  }
  const prevSeatDiscard = getTopDiscard(3)

  // Difficulty selector (only at start before first move)
  const showDiffSelector = room?.status === 'active' && !diffSet && currentSeat === 0 && pile.length > 90

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xl mx-auto">
      {/* Stats */}
      <StatsBar />

      {/* Difficulty selector overlay */}
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

      {/* Difficulty badge */}
      {diffSet && (
        <div className={`text-[10px] ${DIFF_LABELS[stateDiff]?.color || 'text-amber-400'} opacity-60`}>
          {DIFF_LABELS[stateDiff]?.emoji} {DIFF_LABELS[stateDiff]?.label} Zorluk
        </div>
      )}

      {/* Game info */}
      <div className="flex items-center justify-between w-full text-xs px-1">
        <div className="flex items-center gap-2">
          {indicator && (
            <div className="flex items-center gap-1">
              <span className="text-amber-400/70 text-[10px]">Gösterge:</span>
              <TileView tile={indicator} size="sm" />
            </div>
          )}
          <span className="text-fuchsia-400/60">Okey: <span className="text-yellow-300 font-bold">
            {indicator?.isFalseJoker ? '★' : `${COLORS[jokerColor]?.name} ${jokerNumber}`}
          </span></span>
        </div>
        <span className="text-fuchsia-400/50">Kalan: {pile.length} taş</span>
      </div>

      {/* Table */}
      <div className="relative w-full bg-gradient-to-br from-[#1a0e06] via-[#2a1810] to-[#1a0e06] border-[3px] border-amber-900/70 rounded-2xl shadow-[inset_0_2px_15px_rgba(0,0,0,0.6),0_4px_20px_rgba(0,0,0,0.5)] p-3 sm:p-4" style={{ minHeight: 380 }}>

        {/* North (seat 2) */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <span className={`text-[10px] font-bold ${SEAT_COLORS[2]} ${currentSeat === 2 ? 'animate-pulse' : 'opacity-60'}`}>{SEAT_NAMES[2]} ({hands[2]?.length || 0})</span>
          <div className="flex gap-0.5">{Array.from({ length: Math.min(hands[2]?.length || 0, 15) }).map((_, i) => <FaceDownTile key={i} size="sm" />)}</div>
          {getTopDiscard(2) && <div className="flex items-center gap-1 mt-0.5"><span className="text-amber-500/40 text-[8px]">attı:</span><TileView tile={getTopDiscard(2)!} size="sm" isJoker={isJokerTile(getTopDiscard(2)!)} /></div>}
        </div>

        {/* Middle: West | Center | East */}
        <div className="flex items-center justify-between gap-2">
          {/* West (seat 3) */}
          <div className="flex flex-col items-center gap-1 min-w-[40px]">
            <span className={`text-[10px] font-bold ${SEAT_COLORS[3]} ${currentSeat === 3 ? 'animate-pulse' : 'opacity-60'}`}>{SEAT_NAMES[3]}</span>
            <span className="text-fuchsia-400/40 text-[9px]">({hands[3]?.length || 0})</span>
            <div className="flex flex-col gap-0.5">{Array.from({ length: Math.min(hands[3]?.length || 0, 8) }).map((_, i) => <FaceDownTile key={i} size="sm" />)}</div>
            {getTopDiscard(3) && <div className="mt-1"><TileView tile={getTopDiscard(3)!} size="sm" isJoker={isJokerTile(getTopDiscard(3)!)} /></div>}
          </div>

          {/* Center */}
          <div className="flex flex-col items-center gap-3 flex-1">
            <div className="flex items-center gap-4">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => handleDraw('pile')} disabled={currentSeat !== 0 || phase !== 'draw' || isSpectator}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                  currentSeat === 0 && phase === 'draw' && !isSpectator ? 'border-cyan-400/60 bg-cyan-500/10 cursor-pointer hover:bg-cyan-500/20' : 'border-amber-900/30 bg-amber-950/20 opacity-50 cursor-not-allowed'}`}>
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
                  onClick={() => handleDraw('discard')} disabled={currentSeat !== 0 || phase !== 'draw' || isSpectator}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    currentSeat === 0 && phase === 'draw' && !isSpectator ? 'border-green-400/60 bg-green-500/10 cursor-pointer hover:bg-green-500/20' : 'border-amber-900/30 bg-amber-950/20 opacity-50 cursor-not-allowed'}`}>
                  <TileView tile={prevSeatDiscard} size="lg" isJoker={isJokerTile(prevSeatDiscard)} />
                  <span className="text-[9px] text-green-300/70 font-medium">Yerden Al</span>
                </motion.button>
              ) : (
                <div className="w-14 h-20 rounded-xl border-2 border-dashed border-amber-900/20 flex items-center justify-center"><span className="text-amber-700/30 text-[8px]">Atık</span></div>
              )}
            </div>

            <div className={`text-xs font-bold px-3 py-1 rounded-full ${currentSeat === 0 ? 'bg-cyan-500/20 text-cyan-300 animate-pulse' : 'bg-fuchsia-500/10 text-fuchsia-400/60'}`}>
              {winner !== null ? <span className="text-yellow-400">🏆 {SEAT_NAMES[winner]} kazandı!</span>
                : gameOver ? <span className="text-amber-400">Oyun bitti - Berabere</span>
                : <span>{SEAT_NAMES[currentSeat]}{currentSeat === 0 ? ' - ' + (phase === 'draw' ? 'Taş Çek' : 'Taş At') : ' düşünüyor...'}</span>}
            </div>
          </div>

          {/* East (seat 1) */}
          <div className="flex flex-col items-center gap-1 min-w-[40px]">
            <span className={`text-[10px] font-bold ${SEAT_COLORS[1]} ${currentSeat === 1 ? 'animate-pulse' : 'opacity-60'}`}>{SEAT_NAMES[1]}</span>
            <span className="text-fuchsia-400/40 text-[9px]">({hands[1]?.length || 0})</span>
            <div className="flex flex-col gap-0.5">{Array.from({ length: Math.min(hands[1]?.length || 0, 8) }).map((_, i) => <FaceDownTile key={i} size="sm" />)}</div>
            {getTopDiscard(1) && <div className="mt-1"><TileView tile={getTopDiscard(1)!} size="sm" isJoker={isJokerTile(getTopDiscard(1)!)} /></div>}
          </div>
        </div>

        {/* Player discards */}
        {getTopDiscard(0) && (
          <div className="flex items-center justify-center gap-1 mt-2">
            <span className="text-amber-500/40 text-[8px]">Senin attıkların:</span>
            <div className="flex gap-0.5 overflow-x-auto max-w-[200px]">
              {discards[0].slice(-5).map((t: OkeyTile) => <TileView key={t.id} tile={t} size="sm" isJoker={isJokerTile(t)} />)}
            </div>
          </div>
        )}

        {/* Player hand */}
        <div className="mt-3">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className={`text-[10px] font-bold ${SEAT_COLORS[0]} ${currentSeat === 0 ? 'animate-pulse' : 'opacity-60'}`}>{SEAT_NAMES[0]} ({myHand.length} taş)</span>
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

      {currentSeat === 0 && !isSpectator && room.status === 'active' && !winner && !gameOver && (
        <div className="text-center text-[10px] text-fuchsia-400/50">
          {phase === 'draw' ? <span>Yığından veya yerden taş çek</span>
            : <span>{selectedTile !== null ? 'Tekrar tıkla → at | Başka taşa tıkla → değiştir' : 'Atmak istediğin taşa tıkla'}</span>}
        </div>
      )}
    </div>
  )
}
