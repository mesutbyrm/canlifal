'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Play, Youtube, ArrowLeft, Search, Filter } from 'lucide-react'

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
  category: { title: string; slug: string }
}

export default function VideolarPage() {
  const [videos, setVideos] = useState<TrendVideo[]>([])
  const [categories, setCategories] = useState<VideoCategory[]>([])
  const [selectedCat, setSelectedCat] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const url = selectedCat ? `/api/trend-videos?category=${selectedCat}` : '/api/trend-videos'
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setVideos(data.videos || [])
          if (data.categories) setCategories(data.categories)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchVideos()
  }, [selectedCat])

  const filtered = searchTerm
    ? videos.filter(v => v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.channelName?.toLowerCase().includes(searchTerm.toLowerCase()))
    : videos

  // Group by category
  const grouped = new Map<string, TrendVideo[]>()
  for (const v of filtered) {
    const key = v.category.title
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(v)
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-b from-[#0f0520] via-[#0f0520] to-transparent pb-4 pt-4 px-4">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/" className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-red-500 fill-red-500" />
              Trend Videolar
            </h1>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Video ara..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-fuchsia-500/50"
          />
        </div>

        {/* Category filters */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setSelectedCat('')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                !selectedCat
                  ? 'bg-gradient-to-r from-red-600 to-fuchsia-600 text-white shadow-lg shadow-red-500/20'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Tümü
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.slug)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedCat === cat.slug
                    ? 'bg-gradient-to-r from-red-600 to-fuchsia-600 text-white shadow-lg shadow-red-500/20'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Youtube className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-medium">Henüz video eklenmemiş</p>
            <p className="text-white/20 text-sm mt-1">Yakında yeni videolar eklenecek</p>
          </div>
        ) : selectedCat ? (
          // Single category view - grid
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((video, idx) => (
              <VideoCard key={video.id} video={video} index={idx} />
            ))}
          </div>
        ) : (
          // All categories - grouped
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([catTitle, catVideos]) => (
              <div key={catTitle}>
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-red-500 rounded-full" />
                  {catTitle}
                  <span className="text-white/30 text-xs font-normal">({catVideos.length})</span>
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {catVideos.map((video, idx) => (
                    <VideoCard key={video.id} video={video} index={idx} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function VideoCard({ video, index }: { video: TrendVideo; index: number }) {
  return (
    <motion.a
      href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group block"
    >
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-red-500/30 transition-all hover:shadow-lg hover:shadow-red-500/10">
        <div className="relative aspect-video">
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center">
              <Youtube className="w-10 h-10 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-xl">
              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
            </div>
          </div>
          {/* Duration */}
          {video.duration && (
            <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
              {video.duration}
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="text-xs font-semibold text-white line-clamp-2 leading-tight">{video.title}</p>
          {video.channelName && (
            <p className="text-[10px] text-white/40 mt-1.5 flex items-center gap-1">
              <Youtube className="w-3 h-3 text-red-400" /> {video.channelName}
            </p>
          )}
        </div>
      </div>
    </motion.a>
  )
}
