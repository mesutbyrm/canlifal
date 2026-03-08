'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
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
  Coins,
  Users,
  Send
} from 'lucide-react'

interface Comment {
  id: string
  content: string
  user: { name: string; image?: string | null }
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
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([])
  const [duration, setDuration] = useState(0)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [connectedViewers, setConnectedViewers] = useState(0)
  const [centerGift, setCenterGift] = useState<CenterGift | null>(null)
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [newComment, setNewComment] = useState('')

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const processedViewersRef = useRef<Set<string>>(new Set())
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(new Map())
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
        fetchViewers()
        pollViewerSignals()
      }
    }, 1000)

    return () => {
      isUnmountedRef.current = true
      clearInterval(durationInterval)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      cleanup()
    }
  }, [session])

  const startBroadcast = async () => {
    try {
      // Request camera with wider view - lower resolution for more FOV
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 480, max: 640 },
          height: { ideal: 640, max: 960 },
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
        
        const viewerId = signal.data?.viewerId || signal.senderId
        if (!viewerId) continue
        
        if (signal.type === 'viewer-join') {
          if (!processedViewersRef.current.has(viewerId)) {
            processedViewersRef.current.add(viewerId)
            await createConnectionForViewer(viewerId)
          }
        } else if (signal.type === 'answer' && signal.data?.answer) {
          const pc = peerConnectionsRef.current.get(viewerId)
          if (pc && pc.signalingState === 'have-local-offer') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.data.answer))
              
              const pendingCandidates = pendingCandidatesRef.current.get(viewerId) || []
              for (const candidate of pendingCandidates) {
                try { await pc.addIceCandidate(candidate) } catch (e) {}
              }
              pendingCandidatesRef.current.delete(viewerId)
            } catch (e) {}
          }
        } else if (signal.type === 'ice-candidate' && signal.data?.candidate) {
          const pc = peerConnectionsRef.current.get(viewerId)
          if (pc) {
            try {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.data.candidate))
              } else {
                const pending = pendingCandidatesRef.current.get(viewerId) || []
                pending.push(new RTCIceCandidate(signal.data.candidate))
                pendingCandidatesRef.current.set(viewerId, pending)
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {}
  }

  const createConnectionForViewer = async (viewerId: string) => {
    if (!localStreamRef.current || peerConnectionsRef.current.has(viewerId)) return
    
    const pc = new RTCPeerConnection({ 
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10
    })
    
    peerConnectionsRef.current.set(viewerId, pc)

    localStreamRef.current.getTracks().forEach(track => {
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
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectedViewers(peerConnectionsRef.current.size)
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        peerConnectionsRef.current.delete(viewerId)
        processedViewersRef.current.delete(viewerId)
        pendingCandidatesRef.current.delete(viewerId)
        setConnectedViewers(prev => Math.max(0, prev - 1))
      }
    }

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
          data: { offer: pc.localDescription?.toJSON() }
        })
      })
    } catch (error) {}
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

  const fetchViewers = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/viewers`)
      if (res.ok) {
        setViewers(await res.json())
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
          
          setTimeout(() => setCenterGift(null), 3000)
          
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
        video: { facingMode: newFacing, width: { ideal: 480 }, height: { ideal: 640 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = newStream
      if (localVideoRef.current) localVideoRef.current.srcObject = newStream

      peerConnectionsRef.current.forEach(async (pc) => {
        const senders = pc.getSenders()
        const videoTrack = newStream.getVideoTracks()[0]
        const audioTrack = newStream.getAudioTracks()[0]
        const videoSender = senders.find(s => s.track?.kind === 'video')
        const audioSender = senders.find(s => s.track?.kind === 'audio')
        if (videoSender && videoTrack) await videoSender.replaceTrack(videoTrack)
        if (audioSender && audioTrack) await audioSender.replaceTrack(audioTrack)
      })
    } catch (e) {}
  }

  const handleSendComment = async () => {
    if (!newComment.trim()) return
    // Broadcaster can also send comments
    try {
      const res = await fetch(`/api/video-streams/${streamId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      })
      if (res.ok) {
        const comment = await res.json()
        setComments(prev => [comment, ...prev].slice(0, 8))
        setNewComment('')
      }
    } catch (e) {}
  }

  const cleanup = () => {
    peerConnectionsRef.current.forEach(pc => pc.close())
    peerConnectionsRef.current.clear()
    processedViewersRef.current.clear()
    pendingCandidatesRef.current.clear()
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    fetch(`/api/video-streams/${streamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ended' })
    }).catch(() => {})
  }

  const handleEndStream = () => {
    cleanup()
    router.push(`/${language}/chat`)
  }

  const formatDuration = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
  const formatCount = (n: number) => n >= 1000 ? (n/1000).toFixed(1) + 'K' : n.toString()

  // Separate gifters and regular viewers
  const gifters = viewers.filter(v => v.hasGifted).sort((a, b) => b.totalGiftAmount - a.totalGiftAmount)
  const regularViewers = viewers.filter(v => !v.hasGifted)

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video - Portrait orientation with wider view */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-contain bg-black"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {/* Gradients */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
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

      {/* Top bar - Broadcaster Profile */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Profile */}
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2 py-1.5 rounded-full">
            {session?.user?.image ? (
              <Image src={session.user.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{session?.user?.name?.[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-white text-xs font-medium">{session?.user?.name}</span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="flex items-center gap-0.5 bg-[#fe2c55] px-1.5 py-0.5 rounded">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="text-white font-bold">LIVE</span>
                </div>
                <span className="text-white/60">{formatDuration(duration)}</span>
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
            {totalGiftCredits > 0 && (
              <div className="flex items-center gap-1 bg-yellow-500/30 px-2 py-1 rounded-full">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-400 text-xs font-bold">+{totalGiftCredits}</span>
              </div>
            )}
          </div>
        </div>
        
        <button onClick={() => setShowEndConfirm(true)} className="bg-black/60 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-1">
          <X className="w-4 h-4" /> {language === 'tr' ? 'Bitir' : 'End'}
        </button>
      </div>

      {/* Floating Hearts Animation */}
      <div className="absolute right-4 top-1/3 z-10">
        <AnimatePresence>
          {floatingHearts.map(heart => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -80, scale: 1.2 }}
              className="absolute bottom-0 right-0"
            >
              <Heart className="w-6 h-6" fill={heart.color} color={heart.color} />
            </motion.div>
          ))}
        </AnimatePresence>
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

      {/* Comments floating above input */}
      <div className="absolute left-3 bottom-28 right-3 max-h-32 overflow-hidden z-10 space-y-1">
        {comments.slice(0, 5).map(c => (
          <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <span className="text-white/70 text-xs font-medium">{c.user.name}: </span>
            <span className="text-white text-xs">{c.content}</span>
          </motion.div>
        ))}
      </div>

      {/* Bottom controls with message input */}
      <div className="absolute bottom-4 left-3 right-3 z-10">
        {/* Message input */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center bg-white/10 backdrop-blur-sm rounded-full overflow-hidden">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendComment()}
              placeholder={language === 'tr' ? 'Mesaj yaz...' : 'Write a message...'}
              className="flex-1 bg-transparent text-white text-sm px-4 py-2.5 placeholder:text-white/40 focus:outline-none"
            />
            <button
              onClick={handleSendComment}
              disabled={!newComment.trim()}
              className="px-3 py-2 text-white/60 hover:text-white disabled:opacity-30"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Control buttons */}
        <div className="flex justify-center gap-4">
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
