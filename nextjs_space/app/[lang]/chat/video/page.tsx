'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Send,
  X,
  Radio,
  Users,
  Eye,
  Sparkles,
  Video,
  VideoOff,
  Mic,
  MicOff,
  SwitchCamera
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
}

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
  
  // WebRTC refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
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

    // Connect via WebRTC
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

      // Poll for signals
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
                  body: JSON.stringify({
                    roomId,
                    type: 'answer',
                    sdp: answer
                  })
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

    // Add floating heart animation
    const newHeart: FloatingHeart = {
      id: heartIdRef.current++,
      x: Math.random() * 60 + 20
    }
    setFloatingHearts(prev => [...prev, newHeart])
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id))
    }, 1500)

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

  const handleSwipe = (direction: 'up' | 'down') => {
    if (direction === 'up' && currentIndex < streams.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else if (direction === 'down' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
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
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 720, height: 1280 },
        audio: true
      })
      localStreamRef.current = stream

      // Create stream in database
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

  const currentStream = streams[currentIndex]

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-black overflow-hidden" ref={containerRef}>
      {/* Video Feed */}
      {streams.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-white px-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-6">
            <Video className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-center">
            {language === 'tr' ? 'Henüz canlı yayın yok' : 'No live streams yet'}
          </h2>
          <p className="text-gray-400 text-center mb-8">
            {language === 'tr' ? 'İlk yayını sen başlat!' : 'Be the first to go live!'}
          </p>
          <button
            onClick={handleStartStream}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold px-8 py-4 rounded-full flex items-center gap-2"
          >
            <Radio className="w-5 h-5" />
            {language === 'tr' ? 'Canlı Yayın Başlat' : 'Start Live Stream'}
          </button>
        </div>
      ) : (
        <div className="relative h-full">
          {/* Main Video */}
          <div className="absolute inset-0">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
          </div>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 p-4 safe-area-inset-top z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white text-sm font-medium">CANLI</span>
                <span className="text-white/70 text-sm flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {currentStream?.viewerCount || 0}
                </span>
              </div>
              <button
                onClick={handleStartStream}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1"
              >
                <Radio className="w-4 h-4" />
                {language === 'tr' ? 'Yayın Başlat' : 'Go Live'}
              </button>
            </div>
          </div>

          {/* Swipe indicators */}
          {currentIndex > 0 && (
            <button
              onClick={() => handleSwipe('down')}
              className="absolute top-20 left-1/2 -translate-x-1/2 text-white/50 animate-bounce"
            >
              <ChevronUp className="w-8 h-8" />
            </button>
          )}
          {currentIndex < streams.length - 1 && (
            <button
              onClick={() => handleSwipe('up')}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 text-white/50 animate-bounce"
            >
              <ChevronDown className="w-8 h-8" />
            </button>
          )}

          {/* Right side actions */}
          <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10">
            {/* Profile */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden">
                {currentStream?.user?.image ? (
                  <Image
                    src={currentStream.user.image}
                    alt={currentStream.user.name}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-bold">
                      {currentStream?.user?.name?.[0] || '?'}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">+</span>
              </div>
            </div>

            {/* Like */}
            <div className="flex flex-col items-center relative">
              {/* Floating hearts */}
              <AnimatePresence>
                {floatingHearts.map(heart => (
                  <motion.div
                    key={heart.id}
                    initial={{ opacity: 1, y: 0, scale: 1 }}
                    animate={{ opacity: 0, y: -100, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5 }}
                    className="absolute bottom-0"
                    style={{ left: `${heart.x}%` }}
                  >
                    <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
                  </motion.div>
                ))}
              </AnimatePresence>
              <button
                onClick={handleLike}
                className="flex flex-col items-center"
              >
                <Heart
                  className={`w-8 h-8 ${isLiked ? 'text-pink-500 fill-pink-500' : 'text-white'}`}
                />
                <span className="text-white text-xs mt-1">{likeCount}</span>
              </button>
            </div>

            {/* Comments */}
            <button
              onClick={() => setShowComments(true)}
              className="flex flex-col items-center"
            >
              <MessageCircle className="w-8 h-8 text-white" />
              <span className="text-white text-xs mt-1">{comments.length}</span>
            </button>

            {/* Share */}
            <button className="flex flex-col items-center">
              <Share2 className="w-8 h-8 text-white" />
              <span className="text-white text-xs mt-1">
                {language === 'tr' ? 'Paylaş' : 'Share'}
              </span>
            </button>

            {/* Mute */}
            <button onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? (
                <VolumeX className="w-8 h-8 text-white" />
              ) : (
                <Volume2 className="w-8 h-8 text-white" />
              )}
            </button>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-4 left-4 right-20 z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white font-bold">@{currentStream?.user?.name}</span>
              <span className="bg-pink-500/80 text-white text-xs px-2 py-0.5 rounded">
                {language === 'tr' ? 'Falcı' : 'Teller'}
              </span>
            </div>
            {currentStream?.title && (
              <p className="text-white text-sm mb-2">{currentStream.title}</p>
            )}
            {currentStream?.description && (
              <p className="text-white/80 text-xs">{currentStream.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Comments Panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-0 bg-black/90 z-20 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-bold">
                {language === 'tr' ? 'Yorumlar' : 'Comments'} ({comments.length})
              </h3>
              <button onClick={() => setShowComments(false)}>
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                    {comment.user.image ? (
                      <Image
                        src={comment.user.image}
                        alt={comment.user.name}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-xs font-bold">
                        {comment.user.name[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-pink-400 text-sm font-medium">
                      {comment.user.name}
                    </span>
                    <p className="text-white text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {session?.user && (
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={language === 'tr' ? 'Yorum yaz...' : 'Write a comment...'}
                    className="flex-1 bg-white/10 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
                  />
                  <button
                    onClick={handleSendComment}
                    className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center"
                  >
                    <Send className="w-5 h-5 text-white" />
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
            className="absolute inset-0 bg-black/90 z-30 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#1a0a2e] rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {language === 'tr' ? 'Canlı Yayın Başlat' : 'Start Live Stream'}
                </h2>
                <button onClick={() => setShowStartModal(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-purple-300 text-sm mb-2">
                  {language === 'tr' ? 'Yayın Başlığı (Opsiyonel)' : 'Stream Title (Optional)'}
                </label>
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder={language === 'tr' ? 'Kahve falı bakıyorum...' : 'Reading coffee fortunes...'}
                  className="w-full bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <button
                onClick={startBroadcast}
                disabled={isStartingStream}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
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
    </div>
  )
}
