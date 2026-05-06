'use client'

import { useState, useEffect, useRef, TouchEvent, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import GiftNotificationBanner from '@/components/gift-notification-banner'
import CfcJetonInfoPopup from '@/components/cfc-jeton-info-popup'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  createAgoraClient,
  fetchAgoraToken,
  leaveChannel,
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
} from '@/lib/agora-client'
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
  Check,
  Swords,
  Grid
} from 'lucide-react'
import PKBattleOverlay from '@/components/pk-battle-overlay'
import PKBattleView from '@/components/pk-battle-view'
import StreamVideoGrid, { GridParticipant } from '@/components/stream-video-grid'
import StreamProfilePopup from '@/components/stream-profile-popup'
import StreamJoinToast, { useJoinToasts } from '@/components/stream-join-toast'

interface VideoStream {
  id: string
  title: string | null
  viewerCount: number
  likeCount: number
  backgroundUrl?: string | null
  user: { id: string; name: string; image: string | null }
}

interface Comment {
  id: string
  content: string
  user: { name: string; image?: string | null; role?: string; membership?: string }
}

interface GiftType {
  id: string
  name: string
  nameEn: string
  icon: string
  animation?: string
  price: number
}

interface CenterGift {
  id: string
  senderName: string
  senderImage?: string | null
  icon: string
  giftName: string
  animation?: string
  price?: number
}

interface FlyingCoin {
  id: number
  x: number
  y: number
  delay: number
  rotation: number
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
// Video streaming powered by Agora.io SDK

function VideoStreamPageInner() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetStreamId = searchParams?.get('stream') || null
  const { language } = useLanguage()
  
  const [streams, setStreams] = useState<VideoStream[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false) // Start unmuted - user navigated here via interaction
  const [showGifts, setShowGifts] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [viewerCount, setViewerCount] = useState(0)
  const [streamDuration, setStreamDuration] = useState(0)
  const streamDurationRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [showStartModal, setShowStartModal] = useState(false)
  const [streamTitle, setStreamTitle] = useState('')
  const [isStartingStream, setIsStartingStream] = useState(false)
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([])
  const [userJetons, setUserJetons] = useState(0)
  const [showCfcPopup, setShowCfcPopup] = useState(false)
  const [sendingGift, setSendingGift] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting')
  const [centerGift, setCenterGift] = useState<CenterGift | null>(null)
  const [flyingCoins, setFlyingCoins] = useState<FlyingCoin[]>([])
  const [showCoffeeAnim, setShowCoffeeAnim] = useState(false)
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [coBroadcastInvite, setCoBroadcastInvite] = useState<CoBroadcastInvite | null>(null)
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false)
  const [heartLevelText, setHeartLevelText] = useState('')
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [guestCountdown, setGuestCountdown] = useState(3)
  const [coBroadcastRequested, setCoBroadcastRequested] = useState(false)
  const [profilePopupUserId, setProfilePopupUserId] = useState<string | null>(null)
  const { events: joinEvents, addJoinEvent, addLeaveEvent } = useJoinToasts()
  const prevViewerIdsRef = useRef<Set<string>>(new Set())
  const [requestingCoBroadcast, setRequestingCoBroadcast] = useState(false)
  // Co-broadcast state - multiple active guests
  const [activeCoBroadcasters, setActiveCoBroadcasters] = useState<{
    id: string
    userId: string
    isMuted: boolean
    isVideoOff: boolean
    user: { id: string; name: string; image: string | null }
  }[]>([])
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
  // PK Battle state
  const [pkBattle, setPkBattle] = useState<{
    id: string; stream1Id: string; stream2Id: string; user1Id: string; user2Id: string;
    score1: number; score2: number; status: string; duration: number;
    startedAt: string | null; endedAt: string | null; winnerId: string | null;
    user1?: { id: string; name: string | null; image: string | null } | null;
    user2?: { id: string; name: string | null; image: string | null } | null;
  } | null>(null)
  // Multi-view state
  const [multiViewMode, setMultiViewMode] = useState(false)
  const [multiViewStreams, setMultiViewStreams] = useState<string[]>([])
  const [multiViewClients, setMultiViewClients] = useState<Map<string, IAgoraRTCClient>>(new Map())
  const multiViewRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  // Admin PK tap scoring - 3 PK points total per person per PK battle (one-time)
  const pkTapCountRef = useRef(0)
  const pkPointsGivenBattleIdRef = useRef<string | null>(null) // Track which battle already received points
  const lastTapRef = useRef(0)
  const guestTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastFortuneStatusRef = useRef<string | null>(null)
  
  const touchStartY = useRef(0)
  const remoteVideoRef = useRef<HTMLDivElement>(null)
  const coBroadcasterVideoRef = useRef<HTMLDivElement>(null)
  const remoteUsersRef = useRef<Map<string, IAgoraRTCRemoteUser>>(new Map())
  const guestVideoRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const heartIdRef = useRef(0)
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null)
  const viewerIdRef = useRef<string>('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentStreamIdRef = useRef<string>('')
  const isUnmountedRef = useRef(false)
  const hasJoinedRef = useRef(false)
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
    agoraClientRef.current = null
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
      // Reset fortune request state when switching streams
      lastFortuneStatusRef.current = null
      setHasPendingFortune(false)
      joinStream(currentStream.id)
      setLikeCount(currentStream.likeCount)
      setViewerCount(currentStream.viewerCount)
      
      // Start stream duration timer
      setStreamDuration(0)
      if (streamDurationRef.current) clearInterval(streamDurationRef.current)
      streamDurationRef.current = setInterval(() => setStreamDuration(prev => prev + 1), 1000)
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

  const cleanup = async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (streamDurationRef.current) {
      clearInterval(streamDurationRef.current)
      streamDurationRef.current = null
    }
    // Leave Agora channel
    if (agoraClientRef.current) {
      try {
        await agoraClientRef.current.leave()
      } catch (e) {}
      agoraClientRef.current = null
    }
    if (currentStreamIdRef.current) {
      fetch(`/api/video-streams/${currentStreamIdRef.current}/join?viewerId=${viewerIdRef.current}`, { method: 'DELETE' }).catch(() => {})
    }
  }

  const joinStream = async (streamId: string) => {
    if (hasJoinedRef.current) return
    hasJoinedRef.current = true
    
    try {
      // Register as viewer in our backend
      await fetch(`/api/video-streams/${streamId}/join`, { method: 'POST' })

      // Create Agora client as audience
      const client = await createAgoraClient('audience')
      agoraClientRef.current = client

      // Handle remote user events (broadcaster + co-broadcasters)
      client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
        if (isUnmountedRef.current) return
        await client.subscribe(user, mediaType)
        
        // Track remote user
        remoteUsersRef.current.set(String(user.uid), user)
        
        if (mediaType === 'video') {
          // Check if there's a guest video ref for this UID
          const guestEl = guestVideoRefs.current.get(String(user.uid))
          if (guestEl) {
            try { user.videoTrack?.play(guestEl) } catch {}
          } else {
            // Default: play in main remoteVideoRef (host video)
            const container = remoteVideoRef.current
            if (container) {
              user.videoTrack?.play(container)
            }
          }
          setConnectionStatus('connected')
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play()
        }
      })

      client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
        if (mediaType === 'video') {
          user.videoTrack?.stop()
        }
      })

      client.on('user-left', (user: IAgoraRTCRemoteUser) => {
        remoteUsersRef.current.delete(String(user.uid))
        // Check if any remote users remain (if none, broadcaster left)
        if (remoteUsersRef.current.size === 0) {
          setConnectionStatus('failed')
        }
      })

      // Join Agora channel as audience
      const channelName = `stream_${streamId}`
      const { token, uid, appId } = await fetchAgoraToken(channelName, 'audience')
      await client.join(appId, channelName, token, uid)
      
      console.log('🎬 Agora: Joined channel as audience, uid:', uid)

      // Start polling for other data (gifts, comments, stats, etc.)
      const pollFn = () => {
        if (!isUnmountedRef.current) {
          fetchStreamStats(streamId)
          pollGifts(streamId)
          fetchViewers(streamId)
          fetchComments(streamId)
          fetchCoBroadcasters(streamId)
          pollFortuneRequestStatus(streamId)
          fetchPKBattle(streamId)
        }
      }

      pollFn()
      pollIntervalRef.current = setInterval(pollFn, 1500)

    } catch (error) {
      console.error('Join stream error:', error)
      setConnectionStatus('failed')
    }
  }

  const retryConnection = () => {
    if (currentStream) {
      cleanup()
      currentStreamIdRef.current = ''
      hasJoinedRef.current = false
      setConnectionStatus('connecting')
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
        const newViewers: Viewer[] = await res.json()
        setViewers(newViewers)
        
        // Detect joins/leaves for toast notifications
        const newIds = new Set(newViewers.map((v: Viewer) => v.id))
        const prevIds = prevViewerIdsRef.current
        if (prevIds.size > 0) {
          // New joins
          newViewers.forEach((v: Viewer) => {
            if (!prevIds.has(v.id)) {
              addJoinEvent(v.name, v.image)
            }
          })
          // Leaves
          prevIds.forEach(id => {
            if (!newIds.has(id)) {
              const prev = viewers.find((v: Viewer) => v.id === id)
              if (prev) addLeaveEvent(prev.name, prev.image)
            }
          })
        }
        prevViewerIdsRef.current = newIds
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
      alert('Fal istemek için giriş yapmalısınız!')
      return
    }
    
    if (hasPendingFortune) {
      alert('Zaten bekleyen bir fal isteğiniz var!')
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
      alert(`Yetersiz jeton! ${selectedType.jetonCost} jeton gerekli, mevcut: ${userJetons}`)
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
        alert('Fal talebiniz gönderildi! ☕ Sıranız geldiğinde falcı size bakacak.')
      } else {
        const data = await res.json()
        alert(data.error || data.errorEn || ('Bir hata oluştu'))
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
          setRefundedTypeName(data.typeName)
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

  // Fetch PK battle for current stream
  const fetchPKBattle = async (streamId: string) => {
    try {
      const res = await fetch(`/api/video-streams/pk?streamId=${streamId}`)
      if (res.ok) {
        const data = await res.json()
        // Reset tap counter when PK battle changes
        if (data?.id !== pkBattle?.id) {
          pkTapCountRef.current = 0
          // Don't reset pkPointsGivenBattleIdRef - it tracks by battleId already
        }
        setPkBattle(data || null)
      }
    } catch {}
  }

  // Fetch co-broadcasters for multi-guest grid mode
  const fetchCoBroadcasters = async (streamId: string) => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/co-broadcast`)
      if (res.ok) {
        const data = await res.json()
        const activeList = data.filter((cb: any) => cb.status === 'active')
        
        // Check if user's request was approved (navigated to broadcast page)
        if (coBroadcastRequested) {
          const myEntry = data.find((cb: any) => cb.userId === sessionRef.current?.user?.id)
          if (myEntry?.status === 'active') {
            // Host approved my request - navigate to broadcast as co-host
            router.push(`/sohbet/video/broadcast/${streamId}?cohost=true`)
            return
          }
        }
        
        setActiveCoBroadcasters(activeList)
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
        
        triggerGiftAnimation(
          { 
            animation: newGift.giftType?.animation || '', 
            icon: newGift.giftType?.icon || '🎁', 
            name: newGift.giftType?.name || 'Hediye',
            price: newGift.giftType?.price || 0
          },
          newGift.sender?.name || 'Kullanıcı',
          newGift.sender?.image
        )
        
        for (let i = 0; i < 3; i++) {
          setTimeout(() => addFloatingHeart(), i * 150)
        }
      }
    } catch (e) {}
  }

  const targetStreamAppliedRef = useRef(false)
  const fetchStreams = async () => {
    try {
      const res = await fetch('/api/video-streams')
      if (res.ok) {
        const data = await res.json()
        setStreams(data)
        // Auto-select target stream from URL
        if (targetStreamId && !targetStreamAppliedRef.current && data.length > 0) {
          const idx = data.findIndex((s: VideoStream) => s.id === targetStreamId)
          if (idx >= 0) {
            setCurrentIndex(idx)
            targetStreamAppliedRef.current = true
          }
        }
      }
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
    
    // Admin PK tap scoring: 3 PK points total per person per PK battle (one-time)
    const userRole = (session?.user as any)?.role
    const isAdmin = userRole === 'admin' || userRole === 'yonetici'
    if (isAdmin && pkBattle?.status === 'active' && currentStream) {
      // Only give points if not already given for this battle
      if (pkPointsGivenBattleIdRef.current !== pkBattle.id) {
        pkTapCountRef.current += 1
        if (pkTapCountRef.current >= 3) {
          pkTapCountRef.current = 0
          pkPointsGivenBattleIdRef.current = pkBattle.id // Mark as given for this battle
          // Send 3 PK points via API (one-time per battle)
          fetch('/api/video-streams/pk/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ battleId: pkBattle.id, streamId: currentStream.id, points: 3 })
          }).catch(() => {})
        }
      }
    }
    
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
    if (!currentStream || !session?.user) return
    if (currentStream.user.id === session.user.id) return
    
    setRequestingCoBroadcast(true)
    try {
      const res = await fetch(`/api/video-streams/${currentStream.id}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request' })
      })
      
      if (res.ok) {
        setCoBroadcastRequested(true)
      } else {
        const data = await res.json()
        if (data.error === 'Already requested or co-broadcasting') {
          setCoBroadcastRequested(true)
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
    
    const shareUrl = `${window.location.origin}/sohbet/video`
    const shareText = `${currentStream.user.name} canlı yayında! Hemen katıl 🔴`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentStream.title || ('Canlı Yayın'),
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
        alert('Bağlantı kopyalandı!')
      } catch (e) {
        // Clipboard not available
      }
    }
  }

  // Hediye animasyonu tetikleyici
  const triggerGiftAnimation = (gift: { animation?: string; icon: string; name: string; price?: number }, senderName: string, senderImage?: string | null) => {
    const anim = gift.animation || ''
    
    if (anim === 'coffee_pour') {
      // Kahve animasyonu
      setShowCoffeeAnim(true)
      setTimeout(() => setShowCoffeeAnim(false), 5000)
    } else if (anim.startsWith('coin_spread') || anim === 'coin_single') {
      // Para animasyonu
      const coinCount = anim === 'coin_single' ? 1 : anim === 'coin_spread_5' ? 5 : 10
      const newCoins: FlyingCoin[] = Array.from({ length: coinCount }, (_, i) => ({
        id: Date.now() + i,
        x: 30 + Math.random() * 40,
        y: 20 + Math.random() * 30,
        delay: i * 0.12,
        rotation: Math.random() * 360,
      }))
      setFlyingCoins(newCoins)
      setTimeout(() => setFlyingCoins([]), 3500)
    } else if (anim === 'heart_rain') {
      // Kalp yağmuru - flying hearts
      const heartCount = 8
      const newCoins: FlyingCoin[] = Array.from({ length: heartCount }, (_, i) => ({
        id: Date.now() + i,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 40,
        delay: i * 0.15,
        rotation: Math.random() * 60 - 30,
      }))
      setFlyingCoins(newCoins)
      setTimeout(() => setFlyingCoins([]), 4000)
    } else if (anim === 'star_burst') {
      // Yıldız patlaması
      const starCount = 12
      const newCoins: FlyingCoin[] = Array.from({ length: starCount }, (_, i) => ({
        id: Date.now() + i,
        x: 20 + Math.random() * 60,
        y: 15 + Math.random() * 40,
        delay: i * 0.08,
        rotation: Math.random() * 360,
      }))
      setFlyingCoins(newCoins)
      setTimeout(() => setFlyingCoins([]), 3500)
    } else if (anim === 'sparkle_burst') {
      // Genel parlama efekti - for rose, crown, diamond, crystal
      const sparkleCount = 6
      const newCoins: FlyingCoin[] = Array.from({ length: sparkleCount }, (_, i) => ({
        id: Date.now() + i,
        x: 25 + Math.random() * 50,
        y: 20 + Math.random() * 30,
        delay: i * 0.1,
        rotation: Math.random() * 360,
      }))
      setFlyingCoins(newCoins)
      setTimeout(() => setFlyingCoins([]), 3500)
    }
    
    setCenterGift({
      id: Date.now().toString(),
      senderName,
      senderImage,
      icon: gift.icon,
      giftName: gift.name,
      animation: anim,
      price: gift.price,
    })
    setTimeout(() => setCenterGift(null), 4000)
  }

  const handleSendGift = async (gift: GiftType) => {
    if (!currentStream || !session?.user || userJetons < gift.price) {
      if (userJetons < gift.price) alert('Yetersiz jeton!')
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
        
        triggerGiftAnimation(gift, session.user?.name || 'Sen', session.user?.image)
        
        // Add floating hearts
        for (let i = 0; i < 3; i++) {
          setTimeout(() => addFloatingHeart(), i * 150)
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
    if (!session?.user) { router.push(`/giris`); return }
    // Go to setup page with camera preview and beauty effects
    router.push(`/sohbet/video/setup`)
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
        router.push(`/sohbet/video/broadcast/${coBroadcastInvite.streamId}?cohost=true`)
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
  const formatDuration = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  // Separate gifters and regular viewers
  const gifters = viewers.filter(v => v.hasGifted).sort((a, b) => b.totalGiftAmount - a.totalGiftAmount)
  const regularViewers = viewers.filter(v => !v.hasGifted)
  
  // Multi-guest grid mode when co-broadcasters are active
  const hasActiveGuests = activeCoBroadcasters.length > 0
  
  // Build grid participants for StreamVideoGrid
  const gridParticipants: GridParticipant[] = hasActiveGuests ? [
    {
      id: 'host',
      userId: 'host',
      name: currentStream?.user?.name || 'Host',
      image: currentStream?.user?.image || null,
      isHost: true,
      isMuted: false,
      isVideoOff: false,
    },
    ...activeCoBroadcasters.map(g => ({
      id: g.id,
      userId: g.userId,
      name: g.user.name,
      image: g.user.image || null,
      isHost: false,
      isMuted: g.isMuted,
      isVideoOff: g.isVideoOff,
    })),
  ] : []

  if (loading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    )
  }

  // Get user badge + effect based on their membership/role
  const getUserBadge = (user: { name: string; role?: string; membership?: string }) => {
    if (user.role === 'admin') return { icon: '👑', color: 'text-red-400', bg: 'bg-red-500/20', effectClass: 'effect-glitch' }
    if (user.membership === 'diamond') return { icon: '💎', color: 'text-cyan-400', bg: 'bg-cyan-500/20', effectClass: 'effect-neon-glow' }
    if (user.membership === 'gold') return { icon: '⭐', color: 'text-yellow-400', bg: 'bg-yellow-500/20', effectClass: 'effect-neon-flicker' }
    if (user.membership === 'premium') return { icon: '✨', color: 'text-purple-400', bg: 'bg-purple-500/20', effectClass: 'effect-blink' }
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
          <h2 className="text-white text-xl font-bold mb-2 text-center">{'Henüz canlı yayın yok'}</h2>
          <p className="text-white/60 text-center text-sm mb-8">{'Sohbet sayfasından yayınları takip edebilirsin'}</p>
          <button onClick={() => router.push(`/`)} className="bg-white/10 text-white font-semibold px-8 py-3 rounded flex items-center gap-2">
            <X className="w-5 h-5" /> {'Çıkış'}
          </button>
        </div>
      ) : multiViewMode && streams.length > 1 ? (
        /* ============== MULTI-VIEW GRID MODE ============== */
        <div className="absolute inset-0 bg-black pt-2 pb-2 px-1">
          <div className="h-full grid grid-cols-2 gap-1 auto-rows-fr" style={{ gridTemplateRows: `repeat(${Math.ceil(Math.min(streams.length, 4) / 2)}, 1fr)` }}>
            {streams.slice(0, 4).map((stream, idx) => (
              <button
                key={stream.id}
                onClick={() => {
                  setCurrentIndex(idx)
                  setMultiViewMode(false)
                }}
                className="relative bg-gray-900 rounded-lg overflow-hidden"
              >
                {/* Stream Thumbnail / Placeholder */}
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                  {stream.user.image ? (
                    <Image src={stream.user.image} alt={stream.user.name || ''} fill className="object-cover opacity-40" />
                  ) : null}
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-white/30 overflow-hidden">
                      {stream.user.image ? (
                        <Image src={stream.user.image} alt="" width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-lg">{(stream.user.name || '?')[0]}</span>
                      )}
                    </div>
                    <p className="text-white text-xs font-medium truncate max-w-[100px]">{stream.user.name || 'Yayıncı'}</p>
                  </div>
                </div>
                
                {/* Live badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-500/90 px-2 py-0.5 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-white text-[10px] font-bold">CANLI</span>
                </div>
                
                {/* Stats */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full">
                    <Users className="w-3 h-3 text-white" />
                    <span className="text-white text-[10px]">{stream.viewerCount}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full">
                    <Heart className="w-3 h-3 text-pink-400" fill="#ec4899" />
                    <span className="text-white text-[10px]">{stream.likeCount}</span>
                  </div>
                </div>

                {/* Title */}
                {stream.title && (
                  <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded-full">
                    <span className="text-white text-[10px] truncate max-w-[80px] block">{stream.title}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {/* Close multi-view button */}
          <div className="absolute top-3 right-3 z-30">
            <button 
              onClick={() => setMultiViewMode(false)}
              className="bg-black/60 backdrop-blur-md rounded-full p-2 border border-white/20"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* Start Stream button */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
            <button
              onClick={handleStartStream}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-pink-500/30"
            >
              <Plus className="w-5 h-5" />
              Yayın Başlat
            </button>
          </div>

          {streams.length > 4 && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30">
              <p className="text-white/50 text-xs">+{streams.length - 4} daha fazla yayın</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* PK Battle Mode - Side by side videos */}
          {pkBattle && (pkBattle.status === 'active' || pkBattle.status === 'completed') && currentStream ? (
            <PKBattleView
              battle={pkBattle}
              currentStreamId={currentStream.id}
              onMyVideoRef={(el) => {
                if (!el) return
                const prev = remoteVideoRef.current
                if (prev !== el) {
                  (remoteVideoRef as any).current = el
                  const remoteUsers = Array.from(remoteUsersRef.current.values())
                  if (remoteUsers.length > 0 && remoteUsers[0].videoTrack) {
                    try { remoteUsers[0].videoTrack.play(el) } catch {}
                  }
                }
              }}
            />
          ) : hasActiveGuests ? (
            <>
              {/* TikTok-style grid with Talep slots */}
              <div className="absolute inset-0 pt-14 pb-28 px-1">
                <StreamVideoGrid
                  participants={gridParticipants}
                  maxSlots={9}
                  videoRefs={new Map()}
                  onSetVideoRef={(userId, el) => {
                    if (!el) return
                    if (userId === 'host') {
                      const hostContainer = remoteVideoRef.current
                      if (hostContainer !== el) {
                        (remoteVideoRef as any).current = el
                        const remoteUsers = Array.from(remoteUsersRef.current.values())
                        if (remoteUsers.length > 0 && remoteUsers[0].videoTrack) {
                          try { remoteUsers[0].videoTrack.play(el) } catch {}
                        }
                      }
                    } else {
                      guestVideoRefs.current.set(userId, el)
                      const remoteUsers = Array.from(remoteUsersRef.current.values())
                      const guestIndex = activeCoBroadcasters.findIndex(g => g.userId === userId)
                      const remoteUser = guestIndex >= 0 ? remoteUsers[guestIndex + 1] : undefined
                      if (remoteUser?.videoTrack) {
                        try { remoteUser.videoTrack.play(el) } catch {}
                      }
                    }
                  }}
                  onRequestJoin={() => {
                    if (!coBroadcastRequested && !requestingCoBroadcast && session?.user) {
                      handleRequestCoBroadcast()
                    }
                  }}
                  onParticipantClick={(p) => setProfilePopupUserId(p.userId === 'host' ? (currentStream?.user?.id || null) : p.userId)}
                  isHost={false}
                  hasRequested={coBroadcastRequested}
                />
              </div>

              {/* Gradients for grid mode */}
              <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-[5]" />
              <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-[5]" />
            </>
          ) : (
            /* Normal Solo Broadcast View - TikTok 9:16 style */
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              {/* Background image from broadcaster */}
              {currentStream?.backgroundUrl && (
                <div className="absolute inset-0 z-0">
                  <img src={currentStream.backgroundUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
              )}
              <div 
                ref={remoteVideoRef} 
                className={`w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-contain ${currentStream?.backgroundUrl ? 'z-[1]' : 'bg-black'}`}
                style={{ aspectRatio: '9/16' }}
              />
            </div>
          )}
          
          {/* Hidden co-broadcaster container for non-VS mode */}
          {!hasActiveGuests && <div ref={coBroadcasterVideoRef} className="hidden" />}
          
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
                  {connectionStatus === 'connecting' ? ('Bağlanıyor...') : ('Bağlantı başarısız')}
                </p>
                {connectionStatus === 'connecting' && <Loader2 className="w-6 h-6 text-white animate-spin mx-auto mt-4" />}
                {connectionStatus === 'failed' && (
                  <button onClick={retryConnection} className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto">
                    <RefreshCw className="w-4 h-4" />
                    {'Tekrar Dene'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Gradients (non-VS mode only) */}
          {!hasActiveGuests && (
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
                <span>{'Misafir izleme'}</span>
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
                <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="text-center">
                  {/* Gift icon - image or emoji */}
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: 3, duration: 0.4 }}
                    className="mb-4 drop-shadow-2xl flex justify-center"
                  >
                    {centerGift.icon.startsWith('/') ? (
                      <Image src={centerGift.icon} alt={centerGift.giftName} width={120} height={120} className="w-28 h-28 object-contain drop-shadow-[0_0_20px_rgba(139,0,0,0.6)]" />
                    ) : (
                      <span className="text-8xl">{centerGift.icon}</span>
                    )}
                  </motion.div>
                  <div className="flex items-center justify-center gap-3 bg-gradient-to-r from-purple-900/90 to-pink-900/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-pink-500/30">
                    {centerGift.senderImage ? (
                      <Image src={centerGift.senderImage} alt="" width={44} height={44} className="w-11 h-11 rounded-full object-cover border-2 border-pink-400" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-pink-400">
                        <span className="text-white font-bold text-lg">{centerGift.senderName?.[0] || '?'}</span>
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-white font-bold text-lg">{centerGift.senderName}</p>
                      <p className="text-pink-300 text-sm">{centerGift.giftName} gönderdi ✨</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flying Coins Animation */}
          <AnimatePresence>
            {flyingCoins.map(coin => (
              <motion.div
                key={coin.id}
                initial={{ opacity: 0, y: '110%', x: `${coin.x}%`, scale: 0.3, rotate: 0 }}
                animate={{ 
                  opacity: [0, 1, 1, 0.8, 0],
                  y: [`110%`, `${coin.y}%`, `${coin.y - 15}%`, `${coin.y + 5}%`],
                  x: [`${coin.x}%`, `${coin.x + (Math.random() - 0.5) * 30}%`],
                  scale: [0.3, 1.1, 0.9, 0.7],
                  rotate: [0, coin.rotation, coin.rotation + 180, coin.rotation + 360],
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 2.5, delay: coin.delay, ease: 'easeOut' }}
                className="absolute z-40 pointer-events-none"
                style={{ left: 0, top: 0 }}
              >
                <div className="relative">
                  <Image src="/gifts/cfc-coin.webp" alt="CFC" width={60} height={60} className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(139,0,0,0.8)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[8px] font-black text-yellow-300 drop-shadow-md" style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>CFC</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Coffee Pour Animation */}
          <AnimatePresence>
            {showCoffeeAnim && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
              >
                <div className="relative">
                  {/* Cezve pouring */}
                  <motion.div
                    initial={{ rotate: 0, y: -80 }}
                    animate={{ rotate: [0, -25, -25, 0], y: [-80, -40, -40, -80] }}
                    transition={{ duration: 3, times: [0, 0.3, 0.7, 1] }}
                  >
                    <Image src="/gifts/kahve.webp" alt="Kahve" width={180} height={180} className="w-44 h-44 object-contain drop-shadow-[0_0_30px_rgba(139,69,19,0.7)]" />
                  </motion.div>
                  {/* Steam particles */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
                      animate={{ 
                        opacity: [0, 0.7, 0.4, 0], 
                        y: [-20, -60 - i * 15], 
                        x: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 60],
                        scale: [0.5, 1.2, 0.8]
                      }}
                      transition={{ duration: 2.5, delay: 0.8 + i * 0.2, repeat: 1 }}
                      className="absolute top-10 left-1/2 -translate-x-1/2 text-2xl"
                    >
                      ☕
                    </motion.div>
                  ))}
                  {/* Glow effect */}
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: 2 }}
                    className="absolute inset-0 bg-gradient-radial from-amber-500/20 to-transparent rounded-full blur-xl"
                  />
                </div>
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
                  {/* Avatar with gold ring - clickable for profile */}
                  <div className="relative cursor-pointer" onClick={() => currentStream?.user?.id && setProfilePopupUserId(currentStream.user.id)}>
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
                      <div className="flex items-center gap-0.5 bg-[#fe2c55] px-1.5 py-0.5 rounded">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-[10px] font-bold">LIVE</span>
                      </div>
                      <span className="text-white/50 text-[10px]">{formatDuration(streamDuration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-yellow-400 text-xs">
                        <span>⭐</span>
                        <span>{formatCount(broadcasterFollowers)} {'Takipçi'}</span>
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
                          {isFollowing ? ('Takipte') : ('Takip Et')}
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
                onClick={(e) => { e.stopPropagation(); router.push(`/jeton`); }}
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
          <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 sm:gap-3" data-no-tap>
            {/* Join Stream Button - Yayına Katıl */}
            {session?.user && currentStream && currentStream.user.id !== session.user.id && (
              <div className="flex flex-col items-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { 
                    e.stopPropagation()
                    if (!coBroadcastRequested && !requestingCoBroadcast) {
                      handleRequestCoBroadcast()
                    }
                  }}
                  disabled={coBroadcastRequested || requestingCoBroadcast}
                  className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg relative ${
                    coBroadcastRequested 
                      ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-green-500/30' 
                      : requestingCoBroadcast
                        ? 'bg-gradient-to-br from-gray-500 to-gray-600'
                        : 'bg-gradient-to-br from-pink-500 to-rose-600 shadow-pink-500/30'
                  }`}
                >
                  {requestingCoBroadcast ? (
                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-spin" />
                  ) : coBroadcastRequested ? (
                    <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  ) : (
                    <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  )}
                  {coBroadcastRequested && (
                    <motion.div 
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-black"
                    />
                  )}
                </motion.button>
                <span className="text-white text-[10px] font-medium mt-1 max-w-16 text-center leading-tight">
                  {coBroadcastRequested ? 'Bekleniyor' : requestingCoBroadcast ? '...' : 'Katıl'}
                </span>
              </div>
            )}

            {/* Viewers Button with count */}
            <div className="flex flex-col items-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); setShowViewersList(!showViewersList); }}
                className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30"
              >
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </motion.button>
              <span className="text-white text-xs font-bold mt-1">{formatCount(viewerCount)}</span>
            </div>
            
            {/* Gift Button */}
            <div className="flex flex-col items-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); setShowGifts(true); }}
                className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
              >
                <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </motion.button>
              <span className="text-white text-xs font-medium mt-1">{'Hediye'}</span>
            </div>
            
            {/* Fortune Request Button - Coffee Cup Icon */}
            {session?.user && (
              <div className="flex flex-col items-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleFortuneRequest(); }}
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center shadow-lg shadow-amber-700/30"
                >
                  <span className="text-xl sm:text-2xl">☕</span>
                </motion.button>
                <span className="text-white text-[10px] sm:text-xs font-medium mt-1">{'Fal İste'}</span>
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
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30"
                >
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </motion.button>
                <span className="text-white text-xs font-medium mt-1 max-w-14 truncate">{viewerSettings.nickname || ('Rumuz')}</span>
              </div>
            )}
            
            {/* Multi-View Toggle */}
            {streams.length > 1 && (
              <div className="flex flex-col items-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { 
                    e.stopPropagation()
                    setMultiViewMode(!multiViewMode)
                  }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg ${
                    multiViewMode ? 'bg-gradient-to-br from-pink-500 to-fuchsia-600 shadow-pink-500/30' : 'bg-white/20'
                  }`}
                >
                  <Grid className="w-5 h-5 text-white" />
                </motion.button>
                <span className="text-white text-[10px] mt-0.5">Çoklu</span>
              </div>
            )}

            {/* Sound Toggle - Red if muted, Green if unmuted */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { 
                e.stopPropagation(); 
                const newMuted = !isMuted;
                setIsMuted(newMuted);
                // Mute/unmute all remote audio tracks in Agora
                if (agoraClientRef.current) {
                  agoraClientRef.current.remoteUsers.forEach(user => {
                    if (user.audioTrack) {
                      user.audioTrack.setVolume(newMuted ? 0 : 100);
                    }
                  });
                }
              }}
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
              <span className="text-white text-xs font-medium">{'Çık'}</span>
            </motion.button>
          </div>

          {/* ============== CHAT MESSAGES - TikTok style (newest at bottom) ============== */}
          <div className="absolute left-3 bottom-28 right-20 max-h-44 overflow-hidden z-10 flex flex-col-reverse">
            <div className="space-y-1.5">
              {comments.slice(0, 6).reverse().map(c => {
                const badge = getUserBadge(c.user)
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
                        <span className={`text-xs font-bold ${badge ? `${badge.color} ${badge.effectClass}` : 'text-white/80'}`}
                          {...(badge?.effectClass === 'effect-glitch' ? { 'data-text': `${c.user.name}: ` } : {})}
                        >{c.user.name}: </span>
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

          {/* Coffee gift - bottom right mini banner */}
          <AnimatePresence>
            {centerGift && centerGift.animation === 'coffee_pour' && (
              <motion.div
                initial={{ scale: 0, opacity: 0, x: 50 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                exit={{ scale: 0, opacity: 0, x: 50 }}
                className="absolute bottom-24 right-4 z-35 pointer-events-none"
              >
                <div className="bg-gradient-to-br from-amber-900/90 to-orange-900/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-4xl">☕</span>
                    <div>
                      <div className="text-amber-300 text-sm font-bold">☕ KAHVE İKRAMI</div>
                      <div className="text-white text-xs">{centerGift.senderName}</div>
                      <div className="text-amber-400 text-[10px]">1000 Jeton 🔥</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PK Battle Score Overlay (only for non-PK-view modes, e.g. when grid is active during PK) */}
          {pkBattle && (pkBattle.status === 'active' || pkBattle.status === 'completed') && currentStream && hasActiveGuests && (
            <PKBattleOverlay
              battle={pkBattle}
              currentStreamId={currentStream.id}
            />
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
          <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3 flex items-center gap-1.5 sm:gap-2 z-20" onClick={(e) => e.stopPropagation()}>
            {/* Message Input with Send Button */}
            <div className="flex-1 flex items-center bg-white/10 backdrop-blur-md rounded-full overflow-hidden border border-white/20 min-w-0">
              <input
                ref={commentInputRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                onClick={(e) => e.stopPropagation()}
                placeholder={'Mesaj yaz...'}
                className="flex-1 bg-transparent text-white text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 placeholder:text-white/50 focus:outline-none min-w-0"
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleSendComment(); }}
                disabled={!newComment.trim() || !session?.user}
                className="mr-1 sm:mr-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs sm:text-sm font-semibold rounded-full flex items-center gap-1 sm:gap-1.5 disabled:opacity-40 disabled:from-gray-500 disabled:to-gray-600 hover:from-pink-400 hover:to-purple-400 transition-all flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{'Gönder'}</span>
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
                  <span className="text-white font-bold">{'Hediye Gönder'}</span>
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
                    className={`flex flex-col items-center p-3 rounded-xl transition-all ${userJetons >= gift.price ? 'bg-white/10 hover:bg-white/20 hover:scale-105' : 'bg-white/5 opacity-50'} ${sendingGift === gift.id ? 'animate-pulse' : ''}`}>
                    {gift.icon.startsWith('/') ? (
                      <div className="relative w-12 h-12 mb-1">
                        <Image src={gift.icon} alt={gift.name} width={48} height={48} className="w-12 h-12 object-contain" />
                        {/* CFC label overlay for coin gifts */}
                        {gift.animation?.startsWith('coin') && (
                          <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-600 to-yellow-500 rounded-full px-1.5 py-0.5 border border-yellow-300/50">
                            <span className="text-[8px] font-black text-white">{gift.price === 1 ? '1' : gift.price} CFC</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-3xl mb-1">{gift.icon}</span>
                    )}
                    <span className="text-white text-xs font-medium">{gift.name}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Coins className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-400 text-xs font-bold">{gift.price}</span>
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
                {'Ortak Yayın Daveti!'}
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
                    {'seni ortak yayına davet ediyor'}
                  </p>
                </div>
              </div>
              
              {session?.user ? (
                <>
                  <p className="text-white/70 text-sm mb-6">
                    {'Kabul ederseniz kameranız açılacak ve yayına katılacaksınız.'}
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleRejectCoBroadcast}
                      className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      {'Reddet'}
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
                          {'Kabul Et'}
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-white/70 text-sm mb-6">
                    {'Ortak yayına katılmak için üye olmanız gerekiyor.'}
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCoBroadcastInvite(null)}
                      className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      {'Kapat'}
                    </button>
                    <button
                      onClick={() => router.push(`/giris`)}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-5 h-5" />
                      {'Giriş Yap'}
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
                {'İzlemeye Devam Et!'}
              </h2>
              
              <p className="text-white/70 text-sm mb-4">
                {'Canlı yayınları izlemeye devam etmek, yorum yapmak ve hediye göndermek için üye ol!'}
              </p>
              
              <div className="bg-white/10 rounded-xl p-3 mb-6">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="text-center">
                    <Gift className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                    <span className="text-white/60">{'Hediye Gönder'}</span>
                  </div>
                  <div className="text-center">
                    <MessageCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <span className="text-white/60">{'Yorum Yap'}</span>
                  </div>
                  <div className="text-center">
                    <Heart className="w-5 h-5 text-red-400 mx-auto mb-1" />
                    <span className="text-white/60">{'Beğen'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/kayit-ol`)}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  {'Üye Ol'}
                </button>
                <button
                  onClick={() => router.push(`/giris`)}
                  className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold"
                >
                  {'Zaten üyeyim, giriş yap'}
                </button>
                <button
                  onClick={() => router.push(`/`)}
                  className="text-white/50 text-sm hover:text-white/70"
                >
                  {'Daha sonra'}
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
                {'Rumuz Seç'}
              </h2>
              
              <p className="text-white/70 text-sm mb-4">
                {'Yayında görünmek istediğin ismi gir. Boş bırakırsan gerçek ismin gösterilir.'}
              </p>
              
              <input
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                placeholder={session?.user?.name || ('Rumuz...')}
                maxLength={20}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center placeholder:text-white/40 focus:outline-none focus:border-purple-500 mb-6"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  {'İptal'}
                </button>
                <button
                  onClick={() => {
                    setViewerSettings(prev => ({ ...prev, nickname: tempNickname }));
                    setShowSettingsModal(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {'Kaydet'}
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
                    {'İzleyiciler'} ({viewerCount})
                  </h2>
                </div>
                <button onClick={() => setShowViewersList(false)}>
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {viewers.length === 0 ? (
                  <p className="text-white/50 text-center py-8 text-sm">
                    {'Henüz izleyici yok'}
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
                    {'Fal İste'}
                  </h2>
                </div>
                <button onClick={() => setShowFortunePopup(false)}>
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
              
              {/* Jeton Balance */}
              <div className="bg-amber-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
                <span className="text-amber-200 text-sm">
                  {'Mevcut Jeton'}
                </span>
                <span className="text-amber-400 font-bold">{userJetons} <Coins className="w-4 h-4 inline" /></span>
              </div>
              
              {/* Fortune Types */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {fortuneTypes.length === 0 ? (
                  <p className="text-white/50 text-center py-8 text-sm">
                    {'Fal türleri yükleniyor...'}
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
                        <p className="text-white font-medium">{type.name}</p>
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
                    {'Sorunuzu yazın (opsiyonel)'}
                  </label>
                  <textarea
                    value={fortuneQuestion}
                    onChange={(e) => setFortuneQuestion(e.target.value)}
                    placeholder={'Sorunuzu buraya yazın...'}
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
                    {'Fal İste'}
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
                {'Falınıza bakılmazsa jetonunuz iade edilir.'}
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
                {'Falınıza Bakılamadı'}
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
                  {'İade Edilen Jeton'}
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
                {'Jetonlarınız hesabınıza iade edildi.'}
              </p>
              
              {/* Close Button */}
              <button
                onClick={() => setShowRefundPopup(false)}
                className="w-full py-3 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                {'Tamam'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join/Leave Toast Notifications */}
      <StreamJoinToast events={joinEvents} />

      {/* Profile Popup */}
      {profilePopupUserId && (
        <StreamProfilePopup
          userId={profilePopupUserId}
          onClose={() => setProfilePopupUserId(null)}
          onSendGift={(userId) => {
            setProfilePopupUserId(null)
            setShowGifts(true)
          }}
        />
      )}

    </div>
  )
}

export default function VideoStreamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <VideoStreamPageInner />
    </Suspense>
  )
}