'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  MessageCircle,
  ChevronLeft,
  Search,
  Settings,
  Loader2,
  Mail,
  Check,
  X,
  UserPlus
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { tr, enUS } from 'date-fns/locale'

interface ConversationUser {
  id: string
  name: string
  username: string | null
  image: string | null
}

interface Conversation {
  id: string
  user: ConversationUser
  lastMessage: string | null
  lastMessageAt: string
  unreadCount: number
}

interface MessageRequest {
  id: string
  senderId: string
  message: string | null
  createdAt: string
  sender: ConversationUser
}

export default function MessagesPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [requests, setRequests] = useState<MessageRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages')
  const [searchQuery, setSearchQuery] = useState('')
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${language}/login`)
    } else if (status === 'authenticated') {
      fetchMessages()
    }
  }, [status, language])

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations)
        setRequests(data.requests)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
    setProcessingRequest(requestId)
    try {
      const res = await fetch('/api/messages/request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId))
        if (action === 'accept') {
          fetchMessages()
        }
      }
    } catch (error) {
      console.error('Error processing request:', error)
    } finally {
      setProcessingRequest(null)
    }
  }

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: language === 'tr' ? tr : enUS
    })
  }

  const filteredConversations = conversations.filter(conv =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.user.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0118]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0a0118]/95 backdrop-blur-md border-b border-purple-900/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6 text-purple-300" />
          </button>
          <h1 className="text-lg font-bold text-white">
            {language === 'tr' ? 'Mesajlar' : 'Messages'}
          </h1>
          <Link href={`/${language}/settings`} className="p-1">
            <Settings className="w-5 h-5 text-purple-300" />
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
          <input
            type="text"
            placeholder={language === 'tr' ? 'Ara...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-purple-900/30 border border-purple-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-purple-400 focus:outline-none focus:border-purple-600"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4">
        <div className="flex border-b border-purple-900/30">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'messages'
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-purple-400'
            }`}
          >
            <MessageCircle className="w-5 h-5 mx-auto" />
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors relative ${
              activeTab === 'requests'
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-purple-400'
            }`}
          >
            <UserPlus className="w-5 h-5 mx-auto" />
            {requests.length > 0 && (
              <span className="absolute top-2 right-1/3 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto">
        {activeTab === 'messages' ? (
          <div className="divide-y divide-purple-900/30">
            {filteredConversations.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-900/30 flex items-center justify-center">
                  <Mail className="w-10 h-10 text-purple-500" />
                </div>
                <p className="text-purple-400 text-lg">
                  {language === 'tr' ? 'Henüz mesaj yok' : 'No messages yet'}
                </p>
                <p className="text-purple-500 text-sm mt-2">
                  {language === 'tr' ? 'Birini takip edip mesaj gönderebilirsiniz' : 'Follow someone to start a conversation'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/${language}/messages/${conv.user.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-purple-900/20 transition-colors"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-purple-900">
                      {conv.user.image ? (
                        <Image
                          src={conv.user.image}
                          alt={conv.user.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl text-purple-300 bg-gradient-to-br from-purple-800 to-pink-800">
                          {conv.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold ${conv.unreadCount > 0 ? 'text-white' : 'text-purple-200'}`}>
                        {conv.user.name}
                      </p>
                      <span className="text-xs text-purple-500">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-purple-200 font-medium' : 'text-purple-400'}`}>
                      {conv.lastMessage || (language === 'tr' ? 'Mesaj başlat' : 'Start a conversation')}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-purple-900/30">
            {requests.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-900/30 flex items-center justify-center">
                  <UserPlus className="w-10 h-10 text-purple-500" />
                </div>
                <p className="text-purple-400 text-lg">
                  {language === 'tr' ? 'Mesaj isteği yok' : 'No message requests'}
                </p>
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 p-4"
                >
                  <Link
                    href={`/${language}/profile/${req.sender.username || req.sender.id}`}
                    className="w-14 h-14 rounded-full overflow-hidden bg-purple-900 flex-shrink-0"
                  >
                    {req.sender.image ? (
                      <Image
                        src={req.sender.image}
                        alt={req.sender.name}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl text-purple-300 bg-gradient-to-br from-purple-800 to-pink-800">
                        {req.sender.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">
                      {req.sender.name}
                    </p>
                    <p className="text-sm text-purple-400">
                      @{req.sender.username || 'user'}
                    </p>
                    {req.message && (
                      <p className="text-sm text-purple-300 mt-1 line-clamp-2">
                        &quot;{req.message}&quot;
                      </p>
                    )}
                    <p className="text-xs text-purple-500 mt-1">
                      {formatTime(req.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestAction(req.id, 'accept')}
                      disabled={processingRequest === req.id}
                      className="p-2 bg-green-600 hover:bg-green-500 rounded-full text-white"
                    >
                      {processingRequest === req.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRequestAction(req.id, 'reject')}
                      disabled={processingRequest === req.id}
                      className="p-2 bg-red-600 hover:bg-red-500 rounded-full text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
