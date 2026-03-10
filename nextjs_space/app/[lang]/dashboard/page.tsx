'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { 
  Coffee, Star, Moon, Sparkles, Calendar, Droplets, Video, Clock, User, 
  ChevronRight, TrendingUp, Heart, Eye, Users, Award, Gem, BarChart3,
  Zap
} from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import { format, formatDistanceToNow } from 'date-fns'
import { tr, enUS } from 'date-fns/locale'
import WatchAdCredits from '@/components/watch-ad-credits'
import Link from 'next/link'

interface Fortune {
  id: string
  fortuneType: string
  aiResponse: string
  createdAt: string
  language: string
  isSaved?: boolean
  isPinned?: boolean
}

interface ActiveSession {
  id: string
  fortuneType: string
  status: string
  createdAt: string
  teller: {
    id: string
    displayName: string
    avatar: string | null
  }
}

interface UserStats {
  user: {
    id: string
    name: string
    joinedAt: string
    zodiacSign: string | null
    risingSign: string | null
    totalTimeSpentMinutes: number
    lastActiveAt: string | null
    credits: number
    membership: string
  }
  stats: {
    totalFortunes: number
    totalPosts: number
    followersCount: number
    followingCount: number
    likesReceived: number
    totalViews: number
    fortunesByType: { type: string; count: number }[]
  }
}

const ZODIAC_INFO: Record<string, { tr: string; en: string; emoji: string; trComment: string; enComment: string }> = {
  aries: { tr: 'Koç', en: 'Aries', emoji: '♈', trComment: 'Cesur ve enerjik bir ruhun var!', enComment: 'You have a brave and energetic spirit!' },
  taurus: { tr: 'Boğa', en: 'Taurus', emoji: '♉', trComment: 'Sabırlı ve güvenilir birisin.', enComment: 'You are patient and reliable.' },
  gemini: { tr: 'İkizler', en: 'Gemini', emoji: '♊', trComment: 'Meraklı ve iletişimci bir yapın var.', enComment: 'You have a curious and communicative nature.' },
  cancer: { tr: 'Yengeç', en: 'Cancer', emoji: '♋', trComment: 'Duygusal ve koruyucu birisin.', enComment: 'You are emotional and protective.' },
  leo: { tr: 'Aslan', en: 'Leo', emoji: '♌', trComment: 'Doğal bir lider ve karizmatiksin!', enComment: 'You are a natural leader and charismatic!' },
  virgo: { tr: 'Başak', en: 'Virgo', emoji: '♍', trComment: 'Detaycı ve analitik bir zekân var.', enComment: 'You have an analytical and detail-oriented mind.' },
  libra: { tr: 'Terazi', en: 'Libra', emoji: '♎', trComment: 'Adaletçi ve diplomatiksin.', enComment: 'You are fair and diplomatic.' },
  scorpio: { tr: 'Akrep', en: 'Scorpio', emoji: '♏', trComment: 'Tutkulusun ve güçlü bir sezgiye sahipsin.', enComment: 'You are passionate with powerful intuition.' },
  sagittarius: { tr: 'Yay', en: 'Sagittarius', emoji: '♐', trComment: 'Maceracı ve iyimser birisin!', enComment: 'You are adventurous and optimistic!' },
  capricorn: { tr: 'Oğlak', en: 'Capricorn', emoji: '♑', trComment: 'Disiplinli ve hedef odaklısın.', enComment: 'You are disciplined and goal-oriented.' },
  aquarius: { tr: 'Kova', en: 'Aquarius', emoji: '♒', trComment: 'Yenilikçi ve bağımsız bir ruhun var.', enComment: 'You have an innovative and independent spirit.' },
  pisces: { tr: 'Balık', en: 'Pisces', emoji: '♓', trComment: 'Hayalperest ve empatiksin.', enComment: 'You are dreamy and empathetic.' }
}

const FORTUNE_NAMES: Record<string, { tr: string; en: string }> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Reading' },
  tarot: { tr: 'Tarot Falı', en: 'Tarot Reading' },
  horoscope: { tr: 'Burç Yorumu', en: 'Horoscope' },
  daily_horoscope: { tr: 'Günlük Burç', en: 'Daily Horoscope' },
  palm: { tr: 'El Falı', en: 'Palm Reading' },
  dream: { tr: 'Rüya Tabiri', en: 'Dream Interpretation' },
  love: { tr: 'Aşk Falı', en: 'Love Reading' },
  numerology: { tr: 'Numeroloji', en: 'Numerology' },
  angel: { tr: 'Melek Kartları', en: 'Angel Cards' },
  aura: { tr: 'Aura Analizi', en: 'Aura Analysis' },
  birthchart: { tr: 'Doğum Haritası', en: 'Birth Chart' },
  yesno: { tr: 'Evet/Hayır', en: 'Yes/No Oracle' },
  katina: { tr: 'Katina Falı', en: 'Katina Reading' },
  kursundokme: { tr: 'Kurşun Dökme', en: 'Lead Pouring' },
  istikhara: { tr: 'İstihare', en: 'Istikhara' }
}

export default function DashboardPage() {
  const { language, t } = useLanguage()
  const [fortunes, setFortunes] = useState<Fortune[]>([])
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFortune, setSelectedFortune] = useState<Fortune | null>(null)

  useEffect(() => {
    fetchFortunes()
    fetchActiveSessions()
    fetchUserStats()
  }, [])

  const fetchFortunes = async () => {
    try {
      const response = await fetch('/api/user/fortunes')
      const data = await response.json()
      setFortunes(data?.fortunes || [])
    } catch (error) {
      console.error('Failed to fetch fortunes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch('/api/user/active-sessions')
      const data = await response.json()
      if (Array.isArray(data)) {
        setActiveSessions(data)
      }
    } catch (error) {
      console.error('Failed to fetch active sessions:', error)
    }
  }

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user/stats')
      const data = await response.json()
      setUserStats(data)
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }

  const getFortuneIcon = (type: string) => {
    switch (type) {
      case 'coffee':
        return <Coffee className="w-6 h-6" />
      case 'tarot':
        return <Star className="w-6 h-6" />
      case 'dream':
        return <Moon className="w-6 h-6" />
      case 'kursundokme':
        return <Droplets className="w-6 h-6" />
      default:
        return <Sparkles className="w-6 h-6" />
    }
  }

  const formatTimeSpent = (minutes: number) => {
    if (minutes < 60) return `${minutes} ${language === 'tr' ? 'dakika' : 'minutes'}`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours < 24) return `${hours} ${language === 'tr' ? 'saat' : 'hours'} ${mins > 0 ? `${mins} ${language === 'tr' ? 'dk' : 'min'}` : ''}`
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days} ${language === 'tr' ? 'gün' : 'days'} ${remainingHours > 0 ? `${remainingHours} ${language === 'tr' ? 'saat' : 'hrs'}` : ''}`
  }

  const zodiacInfo = userStats?.user.zodiacSign ? ZODIAC_INFO[userStats.user.zodiacSign.toLowerCase()] : null

  return (
    <div className="min-h-screen py-20 px-4 bg-[#0a0118]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-gold-400 mb-2">
            {language === 'tr' ? 'Fal Stüdyom' : 'Fortune Studio'}
          </h1>
          <p className="text-purple-300">
            {language === 'tr' ? 'Fal geçmişin ve istatistiklerin' : 'Your fortune history and statistics'}
          </p>
          
          {/* Watch Ad for Credits */}
          <div className="flex justify-center mt-6">
            <WatchAdCredits />
          </div>
        </motion.div>

        {/* Statistics Section */}
        {userStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-xl font-bold text-gold-400 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {language === 'tr' ? 'İstatistiklerim' : 'My Statistics'}
            </h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/30 rounded-xl p-4 border border-purple-700/30">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">{language === 'tr' ? 'Üye Olma' : 'Member Since'}</span>
                </div>
                <p className="text-white font-bold">
                  {format(new Date(userStats.user.joinedAt), 'dd MMM yyyy', { locale: language === 'tr' ? tr : enUS })}
                </p>
                <p className="text-purple-400 text-xs mt-1">
                  {formatDistanceToNow(new Date(userStats.user.joinedAt), { addSuffix: true, locale: language === 'tr' ? tr : enUS })}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/30 rounded-xl p-4 border border-purple-700/30">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs">{language === 'tr' ? 'Toplam Fal' : 'Total Fortunes'}</span>
                </div>
                <p className="text-white font-bold text-2xl">{userStats.stats.totalFortunes}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/30 rounded-xl p-4 border border-purple-700/30">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">{language === 'tr' ? 'Geçirilen Süre' : 'Time Spent'}</span>
                </div>
                <p className="text-white font-bold">{formatTimeSpent(userStats.user.totalTimeSpentMinutes)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/30 rounded-xl p-4 border border-purple-700/30">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <Gem className="w-4 h-4" />
                  <span className="text-xs">{language === 'tr' ? 'Krediler' : 'Credits'}</span>
                </div>
                <p className="text-white font-bold text-2xl">{userStats.user.credits}</p>
              </div>
            </div>

            {/* More Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
              <div className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-700/20">
                <Users className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <p className="text-white font-bold">{userStats.stats.followersCount}</p>
                <p className="text-purple-400 text-[10px]">{language === 'tr' ? 'Takipçi' : 'Followers'}</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-700/20">
                <TrendingUp className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <p className="text-white font-bold">{userStats.stats.followingCount}</p>
                <p className="text-purple-400 text-[10px]">{language === 'tr' ? 'Takip' : 'Following'}</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-700/20">
                <Heart className="w-4 h-4 text-pink-400 mx-auto mb-1" />
                <p className="text-white font-bold">{userStats.stats.likesReceived}</p>
                <p className="text-purple-400 text-[10px]">{language === 'tr' ? 'Beğeni' : 'Likes'}</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-700/20">
                <Eye className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-white font-bold">{userStats.stats.totalViews}</p>
                <p className="text-purple-400 text-[10px]">{language === 'tr' ? 'Görüntülenme' : 'Views'}</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-700/20">
                <Award className="w-4 h-4 text-gold-400 mx-auto mb-1" />
                <p className="text-white font-bold capitalize">{userStats.user.membership}</p>
                <p className="text-purple-400 text-[10px]">{language === 'tr' ? 'Üyelik' : 'Membership'}</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-700/20">
                <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <p className="text-white font-bold">{userStats.stats.totalPosts}</p>
                <p className="text-purple-400 text-[10px]">{language === 'tr' ? 'Paylaşım' : 'Posts'}</p>
              </div>
            </div>

            {/* Zodiac Card */}
            {zodiacInfo && (
              <div className="bg-gradient-to-r from-purple-900/50 via-pink-900/30 to-purple-900/50 rounded-xl p-4 border border-purple-700/30">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{zodiacInfo.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      {language === 'tr' ? zodiacInfo.tr : zodiacInfo.en}
                      {userStats.user.risingSign && (
                        <span className="text-purple-400 text-sm font-normal">
                          ({language === 'tr' ? 'Yükselen' : 'Rising'}: {ZODIAC_INFO[userStats.user.risingSign.toLowerCase()]?.[language as 'tr' | 'en'] || userStats.user.risingSign})
                        </span>
                      )}
                    </h3>
                    <p className="text-purple-300 text-sm mt-1">
                      {language === 'tr' ? zodiacInfo.trComment : zodiacInfo.enComment}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Fortune Breakdown */}
            {userStats.stats.fortunesByType.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-purple-400 mb-2">
                  {language === 'tr' ? 'Fal Dağılımı' : 'Fortune Breakdown'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {userStats.stats.fortunesByType.map(item => (
                    <div
                      key={item.type}
                      className="bg-purple-900/40 rounded-full px-3 py-1.5 flex items-center gap-2 border border-purple-700/30"
                    >
                      <span className="text-sm">
                        {FORTUNE_NAMES[item.type]?.[language as 'tr' | 'en'] || item.type}
                      </span>
                      <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Active Live Sessions Banner */}
        {activeSessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-r from-gold-600/20 to-purple-600/20 border border-gold-500/50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gold-500 mb-4 flex items-center gap-2">
                <Video className="w-6 h-6 animate-pulse" />
                {language === 'tr' ? 'Aktif Canlı Seanslarınız' : 'Your Active Live Sessions'}
              </h2>
              <div className="space-y-3">
                {activeSessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="bg-deep-purple-900/50 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center">
                        {sess.teller.avatar ? (
                          <img
                            src={sess.teller.avatar}
                            alt={sess.teller.displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{sess.teller.displayName}</p>
                        <p className="text-sm text-purple-300 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {language === 'tr' ? 'Seans aktif' : 'Session active'}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/${language}/live-room/${sess.id}`}
                      className="px-6 py-3 bg-gold-600 hover:bg-gold-500 text-black font-bold rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Video className="w-5 h-5" />
                      {language === 'tr' ? 'Odaya Gir' : 'Enter Room'}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* My Fortunes Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-xl font-bold text-gold-400 flex items-center gap-2">
            <Star className="w-5 h-5" />
            {language === 'tr' ? 'Tüm Fallarım' : 'All My Fortunes'}
          </h2>
        </motion.div>

        {isLoading ? (
          <LoadingSpinner message={language === 'tr' ? 'Fallar yükleniyor...' : 'Loading fortunes...'} />
        ) : fortunes?.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-purple-900/20 rounded-2xl border border-purple-700/30">
            <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <p className="text-purple-300 text-lg mb-4">
              {language === 'tr' ? 'Henüz falınız yok' : 'No fortunes yet'}
            </p>
            <Link
              href={`/${language}/fortunes`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-black font-bold rounded-lg transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              {language === 'tr' ? 'Fal Baktır' : 'Get Your Fortune'}
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fortunes?.map((fortune, index) => (
              <motion.div
                key={fortune?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                onClick={() => setSelectedFortune(fortune)}
                className="group cursor-pointer"
              >
                <div className="bg-purple-900/30 border border-purple-700/50 rounded-2xl p-5 hover:border-gold-500/50 transition-all duration-300 h-full relative">
                  {fortune.isPinned && (
                    <div className="absolute top-3 right-3 bg-pink-500 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                      {language === 'tr' ? 'Sabitlendi' : 'Pinned'}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white">
                      {getFortuneIcon(fortune?.fortuneType)}
                    </div>
                    <h3 className="font-semibold text-lg text-white group-hover:text-gold-400 transition-colors">
                      {FORTUNE_NAMES[fortune?.fortuneType]?.[language as 'tr' | 'en'] || t(`fortune.${fortune?.fortuneType}.name`)}
                    </h3>
                  </div>

                  <p className="text-purple-300 text-sm line-clamp-3 mb-4">
                    {fortune?.aiResponse}
                  </p>

                  <div className="flex items-center gap-2 text-purple-400 text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(fortune?.createdAt), 'dd MMM yyyy', { locale: language === 'tr' ? tr : enUS })}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Fortune Detail Modal */}
        {selectedFortune && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedFortune(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-mystical-card border border-mystical rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto mystical-shadow"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="text-gold-500">
                  {getFortuneIcon(selectedFortune?.fortuneType)}
                </div>
                <h2 className="font-serif text-2xl text-gold-400">
                  {FORTUNE_NAMES[selectedFortune?.fortuneType]?.[language as 'tr' | 'en'] || t(`fortune.${selectedFortune?.fortuneType}.name`)}
                </h2>
              </div>

              <div className="prose prose-invert max-w-none mb-6">
                <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap">
                  {selectedFortune?.aiResponse}
                </p>
              </div>

              <div className="flex items-center gap-2 text-deep-purple-400 text-sm mb-6">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(selectedFortune?.createdAt), 'MMMM dd, yyyy', { locale: language === 'tr' ? tr : enUS })}</span>
              </div>

              <button
                onClick={() => setSelectedFortune(null)}
                className="w-full py-3 bg-deep-purple-800 text-gold-400 rounded-lg hover:bg-deep-purple-700 transition-all duration-300 font-medium"
              >
                {language === 'tr' ? 'Kapat' : 'Close'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
