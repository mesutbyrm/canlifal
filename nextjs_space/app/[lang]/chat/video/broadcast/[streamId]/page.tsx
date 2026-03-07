'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart,
  MessageCircle,
  X,
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
  user: { name: string }
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
  const [connectedViewers, setConnectedViewers] = useState(0)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const processedViewersRef = useRef<Set<string>>(new Set())
  const heartIdRef = useRef(0)
  const lastGiftIdRef = useRef<string>('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountedRef = useRef(false)

  useEffect(() => {
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
    
    isUnmountedRef.current = false
    startBroadcast()
    
    const durationInterval = setInterval(() => {
      if (!isUnmountedRef.current) setDuration(prev => prev + 1)
    }, 1000)
    
    pollIntervalRef.current = setInterval(() => {
      if (!isUnmountedRef.current) {
        fetchStats()
        fetchComments()
        fetchGifts()
        pollViewerSignals()
      }
    }, 1500)

    return () => {
      isUnmountedRef.current = true
      clearInterval(durationInterval)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      cleanup()
    }
  }, [session])

  const startBroadcast = async () => {
    try {
      // Request camera with portrait orientation
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 720 },
          height: { ideal: 1280 },
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
      
      console.log('Broadcast started with tracks:', stream.getTracks().map(t => t.kind))
    } catch (error) {
      console.error('Camera error:', error)
      alert(language === 'tr' ? 'Kamera erişimi sağlanamadı' : 'Could not access camera')
      router.back()
    }
  }

  const pollViewerSignals = async () => {
    if (!localStreamRef.current || isUnmountedRef.current) return
    
    try {
      const res = await fetch(`/api/video-streams/signal?streamId=${streamId}&recipientId=broadcaster`)
      if (!res.ok) return
      const signals = await res.json()

      for (const signal of signals) {
        if (isUnmountedRef.current) break
        
        const viewerId = signal.senderId
        
        if (signal.type === 'viewer-join') {
          // Only create new connection if we haven't processed this viewer
          if (!processedViewersRef.current.has(viewerId)) {
            processedViewersRef.current.add(viewerId)
            console.log('New viewer joining:', viewerId)
            await createConnectionForViewer(viewerId)
          }
        } else if (signal.type === 'answer' && signal.data?.answer) {
          const pc = peerConnectionsRef.current.get(viewerId)
          if (pc && pc.signalingState === 'have-local-offer') {
            console.log('Setting answer from:', viewerId)
            await pc.setRemoteDescription(new RTCSessionDescription(signal.data.answer))
          }
        } else if (signal.type === 'ice-candidate' && signal.data?.candidate) {
          const pc = peerConnectionsRef.current.get(viewerId)
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.data.candidate))
            } catch (e) {
              console.log('ICE candidate error:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Poll signals error:', error)
    }
  }

  const createConnectionForViewer = async (viewerId: string) => {
    if (!localStreamRef.current || peerConnectionsRef.current.has(viewerId)) return

    console.log('Creating peer connection for viewer:', viewerId)
    
    const pc = new RTCPeerConnection({ 
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10
    })
    
    peerConnectionsRef.current.set(viewerId, pc)

    // Add all tracks from local stream
    localStreamRef.current.getTracks().forEach(track => {
      console.log('Adding track to peer:', track.kind)
      pc.addTrack(track, localStreamRef.current!)
    })

    pc.onicecandidate = async (event) => {
      if (event.candidate && !isUnmountedRef.current) {
        await fetch('/api/video-streams/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            streamId,
            type: 'ice-candidate',
            receiverId: viewerId,
            data: { candidate: event.candidate.toJSON() }
          })
        }).catch(() => {})
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log(`Viewer ${viewerId} ICE state:`, pc.iceConnectionState)
      if (pc.iceConnectionState === 'connected') {
        setConnectedViewers(prev => prev + 1)
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        peerConnectionsRef.current.delete(viewerId)
        processedViewersRef.current.delete(viewerId)
        setConnectedViewers(prev => Math.max(0, prev - 1))
      }
    }

    // Create and send offer
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      })
      await pc.setLocalDescription(offer)
      
      console.log('Sending offer to viewer:', viewerId)
      
      await fetch('/api/video-streams/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId,
          type: 'offer',
          receiverId: viewerId,
          data: { offer: pc.localDescription?.toJSON() }
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
        setComments((await res.json()).slice(0, 8))
      }
    } catch (e) {}
  }

  const fetchGifts = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/gifts`)
      if (res.ok) {
        const gifts = await res.json()
        const total = gifts.reduce((sum: number, g: any) => sum + Math.floor(g.giftType.price * g.quantity * 0.7), 0)
        setTotalGiftCredits(total)
        setRecentGifts(gifts.slice(0, 3).map((g: any) => ({
          id: g.id, senderName: g.sender.name, icon: g.giftType.icon, giftName: g.giftType.name
        })))
        if (gifts.length > 0 && gifts[0].id !== lastGiftIdRef.current) {
          lastGiftIdRef.current = gifts[0].id
          for (let i = 0; i < 5; i++) setTimeout(() => addFloatingHeart(), i * 100)
        }
      }
    } catch (e) {}
  }

  const addFloatingHeart = () => {
    const heart = { id: heartIdRef.current++, color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)] }
    setFloatingHearts(prev => [...prev, heart])
    setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== heart.id)), 2000)
  }

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; setIsVideoOn(track.enabled) }
  }

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setIsAudioOn(track.enabled) }
  }

  const switchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacing)
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = newStream
      if (localVideoRef.current) localVideoRef.current.srcObject = newStream

      // Update all peer connections
      peerConnectionsRef.current.forEach(async (pc) => {
        const senders = pc.getSenders()
        const videoTrack = newStream.getVideoTracks()[0]
        const audioTrack = newStream.getAudioTracks()[0]
        const videoSender = senders.find(s => s.track?.kind === 'video')
        const audioSender = senders.find(s => s.track?.kind === 'audio')
        if (videoSender && videoTrack) await videoSender.replaceTrack(videoTrack)
        if (audioSender && audioTrack) await audioSender.replaceTrack(audioTrack)
      })
    } catch (e) { console.error('Camera switch error:', e) }
  }

  const cleanup = () => {
    peerConnectionsRef.current.forEach(pc => pc.close())
    peerConnectionsRef.current.clear()
    processedViewersRef.current.clear()
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    fetch(`/api/video-streams/${streamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ended' })
    }).catch(() => {})
  }

  const handleEndStream = () => {
    cleanup()
    router.push(`/${language}/chat/video`)
  }

  const formatDuration = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
  const formatCount = (n: number) => n >= 1000 ? (n/1000).toFixed(1) + 'K' : n.toString()

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video - Portrait orientation */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {/* Gradients */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#fe2c55] px-2.5 py-1 rounded">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold">LIVE</span>
          </div>
          <div className="bg-black/60 px-2.5 py-1 rounded text-white text-xs">{formatDuration(duration)}</div>
          <div className="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded">
            <Users className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs">{viewerCount}</span>
          </div>
        </div>
        <button onClick={() => setShowEndConfirm(true)} className="bg-black/60 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-1">
          <X className="w-4 h-4" /> {language === 'tr' ? 'Bitir' : 'End'}
        </button>
      </div>

      {/* Earnings */}
      {totalGiftCredits > 0 && (
        <div className="absolute top-16 left-4 flex items-center gap-2 bg-yellow-500/30 backdrop-blur-sm px-3 py-1.5 rounded-lg">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-bold text-sm">+{totalGiftCredits}</span>
        </div>
      )}

      {/* Recent Gifts - Top Right */}
      <div className="absolute top-16 right-3 z-20 space-y-2">
        <AnimatePresence>
          {recentGifts.map((gift, idx) => (
            <motion.div
              key={gift.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/40 to-orange-500/40 backdrop-blur-sm px-3 py-1.5 rounded-full"
            >
              <span className="text-xl">{gift.icon}</span>
              <div className="text-right">
                <p className="text-white text-xs font-bold">{gift.senderName}</p>
                <p className="text-yellow-300 text-[10px]">{gift.giftName}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Right side stats */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-10">
        <div className="relative h-16">
          <AnimatePresence>
            {floatingHearts.map(heart => (
              <motion.div
                key={heart.id}
                initial={{ opacity: 1, y: 0, scale: 0.5 }}
                animate={{ opacity: 0, y: -80, scale: 1.2 }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2"
              >
                <Heart className="w-6 h-6" fill={heart.color} color={heart.color} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex flex-col items-center">
          <Heart className="w-7 h-7" fill="#fe2c55" color="#fe2c55" />
          <span className="text-white text-xs mt-0.5">{formatCount(likeCount)}</span>
        </div>
        <div className="flex flex-col items-center">
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="text-white text-xs mt-0.5">{comments.length}</span>
        </div>
        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full">
          <Gift className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Comments */}
      <div className="absolute left-3 bottom-28 right-20 max-h-36 overflow-hidden z-10 space-y-1.5">
        {comments.slice(0, 5).map(c => (
          <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <span className="text-white/70 text-xs font-medium">{c.user.name}: </span>
            <span className="text-white text-xs">{c.content}</span>
          </motion.div>
        ))}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-10">
        <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center ${isVideoOn ? 'bg-white/20' : 'bg-[#fe2c55]'}`}>
          {isVideoOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
        </button>
        <button onClick={toggleAudio} className={`w-12 h-12 rounded-full flex items-center justify-center ${isAudioOn ? 'bg-white/20' : 'bg-[#fe2c55]'}`}>
          {isAudioOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
        </button>
        <button onClick={switchCamera} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <SwitchCamera className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* End Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-xs text-center">
              <Radio className="w-12 h-12 text-[#fe2c55] mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white mb-2">{language === 'tr' ? 'Yayını bitir?' : 'End stream?'}</h2>
              <p className="text-white/60 text-sm mb-3">{formatDuration(duration)}</p>
              {totalGiftCredits > 0 && (
                <div className="flex items-center justify-center gap-2 mb-4 text-yellow-400">
                  <Coins className="w-4 h-4" />
                  <span className="font-bold">+{totalGiftCredits}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowEndConfirm(false)} className="flex-1 bg-white/10 text-white py-2.5 rounded-lg">{language === 'tr' ? 'Devam' : 'Continue'}</button>
                <button onClick={handleEndStream} className="flex-1 bg-[#fe2c55] text-white py-2.5 rounded-lg">{language === 'tr' ? 'Bitir' : 'End'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
