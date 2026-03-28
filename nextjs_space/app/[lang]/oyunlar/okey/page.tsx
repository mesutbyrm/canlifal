'use client'

import GameShell from '@/components/game-shell'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { okeyDraw, okeyDiscard, okeyCheckWin, okeyAIMove, OkeyTile } from '@/lib/game-logic'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'

// Wrapper to make createPortal compatible with strict React types
function Portal({ children }: { children: React.ReactNode }): JSX.Element | null {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  // eslint-disable-next-line
  const portal: any = createPortal(children as any, document.body)
  return portal
}

/* ══════════════ CONSTANTS ══════════════ */
const COLORS: Record<number, { bg: string; fg: string; border: string; name: string; accent: string }> = {
  0: { bg: '#fee2e2', fg: '#dc2626', border: '#f87171', name: 'Kırmızı', accent: '#fca5a5' },
  1: { bg: '#dbeafe', fg: '#2563eb', border: '#60a5fa', name: 'Mavi', accent: '#93c5fd' },
  2: { bg: '#dcfce7', fg: '#16a34a', border: '#4ade80', name: 'Yeşil', accent: '#86efac' },
  3: { bg: '#f3f4f6', fg: '#1f2937', border: '#9ca3af', name: 'Siyah', accent: '#d1d5db' },
  4: { bg: '#fef3c7', fg: '#b45309', border: '#fbbf24', name: 'Joker', accent: '#fcd34d' },
}
const SEAT_NAMES = ['Sen', 'Doğu 🤖', 'Kuzey 🤖', 'Batı 🤖']
const SEAT_HEX = ['#22d3ee', '#f472b6', '#fbbf24', '#4ade80']
const DIFF_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  easy: { label: 'Kolay', color: '#4ade80', emoji: '🟢' },
  medium: { label: 'Orta', color: '#fbbf24', emoji: '🟡' },
  hard: { label: 'Zor', color: '#ef4444', emoji: '🔴' },
}

/* ══════════════ SOUNDS ══════════════ */
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

/* ══════════════ STATS ══════════════ */
function getOkeyStats() {
  try { return JSON.parse(localStorage.getItem('okey_stats') || '{"wins":0,"losses":0,"streak":0,"bestStreak":0,"gamesPlayed":0}') }
  catch { return { wins: 0, losses: 0, streak: 0, bestStreak: 0, gamesPlayed: 0 } }
}
function saveOkeyStats(s: any) { try { localStorage.setItem('okey_stats', JSON.stringify(s)) } catch {} }

/* ══════════════ GROUP DETECTION ══════════════ */
function detectGroups(hand: OkeyTile[], jc: number, jn: number) {
  const isJ = (t: OkeyTile) => !!t.isFalseJoker || (t.color === jc && t.number === jn)
  const runs: number[][] = []
  const sets: number[][] = []
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

/* ══════════════ 3D TILE ══════════════ */
function Tile3D({ tile, selected, onClick, isJoker, glow, small, groupColor }: {
  tile: OkeyTile; selected?: boolean; onClick?: () => void; isJoker?: boolean; glow?: boolean; small?: boolean; groupColor?: string
}) {
  const c = tile.isFalseJoker ? COLORS[4] : COLORS[tile.color] || COLORS[0]
  const w = small ? 28 : 40; const h = small ? 40 : 56; const fs = small ? 11 : 16
  return (
    <motion.div layout onClick={onClick} whileHover={onClick ? { y: -6, scale: 1.08 } : {}} whileTap={onClick ? { scale: 0.93 } : {}}
      className="relative cursor-pointer select-none flex-shrink-0" style={{ width: w, height: h }}>
      <div className="absolute inset-0 rounded-lg" style={{ background: 'rgba(0,0,0,0.35)', transform: 'translate(2px, 3px)', borderRadius: 8 }} />
      <div className="absolute inset-0 rounded-lg overflow-hidden" style={{
        background: `linear-gradient(145deg, ${c.bg}, ${c.accent})`,
        border: `2px solid ${selected ? '#facc15' : groupColor || c.border}`, borderRadius: 8,
        boxShadow: selected ? '0 0 12px rgba(250,204,21,0.6), inset 0 1px 2px rgba(255,255,255,0.6)'
          : glow ? '0 0 14px rgba(74,222,128,0.5), inset 0 1px 2px rgba(255,255,255,0.6)'
          : 'inset 0 1px 2px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.2)',
        transform: selected ? 'translateY(-8px)' : 'none', transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)', borderRadius: '8px 8px 0 0' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: fs, color: c.fg, textShadow: '0 1px 1px rgba(255,255,255,0.5)' }}>
          {tile.isFalseJoker ? '★' : tile.number}
        </div>
        {!tile.isFalseJoker && <><div style={{ position: 'absolute', top: 2, left: 3, fontSize: small ? 6 : 8, color: c.fg, fontWeight: 700, opacity: 0.5 }}>{tile.number}</div><div style={{ position: 'absolute', bottom: 2, right: 3, fontSize: small ? 6 : 8, color: c.fg, fontWeight: 700, opacity: 0.5, transform: 'rotate(180deg)' }}>{tile.number}</div></>}
      </div>
      {isJoker && !tile.isFalseJoker && <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#facc15', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#78350f', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', zIndex: 10 }}>J</div>}
      {groupColor && !selected && <div className="absolute -inset-1 rounded-xl border-2 pointer-events-none" style={{ borderColor: groupColor, opacity: 0.5 }} />}
    </motion.div>
  )
}

/* ══════════════ OPPONENT AVATAR ══════════════ */
function OpponentAvatar({ seat, tileCount, isCurrent, topDiscard, isJokerFn }: {
  seat: number; tileCount: number; isCurrent: boolean; topDiscard: OkeyTile | null; isJokerFn: (t: OkeyTile) => boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all ${isCurrent ? 'animate-pulse scale-110' : 'opacity-80'}`} style={{
        background: `linear-gradient(135deg, ${SEAT_HEX[seat]}33, ${SEAT_HEX[seat]}11)`,
        borderColor: isCurrent ? SEAT_HEX[seat] : 'rgba(255,255,255,0.15)',
        boxShadow: isCurrent ? `0 0 16px ${SEAT_HEX[seat]}66` : 'none',
      }}>
        🤖
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: SEAT_HEX[seat], color: '#0a0118' }}>{tileCount}</div>
      </div>
      <span className="text-[10px] font-semibold" style={{ color: SEAT_HEX[seat] }}>{SEAT_NAMES[seat]}</span>
      {topDiscard && <div className="flex items-center gap-0.5"><span className="text-[7px] text-amber-400/50">attı</span><Tile3D tile={topDiscard} small isJoker={isJokerFn(topDiscard)} /></div>}
    </div>
  )
}

/* ══════════════ LANDSCAPE PROMPT (Portal) ══════════════ */
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
          <p className="text-fuchsia-300/80 text-sm max-w-[260px]">Okey oyunu yatay modda en iyi şekilde oynanır. Lütfen cihazınızı yatay konuma çevirin.</p>
          <motion.div animate={{ x: [-10, 10, -10] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-4xl">↔️</motion.div>
        </div>
      </div>
    </Portal>
  )
}

/* ══════════════ TILE RACK ══════════════ */
function TileRack({ tiles, selectedTile, onTileClick, isJokerFn, canWin, phase, groupedIds, onReorder }: {
  tiles: OkeyTile[]; selectedTile: number | null; onTileClick: (id: number) => void;
  isJokerFn: (t: OkeyTile) => boolean; canWin: boolean; phase: string;
  groupedIds: Map<number, string>; onReorder: (newOrder: OkeyTile[]) => void;
}) {
  return (
    <div className="w-full">
      <div className="relative mx-auto" style={{ maxWidth: '100%' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 18, background: 'linear-gradient(to bottom, #8B6914, #6B4F0F, #5C430D)', borderRadius: '0 0 12px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1)' }} />
        <div style={{ position: 'absolute', bottom: 14, left: 4, right: 4, height: 6, background: 'linear-gradient(to bottom, #A07D1C, #8B6914)', borderRadius: 2, boxShadow: '0 -1px 3px rgba(0,0,0,0.3)' }} />
        <Reorder.Group axis="x" values={tiles} onReorder={onReorder}
          className="flex flex-wrap justify-center gap-1 px-2 pb-6 pt-1 min-h-[70px]" style={{ position: 'relative', zIndex: 2 }}>
          <AnimatePresence>
            {tiles.map((tile) => (
              <Reorder.Item key={tile.id} value={tile} className="flex-shrink-0" style={{ zIndex: selectedTile === tile.id ? 30 : 1 }}>
                <Tile3D tile={tile} selected={selectedTile === tile.id} onClick={() => onTileClick(tile.id)}
                  isJoker={isJokerFn(tile)} glow={canWin && phase === 'discard' && selectedTile === tile.id}
                  groupColor={groupedIds.get(tile.id)} />
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>
    </div>
  )
}

/* ══════════════ MINI CHAT (inside fullscreen overlay) ══════════════ */
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
    if (!input.trim() || sending) return
    setSending(true)
    try { await fetch(`/api/games/room/${roomId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: input.trim() }) }); setInput('') } catch {}
    setSending(false)
  }

  return (
    <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 50 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} className="relative p-2.5 rounded-full shadow-lg transition" style={{ background: '#6b21a8' }}>
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center font-bold">{unread}</span>}
        </button>
      ) : (
        <div style={{ width: 280, height: 300, background: '#1a0a2e', border: '1px solid rgba(217,70,239,0.3)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(217,70,239,0.2)' }}>
            <span className="text-fuchsia-300 text-xs font-medium">💬 Sohbet</span>
            <button onClick={() => setOpen(false)} className="text-fuchsia-400/60 hover:text-fuchsia-300 text-sm">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" style={{ fontSize: 11 }}>
            {msgs.map((m: any, i: number) => (
              <div key={i}><span className="font-semibold text-fuchsia-300">{m.userName}:</span> <span className="text-fuchsia-100/80">{m.message}</span></div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex gap-1 px-2 py-2" style={{ borderTop: '1px solid rgba(217,70,239,0.15)' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Mesaj..." className="flex-1 px-2 py-1 rounded-lg text-xs text-white placeholder-fuchsia-400/40 outline-none"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }} />
            <button onClick={send} disabled={sending} className="px-2 py-1 rounded-lg text-xs font-medium text-white transition"
              style={{ background: '#7c3aed' }}>Gönder</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════ STATS BAR ══════════════ */
function StatsBar() {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => { setStats(getOkeyStats()) }, [])
  if (!stats || stats.gamesPlayed === 0) return null
  return (
    <div className="flex items-center gap-2 text-[9px] px-2 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
      <span style={{ color: '#4ade80' }}>✅{stats.wins}</span>
      <span style={{ color: '#f87171' }}>❌{stats.losses}</span>
      <span style={{ color: '#fbbf24' }}>🔥{stats.streak}</span>
    </div>
  )
}

/* ══════════════ MAIN PAGE ══════════════ */
export default function OkeyPage() {
  return (
    <GameShell gameType="okey" gameName="Okey" gameEmoji="🀄" gameDesc="Klasik Türk Okey oyunu! 4 kişilik, 106 taş, strateji ve şans." supportsAI={true}>
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState, soundEnabled }) => (
        <OkeyBoard room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator} sendAIState={sendAIState} soundEnabled={soundEnabled} />
      )}
    </GameShell>
  )
}

/* ══════════════ OKEY BOARD ══════════════ */
function OkeyBoard({ room, state, isMyTurn, isSpectator, sendAIState, soundEnabled }: any) {
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

  // Sync local hand with server hand while preserving user's custom order
  const serverHand = hands[0] || []
  useEffect(() => {
    const serverIds = serverHand.map(t => t.id).sort().join(',')
    if (serverIds === prevHandIdsRef.current && localHand.length > 0) return // no change
    prevHandIdsRef.current = serverIds

    if (localHand.length === 0) {
      // First load or reset
      setLocalHand([...serverHand])
      return
    }

    // Find new tiles (added) and removed tiles
    const localIds = new Set(localHand.map(t => t.id))
    const serverIdSet = new Set(serverHand.map(t => t.id))
    const added = serverHand.filter(t => !localIds.has(t.id))
    const kept = localHand.filter(t => serverIdSet.has(t.id))

    // Preserve order: kept tiles in their current position + new tiles appended at end
    setLocalHand([...kept, ...added])
  }, [serverHand])

  const myHand = localHand.length > 0 ? localHand : serverHand
  const winTileCount = 14 // standard okey
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
      const ns = { ...state, difficulty }
      sendAIState({ state: ns, currentTurn: ns.currentSeat === 0 ? 1 : 2, status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
      setDiffSet(true)
    }
  }, [state, room])

  useEffect(() => {
    if ((winner !== null || gameOver) && !statsUpdatedRef.current && !isSpectator) {
      statsUpdatedRef.current = true
      const s = getOkeyStats(); s.gamesPlayed++
      if (winner === 0) { s.wins++; s.streak++; if (s.streak > s.bestStreak) s.bestStreak = s.streak } else { s.losses++; s.streak = 0 }
      saveOkeyStats(s)
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
        if (move.action === 'draw') { const r = okeyDraw(cs, seat, move.source); if (r.error) break; cs = r.state }
        else if (move.action === 'discard') { const r = okeyDiscard(cs, seat, move.tileId); if (r.error) break; cs = r.state }
        seat = cs.currentSeat; moves++
        await new Promise(r => setTimeout(r, 300))
      }
      for (let s = 1; s <= 3; s++) {
        if (cs.hands[s] && cs.hands[s].length === winTileCount && okeyCheckWin(cs.hands[s], cs.jokerColor, cs.jokerNumber)) {
          cs.winner = s; cs.gameOver = true; break
        }
      }
      await sendAIState({ state: cs, player1Score: cs.winner === 0 ? 1 : 0, player2Score: cs.winner && cs.winner > 0 ? 1 : 0, currentTurn: cs.currentSeat === 0 ? 1 : 2, status: cs.gameOver ? 'completed' : 'active', winnerId: cs.winner === 0 ? room.player1Id : cs.winner ? room.player2Id : null })
    }, 800)
    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state, currentSeat])

  const handleDraw = async (source: 'pile' | 'discard') => {
    if (currentSeat !== 0 || phase !== 'draw' || isSpectator || room.status !== 'active') return
    const result = okeyDraw(state, 0, source)
    if (result.error) { showMsg(result.error); return }
    if (soundEnabled) playTileSound()
    // Don't reset localHand - the useEffect sync will handle adding new tile while preserving order
    await sendAIState({ state: result.state, currentTurn: 1, status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null })
  }

  const handleDiscard = async (tileId: number) => {
    if (currentSeat !== 0 || phase !== 'discard' || isSpectator || room.status !== 'active') return
    const result = okeyDiscard(state, 0, tileId)
    if (result.error) { showMsg(result.error); return }
    if (soundEnabled) playTileSound()
    const newHand = result.state.hands[0]
    let isWin = false
    if (newHand.length === winTileCount && okeyCheckWin(newHand, jokerColor, jokerNumber)) {
      result.state.winner = 0; result.state.gameOver = true; isWin = true
      if (soundEnabled) playWinSound()
    }
    await sendAIState({ state: result.state, currentTurn: result.state.currentSeat === 0 ? 1 : 2, status: isWin || result.state.gameOver ? 'completed' : 'active', player1Score: isWin ? 1 : room.player1Score, player2Score: room.player2Score, winnerId: isWin ? room.player1Id : null })
    setSelectedTile(null)
  }

  const handleTileClick = (tileId: number) => {
    if (currentSeat !== 0 || isSpectator || room.status !== 'active') return
    if (phase === 'discard') {
      if (selectedTile === tileId) handleDiscard(tileId)
      else setSelectedTile(tileId)
    }
  }

  const handleReorder = (newOrder: OkeyTile[]) => { setLocalHand(newOrder) }

  const getTopDiscard = (seat: number): OkeyTile | null => {
    const d = discards[seat]; return d && d.length > 0 ? d[d.length - 1] : null
  }
  const prevSeatDiscard = getTopDiscard(3)
  const showDiffSelector = room?.status === 'active' && !diffSet && currentSeat === 0 && pile.length > 90

  // Render fullscreen game overlay via portal to cover navbar completely
  const gameUI = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99990, background: 'linear-gradient(135deg, #0d1117, #1a0e2e, #0d1117)', display: 'flex', flexDirection: 'column' }}>
      <LandscapePrompt />

      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(139,92,246,0.2)', background: 'rgba(0,0,0,0.3)' }}>
        <div className="flex items-center gap-2">
          {indicator && <Tile3D tile={indicator} small isJoker={isJokerTile(indicator)} />}
          <div className="flex flex-col">
            <span className="text-[9px] text-amber-400/70">Okey</span>
            <span className="text-[10px] text-yellow-300 font-bold">{indicator?.isFalseJoker ? '★' : `${COLORS[jokerColor]?.name} ${jokerNumber}`}</span>
          </div>
          <div className="ml-2 text-[10px] text-fuchsia-400/50">Kalan: {pile.length}</div>
        </div>
        <div className="px-3 py-1 rounded-full text-xs font-bold" style={{
          background: currentSeat === 0 ? 'rgba(34,211,238,0.15)' : 'rgba(168,85,247,0.1)',
          color: currentSeat === 0 ? '#22d3ee' : '#c084fc',
          border: `1px solid ${currentSeat === 0 ? 'rgba(34,211,238,0.3)' : 'rgba(168,85,247,0.2)'}`,
        }}>
          {winner !== null ? <span style={{ color: '#facc15' }}>🏆 {SEAT_NAMES[winner]} kazandı!</span>
            : gameOver ? <span style={{ color: '#fbbf24' }}>Oyun bitti - Berabere</span>
            : <span>{SEAT_NAMES[currentSeat]}{currentSeat === 0 ? ` - ${phase === 'draw' ? 'Taş Çek' : 'Taş At'}` : ' düşünüyor...'}</span>}
        </div>
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
              }} className="px-3 py-1 rounded-lg border transition-all text-xs font-bold" style={{
                borderColor: difficulty === d ? '#22d3ee' : 'rgba(139,92,246,0.3)',
                background: difficulty === d ? 'rgba(34,211,238,0.15)' : 'rgba(139,92,246,0.1)',
                color: difficulty === d ? '#22d3ee' : 'rgba(196,181,253,0.5)',
              }}>{DIFF_LABELS[d].emoji} {DIFF_LABELS[d].label}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main game area */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 py-2 overflow-hidden relative">
        <div className="relative w-full max-w-3xl flex-1 flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Opponents */}
          <div className="flex items-start justify-around px-4 py-2">
            <OpponentAvatar seat={3} tileCount={hands[3]?.length || 0} isCurrent={currentSeat === 3} topDiscard={getTopDiscard(3)} isJokerFn={isJokerTile} />
            <OpponentAvatar seat={2} tileCount={hands[2]?.length || 0} isCurrent={currentSeat === 2} topDiscard={getTopDiscard(2)} isJokerFn={isJokerTile} />
            <OpponentAvatar seat={1} tileCount={hands[1]?.length || 0} isCurrent={currentSeat === 1} topDiscard={getTopDiscard(1)} isJokerFn={isJokerTile} />
          </div>

          {/* Center draw area */}
          <div className="flex items-center justify-center gap-6 py-3">
            {/* Pile */}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => handleDraw('pile')} disabled={currentSeat !== 0 || phase !== 'draw' || isSpectator}
              className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all" style={{
                borderColor: currentSeat === 0 && phase === 'draw' && !isSpectator ? 'rgba(34,211,238,0.5)' : 'rgba(139,92,246,0.2)',
                background: currentSeat === 0 && phase === 'draw' && !isSpectator ? 'rgba(34,211,238,0.08)' : 'rgba(139,92,246,0.05)',
                opacity: currentSeat === 0 && phase === 'draw' && !isSpectator ? 1 : 0.4,
                cursor: currentSeat === 0 && phase === 'draw' && !isSpectator ? 'pointer' : 'not-allowed',
              }}>
              <div className="relative">
                <div className="w-10 h-14 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6b21a8, #3b0764)', border: '2px solid rgba(139,92,246,0.5)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                  <span className="text-purple-300/60 text-xs font-bold">{pile.length}</span>
                </div>
                <div className="absolute -top-0.5 -left-0.5 w-10 h-14 rounded-lg -z-10" style={{ background: 'rgba(107,33,168,0.3)', border: '1px solid rgba(139,92,246,0.15)' }} />
              </div>
              <span className="text-[9px] font-medium" style={{ color: 'rgba(34,211,238,0.7)' }}>Yığın</span>
            </motion.button>

            {indicator && <div className="flex flex-col items-center gap-1"><Tile3D tile={indicator} isJoker={isJokerTile(indicator)} /><span className="text-[8px] text-amber-400/50">Gösterge</span></div>}

            {/* Discard */}
            {prevSeatDiscard ? (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => handleDraw('discard')} disabled={currentSeat !== 0 || phase !== 'draw' || isSpectator}
                className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all" style={{
                  borderColor: currentSeat === 0 && phase === 'draw' && !isSpectator ? 'rgba(74,222,128,0.5)' : 'rgba(139,92,246,0.2)',
                  background: currentSeat === 0 && phase === 'draw' && !isSpectator ? 'rgba(74,222,128,0.08)' : 'rgba(139,92,246,0.05)',
                  opacity: currentSeat === 0 && phase === 'draw' && !isSpectator ? 1 : 0.4,
                  cursor: currentSeat === 0 && phase === 'draw' && !isSpectator ? 'pointer' : 'not-allowed',
                }}>
                <Tile3D tile={prevSeatDiscard} isJoker={isJokerTile(prevSeatDiscard)} />
                <span className="text-[9px] font-medium" style={{ color: 'rgba(74,222,128,0.7)' }}>Yerden Al</span>
              </motion.button>
            ) : (
              <div className="w-14 h-20 rounded-xl flex items-center justify-center" style={{ border: '2px dashed rgba(139,92,246,0.15)' }}>
                <span className="text-[8px]" style={{ color: 'rgba(139,92,246,0.25)' }}>Atık</span>
              </div>
            )}
          </div>

          {/* My discards */}
          {getTopDiscard(0) && (
            <div className="flex items-center justify-center gap-1 py-1">
              <span className="text-[8px] text-amber-500/40">Attıkların:</span>
              <div className="flex gap-0.5 overflow-x-auto" style={{ maxWidth: 220 }}>
                {discards[0].slice(-5).map((t: OkeyTile) => <Tile3D key={t.id} tile={t} small isJoker={isJokerTile(t)} />)}
              </div>
            </div>
          )}

          {/* Hints */}
          {currentSeat === 0 && !isSpectator && room.status === 'active' && !winner && !gameOver && (
            <div className="text-center text-[10px] py-1" style={{ color: 'rgba(196,181,253,0.4)' }}>
              {phase === 'draw' ? 'Yığından veya yerden taş çek' : selectedTile !== null ? 'Tekrar tıkla → at | Başka taşa tıkla → değiştir' : 'Atmak istediğin taşa tıkla'}
            </div>
          )}

          {canWin && phase === 'discard' && (
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1 }}
              className="text-center text-xs font-bold py-1 rounded-full mx-auto px-4"
              style={{ color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>✨ Kazanabilirsin!</motion.div>
          )}
        </div>

        {/* In-game chat */}
        {!room.isAI && room.status === 'active' && room.id && <InGameChat roomId={room.id} />}
      </div>

      {/* Bottom rack */}
      <div className="px-2 pb-2 pt-1" style={{ borderTop: '1px solid rgba(139,92,246,0.2)', background: 'rgba(0,0,0,0.25)' }}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-[10px] font-bold" style={{ color: SEAT_HEX[0], opacity: currentSeat === 0 ? 1 : 0.5 }}>
            {currentSeat === 0 && <span className="animate-pulse">● </span>}{SEAT_NAMES[0]} ({myHand.length} taş)
          </span>
          {diffSet && <span className="text-[9px]" style={{ color: DIFF_LABELS[stateDiff]?.color, opacity: 0.6 }}>{DIFF_LABELS[stateDiff]?.emoji} {DIFF_LABELS[stateDiff]?.label}</span>}
        </div>
        <TileRack tiles={myHand} selectedTile={selectedTile} onTileClick={handleTileClick}
          isJokerFn={isJokerTile} canWin={canWin} phase={phase} groupedIds={groupedIds} onReorder={handleReorder} />
      </div>

      {/* Toast */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed left-1/2 -translate-x-1/2 text-xs px-4 py-2 rounded-full"
            style={{ bottom: 140, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d', zIndex: 99995 }}>
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return <Portal>{gameUI}</Portal>
}
