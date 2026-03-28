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

function Portal({ children }: { children: React.ReactNode }): JSX.Element | null {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  const portal: any = createPortal(children as any, document.body)
  return portal
}

/* ═══ COLORS ═══ */
const TC: Record<number, { fg: string; name: string }> = {
  0: { fg: '#dc2626', name: 'Kırmızı' },
  1: { fg: '#2563eb', name: 'Mavi' },
  2: { fg: '#16a34a', name: 'Yeşil' },
  3: { fg: '#1f2937', name: 'Siyah' },
  4: { fg: '#b45309', name: 'Joker' },
}
const SEAT_NAMES = ['Sen', 'Doğu 🤖', 'Kuzey 🤖', 'Batı 🤖']
const DIFF_LABELS: Record<string, { label: string; emoji: string }> = {
  easy: { label: 'Kolay', emoji: '🟢' },
  medium: { label: 'Orta', emoji: '🟡' },
  hard: { label: 'Zor', emoji: '🔴' },
}

/* ═══ SOUNDS ═══ */
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

/* ═══ LANDSCAPE PROMPT ═══ */
function LandscapePrompt() {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const check = () => { if (typeof window !== 'undefined') setShow(window.innerHeight > window.innerWidth && window.innerWidth < 768) }
    check(); window.addEventListener('resize', check); window.addEventListener('orientationchange', check)
    return () => { window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check) }
  }, [])
  if (!show || !mounted) return null
  return (
    <Portal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(10,30,40,0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📱</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>Ekranı Çevir</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 260 }}>101 Okey yatay modda en iyi şekilde oynanır.</p>
        </div>
      </div>
    </Portal>
  )
}

/* ═══ TILE ═══ */
function Tile({ tile, selected, onClick, size = 'md', isJoker, glow }: {
  tile: OkeyTile; selected?: boolean; onClick?: () => void; size?: 'xs' | 'sm' | 'md' | 'lg'; isJoker?: boolean; glow?: boolean
}) {
  const c = tile.isFalseJoker ? TC[4] : TC[tile.color] || TC[0]
  const dims = size === 'xs' ? { w: 18, h: 26, fs: 9, r: 3 } : size === 'sm' ? { w: 24, h: 34, fs: 11, r: 4 } : size === 'lg' ? { w: 44, h: 60, fs: 20, r: 6 } : { w: 34, h: 48, fs: 16, r: 5 }
  return (
    <motion.div layout onClick={onClick}
      whileHover={onClick ? { y: -4, scale: 1.06 } : {}}
      whileTap={onClick ? { scale: 0.94 } : {}}
      style={{
        width: dims.w, height: dims.h, borderRadius: dims.r,
        background: '#fff', border: `2px solid ${selected ? '#facc15' : '#ccc'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default', position: 'relative',
        userSelect: 'none', flexShrink: 0,
        boxShadow: selected ? '0 0 8px rgba(250,204,21,0.6), 0 2px 4px rgba(0,0,0,0.3)' : glow ? '0 0 10px rgba(74,222,128,0.5)' : '0 1px 3px rgba(0,0,0,0.25)',
        transform: selected ? 'translateY(-6px)' : undefined,
        zIndex: selected ? 20 : 1,
      }}>
      <span style={{ fontSize: dims.fs, color: c.fg, fontWeight: 800, lineHeight: 1 }}>
        {tile.isFalseJoker ? '★' : tile.number}
      </span>
      {isJoker && !tile.isFalseJoker && (
        <span style={{ position: 'absolute', top: -3, right: -3, fontSize: 6, background: '#facc15', color: '#78350f', borderRadius: '50%', width: 10, height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>J</span>
      )}
    </motion.div>
  )
}

function FaceDownTile({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
  const d = size === 'xs' ? { w: 14, h: 20 } : { w: 20, h: 28 }
  return <div style={{ width: d.w, height: d.h, borderRadius: 3, background: 'linear-gradient(180deg,#1e3a5f,#0f2440)', border: '1px solid #2a4a6a' }} />
}

/* ═══ SCORE BADGE ═══ */
function ScoreBadge({ score, position }: { score: number; position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const pos = position === 'tl' ? { top: 4, left: 4 } : position === 'tr' ? { top: 4, right: 4 } : position === 'bl' ? { bottom: 4, left: 4 } : { bottom: 4, right: 4 }
  return (
    <div style={{ position: 'absolute', ...pos, zIndex: 10, width: 30, height: 30, borderRadius: 6, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
      <span style={{ color: 'white', fontSize: 14, fontWeight: 800 }}>{score}</span>
    </div>
  )
}

/* ═══ MELD GROUP ═══ */
function MeldGroup({ meld, isJokerFn, onClick, highlight }: {
  meld: Meld; isJokerFn: (t: OkeyTile) => boolean; onClick?: () => void; highlight?: boolean
}) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', gap: 1, padding: '2px 3px', borderRadius: 4,
      background: highlight ? 'rgba(250,204,21,0.2)' : 'rgba(0,0,0,0.15)',
      border: highlight ? '1px solid rgba(250,204,21,0.5)' : '1px solid rgba(255,255,255,0.1)',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      {meld.tiles.map(t => <Tile key={t.id} tile={t} size="xs" isJoker={isJokerFn(t)} />)}
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

  const isJokerTile = useCallback((t: OkeyTile) => !!t.isFalseJoker || (t.color === jokerColor && t.number === jokerNumber), [jokerColor, jokerNumber])

  useEffect(() => {
    if (state && !diffSet && room?.status === 'active' && !state.difficulty) {
      sendAIState({ state: { ...state, difficulty }, currentTurn: seatToTurn(state.currentSeat), status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
      setDiffSet(true)
    }
  }, [state, room])

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(null), 2500) }

  useEffect(() => {
    if (currentSeat !== lastSeatRef.current) {
      setSelectedTiles(new Set()); lastSeatRef.current = currentSeat
      if (isMyCurrentTurn && !isSpectator && room.status === 'active' && !winner) showMsg('Sıra sende!')
    }
  }, [currentSeat])

  /* ═══ ROUND END ═══ */
  const processRoundEnd = async (cs: any, roundWinner: number) => {
    const newScores = [...(cs.scores || [0, 0, 0, 0])]
    const roundPenalties = [0, 0, 0, 0]
    for (let s = 0; s < 4; s++) {
      if (s === roundWinner || cs.eliminated?.[s]) continue
      roundPenalties[s] = okey101CalcPenalty(cs.hands[s] || [], cs.jokerColor, cs.jokerNumber)
    }
    const newEliminated = [...(cs.eliminated || [false, false, false, false])]
    for (let s = 0; s < 4; s++) { if (newScores[s] + roundPenalties[s] >= 101) newEliminated[s] = true; newScores[s] += roundPenalties[s] }
    const activePlayers = newEliminated.filter((e: boolean) => !e).length
    const roundHistory = [...(cs.roundHistory || []), { round: cs.round, winner: roundWinner, penalties: roundPenalties }]
    if (activePlayers <= 1) {
      const gameWinner = newEliminated.findIndex((e: boolean) => !e)
      const finalState = { ...cs, scores: newScores, eliminated: newEliminated, roundHistory, gameOver: true, winner: gameWinner >= 0 ? gameWinner : roundWinner, roundWinner }
      if (!statsUpdatedRef.current && !isSpectator) { statsUpdatedRef.current = true; const st = get101Stats(); st.gamesPlayed++; if (gameWinner === mySeat) st.wins++; else st.losses++; save101Stats(st) }
      const myWin = gameWinner === mySeat
      await sendAIState({ state: finalState, player1Score: myWin && playerNum === 1 ? 1 : (!myWin && playerNum !== 1 ? 1 : 0), player2Score: myWin && playerNum === 2 ? 1 : (!myWin && playerNum !== 2 ? 1 : 0), currentTurn: 1, status: 'completed', winnerId: myWin ? (playerNum === 1 ? room.player1Id : room.player2Id) : (playerNum === 1 ? room.player2Id : room.player1Id) })
    } else {
      setShowRoundEnd(true)
      await sendAIState({ state: { ...cs, scores: newScores, eliminated: newEliminated, roundHistory, gameOver: false, winner: null, roundWinner, showingRoundResult: true }, currentTurn: 1, status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
    }
  }

  const startNextRound = async () => {
    setShowRoundEnd(false)
    const ns = okey101NewRound(state)
    await sendAIState({ state: ns, currentTurn: seatToTurn(ns.currentSeat), status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
  }

  /* ═══ AI LOGIC ═══ */
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || gameOver || state?.showingRoundResult || winner !== null || currentSeat === mySeat) return
    if (aiRef.current) clearTimeout(aiRef.current)
    aiRef.current = setTimeout(async () => {
      let cs = JSON.parse(JSON.stringify(state))
      let seat = cs.currentSeat; let moves = 0
      while (seat !== mySeat && moves < 20 && !cs.gameOver && cs.winner === null) {
        if (cs.eliminated?.[seat]) { cs.currentSeat = (seat + 1) % 4; seat = cs.currentSeat; continue }
        if (cs.phase === 'draw') {
          const move = okeyAIMove(cs)
          if (!move || move.action !== 'draw') break
          const r = okeyDraw(cs, seat, move.source); if (r.error) break; cs = r.state; moves++
          await new Promise(r => setTimeout(r, 200))
        } else {
          let mr = okey101AILayMelds(cs, seat); if (mr) { cs = mr; if (cs.hands[seat].length === 0) { await processRoundEnd(cs, seat); return } }
          let ar = okey101AIAddToMelds(cs, seat); if (ar) { cs = ar; if (cs.hands[seat].length === 0) { await processRoundEnd(cs, seat); return } }
          const move = okeyAIMove(cs)
          if (!move || move.action !== 'discard') break
          const r = okeyDiscard(cs, seat, move.tileId); if (r.error) break; cs = r.state; moves++
          await new Promise(r => setTimeout(r, 200))
        }
        seat = cs.currentSeat
      }
      await sendAIState({ state: cs, player1Score: room.player1Score, player2Score: room.player2Score, currentTurn: seatToTurn(cs.currentSeat), status: 'active', winnerId: null })
    }, 800)
    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state, currentSeat])

  /* ═══ HANDLERS ═══ */
  const handleDraw = async (source: 'pile' | 'discard') => {
    if (!isMyCurrentTurn || phase !== 'draw' || isSpectator || room.status !== 'active') return
    const r = okeyDraw(state, mySeat, source); if (r.error) { showMsg(r.error); return }
    if (soundEnabled) playTileSound()
    await sendAIState({ state: r.state, currentTurn: seatToTurn(mySeat), status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
  }

  const handleDiscard = async (tileId: number) => {
    if (!isMyCurrentTurn || phase !== 'discard' || isSpectator || room.status !== 'active') return
    const r = okeyDiscard(state, mySeat, tileId); if (r.error) { showMsg(r.error); return }
    if (soundEnabled) playTileSound()
    if (r.state.hands[mySeat].length === 0) { if (soundEnabled) playWinSound(); await processRoundEnd(r.state, mySeat) }
    else await sendAIState({ state: r.state, currentTurn: seatToTurn(r.state.currentSeat), status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
    setSelectedTiles(new Set())
  }

  const handleTileClick = (tileId: number) => {
    if (!isMyCurrentTurn || isSpectator || room.status !== 'active' || phase !== 'discard') return
    setSelectedTiles(prev => { const n = new Set(prev); if (n.has(tileId)) n.delete(tileId); else n.add(tileId); return n })
  }

  const handleTileDoubleClick = (tileId: number) => {
    if (!isMyCurrentTurn || phase !== 'discard' || isSpectator) return
    handleDiscard(tileId)
  }

  const handleLayMeld = async (type: 'run' | 'set') => {
    if (!isMyCurrentTurn || phase !== 'discard' || selectedTiles.size < 3) { showMsg('En az 3 taş seç!'); return }
    const selArr = Array.from(selectedTiles)
    const r = okey101LayMeld(state, mySeat, [selArr])
    if (r.error) { showMsg(r.error); return }
    if (soundEnabled) playTileSound()
    if (r.state.hands[mySeat].length === 0) { if (soundEnabled) playWinSound(); await processRoundEnd(r.state, mySeat) }
    else await sendAIState({ state: r.state, currentTurn: seatToTurn(mySeat), status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
    setSelectedTiles(new Set())
  }

  const handleAddToMeld = async (meldIdx: number) => {
    if (!isMyCurrentTurn || phase !== 'discard' || selectedTiles.size === 0 || !myOpened) { showMsg(myOpened ? 'Taş seç!' : 'Önce açıl!'); return }
    const r = okey101AddToMeld(state, mySeat, Array.from(selectedTiles), meldIdx)
    if (r.error) { showMsg(r.error); return }
    if (soundEnabled) playTileSound()
    if (r.state.hands[mySeat].length === 0) { if (soundEnabled) playWinSound(); await processRoundEnd(r.state, mySeat) }
    else await sendAIState({ state: r.state, currentTurn: seatToTurn(mySeat), status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
    setSelectedTiles(new Set())
  }

  const getTopDiscard = (seat: number): OkeyTile | null => { const d = discards[seat]; return d?.length > 0 ? d[d.length - 1] : null }
  const prevSeatDiscard = getTopDiscard((mySeat + 3) % 4)
  const showDiffSelector = room?.isAI && room?.status === 'active' && !diffSet && round === 1 && isMyCurrentTurn && pile.length > 90
  const canLay = isMyCurrentTurn && phase === 'discard' && selectedTiles.size >= 3 && !isSpectator
  const canAdd = isMyCurrentTurn && phase === 'discard' && selectedTiles.size > 0 && myOpened && melds.length > 0 && !isSpectator

  // Table style constants
  const TABLE_BG = '#1a6b7a'
  const TABLE_DARK = '#0d3d47'
  const FRAME = '#0a2a32'
  const WOOD = 'linear-gradient(180deg, #c8944a 0%, #a67530 40%, #8b5e1a 100%)'

  const gameUI = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99998, background: '#0a1a20', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <LandscapePrompt />

      {/* Difficulty overlay */}
      {showDiffSelector && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 200, background: 'rgba(10,26,32,0.95)', padding: 24, borderRadius: 12, border: '1px solid #2a6a7a' }}>
          <div style={{ color: '#7dd3fc', fontSize: 14, marginBottom: 12, textAlign: 'center', fontWeight: 700 }}>Zorluk Seç</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button key={d} onClick={() => { setDifficulty(d); setDiffSet(true); sendAIState({ state: { ...state, difficulty: d }, currentTurn: 1, status: 'active', player1Score: 0, player2Score: 0, winnerId: null }) }}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: difficulty === d ? '#0ea5e9' : '#1e3a4a', border: `1px solid ${difficulty === d ? '#38bdf8' : '#2a5a6a'}`, color: 'white' }}>
                {DIFF_LABELS[d].emoji} {DIFF_LABELS[d].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Round end overlay */}
      {(state?.showingRoundResult || showRoundEnd) && !gameOver && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 200, background: 'rgba(10,26,32,0.97)', padding: 24, borderRadius: 12, border: '1px solid #fbbf24', textAlign: 'center', minWidth: 280 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>🏆 Raunt {round} Bitti!</h3>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>{SEAT_NAMES[state?.roundWinner ?? 0]} kazandı!</p>
          {state?.roundHistory?.length > 0 && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 12 }}>
              {SEAT_NAMES.map((name, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{name.split(' ')[0]}</div>
                  <div style={{ fontSize: 13, color: '#f87171', fontWeight: 700 }}>+{state.roundHistory[state.roundHistory.length - 1]?.penalties?.[i] || 0}</div>
                </div>
              ))}
            </div>
          )}
          <button onClick={startNextRound} style={{ padding: '8px 20px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Sonraki Raunt →</button>
        </div>
      )}

      {/* Game over overlay */}
      {gameOver && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 200, background: 'rgba(10,26,32,0.97)', padding: 24, borderRadius: 12, border: '1px solid #fbbf24', textAlign: 'center', minWidth: 300 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>🎉 Oyun Bitti!</h3>
          <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>{SEAT_NAMES[winner ?? 0]} kazandı!</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {SEAT_NAMES.map((name, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '6px 10px', borderRadius: 8, background: i === winner ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${i === winner ? '#fbbf24' : '#334155'}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>{name.split(' ')[0]}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{scores[i]}</div>
                {i === winner && <div style={{ fontSize: 9, color: '#fbbf24' }}>🏆</div>}
                {eliminated[i] && i !== winner && <div style={{ fontSize: 8, color: '#f87171' }}>ELENDİ</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ MAIN TABLE ═══ */}
      {!state?.showingRoundResult && !gameOver && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Table area */}
          <div style={{ flex: 1, display: 'flex', position: 'relative', margin: 4, borderRadius: 8, background: FRAME, border: '3px solid #0d2830', overflow: 'hidden' }}>

            {/* Inner felt table */}
            <div style={{ flex: 1, display: 'flex', margin: 4, borderRadius: 6, background: TABLE_BG, position: 'relative', overflow: 'hidden' }}>

              {/* Grid lines on table */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

              {/* 101 watermark */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 80, fontWeight: 900, color: 'rgba(255,255,255,0.04)', letterSpacing: 8, pointerEvents: 'none' }}>101</div>

              {/* Score badges */}
              <ScoreBadge score={scores[mySeat]} position="br" />
              <ScoreBadge score={scores[opponentSeats[0]]} position="tr" />
              <ScoreBadge score={scores[opponentSeats[1]]} position="tl" />
              <ScoreBadge score={scores[opponentSeats[2]]} position="bl" />

              {/* Left opponent (seat 3) */}
              <div style={{ width: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '4px 2px' }}>
                {!eliminated[opponentSeats[2]] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{SEAT_NAMES[opponentSeats[2]].split(' ')[0]}</span>
                    {Array.from({ length: Math.min(hands[opponentSeats[2]]?.length || 0, 10) }).map((_, i) => <FaceDownTile key={i} size="xs" />)}
                    {getTopDiscard(opponentSeats[2]) && <div style={{ marginTop: 2 }}><Tile tile={getTopDiscard(opponentSeats[2])!} size="xs" isJoker={isJokerTile(getTopDiscard(opponentSeats[2])!)} /></div>}
                  </div>
                )}
              </div>

              {/* Center column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* Top opponent (seat 2) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 0', minHeight: 36 }}>
                  {!eliminated[opponentSeats[1]] && (
                    <>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{SEAT_NAMES[opponentSeats[1]].split(' ')[0]}</span>
                      <div style={{ display: 'flex', gap: 1 }}>
                        {Array.from({ length: Math.min(hands[opponentSeats[1]]?.length || 0, 14) }).map((_, i) => <FaceDownTile key={i} size="xs" />)}
                      </div>
                      {getTopDiscard(opponentSeats[1]) && <Tile tile={getTopDiscard(opponentSeats[1])!} size="xs" isJoker={isJokerTile(getTopDiscard(opponentSeats[1])!)} />}
                    </>
                  )}
                </div>

                {/* Center: melds + pile + info */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 0, position: 'relative' }}>

                  {/* Melds area (left side of center) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '45%', maxHeight: '100%', overflow: 'auto', padding: 4 }}>
                    {melds.map((m: Meld, idx: number) => (
                      <MeldGroup key={idx} meld={m} isJokerFn={isJokerTile}
                        onClick={canAdd ? () => handleAddToMeld(idx) : undefined}
                        highlight={canAdd && selectedTiles.size > 0} />
                    ))}
                  </div>

                  {/* Pile & indicator */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {/* Pile */}
                      <div onClick={() => handleDraw('pile')} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: 4, borderRadius: 6, cursor: isMyCurrentTurn && phase === 'draw' ? 'pointer' : 'not-allowed',
                        border: `2px solid ${isMyCurrentTurn && phase === 'draw' ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                        opacity: isMyCurrentTurn && phase === 'draw' ? 1 : 0.4,
                      }}>
                        <div style={{ width: 32, height: 44, borderRadius: 4, background: 'linear-gradient(180deg,#1e3a5f,#0f2440)', border: '2px solid #2a4a6a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#64748b', fontSize: 10, fontWeight: 700 }}>{pile.length}</span>
                        </div>
                        <span style={{ fontSize: 7, color: '#7dd3fc' }}>Yığın</span>
                      </div>

                      {/* Indicator */}
                      {indicator && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <Tile tile={indicator} size="lg" isJoker={isJokerTile(indicator)} />
                          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>Gösterge</span>
                        </div>
                      )}

                      {/* Discard from prev player */}
                      {prevSeatDiscard ? (
                        <div onClick={() => handleDraw('discard')} style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: 4, borderRadius: 6,
                          cursor: isMyCurrentTurn && phase === 'draw' ? 'pointer' : 'not-allowed',
                          border: `2px solid ${isMyCurrentTurn && phase === 'draw' ? '#4ade80' : 'rgba(255,255,255,0.1)'}`,
                          opacity: isMyCurrentTurn && phase === 'draw' ? 1 : 0.4,
                        }}>
                          <Tile tile={prevSeatDiscard} size="sm" isJoker={isJokerTile(prevSeatDiscard)} />
                          <span style={{ fontSize: 7, color: '#86efac' }}>Yerden Al</span>
                        </div>
                      ) : (
                        <div style={{ width: 36, height: 50, borderRadius: 4, border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)' }}>Atık</span>
                        </div>
                      )}
                    </div>

                    {/* Info text area like screenshot: Eşli / Yardımlı / Katlamalı / round */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>
                      {myOpened && <span style={{ color: '#4ade80' }}>Açık</span>}
                      {!myOpened && <span style={{ color: '#fbbf24' }}>Kapalı</span>}
                      <span>{round}/{eliminated.filter(Boolean).length > 0 ? '∞' : '3'} El</span>
                    </div>

                    {/* My discards count */}
                    <div style={{ display: 'flex', gap: 2, fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>
                      {discards[mySeat]?.slice(-3).map((t: OkeyTile) => <Tile key={t.id} tile={t} size="xs" isJoker={isJokerTile(t)} />)}
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                <div style={{ textAlign: 'center', padding: '3px 0', fontSize: 10, fontWeight: 600, color: isMyCurrentTurn ? '#7dd3fc' : '#64748b' }}>
                  {winner !== null ? <span style={{ color: '#fbbf24' }}>🏆 {winner === mySeat ? 'Kazandın!' : `${SEAT_NAMES[winner]} kazandı!`}</span>
                    : <span>{isMyCurrentTurn ? `${phase === 'draw' ? 'Taş Çek' : myOpened ? 'At veya Meld Aç' : 'At veya Açıl (min 101)'}` : `${SEAT_NAMES[currentSeat]} düşünüyor...`}</span>}
                </div>
              </div>

              {/* Right side: opponent (seat 1) + action buttons */}
              <div style={{ width: 80, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '4px 4px', alignItems: 'center' }}>
                {/* East opponent */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  {!eliminated[opponentSeats[0]] && (
                    <>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{SEAT_NAMES[opponentSeats[0]].split(' ')[0]}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {Array.from({ length: Math.min(hands[opponentSeats[0]]?.length || 0, 10) }).map((_, i) => <FaceDownTile key={i} size="xs" />)}
                      </div>
                      {getTopDiscard(opponentSeats[0]) && <Tile tile={getTopDiscard(opponentSeats[0])!} size="xs" isJoker={isJokerTile(getTopDiscard(opponentSeats[0])!)} />}
                    </>
                  )}
                </div>

                {/* Action buttons panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
                  <button onClick={() => handleLayMeld('run')} disabled={!canLay}
                    style={{ width: '100%', padding: '5px 2px', borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: canLay ? 'pointer' : 'not-allowed', background: canLay ? '#1e3a5f' : '#0f2030', border: '1px solid #2a5a7a', color: canLay ? 'white' : '#475569', opacity: canLay ? 1 : 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    🃏 SERİ AÇ
                  </button>
                  <button onClick={() => handleLayMeld('set')} disabled={!canLay}
                    style={{ width: '100%', padding: '5px 2px', borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: canLay ? 'pointer' : 'not-allowed', background: canLay ? '#1e3a5f' : '#0f2030', border: '1px solid #2a5a7a', color: canLay ? 'white' : '#475569', opacity: canLay ? 1 : 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    🎴 ÇİFT AÇ
                  </button>
                  <button onClick={() => setSelectedTiles(new Set())} disabled={selectedTiles.size === 0}
                    style={{ width: '100%', padding: '5px 2px', borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: selectedTiles.size > 0 ? 'pointer' : 'not-allowed', background: selectedTiles.size > 0 ? '#7f1d1d' : '#0f2030', border: '1px solid #2a5a7a', color: selectedTiles.size > 0 ? '#fca5a5' : '#475569', opacity: selectedTiles.size > 0 ? 1 : 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    GERİ TOPLA
                  </button>
                  <button onClick={() => { if (canAdd && melds.length > 0) handleAddToMeld(0) }} disabled={!canAdd}
                    style={{ width: '100%', padding: '5px 2px', borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: canAdd ? 'pointer' : 'not-allowed', background: canAdd ? '#1e3a5f' : '#0f2030', border: '1px solid #2a5a7a', color: canAdd ? 'white' : '#475569', opacity: canAdd ? 1 : 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    TAŞLARI İŞLE
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ BOTTOM: Player hand on wooden shelf ═══ */}
          <div style={{ flexShrink: 0, position: 'relative' }}>
            {/* Wooden shelf */}
            <div style={{ background: WOOD, padding: '8px 8px 10px', position: 'relative' }}>
              {/* Wood grain highlight */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.15)' }} />

              {/* Bottom corner buttons */}
              <div style={{ position: 'absolute', left: 4, bottom: 4, zIndex: 10 }}>
                <button onClick={() => handleLayMeld('set')} disabled={!canLay}
                  style={{ padding: '4px 6px', borderRadius: 4, fontSize: 8, fontWeight: 700, background: '#1e3a5f', border: '1px solid #2a5a7a', color: canLay ? 'white' : '#475569', cursor: canLay ? 'pointer' : 'not-allowed', opacity: canLay ? 1 : 0.5 }}>
                  🎴 ÇİFT DİZ
                </button>
              </div>
              <div style={{ position: 'absolute', right: 4, bottom: 4, zIndex: 10 }}>
                <button onClick={() => handleLayMeld('run')} disabled={!canLay}
                  style={{ padding: '4px 6px', borderRadius: 4, fontSize: 8, fontWeight: 700, background: '#1e3a5f', border: '1px solid #2a5a7a', color: canLay ? 'white' : '#475569', cursor: canLay ? 'pointer' : 'not-allowed', opacity: canLay ? 1 : 0.5 }}>
                  🃏 SERİ DİZ
                </button>
              </div>

              {/* Hand info */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{myHand.length} taş</span>
                {selectedTiles.size > 0 && <span style={{ fontSize: 8, color: '#fbbf24' }}>({selectedTiles.size} seçili)</span>}
                {myOpened && <span style={{ fontSize: 7, color: '#4ade80', background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: 4 }}>AÇIK</span>}
              </div>

              {/* Tiles */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3, minHeight: 52 }}>
                <AnimatePresence>
                  {myHand.map((tile: OkeyTile) => (
                    <div key={tile.id} onDoubleClick={() => handleTileDoubleClick(tile.id)}>
                      <Tile tile={tile} size="md" selected={selectedTiles.has(tile.id)}
                        onClick={() => handleTileClick(tile.id)} isJoker={isJokerTile(tile)} />
                    </div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Hint */}
              {isMyCurrentTurn && !isSpectator && !winner && !gameOver && (
                <div style={{ textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
                  {phase === 'draw' ? 'Yığından veya yerden taş çek'
                    : selectedTiles.size > 0 ? 'Seri/Çift Aç | Masadaki gruba tıkla | Çift tıkla → at'
                    : 'Taşlara tıkla → seç | Çift tıkla → at'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 99999, background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', color: '#fcd34d', padding: '6px 16px', borderRadius: 16, fontSize: 12, fontWeight: 600 }}>
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return <Portal>{gameUI}</Portal>
}
