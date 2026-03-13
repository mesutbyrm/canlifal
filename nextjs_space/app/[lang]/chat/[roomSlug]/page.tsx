'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { Send, Users, Sparkles, LogIn, VolumeX, Volume2, UserMinus, Ban, Shield, Crown, Star, Mic, MicOff, AtSign, Bell, X, Settings, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useParams } from 'next/navigation'

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
  const roomSlug = params.roomSlug as string
  const { data: session } = useSession() || {}
  const { language, t } = useLanguage()
  
  const [room, setRoom] = useState<ChatRoom | null>(null)
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
  
  // Management panels
  const [showChatManagePanel, setShowChatManagePanel] = useState(false)
  const [showUsersManagePanel, setShowUsersManagePanel] = useState(false)
  
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
      // Create a simple notification sound
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

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!room) return
    
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
        setError(null)
      } else if (res.status === 403) {
        const errorData = await res.json()
        setError(errorData.error)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }, [room])

  // Connect to SSE stream
  const connectSSE = useCallback(() => {
    if (!room) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(`/api/chat/rooms/${room.id}/stream`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'connected':
            setIsConnected(true)
            break

          case 'messages':
            if (data.messages && data.messages.length > 0) {
              setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id))
                const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id))
                if (newMsgs.length > 0) {
                  // Play sound for new messages from others
                  const hasNewFromOthers = newMsgs.some((m: Message) => m.user.id !== session?.user?.id)
                  if (hasNewFromOthers && soundEnabled) {
                    audioRef.current?.play().catch(() => {})
                  }
                  return [...prev, ...newMsgs]
                }
                return prev
              })
            }
            break

          case 'presence':
            if (data.users) {
              setActiveUsers(data.users)
            }
            break

          case 'typing':
            if (data.users) {
              setTypingUsers(data.users)
            }
            break
        }
      } catch (err) {
        console.error('SSE parse error:', err)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (room) connectSSE()
      }, 3000)
    }

    return () => {
      eventSource.close()
    }
  }, [room, session?.user?.id, soundEnabled])

  // Load saved nickname from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user) {
      const savedNickname = localStorage.getItem(`chat_nickname_${session.user.id}`)
      if (savedNickname) {
        setNickname(savedNickname)
      } else {
        setShowNicknameModal(true)
      }
    }
  }, [session])

  // Save nickname
  const saveNickname = () => {
    if (nicknameInput.trim() && session?.user) {
      const name = nicknameInput.trim().slice(0, 20)
      setNickname(name)
      localStorage.setItem(`chat_nickname_${session.user.id}`, name)
      setShowNicknameModal(false)
    }
  }

  // Update presence
  const updatePresence = useCallback(async () => {
    if (!room || !session?.user) return
    
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname || session.user.name })
      })
      if (res.ok) {
        const data = await res.json()
        setRoomMuted(data.roomMuted || false)
      }
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }, [room, session, nickname])

  // Fetch my permissions
  const fetchMyPermissions = useCallback(async () => {
    if (!room || !session?.user) return
    
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/moderation`)
      if (res.ok) {
        const data = await res.json()
        setMyPermissions(data.myPermissions)
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
    }
  }, [room, session])

  // Handle typing indicator
  const handleTyping = useCallback(async () => {
    if (!room || !session?.user) return

    try {
      await fetch(`/api/chat/rooms/${room.id}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: true })
      })

      // Clear typing after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(async () => {
        await fetch(`/api/chat/rooms/${room.id}/typing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isTyping: false })
        })
      }, 3000)
    } catch (error) {
      console.error('Error updating typing:', error)
    }
  }, [room, session])

  // Initial load
  useEffect(() => {
    fetchRoom()
  }, [fetchRoom])

  // Load messages and connect SSE when room is available
  useEffect(() => {
    if (room) {
      fetchMessages()
      connectSSE()
      if (session?.user) {
        // Immediately update presence so user appears online right away
        updatePresence()
        fetchMyPermissions()
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [room, fetchMessages, connectSSE, session, updatePresence, fetchMyPermissions])

  // Fetch active users immediately and more frequently at first
  useEffect(() => {
    if (!room) return
    
    // Fetch users immediately
    const fetchUsers = async () => {
      try {
        const res = await fetch(`/api/chat/rooms/${room.id}/presence`)
        if (res.ok) {
          const data = await res.json()
          setActiveUsers(data.users)
        }
      } catch (e) {
        console.error('Error fetching users:', e)
      }
    }
    
    fetchUsers()
    // Also fetch again after 2 seconds for quick updates
    const quickUpdate = setTimeout(fetchUsers, 2000)
    
    return () => clearTimeout(quickUpdate)
  }, [room])

  // Update presence periodically
  useEffect(() => {
    if (!room || !session?.user) return
    
    const presenceInterval = setInterval(updatePresence, 30000)
    return () => clearInterval(presenceInterval)
  }, [room, session, updatePresence])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check for mentions in new messages
  useEffect(() => {
    if (!session?.user || !nickname) return
    
    if (messages.length > previousMessagesCount.current && previousMessagesCount.current > 0) {
      const newMsgs = messages.slice(previousMessagesCount.current)
      const myNickname = nickname.toLowerCase()
      
      for (const msg of newMsgs) {
        if (msg.user.id === session.user.id) continue
        
        const mentionPattern = new RegExp(`@${myNickname}\\b`, 'i')
        if (mentionPattern.test(msg.content)) {
          setMentionNotification({
            from: msg.user.nickname || msg.user.name,
            content: msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : '')
          })
          
          setTimeout(() => setMentionNotification(null), 5000)
          break
        }
      }
    }
    previousMessagesCount.current = messages.length
  }, [messages, session, nickname])

  // Add @mention to input
  const addMention = (userName: string) => {
    const mention = `@${userName} `
    setNewMessage(prev => prev + mention)
    inputRef.current?.focus()
  }

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !room || !session?.user || sending) return
    
    setSending(true)
    
    // Clear typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    await fetch(`/api/chat/rooms/${room.id}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isTyping: false })
    }).catch(() => {})

    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newMessage.trim(),
          nickname: nickname || session.user.name
        })
      })
      
      if (res.ok) {
        const message = await res.json()
        setMessages(prev => [...prev, message])
        setNewMessage('')
        setError(null)
      } else {
        const errorData = await res.json()
        setError(errorData.error)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  // Moderation actions
  const performModAction = async (action: string, targetUserId: string, extra?: Record<string, unknown>) => {
    if (!room) return
    
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUserId, ...extra })
      })
      
      if (res.ok) {
        setSelectedUser(null)
      } else {
        const errorData = await res.json()
        alert(errorData.error)
      }
    } catch (error) {
      console.error('Mod action error:', error)
    }
  }

  const toggleRoomMute = async () => {
    if (!room) return
    await performModAction(roomMuted ? 'unmute_room' : 'mute_room', '')
    setRoomMuted(!roomMuted)
  }

  const clearAllMessages = async () => {
    if (!room) return
    if (!confirm(language === 'tr' ? 'Tüm mesajları silmek istediğinize emin misiniz?' : 'Are you sure you want to clear all messages?')) {
      return
    }
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

  // Check if user has management permissions
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
    <div className="h-full w-full flex flex-col" style={{ height: '100dvh' }}>
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
                {language === 'tr' 
                  ? 'Bu isim sohbette görünecek' 
                  : 'This name will be shown in chat'}
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
              <button
                onClick={() => setMentionNotification(null)}
                className="text-purple-400 hover:text-white ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* mIRC Style Layout - Full Screen - No Scroll */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Area (Left/Main) */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-purple-500/30">
          {/* Chat Header - Room Name and Yönet Button - FIXED */}
          <div className="flex-shrink-0 h-10 bg-[#1a0b2e] border-b border-purple-500/30 flex items-center justify-between px-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (hasManagePermission) {
                    setShowChatManagePanel(!showChatManagePanel)
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  hasManagePermission 
                    ? 'bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 cursor-pointer' 
                    : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Settings className="w-4 h-4" />
                {language === 'tr' ? 'Yönet' : 'Manage'}
                {hasManagePermission && (showChatManagePanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
              </button>
              
              {/* Room Name */}
              <span className="text-gold-400 font-medium text-sm">
                {room.icon} {language === 'tr' ? room.nameTr : room.nameEn}
              </span>
            </div>
            
            {/* Room Muted Indicator */}
            {roomMuted && (
              <div className="flex items-center gap-1 text-red-400 text-xs">
                <VolumeX className="w-4 h-4" />
                {language === 'tr' ? 'Oda Sessiz' : 'Room Muted'}
              </div>
            )}
          </div>
          
          {/* Chat Management Panel */}
          <AnimatePresence>
            {showChatManagePanel && hasManagePermission && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-[#1a0b2e]/80 border-b border-purple-500/30 overflow-hidden"
              >
                <div className="p-3 flex flex-wrap gap-2">
                  {myPermissions?.canMuteRoom && (
                    <button
                      onClick={toggleRoomMute}
                      className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        roomMuted 
                          ? 'bg-green-600/30 text-green-300 hover:bg-green-600/50' 
                          : 'bg-red-600/30 text-red-300 hover:bg-red-600/50'
                      }`}
                    >
                      {roomMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      {roomMuted 
                        ? (language === 'tr' ? 'Odayı Aç' : 'Unmute Room')
                        : (language === 'tr' ? 'Odayı Sustur' : 'Mute Room')
                      }
                    </button>
                  )}
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      soundEnabled 
                        ? 'bg-blue-600/30 text-blue-300 hover:bg-blue-600/50' 
                        : 'bg-gray-600/30 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    {soundEnabled 
                      ? (language === 'tr' ? 'Ses Açık' : 'Sound On')
                      : (language === 'tr' ? 'Ses Kapalı' : 'Sound Off')
                    }
                  </button>
                  {/* Clear Messages - only for founder and op */}
                  {(myPermissions?.role === 'founder' || myPermissions?.role === 'op' || myPermissions?.isGlobalAdmin) && (
                    <button
                      onClick={clearAllMessages}
                      className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors bg-red-600/30 text-red-300 hover:bg-red-600/50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {language === 'tr' ? 'Mesajları Temizle' : 'Clear Messages'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Area - SCROLLABLE */}
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
                  
                  return (
                    <div
                      key={msg.id}
                      className={`px-2 py-0.5 ${isMentioned ? 'bg-gold-500/20' : ''}`}
                    >
                      {msg.user.chatRole && (
                        <span className={`${ROLE_COLORS[msg.user.chatRole]} mr-1`}>
                          {msg.user.roleSymbol}
                        </span>
                      )}
                      <button
                        onClick={() => msg.user.id !== session?.user?.id && addMention(displayName)}
                        className={`font-medium hover:underline ${
                          msg.user.chatRole 
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

          {/* Error Message */}
          {error && (
            <div className="px-3 py-1 bg-red-900/50 text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Message Input - FIXED AT BOTTOM */}
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

        {/* Users Panel (Right) - mIRC Style */}
        <div className="w-48 md:w-56 flex flex-col min-h-0 bg-[#1a0b2e]">
          {/* Users Header - Yönet Button - FIXED */}
          <div className="flex-shrink-0 h-10 bg-[#1a0b2e] border-b border-purple-500/30 flex items-center justify-between px-2">
            <button
              onClick={() => {
                if (hasManagePermission) {
                  setShowUsersManagePanel(!showUsersManagePanel)
                }
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                hasManagePermission 
                  ? 'bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 cursor-pointer' 
                  : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Settings className="w-3 h-3" />
              {language === 'tr' ? 'Yönet' : 'Manage'}
              {hasManagePermission && (showUsersManagePanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </button>
            <span className="text-purple-400 text-xs">({activeUsers.length})</span>
          </div>

          {/* User Management Panel */}
          <AnimatePresence>
            {showUsersManagePanel && hasManagePermission && selectedUser && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-[#0d0520] border-b border-purple-500/30 overflow-hidden"
              >
                <div className="p-2">
                  <p className="text-purple-300 text-xs mb-2 font-medium truncate">
                    {language === 'tr' ? 'Seçili:' : 'Selected:'} {getDisplayName(selectedUser)}
                  </p>
                  <div className="space-y-1">
                    {myPermissions?.canMuteUsers && (
                      <button
                        onClick={() => performModAction('mute_user', selectedUser.id, { duration: 30 })}
                        className="w-full flex items-center gap-1 px-2 py-1.5 bg-orange-600/30 text-orange-300 rounded text-xs hover:bg-orange-600/50"
                      >
                        <MicOff className="w-3 h-3" />
                        {language === 'tr' ? 'Sustur' : 'Mute'}
                      </button>
                    )}
                    {myPermissions?.canKickUsers && (
                      <button
                        onClick={() => performModAction('kick_user', selectedUser.id)}
                        className="w-full flex items-center gap-1 px-2 py-1.5 bg-yellow-600/30 text-yellow-300 rounded text-xs hover:bg-yellow-600/50"
                      >
                        <UserMinus className="w-3 h-3" />
                        {language === 'tr' ? 'At' : 'Kick'}
                      </button>
                    )}
                    {myPermissions?.canBanUsers && (
                      <button
                        onClick={() => performModAction('ban_user', selectedUser.id)}
                        className="w-full flex items-center gap-1 px-2 py-1.5 bg-red-600/30 text-red-300 rounded text-xs hover:bg-red-600/50"
                      >
                        <Ban className="w-3 h-3" />
                        {language === 'tr' ? 'Engelle' : 'Ban'}
                      </button>
                    )}
                    
                    {/* Roles */}
                    {(myPermissions?.canGiveVoice || myPermissions?.canGiveOp || myPermissions?.canGiveAdmin || myPermissions?.canGiveFounder) && (
                      <div className="pt-1 border-t border-purple-500/20 mt-1">
                        <p className="text-purple-400/70 text-[10px] mb-1">{language === 'tr' ? 'Yetki:' : 'Role:'}</p>
                        <div className="grid grid-cols-2 gap-1">
                          {myPermissions?.canGiveVoice && (
                            <button
                              onClick={() => performModAction('set_role', selectedUser.id, { role: 'voice' })}
                              className="flex items-center gap-1 px-1.5 py-1 bg-blue-600/30 text-blue-300 rounded text-[10px] hover:bg-blue-600/50"
                            >
                              <Mic className="w-2.5 h-2.5" /> +v
                            </button>
                          )}
                          {myPermissions?.canGiveOp && (
                            <button
                              onClick={() => performModAction('set_role', selectedUser.id, { role: 'op' })}
                              className="flex items-center gap-1 px-1.5 py-1 bg-green-600/30 text-green-300 rounded text-[10px] hover:bg-green-600/50"
                            >
                              <Star className="w-2.5 h-2.5" /> @o
                            </button>
                          )}
                          {myPermissions?.canGiveAdmin && (
                            <button
                              onClick={() => performModAction('set_role', selectedUser.id, { role: 'admin' })}
                              className="flex items-center gap-1 px-1.5 py-1 bg-orange-600/30 text-orange-300 rounded text-[10px] hover:bg-orange-600/50"
                            >
                              <Shield className="w-2.5 h-2.5" /> &a
                            </button>
                          )}
                          {myPermissions?.canGiveFounder && (
                            <button
                              onClick={() => performModAction('set_role', selectedUser.id, { role: 'founder' })}
                              className="flex items-center gap-1 px-1.5 py-1 bg-red-600/30 text-red-300 rounded text-[10px] hover:bg-red-600/50"
                            >
                              <Crown className="w-2.5 h-2.5" /> ~q
                            </button>
                          )}
                        </div>
                        {selectedUser.chatRole && (
                          <button
                            onClick={() => performModAction('remove_role', selectedUser.id)}
                            className="w-full mt-1 flex items-center justify-center gap-1 px-1.5 py-1 bg-gray-600/30 text-gray-300 rounded text-[10px] hover:bg-gray-600/50"
                          >
                            {language === 'tr' ? 'Yetkiyi Kaldır' : 'Remove Role'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="w-full mt-2 text-purple-400/70 text-[10px] hover:text-purple-300"
                  >
                    {language === 'tr' ? 'Seçimi Kaldır' : 'Deselect'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Users List - mIRC Style - SCROLLABLE */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#0d0520]">
            {activeUsers.length === 0 ? (
              <p className="text-purple-400/50 text-xs p-2 text-center">
                {language === 'tr' ? 'Kimse yok' : 'No one here'}
              </p>
            ) : (
              <div className="py-1">
                {activeUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      if (user.id !== session?.user?.id) {
                        if (hasManagePermission) {
                          setSelectedUser(user)
                          setShowUsersManagePanel(true)
                        } else {
                          addMention(getDisplayName(user))
                        }
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2 py-0.5 cursor-pointer hover:bg-purple-800/30 ${
                      selectedUser?.id === user.id ? 'bg-purple-800/50' : ''
                    }`}
                  >
                    {/* Role Symbol/Icon */}
                    {user.chatRole ? (
                      <span className={`${ROLE_COLORS[user.chatRole]} text-xs font-bold w-4 text-center`}>
                        {user.roleSymbol}
                      </span>
                    ) : (
                      <span className="w-4" />
                    )}
                    
                    {/* Username */}
                    <span className={`text-xs truncate ${
                      user.chatRole 
                        ? ROLE_COLORS[user.chatRole] 
                        : user.isAdmin 
                          ? 'text-red-400'
                          : 'text-purple-200'
                    }`}>
                      {getDisplayName(user)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
