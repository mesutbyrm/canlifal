'use client'

import GameShell from '@/components/game-shell'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { okeyDraw, okeyDiscard, okeyCheckWin, okeyAIMove, OkeyTile } from '@/lib/game-logic'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

/* ────────────────── CONSTANTS ────────────────── */
const COLORS: Record<number, { bg: string; fg: string; border: string; name: string; accent: string; dark: string }> = {
  0: { bg: '#fee2e2', fg: '#dc2626', border: '#f87171', name: 'Kırmızı', accent: '#fca5a5', dark: '#991b1b' },
  1: { bg: '#dbeafe', fg: '#2563eb', border: '#60a5fa', name: 'Mavi', accent: '#93c5fd', dark: '#1e40af' },
  2: { bg: '#dcfce7', fg: '#16a34a', border: '#4ade80', name: 'Yeşil', accent: '#86efac', dark: '#166534' },
  3: { bg: '#f3f4f6', fg: '#1f2937', border: '#9ca3af', name: 'Siyah', accent: '#d1d5db', dark: '#374151' },
  4: { bg: '#fef3c7', fg: '#b45309', border: '#fbbf24', name: 'Joker', accent: '#fcd34d', dark: '#92400e' },
}

const SEAT_NAMES = ['Sen', 'Doğu 🤖', 'Kuzey 🤖', 'Batı 🤖']
const SEAT_COLORS_HEX = ['#22d3ee', '#f472b6', '#fbbf24', '#4ade80']
const DIFF_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  easy: { label: 'Kolay', color: '#4ade80', emoji: '🟢' },
  medium: { label: 'Orta', color: '#fbbf24', emoji: '🟡' },
  hard: { label: 'Zor', color: '#ef4444', emoji: '🔴' },
}

/* ────────────────── SOUNDS ────────────────── */
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

/* ────────────────── STATS ────────────────── */
function getOkeyStats() {
  try { return JSON.parse(localStorage.getItem('okey_stats') || '{"wins":0,"losses":0,"streak":0,"bestStreak":0,"gamesPlayed":0}') }
  catch { return { wins: 0, losses: 0, streak: 0, bestStreak: 0, gamesPlayed: 0 } }
}
function saveOkeyStats(s: any) { try { localStorage.setItem('okey_stats', JSON.stringify(s)) } catch {} }

/* ────────────────── GROUP DETECTION ────────────────── */
function detectGroups(hand: OkeyTile[], jokerColor: number, jokerNumber: number): { runs: number[][]; sets: number[][] } {
  const isJoker = (t: OkeyTile) => !!t.isFalseJoker || (t.color === jokerColor && t.number === jokerNumber)
  const runs: number[][] = []
  const sets: number[][] = []

  // Detect runs (same color, consecutive numbers) - only non-joker tiles
  const byColor: Record<number, OkeyTile[]> = {}
  hand.forEach(t => {
    if (!isJoker(t)) {
      if (!byColor[t.color]) byColor[t.color] = []
      byColor[t.color].push(t)
    }
  })
  for (const color in byColor) {
    const tiles = byColor[color].sort((a, b) => a.number - b.number)
    let run: number[] = [tiles[0].id]
    for (let i = 1; i < tiles.length; i++) {
      if (tiles[i].number === tiles[i - 1].number + 1) {
        run.push(tiles[i].id)
      } else if (tiles[i].number === tiles[i - 1].number) {
        // duplicate, skip
      } else {
        if (run.length >= 3) runs.push([...run])
        run = [tiles[i].id]
      }
    }
    if (run.length >= 3) runs.push([...run])
  }

  // Detect sets (same number, different colors)
  const byNumber: Record<number, OkeyTile[]> = {}
  hand.forEach(t => {
    if (!isJoker(t)) {
      if (!byNumber[t.number]) byNumber[t.number] = []
      byNumber[t.number].push(t)
    }
  })
  for (const num in byNumber) {
    const tiles = byNumber[num]
    const uniqueColors = new Set(tiles.map(t => t.color))
    if (uniqueColors.size >= 3) {
      // Take one per color
      const seen = new Set<number>()
      const set: number[] = []
      for (const t of tiles) {
        if (!seen.has(t.color)) { seen.add(t.color); set.push(t.id) }
      }
      if (set.length >= 3) sets.push(set)
    }
  }

  return { runs, sets }
}

/* ────────────────── 3D TILE COMPONENT ────────────────── */
function Tile3D({ tile, selected, onClick, isJoker, glow, small, groupColor }: {
  tile: OkeyTile; selected?: boolean; onClick?: () => void; isJoker?: boolean; glow?: boolean; small?: boolean; groupColor?: string
}) {
  const c = tile.isFalseJoker ? COLORS[4] : COLORS[tile.color] || COLORS[0]
  const w = small ? 28 : 40
  const h = small ? 40 : 56
  const fs = small ? 11 : 16

  return (
    <motion.div
      layout
      onClick={onClick}
      whileHover={onClick ? { y: -6, scale: 1.08 } : {}}
      whileTap={onClick ? { scale: 0.93 } : {}}
      className="relative cursor-pointer select-none flex-shrink-0"
      style={{ width: w, height: h }}
    >
      {/* Shadow layer */}
      <div className="absolute inset-0 rounded-lg" style={{
        background: 'rgba(0,0,0,0.35)',
        transform: 'translate(2px, 3px)',
        borderRadius: 8,
      }} />
      {/* Main tile body */}
      <div className="absolute inset-0 rounded-lg overflow-hidden" style={{
        background: `linear-gradient(145deg, ${c.bg}, ${c.accent})`,
        border: `2px solid ${selected ? '#facc15' : groupColor || c.border}`,
        borderRadius: 8,
        boxShadow: selected
          ? '0 0 12px rgba(250,204,21,0.6), inset 0 1px 2px rgba(255,255,255,0.6)'
          : glow
            ? '0 0 14px rgba(74,222,128,0.5), inset 0 1px 2px rgba(255,255,255,0.6)'
            : `inset 0 1px 2px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.2)`,
        transform: selected ? 'translateY(-8px)' : 'none',
        transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
      }}>
        {/* Top shine */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)',
          borderRadius: '8px 8px 0 0',
        }} />
        {/* Number */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: fs, color: c.fg,
          textShadow: '0 1px 1px rgba(255,255,255,0.5)',
        }}>
          {tile.isFalseJoker ? '★' : tile.number}
        </div>
        {/* Small color dots in corners */}
        {!tile.isFalseJoker && (
          <>
            <div style={{ position: 'absolute', top: 2, left: 3, fontSize: small ? 6 : 8, color: c.fg, fontWeight: 700, opacity: 0.5 }}>{tile.number}</div>
            <div style={{ position: 'absolute', bottom: 2, right: 3, fontSize: small ? 6 : 8, color: c.fg, fontWeight: 700, opacity: 0.5, transform: 'rotate(180deg)' }}>{tile.number}</div>
          </>
        )}
      </div>
      {/* Joker badge */}
      {isJoker && !tile.isFalseJoker && (
        <div style={{
          position: 'absolute', top: -4, right: -4, width: 16, height: 16,
          background: '#facc15', borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 900, color: '#78350f',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          zIndex: 10,
        }}>J</div>
      )}
      {/* Group highlight ring */}
      {groupColor && !selected && (
        <div className="absolute -inset-1 rounded-xl border-2 pointer-events-none" style={{ borderColor: groupColor, opacity: 0.5 }} />
      )}
    </motion.div>
  )
}

/* ────────────────── OPPONENT AVATAR ────────────────── */
function OpponentAvatar({ seat, tileCount, isCurrent, topDiscard, isJokerFn }: {
  seat: number; tileCount: number; isCurrent: boolean; topDiscard: OkeyTile | null; isJokerFn: (t: OkeyTile) => boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all ${
        isCurrent ? 'animate-pulse scale-110' : 'opacity-80'
      }`} style={{
        background: `linear-gradient(135deg, ${SEAT_COLORS_HEX[seat]}33, ${SEAT_COLORS_HEX[seat]}11)`,
        borderColor: isCurrent ? SEAT_COLORS_HEX[seat] : 'rgba(255,255,255,0.15)',
        boxShadow: isCurrent ? `0 0 16px ${SEAT_COLORS_HEX[seat]}66` : 'none',
      }}>
        🤖
        {/* Tile count badge */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{
          background: SEAT_COLORS_HEX[seat], color: '#0a0118'
        }}>{tileCount}</div>
      </div>
      <span className="text-[10px] font-semibold" style={{ color: SEAT_COLORS_HEX[seat] }}>{SEAT_NAMES[seat]}</span>
      {topDiscard && (
        <div className="flex items-center gap-0.5">
          <span className="text-[7px] text-amber-400/50">attı</span>
          <Tile3D tile={topDiscard} small isJoker={isJokerFn(topDiscard)} />
        </div>
      )}
    </div>
  )
}

/* ────────────────── LANDSCAPE PROMPT ────────────────── */
function LandscapePrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return
      const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 768
      setShow(isPortrait)
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])

  if (!show) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(10,1,24,0.98)', backdropFilter: 'blur(10px)', zIndex: 99999 }}
    >
      <div className="flex flex-col items-center gap-6 text-center px-8">
        <motion.div
          animate={{ rotate: [0, 90, 90, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-7xl"
        >
          📱
        </motion.div>
        <h2 className="text-2xl font-bold text-white">Ekranı Çevir</h2>
        <p className="text-fuchsia-300/80 text-sm max-w-[260px]">
          Okey oyunu yatay modda en iyi şekilde oynanır. Lütfen cihazınızı yatay konuma çevirin.
        </p>
        <motion.div
          animate={{ x: [-10, 10, -10] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-4xl"
        >
          ↔️
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ────────────────── RACK COMPONENT ────────────────── */
function TileRack({ tiles, selectedTile, onTileClick, isJokerFn, canWin, phase, groupedIds, onReorder }: {
  tiles: OkeyTile[]; selectedTile: number | null; onTileClick: (id: number) => void;
  isJokerFn: (t: OkeyTile) => boolean; canWin: boolean; phase: string;
  groupedIds: Map<number, string>; onReorder: (newOrder: OkeyTile[]) => void;
}) {
  return (
    <div className="w-full">
      {/* Rack frame */}
      <div className="relative mx-auto" style={{ maxWidth: '100%' }}>
        {/* Wood rack bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 18,
          background: 'linear-gradient(to bottom, #8B6914, #6B4F0F, #5C430D)',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1)',
        }} />
        {/* Wood rack lip */}
        <div style={{
          position: 'absolute', bottom: 14, left: 4, right: 4, height: 6,
          background: 'linear-gradient(to bottom, #A07D1C, #8B6914)',
          borderRadius: 2,
          boxShadow: '0 -1px 3px rgba(0,0,0,0.3)',
        }} />
        {/* Tiles container */}
        <Reorder.Group
          axis="x"
          values={tiles}
          onReorder={onReorder}
          className="flex flex-wrap justify-center gap-1 px-2 pb-6 pt-1 min-h-[70px]"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <AnimatePresence>
            {tiles.map((tile) => (
              <Reorder.Item key={tile.id} value={tile} className="flex-shrink-0" style={{ zIndex: selectedTile === tile.id ? 30 : 1 }}>
                <Tile3D
                  tile={tile}
                  selected={selectedTile === tile.id}
                  onClick={() => onTileClick(tile.id)}
                  isJoker={isJokerFn(tile)}
                  glow={canWin && phase === 'discard' && selectedTile === tile.id}
                  groupColor={groupedIds.get(tile.id)}
                />
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>
    </div>
  )
}

/* ────────────────── MAIN PAGE ────────────────── */
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

/* ────────────────── OKEY BOARD ────────────────── */
function OkeyBoard({ room, state, isMyTurn, isSpectator, sendAIState, soundEnabled }: any) {
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<string>('medium')
  const [diffSet, setDiffSet] = useState(false)
  const [localHand, setLocalHand] = useState<OkeyTile[] | null>(null)
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

  // Keep local hand in sync with server state, but allow local reordering
  const serverHand = hands[0] || []
  useEffect(() => {
    if (!localHand || serverHand.length !== localHand.length ||
        serverHand.some((t, i) => !localHand.find(lt => lt.id === t.id))) {
      setLocalHand([...serverHand])
    }
  }, [serverHand])

  const myHand = localHand || serverHand
  const canWin = myHand.length === 14 && okeyCheckWin(myHand, jokerColor, jokerNumber)

  const isJokerTile = useCallback((t: OkeyTile) => {
    return !!t.isFalseJoker || (t.color === jokerColor && t.number === jokerNumber)
  }, [jokerColor, jokerNumber])

  // Group detection for visual highlighting
  const groupedIds = useMemo(() => {
    const map = new Map<number, string>()
    if (myHand.length === 0) return map
    const { runs, sets } = detectGroups(myHand, jokerColor, jokerNumber)
    const groupColors = ['#f472b6', '#60a5fa', '#4ade80', '#a78bfa', '#fb923c', '#22d3ee', '#f87171']
    let ci = 0
    for (const run of runs) {
      const color = groupColors[ci % groupColors.length]; ci++
      for (const id of run) map.set(id, color)
    }
    for (const set of sets) {
      const color = groupColors[ci % groupColors.length]; ci++
      for (const id of set) if (!map.has(id)) map.set(id, color)
    }
    return map
  }, [myHand, jokerColor, jokerNumber])

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
      if (winner === 0) { stats.wins++; stats.streak++; if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak }
      else { stats.losses++; stats.streak = 0 }
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
    setLocalHand(null) // Reset local hand to sync with new state
    await sendAIState({ state: result.state, currentTurn: 1, status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
  }

  const handleDiscard = async (tileId: number) => {
    if (currentSeat !== 0 || phase !== 'discard' || isSpectator || room.status !== 'active') return
    const result = okeyDiscard(state, 0, tileId)
    if (result.error) { showMsg(result.error); return }
    if (soundEnabled) playTileSound()
    setLocalHand(null)
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

  const handleReorder = (newOrder: OkeyTile[]) => {
    setLocalHand(newOrder)
  }

  const getTopDiscard = (seat: number): OkeyTile | null => {
    const d = discards[seat]; return d && d.length > 0 ? d[d.length - 1] : null
  }
  const prevSeatDiscard = getTopDiscard(3)

  const showDiffSelector = room?.status === 'active' && !diffSet && currentSeat === 0 && pile.length > 90

  return (
    <>
      <LandscapePrompt />
      {/* Fullscreen game overlay */}
      <div className="fixed inset-0 flex flex-col" style={{
        background: 'linear-gradient(135deg, #0d1117, #1a0e2e, #0d1117)',
        zIndex: 9999,
      }}>
        {/* Top bar: Indicator + Game info + Opponents */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-purple-800/30" style={{ background: 'rgba(0,0,0,0.3)' }}>
          {/* Left: Indicator & joker info */}
          <div className="flex items-center gap-2">
            {indicator && <Tile3D tile={indicator} small isJoker={isJokerTile(indicator)} />}
            <div className="flex flex-col">
              <span className="text-[9px] text-amber-400/70">Okey</span>
              <span className="text-[10px] text-yellow-300 font-bold">
                {indicator?.isFalseJoker ? '★' : `${COLORS[jokerColor]?.name} ${jokerNumber}`}
              </span>
            </div>
            <div className="ml-2 text-[10px] text-fuchsia-400/50">Kalan: {pile.length}</div>
          </div>

          {/* Center: Turn indicator */}
          <div className="px-3 py-1 rounded-full text-xs font-bold" style={{
            background: currentSeat === 0 ? 'rgba(34,211,238,0.15)' : 'rgba(168,85,247,0.1)',
            color: currentSeat === 0 ? '#22d3ee' : '#c084fc',
            border: `1px solid ${currentSeat === 0 ? 'rgba(34,211,238,0.3)' : 'rgba(168,85,247,0.2)'}`,
          }}>
            {winner !== null ? <span style={{ color: '#facc15' }}>🏆 {SEAT_NAMES[winner]} kazandı!</span>
              : gameOver ? <span style={{ color: '#fbbf24' }}>Oyun bitti - Berabere</span>
              : <span>{SEAT_NAMES[currentSeat]}{currentSeat === 0 ? ` - ${phase === 'draw' ? 'Taş Çek' : 'Taş At'}` : ' düşünüyor...'}</span>}
          </div>

          {/* Right: Stats */}
          <StatsBar />
        </div>

        {/* Difficulty selector */}
        <AnimatePresence>
          {showDiffSelector && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="flex items-center justify-center gap-2 py-2 text-xs" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <span className="text-fuchsia-300/80">Zorluk:</span>
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <button key={d} onClick={() => { setDifficulty(d); setDiffSet(true);
                  const ns = { ...state, difficulty: d }
                  sendAIState({ state: ns, currentTurn: 1, status: 'active', player1Score: 0, player2Score: 0, winnerId: null })
                }}
                  className="px-3 py-1 rounded-lg border transition-all text-xs font-bold"
                  style={{
                    borderColor: difficulty === d ? '#22d3ee' : 'rgba(139,92,246,0.3)',
                    background: difficulty === d ? 'rgba(34,211,238,0.15)' : 'rgba(139,92,246,0.1)',
                    color: difficulty === d ? '#22d3ee' : 'rgba(196,181,253,0.5)',
                  }}>
                  {DIFF_LABELS[d].emoji} {DIFF_LABELS[d].label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main game area */}
        <div className="flex-1 flex flex-col items-center justify-center px-3 py-2 overflow-hidden">
          {/* Game table */}
          <div className="relative w-full max-w-3xl flex-1 flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {/* Opponents row */}
            <div className="flex items-start justify-around px-4 py-2">
              <OpponentAvatar seat={3} tileCount={hands[3]?.length || 0} isCurrent={currentSeat === 3} topDiscard={getTopDiscard(3)} isJokerFn={isJokerTile} />
              <OpponentAvatar seat={2} tileCount={hands[2]?.length || 0} isCurrent={currentSeat === 2} topDiscard={getTopDiscard(2)} isJokerFn={isJokerTile} />
              <OpponentAvatar seat={1} tileCount={hands[1]?.length || 0} isCurrent={currentSeat === 1} topDiscard={getTopDiscard(1)} isJokerFn={isJokerTile} />
            </div>

            {/* Center: Draw pile + Discard */}
            <div className="flex items-center justify-center gap-6 py-3">
              {/* Draw from pile */}
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => handleDraw('pile')} disabled={currentSeat !== 0 || phase !== 'draw' || isSpectator}
                className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all"
                style={{
                  borderColor: currentSeat === 0 && phase === 'draw' && !isSpectator ? 'rgba(34,211,238,0.5)' : 'rgba(139,92,246,0.2)',
                  background: currentSeat === 0 && phase === 'draw' && !isSpectator ? 'rgba(34,211,238,0.08)' : 'rgba(139,92,246,0.05)',
                  opacity: currentSeat === 0 && phase === 'draw' && !isSpectator ? 1 : 0.4,
                  cursor: currentSeat === 0 && phase === 'draw' && !isSpectator ? 'pointer' : 'not-allowed',
                }}>
                <div className="relative">
                  <div className="w-10 h-14 rounded-lg flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #6b21a8, #3b0764)',
                    border: '2px solid rgba(139,92,246,0.5)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.1)',
                  }}>
                    <span className="text-purple-300/60 text-xs font-bold">{pile.length}</span>
                  </div>
                  <div className="absolute -top-0.5 -left-0.5 w-10 h-14 rounded-lg -z-10" style={{
                    background: 'rgba(107,33,168,0.3)', border: '1px solid rgba(139,92,246,0.15)'
                  }} />
                </div>
                <span className="text-[9px] font-medium" style={{ color: 'rgba(34,211,238,0.7)' }}>Yığın</span>
              </motion.button>

              {/* Indicator */}
              {indicator && (
                <div className="flex flex-col items-center gap-1">
                  <Tile3D tile={indicator} isJoker={isJokerTile(indicator)} />
                  <span className="text-[8px] text-amber-400/50">Gösterge</span>
                </div>
              )}

              {/* Draw from discard */}
              {prevSeatDiscard ? (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => handleDraw('discard')} disabled={currentSeat !== 0 || phase !== 'draw' || isSpectator}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: currentSeat === 0 && phase === 'draw' && !isSpectator ? 'rgba(74,222,128,0.5)' : 'rgba(139,92,246,0.2)',
                    background: currentSeat === 0 && phase === 'draw' && !isSpectator ? 'rgba(74,222,128,0.08)' : 'rgba(139,92,246,0.05)',
                    opacity: currentSeat === 0 && phase === 'draw' && !isSpectator ? 1 : 0.4,
                    cursor: currentSeat === 0 && phase === 'draw' && !isSpectator ? 'pointer' : 'not-allowed',
                  }}>
                  <Tile3D tile={prevSeatDiscard} isJoker={isJokerTile(prevSeatDiscard)} />
                  <span className="text-[9px] font-medium" style={{ color: 'rgba(74,222,128,0.7)' }}>Yerden Al</span>
                </motion.button>
              ) : (
                <div className="w-14 h-20 rounded-xl flex items-center justify-center" style={{
                  border: '2px dashed rgba(139,92,246,0.15)'
                }}>
                  <span className="text-[8px]" style={{ color: 'rgba(139,92,246,0.25)' }}>Atık</span>
                </div>
              )}
            </div>

            {/* Player discards */}
            {getTopDiscard(0) && (
              <div className="flex items-center justify-center gap-1 py-1">
                <span className="text-[8px] text-amber-500/40">Attıkların:</span>
                <div className="flex gap-0.5 overflow-x-auto" style={{ maxWidth: 220 }}>
                  {discards[0].slice(-5).map((t: OkeyTile) => (
                    <Tile3D key={t.id} tile={t} small isJoker={isJokerTile(t)} />
                  ))}
                </div>
              </div>
            )}

            {/* Hints */}
            {currentSeat === 0 && !isSpectator && room.status === 'active' && !winner && !gameOver && (
              <div className="text-center text-[10px] py-1" style={{ color: 'rgba(196,181,253,0.4)' }}>
                {phase === 'draw' ? 'Yığından veya yerden taş çek'
                  : selectedTile !== null ? 'Tekrar tıkla → at | Başka taşa tıkla → değiştir' : 'Atmak istediğin taşa tıkla'}
              </div>
            )}

            {canWin && phase === 'discard' && (
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                className="text-center text-xs font-bold py-1 rounded-full mx-auto px-4"
                style={{ color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
                ✨ Kazanabilirsin!
              </motion.div>
            )}
          </div>
        </div>

        {/* Bottom: Player rack */}
        <div className="border-t border-purple-800/30 px-2 pb-2 pt-1" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-[10px] font-bold" style={{
              color: SEAT_COLORS_HEX[0],
              opacity: currentSeat === 0 ? 1 : 0.5,
            }}>
              {currentSeat === 0 && <span className="animate-pulse">● </span>}
              {SEAT_NAMES[0]} ({myHand.length} taş)
            </span>
            {diffSet && (
              <span className="text-[9px]" style={{ color: DIFF_LABELS[stateDiff]?.color, opacity: 0.6 }}>
                {DIFF_LABELS[stateDiff]?.emoji} {DIFF_LABELS[stateDiff]?.label}
              </span>
            )}
          </div>
          <TileRack
            tiles={myHand}
            selectedTile={selectedTile}
            onTileClick={handleTileClick}
            isJokerFn={isJokerTile}
            canWin={canWin}
            phase={phase}
            groupedIds={groupedIds}
            onReorder={handleReorder}
          />
        </div>

        {/* Toast message */}
        <AnimatePresence>
          {message && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-32 left-1/2 -translate-x-1/2 text-xs px-4 py-2 rounded-full"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d', zIndex: 99998 }}>
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

/* ────────────────── STATS BAR ────────────────── */
function StatsBar() {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => { setStats(getOkeyStats()) }, [])
  if (!stats || stats.gamesPlayed === 0) return null
  return (
    <div className="flex items-center gap-2 text-[9px] px-2 py-1 rounded-full" style={{
      background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)'
    }}>
      <span style={{ color: '#4ade80' }}>✅{stats.wins}</span>
      <span style={{ color: '#f87171' }}>❌{stats.losses}</span>
      <span style={{ color: '#fbbf24' }}>🔥{stats.streak}</span>
    </div>
  )
}
