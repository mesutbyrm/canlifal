'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import {
  Bell, Diamond, Eye, Plus, Video, Users, Compass, Crown,
  MessageCircle, Mic, Sparkles, Star, Globe, Flame
} from 'lucide-react'

interface LiveStream {
  id: string
  title: string
  category: string
  viewerCount: number
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

const FORTUNE_CARDS = [
  { id: 'coffee', name: 'Kahve Falı', sub: 'Fincandaki gizem', image: 'https://cdn.abacus.ai/images/21ba0a63-b56d-4d57-ba0b-de973fac37bc.png', href: '/fallar/kahve-fali', glow: 'rgba(251,191,36,0.35)' },
  { id: 'tarot', name: 'Tarot Falı', sub: 'Kartların sırrı', image: 'https://cdn.abacus.ai/images/ca544a3b-1bab-4e8d-b59b-74c1c45f1a5a.png', href: '/fallar/tarot-fali', glow: 'rgba(192,38,211,0.45)' },
  { id: 'palm', name: 'El Falı', sub: 'Avucunun çizgileri', image: 'https://cdn.abacus.ai/images/b4f2cb29-d97d-45c0-bac0-a1b0defc320b.png', href: '/fallar/el-fali', glow: 'rgba(236,72,153,0.35)' },
  { id: 'dream', name: 'Rüya Tabiri', sub: 'Gördüğün rüyanın anlamı', image: 'https://cdn.abacus.ai/images/087f00ec-3e0e-4330-be79-a7d11efdf65b.png', href: '/fallar/ruya-yorumu', glow: 'rgba(99,102,241,0.4)' },
  { id: 'love', name: 'Aşk Uyumu', sub: 'Kalbinin sesi', image: 'https://cdn.abacus.ai/images/63500b4d-2875-46e7-b3ab-720016070d0c.png', href: '/fallar/ask-uyumu', glow: 'rgba(236,72,153,0.45)' },
  { id: 'horoscope', name: 'Günlük Burç', sub: 'Bugün yıldızlar ne diyor', image: 'https://cdn.abacus.ai/images/fc019303-9170-4a35-a30a-9dafbe6cd0bb.png', href: '/fallar/burc-yorumu', glow: 'rgba(168,85,247,0.45)' },
  { id: 'numerology', name: 'Numeroloji', sub: 'Sayıların gizemi', image: 'https://cdn.abacus.ai/images/f16750b2-d611-45af-a2ec-bb912ea71c80.png', href: '/fallar/numeroloji', glow: 'rgba(59,130,246,0.4)' },
  { id: 'angel', name: 'Melek Kartları', sub: 'İlahi mesajlar', image: 'https://cdn.abacus.ai/images/2983a121-7c1b-4d68-9d58-753b8bec3f5c.png', href: '/fallar/melek-kartlari', glow: 'rgba(250,204,21,0.4)' },
  { id: 'aura', name: 'Aura Okuma', sub: 'Enerjini gör', image: '/fortunes/aura.jpg', href: '/fallar/aura-analizi', glow: 'rgba(34,211,238,0.4)' },
  { id: 'birthchart', name: 'Doğum Haritası', sub: 'Yıldız haritan', image: '/fortunes/birthchart.jpg', href: '/fallar/dogum-haritasi', glow: 'rgba(192,38,211,0.4)' },
  { id: 'katina', name: 'Katina Falı', sub: 'Mistik kartlar', image: '/fortunes/katina.jpg', href: '/fallar/katina', glow: 'rgba(217,70,239,0.4)' },
  { id: 'yesno', name: 'Evet / Hayır', sub: 'Hızlı cevap', image: '/fortunes/yesno.jpg', href: '/fallar/evet-hayir', glow: 'rgba(34,197,94,0.4)' },
  { id: 'kursun', name: 'Kurşun Dökme', sub: 'Geleneksel ritüel', image: '/fortunes/dream.jpg', href: '/fallar/kursundokme', glow: 'rgba(148,163,184,0.4)' },
  { id: 'istihare', name: 'İstihare', sub: 'Manevi rehberlik', image: '/fortunes/angel.jpg', href: '/fallar/istihare', glow: 'rgba(250,204,21,0.4)' },
]

const ROOM_COLORS = ['pink', 'blue', 'purple', 'amber'] as const

export default function CanliDarkHome() {
  const { data: session } = useSession() || {}
  const [streams, setStreams] = useState<LiveStream[]>([])
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [tellers, setTellers] = useState<FortuneTeller[]>([])
  const [credits, setCredits] = useState<number>(0)
  const [unreadCount, setUnreadCount] = useState(0)

  const userName = (session?.user as any)?.name?.split(' ')[0] || 'Misafir'
  const userAvatar = (session?.user as any)?.image

  useEffect(() => {
    const load = async () => {
      try {
        const [s, r, t] = await Promise.all([
          fetch('/api/video-streams').then(x => x.ok ? x.json() : []),
          fetch('/api/chat/rooms?withCounts=true').then(x => x.ok ? x.json() : []),
          fetch('/api/fortune-tellers?sort=top_rated').then(x => x.ok ? x.json() : null),
        ])
        setStreams(s || [])
        setRooms((r || []).sort((a: any, b: any) => (b.onlineCount || 0) - (a.onlineCount || 0)))
        setTellers((t?.tellers || []).slice(0, 12))
      } catch {}
      if (session) {
        try {
          const c = await fetch('/api/user/credits').then(x => x.ok ? x.json() : null)
          if (c?.credits != null) setCredits(c.credits)
          const n = await fetch('/api/notifications?unread=true').then(x => x.ok ? x.json() : null)
          if (n?.unreadCount != null) setUnreadCount(n.unreadCount)
        } catch {}
      }
    }
    load()
    const i = setInterval(load, 30000)
    return () => clearInterval(i)
  }, [session])

  const heroStream = streams[0]
  const popularTellers = tellers.slice(0, 8)

  return (
    <div className="canlidark-bg pb-32 pt-3 px-3 sm:px-4 max-w-2xl mx-auto relative">
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

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <Link href={session ? '/profil' : '/giris'} className="flex items-center gap-2.5">
          <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-fuchsia-400/60 shadow-[0_0_15px_rgba(192,38,211,0.5)]">
            {userAvatar ? (
              <Image src={userAvatar} alt={userName} fill className="object-cover" sizes="44px" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {userName[0]?.toUpperCase()}
              </div>
            )}
            <Sparkles className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-fuchsia-300 drop-shadow-[0_0_4px_rgba(192,38,211,0.9)]" />
          </div>
          <div>
            <p className="text-[11px] text-fuchsia-200/70 leading-tight">Hoş geldin</p>
            <p className="text-sm font-bold text-white leading-tight flex items-center gap-1">
              {userName}
              <Sparkles className="w-3 h-3 text-fuchsia-300" />
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/kredi-satin-al" className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-purple-900/50 border border-purple-500/40 backdrop-blur-md">
            <Diamond className="w-4 h-4 text-cyan-300" />
            <span className="text-sm font-bold text-white">{credits.toLocaleString('tr-TR')}</span>
          </Link>
          <Link href="/bildirimler" className="relative w-10 h-10 rounded-2xl bg-purple-900/50 border border-purple-500/40 backdrop-blur-md flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_6px_rgba(236,72,153,0.9)]" />
            )}
          </Link>
        </div>
      </div>

      {/* Hero Title */}
      <h1 className="canlidark-hero-title mb-4">
        Canlı yayınlara <br />
        <span className="canlidark-hero-title-accent">katıl, eğlenceye</span> ortak ol! <span className="inline-block text-pink-400">♥</span>
      </h1>

      {/* Hero Live Stream Card */}
      {heroStream ? (
        <Link href={`/sohbet/video?watch=${heroStream.id}`} className="block mb-6">
          <div className="canlidark-card relative overflow-hidden h-56">
            {heroStream.user.image ? (
              <Image src={heroStream.user.image} alt={heroStream.user.name} fill className="object-cover" sizes="600px" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-pink-600" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute top-3 left-3">
              <span className="canlidark-live-badge">LIVE</span>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10">
              <Eye className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-bold text-white">{heroStream.viewerCount?.toLocaleString('tr-TR') || 0}</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-2xl font-extrabold text-white drop-shadow-lg">{heroStream.user.name}</h3>
              <p className="text-xs text-fuchsia-200/90 font-medium">{heroStream.category || 'Müzik • Sohbet'}</p>
            </div>
          </div>
        </Link>
      ) : (
        <div className="canlidark-card h-56 mb-6 flex flex-col items-center justify-center gap-3">
          <Video className="w-12 h-12 text-fuchsia-400/70" />
          <p className="text-fuchsia-200/70 text-sm">Şu an canlı yayın yok, ilk olan sen ol!</p>
          <Link href={session ? '/sohbet/video/setup' : '/giris'} className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white text-sm font-bold shadow-lg shadow-fuchsia-500/30">
            Yayın Başlat
          </Link>
        </div>
      )}

      {/* Hızlı İşlemler — + Yayın Başlat + live stream square cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title">Hızlı İşlemler</h2>
          <Link href="/sohbet/video" className="canlidark-section-link">Tümünü gör</Link>
        </div>
        <div className="flex items-stretch gap-2 overflow-x-auto scrollbar-hide pb-1">
          <Link href={session ? '/sohbet/video/setup' : '/giris'} className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 w-[72px]">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 flex items-center justify-center border-2 border-pink-300/50" style={{ boxShadow: '0 0 25px rgba(236, 72, 153, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
              <Plus className="w-8 h-8 text-white" />
            </div>
            <span className="text-[10px] text-white font-semibold text-center leading-tight">Yayın Başlat</span>
          </Link>

          {streams.slice(0, 8).map((s) => (
            <Link key={s.id} href={`/sohbet/video?watch=${s.id}`} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[72px]">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-fuchsia-400/50 shadow-lg shadow-fuchsia-500/30">
                {s.user.image ? (
                  <Image src={s.user.image} alt={s.user.name} fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                    {s.user.name?.[0]}
                  </div>
                )}
                <div className="absolute top-1 left-1 px-1 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded">LIVE</div>
                <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-0.5 px-1 py-0.5 rounded bg-black/60 backdrop-blur-sm">
                  <Eye className="w-2.5 h-2.5 text-white" />
                  <span className="text-[9px] text-white font-bold">{s.viewerCount || 0}</span>
                </div>
              </div>
              <span className="text-[10px] text-white font-semibold text-center leading-tight truncate w-full">{s.user.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Sohbet Odaları — real rooms with backgroundImage */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title">Sesli Sohbet Odaları</h2>
          <Link href="/sesli-sohbet" className="canlidark-section-link">Tüm Odalar</Link>
        </div>
        <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-hide pb-2">
          {rooms.length > 0 ? rooms.slice(0, 10).map((room) => (
            <Link key={room.id} href={`/sesli-sohbet/${room.slug || room.id}`} className="flex-shrink-0 w-32">
              <div className="canlidark-card overflow-hidden">
                <div className="relative w-full h-20 bg-gradient-to-br from-fuchsia-600/40 to-purple-700/40">
                  {room.backgroundImage ? (
                    <Image src={room.backgroundImage} alt={room.nameTr} fill className="object-cover" sizes="128px" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">{room.icon || '🎙️'}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  {(room.onlineCount || 0) > 0 && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/90 backdrop-blur-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[9px] text-white font-bold">{room.onlineCount}</span>
                    </div>
                  )}
                  <Mic className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 text-white drop-shadow" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-bold text-white leading-tight truncate">{room.nameTr}</p>
                  <p className="text-[10px] text-fuchsia-200/70 leading-tight">{room.onlineCount || 0} kişi</p>
                </div>
              </div>
            </Link>
          )) : (
            <p className="text-fuchsia-200/60 text-sm py-4 px-2">Aktif sohbet odası yok</p>
          )}
        </div>
      </div>

      {/* Popüler Falcılar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-400" /> Popüler Falcılar</h2>
          <Link href="/canli-falcilar" className="canlidark-section-link">Tümünü gör</Link>
        </div>
        <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-hide pb-2">
          {popularTellers.length > 0 ? popularTellers.map((t) => {
            const avatar = t.avatar || t.user?.image
            return (
              <Link key={t.id} href={`/canli-falcilar/${t.id}`} className="flex-shrink-0 w-32">
                <div className="canlidark-card overflow-hidden">
                  <div className="relative w-full h-40">
                    {avatar ? (
                      <Image src={avatar} alt={t.displayName} fill className="object-cover" sizes="128px" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                        {t.displayName?.[0]}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    {t.isOnline && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/90 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[9px] text-white font-bold">Çevrimiçi</span>
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5">
                      <p className="text-xs font-bold text-white leading-tight truncate drop-shadow">{t.displayName}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
                        <span className="text-[10px] text-white font-semibold">{t.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-[9px] text-fuchsia-200/70">({t.totalReviews || 0})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          }) : (
            <p className="text-fuchsia-200/60 text-sm py-4 px-2">Yakında öne çıkan falcılar görünecek</p>
          )}
        </div>
      </div>

      {/* Fal & Tarot — ALL fortunes */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title">Fal & Tarot</h2>
          <Link href="/fallar" className="canlidark-section-link">Tüm Fallar</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FORTUNE_CARDS.map((fc) => (
            <Link key={fc.id} href={fc.href} className="canlidark-card overflow-hidden block" style={{ boxShadow: `0 4px 20px ${fc.glow}` }}>
              <div className="relative w-full h-28 bg-black/30">
                <Image src={fc.image} alt={fc.name} fill className="object-cover" sizes="180px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>
              <div className="p-2.5">
                <p className="text-sm font-bold text-white leading-tight">{fc.name}</p>
                <p className="text-[10px] text-fuchsia-200/70 mt-0.5 leading-snug">{fc.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
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
            <Sparkles className="w-7 h-7" />
          </Link>
          <Link href="/abonelikler" className="canlidark-nav-item">
            <Crown className="w-5 h-5" />
            <span>Abonelik</span>
          </Link>
          <Link href="/mesajlar" className="canlidark-nav-item relative">
            <MessageCircle className="w-5 h-5" />
            <span>Mesajlar</span>
            {unreadCount > 0 && <span className="absolute top-0 right-3 w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_6px_rgba(236,72,153,0.9)]" />}
          </Link>
        </div>
      </nav>
    </div>
  )
}
