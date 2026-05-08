'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Users, Bot, Coins, Trophy, RotateCcw,
  Zap, Crown, Clock, X, Check, Loader2, RefreshCw, Volume2, VolumeX, Gamepad2,
  MessageCircle, Send, Eye, EyeOff, Timer, Shield
} from 'lucide-react'

// ========== TYPES ==========
interface SosGame {
  id: string
  gridSize: number
  player1Id: string
  player2Id: string | null
  isAI: boolean
  betAmount: number
  betCurrency: string
  board: string
  lines: string
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
  createdAt: string
  updatedAt: string
}

interface RecentWinner {
  id: string
  winnerName: string
  payout: number
  currency: string
  score: string
  gridSize: number
  isAI: boolean
  time: string
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  createdAt: string
}

interface ActiveGameInfo {
  id: string
  gridSize: number
  player1Name: string
  player2Name: string
  player1Score: number
  player2Score: number
  betAmount: number
  betCurrency: string
  turnTimer: number
  viewerCount: number
}

type GamePhase = 'menu' | 'lobby' | 'playing' | 'result' | 'spectating'

// ========== SOUND EFFECTS (Web Audio API) ==========
function playSound(type: 'place' | 'sos' | 'win' | 'lose' | 'draw' | 'tick') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.value = 0.15

    switch (type) {
      case 'place':
        osc.frequency.value = 600
        osc.type = 'sine'
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.1)
        break
      case 'sos':
        osc.frequency.value = 880
        osc.type = 'square'
        gain.gain.value = 0.12
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.frequency.value = 1100
        osc2.type = 'square'
        gain2.gain.value = 0.12
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
        osc2.start(ctx.currentTime + 0.15)
        osc2.stop(ctx.currentTime + 0.6)
        break
      case 'win':
        osc.frequency.value = 523
        osc.type = 'triangle'
        gain.gain.value = 0.2
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.8)
        const w2 = ctx.createOscillator()
        const wg2 = ctx.createGain()
        w2.connect(wg2); wg2.connect(ctx.destination)
        w2.frequency.value = 659; w2.type = 'triangle'; wg2.gain.value = 0.2
        wg2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
        w2.start(ctx.currentTime + 0.2); w2.stop(ctx.currentTime + 0.9)
        const w3 = ctx.createOscillator()
        const wg3 = ctx.createGain()
        w3.connect(wg3); wg3.connect(ctx.destination)
        w3.frequency.value = 784; w3.type = 'triangle'; wg3.gain.value = 0.2
        wg3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0)
        w3.start(ctx.currentTime + 0.4); w3.stop(ctx.currentTime + 1.0)
        break
      case 'lose':
        osc.frequency.value = 300
        osc.type = 'sawtooth'
        gain.gain.value = 0.1
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.5)
        break
      case 'draw':
        osc.frequency.value = 440
        osc.type = 'sine'
        gain.gain.value = 0.12
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
        break
      case 'tick':
        osc.frequency.value = 1000
        osc.type = 'sine'
        gain.gain.value = 0.08
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.05)
        break
    }
  } catch {}
}

// ========== AI LOGIC ==========
function findNewSOSLines(board: string[][], row: number, col: number, existingLines: number[][], gridSize: number): number[][] {
  const newLines: number[][] = []
  const directions = [[0,1],[1,0],[1,1],[1,-1]]
  const existingSet = new Set(existingLines.map(l => l.join(',')))

  for (const [dr, dc] of directions) {
    const checks = [
      { positions: [[row,col],[row+dr,col+dc],[row+2*dr,col+2*dc]], expected: ['S','O','S'] },
      { positions: [[row-dr,col-dc],[row,col],[row+dr,col+dc]], expected: ['S','O','S'] },
      { positions: [[row-2*dr,col-2*dc],[row-dr,col-dc],[row,col]], expected: ['S','O','S'] },
    ]
    for (const check of checks) {
      const { positions, expected } = check
      const allInBounds = positions.every(([r,c]) => r >= 0 && r < gridSize && c >= 0 && c < gridSize)
      if (!allInBounds) continue
      const matches = positions.every(([r,c], i) => board[r][c] === expected[i])
      if (!matches) continue
      const key = [positions[0][0],positions[0][1],positions[1][0],positions[1][1],positions[2][0],positions[2][1]]
      if (!existingSet.has(key.join(','))) {
        newLines.push(key)
        existingSet.add(key.join(','))
      }
    }
  }
  return newLines
}

function aiMove(board: string[][], existingLines: number[][], gridSize: number): { row: number; col: number; letter: string } | null {
  const emptyCells: [number, number][] = []
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++)
      if (board[r][c] === '') emptyCells.push([r, c])

  if (emptyCells.length === 0) return null

  for (const [r, c] of emptyCells) {
    for (const letter of ['S', 'O']) {
      board[r][c] = letter
      const lines = findNewSOSLines(board, r, c, existingLines, gridSize)
      board[r][c] = ''
      if (lines.length > 0) return { row: r, col: c, letter }
    }
  }

  const idx = Math.floor(Math.random() * emptyCells.length)
  const [r, c] = emptyCells[idx]
  const letter = Math.random() > 0.5 ? 'S' : 'O'
  return { row: r, col: c, letter }
}

// ========== WINNER TICKER ==========
function WinnerTicker({ winners }: { winners: RecentWinner[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || winners.length === 0) return null

  const items = [...winners, ...winners]

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/20 rounded-xl py-2 mb-4">
      <div className="flex animate-sos-ticker whitespace-nowrap">
        {items.map((w, i) => (
          <span key={`${w.id}-${i}`} className="inline-flex items-center gap-2 mx-6 text-sm">
            <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span className="text-yellow-300 font-bold">{w.winnerName}</span>
            <span className="text-fuchsia-300/70">
              {w.payout} {w.currency} kazandı!
            </span>
            <span className="text-fuchsia-400/40 text-xs">({w.score})</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ========== COUNTDOWN TIMER COMPONENT ==========
function CountdownTimer({ lastMoveAt, turnTimer, isMyTurn, soundEnabled, onTimeout }: {
  lastMoveAt: string | null
  turnTimer: number
  isMyTurn: boolean
  soundEnabled: boolean
  onTimeout: () => void
}) {
  const [remaining, setRemaining] = useState(turnTimer)
  const timeoutCalledRef = useRef(false)

  useEffect(() => {
    timeoutCalledRef.current = false
  }, [lastMoveAt])

  useEffect(() => {
    if (!lastMoveAt || turnTimer <= 0) return

    const update = () => {
      const elapsed = (Date.now() - new Date(lastMoveAt).getTime()) / 1000
      const rem = Math.max(0, turnTimer - elapsed)
      setRemaining(rem)

      if (rem <= 3 && rem > 0 && soundEnabled) {
        playSound('tick')
      }

      if (rem <= 0 && !timeoutCalledRef.current) {
        timeoutCalledRef.current = true
        onTimeout()
      }
    }

    update()
    const iv = setInterval(update, 200)
    return () => clearInterval(iv)
  }, [lastMoveAt, turnTimer, soundEnabled, onTimeout])

  if (turnTimer <= 0) return null

  const pct = (remaining / turnTimer) * 100
  const isLow = remaining <= 5
  const isCritical = remaining <= 3

  return (
    <div className="flex items-center gap-2">
      <Timer className={`w-4 h-4 ${isCritical ? 'text-red-400 animate-pulse' : isLow ? 'text-orange-400' : 'text-cyan-400'}`} />
      <div className="w-24 h-2 bg-purple-900/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            isCritical ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-cyan-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-bold min-w-[2rem] text-right ${
        isCritical ? 'text-red-400 animate-pulse' : isLow ? 'text-orange-400' : 'text-cyan-300'
      }`}>
        {Math.ceil(remaining)}s
      </span>
    </div>
  )
}

// ========== CHAT POPUP COMPONENT ==========
function ChatPopup({ gameId, isOwner, chatEnabled, onToggleChat }: {
  gameId: string
  isOwner: boolean
  chatEnabled: boolean
  onToggleChat: (enabled: boolean) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastFetchRef = useRef<string | null>(null)

  // Poll for messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const afterParam = lastFetchRef.current ? `?after=${lastFetchRef.current}` : ''
        const res = await fetch(`/api/games/sos/${gameId}/chat${afterParam}`)
        if (res.ok) {
          const msgs: ChatMessage[] = await res.json()
          if (msgs.length > 0) {
            if (lastFetchRef.current) {
              setMessages(prev => [...prev, ...msgs])
              if (!isOpen) setUnread(prev => prev + msgs.length)
            } else {
              setMessages(msgs)
            }
            lastFetchRef.current = msgs[msgs.length - 1].createdAt
          }
        }
      } catch {}
    }

    fetchMessages()
    const iv = setInterval(() => { if (!document.hidden) fetchMessages() }, 5000)
    return () => clearInterval(iv)
  }, [gameId, isOpen])

  useEffect(() => {
    if (isOpen) {
      setUnread(0)
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isOpen, messages.length])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/games/sos/${gameId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim() }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => [...prev, msg])
        lastFetchRef.current = msg.createdAt
        setInput('')
      }
    } catch {}
    setSending(false)
  }

  const toggleChatEnabled = async () => {
    try {
      const res = await fetch(`/api/games/sos/${gameId}/chat`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatEnabled: !chatEnabled }),
      })
      if (res.ok) {
        const data = await res.json()
        onToggleChat(data.chatEnabled)
      }
    } catch {}
  }

  return (
    <>
      {/* Chat toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-40 w-12 h-12 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all"
      >
        <MessageCircle className="w-5 h-5 text-white" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 z-40 w-72 sm:w-80 bg-[#0d0225]/95 backdrop-blur-xl border border-fuchsia-500/30 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-purple-900/50 border-b border-fuchsia-500/20">
              <span className="text-fuchsia-300 font-medium text-sm flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> Sohbet
              </span>
              <div className="flex items-center gap-1">
                {isOwner && (
                  <button
                    onClick={toggleChatEnabled}
                    className={`p-1.5 rounded-lg text-xs transition ${chatEnabled ? 'text-green-400 hover:bg-green-500/20' : 'text-red-400 hover:bg-red-500/20'}`}
                    title={chatEnabled ? 'Sohbeti kapat' : 'Sohbeti aç'}
                  >
                    {chatEnabled ? <MessageCircle className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1.5 text-fuchsia-400/60 hover:text-fuchsia-300 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-52 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
              {!chatEnabled && (
                <div className="text-center text-red-400/70 text-xs py-4">
                  <EyeOff className="w-5 h-5 mx-auto mb-1" />
                  Sohbet oda sahibi tarafından kapatıldı
                </div>
              )}
              {chatEnabled && messages.length === 0 && (
                <p className="text-fuchsia-400/40 text-xs text-center py-4">Henüz mesaj yok</p>
              )}
              {chatEnabled && messages.map(msg => (
                <div key={msg.id} className="text-xs">
                  <span className="text-purple-400 font-medium">{msg.userName}: </span>
                  <span className="text-fuchsia-200/80">{msg.message}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {chatEnabled && (
              <div className="flex items-center gap-2 px-3 py-2 border-t border-fuchsia-500/20">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Mesaj yazın..."
                  maxLength={200}
                  className="flex-1 bg-purple-900/40 border border-fuchsia-500/20 rounded-lg px-2.5 py-1.5 text-xs text-fuchsia-200 placeholder:text-fuchsia-400/40 focus:outline-none focus:border-fuchsia-400/50"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  className="p-1.5 text-fuchsia-400 hover:text-fuchsia-300 transition disabled:opacity-30"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ========== MAIN COMPONENT ==========
export default function SOSGamePage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const lang = (params?.lang as string) || 'tr'

  // Phase
  const [phase, setPhase] = useState<GamePhase>('menu')
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Menu state
  const [gameMode, setGameMode] = useState<'ai' | '2player'>('ai')
  const [gridSize, setGridSize] = useState(6)
  const [availableGridSizes, setAvailableGridSizes] = useState<number[]>([6, 8, 10])
  const [betType, setBetType] = useState<'FREE' | 'CFC' | 'JETON'>('FREE')
  const [betAmount, setBetAmount] = useState(10)
  const [turnTimer, setTurnTimer] = useState(0)
  const [userBalance, setUserBalance] = useState({ credits: 0, jetonBalance: 0 })

  // Fetch available grid sizes from admin settings
  useEffect(() => {
    fetch('/api/games/grid-settings')
      .then(r => r.json())
      .then(d => {
        if (d.sosGridSizes?.length) {
          setAvailableGridSizes(d.sosGridSizes)
          if (!d.sosGridSizes.includes(gridSize)) setGridSize(d.sosGridSizes[0])
        }
      })
      .catch(() => {})
  }, [])

  // Stats
  const [activePlayers, setActivePlayers] = useState(0)
  const [waitingRooms, setWaitingRooms] = useState(0)
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([])

  // Lobby state
  const [waitingGames, setWaitingGames] = useState<SosGame[]>([])
  const [myWaitingGame, setMyWaitingGame] = useState<string | null>(null)
  const [lobbyLoading, setLobbyLoading] = useState(false)

  // Game state
  const [gameId, setGameId] = useState<string | null>(null)
  const [game, setGame] = useState<SosGame | null>(null)
  const [board, setBoard] = useState<string[][]>([])
  const [lines, setLines] = useState<number[][]>([])
  const [selectedLetter, setSelectedLetter] = useState<'S' | 'O'>('S')
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [lastPlaced, setLastPlaced] = useState<[number,number] | null>(null)
  const [newScoredLines, setNewScoredLines] = useState<number[][]>([])
  const [prevBoard, setPrevBoard] = useState<string[][]>([])
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set())
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const waitTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  // Spectator state
  const [activeGames, setActiveGames] = useState<ActiveGameInfo[]>([])
  const [isSpectator, setIsSpectator] = useState(false)

  // Chat state
  const [chatEnabled, setChatEnabled] = useState(true)

  // Fetch stats + balance
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/games/sos?type=stats')
      if (res.ok) {
        const d = await res.json()
        setActivePlayers(d.activePlayers || 0)
        setWaitingRooms(d.waitingRooms || 0)
        setRecentWinners(d.recentWinners || [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchStats()
    const iv = setInterval(() => { if (!document.hidden) fetchStats() }, 15000)
    return () => clearInterval(iv)
  }, [fetchStats])

  useEffect(() => {
    if (session?.user) {
      fetch('/api/user/profile').then(r => r.json()).then(d => {
        if (d.credits !== undefined) setUserBalance({ credits: d.credits, jetonBalance: d.jetonBalance || 0 })
      }).catch(() => {})
    }
  }, [session?.user])

  // Handle ?join=gameId and ?room=gameId from lobby
  const joinHandledRef = useRef(false)
  useEffect(() => {
    const joinId = searchParams?.get('join')
    const waitRoomId = searchParams?.get('room')
    if ((!joinId && !waitRoomId) || !session?.user?.id || joinHandledRef.current) return
    joinHandledRef.current = true

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('join')
      url.searchParams.delete('room')
      window.history.replaceState({}, '', url.toString())
    }

    if (joinId) {
      // Immediately hide menu while joining
      setIsJoining(true)
      setGameId(joinId)
      const doJoin = async () => {
        try {
          const res = await fetch(`/api/games/sos/${joinId}`, { method: 'POST' })
          const data = await res.json()
          if (res.ok && data.success) {
            setGameId(joinId)
            setGame(data.game)
            setBoard(JSON.parse(data.game.board))
            setLines(JSON.parse(data.game.lines))
            setChatEnabled(data.game.chatEnabled)
            setIsMyTurn(data.game.currentTurn === 2)
            setIsSpectator(false)
            setPhase('playing')
          } else {
            const gr = await fetch(`/api/games/sos/${joinId}`)
            if (gr.ok) {
              const g = await gr.json()
              if (g.status === 'active' && (g.player1Id === session.user.id || g.player2Id === session.user.id)) {
                setGameId(joinId)
                setGame(g)
                setBoard(JSON.parse(g.board))
                setLines(JSON.parse(g.lines))
                setChatEnabled(g.chatEnabled)
                setIsSpectator(false)
                setPhase('playing')
              } else {
                alert(data.error || 'Bu odaya katılınamaz')
              }
            } else {
              alert(data.error || 'Oda bulunamadı')
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
      setGameId(waitRoomId)
      setMyWaitingGame(waitRoomId)
      setPhase('lobby')
      const check = setInterval(async () => {
        try {
          const rr = await fetch(`/api/games/sos/${waitRoomId}`)
          const g = await rr.json()
          if (g.status === 'active' && g.player2Id) {
            clearInterval(check)
            if (waitTimeoutRef.current) { clearTimeout(waitTimeoutRef.current); waitTimeoutRef.current = null }
            setGame(g)
            setBoard(JSON.parse(g.board))
            setLines(JSON.parse(g.lines))
            setChatEnabled(g.chatEnabled)
            setPhase('playing')
            setMyWaitingGame(null)
          }
        } catch {}
      }, 3000)
      pollRef.current = check
      // Auto-cancel after 2 minutes if no opponent joins
      waitTimeoutRef.current = setTimeout(async () => {
        clearInterval(check)
        try { await fetch(`/api/games/sos/${waitRoomId}`, { method: 'DELETE' }) } catch {}
        setMyWaitingGame(null)
        setPhase('menu')
        setGameId(null)
        alert('2 dakika içinde rakip bulunamadı, masa kapatıldı.')
        window.location.href = `/${lang}/oyunlar`
      }, 120000)
    }
  }, [searchParams, session?.user?.id])

  // ========== LOBBY ==========
  const fetchLobby = useCallback(async () => {
    try {
      const res = await fetch('/api/games/sos')
      if (res.ok) setWaitingGames(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    if (phase === 'lobby') {
      fetchLobby()
      const iv = setInterval(() => { if (!document.hidden) fetchLobby() }, 10000)
      return () => clearInterval(iv)
    }
  }, [phase, fetchLobby])

  // ========== FETCH ACTIVE GAMES FOR SPECTATING ==========
  const fetchActiveGames = useCallback(async () => {
    try {
      const res = await fetch('/api/games/sos?type=active')
      if (res.ok) setActiveGames(await res.json())
    } catch {}
  }, [])

  // ========== POLL GAME STATE (2 player, AI-takeover, or spectator) ==========
  useEffect(() => {
    const shouldPoll = (phase === 'playing' || phase === 'spectating') && gameId && game && (
      !game.isAI || // PvP games
      game.disconnectedPlayerId || // AI-takeover games (for reconnection/auto-close)
      isSpectator // Always poll as spectator
    )
    if (shouldPoll) {
      const poll = async () => {
        try {
          const res = await fetch(`/api/games/sos/${gameId}`)
          if (res.ok) {
            const g: SosGame = await res.json()
            const newBoardParsed: string[][] = JSON.parse(g.board)
            const newLinesParsed: number[][] = JSON.parse(g.lines)

            // Detect opponent's new moves and flash them
            if (board.length > 0) {
              const flashes = new Set<string>()
              for (let r = 0; r < newBoardParsed.length; r++) {
                for (let c = 0; c < (newBoardParsed[r]?.length || 0); c++) {
                  if (board[r]?.[c] === '' && newBoardParsed[r][c] !== '') {
                    flashes.add(`${r}-${c}`)
                  }
                }
              }
              if (flashes.size > 0) {
                setFlashCells(flashes)
                if (soundEnabled) playSound('place')
                setTimeout(() => setFlashCells(new Set()), 1200)
              }
            }

            // Check for new SOS lines scored
            if (newLinesParsed.length > lines.length) {
              const newOnes = newLinesParsed.slice(lines.length)
              setNewScoredLines(newOnes)
              if (soundEnabled) playSound('sos')
              setTimeout(() => setNewScoredLines([]), 2000)
            }

            setGame(g)
            setBoard(newBoardParsed)
            setLines(newLinesParsed)
            setChatEnabled(g.chatEnabled)

            if (!isSpectator) {
              const isP1 = g.player1Id === session?.user?.id
              setIsMyTurn((isP1 && g.currentTurn === 1) || (!isP1 && g.currentTurn === 2))
            }

            if (g.status === 'completed') {
              setPhase('result')
              if (pollRef.current) clearInterval(pollRef.current)
              if (soundEnabled && !isSpectator) {
                const myId = session?.user?.id
                if (g.winnerId === myId) playSound('win')
                else if (!g.winnerId) playSound('draw')
                else playSound('lose')
              }
            } else if (g.status === 'cancelled') {
              // Room was auto-closed (both players left)
              resetToMenu()
            }
          }
        } catch {}
      }
      pollRef.current = setInterval(() => { if (!document.hidden) poll() }, 3000)
      return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }
  }, [phase, gameId, game?.isAI, game?.disconnectedPlayerId, session?.user?.id, board, lines, soundEnabled, isSpectator])

  // ========== CREATE GAME ==========
  const createGame = async (isAI: boolean) => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/games/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gridSize,
          isAI,
          betAmount: isAI ? 0 : (betType === 'FREE' ? 0 : betAmount),
          betCurrency: isAI ? 'FREE' : betType,
          turnTimer: isAI ? 0 : turnTimer,
        }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Hata oluştu'); return }
      setGameId(data.gameId)
      setIsSpectator(false)

      if (isAI) {
        const gRes = await fetch(`/api/games/sos/${data.gameId}`)
        const g: SosGame = await gRes.json()
        setGame(g)
        setBoard(JSON.parse(g.board))
        setLines(JSON.parse(g.lines))
        setChatEnabled(g.chatEnabled)
        setIsMyTurn(true)
        setPhase('playing')
      } else {
        setMyWaitingGame(data.gameId)
        setPhase('lobby')
        const checkJoin = setInterval(async () => {
          try {
            const r = await fetch(`/api/games/sos/${data.gameId}`)
            const g: SosGame = await r.json()
            if (g.status === 'active' && g.player2Id) {
              clearInterval(checkJoin)
              if (waitTimeoutRef.current) { clearTimeout(waitTimeoutRef.current); waitTimeoutRef.current = null }
              setGame(g)
              setBoard(JSON.parse(g.board))
              setLines(JSON.parse(g.lines))
              setChatEnabled(g.chatEnabled)
              setIsMyTurn(true)
              setPhase('playing')
              setMyWaitingGame(null)
            }
          } catch {}
        }, 3000)
        pollRef.current = checkJoin
        // Auto-cancel after 2 minutes if no opponent joins
        waitTimeoutRef.current = setTimeout(async () => {
          clearInterval(checkJoin)
          try { await fetch(`/api/games/sos/${data.gameId}`, { method: 'DELETE' }) } catch {}
          setMyWaitingGame(null); setPhase('menu'); setGameId(null)
          alert('2 dakika içinde rakip bulunamadı, masa kapatıldı.')
          window.location.href = `/${lang}/oyunlar`
        }, 120000)
      }
    } catch { alert('Bağlantı hatası') }
  }

  // ========== JOIN GAME ==========
  const joinGame = async (id: string) => {
    if (!session?.user) return
    setLobbyLoading(true)
    try {
      const res = await fetch(`/api/games/sos/${id}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Hata oluştu'); setLobbyLoading(false); return }
      setGameId(id)
      setGame(data.game)
      setBoard(JSON.parse(data.game.board))
      setLines(JSON.parse(data.game.lines))
      setChatEnabled(data.game.chatEnabled)
      setIsMyTurn(data.game.currentTurn === 2)
      setIsSpectator(false)
      setPhase('playing')
    } catch { alert('Bağlantı hatası') }
    setLobbyLoading(false)
  }

  // ========== SPECTATE GAME ==========
  const spectateGame = async (id: string) => {
    if (!session?.user) return
    try {
      // Join as viewer
      await fetch(`/api/games/sos/${id}/viewers`, { method: 'POST' })

      const res = await fetch(`/api/games/sos/${id}`)
      if (res.ok) {
        const g: SosGame = await res.json()
        setGameId(id)
        setGame(g)
        setBoard(JSON.parse(g.board))
        setLines(JSON.parse(g.lines))
        setChatEnabled(g.chatEnabled)
        setIsSpectator(true)
        setIsMyTurn(false)
        setPhase('spectating')
      }
    } catch { alert('Bağlantı hatası') }
  }

  // ========== LEAVE SPECTATING ==========
  const leaveSpectating = async () => {
    if (gameId) {
      try { await fetch(`/api/games/sos/${gameId}/viewers`, { method: 'DELETE' }) } catch {}
    }
    resetToMenu()
  }

  // ========== CANCEL WAITING ==========
  const cancelWaiting = async () => {
    if (!myWaitingGame) return
    try { await fetch(`/api/games/sos/${myWaitingGame}`, { method: 'DELETE' }) } catch {}
    setMyWaitingGame(null)
    if (pollRef.current) clearInterval(pollRef.current)
    if (waitTimeoutRef.current) { clearTimeout(waitTimeoutRef.current); waitTimeoutRef.current = null }
    setPhase('menu')
  }

  // ========== MAKE MOVE ==========
  const makeMove = async (row: number, col: number) => {
    if (!game || !gameId || !isMyTurn || aiThinking || isSpectator) return
    if (board[row][col] !== '') return

    if (soundEnabled) playSound('place')

    const newBoard = board.map(r => [...r])
    newBoard[row][col] = selectedLetter
    setBoard(newBoard)
    setLastPlaced([row, col])
    setFlashCells(new Set([`${row}-${col}`]))
    setTimeout(() => setFlashCells(new Set()), 1200)

    const scored = findNewSOSLines(newBoard, row, col, lines, game.gridSize)
    const allLines = [...lines, ...scored]
    setLines(allLines)
    if (scored.length > 0) {
      setNewScoredLines(scored)
      if (soundEnabled) playSound('sos')
      setTimeout(() => setNewScoredLines([]), 2000)
    }

    const isP1 = game.player1Id === session?.user?.id
    let p1s = game.player1Score + (isP1 ? scored.length : 0)
    let p2s = game.player2Score + (!isP1 ? scored.length : 0)
    const isFull = newBoard.every(r => r.every(c => c !== ''))

    if (game.isAI) {
      // Determine AI player number (supports AI as either player for disconnect takeover)
      const aiPNum = game.disconnectedPlayerId === game.player1Id ? 1 : 2
      const humanPNum = aiPNum === 1 ? 2 : 1
      let currentBoard = newBoard
      let currentLines = allLines
      let currentP1 = p1s
      let currentP2 = p2s
      let turn = scored.length > 0 ? humanPNum : aiPNum
      let gameOver = isFull

      if (!gameOver && turn === aiPNum) {
        setAiThinking(true)
        setIsMyTurn(false)
        await new Promise(r => setTimeout(r, 600))

        let aiKeepPlaying = true
        while (aiKeepPlaying && !gameOver) {
          const move = aiMove(currentBoard, currentLines, game.gridSize)
          if (!move) { gameOver = true; break }

          currentBoard = currentBoard.map(r => [...r])
          currentBoard[move.row][move.col] = move.letter
          setBoard(currentBoard.map(r => [...r]))
          setLastPlaced([move.row, move.col])
          setFlashCells(new Set([`${move.row}-${move.col}`]))
          if (soundEnabled) playSound('place')

          await new Promise(r => setTimeout(r, 400))
          setFlashCells(new Set())

          const aiScored = findNewSOSLines(currentBoard, move.row, move.col, currentLines, game.gridSize)
          currentLines = [...currentLines, ...aiScored]
          setLines([...currentLines])
          if (aiPNum === 1) currentP1 += aiScored.length
          else currentP2 += aiScored.length
          if (aiScored.length > 0) {
            setNewScoredLines(aiScored)
            if (soundEnabled) playSound('sos')
            await new Promise(r => setTimeout(r, 800))
            setNewScoredLines([])
          }

          gameOver = currentBoard.every(r => r.every(c => c !== ''))
          if (aiScored.length === 0 || gameOver) aiKeepPlaying = false
        }

        setAiThinking(false)
        turn = humanPNum
      }

      let winnerId: string | null = null
      if (gameOver) {
        if (currentP1 > currentP2) winnerId = game.player1Id
        else if (currentP2 > currentP1) winnerId = game.player2Id || 'AI'
      }

      const res = await fetch(`/api/games/sos/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          row, col, letter: selectedLetter,
          aiMoves: {
            board: currentBoard,
            lines: currentLines,
            player1Score: currentP1,
            player2Score: currentP2,
            currentTurn: turn,
            gameOver,
            winnerId: gameOver ? (currentP1 > currentP2 ? session?.user?.id : null) : undefined,
          }
        }),
      })
      const result = await res.json()
      if (result.success) {
        setGame(result.game)
        if (result.game.status === 'completed') {
          setPhase('result')
          if (soundEnabled) {
            if (result.game.winnerId === session?.user?.id) playSound('win')
            else if (!result.game.winnerId) playSound('draw')
            else playSound('lose')
          }
        } else {
          setIsMyTurn(true)
        }
      }
    } else {
      const res = await fetch(`/api/games/sos/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row, col, letter: selectedLetter }),
      })
      const result = await res.json()
      if (result.success) {
        setGame(result.game)
        const gData = result.game
        setBoard(JSON.parse(gData.board))
        setLines(JSON.parse(gData.lines))
        const amP1 = gData.player1Id === session?.user?.id
        setIsMyTurn((amP1 && gData.currentTurn === 1) || (!amP1 && gData.currentTurn === 2))
        if (gData.status === 'completed') {
          setPhase('result')
          if (soundEnabled) {
            if (gData.winnerId === session?.user?.id) playSound('win')
            else if (!gData.winnerId) playSound('draw')
            else playSound('lose')
          }
        }
      }
    }
  }

  // ========== TIMER TIMEOUT HANDLER ==========
  const handleTimerTimeout = useCallback(() => {
    // The server handles turn switching on poll; this is just for UI feedback
  }, [])

  // ========== RESET ==========
  const resetToMenu = () => {
    setPhase('menu')
    setGame(null)
    setGameId(null)
    setBoard([])
    setLines([])
    setMyWaitingGame(null)
    setNewScoredLines([])
    setLastPlaced(null)
    setAiThinking(false)
    setFlashCells(new Set())
    setIsSpectator(false)
    setChatEnabled(true)
    if (pollRef.current) clearInterval(pollRef.current)
    if (waitTimeoutRef.current) { clearTimeout(waitTimeoutRef.current); waitTimeoutRef.current = null }
    if (session?.user) {
      fetch('/api/user/profile').then(r => r.json()).then(d => {
        if (d.credits !== undefined) setUserBalance({ credits: d.credits, jetonBalance: d.jetonBalance || 0 })
      }).catch(() => {})
    }
    fetchStats()
  }

  // ========== SVG LINE OVERLAY ==========
  const renderSOSLineOverlay = () => {
    if (!game || board.length === 0) return null
    const size = game.gridSize
    const gridEl = gridRef.current
    if (!gridEl) return null
    const gridWidth = gridEl.offsetWidth
    const gridHeight = gridEl.offsetHeight
    const cellW = gridWidth / size
    const cellH = gridHeight / size

    return (
      <svg
        className="absolute inset-0 pointer-events-none z-10"
        width={gridWidth}
        height={gridHeight}
      >
        {lines.map((line, idx) => {
          const [r1, c1, , , r3, c3] = line
          const x1 = c1 * cellW + cellW / 2
          const y1 = r1 * cellH + cellH / 2
          const x2 = c3 * cellW + cellW / 2
          const y2 = r3 * cellH + cellH / 2
          const isNew = newScoredLines.some(nl => nl.join(',') === line.join(','))

          return (
            <line
              key={idx}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isNew ? '#facc15' : '#a855f7'}
              strokeWidth={isNew ? 3 : 2}
              strokeLinecap="round"
              opacity={isNew ? 1 : 0.6}
              className={isNew ? 'animate-pulse' : ''}
            />
          )
        })}
      </svg>
    )
  }

  // ========== RENDER: MENU ==========
  const renderMenu = () => (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-md mx-auto px-2">
      <WinnerTicker winners={recentWinners} />

      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          SOS Oyunu
        </h1>
        <p className="text-fuchsia-300/70 text-xs sm:text-sm mt-1">Strateji ve eğlence bir arada!</p>
      </div>

      {/* Active Players Stats */}
      <div className="flex items-center gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-300 font-medium">{activePlayers} Oyuncu</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full">
          <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-purple-300 font-medium">{waitingRooms} Oda</span>
        </div>
      </div>

      {/* Balance */}
      {session?.user && (
        <div className="flex gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-medium">{userBalance.credits} CFC</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 font-medium">{userBalance.jetonBalance} Jeton</span>
          </div>
        </div>
      )}

      {/* Game Mode */}
      <div className="w-full">
        <label className="text-fuchsia-300 text-xs font-medium mb-2 block">Oyun Modu</label>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setGameMode('ai')} className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm ${gameMode === 'ai' ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}>
            <Bot className="w-4 h-4 sm:w-5 sm:h-5" /> Yapay Zeka
          </button>
          <button onClick={() => setGameMode('2player')} className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm ${gameMode === '2player' ? 'border-pink-400 bg-pink-500/20 text-pink-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}>
            <Users className="w-4 h-4 sm:w-5 sm:h-5" /> 2 Kişilik
          </button>
        </div>
      </div>

      {/* Grid Size */}
      <div className="w-full">
        <label className="text-fuchsia-300 text-xs font-medium mb-2 block">Oyun Alanı</label>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(availableGridSizes.length, 4)}, 1fr)` }}>
          {availableGridSizes.map(size => (
            <button key={size} onClick={() => setGridSize(size)} className={`py-2 sm:py-2.5 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm ${gridSize === size ? 'border-purple-400 bg-purple-500/20 text-purple-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}>
              {size}x{size}
            </button>
          ))}
        </div>
      </div>

      {/* Turn Timer (only for 2-player) */}
      {gameMode === '2player' && (
        <div className="w-full">
          <label className="text-fuchsia-300 text-xs font-medium mb-2 block flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5" /> Süre Limiti
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[{ val: 0, label: 'Yok' }, { val: 10, label: '10s' }, { val: 15, label: '15s' }, { val: 20, label: '20s' }].map(opt => (
              <button
                key={opt.val}
                onClick={() => setTurnTimer(opt.val)}
                className={`py-2 sm:py-2.5 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm ${
                  turnTimer === opt.val
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                    : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {turnTimer > 0 && (
            <p className="text-fuchsia-400/50 text-xs mt-1.5">Her hamle için {turnTimer} saniye süre</p>
          )}
        </div>
      )}

      {/* Bet Type - only for 2 player mode */}
      {gameMode === '2player' && (
        <div className="w-full">
          <label className="text-fuchsia-300 text-xs font-medium mb-2 block">Bahis Tipi</label>
          <div className="grid grid-cols-3 gap-2">
            {(['FREE', 'CFC', 'JETON'] as const).map(type => (
              <button key={type} onClick={() => setBetType(type)} className={`py-2 sm:py-2.5 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm ${
                betType === type
                  ? type === 'FREE' ? 'border-green-400 bg-green-500/20 text-green-300'
                    : type === 'CFC' ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                    : 'border-blue-400 bg-blue-500/20 text-blue-300'
                  : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'
              }`}>
                {type === 'FREE' ? 'Ücretsiz' : type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bet Amount - only for 2 player mode */}
      {gameMode === '2player' && betType !== 'FREE' && (
        <div className="w-full">
          <label className="text-fuchsia-300 text-xs font-medium mb-2 block">
            Bahis Miktarı ({betType === 'CFC' ? 'CFC' : 'Jeton'})
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[10, 25, 50, 100].map(amt => (
              <button key={amt} onClick={() => setBetAmount(amt)} className={`py-1.5 sm:py-2 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm ${betAmount === amt ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300' : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'}`}>
                {amt}
              </button>
            ))}
          </div>
          <p className="text-fuchsia-400/50 text-xs mt-1.5">Kazanan %90'ını alır, %10 site komisyonu</p>
        </div>
      )}

      {/* Start Button */}
      {!session?.user ? (
        <p className="text-fuchsia-400/60 text-sm">Oynamak için giriş yapın</p>
      ) : (
        <div className="w-full space-y-2">
          <button
            onClick={() => { if (gameMode === 'ai') createGame(true); else setPhase('lobby') }}
            className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-purple-500/30 text-base sm:text-lg"
          >
            {gameMode === 'ai' ? '🤖 Oyunu Başlat' : '👥 Lobi\'ye Gir'}
          </button>
          {/* Spectate button */}
          <button
            onClick={() => {
              fetchActiveGames()
              setPhase('lobby')
              // We'll show spectate tab in lobby
            }}
            className="w-full py-2.5 sm:py-3 bg-purple-900/40 border border-cyan-500/30 text-cyan-300 font-medium rounded-xl hover:bg-purple-800/40 transition-all text-sm sm:text-base flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" /> Aktif Oyunları İzle
          </button>
        </div>
      )}

      {/* Sound toggle + Back */}
      <div className="flex items-center justify-between w-full">
        <Link href="/oyunlar" className="flex items-center gap-2 text-fuchsia-400/60 hover:text-fuchsia-300 text-xs sm:text-sm transition">
          <ArrowLeft className="w-4 h-4" /> Oyunlara Dön
        </Link>
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="flex items-center gap-1.5 text-fuchsia-400/60 hover:text-fuchsia-300 text-xs sm:text-sm transition">
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          {soundEnabled ? 'Ses Açık' : 'Ses Kapalı'}
        </button>
      </div>
    </div>
  )

  // ========== RENDER: LOBBY (with spectate tab) ==========
  const [lobbyTab, setLobbyTab] = useState<'play' | 'watch'>('play')

  const renderLobby = () => (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-lg mx-auto px-2">
      <WinnerTicker winners={recentWinners} />

      <h2 className="text-xl sm:text-2xl font-bold text-white">2 Kişilik Lobi</h2>

      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-green-300">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> {activePlayers} Oyuncu Aktif
        </span>
        <span className="text-fuchsia-400/40">•</span>
        <span className="text-purple-300">{waitingRooms} Oda Bekliyor</span>
      </div>

      {/* Tabs */}
      <div className="flex w-full bg-purple-900/30 rounded-xl p-1 border border-fuchsia-500/20">
        <button
          onClick={() => setLobbyTab('play')}
          className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            lobbyTab === 'play' ? 'bg-purple-600/50 text-white' : 'text-fuchsia-400/60 hover:text-fuchsia-300'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" /> Oyna
        </button>
        <button
          onClick={() => { setLobbyTab('watch'); fetchActiveGames() }}
          className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            lobbyTab === 'watch' ? 'bg-cyan-600/50 text-white' : 'text-fuchsia-400/60 hover:text-fuchsia-300'
          }`}
        >
          <Eye className="w-3.5 h-3.5" /> İzle
        </button>
      </div>

      {lobbyTab === 'play' ? (
        <>
          {myWaitingGame ? (
            <div className="w-full bg-purple-900/40 border border-fuchsia-500/30 rounded-2xl p-4 sm:p-6 text-center">
              <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin mx-auto mb-3" />
              <p className="text-white font-medium">Rakip bekleniyor...</p>
              <p className="text-fuchsia-300/60 text-sm mt-1">
                {gridSize}x{gridSize} • {betType === 'FREE' ? 'Ücretsiz' : `${betAmount} ${betType}`}
                {turnTimer > 0 && ` • ${turnTimer}s süre`}
              </p>
              <button onClick={cancelWaiting} className="mt-4 px-4 py-2 bg-red-600/20 border border-red-500/40 text-red-300 rounded-xl text-sm hover:bg-red-600/30 transition">
                <X className="w-4 h-4 inline mr-1" /> İptal Et
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => createGame(false)} className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg text-sm sm:text-base">
                + Yeni Oda ({gridSize}x{gridSize} • {betType === 'FREE' ? 'Ücretsiz' : `${betAmount} ${betType}`}{turnTimer > 0 ? ` • ${turnTimer}s` : ''})
              </button>
              <div className="w-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-fuchsia-300 font-medium text-sm">Açık Odalar</h3>
                  <button onClick={fetchLobby} className="text-fuchsia-400/60 hover:text-fuchsia-300 transition">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                {waitingGames.length === 0 ? (
                  <p className="text-fuchsia-400/50 text-sm text-center py-4">Bekleyen oda yok</p>
                ) : (
                  <div className="space-y-2">
                    {waitingGames.map(g => (
                      <div key={g.id} className="flex items-center justify-between p-3 bg-purple-900/30 border border-fuchsia-500/20 rounded-xl">
                        <div>
                          <p className="text-white text-sm font-medium">{g.player1Name}</p>
                          <p className="text-fuchsia-400/60 text-xs">
                            {g.gridSize}x{g.gridSize} • {g.betCurrency === 'FREE' ? 'Ücretsiz' : `${g.betAmount} ${g.betCurrency}`}
                            {g.turnTimer > 0 && ` • ${g.turnTimer}s`}
                          </p>
                        </div>
                        <button onClick={() => joinGame(g.id)} disabled={lobbyLoading} className="px-4 py-2 bg-green-600/20 border border-green-500/40 text-green-300 rounded-lg text-sm font-medium hover:bg-green-600/30 transition disabled:opacity-50">
                          Katıl
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        /* Watch tab */
        <div className="w-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-cyan-300 font-medium text-sm">Aktif Oyunlar</h3>
            <button onClick={fetchActiveGames} className="text-fuchsia-400/60 hover:text-fuchsia-300 transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {activeGames.length === 0 ? (
            <p className="text-fuchsia-400/50 text-sm text-center py-6">Şu an aktif oyun yok</p>
          ) : (
            <div className="space-y-2">
              {activeGames.map(g => (
                <div key={g.id} className="flex items-center justify-between p-3 bg-purple-900/30 border border-cyan-500/20 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium">{g.player1Name} vs {g.player2Name}</p>
                    <p className="text-fuchsia-400/60 text-xs">
                      {g.gridSize}x{g.gridSize} • {g.player1Score}-{g.player2Score}
                      {g.betAmount > 0 && ` • ${g.betAmount} ${g.betCurrency}`}
                      {g.turnTimer > 0 && ` • ${g.turnTimer}s`}
                    </p>
                    <p className="text-cyan-400/60 text-[10px] flex items-center gap-1 mt-0.5">
                      <Eye className="w-3 h-3" /> {g.viewerCount} izleyici
                    </p>
                  </div>
                  <button
                    onClick={() => spectateGame(g.id)}
                    className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 rounded-lg text-sm font-medium hover:bg-cyan-600/30 transition"
                  >
                    İzle
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button onClick={resetToMenu} className="flex items-center gap-2 text-fuchsia-400/60 hover:text-fuchsia-300 text-xs sm:text-sm transition">
        <ArrowLeft className="w-4 h-4" /> Menüye Dön
      </button>
    </div>
  )

  // ========== RENDER: GAME BOARD ==========
  const renderGame = () => {
    if (!game) return null
    const size = game.gridSize
    const cellClass = size <= 6
      ? 'w-[42px] h-[42px] text-lg sm:w-12 sm:h-12 sm:text-xl md:w-14 md:h-14'
      : size <= 8
        ? 'w-[34px] h-[34px] text-sm sm:w-10 sm:h-10 sm:text-base md:w-11 md:h-11'
        : 'w-[28px] h-[28px] text-[11px] sm:w-8 sm:h-8 sm:text-sm md:w-9 md:h-9'

    const isOwner = game.player1Id === session?.user?.id

    return (
      <div className="flex flex-col items-center gap-3 sm:gap-4 w-full px-1">
        {/* Spectator badge */}
        {isSpectator && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-300 text-xs">
            <Eye className="w-3.5 h-3.5" /> İzleyici Modu
            {game.viewerCount !== undefined && <span className="text-cyan-400/60">({game.viewerCount} izleyici)</span>}
          </div>
        )}

        {/* Players info bar */}
        <div className="flex items-center justify-center gap-2 text-xs text-fuchsia-300/60">
          <Users className="w-3.5 h-3.5" />
          <span>{game.player1Name}</span>
          <span className="text-fuchsia-400/30">vs</span>
          <span>{game.player2Name}</span>
          {game.isAI && <Bot className="w-3.5 h-3.5 text-cyan-400" />}
          {game.viewerCount !== undefined && game.viewerCount > 0 && !isSpectator && (
            <span className="flex items-center gap-0.5 text-cyan-400/60">
              <Eye className="w-3 h-3" /> {game.viewerCount}
            </span>
          )}
        </div>

        {/* Scoreboard */}
        <div className="flex items-center gap-2 sm:gap-4 w-full max-w-sm">
          <div className={`flex-1 text-center py-1.5 sm:py-2 rounded-xl border-2 transition-all ${
            game.currentTurn === 1 && game.status === 'active'
              ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
              : 'border-fuchsia-500/20 bg-purple-900/20'
          }`}>
            <p className="text-[10px] sm:text-xs text-fuchsia-300/60 truncate px-1">{game.player1Name}</p>
            <p className="text-xl sm:text-2xl font-bold text-cyan-300">{game.player1Score}</p>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-fuchsia-400/40 text-[10px] sm:text-xs">VS</span>
            {game.betAmount > 0 && (
              <span className="text-yellow-400 text-[10px] sm:text-xs font-medium">{game.betAmount} {game.betCurrency}</span>
            )}
          </div>

          <div className={`flex-1 text-center py-1.5 sm:py-2 rounded-xl border-2 transition-all ${
            game.currentTurn === 2 && game.status === 'active'
              ? 'border-pink-400 bg-pink-500/20 shadow-[0_0_12px_rgba(236,72,153,0.3)]'
              : 'border-fuchsia-500/20 bg-purple-900/20'
          }`}>
            <p className="text-[10px] sm:text-xs text-fuchsia-300/60 truncate px-1">{game.player2Name}</p>
            <p className="text-xl sm:text-2xl font-bold text-pink-300">{game.player2Score}</p>
          </div>
        </div>

        {/* Countdown Timer */}
        {game.turnTimer > 0 && game.status === 'active' && !game.isAI && (
          <CountdownTimer
            lastMoveAt={game.lastMoveAt}
            turnTimer={game.turnTimer}
            isMyTurn={isMyTurn}
            soundEnabled={soundEnabled}
            onTimeout={handleTimerTimeout}
          />
        )}

        {/* Turn indicator */}
        <div className="text-xs sm:text-sm text-center">
          {isSpectator ? (
            <span className="text-cyan-400/70 flex items-center gap-1 justify-center">
              <Eye className="w-3.5 h-3.5" />
              {game.currentTurn === 1 ? game.player1Name : game.player2Name} oynuyor
            </span>
          ) : aiThinking ? (
            <span className="text-yellow-400 animate-pulse flex items-center gap-1 justify-center"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Yapay Zeka düşünüyor...</span>
          ) : isMyTurn ? (
            <span className="text-green-400">✅ Sıra sizde! Harf seçip hücreye tıklayın</span>
          ) : (
            <span className="text-fuchsia-400/60">⏳ Rakibin hamlesini bekleyin...</span>
          )}
        </div>

        {/* Letter selector + sound (not for spectators) */}
        {!isSpectator && (
          <div className="flex items-center gap-3">
            {(['S', 'O'] as const).map(letter => (
              <button
                key={letter}
                onClick={() => setSelectedLetter(letter)}
                className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl border-2 font-bold text-xl sm:text-2xl transition-all ${
                  selectedLetter === letter
                    ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 scale-110 shadow-[0_0_12px_rgba(250,204,21,0.3)]'
                    : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'
                }`}
              >
                {letter}
              </button>
            ))}
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="ml-2 p-2 rounded-lg bg-purple-900/30 border border-fuchsia-500/20 text-fuchsia-400/60 hover:text-fuchsia-300 transition">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Grid with SVG overlay */}
        <div className="relative" ref={gridRef}>
          <div
            className="inline-grid gap-[2px] bg-cyan-500/20 p-[2px] rounded-xl border border-cyan-500/30"
            style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          >
            {board.map((row, ri) =>
              row.map((cell, ci) => {
                const cellKey = `${ri}-${ci}`
                const isFlash = flashCells.has(cellKey)
                const isInNewLine = newScoredLines.some(line => {
                  const positions = [[line[0],line[1]],[line[2],line[3]],[line[4],line[5]]]
                  return positions.some(([r,c]) => r === ri && c === ci)
                })
                const isInAnyLine = lines.some(line => {
                  const positions = [[line[0],line[1]],[line[2],line[3]],[line[4],line[5]]]
                  return positions.some(([r,c]) => r === ri && c === ci)
                })

                return (
                  <button
                    key={cellKey}
                    onClick={() => makeMove(ri, ci)}
                    disabled={!isMyTurn || cell !== '' || aiThinking || isSpectator}
                    className={`${cellClass} flex items-center justify-center font-bold rounded-lg transition-all duration-200
                      ${
                        cell === ''
                          ? isMyTurn && !aiThinking && !isSpectator
                            ? 'bg-[#0d0225] hover:bg-purple-800/40 cursor-pointer active:scale-90'
                            : 'bg-[#0d0225] cursor-not-allowed'
                          : 'bg-[#0d0225]'
                      }
                      ${isFlash ? 'animate-sos-flash ring-2 ring-yellow-400 bg-yellow-500/30' : ''}
                      ${isInNewLine ? 'bg-yellow-500/25 ring-2 ring-yellow-400' : isInAnyLine ? 'bg-purple-500/15' : ''}
                      ${cell === 'S' ? 'text-cyan-300' : cell === 'O' ? 'text-pink-300' : ''}
                    `}
                  >
                    {cell && (
                      <span className={isFlash ? 'animate-sos-pop' : ''}>{cell}</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
          {renderSOSLineOverlay()}
        </div>

        {/* Exit button */}
        <button
          onClick={isSpectator ? leaveSpectating : resetToMenu}
          className="flex items-center gap-2 text-fuchsia-400/60 hover:text-fuchsia-300 text-xs sm:text-sm transition mt-1"
        >
          <ArrowLeft className="w-4 h-4" /> {isSpectator ? 'İzlemeyi Bırak' : 'Ayrıl'}
        </button>

      </div>
    )
  }

  // ========== RENDER: RESULT ==========
  const renderResult = () => {
    if (!game) return null
    const userId = session?.user?.id
    const isWinner = game.winnerId === userId
    const isDraw = game.status === 'completed' && !game.winnerId
    const aiWon = game.isAI && game.player2Score > game.player1Score && game.status === 'completed' && !isDraw

    const totalPot = game.betAmount * 2
    const commission = Math.floor(totalPot * 0.10)
    const winnerPayout = totalPot - commission

    return (
      <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-md mx-auto text-center px-2">
        {isSpectator && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-300 text-xs">
            <Eye className="w-3.5 h-3.5" /> İzleyici Modu
          </div>
        )}

        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="text-5xl sm:text-6xl">
          {isSpectator ? '🏁' : isWinner ? '🏆' : isDraw ? '🤝' : '😔'}
        </motion.div>

        <div>
          <h2 className={`text-2xl sm:text-3xl font-bold ${
            isSpectator ? 'text-cyan-300'
            : isWinner ? 'text-yellow-400'
            : isDraw ? 'text-fuchsia-300'
            : 'text-red-400'
          }`}>
            {isSpectator
              ? (game.winnerId ? `${game.winnerId === game.player1Id ? game.player1Name : game.player2Name} Kazandı!` : 'Berabere!')
              : isWinner ? 'Tebrikler! Kazandınız!'
              : isDraw ? 'Berabere!'
              : (aiWon ? 'Yapay Zeka Kazandı!' : 'Kaybettiniz!')
            }
          </h2>
          <p className="text-fuchsia-300/70 mt-2 text-sm sm:text-base">{game.player1Name}: {game.player1Score} - {game.player2Name}: {game.player2Score}</p>
        </div>

        {game.betAmount > 0 && !isSpectator && (
          <div className={`px-4 sm:px-6 py-3 rounded-xl border-2 ${
            isWinner ? 'border-yellow-400/50 bg-yellow-500/10' : isDraw ? 'border-fuchsia-400/50 bg-fuchsia-500/10' : 'border-red-400/50 bg-red-500/10'
          }`}>
            {isWinner ? (
              <p className="text-yellow-300 font-bold text-base sm:text-lg">+{winnerPayout} {game.betCurrency} kazandınız!</p>
            ) : isDraw ? (
              <p className="text-fuchsia-300 text-sm">Bahsiniz iade edildi: {game.betAmount} {game.betCurrency}</p>
            ) : (
              <p className="text-red-300 text-sm">-{game.betAmount} {game.betCurrency}</p>
            )}
            {isWinner && <p className="text-fuchsia-400/50 text-xs mt-1">(%10 site komisyonu düşüldü)</p>}
          </div>
        )}

        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={resetToMenu} className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg text-sm sm:text-base">
            <RotateCcw className="w-4 h-4 inline mr-2" /> {isSpectator ? 'Lobiye Dön' : 'Yeni Oyun'}
          </button>
          <Link href="/oyunlar" className="px-5 sm:px-6 py-2.5 sm:py-3 bg-purple-900/40 border border-fuchsia-500/30 text-fuchsia-300 font-medium rounded-xl hover:bg-purple-800/40 transition text-sm sm:text-base">
            Oyunlara Dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @keyframes sos-flash {
          0%, 100% { background-color: rgba(250, 204, 21, 0); }
          25% { background-color: rgba(250, 204, 21, 0.35); }
          50% { background-color: rgba(250, 204, 21, 0.1); }
          75% { background-color: rgba(250, 204, 21, 0.25); }
        }
        @keyframes sos-pop {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sos-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-sos-flash { animation: sos-flash 1.2s ease-in-out; }
        .animate-sos-pop { animation: sos-pop 0.4s ease-out; }
        .animate-sos-ticker { animation: sos-ticker 30s linear infinite; }
      `}</style>

      <div className="min-h-screen pt-16 sm:pt-20 pb-8 sm:pb-10 px-2 sm:px-4">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
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
        {/* Chat popup - rendered outside AnimatePresence to fix position:fixed inside transform */}
        {(phase === 'playing' || phase === 'spectating') && game && !game.isAI && game.status === 'active' && gameId && (
          <ChatPopup
            gameId={gameId}
            isOwner={game.player1Id === session?.user?.id}
            chatEnabled={chatEnabled}
            onToggleChat={setChatEnabled}
          />
        )}
      </div>
    </>
  )
}