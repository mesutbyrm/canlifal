'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { Send, Users, Sparkles, LogIn, VolumeX, Volume2, UserMinus, Ban, Shield, Crown, Star, Mic, MicOff, AtSign, Bell, X, Settings, ChevronDown, ChevronUp, Trash2, Home, DoorOpen, Phone, PhoneOff } from 'lucide-react'
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
  }
}

interface ActiveUser {
  id: string
  name: string
  nickname?: string
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
  
  // Nickname system
  const [nickname, setNickname] = useState('')
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  
  // Mention notifications
  const [mentionNotification, setMentionNotification] = useState<{from: string, content: string} | null>(null)
  
  // Combined Management Popup
  const [showManagePopup, setShowManagePopup] = useState(false)
  const [manageTab, setManageTab] = useState<'chat' | 'users'>('chat')
  
  // Rooms Popup
  const [showRoomsPopup, setShowRoomsPopup] = useState(false)
  
  // Voice Chat with WebRTC
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false) // For listen-only mode
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set())
  const [voiceUsers, setVoiceUsers] = useState<Array<{id: string, name: string}>>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const voiceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const remoteAudioRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const voicePollRef = useRef<NodeJS.Timeout | null>(null)
  const lastSignalTimeRef = useRef<number>(0)
  const voiceUsersPollRef = useRef<NodeJS.Timeout | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousMessagesCount = useRef(0)

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

  // Update presence
  const updatePresence = useCallback(async () => {
    if (!room || !session?.user) return
    try {
      await fetch(`/api/chat/rooms/${room.id}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname || session.user.name })
      })
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }, [room, session?.user, nickname])

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
      setLoading(false)

      const messageInterval = setInterval(fetchMessages, 2000)
      const userInterval = setInterval(fetchActiveUsers, 5000)
      const presenceInterval = setInterval(updatePresence, 10000)
      const roomsInterval = setInterval(fetchAllRooms, 30000)
      const voiceUsersInterval = setInterval(fetchVoiceUsers, 3000)

      updatePresence()

      return () => {
        clearInterval(messageInterval)
        clearInterval(userInterval)
        clearInterval(presenceInterval)
        clearInterval(roomsInterval)
        clearInterval(voiceUsersInterval)
      }
    }
  }, [room, fetchMessages, fetchActiveUsers, checkBan, updatePresence, fetchAllRooms, fetchVoiceUsers])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // WebRTC Configuration
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  // Create peer connection for a user
  const createPeerConnection = useCallback((userId: string, isInitiator: boolean) => {
    if (!room || !mediaStreamRef.current) return null
    
    const pc = new RTCPeerConnection(rtcConfig)
    peerConnectionsRef.current.set(userId, pc)
    
    // Add local audio tracks
    mediaStreamRef.current.getAudioTracks().forEach(track => {
      pc.addTrack(track, mediaStreamRef.current!)
    })
    
    // Handle incoming audio
    pc.ontrack = (event) => {
      const remoteAudio = new Audio()
      remoteAudio.srcObject = event.streams[0]
      remoteAudio.autoplay = true
      remoteAudio.play().catch(console.error)
      remoteAudioRef.current.set(userId, remoteAudio)
      
      // Update speaking users based on audio activity
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(event.streams[0])
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const checkSpeaking = setInterval(() => {
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
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          clearInterval(checkSpeaking)
        }
      }
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && room) {
        fetch(`/api/chat/rooms/${room.id}/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ice-candidate',
            toUserId: userId,
            data: JSON.stringify(event.candidate)
          })
        }).catch(console.error)
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
        const { fromUserId, fromUserName, type, data } = signal
        
        if (type === 'join') {
          // New user joined, create offer
          if (!peerConnectionsRef.current.has(fromUserId) && mediaStreamRef.current) {
            const pc = createPeerConnection(fromUserId, true)
            if (pc) {
              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)
              sendVoiceSignal('offer', JSON.stringify(offer), fromUserId)
            }
          }
        } else if (type === 'leave') {
          // User left, cleanup
          const pc = peerConnectionsRef.current.get(fromUserId)
          if (pc) {
            pc.close()
            peerConnectionsRef.current.delete(fromUserId)
          }
          const audio = remoteAudioRef.current.get(fromUserId)
          if (audio) {
            audio.pause()
            remoteAudioRef.current.delete(fromUserId)
          }
          setSpeakingUsers(prev => {
            const next = new Set(prev)
            next.delete(fromUserId)
            return next
          })
        } else if (type === 'offer') {
          // Received offer, create answer
          let pc: RTCPeerConnection | null | undefined = peerConnectionsRef.current.get(fromUserId)
          if (!pc) {
            pc = createPeerConnection(fromUserId, false)
          }
          if (pc) {
            await pc.setRemoteDescription(JSON.parse(data))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            sendVoiceSignal('answer', JSON.stringify(answer), fromUserId)
          }
        } else if (type === 'answer') {
          // Received answer
          const pc = peerConnectionsRef.current.get(fromUserId)
          if (pc) {
            await pc.setRemoteDescription(JSON.parse(data))
          }
        } else if (type === 'ice-candidate') {
          // Received ICE candidate
          const pc = peerConnectionsRef.current.get(fromUserId)
          if (pc) {
            await pc.addIceCandidate(JSON.parse(data))
          }
        }
      }
    } catch (error) {
      console.error('Error polling voice signals:', error)
    }
  }, [room, voiceEnabled, createPeerConnection, sendVoiceSignal])

  // Voice chat functions
  const startVoiceChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      
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
      
      // Send join signal
      if (room) {
        await sendVoiceSignal('join')
        
        // Start polling for signals
        lastSignalTimeRef.current = Date.now()
        voicePollRef.current = setInterval(pollVoiceSignals, 500)
      }
    } catch (error) {
      console.error('Error starting voice chat:', error)
      alert(language === 'tr' ? 'Mikrofon erişimi reddedildi' : 'Microphone access denied')
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
      voicePollRef.current = setInterval(pollVoiceSignals, 500)
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
      } else {
        const data = await res.json()
        if (data.error === 'muted') {
          setError(language === 'tr' ? 'Bu odada susturuldunuz' : 'You are muted in this room')
        } else if (data.error === 'banned') {
          setError('banned')
        } else if (data.error === 'room_muted') {
          setError(language === 'tr' ? 'Oda şu anda sessiz modda' : 'Room is currently muted')
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

  // Check for mentions
  useEffect(() => {
    if (!nickname || messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.user.id !== session?.user?.id && lastMsg.content.toLowerCase().includes(`@${nickname.toLowerCase()}`)) {
      setMentionNotification({ from: lastMsg.user.nickname || lastMsg.user.name, content: lastMsg.content })
      audioRef.current?.play()
      setTimeout(() => setMentionNotification(null), 5000)
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

  const clearAllMessages = async () => {
    if (!room) return
    if (!confirm(language === 'tr' ? 'Tüm mesajları silmek istediğinize emin misiniz?' : 'Are you sure you want to clear all messages?')) return
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
    return date.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDisplayName = (user: {name: string, nickname?: string}) => {
    return user.nickname || user.name
  }

  // Check if user is room owner
  const isRoomOwner = (userId: string) => {
    return room?.ownerId === userId
  }

  // Check if current user can use voice (has voice permission, higher role, or is room owner)
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
          <h1 className="text-2xl text-red-400 mb-2">{language === 'tr' ? 'Bu odadan engellendiniz' : 'You are banned from this room'}</h1>
          <Link href={`/${language}/chat`} className="text-gold-400 hover:text-gold-300">
            {language === 'tr' ? 'Sohbet odalarına dön' : 'Back to chat rooms'}
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

  const hasManagePermission = myPermissions && (
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
    <div className="h-full w-full flex flex-col relative" style={{ height: '100dvh' }}>
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
                {language === 'tr' ? 'Takma Adınızı Seçin' : 'Choose Your Nickname'}
              </h3>
              <p className="text-purple-200/70 text-sm mb-4">
                {language === 'tr' ? 'Bu isim sohbette görünecek' : 'This name will be shown in chat'}
              </p>
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder={session.user.name || (language === 'tr' ? 'Takma ad...' : 'Nickname...')}
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
                  {language === 'tr' ? 'Varsayılan Kullan' : 'Use Default'}
                </button>
                <button
                  onClick={saveNickname}
                  disabled={!nicknameInput.trim()}
                  className="flex-1 px-4 py-2 bg-gold-500 text-black font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {language === 'tr' ? 'Kaydet' : 'Save'}
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
                  {language === 'tr' ? 'Yönetim Paneli' : 'Management Panel'}
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
                  {language === 'tr' ? 'Sohbet Yönetimi' : 'Chat Management'}
                </button>
                <button
                  onClick={() => setManageTab('users')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${manageTab === 'users' ? 'bg-purple-600/30 text-white' : 'text-purple-400 hover:bg-purple-600/10'}`}
                >
                  {language === 'tr' ? 'Kullanıcı Yönetimi' : 'User Management'}
                </button>
              </div>
              
              {/* Tab Content */}
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                {manageTab === 'chat' ? (
                  <div className="space-y-3">
                    {myPermissions?.canMuteRoom && (
                      <button
                        onClick={() => { toggleRoomMute(); setShowManagePopup(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${roomMuted ? 'bg-green-600/30 text-green-300 hover:bg-green-600/50' : 'bg-red-600/30 text-red-300 hover:bg-red-600/50'}`}
                      >
                        {roomMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        {roomMuted ? (language === 'tr' ? 'Odayı Aç' : 'Unmute Room') : (language === 'tr' ? 'Odayı Sustur' : 'Mute Room')}
                      </button>
                    )}
                    <button
                      onClick={() => { setSoundEnabled(!soundEnabled); setShowManagePopup(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${soundEnabled ? 'bg-blue-600/30 text-blue-300 hover:bg-blue-600/50' : 'bg-gray-600/30 text-gray-300 hover:bg-gray-600/50'}`}
                    >
                      {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                      {soundEnabled ? (language === 'tr' ? 'Bildirim Sesi Açık' : 'Notification Sound On') : (language === 'tr' ? 'Bildirim Sesi Kapalı' : 'Notification Sound Off')}
                    </button>
                    {(myPermissions?.role === 'founder' || myPermissions?.role === 'op' || myPermissions?.isGlobalAdmin) && (
                      <button
                        onClick={() => { clearAllMessages(); setShowManagePopup(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-red-600/30 text-red-300 hover:bg-red-600/50"
                      >
                        <Trash2 className="w-5 h-5" />
                        {language === 'tr' ? 'Tüm Mesajları Temizle' : 'Clear All Messages'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowNicknameModal(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-purple-600/30 text-purple-300 hover:bg-purple-600/50"
                    >
                      <AtSign className="w-5 h-5" />
                      {language === 'tr' ? 'Takma Adı Değiştir' : 'Change Nickname'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeUsers.length === 0 ? (
                      <p className="text-purple-400/50 text-sm text-center py-4">
                        {language === 'tr' ? 'Aktif kullanıcı yok' : 'No active users'}
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
                            {myPermissions?.canMuteUsers && (
                              <button
                                onClick={() => performModAction('mute_user', user.id, { duration: 30 })}
                                className="px-2 py-1 bg-orange-600/30 text-orange-300 rounded text-xs hover:bg-orange-600/50"
                              >
                                <MicOff className="w-3 h-3 inline mr-1" />{language === 'tr' ? 'Sustur' : 'Mute'}
                              </button>
                            )}
                            {myPermissions?.canKickUsers && (
                              <button
                                onClick={() => performModAction('kick_user', user.id)}
                                className="px-2 py-1 bg-yellow-600/30 text-yellow-300 rounded text-xs hover:bg-yellow-600/50"
                              >
                                <UserMinus className="w-3 h-3 inline mr-1" />{language === 'tr' ? 'At' : 'Kick'}
                              </button>
                            )}
                            {myPermissions?.canBanUsers && (
                              <button
                                onClick={() => performModAction('ban_user', user.id)}
                                className="px-2 py-1 bg-red-600/30 text-red-300 rounded text-xs hover:bg-red-600/50"
                              >
                                <Ban className="w-3 h-3 inline mr-1" />{language === 'tr' ? 'Engelle' : 'Ban'}
                              </button>
                            )}
                            {myPermissions?.canGiveVoice && !user.chatRole && (
                              <button
                                onClick={() => performModAction('set_role', user.id, { role: 'voice' })}
                                className="px-2 py-1 bg-blue-600/30 text-blue-300 rounded text-xs hover:bg-blue-600/50"
                                title={language === 'tr' ? 'Ses yetkisi ver' : 'Give voice permission'}
                              >
                                <Mic className="w-3 h-3 inline mr-1" />{language === 'tr' ? 'Ses Ver' : '+Voice'}
                              </button>
                            )}
                            {myPermissions?.canGiveOp && (
                              <button
                                onClick={() => performModAction('set_role', user.id, { role: 'op' })}
                                className="px-2 py-1 bg-green-600/30 text-green-300 rounded text-xs hover:bg-green-600/50"
                              >
                                @o
                              </button>
                            )}
                            {myPermissions?.canGiveAdmin && (
                              <button
                                onClick={() => performModAction('set_role', user.id, { role: 'admin' })}
                                className="px-2 py-1 bg-orange-600/30 text-orange-300 rounded text-xs hover:bg-orange-600/50"
                              >
                                &a
                              </button>
                            )}
                            {user.chatRole && (
                              <button
                                onClick={() => performModAction('remove_role', user.id)}
                                className="px-2 py-1 bg-gray-600/30 text-gray-300 rounded text-xs hover:bg-gray-600/50"
                              >
                                {language === 'tr' ? 'Yetkiyi Kaldır' : 'Remove Role'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
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
                  {language === 'tr' ? 'Sohbet Odaları' : 'Chat Rooms'}
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
                      router.push(`/${language}/chat/${r.slug}`)
                      setShowRoomsPopup(false)
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${r.slug === roomSlug ? 'bg-purple-600/40 border border-purple-500' : 'bg-[#0d0520] hover:bg-purple-600/20'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{r.icon}</span>
                      <div className="text-left">
                        <p className="text-white font-medium">{language === 'tr' ? r.nameTr : r.nameEn}</p>
                        {r.owner && (
                          <p className="text-xs text-purple-400">
                            {language === 'tr' ? 'Sahibi' : 'Owner'}: {r.owner.name}
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
                          {language === 'tr' ? 'Aktif' : 'Active'}
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
                  {language === 'tr' ? ' senden bahsetti!' : ' mentioned you!'}
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
          <div className="flex-shrink-0 h-12 bg-[#1a0b2e] border-b border-purple-500/30 flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
              {/* Yönet Button */}
              <button
                onClick={() => hasManagePermission && setShowManagePopup(true)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${hasManagePermission ? 'bg-purple-600/30 text-purple-200 hover:bg-purple-600/50' : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'}`}
              >
                <Settings className="w-4 h-4" />
                {language === 'tr' ? 'Yönet' : 'Manage'}
              </button>
              
              {/* Odalar Button */}
              <button
                onClick={() => setShowRoomsPopup(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium bg-gold-600/30 text-gold-200 hover:bg-gold-600/50"
              >
                <DoorOpen className="w-4 h-4" />
                {language === 'tr' ? 'Odalar' : 'Rooms'}
              </button>
              
              {/* Voice Chat Button */}
              {canUseVoice() ? (
                // User has voice permission - can speak
                <button
                  onClick={() => voiceEnabled ? stopVoiceChat() : startVoiceChat()}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${voiceEnabled ? 'bg-green-600/50 text-green-200 hover:bg-green-600/70' : 'bg-blue-600/30 text-blue-200 hover:bg-blue-600/50'}`}
                >
                  {voiceEnabled ? (
                    <>
                      <PhoneOff className="w-4 h-4" />
                      {language === 'tr' ? 'Sesli Kapat' : 'End Voice'}
                      {voiceUsers.length > 0 && (
                        <span className="ml-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {voiceUsers.length}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      {language === 'tr' ? 'Sesli' : 'Voice'}
                      {voiceUsers.length > 0 && (
                        <span className="ml-1 bg-green-500/50 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {voiceUsers.length}
                        </span>
                      )}
                    </>
                  )}
                </button>
              ) : (
                // User doesn't have voice permission - can only listen
                <button
                  onClick={() => isListening ? stopListening() : startListening()}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${isListening ? 'bg-purple-600/50 text-purple-200 hover:bg-purple-600/70' : 'bg-purple-600/30 text-purple-200 hover:bg-purple-600/50'}`}
                  title={language === 'tr' ? 'Sadece dinleyebilirsiniz' : 'Listen only mode'}
                >
                  {isListening ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      {language === 'tr' ? 'Dinlemeyi Kapat' : 'Stop Listening'}
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      {language === 'tr' ? 'Dinle' : 'Listen'}
                      {voiceUsers.length > 0 && (
                        <span className="ml-1 bg-green-500/50 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {voiceUsers.length}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Room Name */}
              <span className="text-gold-400 font-medium text-sm">
                {room.icon} {language === 'tr' ? room.nameTr : room.nameEn}
              </span>
              {roomMuted && (
                <span className="flex items-center gap-1 text-red-400 text-xs">
                  <VolumeX className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>

          {/* Room Owner Banner */}
          {room.owner && (
            <div className="flex-shrink-0 bg-red-600/80 px-3 py-2 flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-300" />
              <span className="text-white text-sm font-medium">
                {language === 'tr' ? 'Oda Sahibi' : 'Room Owner'}
              </span>
              <span className="text-yellow-200 text-sm font-bold">
                {room.owner.username || room.owner.name}
              </span>
            </div>
          )}

          {/* Voice Users Bar */}
          {voiceUsers.length > 0 && (
            <div className="flex-shrink-0 bg-green-600/30 px-3 py-2 flex items-center gap-2 border-b border-green-500/30">
              <Phone className="w-4 h-4 text-green-400" />
              <span className="text-green-200 text-sm">
                {language === 'tr' ? 'Sesli Sohbette:' : 'In Voice:'}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {voiceUsers.map(user => (
                  <span 
                    key={user.id} 
                    className={`text-sm px-2 py-0.5 rounded ${speakingUsers.has(user.id) ? 'bg-green-500/50 text-white' : 'bg-green-900/50 text-green-200'}`}
                  >
                    {speakingUsers.has(user.id) && <span className="mr-1">🎤</span>}
                    {user.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#0d0520] p-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-purple-300/50">
                <Sparkles className="w-10 h-10 mb-3" />
                <p className="text-sm">{t('chat.no_messages')}</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {messages.map((msg) => {
                  const displayName = getDisplayName(msg.user)
                  const isMentioned = nickname && msg.content.toLowerCase().includes(`@${nickname.toLowerCase()}`)
                  const isMe = msg.user.id === session?.user?.id
                  const isOwner = isRoomOwner(msg.user.id)
                  const isSpeakingUser = speakingUsers.has(msg.user.id)
                  
                  return (
                    <div
                      key={msg.id}
                      className={`px-2 py-0.5 ${isMentioned ? 'bg-gold-500/20' : ''} ${isOwner ? 'bg-red-900/30' : ''}`}
                    >
                      {/* Speaking Indicator */}
                      {isSpeakingUser && (
                        <span className="text-green-400 mr-1">🎤</span>
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
                        className={`font-medium hover:underline ${
                          isOwner
                            ? 'text-yellow-300'
                            : msg.user.chatRole 
                              ? ROLE_COLORS[msg.user.chatRole] 
                              : isMe 
                                ? 'text-gold-400' 
                                : 'text-purple-300'
                        }`}
                      >
                        &lt;{displayName}&gt;
                      </button>
                      <span className="text-white ml-2">
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
                  {language === 'tr' ? ' yazıyor...' : ' typing...'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && !error.includes('banned') && (
            <div className="px-3 py-1 bg-red-900/50 text-red-300 text-xs">{error}</div>
          )}

          {/* Message Input */}
          {session?.user ? (
            <form onSubmit={handleSendMessage} className="flex-shrink-0 bg-[#1a0b2e] border-t border-purple-500/30 p-2">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping()
                  }}
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
              </div>
            </form>
          ) : (
            <div className="flex-shrink-0 bg-[#1a0b2e] border-t border-purple-500/30 p-2 text-center">
              <Link
                href={`/${language}/login`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium text-sm rounded hover:bg-purple-500"
              >
                <LogIn className="w-4 h-4" />
                {t('chat.login_required')}
              </Link>
            </div>
          )}
        </div>

        {/* Users Panel */}
        <div className="w-48 md:w-56 flex flex-col min-h-0 bg-[#1a0b2e]">
          <div className="flex-shrink-0 h-12 bg-[#1a0b2e] border-b border-purple-500/30 flex items-center justify-between px-2">
            <span className="text-purple-300 text-sm font-medium flex items-center gap-1">
              <Users className="w-4 h-4" />
              {language === 'tr' ? 'Kullanıcılar' : 'Users'}
            </span>
            <span className="text-purple-400 text-xs bg-purple-600/30 px-2 py-0.5 rounded">({activeUsers.length})</span>
          </div>

          {/* Room Owner at Top */}
          {room.owner && (
            <div className="flex-shrink-0 bg-red-600/60 px-2 py-2 border-b border-red-500/30">
              <p className="text-[10px] text-red-200 uppercase tracking-wider mb-1">
                {language === 'tr' ? 'Oda Sahibi' : 'Room Owner'}
              </p>
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-300" />
                <span className="text-yellow-200 text-sm font-bold truncate">
                  {room.owner.username || room.owner.name}
                </span>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#0d0520]">
            {activeUsers.length === 0 ? (
              <p className="text-purple-400/50 text-xs p-2 text-center">
                {language === 'tr' ? 'Kimse yok' : 'No one here'}
              </p>
            ) : (
              <div className="py-1">
                {activeUsers.map((user) => {
                  const isOwner = isRoomOwner(user.id)
                  const userIsSpeaking = speakingUsers.has(user.id) || (user.id === session?.user?.id && isSpeaking)
                  
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        if (user.id !== session?.user?.id) {
                          if (hasManagePermission) {
                            setSelectedUser(user)
                            setManageTab('users')
                            setShowManagePopup(true)
                          } else {
                            addMention(getDisplayName(user))
                          }
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-purple-800/30 ${isOwner ? 'bg-red-900/40' : ''}`}
                    >
                      {/* Speaking Indicator */}
                      {userIsSpeaking ? (
                        <span className="text-green-400 w-4 text-center">🎤</span>
                      ) : user.chatRole ? (
                        <span className={`${ROLE_COLORS[user.chatRole]} text-xs font-bold w-4 text-center`}>
                          {user.roleSymbol}
                        </span>
                      ) : isOwner ? (
                        <span className="text-yellow-400 w-4 text-center">👑</span>
                      ) : (
                        <span className="w-4" />
                      )}
                      
                      <span className={`text-xs truncate ${
                        isOwner
                          ? 'text-yellow-300 font-bold'
                          : user.chatRole 
                            ? ROLE_COLORS[user.chatRole] 
                            : user.isAdmin 
                              ? 'text-red-400'
                              : 'text-purple-200'
                      }`}>
                        {getDisplayName(user)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Home Button - Fixed Bottom Right */}
      <Link
        href={`/${language}`}
        className="fixed bottom-4 right-4 z-40 w-12 h-12 bg-gold-500 hover:bg-gold-400 text-black rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
      >
        <Home className="w-6 h-6" />
      </Link>
    </div>
  )
}
