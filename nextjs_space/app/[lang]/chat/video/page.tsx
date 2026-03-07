'use client'

import { useState, useEffect, useRef, useCallback, TouchEvent } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Send,
  X,
  Radio,
  Plus,
  Music2,
  Bookmark,
  Video
} from 'lucide-react'

interface VideoStream {
  id: string
  userId: string
  title: string | null
  description: string | null
  status: string
  viewerCount: number
  likeCount: number
  roomId: string
  category: string | null
  startedAt: string
  user: {
    id: string
    name: string
    image: string | null
  }
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    name: string
    image: string | null
  }
}

interface FloatingHeart {
  id: number
  x: number
  color: string
}

const HEART_COLORS = ['#ff2d55', '#ff375f', '#ff6b6b', '#ff85a1', '#ffa9c1']

export default function VideoStreamPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  
  const [streams, setStreams] = useState<VideoStream[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isStartingStream, setIsStartingStream] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)
  const [streamTitle, setStreamTitle] = useState('')
  const [isFollowing, setIsFollowing] = useState(false)
  
  // Touch handling
  const touchStartY = useRef(0)
  const touchEndY = useRef(0)
  
  // WebRTC refs
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const heartIdRef = useRef(0)

  useEffect(() => {
    fetchStreams()
    const interval = setInterval(fetchStreams, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const currentStream = streams[currentIndex]
    if (currentStream) {
      setLikeCount(currentStream.likeCount)
      checkIfLiked(currentStream.id)
      fetchComments(currentStream.id)
      joinStream(currentStream.id)
    }
    return () => {
      leaveStream()
    }
  }, [currentIndex, streams.length])

  const fetchStreams = async () => {
    try {
      const res = await fetch('/api/video-streams')
      if (res.ok) {
        const data = await res.json()
        setStreams(data)
      }
    } catch (error) {
      console.error('Error fetching streams:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkIfLiked = async (streamId: string) => {
    if (!session?.user) return
    try {
      const res = await fetch(`/api/video-streams/${streamId}/like`)
      if (res.ok) {
        const data = await res.json()
        setIsLiked(data.isLiked)
      }
    } catch (error) {
      console.error('Error checking like:', error)
    }
  }

  const fetchComments = async (streamId: string) => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const joinStream = async (streamId: string) => {
    const stream = streams.find(s => s.id === streamId)
    if (!stream) return
    await connectToStream(stream.roomId)
  }

  const leaveStream = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
  }

  const connectToStream = async (roomId: string) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })
      
      peerConnectionRef.current = pc

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await fetch('/api/video-streams/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId,
              type: 'ice-candidate',
              candidate: event.candidate
            })
          })
        }
      }

      const pollSignals = async () => {
        try {
          const res = await fetch(`/api/video-streams/signal?roomId=${roomId}`)
          if (res.ok) {
            const signals = await res.json()
            for (const signal of signals) {
              if (signal.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                await fetch('/api/video-streams/signal', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ roomId, type: 'answer', sdp: answer })
                })
              } else if (signal.type === 'ice-candidate' && signal.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
              }
            }
          }
        } catch (error) {
          console.error('Signal polling error:', error)
        }
      }

      const signalInterval = setInterval(pollSignals, 2000)
      return () => clearInterval(signalInterval)
    } catch (error) {
      console.error('WebRTC connection error:', error)
    }
  }

  const handleLike = async () => {
    const currentStream = streams[currentIndex]
    if (!currentStream || !session?.user) return

    // Add multiple floating hearts
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const newHeart: FloatingHeart = {
          id: heartIdRef.current++,
          x: Math.random() * 40 + 30,
          color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)]
        }
        setFloatingHearts(prev => [...prev, newHeart])
        setTimeout(() => {
          setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id))
        }, 2000)
      }, i * 100)
    }

    try {
      const res = await fetch(`/api/video-streams/${currentStream.id}/like`, {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        setIsLiked(data.isLiked)
        setLikeCount(data.likeCount)
      }
    } catch (error) {
      console.error('Error liking:', error)
    }
  }

  const handleSendComment = async () => {
    const currentStream = streams[currentIndex]
    if (!currentStream || !newComment.trim() || !session?.user) return

    try {
      const res = await fetch(`/api/video-streams/${currentStream.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      })
      if (res.ok) {
        const comment = await res.json()
        setComments(prev => [comment, ...prev])
        setNewComment('')
      }
    } catch (error) {
      console.error('Error sending comment:', error)
    }
  }

  // Touch handlers for swipe
  const handleTouchStart = (e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: TouchEvent) => {
    touchEndY.current = e.touches[0].clientY
  }

  const handleTouchEnd = () => {
    const diff = touchStartY.current - touchEndY.current
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < streams.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1)
      }
    }
  }

  const handleStartStream = async () => {
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
    setShowStartModal(true)
  }

  const startBroadcast = async () => {
    setIsStartingStream(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 720, height: 1280 },
        audio: true
      })
      localStreamRef.current = stream

      const res = await fetch('/api/video-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: streamTitle || null })
      })

      if (res.ok) {
        const newStream = await res.json()
        router.push(`/${language}/chat/video/broadcast/${newStream.id}`)
      }
    } catch (error) {
      console.error('Error starting stream:', error)
      alert(language === 'tr' ? 'Kamera erişimi reddedildi' : 'Camera access denied')
    } finally {
      setIsStartingStream(false)
    }
  }

  const formatCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
    return count.toString()
  }

  const currentStream = streams[currentIndex]

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 bg-black overflow-hidden"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* No streams state */}
      {streams.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center px-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center mb-6 animate-pulse">
            <Video className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2 text-center">
            {language === 'tr' ? 'Henüz canlı yayın yok' : 'No live streams yet'}
          </h2>
          <p className="text-white/60 text-center text-sm mb-8">
            {language === 'tr' ? 'İlk yayını sen başlat!' : 'Be the first to go live!'}
          </p>
          <button
            onClick={handleStartStream}
            className="bg-[#fe2c55] text-white font-semibold px-8 py-3 rounded-sm flex items-center gap-2"
          >
            <Radio className="w-5 h-5" />
            {language === 'tr' ? 'Canlı Yayın Başlat' : 'Start Live'}
          </button>
        </div>
      ) : (
        <>
          {/* Full Screen Video */}
          <div className="absolute inset-0">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={isMuted}
              loop
              className="w-full h-full object-cover"
              poster="/api/placeholder/1080/1920"
            />
            {/* Subtle gradient at bottom for text readability */}
            <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
          </div>

          {/* Top bar - minimal */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-4 z-10">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#fe2c55] px-2 py-1 rounded-sm">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="text-white text-xs font-semibold">LIVE</span>
              </div>
              <span className="text-white/80 text-xs">{currentStream?.viewerCount || 0}</span>
            </div>
            <button
              onClick={handleStartStream}
              className="bg-[#fe2c55] text-white text-xs font-semibold px-3 py-1.5 rounded-sm flex items-center gap-1"
            >
              <Radio className="w-3 h-3" />
              {language === 'tr' ? 'Yayın Başlat' : 'Go Live'}
            </button>
          </div>

          {/* Right side actions - TikTok style */}
          <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
            {/* Profile with follow button */}
            <div className="relative mb-2">
              <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-gray-800">
                {currentStream?.user?.image ? (
                  <Image
                    src={currentStream.user.image}
                    alt={currentStream.user.name}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {currentStream?.user?.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsFollowing(!isFollowing)}
                className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center ${isFollowing ? 'bg-gray-600' : 'bg-[#fe2c55]'}`}
              >
                <Plus className={`w-4 h-4 text-white ${isFollowing ? 'rotate-45' : ''} transition-transform`} />
              </button>
            </div>

            {/* Like */}
            <div className="flex flex-col items-center relative">
              {/* Floating hearts */}
              <AnimatePresence>
                {floatingHearts.map(heart => (
                  <motion.div
                    key={heart.id}
                    initial={{ opacity: 1, y: 0, scale: 0.5, x: 0 }}
                    animate={{ 
                      opacity: 0, 
                      y: -120, 
                      scale: 1.2,
                      x: (Math.random() - 0.5) * 40
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                    className="absolute bottom-8 pointer-events-none"
                  >
                    <Heart className="w-8 h-8" fill={heart.color} color={heart.color} />
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={handleLike} className="flex flex-col items-center">
                <div className="w-11 h-11 flex items-center justify-center">
                  <Heart
                    className={`w-8 h-8 transition-all ${isLiked ? 'scale-110' : ''}`}
                    fill={isLiked ? '#fe2c55' : 'transparent'}
                    color={isLiked ? '#fe2c55' : 'white'}
                    strokeWidth={2}
                  />
                </div>
                <span className="text-white text-xs font-medium mt-0.5">{formatCount(likeCount)}</span>
              </button>
            </div>

            {/* Comments */}
            <button onClick={() => setShowComments(true)} className="flex flex-col items-center">
              <div className="w-11 h-11 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
              <span className="text-white text-xs font-medium mt-0.5">{formatCount(comments.length)}</span>
            </button>

            {/* Bookmark */}
            <button className="flex flex-col items-center">
              <div className="w-11 h-11 flex items-center justify-center">
                <Bookmark className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <span className="text-white text-xs font-medium mt-0.5">
                {language === 'tr' ? 'Kaydet' : 'Save'}
              </span>
            </button>

            {/* Share */}
            <button className="flex flex-col items-center">
              <div className="w-11 h-11 flex items-center justify-center">
                <Share2 className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <span className="text-white text-xs font-medium mt-0.5">
                {language === 'tr' ? 'Paylaş' : 'Share'}
              </span>
            </button>

            {/* Mute toggle */}
            <button onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center">
              <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-sm">
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </div>
            </button>

            {/* Spinning music disc */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border-4 border-gray-700 flex items-center justify-center animate-[spin_3s_linear_infinite]">
              <div className="w-3 h-3 rounded-full bg-white/20" />
            </div>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-6 left-4 right-20 z-10">
            {/* Username */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white font-bold text-base">@{currentStream?.user?.name}</span>
              <span className="bg-[#fe2c55]/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                {language === 'tr' ? 'Falcı' : 'Teller'}
              </span>
            </div>
            
            {/* Title/Description */}
            {currentStream?.title && (
              <p className="text-white text-sm mb-2 line-clamp-2">{currentStream.title}</p>
            )}
            
            {/* Music row */}
            <div className="flex items-center gap-2">
              <Music2 className="w-4 h-4 text-white" />
              <div className="overflow-hidden flex-1">
                <p className="text-white text-sm whitespace-nowrap animate-marquee">
                  🔮 Mistik Melodi - Fortune Telling Vibes
                </p>
              </div>
            </div>
          </div>

          {/* Video indicator dots */}
          {streams.length > 1 && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
              {streams.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-all ${idx === currentIndex ? 'h-4 bg-white' : 'h-1 bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Comments Panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 h-[60%] bg-[#121212] rounded-t-xl z-30"
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>
            
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white font-semibold">
                {comments.length} {language === 'tr' ? 'yorum' : 'comments'}
              </h3>
              <button onClick={() => setShowComments(false)}>
                <X className="w-6 h-6 text-white/70" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 max-h-[calc(60vh-120px)]">
              {comments.length === 0 ? (
                <p className="text-white/50 text-center py-8">
                  {language === 'tr' ? 'Henüz yorum yok' : 'No comments yet'}
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {comment.user.image ? (
                          <Image src={comment.user.image} alt="" width={36} height={36} className="object-cover" />
                        ) : (
                          <span className="text-white text-xs font-bold">{comment.user.name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-white/60 text-sm font-medium">{comment.user.name}</span>
                        <p className="text-white text-sm">{comment.content}</p>
                      </div>
                      <button className="text-white/40">
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {session?.user && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#121212] border-t border-white/10 pb-8">
                <div className="flex gap-3 items-center">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0" />
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={language === 'tr' ? 'Yorum ekle...' : 'Add comment...'}
                    className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 focus:outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
                  />
                  <button
                    onClick={handleSendComment}
                    disabled={!newComment.trim()}
                    className="text-[#fe2c55] font-semibold text-sm disabled:opacity-50"
                  >
                    {language === 'tr' ? 'Gönder' : 'Post'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Stream Modal */}
      <AnimatePresence>
        {showStartModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 z-40 flex items-end justify-center"
            onClick={() => setShowStartModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-[#121212] rounded-t-2xl p-6 w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
              
              <h2 className="text-xl font-bold text-white text-center mb-6">
                {language === 'tr' ? 'Canlı Yayın Başlat' : 'Go Live'}
              </h2>

              <div className="mb-6">
                <label className="block text-white/60 text-sm mb-2">
                  {language === 'tr' ? 'Yayın başlığı (opsiyonel)' : 'Stream title (optional)'}
                </label>
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder={language === 'tr' ? 'Kahve falı bakıyorum...' : 'Reading coffee fortunes...'}
                  className="w-full bg-white/10 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe2c55]"
                />
              </div>

              <button
                onClick={startBroadcast}
                disabled={isStartingStream}
                className="w-full bg-[#fe2c55] text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isStartingStream ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Radio className="w-5 h-5" />
                    {language === 'tr' ? 'Yayını Başlat' : 'Go Live'}
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 10s linear infinite;
        }
      `}</style>
    </div>
  )
}
