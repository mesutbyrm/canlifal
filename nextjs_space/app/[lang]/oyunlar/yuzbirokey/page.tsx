'use client'

import GameShell from '@/components/game-shell'
import { motion, AnimatePresence } from 'framer-motion'
import {
  okeyDraw, okeyDiscard, okeyCheckWin, okeyAIMove,
  okey101CalcPenalty, okey101NewRound, OkeyTile,
  okey101LayMeld, okey101AddToMeld, okey101AILayMelds, okey101AIAddToMelds,
  Meld,
} from '@/lib/game-logic'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'

function Portal({ children }: { children: React.ReactNode }): JSX.Element | null {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  const portal: any = createPortal(children as any, document.body)
  return portal
}

const TC: Record<number, string> = { 0: '#ef4444', 1: '#3b82f6', 2: '#22c55e', 3: '#1e293b' }
const CLR_NAMES: Record<number, string> = { 0: 'K', 1: 'M', 2: 'Y', 3: 'S' }
const SEAT_NAMES = ['Sen', 'Doğu 🤖', 'Kuzey 🤖', 'Batı 🤖']
const DIFF_LABELS: Record<string, { label: string; emoji: string }> = { easy: { label: 'Kolay', emoji: '🟢' }, medium: { label: 'Orta', emoji: '🟡' }, hard: { label: 'Zor', emoji: '🔴' } }

function playTileSound() { try { const c=new(window.AudioContext||(window as any).webkitAudioContext)();const b=c.createBuffer(1,Math.floor(c.sampleRate*0.06),c.sampleRate);const d=b.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.pow(1-j/d.length,2)*0.3;const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.setValueAtTime(0.15,c.currentTime);const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=1000;s.connect(f);f.connect(g);g.connect(c.destination);s.start()}catch{} }
function playWinSound() { try { const c=new(window.AudioContext||(window as any).webkitAudioContext)();[523,659,784,1047].forEach((fr,i)=>{const o=c.createOscillator();o.type='sine';o.frequency.value=fr;const g=c.createGain();g.gain.setValueAtTime(0.15,c.currentTime+i*0.15);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.15+0.4);o.connect(g);g.connect(c.destination);o.start(c.currentTime+i*0.15);o.stop(c.currentTime+i*0.15+0.5)})}catch{} }
function getStats() { try{return JSON.parse(localStorage.getItem('ybo_stats')||'{"wins":0,"losses":0,"gamesPlayed":0}')}catch{return{wins:0,losses:0,gamesPlayed:0}} }
function saveStats(s:any) { try{localStorage.setItem('ybo_stats',JSON.stringify(s))}catch{} }

/* Sort modes: color, number, runs (seri), pairs (çift) */
function sortTiles(tiles: OkeyTile[], mode: string, jc?: number, jn?: number) {
  const arr = [...tiles]
  if (mode === 'number') return arr.sort((a, b) => (a.isFalseJoker ? 999 : a.number ?? 999) - (b.isFalseJoker ? 999 : b.number ?? 999))
  if (mode === 'color') {
    return arr.sort((a, b) => {
      const ac = a.isFalseJoker ? 99 : a.color; const bc = b.isFalseJoker ? 99 : b.color
      if (ac !== bc) return ac - bc
      return (a.number || 999) - (b.number || 999)
    })
  }
  if (mode === 'runs') {
    // Group by color, then sort by number within each group - ideal for finding runs
    const groups: Record<number, OkeyTile[]> = { 0: [], 1: [], 2: [], 3: [] }
    const jokers: OkeyTile[] = []
    for (const t of arr) {
      if (t.isFalseJoker || (jc !== undefined && jn !== undefined && t.color === jc && t.number === jn)) jokers.push(t)
      else (groups[t.color] || (groups[t.color] = [])).push(t)
    }
    const result: OkeyTile[] = []
    for (const color of [0, 1, 2, 3]) {
      groups[color].sort((a, b) => a.number - b.number)
      result.push(...groups[color])
    }
    result.push(...jokers)
    return result
  }
  if (mode === 'pairs') {
    // Group by number, then sort by color within each group - ideal for finding sets
    const groups: Record<number, OkeyTile[]> = {}
    const jokers: OkeyTile[] = []
    for (const t of arr) {
      if (t.isFalseJoker || (jc !== undefined && jn !== undefined && t.color === jc && t.number === jn)) jokers.push(t)
      else { if (!groups[t.number]) groups[t.number] = []; groups[t.number].push(t) }
    }
    const result: OkeyTile[] = []
    const nums = Object.keys(groups).map(Number).sort((a, b) => a - b)
    for (const n of nums) {
      groups[n].sort((a, b) => a.color - b.color)
      result.push(...groups[n])
    }
    result.push(...jokers)
    return result
  }
  return arr
}

/* Calculate meld value sum */
function calcMeldTotal(melds: Meld[], ownerSeat: number, jc: number, jn: number): number {
  let total = 0
  for (const m of melds) {
    if (m.owner !== ownerSeat) continue
    for (const t of m.tiles) {
      if (t.isFalseJoker || (t.color === jc && t.number === jn)) continue // jokers don't add value for display
      total += t.number || 0
    }
  }
  return total
}

/* ===== TILE ===== */
function Tile({ tile, selected, onClick, small, isJoker, onDoubleClick, isDragging }: {
  tile: OkeyTile; selected?: boolean; onClick?: () => void; small?: boolean; isJoker?: boolean; onDoubleClick?: () => void; isDragging?: boolean
}) {
  const fg = tile.isFalseJoker ? '#d97706' : (TC[tile.color] || TC[0])
  const w = small ? 28 : 44
  const h = small ? 36 : 58
  const fs = small ? 11 : 18
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className="select-none flex-shrink-0 relative"
      style={{
        width: w, height: h,
        borderRadius: small ? 4 : 6,
        background: 'linear-gradient(180deg, #fffff8 0%, #f5f0e0 100%)',
        border: selected ? '2.5px solid #facc15' : isDragging ? '2.5px solid #60a5fa' : '1.5px solid #c8b88a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: selected
          ? '0 0 12px rgba(250,204,21,0.7), 0 4px 8px rgba(0,0,0,0.3)'
          : isDragging
            ? '0 0 16px rgba(96,165,250,0.6), 0 8px 20px rgba(0,0,0,0.4)'
            : isJoker
              ? '0 0 8px rgba(250,204,21,0.4), 0 2px 4px rgba(0,0,0,0.2)'
              : '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
        transform: selected ? 'translateY(-8px)' : isDragging ? 'scale(1.15) translateY(-12px)' : undefined,
        zIndex: selected ? 20 : isDragging ? 50 : 1,
        opacity: isDragging ? 0.85 : 1,
        transition: isDragging ? 'none' : 'all 0.15s',
      }}
    >
      {tile.isFalseJoker ? (
        <span style={{ fontSize: fs, color: fg, fontWeight: 800 }}>★</span>
      ) : (
        <>
          <span style={{ fontSize: small ? 6 : 8, color: fg, fontWeight: 700, lineHeight: 1, opacity: 0.7 }}>{CLR_NAMES[tile.color]}</span>
          <span style={{ fontSize: fs, color: fg, fontWeight: 800, lineHeight: 1.1 }}>{tile.number}</span>
        </>
      )}
      {isJoker && !tile.isFalseJoker && (
        <span style={{ position: 'absolute', top: -3, right: -3, fontSize: 7, background: '#facc15', color: '#78350f', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, border: '1px solid #f59e0b' }}>J</span>
      )}
    </div>
  )
}

/* ===== FACE DOWN TILE ===== */
function FDTile({ small }: { small?: boolean }) {
  const w = small ? 22 : 32
  const h = small ? 30 : 42
  return <div style={{ width: w, height: h, borderRadius: small ? 3 : 5, background: 'linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%)', border: '1.5px solid #3b82f6', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
}

/* ===== MELD GROUP ===== */
function MeldGroup({ meld, isJk, onClick, highlight, idx }: {
  meld: Meld; isJk: (t: OkeyTile) => boolean; onClick?: () => void; highlight?: boolean; idx: number
}) {
  return (
    <div onClick={onClick} className={`inline-flex items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all ${
      highlight ? 'bg-yellow-500/20 border border-yellow-400/50 cursor-pointer hover:bg-yellow-500/30' : 'bg-black/20 border border-white/10'
    }`}>
      <span className="text-[9px] text-white/40 mr-1 font-bold">#{idx+1}</span>
      {meld.tiles.map(t => <Tile key={t.id} tile={t} small isJoker={isJk(t)} />)}
    </div>
  )
}

/* ===== DRAGGABLE RACK ROW ===== */
function DraggableRow({ tiles, sel, toggleTile, hDblTap, isJk, onReorder }: {
  tiles: OkeyTile[]; sel: Set<number>; toggleTile: (id: number) => void; hDblTap: (id: number) => void; isJk: (t: OkeyTile) => boolean; onReorder: (fromId: number, toId: number) => void
}) {
  const [dragId, setDragId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, tileId: number) => {
    setDragId(tileId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(tileId))
  }
  const handleDragOver = (e: React.DragEvent, tileId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (tileId !== dragId) setOverId(tileId)
  }
  const handleDrop = (e: React.DragEvent, toTileId: number) => {
    e.preventDefault()
    const fromId = Number(e.dataTransfer.getData('text/plain'))
    if (fromId && fromId !== toTileId) onReorder(fromId, toTileId)
    setDragId(null)
    setOverId(null)
  }
  const handleDragEnd = () => { setDragId(null); setOverId(null) }

  return (
    <div className="flex flex-wrap gap-[3px] justify-center">
      {tiles.map(tile => (
        <div
          key={tile.id}
          draggable
          onDragStart={(e) => handleDragStart(e, tile.id)}
          onDragOver={(e) => handleDragOver(e, tile.id)}
          onDrop={(e) => handleDrop(e, tile.id)}
          onDragEnd={handleDragEnd}
          style={{ position: 'relative' }}
        >
          {overId === tile.id && dragId !== tile.id && (
            <div style={{ position: 'absolute', left: -2, top: 0, bottom: 0, width: 3, background: '#60a5fa', borderRadius: 2, zIndex: 30 }} />
          )}
          <Tile
            tile={tile}
            selected={sel.has(tile.id)}
            onClick={() => toggleTile(tile.id)}
            onDoubleClick={() => hDblTap(tile.id)}
            isJoker={isJk(tile)}
            isDragging={dragId === tile.id}
          />
        </div>
      ))}
    </div>
  )
}

export default function YuzBirOkeyPage() {
  return (
    <GameShell gameType="yuzbirokey" gameName="Yüz Bir Okey" gameEmoji="🎯" gameDesc="Modern arayüzlü 101 Okey deneyimi. İlk 101 puana ulaşan elenir." supportsAI={true}>
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState, soundEnabled }) => (
        <Board room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator} sendAIState={sendAIState} soundEnabled={soundEnabled} playerNum={playerNum} />
      )}
    </GameShell>
  )
}

function Board({ room, state, isMyTurn, isSpectator, sendAIState, soundEnabled, playerNum }: any) {
  const mySeat: number = room?.isAI ? 0 : (playerNum === 2 ? 1 : 0)
  const opponentSeats = [(mySeat + 1) % 4, (mySeat + 2) % 4, (mySeat + 3) % 4]
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [msg, setMsg] = useState<string | null>(null)
  const [showRE, setShowRE] = useState(false)
  const [diff, setDiff] = useState('medium')
  const [diffSet, setDiffSet] = useState(false)
  const [sortMode, setSortMode] = useState<string>('color')
  const [openMelds, setOpenMelds] = useState<number[][]>([])
  const [manualOrder, setManualOrder] = useState<number[] | null>(null) // for drag reorder
  const aiR = useRef<any>(null)
  const lastSR = useRef<number>(-1)
  const statsR = useRef(false)

  const hands: OkeyTile[][] = state?.hands || [[], [], [], []]
  const discards: OkeyTile[][] = state?.discards || [[], [], [], []]
  const pile: OkeyTile[] = state?.pile || []
  const ind: OkeyTile | null = state?.indicator || null
  const jc: number = state?.jokerColor ?? -1
  const jn: number = state?.jokerNumber ?? -1
  const cs: number = state?.currentSeat ?? 0
  const ph: string = state?.phase || 'draw'
  const win: number | null = state?.winner ?? null
  const gOver: boolean = state?.gameOver ?? false
  const scores: number[] = state?.scores || [0, 0, 0, 0]
  const round: number = state?.round || 1
  const elim: boolean[] = state?.eliminated || [false, false, false, false]
  const melds: Meld[] = state?.melds || []
  const hasOp: boolean[] = state?.hasOpened || [false, false, false, false]

  const s2t = (s: number) => s === 0 ? 1 : 2
  const isMT = cs === mySeat
  const myH = hands[mySeat] || []
  const myOp = hasOp[mySeat]
  const isJk = useCallback((t: OkeyTile) => !!t.isFalseJoker || (t.color === jc && t.number === jn), [jc, jn])

  // Compute displayed hand: manual order or sorted
  const displayedHand = useMemo(() => {
    if (manualOrder) {
      // Map manualOrder ids to tiles, filtering out any that no longer exist
      const tileMap = new Map(myH.map(t => [t.id, t]))
      const ordered = manualOrder.map(id => tileMap.get(id)).filter(Boolean) as OkeyTile[]
      // Add any new tiles not in manualOrder (e.g., just drawn)
      const orderedIds = new Set(manualOrder)
      for (const t of myH) { if (!orderedIds.has(t.id)) ordered.push(t) }
      return ordered
    }
    return sortTiles(myH, sortMode, jc, jn)
  }, [myH, sortMode, manualOrder, jc, jn])

  const canLay = isMT && ph === 'discard' && sel.size >= 3 && !isSpectator
  const canAdd = isMT && ph === 'discard' && sel.size > 0 && myOp && melds.length > 0 && !isSpectator

  // Split hand into two rows for istaka
  const halfLen = Math.ceil(displayedHand.length / 2)
  const topRow = displayedHand.slice(0, halfLen)
  const bottomRow = displayedHand.slice(halfLen)

  // Meld total for my seat
  const myMeldTotal = useMemo(() => calcMeldTotal(melds, mySeat, jc, jn), [melds, mySeat, jc, jn])

  // Handle tile reorder via drag
  const handleReorder = useCallback((fromId: number, toId: number) => {
    const current = manualOrder || displayedHand.map(t => t.id)
    const fromIdx = current.indexOf(fromId)
    const toIdx = current.indexOf(toId)
    if (fromIdx === -1 || toIdx === -1) return
    const newOrder = [...current]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, fromId)
    setManualOrder(newOrder)
  }, [manualOrder, displayedHand])

  // When sort mode changes, clear manual order
  const changeSortMode = (mode: string) => {
    setSortMode(mode)
    setManualOrder(null)
  }

  useEffect(() => { if (state && !diffSet && room?.status === 'active' && !state.difficulty) { sendAIState({ state: { ...state, difficulty: diff }, currentTurn: s2t(state.currentSeat), status: 'active', player1Score: room.player1Score, player2Score: room.player2Score, winnerId: null }); setDiffSet(true) } }, [state, room])
  const showM = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500) }
  useEffect(() => { if (cs !== lastSR.current) { setSel(new Set()); lastSR.current = cs; if (isMT && !isSpectator && room.status === 'active' && !win) showM('Sıra sende!') } }, [cs])

  const procRE = async (c: any, rw: number) => {
    const ns = [...(c.scores || [0,0,0,0])]; const rp = [0,0,0,0]
    for (let s=0;s<4;s++) { if (s===rw||c.eliminated?.[s]) continue; rp[s]=okey101CalcPenalty(c.hands[s]||[],c.jokerColor,c.jokerNumber) }
    const ne=[...(c.eliminated||[false,false,false,false])]
    for (let s=0;s<4;s++){if(ns[s]+rp[s]>=101)ne[s]=true;ns[s]+=rp[s]}
    const ap=ne.filter((e:boolean)=>!e).length
    const rh=[...(c.roundHistory||[]),{round:c.round,winner:rw,penalties:rp}]
    if(ap<=1){const gw=ne.findIndex((e:boolean)=>!e);const fs={...c,scores:ns,eliminated:ne,roundHistory:rh,gameOver:true,winner:gw>=0?gw:rw,roundWinner:rw};if(!statsR.current&&!isSpectator){statsR.current=true;const st=getStats();st.gamesPlayed++;if(gw===mySeat)st.wins++;else st.losses++;saveStats(st)};const mw=gw===mySeat;await sendAIState({state:fs,player1Score:mw&&playerNum===1?1:(!mw&&playerNum!==1?1:0),player2Score:mw&&playerNum===2?1:(!mw&&playerNum!==2?1:0),currentTurn:1,status:'completed',winnerId:mw?(playerNum===1?room.player1Id:room.player2Id):(playerNum===1?room.player2Id:room.player1Id)})}
    else{setShowRE(true);await sendAIState({state:{...c,scores:ns,eliminated:ne,roundHistory:rh,gameOver:false,winner:null,roundWinner:rw,showingRoundResult:true},currentTurn:1,status:'active',player1Score:room.player1Score,player2Score:room.player2Score,winnerId:null})}
  }
  const startNR = async () => { setShowRE(false); setManualOrder(null); const n=okey101NewRound(state); await sendAIState({state:n,currentTurn:s2t(n.currentSeat),status:'active',player1Score:room.player1Score,player2Score:room.player2Score,winnerId:null}) }

  // AI - with robust error recovery to prevent getting stuck
  useEffect(() => {
    if(!room.isAI||room.status!=='active'||gOver||state?.showingRoundResult||win!==null||cs===mySeat)return
    if(aiR.current)clearTimeout(aiR.current)
    aiR.current=setTimeout(async()=>{
      try {
        let c=JSON.parse(JSON.stringify(state));let seat=c.currentSeat;let mv=0;let stuck=0
        while(seat!==mySeat&&mv<30&&!c.gameOver&&c.winner===null&&stuck<3){
          if(c.eliminated?.[seat]){c.currentSeat=(seat+1)%4;c.phase='draw';seat=c.currentSeat;continue}
          if(c.phase==='draw'){
            const m=okeyAIMove(c)
            if(!m||m.action!=='draw'){
              // Fallback: draw from pile
              const r=okeyDraw(c,seat,'pile')
              if(r.error){c.currentSeat=(seat+1)%4;c.phase='draw';seat=c.currentSeat;stuck++;continue}
              c=r.state;mv++
            } else {
              const r=okeyDraw(c,seat,m.source)
              if(r.error){
                // Try pile as fallback
                const r2=okeyDraw(c,seat,'pile')
                if(r2.error){c.currentSeat=(seat+1)%4;c.phase='draw';seat=c.currentSeat;stuck++;continue}
                c=r2.state;mv++
              } else {c=r.state;mv++}
            }
            await new Promise(r=>setTimeout(r,200))
          } else {
            // Discard phase
            let mr=okey101AILayMelds(c,seat);if(mr){c=mr;if(c.hands[seat].length===0){await procRE(c,seat);return}}
            let ar=okey101AIAddToMelds(c,seat);if(ar){c=ar;if(c.hands[seat].length===0){await procRE(c,seat);return}}
            const m=okeyAIMove(c)
            if(m&&m.action==='discard'){
              const r=okeyDiscard(c,seat,m.tileId)
              if(r.error){
                // Fallback: discard first non-joker tile
                const hand=c.hands[seat]||[]
                const fallbackTile=hand.find((t:OkeyTile)=>!t.isFalseJoker&&!(t.color===c.jokerColor&&t.number===c.jokerNumber))||hand[0]
                if(fallbackTile){
                  const r2=okeyDiscard(c,seat,fallbackTile.id)
                  if(r2.error){c.currentSeat=(seat+1)%4;c.phase='draw';seat=c.currentSeat;stuck++;continue}
                  c=r2.state;mv++
                } else {c.currentSeat=(seat+1)%4;c.phase='draw';seat=c.currentSeat;stuck++;continue}
              } else {c=r.state;mv++}
            } else {
              // Fallback: force discard first available tile
              const hand=c.hands[seat]||[]
              const fallbackTile=hand.find((t:OkeyTile)=>!t.isFalseJoker&&!(t.color===c.jokerColor&&t.number===c.jokerNumber))||hand[0]
              if(fallbackTile){
                const r=okeyDiscard(c,seat,fallbackTile.id)
                if(r.error){c.currentSeat=(seat+1)%4;c.phase='draw';seat=c.currentSeat;stuck++;continue}
                c=r.state;mv++
              } else {c.currentSeat=(seat+1)%4;c.phase='draw';seat=c.currentSeat;stuck++;continue}
            }
            await new Promise(r=>setTimeout(r,200))
          }
          seat=c.currentSeat
        }
        await sendAIState({state:c,player1Score:room.player1Score,player2Score:room.player2Score,currentTurn:s2t(c.currentSeat),status:'active',winnerId:null})
      } catch(err) {
        console.error('AI error:', err)
        // Emergency: advance turn to player
        const c=JSON.parse(JSON.stringify(state))
        c.currentSeat=mySeat;c.phase='draw'
        await sendAIState({state:c,player1Score:room.player1Score,player2Score:room.player2Score,currentTurn:s2t(mySeat),status:'active',winnerId:null})
      }
    },800)
    return()=>{if(aiR.current)clearTimeout(aiR.current)}
  },[room,state,cs])

  const hDraw=async(src:'pile'|'discard')=>{if(!isMT||ph!=='draw'||isSpectator||room.status!=='active')return;const r=okeyDraw(state,mySeat,src);if(r.error){showM(r.error);return};if(soundEnabled)playTileSound();await sendAIState({state:r.state,currentTurn:s2t(mySeat),status:'active',player1Score:room.player1Score,player2Score:room.player2Score,winnerId:null})}
  const hDiscard=async(tid:number)=>{if(!isMT||ph!=='discard'||isSpectator||room.status!=='active')return;const r=okeyDiscard(state,mySeat,tid);if(r.error){showM(r.error);return};if(soundEnabled)playTileSound();if(r.state.hands[mySeat].length===0){if(soundEnabled)playWinSound();await procRE(r.state,mySeat)}else await sendAIState({state:r.state,currentTurn:s2t(r.state.currentSeat),status:'active',player1Score:room.player1Score,player2Score:room.player2Score,winnerId:null});setSel(new Set())}
  const toggleTile=(tid:number)=>{if(!isMT||isSpectator||room.status!=='active'||ph!=='discard')return;setSel(p=>{const n=new Set(p);if(n.has(tid))n.delete(tid);else n.add(tid);return n})}
  const hDblTap=(tid:number)=>{if(!isMT||ph!=='discard'||isSpectator)return;hDiscard(tid)}

  const hLay=async()=>{if(!isMT||ph!=='discard'){showM('Sıra sende değil!');return};if(openMelds.length===0 && sel.size>=3){const r=okey101LayMeld(state,mySeat,[Array.from(sel)]);if(r.error){showM(r.error);return};if(soundEnabled)playTileSound();if(r.state.hands[mySeat].length===0){if(soundEnabled)playWinSound();await procRE(r.state,mySeat)}else await sendAIState({state:r.state,currentTurn:s2t(mySeat),status:'active',player1Score:room.player1Score,player2Score:room.player2Score,winnerId:null});setSel(new Set());return}
    if(openMelds.length>0){const r=okey101LayMeld(state,mySeat,openMelds);if(r.error){showM(r.error);return};if(soundEnabled)playTileSound();setOpenMelds([]);if(r.state.hands[mySeat].length===0){if(soundEnabled)playWinSound();await procRE(r.state,mySeat)}else await sendAIState({state:r.state,currentTurn:s2t(mySeat),status:'active',player1Score:room.player1Score,player2Score:room.player2Score,winnerId:null});setSel(new Set());return}
    showM('En az 3 taş seç veya taslak oluştur!')}
  const hAdd=async(mi:number)=>{if(!isMT||ph!=='discard'||sel.size===0||!myOp){showM(myOp?'Taş seç!':'Önce açıl!');return};const r=okey101AddToMeld(state,mySeat,Array.from(sel),mi);if(r.error){showM(r.error);return};if(soundEnabled)playTileSound();if(r.state.hands[mySeat].length===0){if(soundEnabled)playWinSound();await procRE(r.state,mySeat)}else await sendAIState({state:r.state,currentTurn:s2t(mySeat),status:'active',player1Score:room.player1Score,player2Score:room.player2Score,winnerId:null});setSel(new Set())}

  const addDraft=()=>{if(sel.size<3){showM('En az 3 taş seç');return};setOpenMelds(p=>[...p,Array.from(sel)]);setSel(new Set())}

  const topD=(s:number):OkeyTile|null=>{const d=discards[s];return d?.length>0?d[d.length-1]:null}
  const prevD=topD((mySeat+3)%4)
  const showDS=room?.isAI&&room?.status==='active'&&!diffSet&&round===1&&isMT&&pile.length>90

  const ui = (
    <div className="fixed inset-0 z-[99998] overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #1a472a 0%, #0d2818 50%, #061210 100%)', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* ===== TOP BAR ===== */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-white">🎯 Yüz Bir Okey</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-semibold">El {round}</span>
          {myMeldTotal > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/30 font-bold">
              Perlerim: {myMeldTotal} puan
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${
            isMT ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' : 'bg-white/10 text-white/60 border border-white/10'
          }`}>
            {isMT ? '✔ Senin sıran' : `${SEAT_NAMES[cs]} oynuyor...`}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 font-semibold">
            {ph === 'draw' ? '📥 Çek' : '📤 At/Aç'}
          </span>
        </div>
      </div>

      {/* ===== MAIN AREA ===== */}
      <div className="flex flex-col h-[calc(100%-40px)]">

        {/* ===== OPPONENTS + TABLE (top section) ===== */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* OPPONENT STRIP */}
          <div className="flex items-stretch gap-2 px-3 py-2">
            {opponentSeats.map(seat => {
              if (elim[seat]) return (
                <div key={seat} className="flex-1 rounded-xl bg-red-900/20 border border-red-500/20 px-3 py-1.5 opacity-50">
                  <div className="text-[10px] font-bold text-red-400">{SEAT_NAMES[seat]} - ELENDİ</div>
                </div>
              )
              const active = seat === cs
              const hLen = hands[seat]?.length || 0
              const lastD = topD(seat)
              return (
                <div key={seat} className={`flex-1 rounded-xl px-3 py-1.5 transition-all ${
                  active ? 'bg-emerald-500/15 border border-emerald-400/40' : 'bg-black/20 border border-white/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-white">{SEAT_NAMES[seat]}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-bold">{hLen}</span>
                      {hasOp[seat] && <span className="text-[8px] text-emerald-400">✓Açık</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-extrabold ${scores[seat] >= 80 ? 'text-red-400' : 'text-white/80'}`}>{scores[seat]}</span>
                      {lastD && <Tile tile={lastD} small isJoker={isJk(lastD)} />}
                    </div>
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: Math.min(hLen, 14) }).map((_, i) => <FDTile key={i} small />)}
                    {hLen > 14 && <span className="text-[8px] text-white/30 self-center ml-0.5">+{hLen - 14}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* SCORE BADGES */}
          <div className="flex items-center justify-center gap-3 px-3 py-1">
            {SEAT_NAMES.map((name, i) => (
              <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                elim[i] ? 'bg-red-900/30 border border-red-500/30 text-red-400 line-through' :
                i === mySeat ? 'bg-yellow-500/20 border border-yellow-400/30 text-yellow-200' :
                'bg-white/5 border border-white/10 text-white/60'
              }`}>
                <span>{name.split(' ')[0]}</span>
                <span className={`text-sm font-extrabold ${scores[i] >= 80 ? 'text-red-400' : ''}`}>{scores[i]}</span>
                {i === mySeat && <span>🏠</span>}
                {elim[i] && <span>💀</span>}
              </div>
            ))}
          </div>

          {/* TABLE CENTER - Melds + Info */}
          <div className="flex-1 min-h-0 px-3 pb-1 overflow-auto">
            <div className="rounded-2xl border border-emerald-700/40 bg-emerald-900/20 p-3 h-full">
              {melds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {melds.map((m, i) => (
                    <MeldGroup key={i} meld={m} isJk={isJk} idx={i}
                      onClick={canAdd ? () => hAdd(i) : undefined}
                      highlight={canAdd && sel.size > 0}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-white/20 text-sm">
                  Masada henüz açılmış per yok
                </div>
              )}

              {openMelds.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-yellow-300/70 font-bold">📋 Taslak Perler</span>
                    <button onClick={() => setOpenMelds([])} className="text-[9px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition">Temizle</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {openMelds.map((meldIds, idx) => {
                      const tiles = meldIds.map(id => myH.find(h => h.id === id)).filter(Boolean) as OkeyTile[]
                      return (
                        <div key={idx} className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-400/30">
                          <span className="text-[9px] text-yellow-300/50 mr-1">T{idx + 1}</span>
                          {tiles.map(t => <Tile key={t.id} tile={t} small isJoker={isJk(t)} />)}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== BOTTOM: ISTAKA (double rack) with side features ===== */}
        <div className="flex-shrink-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
          <div className="flex items-stretch gap-2 px-2 pb-2 pt-1">

            {/* === LEFT SIDE: Gösterge + Çekme === */}
            <div className="flex-shrink-0 flex flex-col gap-1.5 w-[90px] md:w-[110px]">
              <div className="rounded-xl bg-black/40 border border-amber-500/30 p-2 text-center">
                <div className="text-[8px] text-amber-300/60 font-bold mb-1">GÖSTERGE</div>
                {ind ? <div className="flex justify-center"><Tile tile={ind} isJoker={isJk(ind)} /></div> : <div className="text-white/30 text-xs">-</div>}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => hDraw('pile')}
                  disabled={!isMT || ph !== 'draw'}
                  className="w-full py-2 rounded-lg text-[10px] font-bold transition-all bg-blue-600/80 hover:bg-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed border border-blue-400/30"
                >
                  📥 Ortadan ({pile.length})
                </button>
                <button
                  onClick={() => hDraw('discard')}
                  disabled={!isMT || ph !== 'draw' || !prevD}
                  className="w-full py-2 rounded-lg text-[10px] font-bold transition-all bg-teal-600/80 hover:bg-teal-500 text-white disabled:opacity-30 disabled:cursor-not-allowed border border-teal-400/30"
                >
                  📤 Yerden
                </button>
              </div>
              {prevD && (
                <div className="rounded-lg bg-black/30 border border-white/10 p-1.5 flex flex-col items-center">
                  <div className="text-[7px] text-white/40 mb-0.5">İSKARTA</div>
                  <Tile tile={prevD} small isJoker={isJk(prevD)} />
                </div>
              )}
            </div>

            {/* === CENTER: DOUBLE RACK (İSTAKA) === */}
            <div className="flex-1 min-w-0">
              <div className="rounded-2xl border-2 border-amber-700/50 bg-gradient-to-b from-amber-900/30 via-amber-950/40 to-amber-950/50 p-1.5 shadow-inner" style={{ boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)' }}>
                {/* Info bar with sort modes */}
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[9px] text-amber-200/60 font-bold">ELİM ({myH.length} taş) {sel.size > 0 && `• ${sel.size} seçili`}</span>
                  <div className="flex gap-1">
                    {[
                      { key: 'color', label: 'Renk' },
                      { key: 'number', label: 'Sayı' },
                      { key: 'runs', label: 'Seri' },
                      { key: 'pairs', label: 'Çift' },
                    ].map(m => (
                      <button key={m.key} onClick={() => changeSortMode(m.key)} className={`px-2 py-0.5 rounded text-[8px] font-bold transition ${sortMode === m.key && !manualOrder ? 'bg-amber-500/40 text-amber-200' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>{m.label}</button>
                    ))}
                  </div>
                </div>

                {/* Upper rack row */}
                <div className="rounded-xl bg-gradient-to-b from-amber-800/30 to-amber-900/20 border border-amber-700/30 px-2 py-1.5 mb-1 min-h-[62px]" style={{ boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)' }}>
                  <DraggableRow tiles={topRow} sel={sel} toggleTile={toggleTile} hDblTap={hDblTap} isJk={isJk} onReorder={handleReorder} />
                </div>

                {/* Lower rack row */}
                <div className="rounded-xl bg-gradient-to-b from-amber-800/30 to-amber-900/20 border border-amber-700/30 px-2 py-1.5 min-h-[62px]" style={{ boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)' }}>
                  <DraggableRow tiles={bottomRow} sel={sel} toggleTile={toggleTile} hDblTap={hDblTap} isJk={isJk} onReorder={handleReorder} />
                </div>
              </div>
            </div>

            {/* === RIGHT SIDE: Aksiyonlar === */}
            <div className="flex-shrink-0 flex flex-col gap-1.5 w-[90px] md:w-[110px]">
              <div className="rounded-xl bg-black/40 border border-white/10 p-2 text-center">
                <div className="text-[8px] text-white/40 font-bold mb-0.5">DURUM</div>
                <div className={`text-[10px] font-bold ${myOp ? 'text-emerald-300' : 'text-orange-300'}`}>
                  {myOp ? '✅ Açık' : '🔒 Kapalı'}
                </div>
                <div className="text-[9px] text-white/40 mt-0.5">
                  Skor: <span className={`font-bold ${scores[mySeat] >= 80 ? 'text-red-400' : 'text-white'}`}>{scores[mySeat]}</span>
                </div>
                {myMeldTotal > 0 && (
                  <div className="text-[9px] text-fuchsia-300 mt-0.5 font-bold">
                    Per: {myMeldTotal}p
                  </div>
                )}
              </div>
              <button
                onClick={addDraft}
                disabled={sel.size < 3 || ph !== 'discard' || !isMT}
                className="w-full py-2 rounded-lg text-[10px] font-bold transition-all bg-violet-600/80 hover:bg-violet-500 text-white disabled:opacity-30 disabled:cursor-not-allowed border border-violet-400/30"
              >
                📋 Taslak Ekle
              </button>
              <button
                onClick={hLay}
                disabled={!isMT || ph !== 'discard' || (sel.size < 3 && openMelds.length === 0)}
                className="w-full py-2 rounded-lg text-[10px] font-bold transition-all bg-fuchsia-600/90 hover:bg-fuchsia-500 text-white disabled:opacity-30 disabled:cursor-not-allowed border border-fuchsia-400/30 shadow-lg shadow-fuchsia-500/20"
              >
                🃏 Aç / Gönder
              </button>
              <button
                onClick={() => { if (sel.size !== 1) { showM('1 taş seç'); return }; hDiscard(Array.from(sel)[0]) }}
                disabled={!isMT || ph !== 'discard' || sel.size !== 1}
                className="w-full py-2 rounded-lg text-[10px] font-bold transition-all bg-rose-600/90 hover:bg-rose-500 text-white disabled:opacity-30 disabled:cursor-not-allowed border border-rose-400/30 shadow-lg shadow-rose-500/20"
              >
                🗑️ Taş At
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== OVERLAYS ===== */}

      {showDS && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl border border-emerald-400/30 bg-[#0d2818] p-8 text-center shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5">Zorluk Seç</h3>
            <div className="flex gap-3">
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <button key={d} onClick={() => { setDiff(d); setDiffSet(true); sendAIState({ state: { ...state, difficulty: d }, currentTurn: 1, status: 'active', player1Score: 0, player2Score: 0, winnerId: null }) }}
                  className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${diff === d ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {DIFF_LABELS[d].emoji} {DIFF_LABELS[d].label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {(state?.showingRoundResult || showRE) && !gOver && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl border border-yellow-400/40 bg-[#0d2818] p-8 text-center shadow-2xl min-w-[320px]">
            <h3 className="text-xl font-bold text-yellow-300 mb-3">🏆 Raunt {round} Bitti!</h3>
            <p className="text-sm text-white/70 mb-5">{SEAT_NAMES[state?.roundWinner ?? 0]} kazandı!</p>
            {state?.roundHistory?.length > 0 && (
              <div className="flex gap-4 justify-center mb-5">
                {SEAT_NAMES.map((n, i) => { const lr = state.roundHistory[state.roundHistory.length - 1]; return (
                  <div key={i} className="text-center">
                    <div className="text-[10px] text-white/50">{n.split(' ')[0]}</div>
                    <div className="text-lg font-bold text-red-400">+{lr?.penalties?.[i] || 0}</div>
                  </div>
                ) })}
              </div>
            )}
            <button onClick={startNR} className="rounded-2xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-all shadow-lg">Sonraki Raunt →</button>
          </motion.div>
        </div>
      )}

      {gOver && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl border border-yellow-400/40 bg-[#0d2818] p-8 text-center shadow-2xl min-w-[360px]">
            <h3 className="text-2xl font-bold text-yellow-300 mb-3">🎉 Oyun Bitti!</h3>
            <p className="text-sm text-white/70 mb-5">{SEAT_NAMES[win ?? 0]} kazandı!</p>
            <div className="flex gap-3 justify-center">
              {SEAT_NAMES.map((n, i) => (
                <div key={i} className={`text-center px-4 py-3 rounded-xl ${
                  i === win ? 'bg-yellow-400/15 border-2 border-yellow-400' : 'bg-white/5 border-2 border-white/10'
                }`}>
                  <div className="text-[10px] font-bold text-white/60">{n.split(' ')[0]}</div>
                  <div className="text-2xl font-extrabold text-white">{scores[i]}</div>
                  {i === win && <div className="text-[10px] text-yellow-400">🏆</div>}
                  {elim[i] && i !== win && <div className="text-[8px] text-red-400 font-bold">ELENDİ</div>}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>{msg && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[99999] rounded-2xl bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 px-5 py-2.5 text-xs font-semibold shadow-lg backdrop-blur">
          {msg}
        </motion.div>
      )}</AnimatePresence>
    </div>
  )

  return <Portal>{ui}</Portal>
}
