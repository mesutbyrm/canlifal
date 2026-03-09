'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { ChevronRight, Star, Sparkles, Video, Radio, Eye, Heart, Users, Circle, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
]

export default function HomePage() {
  const { language } = useLanguage()
  const { data: session } = useSession() || {}
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'fortunes' | 'live'>('fortunes')
  const [liveTellers, setLiveTellers] = useState<LiveTeller[]>([])
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])

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
          setOnlineUsers(data.users || [])
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

  const onlineTellers = liveTellers.filter(t => t.isOnline)

  return (
    <div className="min-h-screen bg-[#0a0118]">
      {/* Online Users Section - Always on top */}
      {onlineUsers.length > 0 && (
        <div className="pt-20 px-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="relative">
                <Users className="w-5 h-5 text-green-500" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              {language === 'tr' ? 'Çevrimiçi' : 'Online'}
              <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                {onlineUsers.length}
              </span>
            </h2>
          </div>

          {/* Horizontal Scroll Online Users */}
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
            {onlineUsers.slice(0, 20).map((user) => (
              <Link
                key={user.id}
                href={`/${language}/profile/${user.username || user.id}`}
                className="flex-shrink-0 flex flex-col items-center"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-br from-green-400 to-emerald-600">
                    <div className="w-full h-full rounded-full bg-[#0a0118] p-0.5">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        {user.image ? (
                          <Image
                            src={user.image}
                            alt={user.name || ''}
                            width={52}
                            height={52}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-white">
                            {user.name?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Online indicator */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0118]" />
                </div>
                <span className="text-white text-[10px] mt-1.5 text-center max-w-[56px] truncate">
                  {user.name?.split(' ')[0]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Live Streams Section */}
      {liveStreams.length > 0 && (
        <div className={`${onlineUsers.length > 0 ? 'pt-2' : 'pt-20'} px-4 pb-2`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="relative">
                <Radio className="w-5 h-5 text-red-500" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              {language === 'tr' ? 'Canlı Yayınlar' : 'Live Streams'}
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                {liveStreams.length}
              </span>
            </h2>
            <Link href={`/${language}/chat/video`} className="text-purple-400 text-sm flex items-center gap-1">
              {language === 'tr' ? 'Tümü' : 'All'}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Horizontal Scroll Live Streams - Circular Avatars with Rainbow Border */}
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
            {liveStreams.map((stream) => (
              <Link
                key={stream.id}
                href={`/${language}/chat/video?watch=${stream.id}`}
                className="flex-shrink-0 flex flex-col items-center"
              >
                {/* Circular Avatar with Rainbow Animated Border */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full p-[3px] rainbow-border">
                    <div className="w-full h-full rounded-full overflow-hidden bg-[#0a0118] p-[2px]">
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
                          <div className="w-full h-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center">
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
                    <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-lg">
                      <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                      CANLI
                    </span>
                  </div>
                </div>
                {/* Name */}
                <p className="text-white text-[10px] font-medium mt-2 text-center w-20 truncate">{stream.user.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={`${(onlineUsers.length > 0 || liveStreams.length > 0) ? 'pt-2' : 'pt-20'} px-4 pb-4`}>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setActiveTab('fortunes')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
              activeTab === 'fortunes'
                ? 'bg-gradient-to-r from-red-600/30 to-pink-600/30 border-2 border-red-400/50 text-white'
                : 'bg-transparent border-2 border-purple-900/50 text-purple-400'
            }`}
          >
            <Radio className="w-4 h-4" />
            {language === 'tr' ? 'Canlı Yayın' : 'Live Streams'}
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
              activeTab === 'live'
                ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-2 border-pink-400/50 text-white'
                : 'bg-transparent border-2 border-purple-900/50 text-purple-400'
            }`}
          >
            <Video className="w-4 h-4" />
            {language === 'tr' ? 'Canlı Fallar' : 'Live Fortunes'}
          </button>
        </div>
      </div>

      {activeTab === 'live' ? (
        /* Live Tellers Tab Content */
        <div className="px-4 pb-8">
          {/* Live Tellers Section - Circular Avatars */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-400" />
              {language === 'tr' ? 'Canlı Falcılar' : 'Live Fortune Tellers'}
            </h2>

            {/* Horizontal Scroll Circular Teller Avatars */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {onlineTellers.length > 0 ? onlineTellers.map((teller) => (
                <Link
                  key={teller.id}
                  href={`/${language}/live-tellers/${teller.id}`}
                  className="flex-shrink-0 flex flex-col items-center"
                >
                  {/* Circular Avatar with Purple Gradient Border */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600">
                      <div className="w-full h-full rounded-full overflow-hidden bg-[#0a0118]">
                        {teller.avatar || teller.user.image ? (
                          <Image
                            src={teller.avatar || teller.user.image || ''}
                            alt={teller.displayName}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">
                              {teller.displayName?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Online indicator */}
                    <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0a0118]" />
                  </div>
                  {/* Name */}
                  <p className="text-white text-xs font-medium mt-2 text-center w-20 truncate">{teller.displayName}</p>
                  {/* Rating */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-2.5 h-2.5 text-gold-400 fill-gold-400" />
                    <span className="text-gold-400 text-[10px]">{teller.rating.toFixed(1)}</span>
                  </div>
                </Link>
              )) : (
                <div className="flex-1 py-8 text-center w-full">
                  <p className="text-purple-400 text-sm">
                    {language === 'tr' ? 'Şu an canlı falcı yok' : 'No live tellers right now'}
                  </p>
                  <Link
                    href={`/${language}/live-tellers`}
                    className="inline-block mt-3 px-4 py-1.5 bg-purple-600 text-white rounded-full text-xs font-medium"
                  >
                    {language === 'tr' ? 'Tüm Falcıları Gör' : 'See All Tellers'}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Fortune Categories in Live Tab */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-400" />
                {language === 'tr' ? 'Fal Kategorileri' : 'Fortune Categories'}
              </h2>
              <Link href={`/${language}/fortunes`} className="text-purple-400 text-sm flex items-center gap-1">
                {language === 'tr' ? 'Tümünü Gör' : 'See All'}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {FORTUNE_CARDS.slice(0, 4).map((card) => (
                <Link key={card.id} href={`/${language}${card.href}`} className="flex-shrink-0 w-32">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-purple-900/30">
                    <Image
                      src={card.image}
                      alt={language === 'tr' ? card.nameTr : card.nameEn}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <h3 className="text-white font-medium text-xs">{language === 'tr' ? card.nameTr : card.nameEn}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-2.5 h-2.5 text-gold-400 fill-gold-400" />
                        <span className="text-gold-400 text-[10px]">5.0</span>
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
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-orange-500" />
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
              <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600">
                <div className="w-full h-full rounded-full bg-[#0a0118] flex items-center justify-center">
                  <Plus className="w-8 h-8 text-white/80" />
                </div>
              </div>
              <p className="text-white text-xs font-medium mt-2 text-center">
                {language === 'tr' ? 'Yayın Başlat' : 'Go Live'}
              </p>
            </button>

            {/* Live Streams - Circular Avatars with Rainbow Border */}
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
                    {/* Circular Avatar with Rainbow Animated Border */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full p-[3px] rainbow-border">
                        <div className="w-full h-full rounded-full overflow-hidden bg-[#0a0118] p-[2px]">
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
                              <div className="w-full h-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center">
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
                        <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-lg">
                          <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                          CANLI
                        </span>
                      </div>
                    </div>
                    {/* Name */}
                    <p className="text-white text-xs font-medium mt-2 text-center w-20 truncate">{stream.user.name}</p>
                  </Link>
                </motion.div>
              ))
            ) : (
              <div className="flex items-center pl-4">
                <p className="text-purple-400/60 text-sm">
                  {language === 'tr' ? 'Henüz canlı yayın yok' : 'No live streams yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
