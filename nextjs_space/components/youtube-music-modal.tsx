'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Search, Play, Square, Music, Loader2, ExternalLink, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface YouTubeVideo {
  id: string
  title: string
  thumbnail: string
  duration: string
  channel: string
  views: number
}

interface YouTubeMusicModalProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
  currentVideoId: string | null
  currentTitle: string | null
  canControl: boolean
}

export default function YouTubeMusicModal({
  isOpen,
  onClose,
  roomId,
  currentVideoId,
  currentTitle,
  canControl,
}: YouTubeMusicModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<YouTubeVideo[]>([])
  const [searching, setSearching] = useState(false)
  const [setting, setSetting] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (data.videos) {
        setResults(data.videos)
      }
    } catch (e) {
      console.error('Search error:', e)
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => handleSearch(value), 600)
  }

  const selectVideo = async (video: YouTubeVideo) => {
    if (!canControl) return
    setSetting(true)
    try {
      await fetch(`/api/chat/rooms/${roomId}/music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, title: video.title, duration: video.duration || '' }),
      })
      // Auto-close modal after selecting a song
      onClose()
    } catch (e) {
      console.error('Set music error:', e)
    } finally {
      setSetting(false)
    }
  }

  const stopMusic = async () => {
    if (!canControl) return
    setSetting(true)
    try {
      await fetch(`/api/chat/rooms/${roomId}/music`, { method: 'DELETE' })
    } catch (e) {
      console.error('Stop music error:', e)
    } finally {
      setSetting(false)
    }
  }

  const formatViews = (views: number) => {
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`
    if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K`
    return views.toString()
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg max-h-[85vh] bg-gradient-to-br from-gray-900 via-purple-950/80 to-gray-900 rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-900/30 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/20 bg-black/30">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-purple-400" />
                <h2 className="text-white font-bold text-lg">YouTube Müzik</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currently Playing */}
            {currentVideoId && (
              <div className="px-4 py-3 bg-purple-900/30 border-b border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&loop=1&playlist=${currentVideoId}&controls=0&modestbranding=1`}
                      allow="autoplay; encrypted-media"
                      className="w-[200%] h-[200%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ border: 'none' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-purple-300 mb-0.5">🎶 Şu an çalıyor</p>
                    <p className="text-white text-sm font-medium truncate">{currentTitle}</p>
                  </div>
                  {canControl && (
                    <button
                      onClick={stopMusic}
                      disabled={setting}
                      className="flex-shrink-0 p-2 bg-red-600/30 hover:bg-red-600/50 border border-red-500/30 rounded-lg text-red-300 transition-all"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Hidden YouTube player for audio - visible to all users */}
            {currentVideoId && (
              <div className="hidden">
                <iframe
                  id="yt-music-player"
                  src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&loop=1&playlist=${currentVideoId}`}
                  allow="autoplay; encrypted-media"
                  style={{ width: 1, height: 1, border: 'none' }}
                />
              </div>
            )}

            {/* Search Bar */}
            {canControl && (
              <div className="px-4 py-3 border-b border-purple-500/20">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    placeholder="Müzik ara... (şarkı adı veya sanatçı)"
                    className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-purple-500/20 rounded-xl text-white text-sm placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all"
                    autoFocus
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 animate-spin" />
                  )}
                </div>
              </div>
            )}

            {/* Results List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {results.length > 0 ? (
                <div className="p-2 space-y-1">
                  {results.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => selectVideo(video)}
                      disabled={setting || !canControl}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left ${
                        currentVideoId === video.id
                          ? 'bg-purple-600/30 border border-purple-500/40'
                          : 'hover:bg-white/5 border border-transparent'
                      } ${!canControl ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {video.duration && (
                          <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded">
                            {video.duration}
                          </span>
                        )}
                        {currentVideoId === video.id && (
                          <div className="absolute inset-0 bg-purple-600/40 flex items-center justify-center">
                            <div className="flex items-end gap-0.5">
                              <span className="w-1 h-3 bg-white rounded-full animate-pulse" />
                              <span className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                              <span className="w-1 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium line-clamp-2 leading-tight">{video.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-gray-400 text-xs truncate">{video.channel}</span>
                          {video.views > 0 && (
                            <span className="text-gray-500 text-xs">• {formatViews(video.views)} görüntülenme</span>
                          )}
                        </div>
                      </div>

                      {/* Play Icon */}
                      {canControl && currentVideoId !== video.id && (
                        <Play className="w-5 h-5 text-purple-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ) : !searching && searchQuery.length >= 2 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Music className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Sonuç bulunamadı</p>
                </div>
              ) : !searching ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Music className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">{canControl ? 'Müzik aramak için yukarıya yazın' : 'Şu an çalan müzik yok'}</p>
                </div>
              ) : null}

              {searching && results.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Footer info */}
            <div className="px-4 py-2 border-t border-purple-500/20 bg-black/20">
              <p className="text-gray-500 text-[10px] text-center">YouTube üzerinden müzik çalınmaktadır</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
