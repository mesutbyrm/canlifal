'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Bell, Camera, Diamond, Eye, Plus, Video, Compass, Crown,
  MessageCircle, Mic, Sparkles, Star, Globe, Flame,
  Gamepad2, Gift, UserPlus, Zap, Coins, TrendingUp,
  X, Heart, Play, Instagram, Twitter, Youtube,
  Users, ChevronRight, Menu, Search, Trophy, Type, Send, Newspaper
} from 'lucide-react'
import dynamic from 'next/dynamic'

const NotificationBell = dynamic(() => import('./notification-bell'), { ssr: false })
const LiveTicker = dynamic(() => import('./live-ticker'), { ssr: false })
const LiveMatchTicker = dynamic(() => import('./live-match-ticker'), { ssr: false })

interface LiveStream {
  id: string
  title: string
  category: string
  viewerCount: number
  thumbnailUrl?: string | null
  broadcastImage?: string | null
  user: { id: string; name: string; image: string | null }
}

interface ChatRoom {
  id: string
  slug: string
  nameTr: string
  nameEn: string
  icon: string
  backgroundImage: string | null
  onlineCount?: number
}

interface FortuneTeller {
  id: string
  displayName: string
  avatar: string | null
  rating: number
  totalReviews: number
  isOnline: boolean
  specialties: string[]
  user?: { name?: string | null; image?: string | null }
}

interface MembershipPlan {
  id: string
  name: string
  price: number
  duration: number
  features: string[]
  badge?: string
  color?: string
}

interface CelebrityStory {
  id: string
  name: string
  slug: string
  profileImage: string | null
  category: string
  hasNewPost: boolean
}

interface PopularFanClub {
  id: string
  memberCount: number
  postCount: number
  coverImage: string | null
  celebrity: { name: string; slug: string; profileImage: string | null; category: string }
}

interface CelebrityPost {
  id: string
  platform: string
  postType: string
  content: string | null
  mediaUrl: string | null
  likeCount: number
  commentCount: number
  createdAt: string
  celebrity: { name: string; slug: string; profileImage: string | null; category?: string }
}

interface TrendVideoItem {
  id: string
  title: string
  youtubeId: string
  thumbnailUrl: string | null
  channelName: string | null
  duration: string | null
  category: { title: string; slug: string }
}

/* FootballMatch is now handled by LiveMatchTicker component */

const FORTUNE_CARDS = [
  { id: 'coffee', name: 'Kahve Falı', sub: 'Fincandaki gizem', image: 'https://cdn.abacus.ai/images/21ba0a63-b56d-4d57-ba0b-de973fac37bc.png', href: '/fallar/kahve-fali', glow: 'rgba(251,191,36,0.35)' },
  { id: 'tarot', name: 'Tarot Falı', sub: 'Kartların sırrı', image: 'https://cdn.abacus.ai/images/ca544a3b-1bab-4e8d-b59b-74c1c45f1a5a.png', href: '/fallar/tarot-fali', glow: 'rgba(192,38,211,0.45)' },
  { id: 'palm', name: 'El Falı', sub: 'Avucunun çizgileri', image: 'https://cdn.abacus.ai/images/b4f2cb29-d97d-45c0-bac0-a1b0defc320b.png', href: '/fallar/el-fali', glow: 'rgba(236,72,153,0.35)' },
  { id: 'dream', name: 'Rüya Tabiri', sub: 'Rüyanın anlamı', image: 'https://cdn.abacus.ai/images/087f00ec-3e0e-4330-be79-a7d11efdf65b.png', href: '/fallar/ruya-yorumu', glow: 'rgba(99,102,241,0.4)' },
  { id: 'love', name: 'Aşk Uyumu', sub: 'Kalbinin sesi', image: 'https://cdn.abacus.ai/images/63500b4d-2875-46e7-b3ab-720016070d0c.png', href: '/fallar/ask-uyumu', glow: 'rgba(236,72,153,0.45)' },
  { id: 'horoscope', name: 'Günlük Burç', sub: 'Yıldızlar ne diyor', image: 'https://cdn.abacus.ai/images/fc019303-9170-4a35-a30a-9dafbe6cd0bb.png', href: '/fallar/burc-yorumu', glow: 'rgba(168,85,247,0.45)' },
  { id: 'numerology', name: 'Numeroloji', sub: 'Sayıların gizemi', image: 'https://cdn.abacus.ai/images/f16750b2-d611-45af-a2ec-bb912ea71c80.png', href: '/fallar/numeroloji', glow: 'rgba(59,130,246,0.4)' },
  { id: 'angel', name: 'Melek Kartları', sub: 'İlahi mesajlar', image: 'https://cdn.abacus.ai/images/2983a121-7c1b-4d68-9d58-753b8bec3f5c.png', href: '/fallar/melek-kartlari', glow: 'rgba(250,204,21,0.4)' },
  { id: 'aura', name: 'Aura Okuma', sub: 'Enerjini gör', image: '/fortunes/aura.jpg', href: '/fallar/aura-analizi', glow: 'rgba(34,211,238,0.4)' },
  { id: 'birthchart', name: 'Doğum Haritası', sub: 'Yıldız haritan', image: '/fortunes/birthchart.jpg', href: '/fallar/dogum-haritasi', glow: 'rgba(192,38,211,0.4)' },
  { id: 'katina', name: 'Katina Falı', sub: 'Mistik kartlar', image: '/fortunes/katina.jpg', href: '/fallar/katina', glow: 'rgba(217,70,239,0.4)' },
  { id: 'yesno', name: 'Evet / Hayır', sub: 'Hızlı cevap', image: '/fortunes/yesno.jpg', href: '/fallar/evet-hayir', glow: 'rgba(34,197,94,0.4)' },
  { id: 'kursun', name: 'Kurşun Dökme', sub: 'Geleneksel ritüel', image: '/fortunes/dream.jpg', href: '/fallar/kursundokme', glow: 'rgba(148,163,184,0.4)' },
  { id: 'istihare', name: 'İstihare', sub: 'Manevi rehberlik', image: '/fortunes/angel.jpg', href: '/fallar/istihare', glow: 'rgba(250,204,21,0.4)' },
]

const ROOM_COLORS = ['from-pink-500 to-rose-500', 'from-blue-500 to-cyan-500', 'from-purple-500 to-fuchsia-500', 'from-amber-500 to-orange-500'] as const

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  x: <Twitter className="w-3 h-3" />,
  youtube: <Youtube className="w-3 h-3" />,
  tiktok: <Play className="w-3 h-3" />,
  haber: <Newspaper className="w-3 h-3" />,
}

const PLATFORM_COLOR: Record<string, string> = {
  instagram: 'from-pink-500 to-purple-600',
  x: 'from-gray-700 to-gray-900',
  youtube: 'from-red-500 to-red-700',
  tiktok: 'from-cyan-400 to-pink-500',
  haber: 'from-emerald-500 to-teal-600',
}

/* ═══ FEATURE GRID CARDS ═══ */
const FEATURE_CARDS = [
  { id: 'futbol', name: 'Canlı Futbol', icon: '⚽', href: '/futbol', gradient: 'from-green-500 to-emerald-700', glow: 'rgba(16,185,129,0.4)', borderColor: 'border-emerald-500/30' },
  { id: 'dizi-film', name: 'Dizi & Film', icon: '🎬', href: '/dizi-film', gradient: 'from-red-500 to-rose-700', glow: 'rgba(239,68,68,0.4)', borderColor: 'border-red-500/30' },
  { id: 'oyunlar', name: 'Oyunlar', icon: '🎮', href: '/oyunlar', gradient: 'from-emerald-500 to-teal-700', glow: 'rgba(20,184,166,0.35)', borderColor: 'border-teal-500/30' },
  { id: 'trendler', name: 'Trendler', icon: '🔥', href: '/trendler', gradient: 'from-orange-500 to-red-600', glow: 'rgba(249,115,22,0.35)', borderColor: 'border-orange-500/30' },
  { id: 'unluler', name: 'Ünlüler', icon: '⭐', href: '/unluler', gradient: 'from-violet-500 to-purple-700', glow: 'rgba(139,92,246,0.35)', borderColor: 'border-violet-500/30' },
  { id: 'fanclub', name: 'Fan Club', icon: '💜', href: '/unluler', gradient: 'from-rose-500 to-pink-700', glow: 'rgba(244,63,94,0.35)', borderColor: 'border-rose-500/30' },
  { id: 'davet', name: 'Davet Et', icon: '👥', href: '/davet', gradient: 'from-blue-500 to-indigo-700', glow: 'rgba(59,130,246,0.35)', borderColor: 'border-blue-500/30' },
  { id: 'hediye', name: 'Hediyeler', icon: '🎁', href: '/hediyeler', gradient: 'from-pink-500 to-fuchsia-700', glow: 'rgba(236,72,153,0.35)', borderColor: 'border-pink-500/30' },
]

export default function CanliDarkHome() {
  const { data: session } = useSession() || {}
  const [streams, setStreams] = useState<LiveStream[]>([])
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [tellers, setTellers] = useState<FortuneTeller[]>([])
  const [credits, setCredits] = useState<number>(0)
  const [jetonBalance, setJetonBalance] = useState<number>(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [heroText, setHeroText] = useState<string>('Canlı yayınlara\nkatıl, eğlenceye ortak ol!')
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([])
  const [celebrities, setCelebrities] = useState<CelebrityStory[]>([])
  const [trendVideos, setTrendVideos] = useState<TrendVideoItem[]>([])
  const [popularFanClubs, setPopularFanClubs] = useState<PopularFanClub[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [liveMatchesEnabled, setLiveMatchesEnabled] = useState(true)
  const videosScrollRef = useRef<HTMLDivElement>(null)
  // Story states
  const [storyGroups, setStoryGroups] = useState<{ user: any; stories: any[] }[]>([])
  const [myStories, setMyStories] = useState<any[]>([])
  const [storyViewer, setStoryViewer] = useState<{ group: any; index: number } | null>(null)
  const [storyUploading, setStoryUploading] = useState(false)
  const [showMyStories, setShowMyStories] = useState(false)
  const storyFileRef = useRef<HTMLInputElement>(null)
  // Story editor states
  const [storyEditorFile, setStoryEditorFile] = useState<File | null>(null)
  const [storyEditorPreview, setStoryEditorPreview] = useState<string>('')
  const [storyEditorCaption, setStoryEditorCaption] = useState('')
  const [storyEditorMediaType, setStoryEditorMediaType] = useState<'image' | 'video'>('image')

  const userName = (session?.user as any)?.name?.split(' ')[0] || 'Misafir'
  const userAvatar = (session?.user as any)?.image

  useEffect(() => {
    fetch('/api/settings/canlidark-hero')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && typeof d.text === 'string') setHeroText(d.text) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [s, r, t, m, celeb, posts, storiesData, fanClubsData, matchSetting] = await Promise.all([
          fetch('/api/video-streams').then(x => x.ok ? x.json() : []),
          fetch('/api/chat/rooms?withCounts=true').then(x => x.ok ? x.json() : []),
          fetch('/api/fortune-tellers?sort=top_rated').then(x => x.ok ? x.json() : null),
          fetch('/api/memberships').then(x => x.ok ? x.json() : []),
          fetch('/api/celebrities?limit=15').then(x => x.ok ? x.json() : { celebrities: [] }),
          fetch('/api/trend-videos?limit=12').then(x => x.ok ? x.json() : { videos: [] }),
          fetch('/api/stories').then(x => x.ok ? x.json() : { storyGroups: [] }),
          fetch('/api/fan-clubs/popular').then(x => x.ok ? x.json() : { fanClubs: [] }),
          fetch('/api/settings/public?key=live_matches_enabled').then(x => x.ok ? x.json() : null),
        ])
        setStreams(s || [])
        setRooms((r || []).sort((a: any, b: any) => (b.onlineCount || 0) - (a.onlineCount || 0)))
        setTellers((t?.tellers || []).slice(0, 12))
        if (Array.isArray(m)) setMembershipPlans(m.slice(0, 4))
        if (celeb?.celebrities) {
          setCelebrities(celeb.celebrities.map((c: any) => ({
            id: c.id, name: c.name, slug: c.slug,
            profileImage: c.profileImage, category: c.category,
            hasNewPost: false,
          })))
        }
        if (posts?.videos) setTrendVideos(posts.videos)
        if (storiesData?.storyGroups) setStoryGroups(storiesData.storyGroups)
        if (fanClubsData?.fanClubs) setPopularFanClubs(fanClubsData.fanClubs)
        if (matchSetting) setLiveMatchesEnabled(matchSetting.value !== 'false')
      } catch {}
      if (session) {
        try {
          const c = await fetch('/api/user/credits').then(x => x.ok ? x.json() : null)
          if (c?.credits != null) setCredits(c.credits)
          if (c?.jetonBalance != null) setJetonBalance(c.jetonBalance)
          const n = await fetch('/api/notifications?unread=true').then(x => x.ok ? x.json() : null)
          if (n?.unreadCount != null) setUnreadCount(n.unreadCount)
        } catch {}
      }
    }
    load()
    const i = setInterval(load, 30000)
    return () => clearInterval(i)
  }, [session])

  // Auto-scroll trend videos
  const videosScrollPausedRef = useRef(false)
  useEffect(() => {
    if (trendVideos.length < 2) return
    const el = videosScrollRef.current
    if (!el) return
    let animId: number
    let lastTime = 0
    const speed = 0.4
    const tick = (time: number) => {
      if (!videosScrollPausedRef.current && lastTime) {
        const delta = time - lastTime
        const px = speed * (delta / 16.67)
        el.scrollLeft += px
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
          el.scrollLeft = 0
        }
      }
      lastTime = time
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [trendVideos])

  /* Football match auto-scroll is now handled by LiveMatchTicker */

  const popularTellers = tellers.slice(0, 8)
  const visibleFortunes = FORTUNE_CARDS.slice(0, 8)
  const visibleStreams = streams.slice(0, 3)

  // Check if current user has stories
  const myStoryGroup = storyGroups.find(g => g.user.id === (session?.user as any)?.id)
  const otherStoryGroups = storyGroups.filter(g => g.user.id !== (session?.user as any)?.id)

  const handleStoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !session) return
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
    setStoryEditorFile(file)
    setStoryEditorPreview(URL.createObjectURL(file))
    setStoryEditorMediaType(mediaType)
    setStoryEditorCaption('')
    if (storyFileRef.current) storyFileRef.current.value = ''
  }

  const handleStoryPublish = async () => {
    if (!storyEditorFile || !session) return
    setStoryUploading(true)
    try {
      const file = storyEditorFile
      const mediaType = storyEditorMediaType
      const caption = storyEditorCaption.trim()
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: true }),
      })
      if (!presignedRes.ok) throw new Error('Yükleme hatası')
      const { uploadUrl, cloud_storage_path } = await presignedRes.json()
      const headers: Record<string, string> = { 'Content-Type': file.type }
      if (uploadUrl.includes('content-disposition')) headers['Content-Disposition'] = 'attachment'
      await fetch(uploadUrl, { method: 'PUT', headers, body: file })
      const urlRes = await fetch('/api/upload/get-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, isPublic: true }),
      })
      const { url } = await urlRes.json()
      await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaUrl: url, mediaType, caption: caption || undefined }),
      })
      const fresh = await fetch('/api/stories').then(x => x.ok ? x.json() : { storyGroups: [] })
      setStoryGroups(fresh.storyGroups || [])
      // Close editor
      setStoryEditorFile(null)
      setStoryEditorPreview('')
      setStoryEditorCaption('')
    } catch (err) {
      console.error('Story upload error:', err)
    } finally {
      setStoryUploading(false)
    }
  }

  const handleStoryEditorClose = () => {
    if (storyEditorPreview) URL.revokeObjectURL(storyEditorPreview)
    setStoryEditorFile(null)
    setStoryEditorPreview('')
    setStoryEditorCaption('')
  }

  const handleDeleteStory = async (storyId: string) => {
    try {
      await fetch(`/api/stories?id=${storyId}`, { method: 'DELETE' })
      const fresh = await fetch('/api/stories').then(x => x.ok ? x.json() : { storyGroups: [] })
      setStoryGroups(fresh.storyGroups || [])
      setShowMyStories(false)
    } catch {}
  }

  return (
    <div className="canlidark-bg pb-32 pt-24 px-3 sm:px-4 max-w-2xl mx-auto relative">
      {/* Floating decorative orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        {[
          { size: 280, x: '-15%', y: '20%', color: 'rgba(192,38,211,0.18)' },
          { size: 220, x: '85%', y: '60%', color: 'rgba(59,130,246,0.18)' },
          { size: 180, x: '60%', y: '15%', color: 'rgba(236,72,153,0.14)' },
        ].map((o, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ width: o.size, height: o.size, left: o.x, top: o.y, background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`, filter: 'blur(50px)' }}
            animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.15, 0.9, 1] }}
            transition={{ duration: 18 + i * 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* ═══ TOP BAR ═══ */}
      <nav className="canlidark-top-nav">
        <div className="canlidark-nav-inner">
          <Link href={session ? '/profil' : '/giris'} className="canlidark-nav-item canlidark-nav-profile">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-fuchsia-400/60 shadow-lg shadow-fuchsia-500/30">
              {userAvatar ? (
                <Image src={userAvatar} alt={userName} fill className="object-cover" sizes="40px" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  {userName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <span>Profil</span>
          </Link>
          <Link href="/mesajlar" className="canlidark-nav-item">
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-pink-500 rounded-full flex items-center justify-center text-[7px] text-white font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </div>
            <span>Mesajlar</span>
          </Link>
          <div className="canlidark-nav-item">
            <NotificationBell />
            <span>Bildirim</span>
          </div>
          <Link href={(session?.user as any)?.role === 'admin' ? '/admin' : (session?.user as any)?.role === 'yonetici' ? '/admin' : '/panel'} className="canlidark-nav-item">
            <Sparkles className="w-5 h-5" />
            <span>{(session?.user as any)?.role === 'admin' ? 'Admin Paneli' : (session?.user as any)?.role === 'yonetici' ? 'Yönetici Paneli' : 'Panelim'}</span>
          </Link>
        </div>
      </nav>

      {/* ═══ LIVE TICKER ═══ */}
      {streams.length > 0 && (
        <div className="mb-4">
          <LiveTicker />
        </div>
      )}

      {/* ═══ HERO TITLE ═══ */}
      <div className="mb-3">
        <h1 className="text-xl font-extrabold text-white leading-snug whitespace-pre-line">
          {heroText}
        </h1>
      </div>

      {/* ═══ 1. HİKÂYELER (Instagram-style stories) — mb-0 gap ═══ */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-2">
          <h2 className="canlidark-section-title">Hikâyeler</h2>
          <Link href="/unluler" className="canlidark-section-link">Tümü</Link>
        </div>
        <input ref={storyFileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleStoryFileSelect} />
        <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide pb-1">
          {/* Add Story / My Story button */}
          {session && (
            <div className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[68px]">
              <div className="relative cursor-pointer" onClick={() => myStoryGroup ? setShowMyStories(true) : storyFileRef.current?.click()}>
                <div className={`w-16 h-16 rounded-full p-[2.5px] ${myStoryGroup ? 'bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600' : 'bg-gray-600/50'}`}
                  style={myStoryGroup ? { boxShadow: '0 0 12px rgba(236,72,153,0.5)' } : {}}
                >
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#0a0118] relative">
                    {userAvatar ? (
                      <Image src={userAvatar} alt={userName} fill className="object-cover" sizes="60px" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-800 to-fuchsia-900 flex items-center justify-center text-lg font-bold text-white">
                        {userName[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                {!myStoryGroup && (
                  <div className="absolute -bottom-0.5 right-0 w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-[#0a0118] flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                )}
                {storyUploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-2 border-transparent border-t-pink-500 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-[10px] font-medium text-white text-center leading-tight truncate w-full">
                {myStoryGroup ? 'Hikâyem' : 'Hikâye Ekle'}
              </p>
            </div>
          )}

          {/* User stories */}
          {otherStoryGroups.map((group) => (
            <div key={group.user.id} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[68px] cursor-pointer" onClick={() => setStoryViewer({ group, index: 0 })}>
              <div className="relative">
                <div className="w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600" style={{ boxShadow: '0 0 12px rgba(236,72,153,0.5)' }}>
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#0a0118] relative">
                    {group.user.image ? (
                      <Image src={group.user.image} alt={group.user.name || ''} fill className="object-cover" sizes="60px" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-800 to-fuchsia-900 flex items-center justify-center text-lg font-bold text-white">
                        {(group.user.name || '?')[0]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-medium text-white text-center leading-tight truncate w-full">{(group.user.name || '').split(' ')[0]}</p>
            </div>
          ))}

          {/* Celebrity stories */}
          {celebrities.map((celeb) => (
            <Link key={celeb.id} href={`/unluler/${celeb.slug}`} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[68px]">
              <div className="relative">
                <div className={`w-16 h-16 rounded-full p-[2.5px] ${celeb.hasNewPost ? 'bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600' : 'bg-gray-600/50'}`}
                  style={celeb.hasNewPost ? { boxShadow: '0 0 12px rgba(236,72,153,0.5)' } : {}}
                >
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#0a0118] relative">
                    {celeb.profileImage ? (
                      <Image src={celeb.profileImage} alt={celeb.name} fill className="object-cover" sizes="60px" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-800 to-fuchsia-900 flex items-center justify-center text-lg font-bold text-white">
                        {celeb.name[0]}
                      </div>
                    )}
                  </div>
                </div>
                {celeb.hasNewPost && (
                  <div className="absolute -bottom-0.5 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-[#0a0118]" />
                )}
              </div>
              <p className="text-[10px] font-medium text-white text-center leading-tight truncate w-full">{celeb.name.split(' ')[0]}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ 2. CANLI YAYINLAR — 4-col grid — mb-0 gap ═══ */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-2">
          <h2 className="canlidark-section-title">Canlı Yayınlar</h2>
          <Link href="/sohbet/video" className="canlidark-section-link">Tümünü gör</Link>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {/* Yayın Başlat card */}
          <Link href={session ? '/sohbet/video/setup' : '/giris'} className="flex flex-col items-center gap-1.5">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden canlidark-glass border border-pink-500/30" style={{ boxShadow: '0 4px 16px rgba(236,72,153,0.35)' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-pink-600/40 via-fuchsia-600/30 to-purple-700/40" />
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-fuchsia-500/10 to-purple-600/20"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 z-10">
                <motion.div
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 flex items-center justify-center border-2 border-pink-300/50"
                  animate={{ scale: [1, 1.15, 1], boxShadow: ['0 0 10px rgba(236,72,153,0.4)', '0 0 25px rgba(236,72,153,0.8)', '0 0 10px rgba(236,72,153,0.4)'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Plus className="w-5 h-5 text-white" />
                </motion.div>
                <span className="text-[9px] text-white font-bold">Yayın Başlat</span>
              </div>
            </div>
            <p className="text-[10px] font-semibold text-white text-center">Canlı Yayın</p>
          </Link>

          {visibleStreams.length > 0 ? (
            visibleStreams.map((s) => {
              const streamThumb = s.thumbnailUrl || s.broadcastImage || s.user.image
              return (
                <Link key={s.id} href={`/sohbet/video?watch=${s.id}`} className="flex flex-col items-center gap-1.5">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden canlidark-glass border border-purple-500/20" style={{ boxShadow: '0 4px 16px rgba(192,38,211,0.3)' }}>
                    {streamThumb ? (
                      <Image src={streamThumb} alt={s.user.name} fill className="object-cover" sizes="100px" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-pink-600" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute top-1.5 left-1.5">
                      <span className="canlidark-live-badge text-[8px] px-1 py-0.5">LIVE</span>
                    </div>
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/50 backdrop-blur-sm">
                      <Eye className="w-2.5 h-2.5 text-white" />
                      <span className="text-[8px] font-bold text-white">{s.viewerCount || 0}</span>
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 right-1.5">
                      <p className="text-[9px] font-bold text-white truncate drop-shadow-lg">{s.user.name}</p>
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold text-white text-center truncate w-full">{s.category || 'Canlı'}</p>
                </Link>
              )
            })
          ) : (
            Array.from({ length: 3 }).map((_, idx) => (
              <Link key={`empty-stream-${idx}`} href="/sohbet/video" className="flex flex-col items-center gap-1.5">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden canlidark-glass border border-purple-500/10" style={{ boxShadow: '0 4px 16px rgba(192,38,211,0.1)' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-fuchsia-900/30 flex items-center justify-center">
                    <Video className="w-6 h-6 text-fuchsia-400/30" />
                  </div>
                </div>
                <p className="text-[10px] font-semibold text-fuchsia-200/40 text-center">Boş Slot</p>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* ═══ 3. CANLI MAÇLAR — LiveMatchTicker component ═══ */}
      {liveMatchesEnabled && <LiveMatchTicker />}

      {/* ═══ 4. SESLİ SOHBET ODALARI — yuvarlak ═══ */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title">Sesli Sohbet Odaları</h2>
          <Link href="/sohbet" className="canlidark-section-link">Tüm Odalar</Link>
        </div>
        <div className="flex items-start gap-4 overflow-x-auto scrollbar-hide pb-2">
          {rooms.length > 0 ? rooms.slice(0, 10).map((room, idx) => (
            <Link key={room.id} href={`/sohbet/${room.slug || room.id}`} className="flex-shrink-0 flex flex-col items-center gap-2 w-[76px]">
              <div className="relative">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${ROOM_COLORS[idx % ROOM_COLORS.length]} p-[2px] shadow-lg`} style={{ boxShadow: '0 0 20px rgba(192,38,211,0.3)' }}>
                  <div className="w-full h-full rounded-full overflow-hidden relative">
                    {room.backgroundImage ? (
                      <Image src={room.backgroundImage} alt={room.nameTr} fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-800 to-fuchsia-900 flex items-center justify-center text-2xl">
                        {room.icon || '🎙️'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-fuchsia-500 flex items-center justify-center border-2 border-[#0a0118]">
                  <Mic className="w-2.5 h-2.5 text-white" />
                </div>
                {(room.onlineCount || 0) > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center border-2 border-[#0a0118] px-1">
                    <span className="text-[8px] text-white font-bold">{room.onlineCount}</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold text-white leading-tight truncate w-[76px]">{room.nameTr}</p>
                <p className="text-[9px] text-fuchsia-200/60">{room.onlineCount || 0} kişi</p>
              </div>
            </Link>
          )) : (
            <p className="text-fuchsia-200/60 text-sm py-4 px-2">Aktif sohbet odası yok</p>
          )}
        </div>
      </div>

      {/* ═══ 5. TREND VİDEOLAR — auto-scroll left ═══ */}
      {trendVideos.length > 0 && (
        <div className="mb-1">
          <div className="flex items-center justify-between mb-2">
            <h2 className="canlidark-section-title flex items-center gap-1.5">
              <Play className="w-4 h-4 text-red-400" /> Trend Videolar
            </h2>
            <Link href="/videolar" className="canlidark-section-link">Tümü</Link>
          </div>
          <div
            ref={videosScrollRef}
            className="flex items-stretch gap-3 overflow-x-auto scrollbar-hide pb-1"
            onMouseEnter={() => { videosScrollPausedRef.current = true }}
            onMouseLeave={() => { videosScrollPausedRef.current = false }}
            onTouchStart={() => { videosScrollPausedRef.current = true }}
            onTouchEnd={() => { videosScrollPausedRef.current = false }}
          >
            {trendVideos.map((video) => (
              <Link
                key={video.id}
                href={`/videolar/izle/${video.id}`}
                className="flex-shrink-0 w-48 group"
              >
                <div className="canlidark-card overflow-hidden h-full">
                  <div className="relative w-full h-28">
                    {video.thumbnailUrl ? (
                      <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" sizes="192px" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center">
                        <Youtube className="w-8 h-8 text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    {/* Duration badge */}
                    {video.duration && (
                      <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                        {video.duration}
                      </span>
                    )}
                    {/* Category badge */}
                    <span className="absolute top-1.5 left-1.5 bg-red-600/80 text-white text-[8px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                      {video.category.title}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] font-semibold text-white line-clamp-2 leading-tight">{video.title}</p>
                    {video.channelName && (
                      <p className="text-[9px] text-fuchsia-200/50 mt-1 flex items-center gap-1">
                        <Youtube className="w-2.5 h-2.5 text-red-400" /> {video.channelName}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 5.5 FAN CLUB — en aktif kulüpler ═══ */}
      {popularFanClubs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="canlidark-section-title flex items-center gap-1.5">💜 Fan Club</h2>
            <Link href="/unluler" className="canlidark-section-link">Tüm Kulüpler</Link>
          </div>
          <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide pb-2">
            {popularFanClubs.map((fc, idx) => {
              const gradients = ['from-rose-500 to-pink-600', 'from-purple-500 to-fuchsia-600', 'from-blue-500 to-indigo-600', 'from-amber-500 to-orange-600', 'from-emerald-500 to-teal-600'] as const
              return (
                <Link key={fc.id} href={`/unluler/${fc.celebrity.slug}/fan-kulubu`} className="flex-shrink-0 w-[120px]">
                  <div className={`relative rounded-2xl overflow-hidden canlidark-glass border border-purple-500/20 aspect-[3/4]`} style={{ boxShadow: '0 4px 16px rgba(192,38,211,0.25)' }}>
                    {fc.celebrity.profileImage ? (
                      <Image src={fc.celebrity.profileImage} alt={fc.celebrity.name} fill className="object-cover" sizes="120px" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center text-3xl`}>
                        {fc.celebrity.name[0]}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-[11px] font-bold text-white leading-tight truncate">{fc.celebrity.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-fuchsia-200/80 flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{fc.memberCount}</span>
                        <span className="text-[9px] text-fuchsia-200/80 flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{fc.postCount}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ 6. FAL & TAROT — 4 sütun ═══ */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title">Fal & Tarot</h2>
          <Link href="/fallar" className="canlidark-section-link">Tüm Fallar</Link>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {visibleFortunes.map((fc) => (
            <Link key={fc.id} href={fc.href} className="flex flex-col items-center gap-1.5">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden canlidark-glass border border-purple-500/20" style={{ boxShadow: `0 4px 16px ${fc.glow}` }}>
                <Image src={fc.image} alt={fc.name} fill className="object-cover" sizes="100px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>
              <p className="text-[10px] font-semibold text-white text-center leading-tight truncate w-full">{fc.name}</p>
            </Link>
          ))}
        </div>
        {FORTUNE_CARDS.length > 8 && (
          <Link href="/fallar" className="mt-2 flex items-center justify-center gap-1 text-xs text-fuchsia-300/80 hover:text-fuchsia-200 transition-colors">
            +{FORTUNE_CARDS.length - 8} daha fazla fal <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* ═══ 7. POPÜLER FALCILAR — 4-col grid ═══ */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-400" /> Popüler Falcılar</h2>
          <Link href="/canli-falcilar" className="canlidark-section-link">Tümünü gör</Link>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {popularTellers.length > 0 ? popularTellers.slice(0, 4).map((t) => {
            const avatar = t.avatar || t.user?.image
            return (
              <Link key={t.id} href={`/canli-falcilar/${t.id}`} className="flex flex-col items-center gap-1.5">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden canlidark-glass border border-orange-500/20" style={{ boxShadow: '0 4px 16px rgba(249,115,22,0.25)' }}>
                  {avatar ? (
                    <Image src={avatar} alt={t.displayName} fill className="object-cover" sizes="100px" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                      {t.displayName?.[0]}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  {t.isOnline && (
                    <div className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded-full bg-emerald-500/90 flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[7px] text-white font-bold">Online</span>
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-1.5 right-1.5">
                    <p className="text-[9px] font-bold text-white truncate drop-shadow">{t.displayName}</p>
                    <div className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
                      <span className="text-[8px] text-white font-semibold">{t.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] font-semibold text-white text-center truncate w-full">{t.displayName.split(' ')[0]}</p>
              </Link>
            )
          }) : (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={`empty-teller-${idx}`} className="flex flex-col items-center gap-1.5">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden canlidark-glass border border-orange-500/10" style={{ boxShadow: '0 4px 16px rgba(249,115,22,0.1)' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-orange-900/20 flex items-center justify-center">
                    <Star className="w-6 h-6 text-orange-400/25" />
                  </div>
                </div>
                <p className="text-[10px] font-semibold text-fuchsia-200/40 text-center">Yakında</p>
              </div>
            ))
          )}
        </div>
        {popularTellers.length > 4 && (
          <Link href="/canli-falcilar" className="mt-2 flex items-center justify-center gap-1 text-xs text-fuchsia-300/80 hover:text-fuchsia-200 transition-colors">
            +{popularTellers.length - 4} daha fazla falcı <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* ═══ 8. KEŞFET — Feature cards 4-col grid ═══ */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title flex items-center gap-1.5"><Compass className="w-4 h-4 text-cyan-400" /> Keşfet</h2>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {FEATURE_CARDS.map((card) => (
            <Link key={card.id} href={card.href} className="flex flex-col items-center gap-1.5">
              <div className={`relative w-full aspect-square rounded-2xl overflow-hidden canlidark-glass border ${card.borderColor}`} style={{ boxShadow: `0 4px 16px ${card.glow}` }}>
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-60`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl drop-shadow-lg">{card.icon}</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>
              <p className="text-[10px] font-semibold text-white text-center leading-tight truncate w-full">{card.name}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ 9. GOLD ÜYELİKLER — 4-col grid ═══ */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title flex items-center gap-1.5"><Crown className="w-4 h-4 text-amber-400" /> Gold Üyelikler</h2>
          <Link href="/uyelik" className="canlidark-section-link">Tümünü gör</Link>
        </div>
        {membershipPlans.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {membershipPlans.slice(0, 4).map((plan, idx) => {
              const planIcons = ['👑', '💎', '🌟', '🔮']
              return (
                <Link key={plan.id} href="/uyelik" className="flex flex-col items-center gap-1.5">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden canlidark-glass border border-amber-500/30" style={{ boxShadow: '0 4px 16px rgba(251,191,36,0.25)' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-600/50 via-yellow-600/30 to-orange-700/40" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <span className="text-2xl">{planIcons[idx] || '👑'}</span>
                      <span className="text-[10px] font-extrabold text-white">{plan.price} TL</span>
                      <span className="text-[8px] text-amber-200/80">{plan.duration} gün</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  </div>
                  <p className="text-[10px] font-semibold text-amber-200 text-center truncate w-full">{plan.name}</p>
                </Link>
              )
            })}
          </div>
        ) : (
          <Link href="/uyelik" className="block">
            <div className="grid grid-cols-4 gap-2">
              {['👑 Gold', '💎 Premium', '🌟 VIP', '🔮 Elite'].map((label, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden canlidark-glass border border-amber-500/20" style={{ boxShadow: '0 4px 16px rgba(251,191,36,0.15)' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-700/40 via-yellow-700/20 to-orange-800/30" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl">{label.split(' ')[0]}</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold text-amber-200/60 text-center">{label.split(' ')[1]}</p>
                </div>
              ))}
            </div>
          </Link>
        )}
      </div>

      {/* ═══ FLOATING HIZLI İŞLEMLER BUTTON ═══ */}
      <motion.button
        onClick={() => setDrawerOpen(true)}
        className="fixed right-3 bottom-24 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg border border-fuchsia-400/30"
        style={{ boxShadow: '0 4px 20px rgba(192,38,211,0.5)' }}
        whileTap={{ scale: 0.9 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        aria-label="Hızlı İşlemler"
      >
        <Menu className="w-5 h-5 text-white" />
      </motion.button>

      {/* ═══ SLIDE-OUT DRAWER ═══ */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 h-full w-72 bg-[#0f0524]/95 backdrop-blur-xl border-l border-purple-500/20 z-50 overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Hızlı İşlemler</h2>
                  <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { href: '/futbol', icon: Trophy, label: 'Futbol', gradient: 'from-green-500 to-emerald-600', glow: 'shadow-emerald-500/20' },
                    { href: '/dizi-film', icon: Play, label: 'Dizi & Film', gradient: 'from-red-500 to-rose-600', glow: 'shadow-red-500/20' },
                    { href: '/oyunlar', icon: Gamepad2, label: 'Oyunlar', gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/20' },
                    { href: '/davet', icon: UserPlus, label: 'Davet Et', gradient: 'from-blue-500 to-indigo-600', glow: 'shadow-blue-500/20' },
                    { href: '/hediyeler', icon: Gift, label: 'Hediye', gradient: 'from-pink-500 to-rose-600', glow: 'shadow-pink-500/20' },
                    { href: '/bana-ozel', icon: Zap, label: 'Bana Özel', gradient: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/20' },
                    { href: '/uyelik', icon: Crown, label: 'Premium', gradient: 'from-yellow-400 to-amber-500', glow: 'shadow-amber-500/20' },
                    { href: '/unluler', icon: Star, label: 'Ünlüler', gradient: 'from-violet-500 to-purple-600', glow: 'shadow-violet-500/20' },
                    { href: '/trendler', icon: TrendingUp, label: 'Trendler', gradient: 'from-orange-500 to-red-600', glow: 'shadow-orange-500/20' },
                  ].map((item) => (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className="canlidark-glass rounded-2xl p-3 flex flex-col items-center gap-2 border border-purple-500/20 hover:border-purple-400/40 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg ${item.glow}`}>
                        <item.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] text-white font-semibold text-center leading-tight">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ STORY VIEWER MODAL ═══ */}
      <AnimatePresence>
        {storyViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
            onClick={() => setStoryViewer(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md h-[80vh] max-h-[700px] rounded-2xl overflow-hidden bg-black"
            >
              {/* Progress bars */}
              <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
                {storyViewer.group.stories.map((_: any, i: number) => (
                  <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${i <= storyViewer.index ? 'bg-white w-full' : 'w-0'}`} />
                  </div>
                ))}
              </div>
              {/* User info */}
              <div className="absolute top-5 left-3 right-3 z-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden relative border border-white/30">
                    {storyViewer.group.user.image ? (
                      <Image src={storyViewer.group.user.image} alt={storyViewer.group.user.name || ''} fill className="object-cover" sizes="32px" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-xs font-bold">
                        {(storyViewer.group.user.name || '?')[0]}
                      </div>
                    )}
                  </div>
                  <span className="text-white text-sm font-semibold drop-shadow-lg">{storyViewer.group.user.name}</span>
                </div>
                <button onClick={() => setStoryViewer(null)} className="p-1 text-white/80 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              {/* Story content */}
              {(() => {
                const story = storyViewer.group.stories[storyViewer.index]
                if (!story) return null
                return story.mediaType === 'video' ? (
                  <video src={story.mediaUrl} className="w-full h-full object-contain" autoPlay playsInline controls={false} />
                ) : (
                  <div className="w-full h-full relative">
                    <Image src={story.mediaUrl} alt="Hikâye" fill className="object-contain" sizes="100vw" />
                  </div>
                )
              })()}
              {/* Caption */}
              {storyViewer.group.stories[storyViewer.index]?.caption && (
                <div className="absolute bottom-6 left-3 right-3 z-20">
                  <p className="text-white text-sm bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
                    {storyViewer.group.stories[storyViewer.index].caption}
                  </p>
                </div>
              )}
              {/* Navigation */}
              <button
                className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
                onClick={() => {
                  if (storyViewer.index > 0) setStoryViewer({ ...storyViewer, index: storyViewer.index - 1 })
                  else setStoryViewer(null)
                }}
              />
              <button
                className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
                onClick={() => {
                  if (storyViewer.index < storyViewer.group.stories.length - 1) setStoryViewer({ ...storyViewer, index: storyViewer.index + 1 })
                  else setStoryViewer(null)
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MY STORIES MANAGEMENT MODAL ═══ */}
      <AnimatePresence>
        {showMyStories && myStoryGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={() => setShowMyStories(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm falclub-card p-4 max-h-[70vh] overflow-y-auto"
              style={{ boxShadow: '0 0 30px rgba(217,70,239,0.3)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-fuchsia-200 font-bold text-lg">Hikâyelerim</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowMyStories(false); storyFileRef.current?.click() }} className="text-xs bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-3 py-1.5 rounded-lg font-medium">
                    + Yeni
                  </button>
                  <button onClick={() => setShowMyStories(false)} className="p-1 text-fuchsia-400/60 hover:text-fuchsia-300">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {myStoryGroup.stories.map((story: any) => (
                  <div key={story.id} className="relative aspect-[9/16] rounded-xl overflow-hidden border border-fuchsia-500/20 group">
                    {story.mediaType === 'video' ? (
                      <video src={story.mediaUrl} className="w-full h-full object-cover" />
                    ) : (
                      <Image src={story.mediaUrl} alt="Hikâye" fill className="object-cover" sizes="120px" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                      <span className="text-[9px] text-white/70 flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{story.viewCount}</span>
                      <button
                        onClick={() => handleDeleteStory(story.id)}
                        className="p-1 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                    <button
                      className="absolute inset-0 z-10"
                      onClick={() => { setShowMyStories(false); setStoryViewer({ group: myStoryGroup, index: myStoryGroup.stories.indexOf(story) }) }}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ STORY EDITOR MODAL ═══ */}
      <AnimatePresence>
        {storyEditorFile && storyEditorPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col"
            style={{ background: 'rgba(10, 5, 20, 0.97)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-sm">
              <button onClick={handleStoryEditorClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
              <h3 className="text-white font-semibold text-lg">Hikâye Düzenle</h3>
              <button
                onClick={handleStoryPublish}
                disabled={storyUploading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #d946ef, #ec4899)', color: 'white' }}
              >
                {storyUploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Paylaş
                  </>
                )}
              </button>
            </div>

            {/* Preview area */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              {storyEditorMediaType === 'video' ? (
                <video
                  src={storyEditorPreview}
                  className="max-w-full max-h-full object-contain"
                  controls
                  autoPlay
                  muted
                  loop
                />
              ) : (
                <img
                  src={storyEditorPreview}
                  alt="Hikâye önizleme"
                  className="max-w-full max-h-full object-contain"
                />
              )}

              {/* Caption overlay on the image */}
              {storyEditorCaption && (
                <div className="absolute bottom-20 left-4 right-4 pointer-events-none">
                  <p
                    className="text-white text-center text-lg font-semibold px-4 py-2 rounded-xl"
                    style={{
                      background: 'rgba(0, 0, 0, 0.55)',
                      backdropFilter: 'blur(8px)',
                      textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {storyEditorCaption}
                  </p>
                </div>
              )}
            </div>

            {/* Caption input */}
            <div className="px-4 py-3 bg-black/40 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(217,70,239,0.3)' }}>
                <Type className="w-5 h-5 text-fuchsia-400 flex-shrink-0" />
                <input
                  type="text"
                  value={storyEditorCaption}
                  onChange={(e) => setStoryEditorCaption(e.target.value)}
                  placeholder="Hikâyene bir yazı ekle..."
                  maxLength={200}
                  className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-sm"
                />
                {storyEditorCaption && (
                  <span className="text-[11px] text-white/40 flex-shrink-0">{storyEditorCaption.length}/200</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ BOTTOM NAV ═══ */}
      <nav className="canlidark-bottom-nav">
        <div className="canlidark-nav-inner">
          <Link href="/kesfet" className="canlidark-nav-item">
            <Compass className="w-5 h-5" />
            <span>Keşfet</span>
          </Link>
          <Link href="/sosyal" className="canlidark-nav-item">
            <Globe className="w-5 h-5" />
            <span>Sosyal</span>
          </Link>
          <Link href={session ? '/sohbet/video/setup' : '/giris'} className="canlidark-nav-fab" aria-label="Yayın Başlat">
            <Camera className="w-7 h-7" />
          </Link>
          <Link href="/jeton" className="canlidark-nav-item">
            <Coins className="w-5 h-5" />
            <span>Jeton Al</span>
          </Link>
          <Link href="/unluler" className="canlidark-nav-item">
            <Heart className="w-5 h-5" />
            <span>Fan Club</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
