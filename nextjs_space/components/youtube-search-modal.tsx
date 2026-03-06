'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Play, Youtube, ExternalLink, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface YouTubeVideo {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
  publishedAt: string
}

interface YouTubeSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (videoUrl: string, videoTitle: string, thumbnail: string) => void
  language: string
}

export default function YouTubeSearchModal({
  isOpen,
  onClose,
  onSelect,
  language
}: YouTubeSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [directUrl, setDirectUrl] = useState('')
  const [activeTab, setActiveTab] = useState<'search' | 'url'>('search')

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Search YouTube using embed search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setSearched(true)
    
    try {
      // Use YouTube's oEmbed API for basic info
      // For search, we'll use a simple scraping approach through the API
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setVideos(data.videos || [])
      } else {
        setVideos([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  const handleDirectUrlSubmit = () => {
    const videoId = extractVideoId(directUrl)
    if (videoId) {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
      onSelect(youtubeUrl, '', `https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEijpy_g6TMZ4RrsB5N0c6SItE6518yZkTmod_YDJFaTA7eVUI8GrAhr0GMKT-7P81F741m8vbbhL9BfB4ZtUAC4QlX5ovc3QGX1AgN6hOlPJxnukiYcW0Bu2-wc_8XmJk-V_cO1scd4maA/?imgmax=800`)
      onClose()
    } else {
      alert(language === 'tr' ? 'Geçersiz YouTube URL\'si' : 'Invalid YouTube URL')
    }
  }

  const handleVideoSelect = (video: YouTubeVideo) => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${video.id}`
    onSelect(youtubeUrl, video.title, video.thumbnail)
    onClose()
  }

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setVideos([])
      setSearched(false)
      setDirectUrl('')
      setActiveTab('search')
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[80vh] bg-[#1a0b2e] border border-purple-500/30 rounded-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Youtube className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-semibold text-white">
                {language === 'tr' ? 'YouTube Video Ekle' : 'Add YouTube Video'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-purple-400 hover:text-white rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-purple-500/20">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'search'
                  ? 'text-gold-400 border-b-2 border-gold-400'
                  : 'text-purple-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4 inline mr-2" />
              {language === 'tr' ? 'Ara' : 'Search'}
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'url'
                  ? 'text-gold-400 border-b-2 border-gold-400'
                  : 'text-purple-400 hover:text-white'
              }`}
            >
              <ExternalLink className="w-4 h-4 inline mr-2" />
              {language === 'tr' ? 'URL Yapıştır' : 'Paste URL'}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'search' ? (
              <>
                {/* Search Input */}
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder={language === 'tr' ? 'YouTube\'da ara...' : 'Search YouTube...'}
                      className="w-full pl-10 pr-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-gold-500/50"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={loading || !searchQuery.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Search Results */}
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
                  </div>
                ) : videos.length > 0 ? (
                  <div className="space-y-3">
                    {videos.map((video) => (
                      <motion.button
                        key={video.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleVideoSelect(video)}
                        className="w-full flex gap-3 p-3 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/20 rounded-xl transition-colors text-left group"
                      >
                        <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-purple-900/50">
                          <Image
                            src={video.thumbnail}
                            alt={video.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium line-clamp-2 text-sm">
                            {video.title}
                          </h3>
                          <p className="text-purple-400 text-xs mt-1">
                            {video.channelTitle}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : searched ? (
                  <div className="text-center py-12 text-purple-400">
                    <Youtube className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{language === 'tr' ? 'Video bulunamadı' : 'No videos found'}</p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-purple-400">
                    <Youtube className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg mb-2">
                      {language === 'tr' ? 'YouTube\'da Video Ara' : 'Search Videos on YouTube'}
                    </p>
                    <p className="text-sm opacity-70">
                      {language === 'tr' 
                        ? 'İstediğiniz videoyu arayın ve paylaşın'
                        : 'Search for any video and share it'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* URL Paste Tab */
              <div className="py-8">
                <div className="text-center mb-6">
                  <Youtube className="w-16 h-16 mx-auto mb-4 text-red-500 opacity-70" />
                  <p className="text-purple-300">
                    {language === 'tr' 
                      ? 'YouTube video URL\'sini yapıştırın'
                      : 'Paste YouTube video URL'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={directUrl}
                    onChange={(e) => setDirectUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-gold-500/50"
                  />
                  <button
                    onClick={handleDirectUrlSubmit}
                    disabled={!directUrl.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-[#1a0b2e] font-semibold rounded-xl disabled:opacity-50"
                  >
                    {language === 'tr' ? 'Ekle' : 'Add'}
                  </button>
                </div>
                <p className="text-xs text-purple-400/50 mt-3 text-center">
                  {language === 'tr' 
                    ? 'Örnek: https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                    : 'Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
