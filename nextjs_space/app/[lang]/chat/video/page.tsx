'use client'

import { useState, useEffect, useRef, TouchEvent } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import GiftNotificationBanner from '@/components/gift-notification-banner'
import CfcJetonInfoPopup from '@/components/cfc-jeton-info-popup'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { getRTCConfiguration } from '@/lib/webrtc-config'
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
  EyeOff,
  Eye,
  User,
  Settings,
  Check
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

interface ViewerSettings {
  isHidden: boolean
  nickname: string
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
// ICE sunucuları merkezi yapılandırmadan alınıyor (webrtc-config.ts)

export default function VideoStreamPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  
  const [streams, setStreams] = useState<VideoStream[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(true) // Start muted for browser autoplay policy
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
  const [userJetons, setUserJetons] = useState(0)
  const [showCfcPopup, setShowCfcPopup] = useState(false)
  const [sendingGift, setSendingGift] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting')
  const [centerGift, setCenterGift] = useState<CenterGift | null>(null)
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [coBroadcastInvite, setCoBroadcastInvite] = useState<CoBroadcastInvite | null>(null)
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false)
  const [heartLevelText, setHeartLevelText] = useState('')
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [guestCountdown, setGuestCountdown] = useState(3)
  const [coBroadcastRequested, setCoBroadcastRequested] = useState(false)
  const [requestingCoBroadcast, setRequestingCoBroadcast] = useState(false)
  // Co-broadcast state (no PK battle)
  const [activeCoBroadcaster, setActiveCoBroadcaster] = useState<{
    id: string
    userId: string
    user: { id: string; name: string; image: string | null }
  } | null>(null)
  // Viewer settings (hide/nickname)
  const [viewerSettings, setViewerSettings] = useState<ViewerSettings>({ isHidden: false, nickname: '' })
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [tempNickname, setTempNickname] = useState('')
  const [showViewersList, setShowViewersList] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [broadcasterFollowers, setBroadcasterFollowers] = useState(0)
  const [requestingFortune, setRequestingFortune] = useState(false)
  // Fortune request popup
  const [showFortunePopup, setShowFortunePopup] = useState(false)
  const [fortuneTypes, setFortuneTypes] = useState<{id: string; name: string; nameEn: string; icon: string; jetonCost: number; description?: string}[]>([])
  const [selectedFortuneType, setSelectedFortuneType] = useState<string | null>(null)
  const [fortuneQuestion, setFortuneQuestion] = useState('')
  const [hasPendingFortune, setHasPendingFortune] = useState(false)
  // Refund popup state
  const [showRefundPopup, setShowRefundPopup] = useState(false)
  const [refundedAmount, setRefundedAmount] = useState(0)
  const [refundedTypeName, setRefundedTypeName] = useState('')
  const [refundedTypeIcon, setRefundedTypeIcon] = useState('')
  const [jetonAnimationCoins, setJetonAnimationCoins] = useState<number[]>([])
  const lastTapRef = useRef(0)
  const guestTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastFortuneStatusRef = useRef<string | null>(null)
  
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

  // Fetch fortune request types
  const fetchFortuneTypes = async () => {
    try {
      const res = await fetch('/api/fortune-request-types')
      if (res.ok) setFortuneTypes(await res.json())
    } catch (e) {}
  }

  // Reset connection state when component mounts (user re-enters)
  useEffect(() => {
    // Reset all connection refs on mount to ensure fresh connection
    currentStreamIdRef.current = ''
    hasJoinedRef.current = false
    pcRef.current = null
    pendingCandidatesRef.current = []
    setConnectionStatus('connecting')
  }, [])

  useEffect(() => {
    isUnmountedRef.current = false
    fetchStreams()
    fetchGiftTypes()
    fetchFortuneTypes()
    
    if (session?.user) {
      fetchCredits()
    }
    
    // Poll for co-broadcast invitations (for both guests and logged-in users)
    const inviteInterval = setInterval(checkCoBroadcastInvite, 10000)
    const streamInterval = setInterval(fetchStreams, 15000)
    
    // Handle visibility change to fix audio/video when navigating away and back
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentStreamIdRef.current) {
        // Page became visible - check if connection is still good
        if (pcRef.current) {
          const state = pcRef.current.connectionState
          if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            // Reconnect
            retryConnection()
          } else {
            // Try to play video again (might have been paused)
            if (remoteVideoRef.current) {
              remoteVideoRef.current.play().catch(() => {})
            }
          }
        } else if (currentStreamIdRef.current) {
          // No connection - reconnect
          retryConnection()
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      isUnmountedRef.current = true
      clearInterval(inviteInterval)
      clearInterval(streamInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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
      // Reset fortune request state when switching streams
      lastFortuneStatusRef.current = null
      setHasPendingFortune(false)
      joinStream(currentStream.id)
      setLikeCount(currentStream.likeCount)
      setViewerCount(currentStream.viewerCount)
      checkIfLiked(currentStream.id)
      fetchComments(currentStream.id)
      fetchBroadcasterInfo(currentStream.user.id)
      
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

      const pc = new RTCPeerConnection(getRTCConfiguration())
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
          pollFortuneRequestStatus(streamId)
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

  // Fetch broadcaster's follower info
  const fetchBroadcasterInfo = async (userId: string) => {
    try {
      const res = await fetch(`/api/user/${userId}/follow-status`)
      if (res.ok) {
        const data = await res.json()
        setBroadcasterFollowers(data.followersCount || 0)
        setIsFollowing(data.isFollowing || false)
      }
    } catch (e) {}
  }

  // Handle follow/unfollow broadcaster
  const handleFollowBroadcaster = async () => {
    if (!currentStream || !session?.user) return
    try {
      const res = await fetch(`/api/user/${currentStream.user.id}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST'
      })
      if (res.ok) {
        setIsFollowing(!isFollowing)
        setBroadcasterFollowers(prev => isFollowing ? prev - 1 : prev + 1)
      }
    } catch (e) {}
  }

  // Open fortune request popup
  const handleFortuneRequest = () => {
    if (!currentStream || !session?.user) {
      alert(language === 'tr' ? 'Fal istemek için giriş yapmalısınız!' : 'Please login to request fortune!')
      return
    }
    
    if (hasPendingFortune) {
      alert(language === 'tr' ? 'Zaten bekleyen bir fal isteğiniz var!' : 'You already have a pending fortune request!')
      return
    }
    
    setSelectedFortuneType(null)
    setFortuneQuestion('')
    setShowFortunePopup(true)
  }
  
  // Submit fortune request
  const submitFortuneRequest = async () => {
    if (!currentStream || !session?.user || !selectedFortuneType) return
    
    const selectedType = fortuneTypes.find(t => t.id === selectedFortuneType)
    if (!selectedType) return
    
    if (userJetons < selectedType.jetonCost) {
      alert(language === 'tr' 
        ? `Yetersiz jeton! ${selectedType.jetonCost} jeton gerekli, mevcut: ${userJetons}` 
        : `Insufficient jetons! ${selectedType.jetonCost} required, available: ${userJetons}`)
      return
    }
    
    setRequestingFortune(true)
    try {
      const res = await fetch(`/api/video-streams/${currentStream.id}/fortune-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeId: selectedFortuneType,
          nickname: viewerSettings.nickname || null,
          isHidden: viewerSettings.isHidden,
          question: fortuneQuestion || null
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        setUserJetons(data.newBalance)
        setHasPendingFortune(true)
        setShowFortunePopup(false)
        alert(language === 'tr' ? 'Fal talebiniz gönderildi! ☕ Sıranız geldiğinde falcı size bakacak.' : 'Fortune request sent! ☕ The fortune teller will attend to you when your turn comes.')
      } else {
        const data = await res.json()
        alert(data.error || data.errorEn || (language === 'tr' ? 'Bir hata oluştu' : 'An error occurred'))
      }
    } catch (e) {
      console.error('Error requesting fortune:', e)
    } finally {
      setRequestingFortune(false)
    }
  }

  // Poll fortune request status (to detect refunds)
  const pollFortuneRequestStatus = async (streamId: string) => {
    if (!session?.user) return
    
    try {
      const res = await fetch(`/api/video-streams/${streamId}/fortune-requests/my-status`)
      if (res.ok) {
        const data = await res.json()
        
        // Update hasPendingFortune based on API response
        if (data.hasPendingRequest) {
          setHasPendingFortune(true)
        }
        
        // Check if status changed to refunded
        if (data.status === 'refunded' && lastFortuneStatusRef.current !== 'refunded') {
          // Show refund popup
          setRefundedAmount(data.jetonAmount)
          setRefundedTypeName(language === 'tr' ? data.typeName : data.typeNameEn)
          setRefundedTypeIcon(data.typeIcon)
          setHasPendingFortune(false)
          setShowRefundPopup(true)
          
          // Start jeton animation
          const coinIds = Array.from({ length: 8 }, (_, i) => Date.now() + i)
          setJetonAnimationCoins(coinIds)
          
          // Refresh user balance immediately
          fetchCredits()
          
          // Clear animation after 2 seconds
          setTimeout(() => {
            setJetonAnimationCoins([])
          }, 2000)
        } else if (data.status === 'completed') {
          setHasPendingFortune(false)
        }
        
        lastFortuneStatusRef.current = data.status
        
        if (!data.hasPendingRequest && data.status !== 'refunded') {
          setHasPendingFortune(false)
        }
      }
    } catch (e) {}
  }

  // Fetch co-broadcasters for split screen mode
  const fetchCoBroadcasters = async (streamId: string) => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/co-broadcast`)
      if (res.ok) {
        const data = await res.json()
        const active = data.find((cb: any) => cb.status === 'active')
        
        if (active && !activeCoBroadcaster) {
          setActiveCoBroadcaster(active)
        } else if (!active && activeCoBroadcaster) {
          // Co-broadcaster left
          setActiveCoBroadcaster(null)
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
      if (res.ok) { const d = await res.json(); setUserJetons(d.jetonBalance ?? 0) }
    } catch (e) {}
  }

  const checkIfLiked = async (streamId: string) => {
    // No longer tracking individual user likes - just display floating hearts on tap
    // The likeCount is already fetched with the stream stats
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
    if (!currentStream) return
    for (let i = 0; i < 3; i++) {
      setTimeout(() => addFloatingHeart(), i * 100)
    }
    try {
      const res = await fetch(`/api/video-streams/${currentStream.id}/like`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
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
        body: JSON.stringify({ 
          content: newComment,
          nickname: viewerSettings.nickname || null,
          isHidden: viewerSettings.isHidden
        })
      })
      if (res.ok) {
        const comment = await res.json()
        setComments(prev => [comment, ...prev])
        setNewComment('')
      }
    } catch (e) {}
  }

  // Request co-broadcast with the streamer
  const handleRequestCoBroadcast = async () => {
    if (!currentStream || !session?.user) {
      alert(language === 'tr' ? 'Giriş yapmanız gerekiyor!' : 'You need to log in!')
      return
    }
    
    // Can't request co-broadcast with yourself
    if (currentStream.user.id === session.user.id) {
      return
    }
    
    setRequestingCoBroadcast(true)
    try {
      const res = await fetch(`/api/video-streams/${currentStream.id}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request' })
      })
      
      if (res.ok) {
        setCoBroadcastRequested(true)
        alert(language === 'tr' ? 'Ortak yayın talebiniz gönderildi!' : 'Your co-broadcast request has been sent!')
      } else {
        const data = await res.json()
        if (data.error === 'Already requested or co-broadcasting') {
          alert(language === 'tr' ? 'Zaten talep gönderilmiş!' : 'Request already sent!')
        }
      }
    } catch (e) {
      console.error('Error requesting co-broadcast:', e)
    } finally {
      setRequestingCoBroadcast(false)
    }
  }

  // Share stream
  const handleShareStream = async () => {
    if (!currentStream) return
    
    const shareUrl = `${window.location.origin}/chat/video`
    const shareText = language === 'tr' 
      ? `${currentStream.user.name} canlı yayında! Hemen katıl 🔴` 
      : `${currentStream.user.name} is live! Join now 🔴`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentStream.title || (language === 'tr' ? 'Canlı Yayın' : 'Live Stream'),
          text: shareText,
          url: shareUrl
        })
      } catch (e) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
        alert(language === 'tr' ? 'Bağlantı kopyalandı!' : 'Link copied!')
      } catch (e) {
        // Clipboard not available
      }
    }
  }

  const handleSendGift = async (gift: GiftType) => {
    if (!currentStream || !session?.user || userJetons < gift.price) {
      if (userJetons < gift.price) alert(language === 'tr' ? 'Yetersiz jeton!' : 'Insufficient credits!')
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
        setUserJetons(data.newBalance)
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
    if (!session?.user) { router.push(`/login`); return }
    // Go to setup page with camera preview and beauty effects
    router.push(`/chat/video/setup`)
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
        router.push(`/chat/video/broadcast/${coBroadcastInvite.streamId}?cohost=true`)
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
  
  // Split screen mode when co-broadcaster is active
  const isSplitMode = !!activeCoBroadcaster

  if (loading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    )
  }

  // Get user badge based on their membership/role
  const getUserBadge = (userName: string) => {
    // This is simplified - in real app you'd get user tier from comment data
    if (userName.toLowerCase().includes('vip')) return { icon: '💎', color: 'text-cyan-400', bg: 'bg-cyan-500/20' }
    if (userName.toLowerCase().includes('gold')) return { icon: '⭐', color: 'text-yellow-400', bg: 'bg-yellow-500/20' }
    if (userName.toLowerCase().includes('efsane')) return { icon: '✨', color: 'text-purple-400', bg: 'bg-purple-500/20' }
    return null
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
          <button onClick={() => router.push(`/`)} className="bg-white/10 text-white font-semibold px-8 py-3 rounded flex items-center gap-2">
            <X className="w-5 h-5" /> {language === 'tr' ? 'Çıkış' : 'Exit'}
          </button>
        </div>
      ) : (
        <>
          {/* TikTok-style 2x2 Grid Mode - Co-broadcast */}
          {isSplitMode ? (
            <div className="absolute inset-0 flex flex-col">
              {/* 2x2 Grid Videos */}
              <div className="flex-1 pt-14 pb-28 px-1">
                <div className="h-full grid grid-cols-2 gap-1">
                  {/* Broadcaster Video (top-left) */}
                  <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-square">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      muted={isMuted}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 right-1 z-10">
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                        {currentStream?.user?.image ? (
                          <Image src={currentStream.user.image} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white text-[8px] font-bold">{currentStream?.user?.name?.[0]}</span>
                          </div>
                        )}
                        <p className="text-white text-[10px] font-medium truncate">{currentStream?.user?.name}</p>
                        <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <span className="text-[8px]">👑</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Co-Broadcaster Video (top-right) */}
                  <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-square">
                    <video
                      ref={coBroadcasterVideoRef}
                      autoPlay
                      playsInline
                      muted={isMuted}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 right-1 z-10">
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                        {activeCoBroadcaster.user.image ? (
                          <Image src={activeCoBroadcaster.user.image} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white text-[8px] font-bold">{activeCoBroadcaster.user.name[0]}</span>
                          </div>
                        )}
                        <p className="text-white text-[10px] font-medium truncate">{activeCoBroadcaster.user.name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments floating above input - Grid Mode */}
              <div className="absolute left-3 bottom-24 right-20 max-h-32 overflow-hidden z-20 space-y-1">
                {comments.slice(0, 4).map(c => {
                  const badge = getUserBadge(c.user.name)
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-black/50 backdrop-blur-sm rounded-xl px-3 py-1.5 w-fit max-w-[85%]">
                      <div className="flex items-center gap-1.5">
                        {badge && <span className={`text-sm ${badge.color}`}>{badge.icon}</span>}
                        <span className={`text-xs font-bold ${badge ? badge.color : 'text-white/70'}`}>{c.user.name}:</span>
                        <span className="text-white text-xs">{c.content}</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Bottom input and actions - Grid Mode */}
              <div className="absolute bottom-4 left-3 right-3 flex items-center gap-2 z-20" onClick={(e) => e.stopPropagation()}>
                <div className="flex-1 flex items-center bg-white/10 backdrop-blur-sm rounded-full overflow-hidden border border-white/20">
                  <input
                    ref={commentInputRef}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={language === 'tr' ? 'Mesaj yaz...' : 'Write a message...'}
                    className="flex-1 bg-transparent text-white text-sm px-4 py-2.5 placeholder:text-white/50 focus:outline-none"
                  />
                  <div className="pr-3 text-white/50">▼</div>
                </div>
                
                <button
                  onClick={(e) => { e.stopPropagation(); /* handleRequestFortune */ }}
                  className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-bold rounded-full flex-shrink-0"
                >
                  {language === 'tr' ? 'Fal iste' : 'Fortune'}
                </button>
                
                <button
                  onClick={(e) => { e.stopPropagation(); setShowGifts(true); }}
                  className="px-3 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium rounded-full flex items-center gap-1.5 flex-shrink-0"
                >
                  <span className="text-base">🎁</span>
                  <span>{language === 'tr' ? 'Hediye' : 'Gift'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Normal Solo Broadcast View - TikTok 9:16 style */
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                muted={isMuted} 
                className="w-full h-full object-contain bg-black"
                style={{ aspectRatio: '9/16' }}
              />
            </div>
          )}
          
          {/* Hidden co-broadcaster video for non-VS mode */}
          {!isSplitMode && <video ref={coBroadcasterVideoRef} className="hidden" />}
          
          {/* Connection overlay */}
          {connectionStatus !== 'connected' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 overflow-hidden border-4 border-pink-400/50">
                  {currentStream?.user?.image ? (
                    <Image src={currentStream.user.image} alt="" width={96} height={96} className="w-full h-full object-cover" />
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
          {!isSplitMode && (
            <>
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 inset-x-0 h-56 bg-gradient-to-t from-black/95 to-transparent pointer-events-none" />
            </>
          )}

          {/* Guest countdown badge */}
          {!session?.user && guestCountdown > 0 && !showGuestModal && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30">
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
                    animate={{ scale: [1, 1.3, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: 3, duration: 0.4 }}
                    className="text-8xl mb-4 drop-shadow-2xl"
                  >
                    {centerGift.icon}
                  </motion.div>
                  <div className="flex items-center justify-center gap-3 bg-gradient-to-r from-purple-900/90 to-pink-900/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-pink-500/30">
                    {centerGift.senderImage ? (
                      <Image src={centerGift.senderImage} alt="" width={44} height={44} className="w-11 h-11 rounded-full object-cover border-2 border-pink-400" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-pink-400">
                        <span className="text-white font-bold text-lg">{centerGift.senderName[0]}</span>
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-white font-bold text-lg">{centerGift.senderName}</p>
                      <p className="text-pink-300 text-sm">{centerGift.giftName} {language === 'tr' ? 'gönderdi' : 'sent'} ✨</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============== NEW DESIGN: TOP SECTION ============== */}
          
          {/* Broadcaster Profile Card - Top Left - Fancy Design */}
          <div className="absolute top-3 left-3 z-20" data-no-tap>
            <div className="relative">
              {/* Decorative rose border */}
              <div className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-2xl border-2 border-pink-500/50 overflow-hidden">
                <div className="absolute top-0 left-0 text-pink-500 text-xs">🌹</div>
                <div className="absolute top-0 right-0 text-pink-500 text-xs">🌹</div>
                <div className="absolute bottom-0 left-1 text-pink-500 text-xs">🌹</div>
                <div className="absolute bottom-0 right-1 text-pink-500 text-xs">🌹</div>
              </div>
              
              <div className="relative bg-gradient-to-r from-black/80 to-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-pink-500/30">
                <div className="flex items-center gap-2.5">
                  {/* Avatar with gold ring */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-amber-400 p-0.5 bg-gradient-to-br from-amber-400 to-amber-600">
                      {currentStream?.user?.image ? (
                        <Image src={currentStream.user.image} alt="" width={48} height={48} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{currentStream?.user?.name?.[0]?.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    {/* Floating hearts around avatar */}
                    <motion.div 
                      animate={{ y: [-2, 2, -2], scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-1 -right-1 text-pink-500 text-sm"
                    >💗</motion.div>
                    <motion.div 
                      animate={{ y: [2, -2, 2], scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                      className="absolute -bottom-0 -left-1 text-pink-500 text-xs"
                    >💕</motion.div>
                  </div>
                  
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold text-sm">{currentStream?.user?.name}</span>
                      <span className="px-1.5 py-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-[10px] font-bold rounded">VIP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-yellow-400 text-xs">
                        <span>⭐</span>
                        <span>{formatCount(broadcasterFollowers)} {language === 'tr' ? 'Takipçi' : 'Followers'}</span>
                      </div>
                      {session?.user && currentStream?.user?.id !== session.user.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFollowBroadcaster(); }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            isFollowing 
                              ? 'bg-gray-600 text-white' 
                              : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                          }`}
                        >
                          {isFollowing ? (language === 'tr' ? 'Takipte' : 'Following') : (language === 'tr' ? 'Takip Et' : 'Follow')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* User Stats - Top Right */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2" data-no-tap>
            {/* Hearts received */}
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-pink-500/30">
              <Heart className="w-4 h-4 text-pink-500" fill="#ec4899" />
              <span className="text-pink-400 text-xs font-semibold">+{formatCount(likeCount)}</span>
            </div>
            
            {/* Jeton balance with add button */}
            <div className="flex items-center bg-black/60 backdrop-blur-md rounded-full border border-amber-500/30 overflow-hidden">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                <span className="text-lg">🪙</span>
                <span className="text-amber-400 text-xs font-bold">{formatCount(userJetons)}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); router.push(`/credits`); }}
                className="bg-gradient-to-r from-green-500 to-emerald-500 w-7 h-7 flex items-center justify-center"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
          
          {/* Gift Animation Banner - Below profile */}
          <div className="absolute top-[72px] left-2 right-2 z-25">
            <GiftNotificationBanner />
          </div>

          {/* ============== RIGHT SIDEBAR ACTIONS ============== */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-3" data-no-tap>
            {/* Viewers Button with count */}
            <div className="flex flex-col items-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); setShowViewersList(!showViewersList); }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30"
              >
                <Users className="w-6 h-6 text-white" />
              </motion.button>
              <span className="text-white text-xs font-bold mt-1">{formatCount(viewerCount)}</span>
            </div>
            
            {/* Gift Button */}
            <div className="flex flex-col items-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); setShowGifts(true); }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
              >
                <Gift className="w-6 h-6 text-white" />
              </motion.button>
              <span className="text-white text-xs font-medium mt-1">{language === 'tr' ? 'Hediye' : 'Gift'}</span>
            </div>
            
            {/* Fortune Request Button - Coffee Cup Icon */}
            {session?.user && (
              <div className="flex flex-col items-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleFortuneRequest(); }}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center shadow-lg shadow-amber-700/30"
                >
                  <span className="text-2xl">☕</span>
                </motion.button>
                <span className="text-white text-xs font-medium mt-1">{language === 'tr' ? 'Fal İste' : 'Fortune'}</span>
              </div>
            )}
            
            {/* Nickname/Settings Button */}
            {session?.user && (
              <div className="flex flex-col items-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setTempNickname(viewerSettings.nickname);
                    setShowSettingsModal(true);
                  }}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30"
                >
                  <User className="w-6 h-6 text-white" />
                </motion.button>
                <span className="text-white text-xs font-medium mt-1 max-w-14 truncate">{viewerSettings.nickname || (language === 'tr' ? 'Rumuz' : 'Nick')}</span>
              </div>
            )}
            
            {/* Sound Toggle - Red if muted, Green if unmuted */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
              className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg ${
                isMuted 
                  ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30' 
                  : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
            </motion.button>
            
            {/* Exit Button - "Yayından Çık" */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); router.push(`/`); }}
              className="px-3 py-2 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border border-white/20 shadow-lg"
            >
              <span className="text-white text-xs font-medium">{language === 'tr' ? 'Çık' : 'Exit'}</span>
            </motion.button>
          </div>

          {/* ============== CHAT MESSAGES - TikTok style (newest at bottom) ============== */}
          <div className="absolute left-3 bottom-28 right-20 max-h-44 overflow-hidden z-10 flex flex-col-reverse">
            <div className="space-y-1.5">
              {comments.slice(0, 6).reverse().map(c => {
                const badge = getUserBadge(c.user.name)
                return (
                  <motion.div 
                    key={c.id} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2 w-fit max-w-[90%]"
                  >
                    <div className="flex items-start gap-2">
                      {badge ? (
                        <span className={`text-base ${badge.color}`}>{badge.icon}</span>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[8px] font-bold">{c.user.name?.[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-bold ${badge ? badge.color : 'text-white/80'}`}>{c.user.name}: </span>
                        <span className="text-white text-xs">{c.content}</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* ============== BOTTOM ANIMATIONS ============== */}
          
          {/* Gold Coins Animation - Bottom Left */}
          <div className="absolute bottom-24 left-4 z-5 pointer-events-none">
            <motion.div
              animate={{ y: [0, -5, 0], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="relative"
            >
              <span className="text-5xl drop-shadow-lg">🪙</span>
              <motion.span 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                className="absolute -top-2 -right-2 text-3xl"
              >🪙</motion.span>
              <motion.span 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}
                className="absolute top-4 -left-3 text-2xl"
              >🪙</motion.span>
            </motion.div>
          </div>

          {/* Special Gift Animation - Bottom Right (Coffee example) */}
          {centerGift && (
            <div className="absolute bottom-24 right-16 z-15 pointer-events-none">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="bg-gradient-to-br from-amber-900/90 to-orange-900/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-amber-500/30"
              >
                <div className="flex items-center gap-2">
                  <span className="text-4xl">☕</span>
                  <div>
                    <div className="text-amber-300 text-sm font-bold">KAHVE</div>
                    <div className="text-white text-xs">{centerGift.senderName}</div>
                    <div className="text-amber-400 text-xs">{language === 'tr' ? 'Kahve ikramı!' : 'Coffee treat!'}</div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Floating Hearts Animation */}
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            <AnimatePresence>
              {floatingHearts.map(heart => (
                <motion.div 
                  key={heart.id} 
                  initial={{ opacity: 1, y: 0, scale: 0.5 }} 
                  animate={{ 
                    opacity: 0, 
                    y: -250, 
                    scale: 1.3,
                    x: Math.random() * 60 - 30
                  }} 
                  transition={{ duration: 2.5, ease: 'easeOut' }}
                  style={{ left: `${heart.x}%`, bottom: '25%' }}
                  className="absolute"
                >
                  <Heart className="w-9 h-9 drop-shadow-lg" fill={heart.color} stroke={heart.color} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* ============== BOTTOM INPUT BAR ============== */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 z-20" onClick={(e) => e.stopPropagation()}>
            {/* Message Input with Send Button */}
            <div className="flex-1 flex items-center bg-white/10 backdrop-blur-md rounded-full overflow-hidden border border-white/20">
              <input
                ref={commentInputRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                onClick={(e) => e.stopPropagation()}
                placeholder={language === 'tr' ? 'Mesaj yaz...' : 'Write a message...'}
                className="flex-1 bg-transparent text-white text-sm px-4 py-3 placeholder:text-white/50 focus:outline-none"
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleSendComment(); }}
                disabled={!newComment.trim() || !session?.user}
                className="mr-1.5 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold rounded-full flex items-center gap-1.5 disabled:opacity-40 disabled:from-gray-500 disabled:to-gray-600 hover:from-pink-400 hover:to-purple-400 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{language === 'tr' ? 'Gönder' : 'Send'}</span>
              </button>
            </div>
          </div>

          {/* Stream navigation indicators */}
          {streams.length > 1 && (
            <div className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
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
                      <span className="text-yellow-400 text-xs font-semibold">{userJetons} Jeton</span>
                  </div>
                  <button onClick={() => setShowCfcPopup(true)} className="text-white/50 hover:text-white text-xs underline">?</button>
                </div>
                <button onClick={() => setShowGifts(false)}><X className="w-6 h-6 text-white" /></button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {giftTypes.map(gift => (
                  <button key={gift.id} onClick={() => handleSendGift(gift)} disabled={sendingGift === gift.id || userJetons < gift.price}
                    className={`flex flex-col items-center p-3 rounded-xl ${userJetons >= gift.price ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50'}`}>
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
                      onClick={() => router.push(`/login`)}
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
                  onClick={() => router.push(`/register`)}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  {language === 'tr' ? 'Üye Ol' : 'Sign Up'}
                </button>
                <button
                  onClick={() => router.push(`/login`)}
                  className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold"
                >
                  {language === 'tr' ? 'Zaten üyeyim, giriş yap' : 'Already a member? Sign In'}
                </button>
                <button
                  onClick={() => router.push(`/`)}
                  className="text-white/50 text-sm hover:text-white/70"
                >
                  {language === 'tr' ? 'Daha sonra' : 'Later'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nickname Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-xl font-bold text-white mb-2">
                {language === 'tr' ? 'Rumuz Seç' : 'Choose Nickname'}
              </h2>
              
              <p className="text-white/70 text-sm mb-4">
                {language === 'tr' 
                  ? 'Yayında görünmek istediğin ismi gir. Boş bırakırsan gerçek ismin gösterilir.'
                  : 'Enter the name you want to appear as in the stream. Leave empty to show your real name.'}
              </p>
              
              <input
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                placeholder={session?.user?.name || (language === 'tr' ? 'Rumuz...' : 'Nickname...')}
                maxLength={20}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center placeholder:text-white/40 focus:outline-none focus:border-purple-500 mb-6"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    setViewerSettings(prev => ({ ...prev, nickname: tempNickname }));
                    setShowSettingsModal(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {language === 'tr' ? 'Kaydet' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewers List Modal */}
      <AnimatePresence>
        {showViewersList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowViewersList(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-xl rounded-3xl p-4 w-full max-w-sm border border-white/10 max-h-[70vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold text-white">
                    {language === 'tr' ? 'İzleyiciler' : 'Viewers'} ({viewerCount})
                  </h2>
                </div>
                <button onClick={() => setShowViewersList(false)}>
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {viewers.length === 0 ? (
                  <p className="text-white/50 text-center py-8 text-sm">
                    {language === 'tr' ? 'Henüz izleyici yok' : 'No viewers yet'}
                  </p>
                ) : (
                  viewers.map((viewer) => (
                    <div key={viewer.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                        {viewer.image ? (
                          <Image src={viewer.image} alt="" width={40} height={40} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-white font-bold">{viewer.name?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{viewer.name}</p>
                        {viewer.hasGifted && (
                          <div className="flex items-center gap-1 text-amber-400 text-xs">
                            <Gift className="w-3 h-3" />
                            <span>{viewer.totalGiftAmount} jeton</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fortune Request Popup */}
      <AnimatePresence>
        {showFortunePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowFortunePopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-amber-900/90 to-amber-950/90 backdrop-blur-xl rounded-3xl p-5 w-full max-w-sm border border-amber-500/20 max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">☕</span>
                  <h2 className="text-lg font-bold text-white">
                    {language === 'tr' ? 'Fal İste' : 'Request Fortune'}
                  </h2>
                </div>
                <button onClick={() => setShowFortunePopup(false)}>
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
              
              {/* Jeton Balance */}
              <div className="bg-amber-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
                <span className="text-amber-200 text-sm">
                  {language === 'tr' ? 'Mevcut Jeton' : 'Available Jetons'}
                </span>
                <span className="text-amber-400 font-bold">{userJetons} <Coins className="w-4 h-4 inline" /></span>
              </div>
              
              {/* Fortune Types */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {fortuneTypes.length === 0 ? (
                  <p className="text-white/50 text-center py-8 text-sm">
                    {language === 'tr' ? 'Fal türleri yükleniyor...' : 'Loading fortune types...'}
                  </p>
                ) : (
                  fortuneTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedFortuneType(type.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        selectedFortuneType === type.id
                          ? 'bg-amber-500/30 border-amber-500'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium">{language === 'tr' ? type.name : type.nameEn}</p>
                        {type.description && (
                          <p className="text-white/50 text-xs">{type.description}</p>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                        userJetons >= type.jetonCost 
                          ? 'bg-amber-500/30 text-amber-400' 
                          : 'bg-red-500/30 text-red-400'
                      }`}>
                        {type.jetonCost} <Coins className="w-3 h-3 inline" />
                      </div>
                    </button>
                  ))
                )}
              </div>
              
              {/* Question Input */}
              {selectedFortuneType && (
                <div className="mb-4">
                  <label className="text-white/70 text-sm mb-2 block">
                    {language === 'tr' ? 'Sorunuzu yazın (opsiyonel)' : 'Write your question (optional)'}
                  </label>
                  <textarea
                    value={fortuneQuestion}
                    onChange={(e) => setFortuneQuestion(e.target.value)}
                    placeholder={language === 'tr' ? 'Sorunuzu buraya yazın...' : 'Write your question here...'}
                    maxLength={500}
                    rows={3}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              )}
              
              {/* Submit Button */}
              <button
                onClick={submitFortuneRequest}
                disabled={!selectedFortuneType || requestingFortune || (!!selectedFortuneType && userJetons < (fortuneTypes.find(t => t.id === selectedFortuneType)?.jetonCost || 0))}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedFortuneType && userJetons >= (fortuneTypes.find(t => t.id === selectedFortuneType)?.jetonCost || 0)
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                {requestingFortune ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="text-lg">☕</span>
                    {language === 'tr' ? 'Fal İste' : 'Request Fortune'}
                    {selectedFortuneType && (
                      <span className="ml-1">
                        ({fortuneTypes.find(t => t.id === selectedFortuneType)?.jetonCost} jeton)
                      </span>
                    )}
                  </>
                )}
              </button>
              
              {/* Info text */}
              <p className="text-white/40 text-xs text-center mt-3">
                {language === 'tr' 
                  ? 'Falınıza bakılmazsa jetonunuz iade edilir.' 
                  : 'Your jetons will be refunded if your fortune is not read.'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CfcJetonInfoPopup isOpen={showCfcPopup} onClose={() => setShowCfcPopup(false)} />

      {/* Refund Popup with Jeton Animation */}
      <AnimatePresence>
        {showRefundPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowRefundPopup(false)}
          >
            {/* Jeton Animation - Falling coins */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {jetonAnimationCoins.map((coinId, index) => (
                <motion.div
                  key={coinId}
                  initial={{ 
                    y: -50, 
                    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 300), 
                    scale: 0,
                    rotate: 0
                  }}
                  animate={{ 
                    y: typeof window !== 'undefined' ? window.innerHeight + 100 : 800,
                    scale: [0, 1.5, 1],
                    rotate: 360 * 3
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 0.5,
                    delay: index * 0.1,
                    ease: 'easeIn'
                  }}
                  className="absolute text-4xl"
                >
                  🪙
                </motion.div>
              ))}
            </div>
            
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 50 }}
              transition={{ type: 'spring', damping: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-red-900/95 to-red-950/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm border border-red-500/30 text-center relative overflow-hidden"
            >
              {/* Sparkle effect background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                    style={{
                      left: `${20 + Math.random() * 60}%`,
                      top: `${20 + Math.random() * 60}%`
                    }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
              
              {/* Icon */}
              <motion.div 
                className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-4"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                <span className="text-4xl">{refundedTypeIcon || '☕'}</span>
              </motion.div>
              
              {/* Message */}
              <h2 className="text-xl font-bold text-white mb-2">
                {language === 'tr' ? 'Falınıza Bakılamadı' : 'Fortune Could Not Be Read'}
              </h2>
              
              <p className="text-white/70 text-sm mb-4">
                {refundedTypeName}
              </p>
              
              {/* Refund Amount with Animation */}
              <motion.div 
                className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl p-4 mb-4"
                animate={{ boxShadow: ['0 0 0 0 rgba(234,179,8,0)', '0 0 20px 5px rgba(234,179,8,0.3)', '0 0 0 0 rgba(234,179,8,0)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <p className="text-white/60 text-sm mb-1">
                  {language === 'tr' ? 'İade Edilen Jeton' : 'Refunded Jetons'}
                </p>
                <motion.div 
                  className="flex items-center justify-center gap-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10, delay: 0.3 }}
                >
                  <Coins className="w-8 h-8 text-yellow-400" />
                  <span className="text-4xl font-bold text-yellow-400">+{refundedAmount}</span>
                </motion.div>
              </motion.div>
              
              <p className="text-white/50 text-xs mb-4">
                {language === 'tr' 
                  ? 'Jetonlarınız hesabınıza iade edildi.' 
                  : 'Your jetons have been refunded to your account.'}
              </p>
              
              {/* Close Button */}
              <button
                onClick={() => setShowRefundPopup(false)}
                className="w-full py-3 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                {language === 'tr' ? 'Tamam' : 'OK'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
