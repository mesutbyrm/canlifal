'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Coins, User, ChevronRight, Star, Video, Sparkles, Calendar, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface UserCredits {
  credits: number
}

interface LiveTeller {
  id: string
  displayName: string
  avatar: string | null
  isOnline: boolean
  rating: number
  specialties: string[]
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
  const [credits, setCredits] = useState<number>(0)
  const [greeting, setGreeting] = useState('')
  const [liveTellers, setLiveTellers] = useState<LiveTeller[]>([])
  const [horoscope, setHoroscope] = useState<DailyHoroscope | null>(null)
  const [horoscopeLoading, setHoroscopeLoading] = useState(false)
  const [horoscopeExpanded, setHoroscopeExpanded] = useState(false)

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

    // Fetch online tellers
    fetch('/api/fortune-tellers')
      .then(res => res.json())
      .then(data => {
        if (data.tellers) {
          const online = data.tellers.filter((t: LiveTeller) => t.isOnline).slice(0, 4)
          setLiveTellers(online)
        }
      })
      .catch(() => {})
  }, [session, language])

  const featuredCard = FORTUNE_CARDS.find(c => c.featured)
  const regularCards = FORTUNE_CARDS.filter(c => !c.featured)

  const userName = session?.user?.name?.split(' ')[0] || (language === 'tr' ? 'Misafir' : 'Guest')

  return (
    <div className="min-h-screen bg-[#0a0118]">
      {/* Greeting Section */}
      <div className="pt-20 px-4 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-semibold text-white"
        >
          {greeting}, <span className="text-gold-400">{userName}</span>!
        </motion.h1>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8 space-y-4">
        {/* Daily Horoscope for logged-in users with zodiac */}
        {session?.user && horoscope?.hasZodiac && horoscope.horoscope && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-900/50 to-pink-900/30 rounded-2xl border border-purple-500/30 overflow-hidden"
          >
            <button
              onClick={() => setHoroscopeExpanded(!horoscopeExpanded)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{horoscope.zodiacEmoji}</span>
                <div>
                  <h3 className="text-white font-semibold">
                    {language === 'tr' ? 'Günlük Burcunuz' : 'Your Daily Horoscope'}
                  </h3>
                  <p className="text-purple-300 text-sm">
                    {horoscope.zodiacName} {horoscope.risingName && `• ${language === 'tr' ? 'Yükselen' : 'Rising'}: ${horoscope.risingName}`}
                  </p>
                </div>
              </div>
              {horoscopeExpanded ? <ChevronUp className="w-5 h-5 text-purple-300" /> : <ChevronDown className="w-5 h-5 text-purple-300" />}
            </button>
            <AnimatePresence>
              {horoscopeExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4"
                >
                  <p className="text-purple-200 text-sm leading-relaxed whitespace-pre-line">
                    {horoscope.horoscope}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Prompt to add birth date */}
        {session?.user && horoscope && !horoscope.hasZodiac && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-gold-600/20 to-purple-600/20 rounded-2xl p-4 border border-gold-500/30"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-gold-400" />
              <div className="flex-1">
                <p className="text-white font-medium">
                  {language === 'tr' ? 'Günlük burç yorumunuzu görün!' : 'See your daily horoscope!'}
                </p>
                <p className="text-purple-300 text-sm">
                  {language === 'tr' ? 'Doğum tarihinizi girin' : 'Add your birth date'}
                </p>
              </div>
              <Link href={`/${language}/settings`} className="px-4 py-2 bg-gold-500 text-black rounded-lg text-sm font-medium hover:bg-gold-400">
                {language === 'tr' ? 'Ekle' : 'Add'}
              </Link>
            </div>
          </motion.div>
        )}

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

        {/* Live Fortune Tellers */}
        {liveTellers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-2xl p-4 border border-purple-500/20"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h3 className="text-white font-medium">
                  {language === 'tr' ? 'Canlı Falcılar' : 'Live Fortune Tellers'}
                </h3>
              </div>
              <Link 
                href={`/${language}/live-tellers`}
                className="text-gold-400 text-sm flex items-center gap-1 hover:text-gold-300"
              >
                {language === 'tr' ? 'Tümü' : 'All'}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {liveTellers.map((teller) => (
                <Link
                  key={teller.id}
                  href={`/${language}/live-tellers/${teller.id}`}
                  className="flex-shrink-0"
                >
                  <div className="w-16 text-center">
                    <div className="relative">
                      <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-pink-600 p-0.5">
                        <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                          {teller.avatar ? (
                            <Image
                              src={teller.avatar}
                              alt={teller.displayName}
                              width={56}
                              height={56}
                              className="object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#0a0118] flex items-center justify-center">
                        <Video className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <p className="text-white text-xs mt-2 truncate">{teller.displayName.split(' ')[0]}</p>
                    <div className="flex items-center justify-center gap-0.5">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-yellow-400 text-xs">{teller.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
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
