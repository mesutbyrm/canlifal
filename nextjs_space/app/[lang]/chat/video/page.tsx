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
  Video,
  Gift,
  Coins,
  Users,
  Loader2,
  RefreshCw,
  Send
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
  user: { name: string; image?: string | null }
}

interface GiftType {
  id: string
  name: string
  nameEn: string
  icon: string
  price: number
}

interface CenterGift {
  id: string
  senderName: string
  senderImage?: string | null
  icon: string
  giftName: string
}

interface Viewer {
  id: string
  name: string
  image?: string | null
  hasGifted: boolean
  totalGiftAmount: number
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
  const [showGifts, setShowGifts] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([])
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
  const [centerGift, setCenterGift] = useState<CenterGift | null>(null)
  const [viewers, setViewers] = useState<Viewer[]>([])
  
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
  const lastGiftIdRef = useRef<string>('')
  const commentInputRef = useRef<HTMLInputElement>(null)

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
      await fetch(`/api/video-streams/${streamId}/join`, { method: 'POST' })

      const pc = new RTCPeerConnection({ 
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 10
      })
      pcRef.current = pc

      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0]
          remoteVideoRef.current.play().catch(e => console.log('Autoplay error:', e))
          setConnectionStatus('connected')
        }
      }

      pc.onicecandidate = async (event) => {
        if (event.candidate && !isUnmountedRef.current) {
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
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setConnectionStatus('connected')
        } else if (pc.iceConnectionState === 'failed') {
          setConnectionStatus('failed')
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setConnectionStatus('connected')
        }
      }

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

      let pollCount = 0
      const pollFn = () => {
        if (!isUnmountedRef.current) {
          pollSignals(streamId)
          fetchStreamStats(streamId)
          pollGifts(streamId)
          fetchViewers(streamId)
          fetchComments(streamId)
        }
      }

      pollFn()
      pollIntervalRef.current = setInterval(() => {
        pollCount++
        pollFn()
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
          try {
            if (pcRef.current.signalingState === 'stable' || pcRef.current.signalingState === 'have-local-pranswer') {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.data.offer))
              
              for (const candidate of pendingCandidatesRef.current) {
                try {
                  await pcRef.current.addIceCandidate(candidate)
                } catch (e) {}
              }
              pendingCandidatesRef.current = []
              
              const answer = await pcRef.current.createAnswer()
              await pcRef.current.setLocalDescription(answer)
              
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
          } catch (e) {}
        } else if (signal.type === 'ice-candidate' && signal.data?.candidate) {
          try {
            if (pcRef.current.remoteDescription) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.data.candidate))
            } else {
              pendingCandidatesRef.current.push(new RTCIceCandidate(signal.data.candidate))
            }
          } catch (e) {}
        }
      }
    } catch (error) {}
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

  const fetchViewers = async (streamId: string) => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/viewers`)
      if (res.ok) {
        setViewers(await res.json())
      }
    } catch (e) {}
  }

  const pollGifts = async (streamId: string) => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/gifts`)
      if (!res.ok) return
      const gifts = await res.json()
      
      // Show center gift animation for new gifts
      if (gifts.length > 0 && gifts[0].id !== lastGiftIdRef.current) {
        const newGift = gifts[0]
        lastGiftIdRef.current = newGift.id
        
        setCenterGift({
          id: newGift.id,
          senderName: newGift.sender.name,
          senderImage: newGift.sender.image,
          icon: newGift.giftType.icon,
          giftName: newGift.giftType.name
        })
        
        // Clear after 3 seconds
        setTimeout(() => setCenterGift(null), 3000)
        
        // Add floating hearts
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const heart = { id: heartIdRef.current++, color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)] }
            setFloatingHearts(prev => [...prev, heart])
            setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== heart.id)), 2000)
          }, i * 100)
        }
      }
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
        
        // Show center gift animation
        setCenterGift({
          id: Date.now().toString(),
          senderName: session.user?.name || 'Sen',
          senderImage: session.user?.image,
          icon: gift.icon,
          giftName: gift.name
        })
        setTimeout(() => setCenterGift(null), 3000)
        
        // Add floating hearts
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const heart = { id: heartIdRef.current++, color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)] }
            setFloatingHearts(prev => [...prev, heart])
            setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== heart.id)), 2000)
          }, i * 100)
        }
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

  // Separate gifters and regular viewers
  const gifters = viewers.filter(v => v.hasGifted).sort((a, b) => b.totalGiftAmount - a.totalGiftAmount)
  const regularViewers = viewers.filter(v => !v.hasGifted)

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
          <p className="text-white/60 text-center text-sm mb-8">{language === 'tr' ? 'Sohbet sayfasından yayınları takip edebilirsin' : 'You can follow streams from the chat page'}</p>
          <button onClick={() => router.push(`/${language}/chat`)} className="bg-white/10 text-white font-semibold px-8 py-3 rounded flex items-center gap-2">
            <X className="w-5 h-5" /> {language === 'tr' ? 'Çıkış' : 'Exit'}
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
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />

          {/* Center Gift Animation */}
          <AnimatePresence>
            {centerGift && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
              >
                <motion.div
                  initial={{ y: 50 }}
                  animate={{ y: 0 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: 2, duration: 0.5 }}
                    className="text-8xl mb-4"
                  >
                    {centerGift.icon}
                  </motion.div>
                  <div className="flex items-center justify-center gap-3 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full">
                    {centerGift.senderImage ? (
                      <Image src={centerGift.senderImage} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold">{centerGift.senderName[0]}</span>
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-white font-bold text-lg">{centerGift.senderName}</p>
                      <p className="text-yellow-400 text-sm">{centerGift.giftName} {language === 'tr' ? 'gönderdi' : 'sent'}</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tap to like overlay */}
          <div 
            className="absolute inset-0 z-5" 
            onClick={handleLike}
          />

          {/* Top bar - Broadcaster Profile (like broadcaster view) */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              {/* Profile */}
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2 py-1.5 rounded-full">
                {currentStream?.user?.image ? (
                  <Image src={currentStream.user.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{currentStream?.user?.name?.[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-white text-xs font-medium">{currentStream?.user?.name}</span>
                  <div className="flex items-center gap-0.5 bg-[#fe2c55] px-1.5 py-0.5 rounded w-fit">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    <span className="text-white text-[10px] font-bold">LIVE</span>
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full">
                  <Users className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-xs">{viewerCount}</span>
                </div>
                <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full">
                  <Heart className="w-3.5 h-3.5 text-[#fe2c55]" fill="#fe2c55" />
                  <span className="text-white text-xs">{formatCount(likeCount)}</span>
                </div>
              </div>
            </div>
            
            <button onClick={() => router.push(`/${language}/chat`)} className="bg-black/60 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-1">
              <X className="w-4 h-4" /> {language === 'tr' ? 'Çıkış' : 'Exit'}
            </button>
          </div>

          {/* Gifters - Small badges below top bar */}
          {gifters.length > 0 && (
            <div className="absolute top-20 left-4 z-20">
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {gifters.slice(0, 3).map((viewer) => (
                  <motion.div
                    key={viewer.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 backdrop-blur-sm px-1.5 py-0.5 rounded-full"
                  >
                    {viewer.image ? (
                      <Image src={viewer.image} alt="" width={16} height={16} className="w-4 h-4 rounded-full object-cover" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">{viewer.name[0]}</span>
                      </div>
                    )}
                    <span className="text-yellow-400 text-[10px]">🎁{viewer.totalGiftAmount}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Floating Hearts Animation */}
          <div className="absolute right-4 top-1/3 z-10">
            <AnimatePresence>
              {floatingHearts.map(heart => (
                <motion.div key={heart.id} initial={{ opacity: 1, y: 0, x: 0 }} animate={{ opacity: 0, y: -150, x: Math.random() * 30 - 15 }} transition={{ duration: 2 }}
                  className="absolute bottom-0 right-0">
                  <Heart className="w-8 h-8" fill={heart.color} stroke={heart.color} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Mute button - top right corner below exit */}
          <div className="absolute top-16 right-4 z-20">
            <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
              {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
            </button>
          </div>

          {/* Comments floating above input */}
          <div className="absolute left-3 bottom-24 right-3 max-h-32 overflow-hidden z-10 space-y-1">
            {comments.slice(0, 5).map(c => (
              <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-black/40 backdrop-blur-sm rounded-lg px-2.5 py-1">
                <span className="text-white/70 text-xs font-medium">{c.user.name}: </span>
                <span className="text-white text-xs">{c.content}</span>
              </motion.div>
            ))}
          </div>

          {/* Bottom input and gift - Always visible */}
          <div className="absolute bottom-4 left-3 right-3 flex items-center gap-2 z-20" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowGifts(true); }}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0"
            >
              <Gift className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1 flex items-center bg-white/10 backdrop-blur-sm rounded-full overflow-hidden">
              <input
                ref={commentInputRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                onClick={(e) => e.stopPropagation()}
                placeholder={language === 'tr' ? 'Mesaj yaz...' : 'Write a message...'}
                className="flex-1 bg-transparent text-white text-sm px-4 py-2.5 placeholder:text-white/40 focus:outline-none"
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleSendComment(); }}
                disabled={!newComment.trim()}
                className="px-3 py-2 text-white/60 hover:text-white disabled:opacity-30"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
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

      {/* Gifts Panel - Slides up from bottom */}
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

    </div>
  )
}
