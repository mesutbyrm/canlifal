'use client'

import GameShell from '@/components/game-shell'
import { motion, AnimatePresence } from 'framer-motion'
import {
  okeyDraw, okeyDiscard, okeyCheckWin, okeyAIMove,
  okey101CalcPenalty, okey101NewRound, OkeyTile,
  okey101LayMeld, okey101AddToMeld, okey101AILayMelds, okey101AIAddToMelds,
  Meld,
} from '@/lib/game-logic'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

// Portal for fullscreen rendering
function Portal({ children }: { children: React.ReactNode }): JSX.Element | null {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  const portal: any = createPortal(children as any, document.body)
  return portal
}

const TILE_COLORS: Record<number, { bg: string; fg: string; border: string; name: string }> = {
  0: { bg: '#fee2e2', fg: '#dc2626', border: '#f87171', name: 'Kırmızı' },
  1: { bg: '#dbeafe', fg: '#2563eb', border: '#60a5fa', name: 'Mavi' },
  2: { bg: '#dcfce7', fg: '#16a34a', border: '#4ade80', name: 'Yeşil' },
  3: { bg: '#f3f4f6', fg: '#1f2937', border: '#9ca3af', name: 'Siyah' },
  4: { bg: '#fef3c7', fg: '#b45309', border: '#fbbf24', name: 'Joker' },
}

const SEAT_NAMES = ['Sen', 'Doğu 🤖', 'Kuzey 🤖', 'Batı 🤖']
const SEAT_COLORS = ['#22d3ee', '#f472b6', '#fbbf24', '#4ade80']
const DIFF_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  easy: { label: 'Kolay', color: '#4ade80', emoji: '🟢' },
  medium: { label: 'Orta', color: '#fbbf24', emoji: '🟡' },
  hard: { label: 'Zor', color: '#f87171', emoji: '🔴' },
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
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [523, 659, 784, 1047].forEach((freq, i) => {
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

/* ══════════════ LANDSCAPE PROMPT ══════════════ */
function LandscapePrompt() {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return
      setShow(window.innerHeight > window.innerWidth && window.innerWidth < 768)
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => { window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check) }
  }, [])
  if (!show || !mounted) return null
  return (
    <Portal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(10,1,24,0.98)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="flex flex-col items-center gap-6 text-center px-8">
          <motion.div animate={{ rotate: [0, 90, 90, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} className="text-7xl">📱</motion.div>
          <h2 className="text-2xl font-bold text-white">Ekranı Çevir</h2>
          <p className="text-fuchsia-300/80 text-sm max-w-[260px]">101 Okey yatay modda en iyi şekilde oynanır. Lütfen cihazınızı yatay konuma çevirin.</p>
          <motion.div animate={{ x: [-10, 10, -10] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-4xl">↔️</motion.div>
        </div>
      </div>
    </Portal>
  )
}

/* ══════════════ TILE COMPONENT ══════════════ */
function Tile({ tile, selected, onClick, size = 'md', isJoker, glow, dimmed }: {
  tile: OkeyTile; selected?: boolean; onClick?: () => void; size?: 'sm' | 'md' | 'lg' | 'xs'; isJoker?: boolean; glow?: boolean; dimmed?: boolean
}) {
  const c = tile.isFalseJoker ? TILE_COLORS[4] : TILE_COLORS[tile.color] || TILE_COLORS[0]
  const dims = size === 'xs' ? { w: 20, h: 28, fs: 8 } : size === 'sm' ? { w: 26, h: 36, fs: 10 } : size === 'lg' ? { w: 40, h: 56, fs: 16 } : { w: 32, h: 46, fs: 13 }
  return (
    <motion.div layout onClick={onClick}
      whileHover={onClick ? { y: -3, scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      style={{
        width: dims.w, height: dims.h, borderRadius: 6,
        background: c.bg, border: `2px solid ${c.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default', position: 'relative',
        userSelect: 'none', flexShrink: 0,
        boxShadow: selected ? `0 0 0 2px #facc15, 0 -8px 0 0 rgba(0,0,0,0)` : glow ? '0 0 12px rgba(74,222,128,0.5)' : '0 2px 4px rgba(0,0,0,0.2)',
        transform: selected ? 'translateY(-8px)' : undefined,
        opacity: dimmed ? 0.4 : 1,
        zIndex: selected ? 20 : 1,
      }}
    >
      {tile.isFalseJoker
        ? <span style={{ fontSize: dims.fs, color: c.fg, fontWeight: 700 }}>★</span>
        : <span style={{ fontSize: dims.fs, color: c.fg, fontWeight: 700 }}>{tile.number}</span>}
      {isJoker && !tile.isFalseJoker && (
        <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 7, background: '#facc15', color: '#78350f', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>J</span>
      )}
    </motion.div>
  )
}

function FaceDownTile({ size = 'sm' }: { size?: 'sm' | 'xs' }) {
  const d = size === 'xs' ? { w: 16, h: 24 } : { w: 22, h: 32 }
  return (
    <div style={{ width: d.w, height: d.h, borderRadius: 4, background: 'linear-gradient(180deg, #6b21a8, #3b0764)', border: '1px solid rgba(147,51,234,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(168,85,247,0.3)' }} />
    </div>
  )
}

/* ══════════════ MELD DISPLAY ══════════════ */
function MeldGroup({ meld, isJokerFn, onTileClick, highlightMeld }: {
  meld: Meld; isJokerFn: (t: OkeyTile) => boolean; onTileClick?: (tileId: number) => void; highlightMeld?: boolean
}) {
  return (
    <div style={{
      display: 'flex', gap: 2, padding: '3px 5px', borderRadius: 6,
      background: highlightMeld ? 'rgba(250,204,21,0.15)' : 'rgba(88,28,135,0.3)',
      border: highlightMeld ? '1px solid rgba(250,204,21,0.4)' : '1px solid rgba(147,51,234,0.25)',
    }}>
      {meld.tiles.map((t) => (
        <Tile key={t.id} tile={t} size="xs" isJoker={isJokerFn(t)} onClick={onTileClick ? () => onTileClick(t.id) : undefined} />
      ))}
    </div>
  )
}

export default function Okey101Page() {
  return (
    <GameShell gameType="okey101" gameName="101 Okey" gameEmoji="💯"
      gameDesc="Çok rauntlu 101 Okey! İlk 101 puana ulaşan elenir." supportsAI={true}>
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState, soundEnabled }) => (
        <Okey101Board room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator}
          sendAIState={sendAIState} soundEnabled={soundEnabled} playerNum={playerNum} />
      )}
    </GameShell>
  )
}

function Okey101Board({ room, state, isMyTurn, isSpectator, sendAIState, soundEnabled, playerNum }: any) {
  const mySeat: number = room?.isAI ? 0 : (playerNum === 2 ? 1 : 0)

  const [selectedTiles, setSelectedTiles] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState<string | null>(null)
  const [showRoundEnd, setShowRoundEnd] = useState(false)
  const [difficulty, setDifficulty] = useState<string>('medium')
  const [diffSet, setDiffSet] = useState(false)
  const [addToMeldIdx, setAddToMeldIdx] = useState<number | null>(null) // which meld we're adding tiles to
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
  const melds: Meld[] = state?.melds || []
  const hasOpened: boolean[] = state?.hasOpened || [false, false, false, false]

  const seatToTurn = (seat: number) => seat === 0 ? 1 : 2
  const isMyCurrentTurn = currentSeat === mySeat
  const opponentSeats = [0, 1, 2, 3].filter(s => s !== mySeat)
  const myHand = hands[mySeat] || []
  const myOpened = hasOpened[mySeat]

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
      setSelectedTiles(new Set()); setAddToMeldIdx(null)
      lastSeatRef.current = currentSeat
      if (isMyCurrentTurn && !isSpectator && room.status === 'active' && !winner) showMsg('Sıra sende!')
    }
  }, [currentSeat])

  // Process round end
  const processRoundEnd = async (cs: any, roundWinner: number) => {
    const newScores = [...(cs.scores || [0, 0, 0, 0])]
    const roundPenalties = [0, 0, 0, 0]
    const jc = cs.jokerColor; const jn = cs.jokerNumber
    for (let s = 0; s < 4; s++) {
      if (s === roundWinner) continue
      if (cs.eliminated?.[s]) continue
      // In 101, penalty is sum of tiles remaining in hand
      // tiles on table melds don't count as penalty
      roundPenalties[s] = okey101CalcPenalty(cs.hands[s] || [], jc, jn)
    }
    const newEliminated = [...(cs.eliminated || [false, false, false, false])]
    for (let s = 0; s < 4; s++) {
      if (newScores[s] + roundPenalties[s] >= 101) newEliminated[s] = true
      newScores[s] += roundPenalties[s]
    }
    const activePlayers = newEliminated.filter((e: boolean) => !e).length
    const roundHistory = [...(cs.roundHistory || []), { round: cs.round, winner: roundWinner, penalties: roundPenalties }]
    if (activePlayers <= 1) {
      const gameWinner = newEliminated.findIndex((e: boolean) => !e)
      const finalState = { ...cs, scores: newScores, eliminated: newEliminated, roundHistory, gameOver: true,
        winner: gameWinner >= 0 ? gameWinner : roundWinner, roundWinner }
      if (!statsUpdatedRef.current && !isSpectator) {
        statsUpdatedRef.current = true
        const stats = get101Stats(); stats.gamesPlayed++
        if (gameWinner === mySeat) stats.wins++; else stats.losses++
        save101Stats(stats)
      }
      const myWin = gameWinner === mySeat
      await sendAIState({
        state: finalState, player1Score: myWin && playerNum === 1 ? 1 : (!myWin && playerNum !== 1 ? 1 : 0),
        player2Score: myWin && playerNum === 2 ? 1 : (!myWin && playerNum !== 2 ? 1 : 0),
        currentTurn: 1, status: 'completed',
        winnerId: myWin ? (playerNum === 1 ? room.player1Id : room.player2Id) : (playerNum === 1 ? room.player2Id : room.player1Id),
      })
    } else {
      const interimState = { ...cs, scores: newScores, eliminated: newEliminated, roundHistory,
        gameOver: false, winner: null, roundWinner, showingRoundResult: true }
      setShowRoundEnd(true)
      await sendAIState({
        state: interimState, currentTurn: 1, status: 'active',
        player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null,
      })
    }
  }

  const startNextRound = async () => {
    setShowRoundEnd(false)
    const newState = okey101NewRound(state)
    await sendAIState({
      state: newState, currentTurn: seatToTurn(newState.currentSeat), status: 'active',
      player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null,
    })
  }

  // Check if player hand is empty → round win
  const checkHandEmpty = async (cs: any, seat: number) => {
    if (cs.hands[seat] && cs.hands[seat].length === 0) {
      if (soundEnabled && seat === mySeat) playWinSound()
      await processRoundEnd(cs, seat)
      return true
    }
    return false
  }

  // AI logic with melds
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || gameOver) return
    if (state?.showingRoundResult) return
    if (winner !== null && winner !== undefined) return
    if (currentSeat === mySeat) return
    if (aiRef.current) clearTimeout(aiRef.current)
    aiRef.current = setTimeout(async () => {
      let cs = JSON.parse(JSON.stringify(state))
      let seat = cs.currentSeat; let moves = 0
      while (seat !== mySeat && moves < 20 && !cs.gameOver && cs.winner === null) {
        if (cs.eliminated?.[seat]) { cs.currentSeat = (seat + 1) % 4; seat = cs.currentSeat; continue }
        const p = cs.phase
        if (p === 'draw') {
          const move = okeyAIMove(cs)
          if (!move || move.action !== 'draw') break
          const result = okeyDraw(cs, seat, move.source)
          if (result.error) break
          cs = result.state; moves++
          await new Promise(r => setTimeout(r, 200))
        } else {
          // discard phase: AI tries to lay melds and add to existing melds first
          let meldResult = okey101AILayMelds(cs, seat)
          if (meldResult) {
            cs = meldResult
            // Check if hand empty after melding
            if (cs.hands[seat].length === 0) {
              await processRoundEnd(cs, seat)
              return
            }
          }
          let addResult = okey101AIAddToMelds(cs, seat)
          if (addResult) {
            cs = addResult
            if (cs.hands[seat].length === 0) {
              await processRoundEnd(cs, seat)
              return
            }
          }
          // Now discard
          const move = okeyAIMove(cs)
          if (!move || move.action !== 'discard') break
          const result = okeyDiscard(cs, seat, move.tileId)
          if (result.error) break
          cs = result.state; moves++
          await new Promise(r => setTimeout(r, 200))
        }
        seat = cs.currentSeat
      }
      await sendAIState({
        state: cs, player1Score: room.player1Score, player2Score: room.player2Score,
        currentTurn: seatToTurn(cs.currentSeat), status: 'active', winnerId: null,
      })
    }, 800)
    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state, currentSeat])

  // Draw handler
  const handleDraw = async (source: 'pile' | 'discard') => {
    if (!isMyCurrentTurn || phase !== 'draw' || isSpectator || room.status !== 'active') return
    const result = okeyDraw(state, mySeat, source)
    if (result.error) { showMsg(result.error); return }
    if (soundEnabled) playTileSound()
    await sendAIState({ state: result.state, currentTurn: seatToTurn(mySeat), status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
  }

  // Discard handler
  const handleDiscard = async (tileId: number) => {
    if (!isMyCurrentTurn || phase !== 'discard' || isSpectator || room.status !== 'active') return
    const result = okeyDiscard(state, mySeat, tileId)
    if (result.error) { showMsg(result.error); return }
    if (soundEnabled) playTileSound()
    // After discard, check if hand is empty (already opened and melded everything)
    if (result.state.hands[mySeat].length === 0) {
      if (soundEnabled) playWinSound()
      await processRoundEnd(result.state, mySeat)
    } else {
      await sendAIState({
        state: result.state, currentTurn: seatToTurn(result.state.currentSeat),
        status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null,
      })
    }
    setSelectedTiles(new Set())
  }

  // Tile click: toggle selection for multi-select
  const handleTileClick = (tileId: number) => {
    if (!isMyCurrentTurn || isSpectator || room.status !== 'active' || phase !== 'discard') return
    setSelectedTiles(prev => {
      const next = new Set(prev)
      if (next.has(tileId)) next.delete(tileId); else next.add(tileId)
      return next
    })
    setAddToMeldIdx(null)
  }

  // Quick discard: double-tap a tile to discard it
  const handleTileDoubleClick = (tileId: number) => {
    if (!isMyCurrentTurn || phase !== 'discard' || isSpectator) return
    handleDiscard(tileId)
  }

  // Lay meld (run or set)
  const handleLayMeld = async (type: 'run' | 'set') => {
    if (!isMyCurrentTurn || phase !== 'discard' || selectedTiles.size < 3) {
      showMsg('En az 3 taş seç!'); return
    }
    const selArr = Array.from(selectedTiles)
    if (selArr.length < 3) { showMsg('En az 3 taş seç!'); return }
    const result = okey101LayMeld(state, mySeat, [selArr])
    if (result.error) { showMsg(result.error); return }
    if (soundEnabled) playTileSound()
    // Check win (hand empty)
    if (result.state.hands[mySeat].length === 0) {
      if (soundEnabled) playWinSound()
      await processRoundEnd(result.state, mySeat)
    } else {
      await sendAIState({
        state: result.state, currentTurn: seatToTurn(mySeat), status: 'active',
        player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null,
      })
    }
    setSelectedTiles(new Set())
  }

  // Add to existing meld
  const handleAddToMeld = async (meldIdx: number) => {
    if (!isMyCurrentTurn || phase !== 'discard' || selectedTiles.size === 0) {
      showMsg('Önce eklemek istediğin taşları seç!'); return
    }
    if (!myOpened) { showMsg('Önce açılman gerekiyor!'); return }
    const selArr = Array.from(selectedTiles)
    const result = okey101AddToMeld(state, mySeat, selArr, meldIdx)
    if (result.error) { showMsg(result.error); return }
    if (soundEnabled) playTileSound()
    if (result.state.hands[mySeat].length === 0) {
      if (soundEnabled) playWinSound()
      await processRoundEnd(result.state, mySeat)
    } else {
      await sendAIState({
        state: result.state, currentTurn: seatToTurn(mySeat), status: 'active',
        player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null,
      })
    }
    setSelectedTiles(new Set()); setAddToMeldIdx(null)
  }

  const clearSelection = () => { setSelectedTiles(new Set()); setAddToMeldIdx(null) }

  const getTopDiscard = (seat: number): OkeyTile | null => {
    const d = discards[seat]; return d && d.length > 0 ? d[d.length - 1] : null
  }
  const prevSeatDiscard = getTopDiscard((mySeat + 3) % 4)

  const showDiffSelector = room?.isAI && room?.status === 'active' && !diffSet && round === 1 && isMyCurrentTurn && pile.length > 90

  const canLayMeld = isMyCurrentTurn && phase === 'discard' && selectedTiles.size >= 3 && !isSpectator
  const canAddToMeld = isMyCurrentTurn && phase === 'discard' && selectedTiles.size > 0 && myOpened && melds.length > 0 && !isSpectator

  /* ══════════════ GAME UI (Portal fullscreen) ══════════════ */
  const gameUI = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998,
      background: 'linear-gradient(135deg, #0a0118 0%, #1a0533 50%, #0d0220 100%)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <LandscapePrompt />

      {/* TOP BAR: Scoreboard + Round info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', background: 'rgba(88,28,135,0.2)', borderBottom: '1px solid rgba(147,51,234,0.2)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#d946ef', fontWeight: 700 }}>💯 Raunt {round}</span>
          {stateDiff && <span style={{ fontSize: 10, color: DIFF_LABELS[stateDiff]?.color }}>{DIFF_LABELS[stateDiff]?.emoji} {DIFF_LABELS[stateDiff]?.label}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {SEAT_NAMES.map((name, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '2px 8px', borderRadius: 6, fontSize: 10,
              background: eliminated[i] ? 'rgba(127,29,29,0.3)' : i === mySeat ? 'rgba(34,211,238,0.1)' : 'rgba(88,28,135,0.2)',
              border: `1px solid ${eliminated[i] ? 'rgba(239,68,68,0.3)' : i === mySeat ? 'rgba(34,211,238,0.3)' : 'rgba(147,51,234,0.2)'}`,
              opacity: eliminated[i] ? 0.5 : 1,
            }}>
              <div style={{ color: SEAT_COLORS[i], fontWeight: 700, textDecoration: eliminated[i] ? 'line-through' : 'none' }}>{name.split(' ')[0]}</div>
              <div style={{ color: scores[i] >= 80 ? '#f87171' : scores[i] >= 50 ? '#fbbf24' : '#4ade80', fontWeight: 800, fontSize: 13 }}>{scores[i]}</div>
              {hasOpened[i] && !eliminated[i] && <div style={{ fontSize: 7, color: '#4ade80' }}>AÇIK</div>}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(217,70,239,0.5)' }}>Kalan: {pile.length}</div>
      </div>

      {/* Difficulty selector overlay */}
      {showDiffSelector && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 100, background: 'rgba(10,1,24,0.95)', padding: 24, borderRadius: 16, border: '1px solid rgba(147,51,234,0.4)' }}>
          <div style={{ color: '#d946ef', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>Zorluk Seç</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button key={d} onClick={() => { setDifficulty(d); setDiffSet(true);
                const ns = { ...state, difficulty: d }
                sendAIState({ state: ns, currentTurn: 1, status: 'active', player1Score: 0, player2Score: 0, winnerId: null })
              }} style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: difficulty === d ? 'rgba(34,211,238,0.2)' : 'rgba(88,28,135,0.3)',
                border: `1px solid ${difficulty === d ? 'rgba(34,211,238,0.5)' : 'rgba(147,51,234,0.3)'}`,
                color: difficulty === d ? '#67e8f9' : '#d946ef',
              }}>{DIFF_LABELS[d].emoji} {DIFF_LABELS[d].label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Round end overlay */}
      {(state?.showingRoundResult || showRoundEnd) && !gameOver && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 100, background: 'rgba(10,1,24,0.95)', padding: 24, borderRadius: 16, border: '1px solid rgba(251,191,36,0.3)', textAlign: 'center', minWidth: 300 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#facc15', marginBottom: 8 }}>🏆 Raunt {round} Bitti!</h3>
          <p style={{ fontSize: 13, color: '#d946ef', marginBottom: 12 }}>{SEAT_NAMES[state?.roundWinner ?? 0]} kazandı!</p>
          {state?.roundHistory?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
              {SEAT_NAMES.map((name, i) => {
                const lastRound = state.roundHistory[state.roundHistory.length - 1]
                return (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: SEAT_COLORS[i] }}>{name.split(' ')[0]}</div>
                    <div style={{ fontSize: 12, color: '#f87171' }}>+{lastRound?.penalties?.[i] || 0}</div>
                  </div>
                )
              })}
            </div>
          )}
          <button onClick={startNextRound} style={{ padding: '8px 20px', background: 'linear-gradient(90deg,#0891b2,#7c3aed)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Sonraki Raunt →</button>
        </div>
      )}

      {/* Game over overlay */}
      {gameOver && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 100, background: 'rgba(10,1,24,0.95)', padding: 24, borderRadius: 16, border: '1px solid rgba(251,191,36,0.3)', textAlign: 'center', minWidth: 320 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#facc15', marginBottom: 8 }}>🎉 Oyun Bitti!</h3>
          <p style={{ fontSize: 14, color: '#d946ef', marginBottom: 12 }}>{SEAT_NAMES[winner ?? 0]} oyunu kazandı!</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {SEAT_NAMES.map((name, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '6px 10px', borderRadius: 8, background: i === winner ? 'rgba(250,204,21,0.15)' : 'rgba(88,28,135,0.2)', border: `1px solid ${i === winner ? 'rgba(250,204,21,0.3)' : 'rgba(147,51,234,0.2)'}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: SEAT_COLORS[i] }}>{name.split(' ')[0]}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{scores[i]}</div>
                {i === winner && <div style={{ fontSize: 9, color: '#facc15' }}>🏆</div>}
                {eliminated[i] && i !== winner && <div style={{ fontSize: 8, color: '#f87171' }}>ELENDİ</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN GAME AREA */}
      {!state?.showingRoundResult && !gameOver && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

          {/* Table area: opponents + center + melds */}
          <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: 0 }}>

            {/* Left opponent (seat 3) */}
            <div style={{ width: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: SEAT_COLORS[3], opacity: eliminated[3] ? 0.3 : currentSeat === 3 ? 1 : 0.6 }}>{SEAT_NAMES[3].split(' ')[0]}</span>
              {!eliminated[3] && (
                <>
                  <span style={{ fontSize: 8, color: 'rgba(217,70,239,0.4)' }}>({hands[3]?.length || 0})</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Array.from({ length: Math.min(hands[3]?.length || 0, 8) }).map((_, i) => <FaceDownTile key={i} size="xs" />)}
                  </div>
                  {getTopDiscard(3) && <div style={{ marginTop: 4 }}><Tile tile={getTopDiscard(3)!} size="xs" isJoker={isJokerTile(getTopDiscard(3)!)} /></div>}
                </>
              )}
            </div>

            {/* Center area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

              {/* Top opponent (seat 2) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '4px 0' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: SEAT_COLORS[2], opacity: eliminated[2] ? 0.3 : currentSeat === 2 ? 1 : 0.6 }}>{SEAT_NAMES[2]}</span>
                {!eliminated[2] && (
                  <div style={{ display: 'flex', gap: 1 }}>
                    {Array.from({ length: Math.min(hands[2]?.length || 0, 12) }).map((_, i) => <FaceDownTile key={i} size="xs" />)}
                  </div>
                )}
                {!eliminated[2] && getTopDiscard(2) && <Tile tile={getTopDiscard(2)!} size="xs" isJoker={isJokerTile(getTopDiscard(2)!)} />}
              </div>

              {/* Center table: pile + indicator + discard + melds */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 0 }}>

                {/* Draw area */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div onClick={() => handleDraw('pile')} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 6, borderRadius: 8,
                    border: `2px solid ${isMyCurrentTurn && phase === 'draw' ? 'rgba(34,211,238,0.5)' : 'rgba(120,53,15,0.3)'}`,
                    background: isMyCurrentTurn && phase === 'draw' ? 'rgba(34,211,238,0.08)' : 'rgba(120,53,15,0.1)',
                    cursor: isMyCurrentTurn && phase === 'draw' ? 'pointer' : 'not-allowed', opacity: isMyCurrentTurn && phase === 'draw' ? 1 : 0.5,
                  }}>
                    <div style={{ width: 36, height: 50, borderRadius: 6, background: 'linear-gradient(180deg,#6b21a8,#3b0764)', border: '2px solid rgba(147,51,234,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'rgba(168,85,247,0.5)', fontSize: 11, fontWeight: 700 }}>{pile.length}</span>
                    </div>
                    <span style={{ fontSize: 8, color: 'rgba(34,211,238,0.6)' }}>Yığın</span>
                  </div>

                  {indicator && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Tile tile={indicator} size="sm" isJoker={isJokerTile(indicator)} />
                      <span style={{ fontSize: 7, color: 'rgba(251,191,36,0.5)' }}>Gösterge</span>
                    </div>
                  )}

                  {prevSeatDiscard ? (
                    <div onClick={() => handleDraw('discard')} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 6, borderRadius: 8,
                      border: `2px solid ${isMyCurrentTurn && phase === 'draw' ? 'rgba(74,222,128,0.5)' : 'rgba(120,53,15,0.3)'}`,
                      background: isMyCurrentTurn && phase === 'draw' ? 'rgba(74,222,128,0.08)' : 'rgba(120,53,15,0.1)',
                      cursor: isMyCurrentTurn && phase === 'draw' ? 'pointer' : 'not-allowed', opacity: isMyCurrentTurn && phase === 'draw' ? 1 : 0.5,
                    }}>
                      <Tile tile={prevSeatDiscard} size="sm" isJoker={isJokerTile(prevSeatDiscard)} />
                      <span style={{ fontSize: 8, color: 'rgba(74,222,128,0.6)' }}>Yerden Al</span>
                    </div>
                  ) : (
                    <div style={{ width: 50, height: 60, borderRadius: 8, border: '2px dashed rgba(120,53,15,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 7, color: 'rgba(120,53,15,0.3)' }}>Atık</span>
                    </div>
                  )}
                </div>

                {/* Melds area on table */}
                {melds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', maxWidth: '90%', padding: 4 }}>
                    {melds.map((m: Meld, idx: number) => (
                      <div key={idx} onClick={canAddToMeld ? () => handleAddToMeld(idx) : undefined}
                        style={{ cursor: canAddToMeld ? 'pointer' : 'default' }}>
                        <MeldGroup meld={m} isJokerFn={isJokerTile}
                          highlightMeld={addToMeldIdx === idx || (canAddToMeld && selectedTiles.size > 0)} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Status */}
                <div style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 12,
                  background: isMyCurrentTurn ? 'rgba(34,211,238,0.15)' : 'rgba(217,70,239,0.08)',
                  color: isMyCurrentTurn ? '#67e8f9' : 'rgba(217,70,239,0.5)',
                }}>
                  {winner !== null ? <span style={{ color: '#facc15' }}>🏆 {winner === mySeat ? 'Kazandın!' : `${SEAT_NAMES[winner]} kazandı!`}</span>
                    : <span>{isMyCurrentTurn ? `Sen - ${phase === 'draw' ? 'Taş Çek' : myOpened ? 'Taş At veya Meld Aç' : 'Taş At veya Açıl'}` : `${SEAT_NAMES[currentSeat]} düşünüyor...`}</span>}
                </div>
              </div>
            </div>

            {/* Right side: opponent (seat 1) + action buttons */}
            <div style={{ width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px' }}>
              {/* East opponent */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: SEAT_COLORS[1], opacity: eliminated[1] ? 0.3 : currentSeat === 1 ? 1 : 0.6 }}>{SEAT_NAMES[1].split(' ')[0]}</span>
                {!eliminated[1] && (
                  <>
                    <span style={{ fontSize: 8, color: 'rgba(217,70,239,0.4)' }}>({hands[1]?.length || 0})</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {Array.from({ length: Math.min(hands[1]?.length || 0, 8) }).map((_, i) => <FaceDownTile key={i} size="xs" />)}
                    </div>
                    {getTopDiscard(1) && <Tile tile={getTopDiscard(1)!} size="xs" isJoker={isJokerTile(getTopDiscard(1)!)} />}
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                <button onClick={() => handleLayMeld('run')} disabled={!canLayMeld}
                  style={{
                    width: '100%', padding: '6px 4px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: canLayMeld ? 'pointer' : 'not-allowed',
                    background: canLayMeld ? 'rgba(34,211,238,0.2)' : 'rgba(88,28,135,0.2)',
                    border: `1px solid ${canLayMeld ? 'rgba(34,211,238,0.4)' : 'rgba(147,51,234,0.2)'}`,
                    color: canLayMeld ? '#67e8f9' : 'rgba(147,51,234,0.4)', opacity: canLayMeld ? 1 : 0.5,
                  }}>🃏 Seri Aç</button>
                <button onClick={() => handleLayMeld('set')} disabled={!canLayMeld}
                  style={{
                    width: '100%', padding: '6px 4px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: canLayMeld ? 'pointer' : 'not-allowed',
                    background: canLayMeld ? 'rgba(168,85,247,0.2)' : 'rgba(88,28,135,0.2)',
                    border: `1px solid ${canLayMeld ? 'rgba(168,85,247,0.4)' : 'rgba(147,51,234,0.2)'}`,
                    color: canLayMeld ? '#c084fc' : 'rgba(147,51,234,0.4)', opacity: canLayMeld ? 1 : 0.5,
                  }}>🎴 Çift Aç</button>
                <button onClick={clearSelection} disabled={selectedTiles.size === 0}
                  style={{
                    width: '100%', padding: '6px 4px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: selectedTiles.size > 0 ? 'pointer' : 'not-allowed',
                    background: selectedTiles.size > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(88,28,135,0.2)',
                    border: `1px solid ${selectedTiles.size > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(147,51,234,0.2)'}`,
                    color: selectedTiles.size > 0 ? '#fca5a5' : 'rgba(147,51,234,0.4)', opacity: selectedTiles.size > 0 ? 1 : 0.5,
                  }}>↩ Geri Topla</button>
                {canAddToMeld && (
                  <div style={{ fontSize: 8, color: '#fbbf24', textAlign: 'center', padding: 2 }}>↑ Masadaki gruba tıkla</div>
                )}
              </div>
            </div>
          </div>

          {/* PLAYER HAND at bottom */}
          <div style={{
            flexShrink: 0, padding: '6px 8px 8px', borderTop: '1px solid rgba(147,51,234,0.2)',
            background: 'rgba(88,28,135,0.12)',
          }}>
            {/* Hand label */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: SEAT_COLORS[mySeat] }}>
                {SEAT_NAMES[mySeat]} ({myHand.length} taş)
              </span>
              {myOpened && <span style={{ fontSize: 8, color: '#4ade80', background: 'rgba(74,222,128,0.15)', padding: '1px 6px', borderRadius: 8 }}>✅ AÇIK</span>}
              {!myOpened && <span style={{ fontSize: 8, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '1px 6px', borderRadius: 8 }}>🔒 Kapalı (min 101 puan)</span>}
              {selectedTiles.size > 0 && <span style={{ fontSize: 9, color: '#facc15' }}>({selectedTiles.size} seçili)</span>}
            </div>
            {/* Tiles */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3, minHeight: 50 }}>
              <AnimatePresence>
                {myHand.map((tile: OkeyTile) => (
                  <Tile key={tile.id} tile={tile} size="md" selected={selectedTiles.has(tile.id)}
                    onClick={() => handleTileClick(tile.id)} isJoker={isJokerTile(tile)} />
                ))}
              </AnimatePresence>
            </div>
            {/* Hint text */}
            {isMyCurrentTurn && !isSpectator && room.status === 'active' && !winner && !gameOver && (
              <div style={{ textAlign: 'center', fontSize: 9, color: 'rgba(217,70,239,0.4)', marginTop: 4 }}>
                {phase === 'draw' ? 'Yığından veya yerden taş çek'
                  : selectedTiles.size > 0 ? 'Seri/Çift Aç veya masadaki gruba ekle | Çift tıkla → at'
                  : 'Taşlara tıkla → seç | Çift tıkla → at'}
              </div>
            )}
          </div>

          {/* Discards strip */}
          {discards[mySeat]?.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '2px 8px 4px', flexShrink: 0 }}>
              <span style={{ fontSize: 7, color: 'rgba(251,191,36,0.4)' }}>Attıkların:</span>
              <div style={{ display: 'flex', gap: 2, overflow: 'hidden', maxWidth: 200 }}>
                {discards[mySeat].slice(-6).map((t: OkeyTile) => <Tile key={t.id} tile={t} size="xs" isJoker={isJokerTile(t)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message toast */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
              background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.3)',
              color: '#fcd34d', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              backdropFilter: 'blur(8px)',
            }}>{message}</motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return <Portal>{gameUI}</Portal>
}
