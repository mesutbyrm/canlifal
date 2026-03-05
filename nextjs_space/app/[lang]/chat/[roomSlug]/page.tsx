'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { Send, ArrowLeft, Users, Sparkles, LogIn } from 'lucide-react'
import { useParams } from 'next/navigation'

interface Message {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string
  }
}

interface ActiveUser {
  id: string
  name: string
  lastSeen: string
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageTime = useRef<string | null>(null)

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
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }, [room])

  // Update presence and get active users
  const updatePresence = useCallback(async () => {
    if (!room || !session?.user) return
    
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/presence`, {
        method: 'POST'
      })
      if (res.ok) {
        const users = await res.json()
        setActiveUsers(users)
      }
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }, [room, session])

  // Get active users (for non-logged in users)
  const getActiveUsers = useCallback(async () => {
    if (!room) return
    
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/presence`)
      if (res.ok) {
        const users = await res.json()
        setActiveUsers(users)
      }
    } catch (error) {
      console.error('Error getting active users:', error)
    }
  }, [room])

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
      } else {
        getActiveUsers()
      }
    }
  }, [room, fetchMessages, session, updatePresence, getActiveUsers])

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

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !room || !session?.user || sending) return
    
    setSending(true)
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() })
      })
      
      if (res.ok) {
        const message = await res.json()
        setMessages(prev => [...prev, message])
        lastMessageTime.current = message.createdAt
        setNewMessage('')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
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
              <h1 className="text-2xl font-serif text-gold-300">
                {language === 'tr' ? room.nameTr : room.nameEn}
              </h1>
              <p className="text-purple-200/60 text-sm">
                {language === 'tr' ? room.descTr : room.descEn}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-green-400">
            <Users className="w-5 h-5" />
            <span>{activeUsers.length} {t('chat.online')}</span>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col bg-[#1a0b2e]/50 rounded-xl border border-gold-500/20 overflow-hidden">
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-purple-300/50">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p>{t('chat.no_messages')}</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.user.id === session?.user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${msg.user.id === session?.user?.id 
                      ? 'bg-gold-500/20 border-gold-500/30' 
                      : 'bg-purple-800/30 border-purple-500/30'} border rounded-xl p-3`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${msg.user.id === session?.user?.id 
                          ? 'text-gold-300' 
                          : 'text-purple-300'}`}
                        >
                          {msg.user.name}
                        </span>
                        <span className="text-xs text-purple-400/50">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-purple-100">{msg.content}</p>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {session?.user ? (
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gold-500/20">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('chat.placeholder')}
                    maxLength={500}
                    className="flex-1 bg-[#2d1b4e]/50 border border-gold-500/30 rounded-lg px-4 py-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-gold-400 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-medium rounded-lg hover:from-gold-400 hover:to-gold-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-medium rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all"
                >
                  <LogIn className="w-5 h-5" />
                  {t('chat.login_required')}
                </Link>
              </div>
            )}
          </div>

          {/* Active Users Sidebar - Desktop Only */}
          <div className="hidden lg:block w-64 bg-[#1a0b2e]/50 rounded-xl border border-gold-500/20 p-4">
            <h3 className="text-gold-300 font-medium mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('chat.active_users')}
            </h3>
            <div className="space-y-2">
              {activeUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 text-purple-200"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="truncate">{user.name}</span>
                </div>
              ))}
              {activeUsers.length === 0 && (
                <p className="text-purple-400/50 text-sm">
                  {language === 'tr' ? 'Kimse yok' : 'No one here'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
