'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Users, Bot, Coins, Trophy, RotateCcw,
  Zap, Crown, Clock, X, Check, Loader2, RefreshCw
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
  createdAt: string
  updatedAt: string
}

type GamePhase = 'menu' | 'lobby' | 'playing' | 'result'

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

  // Try to score
  for (const [r, c] of emptyCells) {
    for (const letter of ['S', 'O']) {
      board[r][c] = letter
      const lines = findNewSOSLines(board, r, c, existingLines, gridSize)
      board[r][c] = ''
      if (lines.length > 0) return { row: r, col: c, letter }
    }
  }

  // Try to block opponent scoring
  // (simplified: pick a move that doesn't let opponent score easily)
  // Otherwise random
  const idx = Math.floor(Math.random() * emptyCells.length)
  const [r, c] = emptyCells[idx]
  const letter = Math.random() > 0.5 ? 'S' : 'O'
  return { row: r, col: c, letter }
}

// ========== MAIN COMPONENT ==========
export default function SOSGamePage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'

  // Phase
  const [phase, setPhase] = useState<GamePhase>('menu')

  // Menu state
  const [gameMode, setGameMode] = useState<'ai' | '2player'>('ai')
  const [gridSize, setGridSize] = useState(6)
  const [betType, setBetType] = useState<'FREE' | 'CFC' | 'JETON'>('FREE')
  const [betAmount, setBetAmount] = useState(10)
  const [userBalance, setUserBalance] = useState({ credits: 0, jetonBalance: 0 })

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
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch user balance
  useEffect(() => {
    if (session?.user) {
      fetch('/api/user/profile').then(r => r.json()).then(d => {
        if (d.credits !== undefined) setUserBalance({ credits: d.credits, jetonBalance: d.jetonBalance || 0 })
      }).catch(() => {})
    }
  }, [session?.user])

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
      const iv = setInterval(fetchLobby, 5000)
      return () => clearInterval(iv)
    }
  }, [phase, fetchLobby])

  // ========== POLL GAME STATE (2 player) ==========
  useEffect(() => {
    if (phase === 'playing' && gameId && game && !game.isAI) {
      const poll = async () => {
        try {
          const res = await fetch(`/api/games/sos/${gameId}`)
          if (res.ok) {
            const g: SosGame = await res.json()
            setGame(g)
            setBoard(JSON.parse(g.board))
            setLines(JSON.parse(g.lines))
            const isP1 = g.player1Id === session?.user?.id
            setIsMyTurn((isP1 && g.currentTurn === 1) || (!isP1 && g.currentTurn === 2))
            if (g.status === 'completed') {
              setPhase('result')
              if (pollRef.current) clearInterval(pollRef.current)
            }
          }
        } catch {}
      }
      pollRef.current = setInterval(poll, 2000)
      return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }
  }, [phase, gameId, game?.isAI, session?.user?.id])

  // ========== CREATE GAME ==========
  const createGame = async (isAI: boolean) => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/games/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gridSize, isAI, betAmount: betType === 'FREE' ? 0 : betAmount, betCurrency: betType }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Hata oluştu'); return }

      setGameId(data.gameId)

      if (isAI) {
        // Fetch game and start playing
        const gRes = await fetch(`/api/games/sos/${data.gameId}`)
        const g: SosGame = await gRes.json()
        setGame(g)
        setBoard(JSON.parse(g.board))
        setLines(JSON.parse(g.lines))
        setIsMyTurn(true)
        setPhase('playing')
      } else {
        setMyWaitingGame(data.gameId)
        setPhase('lobby')
        // Poll for player2 joining
        const checkJoin = setInterval(async () => {
          try {
            const r = await fetch(`/api/games/sos/${data.gameId}`)
            const g: SosGame = await r.json()
            if (g.status === 'active' && g.player2Id) {
              clearInterval(checkJoin)
              setGame(g)
              setBoard(JSON.parse(g.board))
              setLines(JSON.parse(g.lines))
              setIsMyTurn(true)
              setPhase('playing')
              setMyWaitingGame(null)
            }
          } catch {}
        }, 3000)
        // Store for cleanup
        pollRef.current = checkJoin
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
      setIsMyTurn(data.game.currentTurn === 2) // joiner is always player2
      setPhase('playing')
    } catch { alert('Bağlantı hatası') }
    setLobbyLoading(false)
  }

  // ========== CANCEL WAITING ==========
  const cancelWaiting = async () => {
    if (!myWaitingGame) return
    try {
      await fetch(`/api/games/sos/${myWaitingGame}`, { method: 'DELETE' })
    } catch {}
    setMyWaitingGame(null)
    if (pollRef.current) clearInterval(pollRef.current)
    setPhase('menu')
  }

  // ========== MAKE MOVE ==========
  const makeMove = async (row: number, col: number) => {
    if (!game || !gameId || !isMyTurn || aiThinking) return
    if (board[row][col] !== '') return

    const newBoard = board.map(r => [...r])
    newBoard[row][col] = selectedLetter
    setBoard(newBoard)
    setLastPlaced([row, col])

    const scored = findNewSOSLines(newBoard, row, col, lines, game.gridSize)
    const allLines = [...lines, ...scored]
    setLines(allLines)
    if (scored.length > 0) setNewScoredLines(scored)
    setTimeout(() => setNewScoredLines([]), 1500)

    const isP1 = game.player1Id === session?.user?.id
    let p1s = game.player1Score + (isP1 ? scored.length : 0)
    let p2s = game.player2Score + (!isP1 ? scored.length : 0)

    const isFull = newBoard.every(r => r.every(c => c !== ''))

    if (game.isAI) {
      // Handle locally + send final state
      let currentBoard = newBoard
      let currentLines = allLines
      let currentP1 = p1s
      let currentP2 = p2s
      let turn = scored.length > 0 ? 1 : 2 // player is always 1 in AI
      let gameOver = isFull

      // AI turns
      if (!gameOver && turn === 2) {
        setAiThinking(true)
        await new Promise(r => setTimeout(r, 600))

        let aiKeepPlaying = true
        while (aiKeepPlaying && !gameOver) {
          const move = aiMove(currentBoard, currentLines, game.gridSize)
          if (!move) { gameOver = true; break }

          currentBoard = currentBoard.map(r => [...r])
          currentBoard[move.row][move.col] = move.letter
          setBoard(currentBoard.map(r => [...r]))
          setLastPlaced([move.row, move.col])

          await new Promise(r => setTimeout(r, 400))

          const aiScored = findNewSOSLines(currentBoard, move.row, move.col, currentLines, game.gridSize)
          currentLines = [...currentLines, ...aiScored]
          setLines([...currentLines])
          currentP2 += aiScored.length
          if (aiScored.length > 0) {
            setNewScoredLines(aiScored)
            await new Promise(r => setTimeout(r, 800))
            setNewScoredLines([])
          }

          gameOver = currentBoard.every(r => r.every(c => c !== ''))
          if (aiScored.length === 0 || gameOver) aiKeepPlaying = false
        }

        setAiThinking(false)
        turn = 1
      }

      let winnerId: string | null = null
      if (gameOver) {
        if (currentP1 > currentP2) winnerId = game.player1Id
        else if (currentP2 > currentP1) winnerId = 'AI'
        // null = draw
      }

      // Send state to server
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
            winnerId: gameOver ? (currentP1 > currentP2 ? session?.user?.id : currentP2 > currentP1 ? null : null) : undefined,
          }
        }),
      })
      const result = await res.json()
      if (result.success) {
        setGame(result.game)
        if (result.game.status === 'completed') setPhase('result')
        else setIsMyTurn(true)
      }
    } else {
      // 2 player - send move to server
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
        if (gData.status === 'completed') setPhase('result')
      }
    }
  }

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
    if (pollRef.current) clearInterval(pollRef.current)
    // Refresh balance
    if (session?.user) {
      fetch('/api/user/profile').then(r => r.json()).then(d => {
        if (d.credits !== undefined) setUserBalance({ credits: d.credits, jetonBalance: d.jetonBalance || 0 })
      }).catch(() => {})
    }
  }

  // ========== CHECK LINE HIGHLIGHT ==========
  const getCellLineColor = (row: number, col: number): string | null => {
    for (const line of newScoredLines) {
      const positions = [[line[0], line[1]], [line[2], line[3]], [line[4], line[5]]]
      if (positions.some(([r, c]) => r === row && c === col)) {
        return 'ring-2 ring-yellow-400 bg-yellow-500/30'
      }
    }
    for (const line of lines) {
      const positions = [[line[0], line[1]], [line[2], line[3]], [line[4], line[5]]]
      if (positions.some(([r, c]) => r === row && c === col)) {
        // Check which player scored this line
        const lineIdx = lines.indexOf(line)
        // For simplicity, just highlight
        return 'bg-purple-500/15'
      }
    }
    return null
  }

  // ========== RENDER: MENU ==========
  const renderMenu = () => (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          SOS Oyunu
        </h1>
        <p className="text-fuchsia-300/70 text-sm mt-1">Strateji ve eğlence bir arada!</p>
      </div>

      {/* Balance */}
      {session?.user && (
        <div className="flex gap-3 text-sm">
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
          <button
            onClick={() => setGameMode('ai')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-medium text-sm ${
              gameMode === 'ai'
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'
            }`}
          >
            <Bot className="w-5 h-5" /> Yapay Zeka
          </button>
          <button
            onClick={() => setGameMode('2player')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-medium text-sm ${
              gameMode === '2player'
                ? 'border-pink-400 bg-pink-500/20 text-pink-300'
                : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'
            }`}
          >
            <Users className="w-5 h-5" /> 2 Kişilik
          </button>
        </div>
      </div>

      {/* Grid Size */}
      <div className="w-full">
        <label className="text-fuchsia-300 text-xs font-medium mb-2 block">Oyun Alanı</label>
        <div className="grid grid-cols-3 gap-2">
          {[6, 8, 10].map(size => (
            <button
              key={size}
              onClick={() => setGridSize(size)}
              className={`py-2.5 rounded-xl border-2 transition-all font-bold text-sm ${
                gridSize === size
                  ? 'border-purple-400 bg-purple-500/20 text-purple-300'
                  : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'
              }`}
            >
              {size}x{size}
            </button>
          ))}
        </div>
      </div>

      {/* Bet Type */}
      <div className="w-full">
        <label className="text-fuchsia-300 text-xs font-medium mb-2 block">Bahis Tipi</label>
        <div className="grid grid-cols-3 gap-2">
          {(['FREE', 'CFC', 'JETON'] as const).map(type => (
            <button
              key={type}
              onClick={() => setBetType(type)}
              className={`py-2.5 rounded-xl border-2 transition-all font-medium text-sm ${
                betType === type
                  ? type === 'FREE' ? 'border-green-400 bg-green-500/20 text-green-300'
                    : type === 'CFC' ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                    : 'border-blue-400 bg-blue-500/20 text-blue-300'
                  : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'
              }`}
            >
              {type === 'FREE' ? 'Ücretsiz' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Bet Amount */}
      {betType !== 'FREE' && (
        <div className="w-full">
          <label className="text-fuchsia-300 text-xs font-medium mb-2 block">
            Bahis Miktarı ({betType === 'CFC' ? 'CFC' : 'Jeton'})
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[10, 25, 50, 100].map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                className={`py-2 rounded-xl border-2 transition-all font-bold text-sm ${
                  betAmount === amt
                    ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300'
                    : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
          <p className="text-fuchsia-400/50 text-xs mt-1.5">
            Kazanan %90'ını alır, %10 site komisyonu
          </p>
        </div>
      )}

      {/* Start Button */}
      {!session?.user ? (
        <p className="text-fuchsia-400/60 text-sm">Oynamak için giriş yapın</p>
      ) : (
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => {
              if (gameMode === 'ai') createGame(true)
              else if (gameMode === '2player') {
                setPhase('lobby')
              }
            }}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-purple-500/30 text-lg"
          >
            {gameMode === 'ai' ? '🤖 Oyunu Başlat' : '👥 Lobi’ye Gir'}
          </button>
        </div>
      )}

      {/* Back */}
      <Link
        href={`/${lang}/oyunlar`}
        className="flex items-center gap-2 text-fuchsia-400/60 hover:text-fuchsia-300 text-sm transition"
      >
        <ArrowLeft className="w-4 h-4" /> Oyunlara Dön
      </Link>
    </div>
  )

  // ========== RENDER: LOBBY ==========
  const renderLobby = () => (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-white">2 Kişilik Lobi</h2>

      {myWaitingGame ? (
        <div className="w-full bg-purple-900/40 border border-fuchsia-500/30 rounded-2xl p-6 text-center">
          <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin mx-auto mb-3" />
          <p className="text-white font-medium">Rakip bekleniyor...</p>
          <p className="text-fuchsia-300/60 text-sm mt-1">
            {gridSize}x{gridSize} • {betType === 'FREE' ? 'Ücretsiz' : `${betAmount} ${betType}`}
          </p>
          <button
            onClick={cancelWaiting}
            className="mt-4 px-4 py-2 bg-red-600/20 border border-red-500/40 text-red-300 rounded-xl text-sm hover:bg-red-600/30 transition"
          >
            <X className="w-4 h-4 inline mr-1" /> İptal Et
          </button>
        </div>
      ) : (
        <>
          {/* Create new game */}
          <button
            onClick={() => createGame(false)}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg"
          >
            + Yeni Oda Oluştur ({gridSize}x{gridSize} • {betType === 'FREE' ? 'Ücretsiz' : `${betAmount} ${betType}`})
          </button>

          {/* Available games */}
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
                      </p>
                    </div>
                    <button
                      onClick={() => joinGame(g.id)}
                      disabled={lobbyLoading}
                      className="px-4 py-2 bg-green-600/20 border border-green-500/40 text-green-300 rounded-lg text-sm font-medium hover:bg-green-600/30 transition disabled:opacity-50"
                    >
                      Katıl
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <button
        onClick={resetToMenu}
        className="flex items-center gap-2 text-fuchsia-400/60 hover:text-fuchsia-300 text-sm transition"
      >
        <ArrowLeft className="w-4 h-4" /> Menüye Dön
      </button>
    </div>
  )

  // ========== RENDER: GAME BOARD ==========
  const renderGame = () => {
    if (!game) return null
    const size = game.gridSize
    const cellSize = size <= 6 ? 'w-10 h-10 text-lg sm:w-12 sm:h-12 sm:text-xl' : size <= 8 ? 'w-8 h-8 text-sm sm:w-10 sm:h-10 sm:text-base' : 'w-7 h-7 text-xs sm:w-8 sm:h-8 sm:text-sm'

    return (
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Scoreboard */}
        <div className="flex items-center gap-4 w-full max-w-sm">
          <div className={`flex-1 text-center py-2 rounded-xl border-2 transition-all ${
            game.currentTurn === 1 && game.status === 'active'
              ? 'border-cyan-400 bg-cyan-500/20'
              : 'border-fuchsia-500/20 bg-purple-900/20'
          }`}>
            <p className="text-xs text-fuchsia-300/60 truncate px-1">{game.player1Name}</p>
            <p className="text-2xl font-bold text-cyan-300">{game.player1Score}</p>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-fuchsia-400/40 text-xs">VS</span>
            {game.betAmount > 0 && (
              <span className="text-yellow-400 text-xs font-medium">
                {game.betAmount} {game.betCurrency}
              </span>
            )}
          </div>

          <div className={`flex-1 text-center py-2 rounded-xl border-2 transition-all ${
            game.currentTurn === 2 && game.status === 'active'
              ? 'border-pink-400 bg-pink-500/20'
              : 'border-fuchsia-500/20 bg-purple-900/20'
          }`}>
            <p className="text-xs text-fuchsia-300/60 truncate px-1">{game.player2Name}</p>
            <p className="text-2xl font-bold text-pink-300">{game.player2Score}</p>
          </div>
        </div>

        {/* Turn indicator */}
        <div className="text-sm text-center">
          {aiThinking ? (
            <span className="text-yellow-400 animate-pulse">Yapay Zeka düşünüyor...</span>
          ) : isMyTurn ? (
            <span className="text-green-400">Sıra sizde! Harf seçip bir hücreye tıklayın</span>
          ) : (
            <span className="text-fuchsia-400/60">Rakibin hamlesini bekleyin...</span>
          )}
        </div>

        {/* Letter selector */}
        <div className="flex gap-3">
          {(['S', 'O'] as const).map(letter => (
            <button
              key={letter}
              onClick={() => setSelectedLetter(letter)}
              className={`w-14 h-14 rounded-xl border-2 font-bold text-2xl transition-all ${
                selectedLetter === letter
                  ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 scale-110'
                  : 'border-fuchsia-500/30 bg-purple-900/30 text-fuchsia-300/70 hover:border-fuchsia-400/50'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div
          className="inline-grid gap-[2px] bg-cyan-500/20 p-[2px] rounded-xl border border-cyan-500/30"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {board.map((row, ri) =>
            row.map((cell, ci) => {
              const highlight = getCellLineColor(ri, ci)
              const isLast = lastPlaced && lastPlaced[0] === ri && lastPlaced[1] === ci
              return (
                <motion.button
                  key={`${ri}-${ci}`}
                  whileTap={isMyTurn && cell === '' ? { scale: 0.9 } : {}}
                  onClick={() => makeMove(ri, ci)}
                  disabled={!isMyTurn || cell !== '' || aiThinking}
                  className={`${cellSize} flex items-center justify-center font-bold rounded-lg transition-all
                    ${
                      cell === ''
                        ? isMyTurn && !aiThinking
                          ? 'bg-[#0d0225] hover:bg-purple-800/40 cursor-pointer'
                          : 'bg-[#0d0225] cursor-not-allowed'
                        : 'bg-[#0d0225]'
                    }
                    ${highlight || ''}
                    ${isLast ? 'ring-2 ring-cyan-400/60' : ''}
                    ${cell === 'S' ? 'text-cyan-300' : cell === 'O' ? 'text-pink-300' : ''}
                  `}
                >
                  {cell || ''}
                </motion.button>
              )
            })
          )}
        </div>

        {/* Exit button */}
        <button
          onClick={resetToMenu}
          className="flex items-center gap-2 text-fuchsia-400/60 hover:text-fuchsia-300 text-sm transition mt-2"
        >
          <ArrowLeft className="w-4 h-4" /> Ayrıl
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
    const isLoser = game.status === 'completed' && game.winnerId && game.winnerId !== userId && game.winnerId !== 'AI'
    const aiWon = game.winnerId === 'AI' || (game.isAI && game.player2Score > game.player1Score && game.status === 'completed' && !isDraw)

    const totalPot = game.betAmount * 2
    const commission = Math.floor(totalPot * 0.10)
    const winnerPayout = totalPot - commission

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-6xl"
        >
          {isWinner ? '🏆' : isDraw ? '🤝' : '😔'}
        </motion.div>

        <div>
          <h2 className={`text-3xl font-bold ${
            isWinner ? 'text-yellow-400' : isDraw ? 'text-fuchsia-300' : 'text-red-400'
          }`}>
            {isWinner ? 'Tebrikler! Kazandınız!' : isDraw ? 'Berabere!' : (aiWon ? 'Yapay Zeka Kazandı!' : 'Kaybettiniz!')}
          </h2>
          <p className="text-fuchsia-300/70 mt-2">
            {game.player1Score} - {game.player2Score}
          </p>
        </div>

        {game.betAmount > 0 && (
          <div className={`px-6 py-3 rounded-xl border-2 ${
            isWinner ? 'border-yellow-400/50 bg-yellow-500/10' : isDraw ? 'border-fuchsia-400/50 bg-fuchsia-500/10' : 'border-red-400/50 bg-red-500/10'
          }`}>
            {isWinner ? (
              <p className="text-yellow-300 font-bold text-lg">+{winnerPayout} {game.betCurrency} kazandınız!</p>
            ) : isDraw ? (
              <p className="text-fuchsia-300">Bahsiniz iade edildi: {game.betAmount} {game.betCurrency}</p>
            ) : (
              <p className="text-red-300">-{game.betAmount} {game.betCurrency}</p>
            )}
            {isWinner && (
              <p className="text-fuchsia-400/50 text-xs mt-1">(%10 site komisyonu düşüldü)</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={resetToMenu}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg"
          >
            <RotateCcw className="w-4 h-4 inline mr-2" /> Yeni Oyun
          </button>
          <Link
            href={`/${lang}/oyunlar`}
            className="px-6 py-3 bg-purple-900/40 border border-fuchsia-500/30 text-fuchsia-300 font-medium rounded-xl hover:bg-purple-800/40 transition"
          >
            Oyunlara Dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {phase === 'menu' && renderMenu()}
            {phase === 'lobby' && renderLobby()}
            {phase === 'playing' && renderGame()}
            {phase === 'result' && renderResult()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
