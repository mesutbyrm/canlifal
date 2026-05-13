'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSiteTheme } from '@/lib/theme-context'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Eye, Heart, Pin, ArrowRight, Flame, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Trend {
  id: string
  title: string
  slug: string
  category: string
  description: string | null
  image: string | null
  icon: string | null
  trendScore: number
  viewCount: number
  likeCount: number
  isActive: boolean
  isPinned: boolean
  relatedUrl: string | null
  tags: string | null
  startDate: string
  endDate: string | null
}

const CATEGORIES = [
  { value: 'hepsi', label: 'Hepsi', icon: '🔥' },
  { value: 'burc', label: 'Burçlar', icon: '♈' },
  { value: 'fal', label: 'Fallar', icon: '🔮' },
  { value: 'unlu', label: 'Ünlüler', icon: '⭐' },
  { value: 'genel', label: 'Genel', icon: '📢' },
  { value: 'oyun', label: 'Oyunlar', icon: '🎮' },
  { value: 'etkinlik', label: 'Etkinlikler', icon: '🎉' },
]

function getCategoryColor(cat: string) {
  const colors: Record<string, string> = {
    burc: 'from-indigo-500 to-purple-600',
    fal: 'from-fuchsia-500 to-pink-600',
    unlu: 'from-amber-500 to-orange-600',
    genel: 'from-cyan-500 to-blue-600',
    oyun: 'from-green-500 to-emerald-600',
    etkinlik: 'from-rose-500 to-red-600',
  }
  return colors[cat] || 'from-purple-500 to-fuchsia-600'
}

function getCategoryIcon(cat: string) {
  const icons: Record<string, string> = {
    burc: '♈', fal: '🔮', unlu: '⭐', genel: '📢', oyun: '🎮', etkinlik: '🎉',
  }
  return icons[cat] || '🔥'
}

export default function TrendlerPage() {
  const { theme } = useSiteTheme()
  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('hepsi')
  const [searchQuery, setSearchQuery] = useState('')
  const [likedTrends, setLikedTrends] = useState<Set<string>>(new Set())

  const isDark = theme === 'mystical' || theme === 'canlidark' || theme === 'falclub' || theme === 'cosmic'

  const fetchTrends = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/trends?category=${category}&limit=50`)
      const data = await res.json()
      setTrends(data.trends || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [category])

  useEffect(() => {
    fetchTrends()
  }, [fetchTrends])

  const handleLike = async (slug: string) => {
    if (likedTrends.has(slug)) return
    try {
      const res = await fetch(`/api/trends/${slug}/like`, { method: 'POST' })
      if (res.ok) {
        setLikedTrends(prev => new Set(prev).add(slug))
        setTrends(prev => prev.map(t => t.slug === slug ? { ...t, likeCount: t.likeCount + 1 } : t))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredTrends = searchQuery
    ? trends.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : trends

  const pinnedTrends = filteredTrends.filter(t => t.isPinned)
  const regularTrends = filteredTrends.filter(t => !t.isPinned)

  return (
    <div className={`min-h-screen ${isDark ? 'bg-transparent' : 'bg-gray-50'} pb-24`}>
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/20 via-purple-600/20 to-indigo-600/20" />
        <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/30 rounded-full px-4 py-1.5 mb-4">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className={`text-sm font-medium ${isDark ? 'text-fuchsia-200' : 'text-fuchsia-700'}`}>Canlı Trendler</span>
            </div>
            <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              🔥 Trendler
            </h1>
            <p className={`text-sm sm:text-base ${isDark ? 'text-purple-200/70' : 'text-gray-500'}`}>
              Platformdaki en popüler konular ve güncel trendler
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-purple-400' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Trend ara..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${
                isDark
                  ? 'bg-[#1a0a2e]/60 border-fuchsia-900/30 text-white placeholder-purple-400'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50`}
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                category === cat.value
                  ? isDark
                    ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-500/25'
                    : 'bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white shadow-lg'
                  : isDark
                    ? 'bg-[#1a0a2e]/60 border border-fuchsia-900/30 text-purple-300 hover:bg-fuchsia-900/20'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" />
          </div>
        ) : filteredTrends.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-purple-400/30' : 'text-gray-300'}`} />
            <p className={`text-lg font-medium ${isDark ? 'text-purple-300' : 'text-gray-500'}`}>
              Henüz trend yok
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-purple-400/50' : 'text-gray-400'}`}>
              Yakında yeni trendler eklenecek
            </p>
          </div>
        ) : (
          <>
            {/* Pinned trends - featured section */}
            {pinnedTrends.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Pin className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Öne Çıkan Trendler
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pinnedTrends.map((trend, i) => (
                    <TrendCard key={trend.id} trend={trend} index={i} isDark={isDark} featured onLike={handleLike} liked={likedTrends.has(trend.slug)} />
                  ))}
                </div>
              </div>
            )}

            {/* Regular trends */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {regularTrends.map((trend, i) => (
                  <TrendCard key={trend.id} trend={trend} index={i} isDark={isDark} onLike={handleLike} liked={likedTrends.has(trend.slug)} />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TrendCard({ trend, index, isDark, featured, onLike, liked }: {
  trend: Trend
  index: number
  isDark: boolean
  featured?: boolean
  onLike: (slug: string) => void
  liked: boolean
}) {
  const tags = trend.tags ? (() => { try { return JSON.parse(trend.tags) } catch { return [] } })() : []
  const catColor = getCategoryColor(trend.category)
  const catIcon = trend.icon || getCategoryIcon(trend.category)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className={`group rounded-2xl overflow-hidden border transition-all hover:scale-[1.02] hover:shadow-xl ${
        isDark
          ? 'bg-[#1a0a2e]/70 border-fuchsia-900/30 hover:border-fuchsia-500/50 backdrop-blur-md'
          : 'bg-white border-gray-200 hover:border-fuchsia-300 shadow-sm'
      } ${featured ? 'ring-2 ring-amber-400/30' : ''}`}
    >
      {/* Image / Gradient Header */}
      {trend.image ? (
        <div className="relative aspect-[2/1] bg-gray-800">
          <Image
            src={trend.image}
            alt={trend.title}
            fill
            className="object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <div className={`inline-flex items-center gap-1 bg-gradient-to-r ${catColor} rounded-full px-2.5 py-0.5 text-xs font-medium text-white mb-1.5`}>
              <span>{catIcon}</span>
              {CATEGORIES.find(c => c.value === trend.category)?.label || trend.category}
            </div>
            <h3 className="text-lg font-bold text-white line-clamp-2">{trend.title}</h3>
          </div>
          {trend.isPinned && (
            <div className="absolute top-3 right-3 bg-amber-500 text-white rounded-full p-1.5">
              <Pin className="w-3 h-3" />
            </div>
          )}
        </div>
      ) : (
        <div className={`relative aspect-[2.5/1] bg-gradient-to-br ${catColor} p-4 flex flex-col justify-end`}>
          <div className="absolute top-3 right-3 text-3xl opacity-30">{catIcon}</div>
          {trend.isPinned && (
            <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm text-white rounded-full p-1.5">
              <Pin className="w-3 h-3" />
            </div>
          )}
          <div className={`inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-xs font-medium text-white mb-1.5 w-fit`}>
            <span>{catIcon}</span>
            {CATEGORIES.find(c => c.value === trend.category)?.label || trend.category}
          </div>
          <h3 className="text-lg font-bold text-white line-clamp-2">{trend.title}</h3>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {trend.description && (
          <p className={`text-sm line-clamp-2 mb-3 ${isDark ? 'text-purple-200/70' : 'text-gray-600'}`}>
            {trend.description}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, 4).map((tag: string, i: number) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-fuchsia-900/30 text-fuchsia-300' : 'bg-fuchsia-50 text-fuchsia-600'
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-purple-300/60' : 'text-gray-400'}`}>
              <Eye className="w-3.5 h-3.5" />
              {trend.viewCount.toLocaleString('tr-TR')}
            </div>
            <button
              onClick={() => onLike(trend.slug)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                liked
                  ? 'text-red-400'
                  : isDark ? 'text-purple-300/60 hover:text-red-400' : 'text-gray-400 hover:text-red-400'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
              {trend.likeCount.toLocaleString('tr-TR')}
            </button>
            <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-orange-400/70' : 'text-orange-500'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              {trend.trendScore}
            </div>
          </div>

          {trend.relatedUrl && (
            <Link
              href={trend.relatedUrl}
              className={`flex items-center gap-1 text-xs font-medium ${
                isDark ? 'text-fuchsia-400 hover:text-fuchsia-300' : 'text-fuchsia-600 hover:text-fuchsia-700'
              }`}
            >
              Keşfet <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  )
}
