'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Users, Bot, Coins, Trophy, RotateCcw,
  Zap, X, Loader2, RefreshCw, Volume2, VolumeX, Gamepad2,
  MessageCircle, Send, Eye, EyeOff, Timer
} from 'lucide-react'

export interface GameRoom {
  id: string
  gameType: string
  player1Id: string
  player2Id: string | null
  isAI: boolean
  betAmount: number
  betCurrency: string
  state: string
  currentTurn: number
  player1Score: number
  player2Score: number
  status: string
  winnerId: string | null
  player1Name: string
  player2Name: string
  turnTimer: number
  chatEnabled: boolean
  lastMoveAt: string | null
  viewerCount?: number
}

interface GameShellProps {
  gameType: string
  gameName: string
  gameEmoji: string
  gameDesc: string
  supportsAI: boolean
  supportsBet?: boolean
  supportsTimer?: boolean
  children: (props: {
    room: GameRoom
    state: any
    isMyTurn: boolean
    isSpectator: boolean
    playerNum: number
    sendMove: (action: any) => Promise<any>
    sendAIState: (fullState: any) => Promise<any>
    soundEnabled: boolean
  }) => React.ReactNode
}

function playSound(type: 'win' | 'lose' | 'draw') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    gain.gain.value = 0.15
    if (type === 'win') { osc.frequency.value = 523; osc.type = 'triangle'; gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8); osc.start(); osc.stop(ctx.currentTime + 0.8) }
    else if (type === 'lose') { osc.frequency.value = 300; osc.type = 'sawtooth'; gain.gain.value = 0.1; gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); osc.start(); osc.stop(ctx.currentTime + 0.5) }
    else { osc.frequency.value = 440; osc.type = 'sine'; gain.gain.value = 0.12; gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4); osc.start(); osc.stop(ctx.currentTime + 0.4) }
  } catch {}
}

// Mini chat component
function MiniChat({ roomId, isOwner, chatEnabled, onToggle }: { roomId: string; isOwner: boolean; chatEnabled: boolean; onToggle: (v: boolean) => void }) {
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

  useEffect(() => { if (open) { setUnread(0); endRef.current?.scrollIntoView({ behavior: 'smooth' }) } }, [open, msgs.length])

  const send = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const r = await fetch(`/api/games/room/${roomId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: input.trim() }) })
      if (r.ok) { const m = await r.json(); setMsgs(prev => [...prev, m]); lastRef.current = m.createdAt; setInput('') }
    } catch {}
    setSending(false)
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed bottom-4 right-4 z-40 w-12 h-12 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all">
        <MessageCircle className="w-5 h-5 text-white" />
        {unread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-20 right-4 z-40 w-72 sm:w-80 bg-[#0d0225]/95 backdrop-blur-xl border border-fuchsia-500/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-purple-900/50 border-b border-fuchsia-500/20">
              <span className="text-fuchsia-300 font-medium text-sm flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> Sohbet</span>
              <div className="flex items-center gap-1">
                {isOwner && <button onClick={async () => { try { const r = await fetch(`/api/games/room/${roomId}/chat`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatEnabled: !chatEnabled }) }); if (r.ok) { const d = await r.json(); onToggle(d.chatEnabled) } } catch {} }} className={`p-1.5 rounded-lg text-xs transition ${chatEnabled ? 'text-green-400' : 'text-red-400'}`}>{chatEnabled ? <MessageCircle className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>}
                <button onClick={() => setOpen(false)} className="p-1.5 text-fuchsia-400/60 hover:text-fuchsia-300"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="h-52 overflow-y-auto px-3 py-2 space-y-2">
              {!chatEnabled && <div className="text-center text-red-400/70 text-xs py-4"><EyeOff className="w-5 h-5 mx-auto mb-1" />Sohbet kapalı</div>}
              {chatEnabled && msgs.length === 0 && <p className="text-fuchsia-400/40 text-xs text-center py-4">Henüz mesaj yok</p>}
              {chatEnabled && msgs.map((m: any) => <div key={m.id} className="text-xs"><span className="text-purple-400 font-medium">{m.userName}: </span><span className="text-fuchsia-200/80">{m.message}</span></div>)}
              <div ref={endRef} />
            </div>
            {chatEnabled && <div className="flex items-center gap-2 px-3 py-2 border-t border-fuchsia-500/20"><input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Mesaj yazın..." maxLength={200} className="flex-1 bg-purple-900/40 border border-fuchsia-500/20 rounded-lg px-2.5 py-1.5 text-xs text-fuchsia-200 placeholder:text-fuchsia-400/40 focus:outline-none focus:border-fuchsia-400/50" /><button onClick={send} disabled={sending || !input.trim()} className="p-1.5 text-fuchsia-400 hover:text-fuchsia-300 disabled:opacity-30"><Send className="w-4 h-4" /></button></div>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function GameShell({ gameType, gameName, gameEmoji, gameDesc, supportsAI, supportsBet = true, supportsTimer = true, children }: GameShellProps) {
  const { data: session } = useSession() || {}
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'

  const [phase, setPhase] = useState<'menu' | 'lobby' | 'playing' | 'spectating' | 'result'>('menu')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [gameMode, setGameMode] = useState<'ai' | '2player'>(supportsAI ? 'ai' : '2player')
  const [betType, setBetType] = useState<'FREE' | 'CFC' | 'JETON'>('FREE')
  const [betAmount, setBetAmount] = useState(10)
  const [turnTimer, setTurnTimer] = useState(0)
  const [userBalance, setUserBalance] = useState({ credits: 0, jetonBalance: 0 })
  const [activePlayers, setActivePlayers] = useState(0)
  const [waitingRooms, setWaitingRooms] = useState(0)
  const [waitingGames, setWaitingGames] = useState<GameRoom[]>([])
  const [activeGames, setActiveGames] = useState<any[]>([])
  const [myWaiting, setMyWaiting] = useState<string | null>(null)
  const [lobbyTab, setLobbyTab] = useState<'play' | 'watch'>('play')
  const [lobbyLoading, setLobbyLoading] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [isSpectator, setIsSpectator] = useState(false)
  const [chatEnabled, setChatEnabled] = useState(true)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`/api/games/room?type=stats&gameType=${gameType}`)
      if (r.ok) { const d = await r.json(); setActivePlayers(d.activePlayers || 0); setWaitingRooms(d.waitingRooms || 0) }
    } catch {}
  }, [gameType])

  useEffect(() => { fetchStats(); const iv = setInterval(fetchStats, 15000); return () => clearInterval(iv) }, [fetchStats])
  useEffect(() => { if (session?.user) fetch('/api/user/profile').then(r => r.json()).then(d => { if (d.credits !== undefined) setUserBalance({ credits: d.credits, jetonBalance: d.jetonBalance || 0 }) }).catch(() => {}) }, [session?.user])

  const fetchLobby = useCallback(async () => {
    try { const r = await fetch(`/api/games/room?gameType=${gameType}`); if (r.ok) setWaitingGames(await r.json()) } catch {}
  }, [gameType])

  const fetchActive = useCallback(async () => {
    try { const r = await fetch(`/api/games/room?type=active&gameType=${gameType}`); if (r.ok) setActiveGames(await r.json()) } catch {}
  }, [gameType])

  useEffect(() => { if (phase === 'lobby') { fetchLobby(); const iv = setInterval(fetchLobby, 5000); return () => clearInterval(iv) } }, [phase, fetchLobby])

  // Poll game state
  useEffect(() => {
    if ((phase === 'playing' || phase === 'spectating') && roomId && room && !room.isAI) {
      const poll = async () => {
        try {
          const r = await fetch(`/api/games/room/${roomId}`)
          if (r.ok) {
            const g: GameRoom = await r.json()
            setRoom(g); setChatEnabled(g.chatEnabled)
            if (g.status === 'completed') {
              setPhase('result')
              if (pollRef.current) clearInterval(pollRef.current)
              if (soundEnabled && !isSpectator) {
                if (g.winnerId === session?.user?.id) playSound('win')
                else if (!g.winnerId) playSound('draw')
                else playSound('lose')
              }
            }
          }
        } catch {}
      }
      pollRef.current = setInterval(poll, 2000); return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }
  }, [phase, roomId, room?.isAI, session?.user?.id, soundEnabled, isSpectator])

  const createGame = async (isAI: boolean) => {
    if (!session?.user) return
    try {
      const r = await fetch('/api/games/room', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType, isAI, betAmount: betType === 'FREE' ? 0 : betAmount, betCurrency: betType, turnTimer: isAI ? 0 : turnTimer }),
      })
      const d = await r.json()
      if (!r.ok) { alert(d.error || 'Hata'); return }
      setRoomId(d.roomId); setIsSpectator(false)
      if (isAI) {
        const gr = await fetch(`/api/games/room/${d.roomId}`); const g = await gr.json()
        setRoom(g); setChatEnabled(g.chatEnabled); setPhase('playing')
      } else {
        setMyWaiting(d.roomId); setPhase('lobby')
        const check = setInterval(async () => {
          try { const rr = await fetch(`/api/games/room/${d.roomId}`); const g = await rr.json(); if (g.status === 'active' && g.player2Id) { clearInterval(check); setRoom(g); setChatEnabled(g.chatEnabled); setPhase('playing'); setMyWaiting(null) } } catch {}
        }, 3000)
        pollRef.current = check
      }
    } catch { alert('Bağlantı hatası') }
  }

  const joinGame = async (id: string) => {
    if (!session?.user) return; setLobbyLoading(true)
    try {
      const r = await fetch(`/api/games/room/${id}`, { method: 'POST' }); const d = await r.json()
      if (!r.ok) { alert(d.error || 'Hata'); setLobbyLoading(false); return }
      setRoomId(id); setRoom(d.room); setChatEnabled(d.room.chatEnabled); setIsSpectator(false); setPhase('playing')
    } catch { alert('Bağlantı hatası') }
    setLobbyLoading(false)
  }

  const spectateGame = async (id: string) => {
    if (!session?.user) return
    try {
      await fetch(`/api/games/room/${id}/viewers`, { method: 'POST' })
      const r = await fetch(`/api/games/room/${id}`); if (r.ok) { const g = await r.json(); setRoomId(id); setRoom(g); setChatEnabled(g.chatEnabled); setIsSpectator(true); setPhase('spectating') }
    } catch { alert('Bağlantı hatası') }
  }

  const cancelWaiting = async () => {
    if (!myWaiting) return
    try { await fetch(`/api/games/room/${myWaiting}`, { method: 'DELETE' }) } catch {}
    setMyWaiting(null); if (pollRef.current) clearInterval(pollRef.current); setPhase('menu')
  }

  const resetToMenu = () => {
    setPhase('menu'); setRoom(null); setRoomId(null); setMyWaiting(null); setIsSpectator(false); setChatEnabled(true)
    if (pollRef.current) clearInterval(pollRef.current)
    if (session?.user) fetch('/api/user/profile').then(r => r.json()).then(d => { if (d.credits !== undefined) setUserBalance({ credits: d.credits, jetonBalance: d.jetonBalance || 0 }) }).catch(() => {})
    fetchStats()
  }

  const sendMove = async (action: any) => {
    if (!roomId) return null
    const r = await fetch(`/api/games/room/${roomId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) })
    const d = await r.json()
    if (d.success) { setRoom(d.room); if (d.room.status === 'completed') { setPhase('result'); if (soundEnabled && !isSpectator) { if (d.room.winnerId === session?.user?.id) playSound('win'); else if (!d.room.winnerId) playSound('draw'); else playSound('lose') } } }
    return d
  }

  const sendAIState = async (fullState: any) => {
    if (!roomId) return null
    const r = await fetch(`/api/games/room/${roomId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullState }) })
    const d = await r.json()
    if (d.success) { setRoom(d.room); if (d.room.status === 'completed') { setPhase('result'); if (soundEnabled) { if (d.room.winnerId === session?.user?.id) playSound('win'); else if (!d.room.winnerId) playSound('draw'); else playSound('lose') } } }
    return d
  }

  const isMyTurn = room ? ((room.player1Id === session?.user?.id && room.currentTurn === 1) || (room.player2Id === session?.user?.id && room.currentTurn === 2)) : false
  const playerNum = room ? (room.player1Id === session?.user?.id ? 1 : 2) : 1

  const renderMenu = () => (
    <div className="flex flex-col items-center gap-4 sm:gap-5 w-full max-w-md mx-auto px-2">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{gameEmoji} {gameName}</h1>
        <p className="text-fuchsia-300/70 text-xs sm:text-sm mt-1">{gameDesc}</p>
      </div>
      <div className="flex items-center gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /><span className="text-green-300 font-medium">{activePlayers} Oyuncu</span></div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full"><Gamepad2 className="w-3.5 h-3.5 text-purple-400" /><span className="text-purple-300 font-medium">{waitingRooms} Oda</span></div>
      </div>
      {session?.user && <div className="flex gap-3 text-xs sm:text-sm"><div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full"><Coins className="w-4 h-4 text-amber-400" /><span className="text-amber-300 font-medium">{userBalance.credits} CFC</span></div><div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full"><Zap className="w-4 h-4 text-blue-400" /><span className="text-blue-300 font-medium">{userBalance.jetonBalance} Jeton</span></div></div>}

      {supportsAI && <div className="w-full"><label className="text-fuchsia-300 text-xs font-medium mb-2 block">Oyun Modu</label><div className="grid grid-cols-2 gap-2"><button onClick={() => setGameMode('ai')} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm ${gameMode === 'ai' ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}><Bot className="w-4 h-4" /> Yapay Zeka</button><button onClick={() => setGameMode('2player')} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm ${gameMode === '2player' ? 'border-pink-400 bg-pink-500/20 text-pink-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}><Users className="w-4 h-4" /> 2 Kişilik</button></div></div>}

      {supportsTimer && gameMode === '2player' && <div className="w-full"><label className="text-fuchsia-300 text-xs font-medium mb-2 block flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Süre Limiti</label><div className="grid grid-cols-4 gap-2">{[{v:0,l:'Yok'},{v:10,l:'10s'},{v:15,l:'15s'},{v:20,l:'20s'}].map(o => <button key={o.v} onClick={() => setTurnTimer(o.v)} className={`py-2 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm ${turnTimer === o.v ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}>{o.l}</button>)}</div></div>}

      {supportsBet && <><div className="w-full"><label className="text-fuchsia-300 text-xs font-medium mb-2 block">Bahis Tipi</label><div className="grid grid-cols-3 gap-2">{(['FREE','CFC','JETON'] as const).map(t => <button key={t} onClick={() => setBetType(t)} className={`py-2 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm ${betType === t ? (t === 'FREE' ? 'border-green-400 bg-green-500/20 text-green-300' : t === 'CFC' ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-blue-400 bg-blue-500/20 text-blue-300') : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}>{t === 'FREE' ? 'Ücretsiz' : t}</button>)}</div></div>{betType !== 'FREE' && <div className="w-full"><label className="text-fuchsia-300 text-xs font-medium mb-2 block">Bahis Miktarı</label><div className="grid grid-cols-4 gap-2">{[10,25,50,100].map(a => <button key={a} onClick={() => setBetAmount(a)} className={`py-1.5 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm ${betAmount === a ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70'}`}>{a}</button>)}</div></div>}</>}

      {!session?.user ? <p className="text-fuchsia-400/60 text-sm">Oynamak için giriş yapın</p> : <div className="w-full space-y-2">
        <button onClick={() => { if (gameMode === 'ai') createGame(true); else setPhase('lobby') }} className="w-full py-3 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-purple-500/30 text-base">{gameMode === 'ai' ? `${gameEmoji} Oyunu Başlat` : '👥 Lobi\'ye Gir'}</button>
        <button onClick={() => { fetchActive(); setPhase('lobby'); setLobbyTab('watch') }} className="w-full py-2.5 bg-purple-900/40 border border-cyan-500/30 text-cyan-300 font-medium rounded-xl hover:bg-purple-800/40 transition-all text-sm flex items-center justify-center gap-2"><Eye className="w-4 h-4" /> Aktif Oyunları İzle</button>
      </div>}

      <div className="flex items-center justify-between w-full">
        <Link href={`/${lang}/oyunlar`} className="flex items-center gap-2 text-fuchsia-400/60 hover:text-fuchsia-300 text-xs sm:text-sm transition"><ArrowLeft className="w-4 h-4" /> Oyunlara Dön</Link>
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="flex items-center gap-1.5 text-fuchsia-400/60 hover:text-fuchsia-300 text-xs sm:text-sm transition">{soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}{soundEnabled ? ' Ses Açık' : ' Ses Kapalı'}</button>
      </div>
    </div>
  )

  const renderLobby = () => (
    <div className="flex flex-col items-center gap-4 sm:gap-5 w-full max-w-lg mx-auto px-2">
      <h2 className="text-xl sm:text-2xl font-bold text-white">{gameName} Lobisi</h2>
      <div className="flex w-full bg-purple-900/30 rounded-xl p-1 border border-fuchsia-500/20">
        <button onClick={() => setLobbyTab('play')} className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${lobbyTab === 'play' ? 'bg-purple-600/50 text-white' : 'text-fuchsia-400/60'}`}><Gamepad2 className="w-3.5 h-3.5" /> Oyna</button>
        <button onClick={() => { setLobbyTab('watch'); fetchActive() }} className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${lobbyTab === 'watch' ? 'bg-cyan-600/50 text-white' : 'text-fuchsia-400/60'}`}><Eye className="w-3.5 h-3.5" /> İzle</button>
      </div>
      {lobbyTab === 'play' ? <>{myWaiting ? <div className="w-full bg-purple-900/40 border border-fuchsia-500/30 rounded-2xl p-4 text-center"><Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin mx-auto mb-3" /><p className="text-white font-medium">Rakip bekleniyor...</p><button onClick={cancelWaiting} className="mt-4 px-4 py-2 bg-red-600/20 border border-red-500/40 text-red-300 rounded-xl text-sm hover:bg-red-600/30 transition"><X className="w-4 h-4 inline mr-1" /> İptal Et</button></div> : <><button onClick={() => createGame(false)} className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg text-sm">+ Yeni Oda ({betType === 'FREE' ? 'Ücretsiz' : `${betAmount} ${betType}`})</button><div className="w-full"><div className="flex items-center justify-between mb-3"><h3 className="text-fuchsia-300 font-medium text-sm">Açık Odalar</h3><button onClick={fetchLobby} className="text-fuchsia-400/60 hover:text-fuchsia-300"><RefreshCw className="w-4 h-4" /></button></div>{waitingGames.length === 0 ? <p className="text-fuchsia-400/50 text-sm text-center py-4">Bekleyen oda yok</p> : <div className="space-y-2">{waitingGames.map(g => <div key={g.id} className="flex items-center justify-between p-3 bg-purple-900/30 border border-fuchsia-500/20 rounded-xl"><div><p className="text-white text-sm font-medium">{g.player1Name}</p><p className="text-fuchsia-400/60 text-xs">{g.betCurrency === 'FREE' ? 'Ücretsiz' : `${g.betAmount} ${g.betCurrency}`}{g.turnTimer > 0 && ` • ${g.turnTimer}s`}</p></div><button onClick={() => joinGame(g.id)} disabled={lobbyLoading} className="px-4 py-2 bg-green-600/20 border border-green-500/40 text-green-300 rounded-lg text-sm font-medium hover:bg-green-600/30 transition disabled:opacity-50">Katıl</button></div>)}</div>}</div></>}</> : <div className="w-full"><div className="flex items-center justify-between mb-3"><h3 className="text-cyan-300 font-medium text-sm">Aktif Oyunlar</h3><button onClick={fetchActive} className="text-fuchsia-400/60 hover:text-fuchsia-300"><RefreshCw className="w-4 h-4" /></button></div>{activeGames.length === 0 ? <p className="text-fuchsia-400/50 text-sm text-center py-6">Şu an aktif oyun yok</p> : <div className="space-y-2">{activeGames.map((g: any) => <div key={g.id} className="flex items-center justify-between p-3 bg-purple-900/30 border border-cyan-500/20 rounded-xl"><div><p className="text-white text-sm font-medium">{g.player1Name} vs {g.player2Name}</p><p className="text-fuchsia-400/60 text-xs">{g.player1Score}-{g.player2Score}{g.betAmount > 0 && ` • ${g.betAmount} ${g.betCurrency}`}</p><p className="text-cyan-400/60 text-[10px] flex items-center gap-1 mt-0.5"><Eye className="w-3 h-3" /> {g.viewerCount} izleyici</p></div><button onClick={() => spectateGame(g.id)} className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 rounded-lg text-sm font-medium hover:bg-cyan-600/30 transition">İzle</button></div>)}</div>}</div>}
      <button onClick={resetToMenu} className="flex items-center gap-2 text-fuchsia-400/60 hover:text-fuchsia-300 text-xs sm:text-sm transition"><ArrowLeft className="w-4 h-4" /> Menüye Dön</button>
    </div>
  )

  const renderResult = () => {
    if (!room) return null
    const isWinner = room.winnerId === session?.user?.id
    const isDraw = room.status === 'completed' && !room.winnerId
    const payout = Math.floor(room.betAmount * 2 * 0.9)
    return (
      <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-md mx-auto text-center px-2">
        {isSpectator && <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-300 text-xs"><Eye className="w-3.5 h-3.5" /> İzleyici Modu</div>}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="text-5xl sm:text-6xl">{isSpectator ? '🏁' : isWinner ? '🏆' : isDraw ? '🤝' : '😔'}</motion.div>
        <h2 className={`text-2xl sm:text-3xl font-bold ${isSpectator ? 'text-cyan-300' : isWinner ? 'text-yellow-400' : isDraw ? 'text-fuchsia-300' : 'text-red-400'}`}>{isSpectator ? (room.winnerId ? `${room.winnerId === room.player1Id ? room.player1Name : room.player2Name} Kazandı!` : 'Berabere!') : isWinner ? 'Tebrikler! Kazandınız!' : isDraw ? 'Berabere!' : 'Kaybettiniz!'}</h2>
        <p className="text-fuchsia-300/70 text-sm">{room.player1Name}: {room.player1Score} - {room.player2Name}: {room.player2Score}</p>
        {room.betAmount > 0 && !isSpectator && <div className={`px-4 py-3 rounded-xl border-2 ${isWinner ? 'border-yellow-400/50 bg-yellow-500/10' : isDraw ? 'border-fuchsia-400/50 bg-fuchsia-500/10' : 'border-red-400/50 bg-red-500/10'}`}>{isWinner ? <p className="text-yellow-300 font-bold">+{payout} {room.betCurrency} kazandınız!</p> : isDraw ? <p className="text-fuchsia-300 text-sm">Bahsiniz iade edildi</p> : <p className="text-red-300 text-sm">-{room.betAmount} {room.betCurrency}</p>}</div>}
        <div className="flex gap-3"><button onClick={resetToMenu} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg text-sm"><RotateCcw className="w-4 h-4 inline mr-2" /> Yeni Oyun</button><Link href={`/${lang}/oyunlar`} className="px-5 py-2.5 bg-purple-900/40 border border-fuchsia-500/30 text-fuchsia-300 font-medium rounded-xl hover:bg-purple-800/40 transition text-sm">Oyunlara Dön</Link></div>
      </div>
    )
  }

  const renderGame = () => {
    if (!room) return null
    const state = JSON.parse(room.state)
    const isOwner = room.player1Id === session?.user?.id
    return (
      <div className="flex flex-col items-center gap-3 sm:gap-4 w-full px-1">
        {isSpectator && <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-300 text-xs"><Eye className="w-3.5 h-3.5" /> İzleyici Modu{room.viewerCount ? ` (${room.viewerCount})` : ''}</div>}
        <div className="flex items-center justify-center gap-2 text-xs text-fuchsia-300/60"><Users className="w-3.5 h-3.5" /><span>{room.player1Name}</span><span className="text-fuchsia-400/30">vs</span><span>{room.player2Name}</span>{room.isAI && <Bot className="w-3.5 h-3.5 text-cyan-400" />}</div>
        <div className="flex items-center gap-2 sm:gap-4 w-full max-w-sm">
          <div className={`flex-1 text-center py-1.5 rounded-xl border-2 transition-all ${room.currentTurn === 1 && room.status === 'active' ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.3)]' : 'border-fuchsia-500/20 bg-purple-900/20'}`}><p className="text-[10px] text-fuchsia-300/60 truncate px-1">{room.player1Name}</p><p className="text-xl font-bold text-cyan-300">{room.player1Score}</p></div>
          <div className="flex flex-col items-center"><span className="text-fuchsia-400/40 text-[10px]">VS</span>{room.betAmount > 0 && <span className="text-yellow-400 text-[10px] font-medium">{room.betAmount} {room.betCurrency}</span>}</div>
          <div className={`flex-1 text-center py-1.5 rounded-xl border-2 transition-all ${room.currentTurn === 2 && room.status === 'active' ? 'border-pink-400 bg-pink-500/20 shadow-[0_0_12px_rgba(236,72,153,0.3)]' : 'border-fuchsia-500/20 bg-purple-900/20'}`}><p className="text-[10px] text-fuchsia-300/60 truncate px-1">{room.player2Name}</p><p className="text-xl font-bold text-pink-300">{room.player2Score}</p></div>
        </div>
        {children({ room, state, isMyTurn: isSpectator ? false : isMyTurn, isSpectator, playerNum, sendMove, sendAIState, soundEnabled })}
        <button onClick={isSpectator ? async () => { if (roomId) { try { await fetch(`/api/games/room/${roomId}/viewers`, { method: 'DELETE' }) } catch {} }; resetToMenu() } : resetToMenu} className="flex items-center gap-2 text-fuchsia-400/60 hover:text-fuchsia-300 text-xs sm:text-sm transition mt-1"><ArrowLeft className="w-4 h-4" /> {isSpectator ? 'İzlemeyi Bırak' : 'Ayrıl'}</button>
        {!room.isAI && room.status === 'active' && roomId && <MiniChat roomId={roomId} isOwner={isOwner} chatEnabled={chatEnabled} onToggle={setChatEnabled} />}
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 sm:pb-10 px-2 sm:px-4">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div key={phase} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            {phase === 'menu' && renderMenu()}
            {phase === 'lobby' && renderLobby()}
            {(phase === 'playing' || phase === 'spectating') && renderGame()}
            {phase === 'result' && renderResult()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
