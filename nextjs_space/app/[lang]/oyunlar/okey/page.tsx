'use client'

import GameShell from '@/components/game-shell'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { okeyDraw, okeyDiscard, okeyCheckWin, okeyAIMove, OkeyTile } from '@/lib/game-logic'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
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
const SEAT_HEX = ['#22d3ee', '#f472b6', '#fbbf24', '#4ade80']
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
    const d = buf.getChannelData(0)
    for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / d.length, 2) * 0.3
    const src = ctx.createBufferSource(); src.buffer = buf
    const g = ctx.createGain(); g.gain.setValueAtTime(0.15, ctx.currentTime)
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1000
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start()
  } catch {}
}
function playWinSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq
      const g = ctx.createGain(); g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4)
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i * 0.15); o.stop(ctx.currentTime + i * 0.15 + 0.5)
    })
  } catch {}
}

/* ═══ STATS ═══ */
function getOkeyStats() {
  try { return JSON.parse(localStorage.getItem('okey_stats') || '{"wins":0,"losses":0,"streak":0,"bestStreak":0,"gamesPlayed":0}') }
  catch { return { wins: 0, losses: 0, streak: 0, bestStreak: 0, gamesPlayed: 0 } }
}
function saveOkeyStats(s: any) { try { localStorage.setItem('okey_stats', JSON.stringify(s)) } catch {} }

/* ═══ GROUP DETECTION ═══ */
function detectGroups(hand: OkeyTile[], jc: number, jn: number) {
  const isJ = (t: OkeyTile) => !!t.isFalseJoker || (t.color === jc && t.number === jn)
  const runs: number[][] = []; const sets: number[][] = []
  const byColor: Record<number, OkeyTile[]> = {}
  hand.forEach(t => { if (!isJ(t)) { (byColor[t.color] ??= []).push(t) } })
  for (const c in byColor) {
    const ts = byColor[c].sort((a, b) => a.number - b.number)
    let run = [ts[0].id]
    for (let i = 1; i < ts.length; i++) {
      if (ts[i].number === ts[i - 1].number + 1) run.push(ts[i].id)
      else if (ts[i].number !== ts[i - 1].number) { if (run.length >= 3) runs.push([...run]); run = [ts[i].id] }
    }
    if (run.length >= 3) runs.push([...run])
  }
  const byNum: Record<number, OkeyTile[]> = {}
  hand.forEach(t => { if (!isJ(t)) { (byNum[t.number] ??= []).push(t) } })
  for (const n in byNum) {
    const seen = new Set<number>(); const s: number[] = []
    for (const t of byNum[n]) { if (!seen.has(t.color)) { seen.add(t.color); s.push(t.id) } }
    if (s.length >= 3) sets.push(s)
  }
  return { runs, sets }
}

/* ═══ TILE ═══ */
function Tile({ tile, selected, onClick, size = 'md', isJoker, glow, groupColor }: {
  tile: OkeyTile; selected?: boolean; onClick?: () => void; size?: 'xs' | 'sm' | 'md' | 'lg'; isJoker?: boolean; glow?: boolean; groupColor?: string
}) {
  const c = tile.isFalseJoker ? TC[4] : TC[tile.color] || TC[0]
  const dims = size === 'xs' ? { w: 18, h: 26, fs: 9, r: 3 } : size === 'sm' ? { w: 26, h: 36, fs: 12, r: 4 } : size === 'lg' ? { w: 44, h: 60, fs: 20, r: 6 } : { w: 38, h: 54, fs: 17, r: 5 }
  return (
    <motion.div layout onClick={onClick}
      whileHover={onClick ? { y: -5, scale: 1.06 } : {}}
      whileTap={onClick ? { scale: 0.94 } : {}}
      style={{
        width: dims.w, height: dims.h, borderRadius: dims.r,
        background: '#fff', border: `2px solid ${selected ? '#facc15' : groupColor || '#ccc'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default', position: 'relative',
        userSelect: 'none', flexShrink: 0,
        boxShadow: selected ? '0 0 8px rgba(250,204,21,0.6), 0 2px 4px rgba(0,0,0,0.3)' : glow ? '0 0 10px rgba(74,222,128,0.5)' : '0 1px 3px rgba(0,0,0,0.25)',
        transform: selected ? 'translateY(-8px)' : undefined,
        zIndex: selected ? 20 : 1,
      }}>
      <span style={{ fontSize: dims.fs, color: c.fg, fontWeight: 800, lineHeight: 1 }}>{tile.isFalseJoker ? '★' : tile.number}</span>
      {isJoker && !tile.isFalseJoker && (
        <span style={{ position: 'absolute', top: -3, right: -3, fontSize: 7, background: '#facc15', color: '#78350f', borderRadius: '50%', width: 11, height: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>J</span>
      )}
    </motion.div>
  )
}

function FaceDownTile({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
  const d = size === 'xs' ? { w: 14, h: 20 } : { w: 20, h: 28 }
  return <div style={{ width: d.w, height: d.h, borderRadius: 3, background: 'linear-gradient(180deg,#1e3a5f,#0f2440)', border: '1px solid #2a4a6a' }} />
}

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
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 260 }}>Okey oyunu yatay modda en iyi şekilde oynanır.</p>
        </div>
      </div>
    </Portal>
  )
}

/* ═══ TILE RACK with Reorder ═══ */
function TileRack({ tiles, selectedTile, onTileClick, isJokerFn, canWin, phase, groupedIds, onReorder }: {
  tiles: OkeyTile[]; selectedTile: number | null; onTileClick: (id: number) => void;
  isJokerFn: (t: OkeyTile) => boolean; canWin: boolean; phase: string;
  groupedIds: Map<number, string>; onReorder: (newOrder: OkeyTile[]) => void;
}) {
  return (
    <Reorder.Group axis="x" values={tiles} onReorder={onReorder}
      style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3, minHeight: 60, position: 'relative', zIndex: 2 }}>
      <AnimatePresence>
        {tiles.map((tile) => (
          <Reorder.Item key={tile.id} value={tile} style={{ flexShrink: 0, zIndex: selectedTile === tile.id ? 30 : 1 }}>
            <Tile tile={tile} selected={selectedTile === tile.id} onClick={() => onTileClick(tile.id)}
              isJoker={isJokerFn(tile)} glow={canWin && phase === 'discard' && selectedTile === tile.id}
              groupColor={groupedIds.get(tile.id)} />
          </Reorder.Item>
        ))}
      </AnimatePresence>
    </Reorder.Group>
  )
}

/* ═══ IN-GAME CHAT ═══ */
function InGameChat({ roomId }: { roomId: string }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const lastRef = useRef<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const p = lastRef.current ? `?after=${lastRef.current}` : ''
        const r = await fetch(`/api/games/room/${roomId}/chat${p}`)
        if (r.ok) {
          const m = await r.json()
          if (m.length > 0) {
            if (lastRef.current) { setMsgs(prev => [...prev, ...m]); if (!open) setUnread(prev => prev + m.length) }
            else setMsgs(m)
            lastRef.current = m[m.length - 1].createdAt
          }
        }
      } catch {}
    }
    poll(); const iv = setInterval(poll, 3000); return () => clearInterval(iv)
  }, [roomId, open])

  useEffect(() => { if (open) { setUnread(0); setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) } }, [open, msgs.length])

  const send = async () => {
    if (!input.trim() || sending) return; setSending(true)
    try { await fetch(`/api/games/room/${roomId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: input.trim() }) }); setInput('') } catch {}
    setSending(false)
  }

  return (
    <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 50 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ position: 'relative', padding: 10, borderRadius: '50%', background: '#1e3a5f', border: '1px solid #2a5a7a', cursor: 'pointer' }}>
          <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#dc2626', borderRadius: '50%', color: 'white', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{unread}</span>}
        </button>
      ) : (
        <div style={{ width: 260, height: 280, background: '#0a1a28', border: '1px solid #2a5a7a', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #1e3a5f' }}>
            <span style={{ fontSize: 11, color: '#7dd3fc', fontWeight: 600 }}>💬 Sohbet</span>
            <button onClick={() => setOpen(false)} style={{ color: '#64748b', cursor: 'pointer', background: 'none', border: 'none', fontSize: 14 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px', fontSize: 11 }}>
            {msgs.map((m: any, i: number) => (
              <div key={i} style={{ marginBottom: 4 }}><span style={{ fontWeight: 600, color: '#7dd3fc' }}>{m.userName}:</span> <span style={{ color: '#94a3b8' }}>{m.message}</span></div>
            ))}
            <div ref={endRef} />
          </div>
          <div style={{ display: 'flex', gap: 4, padding: '6px 8px', borderTop: '1px solid #1e3a5f' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Mesaj..." style={{ flex: 1, padding: '4px 8px', borderRadius: 6, fontSize: 11, color: 'white', background: '#0f2440', border: '1px solid #2a4a6a', outline: 'none' }} />
            <button onClick={send} disabled={sending} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: 'white', background: '#0ea5e9', border: 'none', cursor: 'pointer' }}>Gönder</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══ MAIN PAGE ═══ */
export default function OkeyPage() {
  return (
    <GameShell gameType="okey" gameName="Okey" gameEmoji="🀄" gameDesc="Klasik Türk Okey oyunu! 4 kişilik, 106 taş, strateji ve şans." supportsAI={true}>
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState, soundEnabled }) => (
        <OkeyBoard room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator} sendAIState={sendAIState} soundEnabled={soundEnabled} playerNum={playerNum} />
      )}
    </GameShell>
  )
}

/* ═══ OKEY BOARD ═══ */
function OkeyBoard({ room, state, isMyTurn, isSpectator, sendAIState, soundEnabled, playerNum }: any) {
  const mySeat: number = room?.isAI ? 0 : (playerNum === 2 ? 1 : 0)
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<string>('medium')
  const [diffSet, setDiffSet] = useState(false)
  const [localHand, setLocalHand] = useState<OkeyTile[]>([])
  const aiRef = useRef<any>(null)
  const lastSeatRef = useRef<number>(-1)
  const statsUpdatedRef = useRef(false)
  const prevHandIdsRef = useRef<string>('')

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

  const seatToTurn = (seat: number) => seat === 0 ? 1 : 2
  const isMyCurrentTurn = currentSeat === mySeat
  const opponentSeats = [0, 1, 2, 3].filter(s => s !== mySeat)

  // Sync local hand preserving user order
  const serverHand = hands[mySeat] || []
  useEffect(() => {
    const serverIds = serverHand.map(t => t.id).sort().join(',')
    if (serverIds === prevHandIdsRef.current && localHand.length > 0) return
    prevHandIdsRef.current = serverIds
    if (localHand.length === 0) { setLocalHand([...serverHand]); return }
    const localIds = new Set(localHand.map(t => t.id))
    const serverIdSet = new Set(serverHand.map(t => t.id))
    const added = serverHand.filter(t => !localIds.has(t.id))
    const kept = localHand.filter(t => serverIdSet.has(t.id))
    setLocalHand([...kept, ...added])
  }, [serverHand])

  const myHand = localHand.length > 0 ? localHand : serverHand
  const winTileCount = 14
  const canWin = myHand.length === winTileCount && okeyCheckWin(myHand, jokerColor, jokerNumber)
  const isJokerTile = useCallback((t: OkeyTile) => !!t.isFalseJoker || (t.color === jokerColor && t.number === jokerNumber), [jokerColor, jokerNumber])

  const groupedIds = useMemo(() => {
    const map = new Map<number, string>()
    if (myHand.length === 0) return map
    const { runs, sets } = detectGroups(myHand, jokerColor, jokerNumber)
    const gc = ['#f472b6', '#60a5fa', '#4ade80', '#a78bfa', '#fb923c', '#22d3ee', '#f87171']
    let ci = 0
    for (const r of runs) { const col = gc[ci++ % gc.length]; for (const id of r) map.set(id, col) }
    for (const s of sets) { const col = gc[ci++ % gc.length]; for (const id of s) if (!map.has(id)) map.set(id, col) }
    return map
  }, [myHand, jokerColor, jokerNumber])

  useEffect(() => {
    if (state && !diffSet && room?.status === 'active' && !state.difficulty) {
      sendAIState({ state: { ...state, difficulty }, currentTurn: seatToTurn(state.currentSeat), status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
      setDiffSet(true)
    }
  }, [state, room])

  useEffect(() => {
    if ((winner !== null || gameOver) && !statsUpdatedRef.current && !isSpectator) {
      statsUpdatedRef.current = true
      const s = getOkeyStats(); s.gamesPlayed++
      if (winner === mySeat) { s.wins++; s.streak++; if (s.streak > s.bestStreak) s.bestStreak = s.streak } else { s.losses++; s.streak = 0 }
      saveOkeyStats(s)
    }
  }, [winner, gameOver])

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(null), 2000) }

  useEffect(() => {
    if (currentSeat !== lastSeatRef.current) {
      setSelectedTile(null); lastSeatRef.current = currentSeat
      if (isMyCurrentTurn && !isSpectator && room.status === 'active' && !winner) showMsg('Sıra sende!')
    }
  }, [currentSeat])

  // AI logic
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || winner || gameOver || currentSeat === mySeat) return
    if (aiRef.current) clearTimeout(aiRef.current)
    aiRef.current = setTimeout(async () => {
      let cs = JSON.parse(JSON.stringify(state))
      let seat = cs.currentSeat; let moves = 0
      while (seat !== mySeat && moves < 12 && !cs.gameOver && !cs.winner) {
        const move = okeyAIMove(cs)
        if (!move) break
        if (move.action === 'draw') { const r = okeyDraw(cs, seat, move.source); if (r.error) break; cs = r.state }
        else if (move.action === 'discard') { const r = okeyDiscard(cs, seat, move.tileId); if (r.error) break; cs = r.state }
        seat = cs.currentSeat; moves++
        await new Promise(r => setTimeout(r, 300))
      }
      for (const s of opponentSeats) {
        if (cs.hands[s] && cs.hands[s].length === winTileCount && okeyCheckWin(cs.hands[s], cs.jokerColor, cs.jokerNumber)) {
          cs.winner = s; cs.gameOver = true; break
        }
      }
      const myWin = cs.winner === mySeat
      await sendAIState({ state: cs, player1Score: myWin ? 1 : 0, player2Score: cs.winner != null && !myWin ? 1 : 0, currentTurn: seatToTurn(cs.currentSeat), status: cs.gameOver ? 'completed' : 'active', winnerId: myWin ? room.player1Id : cs.winner != null ? room.player2Id : null })
    }, 800)
    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state, currentSeat])

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
    const newHand = r.state.hands[mySeat]; let isWin = false
    if (newHand.length === winTileCount && okeyCheckWin(newHand, jokerColor, jokerNumber)) {
      r.state.winner = mySeat; r.state.gameOver = true; isWin = true; if (soundEnabled) playWinSound()
    }
    const myP = playerNum === 1 ? 'player1Score' : 'player2Score'
    const opP = playerNum === 1 ? 'player2Score' : 'player1Score'
    const myId = playerNum === 1 ? room.player1Id : room.player2Id
    await sendAIState({ state: r.state, currentTurn: seatToTurn(r.state.currentSeat), status: isWin || r.state.gameOver ? 'completed' : 'active', [myP]: isWin ? (room[myP] || 0) + 1 : room[myP], [opP]: room[opP], winnerId: isWin ? myId : null })
    setSelectedTile(null)
  }

  const handleTileClick = (tileId: number) => {
    if (!isMyCurrentTurn || isSpectator || room.status !== 'active') return
    if (phase === 'discard') { if (selectedTile === tileId) handleDiscard(tileId); else setSelectedTile(tileId) }
  }

  const handleReorder = (newOrder: OkeyTile[]) => { setLocalHand(newOrder) }

  const getTopDiscard = (seat: number): OkeyTile | null => { const d = discards[seat]; return d?.length > 0 ? d[d.length - 1] : null }
  const prevSeatDiscard = getTopDiscard((mySeat + 3) % 4)
  const showDiffSelector = room?.isAI && room?.status === 'active' && !diffSet && isMyCurrentTurn && pile.length > 90

  const TABLE_BG = '#1a6b7a'
  const FRAME = '#0a2a32'
  const WOOD = 'linear-gradient(180deg, #c8944a 0%, #a67530 40%, #8b5e1a 100%)'

  const gameUI = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99990, background: '#0a1a20', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <LandscapePrompt />

      {/* Difficulty selector overlay */}
      {showDiffSelector && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 200, background: 'rgba(10,26,32,0.95)', padding: 24, borderRadius: 12, border: '1px solid #2a6a7a' }}>
          <div style={{ color: '#7dd3fc', fontSize: 14, marginBottom: 12, textAlign: 'center', fontWeight: 700 }}>Zorluk Seç</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button key={d} onClick={() => { setDifficulty(d); setDiffSet(true); sendAIState({ state: { ...state, difficulty: d }, currentTurn: seatToTurn(mySeat), status: 'active', player1Score: 0, player2Score: 0, winnerId: null }) }}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: difficulty === d ? '#0ea5e9' : '#1e3a4a', border: `1px solid ${difficulty === d ? '#38bdf8' : '#2a5a6a'}`, color: 'white' }}>
                {DIFF_LABELS[d].emoji} {DIFF_LABELS[d].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main game area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Table */}
        <div style={{ flex: 1, display: 'flex', position: 'relative', margin: 4, borderRadius: 8, background: FRAME, border: '3px solid #0d2830', overflow: 'hidden' }}>

          {/* Inner felt */}
          <div style={{ flex: 1, display: 'flex', margin: 4, borderRadius: 6, background: TABLE_BG, position: 'relative', overflow: 'hidden' }}>

            {/* Grid lines */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

            {/* OKEY watermark */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 70, fontWeight: 900, color: 'rgba(255,255,255,0.04)', letterSpacing: 8, pointerEvents: 'none' }}>OKEY</div>

            {/* Left opponent (seat 3) */}
            <div style={{ width: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '4px 2px' }}>
              <span style={{ fontSize: 8, color: SEAT_HEX[opponentSeats[2]], fontWeight: 700, opacity: currentSeat === opponentSeats[2] ? 1 : 0.5 }}>{SEAT_NAMES[opponentSeats[2]].split(' ')[0]}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {Array.from({ length: Math.min(hands[opponentSeats[2]]?.length || 0, 10) }).map((_, i) => <FaceDownTile key={i} size="xs" />)}
              </div>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>({hands[opponentSeats[2]]?.length || 0})</span>
              {getTopDiscard(opponentSeats[2]) && <div style={{ marginTop: 2 }}><Tile tile={getTopDiscard(opponentSeats[2])!} size="xs" isJoker={isJokerTile(getTopDiscard(opponentSeats[2])!)} /></div>}
            </div>

            {/* Center column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

              {/* Top opponent (seat 2) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', minHeight: 36 }}>
                <span style={{ fontSize: 8, color: SEAT_HEX[opponentSeats[1]], fontWeight: 700, opacity: currentSeat === opponentSeats[1] ? 1 : 0.5 }}>{SEAT_NAMES[opponentSeats[1]].split(' ')[0]}</span>
                <div style={{ display: 'flex', gap: 1 }}>
                  {Array.from({ length: Math.min(hands[opponentSeats[1]]?.length || 0, 14) }).map((_, i) => <FaceDownTile key={i} size="xs" />)}
                </div>
                <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>({hands[opponentSeats[1]]?.length || 0})</span>
                {getTopDiscard(opponentSeats[1]) && <Tile tile={getTopDiscard(opponentSeats[1])!} size="xs" isJoker={isJokerTile(getTopDiscard(opponentSeats[1])!)} />}
              </div>

              {/* Center: pile + indicator + discard */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                {/* Pile */}
                <div onClick={() => handleDraw('pile')} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 6, borderRadius: 6,
                  border: `2px solid ${isMyCurrentTurn && phase === 'draw' ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                  cursor: isMyCurrentTurn && phase === 'draw' ? 'pointer' : 'not-allowed',
                  opacity: isMyCurrentTurn && phase === 'draw' ? 1 : 0.4,
                }}>
                  <div style={{ width: 36, height: 50, borderRadius: 5, background: 'linear-gradient(180deg,#1e3a5f,#0f2440)', border: '2px solid #2a4a6a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>{pile.length}</span>
                  </div>
                  <span style={{ fontSize: 8, color: '#7dd3fc' }}>Yığın</span>
                </div>

                {/* Indicator */}
                {indicator && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Tile tile={indicator} size="lg" isJoker={isJokerTile(indicator)} />
                    <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>Gösterge</span>
                    <span style={{ fontSize: 8, color: '#fbbf24', fontWeight: 600 }}>Okey: {indicator.isFalseJoker ? '★' : `${TC[jokerColor]?.name} ${jokerNumber}`}</span>
                  </div>
                )}

                {/* Discard */}
                {prevSeatDiscard ? (
                  <div onClick={() => handleDraw('discard')} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 6, borderRadius: 6,
                    border: `2px solid ${isMyCurrentTurn && phase === 'draw' ? '#4ade80' : 'rgba(255,255,255,0.1)'}`,
                    cursor: isMyCurrentTurn && phase === 'draw' ? 'pointer' : 'not-allowed',
                    opacity: isMyCurrentTurn && phase === 'draw' ? 1 : 0.4,
                  }}>
                    <Tile tile={prevSeatDiscard} size="sm" isJoker={isJokerTile(prevSeatDiscard)} />
                    <span style={{ fontSize: 8, color: '#86efac' }}>Yerden Al</span>
                  </div>
                ) : (
                  <div style={{ width: 40, height: 54, borderRadius: 5, border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)' }}>Atık</span>
                  </div>
                )}
              </div>

              {/* My discards */}
              {getTopDiscard(mySeat) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '2px 0' }}>
                  <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>Attıkların:</span>
                  <div style={{ display: 'flex', gap: 1, maxWidth: 200, overflow: 'hidden' }}>
                    {discards[mySeat].slice(-5).map((t: OkeyTile) => <Tile key={t.id} tile={t} size="xs" isJoker={isJokerTile(t)} />)}
                  </div>
                </div>
              )}

              {/* Status */}
              <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 11, fontWeight: 600 }}>
                {winner !== null ? <span style={{ color: '#fbbf24' }}>🏆 {winner === mySeat ? 'Kazandın!' : `${SEAT_NAMES[winner]} kazandı!`}</span>
                  : gameOver ? <span style={{ color: '#fbbf24' }}>Oyun bitti</span>
                  : <span style={{ color: isMyCurrentTurn ? '#7dd3fc' : '#64748b' }}>{isMyCurrentTurn ? `${phase === 'draw' ? 'Taş Çek' : 'Taş At'}` : `${SEAT_NAMES[currentSeat]} düşünüyor...`}</span>}
              </div>

              {canWin && phase === 'discard' && (
                <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                  style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#4ade80', padding: '2px 12px', background: 'rgba(74,222,128,0.1)', borderRadius: 12, marginBottom: 2, alignSelf: 'center' }}>✨ Kazanabilirsin!</motion.div>
              )}
            </div>

            {/* Right opponent (seat 1) */}
            <div style={{ width: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '4px 2px' }}>
              <span style={{ fontSize: 8, color: SEAT_HEX[opponentSeats[0]], fontWeight: 700, opacity: currentSeat === opponentSeats[0] ? 1 : 0.5 }}>{SEAT_NAMES[opponentSeats[0]].split(' ')[0]}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {Array.from({ length: Math.min(hands[opponentSeats[0]]?.length || 0, 10) }).map((_, i) => <FaceDownTile key={i} size="xs" />)}
              </div>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>({hands[opponentSeats[0]]?.length || 0})</span>
              {getTopDiscard(opponentSeats[0]) && <div style={{ marginTop: 2 }}><Tile tile={getTopDiscard(opponentSeats[0])!} size="xs" isJoker={isJokerTile(getTopDiscard(opponentSeats[0])!)} /></div>}
            </div>
          </div>
        </div>

        {/* ═══ BOTTOM: Player hand on wooden shelf ═══ */}
        <div style={{ flexShrink: 0, position: 'relative' }}>
          <div style={{ background: WOOD, padding: '8px 12px 10px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.15)' }} />

            {/* Hand info */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                {isMyCurrentTurn && <span style={{ animation: 'pulse 1.5s infinite' }}>● </span>}{SEAT_NAMES[mySeat]} ({myHand.length} taş)
              </span>
              {diffSet && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{DIFF_LABELS[stateDiff]?.emoji} {DIFF_LABELS[stateDiff]?.label}</span>}
            </div>

            <TileRack tiles={myHand} selectedTile={selectedTile} onTileClick={handleTileClick}
              isJokerFn={isJokerTile} canWin={canWin} phase={phase} groupedIds={groupedIds} onReorder={handleReorder} />

            {/* Hints */}
            {isMyCurrentTurn && !isSpectator && room.status === 'active' && !winner && !gameOver && (
              <div style={{ textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
                {phase === 'draw' ? 'Yığından veya yerden taş çek' : selectedTile !== null ? 'Tekrar tıkla → at | Başka taşa tıkla → değiştir' : 'Atmak istediğin taşa tıkla'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat */}
      {!room.isAI && room.status === 'active' && room.id && <InGameChat roomId={room.id} />}

      {/* Toast */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 120, left: '50%', transform: 'translateX(-50%)', zIndex: 99995, background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', color: '#fcd34d', padding: '6px 16px', borderRadius: 16, fontSize: 12, fontWeight: 600 }}>
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return <Portal>{gameUI}</Portal>
}
