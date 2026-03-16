'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { 
  Coffee, Star, Moon, Sparkles, Calendar, Clock, User, ChevronRight, TrendingUp, 
  Heart, Eye, Users, Award, Gem, BarChart3, Zap, Trophy, Target, Gift, Coins,
  Play, Radio, MessageSquare, Share2, Crown, Flame, Timer, Activity,
  Sunrise, Sun, Sunset, Moon as MoonIcon, ChevronDown, ChevronUp, ArrowRight,
  Bookmark, Shield, Medal, Tv, CircleDot, BookOpen, Percent, DollarSign,
  HandHeart, TrendingDown, Wallet, PieChart, LineChart, AreaChart
} from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import { format, formatDistanceToNow, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns'
import { tr, enUS } from 'date-fns/locale'
import Link from 'next/link'

// Types
interface Statistics {
  user: {
    id: string
    name: string
    username: string | null
    image: string | null
    credits: number
    membership: string
    memberSince: string
    zodiacSign: string | null
    risingSign: string | null
    birthDate: string | null
    birthTime: string | null
    totalTimeSpentMinutes: number
  }
  activity: {
    totalLogins: number
    lastLogin: string | null
    membershipDuration: string
    totalTimeSpentMinutes: number
    averageDailyMinutes: number
    mostActiveHour: number
    mostActiveDay: number
    totalSessions: number
    activityGraphData: { date: string; fortunes: number; streams: number; posts: number; minutes: number }[]
    hourlyActivity: { hour: number; minutes: number }[]
  }
  fortune: {
    total: number
    byType: Record<string, number>
    mostUsedType: string
    dailyHoroscopes: number
    lastFortune: { id: string; type: string; date: string } | null
    avgSatisfaction: number
    avgAccuracy: number
  }
  coins: {
    currentBalance: number
    totalPurchased: number
    totalSpent: number
    totalEarned: number
    giftsSent: number
    giftsReceived: number
    streamSpending: number
    avgDailySpending: number
    highestSpendingDay: { day: string; amount: number }
    monthlySpending: { month: string; amount: number }[]
  }
  social: {
    totalPosts: number
    likesReceived: number
    commentsReceived: number
    followers: number
    following: number
    profileViews: number
    popularityScore: number
    mostLikedPost: { id: string; likes: number; comments: number } | null
    mostCommentedPost: { id: string; likes: number; comments: number } | null
  }
  streams: {
    totalHosted: number
    totalDurationMinutes: number
    avgViewers: number
    maxViewers: number
    totalEarnings: number
    avgCoinsPerStream: number
    mostSuccessfulStream: { id: string; title: string | null; viewers: number; earnings: number } | null
    topGiftSender: { id: string; name: string; username: string | null; image: string | null } | null
  }
  liveSessions: { total: number }
}

interface Achievement {
  id: string
  code: string
  nameTr: string
  nameEn: string
  descriptionTr: string
  descriptionEn: string
  icon: string
  category: string
  targetValue: number
  rewardCredits: number
  currentProgress: number
  progress: number
  isCompleted: boolean
  earnedAt: string | null
}

interface LeaderboardEntry {
  rank: number
  id: string
  name: string
  username: string | null
  image: string | null
  count?: number
  followers?: number
  streams?: number
  totalSpent?: number
  totalEarned?: number
  totalGifted?: number
  totalLikes?: number
}

interface Leaderboards {
  topFortuneViewers: LeaderboardEntry[]
  mostPopular: LeaderboardEntry[]
  topStreamers: LeaderboardEntry[]
  topSpenders: LeaderboardEntry[]
  topEarners: LeaderboardEntry[]
  topGiftSenders: LeaderboardEntry[]
  topLikedCreators: LeaderboardEntry[]
  currentUserRanks: {
    fortune: number | null
    popularity: number | null
    streaming: number | null
    spending: number | null
    earning: number | null
  } | null
}

const ZODIAC_INFO: Record<string, { tr: string; en: string; emoji: string; trComment: string; enComment: string }> = {
  aries: { tr: 'Koç', en: 'Aries', emoji: '♈', trComment: 'Cesur ve enerjik bir ruhun var!', enComment: 'You have a brave and energetic spirit!' },
  taurus: { tr: 'Boğa', en: 'Taurus', emoji: '♉', trComment: 'Sabirlı ve güvenilir birisin.', enComment: 'You are patient and reliable.' },
  gemini: { tr: 'İkizler', en: 'Gemini', emoji: '♊', trComment: 'Meraklı ve iletişimci bir yapın var.', enComment: 'You have a curious and communicative nature.' },
  cancer: { tr: 'Yengeç', en: 'Cancer', emoji: '♋', trComment: 'Duygusal ve koruyucu birisin.', enComment: 'You are emotional and protective.' },
  leo: { tr: 'Aslan', en: 'Leo', emoji: '♌', trComment: 'Doğal bir lider ve karizmatiksin!', enComment: 'You are a natural leader and charismatic!' },
  virgo: { tr: 'Başak', en: 'Virgo', emoji: '♍', trComment: 'Detaycı ve analitik bir zekan var.', enComment: 'You have an analytical and detail-oriented mind.' },
  libra: { tr: 'Terazi', en: 'Libra', emoji: '♎', trComment: 'Adaletci ve diplomatiksin.', enComment: 'You are fair and diplomatic.' },
  scorpio: { tr: 'Akrep', en: 'Scorpio', emoji: '♏', trComment: 'Tutkulusun ve güçlü bir sezgiye sahipsin.', enComment: 'You are passionate with powerful intuition.' },
  sagittarius: { tr: 'Yay', en: 'Sagittarius', emoji: '♐', trComment: 'Maceracı ve iyimser birisin!', enComment: 'You are adventurous and optimistic!' },
  capricorn: { tr: 'Oğlak', en: 'Capricorn', emoji: '♑', trComment: 'Disiplinli ve hedef odaklısın.', enComment: 'You are disciplined and goal-oriented.' },
  aquarius: { tr: 'Kova', en: 'Aquarius', emoji: '♒', trComment: 'Yenilikci ve bağımsız bir ruhun var.', enComment: 'You have an innovative and independent spirit.' },
  pisces: { tr: 'Balık', en: 'Pisces', emoji: '♓', trComment: 'Hayalperest ve empatiksin.', enComment: 'You are dreamy and empathetic.' }
}

const FORTUNE_NAMES: Record<string, { tr: string; en: string; icon: string }> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Reading', icon: '☕' },
  tarot: { tr: 'Tarot Falı', en: 'Tarot Reading', icon: '🃏' },
  horoscope: { tr: 'Burç Yorumu', en: 'Horoscope', icon: '✨' },
  daily_horoscope: { tr: 'Günlük Burç', en: 'Daily Horoscope', icon: '🌞' },
  palm: { tr: 'El Falı', en: 'Palm Reading', icon: '✋' },
  dream: { tr: 'Rüya Tabiri', en: 'Dream Interpretation', icon: '🌙' },
  love: { tr: 'Aşk Falı', en: 'Love Reading', icon: '❤️' },
  numerology: { tr: 'Numeroloji', en: 'Numerology', icon: '🔢' },
  angel: { tr: 'Melek Kartları', en: 'Angel Cards', icon: '👼' },
  aura: { tr: 'Aura Analizi', en: 'Aura Analysis', icon: '🔮' },
  birthchart: { tr: 'Doğum Haritası', en: 'Birth Chart', icon: '⭐' },
  yesno: { tr: 'Evet/Hayır', en: 'Yes/No Oracle', icon: '❓' },
  katina: { tr: 'Katina Falı', en: 'Katina Reading', icon: '🎴' },
  kursundokme: { tr: 'Kurşun Dökme', en: 'Lead Pouring', icon: '🪣' },
  istikhara: { tr: 'İstihare', en: 'Istikhara', icon: '🙏' }
}

const DAY_NAMES: Record<number, { tr: string; en: string }> = {
  0: { tr: 'Pazar', en: 'Sunday' },
  1: { tr: 'Pazartesi', en: 'Monday' },
  2: { tr: 'Salı', en: 'Tuesday' },
  3: { tr: 'Çarşamba', en: 'Wednesday' },
  4: { tr: 'Perşembe', en: 'Thursday' },
  5: { tr: 'Cuma', en: 'Friday' },
  6: { tr: 'Cumartesi', en: 'Saturday' }
}

const HOUR_PERIODS: Record<string, { tr: string; en: string; icon: React.ComponentType<{className?: string}> }> = {
  morning: { tr: 'Sabah (06-12)', en: 'Morning (6AM-12PM)', icon: Sunrise },
  afternoon: { tr: 'Öğlen (12-18)', en: 'Afternoon (12PM-6PM)', icon: Sun },
  evening: { tr: 'Akşam (18-24)', en: 'Evening (6PM-12AM)', icon: Sunset },
  night: { tr: 'Gece (00-06)', en: 'Night (12AM-6AM)', icon: MoonIcon }
}

export default function DashboardPage() {
  const { language, t } = useLanguage()
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [achievements, setAchievements] = useState<{ achievements: Achievement[]; categorized: Record<string, Achievement[]>; completedCount: number; totalCount: number; completionPercentage: number } | null>(null)
  const [leaderboards, setLeaderboards] = useState<Leaderboards | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<string>('activity')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ activity: true })
  const [activeLeaderboard, setActiveLeaderboard] = useState('popularity')

  const dateLocale = language === 'tr' ? tr : enUS

  useEffect(() => {
    Promise.all([
      fetch('/api/user/statistics').then(r => { if (!r.ok) throw new Error('Failed to fetch statistics'); return r.json(); }),
      fetch('/api/user/achievements').then(r => { if (!r.ok) throw new Error('Failed to fetch achievements'); return r.json(); }),
      fetch('/api/leaderboards').then(r => { if (!r.ok) throw new Error('Failed to fetch leaderboards'); return r.json(); })
    ]).then(([stats, ach, lb]) => {
      if (stats && stats.user) {
        setStatistics(stats)
      }
      if (ach && !ach.error) {
        setAchievements(ach)
      }
      if (lb && !lb.error) {
        setLeaderboards(lb)
      }
      setIsLoading(false)
    }).catch(e => {
      console.error('Failed to load statistics:', e)
      setIsLoading(false)
    })
  }, [])

  const formatDuration = (minutes: number) => {
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor((minutes % 1440) / 60)
    const mins = minutes % 60
    
    if (days > 0) {
      return language === 'tr' 
        ? `${days} gün ${hours} saat` 
        : `${days}d ${hours}h`
    } else if (hours > 0) {
      return language === 'tr' 
        ? `${hours} saat ${mins} dk` 
        : `${hours}h ${mins}m`
    }
    return language === 'tr' ? `${mins} dakika` : `${mins} minutes`
  }

  const getHourPeriod = (hour: number): string => {
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    if (hour >= 18 && hour < 24) return 'evening'
    return 'night'
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#1a0a2e] to-[#0a0118] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#1a0a2e] to-[#0a0118] flex items-center justify-center">
        <p className="text-white/60">{language === 'tr' ? 'Veriler yüklenemedi' : 'Failed to load data'}</p>
      </div>
    )
  }

  const zodiacInfo = statistics.user.zodiacSign ? ZODIAC_INFO[statistics.user.zodiacSign.toLowerCase()] : null
  const risingInfo = statistics.user.risingSign ? ZODIAC_INFO[statistics.user.risingSign.toLowerCase()] : null

  // Section component
  const Section = ({ id, title, icon: Icon, children, gradient }: { id: string; title: string; icon: React.ComponentType<{className?: string}>; children: React.ReactNode; gradient: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <button
        onClick={() => toggleSection(id)}
        className={`w-full flex items-center justify-between p-4 rounded-xl ${gradient} backdrop-blur-sm`}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-white" />
          <h3 className="font-bold text-white">{title}</h3>
        </div>
        {expandedSections[id] ? (
          <ChevronUp className="h-5 w-5 text-white/70" />
        ) : (
          <ChevronDown className="h-5 w-5 text-white/70" />
        )}
      </button>
      <AnimatePresence>
        {expandedSections[id] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-black/20 rounded-b-xl border-x border-b border-purple-500/10">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  // Stat Card component
  const StatCard = ({ label, value, icon: Icon, color = 'purple' }: { label: string; value: string | number; icon: React.ComponentType<{className?: string}>; color?: string }) => (
    <div className={`bg-gradient-to-br from-${color}-500/20 to-${color}-600/10 rounded-xl p-3 border border-${color}-500/20`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 text-${color}-400`} />
        <span className="text-white/60 text-xs">{label}</span>
      </div>
      <p className="text-white font-bold text-lg">{value}</p>
    </div>
  )

  // Progress Bar component
  const ProgressBar = ({ progress, color = 'purple' }: { progress: number; color?: string }) => (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <div 
        className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-400 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#1a0a2e] to-[#0a0118] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#0a0118] to-transparent backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {language === 'tr' ? 'İstatistikler' : 'Statistics'}
              </h1>
              <p className="text-white/50 text-sm">
                {language === 'tr' ? 'Tüm verileriniz ve başarılarınız' : 'All your data and achievements'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        {/* User Overview Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-purple-600/30 to-pink-600/20 rounded-2xl p-4 mb-6 border border-purple-500/20"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
              {statistics.user.image ? (
                <img src={statistics.user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">{statistics.user.name}</h2>
              {statistics.user.username && (
                <p className="text-white/60 text-sm">@{statistics.user.username}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-purple-500/30 rounded-full text-purple-300 text-xs font-medium">
                  {statistics.user.membership === 'premium' ? '💎 Premium' : statistics.user.membership === 'gold' ? '👑 Gold' : 'Basic'}
                </span>
                {zodiacInfo && (
                  <span className="text-lg">{zodiacInfo.emoji}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-yellow-400">
                <Coins className="h-4 w-4" />
                <span className="font-bold">{statistics.coins.currentBalance}</span>
              </div>
              <p className="text-white/40 text-xs">{language === 'tr' ? 'CFC' : 'CFC'}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-white/5 rounded-lg">
              <p className="text-white font-bold">{statistics.fortune.total}</p>
              <p className="text-white/50 text-xs">{language === 'tr' ? 'Fal' : 'Fortune'}</p>
            </div>
            <div className="text-center p-2 bg-white/5 rounded-lg">
              <p className="text-white font-bold">{statistics.social.followers}</p>
              <p className="text-white/50 text-xs">{language === 'tr' ? 'Takipçi' : 'Followers'}</p>
            </div>
            <div className="text-center p-2 bg-white/5 rounded-lg">
              <p className="text-white font-bold">{statistics.social.likesReceived}</p>
              <p className="text-white/50 text-xs">{language === 'tr' ? 'Beğeni' : 'Likes'}</p>
            </div>
            <div className="text-center p-2 bg-white/5 rounded-lg">
              <p className="text-white font-bold">{statistics.streams.totalHosted}</p>
              <p className="text-white/50 text-xs">{language === 'tr' ? 'Yayın' : 'Streams'}</p>
            </div>
          </div>
        </motion.div>

        {/* 1. USER ACTIVITY STATISTICS */}
        <Section
          id="activity"
          title={language === 'tr' ? 'Aktivite İstatistikleri' : 'Activity Statistics'}
          icon={Activity}
          gradient="bg-gradient-to-r from-blue-600/40 to-cyan-600/30"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                label={language === 'tr' ? 'Toplam Giriş' : 'Total Logins'}
                value={statistics.activity.totalLogins}
                icon={Users}
                color="blue"
              />
              <StatCard 
                label={language === 'tr' ? 'Son Giriş' : 'Last Login'}
                value={statistics.activity.lastLogin 
                  ? formatDistanceToNow(new Date(statistics.activity.lastLogin), { locale: dateLocale, addSuffix: true })
                  : '-'}
                icon={Clock}
                color="cyan"
              />
              <StatCard 
                label={language === 'tr' ? 'Üyelik Süresi' : 'Member For'}
                value={formatDistanceToNow(new Date(statistics.activity.membershipDuration), { locale: dateLocale })}
                icon={Calendar}
                color="purple"
              />
              <StatCard 
                label={language === 'tr' ? 'Toplam Süre' : 'Total Time'}
                value={formatDuration(statistics.activity.totalTimeSpentMinutes)}
                icon={Timer}
                color="pink"
              />
              <StatCard 
                label={language === 'tr' ? 'Günlük Ort.' : 'Daily Avg.'}
                value={`${statistics.activity.averageDailyMinutes} ${language === 'tr' ? 'dk' : 'min'}`}
                icon={TrendingUp}
                color="emerald"
              />
              <StatCard 
                label={language === 'tr' ? 'Toplam Oturum' : 'Total Sessions'}
                value={statistics.activity.totalSessions}
                icon={CircleDot}
                color="violet"
              />
            </div>

            {/* Most Active Time */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-white/80 text-sm mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-400" />
                {language === 'tr' ? 'En Aktif Zamanlar' : 'Most Active Times'}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 bg-orange-500/10 p-3 rounded-lg">
                  {(() => {
                    const period = getHourPeriod(statistics.activity.mostActiveHour)
                    const PeriodIcon = HOUR_PERIODS[period].icon
                    return <PeriodIcon className="h-5 w-5 text-orange-400" />
                  })()}
                  <div>
                    <p className="text-white/60 text-xs">{language === 'tr' ? 'En Aktif Saat' : 'Most Active Hour'}</p>
                    <p className="text-white font-bold">{statistics.activity.mostActiveHour}:00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-orange-500/10 p-3 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className="text-white/60 text-xs">{language === 'tr' ? 'En Aktif Gün' : 'Most Active Day'}</p>
                    <p className="text-white font-bold">
                      {DAY_NAMES[statistics.activity.mostActiveDay]?.[language] || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 30-Day Activity Graph */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-white/80 text-sm mb-3 flex items-center gap-2">
                <LineChart className="h-4 w-4 text-blue-400" />
                {language === 'tr' ? '30 Günlük Aktivite' : '30-Day Activity'}
              </h4>
              <div className="flex items-end gap-0.5 h-20">
                {statistics.activity.activityGraphData.map((day, i) => {
                  const maxMinutes = Math.max(...statistics.activity.activityGraphData.map(d => d.minutes), 1)
                  const height = (day.minutes / maxMinutes) * 100
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t opacity-70 hover:opacity-100 transition-opacity cursor-pointer relative group"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {day.date}: {day.minutes} {language === 'tr' ? 'dk' : 'min'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Section>

        {/* 2. FORTUNE TELLING STATISTICS */}
        <Section
          id="fortune"
          title={language === 'tr' ? 'Fal İstatistikleri' : 'Fortune Statistics'}
          icon={Sparkles}
          gradient="bg-gradient-to-r from-purple-600/40 to-pink-600/30"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                label={language === 'tr' ? 'Toplam Fal' : 'Total Fortunes'}
                value={statistics.fortune.total}
                icon={Sparkles}
                color="purple"
              />
              <StatCard 
                label={language === 'tr' ? 'Günlük Burç' : 'Daily Horoscopes'}
                value={statistics.fortune.dailyHoroscopes}
                icon={Star}
                color="pink"
              />
              <StatCard 
                label={language === 'tr' ? 'Memnuniyet' : 'Satisfaction'}
                value={statistics.fortune.avgSatisfaction > 0 ? `${statistics.fortune.avgSatisfaction}/5 ⭐` : '-'}
                icon={Heart}
                color="rose"
              />
              <StatCard 
                label={language === 'tr' ? 'Doğruluk' : 'Accuracy'}
                value={statistics.fortune.avgAccuracy > 0 ? `${statistics.fortune.avgAccuracy}/5 🎯` : '-'}
                icon={Target}
                color="emerald"
              />
            </div>

            {/* Most Used Fortune */}
            {statistics.fortune.mostUsedType && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/20">
                <p className="text-white/60 text-xs mb-1">{language === 'tr' ? 'En Çok Kullanılan' : 'Most Used'}</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{FORTUNE_NAMES[statistics.fortune.mostUsedType]?.icon || '🔮'}</span>
                  <span className="text-white font-bold">
                    {FORTUNE_NAMES[statistics.fortune.mostUsedType]?.[language] || statistics.fortune.mostUsedType}
                  </span>
                </div>
              </div>
            )}

            {/* Fortune Breakdown */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-white/80 text-sm mb-3 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-purple-400" />
                {language === 'tr' ? 'Fal Dağılımı' : 'Fortune Breakdown'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statistics.fortune.byType).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-lg text-sm"
                  >
                    <span>{FORTUNE_NAMES[type]?.icon || '🔮'}</span>
                    <span className="text-white/80">{FORTUNE_NAMES[type]?.[language] || type}</span>
                    <span className="text-purple-300 font-bold">[{count}]</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Last Fortune */}
            {statistics.fortune.lastFortune && (
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/60 text-xs mb-1">{language === 'tr' ? 'Son Fal' : 'Last Fortune'}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{FORTUNE_NAMES[statistics.fortune.lastFortune.type]?.icon || '🔮'}</span>
                    <span className="text-white">
                      {FORTUNE_NAMES[statistics.fortune.lastFortune.type]?.[language] || statistics.fortune.lastFortune.type}
                    </span>
                  </div>
                  <span className="text-white/50 text-sm">
                    {formatDistanceToNow(new Date(statistics.fortune.lastFortune.date), { locale: dateLocale, addSuffix: true })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* 3. COIN/TOKEN ECONOMY STATISTICS */}
        <Section
          id="coins"
          title={language === 'tr' ? 'Jeton Ekonomisi' : 'Coin Economy'}
          icon={Coins}
          gradient="bg-gradient-to-r from-yellow-600/40 to-orange-600/30"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                label={language === 'tr' ? 'Mevcut Bakiye' : 'Current Balance'}
                value={statistics.coins.currentBalance}
                icon={Wallet}
                color="yellow"
              />
              <StatCard 
                label={language === 'tr' ? 'Toplam Satın Alınan' : 'Total Purchased'}
                value={statistics.coins.totalPurchased}
                icon={DollarSign}
                color="emerald"
              />
              <StatCard 
                label={language === 'tr' ? 'Toplam Harcanan' : 'Total Spent'}
                value={statistics.coins.totalSpent}
                icon={TrendingDown}
                color="red"
              />
              <StatCard 
                label={language === 'tr' ? 'Toplam Kazanılan' : 'Total Earned'}
                value={statistics.coins.totalEarned}
                icon={TrendingUp}
                color="green"
              />
              <StatCard 
                label={language === 'tr' ? 'Gönderilen Hediye' : 'Gifts Sent'}
                value={statistics.coins.giftsSent}
                icon={Gift}
                color="pink"
              />
              <StatCard 
                label={language === 'tr' ? 'Alınan Hediye' : 'Gifts Received'}
                value={statistics.coins.giftsReceived}
                icon={HandHeart}
                color="rose"
              />
            </div>

            {/* Daily Average & Highest */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-500/10 rounded-xl p-4">
                <p className="text-white/60 text-xs mb-1">{language === 'tr' ? 'Günlük Ort. Harcama' : 'Avg. Daily Spending'}</p>
                <p className="text-white font-bold text-lg">{statistics.coins.avgDailySpending} 💰</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4">
                <p className="text-white/60 text-xs mb-1">{language === 'tr' ? 'En Yüksek Gün' : 'Highest Day'}</p>
                <p className="text-white font-bold text-lg">{statistics.coins.highestSpendingDay.amount} 🔥</p>
                <p className="text-white/50 text-xs">{statistics.coins.highestSpendingDay.day || '-'}</p>
              </div>
            </div>

            {/* Monthly Spending Graph */}
            {statistics.coins.monthlySpending.length > 0 && (
              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-white/80 text-sm mb-3 flex items-center gap-2">
                  <AreaChart className="h-4 w-4 text-yellow-400" />
                  {language === 'tr' ? 'Aylık Harcama Grafiği' : 'Monthly Spending Graph'}
                </h4>
                <div className="flex items-end gap-2 h-24">
                  {statistics.coins.monthlySpending.map((month, i) => {
                    const maxAmount = Math.max(...statistics.coins.monthlySpending.map(m => m.amount), 1)
                    const height = (month.amount / maxAmount) * 100
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-gradient-to-t from-yellow-500 to-orange-400 rounded-t"
                          style={{ height: `${Math.max(height, 5)}%` }}
                        />
                        <p className="text-white/50 text-xs mt-1">{month.month}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* 4. SOCIAL INTERACTION STATISTICS */}
        <Section
          id="social"
          title={language === 'tr' ? 'Sosyal Etkileşim' : 'Social Interaction'}
          icon={Users}
          gradient="bg-gradient-to-r from-pink-600/40 to-rose-600/30"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                label={language === 'tr' ? 'Paylaşımlar' : 'Posts'}
                value={statistics.social.totalPosts}
                icon={Share2}
                color="pink"
              />
              <StatCard 
                label={language === 'tr' ? 'Alınan Beğeni' : 'Likes Received'}
                value={statistics.social.likesReceived}
                icon={Heart}
                color="rose"
              />
              <StatCard 
                label={language === 'tr' ? 'Alınan Yorum' : 'Comments'}
                value={statistics.social.commentsReceived}
                icon={MessageSquare}
                color="purple"
              />
              <StatCard 
                label={language === 'tr' ? 'Profil Görüntüleme' : 'Profile Views'}
                value={statistics.social.profileViews}
                icon={Eye}
                color="blue"
              />
              <StatCard 
                label={language === 'tr' ? 'Takipçi' : 'Followers'}
                value={statistics.social.followers}
                icon={Users}
                color="emerald"
              />
              <StatCard 
                label={language === 'tr' ? 'Takip' : 'Following'}
                value={statistics.social.following}
                icon={Users}
                color="cyan"
              />
            </div>

            {/* Popularity Score */}
            <div className="bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-xl p-4 border border-pink-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-xs">{language === 'tr' ? 'Popülerlik Puanı' : 'Popularity Score'}</p>
                  <p className="text-white font-bold text-2xl">{statistics.social.popularityScore} ⭐</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
                  <Crown className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            {/* Most Liked & Commented Posts */}
            <div className="grid grid-cols-2 gap-3">
              {statistics.social.mostLikedPost && (
                <Link href={`/${language}/feed?post=${statistics.social.mostLikedPost.id}`} className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                  <p className="text-white/60 text-xs mb-1">{language === 'tr' ? 'En Beğenilen' : 'Most Liked'}</p>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-400" />
                    <span className="text-white font-bold">{statistics.social.mostLikedPost.likes}</span>
                  </div>
                </Link>
              )}
              {statistics.social.mostCommentedPost && (
                <Link href={`/${language}/feed?post=${statistics.social.mostCommentedPost.id}`} className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                  <p className="text-white/60 text-xs mb-1">{language === 'tr' ? 'En Yorumlanan' : 'Most Commented'}</p>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-400" />
                    <span className="text-white font-bold">{statistics.social.mostCommentedPost.comments}</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </Section>

        {/* 5. LIVE STREAM STATISTICS */}
        <Section
          id="streams"
          title={language === 'tr' ? 'Canlı Yayın İstatistikleri' : 'Live Stream Statistics'}
          icon={Radio}
          gradient="bg-gradient-to-r from-red-600/40 to-pink-600/30"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                label={language === 'tr' ? 'Toplam Yayın' : 'Total Streams'}
                value={statistics.streams.totalHosted}
                icon={Radio}
                color="red"
              />
              <StatCard 
                label={language === 'tr' ? 'Yayın Süresi' : 'Stream Duration'}
                value={formatDuration(statistics.streams.totalDurationMinutes)}
                icon={Clock}
                color="pink"
              />
              <StatCard 
                label={language === 'tr' ? 'Ort. İzleyici' : 'Avg. Viewers'}
                value={statistics.streams.avgViewers}
                icon={Users}
                color="orange"
              />
              <StatCard 
                label={language === 'tr' ? 'Max İzleyici' : 'Max Viewers'}
                value={statistics.streams.maxViewers}
                icon={TrendingUp}
                color="yellow"
              />
              <StatCard 
                label={language === 'tr' ? 'Toplam Kazanç' : 'Total Earnings'}
                value={`${statistics.streams.totalEarnings} 💰`}
                icon={Coins}
                color="emerald"
              />
              <StatCard 
                label={language === 'tr' ? 'Yayın Başına' : 'Per Stream'}
                value={`${statistics.streams.avgCoinsPerStream} 💰`}
                icon={BarChart3}
                color="cyan"
              />
            </div>

            {/* Most Successful Stream */}
            {statistics.streams.mostSuccessfulStream && (
              <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-xl p-4 border border-red-500/20">
                <p className="text-white/60 text-xs mb-2">{language === 'tr' ? 'En Başarılı Yayın' : 'Most Successful Stream'}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold">{statistics.streams.mostSuccessfulStream.title || language === 'tr' ? 'Başlıksız' : 'Untitled'}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-white/60 text-sm flex items-center gap-1">
                        <Users className="h-3 w-3" /> {statistics.streams.mostSuccessfulStream.viewers}
                      </span>
                      <span className="text-yellow-400 text-sm flex items-center gap-1">
                        <Coins className="h-3 w-3" /> {statistics.streams.mostSuccessfulStream.earnings}
                      </span>
                    </div>
                  </div>
                  <Trophy className="h-8 w-8 text-yellow-400" />
                </div>
              </div>
            )}

            {/* Top Gift Sender */}
            {statistics.streams.topGiftSender && (
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/60 text-xs mb-2">{language === 'tr' ? 'En Çok Hediye Gönderen' : 'Top Gift Sender'}</p>
                <Link href={`/${language}/profile/${statistics.streams.topGiftSender.username || statistics.streams.topGiftSender.id}`} className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-2 -mx-2 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center overflow-hidden">
                    {statistics.streams.topGiftSender.image ? (
                      <img src={statistics.streams.topGiftSender.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{statistics.streams.topGiftSender.name}</p>
                    {statistics.streams.topGiftSender.username && (
                      <p className="text-white/50 text-sm">@{statistics.streams.topGiftSender.username}</p>
                    )}
                  </div>
                  <Gift className="h-5 w-5 text-yellow-400 ml-auto" />
                </Link>
              </div>
            )}
          </div>
        </Section>

        {/* 6. ASTROLOGY STATISTICS */}
        <Section
          id="astrology"
          title={language === 'tr' ? 'Astroloji İstatistikleri' : 'Astrology Statistics'}
          icon={Star}
          gradient="bg-gradient-to-r from-indigo-600/40 to-purple-600/30"
        >
          <div className="space-y-4">
            {zodiacInfo ? (
              <>
                <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl p-4 border border-indigo-500/20">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                      <span className="text-3xl">{zodiacInfo.emoji}</span>
                    </div>
                    <div>
                      <p className="text-white/60 text-xs">{language === 'tr' ? 'Güneş Burcun' : 'Your Sun Sign'}</p>
                      <p className="text-white font-bold text-xl">{zodiacInfo[language]}</p>
                      <p className="text-purple-300 text-sm mt-1">
                        {language === 'tr' ? zodiacInfo.trComment : zodiacInfo.enComment}
                      </p>
                    </div>
                  </div>
                </div>

                {risingInfo && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{risingInfo.emoji}</span>
                      <div>
                        <p className="text-white/60 text-xs">{language === 'tr' ? 'Yükselen Burcun' : 'Rising Sign'}</p>
                        <p className="text-white font-medium">{risingInfo[language]}</p>
                      </div>
                    </div>
                  </div>
                )}

                {statistics.user.birthDate && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-purple-400" />
                      <div>
                        <p className="text-white/60 text-xs">{language === 'tr' ? 'Doğum Tarihi' : 'Birth Date'}</p>
                        <p className="text-white font-medium">
                          {format(new Date(statistics.user.birthDate), 'dd MMMM yyyy', { locale: dateLocale })}
                          {statistics.user.birthTime && ` - ${statistics.user.birthTime}`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/60">
                  {language === 'tr' 
                    ? 'Burç bilgin henüz eklenmemiş' 
                    : 'Your zodiac info is not set yet'}
                </p>
                <Link href={`/${language}/settings`} className="text-purple-400 text-sm mt-2 inline-block">
                  {language === 'tr' ? 'Ayarlardan Ekle' : 'Add in Settings'} →
                </Link>
              </div>
            )}
          </div>
        </Section>

        {/* 7. ACHIEVEMENT / BADGE SYSTEM */}
        <Section
          id="achievements"
          title={language === 'tr' ? 'Başarılar & Rozetler' : 'Achievements & Badges'}
          icon={Award}
          gradient="bg-gradient-to-r from-amber-600/40 to-yellow-600/30"
        >
          {achievements && (
            <div className="space-y-4">
              {/* Progress Overview */}
              <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-xl p-4 border border-amber-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-medium">
                    {language === 'tr' ? 'Genel İlerleme' : 'Overall Progress'}
                  </p>
                  <span className="text-amber-300 font-bold">
                    {achievements.completedCount}/{achievements.totalCount}
                  </span>
                </div>
                <ProgressBar progress={achievements.completionPercentage} color="amber" />
                <p className="text-white/50 text-xs mt-2">
                  {language === 'tr' 
                    ? `%${achievements.completionPercentage} tamamlandı`
                    : `${achievements.completionPercentage}% completed`}
                </p>
              </div>

              {/* Achievements by Category */}
              {Object.entries(achievements.categorized).map(([category, categoryAchievements]) => (
                <div key={category} className="bg-white/5 rounded-xl p-4">
                  <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                    {category === 'fortune' && <Sparkles className="h-4 w-4 text-purple-400" />}
                    {category === 'social' && <Users className="h-4 w-4 text-pink-400" />}
                    {category === 'stream' && <Radio className="h-4 w-4 text-red-400" />}
                    {category === 'coin' && <Coins className="h-4 w-4 text-yellow-400" />}
                    {category === 'activity' && <Activity className="h-4 w-4 text-blue-400" />}
                    {language === 'tr' 
                      ? { fortune: 'Fal', social: 'Sosyal', stream: 'Yayın', coin: 'Jeton', activity: 'Aktivite' }[category]
                      : { fortune: 'Fortune', social: 'Social', stream: 'Stream', coin: 'Coin', activity: 'Activity' }[category]
                    }
                  </h5>
                  <div className="space-y-3">
                    {categoryAchievements.map((achievement: Achievement) => (
                      <div
                        key={achievement.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${achievement.isCompleted ? 'bg-amber-500/20' : 'bg-white/5'}`}
                      >
                        <span className="text-2xl">{achievement.icon}</span>
                        <div className="flex-1">
                          <p className={`font-medium ${achievement.isCompleted ? 'text-amber-300' : 'text-white/80'}`}>
                            {language === 'tr' ? achievement.nameTr : achievement.nameEn}
                          </p>
                          <p className="text-white/50 text-xs">
                            {language === 'tr' ? achievement.descriptionTr : achievement.descriptionEn}
                          </p>
                          {!achievement.isCompleted && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-white/50">{achievement.currentProgress}/{achievement.targetValue}</span>
                                <span className="text-white/50">{achievement.progress}%</span>
                              </div>
                              <ProgressBar progress={achievement.progress} color="amber" />
                            </div>
                          )}
                        </div>
                        {achievement.isCompleted && (
                          <div className="text-right">
                            <Medal className="h-6 w-6 text-amber-400" />
                            {achievement.rewardCredits > 0 && (
                              <p className="text-amber-300 text-xs">+{achievement.rewardCredits}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 8. GLOBAL LEADERBOARDS */}
        <Section
          id="leaderboards"
          title={language === 'tr' ? 'Sıralamalar' : 'Leaderboards'}
          icon={Trophy}
          gradient="bg-gradient-to-r from-emerald-600/40 to-teal-600/30"
        >
          {leaderboards && (
            <div className="space-y-4">
              {/* Leaderboard Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                {[
                  { id: 'popularity', label: language === 'tr' ? 'Popüler' : 'Popular', icon: Crown },
                  { id: 'fortune', label: language === 'tr' ? 'Falcı' : 'Fortune', icon: Sparkles },
                  { id: 'streamers', label: language === 'tr' ? 'Yayıncı' : 'Streamers', icon: Radio },
                  { id: 'spenders', label: language === 'tr' ? 'Harcama' : 'Spenders', icon: Coins },
                  { id: 'earners', label: language === 'tr' ? 'Kazanç' : 'Earners', icon: TrendingUp },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveLeaderboard(tab.id)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                      activeLeaderboard === tab.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Leaderboard List */}
              <div className="bg-white/5 rounded-xl overflow-hidden">
                {(() => {
                  const data = {
                    popularity: leaderboards.mostPopular,
                    fortune: leaderboards.topFortuneViewers,
                    streamers: leaderboards.topStreamers,
                    spenders: leaderboards.topSpenders,
                    earners: leaderboards.topEarners
                  }[activeLeaderboard] || []

                  return data.length > 0 ? (
                    data.map((entry, index) => (
                      <Link
                        key={entry.id}
                        href={`/${language}/profile/${entry.username || entry.id}`}
                        className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-300 text-black' :
                          index === 2 ? 'bg-amber-700 text-white' :
                          'bg-white/10 text-white/70'
                        }`}>
                          {entry.rank}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                          {entry.image ? (
                            <img src={entry.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{entry.name}</p>
                          {entry.username && (
                            <p className="text-white/50 text-sm truncate">@{entry.username}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-bold">
                            {entry.followers !== undefined && entry.followers}
                            {entry.count !== undefined && entry.count}
                            {entry.streams !== undefined && entry.streams}
                            {entry.totalSpent !== undefined && entry.totalSpent}
                            {entry.totalEarned !== undefined && entry.totalEarned}
                          </p>
                          <p className="text-white/40 text-xs">
                            {activeLeaderboard === 'popularity' && (language === 'tr' ? 'takipçi' : 'followers')}
                            {activeLeaderboard === 'fortune' && (language === 'tr' ? 'fal' : 'fortunes')}
                            {activeLeaderboard === 'streamers' && (language === 'tr' ? 'yayın' : 'streams')}
                            {activeLeaderboard === 'spenders' && (language === 'tr' ? 'jeton' : 'coins')}
                            {activeLeaderboard === 'earners' && (language === 'tr' ? 'jeton' : 'coins')}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <Trophy className="h-8 w-8 text-white/20 mx-auto mb-2" />
                      <p className="text-white/50">{language === 'tr' ? 'Henüz veri yok' : 'No data yet'}</p>
                    </div>
                  )
                })()}
              </div>

              {/* Current User Rank */}
              {leaderboards.currentUserRanks && (
                <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
                  <p className="text-white/60 text-xs mb-2">{language === 'tr' ? 'Senin Sıralamaların' : 'Your Rankings'}</p>
                  <div className="flex gap-2 flex-wrap">
                    {leaderboards.currentUserRanks.popularity && (
                      <span className="px-2 py-1 bg-white/10 rounded-lg text-sm text-white/80">
                        <Crown className="h-3 w-3 inline mr-1" />
                        #{leaderboards.currentUserRanks.popularity}
                      </span>
                    )}
                    {leaderboards.currentUserRanks.fortune && (
                      <span className="px-2 py-1 bg-white/10 rounded-lg text-sm text-white/80">
                        <Sparkles className="h-3 w-3 inline mr-1" />
                        #{leaderboards.currentUserRanks.fortune}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
