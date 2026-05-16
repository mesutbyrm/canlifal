'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Play, Youtube, Eye, Clock, User } from 'lucide-react'

interface VideoDetail {
  id: string
  title: string
  youtubeId: string
  thumbnailUrl: string | null
  channelName: string | null
  duration: string | null
  viewCount: number
  category: { id: string; title: string; slug: string }
}

interface RelatedVideo {
  id: string
  title: string
  youtubeId: string
  thumbnailUrl: string | null
  channelName: string | null
  duration: string | null
  viewCount: number
  category: { title: string; slug: string }
}

export default function VideoWatchPage() {
  const params = useParams()
  const videoId = params?.id as string
  const [video, setVideo] = useState<VideoDetail | null>(null)
  const [related, setRelated] = useState<RelatedVideo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!videoId) return
    const loadVideo = async () => {
      try {
        // Fetch all videos and find the one we need
        const res = await fetch('/api/trend-videos?limit=100')
        if (res.ok) {
          const data = await res.json()
          const allVideos = data.videos || []
          const found = allVideos.find((v: any) => v.id === videoId)
          if (found) {
            setVideo(found)
            // Increment view count
            fetch('/api/trend-videos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoId })
            }).catch(() => {})
            // Related videos from same category + others
            const sameCategory = allVideos.filter((v: any) => v.category.id === found.category.id && v.id !== found.id)
            const otherVideos = allVideos.filter((v: any) => v.category.id !== found.category.id)
            setRelated([...sameCategory.slice(0, 5), ...otherVideos.slice(0, 5)])
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadVideo()
  }, [videoId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <Youtube className="w-16 h-16 text-white/10 mb-4" />
        <p className="text-white/40 font-medium">Video bulunamadı</p>
        <Link href="/videolar" className="mt-4 px-6 py-2 bg-fuchsia-600 text-white rounded-xl text-sm">Videolara Dön</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ═══ STICKY TOP: Video Player + Info ═══ */}
      <div className="sticky top-0 z-30 bg-[#0a0118]">
        {/* Back button */}
        <div className="px-4 pt-2 pb-1">
          <Link href="/videolar" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Videolar
          </Link>
        </div>

        {/* Video Player */}
        <div className="w-full aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Video Info */}
        <div className="px-4 py-3 border-b border-white/5">
          <h1 className="text-base font-bold text-white leading-tight line-clamp-2">{video.title}</h1>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1.5">
            <span className="text-white/40 text-xs flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {video.viewCount.toLocaleString()} görüntülenme
            </span>
            {video.channelName && (
              <span className="text-white/40 text-xs flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> {video.channelName}
              </span>
            )}
            {video.duration && (
              <span className="text-white/40 text-xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {video.duration}
              </span>
            )}
            <span className="bg-red-600/20 text-red-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {video.category.title}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ SCROLLABLE: Related Videos ═══ */}
      <div className="flex-1 overflow-y-auto pb-28">
        {related.length > 0 && (
          <div className="px-4 pt-4">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-red-500 rounded-full" />
              Önerilen Videolar
            </h2>
            <div className="space-y-3">
              {related.map((rv, idx) => (
                <motion.div
                  key={rv.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link href={`/videolar/izle/${rv.id}`} className="flex gap-3 group">
                    <div className="relative w-40 h-[90px] rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                      {rv.thumbnailUrl ? (
                        <Image src={rv.thumbnailUrl} alt={rv.title} fill className="object-cover" sizes="160px" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center">
                          <Youtube className="w-8 h-8 text-white/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-red-600/90 flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                      {rv.duration && <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 rounded">{rv.duration}</span>}
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <p className="text-white text-xs font-semibold line-clamp-2 leading-tight group-hover:text-fuchsia-300 transition-colors">{rv.title}</p>
                      {rv.channelName && <p className="text-white/40 text-[10px] mt-1">{rv.channelName}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-white/30 text-[10px]">{rv.viewCount.toLocaleString()} görüntülenme</span>
                      </div>
                      <span className="text-[9px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded mt-1 inline-block">{rv.category.title}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
