'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import type { IAgoraRTCClient, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'
import { Send, Users, Sparkles, LogIn, VolumeX, Volume2, UserMinus, Ban, Shield, Crown, Star, Mic, MicOff, AtSign, Bell, X, Settings, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Trash2, Home, DoorOpen, Phone, PhoneOff, Gift, Coins, Trophy, Edit2, ImageIcon, Save, Loader2, UserPlus, UserCheck, ArrowRightLeft, Music, RefreshCw } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import ChatRoomMarquee from '@/components/chat-room-marquee'
import YouTubeMusicModal from '@/components/youtube-music-modal'

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
  seatIndex: number
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
  owner?: { id: string; name: string; username?: string | null; image?: string | null } | null
  backgroundImage?: string | null
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
  const [marqueeJoinEvents, setMarqueeJoinEvents] = useState<{ id: string; name: string; isVip: boolean; vipType?: string }[]>([])
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
  
  // Room owner controls
  const [showAnnouncementEdit, setShowAnnouncementEdit] = useState(false)
  const [editAnnouncementText, setEditAnnouncementText] = useState('')
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [adminBgImages, setAdminBgImages] = useState<Array<{id: string, name: string, imageUrl: string}>>([])
  const [savingBg, setSavingBg] = useState(false)
  
  // Voice Chat with Agora
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false) // For listen-only mode (audience)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMicMuted, setIsMicMuted] = useState(false) // Mic muted but still listening
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set())
  const autoVoiceJoinedRef = useRef(false) // Prevent double auto-join for voice users
  const autoListenJoinedRef = useRef(false) // Prevent double auto-listen
  const voiceReconnectTimerRef = useRef<NodeJS.Timeout | null>(null) // For reconnect retries
  const mySeatIndexRef = useRef<number>(-1) // Track current seat to preserve across heartbeats
  const autoSeatClaimedRef = useRef(false) // Prevent double auto-seat
  const isLeavingPageRef = useRef(false) // Distinguish intentional leave from effect cleanup
  const roomIdRef = useRef<string | null>(null) // For cleanup on unmount
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
  
  // User profile popup (for follow/unfollow)
  const [profilePopupUser, setProfilePopupUser] = useState<{ id: string; name: string; nickname?: string; image?: string | null } | null>(null)
  const [profileFollowing, setProfileFollowing] = useState(false)
  const [profileFollowLoading, setProfileFollowLoading] = useState(false)
  
  // YouTube Music
  const [showMusicModal, setShowMusicModal] = useState(false)
  const [currentMusicVideoId, setCurrentMusicVideoId] = useState<string | null>(null)
  const [currentMusicTitle, setCurrentMusicTitle] = useState<string | null>(null)
  const [musicMuted, setMusicMuted] = useState(false)
  
  // Commands panel
  const [showCommandsPanel, setShowCommandsPanel] = useState(false)
  
  // Transfer ownership
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null)
  const [transferring, setTransferring] = useState(false)
  
  const voiceUsersPollRef = useRef<NodeJS.Timeout | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousMessagesCount = useRef(0)

  // Handle mobile keyboard - recalculate viewport height (lightweight, no scroll forcing)
  const handleInputFocus = useCallback(() => {
    const recalc = () => {
      const height = window.visualViewport?.height || window.innerHeight
      const vh = height * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    // Single delayed recalc after keyboard animation
    setTimeout(recalc, 300)
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

  // Handle mobile viewport height (keyboard open/close) — lightweight, no scroll forcing
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const setVH = () => {
      const height = window.visualViewport?.height || window.innerHeight
      const vh = height * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    
    setVH()
    window.addEventListener('resize', setVH)
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH)
    }
    
    return () => {
      window.removeEventListener('resize', setVH)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setVH)
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

  // Save announcement text
  const handleSaveAnnouncement = async () => {
    if (!room) return
    setSavingAnnouncement(true)
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descTr: editAnnouncementText })
      })
      if (res.ok) {
        setRoom(prev => prev ? { ...prev, descTr: editAnnouncementText } : prev)
        setShowAnnouncementEdit(false)
        setShowAnnouncement(true)
      }
    } catch (e) {
      console.error('Error saving announcement:', e)
    } finally {
      setSavingAnnouncement(false)
    }
  }

  // Fetch available background images
  const fetchAdminBgImages = async () => {
    try {
      const res = await fetch('/api/broadcast-images')
      if (res.ok) {
        const data = await res.json()
        setAdminBgImages(data)
      }
    } catch (e) {
      console.error('Error fetching bg images:', e)
    }
  }

  // Save background image
  const handleSaveBg = async (imageUrl: string | null) => {
    if (!room) return
    setSavingBg(true)
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundImage: imageUrl || '' })
      })
      if (res.ok) {
        setRoom(prev => prev ? { ...prev, backgroundImage: imageUrl } : prev)
        setShowBgPicker(false)
      }
    } catch (e) {
      console.error('Error saving background:', e)
    } finally {
      setSavingBg(false)
    }
  }

  // Fetch messages — only updates state when messages actually changed, capped at 100
  const lastMessageIdRef = useRef<string | null>(null)
  const fetchMessages = useCallback(async () => {
    if (!room) return
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/messages`)
      if (res.ok) {
        const data = await res.json()
        const incoming = (data.messages || []).slice(-100) // Cap at 100 messages
        const newLastId = incoming.length > 0 ? incoming[incoming.length - 1].id : null
        
        // Skip state update if messages haven't changed
        if (newLastId === lastMessageIdRef.current && incoming.length === previousMessagesCount.current) {
          return
        }
        lastMessageIdRef.current = newLastId
        
        setMessages(incoming)
        setRoomMuted(data.roomMuted || false)
        setMyPermissions(data.myPermissions || null)
        if (data.myNickname) {
          setNickname(data.myNickname)
        }
        if (incoming.length > previousMessagesCount.current && previousMessagesCount.current > 0) {
          const lastMsg = incoming[incoming.length - 1]
          if (lastMsg.user.id !== session?.user?.id) {
            audioRef.current?.play()
          }
          // Extract new join events for marquee
          const newMsgs = incoming.slice(previousMessagesCount.current)
          const newJoins: { id: string; name: string; isVip: boolean; vipType?: string }[] = []
          for (const m of newMsgs) {
            if (m.content.startsWith('[SYSTEM_VIP_JOIN:')) {
              const match = m.content.match(/\[SYSTEM_VIP_JOIN:(\w+)\](.+)/)
              if (match) newJoins.push({ id: m.id, name: match[2], isVip: true, vipType: match[1] })
            } else if (m.content.startsWith('[SYSTEM_JOIN]')) {
              newJoins.push({ id: m.id, name: m.content.replace('[SYSTEM_JOIN]', ''), isVip: false })
            }
          }
          if (newJoins.length > 0) {
            setMarqueeJoinEvents(prev => [...prev, ...newJoins].slice(-10))
          }
        }
        previousMessagesCount.current = incoming.length
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
      const body: Record<string, unknown> = { nickname: nickname || session.user.name }
      // Always send current seatIndex to preserve it across heartbeats
      if (mySeatIndexRef.current >= 0) {
        body.seatIndex = mySeatIndexRef.current
      }
      const res = await fetch(`/api/chat/rooms/${room.id}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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

      // ── Reduced polling intervals for mobile performance ──
      const intervalsRef: NodeJS.Timeout[] = []
      const startPolling = () => {
        // Clear any existing intervals first
        intervalsRef.forEach(clearInterval)
        intervalsRef.length = 0
        intervalsRef.push(
          setInterval(fetchMessages, 5000),       // was 3s
          setInterval(fetchActiveUsers, 15000),   // was 5s
          setInterval(updatePresence, 20000),     // was 10s
          setInterval(fetchAllRooms, 90000),      // was 60s
          setInterval(fetchVoiceUsers, 15000),    // was 5s
          setInterval(fetchTypingUsers, 8000),    // was 2s
          setInterval(fetchBalance, 60000),       // was 30s
        )
      }
      const stopPolling = () => {
        intervalsRef.forEach(clearInterval)
        intervalsRef.length = 0
      }
      startPolling()
      updatePresence()

      // ── Visibility change: PAUSE polling when hidden, resume when visible ──
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          updatePresence()
          fetchMessages()
          fetchActiveUsers()
          fetchVoiceUsers()
          fetchBroadcastImages()
          startPolling()
        } else {
          stopPolling() // Stop all intervals when tab is hidden
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)

      // ── Online/offline handler: re-sync on reconnect ──
      const handleOnline = () => {
        console.log('Network reconnected, refreshing chat...')
        updatePresence()
        fetchMessages()
        fetchActiveUsers()
        fetchVoiceUsers()
      }
      window.addEventListener('online', handleOnline)

      // Remove presence when leaving page (intentional leave - show message)
      const handleBeforeUnload = () => {
        isLeavingPageRef.current = true
        if (room?.id) {
          navigator.sendBeacon(`/api/chat/rooms/${room.id}/presence?_delete=1&leave=1`, '')
        }
      }
      window.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        stopPolling()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [room, fetchMessages, fetchActiveUsers, checkBan, updatePresence, fetchAllRooms, fetchVoiceUsers, fetchTypingUsers, fetchBroadcastImages, fetchBalance])

  // Keep roomIdRef in sync for unmount cleanup
  useEffect(() => {
    if (room?.id) roomIdRef.current = room.id
  }, [room?.id])

  // Proper leave beacon ONLY on component unmount (SPA navigation away from chat room)
  useEffect(() => {
    return () => {
      if (roomIdRef.current) {
        navigator.sendBeacon(`/api/chat/rooms/${roomIdRef.current}/presence?_delete=1&leave=1`, '')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll for current music in room
  useEffect(() => {
    if (!room?.id) return
    let cancelled = false
    const fetchMusic = async () => {
      try {
        const res = await fetch(`/api/chat/rooms/${room.id}/music`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setCurrentMusicVideoId(data.videoId || null)
          setCurrentMusicTitle(data.title || null)
        }
      } catch {}
    }
    fetchMusic()
    const interval = setInterval(fetchMusic, 15000) // was 5s
    return () => { cancelled = true; clearInterval(interval) }
  }, [room?.id])

  // Auto-mute all Agora voice when music is playing, unmute when stopped
  useEffect(() => {
    if (!agoraClientRef.current) return
    const client = agoraClientRef.current
    const isMusicPlaying = !!currentMusicVideoId
    try {
      client.remoteUsers?.forEach((ru: any) => {
        if (ru.audioTrack) {
          if (isMusicPlaying) {
            ru.audioTrack.setVolume(0)
          } else {
            ru.audioTrack.setVolume(100)
          }
        }
      })
      // Also mute own mic if music playing
      if (agoraAudioTrackRef.current && voiceEnabled) {
        if (isMusicPlaying && !isMicMuted) {
          agoraAudioTrackRef.current.setEnabled(false)
          setIsMicMuted(true)
        }
      }
    } catch (e) {
      console.error('Music auto-mute error:', e)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMusicVideoId, voiceEnabled])

  // Auto-scroll — only if user is near the bottom (within 150px), prevents layout thrash
  const isNearBottomRef = useRef(true)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const handleScroll = () => {
      isNearBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 150
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])
  useEffect(() => {
    const container = messagesContainerRef.current
    if (container && isNearBottomRef.current) {
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
  const startVoiceChat = async (silent = false) => {
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
          if (!silent) alert('Sesli sohbet için yetkiniz yok. Oda sahibi veya yetkili size "+" (voice) rolü vermelidir.')
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

      // 4. Register ALL event listeners BEFORE joining (critical for catching remote users)
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
        if (session?.user?.id) {
          const amISpeaking = newSpeaking.has(session.user.id)
          setIsSpeaking(amISpeaking)
        }
      })

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

      // Token refresh before expiry (fires ~30s before expiration)
      client.on('token-privilege-will-expire', async () => {
        console.log('Agora token expiring soon, refreshing...')
        try {
          const { fetchAgoraToken: reFetch } = await import('@/lib/agora-client')
          const ch = `voice_room_${room.id}`
          const { token: newToken } = await reFetch(ch, 'host', agoraUid)
          await client.renewToken(newToken)
          console.log('Agora token refreshed successfully')
        } catch (e) { console.error('Agora token refresh failed:', e) }
      })

      // Robust auto-reconnect on connection drop with retry
      client.on('connection-state-change', (curState, prevState) => {
        console.log(`Agora host connection: ${prevState} → ${curState}`)
        
        // Clear any pending reconnect timer
        if (voiceReconnectTimerRef.current) {
          clearTimeout(voiceReconnectTimerRef.current)
          voiceReconnectTimerRef.current = null
        }
        
        if (curState === 'DISCONNECTED' && prevState !== 'DISCONNECTING') {
          console.warn('Agora host disconnected, will retry reconnect...')
          let retryCount = 0
          const maxRetries = 5
          
          const attemptReconnect = async () => {
            if (!agoraClientRef.current || agoraClientRef.current.connectionState !== 'DISCONNECTED') return
            retryCount++
            console.log(`Agora reconnect attempt ${retryCount}/${maxRetries}`)
            try {
              const { fetchAgoraToken: reFetch } = await import('@/lib/agora-client')
              const ch = `voice_room_${room.id}`
              const { token: newToken, appId: newAppId } = await reFetch(ch, 'host', agoraUid)
              await agoraClientRef.current!.join(newAppId, ch, newToken, agoraUid)
              if (agoraAudioTrackRef.current) {
                await agoraClientRef.current!.publish([agoraAudioTrackRef.current])
              }
              console.log('Agora host reconnected successfully')
            } catch (e) {
              console.error(`Agora reconnect attempt ${retryCount} failed:`, e)
              if (retryCount < maxRetries) {
                const delay = Math.min(3000 * Math.pow(1.5, retryCount), 15000) // Exponential backoff, max 15s
                voiceReconnectTimerRef.current = setTimeout(attemptReconnect, delay)
              } else {
                console.error('Agora reconnect: max retries exceeded')
              }
            }
          }
          
          voiceReconnectTimerRef.current = setTimeout(attemptReconnect, 2000)
        }
      })

      // 5. Map own UID
      if (session?.user?.id) {
        agoraUidMapRef.current.set(agoraUid, session.user.id)
      }

      // 6. Get token and join channel
      const channelName = `voice_room_${room.id}`
      const { token, appId } = await fetchAgoraToken(channelName, 'host', agoraUid)
      await client.join(appId, channelName, token, agoraUid)

      // 7. Create and publish mic audio track
      const audioTrack = await createLocalAudioTrack()
      agoraAudioTrackRef.current = audioTrack
      await client.publish([audioTrack])

      setVoiceEnabled(true)
      setVoiceConnecting(false)
      console.log('Agora voice chat started as host')

      // 8. Refresh voice users list
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
      if (!silent) {
        if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
          alert('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini verin.')
        } else {
          alert('Sesli sohbet başlatılamadı')
        }
      }
    }
  }

  // Toggle mic mute/unmute (stays connected, can still hear others)
  const toggleMicMute = useCallback(async () => {
    if (!agoraAudioTrackRef.current || !voiceEnabled) return
    try {
      if (isMicMuted) {
        // Unmute: re-enable the audio track
        await agoraAudioTrackRef.current.setEnabled(true)
        setIsMicMuted(false)
        console.log('Mic unmuted')
      } else {
        // Mute: disable the audio track but stay connected
        await agoraAudioTrackRef.current.setEnabled(false)
        setIsMicMuted(true)
        setIsSpeaking(false)
        console.log('Mic muted (still listening)')
      }
    } catch (e) {
      console.error('Error toggling mic mute:', e)
    }
  }, [voiceEnabled, isMicMuted])

  // Stop voice chat (host)
  const stopVoiceChat = useCallback(async () => {
    // Clear reconnect timer
    if (voiceReconnectTimerRef.current) {
      clearTimeout(voiceReconnectTimerRef.current)
      voiceReconnectTimerRef.current = null
    }

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
    autoVoiceJoinedRef.current = false
    setVoiceEnabled(false)
    setIsListening(false)
    setIsSpeaking(false)
    setIsMicMuted(false)
    setSpeakingUsers(new Set())
    fetchVoiceUsers()
  }, [room, voiceEnabled, fetchVoiceUsers])

  // Listen-only mode (audience) — no mic required
  const startListening = async () => {
    if (!room || isListening || voiceEnabled) return

    try {
      const { createAgoraClient, fetchAgoraToken } = await import('@/lib/agora-client')

      const client = await createAgoraClient('audience')
      agoraClientRef.current = client

      const uid = session?.user?.id ? userIdToAgoraUid(session.user.id) : 0

      // Register ALL event listeners BEFORE joining
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

      // Token refresh before expiry
      client.on('token-privilege-will-expire', async () => {
        console.log('Agora listener token expiring, refreshing...')
        try {
          const { fetchAgoraToken: reFetch } = await import('@/lib/agora-client')
          const ch = `voice_room_${room.id}`
          const { token: newToken } = await reFetch(ch, 'audience', uid)
          await client.renewToken(newToken)
          console.log('Agora listener token refreshed')
        } catch (e) { console.error('Agora listener token refresh failed:', e) }
      })

      // Auto-reconnect for listener mode with retry
      client.on('connection-state-change', (curState, prevState) => {
        console.log(`Agora listener connection: ${prevState} → ${curState}`)
        
        if (voiceReconnectTimerRef.current) {
          clearTimeout(voiceReconnectTimerRef.current)
          voiceReconnectTimerRef.current = null
        }
        
        if (curState === 'DISCONNECTED' && prevState !== 'DISCONNECTING') {
          console.warn('Agora listener disconnected, will retry reconnect...')
          let retryCount = 0
          const maxRetries = 5
          
          const attemptReconnect = async () => {
            if (!agoraClientRef.current || agoraClientRef.current.connectionState !== 'DISCONNECTED') return
            retryCount++
            console.log(`Agora listener reconnect attempt ${retryCount}/${maxRetries}`)
            try {
              const { fetchAgoraToken: reFetch } = await import('@/lib/agora-client')
              const ch = `voice_room_${room.id}`
              const { token: newToken, appId: newAppId } = await reFetch(ch, 'audience', uid)
              await agoraClientRef.current!.join(newAppId, ch, newToken, uid)
              console.log('Agora listener reconnected successfully')
            } catch (e) {
              console.error(`Agora listener reconnect attempt ${retryCount} failed:`, e)
              if (retryCount < maxRetries) {
                const delay = Math.min(3000 * Math.pow(1.5, retryCount), 15000)
                voiceReconnectTimerRef.current = setTimeout(attemptReconnect, delay)
              }
            }
          }
          
          voiceReconnectTimerRef.current = setTimeout(attemptReconnect, 2000)
        }
      })

      // Join the channel
      const channelName = `voice_room_${room.id}`
      const { token, appId } = await fetchAgoraToken(channelName, 'audience', uid)
      await client.join(appId, channelName, token, uid)

      setIsListening(true)
      console.log('Agora voice listen mode started')
    } catch (error) {
      console.error('Error starting listen mode:', error)
    }
  }

  // Stop listening (audience)
  const stopListening = useCallback(async () => {
    if (voiceReconnectTimerRef.current) {
      clearTimeout(voiceReconnectTimerRef.current)
      voiceReconnectTimerRef.current = null
    }
    if (agoraClientRef.current) {
      try {
        agoraClientRef.current.removeAllListeners()
        await agoraClientRef.current.leave()
      } catch {}
      agoraClientRef.current = null
    }
    agoraUidMapRef.current.clear()
    autoListenJoinedRef.current = false
    setIsListening(false)
    setSpeakingUsers(new Set())
  }, [])

  // Cleanup voice on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (voiceReconnectTimerRef.current) {
        clearTimeout(voiceReconnectTimerRef.current)
      }
      if (agoraAudioTrackRef.current) {
        agoraAudioTrackRef.current.close()
      }
      if (agoraClientRef.current) {
        agoraClientRef.current.removeAllListeners()
        agoraClientRef.current.leave().catch(() => {})
      }
    }
  }, [])

  // Auto-join voice for authorized users when entering room
  useEffect(() => {
    if (!room || !myPermissions || !session?.user?.id) return
    if (autoVoiceJoinedRef.current || voiceEnabled || voiceConnecting || isListening) return
    
    // Check if user has voice permission
    const hasVoice = (() => {
      if (room.ownerId === session.user.id) return true
      if (myPermissions.isGlobalAdmin) return true
      const allowedRoles = ['voice', 'op', 'sop', 'admin', 'founder', 'superadmin']
      return myPermissions.role ? allowedRoles.includes(myPermissions.role) : false
    })()
    
    if (hasVoice) {
      autoVoiceJoinedRef.current = true
      console.log('Auto-joining voice chat (authorized user)')
      startVoiceChat(true) // silent = true, no alert on failure
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, myPermissions, session?.user?.id])

  // Auto-mute admin when alone in room, auto-unmute when someone joins
  const prevActiveCountRef = useRef(0)
  useEffect(() => {
    if (!room || !session?.user?.id || !voiceEnabled || !agoraAudioTrackRef.current) return
    const isAdminOrOwner = myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || 
      (session.user as any).role === 'admin' || (session.user as any).role === 'yonetici'
    if (!isAdminOrOwner) return
    
    const otherUsers = activeUsers.filter(u => u.id !== session.user?.id)
    const prevCount = prevActiveCountRef.current
    prevActiveCountRef.current = otherUsers.length
    
    if (otherUsers.length === 0 && !isMicMuted) {
      // Admin alone - auto mute
      agoraAudioTrackRef.current.setEnabled(false)
      setIsMicMuted(true)
      console.log('Admin alone - auto-muted')
    } else if (otherUsers.length > 0 && prevCount === 0 && isMicMuted) {
      // Someone joined - auto unmute
      agoraAudioTrackRef.current.setEnabled(true)
      setIsMicMuted(false)
      console.log('User joined - admin auto-unmuted')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUsers, voiceEnabled, room, session?.user?.id])

  // Auto-listen for non-voice users when voice users are active
  useEffect(() => {
    if (!room || !session?.user?.id) return
    // Don't auto-listen if already in voice or listening mode
    if (voiceEnabled || isListening || voiceConnecting) return
    // Only auto-listen for non-voice users
    if (canUseVoice()) return
    
    if (voiceUsers.length > 0 && !autoListenJoinedRef.current) {
      autoListenJoinedRef.current = true
      console.log('Auto-starting listen mode (voice users detected)')
      startListening()
    } else if (voiceUsers.length === 0 && isListening) {
      // Stop listening when no more voice users
      console.log('No more voice users, stopping listen')
      stopListening()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceUsers, room, session?.user?.id, voiceEnabled, isListening, voiceConnecting])

  // Auto-seat voice-permitted users when entering room
  useEffect(() => {
    if (!room || !myPermissions || !session?.user?.id || !activeUsers.length) return
    if (autoSeatClaimedRef.current) return
    
    // Check if already seated
    const myCurrentSeat = activeUsers.find(u => u.id === session.user?.id)
    if (myCurrentSeat && myCurrentSeat.seatIndex >= 0) {
      mySeatIndexRef.current = myCurrentSeat.seatIndex
      autoSeatClaimedRef.current = true
      return
    }
    
    // Check if user has voice permission (same logic as canUseVoice)
    const hasVoice = (() => {
      if (room.ownerId === session.user.id) return true
      if (myPermissions.isGlobalAdmin) return true
      const allowedRoles = ['voice', 'op', 'sop', 'admin', 'founder', 'superadmin']
      return myPermissions.role ? allowedRoles.includes(myPermissions.role) : false
    })()
    
    if (!hasVoice) return
    autoSeatClaimedRef.current = true
    
    // Build occupied seats
    const TOTAL_SEATS = 15
    const occupiedSeats = new Set<number>()
    for (const u of activeUsers) {
      if (u.seatIndex >= 0 && u.seatIndex < TOTAL_SEATS) {
        occupiedSeats.add(u.seatIndex)
      }
    }
    
    // Determine role level for priority seating
    const ROLE_LEVELS: Record<string, number> = { superadmin: 5, founder: 4, sop: 3, op: 2, voice: 1 }
    const myRoleLevel = myPermissions.role ? (ROLE_LEVELS[myPermissions.role] || 0) : 0
    const isHighestRank = room.ownerId === session.user.id || myPermissions.isGlobalAdmin || myRoleLevel >= 4
    
    // Seat 0 (throne) priority: room owner or highest-ranked user
    let targetSeat = -1
    let forceThrone = false
    
    if (isHighestRank) {
      if (!occupiedSeats.has(0)) {
        targetSeat = 0
      } else {
        // Check if current seat 0 occupant is lower ranked
        const seat0User = activeUsers.find(u => u.seatIndex === 0)
        if (seat0User && seat0User.id !== session.user.id) {
          // Compare ranks: room owner always wins, then by role level
          const isOwner = room.ownerId === session.user.id
          const seat0IsOwner = room.ownerId === seat0User.id
          if (isOwner && !seat0IsOwner) {
            targetSeat = 0
            forceThrone = true
          } else if (!seat0IsOwner && myRoleLevel > 0) {
            // Compare by roleLevel (already available in ActiveUser)
            const seat0Level = seat0User.roleLevel || 0
            if (myRoleLevel > seat0Level) {
              targetSeat = 0
              forceThrone = true
            }
          }
        }
      }
    }
    
    // If not claiming throne, find first empty seat
    if (targetSeat < 0) {
      for (let i = 0; i < TOTAL_SEATS; i++) {
        if (!occupiedSeats.has(i)) {
          targetSeat = i
          break
        }
      }
    }
    
    if (targetSeat >= 0) {
      console.log(`Auto-seating at seat ${targetSeat}${forceThrone ? ' (throne override)' : ''}`)
      mySeatIndexRef.current = targetSeat
      fetch(`/api/chat/rooms/${room.id}/seats`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatIndex: targetSeat, forceThrone })
      }).then(res => {
        if (res.ok) fetchActiveUsers()
      }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, myPermissions, session?.user?.id, activeUsers])

  // Sync mySeatIndexRef when activeUsers updates
  useEffect(() => {
    if (!session?.user?.id) return
    const me = activeUsers.find(u => u.id === session.user?.id)
    if (me && me.seatIndex >= 0) {
      mySeatIndexRef.current = me.seatIndex
    }
  }, [activeUsers, session?.user?.id])

  // ── Chat Commands ──
  const [commandFlash, setCommandFlash] = useState<string | null>(null)
  
  const handleChatCommand = async (msg: string): Promise<boolean> => {
    if (!msg.startsWith('!') || !room || !session?.user) return false
    const parts = msg.split(' ')
    const cmd = parts[0].toLowerCase()
    const arg = parts.slice(1).join(' ').trim()

    const canMod = myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || 
      (myPermissions?.role && ['superadmin', 'founder', 'sop', 'admin', 'op'].includes(myPermissions.role))

    if (cmd === '!istek' && arg) {
      // Send song request - visible only to authorized users as flashing text
      try {
        await fetch(`/api/chat/rooms/${room.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `🎵 [İSTEK] ${arg}`, isCommand: true })
        })
        fetchMessages()
      } catch {}
      return true
    }

    if (cmd === '!temizle' && canMod) {
      // Clear all messages
      try {
        await fetch(`/api/chat/rooms/${room.id}/messages`, { method: 'DELETE' })
        fetchMessages()
        setCommandFlash('💫 Sohbet temizlendi')
        setTimeout(() => setCommandFlash(null), 3000)
      } catch {}
      return true
    }

    if (cmd === '!ban' && arg && canMod) {
      // Ban user by username
      const targetUser = activeUsers.find(u => 
        (u.nickname || u.name || '').toLowerCase() === arg.toLowerCase() ||
        (u.name || '').toLowerCase() === arg.toLowerCase()
      )
      if (targetUser) {
        try {
          await fetch(`/api/chat/rooms/${room.id}/moderation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ban_user', targetUserId: targetUser.id, reason: 'Chat komutu ile banlandı' })
          })
          setCommandFlash(`🚫 ${arg} banlandı`)
          setTimeout(() => setCommandFlash(null), 3000)
          fetchActiveUsers()
        } catch {}
      } else {
        setCommandFlash(`❌ Kullanıcı bulunamadı: ${arg}`)
        setTimeout(() => setCommandFlash(null), 3000)
      }
      return true
    }

    if (cmd === '!sessiz' && arg && canMod) {
      // Mute user by username
      const targetUser = activeUsers.find(u => 
        (u.nickname || u.name || '').toLowerCase() === arg.toLowerCase() ||
        (u.name || '').toLowerCase() === arg.toLowerCase()
      )
      if (targetUser) {
        try {
          await fetch(`/api/chat/rooms/${room.id}/moderation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mute_user', targetUserId: targetUser.id, duration: 30, reason: 'Chat komutu ile susturuldu' })
          })
          setCommandFlash(`🔇 ${arg} susturuldu (30dk)`)
          setTimeout(() => setCommandFlash(null), 3000)
        } catch {}
      } else {
        setCommandFlash(`❌ Kullanıcı bulunamadı: ${arg}`)
        setTimeout(() => setCommandFlash(null), 3000)
      }
      return true
    }

    if (cmd === '!yetki' && arg && canMod) {
      // Assign role: !yetki kullanıcı &@+
      const roleMatch = arg.match(/^(.+?)\s+([&@+%~])$/)
      if (roleMatch) {
        const username = roleMatch[1].trim()
        const roleSymbol = roleMatch[2]
        const roleMap: Record<string, string> = { '&': 'sop', '@': 'op', '+': 'voice', '%': 'superadmin', '~': 'founder' }
        const roleName = roleMap[roleSymbol]
        const targetUser = activeUsers.find(u => 
          (u.nickname || u.name || '').toLowerCase() === username.toLowerCase() ||
          (u.name || '').toLowerCase() === username.toLowerCase()
        )
        if (targetUser && roleName) {
          try {
            await fetch(`/api/chat/rooms/${room.id}/moderation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'set_role', targetUserId: targetUser.id, role: roleName })
            })
            setCommandFlash(`✅ ${username} → ${roleSymbol} (${roleName}) yetkisi verildi`)
            setTimeout(() => setCommandFlash(null), 3000)
            fetchActiveUsers()
          } catch {}
        } else {
          setCommandFlash(`❌ Kullanıcı veya rol bulunamadı`)
          setTimeout(() => setCommandFlash(null), 3000)
        }
      } else {
        setCommandFlash('Kullanım: !yetki kullanıcı &/@/+')
        setTimeout(() => setCommandFlash(null), 3000)
      }
      return true
    }

    if (cmd === '!at' && arg && canMod) {
      // Kick user from room
      const targetUser = activeUsers.find(u => 
        (u.nickname || u.name || '').toLowerCase() === arg.toLowerCase() ||
        (u.name || '').toLowerCase() === arg.toLowerCase()
      )
      if (targetUser) {
        try {
          await fetch(`/api/chat/rooms/${room.id}/moderation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'kick_user', targetUserId: targetUser.id, reason: 'Chat komutu ile atıldı' })
          })
          setCommandFlash(`👢 ${arg} odadan atıldı`)
          setTimeout(() => setCommandFlash(null), 3000)
          fetchActiveUsers()
        } catch {}
      } else {
        setCommandFlash(`❌ Kullanıcı bulunamadı: ${arg}`)
        setTimeout(() => setCommandFlash(null), 3000)
      }
      return true
    }

    if (cmd === '!duyuru' && arg && canMod) {
      // Set announcement
      try {
        await fetch(`/api/chat/rooms/${room.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `📢 [DUYURU] ${arg}` })
        })
        fetchMessages()
        setCommandFlash(`📢 Duyuru yayınlandı`)
        setTimeout(() => setCommandFlash(null), 3000)
      } catch {}
      return true
    }

    if (cmd === '!kural') {
      // Show rules
      const rules = [
        '📋 ODA KURALLARI:',
        '1. Saygılı olun, küfür ve hakaret yasaktır',
        '2. Spam yapmayın, aynı mesajı tekrar etmeyin',
        '3. Reklam ve link paylaşımı yasaktır',
        '4. Yetkililerin uyarılarına uyun',
        '5. Mikrofon kullanırken sesli müzik çalmayın'
      ].join('\n')
      setCommandFlash(rules)
      setTimeout(() => setCommandFlash(null), 8000)
      return true
    }

    if (cmd === '!bilgi') {
      // Show room info
      const info = `ℹ️ Oda: ${room.nameTr}\n👥 Kişi: ${activeUsers.length}\n👑 Sahip: ${room.owner?.name || 'Bilinmiyor'}`
      setCommandFlash(info)
      setTimeout(() => setCommandFlash(null), 5000)
      return true
    }

    if (cmd === '!yardım' || cmd === '!komutlar') {
      // Show help
      setShowCommandsPanel(true)
      return true
    }

    return false
  }

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !room || !session?.user || sending) return

    // Check for chat commands first
    const isCommand = await handleChatCommand(newMessage.trim())
    if (isCommand) {
      setNewMessage('')
      requestAnimationFrame(() => inputRef.current?.focus())
      return
    }

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

  // Typing indicator — debounced: only sends network request after 600ms of silence
  const typingActiveRef = useRef(false)
  const handleTyping = useCallback(() => {
    if (!room || !session?.user) return
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    // Only send "isTyping: true" once, not on every keystroke
    if (!typingActiveRef.current) {
      typingActiveRef.current = true
      fetch(`/api/chat/rooms/${room.id}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: true })
      }).catch(() => {})
    }
    // After 3s of no typing, send "isTyping: false"
    typingTimeoutRef.current = setTimeout(() => {
      typingActiveRef.current = false
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
        // Prevent unbounded memory growth — cap seen gift IDs at 200
        if (seenGiftIdsRef.current.size > 200) {
          const arr = Array.from(seenGiftIdsRef.current)
          seenGiftIdsRef.current = new Set(arr.slice(-100))
        }
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
      seatIndex: (user as ActiveUser).seatIndex ?? -1,
    }
    setGiftTargetUser(fullUser)
    setShowGiftModal(true)
    setShowGiftUserSelect(false)
  }

  // Open user profile popup with follow status
  const openUserProfile = async (user: { id: string; name: string; nickname?: string; image?: string | null }) => {
    if (!session?.user?.id || user.id === session.user.id) return
    setProfilePopupUser(user)
    setProfileFollowing(false)
    setProfileFollowLoading(true)
    try {
      const res = await fetch(`/api/user/${user.id}/follow-status`)
      if (res.ok) {
        const data = await res.json()
        setProfileFollowing(data.isFollowing)
      }
    } catch (e) { console.error('Follow status error:', e) }
    setProfileFollowLoading(false)
  }

  // Toggle follow/unfollow
  const handleFollowToggle = async () => {
    if (!profilePopupUser || profileFollowLoading) return
    setProfileFollowLoading(true)
    try {
      const res = await fetch(`/api/user/${profilePopupUser.id}/follow`, {
        method: profileFollowing ? 'DELETE' : 'POST',
      })
      if (res.ok) {
        setProfileFollowing(!profileFollowing)
      }
    } catch (e) { console.error('Follow toggle error:', e) }
    setProfileFollowLoading(false)
  }

  // Transfer ownership
  const handleTransferOwnership = async () => {
    if (!room || !transferTargetId || transferring) return
    if (!confirm('Oda sahipliğini bu kullanıcıya devretmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return
    setTransferring(true)
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/transfer-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId: transferTargetId })
      })
      if (res.ok) {
        alert('Oda sahipliği başarıyla devredildi!')
        setShowTransferModal(false)
        setTransferTargetId(null)
        setShowManagePopup(false)
        fetchRoom()
      } else {
        const data = await res.json()
        alert(data.error || 'Bir hata oluştu')
      }
    } catch (e) {
      console.error('Transfer ownership error:', e)
      alert('Bir hata oluştu')
    }
    setTransferring(false)
  }

  useEffect(() => {
    if (room) {
      fetchGiftTypes()
      fetchLeaderboard()
      const interval = setInterval(fetchLeaderboard, 30000) // was 5s
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
                    {/* Transfer ownership - only room owner */}
                    {myPermissions?.isRoomOwner && (
                      <button
                        onClick={() => { setShowTransferModal(true); setTransferTargetId(null) }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-amber-600/30 text-amber-300 hover:bg-amber-600/50"
                      >
                        <ArrowRightLeft className="w-5 h-5" />
                        {'Sahipliği Devret'}
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
                            {user.id !== session?.user?.id && (
                              <button
                                onClick={() => openUserProfile(user)}
                                className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-xs hover:bg-purple-600/50 flex items-center gap-1"
                              >
                                <UserPlus className="w-3 h-3" />Profil
                              </button>
                            )}
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
            src={room.backgroundImage || '/room-wallpaper-default.jpg'} 
            alt="" 
            className="w-full h-full object-cover"
            key={room.backgroundImage || 'default'}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
        </div>

        {/* ── Top Header Overlay ── */}
        <div className="relative z-10 flex-shrink-0 flex items-center justify-between px-3 py-2 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Room Owner Avatar */}
            {room.owner && (
              <button 
                onClick={() => openUserProfile({ id: room.owner!.id, name: room.owner!.name, image: room.owner!.image })}
                className="w-8 h-8 rounded-full bg-purple-800 border-2 border-gold-500/60 overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-gold-400 transition-all"
              >
                {room.owner.image ? (
                  <img src={room.owner.image} alt={room.owner.name || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                    {(room.owner.username || room.owner.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
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

            {/* Background Image */}
            {(myPermissions?.canManageRoom || myPermissions?.isGlobalAdmin) && (
              <button
                onClick={() => { fetchAdminBgImages(); setShowBgPicker(true) }}
                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                title="Arkaplan Değiştir"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            )}

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

        {/* ── Dynamic Seat Grid (only show occupied rows + 1 extra) ── */}
        {(() => {
          const TOTAL_SEATS = 15
          const COLS = 5
          
          // Build seats from seatIndex — users pick their own seats
          const seats: (ActiveUser | null)[] = new Array(TOTAL_SEATS).fill(null)
          for (const u of activeUsers) {
            if (u.seatIndex >= 0 && u.seatIndex < TOTAL_SEATS) {
              seats[u.seatIndex] = u
            }
          }
          
          // Find the last occupied row and show up to that row + 1 extra row
          let lastOccupiedRow = -1
          for (let i = 0; i < TOTAL_SEATS; i++) {
            if (seats[i]) {
              const row = Math.floor(i / COLS)
              if (row > lastOccupiedRow) lastOccupiedRow = row
            }
          }
          // Show at least 1 row, and 1 extra empty row after last occupied
          const visibleRows = Math.min(Math.max(lastOccupiedRow + 2, 1), 3)
          const visibleSeats = visibleRows * COLS
          
          // Can I manage seats (admin/owner)?
          const canManageSeats = myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || 
            (myPermissions?.role && ['superadmin', 'founder', 'sop', 'admin'].includes(myPermissions.role))

          // Handle claiming a seat for self
          const handleClaimSeat = async (seatIdx: number) => {
            if (!room || !session?.user?.id) return
            try {
              const res = await fetch(`/api/chat/rooms/${room.id}/seats`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seatIndex: seatIdx })
              })
              if (res.ok) {
                mySeatIndexRef.current = seatIdx
                fetchActiveUsers()
              } else {
                const data = await res.json()
                if (res.status === 409) alert(data.error || 'Bu koltuk dolu!')
              }
            } catch {}
          }

          // Handle leaving seat (go back to -1)
          const handleLeaveSeat = async () => {
            if (!room || !session?.user?.id) return
            try {
              const res = await fetch(`/api/chat/rooms/${room.id}/seats`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seatIndex: -1 })
              })
              if (res.ok) {
                mySeatIndexRef.current = -1
                fetchActiveUsers()
              }
            } catch {}
          }

          // Handle kick from seat (admin action)
          const handleKickFromSeat = async (targetUserId: string) => {
            if (!room) return
            try {
              const res = await fetch(`/api/chat/rooms/${room.id}/seats`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, seatIndex: -1 })
              })
              if (res.ok) fetchActiveUsers()
            } catch {}
          }
          
          const isThroneSeat = (idx: number) => idx === 0

          return (
            <div className="relative z-10 flex-shrink-0 px-3 py-3">
              <div className={`grid grid-cols-${COLS} gap-2 max-w-sm mx-auto`} style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {seats.slice(0, visibleSeats).map((seatUser, idx) => {
                  const isThrone = isThroneSeat(idx)
                  
                  if (seatUser) {
                    const isOwner = isRoomOwner(seatUser.id)
                    const badge = seatUser.chatRole ? ROLE_BADGE_STYLES[seatUser.chatRole] : null
                    const isMe = seatUser.id === session?.user?.id
                    const displayImage = isMe && myBroadcastImage ? myBroadcastImage : seatUser.image
                    const isSpeakingSeat = speakingUsers.has(seatUser.id)
                    
                    return (
                      <div key={`seat-${idx}`} className={`flex flex-col items-center gap-0.5 relative group ${isThrone ? 'z-10' : ''}`}>
                        {/* Throne glow for seat 0 */}
                        {isThrone && (
                          <div className="absolute -inset-1 bg-gradient-to-br from-yellow-400/30 via-amber-500/20 to-orange-500/30 rounded-full blur-sm animate-pulse" />
                        )}
                        <div 
                          className={`relative overflow-hidden cursor-pointer transition-all
                            ${isThrone ? 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ring-2 ring-yellow-400/80 shadow-lg shadow-yellow-500/30' : 'w-12 h-12 sm:w-14 sm:h-14 rounded-full'}
                            ${!isThrone && (isSpeakingSeat ? 'ring-2 ring-green-400 animate-pulse' : isOwner ? 'ring-2 ring-yellow-400' : badge ? `ring-2 ${badge.border}` : 'ring-1 ring-white/20')}
                          `}
                          onClick={() => {
                            if (isMe) {
                              if (confirm('Koltuğunuzdan kalkmak istiyor musunuz?')) handleLeaveSeat()
                            } else {
                              openGiftModal(seatUser)
                            }
                          }}
                        >
                          {displayImage ? (
                            <img loading="lazy" src={displayImage} alt={getDisplayName(seatUser)} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${isThrone ? 'bg-gradient-to-br from-yellow-700 via-amber-800 to-yellow-900' : isOwner ? 'bg-gradient-to-br from-red-800 to-yellow-900' : 'bg-gradient-to-br from-purple-800 to-indigo-900'}`}>
                              <span className={`font-bold text-white/80 ${isThrone ? 'text-lg' : 'text-base'}`}>{(seatUser.nickname || seatUser.name || '?').charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          {/* Throne crown overlay */}
                          {isThrone && (
                            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-sm drop-shadow-lg z-10">👑</div>
                          )}
                          {/* Role badge overlay */}
                          {!isThrone && (isOwner || badge) && (
                            <div className={`absolute -bottom-0.5 -right-0.5 px-1 py-0.5 rounded-full text-[7px] font-bold shadow-lg ${isOwner ? 'bg-red-600 text-yellow-200' : badge ? `${badge.bg} ${badge.text}` : ''}`}>
                              {isOwner ? '👑' : seatUser.roleSymbol}
                            </div>
                          )}
                          {/* Speaking glow */}
                          {isSpeakingSeat && (
                            <div className={`absolute inset-0 ${isThrone ? 'rounded-2xl' : 'rounded-full'} border-2 border-green-400 animate-ping opacity-30`} />
                          )}
                        </div>
                        <p className={`text-[9px] font-bold truncate text-center drop-shadow-lg ${isThrone ? 'max-w-[64px] text-yellow-300' : 'max-w-[56px]'} ${getNameEffectClass(seatUser)} ${!isThrone && (isOwner ? 'text-yellow-300' : badge ? badge.text : 'text-white/80')}`}
                          {...(getNameEffectClass(seatUser) === 'effect-glitch' ? { 'data-text': getDisplayName(seatUser) } : {})}
                        >
                          {getDisplayName(seatUser)}
                        </p>
                        {/* Admin: kick from seat button */}
                        {canManageSeats && !isMe && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleKickFromSeat(seatUser.id) }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500 z-20"
                            title="Koltuktan kaldır"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )
                  }
                  
                  // Empty seat — clickable to claim
                  return (
                    <div key={`seat-${idx}`} className="flex flex-col items-center gap-0.5">
                      <button
                        onClick={() => handleClaimSeat(idx)}
                        className={`flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer group
                          ${isThrone 
                            ? 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-yellow-900/20 to-amber-900/20 border-2 border-dashed border-yellow-500/30 hover:border-yellow-400/60 hover:bg-yellow-900/30 shadow-inner' 
                            : 'w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 border border-dashed border-white/20 hover:bg-white/15 hover:border-white/40'
                          }`}
                        title={isThrone ? 'Taht Koltuğu — Oturmak için tıkla' : `Koltuk ${idx + 1} — Oturmak için tıkla`}
                      >
                        {isThrone ? (
                          <span className="text-yellow-500/30 group-hover:text-yellow-400/60 text-lg transition-colors">👑</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        )}
                      </button>
                      <p className={`text-[9px] font-medium ${isThrone ? 'text-yellow-500/30' : 'text-white/20'}`}>{isThrone ? '👑' : idx + 1}</p>
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
        {showAnnouncementEdit ? (
          <div className="relative z-10 mx-3 mb-2">
            <div className="bg-black/70 backdrop-blur-md rounded-lg border border-yellow-500/30 p-3">
              <p className="text-yellow-400 text-xs font-bold mb-2">📢 Duyuruyu Düzenle:</p>
              <textarea
                value={editAnnouncementText}
                onChange={e => setEditAnnouncementText(e.target.value)}
                className="w-full bg-white/10 text-white text-xs rounded-lg p-2 border border-white/20 focus:outline-none focus:border-yellow-500/50 resize-none"
                rows={3}
                placeholder="Oda duyurusu yazın..."
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-white/30 text-[10px]">{editAnnouncementText.length}/500</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowAnnouncementEdit(false)} className="px-3 py-1 text-xs bg-white/10 text-white/70 rounded-lg hover:bg-white/20">İptal</button>
                  <button 
                    onClick={handleSaveAnnouncement} 
                    disabled={savingAnnouncement}
                    className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 flex items-center gap-1 disabled:opacity-50"
                  >
                    {savingAnnouncement ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : room.descTr && showAnnouncement ? (
          <div className="relative z-10 mx-3 mb-2">
            <div className="bg-black/50 backdrop-blur-md rounded-lg border border-white/10 p-3 max-h-32 overflow-y-auto">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-yellow-400 text-xs font-bold mb-1">📢 Duyuru:</p>
                  <p className="text-white/80 text-xs whitespace-pre-wrap leading-relaxed">{room.descTr}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(myPermissions?.canManageRoom || myPermissions?.isGlobalAdmin) && (
                    <button onClick={() => { setEditAnnouncementText(room.descTr || ''); setShowAnnouncementEdit(true) }} className="text-yellow-400/60 hover:text-yellow-400">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => setShowAnnouncement(false)} className="text-white/40 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : !room.descTr && (myPermissions?.canManageRoom || myPermissions?.isGlobalAdmin) ? (
          <div className="relative z-10 mx-3 mb-2">
            <button 
              onClick={() => { setEditAnnouncementText(''); setShowAnnouncementEdit(true) }}
              className="w-full text-left bg-black/30 backdrop-blur-sm rounded-lg border border-dashed border-yellow-500/20 p-2 text-yellow-400/50 text-xs hover:bg-black/40 hover:border-yellow-500/40 transition-all"
            >
              📢 Duyuru eklemek için tıklayın...
            </button>
          </div>
        ) : null}

        {/* ── Chat Room Marquee (scrolling text below duyuru) ── */}
        <ChatRoomMarquee joinEvents={marqueeJoinEvents} />

        {/* ── Music Icon (under announcement) ── */}
        {(myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || myPermissions?.canManageRoom) && (
          <div className="relative z-10 mx-3 mb-2">
            <button
              onClick={() => setShowMusicModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/30 rounded-full text-purple-300 text-xs hover:from-purple-600/50 hover:to-pink-600/50 transition-all"
            >
              <span className="text-base">🎵</span> Müzik Aç
            </button>
          </div>
        )}

        {/* ── Floating Music Player Bar (visible to everyone when music is playing) ── */}
        {currentMusicVideoId && currentMusicTitle && (
          <div className="relative z-10 mx-3 mb-2 flex items-center gap-1.5">
            <button
              onClick={() => setShowMusicModal(true)}
              className="flex-1 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-900/60 via-pink-900/40 to-purple-900/60 border border-purple-500/30 rounded-xl backdrop-blur-sm hover:border-purple-400/50 transition-all group min-w-0"
            >
              {!musicMuted && (
                <div className="flex items-end gap-0.5 mr-1 flex-shrink-0">
                  <span className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" />
                  <span className="w-1 h-4 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                </div>
              )}
              {musicMuted && <VolumeX className="w-4 h-4 text-red-400 flex-shrink-0" />}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] text-purple-300 opacity-70">🎶 Şu an çalıyor</p>
                <p className="text-white text-xs font-medium truncate">{currentMusicTitle}</p>
              </div>
            </button>
            {/* Music mute/unmute button */}
            <button
              onClick={() => setMusicMuted(!musicMuted)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all flex-shrink-0 ${
                musicMuted 
                  ? 'bg-red-600/30 border-red-500/40 text-red-300 hover:bg-red-600/50' 
                  : 'bg-purple-600/30 border-purple-500/30 text-purple-300 hover:bg-purple-600/50'
              }`}
              title={musicMuted ? 'Müzik sesini aç' : 'Müzik sesini kapat'}
            >
              {musicMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* ── Command Flash Overlay ── */}
        {commandFlash && (
          <div className="relative z-20 mx-3 mb-2 animate-pulse">
            <div className="bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border border-yellow-500/40 rounded-lg px-4 py-2 text-center">
              <span className="text-yellow-300 text-sm font-bold drop-shadow-lg">{commandFlash}</span>
            </div>
          </div>
        )}

        {/* ── Song Request Flash (for authorized users) ── */}
        {messages.length > 0 && (() => {
          const lastMsg = messages[messages.length - 1]
          const isRequest = lastMsg?.content?.includes('[İSTEK]')
          const canSeeRequests = myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || 
            (myPermissions?.role && ['superadmin', 'founder', 'sop', 'admin', 'op'].includes(myPermissions.role))
          if (isRequest && canSeeRequests) {
            return (
              <div className="relative z-20 mx-3 mb-2">
                <div className="bg-gradient-to-r from-pink-500/20 via-fuchsia-500/30 to-purple-500/20 border border-fuchsia-500/40 rounded-lg px-4 py-2 text-center animate-pulse">
                  <span className="text-fuchsia-300 text-sm font-bold">{lastMsg.content}</span>
                </div>
              </div>
            )
          }
          return null
        })()}

        {/* ── Background Image Picker Modal ── */}
        {showBgPicker && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBgPicker(false)}>
            <div className="bg-[#1a0a2e] rounded-2xl border border-purple-500/30 p-4 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  Arkaplan Resmi Seç
                </h3>
                <button onClick={() => setShowBgPicker(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              
              {/* Remove background option */}
              <button 
                onClick={() => handleSaveBg(null)}
                disabled={savingBg}
                className={`w-full mb-3 p-3 rounded-xl border-2 transition text-sm ${!room.backgroundImage ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 bg-white/5 text-white/60 hover:border-purple-500/50'}`}
              >
                🚫 Arkaplan Yok (Varsayılan)
              </button>
              
              {adminBgImages.length === 0 ? (
                <p className="text-white/40 text-xs text-center py-4">Henüz arkaplan resmi eklenmemiş</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {adminBgImages.map(img => (
                    <button
                      key={img.id}
                      onClick={() => handleSaveBg(img.imageUrl)}
                      disabled={savingBg}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 transition ${
                        room.backgroundImage === img.imageUrl
                          ? 'border-purple-500 ring-2 ring-purple-500/50'
                          : 'border-white/10 hover:border-purple-500/50'
                      }`}
                    >
                      <img src={img.imageUrl} alt={img.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                        <p className="text-white text-[10px] font-medium truncate">{img.name}</p>
                      </div>
                      {room.backgroundImage === img.imageUrl && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              {savingBg && (
                <div className="flex items-center justify-center gap-2 mt-3 text-purple-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kaydediliyor...
                </div>
              )}
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
                      onClick={() => {
                        if (msg.user.id !== session?.user?.id) {
                          addMention(displayName)
                        }
                      }}
                      onDoubleClick={() => {
                        if (msg.user.id !== session?.user?.id) {
                          openUserProfile({ id: msg.user.id, name: msg.user.name, nickname: msg.user.nickname })
                        }
                      }}
                      className={`font-bold text-xs hover:underline ${getNameEffectClass(msg.user)} ${
                        isOwner ? 'text-yellow-300' : msg.user.chatRole ? ROLE_COLORS[msg.user.chatRole] : isMe ? 'text-gold-400' : 'text-purple-300'
                      }`}
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                      title={msg.user.id !== session?.user?.id ? 'Tıkla: bahset | Çift tıkla: profil' : ''}
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

        {/* ── Commands Panel Toggle (right edge arrow button for authorized users) ── */}
        {session?.user && (myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || myPermissions?.canManageRoom ||
          (myPermissions?.role && ['superadmin', 'founder', 'sop', 'admin', 'op'].includes(myPermissions.role))) && (
          <button
            onClick={() => setShowCommandsPanel(!showCommandsPanel)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-30 w-6 h-14 bg-gradient-to-l from-purple-700/80 to-purple-900/60 border border-purple-500/30 border-r-0 rounded-l-lg flex items-center justify-center text-purple-300 hover:text-white hover:from-purple-600/90 transition-all backdrop-blur-sm shadow-lg"
            title="Komutlar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
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
              {/* Speaker / Listen toggle for non-voice users */}
              {!canUseVoice() && (isListening || voiceUsers.length > 0) && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    isListening ? 'bg-blue-500/40 text-blue-300' : 'bg-white/10 text-white/50 hover:bg-white/20'
                  }`}
                  title={isListening ? 'Sesi Kapat' : 'Sesi Aç'}
                >
                  {isListening ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              )}

              {/* Mic / Voice buttons for voice-permitted users */}
              {canUseVoice() && (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {/* Mic mute/unmute button (when connected) or join voice (when not) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (voiceEnabled) {
                        toggleMicMute()
                      } else {
                        startVoiceChat()
                      }
                    }}
                    disabled={voiceConnecting}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      voiceEnabled
                        ? isMicMuted
                          ? 'bg-yellow-500/50 text-yellow-200'
                          : isSpeaking
                            ? 'bg-green-500/60 text-white animate-pulse'
                            : 'bg-green-500/40 text-green-300'
                        : voiceConnecting
                          ? 'bg-blue-500/30 text-blue-300 opacity-50'
                          : 'bg-white/10 text-white/50 hover:bg-white/20'
                    }`}
                    title={
                      voiceEnabled
                        ? isMicMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'
                        : voiceConnecting ? 'Bağlanıyor...' : 'Sesli Sohbete Katıl'
                    }
                  >
                    {voiceEnabled ? (
                      isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />
                    ) : voiceConnecting ? (
                      <Mic className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                  {/* Disconnect button: only visible when connected */}
                  {voiceEnabled && (
                    <button
                      type="button"
                      onClick={() => stopVoiceChat()}
                      className="w-6 h-6 rounded-full flex items-center justify-center bg-red-500/60 text-white hover:bg-red-600/80 transition-all"
                      title="Sesli Sohbetten Çık"
                    >
                      <PhoneOff className="w-3 h-3" />
                    </button>
                  )}
                </div>
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

            {/* Jeton Loading Area */}
            <div className="flex items-center justify-between mt-1.5 px-1">
              <span className="text-[10px] text-yellow-400/70 flex items-center gap-0.5">💎 {userJetonBalance.toLocaleString()} Jeton</span>
              <button
                type="button"
                onClick={() => window.open(`/${language}/jeton`, '_blank')}
                className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-500/40 rounded-full text-yellow-300 text-[10px] font-bold hover:from-yellow-500/50 hover:to-amber-500/50 transition-all"
              >
                <Coins className="w-3 h-3" /> Jeton Yükle
              </button>
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

        {/* ── Refresh Page Button ── */}
        <div className="relative z-10 flex-shrink-0 px-3 pb-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 border border-white/10 rounded-xl text-purple-300/70 text-xs hover:bg-white/10 hover:text-purple-200 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sayfayı Yenile
          </button>
        </div>

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

      {/* ── Gift Animation Overlay — Fullscreen cinematic gift effect ── */}
      <AnimatePresence>
        {giftAnimations.map((anim) => {
          const giftSrc = anim.giftImage || (anim.giftIcon?.startsWith('/') ? anim.giftIcon : '')
          return (
            <motion.div
              key={anim.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
            >
              {/* Full-screen glow backdrop */}
              <motion.div 
                className="absolute inset-0"
                style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.3) 0%, transparent 70%)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: anim.phase === 'hit' || anim.phase === 'burst' ? 1 : 0 }}
                transition={{ duration: 0.5 }}
              />

              {/* Particle burst ring */}
              {(anim.phase === 'burst' || anim.phase === 'exit') && (
                <>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * 360
                    const rad = (angle * Math.PI) / 180
                    const dist = 120 + Math.random() * 60
                    return (
                      <motion.div
                        key={`p-${anim.id}-${i}`}
                        className="absolute w-2 h-2 rounded-full"
                        style={{ 
                          background: ['#FFD700', '#FF69B4', '#00BFFF', '#FF6347', '#7CFC00', '#FFD700', '#FF1493', '#9400D3', '#00CED1', '#FF8C00', '#ADFF2F', '#FF69B4'][i],
                          boxShadow: `0 0 8px ${['#FFD700', '#FF69B4', '#00BFFF', '#FF6347', '#7CFC00', '#FFD700', '#FF1493', '#9400D3', '#00CED1', '#FF8C00', '#ADFF2F', '#FF69B4'][i]}`
                        }}
                        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                        animate={{
                          x: Math.cos(rad) * dist,
                          y: Math.sin(rad) * dist,
                          scale: 0,
                          opacity: 0
                        }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                      />
                    )
                  })}
                </>
              )}

              {/* Sparkle stars — continuous during visible */}
              {anim.phase !== 'exit' && Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={`s-${anim.id}-${i}`}
                  className="absolute text-yellow-300"
                  style={{ fontSize: 10 + Math.random() * 14 }}
                  initial={{
                    x: -80 + Math.random() * 160,
                    y: -60 + Math.random() * 120,
                    opacity: 0,
                    scale: 0,
                    rotate: 0
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.2, 0],
                    rotate: 360,
                    y: [-60 + Math.random() * 120, -100 - Math.random() * 80]
                  }}
                  transition={{
                    duration: 1.5 + Math.random() * 1,
                    delay: Math.random() * 0.8,
                    repeat: 1,
                    repeatDelay: 0.5
                  }}
                >
                  ✦
                </motion.div>
              ))}

              {/* Center content */}
              <div className="relative flex flex-col items-center">
                {/* Gift image — big, zooming in with bounce */}
                <motion.div
                  className="relative"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={
                    anim.phase === 'enter' ? { scale: 1.2, rotate: 0 } :
                    anim.phase === 'hit' ? { scale: 1.5, rotate: [0, -5, 5, 0] } :
                    anim.phase === 'burst' ? { scale: 1, rotate: 0 } :
                    { scale: 0, rotate: 20, y: -100, opacity: 0 }
                  }
                  transition={
                    anim.phase === 'enter' ? { type: 'spring', stiffness: 300, damping: 15 } :
                    anim.phase === 'hit' ? { duration: 0.6, ease: 'easeOut' } :
                    anim.phase === 'burst' ? { duration: 0.4 } :
                    { duration: 0.5, ease: 'easeIn' }
                  }
                >
                  {/* Glow behind gift */}
                  <div className="absolute inset-0 blur-2xl bg-yellow-400/40 rounded-full scale-150" />
                  {giftSrc ? (
                    <img src={giftSrc} alt="gift" className="relative w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]" />
                  ) : (
                    <span className="relative text-7xl sm:text-8xl drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]">{anim.giftIcon || '🎁'}</span>
                  )}
                  {/* Amount badge */}
                  {anim.amount > 1 && (
                    <motion.div
                      className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white font-black text-sm px-2.5 py-1 rounded-full shadow-lg shadow-red-500/50 border-2 border-white/30"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
                    >
                      x{anim.amount}
                    </motion.div>
                  )}
                </motion.div>

                {/* Sender → Recipient text */}
                <motion.div
                  className="mt-4 text-center"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <div className="bg-black/60 backdrop-blur-md rounded-2xl px-5 py-2.5 border border-white/10 shadow-xl">
                    <p className="text-sm sm:text-base font-bold">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400">{anim.senderName}</span>
                      <span className="mx-2 text-white/40">→</span>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-400">{anim.recipientName}</span>
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Corner fireworks / light streaks */}
              {anim.phase === 'hit' && (
                <>
                  <motion.div
                    className="absolute top-1/4 left-1/4 w-32 h-1 bg-gradient-to-r from-yellow-400 to-transparent rounded-full"
                    initial={{ scaleX: 0, opacity: 0, rotate: -45 }}
                    animate={{ scaleX: 1, opacity: [0, 1, 0], rotate: -45 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    style={{ transformOrigin: 'left center' }}
                  />
                  <motion.div
                    className="absolute top-1/4 right-1/4 w-32 h-1 bg-gradient-to-l from-pink-400 to-transparent rounded-full"
                    initial={{ scaleX: 0, opacity: 0, rotate: 45 }}
                    animate={{ scaleX: 1, opacity: [0, 1, 0], rotate: 45 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    style={{ transformOrigin: 'right center' }}
                  />
                  <motion.div
                    className="absolute bottom-1/3 left-1/3 w-24 h-1 bg-gradient-to-r from-blue-400 to-transparent rounded-full"
                    initial={{ scaleX: 0, opacity: 0, rotate: 30 }}
                    animate={{ scaleX: 1, opacity: [0, 1, 0], rotate: 30 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    style={{ transformOrigin: 'left center' }}
                  />
                </>
              )}
            </motion.div>
          )
        })}
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

              {/* Send Button + Jeton Yükle */}
              <div className="p-3 border-t border-purple-500/20 space-y-2">
                <button
                  onClick={sendGift}
                  disabled={!selectedGiftType || sendingGift}
                  className="w-full py-2.5 bg-gradient-to-r from-gold-500 to-yellow-500 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-gold-400 hover:to-yellow-400 transition-all"
                >
                  {sendingGift ? 'Gönderiliyor...' : `Hediye Gönder (${giftTypes.find(g => g.id === selectedGiftType)?.price || 0} Jeton)`}
                </button>
                <button
                  onClick={() => {
                    setShowGiftModal(false)
                    window.open(`/${language}/jeton`, '_blank')
                  }}
                  className="w-full py-2 bg-purple-600/30 text-purple-200 font-medium rounded-lg hover:bg-purple-600/50 transition-all text-sm flex items-center justify-center gap-2 border border-purple-500/30"
                >
                  <Coins className="w-4 h-4 text-gold-400" />
                  Jeton Yükle
                </button>
                <p className="text-center text-purple-400/50 text-[10px]">Bakiye: {userJetonBalance.toLocaleString()} Jeton</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile Popup (Follow/Unfollow + Jeton) */}
      <AnimatePresence>
        {profilePopupUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setProfilePopupUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a0b2e] border border-purple-500/30 rounded-xl max-w-xs w-full p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-3">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-purple-800 border-2 border-gold-500/60 overflow-hidden">
                  {profilePopupUser.image ? (
                    <img src={profilePopupUser.image} alt={profilePopupUser.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                      {(profilePopupUser.nickname || profilePopupUser.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Name */}
                <h3 className="text-white font-bold text-lg">{profilePopupUser.nickname || profilePopupUser.name}</h3>
                {/* Follow/Unfollow Button */}
                <button
                  onClick={handleFollowToggle}
                  disabled={profileFollowLoading}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    profileFollowing
                      ? 'bg-purple-600/30 text-purple-300 hover:bg-red-600/30 hover:text-red-300 border border-purple-500/30'
                      : 'bg-gradient-to-r from-gold-500 to-yellow-500 text-black hover:from-gold-400 hover:to-yellow-400'
                  } disabled:opacity-50`}
                >
                  {profileFollowLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : profileFollowing ? (
                    <><UserCheck className="w-4 h-4" />Takip Ediliyor</>
                  ) : (
                    <><UserPlus className="w-4 h-4" />Takip Et</>
                  )}
                </button>
                {/* Gift Button */}
                <button
                  onClick={() => {
                    const activeUser = activeUsers.find(u => u.id === profilePopupUser.id)
                    if (activeUser) {
                      openGiftModal(activeUser)
                    } else {
                      openGiftModal({
                        id: profilePopupUser.id,
                        name: profilePopupUser.name,
                        nickname: profilePopupUser.nickname,
                        image: profilePopupUser.image
                      })
                    }
                    setProfilePopupUser(null)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm bg-pink-600/30 text-pink-300 hover:bg-pink-600/50 border border-pink-500/30"
                >
                  <Gift className="w-4 h-4" />Hediye Gönder
                </button>
                {/* Close */}
                <button
                  onClick={() => setProfilePopupUser(null)}
                  className="text-purple-400/60 hover:text-white text-sm mt-1"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Commands Panel (right side slide-out for authorized users) ── */}
      <AnimatePresence>
        {showCommandsPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCommandsPanel(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-gradient-to-b from-[#1a0b2e] to-[#0d0518] border-l border-purple-500/30 shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-md border-b border-purple-500/20">
                <h3 className="text-gold-400 font-bold text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Oda Komutları
                </h3>
                <button onClick={() => setShowCommandsPanel(false)} className="text-purple-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Herkes için komutlar */}
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">👤 Herkes</h4>
                  <div className="space-y-1.5">
                    <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-2.5">
                      <code className="text-yellow-300 text-xs font-mono">!istek şarkı adı</code>
                      <p className="text-purple-300/70 text-[10px] mt-0.5">🎵 Şarkı isteği gönderir (yetkililere görünür)</p>
                    </div>
                    <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-2.5">
                      <code className="text-yellow-300 text-xs font-mono">!kural</code>
                      <p className="text-purple-300/70 text-[10px] mt-0.5">📋 Oda kurallarını gösterir</p>
                    </div>
                    <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-2.5">
                      <code className="text-yellow-300 text-xs font-mono">!bilgi</code>
                      <p className="text-purple-300/70 text-[10px] mt-0.5">ℹ️ Oda bilgilerini gösterir</p>
                    </div>
                    <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-2.5">
                      <code className="text-yellow-300 text-xs font-mono">!yardım</code>
                      <p className="text-purple-300/70 text-[10px] mt-0.5">📖 Bu paneli açar</p>
                    </div>
                  </div>
                </div>

                {/* Yetkili komutları */}
                {(myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || myPermissions?.canManageRoom ||
                  (myPermissions?.role && ['superadmin', 'founder', 'sop', 'admin', 'op'].includes(myPermissions.role))) && (
                  <div>
                    <h4 className="text-orange-300 text-xs font-bold uppercase tracking-wider mb-2">🛡️ Yetkili Komutları</h4>
                    <div className="space-y-1.5">
                      <div className="bg-orange-900/20 border border-orange-500/20 rounded-lg p-2.5">
                        <code className="text-yellow-300 text-xs font-mono">!ban kullanıcı</code>
                        <p className="text-orange-300/70 text-[10px] mt-0.5">🚫 Kullanıcıyı odadan banlar</p>
                      </div>
                      <div className="bg-orange-900/20 border border-orange-500/20 rounded-lg p-2.5">
                        <code className="text-yellow-300 text-xs font-mono">!sessiz kullanıcı</code>
                        <p className="text-orange-300/70 text-[10px] mt-0.5">🔇 30 dakika susturur</p>
                      </div>
                      <div className="bg-orange-900/20 border border-orange-500/20 rounded-lg p-2.5">
                        <code className="text-yellow-300 text-xs font-mono">!at kullanıcı</code>
                        <p className="text-orange-300/70 text-[10px] mt-0.5">👢 Kullanıcıyı odadan atar</p>
                      </div>
                      <div className="bg-orange-900/20 border border-orange-500/20 rounded-lg p-2.5">
                        <code className="text-yellow-300 text-xs font-mono">!temizle</code>
                        <p className="text-orange-300/70 text-[10px] mt-0.5">💫 Tüm sohbeti temizler</p>
                      </div>
                      <div className="bg-orange-900/20 border border-orange-500/20 rounded-lg p-2.5">
                        <code className="text-yellow-300 text-xs font-mono">!duyuru mesaj</code>
                        <p className="text-orange-300/70 text-[10px] mt-0.5">📢 Duyuru mesajı yayınlar</p>
                      </div>
                      <div className="bg-orange-900/20 border border-orange-500/20 rounded-lg p-2.5">
                        <code className="text-yellow-300 text-xs font-mono">!yetki kullanıcı sembol</code>
                        <p className="text-orange-300/70 text-[10px] mt-0.5">✅ Rol verir</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/20 rounded text-yellow-300">~ Founder</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-red-500/20 rounded text-red-300">% SuperAdmin</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-orange-500/20 rounded text-orange-300">& SOP</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-green-500/20 rounded text-green-300">@ OP</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 rounded text-blue-300">+ Voice</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Jeton Bilgisi */}
                <div className="mt-4 bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-yellow-400 text-xs font-bold flex items-center gap-1"><Coins className="w-3.5 h-3.5" /> Jeton Bakiye</span>
                    <span className="text-yellow-300 font-bold text-sm">💎 {userJetonBalance.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => { setShowCommandsPanel(false); window.open(`/${language}/jeton`, '_blank') }}
                    className="w-full py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold rounded-lg text-xs hover:from-yellow-400 hover:to-amber-400 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Coins className="w-3.5 h-3.5" /> Jeton Yükle
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Ownership Modal */}
      <AnimatePresence>
        {showTransferModal && room && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowTransferModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a0b2e] border border-purple-500/30 rounded-xl max-w-md w-full max-h-[70vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
                <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />
                  Sahipliği Devret
                </h3>
                <button onClick={() => setShowTransferModal(false)} className="text-purple-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-purple-300/80 text-sm mb-4">
                  Oda sahipliğini devretmek istediğiniz kullanıcıyı seçin. Bu işlem geri alınamaz.
                </p>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {activeUsers.filter(u => u.id !== session?.user?.id).length === 0 ? (
                    <p className="text-purple-400/50 text-sm text-center py-4">Odada başka aktif kullanıcı yok</p>
                  ) : (
                    activeUsers.filter(u => u.id !== session?.user?.id).map(user => (
                      <button
                        key={user.id}
                        onClick={() => setTransferTargetId(user.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          transferTargetId === user.id
                            ? 'bg-amber-600/30 border border-amber-500/50 text-amber-200'
                            : 'bg-[#0d0520] text-purple-200 hover:bg-purple-600/20'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-800 overflow-hidden flex-shrink-0">
                          {user.image ? (
                            <img src={user.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                              {(user.nickname || user.name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="font-medium">{getDisplayName(user)}</span>
                        {transferTargetId === user.id && <UserCheck className="w-4 h-4 text-amber-400 ml-auto" />}
                      </button>
                    ))
                  )}
                </div>
                {transferTargetId && (
                  <button
                    onClick={handleTransferOwnership}
                    disabled={transferring}
                    className="w-full mt-4 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-bold rounded-lg disabled:opacity-50 hover:from-amber-500 hover:to-yellow-500 transition-all flex items-center justify-center gap-2"
                  >
                    {transferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                    {transferring ? 'Devrediliyor...' : 'Sahipliği Devret'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── YouTube Music Modal ── */}
      <YouTubeMusicModal
        isOpen={showMusicModal}
        onClose={() => setShowMusicModal(false)}
        roomId={room?.id || ''}
        currentVideoId={currentMusicVideoId}
        currentTitle={currentMusicTitle}
        canControl={!!(myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || myPermissions?.canManageRoom)}
      />

      {/* ── Hidden YouTube Audio Player (plays for ALL users in room) ── */}
      {currentMusicVideoId && !showMusicModal && !musicMuted && (
        <div style={{ position: 'fixed', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none', bottom: 0, left: 0 }}>
          <iframe
            key={currentMusicVideoId}
            src={`https://www.youtube.com/embed/${currentMusicVideoId}?autoplay=1&loop=1&playlist=${currentMusicVideoId}`}
            allow="autoplay; encrypted-media"
            style={{ width: 1, height: 1, border: 'none' }}
          />
        </div>
      )}

    </div>
  )
}