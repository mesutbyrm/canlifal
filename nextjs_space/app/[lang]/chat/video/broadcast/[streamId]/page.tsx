'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Heart,
  MessageCircle,
  X,
  Eye,
  Video,
  VideoOff,
  Mic,
  MicOff,
  SwitchCamera,
  Radio,
  Gift,
  Share2,
  Coins,
  Users
} from 'lucide-react'

interface Comment {
  id: string
  content: string
  createdAt: string
  user: { name: string; image: string | null }
}

interface StreamGift {
  id: string
  sender: { name: string }
  giftType: { icon: string; name: string; price: number }
  quantity: number
  createdAt: string
}

interface RecentGift {
  id: string
  senderName: string
  icon: string
  giftName: string
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

export default function BroadcastPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const { language } = useLanguage()
  const streamId = params.streamId as string

  const [viewerCount, setViewerCount] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [totalGiftCredits, setTotalGiftCredits] = useState(0)
  const [comments, setComments] = useState<Comment[]>([])
  const [recentGifts, setRecentGifts] = useState<RecentGift[]>([])
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([])
  const [duration, setDuration] = useState(0)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [streamStarted, setStreamStarted] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const heartIdRef = useRef(0)
  const lastGiftIdRef = useRef<string>('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
    startBroadcast()
    
    const durationInterval = setInterval(() => setDuration(prev => prev + 1), 1000)
    pollIntervalRef.current = setInterval(() => {
      fetchStats()
      fetchComments()
      fetchGifts()
      pollViewerSignals()
    }, 2000)

    return () => {
      clearInterval(durationInterval)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      endStream()
    }
  }, [session])

  const startBroadcast = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 720, max: 1280 },
          height: { ideal: 1280, max: 1920 },
          aspectRatio: { ideal: 9/16 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      setStreamStarted(true)
    } catch (error) {
      console.error('Error starting broadcast:', error)
      alert(language === 'tr' ? 'Kamera erişimi sağlanamadı' : 'Could not access camera')
      router.back()
    }
  }

  const pollViewerSignals = async () => {
    if (!localStreamRef.current) return
    try {
      const res = await fetch(`/api/video-streams/signal?streamId=${streamId}&recipientId=broadcaster`)
      if (!res.ok) return
      const signals = await res.json()

      for (const signal of signals) {
        if (signal.type === 'viewer-join') {
          // Create new peer connection for this viewer
          await createPeerConnectionForViewer(signal.senderId, signal.data?.viewerId || signal.senderId)
        } else if (signal.type === 'answer' && signal.data?.answer) {
          const pc = peerConnectionsRef.current.get(signal.senderId)
          if (pc && pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.data.answer))
          }
        } else if (signal.type === 'ice-candidate' && signal.data?.candidate) {
          const pc = peerConnectionsRef.current.get(signal.senderId)
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.data.candidate))
          }
        }
      }
    } catch (error) {
      console.error('Poll viewer signals error:', error)
    }
  }

  const createPeerConnectionForViewer = async (viewerId: string, displayId: string) => {
    if (peerConnectionsRef.current.has(viewerId)) {
      // Already have connection for this viewer
      return
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peerConnectionsRef.current.set(viewerId, pc)

    // Add local tracks to connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await fetch('/api/video-streams/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            streamId,
            type: 'ice-candidate',
            receiverId: viewerId,
            data: { candidate: event.candidate }
          })
        })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log(`Viewer ${displayId} connection state:`, pc.iceConnectionState)
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
        peerConnectionsRef.current.delete(viewerId)
      }
    }

    // Create and send offer
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await fetch('/api/video-streams/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId,
          type: 'offer',
          receiverId: viewerId,
          data: { offer }
        })
      })
    } catch (error) {
      console.error('Error creating offer:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}`)
      if (res.ok) {
        const data = await res.json()
        setViewerCount(data.viewerCount || 0)
        setLikeCount(data.likeCount || 0)
      }
    } catch (e) {}
  }

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.slice(0, 10))
      }
    } catch (e) {}
  }

  const fetchGifts = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/gifts`)
      if (res.ok) {
        const gifts: StreamGift[] = await res.json()
        
        // Calculate total credits earned
        const total = gifts.reduce((sum, g) => sum + Math.floor(g.giftType.price * g.quantity * 0.7), 0)
        setTotalGiftCredits(total)
        
        // Show recent gifts at top right
        const recent = gifts.slice(0, 3).map(g => ({
          id: g.id,
          senderName: g.sender.name,
          icon: g.giftType.icon,
          giftName: g.giftType.name
        }))
        setRecentGifts(recent)
        
        // Animate new gift
        if (gifts.length > 0 && gifts[0].id !== lastGiftIdRef.current) {
          lastGiftIdRef.current = gifts[0].id
          for (let i = 0; i < 5; i++) {
            setTimeout(() => addFloatingHeart(), i * 100)
          }
        }
      }
    } catch (e) {}
  }

  const addFloatingHeart = () => {
    const newHeart: FloatingHeart = {
      id: heartIdRef.current++,
      x: Math.random() * 60 + 20,
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)]
    }
    setFloatingHearts(prev => [...prev, newHeart])
    setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id)), 2000)
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioOn(audioTrack.enabled)
      }
    }
  }

  const switchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacing)
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: newFacing,
          width: { ideal: 720, max: 1280 },
          height: { ideal: 1280, max: 1920 },
          aspectRatio: { ideal: 9/16 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // Stop old tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      
      localStreamRef.current = newStream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream
      }

      // Update all peer connections with new tracks
      peerConnectionsRef.current.forEach(async (pc, viewerId) => {
        const senders = pc.getSenders()
        const videoSender = senders.find(s => s.track?.kind === 'video')
        const audioSender = senders.find(s => s.track?.kind === 'audio')
        
        const videoTrack = newStream.getVideoTracks()[0]
        const audioTrack = newStream.getAudioTracks()[0]
        
        if (videoSender && videoTrack) await videoSender.replaceTrack(videoTrack)
        if (audioSender && audioTrack) await audioSender.replaceTrack(audioTrack)
      })
    } catch (error) {
      console.error('Error switching camera:', error)
    }
  }

  const endStream = async () => {
    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close())
    peerConnectionsRef.current.clear()

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }

    // Update stream status
    try {
      await fetch(`/api/video-streams/${streamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' })
      })
    } catch (e) {}
  }

  const handleEndStream = async () => {
    await endStream()
    router.push(`/${language}/chat/video`)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatCount = (count: number) => {
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
    return count.toString()
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Video - Object-contain for proper aspect ratio */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-contain bg-black"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {/* Gradient overlays */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 pt-12 px-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#fe2c55] px-2.5 py-1 rounded-sm">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-xs font-bold">LIVE</span>
            </div>
            <div className="bg-black/50 px-2.5 py-1 rounded-sm">
              <span className="text-white text-xs font-medium">{formatDuration(duration)}</span>
            </div>
            <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-sm">
              <Users className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-medium">{formatCount(viewerCount)}</span>
            </div>
          </div>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="bg-black/50 text-white px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            {language === 'tr' ? 'Bitir' : 'End'}
          </button>
        </div>

        {/* Earnings display */}
        {totalGiftCredits > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 backdrop-blur-sm px-3 py-2 rounded-lg w-fit">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 font-bold">+{totalGiftCredits}</span>
            <span className="text-white/70 text-sm">{language === 'tr' ? 'kazanıldı' : 'earned'}</span>
          </div>
        )}
      </div>

      {/* Recent Gifts - Top Right (Fixed Position) */}
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

      {/* Right side - Stats */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-5 z-10">
        {/* Floating hearts */}
        <div className="relative h-20 w-16">
          <AnimatePresence>
            {floatingHearts.map(heart => (
              <motion.div
                key={heart.id}
                initial={{ opacity: 1, y: 0, scale: 0.5 }}
                animate={{ opacity: 0, y: -100, scale: 1.2, x: (Math.random() - 0.5) * 30 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2 }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2"
              >
                <Heart className="w-7 h-7" fill={heart.color} color={heart.color} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Like count */}
        <div className="flex flex-col items-center">
          <div className="w-11 h-11 flex items-center justify-center">
            <Heart className="w-8 h-8 text-white" fill="#fe2c55" color="#fe2c55" />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(likeCount)}</span>
        </div>

        {/* Comments */}
        <div className="flex flex-col items-center">
          <div className="w-11 h-11 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(comments.length)}</span>
        </div>

        {/* Gift count */}
        <div className="flex flex-col items-center">
          <div className="w-11 h-11 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{recentGifts.length}</span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center">
          <div className="w-11 h-11 flex items-center justify-center">
            <Share2 className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>

      {/* Live comments overlay */}
      <div className="absolute left-4 bottom-36 right-24 max-h-44 overflow-hidden z-10">
        <div className="space-y-2">
          {comments.slice(0, 6).map(comment => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{comment.user.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-white/70 text-xs font-medium">{comment.user.name}</span>
                <p className="text-white text-sm line-clamp-1">{comment.content}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-10 px-4">
        <button
          onClick={toggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center ${isVideoOn ? 'bg-white/20 backdrop-blur-sm' : 'bg-[#fe2c55]'}`}
        >
          {isVideoOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
        </button>

        <button
          onClick={toggleAudio}
          className={`w-14 h-14 rounded-full flex items-center justify-center ${isAudioOn ? 'bg-white/20 backdrop-blur-sm' : 'bg-[#fe2c55]'}`}
        >
          {isAudioOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
        </button>

        <button
          onClick={switchCamera}
          className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
        >
          <SwitchCamera className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* End confirmation modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 px-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#fe2c55]/20 flex items-center justify-center mx-auto mb-4">
                <Radio className="w-8 h-8 text-[#fe2c55]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {language === 'tr' ? 'Yayını bitir?' : 'End stream?'}
              </h2>
              <p className="text-white/60 text-sm mb-2">
                {language === 'tr' ? `Süre: ${formatDuration(duration)}` : `Duration: ${formatDuration(duration)}`}
              </p>
              {totalGiftCredits > 0 && (
                <div className="flex items-center justify-center gap-2 mb-4 text-yellow-400">
                  <Coins className="w-5 h-5" />
                  <span className="font-bold">+{totalGiftCredits}</span>
                  <span className="text-white/60 text-sm">{language === 'tr' ? 'jeton kazanıldı' : 'credits earned'}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 bg-white/10 text-white font-semibold py-3 rounded-lg"
                >
                  {language === 'tr' ? 'Devam Et' : 'Continue'}
                </button>
                <button
                  onClick={handleEndStream}
                  className="flex-1 bg-[#fe2c55] text-white font-semibold py-3 rounded-lg"
                >
                  {language === 'tr' ? 'Bitir' : 'End'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
