'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { Send, ArrowLeft, Users, Sparkles, LogIn, VolumeX, Volume2, UserMinus, Ban, Shield, Crown, Star, Mic, MicOff, AtSign, Bell, X, Edit2 } from 'lucide-react'
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
  
  // Nickname system
  const [nickname, setNickname] = useState('')
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  
  // Mention notifications
  const [mentionNotification, setMentionNotification] = useState<{from: string, content: string} | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageTime = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const previousMessagesCount = useRef(0)

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
  const fetchMessages = useCallback(async (isPolling = false) => {
    if (!room) return
    
    try {
      const url = isPolling && lastMessageTime.current
        ? `/api/chat/rooms/${room.id}/messages?after=${encodeURIComponent(lastMessageTime.current)}`
        : `/api/chat/rooms/${room.id}/messages`
      
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        
        if (isPolling && data.length > 0) {
          setMessages(prev => [...prev, ...data])
        } else if (!isPolling) {
          setMessages(data)
        }
        
        if (data.length > 0) {
          lastMessageTime.current = data[data.length - 1].createdAt
        }
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

  // Load saved nickname from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user) {
      const savedNickname = localStorage.getItem(`chat_nickname_${session.user.id}`)
      if (savedNickname) {
        setNickname(savedNickname)
      } else {
        // Show nickname modal for first time users
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

  // Update presence and get active users
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
        setActiveUsers(data.users || [])
        setRoomMuted(data.roomMuted || false)
      }
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }, [room, session, nickname])

  // Get active users (for non-logged in users)
  const getActiveUsers = useCallback(async () => {
    if (!room) return
    
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/presence`)
      if (res.ok) {
        const data = await res.json()
        setActiveUsers(data.users || [])
        setRoomMuted(data.roomMuted || false)
      }
    } catch (error) {
      console.error('Error getting active users:', error)
    }
  }, [room])

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

  // Initial load
  useEffect(() => {
    fetchRoom()
  }, [fetchRoom])

  // Load messages when room is available
  useEffect(() => {
    if (room) {
      fetchMessages(false)
      if (session?.user) {
        updatePresence()
        fetchMyPermissions()
      } else {
        getActiveUsers()
      }
    }
  }, [room, fetchMessages, session, updatePresence, getActiveUsers, fetchMyPermissions])

  // Polling for new messages and presence
  useEffect(() => {
    if (!room) return
    
    const messageInterval = setInterval(() => fetchMessages(true), 3000)
    const presenceInterval = setInterval(() => {
      if (session?.user) {
        updatePresence()
      } else {
        getActiveUsers()
      }
    }, 10000)
    
    return () => {
      clearInterval(messageInterval)
      clearInterval(presenceInterval)
    }
  }, [room, fetchMessages, session, updatePresence, getActiveUsers])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check for mentions in new messages
  useEffect(() => {
    if (!session?.user || !nickname) return
    
    // Only check new messages (not on initial load)
    if (messages.length > previousMessagesCount.current && previousMessagesCount.current > 0) {
      const newMsgs = messages.slice(previousMessagesCount.current)
      const myNickname = nickname.toLowerCase()
      
      for (const msg of newMsgs) {
        // Don't notify for own messages
        if (msg.user.id === session.user.id) continue
        
        // Check if message contains @mention
        const mentionPattern = new RegExp(`@${myNickname}\\b`, 'i')
        if (mentionPattern.test(msg.content)) {
          setMentionNotification({
            from: msg.user.nickname || msg.user.name,
            content: msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : '')
          })
          
          // Auto-hide after 5 seconds
          setTimeout(() => setMentionNotification(null), 5000)
          break
        }
      }
    }
    previousMessagesCount.current = messages.length
  }, [messages, session, nickname])

  // Add @mention to input when clicking on a user
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
        lastMessageTime.current = message.createdAt
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
        // Refresh presence to see changes
        if (session?.user) {
          updatePresence()
        }
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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
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

  // Get display name for user
  const getDisplayName = (user: {name: string, nickname?: string}) => {
    return user.nickname || user.name
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
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
                <Edit2 className="w-5 h-5" />
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
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gold-500/20 border border-gold-500/50 rounded-xl px-6 py-4 shadow-xl backdrop-blur-sm max-w-md"
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

      <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4 pb-4 border-b border-gold-500/20"
        >
          <div className="flex items-center gap-4">
            <Link 
              href={`/${language}/chat`}
              className="text-purple-300 hover:text-gold-400 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <span className="text-3xl">{room.icon}</span>
            <div>
              <h1 className="text-2xl font-serif text-gold-300 flex items-center gap-2">
                {language === 'tr' ? room.nameTr : room.nameEn}
                {roomMuted && <VolumeX className="w-5 h-5 text-red-400" />}
              </h1>
              <p className="text-purple-200/60 text-sm">
                {language === 'tr' ? room.descTr : room.descEn}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Edit nickname button */}
            {session?.user && nickname && (
              <button
                onClick={() => {
                  setNicknameInput(nickname)
                  setShowNicknameModal(true)
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 text-sm"
                title={language === 'tr' ? 'Takma adı değiştir' : 'Change nickname'}
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">{nickname}</span>
              </button>
            )}
            {myPermissions?.canMuteRoom && (
              <button
                onClick={toggleRoomMute}
                className={`p-2 rounded-lg ${roomMuted ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-300'} hover:opacity-80`}
                title={roomMuted ? 'Unmute room' : 'Mute room'}
              >
                {roomMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            )}
            <div className="flex items-center gap-2 text-green-400">
              <Users className="w-5 h-5" />
              <span>{activeUsers.length} {t('chat.online')}</span>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Active Users Sidebar - Left Side */}
          <div className="hidden md:flex md:flex-col w-72 bg-[#1a0b2e]/50 rounded-xl border border-gold-500/20 p-4 overflow-hidden">
            <h3 className="text-gold-300 font-semibold text-lg mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              {t('chat.active_users')} ({activeUsers.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {activeUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-purple-800/30 transition-colors ${selectedUser?.id === user.id ? 'bg-purple-800/40 border border-gold-500/30' : ''}`}
                  onClick={() => {
                    if (myPermissions && user.id !== session?.user?.id) {
                      setSelectedUser(user)
                    } else if (user.id !== session?.user?.id) {
                      // Non-admin users can click to mention
                      addMention(getDisplayName(user))
                    }
                  }}
                >
                  <div className="w-3 h-3 bg-green-400 rounded-full flex-shrink-0 shadow-lg shadow-green-400/50" />
                  {user.chatRole && (
                    <span className={`${ROLE_COLORS[user.chatRole]} flex items-center gap-1 flex-shrink-0`}>
                      <span className="w-5 h-5">{ROLE_ICONS[user.chatRole]}</span>
                      <span className="font-bold text-base">{user.roleSymbol}</span>
                    </span>
                  )}
                  <span className={`truncate text-base font-medium ${user.chatRole ? ROLE_COLORS[user.chatRole] : 'text-purple-200'}`}>
                    {getDisplayName(user)}
                  </span>
                  {user.isAdmin && !user.chatRole && (
                    <span className="ml-auto text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded">
                      {language === 'tr' ? 'Site Admin' : 'Site Admin'}
                    </span>
                  )}
                </div>
              ))}
              {activeUsers.length === 0 && (
                <p className="text-purple-400/50 text-base">
                  {language === 'tr' ? 'Kimse yok' : 'No one here'}
                </p>
              )}
            </div>

            {/* Moderation Panel */}
            {selectedUser && myPermissions && selectedUser.id !== session?.user?.id && (
              <div className="mt-4 pt-4 border-t border-gold-500/20">
                <h4 className="text-gold-300 text-base font-medium mb-3">
                  {language === 'tr' ? 'Moderasyon:' : 'Moderation:'} {selectedUser.name}
                </h4>
                <div className="space-y-2">
                  {myPermissions.canMuteUsers && (
                    <button
                      onClick={() => performModAction('mute_user', selectedUser.id, { duration: 30 })}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-orange-500/20 text-orange-300 rounded-lg hover:bg-orange-500/30 text-base"
                    >
                      <MicOff className="w-5 h-5" />
                      {language === 'tr' ? 'Sustur (30dk)' : 'Mute (30min)'}
                    </button>
                  )}
                  {myPermissions.canKickUsers && (
                    <button
                      onClick={() => performModAction('kick_user', selectedUser.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-yellow-500/20 text-yellow-300 rounded-lg hover:bg-yellow-500/30 text-base"
                    >
                      <UserMinus className="w-5 h-5" />
                      {language === 'tr' ? 'At' : 'Kick'}
                    </button>
                  )}
                  {myPermissions.canBanUsers && (
                    <button
                      onClick={() => performModAction('ban_user', selectedUser.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 text-base"
                    >
                      <Ban className="w-5 h-5" />
                      {language === 'tr' ? 'Engelle' : 'Ban'}
                    </button>
                  )}
                  
                  {/* Role Management */}
                  {(myPermissions.canGiveVoice || myPermissions.canGiveOp || myPermissions.canGiveAdmin) && (
                    <div className="pt-2 border-t border-gold-500/10">
                      <p className="text-purple-400/70 text-sm mb-2">{language === 'tr' ? 'Yetki Ver:' : 'Grant Role:'}</p>
                      {myPermissions.canGiveVoice && (
                        <button
                          onClick={() => performModAction('set_role', selectedUser.id, { role: 'voice' })}
                          className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 text-base mb-1"
                        >
                          <Mic className="w-5 h-5" /> +Voice
                        </button>
                      )}
                      {myPermissions.canGiveOp && (
                        <button
                          onClick={() => performModAction('set_role', selectedUser.id, { role: 'op' })}
                          className="w-full flex items-center gap-2 px-3 py-2.5 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 text-base mb-1"
                        >
                          <Star className="w-5 h-5" /> @Op
                        </button>
                      )}
                      {myPermissions.canGiveAdmin && (
                        <button
                          onClick={() => performModAction('set_role', selectedUser.id, { role: 'admin' })}
                          className="w-full flex items-center gap-2 px-3 py-2.5 bg-orange-500/20 text-orange-300 rounded-lg hover:bg-orange-500/30 text-base mb-1"
                        >
                          <Shield className="w-5 h-5" /> &Admin
                        </button>
                      )}
                      {myPermissions.canGiveFounder && (
                        <button
                          onClick={() => performModAction('set_role', selectedUser.id, { role: 'founder' })}
                          className="w-full flex items-center gap-2 px-3 py-2.5 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 text-base mb-1"
                        >
                          <Crown className="w-5 h-5" /> ~Founder
                        </button>
                      )}
                      {selectedUser.chatRole && (
                        <button
                          onClick={() => performModAction('remove_role', selectedUser.id)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 text-base"
                        >
                          {language === 'tr' ? 'Yetkiyi Kaldır' : 'Remove Role'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-full mt-3 text-purple-400/70 text-base hover:text-purple-300"
                >
                  {language === 'tr' ? 'Kapat' : 'Close'}
                </button>
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col bg-[#1a0b2e]/50 rounded-xl border border-gold-500/20 overflow-hidden">
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-purple-300/50">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p className="text-lg">{t('chat.no_messages')}</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const displayName = getDisplayName(msg.user)
                  const isMentioned = nickname && msg.content.toLowerCase().includes(`@${nickname.toLowerCase()}`)
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.user.id === session?.user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${
                        isMentioned 
                          ? 'bg-gold-500/30 border-gold-500/50 ring-2 ring-gold-500/30' 
                          : msg.user.id === session?.user?.id 
                            ? 'bg-gold-500/20 border-gold-500/30' 
                            : 'bg-purple-800/30 border-purple-500/30'
                      } border rounded-xl p-4`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {msg.user.chatRole && (
                            <span className={`${ROLE_COLORS[msg.user.chatRole] || 'text-gray-400'} flex items-center gap-1`}>
                              <span className="w-4 h-4">{ROLE_ICONS[msg.user.chatRole]}</span>
                              <span className="font-bold text-base">{msg.user.roleSymbol}</span>
                            </span>
                          )}
                          <button
                            onClick={() => msg.user.id !== session?.user?.id && addMention(displayName)}
                            className={`text-base font-semibold hover:underline cursor-pointer ${
                              msg.user.chatRole 
                                ? ROLE_COLORS[msg.user.chatRole] 
                                : msg.user.id === session?.user?.id 
                                  ? 'text-gold-300' 
                                  : 'text-purple-300'
                            }`}
                            title={msg.user.id !== session?.user?.id ? (language === 'tr' ? 'Bahsetmek için tıkla' : 'Click to mention') : ''}
                          >
                            {displayName}
                          </button>
                          <span className="text-sm text-purple-400/50">
                            {formatTime(msg.createdAt)}
                          </span>
                          {isMentioned && (
                            <span className="text-xs bg-gold-500/30 text-gold-300 px-2 py-0.5 rounded flex items-center gap-1">
                              <AtSign className="w-3 h-3" />
                              {language === 'tr' ? 'Bahsedildi' : 'Mentioned'}
                            </span>
                          )}
                        </div>
                        <p className="text-purple-100 text-base leading-relaxed whitespace-pre-wrap">
                          {msg.content.split(/(@\w+)/g).map((part, i) => 
                            part.startsWith('@') ? (
                              <span key={i} className="text-gold-400 font-medium">{part}</span>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                        </p>
                      </div>
                    </motion.div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-2 bg-red-500/20 border-t border-red-500/30 text-red-300 text-base">
                {error}
              </div>
            )}

            {/* Message Input */}
            {session?.user ? (
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gold-500/20">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('chat.placeholder')}
                    maxLength={500}
                    className="flex-1 bg-[#2d1b4e]/50 border border-gold-500/30 rounded-lg px-4 py-3 text-base text-white placeholder-purple-400/50 focus:outline-none focus:border-gold-400 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold text-base rounded-lg hover:from-gold-400 hover:to-gold-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    <span className="hidden sm:inline">{t('chat.send')}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 border-t border-gold-500/20 text-center">
                <Link
                  href={`/${language}/login`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold text-base rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all"
                >
                  <LogIn className="w-5 h-5" />
                  {t('chat.login_required')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
