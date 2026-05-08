'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Gamepad2, Trophy, Gift, Star, Zap, Target, ArrowLeft,
  Coins, Crown, ChevronRight, Check, Lock, X, Sparkles,
  RotateCcw, Copy, Share2, Users, Calendar, Flame, Award,
  Eye, Play, PlusCircle, Search, Monitor, Clock, Swords,
  TrendingUp, Activity, Radio, DoorOpen, UserPlus,
  PieChart, Lightbulb, Medal, Timer, ChevronDown, Bot
} from 'lucide-react'

// Dynamic imports for mini-game components
const Game2048 = dynamic(() => import('@/components/mini-games/game-2048'), { ssr: false })
const GameMinesweeper = dynamic(() => import('@/components/mini-games/game-minesweeper'), { ssr: false })
const GameSudoku = dynamic(() => import('@/components/mini-games/game-sudoku'), { ssr: false })
const GameMemoryMatch = dynamic(() => import('@/components/mini-games/game-memory-match'), { ssr: false })
const GameHangman = dynamic(() => import('@/components/mini-games/game-hangman'), { ssr: false })
const GameSlot = dynamic(() => import('@/components/mini-games/game-slot'), { ssr: false })
const GameCarkifelek = dynamic(() => import('@/components/mini-games/game-carkifelek'), { ssr: false })
const GameScratch = dynamic(() => import('@/components/mini-games/game-scratch'), { ssr: false })
const GameWordPuzzle = dynamic(() => import('@/components/mini-games/game-word-puzzle'), { ssr: false })
const GameAnagram = dynamic(() => import('@/components/mini-games/game-anagram'), { ssr: false })
const GameMastermind = dynamic(() => import('@/components/mini-games/game-mastermind'), { ssr: false })
const GameQuiz = dynamic(() => import('@/components/mini-games/game-quiz'), { ssr: false })
const GameColorSort = dynamic(() => import('@/components/mini-games/game-color-sort'), { ssr: false })
const GameLogoQuiz = dynamic(() => import('@/components/mini-games/game-logo-quiz'), { ssr: false })
const GameWordHunt = dynamic(() => import('@/components/mini-games/game-word-hunt'), { ssr: false })

// ========== COST BADGE ==========
function CostBadge({ betAmount, betCurrency }: { betAmount: number; betCurrency: string }) {
  if (!betAmount || betAmount === 0 || betCurrency === 'FREE') {
    return (
      <span className="text-green-400 text-[10px] font-bold px-2 py-0.5 bg-green-500/15 border border-green-500/30 rounded-full">
        🆓 Ücretsiz
      </span>
    )
  }
  if (betCurrency === 'CFC') {
    return (
      <span className="text-yellow-400 text-[10px] font-bold px-2 py-0.5 bg-yellow-500/15 border border-yellow-500/30 rounded-full">
        💰 {betAmount} CFC
      </span>
    )
  }
  // JETON
  return (
    <span className="text-blue-400 text-[10px] font-bold px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 rounded-full">
      🎫 {betAmount} Jeton
    </span>
  )
}

// ========== TYPES ==========
interface LobbyStats {
  onlinePlayers: number
  playingNow: number
  watching: number
  openTables: number
  waitingTables: number
  totalGamesPlayed: number
}

interface GameTypeStats {
  gameType: string
  activePlayers: number
  activeTables: number
  waitingTables: number
  todayPlayed: number
}

interface LiveTable {
  id: string
  gameType: string
  player1Name: string
  player2Name: string
  player1Id: string
  player2Id: string | null
  status: string
  betAmount: number
  betCurrency: string
  viewerCount: number
  currentTurn: number
  player1Score: number
  player2Score: number
  turnTimer: number
  gridSize?: number
  createdAt: string
  isAI?: boolean
}

interface RecentWinner {
  id: string
  gameType: string
  winnerName: string
  loserName: string
  payout: number
  currency: string
  score: string
  time: string
}

interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  username: string | null
  image: string | null
  totalJetons: number
  totalGames: number
  level: number
  levelTitle: string
  periodWins: number
  periodEarnings: number
}

interface SpectatorGame {
  id: string
  gameType: string
  player1Name: string
  player2Name: string
  player1Score: number
  player2Score: number
  betAmount: number
  betCurrency: string
  viewerCount: number
  currentTurn: number
  turnTimer: number
  startedAt: string
  lastMoveAt: string | null
}

interface Tournament {
  id: string
  name: string
  description: string
  type: 'daily' | 'weekly' | 'special'
  status: 'active' | 'upcoming' | 'completed'
  prizePool: number
  currency: string
  gameType?: string
  startTime: string
  endTime: string
  games: Array<{
    gameType: string
    completedGames: number
    totalParticipants: number
    topWinner: string | null
    topWinnerWins: number
  }>
  totalParticipants: number
  totalGames: number
}

interface RoomDistribution {
  gameType: string
  count: number
  percentage: number
}

interface RecommendedRoom {
  id: string
  gameType: string
  player1Name: string
  betAmount: number
  betCurrency: string
  viewerCount: number
  createdAt: string
}

interface PopularGame {
  id: string
  gameType: string
  player1Name: string
  player2Name: string
  player1Score: number
  player2Score: number
  viewerCount: number
  betAmount: number
  betCurrency: string
}

interface GameProfile {
  totalJetons: number
  totalGames: number
  level: number
  levelTitle: string
  cfcBalance: number
  jetonBalance: number
  userReferralCode: string | null
}

interface DailyRewardStatus {
  claimed: boolean
  currentStreak: number
  nextReward: number
  todayReward: number
}

interface Quest {
  type: string
  title: string
  target: number
  reward: number
  icon: string
  progress: number
  claimed: boolean
  completed: boolean
}

interface MiniGame {
  id: string
  slug: string
  title: string
  description: string | null
  icon: string
  isActive: boolean
  entryFee: number
  minReward: number
  maxReward: number
  config: string | null
}

// ========== GAME INFO MAP ==========
const GAME_INFO: Record<string, { emoji: string; name: string; desc: string; slug: string; color: string }> = {
  xox: { emoji: '❌⭕', name: 'XOX', desc: 'Klasik 3x3 strateji oyunu', slug: 'xox', color: 'from-rose-600/30 to-pink-600/30 border-rose-400/40' },
  sos: { emoji: '🔠', name: 'SOS Oyunu', desc: '2 kişilik veya yapay zekaya karşı', slug: 'sos', color: 'from-blue-600/30 to-cyan-600/30 border-blue-400/40' },
  tombala: { emoji: '🎱', name: 'Tombala', desc: 'Sayı çek, sırayı ilk tamamla', slug: 'tombala', color: 'from-purple-600/30 to-violet-600/30 border-purple-400/40' },
  tavla: { emoji: '♟️', name: 'Tavla', desc: 'Klasik tavla! Zarları at, taşlarını taşı', slug: 'tavla', color: 'from-amber-600/30 to-yellow-600/30 border-amber-400/40' },
  pisti: { emoji: '🃏', name: 'Pişti', desc: 'Türk kart oyunu! Eşleştir & topla', slug: 'pisti', color: 'from-green-600/30 to-emerald-600/30 border-green-400/40' },
  sayi_tahmin: { emoji: '🔢', name: 'Sayı Tahmin', desc: '4 basamaklı gizli sayıyı bul', slug: 'sayi-tahmin', color: 'from-indigo-600/30 to-blue-600/30 border-indigo-400/40' },
  zar: { emoji: '🎲', name: 'Zar Atma', desc: '3 el zar at, en çok kazanan galip', slug: 'zar', color: 'from-orange-600/30 to-red-600/30 border-orange-400/40' },
  okey: { emoji: '🀄', name: 'Okey', desc: 'Klasik 4 kişilik Türk Okey', slug: 'okey', color: 'from-teal-600/30 to-cyan-600/30 border-teal-400/40' },
  okey101: { emoji: '💯', name: '101 Okey', desc: 'Çok rauntlu 101 Okey', slug: 'okey101', color: 'from-fuchsia-600/30 to-pink-600/30 border-fuchsia-400/40' },
  yuzbirokey: { emoji: '🎯', name: 'Yüz Bir Okey', desc: 'Modern arayüzlü 101 Okey', slug: 'yuzbirokey', color: 'from-violet-600/30 to-purple-600/30 border-violet-400/40' },
  connect4: { emoji: '🔴🟡', name: 'Connect 4', desc: '4lü sıra yapan kazanır!', slug: 'connect4', color: 'from-red-600/30 to-yellow-600/30 border-red-400/40' },
  reversi: { emoji: '⚫⚪', name: 'Reversi', desc: 'Taşları çevir, tahtayı fethet!', slug: 'reversi', color: 'from-emerald-600/30 to-teal-600/30 border-emerald-400/40' },
  dama: { emoji: '🏁', name: 'Dama', desc: 'Klasik dama! Taşları ye, şah ol!', slug: 'dama', color: 'from-stone-600/30 to-amber-600/30 border-stone-400/40' },
  mangala: { emoji: '🫘', name: 'Mangala', desc: 'Antik strateji oyunu! Taşları topla', slug: 'mangala', color: 'from-yellow-700/30 to-orange-600/30 border-yellow-400/40' },
  tas_kagit_makas: { emoji: '✊✋✌️', name: 'Taş Kağıt Makas', desc: '5 el oyna, en çok kazanan galip!', slug: 'tas-kagit-makas', color: 'from-sky-600/30 to-blue-600/30 border-sky-400/40' },
  gomoku: { emoji: '⚫⚪', name: 'Gomoku', desc: '15x15 tahtada 5 taşı sırala!', slug: 'gomoku', color: 'from-stone-600/30 to-gray-600/30 border-stone-400/40' },
  amiral_batti: { emoji: '🚢💥', name: 'Amiral Battı', desc: 'Gemileri yerleştir, rakibini bat!', slug: 'amiral-batti', color: 'from-cyan-600/30 to-blue-700/30 border-cyan-400/40' },
  kelime_duellosu: { emoji: '📝⚔️', name: 'Kelime Düellosu', desc: 'Karışık harfleri çöz, rakibini yen!', slug: 'kelime-duellosu', color: 'from-lime-600/30 to-green-700/30 border-lime-400/40' },
  quiz_1v1: { emoji: '🧠⚡', name: 'Quiz 1v1', desc: 'Bilgi yarışmasında rakibini yen!', slug: 'quiz-1v1', color: 'from-pink-600/30 to-rose-700/30 border-pink-400/40' },
  kart_eslestirme_pvp: { emoji: '🃏🎭', name: 'Kart Eşleştirme PvP', desc: 'Kartları çevir, eşlerini bul!', slug: 'kart-eslestirme-pvp', color: 'from-violet-600/30 to-indigo-700/30 border-violet-400/40' },
}

const gameSlug = (gt: string) => GAME_INFO[gt]?.slug || gt
const gameInfo = (gt: string) => GAME_INFO[gt] || { emoji: '🎮', name: gt, desc: '', slug: gt, color: 'from-gray-600/30 to-gray-600/30 border-gray-400/40' }

// ========== LIVE STATS BAR ==========
function LiveStatsBar({ stats }: { stats: LobbyStats }) {
  const items = [
    { label: 'Online', value: stats.onlinePlayers, icon: <Users className="w-3.5 h-3.5" />, color: 'text-green-400' },
    { label: 'Oynuyor', value: stats.playingNow, icon: <Gamepad2 className="w-3.5 h-3.5" />, color: 'text-cyan-400' },
    { label: 'İzliyor', value: stats.watching, icon: <Eye className="w-3.5 h-3.5" />, color: 'text-pink-400' },
    { label: 'Açık Masa', value: stats.openTables, icon: <Monitor className="w-3.5 h-3.5" />, color: 'text-amber-400' },
    { label: 'Bekleyen', value: stats.waitingTables, icon: <Clock className="w-3.5 h-3.5" />, color: 'text-yellow-400' },
  ]

  return (
    <div className="bg-gradient-to-r from-purple-950/80 via-fuchsia-950/60 to-purple-950/80 border-y border-fuchsia-500/20 py-2 px-4 overflow-x-auto">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 min-w-fit">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">CANLI</span>
        </div>
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-0.5">
            <span className={`${item.color} text-[8px] font-medium leading-none`}>{item.label}</span>
            <div className="flex items-center gap-1">
              <span className={item.color}>{item.icon}</span>
              <span className="text-white font-bold text-sm tabular-nums">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ========== HERO QUICK START ==========
function HeroQuickStart({
  onOpenTable,
  onWatchLive,
  onFindTable,
  loading,
  selectedGame,
  setSelectedGame,
  topGames,
}: {
  onOpenTable: (gameType?: string) => void
  onWatchLive: () => void
  onFindTable: () => void
  loading: boolean
  selectedGame: string
  setSelectedGame: (g: string) => void
  topGames: GameTypeStats[]
}) {
  // Filter to only games with active players or waiting tables, sort by activePlayers desc
  const activeGames = topGames
    .filter(g => g.activePlayers > 0 || g.waitingTables > 0)
    .sort((a, b) => (b.activePlayers + b.waitingTables) - (a.activePlayers + a.waitingTables))

  const shortName: Record<string, string> = {
    xox: 'XOX', sos: 'SOS', tombala: 'Tombala', tavla: 'Tavla', pisti: 'Pişti',
    sayi_tahmin: 'S.Tahmin', zar: 'Zar', okey: 'Okey', okey101: '101 Okey', yuzbirokey: '101+',
    connect4: 'C4', reversi: 'Reversi', dama: 'Dama', mangala: 'Mangala',
    tas_kagit_makas: 'TKM', gomoku: 'Gomoku', amiral_batti: 'A.Battı',
    kelime_duellosu: 'K.Düello', quiz_1v1: 'Quiz', kart_eslestirme_pvp: 'K.Eşleş',
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-[#1a0a2e] via-[#2d1252] to-[#1a0a2e] p-5 sm:p-6">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/5 via-transparent to-amber-600/5" />
      <div className="absolute top-0 right-0 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Title */}
        <div className="text-center mb-5">
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-fuchsia-400 via-amber-300 to-fuchsia-400 bg-clip-text text-transparent">
            🎮 Hemen Oyna
          </h1>
          <p className="text-fuchsia-300/60 text-xs sm:text-sm mt-1">Masa aç, oyuna katıl veya canlı izle</p>
        </div>

        {/* Only active games shown here */}
        {activeGames.length > 0 && (
          <div className="mb-4">
            <p className="text-fuchsia-300/50 text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-green-400" />
              Şu An Aktif Oyunlar
            </p>
            <div className={`grid gap-1.5 ${activeGames.length <= 3 ? 'grid-cols-3' : activeGames.length <= 5 ? 'grid-cols-5' : 'grid-cols-5'}`}>
              {activeGames.slice(0, 10).map((g) => {
                const gt = g.gameType
                const info = gameInfo(gt)
                const onlineCount = g.activePlayers + g.waitingTables
                return (
                  <button
                    key={gt}
                    onClick={() => onOpenTable(gt)}
                    disabled={loading}
                    className="relative flex flex-col items-center gap-0.5 px-1 py-2 rounded-xl text-center transition-all bg-purple-900/40 text-fuchsia-300/70 hover:bg-fuchsia-600/30 hover:scale-105 border border-fuchsia-500/10 hover:border-fuchsia-400/40 disabled:opacity-50"
                  >
                    <span className="absolute -top-1.5 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-bold rounded-full shadow-lg shadow-green-500/40 z-10">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      {onlineCount}
                    </span>
                    <span className="text-lg sm:text-xl leading-none">{info.emoji}</span>
                    <span className="text-[9px] sm:text-[10px] font-bold leading-tight mt-0.5 truncate w-full">{shortName[gt] || info.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <button
            onClick={() => onOpenTable()}
            disabled={loading}
            className="flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-700 hover:from-fuchsia-500 hover:to-purple-600 transition-all hover:scale-[1.02] shadow-lg shadow-fuchsia-500/20 disabled:opacity-50"
          >
            <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <span className="text-white font-bold text-[10px] sm:text-xs">Masa Aç</span>
          </button>
          <button
            onClick={onWatchLive}
            className="flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 transition-all hover:scale-[1.02] shadow-lg shadow-cyan-500/20"
          >
            <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <span className="text-white font-bold text-[10px] sm:text-xs">Canlı İzle</span>
          </button>
          <button
            onClick={onFindTable}
            className="flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/20"
          >
            <DoorOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <span className="text-white font-bold text-[10px] sm:text-xs">Masaya Otur</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== TOP GAMES GRID ==========
function TopGamesGrid({ stats, lang }: { stats: GameTypeStats[]; lang: string }) {
  if (stats.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          En Çok Oynanan Oyunlar
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {stats.slice(0, 10).map((s, i) => {
          const info = gameInfo(s.gameType)
          const isHot = s.activePlayers > 0 || s.todayPlayed > 5
          return (
            <Link key={s.gameType} href={`/${lang}/oyunlar/${info.slug}`}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative bg-gradient-to-br ${info.color} rounded-xl p-3 border hover:scale-[1.03] transition-all cursor-pointer group`}
              >
                {s.activePlayers > 0 && (
                  <div className="absolute -top-2 -right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500 rounded-full shadow-lg shadow-green-500/50 animate-pulse z-10">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    <span className="text-[9px] text-white font-bold">{s.activePlayers}</span>
                  </div>
                )}
                <div className="text-center">
                  <span className="text-3xl block mb-1.5 group-hover:scale-110 transition-transform">{info.emoji}</span>
                  <p className="text-white font-bold text-xs truncate">{info.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.activePlayers > 0 ? 'bg-green-400 animate-pulse' : 'bg-fuchsia-500/30'}`} />
                    <span className={`text-[10px] font-medium ${s.activePlayers > 0 ? 'text-green-300' : 'text-fuchsia-300/70'}`}>{s.activePlayers} kişi</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-fuchsia-300/50">
                    <span>🏆 {s.todayPlayed}</span>
                    <span>🪑 {s.waitingTables}</span>
                  </div>
                </div>
                <div className="mt-2 flex gap-1">
                  <span className="flex-1 text-center px-1 py-1 bg-fuchsia-600/60 text-white text-[10px] rounded-md font-bold group-hover:bg-fuchsia-500/80 transition">
                    Oyna
                  </span>
                  <span className="px-2 py-1 bg-cyan-600/40 text-cyan-200 text-[10px] rounded-md font-medium">
                    İzle
                  </span>
                </div>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ========== LIVE TABLES ==========
function LiveTablesList({
  tables,
  lang,
  userId,
  onJoinTable,
  filter,
  setFilter,
}: {
  tables: LiveTable[]
  lang: string
  userId?: string
  onJoinTable: (roomId: string, gameType: string, playerName: string, betAmount: number, betCurrency: string) => void
  filter: string
  setFilter: (f: string) => void
}) {
  const filtered = filter === 'all' ? tables : tables.filter((t) => t.gameType === filter)
  const waiting = filtered.filter((t) => t.status === 'waiting' && !t.isAI)
  const active = filtered.filter((t) => t.status === 'active' && !t.isAI)
  const aiGames = filtered.filter((t) => t.status === 'active' && t.isAI)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-white font-bold text-sm flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          Canlı Masalar
          <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">
            {tables.length} aktif
          </span>
        </h2>
        {/* Filter */}
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition ${filter === 'all' ? 'bg-fuchsia-600 text-white' : 'bg-purple-900/40 text-fuchsia-300/60 hover:bg-purple-800/50'}`}
          >
            Tümü
          </button>
          {Object.keys(GAME_INFO).slice(0, 6).map((gt) => (
            <button
              key={gt}
              onClick={() => setFilter(gt)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition whitespace-nowrap ${filter === gt ? 'bg-fuchsia-600 text-white' : 'bg-purple-900/40 text-fuchsia-300/60 hover:bg-purple-800/50'}`}
            >
              {gameInfo(gt).emoji}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-fuchsia-300/40 text-sm">
          <Monitor className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Henüz aktif masa yok</p>
          <p className="text-xs mt-1">İlk masayı sen aç!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Waiting tables first */}
          {waiting.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-green-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" /> Katılımcı Bekliyor ({waiting.length})
              </p>
              {waiting.map((t) => {
                const info = gameInfo(t.gameType)
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 hover:border-green-400/60 transition-all"
                  >
                    <span className="text-xl">{info.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold">{info.name}</p>
                      <p className="text-green-300/60 text-[10px] truncate">
                        {t.player1Name} — Katılımcı bekleniyor...
                      </p>
                    </div>
                    <CostBadge betAmount={t.betAmount} betCurrency={t.betCurrency} />
                    <button
                      onClick={() => onJoinTable(t.id, t.gameType, t.player1Name, t.betAmount, t.betCurrency)}
                      className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-[10px] rounded-full font-bold hover:scale-105 transition shadow-lg shadow-green-500/20"
                    >
                      🪑 Otur
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Active games */}
          {active.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-fuchsia-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Swords className="w-3 h-3" /> Devam Eden Oyunlar ({active.length})
              </p>
              {active.slice(0, 8).map((t) => {
                const info = gameInfo(t.gameType)
                return (
                  <Link key={t.id} href={`/${lang}/oyunlar/${info.slug}`}>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-purple-900/20 to-fuchsia-900/20 border border-fuchsia-500/20 hover:border-fuchsia-400/50 transition-all cursor-pointer"
                    >
                      <span className="text-xl">{info.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold">{info.name}</p>
                        <p className="text-fuchsia-300/60 text-[10px] truncate">
                          {t.player1Name} vs {t.player2Name}
                          {t.player1Score > 0 || t.player2Score > 0 ? ` (${t.player1Score}-${t.player2Score})` : ''}
                        </p>
                      </div>
                      <CostBadge betAmount={t.betAmount} betCurrency={t.betCurrency} />
                      <div className="flex items-center gap-2">
                        {t.viewerCount > 0 && (
                          <span className="text-fuchsia-400/50 text-[10px] flex items-center gap-0.5">👁 {t.viewerCount}</span>
                        )}
                        <span className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-[10px] rounded-full font-bold">
                          👁 İzle
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ========== AUTO MATCH MODAL ==========
function FindTableModal({
  isOpen,
  onClose,
  tables,
  lang,
  userId,
  onJoinTable,
}: {
  isOpen: boolean
  onClose: () => void
  tables: LiveTable[]
  lang: string
  userId?: string
  onJoinTable: (roomId: string, gameType: string) => void
}) {
  const [freshTables, setFreshTables] = useState<LiveTable[]>([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [selectedTable, setSelectedTable] = useState<LiveTable | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const fetchFresh = async () => {
      setLoadingTables(true)
      try {
        const res = await fetch('/api/games/lobby?section=live_tables')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setFreshTables(data.tables || [])
        }
      } catch {}
      if (!cancelled) setLoadingTables(false)
    }
    fetchFresh()
    const iv = setInterval(() => { if (!document.hidden) fetchFresh() }, 8000)
    return () => { cancelled = true; clearInterval(iv); setSelectedTable(null) }
  }, [isOpen])

  if (!isOpen) return null

  const allTables = freshTables.length > 0 ? freshTables : tables
  const waitingRooms = allTables.filter(t => t.status === 'waiting' && !t.isAI && t.player1Id !== userId)
  const activeGamesNonAI = allTables.filter(t => t.status === 'active' && !t.isAI)

  // Selected table detail view
  if (selectedTable) {
    const info = gameInfo(selectedTable.gameType)
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setSelectedTable(null) } }}>
        <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }} className="bg-[#1a0a2e] border border-fuchsia-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-fuchsia-500/10">
          <div className="text-center mb-5">
            <span className="text-4xl block mb-2">{info.emoji}</span>
            <h3 className="text-white font-bold text-lg">{info.name}</h3>
            <p className="text-fuchsia-300/60 text-sm mt-1"><span className="text-white font-medium">{selectedTable.player1Name}</span> masasına oturmak istiyor musunuz?</p>
          </div>
          {/* Details */}
          <div className="rounded-xl p-4 mb-4 space-y-2" style={{ background: 'linear-gradient(135deg, rgba(120, 20, 120, 0.15), rgba(40, 10, 60, 0.3))' }}>
            {selectedTable.gridSize && selectedTable.gridSize > 0 && (
              <div className="flex items-center justify-between text-xs"><span className="text-fuchsia-300/70">📐 Oyun Alanı</span><span className="text-white font-bold">{selectedTable.gridSize}x{selectedTable.gridSize}</span></div>
            )}
            <div className="flex items-center justify-between text-xs"><span className="text-fuchsia-300/70">⏱️ Süre Limiti</span><span className="text-white font-bold">{selectedTable.turnTimer > 0 ? `${selectedTable.turnTimer}s` : 'Yok'}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-fuchsia-300/70">💰 Bahis</span><span className="text-white font-bold">{(!selectedTable.betAmount || selectedTable.betCurrency === 'FREE') ? '🆓 Ücretsiz' : `${selectedTable.betAmount} ${selectedTable.betCurrency}`}</span></div>
          </div>
          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setSelectedTable(null)} className="px-4 py-3 rounded-xl bg-purple-900/40 border border-fuchsia-500/20 text-fuchsia-300 font-bold text-sm hover:bg-purple-800/50 transition-all">❌ Vazgeç</button>
            <button onClick={() => { onJoinTable(selectedTable.id, selectedTable.gameType); setSelectedTable(null); onClose() }} className="px-4 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-sm hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/20">✅ Masaya Otur</button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#1a0a2e] border border-fuchsia-500/30 rounded-2xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2"><DoorOpen className="w-5 h-5 text-amber-400" /> Masaya Otur</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-fuchsia-900/50 rounded-full transition"><X className="w-5 h-5 text-fuchsia-400" /></button>
        </div>

        {loadingTables && freshTables.length === 0 && (
          <div className="text-center py-4 text-fuchsia-300/60 text-sm">
            <div className="w-6 h-6 border-2 border-fuchsia-400/40 border-t-fuchsia-400 rounded-full animate-spin mx-auto mb-2" />
            Masalar yükleniyor...
          </div>
        )}

        {/* Waiting rooms - real players */}
        {waitingRooms.length > 0 && (
          <div className="mb-4">
            <p className="text-green-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-2"><Clock className="w-3 h-3" /> Rakip Bekleyen Masalar ({waitingRooms.length})</p>
            <div className="space-y-1.5">
              {waitingRooms.map((t) => {
                const info = gameInfo(t.gameType)
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 hover:border-green-400/60 transition-all">
                    <span className="text-xl">{info.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold">{info.name}</p>
                      <p className="text-green-300/60 text-[10px] truncate">
                        {t.player1Name} {t.gridSize && t.gridSize > 0 ? `• ${t.gridSize}x${t.gridSize}` : ''} {t.turnTimer > 0 ? `• ⏱️${t.turnTimer}s` : ''}
                      </p>
                    </div>
                    <CostBadge betAmount={t.betAmount} betCurrency={t.betCurrency} />
                    <button onClick={() => setSelectedTable(t)} className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-[10px] rounded-full font-bold hover:scale-105 transition shadow-lg shadow-green-500/20">🪑 Otur</button>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Active PvP games to spectate */}
        {activeGamesNonAI.length > 0 && (
          <div className="mb-4">
            <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-2"><Eye className="w-3 h-3" /> Aktif Oyunlar ({activeGamesNonAI.length})</p>
            <div className="space-y-1.5">
              {activeGamesNonAI.slice(0, 10).map((t) => {
                const info = gameInfo(t.gameType)
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 transition-all">
                    <span className="text-lg">{info.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold">{t.player1Name} vs {t.player2Name}</p>
                      <p className="text-cyan-300/60 text-[10px]">{t.player1Score}-{t.player2Score}{t.betAmount > 0 && ` • ${t.betAmount} ${t.betCurrency}`}</p>
                    </div>
                    <span className="text-cyan-400/60 text-[10px]">👀 {t.viewerCount}</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {!loadingTables && waitingRooms.length === 0 && activeGamesNonAI.length === 0 && (
          <div className="text-center py-8 text-fuchsia-300/40 text-sm">
            <Monitor className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Şu an rakip bekleyen masa yok</p>
            <p className="text-xs mt-1">Bir oyun seçip masa aç ve rakip bekle!</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ========== RECENT WINNERS ==========
function RecentWinnersSection({ winners }: { winners: RecentWinner[] }) {
  if (winners.length === 0) return null

  return (
    <div className="space-y-2">
      <h2 className="text-white font-bold text-sm flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-400" />
        Son Kazananlar
      </h2>
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {winners.map((w) => {
          const info = gameInfo(w.gameType)
          return (
            <div
              key={w.id}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-purple-900/20 border border-fuchsia-500/10"
            >
              <span className="text-lg">{info.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">
                  <span className="text-amber-300">{w.winnerName}</span>
                  <span className="text-fuchsia-300/40"> vs {w.loserName}</span>
                </p>
                <p className="text-fuchsia-300/40 text-[10px]">
                  {info.name} • {w.score}
                </p>
              </div>
              {w.payout > 0 && (
                <span className="text-yellow-400 text-xs font-bold">+{w.payout} {w.currency}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ========== ACTIVITY FEED ==========
function ActivityFeed({ tables, winners }: { tables: LiveTable[]; winners: RecentWinner[] }) {
  const [feed, setFeed] = useState<Array<{ id: string; text: string; time: number; emoji: string }>>([])

  useEffect(() => {
    const items: Array<{ id: string; text: string; time: number; emoji: string }> = []
    tables.slice(0, 5).forEach((t) => {
      const info = gameInfo(t.gameType)
      if (t.status === 'waiting') {
        items.push({ id: `w-${t.id}`, text: `${t.player1Name} ${info.name} masası açtı`, time: new Date(t.createdAt).getTime(), emoji: '🆕' })
      } else {
        items.push({ id: `a-${t.id}`, text: `${t.player1Name} vs ${t.player2Name} (${info.name})`, time: new Date(t.createdAt).getTime(), emoji: '⚔️' })
      }
    })
    winners.slice(0, 5).forEach((w) => {
      items.push({ id: `win-${w.id}`, text: `${w.winnerName} ${gameInfo(w.gameType).name} kazandı!`, time: new Date(w.time).getTime(), emoji: '🏆' })
    })
    items.sort((a, b) => b.time - a.time)
    setFeed(items.slice(0, 8))
  }, [tables, winners])

  if (feed.length === 0) return null

  return (
    <div className="space-y-2">
      <h2 className="text-white font-bold text-sm flex items-center gap-2">
        <Activity className="w-4 h-4 text-green-400" />
        Canlı Akış
      </h2>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {feed.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-purple-900/10 text-xs"
          >
            <span>{item.emoji}</span>
            <span className="text-fuchsia-200/70 truncate">{item.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ========== MINI GAMES DATA ==========
const QUIZ_QUESTIONS = [
  { q: 'Hangi burç ateş elementidir?', options: ['Koç', 'Boğa', 'İkizler', 'Yengeç'], answer: 0 },
  { q: 'Venüs hangi burcun yönetici gezegenidir?', options: ['Koç', 'Boğa', 'İkizler', 'Yay'], answer: 1 },
  { q: 'Zodyak\'ta kaç burç vardır?', options: ['10', '11', '12', '13'], answer: 2 },
  { q: 'Hangi burç su elementidir?', options: ['Aslan', 'Başak', 'Akrep', 'Oğlak'], answer: 2 },
  { q: 'Merkür hangi burcun yönetici gezegenidir?', options: ['İkizler', 'Aslan', 'Terazi', 'Kova'], answer: 0 },
]
const MEMORY_SYMBOLS = ['☕', '🔮', '⭐', '🌙', '🎴', '🕯️', '💎', '🪬']
const GENIE_MESSAGES = [
  'Merhaba efendim! Sana 3 sandık sunuyorum...',
  'Yine buradayım! Şansını dene!',
  'Akıllıca seç efendim!',
]

// ========== MAIN COMPONENT ==========
export default function GameLobbyPage() {
  const { data: session } = useSession() || {}
  const { language } = useLanguage()
  const router = useRouter()
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'

  // Lobby state
  const [lobbyStats, setLobbyStats] = useState<LobbyStats>({ onlinePlayers: 0, playingNow: 0, watching: 0, openTables: 0, waitingTables: 0, totalGamesPlayed: 0 })
  const [topGames, setTopGames] = useState<GameTypeStats[]>([])
  const [liveTables, setLiveTables] = useState<LiveTable[]>([])
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [spectatorGames, setSpectatorGames] = useState<SpectatorGame[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [roomDistribution, setRoomDistribution] = useState<RoomDistribution[]>([])
  const [roomDistTotal, setRoomDistTotal] = useState(0)
  const [recommendedRooms, setRecommendedRooms] = useState<RecommendedRoom[]>([])
  const [popularGames, setPopularGames] = useState<PopularGame[]>([])
  const [loading, setLoading] = useState(true)
  const [matchLoading, setMatchLoading] = useState(false)

  // UI state
  const [selectedGame, setSelectedGame] = useState('xox')
  const [tableFilter, setTableFilter] = useState('all')
  const [activeTab, setActiveTab] = useState<'lobby' | 'mini' | 'quests' | 'leaderboard' | 'spectator' | 'tournaments'>('lobby')
  const liveSectionRef = useRef<HTMLDivElement>(null)

  // Leaderboard filters
  const [lbPeriod, setLbPeriod] = useState<'all' | 'weekly' | 'monthly'>('all')
  const [lbGameType, setLbGameType] = useState('all')
  const [lbSearch, setLbSearch] = useState('')
  const [lbCurrentUserId, setLbCurrentUserId] = useState<string | null>(null)

  // Profile & mini-game state
  const [profile, setProfile] = useState<GameProfile | null>(null)
  const [games, setGames] = useState<MiniGame[]>([])
  const [quests, setQuests] = useState<Quest[]>([])
  const [dailyReward, setDailyReward] = useState<DailyRewardStatus | null>(null)
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [rewardAnimation, setRewardAnimation] = useState<number | null>(null)

  // Mini-game states (preserved from original)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinDegree, setSpinDegree] = useState(0)
  const [tarotCards, setTarotCards] = useState<number[]>([0, 1, 2, 3, 4])
  const [selectedTarot, setSelectedTarot] = useState<number | null>(null)
  const [tarotRevealed, setTarotRevealed] = useState(false)
  const [memoryCards, setMemoryCards] = useState<{id: number; symbol: string; flipped: boolean; matched: boolean}[]>([])
  const [memoryFirst, setMemoryFirst] = useState<number | null>(null)
  const [memoryMoves, setMemoryMoves] = useState(0)
  const [memoryComplete, setMemoryComplete] = useState(false)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [quizSelected, setQuizSelected] = useState<number | null>(null)
  const [copiedRef, setCopiedRef] = useState(false)

  // Lamba cini states
  const [lambaPhase, setLambaPhase] = useState<'idle' | 'rubbing' | 'smoke' | 'genie' | 'chests' | 'reveal'>('idle')
  const [lambaReward, setLambaReward] = useState<{ type: string; amount: number; label: string; emoji: string } | null>(null)
  const [lambaChestPicked, setLambaChestPicked] = useState<number | null>(null)
  const [lambaPlaysRemaining, setLambaPlaysRemaining] = useState<number>(3)
  const [lambaPlaysUsed, setLambaPlaysUsed] = useState<number>(0)
  const [lambaDailyLimit, setLambaDailyLimit] = useState<number>(3)
  const [lambaLoading, setLambaLoading] = useState(false)
  const [lambaGenieMsg, setLambaGenieMsg] = useState('')
  const [luckyBoxOpening, setLuckyBoxOpening] = useState(false)
  const [luckyBoxOpened, setLuckyBoxOpened] = useState(false)
  const [guessNumber, setGuessNumber] = useState('')
  const [guessTarget, setGuessTarget] = useState<number | null>(null)
  const [guessAttempts, setGuessAttempts] = useState(0)
  const [guessHint, setGuessHint] = useState('')
  const [guessWon, setGuessWon] = useState(false)

  // ===== FETCH LOBBY DATA =====
  const fetchLobbyData = useCallback(async () => {
    try {
      const [statsRes, topRes, tablesRes, winnersRes] = await Promise.all([
        fetch('/api/games/lobby?section=stats'),
        fetch('/api/games/lobby?section=top_games'),
        fetch('/api/games/lobby?section=live_tables'),
        fetch('/api/games/lobby?section=recent_winners'),
      ])

      if (statsRes.ok) setLobbyStats(await statsRes.json())
      if (topRes.ok) setTopGames(await topRes.json())
      if (tablesRes.ok) {
        const data = await tablesRes.json()
        setLiveTables(data.tables || [])
      }
      if (winnersRes.ok) {
        const data = await winnersRes.json()
        setRecentWinners(data.winners || [])
      }
    } catch (e) {
      console.error('Lobby data fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ===== FETCH LEADERBOARD (with filters) =====
  const fetchLeaderboard = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period: lbPeriod, gameType: lbGameType })
      if (lbSearch) params.set('search', lbSearch)
      const res = await fetch(`/api/games/leaderboard?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLeaderboard(data.entries || [])
        setLbCurrentUserId(data.currentUserId || null)
      }
    } catch (e) {
      console.error('Leaderboard fetch error:', e)
    }
  }, [lbPeriod, lbGameType, lbSearch])

  // ===== FETCH SPECTATOR GAMES =====
  const fetchSpectatorGames = useCallback(async () => {
    try {
      const res = await fetch('/api/games/lobby?section=spectator')
      if (res.ok) {
        const data = await res.json()
        setSpectatorGames(data.games || [])
      }
    } catch (e) {
      console.error('Spectator fetch error:', e)
    }
  }, [])

  // ===== FETCH TOURNAMENTS =====
  const fetchTournaments = useCallback(async () => {
    try {
      const res = await fetch('/api/games/lobby?section=tournaments')
      if (res.ok) {
        const data = await res.json()
        setTournaments(data.tournaments || [])
      }
    } catch (e) { console.error('Tournaments fetch error:', e) }
  }, [])

  // ===== FETCH ROOM DISTRIBUTION & RECOMMENDED =====
  const fetchLobbyExtras = useCallback(async () => {
    try {
      const [distRes, recRes] = await Promise.all([
        fetch('/api/games/lobby?section=room_distribution'),
        fetch('/api/games/lobby?section=recommended'),
      ])
      if (distRes.ok) {
        const data = await distRes.json()
        setRoomDistribution(data.distribution || [])
        setRoomDistTotal(data.total || 0)
      }
      if (recRes.ok) {
        const data = await recRes.json()
        setRecommendedRooms(data.waitingRooms || [])
        setPopularGames(data.popularGames || [])
      }
    } catch (e) { console.error('Lobby extras fetch error:', e) }
  }, [])

  // ===== FETCH PROFILE & MINI GAMES =====
  const fetchProfileData = useCallback(async () => {
    try {
      const [gamesRes, profileRes, questsRes, drRes] = await Promise.all([
        fetch('/api/games'),
        session?.user ? fetch('/api/games/profile') : null,
        session?.user ? fetch('/api/games/quests') : null,
        session?.user ? fetch('/api/games/daily-reward') : null,
      ])

      if (gamesRes.ok) setGames(await gamesRes.json())
      if (profileRes?.ok) setProfile(await profileRes.json())
      if (questsRes?.ok) setQuests(await questsRes.json())
      if (drRes?.ok) setDailyReward(await drRes.json())
    } catch (e) {
      console.error('Profile data fetch error:', e)
    }
  }, [session?.user])

  useEffect(() => {
    fetchLobbyData()
    fetchProfileData()
    fetchLeaderboard()
    fetchSpectatorGames()
    fetchTournaments()
    fetchLobbyExtras()
    const iv = setInterval(() => {
      if (document.hidden) return
      fetchLobbyData()
      if (activeTab === 'spectator') fetchSpectatorGames()
      if (activeTab === 'tournaments') fetchTournaments()
    }, 8000)
    return () => clearInterval(iv)
  }, [fetchLobbyData, fetchProfileData, fetchLeaderboard, fetchSpectatorGames, fetchTournaments, fetchLobbyExtras, activeTab])

  // Refetch leaderboard when filters change
  useEffect(() => { fetchLeaderboard() }, [lbPeriod, lbGameType, fetchLeaderboard])

  // ===== MEMORY INIT =====
  const initMemory = useCallback(() => {
    const pairs = MEMORY_SYMBOLS.slice(0, 6)
    const cards = [...pairs, ...pairs]
      .sort(() => Math.random() - 0.5)
      .map((symbol, i) => ({ id: i, symbol, flipped: false, matched: false }))
    setMemoryCards(cards)
    setMemoryFirst(null)
    setMemoryMoves(0)
    setMemoryComplete(false)
    setResultMessage(null)
  }, [])

  useEffect(() => { initMemory() }, [initMemory])

  // ===== HELPER: Record play =====
  const recordPlay = async (gameSlug: string, score?: number) => {
    try {
      const res = await fetch('/api/games/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameSlug, score }),
      })
      const data = await res.json()
      if (data.success) {
        setRewardAnimation(data.reward)
        setProfile(prev => prev ? { ...prev, cfcBalance: data.newBalance, totalGames: prev.totalGames + 1, totalJetons: prev.totalJetons + data.reward } : prev)
        setTimeout(() => setRewardAnimation(null), 2500)
        return data
      }
      return null
    } catch { return null }
  }

  // ===== ACTIONS =====
  const [showOpenTablePicker, setShowOpenTablePicker] = useState(false)

  const handleOpenTable = async (gameType?: string) => {
    if (!session?.user) { router.push(`/${lang}/giris`); return }
    if (!gameType) {
      // Show game picker modal
      setShowOpenTablePicker(true)
      return
    }
    setMatchLoading(true)
    try {
      const gt = gameType === 'sayi-tahmin' ? 'sayi_tahmin' : gameType
      // SOS uses a separate API
      if (gt === 'sos') {
        const createRes = await fetch('/api/games/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gridSize: 6, isAI: false, betAmount: 0, betCurrency: 'FREE', turnTimer: 0 }),
        })
        const createData = await createRes.json()
        if (createData.success || createData.gameId) {
          router.push(`/${lang}/oyunlar/sos?room=${createData.gameId}`)
        }
      } else {
        const createRes = await fetch('/api/games/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameType: gt, isAI: false, betAmount: 0, betCurrency: 'FREE', turnTimer: 0 }),
        })
        const createData = await createRes.json()
        if (createData.success) {
          router.push(`/${lang}/oyunlar/${gameSlug(gameType)}?room=${createData.roomId}`)
        }
      }
    } catch (e) {
      console.error('Open table error:', e)
    } finally {
      setMatchLoading(false)
    }
  }

  const handleWatchLive = () => {
    liveSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const [showFindTableModal, setShowFindTableModal] = useState(false)
  const handleFindTable = () => {
    if (!session?.user) { router.push(`/${lang}/giris`); return }
    setShowFindTableModal(true)
  }

  // Confirmation dialog state for joining a table
  const [joinConfirm, setJoinConfirm] = useState<{
    roomId: string; gameType: string; playerName: string; betAmount: number; betCurrency: string
  } | null>(null)

  const promptJoinTable = (roomId: string, gameType: string, playerName: string, betAmount: number, betCurrency: string) => {
    if (!session?.user) { router.push(`/${lang}/giris`); return }
    setJoinConfirm({ roomId, gameType, playerName, betAmount, betCurrency })
  }

  const confirmJoinTable = () => {
    if (!joinConfirm) return
    const slug = gameSlug(joinConfirm.gameType)
    setJoinConfirm(null)
    window.location.href = `/${lang}/oyunlar/${slug}?join=${joinConfirm.roomId}`
  }

  const handleJoinTable = (roomId: string, gameType: string) => {
    if (!session?.user) { router.push(`/${lang}/giris`); return }
    const slug = gameSlug(gameType)
    router.push(`/${lang}/oyunlar/${slug}?join=${roomId}`)
  }

  // Direct join used by FindTableModal detail view – skips the second confirmation dialog
  const directJoinTable = (roomId: string, gameType: string) => {
    if (!session?.user) { router.push(`/${lang}/giris`); return }
    const slug = gameSlug(gameType)
    window.location.href = `/${lang}/oyunlar/${slug}?join=${roomId}`
  }

  // ===== MINI GAME HANDLERS (preserved) =====
  const playFalCarki = async () => {
    if (isSpinning || !session?.user) return
    setIsSpinning(true)
    setResultMessage(null)
    const degree = 1440 + Math.random() * 720
    setSpinDegree(prev => prev + degree)
    setTimeout(async () => {
      const result = await recordPlay('fal-carki')
      if (result) setResultMessage(`🎉 ${result.reward} CFC kazandınız!`)
      setIsSpinning(false)
    }, 3500)
  }

  const playTarot = async (index: number) => {
    if (tarotRevealed || !session?.user) return
    setSelectedTarot(index)
    setTarotRevealed(true)
    const result = await recordPlay('tarot-sec')
    if (result) setResultMessage(`🃏 Tarot kartı ${result.reward} CFC getirdi!`)
  }

  const resetTarot = () => {
    setSelectedTarot(null)
    setTarotRevealed(false)
    setResultMessage(null)
    setTarotCards([0, 1, 2, 3, 4].sort(() => Math.random() - 0.5))
  }

  const flipMemoryCard = (index: number) => {
    if (memoryCards[index].flipped || memoryCards[index].matched || memoryComplete) return
    const newCards = [...memoryCards]
    newCards[index].flipped = true
    setMemoryCards(newCards)
    if (memoryFirst === null) {
      setMemoryFirst(index)
    } else {
      setMemoryMoves(prev => prev + 1)
      if (newCards[memoryFirst].symbol === newCards[index].symbol) {
        newCards[memoryFirst].matched = true
        newCards[index].matched = true
        setMemoryCards(newCards)
        setMemoryFirst(null)
        if (newCards.every(c => c.matched)) {
          setMemoryComplete(true)
          recordPlay('memory', memoryMoves + 1)
          setResultMessage('🎉 Tüm kartları eşleştirdiniz!')
        }
      } else {
        setTimeout(() => {
          const reset = [...newCards]
          reset[memoryFirst!].flipped = false
          reset[index].flipped = false
          setMemoryCards(reset)
          setMemoryFirst(null)
        }, 800)
      }
    }
  }

  const answerQuiz = async (optIndex: number) => {
    if (quizSelected !== null) return
    setQuizSelected(optIndex)
    const correct = optIndex === QUIZ_QUESTIONS[quizIndex].answer
    if (correct) setQuizScore(prev => prev + 1)
    setTimeout(() => {
      if (quizIndex >= 4) {
        setQuizFinished(true)
        const finalScore = quizScore + (correct ? 1 : 0)
        recordPlay('quiz', finalScore)
        setResultMessage(`🎓 Quiz bitti! ${finalScore}/5 doğru`)
      } else {
        setQuizIndex(prev => prev + 1)
        setQuizSelected(null)
      }
    }, 1200)
  }

  const initQuiz = () => { setQuizIndex(0); setQuizScore(0); setQuizFinished(false); setQuizSelected(null); setResultMessage(null) }
  const resetLuckyBox = () => { setLuckyBoxOpening(false); setLuckyBoxOpened(false); setResultMessage(null) }
  const initGuess = () => { setGuessTarget(Math.floor(Math.random() * 100) + 1); setGuessAttempts(0); setGuessHint(''); setGuessWon(false); setGuessNumber(''); setResultMessage(null) }

  const playLuckyBox = async () => {
    if (luckyBoxOpened || !session?.user) return
    setLuckyBoxOpening(true)
    setTimeout(async () => {
      setLuckyBoxOpened(true)
      setLuckyBoxOpening(false)
      const result = await recordPlay('sans-kutusu')
      if (result) setResultMessage(`🎁 ${result.reward} CFC kazandınız!`)
    }, 1500)
  }

  const guessSubmit = async () => {
    if (!guessTarget || guessWon) return
    const num = parseInt(guessNumber)
    if (isNaN(num) || num < 1 || num > 100) return
    setGuessAttempts(prev => prev + 1)
    if (num === guessTarget) {
      setGuessWon(true)
      const result = await recordPlay('sayi-tahmin', guessAttempts + 1)
      if (result) setResultMessage(`🎯 ${guessAttempts + 1} denemede buldunuz! +${result.reward} CFC`)
    } else {
      setGuessHint(num < guessTarget ? 'Daha büyük bir sayı dene ⬆️' : 'Daha küçük bir sayı dene ⬇️')
    }
    setGuessNumber('')
  }

  const initLambaCini = async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/games/lamba-cini')
      if (res.ok) {
        const data = await res.json()
        setLambaPlaysRemaining(data.playsRemaining ?? 3)
        setLambaPlaysUsed(data.playsUsed ?? 0)
        setLambaDailyLimit(data.dailyLimit ?? 3)
      }
    } catch {}
    setLambaPhase('idle')
    setLambaReward(null)
    setLambaChestPicked(null)
    setLambaGenieMsg('')
  }

  const rubLamp = () => {
    if (lambaPhase !== 'idle' || lambaPlaysRemaining <= 0 || !session?.user) return
    setLambaPhase('rubbing')
    setLambaReward(null)
    setLambaChestPicked(null)
    setLambaGenieMsg('')
    setTimeout(() => {
      setLambaPhase('smoke')
      setTimeout(() => {
        setLambaPhase('genie')
        setLambaGenieMsg(GENIE_MESSAGES[Math.floor(Math.random() * GENIE_MESSAGES.length)])
        setTimeout(() => setLambaPhase('chests'), 2000)
      }, 1500)
    }, 1200)
  }

  const pickChest = async (index: number) => {
    if (lambaPhase !== 'chests' || lambaLoading || lambaChestPicked !== null) return
    setLambaChestPicked(index)
    setLambaLoading(true)
    try {
      const res = await fetch('/api/games/lamba-cini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chestIndex: index }),
      })
      const data = await res.json()
      if (data.success) {
        setLambaReward(data.reward)
        setLambaPlaysRemaining(data.playsRemaining)
        setLambaPlaysUsed(data.playsUsed)
        setProfile(prev => prev ? { ...prev, cfcBalance: data.newBalance, totalGames: prev.totalGames + 1, totalJetons: prev.totalJetons + (data.reward?.amount || 0) } : prev)
        setTimeout(() => {
          setLambaPhase('reveal')
          if (data.reward.amount > 0) {
            setRewardAnimation(data.reward.amount)
            setTimeout(() => setRewardAnimation(null), 2500)
          }
        }, 800)
      } else {
        setLambaPhase('idle')
      }
    } catch {
      setLambaPhase('idle')
    } finally {
      setLambaLoading(false)
    }
  }

  const claimDailyReward = async () => {
    try {
      const res = await fetch('/api/games/daily-reward', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setDailyReward({ claimed: true, currentStreak: data.streak, nextReward: 0, todayReward: data.reward })
        setProfile(prev => prev ? { ...prev, cfcBalance: data.newBalance } : prev)
        setRewardAnimation(data.reward)
        setTimeout(() => setRewardAnimation(null), 2500)
      }
    } catch {}
  }

  const claimQuest = async (questType: string) => {
    try {
      const res = await fetch('/api/games/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questType }),
      })
      const data = await res.json()
      if (data.success) {
        setProfile(prev => prev ? { ...prev, cfcBalance: data.newBalance } : prev)
        setRewardAnimation(data.reward)
        setTimeout(() => setRewardAnimation(null), 2500)
        const qRes = await fetch('/api/games/quests')
        if (qRes.ok) setQuests(await qRes.json())
      }
    } catch {}
  }

  const copyReferral = () => {
    if (profile?.userReferralCode && typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${window.location.origin}/kayit-ol?ref=${profile.userReferralCode}`)
      setCopiedRef(true)
      setTimeout(() => setCopiedRef(false), 2000)
    }
  }

  // ===== RENDER MINI GAME CONTENT =====
  const renderMiniGame = (slug: string) => {
    // Simplified mini game renders - keeps existing game logic
    switch (slug) {
      case 'fal-carki':
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-48 h-48">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-2xl">▼</div>
              <div className="w-full h-full rounded-full border-4 border-yellow-400 shadow-lg shadow-yellow-500/30"
                style={{ background: 'conic-gradient(from 0deg, #9333ea, #f59e0b, #ec4899, #6366f1, #10b981, #ef4444, #8b5cf6, #f59e0b)', transform: `rotate(${spinDegree}deg)`, transition: isSpinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }} />
            </div>
            <button onClick={playFalCarki} disabled={isSpinning || !session?.user} className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold rounded-full hover:scale-105 transition disabled:opacity-50 text-sm">
              {isSpinning ? '🎡 Dönüyor...' : '🎡 Çarkı Çevir'}
            </button>
          </div>
        )
      case 'tarot-sec':
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2 flex-wrap justify-center">
              {tarotCards.map((_, i) => (
                <motion.div key={i} whileHover={!tarotRevealed ? { scale: 1.1, y: -5 } : {}}
                  className={`w-14 h-20 rounded-xl cursor-pointer border-2 flex items-center justify-center text-xl transition-all ${selectedTarot === i ? 'bg-gradient-to-b from-yellow-400 to-amber-600 border-yellow-300' : tarotRevealed ? 'bg-gray-700 border-gray-600 opacity-50' : 'bg-gradient-to-b from-purple-800 to-indigo-900 border-fuchsia-500/50 hover:border-fuchsia-400'}`}
                  onClick={() => playTarot(i)}
                >{selectedTarot === i ? '🌟' : tarotRevealed ? '🃏' : '🔮'}</motion.div>
              ))}
            </div>
            {tarotRevealed && <button onClick={resetTarot} className="flex items-center gap-2 px-4 py-2 bg-fuchsia-700 text-white rounded-full text-xs"><RotateCcw className="w-3 h-3" /> Tekrar</button>}
          </div>
        )
      case 'memory':
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="text-xs text-fuchsia-300">Hamle: {memoryMoves} | Eşleşen: {memoryCards.filter(c => c.matched).length / 2}/6</div>
            <div className="grid grid-cols-4 gap-2">
              {memoryCards.map((card, i) => (
                <div key={card.id} className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg cursor-pointer border-2 transition-all ${card.matched ? 'bg-green-800/50 border-green-500/50' : card.flipped ? 'bg-fuchsia-800/50 border-fuchsia-400' : 'bg-purple-900/50 border-fuchsia-500/30'}`}
                  onClick={() => flipMemoryCard(i)}
                >{(card.flipped || card.matched) ? card.symbol : '❓'}</div>
              ))}
            </div>
            {memoryComplete && <button onClick={initMemory} className="px-4 py-2 bg-fuchsia-700 text-white rounded-full text-xs"><RotateCcw className="w-3 h-3 inline mr-1" />Tekrar</button>}
          </div>
        )
      case 'quiz':
        return (
          <div className="flex flex-col items-center gap-3 w-full">
            {!quizFinished ? (
              <>
                <div className="text-xs text-fuchsia-300">Soru {quizIndex + 1}/5 • Doğru: {quizScore}</div>
                <p className="text-white text-sm text-center">{QUIZ_QUESTIONS[quizIndex].q}</p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                  {QUIZ_QUESTIONS[quizIndex].options.map((opt, i) => (
                    <button key={i} onClick={() => answerQuiz(i)} disabled={quizSelected !== null}
                      className={`px-3 py-2 rounded-lg text-xs border transition ${quizSelected === null ? 'bg-purple-900/50 border-fuchsia-500/30 text-white' : i === QUIZ_QUESTIONS[quizIndex].answer ? 'bg-green-700/50 border-green-400 text-green-200' : quizSelected === i ? 'bg-red-700/50 border-red-400 text-red-200' : 'bg-purple-900/30 border-fuchsia-500/20 text-fuchsia-400/50'}`}
                    >{opt}</button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-amber-300 font-bold">🎓 {quizScore}/5 Doğru!</p>
                <button onClick={initQuiz} className="mt-2 px-4 py-2 bg-fuchsia-700 text-white rounded-full text-xs">Tekrar</button>
              </div>
            )}
          </div>
        )
      case 'sans-kutusu':
        return (
          <div className="flex flex-col items-center gap-4">
            <motion.div animate={luckyBoxOpening ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] } : {}} className="text-6xl cursor-pointer" onClick={playLuckyBox}>
              {luckyBoxOpened ? '🎉' : '🎁'}
            </motion.div>
            {!luckyBoxOpened && <button onClick={playLuckyBox} disabled={luckyBoxOpening || !session?.user} className="px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold rounded-full text-sm disabled:opacity-50">{luckyBoxOpening ? 'Açılıyor...' : '🎁 Kutuyu Aç'}</button>}
            {luckyBoxOpened && <button onClick={resetLuckyBox} className="px-4 py-2 bg-fuchsia-700 text-white rounded-full text-xs"><RotateCcw className="w-3 h-3 inline mr-1" />Tekrar</button>}
          </div>
        )
      case 'sayi-tahmin-mini':
        return (
          <div className="flex flex-col items-center gap-3">
            <p className="text-fuchsia-300 text-xs">1-100 arası sayıyı tahmin et!</p>
            {!guessWon && (
              <div className="flex gap-2">
                <input type="number" value={guessNumber} onChange={(e) => setGuessNumber(e.target.value)} min="1" max="100" className="w-20 px-3 py-2 bg-purple-900/50 border border-fuchsia-500/30 rounded-lg text-white text-center text-sm" placeholder="?" />
                <button onClick={guessSubmit} className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg text-sm font-medium">Tahmin</button>
              </div>
            )}
            {guessHint && <p className="text-amber-300 text-xs">{guessHint}</p>}
            {guessWon && <button onClick={initGuess} className="px-4 py-2 bg-fuchsia-700 text-white rounded-full text-xs">Tekrar</button>}
            <p className="text-fuchsia-300/40 text-[10px]">Deneme: {guessAttempts}</p>
          </div>
        )
      case 'lamba-cini':
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="text-xs text-fuchsia-300/70">Günlük: {lambaPlaysRemaining}/{lambaDailyLimit}</div>
            {(lambaPhase === 'idle' || lambaPhase === 'rubbing') && (
              <div className="flex flex-col items-center gap-3">
                <div className={`text-6xl cursor-pointer ${lambaPlaysRemaining <= 0 ? 'opacity-40' : 'hover:scale-110'} transition`} onClick={rubLamp}>🪔</div>
                {lambaPlaysRemaining > 0 && <button onClick={rubLamp} disabled={lambaPhase === 'rubbing' || !session?.user} className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold rounded-full text-sm disabled:opacity-50">{lambaPhase === 'rubbing' ? '✨ Ovuluyor...' : '🪔 Lambayı Ov'}</button>}
              </div>
            )}
            {lambaPhase === 'smoke' && <div className="text-5xl animate-bounce">🪔💨</div>}
            {(lambaPhase === 'genie' || lambaPhase === 'chests') && (
              <div className="flex flex-col items-center gap-3">
                <div className="text-6xl">🧞</div>
                {lambaGenieMsg && <p className="text-fuchsia-200 text-xs text-center bg-purple-900/50 px-3 py-2 rounded-xl">{lambaGenieMsg}</p>}
                {lambaPhase === 'chests' && (
                  <div className="flex gap-3">
                    {[0, 1, 2].map(i => (
                      <button key={i} onClick={() => pickChest(i)} disabled={lambaChestPicked !== null}
                        className={`text-4xl transition hover:scale-110 ${lambaChestPicked === i ? 'scale-125' : ''} ${lambaChestPicked !== null && lambaChestPicked !== i ? 'opacity-30' : ''}`}
                      >🎁</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {lambaPhase === 'reveal' && lambaReward && (
              <div className="text-center">
                <div className="text-3xl mb-1">{lambaReward.emoji}</div>
                <p className="text-amber-300 font-bold text-sm">{lambaReward.label}</p>
                {lambaReward.amount > 0 && <p className="text-yellow-400 text-xs">+{lambaReward.amount} CFC</p>}
                {lambaPlaysRemaining > 0 && <button onClick={initLambaCini} className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-full text-xs">Tekrar ({lambaPlaysRemaining})</button>}
              </div>
            )}
          </div>
        )
      case 'game-2048':
        return <Game2048 onComplete={(score) => recordPlay('game-2048', score).then(d => { if (d) setResultMessage(`🏆 2048 Skor: ${score} • +${d.reward} CFC`) })} />
      case 'mayin-tarlasi':
        return <GameMinesweeper onComplete={(score) => recordPlay('mayin-tarlasi', score).then(d => { if (d) setResultMessage(`💣 Mayın Tarlası temizlendi! +${d.reward} CFC`) })} />
      case 'sudoku':
        return <GameSudoku onComplete={(score) => recordPlay('sudoku', score).then(d => { if (d) setResultMessage(`🧩 Sudoku tamamlandı! +${d.reward} CFC`) })} />
      case 'hafiza-eslestirme':
        return <GameMemoryMatch onComplete={(score) => recordPlay('hafiza-eslestirme', score).then(d => { if (d) setResultMessage(`🧠 Hafıza Eşleştirme tamamlandı! +${d.reward} CFC`) })} />
      case 'adam-asmaca':
        return <GameHangman onComplete={(score) => recordPlay('adam-asmaca', score).then(d => { if (d) setResultMessage(`📝 Kelime bulundu! +${d.reward} CFC`) })} />
      case 'slot':
        return <GameSlot onComplete={(score) => recordPlay('slot', score).then(d => { if (d) setResultMessage(`🎰 Jackpot! +${d.reward} CFC`) })} />
      case 'carkifelek':
        return <GameCarkifelek onComplete={(score) => recordPlay('carkifelek', score).then(d => { if (d) setResultMessage(`🎡 Çarkıfelek tamamlandı! +${d.reward} CFC`) })} />
      case 'kazi-kazan':
        return <GameScratch onComplete={(score) => recordPlay('kazi-kazan', score).then(d => { if (d) setResultMessage(`🪙 Kazı Kazan tamamlandı! +${d.reward} CFC`) })} />
      case 'kelime-bulmaca':
        return <GameWordPuzzle onComplete={(score) => recordPlay('kelime-bulmaca', score).then(d => { if (d) setResultMessage(`🔤 Bulmaca çözüldü! +${d.reward} CFC`) })} />
      case 'anagram':
        return <GameAnagram onComplete={(score) => recordPlay('anagram', score).then(d => { if (d) setResultMessage(`🔠 Anagram çözüldü! +${d.reward} CFC`) })} />
      case 'mastermind':
        return <GameMastermind onComplete={(score) => recordPlay('mastermind', score).then(d => { if (d) setResultMessage(`🧠 Kodu kırdın! +${d.reward} CFC`) })} />
      case 'quiz':
        return <GameQuiz onComplete={(score) => recordPlay('quiz', score).then(d => { if (d) setResultMessage(`🧪 Quiz tamamlandı! +${d.reward} CFC`) })} />
      case 'renk-siralama':
        return <GameColorSort onComplete={(score) => recordPlay('renk-siralama', score).then(d => { if (d) setResultMessage(`🎨 Renkler sıralandı! +${d.reward} CFC`) })} />
      case 'logo-tahmin':
        return <GameLogoQuiz onComplete={(score) => recordPlay('logo-tahmin', score).then(d => { if (d) setResultMessage(`🏷️ Logo Quiz bitti! +${d.reward} CFC`) })} />
      case 'kelime-avi':
        return <GameWordHunt onComplete={(score) => recordPlay('kelime-avi', score).then(d => { if (d) setResultMessage(`🔍 Kelimeler bulundu! +${d.reward} CFC`) })} />
      default:
        return <p className="text-fuchsia-300 text-sm">Oyun yükleniyor...</p>
    }
  }

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-500 mx-auto" />
          <p className="text-fuchsia-300/60 text-sm mt-3">Oyun lobisi yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white">
      {/* Reward Animation */}
      <AnimatePresence>
        {rewardAnimation !== null && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.5 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl shadow-2xl shadow-amber-500/50">
            <span className="text-xl font-bold">+{rewardAnimation} 💰</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-purple-950/90 backdrop-blur-md border-b border-fuchsia-500/30 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-fuchsia-400 hover:text-fuchsia-300 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-fuchsia-400" />
              <span className="font-bold text-sm sm:text-base bg-gradient-to-r from-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
                Oyun Lobisi
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-900/40 rounded-full border border-fuchsia-500/30">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300 font-bold text-sm">{profile.cfcBalance}</span>
                  <span className="text-fuchsia-400/60 text-xs">CFC</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/40 rounded-full border border-blue-500/30">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 font-bold text-sm">{profile.jetonBalance}</span>
                  <span className="text-blue-400/60 text-xs">Jeton</span>
                </div>
              </div>
            )}
            {!session?.user && (
              <Link href={`/${lang}/giris`} className="px-4 py-1.5 bg-fuchsia-600 rounded-full text-sm font-medium hover:bg-fuchsia-500 transition">
                Giriş Yap
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Live Stats Bar */}
      <LiveStatsBar stats={lobbyStats} />

      {/* Daily Reward Banner */}
      {session?.user && dailyReward && !dailyReward.claimed && (
        <div className="px-4 pt-3">
          <div className="max-w-5xl mx-auto bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-6 h-6 text-amber-400" />
              <div>
                <p className="text-amber-300 font-bold text-xs">Günlük Ödül</p>
                <p className="text-amber-200/60 text-[10px]">Seri: {dailyReward.currentStreak} gün • {dailyReward.nextReward} CFC</p>
              </div>
            </div>
            <button onClick={claimDailyReward} className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-full text-xs hover:scale-105 transition">
              Topla!
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="px-4 pt-3">
        <div className="max-w-5xl mx-auto flex gap-1.5 overflow-x-auto pb-2">
          {[
            { key: 'lobby' as const, label: '🎮 Lobi', icon: Gamepad2 },
            { key: 'spectator' as const, label: '👁 Canlı İzle', icon: Eye },
            { key: 'tournaments' as const, label: '🏟️ Turnuvalar', icon: Medal },
            { key: 'mini' as const, label: '🎰 Mini Oyunlar', icon: Star },
            { key: 'quests' as const, label: '🎯 Görevler', icon: Target },
            { key: 'leaderboard' as const, label: '🏆 Sıralama', icon: Trophy },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/30'
                  : 'bg-purple-900/30 text-fuchsia-300/70 hover:bg-purple-900/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-3">
        <div className="max-w-5xl mx-auto">

          {/* ===== LOBBY TAB ===== */}
          {activeTab === 'lobby' && (
            <div className="space-y-5">
              {/* Hero Quick Start */}
              <HeroQuickStart
                onOpenTable={handleOpenTable}
                onWatchLive={handleWatchLive}
                onFindTable={handleFindTable}
                loading={matchLoading}
                selectedGame={selectedGame}
                setSelectedGame={setSelectedGame}
                topGames={topGames}
              />

              {/* Top Games Grid */}
              <TopGamesGrid stats={topGames} lang={lang} />

              {/* Live Tables */}
              <div ref={liveSectionRef}>
                <LiveTablesList
                  tables={liveTables}
                  lang={lang}
                  userId={session?.user?.id}
                  onJoinTable={promptJoinTable}
                  filter={tableFilter}
                  setFilter={setTableFilter}
                />
              </div>

              {/* Önerilen Masalar (Recommended Tables) */}
              {(recommendedRooms.length > 0 || popularGames.length > 0) && (
                <div className="space-y-3">
                  <h2 className="text-white font-bold text-sm flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Önerilen Masalar
                  </h2>
                  {recommendedRooms.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-green-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <UserPlus className="w-3 h-3" /> Seni Bekliyor
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {recommendedRooms.slice(0, 6).map((room) => {
                          const info = gameInfo(room.gameType)
                          return (
                            <motion.div
                              key={room.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/20 hover:border-green-400/50 transition-all cursor-pointer"
                              onClick={() => promptJoinTable(room.id, room.gameType, room.player1Name, room.betAmount, room.betCurrency)}
                            >
                              <span className="text-xl">{info.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-bold truncate">{info.name}</p>
                                <p className="text-green-300/60 text-[10px] truncate">{room.player1Name}</p>
                              </div>
                              <CostBadge betAmount={room.betAmount} betCurrency={room.betCurrency} />
                              <span className="px-2 py-1 bg-green-600/70 text-white text-[9px] rounded-full font-bold">Katıl</span>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {popularGames.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Popüler Oyunlar
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {popularGames.slice(0, 4).map((pg) => {
                          const info = gameInfo(pg.gameType)
                          return (
                            <Link key={pg.id} href={`/${lang}/oyunlar/${info.slug}?watch=${pg.id}`}>
                              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-cyan-900/15 to-blue-900/15 border border-cyan-500/15 hover:border-cyan-400/40 transition-all">
                                <span className="text-xl">{info.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-xs font-bold truncate">{pg.player1Name} vs {pg.player2Name}</p>
                                  <p className="text-cyan-300/50 text-[10px]">{info.name} • {pg.player1Score}-{pg.player2Score}</p>
                                </div>
                                {pg.viewerCount > 0 && (
                                  <span className="text-cyan-400/60 text-[10px] flex items-center gap-0.5">👁 {pg.viewerCount}</span>
                                )}
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Oda Dağılımı (Room Distribution) */}
              {roomDistTotal > 0 && (
                <div className="space-y-3">
                  <h2 className="text-white font-bold text-sm flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-fuchsia-400" />
                    Oda Dağılımı
                    <span className="text-fuchsia-300/50 text-[10px] font-normal">({roomDistTotal} aktif oda)</span>
                  </h2>
                  <div className="bg-gradient-to-br from-[#1a0a2e] to-[#1f0d35] border border-fuchsia-500/20 rounded-xl p-4">
                    {/* Visual bar chart */}
                    <div className="space-y-2">
                      {roomDistribution
                        .filter(d => d.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .map((d) => {
                          const info = gameInfo(d.gameType)
                          const colors: Record<string, string> = {
                            xox: 'bg-rose-500', sos: 'bg-blue-500', tombala: 'bg-purple-500',
                            tavla: 'bg-amber-500', pisti: 'bg-green-500', sayi_tahmin: 'bg-indigo-500',
                            zar: 'bg-orange-500', okey: 'bg-teal-500', okey101: 'bg-fuchsia-500',
                            yuzbirokey: 'bg-violet-500',
                          }
                          return (
                            <div key={d.gameType} className="flex items-center gap-2">
                              <span className="text-sm w-5 text-center">{info.emoji}</span>
                              <span className="text-white text-[10px] font-medium w-16 truncate">{info.name}</span>
                              <div className="flex-1 bg-purple-900/30 rounded-full h-4 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${d.percentage}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className={`h-4 rounded-full ${colors[d.gameType] || 'bg-fuchsia-500'} flex items-center justify-end pr-1.5`}
                                  style={{ minWidth: d.percentage > 0 ? '20px' : '0' }}
                                >
                                  <span className="text-[9px] text-white font-bold">{d.percentage}%</span>
                                </motion.div>
                              </div>
                              <span className="text-fuchsia-300/60 text-[10px] w-6 text-right">{d.count}</span>
                            </div>
                          )
                        })
                      }
                      {roomDistribution.filter(d => d.count > 0).length === 0 && (
                        <p className="text-fuchsia-300/40 text-xs text-center py-2">Şu an aktif oda yok</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom: Recent Winners + Activity Feed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RecentWinnersSection winners={recentWinners} />
                <ActivityFeed tables={liveTables} winners={recentWinners} />
              </div>

              {/* Referral */}
              {session?.user && profile?.userReferralCode && (
                <div className="bg-gradient-to-r from-[#1a0a2e] to-[#1f0d35] border border-fuchsia-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 className="w-4 h-4 text-fuchsia-400" />
                    <p className="text-white font-bold text-xs">Davet Et & Kazan</p>
                    <span className="text-fuchsia-300/60 text-[10px]">50 CFC</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 px-2 py-1.5 bg-purple-900/40 rounded-lg text-[10px] text-fuchsia-300 truncate border border-fuchsia-500/20">
                      {typeof window !== 'undefined' ? `${window.location.origin}/kayit-ol?ref=${profile.userReferralCode}` : ''}
                    </div>
                    <button onClick={copyReferral} className={`px-2.5 py-1.5 rounded-lg text-xs transition ${copiedRef ? 'bg-green-600 text-white' : 'bg-fuchsia-600 text-white'}`}>
                      {copiedRef ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== MINI GAMES TAB ===== */}
          {activeTab === 'mini' && (
            <div className="space-y-4">
              {/* Active game modal */}
              <AnimatePresence>
                {activeGame && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setActiveGame(null) }}>
                    <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50 }}
                      className="bg-[#1a0a2e] border border-fuchsia-500/30 rounded-2xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <span className="text-2xl">{games.find(g => g.slug === activeGame)?.icon}</span>
                          {games.find(g => g.slug === activeGame)?.title}
                        </h3>
                        <button onClick={() => { setActiveGame(null); setResultMessage(null) }} className="p-2 hover:bg-fuchsia-900/50 rounded-full"><X className="w-5 h-5 text-fuchsia-400" /></button>
                      </div>
                      {renderMiniGame(activeGame)}
                      {resultMessage && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/40 rounded-xl text-center text-green-300 font-medium text-sm">
                          {resultMessage}
                        </motion.div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mini game cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {games.map((game, i) => (
                  <motion.div key={game.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="bg-gradient-to-b from-[#1a0a2e] to-[#120822] border border-fuchsia-500/20 rounded-2xl p-4 hover:border-fuchsia-400/50 transition-all group cursor-pointer"
                    onClick={() => {
                      if (!session?.user) { router.push(`/${lang}/giris`); return }
                      setActiveGame(game.slug); setResultMessage(null)
                      if (game.slug === 'tarot-sec') resetTarot()
                      if (game.slug === 'memory') initMemory()
                      if (game.slug === 'quiz') initQuiz()
                      if (game.slug === 'sans-kutusu') resetLuckyBox()
                      if (game.slug === 'sayi-tahmin') initGuess()
                      if (game.slug === 'lamba-cini') initLambaCini()
                    }}>
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{game.icon}</div>
                    <h3 className="text-white font-bold text-xs mb-1">{game.title}</h3>
                    <p className="text-fuchsia-300/60 text-[10px] mb-2 line-clamp-2">{game.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-yellow-400/80">{game.minReward}-{game.maxReward} 💰</span>
                      <span className="px-2.5 py-1 bg-fuchsia-600/80 text-white text-[10px] rounded-full font-medium">Oyna</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Multiplayer games link */}
              <div className="space-y-2">
                <h3 className="text-white font-bold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-cyan-400" /> Çok Oyunculu Oyunlar</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {Object.entries(GAME_INFO).map(([gt, info]) => (
                    <Link key={gt} href={`/${lang}/oyunlar/${info.slug}`}>
                      <div className={`bg-gradient-to-br ${info.color} rounded-xl p-3 text-center border hover:scale-[1.03] transition-all`}>
                        <span className="text-2xl block mb-1">{info.emoji}</span>
                        <p className="text-white font-bold text-[10px]">{info.name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== TOURNAMENTS TAB ===== */}
          {activeTab === 'tournaments' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <Medal className="w-5 h-5 text-amber-400" />
                  Turnuvalar
                </h2>
              </div>

              {tournaments.length === 0 ? (
                <div className="text-center py-12">
                  <Medal className="w-12 h-12 mx-auto mb-3 text-fuchsia-500/30" />
                  <p className="text-fuchsia-300/60 text-sm font-medium">Şu an aktif turnuva yok</p>
                  <p className="text-fuchsia-300/40 text-xs mt-1">Yeni turnuvalar yakında başlayacak</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tournaments.map((tournament, ti) => {
                    const isActive = tournament.status === 'active'
                    const isUpcoming = tournament.status === 'upcoming'
                    const endTime = new Date(tournament.endTime)
                    const startTime = new Date(tournament.startTime)
                    const now = new Date()
                    const hoursLeft = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60 * 60)))
                    const minsLeft = Math.max(0, Math.floor(((endTime.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60)))
                    const hoursUntil = Math.max(0, Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60 * 60)))

                    const typeColors: Record<string, string> = {
                      daily: 'from-amber-900/40 to-yellow-900/40 border-amber-500/40',
                      weekly: 'from-cyan-900/40 to-blue-900/40 border-cyan-500/40',
                      special: 'from-fuchsia-900/40 to-purple-900/40 border-fuchsia-500/40',
                    }
                    const typeLabels: Record<string, string> = {
                      daily: '📅 Günlük', weekly: '📆 Haftalık', special: '⚡ Özel',
                    }

                    return (
                      <motion.div
                        key={tournament.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: ti * 0.1 }}
                        className={`relative bg-gradient-to-r ${typeColors[tournament.type] || typeColors.daily} border rounded-2xl overflow-hidden`}
                      >
                        {/* Status badge */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          {isActive && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-green-600/90 text-white text-[10px] font-bold rounded-full">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                              AKTİF
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-600/90 text-white text-[10px] font-bold rounded-full">
                              <Timer className="w-3 h-3" />
                              YAKINDA
                            </span>
                          )}
                        </div>

                        <div className="p-5">
                          {/* Tournament header */}
                          <div className="flex items-start gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center text-2xl border border-amber-500/30">
                              {tournament.type === 'daily' ? '🏆' : tournament.type === 'weekly' ? '⚔️' : '🌟'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-white font-bold text-base">{tournament.name}</h3>
                                <span className="text-[10px] px-2 py-0.5 bg-purple-900/40 text-fuchsia-300/70 rounded-full">{typeLabels[tournament.type]}</span>
                              </div>
                              <p className="text-fuchsia-300/60 text-xs mt-0.5">{tournament.description}</p>
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center p-2.5 bg-black/20 rounded-xl">
                              <p className="text-amber-400 font-bold text-lg">{tournament.prizePool}</p>
                              <p className="text-fuchsia-300/50 text-[10px]">🏅 Ödül {tournament.currency}</p>
                            </div>
                            <div className="text-center p-2.5 bg-black/20 rounded-xl">
                              <p className="text-cyan-400 font-bold text-lg">{tournament.totalParticipants}</p>
                              <p className="text-fuchsia-300/50 text-[10px]">👥 Katılımcı</p>
                            </div>
                            <div className="text-center p-2.5 bg-black/20 rounded-xl">
                              <p className="text-fuchsia-400 font-bold text-lg">{tournament.totalGames}</p>
                              <p className="text-fuchsia-300/50 text-[10px]">🎮 Oynanan</p>
                            </div>
                          </div>

                          {/* Timer */}
                          {isActive && (
                            <div className="flex items-center justify-center gap-2 mb-4 py-2 bg-black/20 rounded-xl">
                              <Clock className="w-4 h-4 text-amber-400" />
                              <span className="text-amber-300 text-sm font-bold">
                                {hoursLeft > 0 ? `${hoursLeft} saat ${minsLeft} dk kaldı` : `${minsLeft} dk kaldı`}
                              </span>
                            </div>
                          )}
                          {isUpcoming && (
                            <div className="flex items-center justify-center gap-2 mb-4 py-2 bg-black/20 rounded-xl">
                              <Timer className="w-4 h-4 text-cyan-400" />
                              <span className="text-cyan-300 text-sm font-medium">
                                {hoursUntil > 0 ? `${hoursUntil} saat sonra başlıyor` : 'Çok yakında başlıyor!'}
                              </span>
                            </div>
                          )}

                          {/* Game breakdown (for active tournaments) */}
                          {isActive && tournament.games.length > 0 && (
                            <div className="space-y-2 mb-4">
                              <p className="text-fuchsia-300/70 text-[10px] font-bold uppercase tracking-wider">Oyun Bazlı Sıralama</p>
                              {tournament.games.map((g) => {
                                const gInfo = gameInfo(g.gameType)
                                return (
                                  <div key={g.gameType} className="flex items-center gap-2 p-2 bg-black/15 rounded-lg">
                                    <span className="text-lg">{gInfo.emoji}</span>
                                    <span className="text-white text-xs font-medium flex-1">{gInfo.name}</span>
                                    <span className="text-fuchsia-300/50 text-[10px]">{g.completedGames} oyun</span>
                                    {g.topWinner && (
                                      <span className="text-amber-400 text-[10px] font-bold flex items-center gap-0.5">
                                        👑 {g.topWinner} ({g.topWinnerWins})
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Action button */}
                          <button
                            onClick={() => {
                              if (!session?.user) { router.push(`/${lang}/giris`); return }
                              if (isActive) setActiveTab('lobby')
                            }}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:scale-[1.01] shadow-lg shadow-amber-500/20'
                                : 'bg-purple-900/40 text-fuchsia-300/60 border border-fuchsia-500/20'
                            }`}
                            disabled={isUpcoming}
                          >
                            {isActive ? '🎮 Turnuvaya Katıl — Oyna!' : '⏳ Henüz Başlamadı'}
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== SPECTATOR TAB ===== */}
          {activeTab === 'spectator' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-cyan-400" />
                  Canlı Oyunları İzle
                </h2>
                <div className="flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                  <span className="text-red-400 text-[10px] font-bold">{spectatorGames.length} CANLI</span>
                </div>
              </div>

              {spectatorGames.length === 0 ? (
                <div className="text-center py-12">
                  <Eye className="w-12 h-12 mx-auto mb-3 text-fuchsia-500/30" />
                  <p className="text-fuchsia-300/60 text-sm font-medium">Şu an izlenecek canlı oyun yok</p>
                  <p className="text-fuchsia-300/40 text-xs mt-1">Oyunlar başladığında burada görünecek</p>
                  <button onClick={() => setActiveTab('lobby')} className="mt-4 px-4 py-2 bg-fuchsia-600/80 text-white text-xs rounded-full font-medium hover:bg-fuchsia-500 transition">
                    Lobiye Dön
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {spectatorGames.map((game, i) => {
                    const info = gameInfo(game.gameType)
                    const elapsed = game.startedAt ? Math.floor((Date.now() - new Date(game.startedAt).getTime()) / 60000) : 0
                    return (
                      <motion.div
                        key={game.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link href={`/${lang}/oyunlar/${info.slug}?watch=${game.id}`}>
                          <div className="relative bg-gradient-to-br from-[#1a0a2e] via-[#1f0d35] to-[#1a0a2e] border border-cyan-500/30 rounded-xl p-4 hover:border-cyan-400/60 transition-all group cursor-pointer overflow-hidden">
                            {/* Live badge */}
                            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-red-600/90 rounded-full">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                              <span className="text-white text-[9px] font-bold">CANLI</span>
                            </div>

                            {/* Viewer count */}
                            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/40 rounded-full">
                              <Eye className="w-3 h-3 text-cyan-400" />
                              <span className="text-cyan-300 text-[10px] font-bold">{game.viewerCount}</span>
                            </div>

                            {/* Game icon & info */}
                            <div className="text-center mt-6 mb-3">
                              <span className="text-4xl block mb-2 group-hover:scale-110 transition-transform">{info.emoji}</span>
                              <p className="text-white font-bold text-sm">{info.name}</p>
                            </div>

                            {/* Players vs */}
                            <div className="flex items-center justify-center gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-700 flex items-center justify-center text-white text-xs font-bold">
                                  {game.player1Name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="text-right">
                                  <p className="text-white text-xs font-medium truncate max-w-[70px]">{game.player1Name}</p>
                                  <p className="text-amber-400 text-sm font-bold">{game.player1Score}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-center">
                                <Swords className="w-4 h-4 text-fuchsia-400 mb-0.5" />
                                <span className="text-fuchsia-300/40 text-[9px]">VS</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-left">
                                  <p className="text-white text-xs font-medium truncate max-w-[70px]">{game.player2Name}</p>
                                  <p className="text-amber-400 text-sm font-bold">{game.player2Score}</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                                  {game.player2Name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              </div>
                            </div>

                            {/* Footer info */}
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-fuchsia-300/50 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {elapsed} dk
                              </span>
                              <CostBadge betAmount={game.betAmount} betCurrency={game.betCurrency} />
                              <span className="text-cyan-400 font-bold group-hover:text-cyan-300 flex items-center gap-0.5">
                                <Eye className="w-3 h-3" /> İzle
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== QUESTS TAB ===== */}
          {activeTab === 'quests' && (
            <div className="space-y-4">
              {/* Header with streak */}
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <Target className="w-5 h-5 text-fuchsia-400" />
                  Günlük Görevler
                </h2>
                {dailyReward && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-900/30 border border-amber-500/30 rounded-full">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300 text-[10px] font-bold">{dailyReward.currentStreak} Gün Seri</span>
                  </div>
                )}
              </div>

              {/* Quest progress summary */}
              {quests.length > 0 && (
                <div className="bg-gradient-to-r from-fuchsia-900/30 to-purple-900/30 border border-fuchsia-500/20 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-fuchsia-300/70 text-xs">Günlük İlerleme</span>
                    <span className="text-fuchsia-300 text-xs font-bold">
                      {quests.filter(q => q.completed).length}/{quests.length} Tamamlandı
                    </span>
                  </div>
                  <div className="w-full bg-purple-900/50 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-500 transition-all duration-500"
                      style={{ width: `${(quests.filter(q => q.completed).length / Math.max(1, quests.length)) * 100}%` }}
                    />
                  </div>
                  {quests.every(q => q.completed) && (
                    <p className="text-center text-amber-300 text-[10px] font-bold mt-2">🎉 Tüm görevler tamamlandı! Harika!</p>
                  )}
                </div>
              )}

              {/* Quest cards */}
              {quests.map((quest, i) => {
                const pct = Math.min(100, (quest.progress / quest.target) * 100)
                return (
                  <motion.div
                    key={quest.type}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative bg-gradient-to-r from-[#1a0a2e] to-[#1f0d35] border rounded-xl p-4 ${
                      quest.claimed ? 'border-green-500/30 opacity-70' :
                      quest.completed ? 'border-amber-500/40 shadow-lg shadow-amber-500/10' :
                      'border-fuchsia-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Progress ring */}
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(168,85,247,0.15)" strokeWidth="2.5" />
                          <circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke={quest.claimed ? '#22c55e' : quest.completed ? '#f59e0b' : '#a855f7'}
                            strokeWidth="2.5"
                            strokeDasharray={`${pct}, 100`}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg">
                          {quest.claimed ? '✅' : quest.icon}
                        </span>
                      </div>

                      {/* Quest info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">{quest.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-purple-900/50 rounded-full h-2 max-w-[140px]">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                quest.claimed ? 'bg-green-500' : quest.completed ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-fuchsia-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-fuchsia-300/60 text-[10px] font-medium">{quest.progress}/{quest.target}</span>
                        </div>
                      </div>

                      {/* Reward & action */}
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 rounded-full">
                          <Coins className="w-3 h-3 text-yellow-400" />
                          <span className="text-yellow-400 text-[10px] font-bold">+{quest.reward}</span>
                        </div>
                        {quest.completed && !quest.claimed ? (
                          <button
                            onClick={() => claimQuest(quest.type)}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[10px] font-bold rounded-full hover:scale-105 transition shadow-lg shadow-amber-500/20 animate-pulse"
                          >
                            🎁 Topla!
                          </button>
                        ) : quest.claimed ? (
                          <span className="text-green-400 text-[10px] font-medium flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Alındı
                          </span>
                        ) : (
                          <Lock className="w-4 h-4 text-fuchsia-400/30" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {/* Bonus: Daily reward reminder */}
              {session?.user && dailyReward && !dailyReward.claimed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border border-amber-500/40 rounded-xl p-4 text-center"
                >
                  <Calendar className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-amber-300 font-bold text-sm">Günlük Ödülünü Almadın!</p>
                  <p className="text-amber-200/60 text-xs mt-1">Seri: {dailyReward.currentStreak} gün • Bugün: {dailyReward.nextReward} CFC</p>
                  <button onClick={claimDailyReward} className="mt-3 px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-full text-xs hover:scale-105 transition">
                    🎁 Günlük Ödülü Topla
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* ===== LEADERBOARD TAB ===== */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Liderlik Tablosu
                </h2>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Period filter */}
                <div className="flex gap-1">
                  {([
                    { key: 'all' as const, label: 'Tüm Zamanlar' },
                    { key: 'weekly' as const, label: 'Haftalık' },
                    { key: 'monthly' as const, label: 'Aylık' },
                  ]).map(p => (
                    <button
                      key={p.key}
                      onClick={() => setLbPeriod(p.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition ${
                        lbPeriod === p.key
                          ? 'bg-fuchsia-600 text-white'
                          : 'bg-purple-900/40 text-fuchsia-300/60 hover:bg-purple-800/50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Game type filter */}
                <div className="flex gap-1 overflow-x-auto">
                  <button
                    onClick={() => setLbGameType('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition whitespace-nowrap ${
                      lbGameType === 'all' ? 'bg-amber-600 text-white' : 'bg-purple-900/40 text-fuchsia-300/60 hover:bg-purple-800/50'
                    }`}
                  >
                    Tümü
                  </button>
                  {Object.entries(GAME_INFO).slice(0, 6).map(([gt, info]) => (
                    <button
                      key={gt}
                      onClick={() => setLbGameType(gt)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition whitespace-nowrap ${
                        lbGameType === gt ? 'bg-amber-600 text-white' : 'bg-purple-900/40 text-fuchsia-300/60 hover:bg-purple-800/50'
                      }`}
                    >
                      {info.emoji}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fuchsia-400/50" />
                  <input
                    type="text"
                    value={lbSearch}
                    onChange={(e) => setLbSearch(e.target.value)}
                    placeholder="Oyuncu ara..."
                    className="w-full pl-8 pr-3 py-1.5 bg-purple-900/40 border border-fuchsia-500/20 rounded-lg text-xs text-white placeholder-fuchsia-300/40 focus:outline-none focus:border-fuchsia-400/50"
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchLeaderboard() }}
                  />
                </div>
              </div>

              {/* Top 3 Podium */}
              {leaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-3 py-4">
                  {/* 2nd place */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-lg font-bold border-2 border-gray-300 overflow-hidden">
                        {leaderboard[1]?.image ? (
                          <img src={leaderboard[1].image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          leaderboard[1]?.name?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-lg">🥈</span>
                    </div>
                    <p className="text-white text-[10px] font-bold mt-2 truncate max-w-[70px]">{leaderboard[1]?.username || leaderboard[1]?.name}</p>
                    <p className="text-yellow-400 text-[10px] font-bold">{leaderboard[1]?.totalJetons} 💰</p>
                    <div className="w-16 h-16 bg-gradient-to-b from-gray-400/30 to-gray-600/30 rounded-t-lg border-x border-t border-gray-400/40 mt-1" />
                  </motion.div>

                  {/* 1st place */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                    className="flex flex-col items-center -mt-4">
                    <div className="relative">
                      <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white text-xl font-bold border-3 border-yellow-300 overflow-hidden shadow-lg shadow-yellow-500/30">
                        {leaderboard[0]?.image ? (
                          <img src={leaderboard[0].image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          leaderboard[0]?.name?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xl">👑</span>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-lg">🥇</span>
                    </div>
                    <p className="text-amber-300 text-xs font-bold mt-2 truncate max-w-[80px]">{leaderboard[0]?.username || leaderboard[0]?.name}</p>
                    <p className="text-yellow-400 text-xs font-bold">{leaderboard[0]?.totalJetons} 💰</p>
                    <div className="w-20 h-24 bg-gradient-to-b from-yellow-500/30 to-amber-600/30 rounded-t-lg border-x border-t border-yellow-500/40 mt-1" />
                  </motion.div>

                  {/* 3rd place */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-white text-lg font-bold border-2 border-amber-500 overflow-hidden">
                        {leaderboard[2]?.image ? (
                          <img src={leaderboard[2].image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          leaderboard[2]?.name?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-lg">🥉</span>
                    </div>
                    <p className="text-white text-[10px] font-bold mt-2 truncate max-w-[70px]">{leaderboard[2]?.username || leaderboard[2]?.name}</p>
                    <p className="text-yellow-400 text-[10px] font-bold">{leaderboard[2]?.totalJetons} 💰</p>
                    <div className="w-16 h-12 bg-gradient-to-b from-amber-600/30 to-orange-700/30 rounded-t-lg border-x border-t border-amber-600/40 mt-1" />
                  </motion.div>
                </div>
              )}

              {/* Full list */}
              {leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-10 h-10 mx-auto mb-3 text-fuchsia-500/30" />
                  <p className="text-fuchsia-300/60 text-sm">Henüz liderlik tablosu oluşmadı</p>
                  {lbSearch && <p className="text-fuchsia-300/40 text-xs mt-1">Arama sonucu bulunamadı</p>}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {leaderboard.map((entry, i) => {
                    const isMe = lbCurrentUserId === entry.userId
                    return (
                      <motion.div
                        key={entry.userId}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          isMe ? 'bg-gradient-to-r from-fuchsia-900/40 to-purple-900/40 border-fuchsia-400/50 ring-1 ring-fuchsia-400/30' :
                          i === 0 ? 'bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border-yellow-500/40' :
                          i === 1 ? 'bg-gradient-to-r from-gray-700/20 to-gray-600/20 border-gray-400/30' :
                          i === 2 ? 'bg-gradient-to-r from-amber-800/20 to-orange-900/20 border-amber-600/30' :
                          'bg-[#1a0a2e]/50 border-fuchsia-500/10 hover:border-fuchsia-500/20'
                        }`}
                      >
                        {/* Rank badge */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          i === 0 ? 'bg-yellow-500 text-black' :
                          i === 1 ? 'bg-gray-400 text-black' :
                          i === 2 ? 'bg-amber-600 text-white' :
                          'bg-purple-900/50 text-fuchsia-300'
                        }`}>
                          {i < 3 ? ['🥇', '🥈', '🥉'][i] : entry.rank}
                        </div>

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden border border-fuchsia-500/30">
                          {entry.image ? (
                            <img src={entry.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            entry.name?.charAt(0)?.toUpperCase() || '?'
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`font-bold text-xs truncate ${isMe ? 'text-fuchsia-300' : 'text-white'}`}>
                              {entry.username || entry.name}
                            </p>
                            {isMe && <span className="text-[9px] bg-fuchsia-600/60 px-1.5 py-0.5 rounded-full text-white">Sen</span>}
                          </div>
                          <p className="text-fuchsia-300/50 text-[10px]">
                            Lv.{entry.level} • {entry.levelTitle}
                            {lbPeriod !== 'all' && entry.periodWins > 0 ? ` • ${entry.periodWins} galibiyet` : ''}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-yellow-400 font-bold text-xs">{entry.totalJetons.toLocaleString()} 💰</p>
                          <p className="text-fuchsia-300/40 text-[10px]">{entry.totalGames} oyun</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Join Table Confirmation Dialog */}
      <AnimatePresence>
        {joinConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setJoinConfirm(null) }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              className="bg-[#1a0a2e] border border-fuchsia-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-fuchsia-500/10"
            >
              {/* Header */}
              <div className="text-center mb-5">
                <span className="text-4xl block mb-2">{gameInfo(joinConfirm.gameType).emoji}</span>
                <h3 className="text-white font-bold text-lg">{gameInfo(joinConfirm.gameType).name}</h3>
                <p className="text-fuchsia-300/60 text-sm mt-1">
                  <span className="text-white font-medium">{joinConfirm.playerName}</span> masasına oturmak istiyor musunuz?
                </p>
              </div>

              {/* Cost info */}
              <div className="rounded-xl p-4 mb-5" style={{ background: 'linear-gradient(135deg, rgba(120, 20, 120, 0.15), rgba(40, 10, 60, 0.3))' }}>
                <p className="text-fuchsia-300/80 text-xs text-center mb-2">Masa Ücreti</p>
                <div className="flex justify-center">
                  {(!joinConfirm.betAmount || joinConfirm.betAmount === 0 || joinConfirm.betCurrency === 'FREE') ? (
                    <div className="text-center">
                      <span className="text-3xl block mb-1">🆓</span>
                      <span className="text-green-400 font-bold text-lg">Ücretsiz</span>
                      <p className="text-green-300/60 text-[11px] mt-1">Bu masa ücretsiz, bakiye kesilmez</p>
                    </div>
                  ) : joinConfirm.betCurrency === 'CFC' ? (
                    <div className="text-center">
                      <span className="text-3xl block mb-1">💰</span>
                      <span className="text-yellow-400 font-bold text-lg">{joinConfirm.betAmount} CFC</span>
                      <p className="text-yellow-300/60 text-[11px] mt-1">CFC bakiyenizden düşülecektir</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="text-3xl block mb-1">🎫</span>
                      <span className="text-blue-400 font-bold text-lg">{joinConfirm.betAmount} Jeton</span>
                      <p className="text-blue-300/60 text-[11px] mt-1">Jeton bakiyenizden düşülecektir</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setJoinConfirm(null)}
                  className="px-4 py-3 rounded-xl bg-purple-900/40 border border-fuchsia-500/20 text-fuchsia-300 font-bold text-sm hover:bg-purple-800/50 transition-all"
                >
                  ❌ Vazgeç
                </button>
                <button
                  onClick={confirmJoinTable}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-sm hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/20"
                >
                  ✅ Masaya Otur
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Find Table Modal (Masaya Otur) */}
      <AnimatePresence>
        <FindTableModal
          isOpen={showFindTableModal}
          onClose={() => setShowFindTableModal(false)}
          tables={liveTables}
          lang={lang}
          userId={session?.user?.id}
          onJoinTable={directJoinTable}
        />
      </AnimatePresence>

      {/* Open Table Picker Modal (Masa Aç) */}
      <AnimatePresence>
        {showOpenTablePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowOpenTablePicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="w-full max-w-md bg-gradient-to-br from-[#1a0a2e] via-[#2d1252] to-[#1a0a2e] border border-fuchsia-500/30 rounded-2xl p-5 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold bg-gradient-to-r from-fuchsia-400 to-amber-300 bg-clip-text text-transparent flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-fuchsia-400" />
                  Masa Aç
                </h3>
                <button onClick={() => setShowOpenTablePicker(false)} className="text-fuchsia-300/60 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-fuchsia-300/60 text-xs mb-4">Oynamak istediğin oyunu seç, masa hemen açılsın!</p>
              <div className="grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(GAME_INFO).map(([gt, info]) => (
                  <button
                    key={gt}
                    disabled={matchLoading}
                    onClick={() => {
                      setShowOpenTablePicker(false)
                      handleOpenTable(gt)
                    }}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-purple-900/40 border border-fuchsia-500/10 hover:bg-fuchsia-600/30 hover:border-fuchsia-400/40 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    <span className="text-2xl leading-none">{info.emoji}</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-fuchsia-300/80 leading-tight mt-1 text-center">{info.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-20" />
    </div>
  )
}