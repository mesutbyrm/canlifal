'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Users, Star, TrendingUp, Filter, Loader2,
  Music, Film, Trophy, Youtube, Instagram, Tv, UserCheck,
  ChevronLeft, ChevronRight, BadgeCheck, Heart, Globe
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Celebrity {
  id: string
  name: string
  slug: string
  category: string
  bio: string | null
  profileImage: string | null
  coverImage: string | null
  isVerified: boolean
  followerCount: number
  zodiacSign: string | null
  socialLinks: any
  isFollowed: boolean
}

const CATEGORIES = [
  { value: 'all', label: 'Tümü', icon: Users },
  { value: 'oyuncu', label: 'Oyuncular', icon: Film },
  { value: 'sarkici', label: 'Şarkıcılar', icon: Music },
  { value: 'futbolcu', label: 'Futbolcular', icon: Trophy },
  { value: 'futbol_kulubu', label: 'Kulüpler', icon: Trophy },
  { value: 'dizi', label: 'Diziler', icon: Tv },
  { value: 'film_yapim', label: 'Filmler', icon: Film },
  { value: 'streaming', label: 'Platformlar', icon: Globe },
  { value: 'youtuber', label: 'YouTuberlar', icon: Youtube },
  { value: 'influencer', label: 'Influencerlar', icon: Instagram },
  { value: 'muzisyen', label: 'Müzisyenler', icon: Music },
  { value: 'yonetmen', label: 'Yönetmenler', icon: Tv },
  { value: 'tiyatro', label: 'Tiyatrolar', icon: Star },
  { value: 'konser', label: 'Konserler', icon: Music },
  { value: 'festival', label: 'Festivaller', icon: Star },
  { value: 'etkinlik', label: 'Etkinlikler', icon: Star },
  { value: 'diger', label: 'Diğer', icon: Star },
]

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return n.toString()
}

export default function CelebritiesPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const [celebrities, setCelebrities] = useState<Celebrity[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  const fetchCelebrities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'all') params.set('category', category)
      if (search) params.set('search', search)
      params.set('page', page.toString())
      params.set('limit', '20')

      const res = await fetch(`/api/celebrities?${params}`)
      const data = await res.json()
      setCelebrities(data.celebrities || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
      const fIds = new Set<string>((data.celebrities || []).filter((c: Celebrity) => c.isFollowed).map((c: Celebrity) => c.id))
      setFollowingIds(fIds)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [category, search, page])

  useEffect(() => { fetchCelebrities() }, [fetchCelebrities])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleFollow = async (slug: string, id: string) => {
    if (!session?.user) {
      router.push('/giris')
      return
    }
    try {
      const res = await fetch(`/api/celebrities/${slug}/follow`, { method: 'POST' })
      const data = await res.json()
      setFollowingIds(prev => {
        const next = new Set(prev)
        if (data.followed) next.add(id)
        else next.delete(id)
        return next
      })
      setCelebrities(prev => prev.map(c =>
        c.id === id ? { ...c, followerCount: data.followerCount, isFollowed: data.followed } : c
      ))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a] pb-24">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-600/20 via-purple-900/10 to-transparent" />
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-fuchsia-500/20 animate-pulse"
              style={{
                width: Math.random() * 4 + 2 + 'px',
                height: Math.random() * 4 + 2 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                animationDelay: i * 0.3 + 's',
                animationDuration: 2 + Math.random() * 3 + 's',
              }}
            />
          ))}
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-20 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 mb-4">
              <Star className="w-4 h-4 text-fuchsia-400" />
              <span className="text-fuchsia-300 text-sm font-medium">Ünlü Profilleri</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-fuchsia-400 via-purple-300 to-pink-400 bg-clip-text text-transparent mb-3">
              Ünlüleri Keşfet
            </h1>
            <p className="text-purple-300/70 text-sm md:text-base max-w-2xl mx-auto">
              Favori ünlülerini takip et, burç bilgilerini öğren ve profillerini incele
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative max-w-xl mx-auto">
            <input
              type="text"
              placeholder="Ünlü ara..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full px-5 py-3 pl-12 rounded-2xl bg-white/5 border border-purple-500/20 text-white placeholder-purple-400/50 focus:outline-none focus:border-fuchsia-500/50 focus:bg-white/10 transition-all backdrop-blur-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400/50" />
            {searchInput && (
              <button
                onClick={handleSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium transition-colors"
              >
                Ara
              </button>
            )}
          </div>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8 overflow-x-auto scrollbar-hide"
        >
          <div className="flex gap-2 min-w-max justify-center">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              const active = category === cat.value
              return (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setPage(1) }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30'
                      : 'bg-white/5 text-purple-300/70 hover:bg-white/10 hover:text-purple-200 border border-purple-500/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Results count */}
        {!loading && (
          <div className="text-purple-400/60 text-sm mb-4 text-center">
            {total} ünlü bulundu {category !== 'all' && `(${CATEGORIES.find(c => c.value === category)?.label})`}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
          </div>
        ) : celebrities.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
            <p className="text-purple-300/50 text-lg">Henüz ünlü bulunamadı</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {celebrities.map((celeb, i) => (
              <motion.div
                key={celeb.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="group relative rounded-2xl overflow-hidden bg-white/5 border border-purple-500/10 hover:border-fuchsia-500/30 transition-all hover:shadow-xl hover:shadow-fuchsia-500/10 backdrop-blur-sm">
                  {/* Cover/Profile Image */}
                  <Link href={`/unluler/${celeb.slug}`}>
                    <div className="relative aspect-[3/4]">
                      {celeb.profileImage ? (
                        <Image
                          src={celeb.profileImage}
                          alt={celeb.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-fuchsia-900/50 flex items-center justify-center">
                          <Users className="w-12 h-12 text-purple-400/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      {/* Category badge */}
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 backdrop-blur-sm text-fuchsia-300 border border-fuchsia-500/20">
                          {CATEGORIES.find(c => c.value === celeb.category)?.label || celeb.category}
                        </span>
                      </div>

                      {/* Info overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <h3 className="text-white font-semibold text-sm truncate">{celeb.name}</h3>
                          {celeb.isVerified && (
                            <BadgeCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-purple-300/70">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {formatCount(celeb.followerCount)}
                          </span>
                          {celeb.zodiacSign && (
                            <span>• {celeb.zodiacSign}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Follow Button */}
                  <div className="p-2">
                    <button
                      onClick={() => handleFollow(celeb.slug, celeb.id)}
                      className={`w-full py-1.5 rounded-lg text-xs font-medium transition-all ${
                        followingIds.has(celeb.id)
                          ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30 hover:bg-red-600/20 hover:text-red-300 hover:border-red-500/30'
                          : 'bg-fuchsia-600 text-white hover:bg-fuchsia-500 shadow-lg shadow-fuchsia-600/20'
                      }`}
                    >
                      {followingIds.has(celeb.id) ? (
                        <span className="flex items-center justify-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Takip Ediliyor
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          <Heart className="w-3 h-3" />
                          Takip Et
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-white/5 border border-purple-500/10 text-purple-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-purple-300/70 text-sm px-3">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-white/5 border border-purple-500/10 text-purple-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}