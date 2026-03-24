'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Gamepad2, Trophy, Gift, Star, Zap, Target, ArrowLeft,
  Coins, Crown, ChevronRight, Check, Lock, X, Sparkles,
  RotateCcw, Copy, Share2, Users, Calendar, Flame, Award
} from 'lucide-react'

// ========== TYPES ==========
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
}

interface GameProfile {
  totalJetons: number
  totalGames: number
  level: number
  levelTitle: string
  cfcBalance: number
  userReferralCode: string | null
}

interface DailyRewardStatus {
  claimed: boolean
  currentStreak: number
  nextReward: number
  todayReward: number
}

// ========== QUIZ DATA ==========
const QUIZ_QUESTIONS = [
  { q: 'Hangi burç ateş elementidir?', options: ['Koç', 'Boğa', 'İkizler', 'Yengeç'], answer: 0 },
  { q: 'Venüs hangi burcun yönetici gezegenidir?', options: ['Koç', 'Boğa', 'İkizler', 'Yay'], answer: 1 },
  { q: 'Zodyak\'ta kaç burç vardır?', options: ['10', '11', '12', '13'], answer: 2 },
  { q: 'Hangi burç su elementidir?', options: ['Aslan', 'Başak', 'Akrep', 'Oğlak'], answer: 2 },
  { q: 'Merkür hangi burcun yönetici gezegenidir?', options: ['İkizler', 'Aslan', 'Terazi', 'Kova'], answer: 0 },
  { q: 'Tarot destesinde kaç kart vardır?', options: ['52', '72', '78', '82'], answer: 2 },
  { q: 'Kahve falında fincan nasıl çevrilir?', options: ['Sola', 'Sağa', 'Kendine doğru', 'Saat yönünde'], answer: 2 },
  { q: 'Hangi gezegen şans getirir?', options: ['Mars', 'Jüpiter', 'Satürn', 'Uranüs'], answer: 1 },
  { q: 'Ay hangi burcun yöneticisidir?', options: ['Yengeç', 'Balık', 'Akrep', 'Boğa'], answer: 0 },
  { q: 'Hangi burç hava elementidir?', options: ['Koç', 'Terazi', 'Balık', 'Oğlak'], answer: 1 },
]

// ========== MEMORY CARDS ==========
const MEMORY_SYMBOLS = ['☕', '🔮', '⭐', '🌙', '🎴', '🕯️', '💎', '🪬']

// ========== MAIN COMPONENT ==========
export default function GameCenterPage() {
  const { data: session } = useSession() || {}
  const { language } = useLanguage()
  const router = useRouter()
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'

  // Core state
  const [games, setGames] = useState<MiniGame[]>([])
  const [profile, setProfile] = useState<GameProfile | null>(null)
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [rewardAnimation, setRewardAnimation] = useState<number | null>(null)

  // Gamification state
  const [quests, setQuests] = useState<Quest[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [dailyReward, setDailyReward] = useState<DailyRewardStatus | null>(null)
  const [activeTab, setActiveTab] = useState<'games' | 'quests' | 'leaderboard'>('games')

  // Game-specific state
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinDegree, setSpinDegree] = useState(0)
  const [tarotCards, setTarotCards] = useState<number[]>([0, 1, 2, 3, 4])
  const [selectedTarot, setSelectedTarot] = useState<number | null>(null)
  const [tarotRevealed, setTarotRevealed] = useState(false)
  const [memoryCards, setMemoryCards] = useState<{id: number, symbol: string, flipped: boolean, matched: boolean}[]>([])
  const [memoryFirst, setMemoryFirst] = useState<number | null>(null)
  const [memoryMoves, setMemoryMoves] = useState(0)
  const [memoryComplete, setMemoryComplete] = useState(false)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [quizSelected, setQuizSelected] = useState<number | null>(null)
  const [luckyBoxOpening, setLuckyBoxOpening] = useState(false)
  const [luckyBoxOpened, setLuckyBoxOpened] = useState(false)
  const [guessNumber, setGuessNumber] = useState('')
  const [guessTarget, setGuessTarget] = useState<number | null>(null)
  const [guessAttempts, setGuessAttempts] = useState(0)
  const [guessHint, setGuessHint] = useState('')
  const [guessWon, setGuessWon] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)

  // ========== LAMBA CİNİ STATES ==========
  const [lambaPhase, setLambaPhase] = useState<'idle' | 'rubbing' | 'smoke' | 'genie' | 'chests' | 'reveal'>('idle')
  const [lambaReward, setLambaReward] = useState<{ type: string; amount: number; label: string; emoji: string } | null>(null)
  const [lambaChestPicked, setLambaChestPicked] = useState<number | null>(null)
  const [lambaPlaysRemaining, setLambaPlaysRemaining] = useState<number>(3)
  const [lambaPlaysUsed, setLambaPlaysUsed] = useState<number>(0)
  const [lambaDailyLimit, setLambaDailyLimit] = useState<number>(3)
  const [lambaLoading, setLambaLoading] = useState(false)
  const [lambaGenieMsg, setLambaGenieMsg] = useState('')

  // ========== DATA FETCHING ==========
  const fetchAll = useCallback(async () => {
    try {
      const [gamesRes, profileRes, questsRes, lbRes, drRes] = await Promise.all([
        fetch('/api/games'),
        session?.user ? fetch('/api/games/profil') : null,
        session?.user ? fetch('/api/games/quests') : null,
        fetch('/api/games/siralama'),
        session?.user ? fetch('/api/games/daily-reward') : null,
      ])

      if (gamesRes.ok) setGames(await gamesRes.json())
      if (profileRes?.ok) setProfile(await profileRes.json())
      if (questsRes?.ok) setQuests(await questsRes.json())
      if (lbRes.ok) setLeaderboard(await lbRes.json())
      if (drRes?.ok) setDailyReward(await drRes.json())
    } catch (e) {
      console.error('Game center data fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [session?.user])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ========== HELPER: Record play & update balance ==========
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

  // ========== DAILY REWARD ==========
  const claimDailyReward = async () => {
    try {
      const res = await fetch('/api/games/daily-reward', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setDailyReward({ claimed: true, currentStreak: data.streak, nextReward: 0, todayReward: data.reward })
        setProfile(prev => prev ? { ...prev, cfcBalance: data.newBalance } : prev)
        setRewardAnimation(data.reward)
        setTimeout(() => setRewardAnimation(null), 2500)
        // Refresh quests
        const qRes = await fetch('/api/games/quests')
        if (qRes.ok) setQuests(await qRes.json())
      }
    } catch (e) { console.error('Claim daily reward error:', e) }
  }

  // ========== QUEST CLAIM ==========
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
        // Refresh quests
        const qRes = await fetch('/api/games/quests')
        if (qRes.ok) setQuests(await qRes.json())
      }
    } catch (e) { console.error('Claim quest error:', e) }
  }

  // ========== GAME: FAL ÇARKI ==========
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

  // ========== GAME: TAROT ==========
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

  // ========== GAME: MEMORY ==========
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
        // Check win
        if (newCards.every(c => c.matched)) {
          setMemoryComplete(true)
          recordPlay('memory', memoryMoves + 1).then(result => {
            if (result) setResultMessage(`☕ Tebrikler! ${result.reward} CFC kazandınız!`)
          })
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

  // ========== GAME: QUIZ ==========
  const initQuiz = () => {
    setQuizIndex(0)
    setQuizScore(0)
    setQuizFinished(false)
    setQuizSelected(null)
    setResultMessage(null)
  }

  const answerQuiz = async (optionIndex: number) => {
    if (quizSelected !== null) return
    setQuizSelected(optionIndex)
    const correct = optionIndex === QUIZ_QUESTIONS[quizIndex].answer
    if (correct) setQuizScore(prev => prev + 1)

    setTimeout(() => {
      if (quizIndex + 1 < 5) {
        setQuizIndex(prev => prev + 1)
        setQuizSelected(null)
      } else {
        setQuizFinished(true)
        const finalScore = quizScore + (correct ? 1 : 0)
        recordPlay('quiz', finalScore).then(result => {
          if (result) setResultMessage(`⭐ Quiz bitti! ${finalScore}/5 doğru - ${result.reward} CFC!`)
        })
      }
    }, 1000)
  }

  // ========== GAME: ŞANS KUTUSU ==========
  const playLuckyBox = async () => {
    if (luckyBoxOpened || !session?.user) return
    setLuckyBoxOpening(true)
    setTimeout(async () => {
      setLuckyBoxOpened(true)
      setLuckyBoxOpening(false)
      const result = await recordPlay('sans-kutusu')
      if (result) setResultMessage(`🎁 Kutuda ${result.reward} CFC vardı!`)
    }, 1500)
  }

  const resetLuckyBox = () => {
    setLuckyBoxOpened(false)
    setLuckyBoxOpening(false)
    setResultMessage(null)
  }

  // ========== GAME: SAYI TAHMİN ==========
  const initGuess = () => {
    setGuessTarget(Math.floor(Math.random() * 100) + 1)
    setGuessAttempts(0)
    setGuessHint('1-100 arasında bir sayı tahmin edin')
    setGuessWon(false)
    setGuessNumber('')
    setResultMessage(null)
  }

  useEffect(() => { initGuess() }, [])

  const submitGuess = async () => {
    if (!guessTarget || guessWon) return
    const num = parseInt(guessNumber)
    if (isNaN(num) || num < 1 || num > 100) return

    const newAttempts = guessAttempts + 1
    setGuessAttempts(newAttempts)

    if (num === guessTarget) {
      setGuessWon(true)
      setGuessHint(`🎯 Tebrikler! ${newAttempts} denemede buldunuz!`)
      const result = await recordPlay('sayi-tahmin', newAttempts)
      if (result) setResultMessage(`🔢 ${result.reward} CFC kazandınız!`)
    } else if (num < guessTarget) {
      setGuessHint(`⬆️ Daha yüksek! (${newAttempts}. deneme)`)
    } else {
      setGuessHint(`⬇️ Daha düşük! (${newAttempts}. deneme)`)
    }
    setGuessNumber('')
  }

  // ========== REFERRAL COPY ==========
  const copyReferral = () => {
    const code = profile?.userReferralCode || ''
    const link = `${window.location.origin}/kayit-ol?ref=${code}`
    navigator.clipboard.writeText(link)
    setCopiedRef(true)
    setTimeout(() => setCopiedRef(false), 2000)
  }

  // ========== LAMBA CİNİ GAME ==========
  const GENIE_MESSAGES = [
    'Hoş geldin yolcu! Kaderini görmek ister misin? 🌟',
    'Bir sandık seç ve kaderini öğren! ✨',
    'Cesur ol! Bir hazine seni bekliyor... 💎',
    'Ben Cin-i Lamba! Sana bir sürprizim var! 🧞',
    'Üç sandıktan biri senin şansını değiştirecek! 🎁',
  ]

  const fetchLambaStatus = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/games/lamba-cini')
      if (res.ok) {
        const data = await res.json()
        setLambaPlaysRemaining(data.playsRemaining)
        setLambaPlaysUsed(data.playsUsed)
        setLambaDailyLimit(data.dailyLimit)
      }
    } catch {}
  }, [session?.user])

  const initLambaCini = () => {
    setLambaPhase('idle')
    setLambaReward(null)
    setLambaChestPicked(null)
    setLambaGenieMsg('')
    setResultMessage(null)
    fetchLambaStatus()
  }

  const rubLamp = () => {
    if (lambaPhase !== 'idle' || !session?.user || lambaPlaysRemaining <= 0) return
    setLambaPhase('rubbing')
    setLambaGenieMsg('')
    setTimeout(() => {
      setLambaPhase('smoke')
      setTimeout(() => {
        setLambaPhase('genie')
        setLambaGenieMsg(GENIE_MESSAGES[Math.floor(Math.random() * GENIE_MESSAGES.length)])
        setTimeout(() => {
          setLambaPhase('chests')
        }, 2000)
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
          if (data.reward.type === 'empty' || (data.reward.type === 'cfc' && data.reward.amount === 0)) {
            setLambaGenieMsg('Bu sefer şansın yaver gitmedi... Tekrar dene! 😔')
          } else if (data.reward.type === 'free_fortune') {
            setLambaGenieMsg('✨ Tebrikler! Ücretsiz bir fal hakkı kazandın! 🔮')
            setResultMessage('🔮 Ücretsiz Fal kazandınız! (+5 CFC)')
          } else {
            setLambaGenieMsg(`🎉 Tebrikler! ${data.reward.amount} CFC kazandın!`)
            setResultMessage(`🎉 ${data.reward.label} kazandınız!`)
          }
          if (data.reward.amount > 0) {
            setRewardAnimation(data.reward.amount)
            setTimeout(() => setRewardAnimation(null), 2500)
          }
        }, 800)
      } else {
        setResultMessage(data.error || 'Bir hata oluştu')
        setLambaPhase('idle')
      }
    } catch {
      setResultMessage('Bağlantı hatası')
      setLambaPhase('idle')
    } finally {
      setLambaLoading(false)
    }
  }

  // ========== LEVEL PROGRESS ==========
  const getLevelProgress = () => {
    if (!profile) return 0
    const thresholds = [0, 100, 500, 2000, 5000]
    const current = profile.totalJetons
    const lvl = profile.level - 1
    const next = thresholds[lvl + 1] || thresholds[lvl] + 1000
    const prev = thresholds[lvl] || 0
    return Math.min(100, ((current - prev) / (next - prev)) * 100)
  }

  // ========== RENDER GAME CONTENT ==========
  const renderGameContent = (slug: string) => {
    switch (slug) {
      case 'fal-carki':
        return (
          <div className="flex flex-col items-center gap-4">
            {/* Wheel */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-3xl">▼</div>
              <div
                className="w-full h-full rounded-full border-4 border-yellow-400 shadow-lg shadow-yellow-500/30"
                style={{
                  background: 'conic-gradient(from 0deg, #9333ea, #f59e0b, #ec4899, #6366f1, #10b981, #ef4444, #8b5cf6, #f59e0b)',
                  transform: `rotate(${spinDegree}deg)`,
                  transition: isSpinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                }}
              >
                {[0, 1, 2, 3, 4, 5, 0, 3].map((val, i) => (
                  <div
                    key={i}
                    className="absolute text-white font-bold text-sm sm:text-base"
                    style={{
                      top: '50%', left: '50%',
                      transform: `rotate(${i * 45 + 22.5}deg) translateY(-${90}px)`,
                      transformOrigin: '0 0',
                    }}
                  >
                    {val}💰
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={playFalCarki}
              disabled={isSpinning || !session?.user}
              className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold rounded-full hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/30"
            >
              {isSpinning ? '🎡 Dönüyor...' : '🎡 Çarkı Çevir'}
            </button>
          </div>
        )

      case 'tarot-sec':
        return (
          <div className="flex flex-col items-center gap-4">
            <p className="text-fuchsia-300 text-sm">Bir kart seçin ve ödülünüzü görün!</p>
            <div className="flex gap-3 flex-wrap justify-center">
              {tarotCards.map((_, i) => (
                <motion.div
                  key={i}
                  whileHover={!tarotRevealed ? { scale: 1.1, y: -10 } : {}}
                  className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl cursor-pointer border-2 flex items-center justify-center text-2xl transition-all duration-500 ${
                    selectedTarot === i
                      ? 'bg-gradient-to-b from-yellow-400 to-amber-600 border-yellow-300 rotate-0'
                      : tarotRevealed
                        ? 'bg-gray-700 border-gray-600 opacity-50'
                        : 'bg-gradient-to-b from-purple-800 to-indigo-900 border-fuchsia-500/50 hover:border-fuchsia-400'
                  }`}
                  onClick={() => playTarot(i)}
                >
                  {selectedTarot === i ? '🌟' : tarotRevealed ? '🃏' : '🔮'}
                </motion.div>
              ))}
            </div>
            {tarotRevealed && (
              <button onClick={resetTarot} className="flex items-center gap-2 px-4 py-2 bg-fuchsia-700 text-white rounded-full hover:bg-fuchsia-600 transition">
                <RotateCcw className="w-4 h-4" /> Tekrar Oyna
              </button>
            )}
          </div>
        )

      case 'memory':
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-4 text-sm text-fuchsia-300">
              <span>Hamle: {memoryMoves}</span>
              <span>Eşleşen: {memoryCards.filter(c => c.matched).length / 2}/{MEMORY_SYMBOLS.slice(0, 6).length}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {memoryCards.map((card, i) => (
                <motion.div
                  key={card.id}
                  whileTap={{ scale: 0.95 }}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-2xl cursor-pointer border-2 transition-all duration-300 ${
                    card.matched
                      ? 'bg-green-800/50 border-green-500/50'
                      : card.flipped
                        ? 'bg-fuchsia-800/50 border-fuchsia-400'
                        : 'bg-purple-900/50 border-fuchsia-500/30 hover:border-fuchsia-400'
                  }`}
                  onClick={() => flipMemoryCard(i)}
                >
                  {(card.flipped || card.matched) ? card.symbol : '❓'}
                </motion.div>
              ))}
            </div>
            {memoryComplete && (
              <button onClick={initMemory} className="flex items-center gap-2 px-4 py-2 bg-fuchsia-700 text-white rounded-full hover:bg-fuchsia-600 transition">
                <RotateCcw className="w-4 h-4" /> Tekrar Oyna
              </button>
            )}
          </div>
        )

      case 'quiz':
        return (
          <div className="flex flex-col items-center gap-4 w-full">
            {!quizFinished ? (
              <>
                <div className="flex items-center gap-2 text-sm text-fuchsia-300">
                  <span>Soru {quizIndex + 1}/5</span>
                  <span>•</span>
                  <span>Doğru: {quizScore}</span>
                </div>
                <p className="text-white font-medium text-center text-sm sm:text-base">{QUIZ_QUESTIONS[quizIndex].q}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {QUIZ_QUESTIONS[quizIndex].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => answerQuiz(i)}
                      disabled={quizSelected !== null}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                        quizSelected === null
                          ? 'bg-purple-900/50 border-fuchsia-500/30 text-white hover:border-fuchsia-400 hover:bg-purple-800/50'
                          : i === QUIZ_QUESTIONS[quizIndex].answer
                            ? 'bg-green-700/50 border-green-400 text-green-200'
                            : quizSelected === i
                              ? 'bg-red-700/50 border-red-400 text-red-200'
                              : 'bg-purple-900/30 border-fuchsia-500/20 text-fuchsia-400/50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-2xl mb-2">⭐</p>
                <p className="text-white font-bold text-lg">Quiz Tamamlandı!</p>
                <p className="text-fuchsia-300">{quizScore}/5 Doğru</p>
                <button onClick={initQuiz} className="mt-3 flex items-center gap-2 px-4 py-2 bg-fuchsia-700 text-white rounded-full hover:bg-fuchsia-600 transition mx-auto">
                  <RotateCcw className="w-4 h-4" /> Tekrar Oyna
                </button>
              </div>
            )}
          </div>
        )

      case 'sans-kutusu':
        return (
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={luckyBoxOpening ? { scale: [1, 1.2, 0.9, 1.1, 1], rotate: [0, -10, 10, -5, 0] } : luckyBoxOpened ? { scale: 1.1 } : {}}
              transition={{ duration: 1.5 }}
              className={`w-32 h-32 sm:w-40 sm:h-40 rounded-2xl flex items-center justify-center text-6xl sm:text-7xl cursor-pointer border-4 ${
                luckyBoxOpened
                  ? 'bg-gradient-to-b from-yellow-500/20 to-amber-600/20 border-yellow-400'
                  : 'bg-gradient-to-b from-purple-900 to-indigo-900 border-fuchsia-500/50 hover:border-fuchsia-400'
              }`}
              onClick={playLuckyBox}
            >
              {luckyBoxOpened ? '🌟' : luckyBoxOpening ? '✨' : '🎁'}
            </motion.div>
            {!luckyBoxOpened && !luckyBoxOpening && (
              <button
                onClick={playLuckyBox}
                disabled={!session?.user}
                className="px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold rounded-full hover:scale-105 transition disabled:opacity-50"
              >
                Kutuyu Aç!
              </button>
            )}
            {luckyBoxOpened && (
              <button onClick={resetLuckyBox} className="flex items-center gap-2 px-4 py-2 bg-fuchsia-700 text-white rounded-full hover:bg-fuchsia-600 transition">
                <RotateCcw className="w-4 h-4" /> Tekrar Oyna
              </button>
            )}
          </div>
        )

      case 'sayi-tahmin':
        return (
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <p className="text-fuchsia-300 text-sm text-center">{guessHint}</p>
            {!guessWon && (
              <div className="flex gap-2 w-full">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={guessNumber}
                  onChange={e => setGuessNumber(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitGuess()}
                  placeholder="1-100"
                  className="flex-1 px-4 py-2 bg-purple-900/50 border border-fuchsia-500/30 rounded-xl text-white text-center focus:outline-none focus:border-fuchsia-400"
                />
                <button
                  onClick={submitGuess}
                  disabled={!session?.user}
                  className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold rounded-xl hover:scale-105 transition disabled:opacity-50"
                >
                  Tahmin!
                </button>
              </div>
            )}
            {guessWon && (
              <button onClick={initGuess} className="flex items-center gap-2 px-4 py-2 bg-fuchsia-700 text-white rounded-full hover:bg-fuchsia-600 transition">
                <RotateCcw className="w-4 h-4" /> Tekrar Oyna
              </button>
            )}
            <p className="text-xs text-fuchsia-400/60">Deneme: {guessAttempts}</p>
          </div>
        )

      case 'lamba-cini':
        return (
          <div className="flex flex-col items-center gap-3 relative overflow-hidden">
            {/* CSS Animations */}
            <style jsx>{`
              @keyframes lampGlow {
                0%, 100% { filter: drop-shadow(0 0 8px #fbbf24) drop-shadow(0 0 20px #f59e0b); }
                50% { filter: drop-shadow(0 0 20px #fbbf24) drop-shadow(0 0 40px #f59e0b) drop-shadow(0 0 60px #d97706); }
              }
              @keyframes lampRub {
                0%, 100% { transform: rotate(0deg) scale(1); }
                10% { transform: rotate(-8deg) scale(1.05); }
                20% { transform: rotate(8deg) scale(1.05); }
                30% { transform: rotate(-6deg) scale(1.03); }
                40% { transform: rotate(6deg) scale(1.03); }
                50% { transform: rotate(-4deg) scale(1.02); }
                60% { transform: rotate(4deg) scale(1.02); }
                70% { transform: rotate(-2deg) scale(1.01); }
                80% { transform: rotate(2deg) scale(1.01); }
                90% { transform: rotate(0deg) scale(1); }
              }
              @keyframes smokeRise {
                0% { opacity: 0; transform: translateY(20px) scale(0.3); }
                30% { opacity: 0.8; }
                70% { opacity: 0.6; transform: translateY(-60px) scale(1.5); }
                100% { opacity: 0; transform: translateY(-120px) scale(2); }
              }
              @keyframes genieAppear {
                0% { opacity: 0; transform: translateY(40px) scale(0.2); }
                50% { opacity: 1; transform: translateY(-10px) scale(1.1); }
                70% { transform: translateY(5px) scale(0.95); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
              }
              @keyframes chestBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
              }
              @keyframes chestOpen {
                0% { transform: scale(1) rotate(0deg); }
                30% { transform: scale(1.2) rotate(-5deg); }
                60% { transform: scale(1.3) rotate(5deg); }
                100% { transform: scale(1.15) rotate(0deg); }
              }
              @keyframes sparkle {
                0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
                50% { opacity: 1; transform: scale(1) rotate(180deg); }
              }
              @keyframes bubbleIn {
                0% { opacity: 0; transform: scale(0.5) translateY(10px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
              }
              @keyframes floatParticle {
                0% { opacity: 1; transform: translateY(0) translateX(0); }
                100% { opacity: 0; transform: translateY(-80px) translateX(var(--tx, 20px)); }
              }
              .lamp-glow { animation: lampGlow 2s ease-in-out infinite; }
              .lamp-rub { animation: lampRub 1.2s ease-in-out; }
              .smoke-particle { animation: smokeRise 1.5s ease-out forwards; }
              .genie-appear { animation: genieAppear 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
              .chest-bounce { animation: chestBounce 1.5s ease-in-out infinite; }
              .chest-open { animation: chestOpen 0.6s ease-out forwards; }
              .sparkle-anim { animation: sparkle 0.8s ease-in-out; }
              .bubble-in { animation: bubbleIn 0.5s ease-out; }
            `}</style>

            {/* Daily plays indicator */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-fuchsia-300/70">Günlük Hak:</span>
              <div className="flex gap-1">
                {Array.from({ length: lambaDailyLimit }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                      i < lambaPlaysUsed
                        ? 'bg-amber-500/30 border-amber-400/50 text-amber-300'
                        : 'bg-purple-900/50 border-fuchsia-500/30 text-fuchsia-400/50'
                    }`}
                  >
                    {i < lambaPlaysUsed ? '✓' : '○'}
                  </div>
                ))}
              </div>
              <span className="text-amber-400/80 font-medium">{lambaPlaysRemaining} kaldı</span>
            </div>

            {/* PHASE: IDLE - Golden Lamp */}
            {(lambaPhase === 'idle' || lambaPhase === 'rubbing') && (
              <div className="flex flex-col items-center gap-4">
                <div
                  className={`text-7xl sm:text-8xl cursor-pointer select-none transition-all ${
                    lambaPhase === 'rubbing' ? 'lamp-rub' : 'lamp-glow hover:scale-110'
                  } ${lambaPlaysRemaining <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  onClick={rubLamp}
                  role="button"
                  aria-label="Lambayı ov"
                >
                  🪔
                </div>
                <p className="text-fuchsia-300/80 text-sm text-center">
                  {lambaPlaysRemaining > 0
                    ? 'Lambayı ovarak cin\'i çağır!'
                    : 'Bugünkü hakların doldu, yarın tekrar gel!'}
                </p>
                {lambaPlaysRemaining > 0 && (
                  <button
                    onClick={rubLamp}
                    disabled={lambaPhase === 'rubbing' || !session?.user}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold rounded-full hover:scale-105 transition disabled:opacity-50 shadow-lg shadow-amber-500/30 text-sm"
                  >
                    {lambaPhase === 'rubbing' ? '✨ Ovuluyor...' : '🪔 Lambayı Ov'}
                  </button>
                )}
              </div>
            )}

            {/* PHASE: SMOKE */}
            {lambaPhase === 'smoke' && (
              <div className="relative flex flex-col items-center gap-2 h-48">
                <div className="text-6xl">🪔</div>
                {/* Smoke particles */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute smoke-particle"
                    style={{
                      left: `${40 + Math.random() * 20}%`,
                      bottom: '60px',
                      animationDelay: `${i * 0.15}s`,
                      fontSize: `${20 + Math.random() * 15}px`,
                      opacity: 0,
                    }}
                  >
                    {['💨', '💜', '✨', '🌀'][i % 4]}
                  </div>
                ))}
                <p className="text-fuchsia-300 text-sm mt-auto animate-pulse">Cin ortaya çıkıyor...</p>
              </div>
            )}

            {/* PHASE: GENIE APPEARS */}
            {(lambaPhase === 'genie' || lambaPhase === 'chests') && (
              <div className="flex flex-col items-center gap-3">
                {/* Genie Character */}
                <div className="genie-appear relative">
                  <div className="text-7xl sm:text-8xl">🧞</div>
                  {/* Sparkle effects around genie */}
                  {lambaPhase === 'genie' && [...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute text-lg sparkle-anim"
                      style={{
                        top: `${10 + Math.random() * 60}%`,
                        left: `${-20 + Math.random() * 140}%`,
                        animationDelay: `${i * 0.3}s`,
                      }}
                    >
                      ✨
                    </div>
                  ))}
                </div>

                {/* Speech Bubble */}
                {lambaGenieMsg && (
                  <div className="bubble-in relative bg-gradient-to-br from-indigo-900/90 to-purple-900/90 border border-fuchsia-400/40 rounded-2xl px-4 py-3 max-w-xs text-center shadow-lg shadow-purple-500/20">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-900/90 border-l border-t border-fuchsia-400/40 transform rotate-45" />
                    <p className="text-fuchsia-100 text-sm font-medium relative z-10">{lambaGenieMsg}</p>
                  </div>
                )}
              </div>
            )}

            {/* PHASE: TREASURE CHESTS */}
            {lambaPhase === 'chests' && (
              <div className="flex flex-col items-center gap-3 mt-2">
                <p className="text-amber-300 text-sm font-medium animate-pulse">Bir sandık seç!</p>
                <div className="flex gap-4 sm:gap-6">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.15, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      className={`chest-bounce cursor-pointer flex flex-col items-center gap-1 ${
                        lambaChestPicked !== null && lambaChestPicked !== i ? 'opacity-30' : ''
                      }`}
                      style={{ animationDelay: `${i * 0.3}s` }}
                      onClick={() => pickChest(i)}
                    >
                      <div className={`text-5xl sm:text-6xl transition-all ${
                        lambaChestPicked === i ? 'chest-open' : ''
                      }`}>
                        {lambaChestPicked === i ? '✨' : '🎁'}
                      </div>
                      <span className="text-fuchsia-300/60 text-xs">Sandık {i + 1}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* PHASE: REVEAL */}
            {lambaPhase === 'reveal' && lambaReward && (
              <div className="flex flex-col items-center gap-3">
                {/* Genie with result */}
                <div className="text-6xl">🧞</div>
                {lambaGenieMsg && (
                  <div className="bubble-in bg-gradient-to-br from-indigo-900/90 to-purple-900/90 border border-fuchsia-400/40 rounded-2xl px-4 py-3 max-w-xs text-center relative shadow-lg shadow-purple-500/20">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-900/90 border-l border-t border-fuchsia-400/40 transform rotate-45" />
                    <p className="text-fuchsia-100 text-sm font-medium relative z-10">{lambaGenieMsg}</p>
                  </div>
                )}

                {/* Reward Display */}
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className={`px-6 py-4 rounded-2xl border-2 text-center ${
                    lambaReward.type === 'empty' || (lambaReward.type === 'cfc' && lambaReward.amount === 0)
                      ? 'bg-gray-800/50 border-gray-500/40'
                      : lambaReward.type === 'free_fortune'
                        ? 'bg-gradient-to-br from-purple-800/60 to-indigo-800/60 border-purple-400/50'
                        : 'bg-gradient-to-br from-amber-900/50 to-yellow-900/50 border-amber-400/50'
                  }`}
                >
                  <div className="text-4xl mb-1">{lambaReward.emoji}</div>
                  <p className={`font-bold text-lg ${
                    lambaReward.type === 'empty' || (lambaReward.type === 'cfc' && lambaReward.amount === 0)
                      ? 'text-gray-300'
                      : 'text-amber-300'
                  }`}>
                    {lambaReward.label}
                  </p>
                  {lambaReward.type === 'cfc' && lambaReward.amount > 0 && (
                    <p className="text-yellow-400 text-sm">+{lambaReward.amount} CFC</p>
                  )}
                  {lambaReward.type === 'free_fortune' && (
                    <p className="text-purple-300 text-sm">+5 CFC (Fal Hakkı)</p>
                  )}
                </motion.div>

                {/* Play Again */}
                {lambaPlaysRemaining > 0 ? (
                  <button
                    onClick={initLambaCini}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold rounded-full hover:scale-105 transition shadow-lg shadow-amber-500/30 text-sm"
                  >
                    <RotateCcw className="w-4 h-4" /> Tekrar Oyna ({lambaPlaysRemaining} hak)
                  </button>
                ) : (
                  <p className="text-fuchsia-300/60 text-sm">Bugünkü hakların doldu! Yarın tekrar gel 🌙</p>
                )}
              </div>
            )}
          </div>
        )

      default:
        return <p className="text-fuchsia-300">Oyun yükleniyor...</p>
    }
  }

  // ========== MAIN RENDER ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0118] text-white">
      {/* Reward Animation */}
      <AnimatePresence>
        {rewardAnimation !== null && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl shadow-2xl shadow-amber-500/50"
          >
            <span className="text-xl font-bold">+{rewardAnimation} 💰</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-[#0f0520]/95 backdrop-blur-md border-b border-fuchsia-500/30 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/`} className="text-fuchsia-400 hover:text-fuchsia-300 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-fuchsia-400" />
              <span className="font-bold text-sm sm:text-base bg-gradient-to-r from-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
                Fal Oyun Merkezi
              </span>
            </div>
          </div>
          {/* Balance */}
          <div className="flex items-center gap-2">
            {profile && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-900/40 rounded-full border border-fuchsia-500/30">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300 font-bold text-sm">{profile.cfcBalance}</span>
                  <span className="text-fuchsia-400/60 text-xs">CFC</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/40 rounded-full border border-purple-500/30">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300 font-bold text-xs">Lv.{profile.level}</span>
                </div>
              </>
            )}
            {!session?.user && (
              <Link href={`/giris`} className="px-4 py-1.5 bg-fuchsia-600 rounded-full text-sm font-medium hover:bg-fuchsia-500 transition">
                Giriş Yap
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Daily Reward Banner */}
      {session?.user && dailyReward && !dailyReward.claimed && (
        <div className="px-4 pt-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-amber-400" />
              <div>
                <p className="text-amber-300 font-bold text-sm">Günlük Giriş Ödülü</p>
                <p className="text-amber-200/60 text-xs">Seri: {dailyReward.currentStreak} gün • Ödül: {dailyReward.nextReward} CFC</p>
              </div>
            </div>
            <button
              onClick={claimDailyReward}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-full text-sm hover:scale-105 transition shadow-lg shadow-amber-500/30"
            >
              Topla!
            </button>
          </motion.div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="px-4 pt-4">
        <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'games' as const, label: '🎮 Oyunlar', icon: Gamepad2 },
            { key: 'quests' as const, label: '🎯 Görevler', icon: Target },
            { key: 'leaderboard' as const, label: '🏆 Liderlik', icon: Trophy },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
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
      <div className="px-4 py-4">
        <div className="max-w-5xl mx-auto">
          {/* ===== GAMES TAB ===== */}
          {activeTab === 'games' && (
            <div className="space-y-4">
              {/* Active Game Modal */}
              <AnimatePresence>
                {activeGame && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setActiveGame(null) }}
                  >
                    <motion.div
                      initial={{ scale: 0.8, y: 50 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.8, y: 50 }}
                      className="bg-[#1a0a2e] border border-fuchsia-500/30 rounded-3xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <span className="text-2xl">{games.find(g => g.slug === activeGame)?.icon}</span>
                          {games.find(g => g.slug === activeGame)?.title}
                        </h3>
                        <button onClick={() => { setActiveGame(null); setResultMessage(null) }} className="p-2 hover:bg-fuchsia-900/50 rounded-full transition">
                          <X className="w-5 h-5 text-fuchsia-400" />
                        </button>
                      </div>
                      {renderGameContent(activeGame)}
                      {resultMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/40 rounded-xl text-center text-green-300 font-medium text-sm"
                        >
                          {resultMessage}
                        </motion.div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Game Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {games.map((game, i) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-gradient-to-b from-[#1a0a2e] to-[#120822] border border-fuchsia-500/20 rounded-2xl p-4 hover:border-fuchsia-400/50 transition-all group cursor-pointer"
                    onClick={() => {
                      if (!session?.user) { router.push(`/giris`); return }
                      setActiveGame(game.slug)
                      setResultMessage(null)
                      // Reset game state when opening
                      if (game.slug === 'tarot-sec') resetTarot()
                      if (game.slug === 'memory') initMemory()
                      if (game.slug === 'quiz') initQuiz()
                      if (game.slug === 'sans-kutusu') resetLuckyBox()
                      if (game.slug === 'sayi-tahmin') initGuess()
                      if (game.slug === 'lamba-cini') initLambaCini()
                    }}
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{game.icon}</div>
                    <h3 className="text-white font-bold text-sm mb-1">{game.title}</h3>
                    <p className="text-fuchsia-300/60 text-xs mb-3 line-clamp-2">{game.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-yellow-400/80">{game.minReward}-{game.maxReward} 💰</span>
                      <span className="px-3 py-1 bg-fuchsia-600/80 text-white text-xs rounded-full font-medium group-hover:bg-fuchsia-500 transition">
                        Oyna
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Daily Spin Section */}
              {session?.user && (
                <div className="bg-gradient-to-r from-[#1a0a2e] to-[#1f0d35] border border-fuchsia-500/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🎡</span>
                      <div>
                        <p className="text-white font-bold text-sm">Günlük Ücretsiz Çark</p>
                        <p className="text-fuchsia-300/60 text-xs">Günde 1 kez ücretsiz çark çevirme hakkı</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setActiveGame('fal-carki'); setResultMessage(null) }}
                      className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-bold rounded-full hover:scale-105 transition"
                    >
                      Çevir
                    </button>
                  </div>
                </div>
              )}

              {/* Level Progress */}
              {profile && (
                <div className="bg-gradient-to-r from-[#1a0a2e] to-[#1f0d35] border border-fuchsia-500/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-400" />
                      <span className="text-white font-bold text-sm">Seviye {profile.level} - {profile.levelTitle}</span>
                    </div>
                    <span className="text-fuchsia-300/60 text-xs">{profile.totalJetons} toplam CFC</span>
                  </div>
                  <div className="w-full bg-purple-900/50 rounded-full h-2.5">
                    <div className="bg-gradient-to-r from-fuchsia-500 to-amber-400 h-2.5 rounded-full transition-all duration-500" style={{ width: `${getLevelProgress()}%` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-fuchsia-300/40">
                    {['Yeni Üye', 'Çırak (100)', 'Deneyimli (500)', 'Usta (2000)', 'VIP'].map((label, i) => (
                      <span key={i} className={profile.level > i ? 'text-amber-400' : ''}>{i === 0 ? '•' : ''}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Referral Section */}
              {session?.user && profile?.userReferralCode && (
                <div className="bg-gradient-to-r from-[#1a0a2e] to-[#1f0d35] border border-fuchsia-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Share2 className="w-5 h-5 text-fuchsia-400" />
                    <div>
                      <p className="text-white font-bold text-sm">Davet Et & Kazan</p>
                      <p className="text-fuchsia-300/60 text-xs">Davet eden → 50 CFC • Üye olan → 50 CFC</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 bg-purple-900/40 rounded-xl text-xs text-fuchsia-300 truncate border border-fuchsia-500/20">
                      {typeof window !== 'undefined' ? `${window.location.origin}/kayit-ol?ref=${profile.userReferralCode}` : ''}
                    </div>
                    <button
                      onClick={copyReferral}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                        copiedRef ? 'bg-green-600 text-white' : 'bg-fuchsia-600 text-white hover:bg-fuchsia-500'
                      }`}
                    >
                      {copiedRef ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== QUESTS TAB ===== */}
          {activeTab === 'quests' && (
            <div className="space-y-3">
              <h2 className="text-white font-bold flex items-center gap-2"><Target className="w-5 h-5 text-fuchsia-400" /> Günlük Görevler</h2>
              {quests.map((quest, i) => (
                <motion.div
                  key={quest.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-gradient-to-r from-[#1a0a2e] to-[#1f0d35] border border-fuchsia-500/20 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{quest.icon}</span>
                    <div>
                      <p className="text-white font-medium text-sm">{quest.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-24 bg-purple-900/50 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${quest.completed ? 'bg-green-400' : 'bg-fuchsia-500'}`}
                            style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-fuchsia-300/60">{quest.progress}/{quest.target}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-xs font-bold">+{quest.reward} 💰</span>
                    {quest.completed && !quest.claimed ? (
                      <button
                        onClick={() => claimQuest(quest.type)}
                        className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full hover:scale-105 transition"
                      >
                        Topla
                      </button>
                    ) : quest.claimed ? (
                      <span className="px-3 py-1.5 bg-green-900/40 text-green-400 text-xs rounded-full"><Check className="w-3 h-3 inline" /> Alındı</span>
                    ) : (
                      <Lock className="w-4 h-4 text-fuchsia-400/40" />
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Streak Info */}
              {dailyReward && (
                <div className="bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border border-amber-500/30 rounded-2xl p-4 mt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Flame className="w-5 h-5 text-amber-400" />
                    <p className="text-amber-300 font-bold text-sm">Giriş Serisi</p>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map(day => {
                      const reward = day === 7 ? 100 : day >= 3 ? 20 : day >= 2 ? 10 : 5
                      const achieved = dailyReward.currentStreak >= day
                      return (
                        <div key={day} className={`text-center p-2 rounded-xl border ${
                          achieved ? 'bg-amber-900/30 border-amber-500/40' : 'bg-purple-900/20 border-fuchsia-500/10'
                        }`}>
                          <p className={`text-xs font-bold ${achieved ? 'text-amber-300' : 'text-fuchsia-300/40'}`}>Gün {day}</p>
                          <p className={`text-xs ${achieved ? 'text-yellow-400' : 'text-fuchsia-300/30'}`}>{reward}💰</p>
                          {achieved && <Check className="w-3 h-3 text-green-400 mx-auto mt-1" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== LEADERBOARD TAB ===== */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-3">
              <h2 className="text-white font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Liderlik Tablosu</h2>
              {leaderboard.length === 0 ? (
                <p className="text-fuchsia-300/60 text-sm text-center py-8">Henüz liderlik tablosu oluşmadı</p>
              ) : (
                leaderboard.map((entry, i) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border ${
                      i === 0 ? 'bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border-yellow-500/40' :
                      i === 1 ? 'bg-gradient-to-r from-gray-700/30 to-gray-600/30 border-gray-400/40' :
                      i === 2 ? 'bg-gradient-to-r from-amber-800/30 to-orange-900/30 border-amber-600/40' :
                      'bg-[#1a0a2e] border-fuchsia-500/10'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      i === 0 ? 'bg-yellow-500 text-black' :
                      i === 1 ? 'bg-gray-400 text-black' :
                      i === 2 ? 'bg-amber-600 text-white' :
                      'bg-purple-900/50 text-fuchsia-300'
                    }`}>
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : entry.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{entry.username || entry.name}</p>
                      <p className="text-fuchsia-300/50 text-xs">Lv.{entry.level} • {entry.levelTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-bold text-sm">{entry.totalJetons} 💰</p>
                      <p className="text-fuchsia-300/40 text-xs">{entry.totalGames} oyun</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Padding */}
      <div className="h-20" />
    </div>
  )
}
