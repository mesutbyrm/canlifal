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
  Send,
  UserPlus,
  Phone,
  LogIn,
  Swords
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
  x: number
}

interface CoBroadcastInvite {
  streamId: string
  broadcasterName: string
  broadcasterImage?: string | null
}

const HEART_COLORS = ['#ff2d55', '#ff375f', '#ff6b6b', '#ff85a1', '#ffa9c1']

// Get formatted heart level string based on like count (1k, 2k, etc up to 100k+)
const getHeartLevelText = (count: number): string => {
  if (count < 1000) return ''
  const level = Math.floor(count / 1000)
  if (level > 100) return '100k+'
  return `${level}k`
}
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
  const [coBroadcastInvite, setCoBroadcastInvite] = useState<CoBroadcastInvite | null>(null)
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false)
  const [heartLevelText, setHeartLevelText] = useState('')
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [guestCountdown, setGuestCountdown] = useState(3)
  // VS Mode state
  const [activeCoBroadcaster, setActiveCoBroadcaster] = useState<{
    id: string
    userId: string
    user: { id: string; name: string; image: string | null }
  } | null>(null)
  const [broadcasterScore, setBroadcasterScore] = useState(0)
  const [coBroadcasterScore, setCoBroadcasterScore] = useState(0)
  const [battleTimer, setBattleTimer] = useState(0)
  const lastTapRef = useRef(0)
  const guestTimerRef = useRef<NodeJS.Timeout | null>(null)
  const battleTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const touchStartY = useRef(0)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const coBroadcasterVideoRef = useRef<HTMLVideoElement>(null)
  const heartIdRef = useRef(0)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const coBroadcasterPcRef = useRef<RTCPeerConnection | null>(null)
  const viewerIdRef = useRef<string>('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentStreamIdRef = useRef<string>('')
  const isUnmountedRef = useRef(false)
  const hasJoinedRef = useRef(false)
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([])
  const lastGiftIdRef = useRef<string>('')
  const commentInputRef = useRef<HTMLInputElement>(null)
  const sessionRef = useRef(session)
  
  // Keep session ref up to date
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  // Set viewerId based on whether user is logged in
  useEffect(() => {
    if (session?.user?.id) {
      viewerIdRef.current = session.user.id
    } else {
      viewerIdRef.current = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }, [session?.user?.id])

  const currentStream = streams[currentIndex]

  useEffect(() => {
    isUnmountedRef.current = false
    fetchStreams()
    fetchGiftTypes()
    
    if (session?.user) {
      fetchCredits()
    }
    
    // Poll for co-broadcast invitations (for both guests and logged-in users)
    const inviteInterval = setInterval(checkCoBroadcastInvite, 3000)
    const streamInterval = setInterval(fetchStreams, 10000)
    
    return () => {
      isUnmountedRef.current = true
      clearInterval(inviteInterval)
      clearInterval(streamInterval)
      cleanup()
    }
  }, [session?.user])

  useEffect(() => {
    // Wait until viewerId is set before joining
    if (!viewerIdRef.current) return
    
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
      
      // Start guest timer if not logged in
      if (!session?.user) {
        setGuestCountdown(3)
        setShowGuestModal(false)
        
        // Clear any existing timer
        if (guestTimerRef.current) {
          clearInterval(guestTimerRef.current)
        }
        
        // Start countdown
        guestTimerRef.current = setInterval(() => {
          setGuestCountdown(prev => {
            if (prev <= 1) {
              if (guestTimerRef.current) clearInterval(guestTimerRef.current)
              setShowGuestModal(true)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    }
  }, [currentIndex, currentStream?.id, session?.user?.id])
  
  // Cleanup guest timer on unmount
  useEffect(() => {
    return () => {
      if (guestTimerRef.current) {
        clearInterval(guestTimerRef.current)
      }
    }
  }, [])

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
          fetchCoBroadcasters(streamId)
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
      // Keep actual user ID for logged-in users, only regenerate for guests
      if (!session?.user?.id) {
        viewerIdRef.current = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
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
        setHeartLevelText(getHeartLevelText(data.likeCount || 0))
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

  // Fetch co-broadcasters for VS mode
  const fetchCoBroadcasters = async (streamId: string) => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/co-broadcast`)
      if (res.ok) {
        const data = await res.json()
        const active = data.find((cb: any) => cb.status === 'active')
        
        if (active && !activeCoBroadcaster) {
          setActiveCoBroadcaster(active)
          // Start battle timer
          if (!battleTimerRef.current) {
            setBattleTimer(0)
            battleTimerRef.current = setInterval(() => {
              setBattleTimer(prev => prev + 1)
            }, 1000)
          }
        } else if (!active && activeCoBroadcaster) {
          // Co-broadcaster left
          setActiveCoBroadcaster(null)
          setBroadcasterScore(0)
          setCoBroadcasterScore(0)
          if (battleTimerRef.current) {
            clearInterval(battleTimerRef.current)
            battleTimerRef.current = null
          }
          setBattleTimer(0)
        }
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
          setTimeout(() => addFloatingHeart(), i * 100)
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

  const addFloatingHeart = (x?: number) => {
    const heart = { 
      id: heartIdRef.current++, 
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      x: x ?? Math.random() * 60 + 20 // Random x position between 20-80%
    }
    setFloatingHearts(prev => [...prev, heart])
    setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== heart.id)), 2000)
  }

  const handleLike = async () => {
    if (!currentStream || !session?.user) return
    for (let i = 0; i < 3; i++) {
      setTimeout(() => addFloatingHeart(), i * 100)
    }
    try {
      const res = await fetch(`/api/video-streams/${currentStream.id}/like`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setIsLiked(data.isLiked)
        setLikeCount(data.likeCount)
        setHeartLevelText(getHeartLevelText(data.likeCount))
      }
    } catch (e) {}
  }

  // Handle tap anywhere on screen to like
  const handleScreenTap = async (e: React.MouseEvent | React.TouchEvent) => {
    const currentSession = sessionRef.current
    if (!currentStream) return
    
    // Check if tap was on an interactive element
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('[data-no-tap]')) {
      return
    }
    
    // Debounce - min 100ms between taps
    const now = Date.now()
    if (now - lastTapRef.current < 100) return
    lastTapRef.current = now
    
    // Get tap position for heart
    let tapX = 50
    if ('clientX' in e) {
      tapX = (e.clientX / window.innerWidth) * 100
    } else if (e.touches?.length) {
      tapX = (e.touches[0].clientX / window.innerWidth) * 100
    }
    
    // Add floating heart at tap position
    addFloatingHeart(tapX)
    
    // Send like to server (both logged-in users and guests can like)
    try {
      const res = await fetch(`/api/video-streams/${currentStream.id}/like`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setLikeCount(data.likeCount)
        setHeartLevelText(getHeartLevelText(data.likeCount))
      }
    } catch (e) {
      console.error('Error liking stream:', e)
    }
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
          setTimeout(() => addFloatingHeart(), i * 100)
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
    // Go to setup page with camera preview and beauty effects
    router.push(`/${language}/chat/video/setup`)
  }

  const checkCoBroadcastInvite = async () => {
    // Use ref for session to avoid stale closure
    const currentSession = sessionRef.current
    
    // Only check for logged-in users - guests can't co-broadcast
    if (!currentSession?.user?.id) return
    
    // Check the current stream for co-broadcast invitation
    const streamId = currentStreamIdRef.current
    if (!streamId) return
    
    try {
      const res = await fetch(`/api/video-streams/${streamId}/co-broadcast`)
      if (res.ok) {
        const coBroadcasters = await res.json()
        const myInvite = coBroadcasters.find((cb: any) => cb.userId === currentSession.user.id && cb.status === 'invited')
        if (myInvite && !coBroadcastInvite) {
          // Get stream info from current state
          const stream = streams.find(s => s.id === streamId)
          if (stream) {
            setCoBroadcastInvite({
              streamId: stream.id,
              broadcasterName: stream.user.name,
              broadcasterImage: stream.user.image
            })
          }
        }
      }
    } catch (e) {
      console.error('Error checking co-broadcast invite:', e)
    }
  }

  const handleAcceptCoBroadcast = async () => {
    if (!coBroadcastInvite) return
    setIsAcceptingInvite(true)
    try {
      const res = await fetch(`/api/video-streams/${coBroadcastInvite.streamId}/co-broadcast`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' })
      })
      if (res.ok) {
        // Navigate to broadcast page as co-broadcaster
        router.push(`/${language}/chat/video/broadcast/${coBroadcastInvite.streamId}?cohost=true`)
      }
    } catch (e) {}
    setIsAcceptingInvite(false)
    setCoBroadcastInvite(null)
  }

  const handleRejectCoBroadcast = async () => {
    if (!coBroadcastInvite) return
    try {
      await fetch(`/api/video-streams/${coBroadcastInvite.streamId}/co-broadcast`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      })
    } catch (e) {}
    setCoBroadcastInvite(null)
  }

  const formatCount = (n: number) => n >= 1000000 ? (n/1000000).toFixed(1) + 'M' : n >= 1000 ? (n/1000).toFixed(1) + 'K' : n.toString()

  // Separate gifters and regular viewers
  const gifters = viewers.filter(v => v.hasGifted).sort((a, b) => b.totalGiftAmount - a.totalGiftAmount)
  const regularViewers = viewers.filter(v => !v.hasGifted)
  
  // VS Battle Mode - Split screen when co-broadcaster is active
  const isVSMode = !!activeCoBroadcaster
  const formatBattleTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  if (loading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div 
      className="relative w-full h-full bg-black overflow-hidden" 
      onTouchStart={handleTouchStart} 
      onTouchEnd={handleTouchEnd}
      onClick={handleScreenTap}
    >
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
          {/* VS Battle Mode - Split Screen */}
          {isVSMode ? (
            <div className="absolute inset-0 flex flex-col">
              {/* VS Battle Progress Bar */}
              <div className="absolute top-14 left-0 right-0 z-30 px-2">
                <div className="flex items-center gap-1">
                  <span className="text-pink-400 font-bold text-sm w-14 text-right">{broadcasterScore}</span>
                  <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden flex">
                    <motion.div 
                      className="bg-gradient-to-r from-pink-500 to-pink-400 h-full"
                      initial={{ width: '50%' }}
                      animate={{ width: `${broadcasterScore + coBroadcasterScore > 0 ? (broadcasterScore / (broadcasterScore + coBroadcasterScore)) * 100 : 50}%` }}
                      transition={{ duration: 0.5 }}
                    />
                    <motion.div 
                      className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-full"
                      initial={{ width: '50%' }}
                      animate={{ width: `${broadcasterScore + coBroadcasterScore > 0 ? (coBroadcasterScore / (broadcasterScore + coBroadcasterScore)) * 100 : 50}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-cyan-400 font-bold text-sm w-14">{coBroadcasterScore}</span>
                </div>
              </div>

              {/* VS Timer and Icon */}
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Swords className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-bold text-sm">{formatBattleTime(battleTimer)}</span>
                </div>
              </div>

              {/* Split Screen Videos */}
              <div className="flex-1 flex">
                {/* Left Side - Broadcaster Video */}
                <div className="relative w-1/2 h-full border-r border-pink-500/50">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-cover bg-black"
                  />
                  {/* Broadcaster profile overlay at bottom */}
                  <div className="absolute bottom-20 left-2 right-2 z-20">
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-2 py-1.5 rounded-lg">
                      {currentStream?.user?.image ? (
                        <Image src={currentStream.user.image} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{currentStream?.user?.name?.[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{currentStream?.user?.name}</p>
                        <p className="text-pink-400 text-[10px]">{broadcasterScore} puan</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Co-Broadcaster Video */}
                <div className="relative w-1/2 h-full border-l border-cyan-500/50">
                  <video
                    ref={coBroadcasterVideoRef}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-cover bg-gray-900"
                  />
                  {/* Co-broadcaster profile overlay at bottom */}
                  <div className="absolute bottom-20 left-2 right-2 z-20">
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-2 py-1.5 rounded-lg">
                      {activeCoBroadcaster.user.image ? (
                        <Image src={activeCoBroadcaster.user.image} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{activeCoBroadcaster.user.name[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{activeCoBroadcaster.user.name}</p>
                        <p className="text-cyan-400 text-[10px]">{coBroadcasterScore} puan</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Viewer avatars row */}
              <div className="absolute bottom-36 left-2 right-2 z-20 flex items-center gap-1 overflow-x-auto">
                {viewers.slice(0, 8).map((viewer) => (
                  <div key={viewer.id} className="flex-shrink-0">
                    {viewer.image ? (
                      <Image src={viewer.image} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover border border-white/20" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center border border-white/20">
                        <span className="text-white text-[10px] font-bold">{viewer.name[0]}</span>
                      </div>
                    )}
                  </div>
                ))}
                {viewers.length > 8 && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center border border-white/20">
                    <span className="text-white text-[10px]">+{viewers.length - 8}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Normal Solo Broadcast View */
            <video ref={remoteVideoRef} autoPlay playsInline muted={isMuted} className="absolute inset-0 w-full h-full object-cover bg-black" />
          )}
          
          {/* Hidden co-broadcaster video for non-VS mode */}
          {!isVSMode && <video ref={coBroadcasterVideoRef} className="hidden" />}
          
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

          {/* Gradients (non-VS mode only) */}
          {!isVSMode && (
            <>
              <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
            </>
          )}

          {/* Guest countdown badge */}
          {!session?.user && guestCountdown > 0 && !showGuestModal && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {guestCountdown}
                </div>
                <span>{language === 'tr' ? 'Misafir izleme' : 'Guest preview'}</span>
              </motion.div>
            </div>
          )}

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
                <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full relative">
                  <div className="relative flex items-center justify-center" style={{ width: heartLevelText ? '28px' : '16px', height: heartLevelText ? '28px' : '16px' }}>
                    <Heart className={heartLevelText ? "w-7 h-7" : "w-4 h-4"} fill="#fe2c55" stroke="#fe2c55" />
                    {heartLevelText && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-[7px] font-bold drop-shadow-md">
                        {heartLevelText}
                      </span>
                    )}
                  </div>
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

          {/* Floating Hearts Animation - All over screen */}
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            <AnimatePresence>
              {floatingHearts.map(heart => (
                <motion.div 
                  key={heart.id} 
                  initial={{ opacity: 1, y: 0, scale: 0.5 }} 
                  animate={{ 
                    opacity: 0, 
                    y: -200, 
                    scale: 1.2,
                    x: Math.random() * 40 - 20
                  }} 
                  transition={{ duration: 2, ease: 'easeOut' }}
                  style={{ left: `${heart.x}%`, bottom: '30%' }}
                  className="absolute"
                >
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

        {/* Co-Broadcast Invitation Modal */}
        {coBroadcastInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm text-center border border-white/10"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse ${
                session?.user ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-orange-400 to-red-500'
              }`}>
                {session?.user ? <UserPlus className="w-10 h-10 text-white" /> : <LogIn className="w-10 h-10 text-white" />}
              </div>
              
              <h2 className="text-xl font-bold text-white mb-2">
                {language === 'tr' ? 'Ortak Yayın Daveti!' : 'Co-Broadcast Invite!'}
              </h2>
              
              <div className="flex items-center justify-center gap-3 mb-4">
                {coBroadcastInvite.broadcasterImage ? (
                  <Image src={coBroadcastInvite.broadcasterImage} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{coBroadcastInvite.broadcasterName[0]}</span>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-white font-semibold">{coBroadcastInvite.broadcasterName}</p>
                  <p className="text-white/60 text-sm">
                    {language === 'tr' ? 'seni ortak yayına davet ediyor' : 'invites you to co-stream'}
                  </p>
                </div>
              </div>
              
              {session?.user ? (
                <>
                  <p className="text-white/70 text-sm mb-6">
                    {language === 'tr' 
                      ? 'Kabul ederseniz kameranız açılacak ve yayına katılacaksınız.'
                      : 'If you accept, your camera will turn on and you will join the stream.'}
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleRejectCoBroadcast}
                      className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      {language === 'tr' ? 'Reddet' : 'Decline'}
                    </button>
                    <button
                      onClick={handleAcceptCoBroadcast}
                      disabled={isAcceptingInvite}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isAcceptingInvite ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Phone className="w-5 h-5" />
                          {language === 'tr' ? 'Kabul Et' : 'Accept'}
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-white/70 text-sm mb-6">
                    {language === 'tr' 
                      ? 'Ortak yayına katılmak için üye olmanız gerekiyor.'
                      : 'You need to sign up to join co-broadcast.'}
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCoBroadcastInvite(null)}
                      className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      {language === 'tr' ? 'Kapat' : 'Close'}
                    </button>
                    <button
                      onClick={() => router.push(`/${language}/login`)}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-5 h-5" />
                      {language === 'tr' ? 'Giriş Yap' : 'Sign In'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Guest Registration Modal - shows after 3 seconds for non-logged in users */}
        {showGuestModal && !session?.user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm text-center border border-white/10"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                <Video className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-xl font-bold text-white mb-2">
                {language === 'tr' ? 'İzlemeye Devam Et!' : 'Continue Watching!'}
              </h2>
              
              <p className="text-white/70 text-sm mb-4">
                {language === 'tr' 
                  ? 'Canlı yayınları izlemeye devam etmek, yorum yapmak ve hediye göndermek için üye ol!'
                  : 'Sign up to continue watching live streams, comment and send gifts!'}
              </p>
              
              <div className="bg-white/10 rounded-xl p-3 mb-6">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="text-center">
                    <Gift className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                    <span className="text-white/60">{language === 'tr' ? 'Hediye Gönder' : 'Send Gifts'}</span>
                  </div>
                  <div className="text-center">
                    <MessageCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <span className="text-white/60">{language === 'tr' ? 'Yorum Yap' : 'Comment'}</span>
                  </div>
                  <div className="text-center">
                    <Heart className="w-5 h-5 text-red-400 mx-auto mb-1" />
                    <span className="text-white/60">{language === 'tr' ? 'Beğen' : 'Like'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/${language}/register`)}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  {language === 'tr' ? 'Üye Ol' : 'Sign Up'}
                </button>
                <button
                  onClick={() => router.push(`/${language}/login`)}
                  className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold"
                >
                  {language === 'tr' ? 'Zaten üyeyim, giriş yap' : 'Already a member? Sign In'}
                </button>
                <button
                  onClick={() => router.push(`/${language}/chat`)}
                  className="text-white/50 text-sm hover:text-white/70"
                >
                  {language === 'tr' ? 'Daha sonra' : 'Later'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
