'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Coins, ChevronRight, Star, Sparkles, Calendar, ChevronDown, ChevronUp, Loader2, Radio, Plus, Eye, Heart, Banknote, Briefcase, Smile, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UserCredits {
  credits: number
}

interface LiveStream {
  id: string
  title: string | null
  viewerCount: number
  likeCount: number
  user: {
    id: string
    name: string
    image: string | null
  }
}

interface DailyStats {
  luck: number
  love: number
  money: number
  career: number
  mood: string
}

interface DailyHoroscope {
  hasZodiac: boolean
  zodiacSign?: string
  zodiacName?: string
  zodiacEmoji?: string
  risingSign?: string
  risingName?: string
  horoscope?: string
  date?: string
  message?: string
  stats?: DailyStats
  personalGreeting?: string
  userName?: string
}

const FORTUNE_CARDS = [
  {
    id: 'horoscope',
    nameTr: 'Günlük Burç',
    nameEn: 'Daily Astrology',
    image: 'https://cdn.abacus.ai/images/fc019303-9170-4a35-a30a-9dafbe6cd0bb.png',
    featured: true,
    href: '/fortunes/horoscope'
  },
  {
    id: 'coffee',
    nameTr: 'Kahve Falı',
    nameEn: 'Coffee Reading',
    image: 'https://cdn.abacus.ai/images/21ba0a63-b56d-4d57-ba0b-de973fac37bc.png',
    href: '/fortunes/coffee'
  },
  {
    id: 'tarot',
    nameTr: 'Tarot Kartları',
    nameEn: 'Tarot Cards',
    image: 'https://cdn.abacus.ai/images/ca544a3b-1bab-4e8d-b59b-74c1c45f1a5a.png',
    href: '/fortunes/tarot'
  },
  {
    id: 'palm',
    nameTr: 'El Falı',
    nameEn: 'Palm Reading',
    image: 'https://cdn.abacus.ai/images/b4f2cb29-d97d-45c0-bac0-a1b0defc320b.png',
    href: '/fortunes/palm'
  },
  {
    id: 'dream',
    nameTr: 'Rüya Tabiri',
    nameEn: 'Dream Reading',
    image: 'https://cdn.abacus.ai/images/087f00ec-3e0e-4330-be79-a7d11efdf65b.png',
    href: '/fortunes/dream'
  },
  {
    id: 'love',
    nameTr: 'Aşk Uyumu',
    nameEn: 'Love Compatibility',
    image: 'https://cdn.abacus.ai/images/63500b4d-2875-46e7-b3ab-720016070d0c.png',
    href: '/fortunes/love'
  },
  {
    id: 'numerology',
    nameTr: 'Numeroloji',
    nameEn: 'Numerology',
    image: 'https://cdn.abacus.ai/images/f16750b2-d611-45af-a2ec-bb912ea71c80.png',
    href: '/fortunes/numerology'
  },
  {
    id: 'angel',
    nameTr: 'Melek Kartları',
    nameEn: 'Angel Cards',
    image: 'https://cdn.abacus.ai/images/2983a121-7c1b-4d68-9d58-753b8bec3f5c.png',
    href: '/fortunes/angel'
  },
  {
    id: 'aura',
    nameTr: 'Aura Analizi',
    nameEn: 'Aura Analysis',
    image: 'https://cdn.abacus.ai/images/d45f5819-c02f-4c71-824b-75becf19fd67.png',
    href: '/fortunes/aura'
  },
  {
    id: 'birthchart',
    nameTr: 'Doğum Haritası',
    nameEn: 'Birth Chart',
    image: 'https://cdn.abacus.ai/images/0e67143d-adca-46a8-abd8-f83c6f30865f.png',
    href: '/fortunes/birthchart'
  },
  {
    id: 'yesno',
    nameTr: 'Evet/Hayır',
    nameEn: 'Yes/No Oracle',
    image: 'https://cdn.abacus.ai/images/8a4a15b9-d45e-41f5-9d21-a321de12cb83.png',
    href: '/fortunes/yesno'
  },
  {
    id: 'katina',
    nameTr: 'Katina Falı',
    nameEn: 'Katina Reading',
    image: 'https://cdn.abacus.ai/images/50d437f2-1ebd-4bf9-bcab-e3b38755a79a.png',
    href: '/fortunes/katina'
  },
]

export default function HomePage() {
  const { language } = useLanguage()
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [credits, setCredits] = useState<number>(0)
  const [greeting, setGreeting] = useState('')
  const [horoscope, setHoroscope] = useState<DailyHoroscope | null>(null)
  const [horoscopeLoading, setHoroscopeLoading] = useState(false)
  const [horoscopeExpanded, setHoroscopeExpanded] = useState(false)
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([])

  useEffect(() => {
    // Set greeting based on time
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting(language === 'tr' ? 'Günaydın' : 'Good morning')
    } else if (hour < 18) {
      setGreeting(language === 'tr' ? 'İyi günler' : 'Good afternoon')
    } else {
      setGreeting(language === 'tr' ? 'İyi akşamlar' : 'Good evening')
    }
  }, [language])

  useEffect(() => {
    // Fetch live streams
    const fetchLiveStreams = async () => {
      try {
        const res = await fetch('/api/video-streams')
        if (res.ok) {
          setLiveStreams(await res.json())
        }
      } catch (e) {}
    }
    fetchLiveStreams()
    const interval = setInterval(fetchLiveStreams, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleStartStream = () => {
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
    router.push(`/${language}/chat/video/setup`)
  }

  const handleWatchStream = () => {
    router.push(`/${language}/chat/video`)
  }

  useEffect(() => {
    if (session?.user) {
      fetch('/api/user/credits')
        .then(res => res.json())
        .then(data => setCredits(data.credits || 0))
        .catch(() => {})
      
      // Fetch daily horoscope
      setHoroscopeLoading(true)
      fetch(`/api/horoscope/daily?lang=${language}`)
        .then(res => res.json())
        .then(data => setHoroscope(data))
        .catch(() => {})
        .finally(() => setHoroscopeLoading(false))
    }


  }, [session, language])

  const featuredCard = FORTUNE_CARDS.find(c => c.featured)
  const regularCards = FORTUNE_CARDS.filter(c => !c.featured)

  const userName = session?.user?.name?.split(' ')[0] || (language === 'tr' ? 'Misafir' : 'Guest')

  return (
    <div className="min-h-screen bg-[#0a0118]">
      {/* Live Streams Section - Above Greeting */}
      <div className="pt-20 px-4 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" />
            {language === 'tr' ? 'Canlı Yayınlar' : 'Live Streams'}
          </h2>
          
          {/* Stories Style Scroll */}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {/* Start Stream Button */}
            <button
              onClick={handleStartStream}
              className="flex-shrink-0 flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 p-0.5">
                <div className="w-full h-full rounded-full bg-[#0a0118] flex items-center justify-center">
                  <Plus className="w-8 h-8 text-white" />
                </div>
              </div>
              <span className="text-white text-xs mt-2 text-center max-w-[80px] truncate">
                {language === 'tr' ? 'Yayın Başlat' : 'Go Live'}
              </span>
            </button>

            {/* Live Streamers */}
            {liveStreams.map((stream) => (
              <button
                key={stream.id}
                onClick={handleWatchStream}
                className="flex-shrink-0 flex flex-col items-center transition-transform hover:scale-105"
              >
                <div className="relative">
                  {/* Rainbow border animation */}
                  <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 animate-pulse">
                    <div className="w-full h-full rounded-full bg-[#0a0118] p-0.5">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        {stream.user.image ? (
                          <Image
                            src={stream.user.image}
                            alt={stream.user.name}
                            width={72}
                            height={72}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-white">
                            {stream.user.name?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* CANLI badge */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">
                    CANLI
                  </div>
                </div>
                <span className="text-white text-xs mt-3 text-center max-w-[80px] truncate">
                  {stream.user.name}
                </span>
                <span className="text-purple-400 text-[10px] flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {stream.viewerCount}
                </span>
              </button>
            ))}

            {liveStreams.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-4">
                <p className="text-purple-400/60 text-sm">
                  {language === 'tr' ? 'Henüz canlı yayın yok' : 'No live streams yet'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Personalized Greeting Section */}
      <div className="px-4 pb-4">
        {session?.user && horoscope?.hasZodiac && horoscope.stats ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Greeting Header */}
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-bold text-white flex items-center gap-2"
              >
                {greeting}, <span className="text-gold-400">{userName}</span> ✨
              </motion.h1>
              <p className="text-purple-300 text-sm mt-1 leading-relaxed">
                {horoscope.personalGreeting}
              </p>
            </div>

            {/* Daily Stats Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-gold-400" />
                <span className="text-gold-400 text-xs font-semibold uppercase tracking-wider">
                  {language === 'tr' ? 'Güne Özel Ücretsiz Günlük Fal' : 'Free Daily Fortune'}
                </span>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-5 gap-2">
                {/* Luck */}
                <div className="bg-purple-800/40 rounded-xl p-2 text-center">
                  <div className="text-2xl mb-1">🍀</div>
                  <div className="text-white text-xs font-medium">{language === 'tr' ? 'Şans' : 'Luck'}</div>
                  <div className="text-gold-400 text-sm font-bold">%{horoscope.stats.luck}</div>
                </div>
                {/* Love */}
                <div className="bg-pink-800/40 rounded-xl p-2 text-center">
                  <div className="text-2xl mb-1">💖</div>
                  <div className="text-white text-xs font-medium">{language === 'tr' ? 'Aşk' : 'Love'}</div>
                  <div className="text-pink-400 text-sm font-bold">%{horoscope.stats.love}</div>
                </div>
                {/* Money */}
                <div className="bg-green-800/40 rounded-xl p-2 text-center">
                  <div className="text-2xl mb-1">💰</div>
                  <div className="text-white text-xs font-medium">{language === 'tr' ? 'Para' : 'Money'}</div>
                  <div className="text-green-400 text-sm font-bold">%{horoscope.stats.money}</div>
                </div>
                {/* Career */}
                <div className="bg-blue-800/40 rounded-xl p-2 text-center">
                  <div className="text-2xl mb-1">💼</div>
                  <div className="text-white text-xs font-medium">{language === 'tr' ? 'Kariyer' : 'Career'}</div>
                  <div className="text-blue-400 text-sm font-bold">%{horoscope.stats.career}</div>
                </div>
                {/* Mood */}
                <div className="bg-yellow-800/40 rounded-xl p-2 text-center">
                  <div className="text-2xl mb-1">{horoscope.stats.mood}</div>
                  <div className="text-white text-xs font-medium">{language === 'tr' ? 'Ruh Hali' : 'Mood'}</div>
                  <div className="text-yellow-400 text-sm font-bold">
                    {horoscope.stats.luck > 80 ? '😊' : horoscope.stats.luck > 60 ? '🙂' : '😌'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setHoroscopeExpanded(!horoscopeExpanded)}
                className="w-full py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg"
              >
                <Star className="w-5 h-5" />
                {language === 'tr' ? 'Günlük Falını Aç' : 'Open Daily Fortune'}
              </button>
              <div className="flex gap-2">
                <Link
                  href={`/${language}/fortunes/horoscope`}
                  className="flex-1 py-2.5 bg-purple-600/50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 hover:bg-purple-600/70 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  {language === 'tr' ? 'Detaylı Astro Yorum' : 'Detailed Astro'}
                </Link>
                <Link
                  href={`/${language}/fortunes/tarot`}
                  className="flex-1 py-2.5 bg-pink-600/50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 hover:bg-pink-600/70 transition-all"
                >
                  🃏 {language === 'tr' ? 'Bugünkü Kartını Çek' : 'Draw Today\'s Card'}
                </Link>
              </div>
            </div>

            {/* Expandable Horoscope Content */}
            <AnimatePresence>
              {horoscopeExpanded && horoscope.horoscope && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-purple-900/30 rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{horoscope.zodiacEmoji}</span>
                    <div>
                      <h3 className="text-white font-semibold text-sm">
                        {horoscope.zodiacName} {horoscope.risingName && `• ${language === 'tr' ? 'Yükselen' : 'Rising'}: ${horoscope.risingName}`}
                      </h3>
                    </div>
                  </div>
                  <p className="text-purple-200 text-sm leading-relaxed whitespace-pre-line">
                    {horoscope.horoscope}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : session?.user && horoscope && !horoscope.hasZodiac ? (
          /* Prompt to add birth date */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold text-white flex items-center gap-2"
            >
              {greeting}, <span className="text-gold-400">{userName}</span> ✨
            </motion.h1>
            
            <div className="bg-gold-500/10 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-gold-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">
                    {language === 'tr' ? 'Kişisel falını görmek ister misin?' : 'Want to see your personal fortune?'}
                  </p>
                  <p className="text-purple-300 text-sm">
                    {language === 'tr' ? 'Doğum tarihini ekle, günlük şans oranlarını gör!' : 'Add your birth date to see daily luck rates!'}
                  </p>
                </div>
              </div>
              <Link 
                href={`/${language}/settings`} 
                className="mt-3 w-full py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:from-gold-400 hover:to-gold-500 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                {language === 'tr' ? 'Doğum Tarihini Ekle' : 'Add Birth Date'}
              </Link>
            </div>
          </motion.div>
        ) : (
          /* Non-logged in greeting */
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-semibold text-white"
          >
            {greeting}, <span className="text-gold-400">{userName}</span>!
          </motion.h1>
        )}
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8 space-y-4">

        {/* Featured Card - Daily Astrology */}
        {featuredCard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link href={`/${language}${featuredCard.href}`}>
              <div className="relative h-44 md:h-56 rounded-2xl overflow-hidden group">
                <Image
                  src={featuredCard.image}
                  alt={language === 'tr' ? featuredCard.nameTr : featuredCard.nameEn}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <h2 className="text-xl md:text-2xl font-semibold text-white">
                    {language === 'tr' ? featuredCard.nameTr : featuredCard.nameEn}
                  </h2>
                </div>
                <div className="absolute top-4 right-4">
                  <Sparkles className="w-6 h-6 text-gold-400" />
                </div>
              </div>
            </Link>
          </motion.div>
        )}



        {/* Fortune Cards Grid */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {regularCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <Link href={`/${language}${card.href}`}>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden group bg-gray-900">
                  <Image
                    src={card.image}
                    alt={language === 'tr' ? card.nameTr : card.nameEn}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-white font-medium text-sm md:text-base">
                      {language === 'tr' ? card.nameTr : card.nameEn}
                    </h3>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* More Fortunes Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center pt-4"
        >
          <Link
            href={`/${language}/fortunes`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            {language === 'tr' ? 'Tüm Fallar' : 'All Fortunes'}
            <ChevronRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}