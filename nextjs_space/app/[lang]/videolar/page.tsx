'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Play, Youtube, ArrowLeft, Search, Eye, TrendingUp, ChevronRight } from 'lucide-react'

interface VideoCategory {
  id: string
  title: string
  slug: string
  description: string | null
}

interface TrendVideo {
  id: string
  title: string
  youtubeId: string
  thumbnailUrl: string | null
  channelName: string | null
  duration: string | null
  viewCount: number
  category: { id: string; title: string; slug: string }
}

export default function VideolarPage() {
  const [allVideos, setAllVideos] = useState<TrendVideo[]>([])
  const [categories, setCategories] = useState<VideoCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [disabled, setDisabled] = useState(false)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch('/api/trend-videos')
        if (res.ok) {
          const data = await res.json()
          setAllVideos(data.videos || [])
          setCategories(data.categories || [])
          setDisabled(Boolean(data.disabled))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchVideos()
  }, [])

  const filtered = searchTerm
    ? allVideos.filter(v => v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.channelName?.toLowerCase().includes(searchTerm.toLowerCase()))
    : allVideos

  // Most watched (top 10 by viewCount)
  const mostWatched = [...filtered].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10)

  // Group remaining by category
  const grouped = new Map<string, TrendVideo[]>()
  for (const v of filtered) {
    const key = v.category.title
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(v)
  }

  return (
    <div className="min-h-screen pb-24 bg-[#0f0520]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-b from-[#0f0520] via-[#0f0520]/95 to-transparent pb-3 pt-4 px-4">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/" className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2 flex-1">
            <Play className="w-5 h-5 text-red-500 fill-red-500" /> Videolar
          </h1>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Video ara..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-red-500/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : allVideos.length === 0 ? (
        <div className="text-center py-20 px-4">
          <Youtube className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-white/40 font-medium">
            {disabled ? 'Trend Videolar bölümü şu anda kapalı.' : 'Henüz video eklenmemiş'}
          </p>
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {/* === EN ÇOK İZLENEN === */}
          {mostWatched.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-500" />
                En Çok İzlenen
              </h2>
              {/* Featured video (first) */}
              {mostWatched[0] && (
                <FeaturedVideoCard video={mostWatched[0]} />
              )}
              {/* Rest in horizontal scroll */}
              {mostWatched.length > 1 && (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide mt-3 pb-1">
                  {mostWatched.slice(1).map((video, idx) => (
                    <SmallVideoCard key={video.id} video={video} index={idx} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === KATEGORİLERE GÖRE VİDEOLAR === */}
          {Array.from(grouped.entries()).map(([catTitle, catVideos]) => (
            <div key={catTitle}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <div className="w-1 h-4 bg-red-500 rounded-full" />
                  {catTitle}
                  <span className="text-white/30 text-xs font-normal">({catVideos.length})</span>
                </h2>
              </div>
              {/* YouTube-style list */}
              <div className="space-y-3">
                {catVideos.map((video, idx) => (
                  <ListVideoCard key={video.id} video={video} index={idx} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Featured large card for #1 most watched
function FeaturedVideoCard({ video }: { video: TrendVideo }) {
  return (
    <Link href={`/videolar/izle/${video.id}`} className="block group">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-red-500/30 transition-all"
      >
        <div className="relative aspect-video">
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" sizes="100vw" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-800 to-red-950 flex items-center justify-center">
              <Youtube className="w-12 h-12 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center shadow-2xl">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </div>
          {video.duration && (
            <span className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-0.5 rounded font-medium">{video.duration}</span>
          )}
          {/* #1 badge */}
          <span className="absolute top-3 left-3 bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-lg">
            #1 En Çok İzlenen
          </span>
        </div>
        <div className="p-4">
          <h3 className="text-base font-bold text-white line-clamp-2 group-hover:text-red-300 transition-colors">{video.title}</h3>
          <div className="flex items-center gap-3 mt-2">
            {video.channelName && (
              <span className="text-white/50 text-xs flex items-center gap-1">
                <Youtube className="w-3 h-3 text-red-400" /> {video.channelName}
              </span>
            )}
            <span className="text-white/40 text-xs flex items-center gap-1">
              <Eye className="w-3 h-3" /> {video.viewCount.toLocaleString()}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

// Small card for horizontal scroll
function SmallVideoCard({ video, index }: { video: TrendVideo; index: number }) {
  return (
    <Link href={`/videolar/izle/${video.id}`} className="flex-shrink-0 w-44 group">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-red-500/30 transition-all h-full"
      >
        <div className="relative aspect-video">
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" sizes="176px" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center">
              <Youtube className="w-6 h-6 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-red-600/90 flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>
          {video.duration && <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 rounded">{video.duration}</span>}
        </div>
        <div className="p-2">
          <p className="text-[11px] font-semibold text-white line-clamp-2 leading-tight">{video.title}</p>
          <div className="flex items-center gap-1 mt-1">
            <Eye className="w-2.5 h-2.5 text-white/30" />
            <span className="text-[9px] text-white/30">{video.viewCount.toLocaleString()}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

// YouTube-style horizontal list card
function ListVideoCard({ video, index }: { video: TrendVideo; index: number }) {
  return (
    <Link href={`/videolar/izle/${video.id}`} className="group">
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04 }}
        className="flex gap-3"
      >
        <div className="relative w-40 h-[90px] rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" sizes="160px" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center">
              <Youtube className="w-6 h-6 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-red-600/90 flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>
          {video.duration && <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded">{video.duration}</span>}
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <p className="text-xs font-semibold text-white line-clamp-2 leading-tight group-hover:text-red-300 transition-colors">{video.title}</p>
          {video.channelName && (
            <p className="text-[10px] text-white/40 mt-1">{video.channelName}</p>
          )}
          <span className="text-[10px] text-white/30 flex items-center gap-1 mt-1">
            <Eye className="w-3 h-3" /> {video.viewCount.toLocaleString()} görüntülenme
          </span>
        </div>
      </motion.div>
    </Link>
  )
}
