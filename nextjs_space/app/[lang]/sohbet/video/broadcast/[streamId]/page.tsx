'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  createTRTCInstance,
  fetchTRTCCredentials,
  enterRoom,
  startLocalVideo,
  startLocalAudio,
  stopLocalVideo,
  stopLocalAudio,
  startRemoteVideo,
  exitRoom,
  destroyTRTC,
  getCameraList,
  updateLocalVideo,
  type TRTC,
} from '@/lib/trtc-client'

const GiftAnimationOverlay = dynamic(() => import('@/components/gift-animation-overlay'), { ssr: false })

// Beauty presets (TRTC does not have built-in beauty; keep UI structure)
interface BeautySettings {
  enabled: boolean
  smoothnessLevel: number
  lighteningLevel: number
  rednessLevel: number
  lighteningContrastLevel: 0 | 1 | 2
}
const DEFAULT_BEAUTY_SETTINGS: BeautySettings = {
  enabled: false, smoothnessLevel: 0.5, lighteningLevel: 0.3, rednessLevel: 0.1, lighteningContrastLevel: 1,
}
const BEAUTY_PRESETS = [
  { name: 'Doğal', nameEn: 'Natural', icon: '✨', settings: { smoothnessLevel: 0, lighteningLevel: 0, rednessLevel: 0, lighteningContrastLevel: 1 as const } },
  { name: 'Yumuşak', nameEn: 'Soft', icon: '🌸', settings: { smoothnessLevel: 0.4, lighteningLevel: 0.3, rednessLevel: 0.1, lighteningContrastLevel: 1 as const } },
  { name: 'Glamour', nameEn: 'Glamour', icon: '💎', settings: { smoothnessLevel: 0.6, lighteningLevel: 0.5, rednessLevel: 0.2, lighteningContrastLevel: 2 as const } },
  { name: 'Parlak', nameEn: 'Bright', icon: '☀️', settings: { smoothnessLevel: 0.3, lighteningLevel: 0.7, rednessLevel: 0.05, lighteningContrastLevel: 2 as const } },
  { name: 'Romantik', nameEn: 'Romantic', icon: '💕', settings: { smoothnessLevel: 0.5, lighteningLevel: 0.4, rednessLevel: 0.4, lighteningContrastLevel: 1 as const } },
  { name: 'Serin', nameEn: 'Cool', icon: '❄️', settings: { smoothnessLevel: 0.3, lighteningLevel: 0.6, rednessLevel: 0.0, lighteningContrastLevel: 0 as const } },
]
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
  Send,
  UserPlus,
  VolumeX,
  Volume2,
  Ban,
  MoreVertical,
  Phone,
  PhoneOff,
  ImageIcon,
  Settings,
  Crown,
  Shield,
  UserCheck,
  UserX,
  Swords,
  Sparkles,
  Sun,
  Droplet,
  Palette
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { GuestInfo } from '@/components/host-control-panel'
import type { GridParticipant } from '@/components/stream-video-grid'
import { useJoinToasts } from '@/components/stream-join-toast'

// Dynamic imports for heavy components (loaded on demand)
const GiftNotificationBanner = dynamic(() => import('@/components/gift-notification-banner'), { ssr: false })
const PKBattleOverlay = dynamic(() => import('@/components/pk-battle-overlay'), { ssr: false })
const HostControlPanel = dynamic(() => import('@/components/host-control-panel'), { ssr: false })
const StreamVideoGrid = dynamic(() => import('@/components/stream-video-grid'), { ssr: false })
const StreamProfilePopup = dynamic(() => import('@/components/stream-profile-popup'), { ssr: false })
const StreamJoinToast = dynamic(() => import('@/components/stream-join-toast'), { ssr: false })

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
  targetUserId?: string // Who received the gift (broadcaster or co-broadcaster)
}

interface Viewer {
  id: string
  odUserId?: string
  odUserName?: string
  name: string
  image?: string | null
  hasGifted: boolean
  totalGiftAmount: number
}

interface CoBroadcaster {
  id: string
  userId: string
  status: string
  isMuted: boolean
  isVideoOff: boolean
  user: { id: string; name: string; image?: string | null }
  giftScore?: number
}

interface FloatingHeart {
  id: number
  color: string
  side?: 'left' | 'right'
}

interface AdminBroadcastImage {
  id: string
  name: string
  imageUrl: string
}

interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  userName?: string
  userImage?: string | null
}

interface StreamCategory {
  id: string
  name: string
  nameEn: string
  icon: string
  color: string
}

const HEART_COLORS = ['#ff2d55', '#ff375f', '#ff6b6b', '#ff85a1', '#ffa9c1']
const MAX_GUESTS = 8 // Maximum co-broadcasters allowed (grid slots = MAX_GUESTS + 1 host)
const RECONNECT_DELAY = 2000 // ms before attempting reconnect
const MAX_RECONNECT_ATTEMPTS = 5

export default function BroadcastPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const streamId = params.streamId as string
  const isCohost = searchParams.get('cohost') === 'true'

  const [viewerCount, setViewerCount] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [totalGiftJetons, setTotalGiftCredits] = useState(0)
  const [comments, setComments] = useState<Comment[]>([])
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [streamCategory, setStreamCategory] = useState<StreamCategory | null>(null)
  // Co-broadcast state - supports up to MAX_GUESTS (4) simultaneous guests
  const [activeGuests, setActiveGuests] = useState<CoBroadcaster[]>([])
  // Pending co-broadcast request popup
  const [pendingCoBroadcastRequest, setPendingCoBroadcastRequest] = useState<CoBroadcaster | null>(null)
  // Connection states for reconnection handling
  const [guestConnectionStates, setGuestConnectionStates] = useState<Map<string, string>>(new Map())
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([])
  const [duration, setDuration] = useState(0)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [connectedViewers, setConnectedViewers] = useState(0)
  const [centerGift, setCenterGift] = useState<CenterGift | null>(null)
  const giftAnimTriggerRef = useRef<((gift: { id: string; senderName: string; senderImage?: string | null; giftIcon: string; giftName: string; giftPrice: number; animation: string; quantity?: number }) => void) | null>(null)
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [newComment, setNewComment] = useState('')
  const [showViewers, setShowViewers] = useState(false)
  const [coBroadcasters, setCoBroadcasters] = useState<CoBroadcaster[]>([])
  const [selectedViewer, setSelectedViewer] = useState<Viewer | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(false)
  const [liveBroadcasters, setLiveBroadcasters] = useState<{id: string; userId: string; title: string | null; category: string | null; user: {id: string; name: string | null; image: string | null}; viewerCount: number}[]>([])
  const [showLiveBroadcasters, setShowLiveBroadcasters] = useState(false)
  // Image broadcast mode
  const [isImageMode, setIsImageMode] = useState(false)
  const [broadcastImage, setBroadcastImage] = useState<string | null>(null)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [adminBroadcastImages, setAdminBroadcastImages] = useState<AdminBroadcastImage[]>([])
  // Background image mode
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false)
  // Panel mode
  const [showPanel, setShowPanel] = useState(false)
  // Moderators (max 10)
  const [moderators, setModerators] = useState<{id: string; userId: string; user: {name: string; image: string | null}}[]>([])
  // Fortune requesters
  const [fortuneRequesters, setFortuneRequesters] = useState<{
    id: string
    userId: string
    typeId: string | null
    typeName: string
    typeNameEn: string
    typeIcon: string
    nickname: string | null
    isHidden: boolean
    question: string | null
    jetonAmount: number
    createdAt: string
    user: {name: string; image: string | null}
  }[]>([])
  // Selected fortune request popup
  const [selectedFortuneRequest, setSelectedFortuneRequest] = useState<{
    id: string
    userId: string
    typeName: string
    typeNameEn: string
    typeIcon: string
    nickname: string | null
    isHidden: boolean
    question: string | null
    jetonAmount: number
    user: {name: string; image: string | null}
  } | null>(null)
  // Muted viewers
  const [mutedViewers, setMutedViewers] = useState<Set<string>>(new Set())
  // PK Battle state
  const [pkBattle, setPkBattle] = useState<{
    id: string; stream1Id: string; stream2Id: string; user1Id: string; user2Id: string;
    score1: number; score2: number; status: string; duration: number;
    startedAt: string | null; endedAt: string | null; winnerId: string | null;
    user1?: { id: string; name: string | null; image: string | null } | null;
    user2?: { id: string; name: string | null; image: string | null } | null;
  } | null>(null)
  const [showPKModal, setShowPKModal] = useState(false)
  const [pkDuration, setPkDuration] = useState(180)
  const [pendingPKRequest, setPendingPKRequest] = useState<typeof pkBattle>(null)
  // Auto-close state
  const [autoCloseWarning, setAutoCloseWarning] = useState<string | null>(null)
  const autoCloseCheckRef = useRef<NodeJS.Timeout | null>(null)
  // Beauty effects state
  const [beautySettings, setBeautySettings] = useState<BeautySettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('agoraBeautySettings')
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return DEFAULT_BEAUTY_SETTINGS
  })
  const [showBeautyPanel, setShowBeautyPanel] = useState(false)
  const [profilePopupUserId, setProfilePopupUserId] = useState<string | null>(null)
  const { events: joinEvents, addJoinEvent, addLeaveEvent } = useJoinToasts()
  const prevViewerIdsRef = useRef<Set<string>>(new Set())
  // Host control panel
  const [showHostControls, setShowHostControls] = useState(false)

  const localVideoRef = useRef<HTMLDivElement>(null)
  // Video refs for up to 4 guests (dynamically created in render)
  const guestVideoRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const broadcasterVideoRef = useRef<HTMLDivElement>(null) // For co-host to see broadcaster
  const shownNotificationIdsRef = useRef<Set<string>>(new Set())
  // TRTC refs
  const trtcRef = useRef<TRTC | null>(null)
  const remoteUsersRef = useRef<Set<string>>(new Set())
  const processedGuestsRef = useRef<Set<string>>(new Set())
  const heartIdRef = useRef(0)
  const lastGiftIdRef = useRef<string>('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountedRef = useRef(false)

  useEffect(() => {
    if (!session?.user) {
      router.push(`/giris`)
      return
    }
    
    // Load stream category from localStorage
    try {
      const savedCategory = localStorage.getItem('streamCategory')
      if (savedCategory) {
        setStreamCategory(JSON.parse(savedCategory))
      }
    } catch (e) {
      console.error('Error loading stream category:', e)
    }
    
    isUnmountedRef.current = false
    startBroadcast()
    
    const durationInterval = setInterval(() => {
      if (!isUnmountedRef.current) setDuration(prev => prev + 1)
    }, 1000)
    
    pollIntervalRef.current = setInterval(() => {
      if (!isUnmountedRef.current && !document.hidden) {
        fetchStats()
        fetchComments()
        fetchGifts()
        fetchViewers()
        fetchCoBroadcasters()
        fetchNotifications()
        fetchModerators()
        fetchFortuneRequesters()
        fetchPKBattle()
      }
    }, 5000)

    // Resume polling immediately when broadcaster tab becomes visible
    const handleBroadcastVis = () => {
      if (!document.hidden && !isUnmountedRef.current) {
        fetchStats()
        fetchComments()
        fetchGifts()
        fetchViewers()
      }
    }
    document.addEventListener('visibilitychange', handleBroadcastVis)

    return () => {
      isUnmountedRef.current = true
      clearInterval(durationInterval)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      document.removeEventListener('visibilitychange', handleBroadcastVis)
      cleanup()
    }
  }, [session])

  // Fetch live broadcasters when modal opens
  useEffect(() => {
    if (showLiveBroadcasters) {
      fetchLiveBroadcasters()
    }
  }, [showLiveBroadcasters])

  // Fetch admin broadcast images when image selection modal opens
  useEffect(() => {
    if (showImageUpload) {
      const fetchAdminImages = async () => {
        try {
          const res = await fetch('/api/broadcast-images')
          if (res.ok) {
            const data = await res.json()
            setAdminBroadcastImages(data)
          }
        } catch (e) {
          console.error('Error fetching broadcast images:', e)
        }
      }
      fetchAdminImages()
    }
  }, [showImageUpload])



  const startBroadcast = async () => {
    try {
      // Create TRTC instance
      const trtc = await createTRTCInstance()
      trtcRef.current = trtc

      const TRTCModule = (await import('trtc-sdk-v5')).default

      // ── Global error & connection listeners ──
      trtc.on(TRTCModule.EVENT.ERROR, (error: any) => {
        console.error('🔴 TRTC ERROR event:', error)
      })

      trtc.on(TRTCModule.EVENT.CONNECTION_STATE_CHANGED, (event: any) => {
        console.log('🔗 TRTC connection state:', JSON.stringify(event))
      })

      trtc.on(TRTCModule.EVENT.AUTOPLAY_FAILED, () => {
        console.warn('🔇 TRTC AUTOPLAY_FAILED – user interaction required')
      })

      // Set up remote user event handlers (for co-broadcasters)
      trtc.on(TRTCModule.EVENT.REMOTE_VIDEO_AVAILABLE, (event: { userId: string }) => {
        remoteUsersRef.current.add(event.userId)
        const container = guestVideoRefs.current.get(event.userId) || broadcasterVideoRef.current
        if (container) {
          startRemoteVideo(trtc, event.userId, container).catch(console.error)
        }
      })

      trtc.on(TRTCModule.EVENT.REMOTE_AUDIO_AVAILABLE, () => {
        setRemoteAudioEnabled(true)
      })

      trtc.on(TRTCModule.EVENT.REMOTE_USER_EXIT, (event: { userId: string }) => {
        remoteUsersRef.current.delete(event.userId)
      })

      // Use streamId as room name for TRTC
      const roomId = `stream_${streamId}`
      const userId = session?.user?.id || 'host'
      const credentials = await fetchTRTCCredentials(userId, roomId)

      // Enter room as host/anchor in live mode
      await enterRoom(trtc, credentials, roomId, 'host', 'live')
      console.log('🎬 TRTC: Entered room as host, userId:', userId, 'roomId:', roomId)

      // ── Start local video FIRST (before audio) ──
      // Wait for DOM element to be ready
      const waitForVideoEl = async (): Promise<HTMLElement | null> => {
        for (let i = 0; i < 30; i++) {
          if (isUnmountedRef.current) return null
          const el = document.getElementById('trtc-local-video') || localVideoRef.current
          if (el) {
            const rect = el.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
              console.log('🎬 TRTC: Video container ready:', el.id || 'ref', rect.width, 'x', rect.height)
              return el
            }
          }
          await new Promise(r => setTimeout(r, 200))
        }
        return null
      }

      const videoContainer = await waitForVideoEl()
      let videoStarted = false

      if (videoContainer) {
        // Strategy 1: Pass DOM element directly (most compatible with mobile browsers)
        const videoAttempts = [
          { label: '480p-element', config: { view: videoContainer, publish: true, option: { profile: '480p' } } },
          { label: '360p-element', config: { view: videoContainer, publish: true, option: { profile: '360p' } } },
          { label: 'default-element', config: { view: videoContainer, publish: true } },
          // Strategy 2: Use string ID
          { label: '480p-id', config: { view: 'trtc-local-video', publish: true, option: { profile: '480p' } } },
          { label: 'default-id', config: { view: 'trtc-local-video', publish: true } },
          // Strategy 3: No view (capture only, render separately)
          { label: 'no-view', config: { publish: true } },
        ]

        for (const attempt of videoAttempts) {
          if (videoStarted) break
          try {
            console.log('🎬 TRTC: Trying startLocalVideo:', attempt.label)
            await trtc.startLocalVideo(attempt.config as any)
            console.log('✅ TRTC: startLocalVideo SUCCESS:', attempt.label)
            videoStarted = true
          } catch (err: any) {
            console.warn('⚠️ TRTC: startLocalVideo FAILED (' + attempt.label + '):', err?.code, err?.message || String(err))
          }
        }
      } else {
        console.error('🔴 TRTC: Video container never appeared in DOM')
        // Try without view as last resort
        try {
          console.log('🎬 TRTC: Attempting startLocalVideo with no view (container missing)')
          await trtc.startLocalVideo({ publish: true } as any)
          videoStarted = true
          console.log('✅ TRTC: startLocalVideo SUCCESS (no view)')
        } catch (err: any) {
          console.error('❌ TRTC: startLocalVideo failed even without view:', err?.code, err?.message || String(err))
        }
      }

      // Start local audio
      try {
        await startLocalAudio(trtc)
        console.log('🎬 TRTC: Local audio started')
      } catch (audioErr: any) {
        console.error('🔴 TRTC: startLocalAudio failed:', audioErr?.code, audioErr?.message || String(audioErr))
      }

      console.log('🎬 TRTC: Broadcast started — video:', videoStarted, ', userId:', userId, ', roomId:', roomId)
    } catch (error: any) {
      console.error('TRTC broadcast error:', error?.code, error?.message || String(error))
      alert('Yayın başlatılamadı. Kamera/mikrofon erişimini kontrol edin.')
      router.back()
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

  const fetchViewers = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/viewers`)
      if (res.ok) {
        const newViewers: Viewer[] = await res.json()
        setViewers(newViewers)
        
        // Detect joins/leaves for toast notifications
        const newIds = new Set(newViewers.map((v: Viewer) => v.id))
        const prevIds = prevViewerIdsRef.current
        if (prevIds.size > 0) {
          newViewers.forEach((v: Viewer) => {
            if (!prevIds.has(v.id)) addJoinEvent(v.name, v.image)
          })
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

  // PK Battle functions
  const fetchPKBattle = async () => {
    try {
      const res = await fetch(`/api/video-streams/pk?streamId=${streamId}`)
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setPkBattle(data)
          // Show pending PK request popup if we're the target
          if (data.status === 'pending' && data.user2Id === session?.user?.id) {
            setPendingPKRequest(data)
          }
          // Auto-end PK if time is up
          if (data.status === 'active' && data.startedAt) {
            const elapsed = (Date.now() - new Date(data.startedAt).getTime()) / 1000
            if (elapsed >= data.duration) {
              fetch('/api/video-streams/pk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'end', battleId: data.id })
              }).catch(() => {})
            }
          }
        } else {
          setPkBattle(null)
          setPendingPKRequest(null)
        }
      }
    } catch {}
  }

  const handleStartPK = async (targetStreamId: string) => {
    try {
      const res = await fetch('/api/video-streams/pk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', streamId, targetStreamId, duration: pkDuration })
      })
      if (res.ok) {
        setShowPKModal(false)
        setShowLiveBroadcasters(false)
        addToast('info', 'PK isteği gönderildi! ⚔️')
      } else {
        const data = await res.json()
        addToast('error', data.error || 'PK başlatılamadı')
      }
    } catch { addToast('error', 'PK başlatılamadı') }
  }

  const handleAcceptPK = async () => {
    if (!pendingPKRequest) return
    try {
      const res = await fetch('/api/video-streams/pk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', battleId: pendingPKRequest.id })
      })
      if (res.ok) {
        setPendingPKRequest(null)
        addToast('success', 'PK başladı! ⚔️')
      }
    } catch {}
  }

  const handleRejectPK = async () => {
    if (!pendingPKRequest) return
    try {
      await fetch('/api/video-streams/pk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', battleId: pendingPKRequest.id })
      })
      setPendingPKRequest(null)
    } catch {}
  }

  const handleCancelPK = async () => {
    if (!pkBattle) return
    try {
      await fetch('/api/video-streams/pk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', battleId: pkBattle.id })
      })
      setPkBattle(null)
    } catch {}
  }

  const handleEndPK = async () => {
    if (!pkBattle) return
    try {
      await fetch('/api/video-streams/pk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', battleId: pkBattle.id })
      })
    } catch {}
  }

  const fetchLiveBroadcasters = async () => {
    try {
      const res = await fetch('/api/video-streams')
      if (res.ok) {
        const streams = await res.json()
        // Filter out current stream and current user's streams
        const otherStreams = streams.filter((s: any) => s.id !== streamId && s.userId !== session?.user?.id)
        setLiveBroadcasters(otherStreams)
      }
    } catch (e) {}
  }

  const fetchCoBroadcasters = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/co-broadcast`)
      if (res.ok) {
        const data = await res.json()
        setCoBroadcasters(data)
        
        // Check for pending/requested co-broadcast requests and show popup (only first one)
        const pending = data.find((cb: CoBroadcaster) => cb.status === 'requested')
        if (pending && !pendingCoBroadcastRequest) {
          // Only show request if we haven't reached max guests
          if (activeGuests.length < MAX_GUESTS) {
            setPendingCoBroadcastRequest(pending)
          }
        }
        
        // Find all active guests (up to MAX_GUESTS)
        const currentActive: CoBroadcaster[] = data
          .filter((cb: CoBroadcaster) => cb.status === 'active')
          .slice(0, MAX_GUESTS)
        
        // Track guests (Agora handles connections automatically)
        for (const guest of currentActive) {
          if (!processedGuestsRef.current.has(guest.userId)) {
            console.log('🎬 New guest joined:', guest.userId)
            processedGuestsRef.current.add(guest.userId)
          }
        }
        
        // Check for guests who left
        const currentGuestIds = new Set(currentActive.map(g => g.userId))
        for (const guestId of processedGuestsRef.current) {
          if (!currentGuestIds.has(guestId)) {
            console.log('🎬 Guest left:', guestId)
            processedGuestsRef.current.delete(guestId)
          }
        }
        
        // Update active guests state
        setActiveGuests(currentActive)
      }
    } catch (e) {}
  }

  const addToast = (type: 'success' | 'error' | 'info', message: string, userName?: string, userImage?: string | null) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, type, message, userName, userImage }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (res.ok) {
        const notifications = await res.json()
        // Check for co-broadcast accept/reject notifications
        for (const notif of notifications) {
          // Skip if already shown
          if (shownNotificationIdsRef.current.has(notif.id)) continue
          
          // Mark as shown
          shownNotificationIdsRef.current.add(notif.id)
          
          // Only show toast for co-broadcast notifications for this stream
          if (notif.type === 'co_broadcast_accepted' || notif.type === 'co_broadcast_rejected') {
            const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data
            if (data?.streamId === streamId) {
              addToast(
                notif.type === 'co_broadcast_accepted' ? 'success' : 'info',
                notif.type === 'co_broadcast_accepted' 
                  ? ('ortak yayın davetini kabul etti!')
                  : ('ortak yayın davetini reddetti.'),
                data.userName,
                data.userImage
              )
            }
          }
        }
        
        // Limit the set size to avoid memory issues (keep only recent 100)
        if (shownNotificationIdsRef.current.size > 100) {
          const arr = Array.from(shownNotificationIdsRef.current)
          shownNotificationIdsRef.current = new Set(arr.slice(-50))
        }
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
        
        if (gifts.length > 0 && gifts[0].id !== lastGiftIdRef.current) {
          const newGift = gifts[0]
          lastGiftIdRef.current = newGift.id
          
          // Trigger new spectacular gift animation overlay
          if (giftAnimTriggerRef.current) {
            giftAnimTriggerRef.current({
              id: newGift.id,
              senderName: newGift.sender.name,
              senderImage: newGift.sender.image,
              giftIcon: newGift.giftType.icon,
              giftName: newGift.giftType.name,
              giftPrice: newGift.giftType.price,
              animation: newGift.giftType.animation || 'sparkle_burst',
              quantity: newGift.quantity || 1,
            })
          }
          
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

  const toggleVideo = async () => {
    if (trtcRef.current) {
      try {
        if (isVideoOn) {
          await stopLocalVideo(trtcRef.current)
        } else {
          // Use string element ID for consistency with startBroadcast
          await trtcRef.current.startLocalVideo({
            view: 'trtc-local-video',
            publish: true,
            option: { useFrontCamera: facingMode === 'user' },
          } as any)
        }
        setIsVideoOn(!isVideoOn)
      } catch (err) {
        console.error('toggleVideo error:', err)
      }
    }
  }

  const toggleAudio = async () => {
    if (trtcRef.current) {
      if (isAudioOn) {
        await stopLocalAudio(trtcRef.current)
      } else {
        await startLocalAudio(trtcRef.current)
      }
      setIsAudioOn(!isAudioOn)
    }
  }

  // Enable remote audio on user interaction (for browser autoplay policy)
  const enableRemoteAudio = () => {
    setRemoteAudioEnabled(true)
  }

  const switchCameraFn = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacing)
    try {
      if (trtcRef.current) {
        await updateLocalVideo(trtcRef.current, { useFrontCamera: newFacing === 'user' })
      }
    } catch (e) {
      console.error('Switch camera error:', e)
    }
  }

  // Beauty effect handlers (placeholder - TRTC beauty requires separate plugin)
  const updateBeautySettings = async (newSettings: BeautySettings) => {
    setBeautySettings(newSettings)
    localStorage.setItem('agoraBeautySettings', JSON.stringify(newSettings))
    // Note: TRTC beauty effects require TRTCBeautyPlugin - kept as UI-only for now
  }

  const applyBeautyPreset = async (presetIndex: number) => {
    const preset = BEAUTY_PRESETS[presetIndex]
    if (!preset) return
    const newSettings: BeautySettings = {
      enabled: presetIndex > 0, // index 0 = "Natural" = off
      ...preset.settings,
    }
    await updateBeautySettings(newSettings)
  }

  const handleSendComment = async () => {
    if (!newComment.trim()) return
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

  const handleInviteCoBroadcast = async (userId: string) => {
    try {
      await fetch(`/api/video-streams/${streamId}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'invite' })
      })
      fetchCoBroadcasters()
    } catch (e) {}
  }

  // Accept co-broadcast request (from popup or host panel)
  const handleAcceptCoBroadcastRequest = async (userIdParam?: string) => {
    const userId = userIdParam || pendingCoBroadcastRequest?.userId
    if (!userId) return
    try {
      await fetch(`/api/video-streams/${streamId}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'approve' })
      })
      if (pendingCoBroadcastRequest?.userId === userId) {
        setPendingCoBroadcastRequest(null)
      }
      fetchCoBroadcasters()
      addToast('success', 'yayına katıldı!', coBroadcasters.find(cb => cb.userId === userId)?.user?.name || 'Kullanıcı')
    } catch (e) {}
  }

  // Reject co-broadcast request
  const handleRejectCoBroadcastRequest = async (userIdParam?: string) => {
    const userId = userIdParam || pendingCoBroadcastRequest?.userId
    if (!userId) return
    try {
      await fetch(`/api/video-streams/${streamId}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'reject_request' })
      })
      if (pendingCoBroadcastRequest?.userId === userId) {
        setPendingCoBroadcastRequest(null)
      }
      fetchCoBroadcasters()
    } catch (e) {}
  }

  const handleMuteCoBroadcaster = async (userId: string, mute: boolean) => {
    try {
      await fetch(`/api/video-streams/${streamId}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: mute ? 'mute' : 'unmute' })
      })
      fetchCoBroadcasters()
    } catch (e) {}
  }

  const handleVideoOffCoBroadcaster = async (userId: string, off: boolean) => {
    try {
      await fetch(`/api/video-streams/${streamId}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: off ? 'video_off' : 'video_on' })
      })
      fetchCoBroadcasters()
    } catch (e) {}
  }

  const handleRemoveCoBroadcaster = async (userId: string) => {
    try {
      await fetch(`/api/video-streams/${streamId}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'remove' })
      })
      processedGuestsRef.current.delete(userId)
      fetchCoBroadcasters()
      addToast('info', 'yayından çıkarıldı', coBroadcasters.find(cb => cb.userId === userId)?.user?.name || 'Kullanıcı')
    } catch (e) {}
  }

  // Host control panel data
  const hostControlGuests: GuestInfo[] = activeGuests.map(g => ({
    id: g.id,
    odId: g.id,
    odUserId: g.userId,
    name: g.user.name,
    image: g.user.image || null,
    isMuted: g.isMuted,
    isVideoOff: g.isVideoOff,
    status: g.status,
  }))

  const hostPendingRequests = coBroadcasters
    .filter(cb => cb.status === 'requested')
    .map(cb => ({
      id: cb.id,
      userId: cb.userId,
      name: cb.user.name,
      image: cb.user.image || null,
    }))

  // Grid participants for StreamVideoGrid
  const hasActiveGuests = activeGuests.length > 0
  const gridParticipants: GridParticipant[] = hasActiveGuests ? [
    {
      id: 'host',
      userId: 'host',
      name: session?.user?.name || 'Host',
      image: session?.user?.image || null,
      isHost: true,
      isMuted: !isAudioOn,
      isVideoOff: !isVideoOn,
    },
    ...activeGuests.map(g => ({
      id: g.id,
      userId: g.userId,
      name: g.user.name,
      image: g.user.image || null,
      isHost: false,
      isMuted: g.isMuted,
      isVideoOff: g.isVideoOff,
      isConnecting: guestConnectionStates.get(g.userId) === 'connecting',
      isDisconnected: guestConnectionStates.get(g.userId) === 'disconnected',
    })),
  ] : []

  const handleBanUser = async (userId: string) => {
    try {
      await fetch(`/api/video-streams/${streamId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason: 'Yayıncı tarafından engellendi' })
      })
      fetchViewers()
    } catch (e) {}
  }

  // Mute a viewer
  const handleMuteViewer = async (viewerId: string) => {
    try {
      await fetch(`/api/video-streams/${streamId}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId })
      })
      setMutedViewers(prev => new Set([...prev, viewerId]))
    } catch (e) {}
  }

  // Unmute a viewer
  const handleUnmuteViewer = async (viewerId: string) => {
    try {
      await fetch(`/api/video-streams/${streamId}/mute`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId })
      })
      setMutedViewers(prev => {
        const newSet = new Set(prev)
        newSet.delete(viewerId)
        return newSet
      })
    } catch (e) {}
  }

  // Add moderator (max 10)
  const handleAddModerator = async (userId: string) => {
    if (moderators.length >= 10) {
      alert('En fazla 10 moderatör ekleyebilirsiniz!')
      return
    }
    try {
      await fetch(`/api/video-streams/${streamId}/moderators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      fetchModerators()
    } catch (e) {}
  }

  // Remove moderator
  const handleRemoveModerator = async (userId: string) => {
    try {
      await fetch(`/api/video-streams/${streamId}/moderators`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      fetchModerators()
    } catch (e) {}
  }

  // Fetch moderators
  const fetchModerators = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/moderators`)
      if (res.ok) setModerators(await res.json())
    } catch (e) {}
  }

  // Fetch fortune requesters (sorted by jeton amount)
  const fetchFortuneRequesters = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/fortune-requests`)
      if (res.ok) setFortuneRequesters(await res.json())
    } catch (e) {}
  }

  // Open fortune request popup (show details)
  const handleOpenFortuneRequest = (request: typeof fortuneRequesters[0]) => {
    setSelectedFortuneRequest(request)
  }

  // Select and complete fortune requester
  const handleSelectFortuneRequester = async (requestId: string) => {
    try {
      await fetch(`/api/video-streams/${streamId}/fortune-requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'select' })
      })
      setSelectedFortuneRequest(null)
      fetchFortuneRequesters()
    } catch (e) {}
  }

  // Complete fortune (after reading)
  const handleCompleteFortuneRequest = async (requestId: string) => {
    try {
      await fetch(`/api/video-streams/${streamId}/fortune-requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'complete' })
      })
      setSelectedFortuneRequest(null)
      fetchFortuneRequesters()
      addToast('success', 'Fal tamamlandı!')
    } catch (e) {}
  }

  // Refund fortune request
  const handleRefundFortuneRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/fortune-requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'refund' })
      })
      if (res.ok) {
        const data = await res.json()
        addToast('info', `${data.amount} jeton iade edildi`)
      }
      setSelectedFortuneRequest(null)
      fetchFortuneRequesters()
    } catch (e) {}
  }

  // Refund all pending requests (when ending stream)
  const handleRefundAllPending = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/fortune-requests?refundAll=true`, {
        method: 'DELETE'
      })
      if (res.ok) {
        const data = await res.json()
        if (data.refundedCount > 0) {
          addToast('info', `${data.refundedCount} kişiye toplam ${data.totalRefunded} jeton iade edildi`)
        }
      }
    } catch (e) {}
  }

  // Toggle image mode - show selection modal or toggle off
  const handleToggleImageMode = () => {
    if (!isImageMode) {
      // Opening image selection modal
      setShowImageUpload(true)
    } else {
      // Turn off image mode
      setIsImageMode(false)
      // Update database
      fetch(`/api/video-streams/${streamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isImageMode: false })
      }).catch(() => {})
    }
  }

  // Handle selecting an admin-uploaded image
  const handleSelectAdminImage = async (image: AdminBroadcastImage) => {
    setBroadcastImage(image.imageUrl)
    setIsImageMode(true)
    setShowImageUpload(false)
    
    // Save to database
    try {
      await fetch(`/api/video-streams/${streamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          broadcastImage: image.imageUrl,
          isImageMode: true
        })
      })
    } catch (error) {
      console.error('Error saving broadcast image:', error)
    }
  }

  // Toggle background selector
  const handleToggleBackground = () => {
    if (backgroundUrl) {
      // Remove background
      setBackgroundUrl(null)
      fetch(`/api/video-streams/${streamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundUrl: null })
      }).catch(() => {})
    } else {
      setShowBackgroundSelector(true)
    }
  }

  // Select a background image
  const handleSelectBackground = async (image: AdminBroadcastImage) => {
    setBackgroundUrl(image.imageUrl)
    setShowBackgroundSelector(false)
    try {
      await fetch(`/api/video-streams/${streamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundUrl: image.imageUrl })
      })
    } catch (error) {
      console.error('Error saving background:', error)
    }
  }

  const cleanup = async () => {
    // Leave TRTC room and cleanup
    if (trtcRef.current) {
      try {
        await exitRoom(trtcRef.current)
        await destroyTRTC(trtcRef.current)
      } catch (e) {
        console.error('TRTC cleanup error:', e)
      }
      trtcRef.current = null
    }
    remoteUsersRef.current.clear()
    processedGuestsRef.current.clear()
    
    // Update stream status
    fetch(`/api/video-streams/${streamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ended' })
    }).catch(() => {})
  }

  const handleEndStream = async () => {
    // Refund all pending fortune requests before ending
    await handleRefundAllPending()
    cleanup()
    router.push(`/`)
  }

  // Auto-close check: poll every 30s to see if no gift timeout exceeded
  const checkAutoClose = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/auto-close`)
      if (res.ok) {
        const data = await res.json()
        if (data.shouldClose) {
          // Show warning then auto-close
          setAutoCloseWarning(data.message)
          // Wait 5 seconds then actually close
          setTimeout(async () => {
            try {
              await fetch(`/api/video-streams/${streamId}/auto-close`, { method: 'POST' })
            } catch {}
            cleanup()
            router.push('/')
          }, 5000)
        } else if (data.remainingMinutes !== undefined && data.remainingMinutes <= 3) {
          setAutoCloseWarning(`⏰ ${data.remainingMinutes} dakika içinde hediye gelmezse yayın kapanacak!`)
        } else {
          setAutoCloseWarning(null)
        }
      }
    } catch {}
  }

  // Start auto-close check interval
  useEffect(() => {
    if (!session?.user) return
    // Check every 30 seconds
    checkAutoClose()
    autoCloseCheckRef.current = setInterval(checkAutoClose, 30000)
    return () => {
      if (autoCloseCheckRef.current) clearInterval(autoCloseCheckRef.current)
    }
  }, [session, streamId])

  const formatDuration = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
  const formatCount = (n: number) => n >= 1000 ? (n/1000).toFixed(1) + 'K' : n.toString()

  const gifters = viewers.filter(v => v.hasGifted).sort((a, b) => b.totalGiftAmount - a.totalGiftAmount)
  
  // Legacy alias for backward compatibility (if needed elsewhere)
  const activeCoBroadcaster = activeGuests[0] || null
  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Auto-close warning banner */}
      {autoCloseWarning && (
        <div className="absolute top-16 left-2 right-2 z-50 animate-pulse">
          <div className="bg-red-600/90 backdrop-blur-sm border border-red-400/50 rounded-xl px-4 py-3 text-white text-sm font-medium text-center shadow-lg shadow-red-500/30">
            ⚠️ {autoCloseWarning}
          </div>
        </div>
      )}

      {/* Video Layout */}
      {isCohost ? (
        <>
          {/* Co-host mode: Broadcaster video fullscreen */}
          <div
            ref={broadcasterVideoRef}
            className="absolute inset-0 w-full h-full bg-black [&_video]:w-full [&_video]:h-full [&_video]:object-contain"
          />
          
          {/* Co-host's own video as PiP popup */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-20 right-3 w-28 h-40 sm:w-32 sm:h-44 bg-gray-900 rounded-2xl overflow-hidden border-2 border-purple-500 shadow-2xl z-20"
          >
            <div
              id="trtc-local-video"
              ref={localVideoRef}
              className="w-full h-full bg-black [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <div className="flex items-center gap-1.5">
                {session?.user?.image ? (
                  <Image src={session.user.image} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">{session?.user?.name?.[0]}</span>
                  </div>
                )}
                <p className="text-white text-[10px] font-medium truncate">{session?.user?.name}</p>
                <span className="text-green-400 text-[8px]">●</span>
              </div>
            </div>
            <button onClick={switchCameraFn} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors">
              <SwitchCamera className="w-3 h-3 text-white" />
            </button>
          </motion.div>
        </>
      ) : hasActiveGuests ? (
        <>
          {/* MULTI-GUEST GRID MODE: Host + Guests in TikTok-style grid with Talep slots */}
          <div className="absolute inset-0 pt-14 pb-28 px-1">
            <StreamVideoGrid
              participants={gridParticipants}
              maxSlots={MAX_GUESTS + 1}
              videoRefs={new Map()}
              onSetVideoRef={(userId, el) => {
                if (!el) return
                if (userId === 'host') {
                  if (localVideoRef.current !== el) {
                    (localVideoRef as any).current = el
                    el.id = 'trtc-local-video' // Keep ID in sync for TRTC
                  }
                } else {
                  guestVideoRefs.current.set(userId, el)
                  // Play remote user's video in this container
                  if (trtcRef.current && remoteUsersRef.current.has(userId)) {
                    try { startRemoteVideo(trtcRef.current, userId, el).catch(() => {}) } catch {}
                  }
                }
              }}
              hostMirror={facingMode === 'user'}
              isHost={true}
              onParticipantClick={(p) => {
                if (p.userId !== 'host') setProfilePopupUserId(p.userId)
              }}
            />
          </div>

          {/* Gradients */}
          <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-[5]" />
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-[5]" />
        </>
      ) : (
        <>
          {/* Background image layer */}
          {backgroundUrl && (
            <div className="absolute inset-0 z-0">
              <img src={backgroundUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20" />
            </div>
          )}
          {/* SOLO MODE: Broadcaster video fullscreen */}
          <div
            id="trtc-local-video"
            ref={localVideoRef}
            className={`absolute inset-0 w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-contain ${backgroundUrl ? 'z-[1]' : 'bg-black'}`}
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />

          {/* Gradients for solo mode */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-[2]" />
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-[2]" />
        </>
      )}

      {/* Hidden container for co-host mode (to receive broadcaster stream) */}
      {!isCohost && <div ref={broadcasterVideoRef} className="hidden" />}



      {/* Viewer avatars row - always at bottom */}
      <div className="absolute bottom-24 left-2 right-2 z-20 flex items-center gap-1 overflow-x-auto">
        {viewers.slice(0, 6).map((viewer) => (
          <div key={viewer.id} className="flex-shrink-0">
            {viewer.image ? (
              <Image src={viewer.image} alt="" width={24} height={24} className="w-6 h-6 rounded-full object-cover border border-white/20" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center border border-white/20">
                <span className="text-white text-[8px] font-bold">{viewer.name[0]}</span>
              </div>
            )}
          </div>
        ))}
        {viewers.length > 6 && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center border border-white/20">
            <span className="text-white text-[8px]">+{viewers.length - 6}</span>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 space-y-2 w-72">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-md border ${
                toast.type === 'success' 
                  ? 'bg-green-500/20 border-green-500/30' 
                  : toast.type === 'error'
                  ? 'bg-red-500/20 border-red-500/30'
                  : 'bg-purple-500/20 border-purple-500/30'
              }`}
            >
              {toast.userImage ? (
                <Image src={toast.userImage} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
              ) : toast.userName && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{toast.userName[0]}</span>
                </div>
              )}
              <p className="text-white text-sm flex-1">
                <span className="font-semibold">{toast.userName}</span>{' '}
                {toast.message}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Spectacular Gift Animation Overlay */}
      <GiftAnimationOverlay onTrigger={(fn: any) => { giftAnimTriggerRef.current = fn }} />

      {/* Top bar - Broadcaster Profile */}
      {!isCohost && (
        <div className="absolute top-4 left-4 right-4 z-10">
          {/* Top Row - Profile, Stats, End Button */}
          <div className="flex items-center justify-between">
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
                <button onClick={() => setShowViewers(!showViewers)} className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full">
                  <Users className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-xs">{viewerCount}</span>
                </button>
                <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full">
                  <Heart className="w-3.5 h-3.5 text-[#fe2c55]" fill="#fe2c55" />
                  <span className="text-white text-xs">{formatCount(likeCount)}</span>
                </div>
                {totalGiftJetons > 0 && (
                  <div className="flex items-center gap-1 bg-yellow-500/30 px-2 py-1 rounded-full">
                    <Coins className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-yellow-400 text-xs font-bold">+{totalGiftJetons}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* End Stream Button */}
            <button 
              onClick={() => setShowEndConfirm(true)} 
              className="bg-[#fe2c55] text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1"
            >
              <X className="w-4 h-4" /> 
              {'Canlı Yayını Kapat'}
            </button>
          </div>

          {/* Big Gift Banner */}
          <div className="mt-2 w-[90vw] max-w-[400px] rounded-xl overflow-hidden shadow-[0_0_20px_rgba(255,215,0,0.3)]">
            <GiftNotificationBanner />
          </div>
        </div>
      )}

      {/* Co-host End Button */}
      {isCohost && (
        <div className="absolute top-4 right-4 z-40">
          <button 
            onClick={() => setShowEndConfirm(true)} 
            className="bg-[#fe2c55] text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1"
          >
            <X className="w-4 h-4" /> 
            {'Bitir'}
          </button>
        </div>
      )}

      {/* Right Side - Category, Co-Broadcasters & Fortune Requests */}
      {!isCohost && (
        <div className="absolute right-3 top-20 z-20 space-y-3">
          {/* Stream Category Badge - Fixed at top right */}
          {streamCategory && (
            <div className={`flex items-center gap-1.5 bg-gradient-to-r ${streamCategory.color} px-3 py-1.5 rounded-full w-fit shadow-lg`}>
              <span className="text-base">{streamCategory.icon}</span>
              <span className="text-white font-semibold text-xs">{streamCategory.name}</span>
            </div>
          )}
          
          {/* Active Co-Broadcasters (as circles, old style) */}
          {activeGuests.map((cb: any) => (
            <motion.div
              key={cb.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className="w-16 h-16 rounded-full border-2 border-green-500 overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                {cb.user.image ? (
                  <Image src={cb.user.image} alt="" width={64} height={64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">{cb.user.name[0]}</span>
                  </div>
                )}
              </div>
              {cb.isMuted && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <VolumeX className="w-3 h-3 text-white" />
                </div>
              )}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="absolute -top-1 -left-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                    <MoreVertical className="w-3 h-3 text-white" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="bg-[#1a1a1a] border border-white/10 rounded-lg p-1 min-w-[140px] z-50">
                    <DropdownMenu.Item
                      onClick={() => handleMuteCoBroadcaster(cb.user.id, !cb.isMuted)}
                      className="flex items-center gap-2 px-3 py-2 text-white text-sm rounded cursor-pointer hover:bg-white/10"
                    >
                      {cb.isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      {cb.isMuted ? 'Sesi Aç' : 'Sessize Al'}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onClick={() => handleRemoveCoBroadcaster(cb.user.id)}
                      className="flex items-center gap-2 px-3 py-2 text-red-400 text-sm rounded cursor-pointer hover:bg-white/10"
                    >
                      <PhoneOff className="w-4 h-4" />
                      Yayından Çıkar
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              <p className="text-white text-[10px] text-center mt-1 truncate max-w-16">{cb.user.name}</p>
            </motion.div>
          ))}
          
          {/* Fortune Requests Section - Right Side */}
          {fortuneRequesters.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-black/70 backdrop-blur-sm rounded-xl p-2.5 w-44"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-bold text-xs flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  {'Fal İstekleri'}
                </h3>
                <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                  {fortuneRequesters.length}
                </span>
              </div>
              
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {fortuneRequesters.map((req, index) => (
                  <motion.div 
                    key={req.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleOpenFortuneRequest(req)}
                    className="flex items-center gap-1.5 bg-white/10 rounded-lg p-1.5 cursor-pointer hover:bg-white/20 transition-colors"
                  >
                    <span className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[9px] font-bold text-black shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-sm shrink-0">{req.typeIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[10px] font-medium truncate">
                        {req.isHidden ? ('Gizli') : (req.nickname || req.user.name)}
                      </p>
                      <div className="flex items-center gap-1">
                        <Coins className="w-2.5 h-2.5 text-amber-400" />
                        <span className="text-amber-400 text-[9px] font-bold">{req.jetonAmount}</span>
                        {req.question && <span className="text-blue-400 text-[9px]">💬</span>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Floating Hearts Animation */}
      <div className="absolute right-20 top-1/3 z-10 pointer-events-none">
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
      {!isCohost && gifters.length > 0 && (
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

      {/* Viewers List Modal */}
      <AnimatePresence>
        {showViewers && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute right-3 top-36 w-64 max-h-80 bg-black/80 backdrop-blur-md rounded-xl z-30 overflow-hidden"
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-medium text-sm flex items-center gap-2">
                <Users className="w-4 h-4" /> {'İzleyiciler'} ({viewers.length})
              </h3>
              <button onClick={() => setShowViewers(false)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {viewers.map(viewer => (
                <div key={viewer.id} className="flex items-center justify-between p-2 hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    {viewer.image ? (
                      <Image src={viewer.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{viewer.name[0]}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-white text-xs font-medium">{viewer.name}</p>
                      {viewer.hasGifted && <p className="text-yellow-400 text-[10px]">🎁 {viewer.totalGiftAmount}</p>}
                    </div>
                  </div>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className="bg-[#1a1a1a] border border-white/10 rounded-lg p-1 min-w-[160px] z-50" sideOffset={5}>
                        {/* Mute/Unmute */}
                        <DropdownMenu.Item
                          onClick={() => viewer.odUserId && (mutedViewers.has(viewer.odUserId) ? handleUnmuteViewer(viewer.odUserId) : handleMuteViewer(viewer.odUserId))}
                          className="flex items-center gap-2 px-3 py-2 text-white text-sm rounded cursor-pointer hover:bg-white/10"
                        >
                          {viewer.odUserId && mutedViewers.has(viewer.odUserId) ? (
                            <><Volume2 className="w-4 h-4" /> {'Sesi Aç'}</>
                          ) : (
                            <><VolumeX className="w-4 h-4" /> {'Sessize Al'}</>
                          )}
                        </DropdownMenu.Item>
                        
                        {/* Add/Remove Moderator */}
                        {viewer.odUserId && (
                          moderators.some(m => m.userId === viewer.odUserId) ? (
                            <DropdownMenu.Item
                              onClick={() => handleRemoveModerator(viewer.odUserId!)}
                              className="flex items-center gap-2 px-3 py-2 text-orange-400 text-sm rounded cursor-pointer hover:bg-white/10"
                            >
                              <UserX className="w-4 h-4" />
                              {'Moderatörlükten Çıkar'}
                            </DropdownMenu.Item>
                          ) : (
                            <DropdownMenu.Item
                              onClick={() => handleAddModerator(viewer.odUserId!)}
                              className="flex items-center gap-2 px-3 py-2 text-green-400 text-sm rounded cursor-pointer hover:bg-white/10"
                              disabled={moderators.length >= 10}
                            >
                              <Shield className="w-4 h-4" />
                              {'Moderatör Yap'}
                            </DropdownMenu.Item>
                          )
                        )}
                        
                        {/* Invite as guest co-broadcaster */}
                        {viewer.odUserId && !coBroadcasters.some(cb => cb.userId === viewer.odUserId && (cb.status === 'invited' || cb.status === 'active')) && activeGuests.length < MAX_GUESTS && (
                          <DropdownMenu.Item
                            onClick={() => viewer.odUserId && handleInviteCoBroadcast(viewer.odUserId)}
                            className="flex items-center gap-2 px-3 py-2 text-fuchsia-400 text-sm rounded cursor-pointer hover:bg-white/10"
                          >
                            <Video className="w-4 h-4" />
                            {'Misafir Davet Et'}
                          </DropdownMenu.Item>
                        )}

                        {/* Ban */}
                        <DropdownMenu.Item
                          onClick={() => viewer.odUserId && handleBanUser(viewer.odUserId)}
                          className="flex items-center gap-2 px-3 py-2 text-red-400 text-sm rounded cursor-pointer hover:bg-white/10"
                        >
                          <Ban className="w-4 h-4" />
                          {'Engelle'}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              ))}
              {viewers.length === 0 && (
                <p className="text-white/40 text-xs text-center py-6">
                  {'Henüz izleyici yok'}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Comments floating above input */}
      <div className="absolute left-3 bottom-28 right-20 max-h-32 overflow-hidden z-10 space-y-1">
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
              placeholder={'Mesaj yaz...'}
              className="flex-1 bg-transparent text-white text-sm px-4 py-2.5 placeholder:text-white/40 focus:outline-none"
            />
            <button
              onClick={handleSendComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold rounded-full mr-1 flex items-center gap-1.5 disabled:opacity-40 disabled:from-gray-500 disabled:to-gray-600 hover:from-pink-400 hover:to-purple-400 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{'Gönder'}</span>
            </button>
          </div>
        </div>
        
        {/* Control buttons */}
        <div className="flex justify-center gap-2 sm:gap-3 overflow-x-auto px-2 scrollbar-hide">
          {/* Panel Button with Fortune Request Badge */}
          <button 
            onClick={() => setShowPanel(!showPanel)} 
            className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full flex items-center gap-1.5 sm:gap-2 relative ${showPanel ? 'bg-purple-600' : 'bg-white/20'}`}
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span className="text-white text-xs sm:text-sm font-medium">Panel</span>
            {/* Red badge showing fortune request count */}
            {fortuneRequesters.length > 0 && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {fortuneRequesters.length}
              </span>
            )}
          </button>
          
          <button onClick={toggleVideo} className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${isVideoOn ? 'bg-white/20' : 'bg-[#fe2c55]'}`}>
            {isVideoOn ? <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
          </button>
          <button onClick={toggleAudio} className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${isAudioOn ? 'bg-white/20' : 'bg-[#fe2c55]'}`}>
            {isAudioOn ? <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
          </button>
          <button onClick={switchCameraFn} className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center">
            <SwitchCamera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
          
          {/* Host Controls Button */}
          {!isCohost && (
            <button 
              onClick={() => setShowHostControls(!showHostControls)} 
              className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center relative ${showHostControls ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/20'}`}
              title="Misafir Kontrolleri"
            >
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              {hostPendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {hostPendingRequests.length}
                </span>
              )}
            </button>
          )}
          
          {/* PK Battle Button */}
          {!isCohost && (
            <button 
              onClick={() => { setShowPKModal(true); setShowLiveBroadcasters(true) }}
              className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${pkBattle?.status === 'active' ? 'bg-gradient-to-r from-red-500 to-orange-500 animate-pulse' : pkBattle?.status === 'pending' ? 'bg-yellow-500' : 'bg-white/20'}`}
              title="PK Battle"
            >
              <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          )}
          
          {/* Beauty Effects Button */}
          <button 
            onClick={() => setShowBeautyPanel(!showBeautyPanel)} 
            className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${beautySettings.enabled ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/20'}`}
            title={'Güzelleştirme Efektleri'}
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
          
          {/* Image Mode Toggle */}
          <button 
            onClick={handleToggleImageMode} 
            className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${isImageMode ? 'bg-green-500' : 'bg-white/20'}`}
            title={'Resim ile Yayın'}
          >
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>

          {/* Background Image Toggle */}
          <button 
            onClick={handleToggleBackground} 
            className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${backgroundUrl ? 'bg-blue-500' : 'bg-white/20'}`}
            title={'Arka Plan Resmi'}
          >
            <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
          
          {/* Enable remote audio button - shows when co-broadcast is active and audio not enabled */}
          {(hasActiveGuests || isCohost) && !remoteAudioEnabled && (
            <button 
              onClick={enableRemoteAudio} 
              className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center animate-pulse"
              title={'Sesi Aç'}
            >
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Beauty Effects Panel */}
      <AnimatePresence>
        {showBeautyPanel && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 inset-x-0 z-40"
          >
            <div className="bg-black/70 backdrop-blur-xl rounded-t-3xl overflow-hidden border-t border-purple-500/30">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-400" />
                  Güzelleştirme Efektleri
                </h3>
                <div className="flex items-center gap-3">
                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => updateBeautySettings({ ...beautySettings, enabled: !beautySettings.enabled })}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      beautySettings.enabled 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {beautySettings.enabled ? 'AÇIK' : 'KAPALI'}
                  </button>
                  <button onClick={() => setShowBeautyPanel(false)} className="text-white/60 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                {/* Presets */}
                <div className="mb-5">
                  <p className="text-white/50 text-xs mb-3 uppercase tracking-wider">Hazır Ayarlar</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {BEAUTY_PRESETS.map((preset, idx) => {
                      const isActive = beautySettings.enabled 
                        ? (beautySettings.smoothnessLevel === preset.settings.smoothnessLevel &&
                           beautySettings.lighteningLevel === preset.settings.lighteningLevel &&
                           beautySettings.rednessLevel === preset.settings.rednessLevel)
                        : idx === 0
                      return (
                        <button
                          key={idx}
                          onClick={() => applyBeautyPreset(idx)}
                          className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          <span className="mr-1.5">{preset.icon}</span>
                          {preset.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Manual Sliders */}
                <div className="space-y-5">
                  {/* Smoothness */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-white/80 text-sm">
                        <Droplet className="w-4 h-4 text-blue-400" />
                        <span>Cilt Pürüzsüzlüğü</span>
                      </div>
                      <span className="text-white/50 text-xs">{Math.round(beautySettings.smoothnessLevel * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(beautySettings.smoothnessLevel * 100)}
                      onChange={(e) => updateBeautySettings({ ...beautySettings, enabled: true, smoothnessLevel: Number(e.target.value) / 100 })}
                      className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-400 [&::-webkit-slider-thumb]:to-blue-500
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                        [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                        [&::-moz-range-thumb]:bg-gradient-to-r [&::-moz-range-thumb]:from-blue-400 [&::-moz-range-thumb]:to-blue-500
                        [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0"
                    />
                  </div>

                  {/* Brightness / Whitening */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-white/80 text-sm">
                        <Sun className="w-4 h-4 text-yellow-400" />
                        <span>Parlaklık / Beyazlatma</span>
                      </div>
                      <span className="text-white/50 text-xs">{Math.round(beautySettings.lighteningLevel * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(beautySettings.lighteningLevel * 100)}
                      onChange={(e) => updateBeautySettings({ ...beautySettings, enabled: true, lighteningLevel: Number(e.target.value) / 100 })}
                      className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-yellow-400 [&::-webkit-slider-thumb]:to-orange-400
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                        [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                        [&::-moz-range-thumb]:bg-gradient-to-r [&::-moz-range-thumb]:from-yellow-400 [&::-moz-range-thumb]:to-orange-400
                        [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0"
                    />
                  </div>

                  {/* Redness / Rosy Cheeks */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-white/80 text-sm">
                        <Heart className="w-4 h-4 text-pink-400" />
                        <span>Allık / Kızarıklık</span>
                      </div>
                      <span className="text-white/50 text-xs">{Math.round(beautySettings.rednessLevel * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(beautySettings.rednessLevel * 100)}
                      onChange={(e) => updateBeautySettings({ ...beautySettings, enabled: true, rednessLevel: Number(e.target.value) / 100 })}
                      className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-pink-400 [&::-webkit-slider-thumb]:to-rose-500
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                        [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                        [&::-moz-range-thumb]:bg-gradient-to-r [&::-moz-range-thumb]:from-pink-400 [&::-moz-range-thumb]:to-rose-500
                        [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0"
                    />
                  </div>

                  {/* Contrast Level */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-white/80 text-sm">
                        <Sun className="w-4 h-4 text-purple-400" />
                        <span>Kontrast Seviyesi</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { value: 0 as const, label: 'Düşük' },
                        { value: 1 as const, label: 'Normal' },
                        { value: 2 as const, label: 'Yüksek' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateBeautySettings({ ...beautySettings, enabled: true, lighteningContrastLevel: opt.value })}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            beautySettings.lighteningContrastLevel === opt.value
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                              : 'bg-white/10 text-white/60 hover:bg-white/20'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={() => setShowBeautyPanel(false)}
                  className="w-full py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white font-medium rounded-xl hover:from-purple-500/30 hover:to-pink-500/30 transition-all border border-purple-500/30"
                >
                  Tamam
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Co-Broadcast Request Popup */}
      <AnimatePresence>
        {pendingCoBroadcastRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm text-center border border-white/10"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <UserPlus className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-xl font-bold text-white mb-2">
                {'Ortak Yayın Talebi!'}
              </h2>
              
              <div className="flex items-center justify-center gap-3 mb-4">
                {pendingCoBroadcastRequest.user.image ? (
                  <Image src={pendingCoBroadcastRequest.user.image} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{pendingCoBroadcastRequest.user.name[0]}</span>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-white font-semibold">{pendingCoBroadcastRequest.user.name}</p>
                  <p className="text-white/60 text-sm">
                    {'ortak yayın yapmak istiyor'}
                  </p>
                </div>
              </div>
              
              <p className="text-white/70 text-sm mb-6">
                {'Kabul ederseniz ekran ikiye bölünecek ve birlikte yayın yapacaksınız.'}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleRejectCoBroadcastRequest()}
                  className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                  {'Reddet'}
                </button>
                <button
                  onClick={() => handleAcceptCoBroadcastRequest()}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-green-400 hover:to-green-500"
                >
                  <Phone className="w-5 h-5" />
                  {'Kabul Et'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel Modal (Broadcaster Management) */}
      <AnimatePresence>
        {showPanel && !isCohost && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute left-3 right-3 bottom-48 z-30 bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-xl rounded-2xl p-4 border border-white/10 max-h-[50vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Panel
              </h3>
              <button onClick={() => setShowPanel(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Moderators Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80 text-sm flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-green-400" />
                  {'Moderatörler'} ({moderators.length}/10)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {moderators.map(mod => (
                  <div key={mod.id} className="flex items-center gap-1.5 bg-green-500/20 px-2 py-1 rounded-full">
                    {mod.user.image ? (
                      <Image src={mod.user.image} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">{mod.user.name[0]}</span>
                      </div>
                    )}
                    <span className="text-green-400 text-xs">{mod.user.name}</span>
                    <button onClick={() => handleRemoveModerator(mod.userId)} className="text-red-400 hover:text-red-300">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {moderators.length === 0 && (
                  <span className="text-white/40 text-xs">{'Henüz moderatör yok'}</span>
                )}
              </div>
            </div>
            
            {/* Fortune Requesters Section (sorted by jeton amount) */}
            <div className="mb-4">
              <span className="text-white/80 text-sm flex items-center gap-1.5 mb-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                {'Fal İsteyenler'} ({fortuneRequesters.length})
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {fortuneRequesters.map((req, index) => (
                  <motion.div 
                    key={req.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl cursor-pointer hover:bg-white/10"
                    onClick={() => handleOpenFortuneRequest(req)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 text-xs font-bold">#{index + 1}</span>
                      <span className="text-lg">{req.typeIcon}</span>
                      {!req.isHidden && req.user.image ? (
                        <Image src={req.user.image} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{req.isHidden ? '?' : (req.nickname || req.user.name)[0]}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-white text-xs font-medium">
                          {req.isHidden ? ('Gizli Kullanıcı') : (req.nickname || req.user.name)}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 text-[10px] font-bold">{req.jetonAmount} jeton</span>
                          <span className="text-white/50 text-[10px]">{req.typeName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {req.question && (
                        <span className="text-blue-400 text-lg">💬</span>
                      )}
                      <span className="text-white/50 text-lg">👁</span>
                    </div>
                  </motion.div>
                ))}
                {fortuneRequesters.length === 0 && (
                  <p className="text-white/40 text-xs text-center py-4">{'Henüz fal isteyen yok'}</p>
                )}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleToggleImageMode}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${isImageMode ? 'bg-green-500 text-white' : 'bg-white/10 text-white'}`}
              >
                <ImageIcon className="w-4 h-4" />
                {'Resim Modu'}
              </button>
              <button 
                onClick={handleToggleBackground}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${backgroundUrl ? 'bg-blue-500 text-white' : 'bg-white/10 text-white'}`}
              >
                <Palette className="w-4 h-4" />
                {'Arka Plan'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Selection Modal - Admin uploaded images only */}
      <AnimatePresence>
        {showImageUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowImageUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-xl rounded-3xl p-5 w-full max-w-md text-center border border-white/10 max-h-[80vh] flex flex-col"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-3">
                <ImageIcon className="w-7 h-7 text-white" />
              </div>
              
              <h2 className="text-lg font-bold text-white mb-1">
                {'Ekran Görüntüsü Seç'}
              </h2>
              
              <p className="text-white/60 text-xs mb-4">
                {'Kamera yerine gösterilecek bir resim seçin'}
              </p>
              
              {/* Image Grid */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {adminBroadcastImages.length === 0 ? (
                  <div className="py-8 text-center">
                    <ImageIcon className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">
                      {'Henüz resim eklenmemiş'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {adminBroadcastImages.map((image) => (
                      <motion.button
                        key={image.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectAdminImage(image)}
                        className={`relative aspect-video rounded-xl overflow-hidden border-2 transition ${
                          broadcastImage === image.imageUrl 
                            ? 'border-green-500 ring-2 ring-green-500/50' 
                            : 'border-white/10 hover:border-purple-500/50'
                        }`}
                      >
                        <Image
                          src={image.imageUrl}
                          alt={image.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-white text-xs font-medium truncate">{image.name}</p>
                        </div>
                        {broadcastImage === image.imageUrl && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setShowImageUpload(false)}
                className="w-full bg-white/10 text-white py-2.5 rounded-xl font-semibold mt-4 text-sm"
              >
                {'İptal'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Selector Modal */}
      <AnimatePresence>
        {showBackgroundSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowBackgroundSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-br from-blue-900/95 to-purple-900/95 backdrop-blur-xl rounded-3xl p-5 w-full max-w-md text-center border border-white/10 max-h-[80vh] flex flex-col"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mx-auto mb-3">
                <Palette className="w-7 h-7 text-white" />
              </div>
              
              <h2 className="text-lg font-bold text-white mb-1">
                Arka Plan Seç
              </h2>
              
              <p className="text-white/60 text-xs mb-4">
                Yayın arka planı olarak kullanılacak resmi seçin
              </p>
              
              <div className="flex-1 overflow-y-auto min-h-0">
                {adminBroadcastImages.length === 0 ? (
                  <div className="py-8 text-center">
                    <Palette className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">
                      Henüz arka plan resmi eklenmemiş
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {adminBroadcastImages.map((image) => (
                      <motion.button
                        key={image.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectBackground(image)}
                        className={`relative aspect-video rounded-xl overflow-hidden border-2 transition ${
                          backgroundUrl === image.imageUrl 
                            ? 'border-blue-500 ring-2 ring-blue-500/50' 
                            : 'border-white/10 hover:border-blue-500/50'
                        }`}
                      >
                        <Image
                          src={image.imageUrl}
                          alt={image.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-white text-xs font-medium truncate">{image.name}</p>
                        </div>
                        {backgroundUrl === image.imageUrl && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setShowBackgroundSelector(false)}
                className="w-full bg-white/10 text-white py-2.5 rounded-xl font-semibold mt-4 text-sm"
              >
                İptal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fortune Request Detail Popup */}
      <AnimatePresence>
        {selectedFortuneRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedFortuneRequest(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-amber-900/95 to-amber-950/95 backdrop-blur-xl rounded-3xl p-5 w-full max-w-sm border border-amber-500/30"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{selectedFortuneRequest.typeIcon}</span>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {selectedFortuneRequest.typeName}
                    </h2>
                    <p className="text-amber-400 font-bold">
                      {selectedFortuneRequest.jetonAmount} jeton
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedFortuneRequest(null)}>
                  <X className="w-6 h-6 text-white/70" />
                </button>
              </div>
              
              {/* User Info */}
              <div className="bg-white/10 rounded-xl p-3 mb-4 flex items-center gap-3">
                {!selectedFortuneRequest.isHidden && selectedFortuneRequest.user.image ? (
                  <Image src={selectedFortuneRequest.user.image} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      {selectedFortuneRequest.isHidden ? '?' : (selectedFortuneRequest.nickname || selectedFortuneRequest.user.name)[0]}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-white font-medium">
                    {selectedFortuneRequest.isHidden 
                      ? ('Gizli Kullanıcı')
                      : (selectedFortuneRequest.nickname || selectedFortuneRequest.user.name)}
                  </p>
                  {selectedFortuneRequest.isHidden && (
                    <p className="text-white/50 text-xs">
                      {'Gerçek isim gizlenmiş'}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Question */}
              {selectedFortuneRequest.question && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                  <p className="text-blue-400 text-sm font-medium mb-2 flex items-center gap-2">
                    <span>💬</span>
                    {'Soru:'}
                  </p>
                  <p className="text-white">{selectedFortuneRequest.question}</p>
                </div>
              )}
              
              {!selectedFortuneRequest.question && (
                <div className="bg-white/5 rounded-xl p-4 mb-4 text-center">
                  <p className="text-white/50 text-sm">
                    {'Soru belirtilmemiş'}
                  </p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => handleCompleteFortuneRequest(selectedFortuneRequest.id)}
                  className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                >
                  <span>✓</span>
                  {'Fala Baktım - Tamamla'}
                </button>
                
                <button
                  onClick={() => handleRefundFortuneRequest(selectedFortuneRequest.id)}
                  className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-white/10 text-white"
                >
                  <span>↩</span>
                  {'İade Et (Bakamıyorum)'}
                </button>
              </div>
              
              <p className="text-white/40 text-xs text-center mt-3">
                {'Tamamla butonu jetonu size aktarır. İade butonu kullanıcıya geri verir.'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Modal with Fortune Requests Section */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1a1a1a] rounded-2xl p-5 w-full max-w-sm">
              {/* Header */}
              <div className="text-center mb-4">
                <Radio className="w-10 h-10 text-[#fe2c55] mx-auto mb-3" />
                <h2 className="text-lg font-bold text-white mb-1">{'Yayını Kapat'}</h2>
                <p className="text-white/60 text-sm">{formatDuration(duration)}</p>
                {totalGiftJetons > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-2 text-yellow-400">
                    <Coins className="w-4 h-4" />
                    <span className="font-bold">+{totalGiftJetons}</span>
                  </div>
                )}
              </div>
              
              {/* Fortune Requests Section */}
              {fortuneRequesters.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80 text-sm flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-400" />
                      {'Fal İstekleri'}
                    </span>
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                      {fortuneRequesters.length}
                    </span>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl max-h-48 overflow-y-auto divide-y divide-white/10">
                    {fortuneRequesters.map((req, index) => (
                      <div 
                        key={req.id}
                        className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
                        onClick={() => { setShowEndConfirm(false); handleOpenFortuneRequest(req); }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 text-xs font-bold">#{index + 1}</span>
                          <span className="text-lg">{req.typeIcon}</span>
                          {!req.isHidden && req.user.image ? (
                            <Image src={req.user.image} alt="" width={24} height={24} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold">{req.isHidden ? '?' : (req.nickname || req.user.name)[0]}</span>
                            </div>
                          )}
                          <div>
                            <p className="text-white text-xs font-medium truncate max-w-24">
                              {req.isHidden ? ('Gizli') : (req.nickname || req.user.name)}
                            </p>
                            <p className="text-amber-400 text-[10px] font-bold">{req.jetonAmount} jeton</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {req.question && <span className="text-blue-400 text-sm">💬</span>}
                          <span className="text-white/40 text-sm">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-amber-400 text-xs text-center mt-2">
                    ⚠️ {'Yayını bitirirsen tüm bekleyen istekler iade edilecek!'}
                  </p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button onClick={() => setShowEndConfirm(false)} className="flex-1 bg-white/10 text-white py-2.5 rounded-lg font-medium">
                  {'Devam Et'}
                </button>
                <button onClick={handleEndStream} className="flex-1 bg-[#fe2c55] text-white py-2.5 rounded-lg font-medium">
                  {'Bitir'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PK Battle Overlay */}
      {pkBattle && (pkBattle.status === 'active' || pkBattle.status === 'completed') && (
        <PKBattleOverlay
          battle={pkBattle}
          currentStreamId={streamId}
          onEnd={handleEndPK}
        />
      )}

      {/* PK Request Popup (incoming) */}
      <AnimatePresence>
        {pendingPKRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-red-900/95 to-orange-900/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm text-center border border-yellow-500/30"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-4"
              >
                <Swords className="w-10 h-10 text-white" />
              </motion.div>
              
              <h2 className="text-xl font-bold text-white mb-2">PK İsteği! ⚔️</h2>
              
              <div className="flex items-center justify-center gap-3 mb-4">
                {pendingPKRequest.user1?.image ? (
                  <Image src={pendingPKRequest.user1.image} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover border-2 border-yellow-500" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center border-2 border-yellow-500">
                    <span className="text-white font-bold text-lg">{(pendingPKRequest.user1?.name || '?')[0]}</span>
                  </div>
                )}
                <span className="text-yellow-400 font-bold text-lg">{pendingPKRequest.user1?.name || 'Yayıncı'}</span>
              </div>
              
              <p className="text-white/70 text-sm mb-4">
                sizi {Math.floor(pendingPKRequest.duration / 60)} dakikalık PK&apos;ya davet ediyor!
              </p>
              
              <div className="flex gap-3">
                <button onClick={handleRejectPK} className="flex-1 bg-white/10 text-white py-3 rounded-xl font-bold hover:bg-white/20 transition">
                  Reddet
                </button>
                <button onClick={handleAcceptPK} className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 rounded-xl font-bold hover:from-red-600 hover:to-orange-600 transition">
                  Kabul Et ⚔️
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Host Control Panel */}
      {!isCohost && (
        <HostControlPanel
          streamId={streamId}
          guests={hostControlGuests}
          pendingRequests={hostPendingRequests}
          maxGuests={MAX_GUESTS}
          onAcceptRequest={(userId) => handleAcceptCoBroadcastRequest(userId)}
          onRejectRequest={(userId) => handleRejectCoBroadcastRequest(userId)}
          onMuteGuest={(userId) => handleMuteCoBroadcaster(userId, true)}
          onUnmuteGuest={(userId) => handleMuteCoBroadcaster(userId, false)}
          onVideoOffGuest={(userId) => handleVideoOffCoBroadcaster(userId, true)}
          onVideoOnGuest={(userId) => handleVideoOffCoBroadcaster(userId, false)}
          onKickGuest={(userId) => handleRemoveCoBroadcaster(userId)}
          onInviteViewer={() => setShowViewers(true)}
          onClose={() => setShowHostControls(false)}
          isVisible={showHostControls}
        />
      )}

      {/* PK Modal - Select broadcaster to challenge */}
      <AnimatePresence>
        {showPKModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-end z-50"
            onClick={() => setShowPKModal(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-t-3xl p-6 w-full max-h-[70vh] overflow-y-auto border-t border-yellow-500/30"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Swords className="w-5 h-5 text-yellow-400" /> PK Başlat
                </h3>
                <button onClick={() => setShowPKModal(false)} className="text-white/60"><X className="w-5 h-5" /></button>
              </div>
              
              {/* PK Duration selector */}
              <div className="flex gap-2 mb-4">
                {[60, 180, 300, 600].map(d => (
                  <button
                    key={d}
                    onClick={() => setPkDuration(d)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${pkDuration === d ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white' : 'bg-white/10 text-white/60'}`}
                  >
                    {d >= 60 ? `${Math.floor(d / 60)} dk` : `${d} sn`}
                  </button>
                ))}
              </div>

              {/* Active PK status */}
              {pkBattle && (pkBattle.status === 'pending' || pkBattle.status === 'active') && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                  <p className="text-yellow-400 text-sm font-medium mb-2">
                    {pkBattle.status === 'pending' ? '⏳ PK isteği bekleniyor...' : '⚔️ PK devam ediyor!'}
                  </p>
                  <button onClick={pkBattle.status === 'pending' ? handleCancelPK : handleEndPK} className="bg-red-500/20 text-red-400 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-500/30 transition">
                    {pkBattle.status === 'pending' ? 'İptal Et' : 'PK Bitir'}
                  </button>
                </div>
              )}
              {/* Completed PK status - user can dismiss */}
              {pkBattle && pkBattle.status === 'completed' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                  <p className="text-green-400 text-sm font-medium mb-2">
                    🏆 PK tamamlandı! {pkBattle.score1} - {pkBattle.score2}
                  </p>
                  <button onClick={() => setPkBattle(null)} className="bg-white/10 text-white/70 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-white/20 transition">
                    Sonucu Kapat
                  </button>
                </div>
              )}
              
              {/* Live broadcasters list */}
              <p className="text-white/40 text-xs mb-3">Canlı yayıncıları seçerek PK başlatın:</p>
              {liveBroadcasters.filter(b => b.userId !== session?.user?.id).length === 0 ? (
                <p className="text-white/40 text-sm text-center py-8">Şu an başka canlı yayıncı yok</p>
              ) : (
                <div className="space-y-2">
                  {liveBroadcasters.filter(b => b.userId !== session?.user?.id).map(b => (
                    <button
                      key={b.id}
                      onClick={() => handleStartPK(b.id)}
                      disabled={!!pkBattle && (pkBattle.status === 'pending' || pkBattle.status === 'active')}
                      className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl p-3 transition disabled:opacity-40"
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-red-500 shrink-0">
                        {b.user.image ? (
                          <Image src={b.user.image} alt="" fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold">{(b.user.name || '?')[0]}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-white font-medium text-sm truncate">{b.user.name || 'Yayıncı'}</p>
                        <p className="text-white/40 text-xs">{b.viewerCount} izleyici · {b.title || 'Canlı Yayın'}</p>
                      </div>
                      <div className="bg-gradient-to-r from-red-500 to-orange-500 px-3 py-1.5 rounded-lg">
                        <Swords className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
        />
      )}
    </div>
  )
}