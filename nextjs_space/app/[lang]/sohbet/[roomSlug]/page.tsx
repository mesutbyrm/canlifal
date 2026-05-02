'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import type { IAgoraRTCClient, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'
import { Send, Users, Sparkles, LogIn, VolumeX, Volume2, UserMinus, Ban, Shield, Crown, Star, Mic, MicOff, AtSign, Bell, X, Settings, ChevronDown, ChevronUp, Trash2, Home, DoorOpen, Phone, PhoneOff, Gift, Coins, Trophy } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'

interface Message {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string
    nickname?: string
    chatRole?: string
    roleSymbol?: string
    membership?: string
    role?: string
  }
}

interface ActiveUser {
  id: string
  name: string
  nickname?: string
  image?: string | null
  lastSeen: string
  chatRole?: string
  roleSymbol?: string
  roleLevel: number
  isAdmin: boolean
}

interface ChatRoom {
  id: string
  slug: string
  nameEn: string
  nameTr: string
  descEn: string
  descTr: string
  icon: string
  ownerId?: string | null
  owner?: { id: string; name: string; username?: string | null } | null
  userCount?: number
}

interface MyPermissions {
  role: string
  canMuteUsers: boolean
  canKickUsers: boolean
  canBanUsers: boolean
  canMuteRoom: boolean
  canGiveVoice: boolean
  canGiveOp: boolean
  canGiveSop: boolean
  canGiveFounder: boolean
  canManageRoom: boolean
  isGlobalAdmin: boolean
  isRoomOwner: boolean
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'text-yellow-300',
  founder: 'text-red-400',
  sop: 'text-orange-400',
  admin: 'text-orange-400', // backward compat
  op: 'text-green-400',
  voice: 'text-blue-400'
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  superadmin: <Shield className="w-3 h-3" />,
  founder: <Crown className="w-3 h-3" />,
  sop: <Shield className="w-3 h-3" />,
  admin: <Shield className="w-3 h-3" />, // backward compat
  op: <Star className="w-3 h-3" />,
  voice: <Mic className="w-3 h-3" />
}

const ROLE_BADGE_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  superadmin: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/60', text: 'text-yellow-300', label: '%Admin' },
  founder: { bg: 'bg-red-500/20', border: 'border-red-500/60', text: 'text-red-300', label: '~Kurucu' },
  sop: { bg: 'bg-orange-500/20', border: 'border-orange-500/60', text: 'text-orange-300', label: '&SOP' },
  admin: { bg: 'bg-orange-500/20', border: 'border-orange-500/60', text: 'text-orange-300', label: '&SOP' }, // backward compat
  op: { bg: 'bg-green-500/20', border: 'border-green-500/60', text: 'text-green-300', label: '@Operatör' },
  voice: { bg: 'bg-blue-500/20', border: 'border-blue-500/60', text: 'text-blue-300', label: '+Ses' },
}

const GIFT_IMAGES: Record<string, string> = {
  // Empty - icons now come from DB as image paths
}

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomSlug = params.roomSlug as string
  const { data: session } = useSession() || {}
  const { language, t } = useLanguage()
  
  const [room, setRoom] = useState<ChatRoom | null>(null)
  const [allRooms, setAllRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [roomMuted, setRoomMuted] = useState(false)
  const [myPermissions, setMyPermissions] = useState<MyPermissions | null>(null)
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [voiceConnecting, setVoiceConnecting] = useState(false)
  
  // Nickname system
  const [nickname, setNickname] = useState('')
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  
  // Mention notifications
  const [mentionNotification, setMentionNotification] = useState<{from: string, content: string} | null>(null)
  const mentionShownCountRef = useRef<Map<string, number>>(new Map()) // messageId -> show count
  
  // VIP entry auto-hide (after 3 seconds)
  const [hiddenVipEntries, setHiddenVipEntries] = useState<Set<string>>(new Set())
  
  // Combined Management Popup
  const [showManagePopup, setShowManagePopup] = useState(false)
  const [manageTab, setManageTab] = useState<'chat' | 'users' | 'modlist'>('chat')
  const [bannedUsers, setBannedUsers] = useState<Array<{id: string; userId: string; user: {id: string; name: string}}>>([])
  const [mutedUsers, setMutedUsers] = useState<Array<{id: string; userId: string; user: {id: string; name: string}; expiresAt: string | null}>>([])
  const [loadingModList, setLoadingModList] = useState(false)
  
  // Rooms Popup
  const [showRoomsPopup, setShowRoomsPopup] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(true)
  
  // Voice Chat with Agora
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false) // For listen-only mode (audience)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set())
  const [voiceUsers, setVoiceUsers] = useState<Array<{id: string, name: string}>>([])
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null)
  const agoraAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null)
  const agoraUidMapRef = useRef<Map<number, string>>(new Map()) // Agora UID -> userId
  
  // Gift system
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [giftTargetUser, setGiftTargetUser] = useState<ActiveUser | null>(null)
  const [giftTypes, setGiftTypes] = useState<Array<{id: string; name: string; icon: string; price: number}>>([])
  const [selectedGiftType, setSelectedGiftType] = useState<string | null>(null)
  const giftPaymentType = 'jeton' as const
  const [sendingGift, setSendingGift] = useState(false)
  const [giftAnimations, setGiftAnimations] = useState<Array<{id: string; giftImage: string; giftIcon: string; senderName: string; recipientId: string; recipientName: string; amount: number; phase: 'enter' | 'hit' | 'burst' | 'exit'}>>([])
  const lastGiftPollRef = useRef<string>(new Date().toISOString())
  const seenGiftIdsRef = useRef<Set<string>>(new Set())
  const [leaderboard, setLeaderboard] = useState<Array<{userId: string; name: string; image: string | null; jetonTotal: number; cfcTotal: number}>>([])
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  const [showGiftUserSelect, setShowGiftUserSelect] = useState(false)
  const [showMobileUsers, setShowMobileUsers] = useState(false)
  
  // User balance
  const [userJetonBalance, setUserJetonBalance] = useState(0)
  const [userCfcBalance, setUserCfcBalance] = useState(0)
  
  // Broadcast images for profile pictures in grid
  const [broadcastImages, setBroadcastImages] = useState<Array<{id: string; name: string; imageUrl: string}>>([])
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [myBroadcastImage, setMyBroadcastImage] = useState<string | null>(null)
  
  // Grid user limit from admin settings
  const [gridUserLimit, setGridUserLimit] = useState(6)
  
  const voiceUsersPollRef = useRef<NodeJS.Timeout | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousMessagesCount = useRef(0)

  // Handle mobile keyboard - ensure input stays visible
  const handleInputFocus = useCallback(() => {
    // Force recalculate --vh after keyboard animation completes
    const recalc = () => {
      const height = window.visualViewport?.height || window.innerHeight
      const vh = height * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      // Prevent page scroll - reset any scroll on document/window
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    // Multiple timeouts to catch different keyboard animation speeds
    setTimeout(recalc, 100)
    setTimeout(recalc, 300)
    setTimeout(recalc, 500)
  }, [])

  // Initialize audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + 'A'.repeat(100))
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      audioRef.current = {
        play: () => {
          if (!soundEnabled) return Promise.resolve()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          oscillator.frequency.value = 800
          oscillator.type = 'sine'
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.2)
          return Promise.resolve()
        }
      } as HTMLAudioElement
    }
  }, [soundEnabled])

  // Handle mobile viewport height (keyboard open/close)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const setVH = () => {
      // Use visualViewport height when available (handles mobile keyboard)
      const height = window.visualViewport?.height || window.innerHeight
      const vh = height * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      // Prevent any document-level scrolling in chat room
      window.scrollTo(0, 0)
    }
    
    setVH()
    window.addEventListener('resize', setVH)
    
    // Also handle visual viewport for mobile keyboard
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH)
      window.visualViewport.addEventListener('scroll', setVH)
    }

    // Prevent document scroll entirely in chat room
    const preventScroll = (e: Event) => {
      if (!(e.target as HTMLElement)?.closest?.('.overflow-y-auto')) {
        window.scrollTo(0, 0)
      }
    }
    document.addEventListener('scroll', preventScroll, { passive: true })
    
    return () => {
      window.removeEventListener('resize', setVH)
      document.removeEventListener('scroll', preventScroll)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setVH)
        window.visualViewport.removeEventListener('scroll', setVH)
      }
    }
  }, [])

  // Fetch all rooms with user counts
  const fetchAllRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/rooms?withCounts=true')
      if (res.ok) {
        const rooms = await res.json()
        setAllRooms(rooms)
        const currentRoom = rooms.find((r: ChatRoom) => r.slug === roomSlug)
        if (currentRoom) {
          setRoom(currentRoom)
        }
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    }
  }, [roomSlug])

  // Fetch room info
  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/rooms')
      if (res.ok) {
        const rooms = await res.json()
        const currentRoom = rooms.find((r: ChatRoom) => r.slug === roomSlug)
        if (currentRoom) {
          setRoom(currentRoom)
        }
      }
    } catch (error) {
      console.error('Error fetching room:', error)
    }
  }, [roomSlug])

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!room) return
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setRoomMuted(data.roomMuted || false)
        setMyPermissions(data.myPermissions || null)
        if (data.myNickname) {
          setNickname(data.myNickname)
        }
        if (data.messages && data.messages.length > previousMessagesCount.current && previousMessagesCount.current > 0) {
          const lastMsg = data.messages[data.messages.length - 1]
          if (lastMsg.user.id !== session?.user?.id) {
            audioRef.current?.play()
          }
        }
        previousMessagesCount.current = data.messages?.length || 0
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }, [room, session?.user?.id])

  // Fetch active users
  const fetchActiveUsers = useCallback(async () => {
    if (!room) return
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/presence`)
      if (res.ok) {
        const data = await res.json()
        setActiveUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [room])

  // Update presence and immediately refresh active users
  const updatePresence = useCallback(async () => {
    if (!room || !session?.user) return
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname || session.user.name })
      })
      // After posting presence, immediately fetch updated user list
      if (res.ok) {
        fetchActiveUsers()
      }
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }, [room, session?.user, nickname, fetchActiveUsers])

  // Check for bans
  const checkBan = useCallback(async () => {
    if (!room || !session?.user) return
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/messages`)
      if (!res.ok) {
        const data = await res.json()
        if (data.error === 'banned') {
          setError('banned')
        }
      }
    } catch (error) {
      console.error('Error checking ban:', error)
    }
  }, [room, session?.user])

  // Fetch voice users (for everyone to see who's in voice chat)
  const fetchVoiceUsers = useCallback(async () => {
    if (!room) return
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/voice?since=0`)
      if (res.ok) {
        const { voiceUsers: users } = await res.json()
        setVoiceUsers(users || [])
        // Update Agora UID → userId mapping for speaking detection
        for (const u of (users || [])) {
          if (u.agoraUid) {
            agoraUidMapRef.current.set(u.agoraUid, u.id)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching voice users:', error)
    }
  }, [room])

  // Fetch broadcast images for profile picture selection
  const fetchBroadcastImages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/broadcast-images')
      if (res.ok) {
        const data = await res.json()
        setBroadcastImages(data)
      }
    } catch (err) { console.error('Broadcast images fetch error:', err) }
  }, [])

  // Load saved broadcast image from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.id) {
      const saved = localStorage.getItem(`chat_broadcast_img_${session.user.id}`)
      if (saved) setMyBroadcastImage(saved)
    }
  }, [session?.user?.id])

  // Fetch typing users
  const fetchTypingUsers = useCallback(async () => {
    if (!room || !session?.user?.id) return
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/typing`)
      if (res.ok) {
        const { typingUsers: users } = await res.json()
        // Filter out current user and get just names
        const otherTypingUsers = (users || [])
          .filter((u: { id: string; name: string }) => u.id !== session.user?.id)
          .map((u: { id: string; name: string }) => u.name)
        setTypingUsers(otherTypingUsers)
      }
    } catch (error) {
      console.error('Error fetching typing users:', error)
    }
  }, [room, session?.user?.id])

  // Fetch user balance
  const fetchBalance = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/user/credits')
      if (res.ok) {
        const data = await res.json()
        setUserJetonBalance(data.jetonBalance ?? 0)
        setUserCfcBalance(data.credits ?? 0)
      }
    } catch {}
  }, [session?.user])

  // Fetch grid limit from settings
  useEffect(() => {
    fetch('/api/settings/public?key=chat_grid_user_limit')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.value) setGridUserLimit(Math.min(8, Math.max(1, parseInt(data.value)))) })
      .catch(() => {})
  }, [])

  // Initialize
  useEffect(() => {
    fetchAllRooms()
  }, [fetchAllRooms])

  useEffect(() => {
    if (room) {
      fetchMessages()
      fetchActiveUsers()
      checkBan()
      fetchVoiceUsers()
      fetchTypingUsers()
      fetchBroadcastImages()
      fetchBalance()
      setLoading(false)

      const messageInterval = setInterval(fetchMessages, 3000)
      const userInterval = setInterval(fetchActiveUsers, 5000)
      const presenceInterval = setInterval(updatePresence, 10000)
      const roomsInterval = setInterval(fetchAllRooms, 60000)
      const voiceUsersInterval = setInterval(fetchVoiceUsers, 5000)
      const typingInterval = setInterval(fetchTypingUsers, 2000)
      const balanceInterval = setInterval(fetchBalance, 30000)

      updatePresence()

      // Remove presence when leaving page (intentional leave - show message)
      const handleBeforeUnload = () => {
        if (room?.id) {
          navigator.sendBeacon(`/api/chat/rooms/${room.id}/presence?_delete=1&leave=1`, '')
        }
      }
      window.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        clearInterval(messageInterval)
        clearInterval(userInterval)
        clearInterval(presenceInterval)
        clearInterval(roomsInterval)
        clearInterval(voiceUsersInterval)
        clearInterval(typingInterval)
        clearInterval(balanceInterval)
        window.removeEventListener('beforeunload', handleBeforeUnload)
        // Send leave beacon on cleanup (covers client-side navigation)
        if (room?.id) {
          navigator.sendBeacon(`/api/chat/rooms/${room.id}/presence?_delete=1&leave=1`, '')
        }
      }
    }
  }, [room, fetchMessages, fetchActiveUsers, checkBan, updatePresence, fetchAllRooms, fetchVoiceUsers, fetchTypingUsers, fetchBroadcastImages, fetchBalance])

  // Auto-scroll - use scrollTop on container to prevent parent scroll
  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  // ─── Agora Voice Chat ──────────────────────────────────────────
  // Helper: generate a stable numeric UID from user ID string
  const userIdToAgoraUid = useCallback((uid: string): number => {
    let hash = 0
    for (let i = 0; i < uid.length; i++) {
      hash = ((hash << 5) - hash + uid.charCodeAt(i)) | 0
    }
    return Math.abs(hash) % 1000000000 // Keep within safe range
  }, [])

  // Start voice chat as HOST (can speak)
  const startVoiceChat = async () => {
    if (voiceConnecting || !room) return
    setVoiceConnecting(true)

    try {
      // 1. Check voice permission on the server first
      const joinRes = await fetch(`/api/chat/rooms/${room.id}/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'join' })
      })

      if (!joinRes.ok) {
        setVoiceConnecting(false)
        if (joinRes.status === 403) {
          alert('Sesli sohbet için yetkiniz yok. Oda sahibi veya yetkili size "+" (voice) rolü vermelidir.')
          return
        }
        throw new Error('Failed to join voice')
      }

      const joinData = await joinRes.json()
      const agoraUid = joinData.agoraUid as number

      // 2. Lazy-import Agora helpers
      const { createAgoraClient, fetchAgoraToken, createLocalAudioTrack } = await import('@/lib/agora-client')

      // 3. Create Agora client in host mode
      const client = await createAgoraClient('host')
      agoraClientRef.current = client

      // 4. Get token and join channel
      const channelName = `voice_room_${room.id}`
      const { token, appId } = await fetchAgoraToken(channelName, 'host', agoraUid)
      await client.join(appId, channelName, token, agoraUid)

      // 5. Create and publish mic audio track
      const audioTrack = await createLocalAudioTrack()
      agoraAudioTrackRef.current = audioTrack
      await client.publish([audioTrack])

      // 6. Map own UID
      if (session?.user?.id) {
        agoraUidMapRef.current.set(agoraUid, session.user.id)
      }

      // 7. Enable volume indicator for speaking detection
      client.enableAudioVolumeIndicator()
      client.on('volume-indicator', (volumes) => {
        const newSpeaking = new Set<string>()
        for (const vol of volumes) {
          if (vol.level > 5) {
            const mappedUserId = agoraUidMapRef.current.get(vol.uid as number)
            if (mappedUserId) newSpeaking.add(mappedUserId)
          }
        }
        setSpeakingUsers(newSpeaking)
        // Update own speaking status
        if (session?.user?.id) {
          const amISpeaking = newSpeaking.has(session.user.id)
          setIsSpeaking(amISpeaking)
        }
      })

      // 8. Handle remote users joining/leaving
      client.on('user-published', async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType)
        if (mediaType === 'audio') {
          remoteUser.audioTrack?.play()
        }
      })
      client.on('user-unpublished', (remoteUser, mediaType) => {
        if (mediaType === 'audio') {
          remoteUser.audioTrack?.stop()
        }
      })

      setVoiceEnabled(true)
      setVoiceConnecting(false)
      console.log('Agora voice chat started as host')

      // 9. Refresh voice users list
      fetchVoiceUsers()

    } catch (error: unknown) {
      console.error('Error starting Agora voice chat:', error)
      setVoiceConnecting(false)
      // Cleanup on failure
      if (agoraAudioTrackRef.current) {
        agoraAudioTrackRef.current.close()
        agoraAudioTrackRef.current = null
      }
      if (agoraClientRef.current) {
        try { await agoraClientRef.current.leave() } catch {}
        agoraClientRef.current = null
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
        alert('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini verin.')
      } else {
        alert('Sesli sohbet başlatılamadı')
      }
    }
  }

  // Stop voice chat (host)
  const stopVoiceChat = useCallback(async () => {
    // Tell server we're leaving
    if (room && voiceEnabled) {
      fetch(`/api/chat/rooms/${room.id}/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'leave' })
      }).catch(() => {})
    }

    // Close Agora audio track
    if (agoraAudioTrackRef.current) {
      agoraAudioTrackRef.current.close()
      agoraAudioTrackRef.current = null
    }

    // Leave Agora channel
    if (agoraClientRef.current) {
      try {
        agoraClientRef.current.removeAllListeners()
        await agoraClientRef.current.leave()
      } catch {}
      agoraClientRef.current = null
    }

    agoraUidMapRef.current.clear()
    setVoiceEnabled(false)
    setIsListening(false)
    setIsSpeaking(false)
    setSpeakingUsers(new Set())
    fetchVoiceUsers()
  }, [room, voiceEnabled, fetchVoiceUsers])

  // Listen-only mode (audience) — no mic required
  const startListening = async () => {
    if (!room) return

    try {
      const { createAgoraClient, fetchAgoraToken } = await import('@/lib/agora-client')

      const client = await createAgoraClient('audience')
      agoraClientRef.current = client

      const channelName = `voice_room_${room.id}`
      const uid = session?.user?.id ? userIdToAgoraUid(session.user.id) : 0
      const { token, appId } = await fetchAgoraToken(channelName, 'audience', uid)
      await client.join(appId, channelName, token, uid)

      // Enable volume indicator for speaking detection (audience can see who speaks)
      client.enableAudioVolumeIndicator()
      client.on('volume-indicator', (volumes) => {
        const newSpeaking = new Set<string>()
        for (const vol of volumes) {
          if (vol.level > 5) {
            const mappedUserId = agoraUidMapRef.current.get(vol.uid as number)
            if (mappedUserId) newSpeaking.add(mappedUserId)
          }
        }
        setSpeakingUsers(newSpeaking)
      })

      // Subscribe to remote audio automatically
      client.on('user-published', async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType)
        if (mediaType === 'audio') {
          remoteUser.audioTrack?.play()
        }
      })
      client.on('user-unpublished', (remoteUser, mediaType) => {
        if (mediaType === 'audio') {
          remoteUser.audioTrack?.stop()
        }
      })

      setIsListening(true)
      console.log('Agora voice listen mode started')
    } catch (error) {
      console.error('Error starting listen mode:', error)
    }
  }

  // Stop listening (audience)
  const stopListening = useCallback(async () => {
    if (agoraClientRef.current) {
      try {
        agoraClientRef.current.removeAllListeners()
        await agoraClientRef.current.leave()
      } catch {}
      agoraClientRef.current = null
    }
    agoraUidMapRef.current.clear()
    setIsListening(false)
    setSpeakingUsers(new Set())
  }, [])

  // Cleanup voice on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (agoraAudioTrackRef.current) {
        agoraAudioTrackRef.current.close()
      }
      if (agoraClientRef.current) {
        agoraClientRef.current.removeAllListeners()
        agoraClientRef.current.leave().catch(() => {})
      }
    }
  }, [])

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !room || !session?.user || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })
      })

      if (res.ok) {
        setNewMessage('')
        fetchMessages()
        // Keep input focused after sending
        requestAnimationFrame(() => inputRef.current?.focus())
      } else {
        const data = await res.json()
        if (data.error === 'muted') {
          setError('Bu odada susturuldunuz')
        } else if (data.error === 'banned') {
          setError('banned')
        } else if (data.error === 'room_muted') {
          setError('Oda şu anda sessiz modda')
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  // Typing indicator
  const handleTyping = useCallback(() => {
    if (!room || !session?.user) return
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    fetch(`/api/chat/rooms/${room.id}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isTyping: true })
    }).catch(() => {})

    typingTimeoutRef.current = setTimeout(() => {
      fetch(`/api/chat/rooms/${room.id}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: false })
      }).catch(() => {})
    }, 3000)
  }, [room, session?.user])

  // Nickname modal
  const saveNickname = async () => {
    const nameToSave = nicknameInput.trim() || session?.user?.name || ''
    setNickname(nameToSave)
    setShowNicknameModal(false)
    await updatePresence()
  }

  // Mentions
  const addMention = (name: string) => {
    setNewMessage(prev => prev + `@${name} `)
    inputRef.current?.focus()
  }

  // Check for mentions (max 3 times per message)
  useEffect(() => {
    if (!nickname || messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.user.id !== session?.user?.id && lastMsg.content.toLowerCase().includes(`@${nickname.toLowerCase()}`)) {
      const msgId = lastMsg.id
      const count = mentionShownCountRef.current.get(msgId) || 0
      if (count < 3) {
        mentionShownCountRef.current.set(msgId, count + 1)
        setMentionNotification({ from: lastMsg.user.nickname || lastMsg.user.name, content: lastMsg.content })
        audioRef.current?.play()
        setTimeout(() => setMentionNotification(null), 5000)
      }
    }
  }, [messages, nickname, session?.user?.id])

  // Moderation actions
  const performModAction = async (action: string, targetUserId: string, options: Record<string, unknown> = {}) => {
    if (!room) return
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUserId, ...options })
      })
      if (res.ok) {
        fetchActiveUsers()
        setSelectedUser(null)
        if (action === 'mute_room' || action === 'unmute_room') {
          fetchMessages()
        }
      } else {
        const errorData = await res.json()
        alert(errorData.error)
      }
    } catch (error) {
      console.error('Mod action error:', error)
    }
  }

  const toggleRoomMute = () => {
    performModAction(roomMuted ? 'unmute_room' : 'mute_room', '')
  }

  const fetchModList = useCallback(async () => {
    if (!room) return
    setLoadingModList(true)
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/moderation`)
      if (res.ok) {
        const data = await res.json()
        setBannedUsers(data.bans || [])
        setMutedUsers(data.mutes || [])
      }
    } catch (err) {
      console.error('Mod list fetch error:', err)
    } finally {
      setLoadingModList(false)
    }
  }, [room])

  const handleUnban = async (userId: string) => {
    await performModAction('unban_user', userId)
    fetchModList()
  }

  const handleUnmute = async (userId: string) => {
    await performModAction('unmute_user', userId)
    fetchModList()
  }

  const clearAllMessages = async () => {
    if (!room) return
    if (!confirm('Tüm mesajları silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_messages' })
      })
      if (res.ok) {
        setMessages([])
      } else {
        const errorData = await res.json()
        alert(errorData.error)
      }
    } catch (error) {
      console.error('Clear messages error:', error)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDisplayName = (user: {name: string, nickname?: string}) => {
    return user.nickname || user.name
  }

  // Get username effect class based on role/membership
  const getNameEffectClass = (user: { chatRole?: string; membership?: string; role?: string }) => {
    if (user.role === 'admin') return 'effect-glitch'
    if (user.chatRole === 'superadmin') return 'effect-glitch'
    if (user.chatRole === 'founder') return 'effect-glitch-flash'
    if (user.chatRole === 'sop' || user.chatRole === 'admin' || user.chatRole === 'op') return 'effect-glitch-flash'
    if (user.membership === 'diamond') return 'effect-neon-glow'
    if (user.membership === 'gold') return 'effect-neon-flicker'
    if (user.membership === 'premium') return 'effect-blink'
    return ''
  }

  // Check if user is room owner
  const isRoomOwner = (userId: string) => {
    return room?.ownerId === userId
  }

  // Check if current user can use voice (has voice permission, higher role, or is room owner)
  // ===== Gift System Functions =====
  const fetchGiftTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/gifts/types')
      if (res.ok) {
        const data = await res.json()
        setGiftTypes(data)
        if (data.length > 0) setSelectedGiftType(data[0].id)
      }
    } catch (err) { console.error('Gift types fetch error:', err) }
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    if (!room) return
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/gifts?after=${encodeURIComponent(lastGiftPollRef.current)}`)
      if (res.ok) {
        const data = await res.json()
        setLeaderboard(data.leaderboard || [])
        // Process recent gifts for animation
        const recent = data.recentGifts || []
        const newAnims: Array<{id: string; giftImage: string; giftIcon: string; senderName: string; recipientId: string; recipientName: string; amount: number; phase: 'enter' | 'hit' | 'burst' | 'exit'}> = []
        for (const g of recent) {
          if (!seenGiftIdsRef.current.has(g.id)) {
            seenGiftIdsRef.current.add(g.id)
            newAnims.push({
              id: g.id,
              giftImage: g.giftImage || GIFT_IMAGES[g.giftTypeId] || '',
              giftIcon: g.giftIcon || '🎁',
              senderName: g.senderName,
              recipientId: g.recipientId,
              recipientName: g.recipientName,
              amount: g.amount,
              phase: 'enter',
            })
          }
        }
        if (newAnims.length > 0) {
          setGiftAnimations(prev => [...prev, ...newAnims])
          // Phase transitions: enter(0) → hit(1s) → burst(2.5s) → exit(4s) → remove(5.5s)
          newAnims.forEach(a => {
            setTimeout(() => {
              setGiftAnimations(prev => prev.map(p => p.id === a.id ? { ...p, phase: 'hit' } : p))
            }, 1000)
            setTimeout(() => {
              setGiftAnimations(prev => prev.map(p => p.id === a.id ? { ...p, phase: 'burst' } : p))
            }, 2500)
            setTimeout(() => {
              setGiftAnimations(prev => prev.map(p => p.id === a.id ? { ...p, phase: 'exit' } : p))
            }, 4000)
            setTimeout(() => {
              setGiftAnimations(prev => prev.filter(p => p.id !== a.id))
            }, 5500)
          })
        }
        if (recent.length > 0) {
          lastGiftPollRef.current = recent[recent.length - 1].createdAt
        }
      }
    } catch (err) { console.error('Leaderboard fetch error:', err) }
  }, [room])

  const sendGift = async () => {
    if (!room || !giftTargetUser || !selectedGiftType || sendingGift) return
    setSendingGift(true)
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/gifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: giftTargetUser.id, giftTypeId: selectedGiftType, paymentType: giftPaymentType })
      })
      if (res.ok) {
        setShowGiftModal(false)
        setGiftTargetUser(null)
        // Gift animation will be triggered via polling for ALL users
        fetchLeaderboard()
        fetchBalance()
      } else {
        const err = await res.json()
        alert(err.error || 'Hediye gönderilemedi')
      }
    } catch (err) {
      console.error('Send gift error:', err)
      alert('Hediye gönderilemedi')
    } finally {
      setSendingGift(false)
    }
  }

  const openGiftModal = (user: ActiveUser | { id: string; name: string; nickname?: string; image?: string | null; lastSeen?: string; chatRole?: string; roleSymbol?: string; roleLevel?: number; isAdmin?: boolean }) => {
    const fullUser: ActiveUser = {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      image: user.image || null,
      lastSeen: (user as ActiveUser).lastSeen || new Date().toISOString(),
      chatRole: (user as ActiveUser).chatRole,
      roleSymbol: (user as ActiveUser).roleSymbol,
      roleLevel: (user as ActiveUser).roleLevel ?? 0,
      isAdmin: (user as ActiveUser).isAdmin ?? false,
    }
    setGiftTargetUser(fullUser)
    setShowGiftModal(true)
    setShowGiftUserSelect(false)
  }

  useEffect(() => {
    if (room) {
      fetchGiftTypes()
      fetchLeaderboard()
      const interval = setInterval(fetchLeaderboard, 5000)
      return () => clearInterval(interval)
    }
  }, [room, fetchGiftTypes, fetchLeaderboard])

  const canUseVoice = () => {
    if (!session?.user?.id) return false
    // Room owner can always use voice
    if (room?.ownerId === session.user.id) return true
    // Global admin can always use voice
    if (myPermissions?.isGlobalAdmin) return true
    // Users with voice role or higher can use voice
    const allowedRoles = ['voice', 'op', 'sop', 'admin', 'founder', 'superadmin']
    return myPermissions?.role && allowedRoles.includes(myPermissions.role)
  }

  if (error && error.includes('banned')) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <Ban className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl text-red-400 mb-2">{'Bu odadan engellendiniz'}</h1>
          <Link href={`/sohbet`} className="text-gold-400 hover:text-gold-300">
            {'Sohbet odalarına dön'}
          </Link>
        </div>
      </div>
    )
  }

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Check if user has any management permission
  const hasManagePermission = myPermissions && (
    myPermissions.isRoomOwner ||
    myPermissions.canMuteUsers || 
    myPermissions.canKickUsers || 
    myPermissions.canBanUsers || 
    myPermissions.canMuteRoom ||
    myPermissions.canGiveVoice ||
    myPermissions.canGiveOp ||
    myPermissions.canGiveSop ||
    myPermissions.canGiveFounder ||
    myPermissions.canManageRoom ||
    myPermissions.isGlobalAdmin
  )

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)', overscrollBehavior: 'none' }}>
      {/* Nickname Modal */}
      <AnimatePresence>
        {showNicknameModal && session?.user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a0b2e] border border-gold-500/30 rounded-xl p-6 max-w-sm w-full"
            >
              <h3 className="text-xl font-serif text-gold-400 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {'Takma Adınızı Seçin'}
              </h3>
              <p className="text-purple-200/70 text-sm mb-4">
                {'Bu isim sohbette görünecek'}
              </p>
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder={session.user.name || ('Takma ad...')}
                maxLength={20}
                className="w-full bg-[#2d1b4e]/50 border border-gold-500/30 rounded-lg px-4 py-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-gold-400 mb-4"
                onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setNicknameInput(session.user?.name || '')
                    saveNickname()
                  }}
                  className="flex-1 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30"
                >
                  {'Varsayılan Kullan'}
                </button>
                <button
                  onClick={saveNickname}
                  disabled={!nicknameInput.trim()}
                  className="flex-1 px-4 py-2 bg-gold-500 text-black font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {'Kaydet'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Popup */}
      <AnimatePresence>
        {showManagePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowManagePopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a0b2e] border border-purple-500/30 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Popup Header */}
              <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
                <h3 className="text-lg font-semibold text-gold-400 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {'Yönetim Paneli'}
                </h3>
                <button onClick={() => setShowManagePopup(false)} className="text-purple-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex border-b border-purple-500/30">
                <button
                  onClick={() => setManageTab('chat')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${manageTab === 'chat' ? 'bg-purple-600/30 text-white' : 'text-purple-400 hover:bg-purple-600/10'}`}
                >
                  {'Sohbet'}
                </button>
                <button
                  onClick={() => setManageTab('users')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${manageTab === 'users' ? 'bg-purple-600/30 text-white' : 'text-purple-400 hover:bg-purple-600/10'}`}
                >
                  {'Kullanıcılar'}
                </button>
                {(myPermissions?.canBanUsers || myPermissions?.canMuteUsers) && (
                  <button
                    onClick={() => { setManageTab('modlist'); fetchModList(); }}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${manageTab === 'modlist' ? 'bg-purple-600/30 text-white' : 'text-purple-400 hover:bg-purple-600/10'}`}
                  >
                    {'Cezalılar'}
                  </button>
                )}
              </div>
              
              {/* Tab Content */}
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                {manageTab === 'chat' && (
                  <div className="space-y-3">
                    {/* Room owner and global admin always see room mute option */}
                    {myPermissions?.canMuteRoom && (
                      <button
                        onClick={() => { toggleRoomMute(); setShowManagePopup(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${roomMuted ? 'bg-green-600/30 text-green-300 hover:bg-green-600/50' : 'bg-red-600/30 text-red-300 hover:bg-red-600/50'}`}
                      >
                        {roomMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        {roomMuted ? ('Odayı Aç') : ('Odayı Sustur')}
                      </button>
                    )}
                    <button
                      onClick={() => { setSoundEnabled(!soundEnabled); setShowManagePopup(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${soundEnabled ? 'bg-blue-600/30 text-blue-300 hover:bg-blue-600/50' : 'bg-gray-600/30 text-gray-300 hover:bg-gray-600/50'}`}
                    >
                      {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                      {soundEnabled ? ('Bildirim Sesi Açık') : ('Bildirim Sesi Kapalı')}
                    </button>
                    {/* Room owner, founder, op and global admin see clear messages option */}
                    {(myPermissions?.isRoomOwner || myPermissions?.canManageRoom || myPermissions?.role === 'founder' || myPermissions?.role === 'superadmin' || myPermissions?.isGlobalAdmin) && (
                      <button
                        onClick={() => { clearAllMessages(); setShowManagePopup(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-red-600/30 text-red-300 hover:bg-red-600/50"
                      >
                        <Trash2 className="w-5 h-5" />
                        {'Tüm Mesajları Temizle'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowNicknameModal(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-purple-600/30 text-purple-300 hover:bg-purple-600/50"
                    >
                      <AtSign className="w-5 h-5" />
                      {'Takma Adı Değiştir'}
                    </button>
                  </div>
                )}
                {manageTab === 'users' && (
                  <div className="space-y-2">
                    {activeUsers.length === 0 ? (
                      <p className="text-purple-400/50 text-sm text-center py-4">
                        {'Aktif kullanıcı yok'}
                      </p>
                    ) : (
                      activeUsers.filter(u => {
                        // Superadmins can see themselves to self-assign roles
                        if (u.id === session?.user?.id && myPermissions?.role === 'superadmin') return true
                        return u.id !== session?.user?.id
                      }).map(user => (
                        <div key={user.id} className="bg-[#0d0520] rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-medium ${user.chatRole ? ROLE_COLORS[user.chatRole] : 'text-purple-200'}`}>
                              {user.roleSymbol && <span className="mr-1">{user.roleSymbol}</span>}
                              {getDisplayName(user)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {/* Mute users */}
                            {myPermissions?.canMuteUsers && (
                              <button
                                onClick={() => performModAction('mute_user', user.id, { duration: 30 })}
                                className="px-2 py-1 bg-orange-600/30 text-orange-300 rounded text-xs hover:bg-orange-600/50"
                              >
                                <MicOff className="w-3 h-3 inline mr-1" />{'Sustur'}
                              </button>
                            )}
                            {/* Kick users */}
                            {myPermissions?.canKickUsers && (
                              <button
                                onClick={() => performModAction('kick_user', user.id)}
                                className="px-2 py-1 bg-yellow-600/30 text-yellow-300 rounded text-xs hover:bg-yellow-600/50"
                              >
                                <UserMinus className="w-3 h-3 inline mr-1" />{'At'}
                              </button>
                            )}
                            {/* Ban users */}
                            {myPermissions?.canBanUsers && (
                              <button
                                onClick={() => performModAction('ban_user', user.id)}
                                className="px-2 py-1 bg-red-600/30 text-red-300 rounded text-xs hover:bg-red-600/50"
                              >
                                <Ban className="w-3 h-3 inline mr-1" />{'Engelle'}
                              </button>
                            )}
                            {/* Give voice */}
                            {myPermissions?.canGiveVoice && !user.chatRole && (
                              <button
                                onClick={() => performModAction('set_role', user.id, { role: 'voice' })}
                                className="px-2 py-1 bg-blue-600/30 text-blue-300 rounded text-xs hover:bg-blue-600/50"
                                title={'Ses yetkisi ver'}
                              >
                                <Mic className="w-3 h-3 inline mr-1" />{'Ses Ver'}
                              </button>
                            )}
                            {/* Give op */}
                            {myPermissions?.canGiveOp && (
                              <button
                                onClick={() => performModAction('set_role', user.id, { role: 'op' })}
                                className="px-2 py-1 bg-green-600/30 text-green-300 rounded text-xs hover:bg-green-600/50"
                              >
                                @o
                              </button>
                            )}
                            {/* Give SOP */}
                            {myPermissions?.canGiveSop && (
                              <button
                                onClick={() => performModAction('set_role', user.id, { role: 'sop' })}
                                className="px-2 py-1 bg-orange-600/30 text-orange-300 rounded text-xs hover:bg-orange-600/50"
                              >
                                &SOP
                              </button>
                            )}
                            {/* Remove roles */}
                            {user.chatRole && (myPermissions?.canGiveVoice || myPermissions?.canGiveOp || myPermissions?.canGiveSop) && (
                              <button
                                onClick={() => performModAction('remove_role', user.id)}
                                className="px-2 py-1 bg-gray-600/30 text-gray-300 rounded text-xs hover:bg-gray-600/50"
                              >
                                {'Yetkiyi Kaldır'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {manageTab === 'modlist' && (
                  <div className="space-y-4">
                    {loadingModList ? (
                      <p className="text-purple-400/50 text-sm text-center py-4">Yükleniyor...</p>
                    ) : (
                      <>
                        {/* Banned Users */}
                        {myPermissions?.canBanUsers && (
                          <div>
                            <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-1">
                              <Ban className="w-4 h-4" /> Engellenen Kullanıcılar ({bannedUsers.length})
                            </h4>
                            {bannedUsers.length === 0 ? (
                              <p className="text-purple-400/50 text-xs">Engellenen kullanıcı yok</p>
                            ) : (
                              <div className="space-y-1">
                                {bannedUsers.map(ban => (
                                  <div key={ban.id} className="flex items-center justify-between bg-red-900/20 rounded-lg px-3 py-2">
                                    <span className="text-sm text-red-200">{ban.user.name}</span>
                                    <button
                                      onClick={() => handleUnban(ban.userId)}
                                      className="px-3 py-1 bg-green-600/30 text-green-300 rounded text-xs hover:bg-green-600/50 font-medium"
                                    >
                                      Engeli Kaldır
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Muted Users */}
                        {myPermissions?.canMuteUsers && (
                          <div>
                            <h4 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-1">
                              <MicOff className="w-4 h-4" /> Susturulan Kullanıcılar ({mutedUsers.length})
                            </h4>
                            {mutedUsers.length === 0 ? (
                              <p className="text-purple-400/50 text-xs">Susturulan kullanıcı yok</p>
                            ) : (
                              <div className="space-y-1">
                                {mutedUsers.map(mute => (
                                  <div key={mute.id} className="flex items-center justify-between bg-orange-900/20 rounded-lg px-3 py-2">
                                    <div>
                                      <span className="text-sm text-orange-200">{mute.user.name}</span>
                                      {mute.expiresAt && (
                                        <span className="text-[10px] text-orange-400/60 ml-2">
                                          {new Date(mute.expiresAt) > new Date() 
                                            ? `${Math.ceil((new Date(mute.expiresAt).getTime() - Date.now()) / 60000)} dk kaldı`
                                            : 'Süresi doldu'}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleUnmute(mute.userId)}
                                      className="px-3 py-1 bg-green-600/30 text-green-300 rounded text-xs hover:bg-green-600/50 font-medium"
                                    >
                                      Susturmayı Kaldır
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rooms Popup */}
      <AnimatePresence>
        {showRoomsPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowRoomsPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a0b2e] border border-purple-500/30 rounded-xl max-w-md w-full max-h-[70vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
                <h3 className="text-lg font-semibold text-gold-400 flex items-center gap-2">
                  <DoorOpen className="w-5 h-5" />
                  {'Sohbet Odaları'}
                </h3>
                <button onClick={() => setShowRoomsPopup(false)} className="text-purple-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-2 max-h-[55vh] overflow-y-auto">
                {allRooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      router.push(`/sohbet/${r.slug}`)
                      setShowRoomsPopup(false)
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${r.slug === roomSlug ? 'bg-purple-600/40 border border-purple-500' : 'bg-[#0d0520] hover:bg-purple-600/20'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{r.icon}</span>
                      <div className="text-left">
                        <p className="text-white font-medium">{r.nameTr}</p>
                        {r.owner && (
                          <p className="text-xs text-purple-400">
                            {'Sahibi'}: {r.owner.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-600/30 text-green-300 rounded text-xs flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {r.userCount || 0}
                      </span>
                      {r.slug === roomSlug && (
                        <span className="px-2 py-1 bg-gold-500/30 text-gold-300 rounded text-xs">
                          {'Aktif'}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mention Notification */}
      <AnimatePresence>
        {mentionNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gold-500/20 border border-gold-500/50 rounded-xl px-6 py-4 shadow-xl backdrop-blur-sm max-w-md"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold-500/30 rounded-full">
                <Bell className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <p className="text-gold-300 font-medium">
                  <span className="text-gold-400">{mentionNotification.from}</span>
                  {' senden bahsetti!'}
                </p>
                <p className="text-purple-200/70 text-sm mt-1">{mentionNotification.content}</p>
              </div>
              <button onClick={() => setMentionNotification(null)} className="text-purple-400 hover:text-white ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Main Chat Layout — Yalla/Bigo-style Voice Room ═══ */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Fullscreen wallpaper background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/room-wallpaper-default.jpg" 
            alt="" 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
        </div>

        {/* ── Top Header Overlay ── */}
        <div className="relative z-10 flex-shrink-0 flex items-center justify-between px-3 py-2 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Room Owner Avatar */}
            {room.owner && (
              <div className="w-8 h-8 rounded-full bg-purple-800 border-2 border-gold-500/60 overflow-hidden flex-shrink-0">
                <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                  {(room.owner.username || room.owner.name || '?').charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-sm font-bold truncate">{room.icon} {room.nameTr}</p>
              <p className="text-white/50 text-[10px]">ID:{room.id.slice(-10)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Active Users Count */}
            <div className="flex items-center gap-1 bg-green-500/20 backdrop-blur-sm rounded-full px-2 py-0.5 border border-green-500/30">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300 text-[11px] font-bold">{activeUsers.length}</span>
            </div>

            {/* Yönet / Settings */}
            {hasManagePermission && (
              <button
                onClick={() => setShowManagePopup(true)}
                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Odalar */}
            <button
              onClick={() => setShowRoomsPopup(true)}
              className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <DoorOpen className="w-4 h-4" />
            </button>

            {/* Leave / Power */}
            <Link
              href="/sohbet"
              className="w-8 h-8 rounded-full bg-red-500/30 backdrop-blur-sm flex items-center justify-center text-red-300 hover:bg-red-500/50 transition-colors border border-red-500/40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ── 5×3 Seat Grid ── */}
        {(() => {
          const TOTAL_SEATS = 15
          const COLS = 5
          const CENTER_SEAT = 7 // index 7 = row 2, col 3 (center)
          
          // Build seat occupants: owner goes to center, then privileged/voice users
          const privilegedUsers = activeUsers.filter(u => 
            u.chatRole && ['superadmin', 'founder', 'sop', 'admin', 'op', 'voice'].includes(u.chatRole)
          )
          const ownerUser = room.owner ? activeUsers.find(u => u.id === room.owner?.id) : null
          const otherPrivileged = privilegedUsers.filter(u => u.id !== room.owner?.id)
          
          // Create seats array
          const seats: (ActiveUser | null)[] = new Array(TOTAL_SEATS).fill(null)
          if (ownerUser) seats[CENTER_SEAT] = ownerUser
          
          let seatIdx = 0
          for (const user of otherPrivileged) {
            while (seatIdx < TOTAL_SEATS && seats[seatIdx] !== null) seatIdx++
            if (seatIdx < TOTAL_SEATS) seats[seatIdx] = user
          }
          
          return (
            <div className="relative z-10 flex-shrink-0 px-3 py-3">
              <div className={`grid grid-cols-${COLS} gap-2 max-w-sm mx-auto`} style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {seats.map((seatUser, idx) => {
                  if (seatUser) {
                    const isOwner = isRoomOwner(seatUser.id)
                    const badge = seatUser.chatRole ? ROLE_BADGE_STYLES[seatUser.chatRole] : null
                    const isMe = seatUser.id === session?.user?.id
                    const displayImage = isMe && myBroadcastImage ? myBroadcastImage : seatUser.image
                    const isSpeakingSeat = speakingUsers.has(seatUser.id)
                    
                    return (
                      <div key={`seat-${idx}`} className="flex flex-col items-center gap-0.5">
                        <div 
                          className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden cursor-pointer transition-all
                            ${isSpeakingSeat ? 'ring-2 ring-green-400 animate-pulse' : isOwner ? 'ring-2 ring-yellow-400' : badge ? `ring-2 ${badge.border}` : 'ring-1 ring-white/20'}
                          `}
                          onClick={() => seatUser.id !== session?.user?.id && openGiftModal(seatUser)}
                        >
                          {displayImage ? (
                            <img loading="lazy" src={displayImage} alt={getDisplayName(seatUser)} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${isOwner ? 'bg-gradient-to-br from-red-800 to-yellow-900' : 'bg-gradient-to-br from-purple-800 to-indigo-900'}`}>
                              <span className="text-base font-bold text-white/80">{(seatUser.nickname || seatUser.name || '?').charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          {/* Role badge overlay */}
                          {(isOwner || badge) && (
                            <div className={`absolute -bottom-0.5 -right-0.5 px-1 py-0.5 rounded-full text-[7px] font-bold shadow-lg ${isOwner ? 'bg-red-600 text-yellow-200' : badge ? `${badge.bg} ${badge.text}` : ''}`}>
                              {isOwner ? '👑' : seatUser.roleSymbol}
                            </div>
                          )}
                          {/* Speaking glow */}
                          {isSpeakingSeat && (
                            <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-30" />
                          )}
                        </div>
                        <p className={`text-[9px] font-bold truncate text-center max-w-[56px] drop-shadow-lg ${getNameEffectClass(seatUser)} ${isOwner ? 'text-yellow-300' : badge ? badge.text : 'text-white/80'}`}
                          {...(getNameEffectClass(seatUser) === 'effect-glitch' ? { 'data-text': getDisplayName(seatUser) } : {})}
                        >
                          {getDisplayName(seatUser)}
                        </p>
                      </div>
                    )
                  }
                  
                  // Empty/Locked seat
                  return (
                    <div key={`seat-${idx}`} className="flex flex-col items-center gap-0.5">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <p className="text-[9px] text-white/20 font-medium">Kilitli</p>
                    </div>
                  )
                })}
              </div>

              {/* Voice users bar below grid */}
              {voiceUsers.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 px-1 justify-center flex-wrap">
                  <Phone className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  {voiceUsers.map((vu: any) => (
                    <span
                      key={vu.id}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                        speakingUsers.has(vu.id)
                          ? 'bg-green-500/40 text-green-200 border border-green-400/50'
                          : 'bg-white/10 text-white/60 border border-white/10'
                      }`}
                    >
                      {speakingUsers.has(vu.id) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-0.5 animate-pulse" />}
                      {vu.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Room ID badge */}
              <div className="flex items-center justify-center mt-1.5">
                <span className="text-[10px] text-white/30 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  Oda ID: {room.id.slice(-10)}
                </span>
              </div>
            </div>
          )
        })()}

        {/* ── Announcement / Rules overlay ── */}
        {room.descTr && showAnnouncement && (
          <div className="relative z-10 mx-3 mb-2">
            <div className="bg-black/50 backdrop-blur-md rounded-lg border border-white/10 p-3 max-h-32 overflow-y-auto">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-yellow-400 text-xs font-bold mb-1">📢 Duyuru:</p>
                  <p className="text-white/80 text-xs whitespace-pre-wrap leading-relaxed">{room.descTr}</p>
                </div>
                <button onClick={() => setShowAnnouncement(false)} className="text-white/40 hover:text-white flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Chat Messages — floating over wallpaper ── */}
        <div ref={messagesContainerRef} className="relative z-10 flex-1 min-h-0 overflow-y-auto px-3 pb-1" style={{ overscrollBehavior: 'contain' }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
              <Sparkles className="w-8 h-8 mb-2" />
              <p className="text-xs">{t('chat.no_messages')}</p>
            </div>
          ) : (
            <div className="space-y-0.5 flex flex-col justify-end min-h-full">
              {messages.map((msg) => {
                const displayName = getDisplayName(msg.user)
                const isMe = msg.user.id === session?.user?.id
                const isOwner = isRoomOwner(msg.user.id)
                const isSpeakingUser = speakingUsers.has(msg.user.id)
                
                // System messages
                const isSystemJoin = msg.content.startsWith('[SYSTEM_JOIN]')
                const isVipJoin = msg.content.startsWith('[SYSTEM_VIP_JOIN:')
                const isSystemLeave = msg.content.startsWith('[SYSTEM_LEAVE]')
                const isSystemMessage = isSystemJoin || isVipJoin || isSystemLeave
                
                let vipType: string | null = null
                let joinName = ''
                let leaveName = ''
                if (isVipJoin) {
                  const match = msg.content.match(/\[SYSTEM_VIP_JOIN:(\w+)\](.+)/)
                  if (match) { vipType = match[1]; joinName = match[2] }
                } else if (isSystemJoin) {
                  joinName = msg.content.replace('[SYSTEM_JOIN]', '')
                } else if (isSystemLeave) {
                  leaveName = msg.content.replace('[SYSTEM_LEAVE]', '')
                }
                
                if (isSystemMessage) {
                  const vipLabels: Record<string, { label: string; icon: string; color: string }> = {
                    'ADMIN': { label: '👑 Site Yöneticisi', icon: '👑', color: 'text-red-400' },
                    'OWNER': { label: '🏠 Oda Sahibi', icon: '🏠', color: 'text-yellow-400' },
                    'FOUNDER': { label: '⭐ Kurucu', icon: '⭐', color: 'text-red-400' },
                    'MODERATOR': { label: '🛡️ Moderatör', icon: '🛡️', color: 'text-orange-400' },
                    'OP': { label: '✨ Operatör', icon: '✨', color: 'text-green-400' },
                  }
                  
                  if (isSystemLeave) {
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-0.5 text-center">
                        <span className="text-white/30 text-[11px]">← <span className="text-white/50">{leaveName}</span> odadan ayrıldı</span>
                      </motion.div>
                    )
                  }
                  
                  if (isVipJoin && vipType && vipLabels[vipType]) {
                    const vipInfo = vipLabels[vipType]
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="py-0.5">
                        <span className="bg-yellow-500/20 backdrop-blur-sm text-[11px] px-2 py-0.5 rounded-full inline-block border border-yellow-500/30">
                          <span className={vipInfo.color}>{vipInfo.icon} <span className="font-bold">{joinName}</span></span>
                          <span className="text-white/50 ml-1">odaya giriş yaptı</span>
                        </span>
                      </motion.div>
                    )
                  }
                  
                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="py-0.5">
                      <span className="text-white/40 text-[11px]">➜ <span className="text-white/60">{joinName}</span> odaya katıldı</span>
                    </motion.div>
                  )
                }
                
                const isMentioned = nickname && msg.content.toLowerCase().includes(`@${nickname.toLowerCase()}`)
                
                return (
                  <div
                    key={msg.id}
                    className={`py-0.5 px-1.5 rounded ${isMentioned ? 'bg-yellow-500/20' : ''}`}
                  >
                    {isSpeakingUser && <span className="text-green-400 mr-0.5 animate-pulse text-xs">●</span>}
                    {msg.user.chatRole && (
                      <span className={`${ROLE_COLORS[msg.user.chatRole]} mr-0.5 text-xs`}>{msg.user.roleSymbol}</span>
                    )}
                    {isOwner && <span className="text-yellow-400 mr-0.5 text-xs">👑</span>}
                    <button
                      onClick={() => msg.user.id !== session?.user?.id && addMention(displayName)}
                      className={`font-bold text-xs hover:underline ${getNameEffectClass(msg.user)} ${
                        isOwner ? 'text-yellow-300' : msg.user.chatRole ? ROLE_COLORS[msg.user.chatRole] : isMe ? 'text-gold-400' : 'text-purple-300'
                      }`}
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                      {...(getNameEffectClass(msg.user) === 'effect-glitch' ? { 'data-text': `<${displayName}>` } : {})}
                    >
                      &lt;{displayName}&gt;
                    </button>
                    <span className="text-white text-xs ml-1 break-all" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                      {msg.content.split(/(@\w+)/g).map((part, i) =>
                        part.startsWith('@') ? (
                          <span key={i} className="text-gold-400 font-medium">{part}</span>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </span>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Typing Indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative z-10 px-4 py-1 text-white/50 text-[11px] flex items-center gap-2"
            >
              <div className="flex gap-0.5">
                <span className="w-1 h-1 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>{typingUsers.slice(0, 3).join(', ')}{typingUsers.length > 3 && ` +${typingUsers.length - 3}`} yazıyor...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && !error.includes('banned') && (
          <div className="relative z-10 mx-3 px-3 py-1 bg-red-900/60 text-red-300 text-[11px] rounded-lg backdrop-blur-sm">{error}</div>
        )}

        {/* Gift Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="relative z-10 mx-3 mb-1">
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] bg-black/40 backdrop-blur-sm rounded-t-lg border border-yellow-500/20"
            >
              <span className="text-yellow-400 flex items-center gap-1"><Trophy className="w-3 h-3" /> Hediye Sıralaması</span>
              <span className="text-white/40">{showLeaderboard ? '▲' : '▼'}</span>
            </button>
            {showLeaderboard && (
              <div className="flex gap-1.5 px-2 pb-1.5 overflow-x-auto scrollbar-hide bg-black/30 backdrop-blur-sm rounded-b-lg border-x border-b border-yellow-500/20">
                {leaderboard.slice(0, 10).map((entry, i) => (
                  <div key={entry.userId} className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] ${i === 0 ? 'bg-yellow-500/30 border border-yellow-500/40' : i === 1 ? 'bg-gray-400/20 border border-gray-400/30' : i === 2 ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-white/5 border border-white/10'}`}>
                    <span className={`font-bold ${i === 0 ? 'text-yellow-300' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-300' : 'text-white/50'}`}>{i + 1}.</span>
                    <span className="text-white truncate max-w-[50px]">{entry.name}</span>
                    {entry.jetonTotal > 0 && <span className="text-yellow-400">💎{entry.jetonTotal}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Bottom Toolbar ── */}
        {session?.user ? (
          <div className="relative z-10 flex-shrink-0 px-2 pb-2 pt-1">
            {/* Gift User Selection Panel */}
            {showGiftUserSelect && (
              <div className="mb-2 bg-black/60 backdrop-blur-md border border-yellow-500/30 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-yellow-400 text-[11px] font-bold flex items-center gap-1"><Gift className="w-3 h-3" /> Kime hediye?</span>
                  <button onClick={() => setShowGiftUserSelect(false)} className="text-white/40 hover:text-white text-xs">✕</button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {room?.owner && room.owner.id !== session?.user?.id && (
                    <button
                      onClick={() => openGiftModal({ id: room.owner!.id, name: room.owner!.username || room.owner!.name || 'Oda Sahibi' })}
                      className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-[10px] text-yellow-200 hover:bg-yellow-500/30"
                    >
                      <Crown className="w-3 h-3 text-yellow-300" />{room.owner.username || room.owner.name}
                    </button>
                  )}
                  {activeUsers.filter(u => u.id !== session?.user?.id).map(user => (
                    <button
                      key={user.id}
                      onClick={() => openGiftModal(user)}
                      className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-full text-[10px] text-white/80 hover:bg-white/20"
                    >
                      {getDisplayName(user)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main input row */}
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-2 py-1.5 border border-white/10">
              {/* Speaker / Listen toggle */}
              {!canUseVoice() && voiceUsers.length > 0 && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    isListening ? 'bg-blue-500/40 text-blue-300' : 'bg-white/10 text-white/50 hover:bg-white/20'
                  }`}
                  title={isListening ? 'Dinlemeyi Durdur' : 'Dinle'}
                >
                  {isListening ? <Volume2 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}

              {/* Mic / Voice button */}
              {canUseVoice() && (
                <button
                  type="button"
                  onClick={() => voiceEnabled ? stopVoiceChat() : startVoiceChat()}
                  disabled={voiceConnecting}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    voiceEnabled
                      ? 'bg-red-500/60 text-white animate-pulse'
                      : voiceConnecting
                        ? 'bg-blue-500/30 text-blue-300 opacity-50'
                        : 'bg-white/10 text-white/50 hover:bg-white/20'
                  }`}
                  title={voiceEnabled ? 'Sesli sohbetten çık' : voiceConnecting ? 'Bağlanıyor...' : 'Sesli sohbete katıl'}
                >
                  {voiceEnabled ? (
                    isSpeaking ? <Mic className="w-4 h-4 text-green-300" /> : <MicOff className="w-4 h-4" />
                  ) : voiceConnecting ? (
                    <Mic className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Text Input */}
              <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); handleTyping() }}
                  onFocus={handleInputFocus}
                  placeholder={t('chat.placeholder')}
                  maxLength={500}
                  className="flex-1 bg-transparent text-white text-sm placeholder-white/30 focus:outline-none px-2 py-1"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center disabled:opacity-30 hover:bg-purple-500 flex-shrink-0 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Gift Button */}
              <button
                type="button"
                onClick={() => setShowGiftUserSelect(!showGiftUserSelect)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                  showGiftUserSelect ? 'bg-yellow-500/60 text-yellow-200' : 'bg-white/10 text-yellow-400 hover:bg-white/20'
                }`}
                title="Hediye Gönder"
              >
                <Gift className="w-4 h-4" />
              </button>
            </div>

            {/* Balance indicator */}
            <div className="flex items-center justify-center mt-1.5">
              <span className="text-[10px] text-yellow-400/60">💎 {userJetonBalance} Jeton</span>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex-shrink-0 px-3 pb-3 pt-1">
            <Link
              href="/giris"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600/80 backdrop-blur-sm text-white font-medium text-sm rounded-full hover:bg-purple-500/80 w-full border border-purple-500/40"
            >
              <LogIn className="w-4 h-4" />
              {t('chat.login_required')}
            </Link>
          </div>
        )}

        {/* Image Picker Modal */}
        <AnimatePresence>
          {showImagePicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={() => setShowImagePicker(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1a0b2e] border border-purple-500/30 rounded-xl max-w-sm w-full overflow-hidden"
              >
                <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
                  <h3 className="text-gold-400 font-bold">📷 Profil Resmi Seç</h3>
                  <button onClick={() => setShowImagePicker(false)} className="text-purple-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-3 grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => { setMyBroadcastImage(null); if (session?.user?.id) localStorage.removeItem(`chat_broadcast_img_${session.user.id}`); setShowImagePicker(false) }}
                    className={`relative aspect-square rounded-lg border-2 ${!myBroadcastImage ? 'border-gold-400' : 'border-purple-500/30'} overflow-hidden flex items-center justify-center bg-purple-900/30 hover:bg-purple-800/40`}
                  >
                    <span className="text-purple-300 text-xs text-center">Varsayılan</span>
                  </button>
                  {broadcastImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => { setMyBroadcastImage(img.imageUrl); if (session?.user?.id) localStorage.setItem(`chat_broadcast_img_${session.user.id}`, img.imageUrl); setShowImagePicker(false) }}
                      className={`relative aspect-square rounded-lg border-2 ${myBroadcastImage === img.imageUrl ? 'border-gold-400' : 'border-purple-500/30'} overflow-hidden hover:border-purple-400/60`}
                    >
                      <img loading="lazy" src={img.imageUrl} alt={img.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gift Animation Overlay - Profile appears center, gift hits, star burst, exit */}
      <AnimatePresence>
        {giftAnimations.map((anim) => (
          <motion.div
            key={anim.id}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
            className="fixed top-14 left-2 right-2 z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-yellow-500/20 via-purple-500/20 to-pink-500/20 border border-yellow-500/40 rounded-xl px-3 py-2 backdrop-blur-md flex items-center gap-2 shadow-lg shadow-purple-500/20 max-w-md mx-auto">
              {/* Gift icon */}
              <div className="flex-shrink-0 w-8 h-8">
                {anim.giftImage ? (
                  <img loading="lazy" src={anim.giftImage} alt="gift" className="w-8 h-8 object-contain" />
                ) : anim.giftIcon?.startsWith('/') ? (
                  <img loading="lazy" src={anim.giftIcon} alt="gift" className="w-8 h-8 object-contain" />
                ) : (
                  <span className="text-2xl">{anim.giftIcon}</span>
                )}
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">
                  <span className="text-yellow-300 font-bold">{anim.senderName}</span>
                  <span className="text-white/60 mx-1">→</span>
                  <span className="text-purple-300 font-bold">{anim.recipientName}</span>
                </p>
              </div>
              {/* Amount */}
              <div className="flex-shrink-0 bg-yellow-500/30 text-yellow-300 font-bold text-xs px-2 py-0.5 rounded-full">
                x{anim.amount}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Gift Modal */}
      <AnimatePresence>
        {showGiftModal && giftTargetUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowGiftModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a0b2e] border border-purple-500/30 rounded-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 border-b border-purple-500/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-gold-400 font-bold flex items-center gap-2">
                    <Gift className="w-5 h-5" /> Hediye Gönder
                  </h3>
                  <button onClick={() => setShowGiftModal(false)} className="text-purple-400 hover:text-white">✕</button>
                </div>
                <p className="text-purple-300 text-sm mt-1">
                  Alıcı: <span className="text-white font-medium">{getDisplayName(giftTargetUser)}</span>
                </p>
              </div>

              {/* Payment Info */}
              <div className="p-3 border-b border-purple-500/20">
                <p className="text-xs text-purple-400/70 text-center">
                  💎 Jeton ile gönderilen hediyeler bakiyenizden düşer
                </p>
              </div>

              {/* Gift Types Grid */}
              <div className="p-3 grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {giftTypes.map(gt => (
                  <button
                    key={gt.id}
                    onClick={() => setSelectedGiftType(gt.id)}
                    className={`flex flex-col items-center p-2 rounded-lg transition-all ${selectedGiftType === gt.id ? 'bg-gold-500/20 border border-gold-500/50 scale-105' : 'bg-purple-900/30 border border-purple-500/20 hover:border-purple-400/40'}`}
                  >
                    {(gt.icon && gt.icon.startsWith('/')) || GIFT_IMAGES[gt.id] ? (
                      <img loading="lazy" src={gt.icon?.startsWith('/') ? gt.icon : GIFT_IMAGES[gt.id]} alt={gt.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <span className="text-2xl">{gt.icon}</span>
                    )}
                    <span className="text-[10px] text-purple-300 mt-0.5">{gt.name}</span>
                    <span className="text-[10px] text-yellow-400 font-bold">{gt.price}</span>
                  </button>
                ))}
              </div>

              {/* Send Button */}
              <div className="p-3 border-t border-purple-500/20">
                <button
                  onClick={sendGift}
                  disabled={!selectedGiftType || sendingGift}
                  className="w-full py-2.5 bg-gradient-to-r from-gold-500 to-yellow-500 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-gold-400 hover:to-yellow-400 transition-all"
                >
                  {sendingGift ? 'Gönderiliyor...' : `Hediye Gönder (${giftTypes.find(g => g.id === selectedGiftType)?.price || 0} Jeton)`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  )
}