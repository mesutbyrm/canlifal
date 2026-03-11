'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { ChevronRight, Star, Sparkles, Video, Radio, Eye, Heart, Users, Circle, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import HomepageTicker from '@/components/homepage-ticker'

interface LiveTeller {
  id: string
  displayName: string
  avatar: string | null
  rating: number
  totalSessions: number
  isOnline: boolean
  user: {
    name: string
    image: string | null
  }
}

interface LiveStream {
  id: string
  title: string
  description: string | null
  category: string
  status: string
  viewerCount: number
  likeCount: number
  user: {
    id: string
    name: string
    image: string | null
  }
}

interface OnlineUser {
  id: string
  name: string
  image: string | null
  username: string | null
}

interface OnlineData {
  count: number
  users: OnlineUser[]
}

const FORTUNE_CARDS = [
  {
    id: 'coffee',
    nameTr: 'Kahve Falı',
    nameEn: 'Coffee Reading',
    image: 'https://cdn.abacus.ai/images/21ba0a63-b56d-4d57-ba0b-de973fac37bc.png',
    href: '/fortunes/coffee'
  },
  {
    id: 'tarot',
    nameTr: 'Tarot Falı',
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
    nameEn: 'Love Match',
    image: 'https://cdn.abacus.ai/images/63500b4d-2875-46e7-b3ab-720016070d0c.png',
    href: '/fortunes/love'
  },
  {
    id: 'horoscope',
    nameTr: 'Günlük Burç',
    nameEn: 'Daily Horoscope',
    image: 'https://cdn.abacus.ai/images/fc019303-9170-4a35-a30a-9dafbe6cd0bb.png',
    href: '/fortunes/horoscope'
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
    nameTr: 'Aura Okuma',
    nameEn: 'Aura Reading',
    image: '/fortunes/aura.jpg',
    href: '/fortunes/aura'
  },
  {
    id: 'birthchart',
    nameTr: 'Doğum Haritası',
    nameEn: 'Birth Chart',
    image: '/fortunes/birthchart.jpg',
    href: '/fortunes/birthchart'
  },
  {
    id: 'katina',
    nameTr: 'Katina Falı',
    nameEn: 'Katina Cards',
    image: '/fortunes/katina.jpg',
    href: '/fortunes/katina'
  },
  {
    id: 'yesno',
    nameTr: 'Evet/Hayır',
    nameEn: 'Yes/No Oracle',
    image: '/fortunes/yesno.jpg',
    href: '/fortunes/yesno'
  },
  {
    id: 'kursundokme',
    nameTr: 'Kurşun Dökme',
    nameEn: 'Lead Pouring',
    image: '/fortunes/dream.jpg',
    href: '/fortunes/kursundokme'
  },
  {
    id: 'istikhara',
    nameTr: 'İstikhare',
    nameEn: 'Istikhara',
    image: '/fortunes/angel.jpg',
    href: '/fortunes/istikhara'
  },
]

export default function HomePage() {
  const { language } = useLanguage()
  const { data: session } = useSession() || {}
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'fortunes' | 'live'>('fortunes')
  const [liveTellers, setLiveTellers] = useState<LiveTeller[]>([])
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([])
  const [onlineData, setOnlineData] = useState<OnlineData>({ count: 0, users: [] })

  useEffect(() => {
    // Fetch live tellers
    const fetchTellers = async () => {
      try {
        const res = await fetch('/api/fortune-tellers')
        if (res.ok) {
          const data = await res.json()
          setLiveTellers(data.tellers || [])
        }
      } catch (e) {}
    }
    
    // Fetch live streams
    const fetchStreams = async () => {
      try {
        const res = await fetch('/api/video-streams')
        if (res.ok) {
          const data = await res.json()
          setLiveStreams(data || [])
        }
      } catch (e) {}
    }

    // Fetch online users
    const fetchOnlineUsers = async () => {
      try {
        const res = await fetch('/api/users/online')
        if (res.ok) {
          const data = await res.json()
          setOnlineData({ count: data.count || 0, users: data.users || [] })
        }
      } catch (e) {}
    }
    
    fetchTellers()
    fetchStreams()
    fetchOnlineUsers()
    const tellerInterval = setInterval(fetchTellers, 30000)
    const streamInterval = setInterval(fetchStreams, 10000)
    const onlineInterval = setInterval(fetchOnlineUsers, 15000)
    return () => {
      clearInterval(tellerInterval)
      clearInterval(streamInterval)
      clearInterval(onlineInterval)
    }
  }, [])

  // Sort tellers: online first, then offline
  const sortedTellers = [...liveTellers].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1
    if (!a.isOnline && b.isOnline) return 1
    return 0
  })

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Ticker - Scrolling Online/Credits/Gifts - stuck to navbar */}
      <div className="fixed top-14 left-0 right-0 z-40">
        <HomepageTicker />
      </div>

      {/* Last Online Users - below ticker */}
      {onlineData.users.length > 0 && (
        <div className="fixed top-[92px] left-0 right-0 z-30 bg-white/98 border-b border-gray-200 py-2.5 px-4 shadow-sm">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            {/* Online count badge */}
            <div className="flex-shrink-0 flex items-center gap-1.5 bg-green-50 rounded-full px-3 py-1 border border-green-200">
              <Circle className="w-2.5 h-2.5 text-green-500 fill-green-500 animate-pulse" />
              <span className="text-sm font-bold text-green-600">{onlineData.count}</span>
              <span className="text-xs text-green-600/80">{language === 'tr' ? 'çevrimiçi' : 'online'}</span>
            </div>
            
            {/* Separator */}
            <div className="w-px h-5 bg-gray-300 flex-shrink-0" />
            
            {/* User list */}
            {onlineData.users.slice(0, 15).map((user) => (
              <Link
                key={user.id}
                href={`/${language}/profile/${user.id}`}
                className="flex-shrink-0 flex items-center gap-1.5 bg-gray-100 rounded-full px-2.5 py-1 hover:bg-gray-200 transition-colors border border-gray-200"
              >
                <Circle className="w-1.5 h-1.5 text-green-500 fill-green-500" />
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || ''}
                    width={18}
                    height={18}
                    className="w-[18px] h-[18px] rounded-full object-cover"
                  />
                ) : (
                  <div className="w-[18px] h-[18px] rounded-full bg-[#1877f2] flex items-center justify-center">
                    <span className="text-[9px] text-white font-medium">{user.name?.[0]}</span>
                  </div>
                )}
                <span className="text-xs text-gray-700 font-medium">{user.username || user.name?.split(' ')[0]}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="px-4 pb-4 pt-32">
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setActiveTab('fortunes')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'fortunes'
                ? 'bg-[#1877f2] text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Radio className="w-4 h-4" />
            {language === 'tr' ? 'Canlı Yayın' : 'Live Streams'}
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'live'
                ? 'bg-[#1877f2] text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Video className="w-4 h-4" />
            {language === 'tr' ? 'Canlı Falcı' : 'Live Tellers'}
          </button>
        </div>
      </div>

      {activeTab === 'live' ? (
        /* Live Tellers Tab Content */
        <div className="px-4 pb-8">
          {/* Live Tellers Section - Circular Avatars */}
          <div className="mb-8 bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#1877f2]" />
              {language === 'tr' ? 'Canlı Falcılar' : 'Live Fortune Tellers'}
            </h2>

            {/* Horizontal Scroll Circular Teller Avatars - Online first, then Offline */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {sortedTellers.length > 0 ? sortedTellers.map((teller) => (
                <Link
                  key={teller.id}
                  href={`/${language}/live-tellers/${teller.id}`}
                  className="flex-shrink-0 flex flex-col items-center"
                >
                  {/* Circular Avatar with Blue Gradient Border */}
                  <div className="relative">
                    <div className={`w-20 h-20 rounded-full p-[3px] ${teller.isOnline ? 'bg-gradient-to-br from-[#1877f2] to-[#166fe5]' : 'bg-gray-300'}`}>
                      <div className={`w-full h-full rounded-full overflow-hidden bg-white ${!teller.isOnline ? 'opacity-60' : ''}`}>
                        {teller.avatar || teller.user.image ? (
                          <Image
                            src={teller.avatar || teller.user.image || ''}
                            alt={teller.displayName}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#1877f2] to-[#166fe5] flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">
                              {teller.displayName?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Online/Offline indicator */}
                    <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${teller.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                  {/* Name */}
                  <p className={`text-xs font-medium mt-2 text-center w-20 truncate ${teller.isOnline ? 'text-gray-900' : 'text-gray-500'}`}>{teller.displayName}</p>
                  {/* Rating */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className={`w-2.5 h-2.5 ${teller.isOnline ? 'text-[#1877f2] fill-[#1877f2]' : 'text-gray-400 fill-gray-400'}`} />
                    <span className={`text-[10px] ${teller.isOnline ? 'text-[#1877f2]' : 'text-gray-400'}`}>{teller.rating.toFixed(1)}</span>
                  </div>
                </Link>
              )) : (
                <div className="flex-1 py-8 text-center w-full">
                  <p className="text-gray-500 text-sm">
                    {language === 'tr' ? 'Şu an falcı yok' : 'No tellers right now'}
                  </p>
                  <Link
                    href={`/${language}/live-tellers`}
                    className="inline-block mt-3 px-4 py-1.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {language === 'tr' ? 'Tüm Falcıları Gör' : 'See All Tellers'}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Fortune Categories in Live Tab */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1877f2]" />
                {language === 'tr' ? 'Fal Kategorileri' : 'Fortune Categories'}
              </h2>
              <Link href={`/${language}/fortunes`} className="text-[#1877f2] text-sm flex items-center gap-1 hover:underline">
                {language === 'tr' ? 'Tümünü Gör' : 'See All'}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {FORTUNE_CARDS.slice(0, 4).map((card) => (
                <Link key={card.id} href={`/${language}${card.href}`} className="flex-shrink-0 w-32">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <Image
                      src={card.image}
                      alt={language === 'tr' ? card.nameTr : card.nameEn}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <h3 className="text-white font-medium text-xs">{language === 'tr' ? card.nameTr : card.nameEn}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-yellow-400 text-[10px]">5.0</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Live Streams Tab Content */
        <div className="px-4 pb-8">
          {/* Header */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#fa3e3e]" />
              {language === 'tr' ? 'Canlı Yayınlar' : 'Live Streams'}
            </h2>

            {/* Live Streams Row - Start Button + Streams */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {/* Start Stream Button - Circular */}
              <button
                onClick={() => {
                  if (!session?.user) {
                    router.push(`/${language}/login`)
                  } else {
                    router.push(`/${language}/chat/video/setup`)
                  }
                }}
                className="flex-shrink-0 flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-[#1877f2] to-[#166fe5]">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Plus className="w-8 h-8 text-[#1877f2]" />
                  </div>
                </div>
                <p className="text-gray-700 text-xs font-medium mt-2 text-center">
                  {language === 'tr' ? 'Yayın Başlat' : 'Go Live'}
                </p>
              </button>

              {/* Live Streams - Circular Avatars with Red Border */}
              {liveStreams.length > 0 ? (
                liveStreams.map((stream, index) => (
                  <motion.div
                    key={stream.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex-shrink-0 flex flex-col items-center"
                  >
                    <Link href={`/${language}/chat/video?watch=${stream.id}`}>
                      {/* Circular Avatar with Red Animated Border */}
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-[#fa3e3e] to-[#ff6b6b] animate-pulse">
                          <div className="w-full h-full rounded-full overflow-hidden bg-white p-[2px]">
                            <div className="w-full h-full rounded-full overflow-hidden">
                              {stream.user.image ? (
                                <Image
                                  src={stream.user.image}
                                  alt={stream.user.name}
                                  width={80}
                                  height={80}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#1877f2] to-[#166fe5] flex items-center justify-center">
                                  <span className="text-xl font-bold text-white">
                                    {stream.user.name?.[0]?.toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* CANLI Badge */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                          <span className="bg-[#fa3e3e] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-lg">
                            <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                            CANLI
                          </span>
                        </div>
                      </div>
                      {/* Name */}
                      <p className="text-gray-700 text-xs font-medium mt-2 text-center w-20 truncate">{stream.user.name}</p>
                    </Link>
                  </motion.div>
                ))
              ) : (
                <div className="flex items-center pl-4">
                  <p className="text-gray-500 text-sm">
                    {language === 'tr' ? 'Henüz canlı yayın yok' : 'No live streams yet'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Fortune Types - Circular Icons */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#1877f2]" />
              {language === 'tr' ? 'Fallar' : 'Fortunes'}
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {FORTUNE_CARDS.map((fortune) => (
                <Link
                  key={fortune.id}
                  href={`/${language}${fortune.href}`}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-[#1877f2] to-[#166fe5] shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-full h-full rounded-full overflow-hidden">
                      <Image
                        src={fortune.image}
                        alt={language === 'tr' ? fortune.nameTr : fortune.nameEn}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <p className="text-gray-700 text-[10px] font-medium mt-1.5 text-center w-16 leading-tight">
                    {language === 'tr' ? fortune.nameTr : fortune.nameEn}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
