'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Search, Play, Square, Music, Loader2, Clock, Volume2, Film, SkipForward } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface YouTubeVideo {
  id: string
  title: string
  thumbnail: string
  duration: string
  channel: string
  views: number
}

interface QueueItem {
  id: string
  videoId: string
  title: string
  dedication?: string
  note?: string
  duration?: string
  requestType?: string
  isPaid: boolean
  requestedBy?: string
  userName?: string
}

interface YouTubeMusicModalProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
  currentVideoId: string | null
  currentTitle: string | null
  canControl: boolean
  musicQueue?: QueueItem[]
  onSkipToNext?: () => void
  currentRequestType?: string
  initialQuery?: string
}

const MAX_DURATION_SECONDS = 360 // 6 dakika

// Türkçe alfabe (A-Z harf indeksi için)
const TR_ALPHABET = ['A','B','C','Ç','D','E','F','G','Ğ','H','I','İ','J','K','L','M','N','O','Ö','P','R','S','Ş','T','U','Ü','V','Y','Z']

// Harf indeksi için popüler sanatçı önerileri. Bir harfe basılınca o harfle başlayanlar listelenir.
const POPULAR_ARTISTS: string[] = [
  'Ajda Pekkan','Athena','Alişan','Aleyna Tilki','Aynur Aydın','Athena','Ayaş',
  'Barış Manço','Barış Akın','Burçin','Buray','Bengü','Bora Duran',
  'Cem Karaca','Ceza','Candan Erçetin','Cenk Eren',
  'Çelik','Çollak',
  'Demet Akalın','Duman','Dolu Kadın','Deniz Seki',
  'Edis','Ebru Gündeş','Emre Aydın','Ece Seçkin','Emircan İğrek','Eypio',
  'Feride Hilal Akın','Ferhat Göçer','Funda Ar','Fettah Can',
  'Gripin','Gökhan Türkmen','Güliz Ayla','Gülşen',
  'Hadise','Hande Yener','Haluk Levent','Hakan Altun',
  'Işın Karaca',
  'İbrahim Tatlıses','İlayda','İrem Derici',
  'Kenan Doğulu','Kolpa','Kubat','Koray Avcı',
  'Levent Yüksel','Lvbel C5',
  'Mabel Matiz','Manga','Murat Boz','Mustafa Sandal','Mustafa Ceceli','Melike Şahin','Motive',
  'Nilüfer','Nil Karaibrahimgil','Norm Ender','Nazan Öncel',
  'Orhan Gencebay','Okı',
  'Özcan Deniz','Özgü Kaya',
  'Pinhani','Pamela',
  'Reynmen','Rafet El Roman','Ruhi Su',
  'Sagopa Kajmer','Sertab Erener','Serdar Ortaç','Sezen Aksu','Silâ Gençoğlu','Simge','Sagopa',
  'Şebö','Şevval Sam','Şenay',
  'Tarkan','Teoman','Toygar Işıklı','Tuna Kiremitçi','Tan Taşçı',
  'Uğur Işılak',
  'Ünlü',
  'Volkan Konak','Vega',
  'Yalın','Yaşar','Yıldız Tilbe','Yusuf Güney','Yüksek Sadakat','Yener Çevik',
  'Zeynep Bastık','Ziynet Sali','Zuhal Olcay',
]

function parseDurationToSeconds(dur: string): number {
  if (!dur) return 0
  const parts = dur.split(':').map(Number)
  if (parts.some(isNaN)) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

export default function YouTubeMusicModal({
  isOpen,
  onClose,
  roomId,
  currentVideoId,
  currentTitle,
  canControl,
  musicQueue = [],
  onSkipToNext,
  currentRequestType,
  initialQuery,
}: YouTubeMusicModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<YouTubeVideo[]>([])
  const [searching, setSearching] = useState(false)
  const [setting, setSetting] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null)
  const [showTypeSelect, setShowTypeSelect] = useState(false)
  const [activeLetter, setActiveLetter] = useState<string | null>(null)
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

  // Seçili harfle başlayan sanatçı önerileri (Türkçe upper-case ile)
  const letterArtists = activeLetter
    ? POPULAR_ARTISTS.filter(a => a.toLocaleUpperCase('tr-TR').startsWith(activeLetter)).sort((a, b) => a.localeCompare(b, 'tr-TR'))
    : []

  const handleLetterPress = (letter: string) => {
    setActiveLetter(prev => (prev === letter ? null : letter))
  }

  const handleArtistPick = (artist: string) => {
    setActiveLetter(null)
    setSearchQuery(artist)
    handleSearch(artist)
  }

  const [queuedMsg, setQueuedMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleVideoClick = (video: YouTubeVideo) => {
    // Check 6-minute limit
    const durationSec = parseDurationToSeconds(video.duration)
    if (durationSec > MAX_DURATION_SECONDS && durationSec > 0) {
      setErrorMsg(`Bu şarkı ${video.duration} uzunluğunda. Maksimum 6 dakika (6:00) sınırı var. Daha kısa bir şarkı seçin.`)
      setTimeout(() => setErrorMsg(null), 5000)
      return
    }
    setSelectedVideo(video)
    setShowTypeSelect(true)
  }

  const submitSongRequest = async (video: YouTubeVideo, requestType: 'audio' | 'video') => {
    // Not: Şarkı isteğini herhangi bir giriş yapmış kullanıcı gönderebilir (jeton öder).
    // canControl yalnızca DJ kontrollerini (durdur/atla) yönetir.
    setSetting(true)
    setQueuedMsg(null)
    setErrorMsg(null)
    setShowTypeSelect(false)
    setSelectedVideo(null)
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/song-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          title: video.title,
          duration: video.duration || '',
          requestType,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Şarkı isteği gönderilemedi')
        setTimeout(() => setErrorMsg(null), 5000)
      } else if (data.queued) {
        setQueuedMsg(`🎵 "${video.title}" sıraya eklendi (${data.queuePosition}. sırada)`)
        setTimeout(() => setQueuedMsg(null), 4000)
      } else {
        setQueuedMsg(`🎵 "${video.title}" çalmaya başladı!`)
        setTimeout(() => { setQueuedMsg(null); onClose() }, 2000)
      }
    } catch (e) {
      console.error('Song request error:', e)
      setErrorMsg('Bir hata oluştu')
      setTimeout(() => setErrorMsg(null), 3000)
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

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  // !istek komutu ile açıldığında gelen sorguyu otomatik olarak arama kutusuna doldur ve arat
  useEffect(() => {
    if (isOpen && initialQuery && initialQuery.trim().length >= 2) {
      setActiveLetter(null)
      setSearchQuery(initialQuery)
      handleSearch(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialQuery])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowTypeSelect(false); setSelectedVideo(null); onClose() } }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

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
                <h2 className="text-white font-bold text-lg">Müzik</h2>
                <span className="text-purple-400/60 text-xs">(maks 6dk)</span>
              </div>
              <button onClick={() => { setShowTypeSelect(false); setSelectedVideo(null); onClose() }} className="text-gray-400 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currently Playing */}
            {currentVideoId && (
              <div className="px-4 py-3 bg-purple-900/30 border-b border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                    {currentRequestType === 'video' ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=0&controls=0&modestbranding=1`}
                        allow="encrypted-media"
                        className="w-[200%] h-[200%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ border: 'none' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-800 to-pink-800">
                        <Volume2 className="w-6 h-6 text-white/60" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-purple-300 mb-0.5">
                        {currentRequestType === 'video' ? '🎬 Video çalıyor' : '🎧 Ses çalıyor'}
                      </p>
                    </div>
                    <p className="text-white text-sm font-medium truncate">{currentTitle}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {canControl && musicQueue.length > 0 && onSkipToNext && (
                      <button
                        onClick={onSkipToNext}
                        disabled={setting}
                        className="p-2 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 rounded-lg text-blue-300 transition-all"
                        title="Sıradakine Geç"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    )}
                    {canControl && (
                      <button
                        onClick={stopMusic}
                        disabled={setting}
                        className="p-2 bg-red-600/30 hover:bg-red-600/50 border border-red-500/30 rounded-lg text-red-300 transition-all"
                        title="Müziği Kapat"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Queue */}
            {musicQueue.length > 0 && (
              <div className="px-4 py-2 bg-black/30 border-b border-purple-500/20">
                <p className="text-yellow-300 text-xs font-medium mb-1">📋 Sırada ({musicQueue.length})</p>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {musicQueue.slice(0, 5).map((q, i) => (
                    <div key={q.id || i} className="flex items-center justify-between text-[11px]">
                      <span className="text-white/70 truncate flex-1">
                        {i + 1}. {q.title}
                        {q.requestType === 'video' ? ' 🎬' : ' 🎧'}
                      </span>
                      <span className="text-purple-400/60 ml-2 flex-shrink-0">{q.userName || q.requestedBy}</span>
                    </div>
                  ))}
                  {musicQueue.length > 5 && <p className="text-yellow-300/60 text-[10px]">+{musicQueue.length - 5} daha...</p>}
                </div>
              </div>
            )}

            {/* Error message */}
            {errorMsg && (
              <div className="px-4 py-2 bg-red-900/40 border-b border-red-500/30">
                <p className="text-red-300 text-xs font-medium text-center">{errorMsg}</p>
              </div>
            )}

            {/* Queued notification */}
            {queuedMsg && (
              <div className="px-4 py-2 bg-green-900/40 border-b border-green-500/30">
                <p className="text-green-300 text-xs font-medium text-center">{queuedMsg}</p>
              </div>
            )}

            {/* Audio/Video Type Selection */}
            <AnimatePresence>
              {showTypeSelect && selectedVideo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-3 bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-b border-purple-500/30"
                >
                  <p className="text-white text-sm font-medium mb-2 truncate">🎵 {selectedVideo.title}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => submitSongRequest(selectedVideo, 'audio')}
                      disabled={setting}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-200 transition-all"
                    >
                      <Volume2 className="w-6 h-6" />
                      <span className="text-sm font-bold">Sadece Ses</span>
                      <span className="text-xs text-blue-300/80">10 💎 Jeton</span>
                    </button>
                    <button
                      onClick={() => submitSongRequest(selectedVideo, 'video')}
                      disabled={setting}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500/30 text-pink-200 transition-all"
                    >
                      <Film className="w-6 h-6" />
                      <span className="text-sm font-bold">Videolu</span>
                      <span className="text-xs text-pink-300/80">20 💎 Jeton</span>
                    </button>
                  </div>
                  <button
                    onClick={() => { setShowTypeSelect(false); setSelectedVideo(null) }}
                    className="w-full mt-2 text-xs text-purple-400 hover:text-white transition-colors"
                  >
                    İptal
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Bar */}
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

              {/* A-Z Harf İndeksi */}
              <div className="mt-2 flex flex-wrap gap-1 justify-center">
                {TR_ALPHABET.map((letter) => (
                  <button
                    key={letter}
                    onClick={() => handleLetterPress(letter)}
                    className={`w-6 h-6 rounded-md text-[11px] font-bold transition-all ${
                      activeLetter === letter
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-purple-300/70 hover:bg-purple-500/30 hover:text-white'
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>

              {/* Seçili harfin sanatçı önerileri */}
              {activeLetter && (
                <div className="mt-2">
                  {letterArtists.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {letterArtists.map((artist) => (
                        <button
                          key={artist}
                          onClick={() => handleArtistPick(artist)}
                          className="px-2.5 py-1 rounded-full bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-100 text-xs transition-all"
                        >
                          {artist}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-[11px] text-center py-1">“{activeLetter}” harfi için öneri yok — arama kutusunu kullanın</p>
                  )}
                </div>
              )}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {results.length > 0 ? (
                <div className="p-2 space-y-1">
                  {results.map((video) => {
                    const durSec = parseDurationToSeconds(video.duration)
                    const tooLong = durSec > MAX_DURATION_SECONDS && durSec > 0
                    return (
                      <button
                        key={video.id}
                        onClick={() => handleVideoClick(video)}
                        disabled={setting || tooLong}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left ${
                          currentVideoId === video.id
                            ? 'bg-purple-600/30 border border-purple-500/40'
                            : tooLong
                              ? 'opacity-40 cursor-not-allowed border border-transparent'
                              : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {video.duration && (
                            <span className={`absolute bottom-0.5 right-0.5 text-white text-[10px] px-1 py-0.5 rounded ${
                              tooLong ? 'bg-red-600/90' : 'bg-black/80'
                            }`}>
                              {video.duration}{tooLong ? ' ⛔' : ''}
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

                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium line-clamp-2 leading-tight">{video.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-400 text-xs truncate">{video.channel}</span>
                            {video.views > 0 && (
                              <span className="text-gray-500 text-xs">• {formatViews(video.views)}</span>
                            )}
                          </div>
                          {tooLong && <p className="text-red-400 text-[10px] mt-0.5">6 dakikadan uzun</p>}
                        </div>

                        {!tooLong && currentVideoId !== video.id && (
                          <Play className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : !searching && searchQuery.length >= 2 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Music className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Sonuç bulunamadı</p>
                </div>
              ) : !searching ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Music className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Müzik aramak için yukarıya yazın</p>
                  <p className="text-xs mt-1 text-gray-600">🎧 Ses: 10 jeton | 🎬 Video: 20 jeton</p>
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
              <p className="text-gray-500 text-[10px] text-center">YouTube üzerinden müzik çalınmaktadır • Maks 6 dakika</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
