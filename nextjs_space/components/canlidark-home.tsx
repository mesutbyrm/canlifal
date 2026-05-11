'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import {
  Bell, Diamond, Eye, Plus, Video, Users, Compass, Crown,
  MessageCircle, Mic, Sparkles, Star, Globe, Flame, Gamepad2, Gift, UserPlus, Zap
} from 'lucide-react'

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

const FORTUNE_CARDS = [
  { id: 'coffee', name: 'Kahve Fal\u0131', sub: 'Fincandaki gizem', image: 'https://cdn.abacus.ai/images/21ba0a63-b56d-4d57-ba0b-de973fac37bc.png', href: '/fallar/kahve-fali', glow: 'rgba(251,191,36,0.35)' },
  { id: 'tarot', name: 'Tarot Fal\u0131', sub: 'Kartlar\u0131n s\u0131rr\u0131', image: 'https://cdn.abacus.ai/images/ca544a3b-1bab-4e8d-b59b-74c1c45f1a5a.png', href: '/fallar/tarot-fali', glow: 'rgba(192,38,211,0.45)' },
  { id: 'palm', name: 'El Fal\u0131', sub: 'Avucunun \u00e7izgileri', image: 'https://cdn.abacus.ai/images/b4f2cb29-d97d-45c0-bac0-a1b0defc320b.png', href: '/fallar/el-fali', glow: 'rgba(236,72,153,0.35)' },
  { id: 'dream', name: 'R\u00fcya Tabiri', sub: 'R\u00fcyan\u0131n anlam\u0131', image: 'https://cdn.abacus.ai/images/087f00ec-3e0e-4330-be79-a7d11efdf65b.png', href: '/fallar/ruya-yorumu', glow: 'rgba(99,102,241,0.4)' },
  { id: 'love', name: 'A\u015fk Uyumu', sub: 'Kalbinin sesi', image: 'https://cdn.abacus.ai/images/63500b4d-2875-46e7-b3ab-720016070d0c.png', href: '/fallar/ask-uyumu', glow: 'rgba(236,72,153,0.45)' },
  { id: 'horoscope', name: 'G\u00fcnl\u00fck Bur\u00e7', sub: 'Y\u0131ld\u0131zlar ne diyor', image: 'https://cdn.abacus.ai/images/fc019303-9170-4a35-a30a-9dafbe6cd0bb.png', href: '/fallar/burc-yorumu', glow: 'rgba(168,85,247,0.45)' },
  { id: 'numerology', name: 'Numeroloji', sub: 'Say\u0131lar\u0131n gizemi', image: 'https://cdn.abacus.ai/images/f16750b2-d611-45af-a2ec-bb912ea71c80.png', href: '/fallar/numeroloji', glow: 'rgba(59,130,246,0.4)' },
  { id: 'angel', name: 'Melek Kartlar\u0131', sub: '\u0130lahi mesajlar', image: 'https://cdn.abacus.ai/images/2983a121-7c1b-4d68-9d58-753b8bec3f5c.png', href: '/fallar/melek-kartlari', glow: 'rgba(250,204,21,0.4)' },
  { id: 'aura', name: 'Aura Okuma', sub: 'Enerjini g\u00f6r', image: '/fortunes/aura.jpg', href: '/fallar/aura-analizi', glow: 'rgba(34,211,238,0.4)' },
  { id: 'birthchart', name: 'Do\u011fum Haritas\u0131', sub: 'Y\u0131ld\u0131z haritan', image: '/fortunes/birthchart.jpg', href: '/fallar/dogum-haritasi', glow: 'rgba(192,38,211,0.4)' },
  { id: 'katina', name: 'Katina Fal\u0131', sub: 'Mistik kartlar', image: '/fortunes/katina.jpg', href: '/fallar/katina', glow: 'rgba(217,70,239,0.4)' },
  { id: 'yesno', name: 'Evet / Hay\u0131r', sub: 'H\u0131zl\u0131 cevap', image: '/fortunes/yesno.jpg', href: '/fallar/evet-hayir', glow: 'rgba(34,197,94,0.4)' },
  { id: 'kursun', name: 'Kur\u015fun D\u00f6kme', sub: 'Geleneksel rit\u00fcel', image: '/fortunes/dream.jpg', href: '/fallar/kursundokme', glow: 'rgba(148,163,184,0.4)' },
  { id: 'istihare', name: '\u0130stihare', sub: 'Manevi rehberlik', image: '/fortunes/angel.jpg', href: '/fallar/istihare', glow: 'rgba(250,204,21,0.4)' },
]

const ROOM_COLORS = ['from-pink-500 to-rose-500', 'from-blue-500 to-cyan-500', 'from-purple-500 to-fuchsia-500', 'from-amber-500 to-orange-500'] as const

export default function CanliDarkHome() {
  const { data: session } = useSession() || {}
  const [streams, setStreams] = useState<LiveStream[]>([])
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [tellers, setTellers] = useState<FortuneTeller[]>([])
  const [credits, setCredits] = useState<number>(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [heroText, setHeroText] = useState('Canl\u0131 yay\u0131nlara\nkat\u0131l, e\u011flenceye ortak ol!')

  const userName = (session?.user as any)?.name?.split(' ')[0] || 'Misafir'
  const userAvatar = (session?.user as any)?.image

  useEffect(() => {
    fetch('/api/settings/canlidark-hero').then(r => r.ok ? r.json() : null).then(d => { if (d?.text) setHeroText(d.text) }).catch(() => {})
  }, [])

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
            <p className="text-[11px] text-fuchsia-200/70 leading-tight">Ho\u015f geldin</p>
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
        {heroText.split('\n').map((line, i, arr) => (
          <span key={i}>
            {i === 1 ? <span className="canlidark-hero-title-accent">{line}</span> : line}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
        {' '}<span className="inline-block text-pink-400">\u2665</span>
      </h1>

      {/* \u2550\u2550\u2550 CANLI YAYINLAR \u2550\u2550\u2550 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title">Canl\u0131 Yay\u0131nlar</h2>
          <Link href="/sohbet/video" className="canlidark-section-link">T\u00fcm\u00fcn\u00fc g\u00f6r</Link>
        </div>
        <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-hide pb-2">
          {/* + Yay\u0131n Ba\u015flat card */}
          <Link
            href={session ? '/sohbet/video/setup' : '/giris'}
            className="flex-shrink-0 w-[calc(33.33%-8px)] min-w-[110px] canlidark-card overflow-hidden flex flex-col items-center justify-center gap-2 h-36"
          >
            <div
              className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 flex items-center justify-center border-2 border-pink-300/50"
              style={{ boxShadow: '0 0 25px rgba(236, 72, 153, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)' }}
            >
              <Plus className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs text-white font-bold text-center leading-tight">Yay\u0131n Ba\u015flat</span>
          </Link>

          {/* Live stream cards \u2014 show live thumbnail / broadcastImage */}
          {streams.length > 0 ? (
            streams.map((s) => {
              const streamThumb = s.thumbnailUrl || s.broadcastImage || s.user.image
              return (
                <Link key={s.id} href={`/sohbet/video?watch=${s.id}`} className="flex-shrink-0 w-[calc(33.33%-8px)] min-w-[110px]">
                  <div className="canlidark-card relative overflow-hidden h-36">
                    {streamThumb ? (
                      <Image src={streamThumb} alt={s.user.name} fill className="object-cover" sizes="180px" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-pink-600" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-2 left-2">
                      <span className="canlidark-live-badge text-[9px] px-1.5 py-0.5">LIVE</span>
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm border border-white/10">
                      <Eye className="w-3 h-3 text-white" />
                      <span className="text-[10px] font-bold text-white">{s.viewerCount || 0}</span>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-xs font-bold text-white truncate drop-shadow-lg">{s.user.name}</p>
                      <p className="text-[9px] text-fuchsia-200/80 truncate">{s.category || s.title || 'Canl\u0131 Yay\u0131n'}</p>
                    </div>
                  </div>
                </Link>
              )
            })
          ) : (
            <div className="flex-shrink-0 w-[calc(66.66%-4px)] canlidark-card overflow-hidden flex flex-col items-center justify-center gap-2 h-36">
              <Video className="w-10 h-10 text-fuchsia-400/50" />
              <p className="text-fuchsia-200/60 text-xs text-center px-2">\u015eu an canl\u0131 yay\u0131n yok<br />\u0130lk olan sen ol!</p>
            </div>
          )}
        </div>
      </div>

      {/* \u2550\u2550\u2550 HIZLI \u0130\u015eLEMLER \u2550\u2550\u2550 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title">H\u0131zl\u0131 \u0130\u015flemler</h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Link href="/oyunlar" className="canlidark-glass rounded-2xl p-3 flex flex-col items-center gap-2 border border-purple-500/20">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-white font-semibold text-center leading-tight">Oyunlar</span>
          </Link>
          <Link href="/davet" className="canlidark-glass rounded-2xl p-3 flex flex-col items-center gap-2 border border-purple-500/20">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-white font-semibold text-center leading-tight">Davet Et</span>
          </Link>
          <Link href="/hediyeler" className="canlidark-glass rounded-2xl p-3 flex flex-col items-center gap-2 border border-purple-500/20">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-white font-semibold text-center leading-tight">Hediye</span>
          </Link>
          <Link href="/bana-ozel" className="canlidark-glass rounded-2xl p-3 flex flex-col items-center gap-2 border border-purple-500/20">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-white font-semibold text-center leading-tight">Bana \u00d6zel</span>
          </Link>
        </div>
      </div>

      {/* \u2550\u2550\u2550 SESLI SOHBET ODALARI \u2014 circular mockup style \u2550\u2550\u2550 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title">Sesli Sohbet Odalar\u0131</h2>
          <Link href="/sesli-sohbet" className="canlidark-section-link">T\u00fcm Odalar</Link>
        </div>
        <div className="flex items-start gap-4 overflow-x-auto scrollbar-hide pb-2">
          {rooms.length > 0 ? rooms.slice(0, 10).map((room, idx) => (
            <Link key={room.id} href={`/sesli-sohbet/${room.slug || room.id}`} className="flex-shrink-0 flex flex-col items-center gap-2 w-[76px]">
              <div className="relative">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${ROOM_COLORS[idx % ROOM_COLORS.length]} p-[2px] shadow-lg`} style={{ boxShadow: `0 0 20px rgba(192,38,211,0.3)` }}>
                  <div className="w-full h-full rounded-full overflow-hidden relative">
                    {room.backgroundImage ? (
                      <Image src={room.backgroundImage} alt={room.nameTr} fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-800 to-fuchsia-900 flex items-center justify-center text-2xl">
                        {room.icon || '\ud83c\udf99\ufe0f'}
                      </div>
                    )}
                  </div>
                </div>
                {/* Mic badge */}
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-fuchsia-500 flex items-center justify-center border-2 border-[#0a0118]">
                  <Mic className="w-2.5 h-2.5 text-white" />
                </div>
                {/* Online count badge */}
                {(room.onlineCount || 0) > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center border-2 border-[#0a0118] px-1">
                    <span className="text-[8px] text-white font-bold">{room.onlineCount}</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold text-white leading-tight truncate w-[76px]">{room.nameTr}</p>
                <p className="text-[9px] text-fuchsia-200/60">{room.onlineCount || 0} ki\u015fi</p>
              </div>
            </Link>
          )) : (
            <p className="text-fuchsia-200/60 text-sm py-4 px-2">Aktif sohbet odas\u0131 yok</p>
          )}
        </div>
      </div>

      {/* \u2550\u2550\u2550 FAL & TAROT \u2014 4-column grid, stacked \u2550\u2550\u2550 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title">Fal & Tarot</h2>
          <Link href="/fallar" className="canlidark-section-link">T\u00fcm Fallar</Link>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {FORTUNE_CARDS.map((fc) => (
            <Link key={fc.id} href={fc.href} className="flex flex-col items-center gap-1.5">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden canlidark-glass border border-purple-500/20" style={{ boxShadow: `0 4px 16px ${fc.glow}` }}>
                <Image src={fc.image} alt={fc.name} fill className="object-cover" sizes="100px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>
              <p className="text-[10px] font-semibold text-white text-center leading-tight truncate w-full">{fc.name}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* \u2550\u2550\u2550 POP\u00dcLER FALCILAR \u2550\u2550\u2550 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="canlidark-section-title flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-400" /> Pop\u00fcler Falc\u0131lar</h2>
          <Link href="/canli-falcilar" className="canlidark-section-link">T\u00fcm\u00fcn\u00fc g\u00f6r</Link>
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
                        <span className="text-[9px] text-white font-bold">\u00c7evrimi\u00e7i</span>
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
            <p className="text-fuchsia-200/60 text-sm py-4 px-2">Yak\u0131nda \u00f6ne \u00e7\u0131kan falc\u0131lar g\u00f6r\u00fcnecek</p>
          )}
        </div>
      </div>

      {/* \u2550\u2550\u2550 BOTTOM NAV \u2550\u2550\u2550 */}
      <nav className="canlidark-bottom-nav">
        <div className="canlidark-nav-inner">
          <Link href="/kesfet" className="canlidark-nav-item">
            <Compass className="w-5 h-5" />
            <span>Ke\u015ffet</span>
          </Link>
          <Link href="/sosyal" className="canlidark-nav-item">
            <Globe className="w-5 h-5" />
            <span>Sosyal</span>
          </Link>
          <Link href={session ? '/sohbet/video/setup' : '/giris'} className="canlidark-nav-fab" aria-label="Yay\u0131n Ba\u015flat">
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
