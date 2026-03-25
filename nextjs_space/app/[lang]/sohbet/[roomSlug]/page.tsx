'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { getRTCConfiguration } from '@/lib/webrtc-config'
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
  canGiveAdmin: boolean
  canGiveFounder: boolean
  isGlobalAdmin: boolean
  isRoomOwner: boolean
}

const ROLE_COLORS: Record<string, string> = {
  founder: 'text-red-400',
  admin: 'text-orange-400',
  op: 'text-green-400',
  voice: 'text-blue-400'
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  founder: <Crown className="w-3 h-3" />,
  admin: <Shield className="w-3 h-3" />,
  op: <Star className="w-3 h-3" />,
  voice: <Mic className="w-3 h-3" />
}

const ROLE_BADGE_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  founder: { bg: 'bg-red-500/20', border: 'border-red-500/60', text: 'text-red-300', label: '~Kurucu' },
  admin: { bg: 'bg-orange-500/20', border: 'border-orange-500/60', text: 'text-orange-300', label: '&Moderatör' },
  op: { bg: 'bg-green-500/20', border: 'border-green-500/60', text: 'text-green-300', label: '@Operatör' },
  voice: { bg: 'bg-blue-500/20', border: 'border-blue-500/60', text: 'text-blue-300', label: '+Ses' },
}

const GIFT_IMAGES: Record<string, string> = {
  // Gift types now use emoji icons - no image files needed
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
  
  // Voice Chat with WebRTC
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false) // For listen-only mode
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set())
  const [voiceUsers, setVoiceUsers] = useState<Array<{id: string, name: string}>>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // Gift system
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [giftTargetUser, setGiftTargetUser] = useState<ActiveUser | null>(null)
  const [giftTypes, setGiftTypes] = useState<Array<{id: string; name: string; icon: string; price: number}>>([])
  const [selectedGiftType, setSelectedGiftType] = useState<string | null>(null)
  const [giftPaymentType, setGiftPaymentType] = useState<'jeton' | 'cfc'>('jeton')
  const [sendingGift, setSendingGift] = useState(false)
  const [giftAnimations, setGiftAnimations] = useState<Array<{id: string; giftImage: string; giftIcon: string; senderName: string; recipientId: string; recipientName: string; amount: number; phase: 'enter' | 'hit' | 'burst' | 'exit'}>>([])
  const lastGiftPollRef = useRef<string>(new Date().toISOString())
  const seenGiftIdsRef = useRef<Set<string>>(new Set())
  const [leaderboard, setLeaderboard] = useState<Array<{userId: string; name: string; image: string | null; jetonTotal: number; cfcTotal: number}>>([])
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  const [showGiftUserSelect, setShowGiftUserSelect] = useState(false)
  const [showMobileUsers, setShowMobileUsers] = useState(false)
  
  // Broadcast images for profile pictures in grid
  const [broadcastImages, setBroadcastImages] = useState<Array<{id: string; name: string; imageUrl: string}>>([])
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [myBroadcastImage, setMyBroadcastImage] = useState<string | null>(null)
  
  // Grid user limit from admin settings
  const [gridUserLimit, setGridUserLimit] = useState(6)
  
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const voiceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const remoteAudioRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const voicePollRef = useRef<NodeJS.Timeout | null>(null)
  const lastSignalTimeRef = useRef<number>(0)
  const voiceUsersPollRef = useRef<NodeJS.Timeout | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousMessagesCount = useRef(0)
  const iceCandidatesBuffer = useRef<Map<string, RTCIceCandidate[]>>(new Map())

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
      setLoading(false)

      const messageInterval = setInterval(fetchMessages, 3000)
      const userInterval = setInterval(fetchActiveUsers, 5000)
      const presenceInterval = setInterval(updatePresence, 10000)
      const roomsInterval = setInterval(fetchAllRooms, 60000)
      const voiceUsersInterval = setInterval(fetchVoiceUsers, 5000)
      const typingInterval = setInterval(fetchTypingUsers, 2000)

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
        window.removeEventListener('beforeunload', handleBeforeUnload)
        // Clean up presence on component unmount (no leave message - might be re-render)
        if (room?.id) {
          fetch(`/api/chat/rooms/${room.id}/presence`, { method: 'DELETE' }).catch(() => {})
        }
      }
    }
  }, [room, fetchMessages, fetchActiveUsers, checkBan, updatePresence, fetchAllRooms, fetchVoiceUsers, fetchTypingUsers, fetchBroadcastImages])

  // Auto-scroll - use scrollTop on container to prevent parent scroll
  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  // WebRTC Configuration - STUN + TURN sunucuları merkezi yapılandırmadan
  const rtcConfig: RTCConfiguration = getRTCConfiguration()

  // Create peer connection for a user
  const createPeerConnection = useCallback((userId: string, isInitiator: boolean) => {
    if (!room || !mediaStreamRef.current) {
      console.log('Cannot create peer connection: room or mediaStream missing')
      return null
    }
    
    // Close existing connection if any
    const existingPc = peerConnectionsRef.current.get(userId)
    if (existingPc) {
      existingPc.close()
      peerConnectionsRef.current.delete(userId)
    }
    
    console.log(`Creating peer connection for ${userId}, isInitiator: ${isInitiator}`)
    const pc = new RTCPeerConnection(rtcConfig)
    peerConnectionsRef.current.set(userId, pc)
    iceCandidatesBuffer.current.set(userId, [])
    
    // Add local audio tracks
    mediaStreamRef.current.getAudioTracks().forEach(track => {
      console.log('Adding local audio track:', track.label)
      pc.addTrack(track, mediaStreamRef.current!)
    })
    
    // Handle incoming audio
    pc.ontrack = (event) => {
      console.log('Received remote track from', userId)
      const remoteAudio = new Audio()
      remoteAudio.srcObject = event.streams[0]
      remoteAudio.autoplay = true
      remoteAudio.volume = 1.0
      
      // Try to play with user gesture fallback
      const playAudio = () => {
        remoteAudio.play().then(() => {
          console.log('Remote audio playing for', userId)
        }).catch(err => {
          console.log('Audio play failed, will retry:', err)
          // Retry on user interaction
          document.addEventListener('click', () => remoteAudio.play(), { once: true })
        })
      }
      playAudio()
      remoteAudioRef.current.set(userId, remoteAudio)
      
      // Update speaking users based on audio activity
      try {
        const audioContext = new AudioContext()
        const source = audioContext.createMediaStreamSource(event.streams[0])
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const checkSpeaking = setInterval(() => {
          if (audioContext.state === 'closed') {
            clearInterval(checkSpeaking)
            return
          }
          analyser.getByteFrequencyData(dataArray)
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
          setSpeakingUsers(prev => {
            const next = new Set(prev)
            if (avg > 20) next.add(userId)
            else next.delete(userId)
            return next
          })
        }, 100)
        
        pc.onconnectionstatechange = () => {
          console.log(`Connection state for ${userId}:`, pc.connectionState)
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
            clearInterval(checkSpeaking)
            audioContext.close().catch(() => {})
          }
        }
      } catch (err) {
        console.error('Error setting up audio analyser:', err)
      }
    }
    
    // Handle ICE candidates - buffer them
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate generated for', userId)
        const buffer = iceCandidatesBuffer.current.get(userId) || []
        buffer.push(event.candidate)
        iceCandidatesBuffer.current.set(userId, buffer)
      }
    }
    
    // When ICE gathering is complete, send all candidates
    pc.onicegatheringstatechange = () => {
      console.log(`ICE gathering state for ${userId}:`, pc.iceGatheringState)
      if (pc.iceGatheringState === 'complete' && room) {
        const candidates = iceCandidatesBuffer.current.get(userId) || []
        if (candidates.length > 0) {
          console.log(`Sending ${candidates.length} ICE candidates to ${userId}`)
          fetch(`/api/chat/rooms/${room.id}/voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'ice-candidates',
              toUserId: userId,
              data: JSON.stringify(candidates)
            })
          }).catch(console.error)
        }
      }
    }
    
    // Connection state change handler
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${userId} connection state:`, pc.connectionState)
      if (pc.connectionState === 'failed') {
        console.log('Connection failed, will retry...')
        // Could implement retry logic here
      }
    }
    
    return pc
  }, [room])

  // Send voice signal
  const sendVoiceSignal = useCallback(async (type: string, data?: string, toUserId?: string) => {
    if (!room) return
    try {
      await fetch(`/api/chat/rooms/${room.id}/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, toUserId })
      })
    } catch (error) {
      console.error('Error sending voice signal:', error)
    }
  }, [room])

  // Poll for voice signals
  const pollVoiceSignals = useCallback(async () => {
    if (!room || !voiceEnabled) return
    
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/voice?since=${lastSignalTimeRef.current}`)
      if (!res.ok) return
      
      const { signals, voiceUsers: users, timestamp } = await res.json()
      lastSignalTimeRef.current = timestamp
      setVoiceUsers(users)
      
      for (const signal of signals) {
        const { fromUserId, type, data } = signal
        
        try {
          if (type === 'join') {
            // New user joined, create offer
            console.log('User joined voice:', fromUserId)
            if (!peerConnectionsRef.current.has(fromUserId) && mediaStreamRef.current) {
              const pc = createPeerConnection(fromUserId, true)
              if (pc) {
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)
                console.log('Sending offer to', fromUserId)
                await sendVoiceSignal('offer', JSON.stringify(offer), fromUserId)
              }
            }
          } else if (type === 'leave') {
            // User left, cleanup
            console.log('User left voice:', fromUserId)
            const pc = peerConnectionsRef.current.get(fromUserId)
            if (pc) {
              pc.close()
              peerConnectionsRef.current.delete(fromUserId)
            }
            const audio = remoteAudioRef.current.get(fromUserId)
            if (audio) {
              audio.pause()
              audio.srcObject = null
              remoteAudioRef.current.delete(fromUserId)
            }
            setSpeakingUsers(prev => {
              const next = new Set(prev)
              next.delete(fromUserId)
              return next
            })
          } else if (type === 'offer' && data) {
            // Received offer, create answer
            console.log('Received offer from', fromUserId)
            let pc: RTCPeerConnection | null | undefined = peerConnectionsRef.current.get(fromUserId)
            if (!pc) {
              pc = createPeerConnection(fromUserId, false)
            }
            if (pc) {
              await pc.setRemoteDescription(JSON.parse(data))
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              console.log('Sending answer to', fromUserId)
              await sendVoiceSignal('answer', JSON.stringify(answer), fromUserId)
            }
          } else if (type === 'answer' && data) {
            // Received answer
            console.log('Received answer from', fromUserId)
            const pc = peerConnectionsRef.current.get(fromUserId)
            if (pc && pc.signalingState !== 'stable') {
              await pc.setRemoteDescription(JSON.parse(data))
            }
          } else if (type === 'ice-candidate' && data) {
            // Received single ICE candidate (legacy)
            const pc = peerConnectionsRef.current.get(fromUserId)
            if (pc && pc.remoteDescription) {
              await pc.addIceCandidate(JSON.parse(data))
            }
          } else if (type === 'ice-candidates' && data) {
            // Received batch of ICE candidates
            console.log('Received ICE candidates from', fromUserId)
            const pc = peerConnectionsRef.current.get(fromUserId)
            if (pc && pc.remoteDescription) {
              const candidates = JSON.parse(data) as RTCIceCandidate[]
              for (const candidate of candidates) {
                try {
                  await pc.addIceCandidate(candidate)
                } catch (err) {
                  console.warn('Failed to add ICE candidate:', err)
                }
              }
            }
          }
        } catch (signalError) {
          console.error('Error processing signal:', type, signalError)
        }
      }
    } catch (error) {
      console.error('Error polling voice signals:', error)
    }
  }, [room, voiceEnabled, createPeerConnection, sendVoiceSignal])

  // Voice chat functions
  const startVoiceChat = async () => {
    if (voiceConnecting) return
    setVoiceConnecting(true)
    
    try {
      console.log('Starting voice chat...')
      
      // First get microphone access
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        })
        console.log('Microphone access granted')
      } catch (micError) {
        console.error('Microphone error:', micError)
        setVoiceConnecting(false)
        alert('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini verin.')
        return
      }
      
      mediaStreamRef.current = stream
      
      // Now check if we have voice permission by trying to join
      if (room) {
        const joinRes = await fetch(`/api/chat/rooms/${room.id}/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'join' })
        })
        
        if (!joinRes.ok) {
          // Stop microphone if permission denied
          stream.getTracks().forEach(track => track.stop())
          mediaStreamRef.current = null
          setVoiceConnecting(false)
          
          const errData = await joinRes.json().catch(() => ({}))
          if (joinRes.status === 403) {
            alert('Sesli sohbet için yetkiniz yok. Oda sahibi veya yetkili size "+" (voice) rolü vermelidir.')
            return
          }
          throw new Error(errData.error || 'Failed to join voice')
        }
        console.log('Voice permission granted')
      }
      
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)
      
      // Check for voice activity (local speaking indicator)
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      voiceIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength
          const isTalking = average > 30
          setIsSpeaking(isTalking)
          
          // Update speaking status on server
          if (room && session?.user?.id) {
            fetch(`/api/chat/rooms/${room.id}/presence`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                nickname: nickname || session.user.name,
                isSpeaking: isTalking
              })
            }).catch(() => {})
          }
        }
      }, 100)
      
      setVoiceEnabled(true)
      setVoiceConnecting(false)
      console.log('Voice chat started successfully')
      
      // Start polling for signals
      lastSignalTimeRef.current = Date.now()
      voicePollRef.current = setInterval(pollVoiceSignals, 300)
      
      // Connect to existing voice users after a short delay
      setTimeout(async () => {
        if (room && mediaStreamRef.current) {
          try {
            const res = await fetch(`/api/chat/rooms/${room.id}/voice?since=0`)
            if (res.ok) {
              const { voiceUsers: existingUsers } = await res.json()
              console.log('Found existing voice users:', existingUsers.length)
              // Create offers to all existing voice users
              for (const user of existingUsers) {
                if (user.id !== session?.user?.id && !peerConnectionsRef.current.has(user.id)) {
                  console.log('Creating connection to existing user:', user.name)
                  const pc = createPeerConnection(user.id, true)
                  if (pc) {
                    const offer = await pc.createOffer()
                    await pc.setLocalDescription(offer)
                    await sendVoiceSignal('offer', JSON.stringify(offer), user.id)
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error connecting to existing users:', error)
          }
        }
      }, 1000)
      
    } catch (error: unknown) {
      console.error('Error starting voice chat:', error)
      setVoiceConnecting(false)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        alert('Mikrofon erişimi reddedildi')
      } else {
        alert('Sesli sohbet başlatılamadı')
      }
    }
  }

  const stopVoiceChat = useCallback(() => {
    // Send leave signal
    if (room && voiceEnabled) {
      sendVoiceSignal('leave')
    }
    
    // Stop polling
    if (voicePollRef.current) {
      clearInterval(voicePollRef.current)
      voicePollRef.current = null
    }
    
    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close())
    peerConnectionsRef.current.clear()
    
    // Stop all remote audio
    remoteAudioRef.current.forEach(audio => {
      audio.pause()
      audio.srcObject = null
    })
    remoteAudioRef.current.clear()
    
    // Stop local stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current)
      voiceIntervalRef.current = null
    }
    
    setVoiceEnabled(false)
    setIsListening(false)
    setIsSpeaking(false)
    setSpeakingUsers(new Set())
  }, [room, voiceEnabled, sendVoiceSignal])

  // Listen-only mode (for users without voice permission)
  const startListening = async () => {
    if (!room) return
    
    try {
      // Create a silent audio stream (required for WebRTC)
      const silentContext = new AudioContext()
      const oscillator = silentContext.createOscillator()
      const destination = silentContext.createMediaStreamDestination()
      oscillator.connect(destination)
      oscillator.start()
      // Immediately stop to create silent stream
      oscillator.frequency.value = 0
      
      mediaStreamRef.current = destination.stream
      setIsListening(true)
      
      // Start polling for signals to receive audio
      lastSignalTimeRef.current = Date.now()
      voicePollRef.current = setInterval(pollVoiceSignals, 300)
    } catch (error) {
      console.error('Error starting listen mode:', error)
    }
  }

  const stopListening = useCallback(() => {
    // Stop polling
    if (voicePollRef.current) {
      clearInterval(voicePollRef.current)
      voicePollRef.current = null
    }
    
    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close())
    peerConnectionsRef.current.clear()
    
    // Stop all remote audio
    remoteAudioRef.current.forEach(audio => {
      audio.pause()
      audio.srcObject = null
    })
    remoteAudioRef.current.clear()
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    
    setIsListening(false)
    setSpeakingUsers(new Set())
  }, [])

  // Cleanup voice on unmount
  useEffect(() => {
    return () => {
      stopVoiceChat()
    }
  }, [stopVoiceChat])

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
    if (user.chatRole === 'founder') return 'effect-glitch-flash'
    if (user.chatRole === 'admin' || user.chatRole === 'op') return 'effect-glitch-flash'
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
    const allowedRoles = ['voice', 'op', 'admin', 'founder']
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
    myPermissions.canGiveAdmin ||
    myPermissions.canGiveFounder ||
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
                    {(myPermissions?.isRoomOwner || myPermissions?.role === 'founder' || myPermissions?.role === 'op' || myPermissions?.isGlobalAdmin) && (
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
                      activeUsers.filter(u => u.id !== session?.user?.id).map(user => (
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
                            {/* Give admin */}
                            {myPermissions?.canGiveAdmin && (
                              <button
                                onClick={() => performModAction('set_role', user.id, { role: 'admin' })}
                                className="px-2 py-1 bg-orange-600/30 text-orange-300 rounded text-xs hover:bg-orange-600/50"
                              >
                                &a
                              </button>
                            )}
                            {/* Remove roles */}
                            {user.chatRole && (myPermissions?.canGiveVoice || myPermissions?.canGiveOp || myPermissions?.canGiveAdmin) && (
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

      {/* Main Chat Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-purple-500/30">
          {/* Header */}
          <div className="flex-shrink-0 h-12 bg-[#1a0b2e] border-b border-purple-500/30 flex items-center justify-between px-2 gap-1">
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Home Button */}
              <Link
                href={`/`}
                className="flex items-center justify-center w-8 h-8 rounded bg-gold-500/20 text-gold-400 hover:bg-gold-500/40 transition-colors"
              >
                <Home className="w-4 h-4" />
              </Link>
              
              {/* Odalar Button */}
              <button
                onClick={() => setShowRoomsPopup(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium bg-gold-600/30 text-gold-200 hover:bg-gold-600/50"
              >
                <DoorOpen className="w-3 h-3" />
                <span className="hidden sm:inline">{'Odalar'}</span>
              </button>
            </div>
            
            {/* Room Name - Center */}
            <div className="flex-1 min-w-0 flex items-center justify-center px-1">
              <span className="text-white font-medium text-sm truncate">
                {room.icon} {room.nameTr}
              </span>
              {roomMuted && (
                <VolumeX className="w-3 h-3 text-red-400 ml-1 flex-shrink-0" />
              )}
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Yönet Button */}
              {hasManagePermission && (
                <button
                  onClick={() => setShowManagePopup(true)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium bg-purple-600/30 text-purple-200 hover:bg-purple-600/50"
                >
                  <Settings className="w-3 h-3" />
                  <span className="hidden sm:inline">{'Yönet'}</span>
                </button>
              )}

              {/* Mobile Users Toggle */}
              <button
                onClick={() => setShowMobileUsers(!showMobileUsers)}
                className="md:hidden flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 relative"
              >
                <Users className="w-3 h-3" />
                <span className="bg-purple-500/50 px-1 rounded text-[10px]">{activeUsers.length}</span>
              </button>
            </div>
          </div>

          {/* Privileged Users Grid - Shows users with roles (~founder, &admin, @op) */}
          {(() => {
            const privilegedUsers = activeUsers.filter(u => u.chatRole && ['founder', 'admin', 'op'].includes(u.chatRole))
            // Also include room owner if not already in the list
            const ownerInList = room.owner && !privilegedUsers.find(u => u.id === room.owner?.id)
            const ownerUser = ownerInList ? activeUsers.find(u => u.id === room.owner?.id) : null
            const gridUsers = ownerUser ? [ownerUser, ...privilegedUsers.filter(u => u.id !== room.owner?.id)] : privilegedUsers
            const displayUsers = gridUsers.slice(0, gridUserLimit)
            
            if (displayUsers.length === 0 && !room.owner) return null
            
            // If no privileged users online, show room owner banner
            if (displayUsers.length === 0 && room.owner) {
              return (
                <div className="flex-shrink-0 bg-gradient-to-r from-red-900/60 to-purple-900/40 px-3 py-2 flex items-center gap-2 border-b border-red-500/30">
                  <Crown className="w-4 h-4 text-yellow-300" />
                  <span className="text-white text-sm font-medium">Oda Sahibi</span>
                  <span className="text-yellow-200 text-sm font-bold">{room.owner.username || room.owner.name}</span>
                </div>
              )
            }
            
            return (
              <div className="flex-shrink-0 bg-gradient-to-b from-[#0d0520] to-[#1a0b2e] border-b border-purple-500/30 p-2">
                {/* Counter */}
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10px] text-purple-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    {displayUsers.length}/{activeUsers.length} Yetkili Canlı
                  </span>
                  {session?.user && displayUsers.some(u => u.id === session?.user?.id) && broadcastImages.length > 0 && (
                    <button
                      onClick={() => setShowImagePicker(true)}
                      className="text-[10px] text-purple-400 hover:text-purple-200 transition-colors"
                    >
                      📷 Resim Değiştir
                    </button>
                  )}
                </div>
                {/* Grid */}
                <div className={`grid gap-1.5 ${displayUsers.length <= 3 ? 'grid-cols-3' : displayUsers.length <= 4 ? 'grid-cols-4' : displayUsers.length <= 6 ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-4 sm:grid-cols-8'}`}>
                  {displayUsers.map((user) => {
                    const isOwner = isRoomOwner(user.id)
                    const isMe = user.id === session?.user?.id
                    const badge = user.chatRole ? ROLE_BADGE_STYLES[user.chatRole] : null
                    const displayImage = isMe && myBroadcastImage ? myBroadcastImage : user.image
                    
                    return (
                      <div
                        key={user.id}
                        className={`relative rounded-lg overflow-hidden cursor-pointer group ${isOwner ? 'ring-2 ring-yellow-400/60' : badge ? `ring-1 ${badge.border}` : 'ring-1 ring-purple-500/30'}`}
                        style={{ aspectRatio: '1' }}
                        onClick={() => user.id !== session?.user?.id && openGiftModal(user)}
                      >
                        {/* Profile Image / Avatar */}
                        {displayImage ? (
                          <img loading="lazy" src={displayImage} alt={getDisplayName(user)} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${isOwner ? 'bg-gradient-to-br from-red-900/80 to-yellow-900/50' : 'bg-gradient-to-br from-purple-900/80 to-indigo-900/50'}`}>
                            <span className="text-xl font-bold text-white/80">{(user.nickname || user.name || '?').charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        {/* Dark gradient overlay at bottom */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 pb-1 px-1">
                          <p className={`text-[10px] font-bold truncate text-center ${getNameEffectClass(user)} ${isOwner ? 'text-yellow-300' : badge ? badge.text : 'text-white'}`}
                            {...(getNameEffectClass(user) === 'effect-glitch' ? { 'data-text': getDisplayName(user) } : {})}
                          >
                            {getDisplayName(user)}
                          </p>
                        </div>
                        {/* Role Badge - top left */}
                        {(isOwner || badge) && (
                          <div className={`absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[8px] font-bold ${isOwner ? 'bg-red-600/90 text-yellow-200' : badge ? `${badge.bg} ${badge.text}` : ''}`}>
                            {isOwner ? '👑' : user.roleSymbol}
                          </div>
                        )}
                        {/* Speaking indicator */}
                        {speakingUsers.has(user.id) && (
                          <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full animate-pulse border border-green-300" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

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
                    <button onClick={() => setShowImagePicker(false)} className="text-purple-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-3 grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                    {/* Remove image option */}
                    <button
                      onClick={() => {
                        setMyBroadcastImage(null)
                        if (session?.user?.id) localStorage.removeItem(`chat_broadcast_img_${session.user.id}`)
                        setShowImagePicker(false)
                      }}
                      className={`relative aspect-square rounded-lg border-2 ${!myBroadcastImage ? 'border-gold-400' : 'border-purple-500/30'} overflow-hidden flex items-center justify-center bg-purple-900/30 hover:bg-purple-800/40 transition-colors`}
                    >
                      <span className="text-purple-300 text-xs text-center">Varsayılan</span>
                    </button>
                    {broadcastImages.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => {
                          setMyBroadcastImage(img.imageUrl)
                          if (session?.user?.id) localStorage.setItem(`chat_broadcast_img_${session.user.id}`, img.imageUrl)
                          setShowImagePicker(false)
                        }}
                        className={`relative aspect-square rounded-lg border-2 ${myBroadcastImage === img.imageUrl ? 'border-gold-400' : 'border-purple-500/30'} overflow-hidden hover:border-purple-400/60 transition-colors`}
                      >
                        <img loading="lazy" src={img.imageUrl} alt={img.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Area */}
          <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto bg-[#0d0520] p-2 relative" style={{ overscrollBehavior: 'contain' }}>
            {/* Watermark Room Name */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <span className="text-4xl sm:text-6xl md:text-7xl font-bold text-white/10 whitespace-nowrap select-none">
                {room.icon} {room.nameTr}
              </span>
            </div>
            
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-purple-300/50 relative z-10">
                <Sparkles className="w-10 h-10 mb-3" />
                <p className="text-sm">{t('chat.no_messages')}</p>
              </div>
            ) : (
              <div className="space-y-0.5 relative z-10">
                {messages.map((msg) => {
                  const displayName = getDisplayName(msg.user)
                  const isMe = msg.user.id === session?.user?.id
                  const isOwner = isRoomOwner(msg.user.id)
                  const isSpeakingUser = speakingUsers.has(msg.user.id)
                  
                  // Check if this is a system message
                  const isSystemJoin = msg.content.startsWith('[SYSTEM_JOIN]')
                  const isVipJoin = msg.content.startsWith('[SYSTEM_VIP_JOIN:')
                  const isSystemLeave = msg.content.startsWith('[SYSTEM_LEAVE]')
                  const isSystemMessage = isSystemJoin || isVipJoin || isSystemLeave
                  
                  // Parse VIP join type
                  let vipType: string | null = null
                  let joinName = ''
                  let leaveName = ''
                  if (isVipJoin) {
                    const match = msg.content.match(/\[SYSTEM_VIP_JOIN:(\w+)\](.+)/)
                    if (match) {
                      vipType = match[1]
                      joinName = match[2]
                    }
                  } else if (isSystemJoin) {
                    joinName = msg.content.replace('[SYSTEM_JOIN]', '')
                  } else if (isSystemLeave) {
                    leaveName = msg.content.replace('[SYSTEM_LEAVE]', '')
                  }
                  
                  // Render system messages differently
                  if (isSystemMessage) {
                    const vipLabels: Record<string, { label: string; labelEn: string; icon: string; color: string; bgColor: string }> = {
                      'ADMIN': { label: '👑 Site Yöneticisi', labelEn: '👑 Site Admin', icon: '👑', color: 'text-red-400', bgColor: 'bg-gradient-to-r from-red-900/50 to-orange-900/50 border-red-500/50' },
                      'OWNER': { label: '🏠 Oda Sahibi', labelEn: '🏠 Room Owner', icon: '🏠', color: 'text-yellow-400', bgColor: 'bg-gradient-to-r from-yellow-900/50 to-amber-900/50 border-yellow-500/50' },
                      'FOUNDER': { label: '⭐ Kurucu', labelEn: '⭐ Founder', icon: '⭐', color: 'text-red-400', bgColor: 'bg-gradient-to-r from-red-900/40 to-pink-900/40 border-red-500/40' },
                      'MODERATOR': { label: '🛡️ Moderatör', labelEn: '🛡️ Moderator', icon: '🛡️', color: 'text-orange-400', bgColor: 'bg-gradient-to-r from-orange-900/40 to-red-900/40 border-orange-500/40' },
                      'OP': { label: '✨ Operatör', labelEn: '✨ Operator', icon: '✨', color: 'text-green-400', bgColor: 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-500/40' }
                    }
                    
                    // Leave message
                    if (isSystemLeave) {
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="px-2 py-1 text-center"
                        >
                          <span className="text-gray-500/70 text-xs">
                            ← <span className="text-gray-400">{leaveName}</span>{' '}
                            {'odadan ayrıldı'}
                          </span>
                        </motion.div>
                      )
                    }
                    
                    // VIP entry with auto-hide after 3 seconds
                    if (isVipJoin && vipType && vipLabels[vipType]) {
                      const vipInfo = vipLabels[vipType]
                      const isHidden = hiddenVipEntries.has(msg.id)
                      
                      // Schedule auto-hide after 3 seconds
                      if (!isHidden && !hiddenVipEntries.has(msg.id)) {
                        setTimeout(() => {
                          setHiddenVipEntries(prev => new Set([...prev, msg.id]))
                        }, 3000)
                      }
                      
                      // Show simple text after animation ends
                      if (isHidden) {
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="px-2 py-1 text-center"
                          >
                            <span className={`text-xs ${vipInfo.color}`}>
                              {vipInfo.icon} <span className="font-medium">{joinName}</span>{' '}
                              <span className="text-white/60">
                                {'odaya giriş yaptı'}
                              </span>
                            </span>
                          </motion.div>
                        )
                      }
                      
                      // Show grand VIP entry animation
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, scale: 0.8, y: -20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.5, type: 'spring' }}
                          className={`mx-2 my-2 p-3 rounded-xl border ${vipInfo.bgColor} relative overflow-hidden`}
                        >
                          {/* Animated background effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 1.5, repeat: 2, ease: 'linear' }}
                          />
                          <div className="relative z-10 flex items-center justify-center gap-2">
                            <motion.span
                              className="text-2xl"
                              animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                              transition={{ duration: 0.8, repeat: 2 }}
                            >
                              {vipInfo.icon}
                            </motion.span>
                            <div className="text-center">
                              <span className={`font-bold ${vipInfo.color}`}>{joinName}</span>
                              <span className="text-white/80 mx-2">
                                {'odaya giriş yaptı!'}
                              </span>
                            </div>
                            <motion.span
                              className="text-2xl"
                              animate={{ scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] }}
                              transition={{ duration: 0.8, repeat: 2 }}
                            >
                              {vipInfo.icon}
                            </motion.span>
                          </div>
                          <div className="text-center text-xs mt-1 text-white/60">
                            {vipInfo.label}
                          </div>
                        </motion.div>
                      )
                    }
                    
                    // Regular join message
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-2 py-1 text-center"
                      >
                        <span className="text-purple-400/70 text-xs">
                          ➜ <span className="text-purple-300">{joinName}</span>{' '}
                          {'odaya katıldı'}
                        </span>
                      </motion.div>
                    )
                  }
                  
                  const isMentioned = nickname && msg.content.toLowerCase().includes(`@${nickname.toLowerCase()}`)
                  
                  return (
                    <div
                      key={msg.id}
                      className={`px-2 py-0.5 ${isMentioned ? 'bg-gold-500/20' : ''} ${isOwner ? 'bg-red-900/30' : ''}`}
                    >
                      {/* Speaking Indicator */}
                      {isSpeakingUser && (
                        <span className="text-green-400 mr-1 animate-pulse">●</span>
                      )}
                      {msg.user.chatRole && (
                        <span className={`${ROLE_COLORS[msg.user.chatRole]} mr-1`}>
                          {msg.user.roleSymbol}
                        </span>
                      )}
                      {isOwner && (
                        <span className="text-yellow-400 mr-1">👑</span>
                      )}
                      <button
                        onClick={() => msg.user.id !== session?.user?.id && addMention(displayName)}
                        className={`font-medium hover:underline ${getNameEffectClass(msg.user)} ${
                          isOwner
                            ? 'text-yellow-300'
                            : msg.user.chatRole 
                              ? ROLE_COLORS[msg.user.chatRole] 
                              : isMe 
                                ? 'text-gold-400' 
                                : 'text-purple-300'
                        }`}
                        {...(getNameEffectClass(msg.user) === 'effect-glitch' ? { 'data-text': `<${displayName}>` } : {})}
                      >
                        &lt;{displayName}&gt;
                      </button>
                      <span className="text-white ml-2 break-all">
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
                className="px-3 py-1 bg-[#1a0b2e] text-purple-300/70 text-xs flex items-center gap-2"
              >
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>
                  {typingUsers.slice(0, 3).join(', ')}
                  {typingUsers.length > 3 && ` +${typingUsers.length - 3}`}
                  {' yazıyor...'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && !error.includes('banned') && (
            <div className="px-3 py-1 bg-red-900/50 text-red-300 text-xs">{error}</div>
          )}

          {/* Gift Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="flex-shrink-0 bg-[#1a0b2e]/80 border-t border-yellow-500/20">
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="w-full flex items-center justify-between px-3 py-1 text-xs"
              >
                <span className="text-yellow-400 flex items-center gap-1"><Trophy className="w-3 h-3" /> Hediye Sıralaması</span>
                <span className="text-purple-400">{showLeaderboard ? '▲' : '▼'}</span>
              </button>
              {showLeaderboard && (
                <div className="flex gap-2 px-3 pb-1.5 overflow-x-auto scrollbar-hide">
                  {leaderboard.slice(0, 10).map((entry, i) => (
                    <div key={entry.userId} className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${i === 0 ? 'bg-yellow-500/20 border border-yellow-500/40' : i === 1 ? 'bg-gray-400/20 border border-gray-400/40' : i === 2 ? 'bg-orange-500/20 border border-orange-500/40' : 'bg-purple-900/30 border border-purple-500/20'}`}>
                      <span className={`font-bold ${i === 0 ? 'text-yellow-300' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-300' : 'text-purple-300'}`}>
                        {i + 1}.
                      </span>
                      <span className="text-white truncate max-w-[60px]">{entry.name}</span>
                      {entry.jetonTotal > 0 && <span className="text-yellow-400">💎{entry.jetonTotal}</span>}
                      {entry.cfcTotal > 0 && <span className="text-blue-400">💰{entry.cfcTotal}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Message Input */}
          {session?.user ? (
            <div className="flex-shrink-0 bg-[#1a0b2e] border-t border-purple-500/30 p-2">
              {/* Gift User Selection Panel */}
              {showGiftUserSelect && (
                <div className="mb-2 bg-[#0d0520] border border-yellow-500/30 rounded-lg p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-yellow-400 text-xs font-bold flex items-center gap-1">
                      <Gift className="w-3 h-3" /> Kime hediye göndermek istiyorsunuz?
                    </span>
                    <button onClick={() => setShowGiftUserSelect(false)} className="text-purple-400 hover:text-white text-xs">✕</button>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {room?.owner && room.owner.id !== session?.user?.id && (
                      <button
                        onClick={() => openGiftModal({ id: room.owner!.id, name: room.owner!.username || room.owner!.name || 'Oda Sahibi' })}
                        className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-xs text-yellow-200 hover:bg-yellow-500/30 transition-colors"
                      >
                        <Crown className="w-3 h-3 text-yellow-300" />
                        {room.owner.username || room.owner.name}
                      </button>
                    )}
                    {activeUsers.filter(u => u.id !== session?.user?.id).map(user => (
                      <button
                        key={user.id}
                        onClick={() => openGiftModal(user)}
                        className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 border border-purple-500/40 rounded-full text-xs text-purple-200 hover:bg-purple-500/30 transition-colors"
                      >
                        {getDisplayName(user)}
                      </button>
                    ))}
                    {activeUsers.filter(u => u.id !== session?.user?.id).length === 0 && !room?.owner && (
                      <span className="text-purple-400/50 text-xs">{'Hediye gönderilecek kullanıcı yok'}</span>
                    )}
                  </div>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowGiftUserSelect(!showGiftUserSelect)}
                  className={`px-3 py-2 rounded text-sm font-medium flex items-center gap-1 transition-all ${showGiftUserSelect ? 'bg-yellow-500 text-black' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/40'}`}
                  title="Hediye Gönder"
                >
                  <Gift className="w-4 h-4" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping()
                  }}
                  onFocus={handleInputFocus}
                  placeholder={t('chat.placeholder')}
                  maxLength={500}
                  className="flex-1 bg-[#0d0520] border border-purple-500/30 rounded px-3 py-2 text-sm text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 bg-purple-600 text-white font-medium text-sm rounded hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-shrink-0 bg-[#1a0b2e] border-t border-purple-500/30 p-2 text-center">
              <Link
                href={`/giris`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium text-sm rounded hover:bg-purple-500"
              >
                <LogIn className="w-4 h-4" />
                {t('chat.login_required')}
              </Link>
            </div>
          )}
        </div>

        {/* Users Panel - Hidden on mobile, overlay when toggled */}
        {showMobileUsers && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setShowMobileUsers(false)} />
        )}
        <div className={`${showMobileUsers ? 'fixed right-0 top-0 bottom-0 z-40 w-64' : 'hidden'} md:relative md:block md:w-64 flex flex-col min-h-0 bg-[#1a0b2e]`} style={showMobileUsers ? { height: 'calc(var(--vh, 1vh) * 100)' } : undefined}>
          <div className="flex-shrink-0 h-12 bg-[#1a0b2e] border-b border-purple-500/30 flex items-center justify-between px-2">
            <span className="text-purple-300 text-sm font-medium flex items-center gap-1">
              <Users className="w-4 h-4" />
              {'Kullanıcılar'}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-purple-400 text-xs bg-purple-600/30 px-2 py-0.5 rounded">({activeUsers.length})</span>
              <button onClick={() => setShowMobileUsers(false)} className="md:hidden text-purple-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Room Owner at Top */}
          {room.owner && (
            <div className="flex-shrink-0 bg-red-600/60 px-2 py-2 border-b border-red-500/30">
              <p className="text-[10px] text-red-200 uppercase tracking-wider mb-1">
                {'Oda Sahibi'}
              </p>
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-300" />
                <span className="text-yellow-200 text-sm font-bold truncate flex-1">
                  {room.owner.username || room.owner.name}
                </span>
                {room.owner.id !== session?.user?.id && (
                  <button
                    onClick={() => openGiftModal({ id: room.owner!.id, name: room.owner!.username || room.owner!.name || 'Oda Sahibi' })}
                    className="text-yellow-400 hover:text-yellow-200 transition-colors bg-yellow-500/20 rounded p-1"
                    title="Hediye Gönder"
                  >
                    <Gift className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#0d0520]">
            {activeUsers.length === 0 ? (
              <p className="text-purple-400/50 text-xs p-2 text-center">
                {'Kimse yok'}
              </p>
            ) : (
              <div className="py-1">
                {activeUsers.map((user) => {
                  const isOwner = isRoomOwner(user.id)
                  const userIsSpeaking = speakingUsers.has(user.id) || (user.id === session?.user?.id && isSpeaking)
                  const badge = user.chatRole ? ROLE_BADGE_STYLES[user.chatRole] : null
                  
                  return (
                    <div
                      key={user.id}
                      data-user-id={user.id}
                      onClick={() => {
                        if (user.id !== session?.user?.id) {
                          if (hasManagePermission) {
                            setSelectedUser(user)
                            setManageTab('users')
                            setShowManagePopup(true)
                          } else {
                            openGiftModal(user)
                          }
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-purple-800/30 ${isOwner ? 'bg-red-900/30' : ''}`}
                    >
                      {/* Speaking Indicator or Role Icon */}
                      {userIsSpeaking ? (
                        <span className="text-green-400 w-4 text-center animate-pulse">●</span>
                      ) : user.chatRole ? (
                        <span className={`${ROLE_COLORS[user.chatRole]} text-xs font-bold w-4 text-center`}>
                          {user.roleSymbol}
                        </span>
                      ) : isOwner ? (
                        <span className="text-yellow-400 w-4 text-center">👑</span>
                      ) : (
                        <span className="w-4" />
                      )}
                      
                      <div className="flex-1 min-w-0 flex items-center gap-1">
                        <span className={`text-xs truncate ${getNameEffectClass(user)} ${
                          isOwner
                            ? 'text-yellow-300 font-bold'
                            : user.chatRole 
                              ? ROLE_COLORS[user.chatRole] 
                              : user.isAdmin 
                                ? 'text-red-400'
                                : 'text-purple-200'
                        }`} title={getDisplayName(user)}
                        {...(getNameEffectClass(user) === 'effect-glitch' ? { 'data-text': getDisplayName(user) } : {})}
                        >
                          {getDisplayName(user)}
                        </span>
                        {/* Role Badge */}
                        {badge && (
                          <span className={`text-[8px] px-1 py-0.5 rounded ${badge.bg} ${badge.text} border ${badge.border} font-medium whitespace-nowrap`}>
                            {badge.label}
                          </span>
                        )}
                        {isOwner && !badge && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-yellow-300 border border-red-500/40 font-medium whitespace-nowrap">
                            👑Sahip
                          </span>
                        )}
                      </div>
                      {user.id !== session?.user?.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openGiftModal(user) }}
                          className="ml-auto text-yellow-400 hover:text-yellow-200 hover:bg-yellow-500/20 rounded p-0.5 transition-all flex-shrink-0"
                          title="Hediye Gönder"
                        >
                          <Gift className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gift Animation Overlay - Profile appears center, gift hits, star burst, exit */}
      <AnimatePresence>
        {giftAnimations.map((anim) => (
          <motion.div
            key={anim.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          >
            {/* Dark overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: anim.phase === 'exit' ? 0 : 0.5 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-black"
            />

            {/* Recipient profile card - slides in from right, exits right */}
            <motion.div
              initial={{ x: 300, opacity: 0, scale: 0.7 }}
              animate={
                anim.phase === 'exit'
                  ? { x: 300, opacity: 0, scale: 0.7 }
                  : { x: 0, opacity: 1, scale: 1 }
              }
              transition={{ 
                duration: anim.phase === 'exit' ? 0.6 : 0.5, 
                ease: anim.phase === 'exit' ? 'easeIn' : [0.34, 1.56, 0.64, 1]
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="flex flex-col items-center">
                {/* Glow ring behind avatar */}
                <motion.div
                  animate={
                    anim.phase === 'burst' || anim.phase === 'hit'
                      ? { scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }
                      : { scale: 1, opacity: 0.3 }
                  }
                  transition={{ duration: 1, repeat: anim.phase === 'burst' ? 2 : 0 }}
                  className="absolute w-36 h-36 rounded-full bg-gradient-to-r from-yellow-400/40 via-purple-500/40 to-pink-500/40 blur-xl"
                />
                {/* Avatar circle */}
                <motion.div
                  animate={
                    anim.phase === 'hit'
                      ? { scale: [1, 1.15, 0.95, 1.05, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.5 }}
                  className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center border-4 border-yellow-400 shadow-[0_0_30px_rgba(168,85,247,0.6)]"
                >
                  <span className="text-3xl font-bold text-white">
                    {anim.recipientName.charAt(0).toUpperCase()}
                  </span>
                </motion.div>
                {/* Recipient name */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-3 text-white font-bold text-lg drop-shadow-lg"
                >
                  {anim.recipientName}
                </motion.p>
                {/* Sender info */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-yellow-300 text-sm mt-1"
                >
                  {anim.senderName} → 🎁
                </motion.p>
                {/* CanlıFal branding */}
                <motion.p
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
                  className="text-[10px] text-purple-400/60 mt-2 font-medium tracking-wider"
                >
                  CanlıFal
                </motion.p>
              </div>
            </motion.div>

            {/* Flying gift - appears after profile card, flies to center */}
            {(anim.phase === 'hit' || anim.phase === 'burst') && (
              <motion.div
                initial={{ y: 200, x: '-50%', scale: 1.5, opacity: 0 }}
                animate={{ y: -20, x: '-50%', scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                className="absolute left-1/2 top-1/2"
                style={{ marginTop: '-70px' }}
              >
                {anim.giftImage ? (
                  <img loading="lazy" src={anim.giftImage} alt="gift" className="w-20 h-20 object-contain drop-shadow-[0_0_25px_rgba(255,215,0,0.9)]" />
                ) : (
                  <span className="text-6xl">{anim.giftIcon}</span>
                )}
              </motion.div>
            )}

            {/* Star burst particles on hit */}
            {(anim.phase === 'burst') && (
              <>
                {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((i) => {
                  const angle = (i / 16) * Math.PI * 2
                  const dist = 80 + (i * 11) % 60
                  const sz = 12 + (i * 5) % 14
                  const colors = ['text-yellow-300', 'text-yellow-400', 'text-amber-300', 'text-orange-400', 'text-pink-400', 'text-purple-300']
                  return (
                    <motion.div
                      key={i}
                      initial={{ 
                        left: '50%', 
                        top: '50%', 
                        x: -sz/2, 
                        y: -sz/2, 
                        scale: 0, 
                        opacity: 0 
                      }}
                      animate={{ 
                        x: Math.cos(angle) * dist - sz/2, 
                        y: Math.sin(angle) * dist - sz/2 - 20, 
                        scale: [0, 2, 0], 
                        opacity: [0, 1, 0],
                        rotate: [0, 180 + i * 30]
                      }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className={`absolute ${colors[i % colors.length]}`}
                      style={{ fontSize: `${sz}px` }}
                    >
                      {i % 3 === 0 ? '✦' : i % 3 === 1 ? '⭐' : '✨'}
                    </motion.div>
                  )
                })}
                {/* Shockwave ring */}
                <motion.div
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-yellow-400"
                  style={{ marginTop: '-10px' }}
                />
              </>
            )}

            {/* Gift amount badge + CanlıFal branding */}
            {(anim.phase === 'hit' || anim.phase === 'burst') && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 flex flex-col items-center"
                style={{ marginTop: '50px' }}
              >
                <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold px-4 py-1.5 rounded-full text-sm shadow-lg shadow-yellow-500/50">
                  x{anim.amount}
                </div>
                <motion.span
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-2 text-xs font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-widest"
                >
                  CanlıFal
                </motion.span>
              </motion.div>
            )}
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

              {/* Payment Type Toggle */}
              <div className="p-3 border-b border-purple-500/20">
                <div className="flex gap-2">
                  <button
                    onClick={() => setGiftPaymentType('jeton')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${giftPaymentType === 'jeton' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' : 'bg-purple-900/30 text-purple-400 border border-purple-500/20'}`}
                  >
                    <Coins className="w-4 h-4 inline mr-1" /> Jeton
                  </button>
                  <button
                    onClick={() => setGiftPaymentType('cfc')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${giftPaymentType === 'cfc' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50' : 'bg-purple-900/30 text-purple-400 border border-purple-500/20'}`}
                  >
                    💰 CFC
                  </button>
                </div>
                <p className="text-xs text-purple-400/70 mt-1 text-center">
                  {giftPaymentType === 'jeton' ? '💎 Jeton ile gönderilen hediyeler bakiyenizden düşer' : '💰 CFC ile gönderilen hediyeler CFC bakiyenizden düşer'}
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
                    {GIFT_IMAGES[gt.id] ? (
                      <img loading="lazy" src={GIFT_IMAGES[gt.id]} alt={gt.name} className="w-10 h-10 object-contain" />
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
                  {sendingGift ? 'Gönderiliyor...' : `Hediye Gönder (${giftTypes.find(g => g.id === selectedGiftType)?.price || 0} ${giftPaymentType === 'jeton' ? 'Jeton' : 'CFC'})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  )
}