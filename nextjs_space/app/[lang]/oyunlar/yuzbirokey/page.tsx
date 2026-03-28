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
import { Crown, Users, MessageCircle, Play, Sparkles, Layers } from 'lucide-react'

function Portal({ children }: { children: React.ReactNode }): JSX.Element | null {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  const portal: any = createPortal(children as any, document.body)
  return portal
}

const TC: Record<number, string> = { 0: '#dc2626', 1: '#2563eb', 2: '#16a34a', 3: '#1f2937', 4: '#b45309' }
const CLR_MAP: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: 'bg-red-500/20', border: 'border-red-400', text: 'text-red-100' },
  1: { bg: 'bg-blue-500/20', border: 'border-blue-400', text: 'text-blue-100' },
  2: { bg: 'bg-emerald-500/20', border: 'border-emerald-400', text: 'text-emerald-100' },
  3: { bg: 'bg-zinc-700/60', border: 'border-zinc-400', text: 'text-white' },
  4: { bg: 'bg-amber-500/20', border: 'border-amber-300', text: 'text-amber-100' },
}
const CLR_NAMES: Record<number, string> = { 0: 'Kırmızı', 1: 'Mavi', 2: 'Yeşil', 3: 'Siyah' }
const SEAT_NAMES = ['Sen', 'Doğu 🤖', 'Kuzey 🤖', 'Batı 🤖']
const DIFF_LABELS: Record<string, { label: string; emoji: string }> = { easy: { label: 'Kolay', emoji: '🟢' }, medium: { label: 'Orta', emoji: '🟡' }, hard: { label: 'Zor', emoji: '🔴' } }

function playTileSound() { try { const c=new(window.AudioContext||(window as any).webkitAudioContext)();const b=c.createBuffer(1,Math.floor(c.sampleRate*0.06),c.sampleRate);const d=b.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.pow(1-j/d.length,2)*0.3;const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.setValueAtTime(0.15,c.currentTime);const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=1000;s.connect(f);f.connect(g);g.connect(c.destination);s.start()}catch{} }
function playWinSound() { try { const c=new(window.AudioContext||(window as any).webkitAudioContext)();[523,659,784,1047].forEach((fr,i)=>{const o=c.createOscillator();o.type='sine';o.frequency.value=fr;const g=c.createGain();g.gain.setValueAtTime(0.15,c.currentTime+i*0.15);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.15+0.4);o.connect(g);g.connect(c.destination);o.start(c.currentTime+i*0.15);o.stop(c.currentTime+i*0.15+0.5)})}catch{} }
function getStats() { try{return JSON.parse(localStorage.getItem('ybo_stats')||'{"wins":0,"losses":0,"gamesPlayed":0}')}catch{return{wins:0,losses:0,gamesPlayed:0}} }
function saveStats(s:any) { try{localStorage.setItem('ybo_stats',JSON.stringify(s))}catch{} }

/* ===== TILE COMPONENT (shared code style) ===== */
function Tile({ tile, selected, onClick, small = false, glow = false }: {
  tile: OkeyTile; selected?: boolean; onClick?: () => void; small?: boolean; glow?: boolean
}) {
  const clr = tile.isFalseJoker ? CLR_MAP[4] : (CLR_MAP[tile.color] || CLR_MAP[0])
  return (
    <button
      onClick={onClick}
      className={[
        'select-none rounded-2xl border shadow-lg transition-all duration-200 font-bold flex flex-col items-center justify-center',
        small ? 'h-11 w-9 text-[10px]' : 'h-16 w-12 text-sm md:h-[72px] md:w-14',
        clr.bg, clr.border, clr.text,
        selected ? 'scale-105 ring-2 ring-yellow-300/80 -translate-y-2 shadow-yellow-400/30' : 'hover:-translate-y-1',
        glow ? 'ring-1 ring-emerald-400/60 shadow-emerald-400/20' : '',
      ].join(' ')}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {tile.isFalseJoker ? (
        <><span className="text-[8px] uppercase">Sahte</span><span className="text-[8px]">Okey</span></>
      ) : (
        <><span className={`uppercase ${small ? 'text-[7px]' : 'text-[9px]'}`}>{CLR_NAMES[tile.color] || ''}</span><span className={small ? 'text-base font-extrabold' : 'text-lg md:text-xl font-extrabold'}>{tile.number}</span></>
      )}
    </button>
  )
}

/* ===== FACE DOWN TILE ===== */
function FDTile({ small = false }: { small?: boolean }) {
  return <div className={`rounded-xl bg-gradient-to-b from-indigo-800 to-indigo-950 border border-indigo-600/50 shadow-md ${small ? 'h-9 w-7' : 'h-12 w-9'}`} />
}

/* ===== MELD PREVIEW ===== */
function MeldPreview({ meld, title, isJk, onClick, highlight }: {
  meld: Meld; title: string; isJk: (t: OkeyTile) => boolean; onClick?: () => void; highlight?: boolean
}) {
  return (
    <div onClick={onClick} className={`rounded-2xl border p-2.5 transition-all ${
      highlight ? 'border-yellow-400/50 bg-yellow-500/10 cursor-pointer hover:bg-yellow-500/15' : 'border-white/10 bg-white/5'
    }`}>
      <div className="mb-1.5 text-[10px] text-white/60 font-semibold">{title}</div>
      <div className="flex flex-wrap gap-1">
        {meld.tiles.map(t => <Tile key={t.id} tile={t} small glow={isJk(t)} />)}
      </div>
    </div>
  )
}

/* ===== SORT ===== */
function sortTiles(tiles: OkeyTile[], mode: string) {
  const arr = [...tiles]
  if (mode === 'number') return arr.sort((a, b) => (a.isFalseJoker ? 999 : a.number ?? 999) - (b.isFalseJoker ? 999 : b.number ?? 999))
  if (mode === 'color') {
    const order: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 4 }
    return arr.sort((a, b) => {
      const ac = order[a.color] || 99; const bc = order[b.color] || 99
      if (ac !== bc) return ac - bc
      return (a.number || 999) - (b.number || 999)
    })
  }
  return arr
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
  const sortedHand = useMemo(() => sortTiles(myH, sortMode), [myH, sortMode])
  const selectedIds = useMemo(() => Array.from(sel), [sel])
  const currentPlayerId = cs
  const canLay = isMT && ph === 'discard' && sel.size >= 3 && !isSpectator
  const canAdd = isMT && ph === 'discard' && sel.size > 0 && myOp && melds.length > 0 && !isSpectator

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
  const startNR = async () => { setShowRE(false); const n=okey101NewRound(state); await sendAIState({state:n,currentTurn:s2t(n.currentSeat),status:'active',player1Score:room.player1Score,player2Score:room.player2Score,winnerId:null}) }

  // AI
  useEffect(() => {
    if(!room.isAI||room.status!=='active'||gOver||state?.showingRoundResult||win!==null||cs===mySeat)return
    if(aiR.current)clearTimeout(aiR.current)
    aiR.current=setTimeout(async()=>{
      let c=JSON.parse(JSON.stringify(state));let seat=c.currentSeat;let mv=0
      while(seat!==mySeat&&mv<20&&!c.gameOver&&c.winner===null){
        if(c.eliminated?.[seat]){c.currentSeat=(seat+1)%4;seat=c.currentSeat;continue}
        if(c.phase==='draw'){const m=okeyAIMove(c);if(!m||m.action!=='draw')break;const r=okeyDraw(c,seat,m.source);if(r.error)break;c=r.state;mv++;await new Promise(r=>setTimeout(r,200))}
        else{let mr=okey101AILayMelds(c,seat);if(mr){c=mr;if(c.hands[seat].length===0){await procRE(c,seat);return}};let ar=okey101AIAddToMelds(c,seat);if(ar){c=ar;if(c.hands[seat].length===0){await procRE(c,seat);return}};const m=okeyAIMove(c);if(!m||m.action!=='discard')break;const r=okeyDiscard(c,seat,m.tileId);if(r.error)break;c=r.state;mv++;await new Promise(r=>setTimeout(r,200))}
        seat=c.currentSeat
      }
      await sendAIState({state:c,player1Score:room.player1Score,player2Score:room.player2Score,currentTurn:s2t(c.currentSeat),status:'active',winnerId:null})
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
    <div className="fixed inset-0 z-[99998] bg-[radial-gradient(circle_at_top,#1e293b,#0f172a_45%,#020617)] text-white overflow-auto" style={{fontFamily:'system-ui,-apple-system,sans-serif'}}>
      <div className="p-3 md:p-4 mx-auto max-w-7xl">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">

          {/* === LEFT COLUMN === */}
          <div className="space-y-3">

            {/* HEADER CARD */}
            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className="flex items-center gap-2 text-xl md:text-2xl font-bold"><Crown className="h-5 w-5 md:h-6 md:w-6 text-yellow-400" /> Yüz Bir Okey</h1>
                  <p className="mt-1 text-xs text-white/60">Modern arayüzlü 101 Okey · GameShell entegreli</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold">{room?.status === 'active' ? 'Oyunda' : 'Bekliyor'}</span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold">El {round}/3</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${isMT ? 'bg-emerald-500/30 border border-emerald-400/50 text-emerald-200' : 'bg-zinc-700/50 border border-zinc-500/30 text-zinc-300'}`}>
                    {isMT ? '✔ Senin sıran' : `${SEAT_NAMES[cs]} düşünüyor...`}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* MASA BİLGİLERİ */}
            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.05}} className="rounded-3xl border border-white/10 bg-emerald-500/10 shadow-2xl backdrop-blur p-4">
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[10px] text-white/50 mb-0.5">Gösterge</div>
                  <div className="font-bold text-sm">{ind ? <Tile tile={ind} small glow={isJk(ind)} /> : '-'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[10px] text-white/50 mb-0.5">İskarta Üstü</div>
                  <div className="font-bold text-sm">{prevD ? <Tile tile={prevD} small glow={isJk(prevD)} /> : '-'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[10px] text-white/50 mb-0.5">Yığın</div>
                  <div className="font-bold text-lg">{pile.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[10px] text-white/50 mb-0.5">Faz</div>
                  <div className="font-bold text-sm">{ph === 'draw' ? 'Taş Çek' : 'Taş At / Aç'}</div>
                </div>
              </div>
            </motion.div>

            {/* OYUNCULAR */}
            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur p-4">
              <h2 className="flex items-center gap-2 text-base font-bold mb-3"><Users className="h-4 w-4" /> Oyuncular</h2>
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                {[0,1,2,3].map(seat => {
                  const active = seat === cs
                  const isMe = seat === mySeat
                  return (
                    <div key={seat} className={`rounded-2xl border p-3 ${active ? 'border-emerald-300 bg-emerald-500/15' : 'border-white/10 bg-black/20'} ${elim[seat] ? 'opacity-40' : ''}`}>
                      <div className="flex items-center justify-between gap-1">
                        <div className="font-semibold text-sm truncate">{SEAT_NAMES[seat]}</div>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold">{hands[seat]?.length || 0}</span>
                      </div>
                      <div className="mt-1.5 space-y-0.5 text-[10px] text-white/60">
                        <div>Skor: <span className={`font-bold ${scores[seat] >= 80 ? 'text-red-400' : 'text-white'}`}>{scores[seat]}</span></div>
                        <div>Açtı mı: {hasOp[seat] ? '✅ Evet' : '❌ Hayır'}</div>
                        {elim[seat] && <div className="text-red-400 font-bold">ELENDİ</div>}
                        {active && <div className="text-emerald-300 font-bold">Sırada</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* MASADAKİ PERLER */}
            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.15}} className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur p-4">
              <h2 className="flex items-center gap-2 text-base font-bold mb-3"><Layers className="h-4 w-4" /> Masadaki Perler</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {melds.length > 0 ? melds.map((m, i) => (
                  <MeldPreview key={i} meld={m} title={`Per #${i+1} (${SEAT_NAMES[m.owner]})`} isJk={isJk}
                    onClick={canAdd ? () => hAdd(i) : undefined} highlight={canAdd && sel.size > 0} />
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-5 text-xs text-white/50 col-span-2">
                    Henüz masaya açılmış per yok.
                  </div>
                )}
              </div>
            </motion.div>

            {/* ELİM */}
            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h2 className="text-base font-bold">Elim ({myH.length} taş)</h2>
                <div className="flex gap-2">
                  <button onClick={()=>setSortMode('color')} className={`rounded-2xl px-3 py-1.5 text-xs font-semibold transition-all ${sortMode==='color'?'bg-indigo-600 text-white':'bg-white/10 text-white hover:bg-white/20'}`}>Renge Göre</button>
                  <button onClick={()=>setSortMode('number')} className={`rounded-2xl px-3 py-1.5 text-xs font-semibold transition-all ${sortMode==='number'?'bg-indigo-600 text-white':'bg-white/10 text-white hover:bg-white/20'}`}>Sayıya Göre</button>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isMT?'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40':'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30'}`}>
                  Sıra: {isMT ? 'Evet' : 'Hayır'}
                </span>
                <span className="rounded-full bg-indigo-500/20 text-indigo-100 border border-indigo-400/30 px-2.5 py-1 text-[10px] font-bold">
                  Açtım: {myOp ? 'Evet' : 'Hayır'}
                </span>
                {sel.size > 0 && <span className="rounded-full bg-yellow-500/20 text-yellow-200 border border-yellow-400/40 px-2.5 py-1 text-[10px] font-bold">{sel.size} seçili</span>}
              </div>

              {/* TILE HAND */}
              <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-black/20 p-3 min-h-[80px]">
                {sortedHand.map(tile => (
                  <div key={tile.id} onDoubleClick={() => hDblTap(tile.id)}>
                    <Tile tile={tile} selected={sel.has(tile.id)} onClick={() => toggleTile(tile.id)} glow={isJk(tile)} />
                  </div>
                ))}
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-3 grid gap-2 grid-cols-2 md:grid-cols-5">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5 col-span-2 md:col-span-1">
                  <div className="mb-1.5 text-[10px] text-white/60">Taş çekme</div>
                  <div className="flex gap-1.5">
                    <button onClick={()=>hDraw('pile')} disabled={!isMT||ph!=='draw'} className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-semibold hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">Ortadan</button>
                    <button onClick={()=>hDraw('discard')} disabled={!isMT||ph!=='draw'||!prevD} className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-semibold hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">Yerden</button>
                  </div>
                </div>
                <button onClick={addDraft} disabled={sel.size<3||ph!=='discard'||!isMT} className="rounded-2xl bg-white/10 text-white font-semibold text-xs py-2.5 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">Per Taslağı Ekle</button>
                <button onClick={hLay} disabled={!isMT||ph!=='discard'||(sel.size<3&&openMelds.length===0)} className="rounded-2xl bg-fuchsia-600 text-white font-bold text-xs py-2.5 hover:bg-fuchsia-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-fuchsia-500/20">Açılış Gönder</button>
                <button onClick={()=>{if(sel.size!==1){showM('1 taş seç');return};hDiscard(Array.from(sel)[0])}} disabled={!isMT||ph!=='discard'||sel.size!==1} className="rounded-2xl bg-rose-600 text-white font-bold text-xs py-2.5 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-500/20">Seçili Taşı At</button>
              </div>

              {/* DRAFT MELDS */}
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm">Açılış Taslağı</div>
                  <button onClick={()=>setOpenMelds([])} className="rounded-xl bg-white/10 px-3 py-1 text-[10px] font-semibold text-white hover:bg-white/20 transition-all">Temizle</button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {openMelds.length > 0 ? openMelds.map((meld, idx) => {
                    const tiles = meld.map(id => myH.find(h => h.id === id)).filter(Boolean) as OkeyTile[]
                    return (
                      <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-2">
                        <div className="mb-1 text-[10px] text-white/60">Taslak #{idx+1}</div>
                        <div className="flex flex-wrap gap-1">{tiles.map(t => <Tile key={t.id} tile={t} small glow={isJk(t)} />)}</div>
                      </div>
                    )
                  }) : (
                    <div className="rounded-2xl border border-dashed border-white/10 p-4 text-xs text-white/50 col-span-2">
                      En az 3 taş seçip taslak oluştur.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* === RIGHT COLUMN === */}
          <div className="space-y-3">

            {/* QUICK NOTES */}
            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="rounded-3xl border border-white/10 bg-indigo-500/10 shadow-2xl backdrop-blur p-4">
              <h2 className="flex items-center gap-2 text-base font-bold mb-2"><Sparkles className="h-4 w-4" /> Hızlı Notlar</h2>
              <div className="space-y-1.5 text-xs text-white/70">
                <div>• Açılış için en az 101 puanlık per gönder.</div>
                <div>• Taş atmak için tek taş seçili olmalı.</div>
                <div>• Çift tıklama ile hızlı taş atabilirsin.</div>
                <div>• Masadaki perlere tıklayarak taş ekleyebilirsin.</div>
                <div>• İlk 101 puana ulaşan oyuncu elenir.</div>
              </div>
            </motion.div>

            {/* SKORLAR */}
            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.05}} className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur p-4">
              <h2 className="text-base font-bold mb-3">🏆 Skorlar</h2>
              <div className="grid gap-2 grid-cols-2">
                {SEAT_NAMES.map((name, i) => (
                  <div key={i} className={`rounded-2xl border p-3 text-center ${
                    elim[i] ? 'border-red-500/40 bg-red-500/10' : scores[i] >= 80 ? 'border-yellow-400/40 bg-yellow-500/10' : 'border-white/10 bg-black/20'
                  }`}>
                    <div className="text-xs text-white/60 font-semibold">{name.split(' ')[0]}</div>
                    <div className={`text-2xl font-extrabold mt-1 ${elim[i] ? 'text-red-400' : scores[i] >= 80 ? 'text-yellow-300' : 'text-white'}`}>{scores[i]}</div>
                    {elim[i] && <div className="text-[9px] text-red-400 font-bold mt-0.5">ELENDİ</div>}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* RAKIP ELLER */}
            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur p-4">
              <h2 className="text-base font-bold mb-3">Rakip Eller</h2>
              <div className="space-y-3">
                {opponentSeats.map(seat => {
                  if (elim[seat]) return null
                  const hLen = hands[seat]?.length || 0
                  const lastD = topD(seat)
                  return (
                    <div key={seat} className={`rounded-2xl border p-3 ${seat===cs ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-white/10 bg-black/20'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{SEAT_NAMES[seat]}</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold">{hLen} taş</span>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {Array.from({length: Math.min(hLen, 14)}).map((_, i) => <FDTile key={i} small />)}
                        {hLen > 14 && <span className="text-[10px] text-white/40 self-center ml-1">+{hLen-14}</span>}
                      </div>
                      {lastD && <div className="mt-2 flex items-center gap-1.5"><span className="text-[10px] text-white/50">Son attığı:</span><Tile tile={lastD} small glow={isJk(lastD)} /></div>}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* === OVERLAYS === */}

      {/* Diff selection */}
      {showDS && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 text-center shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-white">Zorluk Seç</h3>
            <div className="flex gap-3">
              {(['easy','medium','hard'] as const).map(d => (
                <button key={d} onClick={()=>{setDiff(d);setDiffSet(true);sendAIState({state:{...state,difficulty:d},currentTurn:1,status:'active',player1Score:0,player2Score:0,winnerId:null})}}
                  className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all ${diff===d?'bg-indigo-600 text-white ring-2 ring-indigo-400':'bg-white/10 text-white hover:bg-white/20'}`}>
                  {DIFF_LABELS[d].emoji} {DIFF_LABELS[d].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Round end */}
      {(state?.showingRoundResult||showRE)&&!gOver && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} className="rounded-3xl border border-yellow-400/40 bg-slate-900 p-6 text-center shadow-2xl min-w-[300px]">
            <h3 className="text-xl font-bold text-yellow-300 mb-3">🏆 Raunt {round} Bitti!</h3>
            <p className="text-sm text-white/70 mb-4">{SEAT_NAMES[state?.roundWinner??0]} kazandı!</p>
            {state?.roundHistory?.length>0 && (
              <div className="flex gap-4 justify-center mb-4">
                {SEAT_NAMES.map((n,i)=>{const lr=state.roundHistory[state.roundHistory.length-1];return(
                  <div key={i} className="text-center"><div className="text-[10px] text-white/50">{n.split(' ')[0]}</div><div className="text-base font-bold text-red-400">+{lr?.penalties?.[i]||0}</div></div>
                )})}
              </div>
            )}
            <button onClick={startNR} className="rounded-2xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition-all shadow-lg">Sonraki Raunt →</button>
          </motion.div>
        </div>
      )}

      {/* Game over */}
      {gOver && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} className="rounded-3xl border border-yellow-400/40 bg-slate-900 p-6 text-center shadow-2xl min-w-[340px]">
            <h3 className="text-2xl font-bold text-yellow-300 mb-3">🎉 Oyun Bitti!</h3>
            <p className="text-sm text-white/70 mb-4">{SEAT_NAMES[win??0]} kazandı!</p>
            <div className="flex gap-3 justify-center">
              {SEAT_NAMES.map((n,i)=>(
                <div key={i} className={`text-center px-3 py-2 rounded-xl ${
                  i===win ? 'bg-yellow-400/15 border-2 border-yellow-400' : 'bg-white/5 border-2 border-white/10'
                }`}>
                  <div className="text-[10px] font-bold text-white/60">{n.split(' ')[0]}</div>
                  <div className="text-xl font-extrabold text-white">{scores[i]}</div>
                  {i===win && <div className="text-[9px] text-yellow-400">🏆</div>}
                  {elim[i]&&i!==win && <div className="text-[8px] text-red-400 font-bold">ELENDİ</div>}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>{msg&&(
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] rounded-2xl bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 px-5 py-2.5 text-xs font-semibold shadow-lg backdrop-blur">
          {msg}
        </motion.div>
      )}</AnimatePresence>
    </div>
  )

  return <Portal>{ui}</Portal>
}
