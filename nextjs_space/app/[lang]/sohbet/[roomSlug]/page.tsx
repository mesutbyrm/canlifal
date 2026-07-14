'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import type { TRTC } from '@/lib/trtc-client'
import { Send, Users, Sparkles, LogIn, VolumeX, Volume2, UserMinus, Ban, Shield, ShieldAlert, Crown, Star, Mic, MicOff, AtSign, Bell, X, Settings, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Trash2, Home, DoorOpen, Phone, PhoneOff, Gift, Coins, Trophy, Edit2, ImageIcon, Save, Loader2, UserPlus, UserCheck, UserX, ArrowRightLeft, Music, RefreshCw, Share2, Eye, Swords } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import ChatRoomMarquee from '@/components/chat-room-marquee'
import dynamic from 'next/dynamic'
const YouTubeMusicModal = dynamic(() => import('@/components/youtube-music-modal'), { ssr: false })
const PKBattleOverlay = dynamic(() => import('@/components/pk-battle-overlay'), { ssr: false })

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
  bannedWords?: string | null
  djUserIds?: string | null
  activeDjId?: string | null
  whitelistedWords?: string | null
  userCount?: number
  isActive?: boolean
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
  const { theme } = useSiteTheme()
  const isCanlidark = theme === 'canlidark'
  
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
  const [userActionTarget, setUserActionTarget] = useState<ActiveUser | null>(null)
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
  const [announcementProgress, setAnnouncementProgress] = useState(100)
  
  // Room owner controls
  const [showAnnouncementEdit, setShowAnnouncementEdit] = useState(false)
  const [editAnnouncementText, setEditAnnouncementText] = useState('')
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [adminBgImages, setAdminBgImages] = useState<Array<{id: string, name: string, imageUrl: string}>>([])
  const [savingBg, setSavingBg] = useState(false)
  
  // Voice Chat with TRTC
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
  const rulesShownRef = useRef(false) // Show rules once per room entry
  
  // Profanity filter state
  const [profanityAlert, setProfanityAlert] = useState<{ msgId: string; userId: string; userName: string; content: string; detectedWord?: string } | null>(null)
  const [deletedMsgNotice, setDeletedMsgNotice] = useState<string | null>(null)
  
  // Seat assignment state (owner feature)
  const [assignSeatIdx, setAssignSeatIdx] = useState<number | null>(null)
  const isLeavingPageRef = useRef(false) // Distinguish intentional leave from effect cleanup
  const roomIdRef = useRef<string | null>(null) // For cleanup on unmount
  const [voiceUsers, setVoiceUsers] = useState<Array<{id: string, name: string}>>([])
  const trtcRef = useRef<TRTC | null>(null)
  
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
  
  // PK Battle system
  const [activePKBattle, setActivePKBattle] = useState<any>(null)
  const [incomingPKRequest, setIncomingPKRequest] = useState<any>(null)
  const [pkSendingAction, setPkSendingAction] = useState(false)
  const pkDismissedRef = useRef<Set<string>>(new Set())
  
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
  const [currentMusicDuration, setCurrentMusicDuration] = useState<string | null>(null)
  const [currentMusicRequestType, setCurrentMusicRequestType] = useState<string>('audio')
  const [musicMuted, setMusicMuted] = useState(false)
  const [musicPaused, setMusicPaused] = useState(false)
  const musicTimerRef = useRef<NodeJS.Timeout | null>(null)
  const musicStartTimeRef = useRef<number | null>(null)
  const musicPausedAtRef = useRef<number>(0) // elapsed seconds when paused
  
  // DJ System
  const [djUsers, setDjUsers] = useState<Array<{id: string; name: string; image?: string | null; isPresent: boolean}>>([])
  const [activeDjId, setActiveDjId] = useState<string | null>(null)
  const [ownerPresent, setOwnerPresent] = useState(false)
  const [canPlayMusic, setCanPlayMusic] = useState(false)
  const [showDjPanel, setShowDjPanel] = useState(false)
  
  // Song Request System
  const [showSongRequestModal, setShowSongRequestModal] = useState(false)
  const [songRequestQuery, setSongRequestQuery] = useState('')
  const [songRequestResults, setSongRequestResults] = useState<Array<{id: string; title: string; thumbnail: string; channel: string; duration?: string}>>([])
  const [songRequestSearching, setSongRequestSearching] = useState(false)
  const [songRequestSelected, setSongRequestSelected] = useState<{id: string; title: string; duration?: string} | null>(null)
  const [songRequestDedication, setSongRequestDedication] = useState('')
  const [songRequestNote, setSongRequestNote] = useState('')
  const [songRequestSending, setSongRequestSending] = useState(false)
  const songRequestSearchTimeout = useRef<NodeJS.Timeout | null>(null)
  const [musicQueue, setMusicQueue] = useState<Array<{id: string; videoId: string; title: string; dedication?: string; note?: string; duration?: string; requestType?: string; isPaid: boolean; requestedBy: string; userName?: string}>>([])
  const musicQueueProcessingRef = useRef(false)
  
  // Commands panel
  const [showCommandsPanel, setShowCommandsPanel] = useState(false)
  const [commandSubPanel, setCommandSubPanel] = useState<string | null>(null) // 'duyuru' | 'kick' | 'ban' | 'unban' | 'pk' | null
  const [duyuruText, setDuyuruText] = useState('')
  const [pinnedDuyuru, setPinnedDuyuru] = useState<string | null>(null)
  const pinnedDuyuruTimerRef = useRef<NodeJS.Timeout | null>(null)
  const kickCountsRef = useRef<Map<string, number>>(new Map())
  
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

  // Handle mobile keyboard - recalculate viewport height
  const handleInputFocus = useCallback(() => {
    const recalc = () => {
      const height = window.visualViewport?.height || window.innerHeight
      const vh = height * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    // Multiple recalcs to catch different keyboard animation speeds on various devices
    setTimeout(recalc, 100)
    setTimeout(recalc, 300)
    setTimeout(recalc, 600)
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
      const height = window.visualViewport?.height || window.innerHeight
      const vh = height * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    
    setVH()
    window.addEventListener('resize', setVH)
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH)
      window.visualViewport.addEventListener('scroll', setVH)
    }
    
    return () => {
      window.removeEventListener('resize', setVH)
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
        let incoming = (data.messages || []).slice(-100) // Cap at 100 messages
        const newLastId = incoming.length > 0 ? incoming[incoming.length - 1].id : null
        
        // Skip state update if messages haven't changed
        if (newLastId === lastMessageIdRef.current && incoming.length === previousMessagesCount.current) {
          return
        }
        lastMessageIdRef.current = newLastId
        
        // Inject local rules message on first load (auto-dismiss after 15s)
        if (!rulesShownRef.current && incoming.length >= 0) {
          rulesShownRef.current = true
          const rulesId = 'local-rules-' + Date.now()
          const rulesMsg = {
            id: rulesId,
            content: '[SYSTEM_RULES]📋 ODA KURALLARI:\n1. Saygılı olun, küfür ve hakaret yasaktır\n2. Spam yapmayın, aynı mesajı tekrar etmeyin\n3. Reklam ve link paylaşımı yasaktır\n4. Yetkililerin uyarılarına uyun\n5. Mikrofon kullanırken sesli müzik çalmayın',
            createdAt: new Date().toISOString(),
            user: { id: 'system', name: 'Sistem', image: null }
          }
          incoming = [rulesMsg, ...incoming]
          // Auto-remove rules message after 15 seconds
          setTimeout(() => {
            setMessages(prev => prev.filter(m => m.id !== rulesId))
          }, 15000)
        }
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
        // TRTC uses string userIds directly - no UID mapping needed
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
          setCurrentMusicDuration(data.duration || null)
          setCurrentMusicRequestType(data.requestType || 'audio')
        }
      } catch {}
    }
    fetchMusic()
    const interval = setInterval(fetchMusic, 15000) // was 5s
    return () => { cancelled = true; clearInterval(interval) }
  }, [room?.id])

  // ── DJ System: Poll DJ state ──
  useEffect(() => {
    if (!room?.id || !session?.user) return
    let cancelled = false
    const fetchDjState = async () => {
      try {
        const res = await fetch(`/api/chat/rooms/${room.id}/dj`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setDjUsers(data.djUsers || [])
          setActiveDjId(data.activeDjId || null)
          setOwnerPresent(data.ownerPresent || false)
          setCanPlayMusic(data.canPlayMusic || false)
        }
      } catch {}
    }
    fetchDjState()
    const interval = setInterval(fetchDjState, 10000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [room?.id, session?.user])

  // Auto-mute own mic when music is playing, unmute when stopped
  useEffect(() => {
    if (!trtcRef.current || !voiceEnabled) return
    const isMusicPlaying = !!currentMusicVideoId
    try {
      if (isMusicPlaying && !isMicMuted) {
        import('@/lib/trtc-client').then(({ muteLocalAudio }) => {
          if (trtcRef.current) muteLocalAudio(trtcRef.current, true)
        })
        setIsMicMuted(true)
      }
    } catch (e) {
      console.error('Music auto-mute error:', e)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMusicVideoId, voiceEnabled])

  // ── Song Request: YouTube Search ──
  const handleSongRequestSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setSongRequestResults([]); return }
    setSongRequestSearching(true)
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (data.videos) setSongRequestResults(data.videos)
    } catch {} finally { setSongRequestSearching(false) }
  }, [])

  const onSongRequestInput = (val: string) => {
    setSongRequestQuery(val)
    if (songRequestSearchTimeout.current) clearTimeout(songRequestSearchTimeout.current)
    songRequestSearchTimeout.current = setTimeout(() => handleSongRequestSearch(val), 600)
  }

  // ── Song Request: Submit (10 jeton) ──
  const submitSongRequest = async () => {
    if (!songRequestSelected || !room || !session?.user || songRequestSending) return
    if (userJetonBalance < 10) {
      alert('Şarkı istemek için en az 10 jetonunuz olmalıdır!')
      return
    }
    setSongRequestSending(true)
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/song-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: songRequestSelected.id,
          title: songRequestSelected.title,
          dedication: songRequestDedication.trim() || undefined,
          note: songRequestNote.trim() || undefined,
          duration: songRequestSelected.duration || undefined,
        })
      })
      if (res.ok) {
        fetchMessages()
        fetchBalance()
        setShowSongRequestModal(false)
        setSongRequestSelected(null)
        setSongRequestQuery('')
        setSongRequestResults([])
        setSongRequestDedication('')
        setSongRequestNote('')
        setCommandFlash('🎵 Şarkı isteğiniz kuyruğa eklendi!')
        setTimeout(() => setCommandFlash(null), 4000)
      } else {
        const data = await res.json()
        alert(data.error || 'İstek gönderilemedi')
      }
    } catch { alert('Bir hata oluştu') }
    finally { setSongRequestSending(false) }
  }

  // ── Music Queue: Poll queue & auto-play next ──
  useEffect(() => {
    if (!room?.id) return
    let cancelled = false
    const fetchQueue = async () => {
      try {
        const res = await fetch(`/api/chat/rooms/${room.id}/song-request`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          const queue = (data.queue || []).map((q: any) => ({ ...q, requestedBy: q.requestedBy || q.userName || 'Anonim' }))
          setMusicQueue(queue)

          // Auto-play next from queue if no music is playing and queue has items
          if (!currentMusicVideoId && queue.length > 0 && !musicQueueProcessingRef.current) {
            musicQueueProcessingRef.current = true
            const next = queue[0]
            try {
              // PATCH marks as played AND sets music on the room
              await fetch(`/api/chat/rooms/${room.id}/song-request`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: next.id })
              })
              // Immediately fetch new music state
              const mRes = await fetch(`/api/chat/rooms/${room.id}/music`)
              if (mRes.ok) {
                const mData = await mRes.json()
                setCurrentMusicVideoId(mData.videoId || null)
                setCurrentMusicTitle(mData.title || null)
                setCurrentMusicDuration(mData.duration || null)
                setCurrentMusicRequestType(mData.requestType || 'audio')
              }
              setMusicPaused(false)
            } catch {} finally {
              musicQueueProcessingRef.current = false
            }
          }
        }
      } catch {}
    }
    fetchQueue()
    const interval = setInterval(fetchQueue, 15000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [room?.id, currentMusicVideoId])

  // ── Helper: parse duration string "3:45" or "1:02:30" to seconds ──
  const parseDurationToSeconds = (dur: string | null): number => {
    if (!dur) return 0
    const parts = dur.split(':').map(Number)
    if (parts.some(isNaN)) return 0
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    return parts[0] || 0
  }

  // ── Music auto-next: fetch fresh queue from API when duration ends, then play next ──
  // Uses a ref to always access latest queue for the callback
  const musicQueueRef = useRef(musicQueue)
  useEffect(() => { musicQueueRef.current = musicQueue }, [musicQueue])

  useEffect(() => {
    if (musicTimerRef.current) { clearTimeout(musicTimerRef.current); musicTimerRef.current = null }

    if (!currentMusicVideoId || musicPaused) return

    const roomId = room?.id
    if (!roomId) return

    // Use parsed duration or default 6 minutes if unknown
    const totalSeconds = parseDurationToSeconds(currentMusicDuration) || 360

    const elapsed = musicPausedAtRef.current || 0
    const remaining = Math.max((totalSeconds - elapsed) * 1000 + 3000, 1000) // +3s buffer

    musicStartTimeRef.current = Date.now() - (elapsed * 1000)

    musicTimerRef.current = setTimeout(async () => {
      // Fetch fresh queue from API instead of using stale closure
      try {
        const qRes = await fetch(`/api/chat/rooms/${roomId}/song-request`)
        if (qRes.ok) {
          const qData = await qRes.json()
          const freshQueue = qData.queue || []
          if (freshQueue.length > 0) {
            const next = freshQueue[0]
            await fetch(`/api/chat/rooms/${roomId}/song-request`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requestId: next.id })
            })
            musicPausedAtRef.current = 0
            // Immediately fetch new music state so iframe updates
            try {
              const mRes = await fetch(`/api/chat/rooms/${roomId}/music`)
              if (mRes.ok) {
                const mData = await mRes.json()
                setCurrentMusicVideoId(mData.videoId || null)
                setCurrentMusicTitle(mData.title || null)
                setCurrentMusicDuration(mData.duration || null)
                setCurrentMusicRequestType(mData.requestType || 'audio')
                setMusicPaused(false)
              }
            } catch {}
          } else {
            // Queue empty — stop music instead of looping
            try {
              await fetch(`/api/chat/rooms/${roomId}/music`, { method: 'DELETE' })
            } catch {}
            musicPausedAtRef.current = 0
            setCurrentMusicVideoId(null)
            setCurrentMusicTitle(null)
            setCurrentMusicDuration(null)
            setMusicPaused(false)
          }
        }
      } catch {}
    }, remaining)

    return () => { if (musicTimerRef.current) { clearTimeout(musicTimerRef.current); musicTimerRef.current = null } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMusicVideoId, currentMusicDuration, musicPaused, room?.id])

  // Track elapsed time when pausing
  useEffect(() => {
    if (musicPaused && musicStartTimeRef.current) {
      musicPausedAtRef.current = Math.floor((Date.now() - musicStartTimeRef.current) / 1000)
    }
  }, [musicPaused])

  // Reset pause tracking when song changes
  useEffect(() => {
    musicPausedAtRef.current = 0
    musicStartTimeRef.current = currentMusicVideoId ? Date.now() : null
  }, [currentMusicVideoId])

  // ── Skip to next song ──
  const handleSkipToNext = async () => {
    if (!room) return
    try {
      const qRes = await fetch(`/api/chat/rooms/${room.id}/song-request`)
      if (qRes.ok) {
        const qData = await qRes.json()
        const freshQueue = qData.queue || []
        if (freshQueue.length > 0) {
          const next = freshQueue[0]
          await fetch(`/api/chat/rooms/${room.id}/song-request`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: next.id })
          })
          musicPausedAtRef.current = 0
          const mRes = await fetch(`/api/chat/rooms/${room.id}/music`)
          if (mRes.ok) {
            const mData = await mRes.json()
            setCurrentMusicVideoId(mData.videoId || null)
            setCurrentMusicTitle(mData.title || null)
            setCurrentMusicDuration(mData.duration || null)
            setCurrentMusicRequestType(mData.requestType || 'audio')
            setMusicPaused(false)
          }
        } else {
          await handleStopMusic()
        }
      }
    } catch {}
  }

  // ── Music stop handler ──
  const handleStopMusic = async () => {
    if (!room) return
    try {
      await fetch(`/api/chat/rooms/${room.id}/music`, { method: 'DELETE' })
      setCurrentMusicVideoId(null)
      setCurrentMusicTitle(null)
      setCurrentMusicDuration(null)
      setMusicPaused(false)
      musicPausedAtRef.current = 0
      if (musicTimerRef.current) { clearTimeout(musicTimerRef.current); musicTimerRef.current = null }
    } catch {}
  }

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

  // ─── TRTC Voice Chat ──────────────────────────────────────────

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

      // 2. Lazy-import TRTC helpers
      const { createTRTCInstance, fetchTRTCCredentials, enterRoom, startLocalAudio, enableAudioVolumeEvaluation, getTRTCEvent } = await import('@/lib/trtc-client')

      // 3. Create TRTC instance
      const trtc = await createTRTCInstance()
      trtcRef.current = trtc

      // 4. Get TRTC events and register listeners BEFORE joining
      const EVENT = await getTRTCEvent()

      // Volume indicator for speaking detection
      enableAudioVolumeEvaluation(trtc, 500)
      trtc.on(EVENT.AUDIO_VOLUME as any, (event: any) => {
        const newSpeaking = new Set<string>()
        for (const { userId, volume } of event.result) {
          if (volume > 5) {
            if (userId === '') {
              // Empty string = local user
              if (session?.user?.id) newSpeaking.add(session.user.id)
            } else {
              newSpeaking.add(userId)
            }
          }
        }
        setSpeakingUsers(newSpeaking)
        if (session?.user?.id) {
          setIsSpeaking(newSpeaking.has(session.user.id))
        }
      })

      // TRTC auto-plays remote audio, no manual subscribe needed
      // Remote audio available event (TRTC handles playback automatically)

      // 5. Get credentials and enter room as anchor
      const userId = session?.user?.id || `anon_${Date.now()}`
      const roomId = `voice_room_${room.id}`
      const credentials = await fetchTRTCCredentials(userId, roomId)
      await enterRoom(trtc, credentials, roomId, 'host', 'rtc')

      // 6. Start local audio (mic)
      await startLocalAudio(trtc)

      setVoiceEnabled(true)
      setVoiceConnecting(false)
      console.log('TRTC voice chat started as host')

      // 7. Refresh voice users list
      fetchVoiceUsers()

    } catch (error: unknown) {
      console.error('Error starting TRTC voice chat:', error)
      setVoiceConnecting(false)
      // Cleanup on failure
      if (trtcRef.current) {
        try {
          const { exitRoom, destroyTRTC } = await import('@/lib/trtc-client')
          await exitRoom(trtcRef.current)
          await destroyTRTC(trtcRef.current)
        } catch {}
        trtcRef.current = null
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
    if (!trtcRef.current || !voiceEnabled) return
    try {
      const { muteLocalAudio } = await import('@/lib/trtc-client')
      if (isMicMuted) {
        await muteLocalAudio(trtcRef.current, false)
        setIsMicMuted(false)
        console.log('Mic unmuted')
      } else {
        await muteLocalAudio(trtcRef.current, true)
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

    // Leave TRTC room and cleanup
    if (trtcRef.current) {
      try {
        const { stopLocalAudio, exitRoom, destroyTRTC } = await import('@/lib/trtc-client')
        await stopLocalAudio(trtcRef.current)
        await exitRoom(trtcRef.current)
        await destroyTRTC(trtcRef.current)
      } catch {}
      trtcRef.current = null
    }

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
      const { createTRTCInstance, fetchTRTCCredentials, enterRoom, enableAudioVolumeEvaluation, getTRTCEvent } = await import('@/lib/trtc-client')

      const trtc = await createTRTCInstance()
      trtcRef.current = trtc

      const EVENT = await getTRTCEvent()

      // Volume indicator for speaking detection
      enableAudioVolumeEvaluation(trtc, 500)
      trtc.on(EVENT.AUDIO_VOLUME as any, (event: any) => {
        const newSpeaking = new Set<string>()
        for (const { userId, volume } of event.result) {
          if (volume > 5 && userId !== '') {
            newSpeaking.add(userId)
          }
        }
        setSpeakingUsers(newSpeaking)
      })

      // TRTC auto-plays remote audio for audience

      // Join the room as audience
      const userId = session?.user?.id || `listener_${Date.now()}`
      const roomId = `voice_room_${room.id}`
      const credentials = await fetchTRTCCredentials(userId, roomId)
      await enterRoom(trtc, credentials, roomId, 'audience', 'rtc')

      setIsListening(true)
      console.log('TRTC voice listen mode started')
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
    if (trtcRef.current) {
      try {
        const { exitRoom, destroyTRTC } = await import('@/lib/trtc-client')
        await exitRoom(trtcRef.current)
        await destroyTRTC(trtcRef.current)
      } catch {}
      trtcRef.current = null
    }
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
      if (trtcRef.current) {
        const trtcInstance = trtcRef.current
        import('@/lib/trtc-client').then(({ exitRoom, destroyTRTC }) => {
          exitRoom(trtcInstance).catch(() => {})
          destroyTRTC(trtcInstance).catch(() => {})
        })
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
    if (!room || !session?.user?.id || !voiceEnabled || !trtcRef.current) return
    const isAdminOrOwner = myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || 
      (session.user as any).role === 'admin' || (session.user as any).role === 'yonetici'
    if (!isAdminOrOwner) return
    
    const otherUsers = activeUsers.filter(u => u.id !== session.user?.id)
    const prevCount = prevActiveCountRef.current
    prevActiveCountRef.current = otherUsers.length
    
    if (otherUsers.length === 0 && !isMicMuted) {
      // Admin alone - auto mute
      import('@/lib/trtc-client').then(({ muteLocalAudio }) => {
        if (trtcRef.current) muteLocalAudio(trtcRef.current, true)
      })
      setIsMicMuted(true)
      console.log('Admin alone - auto-muted')
    } else if (otherUsers.length > 0 && prevCount === 0 && isMicMuted) {
      // Someone joined - auto unmute
      import('@/lib/trtc-client').then(({ muteLocalAudio }) => {
        if (trtcRef.current) muteLocalAudio(trtcRef.current, false)
      })
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

  // ── Auto-dismiss announcement after 15 seconds ──
  useEffect(() => {
    if (!room?.descTr || !showAnnouncement) return
    setAnnouncementProgress(100)
    const duration = 15000
    const interval = 100
    const step = (100 * interval) / duration
    const progressTimer = setInterval(() => {
      setAnnouncementProgress(prev => {
        if (prev <= 0) { clearInterval(progressTimer); return 0 }
        return prev - step
      })
    }, interval)
    const dismissTimer = setTimeout(() => {
      setShowAnnouncement(false)
    }, duration)
    return () => { clearTimeout(dismissTimer); clearInterval(progressTimer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.descTr])

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
      // Search YouTube for the song, then submit as free song request
      try {
        const searchRes = await fetch(`/api/youtube/search?q=${encodeURIComponent(arg)}`)
        const searchData = await searchRes.json()
        const firstVideo = searchData.videos?.[0]
        if (firstVideo) {
          // Submit as free song request (skipPayment = true for !istek command)
          await fetch(`/api/chat/rooms/${room.id}/song-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoId: firstVideo.id,
              title: firstVideo.title,
              duration: firstVideo.duration || '',
              skipPayment: true,
            })
          })
        } else {
          // No results found, just send text message
          await fetch(`/api/chat/rooms/${room.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `🎵 [İSTEK] ${arg} (bulunamadı)` })
          })
        }
        fetchMessages()
      } catch {}
      return true
    }

    if (cmd === '!temizle' && canMod) {
      // Clear all messages with green flash animation
      try {
        await fetch(`/api/chat/rooms/${room.id}/messages`, { method: 'DELETE' })
        fetchMessages()
        setCommandFlash('__TEMIZLE__')
        setTimeout(() => setCommandFlash(null), 3500)
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
      // Set announcement - pin for 15 seconds
      try {
        await fetch(`/api/chat/rooms/${room.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `📢 [DUYURU] ${arg}` })
        })
        fetchMessages()
        // Pin the announcement
        if (pinnedDuyuruTimerRef.current) clearTimeout(pinnedDuyuruTimerRef.current)
        setPinnedDuyuru(arg)
        pinnedDuyuruTimerRef.current = setTimeout(() => setPinnedDuyuru(null), 15000)
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
  // ── Profanity Detection ──
  const BANNED_WORDS = ['amk','aq','amına','amina','orospu','oç','piç','sik','yarrak','göt','pezevenk','gavat','ibne','kaltak','fahişe','şerefsiz','bok','siktir','hassiktir','puşt','dangalak','gerizekalı','salak','aptal','mal','döl','taşak','meme','am','yarak','sikerim','ananı','bacını','avradını']
  const profanityAlertedRef = useRef<Set<string>>(new Set())
  
  // Whitelisted words (marked safe by moderators)
  const whitelistedWords = useMemo(() => {
    let words: string[] = []
    if (room?.whitelistedWords) {
      try { words = JSON.parse(room.whitelistedWords) } catch {}
    }
    return Array.isArray(words) ? words.map(w => w.toLowerCase().trim()) : []
  }, [room?.whitelistedWords])

  // Merge hardcoded banned words with room owner's custom banned words, exclude whitelisted
  const allBannedWords = useMemo(() => {
    const words = [...BANNED_WORDS]
    if (room?.bannedWords) {
      try {
        const custom = JSON.parse(room.bannedWords)
        if (Array.isArray(custom)) {
          custom.forEach((w: string) => {
            const trimmed = w.trim().toLowerCase()
            if (trimmed && !words.includes(trimmed)) words.push(trimmed)
          })
        }
      } catch {}
    }
    // Remove whitelisted words
    return words.filter(w => !whitelistedWords.includes(w.toLowerCase()))
  }, [room?.bannedWords, whitelistedWords])

  const checkProfanity = (text: string): string | null => {
    const lower = text.toLowerCase().replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[çÇ]/g, 'c').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u').replace(/[ğĞ]/g, 'g')
    for (const word of allBannedWords) {
      const pattern = new RegExp(`\\b${word}\\b|${word}`, 'i')
      if (pattern.test(lower)) return word
    }
    return null
  }

  // Check incoming messages for profanity (moderator alert)
  useEffect(() => {
    if (!messages.length || !myPermissions) return
    const isMod = myPermissions.isRoomOwner || myPermissions.isGlobalAdmin || 
      (myPermissions.role && ['superadmin', 'founder', 'sop', 'admin', 'op'].includes(myPermissions.role))
    if (!isMod) return
    
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.user.id === 'system' || lastMsg.user.id === session?.user?.id) return
    if (profanityAlertedRef.current.has(lastMsg.id)) return
    
    const detectedWord = checkProfanity(lastMsg.content)
    if (detectedWord) {
      profanityAlertedRef.current.add(lastMsg.id)
      setProfanityAlert({
        msgId: lastMsg.id,
        userId: lastMsg.user.id,
        userName: lastMsg.user.nickname || lastMsg.user.name || 'Kullanıcı',
        content: lastMsg.content,
        detectedWord,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, myPermissions])

  // Handle profanity mod actions
  const handleProfanityAction = async (action: 'delete' | 'mute' | 'kick' | 'ignore' | 'blacklist') => {
    if (!profanityAlert || !room) return
    const { msgId, userId, detectedWord } = profanityAlert
    
    try {
      if (action === 'ignore' && detectedWord) {
        // Add the word to whitelist (mark as safe)
        let currentWhitelist: string[] = []
        try { currentWhitelist = room.whitelistedWords ? JSON.parse(room.whitelistedWords) : [] } catch {}
        if (!Array.isArray(currentWhitelist)) currentWhitelist = []
        if (!currentWhitelist.includes(detectedWord.toLowerCase())) {
          const updated = [...currentWhitelist, detectedWord.toLowerCase()]
          const res = await fetch(`/api/chat/rooms/${room.id}/settings`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ whitelistedWords: JSON.stringify(updated) })
          })
          if (res.ok) {
            setRoom(prev => prev ? { ...prev, whitelistedWords: JSON.stringify(updated) } : prev)
          }
        }
        setProfanityAlert(null)
        return
      }

      if (action === 'blacklist' && detectedWord) {
        // Add to room's banned words AND censor the message content with ***
        let currentBanned: string[] = []
        try { currentBanned = room.bannedWords ? JSON.parse(room.bannedWords) : [] } catch {}
        if (!Array.isArray(currentBanned)) currentBanned = []
        if (!currentBanned.includes(detectedWord.toLowerCase())) {
          const updated = [...currentBanned, detectedWord.toLowerCase()]
          const res = await fetch(`/api/chat/rooms/${room.id}/settings`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bannedWords: JSON.stringify(updated) })
          })
          if (res.ok) {
            setRoom(prev => prev ? { ...prev, bannedWords: JSON.stringify(updated) } : prev)
          }
        }
        // Also remove from whitelist if it was there
        let currentWhitelist: string[] = []
        try { currentWhitelist = room.whitelistedWords ? JSON.parse(room.whitelistedWords) : [] } catch {}
        if (Array.isArray(currentWhitelist) && currentWhitelist.includes(detectedWord.toLowerCase())) {
          const updatedWl = currentWhitelist.filter(w => w !== detectedWord.toLowerCase())
          await fetch(`/api/chat/rooms/${room.id}/settings`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ whitelistedWords: updatedWl.length > 0 ? JSON.stringify(updatedWl) : null })
          })
          setRoom(prev => prev ? { ...prev, whitelistedWords: updatedWl.length > 0 ? JSON.stringify(updatedWl) : null } : prev)
        }
        // Delete the message
        await fetch(`/api/chat/rooms/${room.id}/messages?messageId=${msgId}`, { method: 'DELETE' })
        fetchMessages()
        setProfanityAlert(null)
        return
      }

      if (action === 'delete' || action === 'mute' || action === 'kick') {
        // Delete the offending message
        await fetch(`/api/chat/rooms/${room.id}/messages?messageId=${msgId}`, { method: 'DELETE' })
        fetchMessages()
      }
      if (action === 'mute') {
        await performModAction('mute_user', userId, { duration: 10 })
      }
      if (action === 'kick') {
        await performModAction('kick_user', userId)
      }
    } catch (err) {
      console.error('Profanity action error:', err)
    }
    setProfanityAlert(null)
  }

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

  // ===== PK Battle Functions =====
  const fetchPKStatus = useCallback(async () => {
    if (!room) return
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/pk`)
      if (res.ok) {
        const data = await res.json()
        if (data && data.id) {
          setActivePKBattle(data)
          // If pending and this room's owner is user2 (opponent), show incoming request
          if (data.status === 'pending' && data.user2Id === session?.user?.id && !pkDismissedRef.current.has(data.id)) {
            setIncomingPKRequest(data)
          }
        } else {
          setActivePKBattle(null)
          setIncomingPKRequest(null)
        }
      }
    } catch (err) { console.error('PK status fetch error:', err) }
  }, [room, session?.user?.id])

  // Poll PK status
  useEffect(() => {
    if (room) {
      fetchPKStatus()
      const interval = setInterval(fetchPKStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [room, fetchPKStatus])

  const handlePKCreate = useCallback(async (targetRoomId: string) => {
    if (!room || pkSendingAction) return
    setPkSendingAction(true)
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/pk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', targetRoomId, duration: 180 })
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'PK oluşturulamadı')
      } else {
        setActivePKBattle(data)
        setCommandSubPanel(null)
        setShowCommandsPanel(false)
      }
    } catch { alert('PK oluşturulurken hata oluştu') }
    finally { setPkSendingAction(false) }
  }, [room, pkSendingAction])

  const handlePKAccept = useCallback(async (battleId: string) => {
    if (pkSendingAction) return
    setPkSendingAction(true)
    try {
      const res = await fetch(`/api/chat/rooms/${room?.id || ''}/pk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', battleId })
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'PK kabul edilemedi')
      } else {
        setIncomingPKRequest(null)
        setActivePKBattle(data)
      }
    } catch { alert('Hata oluştu') }
    finally { setPkSendingAction(false) }
  }, [room, pkSendingAction])

  const handlePKReject = useCallback(async (battleId: string) => {
    if (pkSendingAction) return
    setPkSendingAction(true)
    try {
      const res = await fetch(`/api/chat/rooms/${room?.id || ''}/pk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', battleId })
      })
      if (res.ok) {
        pkDismissedRef.current.add(battleId)
        setIncomingPKRequest(null)
        setActivePKBattle(null)
      }
    } catch { /* ignore */ }
    finally { setPkSendingAction(false) }
  }, [room, pkSendingAction])

  const handlePKEnd = useCallback(async (battleId: string) => {
    if (pkSendingAction) return
    setPkSendingAction(true)
    try {
      await fetch(`/api/chat/rooms/${room?.id || ''}/pk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', battleId })
      })
      setActivePKBattle(null)
    } catch { /* ignore */ }
    finally { setPkSendingAction(false) }
  }, [room, pkSendingAction])

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
                    {/* PK Başlat - oda sahibi veya yetkili */}
                    {(myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || myPermissions?.canManageRoom) && (
                      <button
                        onClick={() => {
                          setShowManagePopup(false)
                          setCommandSubPanel('pk')
                          setShowCommandsPanel(true)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-red-600/30 text-red-300 hover:bg-red-600/50"
                      >
                        <Swords className="w-5 h-5" />
                        {'⚔️ PK Başlat'}
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

      {/* Profanity Alert Popup for Moderators */}
      <AnimatePresence>
        {profanityAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setProfanityAlert(null)}
          >
            <div className="bg-[#1a0a2e] border border-red-500/40 rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-red-500/20 rounded-full">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-red-400 font-bold text-sm">⚠️ Küfür Tespit Edildi!</h3>
              </div>
              <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3 mb-3">
                <p className="text-white/60 text-[10px] mb-1">{profanityAlert.userName}:</p>
                <p className="text-red-300 text-xs">{profanityAlert.content}</p>
                {profanityAlert.detectedWord && (
                  <p className="text-yellow-400/80 text-[10px] mt-1.5">Tespit edilen kelime: <span className="font-bold">&quot;{profanityAlert.detectedWord}&quot;</span></p>
                )}
              </div>
              {/* Word action buttons */}
              {profanityAlert.detectedWord && (
                <div className="flex gap-2 mb-3">
                  <button onClick={() => handleProfanityAction('ignore')} className="flex-1 py-2 px-3 bg-green-600/80 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1">
                    ✅ Yoksay
                  </button>
                  <button onClick={() => handleProfanityAction('blacklist')} className="flex-1 py-2 px-3 bg-red-800/80 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1">
                    🚫 Kara Liste
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => handleProfanityAction('delete')} className="flex-1 py-2 px-3 bg-orange-600/80 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Sil
                </button>
                <button onClick={() => handleProfanityAction('mute')} className="flex-1 py-2 px-3 bg-yellow-600/80 hover:bg-yellow-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1">
                  <MicOff className="w-3.5 h-3.5" /> Sustur
                </button>
                <button onClick={() => handleProfanityAction('kick')} className="flex-1 py-2 px-3 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1">
                  <UserX className="w-3.5 h-3.5" /> At
                </button>
              </div>
              <button onClick={() => setProfanityAlert(null)} className="w-full mt-2 py-1.5 text-white/40 hover:text-white/70 text-[10px] transition-colors">Kapat</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deleted Message Notice for Users */}
      <AnimatePresence>
        {deletedMsgNotice && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/20 border border-red-500/50 rounded-xl px-6 py-4 shadow-xl backdrop-blur-sm max-w-md"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/30 rounded-full">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-red-300 font-medium text-sm">{deletedMsgNotice}</p>
              </div>
              <button onClick={() => setDeletedMsgNotice(null)} className="text-red-400 hover:text-white ml-2">
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
          <div className={`absolute inset-0 ${isCanlidark ? 'bg-gradient-to-b from-[#050015]/80 via-[#0d0428]/40 to-[#050015]/85' : 'bg-gradient-to-b from-black/60 via-black/30 to-black/70'}`} />
        </div>

        {/* ── Top Header Overlay ── */}
        <div className={`relative z-10 flex-shrink-0 flex items-center justify-between px-3 py-2 backdrop-blur-sm ${isCanlidark ? 'bg-[#0d0428]/60 border-b border-purple-500/15' : 'bg-black/40'}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Back Button */}
            <Link
              href="/sohbet"
              className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors flex-shrink-0"
              title="Geri"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            {/* Room Owner Avatar */}
            {room.owner && (
              <button 
                onClick={() => openUserProfile({ id: room.owner!.id, name: room.owner!.name, image: room.owner!.image })}
                className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 transition-all ${isCanlidark ? 'bg-purple-700 border-2 border-purple-400/60 hover:ring-purple-400' : 'bg-purple-800 border-2 border-gold-500/60 hover:ring-gold-400'}`}
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
            <div className={`flex items-center gap-1 backdrop-blur-sm rounded-full px-2 py-0.5 border ${isCanlidark ? 'bg-purple-500/20 border-purple-500/30' : 'bg-green-500/20 border-green-500/30'}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isCanlidark ? 'bg-purple-400' : 'bg-green-400'}`} />
              <span className={`text-[11px] font-bold ${isCanlidark ? 'text-purple-300' : 'text-green-300'}`}>{activeUsers.length}</span>
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
          
          // Build seats — sorted by authority rank (highest first)
          const seats: (ActiveUser | null)[] = new Array(TOTAL_SEATS).fill(null)
          const seatedUsers = activeUsers
            .filter(u => u.seatIndex >= 0 && u.seatIndex < TOTAL_SEATS)
            .sort((a, b) => {
              // Owner always first
              const aOwner = room.ownerId === a.id ? 100 : 0
              const bOwner = room.ownerId === b.id ? 100 : 0
              return (bOwner + (b.roleLevel || 0)) - (aOwner + (a.roleLevel || 0))
            })
          // Assign sorted users to seats 0, 1, 2... by rank
          seatedUsers.forEach((u, i) => {
            seats[i] = u
          })
          
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

          // Handle assigning user to seat (owner action)
          const handleAssignSeat = async (targetUserId: string, seatIdx: number) => {
            if (!room) return
            try {
              const res = await fetch(`/api/chat/rooms/${room.id}/seats`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, seatIndex: seatIdx, forceAssign: true })
              })
              if (res.ok) {
                fetchActiveUsers()
                setAssignSeatIdx(null)
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
                            ${!isThrone && (isSpeakingSeat ? 'ring-2 ring-green-400 animate-pulse' : isOwner ? 'ring-2 ring-yellow-400' : badge ? `ring-2 ${badge.border}` : isCanlidark ? 'ring-2 ring-purple-500/50' : 'ring-1 ring-white/20')}
                          `}
                          onClick={() => {
                            if (isMe) {
                              if (confirm('Koltuğunuzdan kalkmak istiyor musunuz?')) handleLeaveSeat()
                            } else if (canManageSeats) {
                              setUserActionTarget(userActionTarget?.id === seatUser.id ? null : seatUser)
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
                          {/* Mic status indicator */}
                          {voiceUsers.some(vu => vu.id === seatUser.id) && (
                            <div className={`absolute top-0 left-0 p-0.5 rounded-full ${isSpeakingSeat ? 'bg-green-500' : isMe && isMicMuted ? 'bg-red-500' : 'bg-blue-500'} shadow-lg z-10`}>
                              {isMe && isMicMuted ? <MicOff className="w-2.5 h-2.5 text-white" /> : <Mic className="w-2.5 h-2.5 text-white" />}
                            </div>
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
                  
                  // Empty seat — clickable to claim (or assign for owners)
                  return (
                    <div key={`seat-${idx}`} className="flex flex-col items-center gap-0.5 relative">
                      <button
                        onClick={() => handleClaimSeat(idx)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          if (canManageSeats) setAssignSeatIdx(assignSeatIdx === idx ? null : idx)
                        }}
                        className={`flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer group
                          ${isThrone 
                            ? 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-yellow-900/20 to-amber-900/20 border-2 border-dashed border-yellow-500/30 hover:border-yellow-400/60 hover:bg-yellow-900/30 shadow-inner' 
                            : `w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-dashed ${isCanlidark ? 'bg-purple-900/15 border-purple-500/25 hover:bg-purple-800/25 hover:border-purple-400/50' : 'bg-white/5 border-white/20 hover:bg-white/15 hover:border-white/40'}`
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
                      {/* Owner assign button */}
                      {canManageSeats && (
                        <button onClick={() => setAssignSeatIdx(assignSeatIdx === idx ? null : idx)} className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full text-white text-[8px] opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity flex items-center justify-center z-20" title="Kullanıcı ata">
                          <UserPlus className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {/* Assign user picker */}
                      {assignSeatIdx === idx && (
                        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-[#1a0a2e] border border-purple-500/30 rounded-lg p-2 z-30 w-40 max-h-40 overflow-y-auto shadow-2xl">
                          <p className="text-[9px] text-purple-300 font-bold mb-1">Koltuk {idx + 1}&apos;e ata:</p>
                          {activeUsers.filter(u => u.seatIndex < 0).map(u => (
                            <button key={u.id} onClick={() => handleAssignSeat(u.id, idx)} className="w-full text-left px-2 py-1 text-[10px] text-white/80 hover:bg-purple-500/20 rounded truncate flex items-center gap-1">
                              <span className="w-4 h-4 rounded-full bg-purple-800 flex items-center justify-center text-[7px] text-white/60 flex-shrink-0">{(u.nickname || u.name || '?').charAt(0)}</span>
                              {u.nickname || u.name}
                            </button>
                          ))}
                          {activeUsers.filter(u => u.seatIndex < 0).length === 0 && (
                            <p className="text-[9px] text-white/30 text-center py-1">Atanacak kullanıcı yok</p>
                          )}
                        </div>
                      )}
                      <p className={`text-[9px] font-medium ${isThrone ? 'text-yellow-500/30' : 'text-white/20'}`}>{isThrone ? '👑' : idx + 1}</p>
                    </div>
                  )
                })}
              </div>

              {/* User Action Menu for Mods */}
              <AnimatePresence>
                {userActionTarget && canManageSeats && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="mt-2 mx-auto max-w-sm bg-[#1a0a2e]/95 backdrop-blur-md border border-purple-500/30 rounded-2xl p-3 shadow-2xl shadow-purple-900/50 z-30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-800/50">
                          {userActionTarget.image ? (
                            <img src={userActionTarget.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/60 text-sm font-bold">
                              {(userActionTarget.nickname || userActionTarget.name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm font-semibold">{userActionTarget.nickname || userActionTarget.name}</p>
                          <p className="text-purple-400/60 text-[10px]">{userActionTarget.chatRole || 'Kullanıcı'}</p>
                        </div>
                      </div>
                      <button onClick={() => setUserActionTarget(null)} className="p-1 rounded-full hover:bg-white/10 text-purple-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {/* Hediye At */}
                      <button
                        onClick={() => { openGiftModal(userActionTarget); setUserActionTarget(null) }}
                        className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 text-amber-300 transition-all text-[10px]"
                      >
                        <Gift className="w-4 h-4" />
                        Hediye At
                      </button>
                      {/* +v Ses Ver */}
                      {!voiceUsers.some(vu => vu.id === userActionTarget.id) && myPermissions?.canGiveVoice && (
                        <button
                          onClick={() => { performModAction('set_role', userActionTarget.id, { role: 'voice' }); setUserActionTarget(null) }}
                          className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-300 transition-all text-[10px]"
                        >
                          <Volume2 className="w-4 h-4" />
                          +v Ses Ver
                        </button>
                      )}
                      {/* Yetki Ver (@ veya &) */}
                      {(myPermissions?.canGiveOp || myPermissions?.canGiveSop) && (
                        <button
                          onClick={() => {
                            const roles: {key: string; label: string; symbol: string}[] = []
                            if (myPermissions?.canGiveOp) roles.push({ key: 'op', label: '@Operatör', symbol: '@' })
                            if (myPermissions?.canGiveSop) roles.push({ key: 'sop', label: '&Moderatör', symbol: '&' })
                            if (myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin) roles.push({ key: 'founder', label: '~Kurucu', symbol: '~' })
                            const choice = prompt(`Yetki seç:\n${roles.map(r => `${r.symbol} = ${r.label}`).join('\n')}\n\nŞu anki: ${userActionTarget.chatRole || 'yok'}`)
                            if (!choice) return
                            const role = roles.find(r => r.symbol === choice || r.key === choice)
                            if (!role) { alert('Geçersiz seçim'); return }
                            performModAction('set_role', userActionTarget.id, { role: role.key })
                            setUserActionTarget(null)
                          }}
                          className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/20 text-purple-300 transition-all text-[10px]"
                        >
                          <Shield className="w-4 h-4" />
                          Yetki Ver
                        </button>
                      )}
                      {/* Sesi Kapat / Sesi Aç */}
                      {voiceUsers.some(vu => vu.id === userActionTarget.id) ? (
                        <button
                          onClick={() => { performModAction('mute_user', userActionTarget.id, { duration: 30 }); setUserActionTarget(null) }}
                          className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/20 text-yellow-300 transition-all text-[10px]"
                        >
                          <VolumeX className="w-4 h-4" />
                          Sesi Kapat
                        </button>
                      ) : (
                        <button
                          onClick={() => { performModAction('set_role', userActionTarget.id, { role: 'voice' }); setUserActionTarget(null) }}
                          className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-300 transition-all text-[10px]"
                        >
                          <Volume2 className="w-4 h-4" />
                          Sesi Aç
                        </button>
                      )}
                      {/* Koltuğa Al / İndir */}
                      {userActionTarget.seatIndex >= 0 ? (
                        <button
                          onClick={() => { handleAssignSeat(userActionTarget.id, -1); setUserActionTarget(null) }}
                          className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/20 text-orange-300 transition-all text-[10px]"
                        >
                          <ChevronDown className="w-4 h-4" />
                          İndir
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const emptySeat = Array.from({length: 15}, (_, i) => i).find(i => !activeUsers.some(u => u.seatIndex === i))
                            if (emptySeat !== undefined) { handleAssignSeat(userActionTarget.id, emptySeat); setUserActionTarget(null) }
                            else alert('Boş koltuk yok')
                          }}
                          className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-300 transition-all text-[10px]"
                        >
                          <ChevronUp className="w-4 h-4" />
                          Koltuğa Al
                        </button>
                      )}
                      {/* DJ Yap / DJ'den Çıkar */}
                      {(myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin) && (
                        djUsers.some(dj => dj.id === userActionTarget.id) ? (
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/chat/rooms/${room.id}/dj`, {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: userActionTarget.id })
                                })
                              } catch {}
                              setUserActionTarget(null)
                            }}
                            className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-gray-500/15 hover:bg-gray-500/25 border border-gray-500/20 text-gray-300 transition-all text-[10px]"
                          >
                            <Music className="w-4 h-4" />
                            DJ&apos;den Çıkar
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/chat/rooms/${room.id}/dj`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: userActionTarget.id })
                                })
                              } catch {}
                              setUserActionTarget(null)
                            }}
                            className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/20 text-cyan-300 transition-all text-[10px]"
                          >
                            <Music className="w-4 h-4" />
                            DJ Yap
                          </button>
                        )
                      )}
                      {/* Odayı Devret */}
                      {myPermissions?.isRoomOwner && (
                        <button
                          onClick={() => {
                            setTransferTargetId(userActionTarget.id)
                            setShowTransferModal(true)
                            setUserActionTarget(null)
                          }}
                          className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 text-amber-300 transition-all text-[10px]"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                          Odayı Devret
                        </button>
                      )}
                      {/* Mic Aç/Kapat */}
                      <button
                        onClick={() => { performModAction('mute_user', userActionTarget.id, { duration: 30 }); setUserActionTarget(null) }}
                        className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/20 text-indigo-300 transition-all text-[10px]"
                      >
                        <MicOff className="w-4 h-4" />
                        Mic Kapat
                      </button>
                      {/* Kanaldan At (Kick) */}
                      {myPermissions?.canKickUsers && (
                        <button
                          onClick={() => { 
                            performModAction('kick_user', userActionTarget.id)
                            setUserActionTarget(null)
                          }}
                          className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-300 transition-all text-[10px]"
                        >
                          <UserMinus className="w-4 h-4" />
                          Kick
                        </button>
                      )}
                      {/* Banla */}
                      {myPermissions?.canBanUsers && (
                        <button
                          onClick={() => { 
                            performModAction('ban_user', userActionTarget.id)
                            setUserActionTarget(null)
                          }}
                          className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-300 transition-all text-[10px]"
                        >
                          <Ban className="w-4 h-4" />
                          Banla
                        </button>
                      )}
                      {/* Sessize Al */}
                      {myPermissions?.canMuteUsers && (
                        <button
                          onClick={() => { performModAction('mute_user', userActionTarget.id, { duration: 999 }); setUserActionTarget(null) }}
                          className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/20 text-orange-300 transition-all text-[10px]"
                        >
                          <VolumeX className="w-4 h-4" />
                          Sessize Al
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
            <div className={`backdrop-blur-md rounded-lg p-3 max-h-32 overflow-y-auto relative overflow-hidden ${isCanlidark ? 'bg-[#0d0428]/60 border border-purple-500/20' : 'bg-black/50 border border-white/10'}`}>
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
              {/* Auto-dismiss progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
                <div className="h-full bg-yellow-400/60 transition-all duration-100" style={{ width: `${announcementProgress}%` }} />
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

        {/* Music and DJ buttons removed — accessible from Çark/Ayarlar menu */}

        {/* ── Floating Music Player Bar (visible to everyone when music is playing) ── */}
        {currentMusicVideoId && currentMusicTitle && (
          <div className="relative z-10 mx-3 mb-2 flex items-center gap-1">
            <button
              onClick={() => setShowMusicModal(true)}
              className="flex-1 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-900/60 via-pink-900/40 to-purple-900/60 border border-purple-500/30 rounded-xl backdrop-blur-sm hover:border-purple-400/50 transition-all group min-w-0"
            >
              {!musicMuted && !musicPaused && (
                <div className="flex items-end gap-0.5 mr-1 flex-shrink-0">
                  <span className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" />
                  <span className="w-1 h-4 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                </div>
              )}
              {musicPaused && <span className="text-yellow-400 text-xs mr-1 flex-shrink-0">⏸</span>}
              {musicMuted && !musicPaused && <VolumeX className="w-4 h-4 text-red-400 flex-shrink-0" />}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] text-purple-300 opacity-70">{musicPaused ? '⏸ Duraklatıldı' : '🎶 Şu an çalıyor'}{currentMusicDuration ? ` • ${currentMusicDuration}` : ''}</p>
                <p className="text-white text-xs font-medium truncate">{currentMusicTitle}</p>
              </div>
            </button>
            {/* Pause/Resume button */}
            <button
              onClick={() => setMusicPaused(!musicPaused)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all flex-shrink-0 ${
                musicPaused ? 'bg-green-600/30 border-green-500/30 text-green-300 hover:bg-green-600/50' : 'bg-yellow-600/30 border-yellow-500/30 text-yellow-300 hover:bg-yellow-600/50'
              }`}
              title={musicPaused ? 'Devam Et' : 'Durdur'}
            >
              {musicPaused ? <span className="text-sm">▶</span> : <span className="text-sm">⏸</span>}
            </button>
            {/* Mute button */}
            <button
              onClick={() => setMusicMuted(!musicMuted)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all flex-shrink-0 ${
                musicMuted ? 'bg-red-600/30 border-red-500/40 text-red-300 hover:bg-red-600/50' : 'bg-purple-600/30 border-purple-500/30 text-purple-300 hover:bg-purple-600/50'
              }`}
              title={musicMuted ? 'Sesini aç' : 'Sesini kapat'}
            >
              {musicMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            {/* Close/Stop music (moderator only) */}
            {(myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || canPlayMusic) && (
              <button
                onClick={handleStopMusic}
                className="w-8 h-8 rounded-lg flex items-center justify-center border bg-red-600/30 border-red-500/30 text-red-300 hover:bg-red-600/50 transition-all flex-shrink-0"
                title="Müziği Kapat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* ── Music Queue Mini Display (shown in chat) ── */}
        {musicQueue.length > 0 && currentMusicVideoId && (
          <div className="relative z-10 mx-3 mb-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/50 border border-yellow-500/30 rounded-lg overflow-x-auto">
              <span className="text-yellow-300 text-[10px] font-bold flex-shrink-0">🎵 Sırada:</span>
              {musicQueue.slice(0, 3).map((q, i) => (
                <span key={i} className="text-white text-[10px] truncate max-w-[140px] flex-shrink-0">
                  {i + 1}. {q.title} <span className="text-yellow-300/80">({q.requestedBy})</span>
                  {i < Math.min(musicQueue.length, 3) - 1 && <span className="text-white/40 mx-0.5">|</span>}
                </span>
              ))}
              {musicQueue.length > 3 && <span className="text-yellow-300/80 text-[10px] flex-shrink-0">+{musicQueue.length - 3} daha</span>}
            </div>
          </div>
        )}

        {/* ── Pinned Duyuru (15 seconds) ── */}
        {pinnedDuyuru && (
          <div className="relative z-20 mx-3 mb-2">
            <div className="bg-gradient-to-r from-blue-600/40 via-indigo-600/50 to-blue-600/40 border border-blue-400/50 rounded-lg px-4 py-2.5 text-center shadow-lg shadow-blue-500/20">
              <div className="flex items-center justify-center gap-2">
                <span className="text-blue-200 text-lg">📢</span>
                <span className="text-white text-sm font-bold drop-shadow-lg">{pinnedDuyuru}</span>
              </div>
              <div className="mt-1 h-0.5 bg-blue-300/20 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400/60 rounded-full" style={{ animation: 'shrinkBar 15s linear forwards' }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Command Flash Overlay ── */}
        {commandFlash && commandFlash === '__TEMIZLE__' ? (
          <div className="relative z-20 mx-3 mb-2" style={{ animation: 'temizleBlink 0.5s ease-in-out 3' }}>
            <div className="bg-green-500/30 border border-green-400/50 rounded-lg px-4 py-3 text-center backdrop-blur-sm">
              <span className="text-white text-sm font-bold drop-shadow-lg">💫 Sohbet temizlendi</span>
            </div>
          </div>
        ) : commandFlash ? (
          <div className="relative z-20 mx-3 mb-2 animate-pulse">
            <div className="bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-500/20 border border-yellow-500/40 rounded-lg px-4 py-2 text-center">
              <span className="text-yellow-300 text-sm font-bold drop-shadow-lg whitespace-pre-line">{commandFlash}</span>
            </div>
          </div>
        ) : null}

        {/* ── Song Request Flash (for authorized users) ── */}
        {messages.length > 0 && (() => {
          const lastMsg = messages[messages.length - 1]
          const isRequest = lastMsg?.content?.includes('[İSTEK]')
          const canSeeRequests = myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || 
            (myPermissions?.role && ['superadmin', 'founder', 'sop', 'admin', 'op'].includes(myPermissions.role))
          if (isRequest && canSeeRequests) {
            return (
              <div className="relative z-20 mx-3 mb-2">
                <div className="bg-gradient-to-r from-yellow-600/30 via-orange-500/30 to-yellow-600/30 border border-yellow-400/50 rounded-lg px-4 py-2 text-center animate-pulse">
                  <span className="text-yellow-200 text-sm font-bold drop-shadow-lg">{lastMsg.content}</span>
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
                
                // Hide internal song request queue messages
                if (msg.content.startsWith('[SONG_REQUEST_PAID]') || msg.content.startsWith('[SONG_REQUEST_FREE]')) return null

                // Local rules system message
                const isRulesMsg = msg.content.startsWith('[SYSTEM_RULES]')
                if (isRulesMsg) {
                  const rulesText = msg.content.replace('[SYSTEM_RULES]', '')
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-purple-900/60 border border-purple-500/20 rounded-lg px-4 py-2.5 max-w-[90%]">
                        <p className="text-purple-300 text-[11px] whitespace-pre-wrap leading-relaxed">{rulesText}</p>
                      </div>
                    </div>
                  )
                }

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
                    'SUPERADMIN': { label: '👑 Site Yöneticisi', icon: '👑', color: 'text-red-400' },
                    'OWNER': { label: '🏠 Oda Sahibi', icon: '🏠', color: 'text-yellow-400' },
                    'FOUNDER': { label: '~Kurucu', icon: '~', color: 'text-red-400' },
                    'MODERATOR': { label: '&Moderatör', icon: '&', color: 'text-orange-400' },
                    'OP': { label: '@Operatör', icon: '@', color: 'text-green-400' },
                    'DIAMOND': { label: '💎 Diamond Üye', icon: '💎', color: 'text-cyan-300' },
                    'GOLD': { label: '🏅 Gold Üye', icon: '🏅', color: 'text-yellow-300' },
                    'PREMIUM': { label: '⭐ Premium Üye', icon: '⭐', color: 'text-purple-300' },
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
                    const isMembership = ['DIAMOND', 'GOLD', 'PREMIUM'].includes(vipType)
                    const bgClass = isMembership 
                      ? (vipType === 'DIAMOND' ? 'bg-cyan-500/20 border-cyan-500/30' : vipType === 'GOLD' ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-purple-500/20 border-purple-500/30')
                      : 'bg-yellow-500/20 border-yellow-500/30'
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="py-0.5">
                        <span className={`${bgClass} backdrop-blur-sm text-[11px] px-2 py-0.5 rounded-full inline-block border`}>
                          {isMembership ? (
                            <>
                              <span className={vipInfo.color}>{vipInfo.label}</span>
                              <span className="text-white/80 font-bold ml-1">{joinName}</span>
                              <span className="text-white/50 ml-1">odaya giriş yaptı</span>
                            </>
                          ) : (
                            <>
                              <span className={vipInfo.color}>{vipInfo.icon} <span className="font-bold">{joinName}</span></span>
                              <span className="text-white/50 ml-1">odaya giriş yaptı</span>
                            </>
                          )}
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

        {/* ── Right Edge Buttons: Commands Toggle + Song Request ── */}
        <div className="fixed right-0 top-[65%] -translate-y-1/2 z-30 flex flex-col gap-1.5">
          {/* Commands Panel Toggle (for authorized users) */}
          {session?.user && (myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || myPermissions?.canManageRoom ||
            (myPermissions?.role && ['superadmin', 'founder', 'sop', 'admin', 'op'].includes(myPermissions.role))) && (
            <button
              onClick={() => setShowCommandsPanel(!showCommandsPanel)}
              className="w-7 h-12 bg-gradient-to-l from-purple-700/80 to-purple-900/60 border border-purple-500/30 border-r-0 rounded-l-lg flex items-center justify-center text-purple-300 hover:text-white hover:from-purple-600/90 transition-all backdrop-blur-sm shadow-lg"
              title="Komutlar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Song Request Button (for all logged-in users) */}
          {session?.user && (
            <button
              onClick={() => setShowSongRequestModal(true)}
              className="w-7 h-12 bg-gradient-to-l from-fuchsia-700/80 to-purple-900/60 border border-fuchsia-500/30 border-r-0 rounded-l-lg flex items-center justify-center text-fuchsia-300 hover:text-white hover:from-fuchsia-600/90 transition-all backdrop-blur-sm shadow-lg"
              title="Şarkı İsteği (10 💎)"
            >
              <Music className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

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
            <div className={`flex items-center gap-1.5 backdrop-blur-md rounded-full px-2 py-1.5 border ${isCanlidark ? 'bg-[#0d0428]/70 border-purple-500/20' : 'bg-black/40 border-white/10'}`}>
              {/* Speaker / Listen toggle for non-voice users — always visible */}
              {!canUseVoice() && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`rounded-full flex items-center gap-1 transition-all flex-shrink-0 ${
                    isListening 
                      ? 'bg-blue-500/40 text-blue-200 px-2.5 py-1.5 border border-blue-400/30' 
                      : 'bg-green-500/20 text-green-300 px-2.5 py-1.5 border border-green-500/20 hover:bg-green-500/30'
                  }`}
                  title={isListening ? 'Sesi Kapat' : 'Sesi Aç'}
                >
                  {isListening ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span className="text-[10px] font-medium whitespace-nowrap">{isListening ? 'Sesi Kapat' : 'Sesi Aç'}</span>
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
                  onBlur={handleInputFocus}
                  placeholder={t('chat.placeholder')}
                  maxLength={500}
                  className="flex-1 bg-transparent text-white text-sm placeholder-white/30 focus:outline-none px-2 py-1"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className={`w-14 h-14 rounded-full text-white flex items-center justify-center disabled:opacity-30 flex-shrink-0 transition-all active:scale-95 ${isCanlidark ? 'bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-600/40 hover:from-purple-500 hover:to-fuchsia-500' : 'bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-lg shadow-purple-500/30 hover:from-purple-400 hover:to-fuchsia-500'}`}
                >
                  <Send className="w-7 h-7" />
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
            <div className={`flex items-center justify-between mt-1.5 px-1 ${isCanlidark ? 'py-1 bg-[#0d0428]/50 rounded-xl border border-purple-500/10' : ''}`}>
              <span className={`text-[10px] flex items-center gap-0.5 ${isCanlidark ? 'text-purple-300/80 font-semibold' : 'text-yellow-400/70'}`}>💎 {userJetonBalance.toLocaleString()} Jeton</span>
              <button type="button" onClick={() => window.location.reload()} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-purple-300/70 hover:text-white transition-all active:scale-90" title="Sayfayı Yenile">
                <RefreshCw className="w-3 h-3" />
                <span className="text-[9px] font-medium">Yenile</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  const shareUrl = `${window.location.origin}/${language}/sohbet/${room?.slug || ''}`
                  const roomDisplayName = (language === 'tr' ? room?.nameTr : room?.nameEn) || 'Sesli Sohbet'
                  const shareText = `🔮 ${roomDisplayName} odasına gel! - CanlıFal`
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: `${roomDisplayName} - CanlıFal`, text: shareText, url: shareUrl })
                    } catch {}
                  } else {
                    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank')
                  }
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 hover:bg-green-500/40 text-green-300/80 hover:text-white transition-all active:scale-90 border border-green-500/30"
                title="Odayı Paylaş"
              >
                <Share2 className="w-3 h-3" />
                <span className="text-[9px] font-medium">Paylaş</span>
              </button>
              <button
                type="button"
                onClick={() => window.open(`/${language}/jeton`, '_blank')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${isCanlidark ? 'bg-gradient-to-r from-purple-600/40 to-fuchsia-600/40 border border-purple-500/40 text-purple-200 hover:from-purple-600/60 hover:to-fuchsia-600/60' : 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-500/40 text-yellow-300 hover:from-yellow-500/50 hover:to-amber-500/50'}`}
              >
                <Coins className="w-3 h-3" /> Jeton Yükle
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex-shrink-0 px-3 pb-3 pt-1">
            <Link
              href="/giris"
              className={`flex items-center justify-center gap-2 px-4 py-2.5 backdrop-blur-sm text-white font-medium text-sm rounded-full w-full border ${isCanlidark ? 'bg-purple-600/70 hover:bg-purple-500/70 border-purple-400/40' : 'bg-purple-600/80 hover:bg-purple-500/80 border-purple-500/40'}`}
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

      {/* Song Request Modal */}
      <AnimatePresence>
        {showSongRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!songRequestSending) setShowSongRequestModal(false) }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-md bg-gradient-to-b from-[#1a0533] to-[#0d0118] border border-purple-500/30 rounded-t-2xl sm:rounded-2xl p-4 max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Music className="w-5 h-5 text-fuchsia-400" /> Şarkı İsteği
                </h3>
                <button onClick={() => setShowSongRequestModal(false)} className="text-purple-400 hover:text-white text-lg">✕</button>
              </div>
              <p className="text-purple-300/70 text-xs mb-3">YouTube&apos;dan şarkı arayın ve isteğinizi gönderin. Her istek <span className="text-yellow-400 font-bold">10 💎 Jeton</span> harcar.</p>

              {/* Search */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={songRequestQuery}
                  onChange={(e) => {
                    setSongRequestQuery(e.target.value)
                    onSongRequestInput(e.target.value)
                  }}
                  placeholder="Şarkı adı veya sanatçı ara..."
                  className="w-full px-3 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl text-white text-sm placeholder-purple-300/40 focus:outline-none focus:border-fuchsia-500/50"
                />
              </div>

              {/* Results */}
              {songRequestResults.length > 0 && (
                <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                  {songRequestResults.map((video: any) => (
                    <button
                      key={video.id}
                      onClick={() => setSongRequestSelected(video)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left ${
                        songRequestSelected?.id === video.id
                          ? 'bg-fuchsia-600/30 border border-fuchsia-500/50'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className="w-12 h-9 rounded overflow-hidden flex-shrink-0 bg-purple-900/50 relative">
                        {video.thumbnail && <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{video.title}</p>
                        <p className="text-purple-400 text-[10px] truncate">{video.channel} {video.duration ? `• ${video.duration}` : ''}</p>
                      </div>
                      {songRequestSelected?.id === video.id && <span className="text-fuchsia-400 text-lg flex-shrink-0">✓</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected song info */}
              {songRequestSelected && (
                <div className="bg-fuchsia-600/20 border border-fuchsia-500/30 rounded-xl p-2.5 mb-3">
                  <p className="text-fuchsia-300 text-xs font-medium truncate">🎵 {songRequestSelected.title}</p>
                </div>
              )}

              {/* Dedication & Note */}
              {songRequestSelected && (
                <div className="space-y-2 mb-3">
                  <input
                    type="text"
                    value={songRequestDedication}
                    onChange={(e) => setSongRequestDedication(e.target.value)}
                    placeholder="Kime armağan? (opsiyonel)"
                    maxLength={50}
                    className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded-xl text-white text-sm placeholder-purple-300/40 focus:outline-none focus:border-fuchsia-500/50"
                  />
                  <textarea
                    value={songRequestNote}
                    onChange={(e) => setSongRequestNote(e.target.value)}
                    placeholder="Kısa not (opsiyonel)"
                    maxLength={100}
                    rows={2}
                    className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded-xl text-white text-sm placeholder-purple-300/40 focus:outline-none focus:border-fuchsia-500/50 resize-none"
                  />
                </div>
              )}

              {/* Submit */}
              <button
                onClick={submitSongRequest}
                disabled={!songRequestSelected || songRequestSending}
                className="w-full py-2.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold rounded-xl disabled:opacity-30 hover:from-fuchsia-500 hover:to-purple-500 transition-all text-sm flex items-center justify-center gap-2"
              >
                {songRequestSending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Gönderiliyor...</>
                ) : (
                  <>🎵 İstek Gönder (10 💎)</>
                )}
              </button>
              <p className="text-center text-purple-400/50 text-[10px] mt-1.5">Bakiye: {userJetonBalance.toLocaleString()} Jeton</p>

              {/* Queue display */}
              {musicQueue.length > 0 && (
                <div className="mt-3 pt-3 border-t border-purple-500/20">
                  <p className="text-yellow-300 text-xs font-medium mb-1.5">📋 Sıradaki İstekler ({musicQueue.length})</p>
                  <div className="space-y-1">
                    {musicQueue.slice(0, 5).map((q, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-white/90 bg-white/10 rounded-lg px-2 py-1">
                        <span className="text-yellow-400 font-bold">{i + 1}.</span>
                        <span className="truncate flex-1">{q.title}</span>
                        {q.isPaid && <span className="text-yellow-400">💎</span>}
                        <span className="text-yellow-300/70">{q.requestedBy}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

      {/* ── Commands Panel (right side slide-out) ── */}
      <AnimatePresence>
        {showCommandsPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
            onClick={() => { setShowCommandsPanel(false); setCommandSubPanel(null) }}
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
                  {commandSubPanel ? (
                    <button onClick={() => setCommandSubPanel(null)} className="text-purple-400 hover:text-white mr-1">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  ) : (
                    <Settings className="w-4 h-4" />
                  )}
                  {commandSubPanel === 'duyuru' ? '📢 Duyuru Yayınla' :
                   commandSubPanel === 'kick' ? '👢 Kullanıcı At' :
                   commandSubPanel === 'ban' ? '🚫 Kullanıcı Banla' :
                   commandSubPanel === 'unban' ? '✅ Ban Kaldır' :
                   commandSubPanel === 'pk' ? '⚔️ PK Başlat' : 'Oda Komutları'}
                </h3>
                <button onClick={() => { setShowCommandsPanel(false); setCommandSubPanel(null) }} className="text-purple-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* === MAIN MENU === */}
                {!commandSubPanel && (
                  <>
                    {/* Herkes için */}
                    <div>
                      <h4 className="text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">🎵 Müzik & Genel</h4>
                      <div className="space-y-1.5">
                        <button
                          onClick={() => { setShowCommandsPanel(false); setShowSongRequestModal(true) }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 bg-fuchsia-900/30 border border-fuchsia-500/20 rounded-lg text-fuchsia-300 hover:bg-fuchsia-900/50 hover:text-white transition-all text-left"
                        >
                          <Music className="w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium">Şarkı İsteği</p>
                            <p className="text-[10px] text-fuchsia-400/60">YouTube&apos;dan şarkı iste (10 💎)</p>
                          </div>
                        </button>
                        <button
                          onClick={() => { handleChatCommand('!kural'); setShowCommandsPanel(false) }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 bg-purple-900/30 border border-purple-500/20 rounded-lg text-purple-300 hover:bg-purple-900/50 hover:text-white transition-all text-left"
                        >
                          <Shield className="w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium">Oda Kuralları</p>
                            <p className="text-[10px] text-purple-400/60">Kuralları görüntüle</p>
                          </div>
                        </button>
                        <button
                          onClick={() => { handleChatCommand('!bilgi'); setShowCommandsPanel(false) }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 bg-purple-900/30 border border-purple-500/20 rounded-lg text-purple-300 hover:bg-purple-900/50 hover:text-white transition-all text-left"
                        >
                          <Eye className="w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium">Oda Bilgisi</p>
                            <p className="text-[10px] text-purple-400/60">Oda detaylarını gör</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Yetkili Komutları */}
                    {(myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || myPermissions?.canManageRoom ||
                      (myPermissions?.role && ['superadmin', 'founder', 'sop', 'admin', 'op'].includes(myPermissions.role))) && (
                      <div>
                        <h4 className="text-orange-300 text-xs font-bold uppercase tracking-wider mb-2">🛡️ Yetkili Komutları</h4>
                        <div className="space-y-1.5">
                          <button
                            onClick={() => setCommandSubPanel('duyuru')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-blue-900/30 border border-blue-500/20 rounded-lg text-blue-300 hover:bg-blue-900/50 hover:text-white transition-all text-left"
                          >
                            <Volume2 className="w-4 h-4 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium">📢 Duyuru Yayınla</p>
                              <p className="text-[10px] text-blue-400/60">15 saniye sabit mesaj</p>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              handleChatCommand('!temizle')
                              setShowCommandsPanel(false)
                              setCommandSubPanel(null)
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-green-900/30 border border-green-500/20 rounded-lg text-green-300 hover:bg-green-900/50 hover:text-white transition-all text-left"
                          >
                            <Trash2 className="w-4 h-4 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium">💫 Sohbet Temizle</p>
                              <p className="text-[10px] text-green-400/60">Tüm mesajları sil</p>
                            </div>
                          </button>
                          <button
                            onClick={() => setCommandSubPanel('kick')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-yellow-900/30 border border-yellow-500/20 rounded-lg text-yellow-300 hover:bg-yellow-900/50 hover:text-white transition-all text-left"
                          >
                            <UserMinus className="w-4 h-4 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium">👢 Kick (At)</p>
                              <p className="text-[10px] text-yellow-400/60">3 ihtar = otomatik ban</p>
                            </div>
                          </button>
                          <button
                            onClick={() => setCommandSubPanel('ban')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-red-900/30 border border-red-500/20 rounded-lg text-red-300 hover:bg-red-900/50 hover:text-white transition-all text-left"
                          >
                            <Ban className="w-4 h-4 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium">🚫 Banla</p>
                              <p className="text-[10px] text-red-400/60">Kullanıcıyı odadan banla</p>
                            </div>
                          </button>
                          <button
                            onClick={() => { setCommandSubPanel('unban'); fetchModList() }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-emerald-900/30 border border-emerald-500/20 rounded-lg text-emerald-300 hover:bg-emerald-900/50 hover:text-white transition-all text-left"
                          >
                            <UserCheck className="w-4 h-4 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium">✅ Ban Kaldır</p>
                              <p className="text-[10px] text-emerald-400/60">Banlanan kullanıcıları gör</p>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setShowCommandsPanel(false)
                              setCommandSubPanel(null)
                              setShowMusicModal(true)
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-fuchsia-900/30 border border-fuchsia-500/20 rounded-lg text-fuchsia-300 hover:bg-fuchsia-900/50 hover:text-white transition-all text-left"
                          >
                            <Music className="w-4 h-4 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium">🎶 Müzik Aç</p>
                              <p className="text-[10px] text-fuchsia-400/60">YouTube&apos;dan müzik çal/yönet</p>
                            </div>
                          </button>
                          <button
                            onClick={() => setCommandSubPanel('pk')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-red-900/30 border border-red-500/20 rounded-lg text-red-300 hover:bg-red-900/50 hover:text-white transition-all text-left"
                          >
                            <Swords className="w-4 h-4 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium">⚔️ PK Başlat</p>
                              <p className="text-[10px] text-red-400/60">Başka bir odaya PK isteği gönder</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Jeton Bilgisi */}
                    <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/30 rounded-xl p-3">
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

                    {/* Yasaklı Kelimeler */}
                    {(myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || myPermissions?.canManageRoom) && (
                      <div>
                        <h4 className="text-red-300 text-xs font-bold uppercase tracking-wider mb-2">🚫 Yasaklı Kelimeler</h4>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              let customWords: string[] = []
                              try { customWords = room?.bannedWords ? JSON.parse(room.bannedWords) : [] } catch {}
                              if (!Array.isArray(customWords)) customWords = []
                              return customWords.map((word, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-900/30 border border-red-500/30 rounded-full text-red-300 text-[10px]">
                                  {word}
                                  <button
                                    onClick={async () => {
                                      const updated = customWords.filter((_, idx) => idx !== i)
                                      try {
                                        const res = await fetch(`/api/chat/rooms/${room?.id}/settings`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ bannedWords: updated.length > 0 ? JSON.stringify(updated) : null })
                                        })
                                        if (res.ok) setRoom(prev => prev ? { ...prev, bannedWords: updated.length > 0 ? JSON.stringify(updated) : null } : prev)
                                      } catch {}
                                    }}
                                    className="text-red-400 hover:text-white"
                                  >×</button>
                                </span>
                              ))
                            })()}
                          </div>
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault()
                              const input = (e.target as HTMLFormElement).elements.namedItem('newBannedWord') as HTMLInputElement
                              const word = input.value.trim().toLowerCase()
                              if (!word || !room) return
                              let currentWords: string[] = []
                              try { currentWords = room.bannedWords ? JSON.parse(room.bannedWords) : [] } catch {}
                              if (!Array.isArray(currentWords)) currentWords = []
                              if (currentWords.includes(word)) { input.value = ''; return }
                              const updated = [...currentWords, word]
                              try {
                                const res = await fetch(`/api/chat/rooms/${room.id}/settings`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ bannedWords: JSON.stringify(updated) })
                                })
                                if (res.ok) {
                                  setRoom(prev => prev ? { ...prev, bannedWords: JSON.stringify(updated) } : prev)
                                  input.value = ''
                                }
                              } catch {}
                            }}
                            className="flex gap-1.5"
                          >
                            <input
                              name="newBannedWord"
                              type="text"
                              placeholder="Yasaklı kelime ekle..."
                              maxLength={30}
                              className="flex-1 px-2 py-1.5 bg-white/10 border border-red-500/30 rounded-lg text-white text-xs placeholder-purple-300/40 focus:outline-none focus:border-red-500/50"
                            />
                            <button type="submit" className="px-3 py-1.5 bg-red-600/40 border border-red-500/30 rounded-lg text-red-200 text-xs font-medium hover:bg-red-600/60 transition-all">
                              Ekle
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* === DUYURU SUB-PANEL === */}
                {commandSubPanel === 'duyuru' && (
                  <div className="space-y-3">
                    <p className="text-purple-300/70 text-xs">Mesajınız 15 saniye boyunca sohbetin üstünde sabitlenir ve herkes görür.</p>
                    <textarea
                      value={duyuruText}
                      onChange={(e) => setDuyuruText(e.target.value)}
                      placeholder="Duyuru mesajınızı yazın..."
                      maxLength={200}
                      rows={3}
                      className="w-full px-3 py-2.5 bg-white/10 border border-blue-500/30 rounded-xl text-white text-sm placeholder-purple-300/40 focus:outline-none focus:border-blue-500/50 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-purple-400/50 text-[10px]">{duyuruText.length}/200</span>
                      <button
                        onClick={async () => {
                          if (!duyuruText.trim()) return
                          await handleChatCommand(`!duyuru ${duyuruText.trim()}`)
                          setDuyuruText('')
                          setCommandSubPanel(null)
                          setShowCommandsPanel(false)
                        }}
                        disabled={!duyuruText.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg text-xs disabled:opacity-30 hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center gap-1.5"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Yayınla
                      </button>
                    </div>
                  </div>
                )}

                {/* === KICK SUB-PANEL (color-coded user list) === */}
                {commandSubPanel === 'kick' && (() => {
                  const ROLE_RANK: Record<string, number> = { owner: 100, superadmin: 90, founder: 80, sop: 70, admin: 60, op: 50, voice: 30, '': 0 }
                  const myRank = myPermissions?.isRoomOwner ? 100 : (myPermissions?.isGlobalAdmin ? 95 : ROLE_RANK[myPermissions?.role || ''] || 0)
                  const otherUsers = activeUsers.filter(u => u.id !== session?.user?.id)
                  return (
                    <div className="space-y-3">
                      <p className="text-purple-300/70 text-xs">3 kez kick = otomatik ban. Renk kodları: <span className="text-green-400">atılabilir</span> • <span className="text-yellow-400">eşit</span> • <span className="text-red-400">atılamaz</span></p>
                      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                        {otherUsers.length === 0 ? (
                          <p className="text-purple-400/50 text-sm text-center py-4">Odada başka kullanıcı yok</p>
                        ) : otherUsers.map(user => {
                          const userRank = room?.ownerId === user.id ? 100 : (user.isAdmin ? 95 : ROLE_RANK[user.chatRole || ''] || 0)
                          const canKick = myRank > userRank
                          const isSameRank = myRank === userRank
                          const kickCount = kickCountsRef.current.get(user.id) || 0
                          const colorClass = room?.ownerId === user.id || user.isAdmin ? 'border-gray-700 bg-gray-900/40 text-gray-400' :
                            !canKick && !isSameRank ? 'border-red-500/30 bg-red-900/20 text-red-300' :
                            isSameRank ? 'border-yellow-500/30 bg-yellow-900/20 text-yellow-300' :
                            'border-green-500/30 bg-green-900/20 text-green-300'
                          return (
                            <button
                              key={user.id}
                              disabled={!canKick}
                              onClick={async () => {
                                const newCount = kickCount + 1
                                kickCountsRef.current.set(user.id, newCount)
                                if (newCount >= 3) {
                                  // Auto-ban on 3rd kick
                                  await fetch(`/api/chat/rooms/${room!.id}/moderation`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'ban_user', targetUserId: user.id, reason: '3 ihtar sonucu otomatik ban' })
                                  })
                                  kickCountsRef.current.delete(user.id)
                                  setCommandFlash(`🚫 ${getDisplayName(user)} 3 ihtar sonucu banlandı!`)
                                } else {
                                  await fetch(`/api/chat/rooms/${room!.id}/moderation`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'kick_user', targetUserId: user.id, reason: `Kick ${newCount}/3` })
                                  })
                                  setCommandFlash(`👢 ${getDisplayName(user)} kicklendi (${newCount}/3 ihtar)`)
                                }
                                setTimeout(() => setCommandFlash(null), 3000)
                                fetchActiveUsers()
                                setCommandSubPanel(null)
                                setShowCommandsPanel(false)
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all disabled:cursor-not-allowed ${colorClass}`}
                            >
                              <div className="w-7 h-7 rounded-full bg-purple-800 overflow-hidden flex-shrink-0">
                                {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> :
                                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{(user.nickname || user.name || '?').charAt(0).toUpperCase()}</div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{user.roleSymbol || ''}{getDisplayName(user)}</p>
                                <p className="text-[10px] opacity-60">{user.chatRole || 'kullanıcı'}{kickCount > 0 ? ` • ${kickCount}/3 ihtar` : ''}</p>
                              </div>
                              {canKick && <UserMinus className="w-4 h-4 flex-shrink-0 opacity-60" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* === BAN SUB-PANEL (color-coded user list) === */}
                {commandSubPanel === 'ban' && (() => {
                  const ROLE_RANK: Record<string, number> = { owner: 100, superadmin: 90, founder: 80, sop: 70, admin: 60, op: 50, voice: 30, '': 0 }
                  const myRank = myPermissions?.isRoomOwner ? 100 : (myPermissions?.isGlobalAdmin ? 95 : ROLE_RANK[myPermissions?.role || ''] || 0)
                  const otherUsers = activeUsers.filter(u => u.id !== session?.user?.id)
                  return (
                    <div className="space-y-3">
                      <p className="text-purple-300/70 text-xs">Banlanan kullanıcı odaya giremez. Renk kodları: <span className="text-green-400">banlanabilir</span> • <span className="text-yellow-400">eşit</span> • <span className="text-red-400">banlanamaz</span></p>
                      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                        {otherUsers.length === 0 ? (
                          <p className="text-purple-400/50 text-sm text-center py-4">Odada başka kullanıcı yok</p>
                        ) : otherUsers.map(user => {
                          const userRank = room?.ownerId === user.id ? 100 : (user.isAdmin ? 95 : ROLE_RANK[user.chatRole || ''] || 0)
                          const canBan = myRank > userRank
                          const isSameRank = myRank === userRank
                          const colorClass = room?.ownerId === user.id || user.isAdmin ? 'border-gray-700 bg-gray-900/40 text-gray-400' :
                            !canBan && !isSameRank ? 'border-red-500/30 bg-red-900/20 text-red-300' :
                            isSameRank ? 'border-yellow-500/30 bg-yellow-900/20 text-yellow-300' :
                            'border-green-500/30 bg-green-900/20 text-green-300'
                          return (
                            <button
                              key={user.id}
                              disabled={!canBan}
                              onClick={async () => {
                                if (!confirm(`${getDisplayName(user)} kullanıcısını banlamak istediğinize emin misiniz?`)) return
                                await fetch(`/api/chat/rooms/${room!.id}/moderation`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'ban_user', targetUserId: user.id, reason: 'Komut panelinden banlandı' })
                                })
                                setCommandFlash(`🚫 ${getDisplayName(user)} banlandı`)
                                setTimeout(() => setCommandFlash(null), 3000)
                                fetchActiveUsers()
                                setCommandSubPanel(null)
                                setShowCommandsPanel(false)
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all disabled:cursor-not-allowed ${colorClass}`}
                            >
                              <div className="w-7 h-7 rounded-full bg-purple-800 overflow-hidden flex-shrink-0">
                                {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> :
                                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{(user.nickname || user.name || '?').charAt(0).toUpperCase()}</div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{user.roleSymbol || ''}{getDisplayName(user)}</p>
                                <p className="text-[10px] opacity-60">{user.chatRole || 'kullanıcı'}</p>
                              </div>
                              {canBan && <Ban className="w-4 h-4 flex-shrink-0 opacity-60" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* === UNBAN SUB-PANEL === */}
                {commandSubPanel === 'unban' && (
                  <div className="space-y-3">
                    <p className="text-purple-300/70 text-xs">Banlanan kullanıcıları görün ve banı kaldırın.</p>
                    {loadingModList ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-purple-400" /></div>
                    ) : bannedUsers.length === 0 ? (
                      <p className="text-purple-400/50 text-sm text-center py-8">Banlanan kullanıcı yok</p>
                    ) : (
                      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                        {bannedUsers.map(ban => (
                          <div key={ban.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 bg-red-900/20">
                            <div className="w-7 h-7 rounded-full bg-red-800 overflow-hidden flex-shrink-0">
                              <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                {(ban.user.name || '?').charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <span className="flex-1 text-red-200 text-xs font-medium truncate">{ban.user.name}</span>
                            <button
                              onClick={async () => {
                                await handleUnban(ban.userId)
                                setCommandFlash(`✅ ${ban.user.name} banı kaldırıldı`)
                                setTimeout(() => setCommandFlash(null), 3000)
                              }}
                              className="px-2.5 py-1 bg-emerald-600/40 border border-emerald-500/30 rounded-lg text-emerald-200 text-[10px] font-medium hover:bg-emerald-600/60 transition-all"
                            >
                              Ban Kaldır
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* === PK SUB-PANEL === */}
                {commandSubPanel === 'pk' && (
                  <div className="space-y-3">
                    <p className="text-purple-300/70 text-xs">PK isteği göndermek istediğiniz odayı seçin.</p>
                    {activePKBattle && (activePKBattle.status === 'pending' || activePKBattle.status === 'active') ? (
                      <div className="text-center py-4">
                        <p className="text-yellow-400 text-sm">⚔️ Zaten aktif bir PK mevcut</p>
                        <p className="text-purple-400/60 text-xs mt-1">Durum: {activePKBattle.status === 'pending' ? 'Beklemede' : 'Aktif'}</p>
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                        {allRooms.filter(r => r.id !== room?.id).length === 0 ? (
                          <p className="text-purple-400/50 text-sm text-center py-8">Başka aktif oda bulunamadı</p>
                        ) : (
                          allRooms.filter(r => r.id !== room?.id).map(targetRoom => (
                            <button
                              key={targetRoom.id}
                              onClick={() => handlePKCreate(targetRoom.id)}
                              disabled={pkSendingAction}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-red-500/20 bg-red-900/20 hover:bg-red-900/40 transition-all text-left disabled:opacity-50"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                                {targetRoom.icon || targetRoom.nameTr?.charAt(0) || '🏠'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-red-200 text-xs font-medium truncate">{targetRoom.nameTr || targetRoom.nameEn}</p>
                                <p className="text-red-400/50 text-[10px]">{(targetRoom as any).userCount || 0} kişi online</p>
                              </div>
                              <Swords className="w-4 h-4 text-red-400 flex-shrink-0" />
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Incoming PK Request Modal === */}
      <AnimatePresence>
        {incomingPKRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="bg-gradient-to-br from-gray-900 via-red-950/50 to-gray-900 border border-red-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-red-500/20"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-5xl mb-4"
                >
                  ⚔️
                </motion.div>
                <h3 className="text-xl font-bold text-red-400 mb-2">PK Daveti!</h3>
                <p className="text-purple-200 text-sm mb-1">
                  <span className="font-semibold text-white">{incomingPKRequest.user1?.name || 'Bir oda sahibi'}</span> sizi PK&apos;ya davet etti!
                </p>
                {incomingPKRequest.room1 && (
                  <p className="text-purple-400/70 text-xs mb-4">
                    {incomingPKRequest.room1.icon} {incomingPKRequest.room1.name} odası
                  </p>
                )}
                <p className="text-purple-400/60 text-xs mb-6">Süre: {Math.floor((incomingPKRequest.duration || 180) / 60)} dakika</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handlePKReject(incomingPKRequest.id)}
                    disabled={pkSendingAction}
                    className="flex-1 py-3 bg-gray-800 border border-gray-600/40 rounded-xl text-gray-300 font-semibold hover:bg-gray-700 transition-all disabled:opacity-50"
                  >
                    ❌ Reddet
                  </button>
                  <button
                    onClick={() => handlePKAccept(incomingPKRequest.id)}
                    disabled={pkSendingAction}
                    className="flex-1 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all shadow-lg shadow-red-500/30 disabled:opacity-50"
                  >
                    ✅ Kabul Et
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Active PK Battle Overlay === */}
      {activePKBattle && activePKBattle.status === 'active' && room && (
        <PKBattleOverlay
          battle={activePKBattle}
          currentStreamId={room.id}
          onEnd={() => handlePKEnd(activePKBattle.id)}
        />
      )}

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
        canControl={!!(myPermissions?.isRoomOwner || myPermissions?.isGlobalAdmin || canPlayMusic)}
        musicQueue={musicQueue}
        onSkipToNext={handleSkipToNext}
        currentRequestType={currentMusicRequestType}
      />

      {/* ── DJ Management Panel ── */}
      <AnimatePresence>
        {showDjPanel && room && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={() => setShowDjPanel(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md max-h-[80vh] bg-gradient-to-br from-gray-900 via-cyan-950/50 to-gray-900 rounded-2xl border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-black/30">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎧</span>
                  <h2 className="text-white font-bold text-lg">DJ Yönetimi</h2>
                  <span className="text-cyan-400/60 text-xs">({djUsers.length}/5)</span>
                </div>
                <button onClick={() => setShowDjPanel(false)} className="text-gray-400 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current DJs */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Owner info */}
                <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-3">
                  <p className="text-yellow-300 text-xs font-bold mb-1">👑 Oda Sahibi Kuralları</p>
                  <ul className="text-yellow-200/60 text-[10px] space-y-0.5">
                    <li>• Oda sahibi her zaman müzik çalabilir</li>
                    <li>• Oda sahibi odadayken DJ&apos;ler sadece izin verilince çalar</li>
                    <li>• Oda sahibi yokken sıralamaya göre öncelik belirlenir</li>
                  </ul>
                </div>

                {/* DJ List */}
                {djUsers.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-400 text-sm">Henüz DJ eklenmedi</p>
                    <p className="text-gray-500 text-xs mt-1">Aşağıdan odadaki kullanıcıları DJ olarak ekleyin</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-cyan-300 text-xs font-bold">🎵 Aktif DJ Listesi</p>
                    {djUsers.map((dj, idx) => (
                      <div key={dj.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                        activeDjId === dj.id 
                          ? 'bg-green-900/30 border-green-500/40' 
                          : 'bg-white/5 border-white/10'
                      }`}>
                        <span className="text-cyan-400 text-xs font-bold w-5">{idx + 1}.</span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                          {dj.image ? <img src={dj.image} alt="" className="w-full h-full object-cover" /> : dj.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{dj.name}</p>
                          <p className="text-gray-400 text-[10px]">
                            {dj.isPresent ? '🟢 Odada' : '🔴 Çevrimdışı'}
                            {activeDjId === dj.id && ownerPresent && ' • ✅ İzinli'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {ownerPresent && (
                            <button
                              onClick={async () => {
                                const newDjId = activeDjId === dj.id ? null : dj.id
                                try {
                                  const res = await fetch(`/api/chat/rooms/${room.id}/dj`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'set_active_dj', userId: newDjId })
                                  })
                                  if (res.ok) setActiveDjId(newDjId)
                                } catch {}
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                activeDjId === dj.id
                                  ? 'bg-green-600/80 text-white hover:bg-red-600/80'
                                  : 'bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50'
                              }`}
                            >
                              {activeDjId === dj.id ? '🔇 Kapat' : '🎵 İzin Ver'}
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/chat/rooms/${room.id}/dj`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'remove_dj', userId: dj.id })
                                })
                                if (res.ok) {
                                  setDjUsers(prev => prev.filter(d => d.id !== dj.id))
                                  if (activeDjId === dj.id) setActiveDjId(null)
                                }
                              } catch {}
                            }}
                            className="p-1.5 bg-red-600/20 hover:bg-red-600/50 border border-red-500/30 rounded-lg text-red-300 transition-all"
                            title="DJ'den çıkar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add DJ from room users */}
                {djUsers.length < 5 && (
                  <div className="mt-4">
                    <p className="text-cyan-300 text-xs font-bold mb-2">➕ Odadan DJ Ekle</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {activeUsers
                        .filter(u => u.id !== session?.user?.id && u.id !== room.ownerId && !djUsers.some(d => d.id === u.id))
                        .slice(0, 20)
                        .map(u => (
                          <button
                            key={u.id}
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/chat/rooms/${room.id}/dj`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'add_dj', userId: u.id })
                                })
                                if (res.ok) {
                                  setDjUsers(prev => [...prev, { id: u.id, name: u.nickname || u.name || 'Anonim', image: u.image, isPresent: true }])
                                }
                              } catch {}
                            }}
                            className="w-full flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-cyan-600/20 border border-transparent hover:border-cyan-500/30 transition-all text-left"
                          >
                            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                              {u.image ? <img src={u.image} alt="" className="w-full h-full object-cover" /> : (u.nickname || u.name || '?')[0]?.toUpperCase()}
                            </div>
                            <span className="text-white text-xs truncate flex-1">{u.nickname || u.name || 'Kullanıcı'}</span>
                            <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                        ))}
                      {activeUsers.filter(u => u.id !== session?.user?.id && u.id !== room.ownerId && !djUsers.some(d => d.id === u.id)).length === 0 && (
                        <p className="text-gray-500 text-xs text-center py-3">Eklenebilecek kullanıcı yok</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Music Queue Display */}
                {musicQueue.length > 0 && (
                  <div className="mt-4">
                    <p className="text-yellow-300 text-xs font-bold mb-2">🎵 Şarkı Kuyruğu</p>
                    <div className="space-y-1.5">
                      {musicQueue.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-black/30 border border-yellow-500/20 rounded-lg">
                          <span className="text-yellow-400 text-xs font-bold w-5">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs truncate">{item.title}</p>
                            <p className="text-yellow-300/70 text-[10px]">İsteyen: {item.requestedBy}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-cyan-500/20 bg-black/20">
                <p className="text-gray-500 text-[10px] text-center">
                  {ownerPresent ? '👑 Oda sahibi odada — DJ\'ler yalnızca izin verildiğinde çalabilir' : '🔄 Oda sahibi yok — sıralama ile öncelik belirlenir'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── YouTube Player (video mode = visible center, audio mode = hidden) ── */}
      {currentMusicVideoId && !musicMuted && !musicPaused && (
        currentMusicRequestType === 'video' ? (
          <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none" style={{ top: '30%', bottom: '30%' }}>
            <div className="relative w-[90%] max-w-md aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/80 border border-purple-500/40 pointer-events-auto">
              <iframe
                key={currentMusicVideoId + '-video'}
                src={`https://www.youtube.com/embed/${currentMusicVideoId}?autoplay=1&loop=0&controls=1&modestbranding=1`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="w-full h-full"
                style={{ border: 'none' }}
              />
            </div>
          </div>
        ) : (
          <div style={{ position: 'fixed', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none', bottom: 0, left: 0 }}>
            <iframe
              key={currentMusicVideoId + '-audio'}
              src={`https://www.youtube.com/embed/${currentMusicVideoId}?autoplay=1&loop=1&playlist=${currentMusicVideoId}`}
              allow="autoplay; encrypted-media"
              style={{ width: 1, height: 1, border: 'none' }}
            />
          </div>
        )
      )}

    </div>
  )
}