'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Film, Tv, TrendingUp, Star, Search, Loader2,
  Calendar, Clock, Play, ChevronRight, Flame, Eye
} from 'lucide-react'

interface MediaItem {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  vote_average: number
  vote_count: number
  release_date?: string
  first_air_date?: string
  media_type?: string
  genre_ids: number[]
}

const TMDB_IMG = 'https://image.tmdb.org/t/p'

type SectionType = 'trending' | 'movies' | 'tv' | 'search'

const GENRE_MAP: Record<number, string> = {
  28: 'Aksiyon', 12: 'Macera', 16: 'Animasyon', 35: 'Komedi',
  80: 'Suç', 99: 'Belgesel', 18: 'Dram', 10751: 'Aile',
  14: 'Fantastik', 36: 'Tarih', 27: 'Korku', 10402: 'Müzik',
  9648: 'Gizem', 10749: 'Romantik', 878: 'Bilim Kurgu',
  10770: 'TV Filmi', 53: 'Gerilim', 10752: 'Savaş', 37: 'Western',
  10759: 'Aksiyon & Macera', 10762: 'Çocuk', 10763: 'Haber',
  10764: 'Reality', 10765: 'Bilim Kurgu & Fantastik', 10766: 'Pembe Dizi',
  10767: 'Talk Show', 10768: 'Savaş & Politik',
}

export default function DiziFilmPage() {
  const params = useParams()
  const lang = params?.lang as string
  const [section, setSection] = useState<SectionType>('trending')
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MediaItem[]>([])
  const [searching, setSearching] = useState(false)
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([])
  const [trendingTv, setTrendingTv] = useState<MediaItem[]>([])
  const [nowPlaying, setNowPlaying] = useState<MediaItem[]>([])

  const fetchTrending = useCallback(async () => {
    setLoading(true)
    try {
      const [trend, movies, tv, playing] = await Promise.all([
        fetch('/api/tmdb?action=trending&type=all').then(r => r.json()),
        fetch('/api/tmdb?action=popular-movies').then(r => r.json()),
        fetch('/api/tmdb?action=popular-tv').then(r => r.json()),
        fetch('/api/tmdb?action=now-playing').then(r => r.json()),
      ])
      setItems(trend.results || [])
      setTrendingMovies(movies.results || [])
      setTrendingTv(tv.results || [])
      setNowPlaying(playing.results || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMovies = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tmdb?action=popular-movies')
      const data = await res.json()
      setItems(data.results || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTv = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tmdb?action=popular-tv')
      const data = await res.json()
      setItems(data.results || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/tmdb?action=search&query=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data.results || [])
      setSection('search')
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }, [searchQuery])

  useEffect(() => {
    if (section === 'trending') fetchTrending()
    else if (section === 'movies') fetchMovies()
    else if (section === 'tv') fetchTv()
  }, [section, fetchTrending, fetchMovies, fetchTv])

  const renderCard = (item: MediaItem, i: number) => {
    const title = item.title || item.name || ''
    const date = item.release_date || item.first_air_date || ''
    const year = date ? new Date(date).getFullYear() : ''
    const type = item.media_type || (item.title ? 'movie' : 'tv')
    const poster = item.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null
    const detailUrl = `/${lang}/dizi-film/${type}/${item.id}`

    return (
      <motion.div
        key={`${item.id}-${type}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: i * 0.03 }}
      >
        <Link href={detailUrl} className="group block">
          <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-purple-900/20">
            {poster ? (
              <Image
                src={poster}
                alt={title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="w-10 h-10 text-purple-500/20" />
              </div>
            )}
            {/* Rating Badge */}
            {item.vote_average > 0 && (
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-bold text-yellow-300">{item.vote_average.toFixed(1)}</span>
              </div>
            )}
            {/* Type Badge */}
            <div className="absolute top-2 left-2">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                type === 'movie'
                  ? 'bg-blue-500/80 text-white'
                  : 'bg-fuchsia-500/80 text-white'
              }`}>
                {type === 'movie' ? 'Film' : 'Dizi'}
              </span>
            </div>
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
              <Play className="w-8 h-8 text-white/80" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-medium text-white truncate group-hover:text-fuchsia-400 transition-colors">{title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {year && <span className="text-xs text-purple-400/40">{year}</span>}
              {item.genre_ids?.[0] && GENRE_MAP[item.genre_ids[0]] && (
                <span className="text-xs text-purple-400/30">{GENRE_MAP[item.genre_ids[0]]}</span>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    )
  }

  const renderHorizontalRow = (title: string, icon: React.ReactNode, data: MediaItem[]) => {
    if (data.length === 0) return null
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
          {data.slice(0, 10).map((item, i) => {
            const t = item.title || item.name || ''
            const type = item.media_type || (item.title ? 'movie' : 'tv')
            const poster = item.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null
            const detailUrl = `/${lang}/dizi-film/${type}/${item.id}`
            return (
              <Link key={`${item.id}-${type}-h`} href={detailUrl} className="flex-shrink-0 w-28 group">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-purple-900/20">
                  {poster ? (
                    <Image src={poster} alt={t} fill sizes="120px" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-purple-500/20" /></div>
                  )}
                  {item.vote_average > 0 && (
                    <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded bg-black/70 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-[9px] font-bold text-yellow-300">{item.vote_average.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-white truncate mt-1.5 group-hover:text-fuchsia-400 transition-colors">{t}</p>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a] pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-900/30 via-purple-900/20 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
                <Film className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Dizi & Film</h1>
                <p className="text-fuchsia-400/60 text-sm">Vizyondakiler, popüler diziler ve daha fazlası</p>
              </div>
            </div>
          </motion.div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/40" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Film veya dizi ara..."
              className="w-full pl-10 pr-20 py-3 rounded-xl bg-white/5 border border-purple-500/10 text-white placeholder-purple-400/30 text-sm focus:outline-none focus:border-fuchsia-500/30"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-fuchsia-600 text-white text-xs font-medium hover:bg-fuchsia-500 disabled:opacity-40 transition-colors"
            >
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ara'}
            </button>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-4 mb-4">
        <div className="flex border-b border-purple-500/10">
          {[
            { key: 'trending' as const, label: 'Trend', icon: TrendingUp },
            { key: 'movies' as const, label: 'Filmler', icon: Film },
            { key: 'tv' as const, label: 'Diziler', icon: Tv },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setSection(t.key); setSearchQuery(''); setSearchResults([]) }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                section === t.key
                  ? 'border-fuchsia-500 text-fuchsia-400'
                  : 'border-transparent text-purple-400/50 hover:text-purple-300'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4">
        {section === 'search' && searchResults.length > 0 ? (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">
              <Search className="w-4 h-4 inline mr-2" />
              &ldquo;{searchQuery}&rdquo; için sonuçlar
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {searchResults.filter(r => r.poster_path && (r.media_type === 'movie' || r.media_type === 'tv')).map((item, i) => renderCard(item, i))}
            </div>
          </div>
        ) : section === 'search' && !searching ? (
          <div className="text-center py-16">
            <Search className="w-14 h-14 text-purple-500/20 mx-auto mb-3" />
            <p className="text-purple-300/40">Sonuç bulunamadı</p>
          </div>
        ) : null}

        {loading && section !== 'search' ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
          </div>
        ) : (
          <>
            {section === 'trending' && (
              <div>
                {/* Hero Trending */}
                {items.length > 0 && items[0].backdrop_path && (
                  <Link href={`/${lang}/dizi-film/${items[0].media_type || 'movie'}/${items[0].id}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative rounded-2xl overflow-hidden mb-8 aspect-video max-h-[300px] group"
                    >
                      <Image
                        src={`${TMDB_IMG}/w1280${items[0].backdrop_path}`}
                        alt={items[0].title || items[0].name || ''}
                        fill
                        sizes="100vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Flame className="w-4 h-4 text-orange-400" />
                          <span className="text-xs font-bold text-orange-400 uppercase">1 Numaralı Trend</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">{items[0].title || items[0].name}</h2>
                        <p className="text-sm text-white/60 mt-1 line-clamp-2 max-w-lg">{items[0].overview}</p>
                      </div>
                    </motion.div>
                  </Link>
                )}

                {renderHorizontalRow('Vizyondakiler', <Calendar className="w-5 h-5 text-blue-400" />, nowPlaying)}
                {renderHorizontalRow('Popüler Filmler', <Film className="w-5 h-5 text-emerald-400" />, trendingMovies)}
                {renderHorizontalRow('Popüler Diziler', <Tv className="w-5 h-5 text-fuchsia-400" />, trendingTv)}

                {/* Trending Grid */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                    <h2 className="text-lg font-bold text-white">Bu Haftanın Trendleri</h2>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {items.slice(1, 19).map((item, i) => renderCard(item, i))}
                  </div>
                </div>
              </div>
            )}

            {section === 'movies' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {items.map((item, i) => renderCard({ ...item, media_type: 'movie' }, i))}
              </div>
            )}

            {section === 'tv' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {items.map((item, i) => renderCard({ ...item, media_type: 'tv' }, i))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
