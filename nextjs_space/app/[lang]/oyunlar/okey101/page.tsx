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

const TC: Record<number, string> = { 0: '#dc2626', 1: '#2563eb', 2: '#16a34a', 3: '#1f2937', 4: '#b45309' }
const SEAT_NAMES = ['Sen', 'Doğu 🤖', 'Kuzey 🤖', 'Batı 🤖']
const DIFF_LABELS: Record<string, { label: string; emoji: string }> = { easy: { label: 'Kolay', emoji: '🟢' }, medium: { label: 'Orta', emoji: '🟡' }, hard: { label: 'Zor', emoji: '🔴' } }

function playTileSound() { try { const c=new(window.AudioContext||(window as any).webkitAudioContext)();const b=c.createBuffer(1,Math.floor(c.sampleRate*0.06),c.sampleRate);const d=b.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.pow(1-j/d.length,2)*0.3;const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.setValueAtTime(0.15,c.currentTime);const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=1000;s.connect(f);f.connect(g);g.connect(c.destination);s.start()}catch{} }
function playWinSound() { try { const c=new(window.AudioContext||(window as any).webkitAudioContext)();[523,659,784,1047].forEach((fr,i)=>{const o=c.createOscillator();o.type='sine';o.frequency.value=fr;const g=c.createGain();g.gain.setValueAtTime(0.15,c.currentTime+i*0.15);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.15+0.4);o.connect(g);g.connect(c.destination);o.start(c.currentTime+i*0.15);o.stop(c.currentTime+i*0.15+0.5)})}catch{} }
function get101Stats() { try{return JSON.parse(localStorage.getItem('okey101_stats')||'{"wins":0,"losses":0,"gamesPlayed":0}')}catch{return{wins:0,losses:0,gamesPlayed:0}} }
function save101Stats(s:any) { try{localStorage.setItem('okey101_stats',JSON.stringify(s))}catch{} }

/* === LANDSCAPE PROMPT === */
function LandscapePrompt() {
  const [show, setShow] = useState(false)
  const [m, setM] = useState(false)
  useEffect(() => { setM(true) }, [])
  useEffect(() => { const c=()=>{if(typeof window!=='undefined')setShow(window.innerHeight>window.innerWidth&&window.innerWidth<768)};c();window.addEventListener('resize',c);window.addEventListener('orientationchange',c);return()=>{window.removeEventListener('resize',c);window.removeEventListener('orientationchange',c)} }, [])
  if (!show || !m) return null
  return <Portal><div style={{position:'fixed',inset:0,zIndex:999999,background:'rgba(10,30,40,0.98)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{textAlign:'center',padding:32}}><div style={{fontSize:56,marginBottom:16}}>📱</div><h2 style={{fontSize:20,fontWeight:700,color:'white',marginBottom:8}}>Ekranı Çevir</h2><p style={{fontSize:13,color:'#94a3b8'}}>101 Okey yatay modda oynanır.</p></div></div></Portal>
}

/* === TILE === */
function T({ tile, sel, onClick, w, h, fs, jk, glow }: { tile: OkeyTile; sel?: boolean; onClick?: () => void; w: number; h: number; fs: number; jk?: boolean; glow?: boolean }) {
  const fg = tile.isFalseJoker ? TC[4] : (TC[tile.color] || TC[0])
  return (
    <motion.div layout onClick={onClick} whileHover={onClick?{y:-4,scale:1.05}:{}} whileTap={onClick?{scale:0.94}:{}}
      style={{
        width: w, height: h, borderRadius: Math.max(3, w/8), background: '#fffff0',
        border: sel ? '2.5px solid #facc15' : '1.5px solid #bbb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default', position: 'relative',
        userSelect: 'none', flexShrink: 0,
        boxShadow: sel ? '0 0 8px rgba(250,204,21,0.7),0 3px 6px rgba(0,0,0,0.3)' : glow ? '0 0 10px rgba(74,222,128,0.5)' : '0 1px 4px rgba(0,0,0,0.25)',
        transform: sel ? 'translateY(-8px)' : undefined, zIndex: sel ? 20 : 1,
      }}>
      <span style={{ fontSize: fs, color: fg, fontWeight: 800, lineHeight: 1 }}>{tile.isFalseJoker ? '★' : tile.number}</span>
      {jk && !tile.isFalseJoker && <span style={{position:'absolute',top:-3,right:-3,fontSize:6,background:'#facc15',color:'#78350f',borderRadius:'50%',width:10,height:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}>J</span>}
    </motion.div>
  )
}

function FDT({ w, h }: { w: number; h: number }) {
  return <div style={{ width: w, height: h, borderRadius: 3, background: 'linear-gradient(180deg,#1e3a5f,#0f2440)', border: '1px solid #2a4a6a', flexShrink: 0 }} />
}

/* === SCORE BADGE (red square in corner) === */
function Badge({ score, style: s }: { score: number; style: React.CSSProperties }) {
  return <div style={{ position: 'absolute', ...s, zIndex: 10, width: 36, height: 36, borderRadius: 6, background: '#c0392b', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', border: '2px solid #e74c3c' }}><span style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>{score}</span></div>
}

/* === MELD GROUP === */
function MG({ meld, jkFn, onClick, hl }: { meld: Meld; jkFn: (t: OkeyTile) => boolean; onClick?: () => void; hl?: boolean }) {
  return (
    <div onClick={onClick} style={{ display: 'inline-flex', gap: 1, padding: '2px 3px', borderRadius: 4, background: hl ? 'rgba(250,204,21,0.2)' : 'rgba(0,0,0,0.15)', border: hl ? '1.5px solid rgba(250,204,21,0.5)' : '1px solid rgba(255,255,255,0.08)', cursor: onClick ? 'pointer' : 'default' }}>
      {meld.tiles.map(t => <T key={t.id} tile={t} w={20} h={28} fs={10} jk={jkFn(t)} />)}
    </div>
  )
}

/* === ACTION BUTTON === */
function ActBtn({ label, icon, onClick, disabled, color }: { label: string; icon: string; onClick: () => void; disabled: boolean; color?: string }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '10px 6px', borderRadius: 6, fontSize: 13, fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer',
      background: disabled ? '#0f2030' : (color || '#1a3a5a'), border: '2px solid #2a5a7a',
      color: disabled ? '#3a5a6a' : 'white', opacity: disabled ? 0.5 : 1,
      textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      transition: 'all 0.15s', lineHeight: 1.1,
    }}>
      {icon&&<span style={{ fontSize: 15 }}>{icon}</span>}{label}
    </button>
  )
}

export default function Okey101Page() {
  return (
    <GameShell gameType="okey101" gameName="101 Okey" gameEmoji="💯" gameDesc="Çok rauntlu 101 Okey! İlk 101 puana ulaşan elenir." supportsAI={true}>
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
  const sDiff: string = state?.difficulty || 'medium'
  const melds: Meld[] = state?.melds || []
  const hasOp: boolean[] = state?.hasOpened || [false, false, false, false]

  const s2t = (s: number) => s === 0 ? 1 : 2
  const isMT = cs === mySeat
  const opS = [0, 1, 2, 3].filter(s => s !== mySeat)
  const myH = hands[mySeat] || []
  const myOp = hasOp[mySeat]
  const isJk = useCallback((t: OkeyTile) => !!t.isFalseJoker || (t.color === jc && t.number === jn), [jc, jn])

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
    if(ap<=1){const gw=ne.findIndex((e:boolean)=>!e);const fs={...c,scores:ns,eliminated:ne,roundHistory:rh,gameOver:true,winner:gw>=0?gw:rw,roundWinner:rw};if(!statsR.current&&!isSpectator){statsR.current=true;const st=get101Stats();st.gamesPlayed++;if(gw===mySeat)st.wins++;else st.losses++;save101Stats(st)};const mw=gw===mySeat;await sendAIState({state:fs,player1Score:mw&&playerNum===1?1:(!mw&&playerNum!==1?1:0),player2Score:mw&&playerNum===2?1:(!mw&&playerNum!==2?1:0),currentTurn:1,status:'completed',winnerId:mw?(playerNum===1?room.player1Id:room.player2Id):(playerNum===1?room.player2Id:room.player1Id)})}
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
  const hTap=(tid:number)=>{if(!isMT||isSpectator||room.status!=='active'||ph!=='discard')return;setSel(p=>{const n=new Set(p);if(n.has(tid))n.delete(tid);else n.add(tid);return n})}
  const hDblTap=(tid:number)=>{if(!isMT||ph!=='discard'||isSpectator)return;hDiscard(tid)}
  const hLay=async(type:'run'|'set')=>{if(!isMT||ph!=='discard'||sel.size<3){showM('En az 3 taş seç!');return};const r=okey101LayMeld(state,mySeat,[Array.from(sel)]);if(r.error){showM(r.error);return};if(soundEnabled)playTileSound();if(r.state.hands[mySeat].length===0){if(soundEnabled)playWinSound();await procRE(r.state,mySeat)}else await sendAIState({state:r.state,currentTurn:s2t(mySeat),status:'active',player1Score:room.player1Score,player2Score:room.player2Score,winnerId:null});setSel(new Set())}
  const hAdd=async(mi:number)=>{if(!isMT||ph!=='discard'||sel.size===0||!myOp){showM(myOp?'Taş seç!':'Önce açıl!');return};const r=okey101AddToMeld(state,mySeat,Array.from(sel),mi);if(r.error){showM(r.error);return};if(soundEnabled)playTileSound();if(r.state.hands[mySeat].length===0){if(soundEnabled)playWinSound();await procRE(r.state,mySeat)}else await sendAIState({state:r.state,currentTurn:s2t(mySeat),status:'active',player1Score:room.player1Score,player2Score:room.player2Score,winnerId:null});setSel(new Set())}

  const topD=(s:number):OkeyTile|null=>{const d=discards[s];return d?.length>0?d[d.length-1]:null}
  const prevD=topD((mySeat+3)%4)
  const showDS=room?.isAI&&room?.status==='active'&&!diffSet&&round===1&&isMT&&pile.length>90
  const canLay=isMT&&ph==='discard'&&sel.size>=3&&!isSpectator
  const canAdd=isMT&&ph==='discard'&&sel.size>0&&myOp&&melds.length>0&&!isSpectator

  const ui = (
    <div style={{position:'fixed',inset:0,zIndex:99998,background:'#0c1e28',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'system-ui,-apple-system,sans-serif'}}>
      <LandscapePrompt/>

      {/* Diff overlay */}
      {showDS&&(<div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:200,background:'rgba(10,26,32,0.96)',padding:28,borderRadius:14,border:'2px solid #2a6a7a'}}><div style={{color:'#7dd3fc',fontSize:16,marginBottom:14,textAlign:'center',fontWeight:700}}>Zorluk Seç</div><div style={{display:'flex',gap:10}}>{(['easy','medium','hard']as const).map(d=>(<button key={d} onClick={()=>{setDiff(d);setDiffSet(true);sendAIState({state:{...state,difficulty:d},currentTurn:1,status:'active',player1Score:0,player2Score:0,winnerId:null})}} style={{padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',background:diff===d?'#0ea5e9':'#1e3a4a',border:`2px solid ${diff===d?'#38bdf8':'#2a5a6a'}`,color:'white'}}>{DIFF_LABELS[d].emoji} {DIFF_LABELS[d].label}</button>))}</div></div>)}

      {/* Round end */}
      {(state?.showingRoundResult||showRE)&&!gOver&&(<div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:200,background:'rgba(10,26,32,0.97)',padding:28,borderRadius:14,border:'2px solid #fbbf24',textAlign:'center',minWidth:300}}><h3 style={{fontSize:20,fontWeight:700,color:'#fbbf24',marginBottom:10}}>🏆 Raunt {round} Bitti!</h3><p style={{fontSize:14,color:'#94a3b8',marginBottom:14}}>{SEAT_NAMES[state?.roundWinner??0]} kazandı!</p>{state?.roundHistory?.length>0&&(<div style={{display:'flex',gap:14,justifyContent:'center',marginBottom:14}}>{SEAT_NAMES.map((n,i)=>{const lr=state.roundHistory[state.roundHistory.length-1];return(<div key={i} style={{textAlign:'center'}}><div style={{fontSize:10,color:'#94a3b8'}}>{n.split(' ')[0]}</div><div style={{fontSize:14,color:'#f87171',fontWeight:700}}>+{lr?.penalties?.[i]||0}</div></div>)})}</div>)}<button onClick={startNR} style={{padding:'10px 24px',background:'#0ea5e9',color:'white',border:'none',borderRadius:10,fontWeight:700,fontSize:14,cursor:'pointer'}}>Sonraki Raunt →</button></div>)}

      {/* Game over */}
      {gOver&&(<div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:200,background:'rgba(10,26,32,0.97)',padding:28,borderRadius:14,border:'2px solid #fbbf24',textAlign:'center',minWidth:320}}><h3 style={{fontSize:22,fontWeight:700,color:'#fbbf24',marginBottom:10}}>🎉 Oyun Bitti!</h3><p style={{fontSize:15,color:'#94a3b8',marginBottom:14}}>{SEAT_NAMES[win??0]} kazandı!</p><div style={{display:'flex',gap:10,justifyContent:'center'}}>{SEAT_NAMES.map((n,i)=>(<div key={i} style={{textAlign:'center',padding:'8px 12px',borderRadius:8,background:i===win?'rgba(250,204,21,0.15)':'rgba(255,255,255,0.05)',border:`2px solid ${i===win?'#fbbf24':'#334155'}`}}><div style={{fontSize:11,fontWeight:700,color:'#94a3b8'}}>{n.split(' ')[0]}</div><div style={{fontSize:18,fontWeight:800,color:'white'}}>{scores[i]}</div>{i===win&&<div style={{fontSize:10,color:'#fbbf24'}}>🏆</div>}{elim[i]&&i!==win&&<div style={{fontSize:9,color:'#f87171'}}>ELENDİ</div>}</div>))}</div></div>)}

      {/* === MAIN GAME === */}
      {!state?.showingRoundResult&&!gOver&&(
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

          {/* TABLE (dark frame + felt) */}
          <div style={{flex:1,display:'flex',margin:'4px 4px 0',borderRadius:'8px 8px 0 0',background:'#0a2028',border:'3px solid #081820',overflow:'hidden',position:'relative'}}>

            {/* Felt surface */}
            <div style={{flex:1,display:'flex',margin:4,borderRadius:4,background:'linear-gradient(135deg,#1a7a8a 0%,#167080 50%,#1a7a8a 100%)',position:'relative',overflow:'hidden'}}>

              {/* Grid */}
              <div style={{position:'absolute',inset:0,opacity:0.06,backgroundImage:'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)',backgroundSize:'50px 50px'}}/>

              {/* 101 watermark center */}
              <div style={{position:'absolute',top:'40%',left:'35%',fontSize:100,fontWeight:900,color:'rgba(255,255,255,0.035)',letterSpacing:12,pointerEvents:'none',transform:'translate(-50%,-50%)'}}>101</div>
              <div style={{position:'absolute',top:'40%',left:'65%',fontSize:100,fontWeight:900,color:'rgba(255,255,255,0.035)',letterSpacing:12,pointerEvents:'none',transform:'translate(-50%,-50%)'}}>101</div>

              {/* Score badges - 4 corners */}
              <Badge score={scores[opponentSeats[1]]} style={{top:6,left:6}} />
              <Badge score={scores[opponentSeats[0]]} style={{top:6,right:6}} />
              <Badge score={scores[opponentSeats[2]]} style={{bottom:6,left:6}} />
              <Badge score={scores[mySeat]} style={{bottom:6,right:6}} />

              {/* LEFT: opponent (Batı) */}
              <div style={{width:44,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,padding:'36px 2px'}}>
                {!elim[opponentSeats[2]]&&(<>
                  <span style={{fontSize:7,color:'rgba(255,255,255,0.5)',fontWeight:700}}>{SEAT_NAMES[opponentSeats[2]].split(' ')[0]}</span>
                  {Array.from({length:Math.min(hands[opponentSeats[2]]?.length||0,12)}).map((_,i)=><FDT key={i} w={12} h={18}/>)}
                  {topD(opponentSeats[2])&&<div style={{marginTop:3}}><T tile={topD(opponentSeats[2])!} w={16} h={22} fs={8} jk={isJk(topD(opponentSeats[2])!)}/></div>}
                </>)}
              </div>

              {/* CENTER COLUMN */}
              <div style={{flex:1,display:'flex',flexDirection:'column'}}>

                {/* Top opponent (Kuzey) */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:2,padding:'4px 0',minHeight:28}}>
                  {!elim[opponentSeats[1]]&&(<>
                    <span style={{fontSize:7,color:'rgba(255,255,255,0.5)',fontWeight:700,marginRight:4}}>{SEAT_NAMES[opponentSeats[1]].split(' ')[0]}</span>
                    {Array.from({length:Math.min(hands[opponentSeats[1]]?.length||0,18)}).map((_,i)=><FDT key={i} w={12} h={18}/>)}
                  </>)}
                </div>

                {/* MIDDLE: left=melds, center=pile/indicator/info, right=nothing */}
                <div style={{flex:1,display:'flex',gap:8,minHeight:0}}>

                  {/* MELDS AREA (left half) */}
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:4,padding:'4px 8px',overflow:'auto'}}>
                    {melds.map((m:Meld,i:number)=>(
                      <MG key={i} meld={m} jkFn={isJk} onClick={canAdd?()=>hAdd(i):undefined} hl={canAdd&&sel.size>0}/>
                    ))}
                  </div>

                  {/* CENTER INFO (pile + indicator + info panel) */}
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,minWidth:120}}>

                    {/* Info labels like screenshot: Eşli, Yardımlı, Katlamalı, round */}
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1,fontSize:9,fontWeight:600}}>
                      <span style={{color:myOp?'#4ade80':'#fbbf24'}}>{myOp?'Açık':'Kapalı'}</span>
                      <span style={{color:'rgba(255,255,255,0.4)'}}>{round}/3 El</span>
                    </div>

                    {/* Big indicator tile */}
                    {ind&&<T tile={ind} w={52} h={72} fs={28} jk={isJk(ind)}/>}

                    {/* Small info: discard count / remaining */}
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      {prevD&&<T tile={prevD} w={20} h={28} fs={10} jk={isJk(prevD)}/>}
                      <span style={{fontSize:8,color:'rgba(255,255,255,0.35)'}}>{pile.length}</span>
                    </div>

                    {/* Draw area */}
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div onClick={()=>hDraw('pile')} style={{cursor:isMT&&ph==='draw'?'pointer':'not-allowed',opacity:isMT&&ph==='draw'?1:0.3,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                        <div style={{width:28,height:40,borderRadius:4,background:'linear-gradient(180deg,#1e3a5f,#0f2440)',border:'2px solid #2a4a6a',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <span style={{color:'#4a6a7a',fontSize:9,fontWeight:700}}>{pile.length}</span>
                        </div>
                        <span style={{fontSize:6,color:'#7dd3fc'}}>Yığın</span>
                      </div>
                      {prevD&&<div onClick={()=>hDraw('discard')} style={{cursor:isMT&&ph==='draw'?'pointer':'not-allowed',opacity:isMT&&ph==='draw'?1:0.3,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                        <T tile={prevD} w={28} h={40} fs={14} jk={isJk(prevD)}/>
                        <span style={{fontSize:6,color:'#86efac'}}>Al</span>
                      </div>}
                    </div>

                    {/* My discards */}
                    <div style={{display:'flex',gap:1}}>
                      {discards[mySeat]?.slice(-3).map((t:OkeyTile)=><T key={t.id} tile={t} w={14} h={20} fs={7} jk={isJk(t)}/>)}
                    </div>
                  </div>
                </div>

                {/* Status bar */}
                <div style={{textAlign:'center',padding:'3px 0',fontSize:11,fontWeight:700,color:isMT?'#7dd3fc':'#4a6a7a'}}>
                  {win!==null?<span style={{color:'#fbbf24'}}>🏆 {win===mySeat?'Kazandın!':`${SEAT_NAMES[win]} kazandı!`}</span>
                    :<span>{isMT?`${ph==='draw'?'Taş Çek':myOp?'At veya Aç':'At veya Açıl (min 101)'}`:`${SEAT_NAMES[cs]} düşünüyor...`}</span>}
                </div>
              </div>

              {/* RIGHT: opponent (Doğu) + action buttons */}
              <div style={{width:120,display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'4px 4px',alignItems:'center'}}>
                {/* East opponent */}
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
                  {!elim[opponentSeats[0]]&&(<>
                    <span style={{fontSize:7,color:'rgba(255,255,255,0.5)',fontWeight:700}}>{SEAT_NAMES[opponentSeats[0]].split(' ')[0]}</span>
                    {Array.from({length:Math.min(hands[opponentSeats[0]]?.length||0,12)}).map((_,i)=><FDT key={i} w={12} h={18}/>)}
                    {topD(opponentSeats[0])&&<div style={{marginTop:3}}><T tile={topD(opponentSeats[0])!} w={16} h={22} fs={8} jk={isJk(topD(opponentSeats[0])!)}/></div>}
                  </>)}
                </div>

                {/* ACTION BUTTONS */}
                <div style={{display:'flex',flexDirection:'column',gap:5,width:'100%',marginBottom:42}}>
                  <ActBtn label={"SERİ AÇ"} icon={"🃏"} onClick={()=>hLay('run')} disabled={!canLay}/>
                  <ActBtn label={"ÇİFT AÇ"} icon={"🎴"} onClick={()=>hLay('set')} disabled={!canLay}/>
                  <ActBtn label={"GERİ TOPLA"} icon={"↩️"} onClick={()=>setSel(new Set())} disabled={sel.size===0} color="#5a1a1a"/>
                  <ActBtn label={"TAŞLARI İŞLE"} icon={"⚙️"} onClick={()=>{if(canAdd&&melds.length>0)hAdd(0)}} disabled={!canAdd}/>
                </div>
              </div>
            </div>
          </div>

          {/* === WOODEN SHELF (player hand) === */}
          <div style={{flexShrink:0,position:'relative'}}>
            <div style={{background:'linear-gradient(180deg, #d4a04a 0%, #b8842e 30%, #9a6a1a 70%, #7a5210 100%)',padding:'8px 10px 12px',position:'relative',borderTop:'3px solid #e0b060'}}>
              {/* Wood grain */}
              <div style={{position:'absolute',top:3,left:0,right:0,height:2,background:'rgba(255,255,255,0.12)'}}/>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'rgba(255,255,255,0.18)'}}/>

              {/* 101 watermark on shelf */}
              <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:40,fontWeight:900,color:'rgba(255,255,255,0.06)',letterSpacing:6,pointerEvents:'none'}}>101</div>

              {/* Bottom corner buttons: ÇİFT DİZ (left) and SERİ DİZ (right) */}
              <div style={{position:'absolute',left:0,top:0,bottom:0,display:'flex',alignItems:'center',zIndex:10}}>
                <button onClick={()=>hLay('set')} disabled={!canLay} style={{padding:'6px 6px',borderRadius:'0 5px 5px 0',fontSize:8,fontWeight:800,background:canLay?'#1a3a5a':'#0a1a2a',border:'2px solid #2a5a7a',borderLeft:'none',color:canLay?'white':'#3a5a6a',cursor:canLay?'pointer':'not-allowed',opacity:canLay?1:0.5,writingMode:'horizontal-tb',lineHeight:1.2,textAlign:'center'}}><span style={{fontSize:10}}>🎴</span><br/>ÇİFT<br/>DİZ</button>
              </div>
              <div style={{position:'absolute',right:0,top:0,bottom:0,display:'flex',alignItems:'center',zIndex:10}}>
                <button onClick={()=>hLay('run')} disabled={!canLay} style={{padding:'6px 6px',borderRadius:'5px 0 0 5px',fontSize:8,fontWeight:800,background:canLay?'#1a3a5a':'#0a1a2a',border:'2px solid #2a5a7a',borderRight:'none',color:canLay?'white':'#3a5a6a',cursor:canLay?'pointer':'not-allowed',opacity:canLay?1:0.5,writingMode:'horizontal-tb',lineHeight:1.2,textAlign:'center'}}><span style={{fontSize:10}}>🃏</span><br/>SERİ<br/>DİZ</button>
              </div>

              {/* Hand info */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:4}}>
                <span style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.85)'}}>{myH.length} taş</span>
                {sel.size>0&&<span style={{fontSize:9,color:'#fbbf24'}}>({sel.size} seçili)</span>}
              </div>

              {/* TILES - larger like screenshot */}
              <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:4,minHeight:58,padding:'0 40px'}}>
                <AnimatePresence>
                  {myH.map((tile:OkeyTile)=>(
                    <div key={tile.id} onDoubleClick={()=>hDblTap(tile.id)}>
                      <T tile={tile} w={40} h={56} fs={20} sel={sel.has(tile.id)} onClick={()=>hTap(tile.id)} jk={isJk(tile)}/>
                    </div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Hint */}
              {isMT&&!isSpectator&&!win&&!gOver&&(
                <div style={{textAlign:'center',fontSize:8,color:'rgba(255,255,255,0.35)',marginTop:3}}>
                  {ph==='draw'?'Yığından veya yerden taş çek':sel.size>0?'Seri/Çift Aç | Masadaki gruba tıkla | Çift tıkla → at':'Taşlara tıkla → seç | Çift tıkla → at'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>{msg&&(<motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}} style={{position:'fixed',bottom:90,left:'50%',transform:'translateX(-50%)',zIndex:99999,background:'rgba(251,191,36,0.2)',border:'1px solid rgba(251,191,36,0.4)',color:'#fcd34d',padding:'6px 18px',borderRadius:16,fontSize:12,fontWeight:600}}>{msg}</motion.div>)}</AnimatePresence>
    </div>
  )

  return <Portal>{ui}</Portal>
}
