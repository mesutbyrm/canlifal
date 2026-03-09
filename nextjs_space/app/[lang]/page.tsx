'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { ChevronRight, Star, Sparkles, Video, Radio, Eye, Heart } from 'lucide-react'
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
    
    fetchTellers()
    fetchStreams()
    const tellerInterval = setInterval(fetchTellers, 30000)
    const streamInterval = setInterval(fetchStreams, 10000)
    return () => {
      clearInterval(tellerInterval)
      clearInterval(streamInterval)
    }
  }, [])

  const onlineTellers = liveTellers.filter(t => t.isOnline)

  return (
    <div className="min-h-screen bg-[#0a0118]">
      {/* Live Streams Section - Always on top */}
      {liveStreams.length > 0 && (
        <div className="pt-20 px-4 pb-2">
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

          {/* Horizontal Scroll Live Streams */}
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
            {liveStreams.map((stream) => (
              <Link
                key={stream.id}
                href={`/${language}/chat/video?watch=${stream.id}`}
                className="flex-shrink-0 w-36"
              >
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-red-900/60 to-pink-900/40 p-[2px]">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-pink-500/20 to-red-500/20 rounded-2xl animate-pulse" />
                  <div className="relative bg-[#0a0118]/90 rounded-2xl overflow-hidden">
                    {/* CANLI Badge */}
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                      <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        CANLI
                      </span>
                    </div>
                    
                    {/* User Image */}
                    <div className="aspect-[3/4] relative">
                      {stream.user.image ? (
                        <Image
                          src={stream.user.image}
                          alt={stream.user.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center">
                          <span className="text-3xl font-bold text-white">
                            {stream.user.name?.[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    </div>

                    {/* Stream Info */}
                    <div className="p-2 -mt-12 relative z-10">
                      <h3 className="text-white font-bold text-xs truncate">{stream.user.name}</h3>
                      <p className="text-purple-300 text-[10px] truncate mt-0.5">{stream.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-400 text-[10px]">{stream.viewerCount}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Heart className="w-3 h-3 text-red-400" fill="currentColor" />
                          <span className="text-red-400 text-[10px]">{stream.likeCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={`${liveStreams.length > 0 ? 'pt-2' : 'pt-20'} px-4 pb-4`}>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setActiveTab('fortunes')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
              activeTab === 'fortunes'
                ? 'bg-transparent border-2 border-purple-400/50 text-white'
                : 'bg-transparent border-2 border-purple-900/50 text-purple-400'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {language === 'tr' ? 'Fallar' : 'Fortunes'}
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
          {/* Live Tellers Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-400" />
              {language === 'tr' ? 'Canlı Falcılar' : 'Live Fortune Tellers'}
            </h2>
            <p className="text-purple-300 text-sm mb-4">
              {language === 'tr' 
                ? 'Falcılarla canlı yayına başla, hemen fal baktır!' 
                : 'Start a live session with fortune tellers!'}
            </p>

            {/* Horizontal Scroll Teller Cards */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {onlineTellers.length > 0 ? onlineTellers.map((teller) => (
                <Link
                  key={teller.id}
                  href={`/${language}/live-tellers/${teller.id}`}
                  className="flex-shrink-0 w-44"
                >
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-purple-900/60 to-pink-900/40 p-[2px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-500/20 rounded-2xl" />
                    <div className="relative bg-[#0a0118]/90 rounded-2xl overflow-hidden">
                      {/* CANLI Badge */}
                      <div className="absolute top-3 left-3 z-10">
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                          CANLI
                        </span>
                      </div>
                      
                      {/* Teller Image */}
                      <div className="aspect-[3/4] relative">
                        {teller.avatar || teller.user.image ? (
                          <Image
                            src={teller.avatar || teller.user.image || ''}
                            alt={teller.displayName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                            <span className="text-4xl font-bold text-white">
                              {teller.displayName?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      </div>

                      {/* Teller Info */}
                      <div className="p-3 -mt-12 relative z-10">
                        <h3 className="text-white font-bold text-sm truncate">{teller.displayName}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
                          <span className="text-gold-400 text-xs font-semibold">{teller.rating.toFixed(1)}</span>
                          <span className="text-purple-400 text-xs">• {teller.totalSessions >= 1000 ? `${(teller.totalSessions / 1000).toFixed(1)}K` : teller.totalSessions}</span>
                        </div>
                        
                        {/* Connect Button */}
                        <button className="mt-2 w-full py-2 bg-green-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-green-400 transition-all">
                          <Video className="w-3 h-3" />
                          {language === 'tr' ? 'Bağlan' : 'Connect'}
                        </button>

                        {/* Gift Icons */}
                        <div className="flex justify-center gap-1 mt-2">
                          <span className="text-lg">💝</span>
                          <span className="text-lg">👑</span>
                          <span className="text-lg">🎁</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )) : (
                <div className="flex-1 py-12 text-center w-full">
                  <p className="text-purple-400">
                    {language === 'tr' ? 'Şu an canlı falcı yok' : 'No live tellers right now'}
                  </p>
                  <Link
                    href={`/${language}/live-tellers`}
                    className="inline-block mt-4 px-6 py-2 bg-purple-600 text-white rounded-full text-sm font-medium"
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
        /* Fortunes Tab Content */
        <div className="px-4 pb-8">
          {/* Live Tellers Preview */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-400" />
                {language === 'tr' ? 'Canlı Falcılar' : 'Live Fortune Tellers'}
              </h2>
              <Link href={`/${language}/live-tellers`} className="text-purple-400 text-sm flex items-center gap-1">
                {language === 'tr' ? 'Tümünü Gör' : 'See All'}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Horizontal Scroll Teller Cards */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {liveTellers.slice(0, 5).map((teller) => (
                <Link
                  key={teller.id}
                  href={`/${language}/live-tellers/${teller.id}`}
                  className="flex-shrink-0 w-40"
                >
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-purple-900/60 to-pink-900/40 p-[2px]">
                    <div className="relative bg-[#0a0118]/90 rounded-2xl overflow-hidden">
                      {/* Online/Offline Badge */}
                      {teller.isOnline && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            CANLI
                          </span>
                        </div>
                      )}
                      
                      {/* Teller Image */}
                      <div className="aspect-[3/4] relative">
                        {teller.avatar || teller.user.image ? (
                          <Image
                            src={teller.avatar || teller.user.image || ''}
                            alt={teller.displayName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                            <span className="text-3xl font-bold text-white">
                              {teller.displayName?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      </div>

                      {/* Teller Info */}
                      <div className="p-2 -mt-10 relative z-10">
                        <h3 className="text-white font-bold text-xs truncate">{teller.displayName}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-2.5 h-2.5 text-gold-400 fill-gold-400" />
                          <span className="text-gold-400 text-[10px] font-semibold">{teller.rating.toFixed(1)}</span>
                          <span className="text-purple-400 text-[10px]">• {teller.totalSessions}</span>
                        </div>
                        
                        {/* Connect Button */}
                        <button className={`mt-1.5 w-full py-1.5 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                          teller.isOnline ? 'bg-green-500 hover:bg-green-400' : 'bg-purple-600 hover:bg-purple-500'
                        }`}>
                          <Video className="w-2.5 h-2.5" />
                          {language === 'tr' ? 'Bağlan' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {liveTellers.length === 0 && (
                <div className="flex-1 py-8 text-center w-full">
                  <p className="text-purple-400 text-sm">
                    {language === 'tr' ? 'Henüz falcı yok' : 'No tellers yet'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Fortune Categories Section */}
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

            {/* Fortune Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              {FORTUNE_CARDS.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/${language}${card.href}`}>
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-purple-900/30 group">
                      <Image
                        src={card.image}
                        alt={language === 'tr' ? card.nameTr : card.nameEn}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-white font-semibold text-sm">{language === 'tr' ? card.nameTr : card.nameEn}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
                          <span className="text-gold-400 text-xs font-medium">5.0</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
