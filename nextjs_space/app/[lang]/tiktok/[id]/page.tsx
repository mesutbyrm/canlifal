'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Play, ExternalLink, Share2, ChevronRight, Tag } from 'lucide-react'

interface TikTokVideoDetail {
  id: string
  tiktokUrl: string
  tiktokId: string | null
  title: string | null
  authorName: string | null
  authorAvatar: string | null
  thumbnailUrl: string | null
  embedHtml: string | null
  category: { id: string; title: string; slug: string } | null
}

interface RelatedVideo {
  id: string
  tiktokUrl: string
  tiktokId: string | null
  title: string | null
  authorName: string | null
  thumbnailUrl: string | null
  category: { id: string; title: string } | null
}

export default function TikTokWatchPage() {
  const params = useParams()
  const router = useRouter()
  const videoId = params?.id as string
  const [video, setVideo] = useState<TikTokVideoDetail | null>(null)
  const [related, setRelated] = useState<RelatedVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [embedLoaded, setEmbedLoaded] = useState(false)
  const embedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!videoId) return
    setLoading(true)
    setEmbedLoaded(false)
    fetch(`/api/tiktok-videos/${videoId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.video) {
          setVideo(data.video)
          setRelated(data.related || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [videoId])

  // Load TikTok embed script when video changes
  useEffect(() => {
    if (!video?.tiktokId) return
    // Give iframe time to render
    const timer = setTimeout(() => setEmbedLoaded(true), 1000)
    return () => clearTimeout(timer)
  }, [video?.tiktokId])

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: video?.title || 'TikTok Video',
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-purple-300 text-lg">Video bulunamadı</p>
        <Link href="/" className="text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Ana Sayfaya Dön
        </Link>
      </div>
    )
  }

  const tiktokEmbedUrl = video.tiktokId
    ? `https://www.tiktok.com/embed/v2/${video.tiktokId}`
    : null

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0118]/95 backdrop-blur-md border-b border-purple-500/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Geri</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2 rounded-lg hover:bg-purple-800/40 text-purple-400 hover:text-white transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            <a href={video.tiktokUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-purple-800/40 text-purple-400 hover:text-white transition-colors">
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Video */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden bg-black/40 border border-purple-500/10"
            >
              {/* TikTok Embed */}
              {tiktokEmbedUrl ? (
                <div ref={embedRef} className="relative w-full flex justify-center bg-black">
                  <iframe
                    src={tiktokEmbedUrl}
                    className="w-full max-w-[400px] border-0"
                    style={{ height: '740px' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={video.title || 'TikTok Video'}
                  />
                </div>
              ) : video.embedHtml ? (
                <div
                  className="flex justify-center p-4"
                  dangerouslySetInnerHTML={{ __html: video.embedHtml }}
                />
              ) : (
                <div className="relative w-full aspect-[9/16] max-w-[400px] mx-auto bg-gradient-to-br from-purple-900/30 to-fuchsia-900/30 flex items-center justify-center">
                  <a href={video.tiktokUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 text-purple-300">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white ml-1" />
                    </div>
                    <span className="text-sm">TikTok&apos;ta İzle</span>
                  </a>
                </div>
              )}
            </motion.div>

            {/* Video Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 p-4 rounded-xl bg-deep-purple-800/30 border border-purple-500/10"
            >
              {video.title && (
                <h1 className="text-white font-semibold text-lg leading-tight mb-3">{video.title}</h1>
              )}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {video.authorAvatar && (
                    <div className="w-10 h-10 rounded-full overflow-hidden relative bg-purple-800/50">
                      <Image src={video.authorAvatar} alt={video.authorName || ''} fill className="object-cover" sizes="40px" />
                    </div>
                  )}
                  {video.authorName && (
                    <div>
                      <p className="text-white font-medium text-sm">@{video.authorName}</p>
                      <p className="text-purple-400/60 text-xs">TikTok</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {video.category && (
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-cyan-300 text-xs font-medium border border-cyan-500/20">
                      <Tag className="w-3 h-3 inline mr-1" />
                      {video.category.title}
                    </span>
                  )}
                  <a
                    href={video.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-white text-xs flex items-center gap-1.5 hover:from-cyan-500/30 hover:to-pink-500/30 transition-all border border-white/10"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Tiktok_icon.svg/1280px-Tiktok_icon.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.27a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.7z"/>
                    </svg>
                    TikTok&apos;ta Aç
                  </a>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Related Videos Sidebar */}
          {related.length > 0 && (
            <div className="w-full lg:w-80 flex-shrink-0">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-fuchsia-400" />
                İlgili Videolar
              </h3>
              <div className="space-y-3 lg:max-h-[800px] lg:overflow-y-auto lg:pr-2 scrollbar-hide">
                {related.map(rv => (
                  <Link
                    key={rv.id}
                    href={`/tiktok/${rv.id}`}
                    className="flex gap-3 p-2 rounded-xl hover:bg-purple-800/30 transition-colors group"
                  >
                    <div className="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 relative bg-purple-900/50">
                      {rv.thumbnailUrl ? (
                        <Image src={rv.thumbnailUrl} alt={rv.title || 'TikTok'} fill className="object-cover" sizes="80px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-900/30 to-pink-900/30">
                          <Play className="w-6 h-6 text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium line-clamp-2 leading-tight group-hover:text-fuchsia-200 transition-colors">
                        {rv.title || 'TikTok Video'}
                      </p>
                      {rv.authorName && (
                        <p className="text-purple-400/60 text-[10px] mt-1">@{rv.authorName}</p>
                      )}
                      {rv.category && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-purple-800/40 text-[9px] text-cyan-300/80">
                          {rv.category.title}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
