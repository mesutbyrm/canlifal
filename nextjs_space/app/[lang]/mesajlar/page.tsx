'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  MessageCircle,
  Search,
  Loader2,
  Mail,
  Check,
  X,
  UserPlus,
  Users
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
  const { theme } = useSiteTheme()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [requests, setRequests] = useState<MessageRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages')
  const [searchQuery, setSearchQuery] = useState('')
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)

  const isCanlidark = theme === 'canlidark'
  const isFalclub = theme === 'falclub'
  const isFalci = theme === 'falci'
  const isCosmic = theme === 'cosmic'

  // Theme colors
  const bgColor = isFalclub ? '' : isFalci ? '' : isCosmic ? '' : ''
  const cardBg = isFalclub ? 'bg-fuchsia-900/20 border-fuchsia-500/30' : isFalci ? 'bg-indigo-900/20 border-indigo-500/30' : isCosmic ? 'bg-blue-900/20 border-blue-500/30' : 'bg-purple-900/20 border-purple-500/30'
  const inputBg = isFalclub ? 'bg-fuchsia-900/30 border-fuchsia-700/50' : isFalci ? 'bg-indigo-900/30 border-indigo-700/50' : isCosmic ? 'bg-blue-900/30 border-blue-700/50' : 'bg-purple-900/30 border-purple-800'
  const accentColor = isFalclub ? 'text-fuchsia-300' : isFalci ? 'text-indigo-300' : isCosmic ? 'text-blue-300' : 'text-purple-300'
  const activeTabBg = isFalclub ? 'border-fuchsia-400 text-fuchsia-300' : isFalci ? 'border-indigo-400 text-indigo-300' : isCosmic ? 'border-blue-400 text-blue-300' : 'border-amber-400 text-amber-300'
  const inactiveTabColor = isFalclub ? 'text-fuchsia-400/60' : isFalci ? 'text-indigo-400/60' : isCosmic ? 'text-blue-400/60' : 'text-purple-400/60'
  const hoverBg = isFalclub ? 'hover:bg-fuchsia-900/30' : isFalci ? 'hover:bg-indigo-900/30' : isCosmic ? 'hover:bg-blue-900/30' : 'hover:bg-purple-900/20'
  const avatarGradient = isFalclub ? 'from-fuchsia-800 to-pink-800' : isFalci ? 'from-indigo-800 to-purple-800' : isCosmic ? 'from-blue-800 to-cyan-800' : 'from-purple-800 to-pink-800'
  const dividerColor = isFalclub ? 'divide-fuchsia-900/30' : isFalci ? 'divide-indigo-900/30' : isCosmic ? 'divide-blue-900/30' : 'divide-purple-900/30'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/giris`)
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
      locale: tr
    })
  }

  const filteredConversations = conversations.filter(conv =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.user.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading || status === 'loading') {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <Loader2 className={`w-8 h-8 ${isCanlidark ? 'text-purple-400' : accentColor} animate-spin`} />
      </div>
    )
  }

  // ─── CanlıDark themed Messages UI ───
  if (isCanlidark) {
    return (
      <div className="min-h-screen pt-2 pb-24">
        {/* Search bar + icons */}
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
              <input
                type="text"
                placeholder="Ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-purple-500/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500/50 backdrop-blur-sm"
              />
            </div>
            <button className="w-9 h-9 rounded-full bg-white/5 border border-purple-500/20 flex items-center justify-center text-purple-300/60 hover:bg-white/10 transition-colors">
              <MessageCircle className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full bg-white/5 border border-purple-500/20 flex items-center justify-center text-purple-300/60 hover:bg-white/10 transition-colors">
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs: Sohbetler / Arkadaşlar */}
        <div className="max-w-lg mx-auto px-4">
          <div className="flex border-b border-purple-500/15">
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 py-2.5 text-center text-sm font-semibold transition-colors ${
                activeTab === 'messages' ? 'canlidark-msg-tab-active' : 'canlidark-msg-tab-inactive'
              }`}
            >
              Sohbetler
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-2.5 text-center text-sm font-semibold transition-colors relative ${
                activeTab === 'requests' ? 'canlidark-msg-tab-active' : 'canlidark-msg-tab-inactive'
              }`}
            >
              Arkadaşlar
              {requests.length > 0 && (
                <span className="absolute top-1 ml-1 canlidark-msg-unread-badge inline-flex" style={{ position: 'relative', top: '-2px', marginLeft: '4px' }}>
                  {requests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-lg mx-auto">
          {activeTab === 'messages' ? (
            <div className="divide-y divide-purple-500/10">
              {filteredConversations.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-purple-400/60" />
                  </div>
                  <p className="text-white text-base font-medium">Henüz mesaj yok</p>
                  <p className="text-purple-300/50 text-sm mt-1">Birini takip edip mesaj gönderebilirsiniz</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/mesajlar/${conv.user.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-purple-500/5 transition-colors"
                  >
                    {/* Avatar with gradient ring */}
                    <div className="relative flex-shrink-0">
                      <div className="canlidark-msg-avatar-ring">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          {conv.user.image ? (
                            <Image
                              src={conv.user.image}
                              alt={conv.user.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white bg-gradient-to-br from-purple-700 to-fuchsia-700">
                              {conv.user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Name + last message */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <p className={`font-semibold text-sm ${conv.unreadCount > 0 ? 'text-white' : 'text-white/80'}`}>
                            {conv.user.name}
                          </p>
                          {/* Verified badge placeholder */}
                          {conv.user.username && (
                            <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-purple-300/40">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 truncate ${conv.unreadCount > 0 ? 'text-white/80 font-medium' : 'text-purple-300/40'}`}>
                        {conv.lastMessage || 'Mesaj başlat'}
                      </p>
                    </div>

                    {/* Unread badge */}
                    {conv.unreadCount > 0 && (
                      <div className="canlidark-msg-unread-badge flex-shrink-0">
                        {conv.unreadCount}
                      </div>
                    )}
                  </Link>
                ))
              )}
            </div>
          ) : (
            <div className="divide-y divide-purple-500/10">
              {requests.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Users className="w-8 h-8 text-purple-400/60" />
                  </div>
                  <p className="text-white text-base font-medium">Mesaj isteği yok</p>
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Link
                      href={`/profil/${req.sender.username || req.sender.id}`}
                      className="flex-shrink-0"
                    >
                      <div className="canlidark-msg-avatar-ring">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          {req.sender.image ? (
                            <Image
                              src={req.sender.image}
                              alt={req.sender.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white bg-gradient-to-br from-purple-700 to-fuchsia-700">
                              {req.sender.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">
                        {req.sender.name}
                      </p>
                      <p className="text-xs text-purple-300/40">
                        @{req.sender.username || 'user'}
                      </p>
                      {req.message && (
                        <p className="text-xs text-white/60 mt-1 line-clamp-2">
                          &quot;{req.message}&quot;
                        </p>
                      )}
                      <p className="text-[10px] text-purple-300/30 mt-1">
                        {formatTime(req.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequestAction(req.id, 'accept')}
                        disabled={processingRequest === req.id}
                        className="w-9 h-9 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-full text-green-400 flex items-center justify-center transition-colors"
                      >
                        {processingRequest === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRequestAction(req.id, 'reject')}
                        disabled={processingRequest === req.id}
                        className="w-9 h-9 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-full text-red-400 flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
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

  // ─── Default (non-CanlıDark) Messages UI ───
  return (
    <div className={`min-h-screen ${bgColor} pt-[60px]`}>
      {/* Search - compact */}
      <div className="max-w-lg mx-auto px-3 py-2">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${accentColor}`} />
          <input
            type="text"
            placeholder={'Ara...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ${inputBg} border rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50`}
          />
        </div>
      </div>

      {/* Tabs - compact */}
      <div className="max-w-lg mx-auto px-3">
        <div className={`flex border-b ${isFalclub ? 'border-fuchsia-900/30' : isCosmic ? 'border-blue-900/30' : 'border-purple-900/30'}`}>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors text-sm ${
              activeTab === 'messages' ? activeTabBg : `border-transparent ${inactiveTabColor}`
            }`}
          >
            <MessageCircle className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors relative text-sm ${
              activeTab === 'requests' ? activeTabBg : `border-transparent ${inactiveTabColor}`
            }`}
          >
            <UserPlus className="w-4 h-4 mx-auto" />
            {requests.length > 0 && (
              <span className="absolute top-1 right-1/3 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto">
        {activeTab === 'messages' ? (
          <div className={`${dividerColor} divide-y`}>
            {filteredConversations.length === 0 ? (
              <div className="py-12 text-center">
                <div className={`w-16 h-16 mx-auto mb-3 rounded-full ${isFalclub ? 'bg-fuchsia-900/30' : 'bg-purple-900/30'} flex items-center justify-center`}>
                  <Mail className={`w-8 h-8 ${accentColor}`} />
                </div>
                <p className="text-white text-base">
                  {'Henüz mesaj yok'}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {'Birini takip edip mesaj gönderebilirsiniz'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/mesajlar/${conv.user.id}`}
                  className={`flex items-center gap-3 p-3 ${hoverBg} transition-colors`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      {conv.user.image ? (
                        <Image
                          src={conv.user.image}
                          alt={conv.user.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-lg text-white bg-gradient-to-br ${avatarGradient}`}>
                          {conv.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-fuchsia-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold text-sm ${conv.unreadCount > 0 ? 'text-white' : 'text-white/80'}`}>
                        {conv.user.name}
                      </p>
                      <span className="text-xs text-white/50">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-white/90 font-medium' : 'text-white/50'}`}>
                      {conv.lastMessage || ('Mesaj başlat')}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className={`${dividerColor} divide-y`}>
            {requests.length === 0 ? (
              <div className="py-12 text-center">
                <div className={`w-16 h-16 mx-auto mb-3 rounded-full ${isFalclub ? 'bg-fuchsia-900/30' : 'bg-purple-900/30'} flex items-center justify-center`}>
                  <UserPlus className={`w-8 h-8 ${accentColor}`} />
                </div>
                <p className="text-white text-base">
                  {'Mesaj isteği yok'}
                </p>
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 p-3"
                >
                  <Link
                    href={`/profil/${req.sender.username || req.sender.id}`}
                    className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                  >
                    {req.sender.image ? (
                      <Image
                        src={req.sender.image}
                        alt={req.sender.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-lg text-white bg-gradient-to-br ${avatarGradient}`}>
                        {req.sender.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">
                      {req.sender.name}
                    </p>
                    <p className="text-xs text-white/60">
                      @{req.sender.username || 'user'}
                    </p>
                    {req.message && (
                      <p className="text-xs text-white/70 mt-1 line-clamp-2">
                        &quot;{req.message}&quot;
                      </p>
                    )}
                    <p className="text-[10px] text-white/40 mt-1">
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
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRequestAction(req.id, 'reject')}
                      disabled={processingRequest === req.id}
                      className="p-2 bg-red-600 hover:bg-red-500 rounded-full text-white"
                    >
                      <X className="w-4 h-4" />
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
