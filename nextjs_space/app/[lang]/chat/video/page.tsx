'use client'

import { useState, useEffect, useRef, TouchEvent } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
  X,
  Radio,
  Plus,
  Music2,
  Video,
  Gift,
  Coins,
  Users,
  Loader2,
  RefreshCw
} from 'lucide-react'

interface VideoStream {
  id: string
  title: string | null
  viewerCount: number
  likeCount: number
  user: { id: string; name: string; image: string | null }
}

interface Comment {
  id: string
  content: string
  user: { name: string }
}

interface GiftType {
  id: string
  name: string
  nameEn: string
  icon: string
  price: number
}

interface RecentGift {
  id: string
  senderName: string
  icon: string
  giftName: string
}

interface FloatingHeart {
  id: number
  color: string
}

const HEART_COLORS = ['#ff2d55', '#ff375f', '#ff6b6b', '#ff85a1', '#ffa9c1']
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
]

export default function VideoStreamPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  
  const [streams, setStreams] = useState<VideoStream[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showGifts, setShowGifts] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([])
  const [recentGifts, setRecentGifts] = useState<RecentGift[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [viewerCount, setViewerCount] = useState(0)
  const [showStartModal, setShowStartModal] = useState(false)
  const [streamTitle, setStreamTitle] = useState('')
  const [isStartingStream, setIsStartingStream] = useState(false)
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([])
  const [userCredits, setUserCredits] = useState(0)
  const [sendingGift, setSendingGift] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting')
  
  const touchStartY = useRef(0)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const heartIdRef = useRef(0)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const viewerIdRef = useRef<string>(`viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentStreamIdRef = useRef<string>('')
  const isUnmountedRef = useRef(false)
  const hasJoinedRef = useRef(false)
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([])

  const currentStream = streams[currentIndex]

  useEffect(() => {
    isUnmountedRef.current = false
    fetchStreams()
    fetchGiftTypes()
    if (session?.user) fetchCredits()
    
    const interval = setInterval(fetchStreams, 10000)
    return () => {
      isUnmountedRef.current = true
      clearInterval(interval)
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (currentStream && currentStream.id !== currentStreamIdRef.current) {
      cleanup()
      currentStreamIdRef.current = currentStream.id
      hasJoinedRef.current = false
      setConnectionStatus('connecting')
      pendingCandidatesRef.current = []
      joinStream(currentStream.id)
      setLikeCount(currentStream.likeCount)
      setViewerCount(currentStream.viewerCount)
      checkIfLiked(currentStream.id)
      fetchComments(currentStream.id)
    }
  }, [currentIndex, currentStream?.id])

  const cleanup = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (currentStreamIdRef.current) {
      fetch(`/api/video-streams/${currentStreamIdRef.current}/join?viewerId=${viewerIdRef.current}`, { method: 'DELETE' }).catch(() => {})
    }
    pendingCandidatesRef.current = []
  }

  const joinStream = async (streamId: string) => {
    if (hasJoinedRef.current) return
    hasJoinedRef.current = true
    
    try {
      // Register as viewer
      await fetch(`/api/video-streams/${streamId}/join`, { method: 'POST' })

      // Create peer connection
      const pc = new RTCPeerConnection({ 
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 10
      })
      pcRef.current = pc

      // Add transceivers for receiving video/audio
      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })

      pc.ontrack = (event) => {
        console.log('Viewer: Received track:', event.track.kind)
        if (remoteVideoRef.current && event.streams[0]) {
          console.log('Viewer: Setting video srcObject')
          remoteVideoRef.current.srcObject = event.streams[0]
          remoteVideoRef.current.play().catch(e => console.log('Autoplay error:', e))
          setConnectionStatus('connected')
        }
      }

      pc.onicecandidate = async (event) => {
        if (event.candidate && !isUnmountedRef.current) {
          console.log('Viewer: Sending ICE candidate')
          await fetch('/api/video-streams/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              streamId,
              type: 'ice-candidate',
              receiverId: 'broadcaster',
              data: { candidate: event.candidate.toJSON(), viewerId: viewerIdRef.current }
            })
          }).catch(() => {})
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log('Viewer: ICE state:', pc.iceConnectionState)
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setConnectionStatus('connected')
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          // Try to reconnect
          if (pc.iceConnectionState === 'failed') {
            setConnectionStatus('failed')
          }
        }
      }

      pc.onconnectionstatechange = () => {
        console.log('Viewer: Connection state:', pc.connectionState)
        if (pc.connectionState === 'connected') {
          setConnectionStatus('connected')
        }
      }

      // Send join signal
      console.log('Viewer: Sending viewer-join signal')
      await fetch('/api/video-streams/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId,
          type: 'viewer-join',
          receiverId: 'broadcaster',
          data: { viewerId: viewerIdRef.current }
        })
      })

      // Start polling for signals more frequently initially
      let pollCount = 0
      const pollFn = () => {
        if (!isUnmountedRef.current) {
          pollSignals(streamId)
          fetchStreamStats(streamId)
          pollGifts(streamId)
        }
      }

      // Poll immediately and then every second for first 10 seconds, then every 1.5s
      pollFn()
      pollIntervalRef.current = setInterval(() => {
        pollCount++
        if (pollCount < 10) {
          pollFn()
        } else {
          pollFn()
        }
      }, pollCount < 10 ? 1000 : 1500)

    } catch (error) {
      console.error('Join stream error:', error)
      setConnectionStatus('failed')
    }
  }

  const pollSignals = async (streamId: string) => {
    if (!pcRef.current || isUnmountedRef.current) return
    
    try {
      const res = await fetch(`/api/video-streams/signal?streamId=${streamId}&recipientId=${viewerIdRef.current}`)
      if (!res.ok) return
      const signals = await res.json()

      for (const signal of signals) {
        if (isUnmountedRef.current || !pcRef.current) break
        
        if (signal.type === 'offer' && signal.data?.offer) {
          console.log('Viewer: Received offer from broadcaster')
          try {
            // Only process offer if we're in stable state or haven't received one yet
            if (pcRef.current.signalingState === 'stable' || pcRef.current.signalingState === 'have-local-pranswer') {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.data.offer))
              console.log('Viewer: Set remote description, creating answer')
              
              // Add any pending ICE candidates
              for (const candidate of pendingCandidatesRef.current) {
                try {
                  await pcRef.current.addIceCandidate(candidate)
                } catch (e) {
                  console.log('Pending ICE add error:', e)
                }
              }
              pendingCandidatesRef.current = []
              
              const answer = await pcRef.current.createAnswer()
              await pcRef.current.setLocalDescription(answer)
              
              console.log('Viewer: Sending answer to broadcaster')
              await fetch('/api/video-streams/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  streamId,
                  type: 'answer',
                  receiverId: 'broadcaster',
                  data: { answer: pcRef.current.localDescription?.toJSON(), viewerId: viewerIdRef.current }
                })
              })
            }
          } catch (e) {
            console.error('Offer handling error:', e)
          }
        } else if (signal.type === 'ice-candidate' && signal.data?.candidate) {
          try {
            if (pcRef.current.remoteDescription) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.data.candidate))
            } else {
              // Queue the candidate until we have remote description
              pendingCandidatesRef.current.push(new RTCIceCandidate(signal.data.candidate))
            }
          } catch (e) {
            console.log('ICE add error:', e)
          }
        }
      }
    } catch (error) {
      console.error('Poll signals error:', error)
    }
  }

  const retryConnection = () => {
    if (currentStream) {
      cleanup()
      currentStreamIdRef.current = ''
      hasJoinedRef.current = false
      setConnectionStatus('connecting')
      pendingCandidatesRef.current = []
      viewerIdRef.current = `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setTimeout(() => joinStream(currentStream.id), 500)
    }
  }

  const fetchStreamStats = async (streamId: string) => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}`)
      if (res.ok) {
        const data = await res.json()
        setViewerCount(data.viewerCount || 0)
        setLikeCount(data.likeCount || 0)
      }
    } catch (e) {}
  }

  const pollGifts = async (streamId: string) => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/gifts`)
      if (!res.ok) return
      const gifts = await res.json()
      const recent = gifts.filter((g: any) => new Date(g.createdAt).getTime() > Date.now() - 10000)
        .slice(0, 3).map((g: any) => ({
          id: g.id, senderName: g.sender.name, icon: g.giftType.icon, giftName: g.giftType.name
        }))
      setRecentGifts(recent)
    } catch (e) {}
  }

  const fetchStreams = async () => {
    try {
      const res = await fetch('/api/video-streams')
      if (res.ok) setStreams(await res.json())
    } catch (e) {}
    setLoading(false)
  }

  const fetchGiftTypes = async () => {
    try {
      const res = await fetch('/api/video-streams/gifts')
      if (res.ok) setGiftTypes(await res.json())
    } catch (e) {}
  }

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/user/credits')
      if (res.ok) setUserCredits((await res.json()).credits)
    } catch (e) {}
  }

  const checkIfLiked = async (streamId: string) => {
    if (!session?.user) return
    try {
      const res = await fetch(`/api/video-streams/${streamId}/like`)
      if (res.ok) setIsLiked((await res.json()).isLiked)
    } catch (e) {}
  }

  const fetchComments = async (streamId: string) => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/comments`)
      if (res.ok) setComments(await res.json())
    } catch (e) {}
  }

  const handleLike = async () => {
    if (!currentStream || !session?.user) return
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const heart = { id: heartIdRef.current++, color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)] }
        setFloatingHearts(prev => [...prev, heart])
        setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== heart.id)), 2000)
      }, i * 100)
    }
    try {
      const res = await fetch(`/api/video-streams/${currentStream.id}/like`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setIsLiked(data.isLiked)
        setLikeCount(data.likeCount)
      }
    } catch (e) {}
  }

  const handleSendComment = async () => {
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
    } catch (e) {}
  }

  const handleSendGift = async (gift: GiftType) => {
    if (!currentStream || !session?.user || userCredits < gift.price) {
      if (userCredits < gift.price) alert(language === 'tr' ? 'Yetersiz jeton!' : 'Insufficient credits!')
      return
    }
    setSendingGift(gift.id)
    try {
      const res = await fetch(`/api/video-streams/${currentStream.id}/gifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftTypeId: gift.id, quantity: 1 })
      })
      if (res.ok) {
        const data = await res.json()
        setUserCredits(data.newBalance)
        setShowGifts(false)
        setRecentGifts(prev => [{ id: Date.now().toString(), senderName: session.user?.name || 'Sen', icon: gift.icon, giftName: gift.name }, ...prev].slice(0, 3))
      }
    } catch (e) {}
    setSendingGift(null)
  }

  const handleTouchStart = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY }
  const handleTouchEnd = (e: TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < streams.length - 1) setCurrentIndex(prev => prev + 1)
      else if (diff < 0 && currentIndex > 0) setCurrentIndex(prev => prev - 1)
    }
  }

  const handleStartStream = () => {
    if (!session?.user) { router.push(`/${language}/login`); return }
    setShowStartModal(true)
  }

  const startBroadcast = async () => {
    setIsStartingStream(true)
    try {
      const res = await fetch('/api/video-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: streamTitle || null })
      })
      if (res.ok) router.push(`/${language}/chat/video/broadcast/${(await res.json()).id}`)
    } catch (e) {}
    setIsStartingStream(false)
  }

  const formatCount = (n: number) => n >= 1000000 ? (n/1000000).toFixed(1) + 'M' : n >= 1000 ? (n/1000).toFixed(1) + 'K' : n.toString()

  if (loading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {streams.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center px-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center mb-6 animate-pulse">
            <Video className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2 text-center">{language === 'tr' ? 'Henüz canlı yayın yok' : 'No live streams yet'}</h2>
          <p className="text-white/60 text-center text-sm mb-8">{language === 'tr' ? 'İlk yayını sen başlat!' : 'Be the first to go live!'}</p>
          <button onClick={handleStartStream} className="bg-[#fe2c55] text-white font-semibold px-8 py-3 rounded flex items-center gap-2">
            <Radio className="w-5 h-5" /> {language === 'tr' ? 'Canlı Yayın Başlat' : 'Start Live'}
          </button>
        </div>
      ) : (
        <>
          {/* Video */}
          <video ref={remoteVideoRef} autoPlay playsInline muted={isMuted} className="absolute inset-0 w-full h-full object-cover bg-black" />
          
          {/* Connection overlay */}
          {connectionStatus !== 'connected' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 overflow-hidden">
                  {currentStream?.user?.image ? (
                    <Image src={currentStream.user.image} alt="" width={80} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl text-white font-bold">{currentStream?.user?.name?.[0]}</span>
                  )}
                </div>
                <p className="text-white font-bold text-lg">@{currentStream?.user?.name}</p>
                <p className="text-white/60 text-sm mt-2">
                  {connectionStatus === 'connecting' ? (language === 'tr' ? 'Bağlanıyor...' : 'Connecting...') : (language === 'tr' ? 'Bağlantı başarısız' : 'Connection failed')}
                </p>
                {connectionStatus === 'connecting' && <Loader2 className="w-6 h-6 text-white animate-spin mx-auto mt-4" />}
                {connectionStatus === 'failed' && (
                  <button onClick={retryConnection} className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto">
                    <RefreshCw className="w-4 h-4" />
                    {language === 'tr' ? 'Tekrar Dene' : 'Retry'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Gradients */}
          <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

          {/* Top bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#fe2c55] px-2 py-1 rounded">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="text-white text-xs font-semibold">LIVE</span>
              </div>
              <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
                <Users className="w-3 h-3 text-white" />
                <span className="text-white/80 text-xs">{viewerCount}</span>
              </div>
            </div>
            <button onClick={handleStartStream} className="bg-[#fe2c55] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1">
              <Radio className="w-3 h-3" /> {language === 'tr' ? 'Yayın Başlat' : 'Go Live'}
            </button>
          </div>

          {/* Recent Gifts - Top Right */}
          <div className="absolute top-16 right-3 z-20 space-y-2">
            <AnimatePresence>
              {recentGifts.map(gift => (
                <motion.div key={gift.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
                  className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/40 to-orange-500/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <span className="text-xl">{gift.icon}</span>
                  <div className="text-right">
                    <p className="text-white text-xs font-bold">{gift.senderName}</p>
                    <p className="text-yellow-300 text-[10px]">{gift.giftName}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Floating Hearts */}
          <div className="absolute bottom-32 right-4 z-10">
            <AnimatePresence>
              {floatingHearts.map(heart => (
                <motion.div key={heart.id} initial={{ opacity: 1, y: 0, x: 0 }} animate={{ opacity: 0, y: -150, x: Math.random() * 30 - 15 }} transition={{ duration: 2 }}
                  className="absolute bottom-0 right-0">
                  <Heart className="w-8 h-8" fill={heart.color} stroke={heart.color} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Right side actions */}
          <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-1 overflow-hidden border-2 border-white">
                {currentStream?.user?.image ? (
                  <Image src={currentStream.user.image} alt="" width={48} height={48} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold">{currentStream?.user?.name?.[0]}</span>
                )}
              </div>
              <Plus className="w-5 h-5 bg-[#fe2c55] rounded-full text-white p-0.5 mx-auto -mt-2 relative z-10" />
            </div>
            <button onClick={handleLike} className="flex flex-col items-center">
              <Heart className={`w-9 h-9 ${isLiked ? 'fill-[#fe2c55] text-[#fe2c55]' : 'text-white'}`} />
              <span className="text-white text-xs mt-0.5">{formatCount(likeCount)}</span>
            </button>
            <button onClick={() => setShowComments(true)} className="flex flex-col items-center">
              <MessageCircle className="w-9 h-9 text-white" />
              <span className="text-white text-xs mt-0.5">{formatCount(comments.length)}</span>
            </button>
            <button onClick={() => setShowGifts(true)} className="flex flex-col items-center">
              <Gift className="w-9 h-9 text-yellow-400" />
              <span className="text-white text-xs mt-0.5">{language === 'tr' ? 'Hediye' : 'Gift'}</span>
            </button>
            <button onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center">
              {isMuted ? <VolumeX className="w-8 h-8 text-white" /> : <Volume2 className="w-8 h-8 text-white" />}
            </button>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-4 left-4 right-20 z-20">
            <p className="text-white font-bold text-base">@{currentStream?.user?.name}</p>
            {currentStream?.title && <p className="text-white/80 text-sm line-clamp-2 mt-1">{currentStream.title}</p>}
          </div>

          {/* Stream navigation indicators */}
          {streams.length > 1 && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
              {streams.map((_, idx) => (
                <div key={idx} className={`w-1 rounded-full transition-all ${idx === currentIndex ? 'h-6 bg-white' : 'h-2 bg-white/40'}`} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Comments Panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="absolute inset-0 bg-black/95 z-30">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="text-white font-bold">{language === 'tr' ? 'Yorumlar' : 'Comments'}</span>
                <button onClick={() => setShowComments(false)}><X className="w-6 h-6 text-white" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{c.user.name[0]}</span>
                    </div>
                    <div><p className="text-white/80 text-sm"><span className="font-bold text-white">{c.user.name}</span> {c.content}</p></div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-white/10 flex gap-2">
                <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder={language === 'tr' ? 'Yorum yaz...' : 'Write a comment...'}
                  className="flex-1 bg-white/10 text-white rounded-full px-4 py-2 text-sm placeholder:text-white/40 focus:outline-none" />
                <button onClick={handleSendComment} className="bg-[#fe2c55] text-white px-4 py-2 rounded-full text-sm font-semibold">{language === 'tr' ? 'Gönder' : 'Send'}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gifts Panel */}
      <AnimatePresence>
        {showGifts && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/95 to-black/90 z-30 rounded-t-3xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{language === 'tr' ? 'Hediye Gönder' : 'Send a Gift'}</span>
                  <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                    <Coins className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-400 text-xs font-semibold">{userCredits}</span>
                  </div>
                </div>
                <button onClick={() => setShowGifts(false)}><X className="w-6 h-6 text-white" /></button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {giftTypes.map(gift => (
                  <button key={gift.id} onClick={() => handleSendGift(gift)} disabled={sendingGift === gift.id || userCredits < gift.price}
                    className={`flex flex-col items-center p-3 rounded-xl ${userCredits >= gift.price ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50'}`}>
                    <span className="text-3xl mb-1">{gift.icon}</span>
                    <span className="text-white text-xs font-medium">{language === 'tr' ? gift.name : gift.nameEn}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Coins className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-400 text-xs">{gift.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Stream Modal */}
      <AnimatePresence>
        {showStartModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 z-40 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-deep-purple-900 rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-white text-xl font-bold mb-4">{language === 'tr' ? 'Canlı Yayın Başlat' : 'Start Live Stream'}</h3>
              <input value={streamTitle} onChange={e => setStreamTitle(e.target.value)} placeholder={language === 'tr' ? 'Yayın başlığı (opsiyonel)' : 'Stream title (optional)'}
                className="w-full bg-white/10 text-white rounded-xl px-4 py-3 mb-4 placeholder:text-white/40 focus:outline-none" />
              <div className="flex gap-3">
                <button onClick={() => setShowStartModal(false)} className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold">{language === 'tr' ? 'İptal' : 'Cancel'}</button>
                <button onClick={startBroadcast} disabled={isStartingStream} className="flex-1 bg-[#fe2c55] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                  {isStartingStream ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Radio className="w-5 h-5" />{language === 'tr' ? 'Başlat' : 'Start'}</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
