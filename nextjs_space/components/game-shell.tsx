'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Users, Bot, Coins, Trophy, RotateCcw,
  Zap, X, Loader2, RefreshCw, Volume2, VolumeX, Gamepad2,
  MessageCircle, Send, Eye, EyeOff, Timer, Plus, LogIn, Clock, Gift
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
  disconnectedPlayerId?: string | null
  viewerCount?: number
  aiDifficulty?: string
  reconnected?: boolean
  aiTakeover?: boolean
}

interface GameShellProps {
  gameType: string
  gameName: string
  gameEmoji: string
  gameDesc: string
  supportsAI: boolean
  supportsBet?: boolean
  supportsTimer?: boolean
  gridSizeOptions?: number[]
  children: (props: {
    room: GameRoom
    state: any
    isMyTurn: boolean
    isSpectator: boolean
    playerNum: number
    sendMove: (action: any) => Promise<any>
    sendAIState: (fullState: any) => Promise<any>
    soundEnabled: boolean
    aiDifficulty: string
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

// Win popup overlay
function WinPopup({ room, userId, onDone }: { room: GameRoom; userId: string | undefined; onDone: () => void }) {
  const [visible, setVisible] = useState(true)
  const isWinner = room.winnerId === userId
  const isDraw = room.status === 'completed' && !room.winnerId
  const winnerName = room.winnerId === room.player1Id ? room.player1Name : room.player2Name
  const payout = Math.floor(room.betAmount * 2 * 0.9)

  useEffect(() => {
    const timer = setTimeout(() => { setVisible(false); setTimeout(onDone, 500) }, 4000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => { setVisible(false); setTimeout(onDone, 300) }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.2, 1], rotate: [0, 5, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="text-center px-8 py-6 rounded-3xl border-2 max-w-sm mx-4"
            style={{
              background: isDraw ? 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.3))' : isWinner ? 'linear-gradient(135deg, rgba(234,179,8,0.3), rgba(245,158,11,0.3))' : 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(185,28,28,0.3))',
              borderColor: isDraw ? 'rgba(168,85,247,0.5)' : isWinner ? 'rgba(234,179,8,0.5)' : 'rgba(239,68,68,0.5)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: 3, duration: 0.5 }}
              className="text-6xl mb-3"
            >
              {isDraw ? '🤝' : isWinner ? '🏆' : '😔'}
            </motion.div>
            <h2 className={`text-2xl font-bold mb-2 ${isDraw ? 'text-purple-300' : isWinner ? 'text-yellow-400' : 'text-red-400'}`}>
              {isDraw ? 'Berabere!' : `${winnerName} Kazandı!`}
            </h2>
            <p className="text-fuchsia-300/70 text-sm mb-2">
              {room.player1Name}: {room.player1Score} - {room.player2Name}: {room.player2Score}
            </p>
            {room.betAmount > 0 && !isDraw && room.winnerId && (
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: 2, duration: 0.6 }}
                className="text-yellow-300 font-bold text-lg"
              >
                +{payout} {room.betCurrency}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Recent winner banner (replaces ticker)
function WinnerBanner({ winners, gameEmoji }: { winners: any[]; gameEmoji: string }) {
  const [current, setCurrent] = useState<any | null>(null)
  const shownRef = useRef(new Set<string>())

  useEffect(() => {
    // Load shown winners from sessionStorage
    try {
      const stored = sessionStorage.getItem('shown_winners')
      if (stored) shownRef.current = new Set(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    if (!winners || winners.length === 0) return
    // Find first winner not yet shown
    const unseen = winners.find(w => !shownRef.current.has(w.id))
    if (unseen && !current) {
      shownRef.current.add(unseen.id)
      try { sessionStorage.setItem('shown_winners', JSON.stringify([...shownRef.current])) } catch {}
      setCurrent(unseen)
      setTimeout(() => setCurrent(null), 3000)
    }
  }, [winners, current])

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full rounded-2xl overflow-hidden mb-3"
        >
          <div className="relative bg-gradient-to-r from-yellow-600/30 via-amber-500/20 to-yellow-600/30 border border-yellow-500/40 rounded-2xl px-4 py-3 text-center">
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} className="absolute inset-0 bg-yellow-400/5 rounded-2xl" />
            <p className="text-yellow-400 font-bold text-sm relative z-10">
              🏆 {current.winnerName} {gameEmoji} oyununda {current.payout > 0 ? `${current.payout} ${current.currency}` : ''} kazandı!
            </p>
            <p className="text-yellow-300/60 text-xs relative z-10 mt-0.5">Skor: {current.score}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Gift items for games
const GAME_GIFTS = [
  { id: 'yumurta', emoji: '🥚', name: 'Yumurta', animation: 'throw' },
  { id: 'terlik', emoji: '🩴', name: 'Terlik', animation: 'throw' },
  { id: 'bomba', emoji: '💣', name: 'Bomba', animation: 'explode' },
  { id: 'gul', emoji: '🌹', name: 'Gül', animation: 'float' },
  { id: 'kahve', emoji: '☕', name: 'Kahve', animation: 'float' },
  { id: 'cay', emoji: '🍵', name: 'Çay', animation: 'float' },
  { id: 'tesbih', emoji: '📿', name: 'Tesbih', animation: 'float' },
]

// Floating gift animation component
function GiftAnimation({ gift, onDone }: { gift: { emoji: string; name: string; sender: string; animation: string }; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500)
    return () => clearTimeout(timer)
  }, [onDone])

  const isThrow = gift.animation === 'throw'
  const isExplode = gift.animation === 'explode'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.3, y: isThrow ? 100 : 50, x: isThrow ? -100 : 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: isExplode ? [0.3, 1.5, 2, 0] : [0.3, 1.2, 1, 0.5],
        y: isThrow ? [100, -20, -40, -80] : [50, -20, -50, -100],
        x: isThrow ? [-100, 0, 20, 40] : [0, 0, 0, 0],
        rotate: isThrow ? [0, -20, 10, 360] : [0, 0, 0, 0],
      }}
      transition={{ duration: 2.2, ease: 'easeOut' }}
      className="fixed z-[200] pointer-events-none flex flex-col items-center"
      style={{ top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}
    >
      <span className="text-6xl drop-shadow-2xl">{gift.emoji}</span>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2 }}
        className="text-white text-xs font-bold mt-1 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm"
      >
        {gift.sender} → {gift.name}
      </motion.p>
    </motion.div>
  )
}

// Popup message component (messages float up and disappear)
function PopupMessages({ messages }: { messages: Array<{ id: string; userName: string; message: string; ts: number }> }) {
  return (
    <div className="fixed bottom-16 left-2 right-2 z-[90] pointer-events-none flex flex-col gap-1.5 max-h-[200px] overflow-hidden">
      <AnimatePresence>
        {messages.slice(-8).map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -30, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.7 }}
            transition={{ duration: 0.3 }}
            className="bg-black/80 backdrop-blur-xl rounded-xl px-3 py-2 border border-fuchsia-500/30 shadow-lg shadow-black/30 max-w-[85%]"
          >
            <span className="text-cyan-400 text-xs font-bold">{m.userName}: </span>
            <span className="text-white text-xs">{m.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Chat input bar + gift panel (always visible at bottom of game)
function GameChatBar({ roomId, isAI, onGiftSend }: { roomId: string; isAI: boolean; onGiftSend: (gift: typeof GAME_GIFTS[0], sender: string) => void }) {
  const { data: session } = useSession() || {}
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showGifts, setShowGifts] = useState(false)

  const send = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      await fetch(`/api/games/room/${roomId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: input.trim() }) })
      setInput('')
    } catch {}
    setSending(false)
  }

  const sendGift = (gift: typeof GAME_GIFTS[0]) => {
    const senderName = (session?.user as any)?.name || 'Misafir'
    onGiftSend(gift, senderName)
    // Also send as chat message
    fetch(`/api/games/room/${roomId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `${gift.emoji} ${gift.name} gönderdi!` }) }).catch(() => {})
    setShowGifts(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[80]">
      {/* Gift panel */}
      <AnimatePresence>
        {showGifts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mx-2 mb-1 bg-[#1a0a2e]/95 backdrop-blur-xl border border-fuchsia-500/30 rounded-2xl p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-fuchsia-300 text-xs font-bold">🎁 Hediye Gönder</span>
              <button onClick={() => setShowGifts(false)}><X className="w-4 h-4 text-fuchsia-400" /></button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {GAME_GIFTS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => sendGift(g)}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-xl hover:bg-purple-500/20 transition group"
                >
                  <span className="text-2xl group-hover:scale-125 transition-transform">{g.emoji}</span>
                  <span className="text-[8px] text-fuchsia-300/70">{g.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat input */}
      <div className="flex items-center gap-1.5 px-2 py-2 bg-[#0d0520]/90 backdrop-blur-xl border-t border-fuchsia-500/20">
        <button onClick={() => setShowGifts(!showGifts)} className={`p-2 rounded-xl transition ${showGifts ? 'bg-fuchsia-600 text-white' : 'bg-purple-900/50 text-fuchsia-400 hover:bg-purple-800/50'}`}>
          <Gift className="w-4 h-4" />
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Mesaj yaz..."
          className="flex-1 px-3 py-2 bg-purple-900/50 border border-fuchsia-500/20 rounded-xl text-white text-xs focus:outline-none focus:border-fuchsia-400/50"
        />
        <button onClick={send} disabled={sending || !input.trim()} className="p-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl disabled:opacity-40 transition">
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  )
}

export default function GameShell({ gameType, gameName, gameEmoji, gameDesc, supportsAI, supportsBet = true, supportsTimer = true, gridSizeOptions, children }: GameShellProps) {
  const { data: session } = useSession() || {}
  const params = useParams()
  const searchParams = useSearchParams()
  const lang = (params?.lang as string) || 'tr'

  const [phase, setPhase] = useState<'menu' | 'lobby' | 'playing' | 'spectating' | 'result'>('menu')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [gameMode, setGameMode] = useState<'ai' | '2player'>(supportsAI ? 'ai' : '2player')
  const [betType, setBetType] = useState<'FREE' | 'CFC' | 'JETON'>('FREE')
  const [betAmount, setBetAmount] = useState(10)
  const [turnTimer, setTurnTimer] = useState(0)
  const [gridSize, setGridSize] = useState(gridSizeOptions?.[0] || 0)
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'hard'>('easy')
  const [userBalance, setUserBalance] = useState({ credits: 0, jetonBalance: 0 })
  const [activePlayers, setActivePlayers] = useState(0)
  const [waitingRooms, setWaitingRooms] = useState(0)
  const [waitingGames, setWaitingGames] = useState<GameRoom[]>([])
  const [activeGames, setActiveGames] = useState<any[]>([])
  const [myWaiting, setMyWaiting] = useState<string | null>(null)
  const [lobbyLoading, setLobbyLoading] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [isSpectator, setIsSpectator] = useState(false)
  const [chatEnabled, setChatEnabled] = useState(true)
  const [showWinPopup, setShowWinPopup] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const waitTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [recentWinners, setRecentWinners] = useState<any[]>([])
  // Chat popup messages
  const [popupMessages, setPopupMessages] = useState<Array<{ id: string; userName: string; message: string; ts: number }>>([])
  const lastChatRef = useRef<string | null>(null)
  // Gift animations
  const [activeGift, setActiveGift] = useState<{ emoji: string; name: string; sender: string; animation: string } | null>(null)

  // Force FREE for AI mode
  useEffect(() => {
    if (gameMode === 'ai') { setBetType('FREE'); setBetAmount(0) }
  }, [gameMode])

  // Check for active game to reconnect to on mount
  useEffect(() => {
    if (!session?.user?.id || phase !== 'menu') return
    const checkReconnect = async () => {
      try {
        const r = await fetch(`/api/games/room?type=reconnect&gameType=${gameType}`)
        if (r.ok) {
          const data = await r.json()
          if (data.roomId) {
            // Found an active game to reconnect to
            const gr = await fetch(`/api/games/room/${data.roomId}`)
            if (gr.ok) {
              const g: GameRoom = await gr.json()
              if (g.status === 'active') {
                setRoomId(data.roomId)
                setRoom(g)
                setChatEnabled(g.chatEnabled)
                setIsSpectator(false)
                setPhase('playing')
              }
            }
          }
        }
      } catch {}
    }
    checkReconnect()
  }, [session?.user?.id, gameType])

  // Handle ?join=roomId (join existing room) and ?room=roomId (created room, wait for opponent) from lobby
  const joinHandledRef = useRef(false)
  useEffect(() => {
    const joinId = searchParams?.get('join')
    const waitRoomId = searchParams?.get('room')
    if ((!joinId && !waitRoomId) || !session?.user?.id || joinHandledRef.current) return
    joinHandledRef.current = true

    // Clean up URL params immediately
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('join')
      url.searchParams.delete('room')
      window.history.replaceState({}, '', url.toString())
    }

    if (joinId) {
      // Join an existing waiting room - immediately hide menu
      setIsJoining(true)
      setRoomId(joinId)
      const doJoin = async () => {
        try {
          const r = await fetch(`/api/games/room/${joinId}`, { method: 'POST' })
          const d = await r.json()
          if (r.ok && d.success) {
            setRoomId(joinId)
            setRoom(d.room)
            setChatEnabled(d.room.chatEnabled)
            setIsSpectator(false)
            setPhase('playing')
          } else {
            // If POST fails, maybe user is already a player
            const gr = await fetch(`/api/games/room/${joinId}`)
            if (gr.ok) {
              const g: GameRoom = await gr.json()
              if (g.status === 'active' && (g.player1Id === session.user.id || g.player2Id === session.user.id)) {
                setRoomId(joinId)
                setRoom(g)
                setChatEnabled(g.chatEnabled)
                setIsSpectator(false)
                setPhase('playing')
              } else {
                alert(d.error || 'Bu odaya katılınamaz')
              }
            } else {
              alert(d.error || 'Oda bulunamadı')
            }
          }
        } catch {
          alert('Bağlantı hatası')
        } finally {
          setIsJoining(false)
        }
      }
      doJoin()
    } else if (waitRoomId) {
      // Created a room, wait for opponent to join (stay in menu with waiting state)
      setRoomId(waitRoomId)
      setMyWaiting(waitRoomId)
      const check = setInterval(async () => {
        try {
          const rr = await fetch(`/api/games/room/${waitRoomId}`)
          const g = await rr.json()
          if (g.status === 'active' && g.player2Id) {
            clearInterval(check)
            if (waitTimeoutRef.current) { clearTimeout(waitTimeoutRef.current); waitTimeoutRef.current = null }
            setRoom(g)
            setChatEnabled(g.chatEnabled)
            setPhase('playing')
            setMyWaiting(null)
          }
        } catch {}
      }, 3000)
      pollRef.current = check
      // Auto-cancel after 2 minutes if no opponent joins
      waitTimeoutRef.current = setTimeout(async () => {
        clearInterval(check)
        try { await fetch(`/api/games/room/${waitRoomId}`, { method: 'DELETE' }) } catch {}
        setMyWaiting(null)
        setPhase('menu')
        setRoomId(null)
        alert('2 dakika içinde rakip bulunamadı, masa kapatıldı.')
        window.location.href = `/${lang}/oyunlar`
      }, 120000)
    }
  }, [searchParams, session?.user?.id])

  // Poll chat messages for popup display (for all games including AI)
  useEffect(() => {
    if ((phase === 'playing' || phase === 'spectating') && roomId) {
      const pollChat = async () => {
        try {
          const p = lastChatRef.current ? `?after=${lastChatRef.current}` : ''
          const r = await fetch(`/api/games/room/${roomId}/chat${p}`)
          if (r.ok) {
            const msgs = await r.json()
            if (msgs.length > 0) {
              lastChatRef.current = msgs[msgs.length - 1].createdAt
              const newPopups = msgs.map((m: any) => ({ id: m.id, userName: m.userName, message: m.message, ts: Date.now() }))
              setPopupMessages(prev => [...prev, ...newPopups].slice(-10))
            }
          }
        } catch {}
      }
      pollChat()
      const iv = setInterval(pollChat, 5000)
      return () => clearInterval(iv)
    }
  }, [phase, roomId])

  // Auto-remove old popup messages after 5 seconds
  useEffect(() => {
    if (popupMessages.length === 0) return
    const timer = setInterval(() => {
      const now = Date.now()
      setPopupMessages(prev => prev.filter(m => now - m.ts < 8000))
    }, 1000)
    return () => clearInterval(timer)
  }, [popupMessages.length])

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`/api/games/room?type=stats&gameType=${gameType}`)
      if (r.ok) {
        const d = await r.json()
        setActivePlayers(d.activePlayers || 0)
        setWaitingRooms(d.waitingRooms || 0)
        if (d.recentWinners) setRecentWinners(d.recentWinners)
      }
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

  useEffect(() => { if (phase === 'menu') { fetchLobby(); fetchActive(); const iv = setInterval(() => { fetchLobby(); fetchActive() }, 10000); return () => clearInterval(iv) } }, [phase, fetchLobby, fetchActive])
  // Also fetch lobby on mount for guests
  useEffect(() => { fetchLobby(); fetchActive() }, [fetchLobby, fetchActive])

  // Poll game state (for PvP games, AI-takeover games, and spectators)
  useEffect(() => {
    const shouldPoll = (phase === 'playing' || phase === 'spectating') && roomId && room && (
      !room.isAI || // Always poll PvP games
      room.disconnectedPlayerId || // Poll AI-takeover games (for reconnection/auto-close)
      isSpectator // Always poll as spectator
    )
    if (shouldPoll) {
      const poll = async () => {
        try {
          const r = await fetch(`/api/games/room/${roomId}`)
          if (r.ok) {
            const g: GameRoom = await r.json()
            setRoom(g); setChatEnabled(g.chatEnabled)
            if (g.status === 'completed') {
              handleGameEnd(g)
            } else if (g.status === 'cancelled') {
              // Room was auto-closed (both players left)
              resetToMenu()
            }
          }
        } catch {}
      }
      pollRef.current = setInterval(poll, 3000); return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }
  }, [phase, roomId, room?.isAI, room?.disconnectedPlayerId, session?.user?.id, soundEnabled, isSpectator])

  const handleGameEnd = (g: GameRoom) => {
    setPhase('result')
    if (pollRef.current) clearInterval(pollRef.current)
    const popupKey = `win_popup_${g.id}`
    if (typeof window !== 'undefined' && !sessionStorage.getItem(popupKey)) {
      sessionStorage.setItem(popupKey, '1')
      setShowWinPopup(true)
    }
    if (soundEnabled && !isSpectator) {
      if (g.winnerId === session?.user?.id) playSound('win')
      else if (!g.winnerId) playSound('draw')
      else playSound('lose')
    }
  }

  const createGame = async (isAI: boolean) => {
    if (!session?.user) return
    // AI games are always free
    const finalBetType = isAI ? 'FREE' : betType
    const finalBetAmount = isAI ? 0 : (finalBetType === 'FREE' ? 0 : betAmount)
    try {
      const r = await fetch('/api/games/room', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType, isAI, betAmount: finalBetAmount, betCurrency: finalBetType, turnTimer: isAI ? 0 : turnTimer, ...(gridSize > 0 ? { gridSize } : {}) }),
      })
      const d = await r.json()
      if (!r.ok) { alert(d.error || 'Hata'); return }
      setRoomId(d.roomId); setIsSpectator(false)
      if (isAI) {
        const gr = await fetch(`/api/games/room/${d.roomId}`); const g = await gr.json()
        setRoom(g); setChatEnabled(g.chatEnabled); setPhase('playing')
      } else {
        // Stay in menu with waiting indicator (no separate lobby phase)
        setMyWaiting(d.roomId)
        const check = setInterval(async () => {
          try { const rr = await fetch(`/api/games/room/${d.roomId}`); const g = await rr.json(); if (g.status === 'active' && g.player2Id) { clearInterval(check); if (waitTimeoutRef.current) { clearTimeout(waitTimeoutRef.current); waitTimeoutRef.current = null }; setRoom(g); setChatEnabled(g.chatEnabled); setPhase('playing'); setMyWaiting(null) } } catch {}
        }, 3000)
        pollRef.current = check
        // Auto-cancel after 2 minutes if no opponent joins
        waitTimeoutRef.current = setTimeout(async () => {
          clearInterval(check)
          try { await fetch(`/api/games/room/${d.roomId}`, { method: 'DELETE' }) } catch {}
          setMyWaiting(null); setPhase('menu'); setRoomId(null)
          alert('2 dakika içinde rakip bulunamadı, masa kapatıldı.')
          window.location.href = `/${lang}/oyunlar`
        }, 120000)
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
    try {
      if (session?.user) {
        await fetch(`/api/games/room/${id}/viewers`, { method: 'POST' })
      }
      const r = await fetch(`/api/games/room/${id}`); if (r.ok) { const g = await r.json(); setRoomId(id); setRoom(g); setChatEnabled(g.chatEnabled); setIsSpectator(true); setPhase('spectating') }
    } catch { alert('Bağlantı hatası') }
  }

  const cancelWaiting = async () => {
    if (!myWaiting) return
    try { await fetch(`/api/games/room/${myWaiting}`, { method: 'DELETE' }) } catch {}
    setMyWaiting(null); if (pollRef.current) clearInterval(pollRef.current); if (waitTimeoutRef.current) { clearTimeout(waitTimeoutRef.current); waitTimeoutRef.current = null }; setPhase('menu')
  }

  const leaveGame = async () => {
    if (roomId && room && room.status === 'active' && !isSpectator && !room.isAI) {
      try {
        await fetch(`/api/games/room/${roomId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave' }),
        })
      } catch {}
    }
    resetToMenu()
  }

  const resetToMenu = () => {
    setPhase('menu'); setRoom(null); setRoomId(null); setMyWaiting(null); setIsSpectator(false); setChatEnabled(true); setShowWinPopup(false)
    setPopupMessages([]); lastChatRef.current = null; setActiveGift(null)
    if (pollRef.current) clearInterval(pollRef.current)
    if (waitTimeoutRef.current) { clearTimeout(waitTimeoutRef.current); waitTimeoutRef.current = null }
    if (session?.user) fetch('/api/user/profile').then(r => r.json()).then(d => { if (d.credits !== undefined) setUserBalance({ credits: d.credits, jetonBalance: d.jetonBalance || 0 }) }).catch(() => {})
    fetchStats()
  }

  const handleGiftSend = (gift: typeof GAME_GIFTS[0], sender: string) => {
    setActiveGift({ emoji: gift.emoji, name: gift.name, sender, animation: gift.animation })
  }

  const sendMove = async (action: any) => {
    if (!roomId) return null
    const r = await fetch(`/api/games/room/${roomId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) })
    const d = await r.json()
    if (d.success) {
      setRoom(d.room)
      if (d.room.status === 'completed') handleGameEnd(d.room)
    }
    return d
  }

  const sendAIState = async (fullState: any) => {
    if (!roomId) return null
    const r = await fetch(`/api/games/room/${roomId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullState }) })
    const d = await r.json()
    if (d.success) {
      setRoom(d.room)
      if (d.room.status === 'completed') handleGameEnd(d.room)
    }
    return d
  }

  const isMyTurn = room ? ((room.player1Id === session?.user?.id && room.currentTurn === 1) || (room.player2Id === session?.user?.id && room.currentTurn === 2)) : false
  const playerNum = room ? (room.player1Id === session?.user?.id ? 1 : 2) : 1

  const GAME_NAMES: Record<string, string> = { xox: 'XOX', sayi_tahmin: 'Sayı Tahmin', zar: 'Zar', tombala: 'Tombala', tavla: 'Tavla', pisti: 'Pişti', okey: 'Okey', okey101: '101 Okey', yuzbirokey: 'Yüz Bir Okey' }

  const renderMenu = () => (
    <div className="flex flex-col items-center gap-4 sm:gap-5 w-full max-w-lg mx-auto px-2">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{gameEmoji} {gameName}</h1>
        <p className="text-fuchsia-300/70 text-xs sm:text-sm mt-1">{gameDesc}</p>
      </div>

      {/* Winner banner instead of ticker */}
      <WinnerBanner winners={recentWinners} gameEmoji={gameEmoji} />

      <div className="flex items-center gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full"><div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" /><span className="text-yellow-300 font-medium">Oyunda {activePlayers} kişi</span></div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full"><Gamepad2 className="w-3.5 h-3.5 text-purple-400" /><span className="text-purple-300 font-medium">{waitingRooms} Oda</span></div>
      </div>
      {session?.user && <div className="flex gap-3 text-xs sm:text-sm"><div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full"><Coins className="w-4 h-4 text-amber-400" /><span className="text-amber-300 font-medium">{userBalance.credits} CFC</span></div><div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full"><Zap className="w-4 h-4 text-blue-400" /><span className="text-blue-300 font-medium">{userBalance.jetonBalance} Jeton</span></div></div>}

      {/* Game Mode */}
      {supportsAI && <div className="w-full"><label className="text-fuchsia-300 text-xs font-medium mb-2 block">Oyun Modu</label><div className="grid grid-cols-2 gap-2"><button onClick={() => setGameMode('ai')} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm ${gameMode === 'ai' ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}><Bot className="w-4 h-4" /> Yapay Zeka</button><button onClick={() => setGameMode('2player')} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm ${gameMode === '2player' ? 'border-pink-400 bg-pink-500/20 text-pink-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}><Users className="w-4 h-4" /> 2 Kişilik</button></div></div>}

      {/* AI Difficulty - only for AI mode */}
      {supportsAI && gameMode === 'ai' && <div className="w-full"><label className="text-fuchsia-300 text-xs font-medium mb-2 block flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Zorluk Seviyesi</label><div className="grid grid-cols-2 gap-2"><button onClick={() => setAiDifficulty('easy')} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm ${aiDifficulty === 'easy' ? 'border-green-400 bg-green-500/20 text-green-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}>😊 Kolay</button><button onClick={() => setAiDifficulty('hard')} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm ${aiDifficulty === 'hard' ? 'border-red-400 bg-red-500/20 text-red-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}>🔥 Zor</button></div></div>}

      {/* Grid Size - only if gridSizeOptions provided */}
      {gridSizeOptions && gridSizeOptions.length > 1 && <div className="w-full"><label className="text-fuchsia-300 text-xs font-medium mb-2 block">Oyun Alanı</label><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(gridSizeOptions.length, 4)}, 1fr)` }}>{gridSizeOptions.map(s => <button key={s} onClick={() => setGridSize(s)} className={`py-2 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm ${gridSize === s ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}>{s}x{s}</button>)}</div>{gridSize >= 6 && <p className="text-xs text-gray-500 mt-1">5&apos;li sıra yapan kazanır</p>}</div>}

      {/* Timer - only for 2player */}
      {supportsTimer && gameMode === '2player' && <div className="w-full"><label className="text-fuchsia-300 text-xs font-medium mb-2 block flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Süre Limiti</label><div className="grid grid-cols-4 gap-2">{[{v:0,l:'Yok'},{v:10,l:'10s'},{v:15,l:'15s'},{v:20,l:'20s'}].map(o => <button key={o.v} onClick={() => setTurnTimer(o.v)} className={`py-2 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm ${turnTimer === o.v ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}>{o.l}</button>)}</div></div>}

      {/* Bet - only for 2player mode */}
      {supportsBet && gameMode === '2player' && <><div className="w-full"><label className="text-fuchsia-300 text-xs font-medium mb-2 block">Bahis Tipi</label><div className="grid grid-cols-3 gap-2">{(['FREE','CFC','JETON'] as const).map(t => <button key={t} onClick={() => setBetType(t)} className={`py-2 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm ${betType === t ? (t === 'FREE' ? 'border-green-400 bg-green-500/20 text-green-300' : t === 'CFC' ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-blue-400 bg-blue-500/20 text-blue-300') : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}>{t === 'FREE' ? 'Ücretsiz' : t}</button>)}</div></div>{betType !== 'FREE' && <div className="w-full"><label className="text-fuchsia-300 text-xs font-medium mb-2 block">Bahis Miktarı</label><div className="grid grid-cols-4 gap-2">{[10,25,50,100].map(a => <button key={a} onClick={() => setBetAmount(a)} className={`py-1.5 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm ${betAmount === a ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70'}`}>{a}</button>)}</div></div>}</>}

      {/* ACTION BUTTONS */}
      {!session?.user ? <p className="text-fuchsia-400/60 text-sm">Oynamak için giriş yapın</p> : <div className="w-full space-y-2">
        {gameMode === 'ai' ? (
          <button onClick={() => createGame(true)} className="w-full py-3 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-purple-500/30 text-base">{gameEmoji} Oyunu Başlat ({aiDifficulty === 'easy' ? '😊 Kolay' : '🔥 Zor'} - Ücretsiz)</button>
        ) : (
          <button onClick={() => createGame(false)} className="w-full py-3 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-purple-500/30 text-base flex items-center justify-center gap-2"><Gamepad2 className="w-5 h-5" /> Oyunu Başlat ({betType === 'FREE' ? 'Ücretsiz' : `${betAmount} ${betType}`})</button>
        )}
      </div>}

      {/* OPEN ROOMS / TABLES - shown for everyone */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-fuchsia-300 font-medium text-sm flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5" /> Masalar / Açık Odalar</h3>
          <button onClick={() => { fetchLobby(); fetchActive() }} className="text-fuchsia-400/60 hover:text-fuchsia-300"><RefreshCw className="w-4 h-4" /></button>
        </div>
          {myWaiting ? (
            <div className="w-full bg-purple-900/40 border border-fuchsia-500/30 rounded-2xl p-4 text-center">
              <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin mx-auto mb-3" />
              <p className="text-white font-medium">Rakip bekleniyor...</p>
              <button onClick={cancelWaiting} className="mt-4 px-4 py-2 bg-red-600/20 border border-red-500/40 text-red-300 rounded-xl text-sm hover:bg-red-600/30 transition"><X className="w-4 h-4 inline mr-1" /> İptal Et</button>
            </div>
          ) : (
            <>
              {waitingGames.length === 0 && activeGames.length === 0 ? (
                <p className="text-fuchsia-400/50 text-sm text-center py-3 bg-purple-900/20 rounded-xl border border-fuchsia-500/10">Henüz açık masa yok — ilk sen aç!</p>
              ) : (
                <div className="space-y-2">
                  {/* Waiting rooms */}
                  {waitingGames.map(g => (
                    <div key={g.id} className="flex items-center justify-between p-3 bg-purple-900/30 border border-green-500/20 rounded-xl hover:border-green-400/40 transition">
                      <div>
                        <p className="text-white text-sm font-medium">{g.player1Name}</p>
                        <p className="text-fuchsia-400/60 text-xs">
                          {g.betCurrency === 'FREE' ? '🆓 Ücretsiz' : `💰 ${g.betAmount} ${g.betCurrency}`}
                          {g.turnTimer > 0 && <span className="ml-1">⏱️ {g.turnTimer}s</span>}
                        </p>
                      </div>
                      {session?.user ? (
                        <button onClick={() => joinGame(g.id)} disabled={lobbyLoading} className="px-4 py-2 bg-green-600/20 border border-green-500/40 text-green-300 rounded-lg text-sm font-medium hover:bg-green-600/30 transition disabled:opacity-50 flex items-center gap-1.5">
                          <LogIn className="w-3.5 h-3.5" /> Oyna
                        </button>
                      ) : (
                        <span className="text-fuchsia-400/50 text-xs">Giriş yapın</span>
                      )}
                    </div>
                  ))}
                  {/* Active games */}
                  {activeGames.slice(0, 5).map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between p-3 bg-purple-900/30 border border-cyan-500/20 rounded-xl">
                      <div>
                        <p className="text-white text-sm font-medium">{g.player1Name} vs {g.player2Name}</p>
                        <p className="text-fuchsia-400/60 text-xs">{g.player1Score}-{g.player2Score}{g.betAmount > 0 && ` • ${g.betAmount} ${g.betCurrency}`}</p>
                      </div>
                      <button onClick={() => spectateGame(g.id)} className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-medium hover:bg-cyan-600/30 transition flex items-center gap-1"><Eye className="w-3 h-3" /> İzle</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      <div className="flex items-center justify-between w-full">
        <Link href="/oyunlar" className="flex items-center gap-2 text-fuchsia-400/60 hover:text-fuchsia-300 text-xs sm:text-sm transition"><ArrowLeft className="w-4 h-4" /> Oyunlara Dön</Link>
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="flex items-center gap-1.5 text-fuchsia-400/60 hover:text-fuchsia-300 text-xs sm:text-sm transition">{soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}{soundEnabled ? ' Ses Açık' : ' Ses Kapalı'}</button>
      </div>
    </div>
  )

  const renderLobby = () => (
    <div className="flex flex-col items-center gap-4 sm:gap-5 w-full max-w-lg mx-auto px-2">
      <h2 className="text-xl sm:text-2xl font-bold text-white">{gameName} — Rakip Bekleniyor</h2>
      {myWaiting ? (
        <div className="w-full bg-purple-900/40 border border-fuchsia-500/30 rounded-2xl p-6 text-center">
          <Loader2 className="w-10 h-10 text-fuchsia-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-medium text-lg">Rakip bekleniyor...</p>
          <p className="text-fuchsia-400/60 text-sm mt-1">Birisi masana oturduğunda oyun başlayacak</p>
          <button onClick={cancelWaiting} className="mt-5 px-5 py-2.5 bg-red-600/20 border border-red-500/40 text-red-300 rounded-xl text-sm hover:bg-red-600/30 transition"><X className="w-4 h-4 inline mr-1" /> İptal Et</button>
        </div>
      ) : (
        <p className="text-fuchsia-300/60">Yönlendiriliyor...</p>
      )}
      <button onClick={() => { cancelWaiting() }} className="flex items-center gap-2 text-fuchsia-400/60 hover:text-fuchsia-300 text-xs sm:text-sm transition"><ArrowLeft className="w-4 h-4" /> Menüye Dön</button>
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
        <div className="flex gap-3"><button onClick={resetToMenu} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg text-sm"><RotateCcw className="w-4 h-4 inline mr-2" /> Yeni Oyun</button><Link href="/oyunlar" className="px-5 py-2.5 bg-purple-900/40 border border-fuchsia-500/30 text-fuchsia-300 font-medium rounded-xl hover:bg-purple-800/40 transition text-sm">Oyunlara Dön</Link></div>
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
        {children({ room, state, isMyTurn: isSpectator ? false : isMyTurn, isSpectator, playerNum, sendMove, sendAIState, soundEnabled, aiDifficulty })}
        <button onClick={isSpectator ? async () => { if (roomId) { try { await fetch(`/api/games/room/${roomId}/viewers`, { method: 'DELETE' }) } catch {} }; resetToMenu() } : leaveGame} className="flex items-center gap-2 text-fuchsia-400/60 hover:text-fuchsia-300 text-xs sm:text-sm transition mt-1 mb-16"><ArrowLeft className="w-4 h-4" /> {isSpectator ? 'İzlemeyi Bırak' : 'Ayrıl'}</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 sm:pb-10 px-2 sm:px-4">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div key={phase} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            {isJoining ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 text-fuchsia-400 animate-spin" />
                <p className="text-white font-medium">Masaya oturuluyor...</p>
              </div>
            ) : (<>
            {phase === 'menu' && renderMenu()}
            {phase === 'lobby' && renderLobby()}
            {(phase === 'playing' || phase === 'spectating') && renderGame()}
            {phase === 'result' && renderResult()}
            </>)}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Fixed overlays - rendered outside AnimatePresence/motion.div to avoid transform breaking position:fixed */}
      {(phase === 'playing' || phase === 'spectating') && room && roomId && (
        <>
          <PopupMessages messages={popupMessages} />
          <AnimatePresence>
            {activeGift && <GiftAnimation gift={activeGift} onDone={() => setActiveGift(null)} />}
          </AnimatePresence>
          {(room.status === 'active' || isSpectator) && <GameChatBar roomId={roomId} isAI={room.isAI} onGiftSend={handleGiftSend} />}
        </>
      )}
      {showWinPopup && room && (
        <WinPopup room={room} userId={session?.user?.id} onDone={() => setShowWinPopup(false)} />
      )}
    </div>
  )
}
