'use client'

import { useState, useEffect, useRef, TouchEvent, useCallback } from 'react'
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
  Video,
  Gift,
  Coins,
  Users
} from 'lucide-react'

interface VideoStream {
  id: string
  title: string | null
  viewerCount: number
  likeCount: number
  roomId: string
  user: {
    id: string
    name: string
    image: string | null
  }
}

interface Comment {
  id: string
  content: string
  user: { name: string; image: string | null }
}

interface GiftType {
  id: string
  name: string
  nameEn: string
  icon: string
  price: number
  animation: string
}

interface RecentGift {
  id: string
  senderName: string
  icon: string
  giftName: string
  timestamp: number
}

interface FloatingHeart {
  id: number
  x: number
  color: string
}

const HEART_COLORS = ['#ff2d55', '#ff375f', '#ff6b6b', '#ff85a1', '#ffa9c1']
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
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
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting')
  
  const touchStartY = useRef(0)
  const touchEndY = useRef(0)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const heartIdRef = useRef(0)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const viewerIdRef = useRef<string>('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastGiftIdRef = useRef<string>('')
  const currentStreamIdRef = useRef<string>('')

  const currentStream = streams[currentIndex]

  useEffect(() => {
    fetchStreams()
    fetchGiftTypes()
    if (session?.user) fetchCredits()
    const interval = setInterval(fetchStreams, 8000)
    return () => {
      clearInterval(interval)
      cleanupStream(currentStreamIdRef.current)
    }
  }, [])

  useEffect(() => {
    if (currentStream && currentStream.id !== currentStreamIdRef.current) {
      // Cleanup previous stream
      cleanupStream(currentStreamIdRef.current)
      
      // Join new stream
      currentStreamIdRef.current = currentStream.id
      joinStream(currentStream.id)
      setLikeCount(currentStream.likeCount)
      setViewerCount(currentStream.viewerCount)
      checkIfLiked(currentStream.id)
      fetchComments(currentStream.id)
    }
  }, [currentIndex, currentStream?.id])

  const joinStream = async (streamId: string) => {
    try {
      // Register as viewer
      const joinRes = await fetch(`/api/video-streams/${streamId}/join`, { method: 'POST' })
      if (joinRes.ok) {
        const data = await joinRes.json()
        viewerIdRef.current = data.viewerId
      }

      // Setup WebRTC
      setupWebRTC(streamId)

      // Start polling for signals and gifts
      pollIntervalRef.current = setInterval(() => {
        pollSignals(streamId)
        pollGifts(streamId)
        fetchStreamStats(streamId)
      }, 2000)
    } catch (error) {
      console.error('Error joining stream:', error)
    }
  }

  const cleanupStream = (streamId?: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    // Fire and forget leave request
    if (streamId && viewerIdRef.current) {
      fetch(`/api/video-streams/${streamId}/join?viewerId=${viewerIdRef.current}`, { method: 'DELETE' }).catch(() => {})
    }
    viewerIdRef.current = ''
    setConnectionStatus('connecting')
  }

  const setupWebRTC = (streamId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc

    pc.ontrack = (event) => {
      console.log('Received track:', event.track.kind)
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
        setConnectionStatus('connected')
      }
    }

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await fetch('/api/video-streams/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            streamId,
            type: 'ice-candidate',
            receiverId: 'broadcaster',
            data: { candidate: event.candidate }
          })
        })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('ICE state:', pc.iceConnectionState)
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionStatus('connected')
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        setConnectionStatus('disconnected')
      }
    }

    // Send join signal to broadcaster
    fetch('/api/video-streams/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        streamId,
        type: 'viewer-join',
        receiverId: 'broadcaster',
        data: { viewerId: session?.user?.id || viewerIdRef.current }
      })
    })
  }

  const pollSignals = async (streamId: string) => {
    if (!pcRef.current) return
    try {
      const myId = session?.user?.id || viewerIdRef.current
      const res = await fetch(`/api/video-streams/signal?streamId=${streamId}&recipientId=${myId}`)
      if (!res.ok) return
      const signals = await res.json()

      for (const signal of signals) {
        if (signal.type === 'offer' && pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.data.offer))
          const answer = await pcRef.current.createAnswer()
          await pcRef.current.setLocalDescription(answer)
          await fetch('/api/video-streams/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              streamId,
              type: 'answer',
              receiverId: signal.senderId,
              data: { answer }
            })
          })
        } else if (signal.type === 'ice-candidate' && signal.data?.candidate && pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.data.candidate))
        }
      }
    } catch (error) {
      console.error('Poll signals error:', error)
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
      
      if (gifts.length > 0) {
        const newGifts = gifts.filter((g: any) => 
          new Date(g.createdAt).getTime() > Date.now() - 10000
        ).map((g: any) => ({
          id: g.id,
          senderName: g.sender.name,
          icon: g.giftType.icon,
          giftName: g.giftType.name,
          timestamp: new Date(g.createdAt).getTime()
        }))
        setRecentGifts(newGifts.slice(0, 3))
      }
    } catch (e) {}
  }

  const fetchStreams = async () => {
    try {
      const res = await fetch('/api/video-streams')
      if (res.ok) {
        const data = await res.json()
        setStreams(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
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
      if (res.ok) {
        const data = await res.json()
        setUserCredits(data.credits)
      }
    } catch (e) {}
  }

  const checkIfLiked = async (streamId: string) => {
    if (!session?.user) return
    try {
      const res = await fetch(`/api/video-streams/${streamId}/like`)
      if (res.ok) {
        const data = await res.json()
        setIsLiked(data.isLiked)
      }
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
        const newHeart: FloatingHeart = {
          id: heartIdRef.current++,
          x: Math.random() * 40 + 30,
          color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)]
        }
        setFloatingHearts(prev => [...prev, newHeart])
        setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id)), 2000)
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

  const handleSendGift = async (giftType: GiftType) => {
    if (!currentStream || !session?.user) return
    if (userCredits < giftType.price) {
      alert(language === 'tr' ? 'Yetersiz jeton!' : 'Insufficient credits!')
      return
    }

    setSendingGift(giftType.id)
    try {
      const res = await fetch(`/api/video-streams/${currentStream.id}/gifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftTypeId: giftType.id, quantity: 1 })
      })
      if (res.ok) {
        const data = await res.json()
        setUserCredits(data.newBalance)
        setShowGifts(false)
        // Add to recent gifts
        setRecentGifts(prev => [{
          id: Date.now().toString(),
          senderName: session.user?.name || 'Sen',
          icon: giftType.icon,
          giftName: giftType.name,
          timestamp: Date.now()
        }, ...prev].slice(0, 3))
      }
    } catch (e) {}
    setSendingGift(null)
  }

  const handleTouchStart = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY }
  const handleTouchMove = (e: TouchEvent) => { touchEndY.current = e.touches[0].clientY }
  const handleTouchEnd = () => {
    const diff = touchStartY.current - touchEndY.current
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < streams.length - 1) setCurrentIndex(prev => prev + 1)
      else if (diff < 0 && currentIndex > 0) setCurrentIndex(prev => prev - 1)
    }
  }

  const handleStartStream = () => {
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
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
      if (res.ok) {
        const newStream = await res.json()
        router.push(`/${language}/chat/video/broadcast/${newStream.id}`)
      }
    } catch (e) {}
    setIsStartingStream(false)
  }

  const formatCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
    return count.toString()
  }

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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 via-black to-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain bg-black"
            />
            {connectionStatus !== 'connected' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    {currentStream?.user?.image ? (
                      <Image src={currentStream.user.image} alt="" width={96} height={96} className="rounded-full" />
                    ) : (
                      <span className="text-4xl text-white font-bold">{currentStream?.user?.name?.[0]}</span>
                    )}
                  </div>
                  <p className="text-white font-bold text-lg">@{currentStream?.user?.name}</p>
                  <p className="text-white/60 text-sm mt-1">
                    {connectionStatus === 'connecting' 
                      ? (language === 'tr' ? 'Bağlanıyor...' : 'Connecting...') 
                      : (language === 'tr' ? 'Bağlantı kesildi' : 'Disconnected')}
                  </p>
                  <div className="mt-4 w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
          </div>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-4 z-10">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#fe2c55] px-2 py-1 rounded-sm">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="text-white text-xs font-semibold">LIVE</span>
              </div>
              <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-sm">
                <Users className="w-3 h-3 text-white" />
                <span className="text-white/80 text-xs">{viewerCount}</span>
              </div>
            </div>
            <button
              onClick={handleStartStream}
              className="bg-[#fe2c55] text-white text-xs font-semibold px-3 py-1.5 rounded-sm flex items-center gap-1"
            >
              <Radio className="w-3 h-3" />
              {language === 'tr' ? 'Yayın Başlat' : 'Go Live'}
            </button>
          </div>

          {/* Recent Gifts - Top Right */}
          <div className="absolute top-28 right-3 z-20">
            <AnimatePresence>
              {recentGifts.map((gift, idx) => (
                <motion.div
                  key={gift.id}
                  initial={{ opacity: 0, x: 50, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.8 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/40 to-orange-500/40 backdrop-blur-sm px-3 py-2 rounded-full mb-2"
                >
                  <span className="text-2xl">{gift.icon}</span>
                  <div className="text-right">
                    <p className="text-white text-xs font-bold">{gift.senderName}</p>
                    <p className="text-yellow-300 text-[10px]">{gift.giftName}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Right side actions */}
          <div className="absolute right-3 bottom-36 flex flex-col items-center gap-5 z-10">
            {/* Profile */}
            <div className="relative mb-2">
              <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-gray-800">
                {currentStream?.user?.image ? (
                  <Image src={currentStream.user.image} alt="" width={48} height={48} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{currentStream?.user?.name?.[0]?.toUpperCase()}</span>
                  </div>
                )}
              </div>
              <button className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#fe2c55] flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Like */}
            <div className="flex flex-col items-center relative">
              <AnimatePresence>
                {floatingHearts.map(heart => (
                  <motion.div
                    key={heart.id}
                    initial={{ opacity: 1, y: 0, scale: 0.5 }}
                    animate={{ opacity: 0, y: -120, scale: 1.2, x: (Math.random() - 0.5) * 40 }}
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
                  <Heart className={`w-8 h-8 ${isLiked ? 'scale-110' : ''}`} fill={isLiked ? '#fe2c55' : 'transparent'} color={isLiked ? '#fe2c55' : 'white'} strokeWidth={2} />
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

            {/* Gift */}
            <button onClick={() => setShowGifts(true)} className="flex flex-col items-center">
              <div className="w-11 h-11 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs font-medium mt-0.5">{language === 'tr' ? 'Hediye' : 'Gift'}</span>
            </button>

            {/* Mute */}
            <button onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center">
              <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-sm">
                {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
              </div>
            </button>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-6 left-4 right-20 z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white font-bold text-base">@{currentStream?.user?.name}</span>
              <span className="bg-[#fe2c55]/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                {language === 'tr' ? 'Falcı' : 'Teller'}
              </span>
            </div>
            {currentStream?.title && <p className="text-white text-sm mb-2 line-clamp-2">{currentStream.title}</p>}
            <div className="flex items-center gap-2">
              <Music2 className="w-4 h-4 text-white" />
              <p className="text-white text-sm">🔮 Mistik Melodi</p>
            </div>
          </div>

          {/* Video indicators */}
          {streams.length > 1 && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
              {streams.map((_, idx) => (
                <div key={idx} className={`w-1 rounded-full transition-all ${idx === currentIndex ? 'h-4 bg-white' : 'h-1 bg-white/40'}`} />
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
            <div className="flex justify-center pt-2 pb-1"><div className="w-10 h-1 bg-gray-600 rounded-full" /></div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white font-semibold">{comments.length} {language === 'tr' ? 'yorum' : 'comments'}</h3>
              <button onClick={() => setShowComments(false)}><X className="w-6 h-6 text-white/70" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 max-h-[calc(60vh-120px)]">
              {comments.length === 0 ? (
                <p className="text-white/50 text-center py-8">{language === 'tr' ? 'Henüz yorum yok' : 'No comments yet'}</p>
              ) : (
                <div className="space-y-4">
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{comment.user.name[0]}</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-white/60 text-sm font-medium">{comment.user.name}</span>
                        <p className="text-white text-sm">{comment.content}</p>
                      </div>
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
                  <button onClick={handleSendComment} disabled={!newComment.trim()} className="text-[#fe2c55] font-semibold text-sm disabled:opacity-50">
                    {language === 'tr' ? 'Gönder' : 'Post'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift Panel */}
      <AnimatePresence>
        {showGifts && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 h-[50%] bg-[#121212] rounded-t-xl z-30"
          >
            <div className="flex justify-center pt-2 pb-1"><div className="w-10 h-1 bg-gray-600 rounded-full" /></div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" />
                {language === 'tr' ? 'Hediye Gönder' : 'Send Gift'}
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-sm">{userCredits}</span>
                </div>
                <button onClick={() => setShowGifts(false)}><X className="w-6 h-6 text-white/70" /></button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(50vh-80px)]">
              <div className="grid grid-cols-4 gap-3">
                {giftTypes.map(gift => (
                  <button
                    key={gift.id}
                    onClick={() => handleSendGift(gift)}
                    disabled={sendingGift === gift.id || userCredits < gift.price}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                      userCredits >= gift.price 
                        ? 'border-white/20 bg-white/5 hover:border-yellow-400/50 hover:bg-yellow-400/10' 
                        : 'border-white/10 bg-white/5 opacity-50'
                    } ${sendingGift === gift.id ? 'scale-95' : ''}`}
                  >
                    <span className="text-3xl mb-1">{gift.icon}</span>
                    <span className="text-white text-xs font-medium">{language === 'tr' ? gift.name : gift.nameEn}</span>
                    <div className="flex items-center gap-0.5 mt-1">
                      <Coins className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-400 text-xs font-bold">{gift.price}</span>
                    </div>
                  </button>
                ))}
              </div>
              {!session?.user && (
                <p className="text-center text-white/50 mt-4 text-sm">
                  {language === 'tr' ? 'Hediye göndermek için giriş yapın' : 'Login to send gifts'}
                </p>
              )}
            </div>
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
                  <><Radio className="w-5 h-5" />{language === 'tr' ? 'Yayını Başlat' : 'Go Live'}</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
