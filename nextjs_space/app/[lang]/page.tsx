'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { ChevronRight, Star, Sparkles, Video, Radio, Eye, Heart, Users, Circle, Plus, Gift, Coins, X, Gamepad2, MessageCircle } from 'lucide-react'
import ActionButtonsRow from '@/components/action-buttons-row'
import { useSectionPresence } from '@/hooks/use-section-presence'
import { AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import HomepageTicker from '@/components/homepage-ticker'
import LiveTicker from '@/components/live-ticker'
import BanaOzelSection from '@/components/bana-ozel-section'
import { useSiteTheme } from '@/lib/theme-context'

interface LiveTeller {
  id: string
  displayName: string
  avatar: string | null
  rating: number
  averageRating?: number
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
  const { theme } = useSiteTheme()
  const [liveTellers, setLiveTellers] = useState<LiveTeller[]>([])
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([])
  const [isTeller, setIsTeller] = useState(false)
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const { counts: sectionCounts } = useSectionPresence()
  
  // Theme detection
  const isFalci = theme === 'falci'
  const isFalclub = theme === 'falclub'
  const isCosmic = theme === 'cosmic'
  
  // Theme-based colors with improved readability
  const bgColor = isFalci ? '' : isCosmic ? 'bg-[#0a1628]' : 'bg-[#0a0118]'
  const cardBg = isCosmic ? 'bg-white/15 border-blue-400/40' : 'bg-purple-900/30 border-purple-400/40'
  const cardBgSolid = isCosmic ? 'bg-[#1e3a5f] border-blue-400/40' : 'bg-purple-900/30 border-purple-400/40'
  const accentColor = isCosmic ? 'text-amber-300' : 'text-amber-300'
  const accentColorFill = isCosmic ? 'text-amber-300 fill-amber-300' : 'text-amber-300 fill-amber-300'
  const textSecondary = isCosmic ? 'text-slate-200' : 'text-gray-200'
  const borderColor = isCosmic ? 'border-blue-400/40' : 'border-purple-400/40'
  const gradientBorder = isCosmic ? 'bg-gradient-to-br from-blue-500 to-cyan-400' : 'bg-gradient-to-br from-purple-500 to-pink-500'

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
    const tellerInterval = setInterval(fetchTellers, 45000)
    const streamInterval = setInterval(fetchStreams, 30000)
    return () => {
      clearInterval(tellerInterval)
      clearInterval(streamInterval)
    }
  }, [])

  // Check if logged-in user is a teller and fetch pending requests
  useEffect(() => {
    if (!session?.user) return
    const checkTeller = async () => {
      try {
        const res = await fetch('/api/fortune-tellers/my-profile')
        if (res.ok) {
          const data = await res.json()
          setIsTeller(true)
          // Fetch pending sessions
          if (data.id) {
            const sessRes = await fetch(`/api/fortune-tellers/sessions?status=pending`)
            if (sessRes.ok) {
              const sessData = await sessRes.json()
              setPendingRequestCount(Array.isArray(sessData) ? sessData.length : 0)
            }
          }
        }
      } catch {}
    }
    checkTeller()
    const interval = setInterval(checkTeller, 30000)
    return () => clearInterval(interval)
  }, [session])

  // Sort tellers: online first, then offline
  const sortedTellers = [...liveTellers].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1
    if (!a.isOnline && b.isOnline) return 1
    return 0
  })

  // FalClub Theme - Premium Neon Pink Design (exact match to provided image)
  if (isFalclub) {
    return (
      <div className="min-h-screen falclub-starry-bg relative overflow-hidden">
        {/* Animated Stars background */}
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                opacity: Math.random() * 0.8 + 0.2,
                animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>

        {/* Ticker */}
        <div className="fixed top-14 left-0 right-0 z-40">
          <HomepageTicker />
          <LiveTicker />
        </div>

        {/* Main Content - minimal gap between ticker and content */}
        <div className="pt-[108px] sm:pt-[118px] pb-28 px-3 sm:px-4 space-y-3 sm:space-y-4 relative z-10">
          {/* Action Buttons Row */}
          <ActionButtonsRow isTeller={isTeller} pendingRequestCount={pendingRequestCount} variant="falclub" />

          {/* CANLI YAYINLAR Section */}
          <div className="falclub-card p-4 relative overflow-hidden">
            {/* Mystical Woman Silhouette Background */}
            <div 
              className="absolute inset-0 opacity-30 bg-gradient-to-b from-transparent via-fuchsia-900/20 to-transparent"
              style={{
                backgroundImage: 'radial-gradient(ellipse at center, rgba(217, 70, 239, 0.2) 0%, transparent 70%)',
              }}
            />
            
            <h2 className="falclub-section-title mb-4 relative z-10">
              <Radio className="w-5 h-5" />
              {'CANLI YAYINLAR'}
            </h2>
            
            <div className="flex items-center gap-4 relative z-10">
              {/* Start Stream Button */}
              <Link
                href={session ? `/chat/video/setup` : `/login`}
                className="flex flex-col items-center"
              >
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 border-2 border-fuchsia-400/70"
                  style={{ boxShadow: '0 0 30px rgba(217, 70, 239, 0.5)' }}
                >
                  <Plus className="w-10 h-10 text-fuchsia-300" />
                </div>
                <span className="text-fuchsia-200 text-xs mt-2 font-semibold">
                  {'Yayın Başlat'}
                </span>
              </Link>
              
              {/* Live Streams */}
              {liveStreams.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto flex-1 scrollbar-hide">
                  {liveStreams.slice(0, 4).map((stream) => (
                    <Link
                      key={stream.id}
                      href={`/chat/video?watch=${stream.id}`}
                      className="flex flex-col items-center flex-shrink-0"
                    >
                      <div 
                        className="w-16 h-16 rounded-full overflow-hidden border-2 border-red-500 relative"
                        style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)' }}
                      >
                        {stream.user.image ? (
                          <Image src={stream.user.image} alt={stream.user.name} width={64} height={64} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{stream.user.name?.[0]}</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-red-500 px-1.5 py-0.5 rounded text-[8px] text-white font-bold">CANLI</div>
                      </div>
                      <span className="text-fuchsia-200 text-xs mt-1 font-medium truncate w-16 text-center">{stream.user.name}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-fuchsia-300/70 text-sm flex-1 text-center">
                  {'Henüz canlı yayın yok'}
                </p>
              )}
            </div>
          </div>

          {/* FALLAR Section */}
          <div className="falclub-card p-4">
            <h2 className="falclub-section-title mb-4">
              <Sparkles className="w-5 h-5" />
              {'FALLAR'}
              {sectionCounts.fortunes > 0 && (
                <span className="text-red-400 text-xs font-bold ml-2 animate-pulse">
                  🔮 {sectionCounts.fortunes} {'kişi fal baktırıyor'}
                </span>
              )}
            </h2>
            
            <div className="grid grid-cols-5 gap-3">
              {FORTUNE_CARDS.slice(0, 10).map((fortune) => (
                <Link
                  key={fortune.id}
                  href={`/${language}${fortune.href}`}
                  className="flex flex-col items-center group"
                >
                  <div 
                    className="falclub-icon-circle w-14 h-14 transition-all group-hover:scale-110"
                  >
                    <Image
                      src={fortune.image}
                      alt={fortune.nameTr}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-fuchsia-200 text-[10px] font-medium mt-1.5 text-center leading-tight">
                    {fortune.nameTr}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* ONLINE FALCILAR Section */}
          {sortedTellers.filter(t => t.isOnline).length > 0 && (
            <div>
              <h2 className="falclub-section-title mb-3">
                <Circle className="w-5 h-5 text-green-400 fill-green-400 animate-pulse" />
                {'ONLINE FALCILAR'}
              </h2>
              
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {sortedTellers.filter(t => t.isOnline).map((teller) => (
                  <Link
                    key={teller.id}
                    href={`/live-tellers/${teller.id}`}
                    className="flex-shrink-0 w-28 rainbow-border rainbow-border-live rounded-2xl"
                  >
                    <div className="rounded-2xl overflow-hidden" style={{
                      background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1145 50%, #1a0a2e 100%)',
                    }}>
                    {/* Square Photo */}
                    <div className="relative w-full aspect-square overflow-hidden">
                      {teller.avatar ? (
                        <Image src={teller.avatar} alt={teller.displayName} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-800 via-fuchsia-900 to-purple-900 flex items-center justify-center">
                          <span className="text-white font-bold text-2xl">{teller.displayName?.[0]}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0a2e] via-transparent to-transparent" />
                      <div className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded"
                        style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)' }}>
                        CANLI
                      </div>
                    </div>
                    <div className="p-1.5 text-center">
                      <p className="text-white text-xs truncate">{teller.displayName}</p>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-yellow-400 text-[10px]">{teller.averageRating?.toFixed(1) || '5.0'}</span>
                      </div>
                    </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* POPÜLER FALCILAR Section */}
          <div>
            <h2 className="falclub-section-title mb-3">
              <Star className="w-5 h-5" />
              {'POPÜLER FALCILAR'}
            </h2>
            
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {sortedTellers.slice(0, 6).map((teller) => (
                <Link
                  key={teller.id}
                  href={`/live-tellers/${teller.id}`}
                  className={`flex-shrink-0 w-28 rounded-2xl ${teller.isOnline ? 'rainbow-border rainbow-border-live' : 'opacity-50'}`}
                >
                  <div className="rounded-2xl overflow-hidden" style={{
                    border: teller.isOnline ? 'none' : '2px solid rgba(100, 60, 140, 0.4)',
                    background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1145 50%, #1a0a2e 100%)',
                  }}>
                  <div className="relative w-full aspect-square overflow-hidden">
                    {teller.avatar ? (
                      <Image src={teller.avatar} alt={teller.displayName} fill className={`object-cover ${!teller.isOnline ? 'grayscale' : ''}`} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-800 via-fuchsia-900 to-purple-900 flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">{teller.displayName?.[0]}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a0a2e] via-transparent to-transparent" />
                    {teller.isOnline ? (
                      <div className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded"
                        style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)' }}>
                        CANLI
                      </div>
                    ) : (
                      <div className="absolute top-1.5 left-1.5 bg-gray-600/80 text-gray-300 text-[8px] font-bold px-1.5 py-0.5 rounded">
                        {'ÇEVRİMDIŞI'}
                      </div>
                    )}
                  </div>
                  <div className="p-1.5 text-center">
                    <p className="text-white text-xs truncate">{teller.displayName}</p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-yellow-400 text-[10px]">{teller.averageRating?.toFixed(1) || '5.0'}</span>
                    </div>
                  </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {sortedTellers.length === 0 && (
              <p className="text-fuchsia-300/70 text-sm text-center py-4">
                {'Henüz falcı bulunmuyor'}
              </p>
            )}
            
            <div className="flex justify-center mt-3">
              <Link
                href={`/live-tellers`}
                className="inline-block px-4 py-2 rounded-xl text-fuchsia-200 text-sm font-medium hover:text-white transition-colors"
                style={{
                  border: '1.5px solid rgba(232, 121, 249, 0.5)',
                  background: 'rgba(168, 85, 247, 0.15)',
                }}
              >
                {'Tüm Falcıları Gör →'}
              </Link>
            </div>
          </div>

          {/* GÜNLÜK BURÇ Section */}
          <div className="falclub-card p-4">
            <h2 className="falclub-section-title mb-3">
              <Heart className="w-5 h-5" />
              {'GÜNLÜK BURÇ'}
            </h2>
            
            <div className="text-fuchsia-200 text-sm">
              <p className="font-semibold text-white mb-1">Koç:</p>
              <p className="opacity-90">{'Bugün enerjin yüksek. Yeni fırsatlar karşına çıkabilir.'}</p>
              <Link 
                href={`/fortunes/horoscope`}
                className="inline-block mt-2 text-fuchsia-300 font-medium hover:text-fuchsia-200"
              >
                [{'Detaylı Oku'}]
              </Link>
            </div>
          </div>

          {/* KEŞFEDİN - New Features Section */}
          <div className="falclub-card p-4">
            <h2 className="falclub-section-title mb-3">
              <Sparkles className="w-5 h-5" />
              {'KEŞFEDİN'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { href: '/ruya-sozlugu', icon: '📖', label: 'Rüya Sözlüğü', desc: 'A-Z rüya tabiri' },
                { href: '/ruya-takvimi', icon: '📅', label: 'Rüya Takvimi', desc: 'Günlük rüya günlüğün' },
                { href: '/ruya-yarismasi', icon: '🏆', label: 'Rüya Yarışması', desc: 'Haftalık yarışma' },
                { href: '/burc-uyumu', icon: '💕', label: 'Burç Uyumu', desc: 'Detaylı uyum analizi' },
                { href: '/astroloji-paneli', icon: '🔮', label: 'Astroloji Paneli', desc: 'Kişisel paneliniz' },
                { href: '/ruya-istatistikleri', icon: '📊', label: 'Rüya İstatistikleri', desc: 'Kişisel trendlerin' },
                { href: '/basarimlar', icon: '🏅', label: 'Başarımlar', desc: 'Rozetlerini topla' },
                { href: '/chat', icon: '💬', label: 'Sohbet', desc: 'Canlı sohbet odaları' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="bg-fuchsia-900/20 border border-fuchsia-700/20 rounded-xl p-3 text-center hover:bg-fuchsia-900/40 transition-all group"
                >
                  <span className="text-2xl block mb-1">{item.icon}</span>
                  <span className="text-white text-xs font-semibold group-hover:text-fuchsia-200 block">{item.label}</span>
                  <span className="text-purple-400 text-[10px] block">{item.desc}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* BANA ÖZEL Section - Only for logged-in users */}
          {session?.user && <BanaOzelSection />}
        </div>
      </div>
    )
  }

  // Falci Theme - Premium Design (exact match to provided image)
  if (isFalci) {
    return (
      <div className="min-h-screen falci-starry-bg relative overflow-hidden">
        {/* Stars background effect */}
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-white rounded-full animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: Math.random() * 0.7 + 0.3,
              }}
            />
          ))}
        </div>

        {/* Ticker */}
        <div className="fixed top-14 left-0 right-0 z-40">
          <HomepageTicker />
          <LiveTicker />
        </div>

        {/* Main Content - minimal gap between ticker and content */}
        <div className="pt-[108px] sm:pt-[118px] pb-28 px-3 sm:px-4 space-y-3 sm:space-y-4 relative z-10">
          {/* Action Buttons Row */}
          <ActionButtonsRow isTeller={isTeller} pendingRequestCount={pendingRequestCount} variant="falci" />

          {/* Live Streams Section - White Card */}
          <div className="bg-white/95 rounded-xl p-4 border-l-4 border-indigo-500" style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
            <h2 className="text-gray-800 font-bold text-lg mb-4">Fallar</h2>
            
            <div className="flex items-center gap-4">
              {/* Start Stream Button */}
              <Link
                href={session ? `/chat/video/setup` : `/login`}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-indigo-400/50 bg-gradient-to-br from-indigo-500/10 to-purple-500/10"
                  style={{ boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)' }}>
                  <Plus className="w-8 h-8 text-indigo-400" />
                </div>
                <span className="text-gray-600 text-xs mt-2 font-medium">
                  {'Yayın Başlat'}
                </span>
              </Link>
              
              {/* Live Streams or Empty State */}
              {liveStreams.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto flex-1 scrollbar-hide">
                  {liveStreams.slice(0, 5).map((stream) => (
                    <Link
                      key={stream.id}
                      href={`/chat/video?watch=${stream.id}`}
                      className="flex flex-col items-center flex-shrink-0"
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-red-500 relative">
                        {stream.user.image ? (
                          <Image src={stream.user.image} alt={stream.user.name} width={64} height={64} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{stream.user.name?.[0]}</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-red-500 px-1.5 py-0.5 rounded text-[8px] text-white font-bold">CANLI</div>
                      </div>
                      <span className="text-gray-700 text-xs mt-1 font-medium truncate w-16 text-center">{stream.user.name}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm flex-1">
                  {'Henüz canlı yayın yok'}
                </p>
              )}
            </div>
          </div>

          {/* Fortune Types Section - White Card */}
          <div className="bg-white/95 rounded-xl p-4 border-l-4 border-indigo-500" style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
            <h2 className="text-gray-800 font-bold text-lg mb-4">
              Fallar
              {sectionCounts.fortunes > 0 && (
                <span className="text-red-500 text-xs font-bold ml-2 animate-pulse">
                  🔮 {sectionCounts.fortunes} {'kişi fal baktırıyor'}
                </span>
              )}
            </h2>
            
            <div className="grid grid-cols-4 gap-4">
              {FORTUNE_CARDS.slice(0, 8).map((fortune) => (
                <Link
                  key={fortune.id}
                  href={`/${language}${fortune.href}`}
                  className="flex flex-col items-center"
                >
                  <div 
                    className="w-[70px] h-[70px] rounded-full overflow-hidden border-3 border-indigo-400/60"
                    style={{ boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)' }}
                  >
                    <Image
                      src={fortune.image}
                      alt={fortune.nameTr}
                      width={70}
                      height={70}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-gray-700 text-[11px] font-medium mt-2 text-center leading-tight">
                    {fortune.nameTr}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* BANA ÖZEL Section - Only for logged-in users */}
          {session?.user && <BanaOzelSection />}
        </div>
      </div>
    )
  }

  // Original themes (Mystical, Cosmic, Facebook)
  return (
    <div className={`min-h-screen ${bgColor}`}>
      {/* Ticker - Scrolling Online/Credits/Gifts - stuck to navbar */}
      <div className="fixed top-14 left-0 right-0 z-40">
        <HomepageTicker />
        <LiveTicker />
      </div>

      {/* Content area with proper top padding - minimal gap */}
      <div className="pt-[108px] sm:pt-[118px]">

        {/* Action Buttons Row */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          <ActionButtonsRow isTeller={isTeller} pendingRequestCount={pendingRequestCount} variant="cosmic" />
        </div>

        {/* Live Tellers Section */}
        <div className="px-4 pb-4">
          {/* Live Tellers Section - Circular Avatars */}
          <div className={`mb-8 ${cardBg} rounded-xl p-4 border backdrop-blur-sm`}>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className={`w-5 h-5 ${accentColor}`} />
              {'Canlı Falcılar'}
            </h2>

            {/* Horizontal Scroll Circular Teller Avatars - Online first, then Offline */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {sortedTellers.length > 0 ? sortedTellers.map((teller) => (
                <Link
                  key={teller.id}
                  href={`/live-tellers/${teller.id}`}
                  className="flex-shrink-0 flex flex-col items-center"
                >
                  {/* Circular Avatar with Gradient Border */}
                  <div className="relative">
                    <div className={`w-20 h-20 rounded-full p-[3px] ${teller.isOnline ? gradientBorder : 'bg-gray-600'}`}>
                      <div className={`w-full h-full rounded-full overflow-hidden ${isCosmic ? 'bg-[#0a1628]' : 'bg-[#0a0118]'} ${!teller.isOnline ? 'opacity-60' : ''}`}>
                        {teller.avatar || teller.user.image ? (
                          <Image
                            src={teller.avatar || teller.user.image || ''}
                            alt={teller.displayName}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full ${isCosmic ? 'bg-gradient-to-br from-blue-600 to-cyan-500' : 'bg-gradient-to-br from-purple-600 to-pink-600'} flex items-center justify-center`}>
                            <span className="text-2xl font-bold text-white">
                              {teller.displayName?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Online/Offline indicator */}
                    <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 ${isCosmic ? 'border-[#0a1628]' : 'border-[#0a0118]'} ${teller.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                  </div>
                  {/* Name */}
                  <p className={`text-xs font-medium mt-2 text-center w-20 truncate ${teller.isOnline ? 'text-white' : 'text-gray-500'}`}>{teller.displayName}</p>
                  {/* Rating */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className={`w-2.5 h-2.5 ${teller.isOnline ? accentColorFill : 'text-gray-500 fill-gray-500'}`} />
                    <span className={`text-[10px] ${teller.isOnline ? accentColor : 'text-gray-500'}`}>{teller.rating.toFixed(1)}</span>
                  </div>
                </Link>
              )) : (
                <div className="flex-1 py-8 text-center w-full">
                  <p className={`${textSecondary} text-sm`}>
                    {'Şu an falcı yok'}
                  </p>
                  <Link
                    href={`/live-tellers`}
                    className={`inline-block mt-3 px-4 py-1.5 ${isCosmic ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} text-white rounded-full text-xs font-medium transition-colors`}
                  >
                    {'Tüm Falcıları Gör'}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Fortune Categories in Live Tab */}
          <div className={`${cardBg} rounded-xl p-4 border backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${accentColor}`} />
                {'Fal Kategorileri'}
              </h2>
              <Link href={`/fortunes`} className={`${accentColor} text-sm flex items-center gap-1 hover:opacity-80`}>
                {'Tümünü Gör'}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {FORTUNE_CARDS.slice(0, 4).map((card) => (
                <Link key={card.id} href={`/${language}${card.href}`} className="flex-shrink-0 w-32">
                  <div className={`relative aspect-square rounded-xl overflow-hidden ${isCosmic ? 'bg-blue-900/50 border-blue-500/30 hover:border-blue-400/50' : 'bg-purple-900/50 border-purple-500/30 hover:border-purple-400/50'} border transition-all`}>
                    <Image
                      src={card.image}
                      alt={card.nameTr}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <h3 className="text-white font-medium text-xs">{card.nameTr}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className={`w-2.5 h-2.5 ${accentColorFill}`} />
                        <span className={`${accentColor} text-[10px]`}>5.0</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Fortune Types Section */}
        <div className="px-4 pb-4">
          <div className={`${cardBg} rounded-xl p-4 border backdrop-blur-sm`}>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className={`w-5 h-5 ${accentColor}`} />
              {'Fallar'}
              {sectionCounts.fortunes > 0 && (
                <span className="text-red-400 text-xs font-bold ml-2 animate-pulse">
                  🔮 {sectionCounts.fortunes} {'kişi fal baktırıyor'}
                </span>
              )}
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {FORTUNE_CARDS.map((fortune) => (
                <Link
                  key={fortune.id}
                  href={`/${language}${fortune.href}`}
                  className="flex flex-col items-center"
                >
                  <div className={`w-16 h-16 rounded-full p-[2px] ${isCosmic ? 'bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300' : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400'} transition-all`}>
                    <div className="w-full h-full rounded-full overflow-hidden">
                      <Image
                        src={fortune.image}
                        alt={fortune.nameTr}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <p className={`${isCosmic ? 'text-blue-200' : 'text-purple-200'} text-[10px] font-medium mt-1.5 text-center w-16 leading-tight`}>
                    {fortune.nameTr}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>

      {/* BANA ÖZEL Section - Only for logged-in users */}
      {session?.user && (
        <div className="px-4 pb-4">
          <BanaOzelSection />
        </div>
      )}
      </div>

      
    </div>
  )
}
