'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  MessageCircle,
  User,
  Clock,
  Circle,
  Loader2,
  ArrowRight,
  Inbox
} from 'lucide-react'

interface ChatSession {
  id: string
  status: string
  createdAt: string
  unreadCount: number
  liveSession: {
    fortuneType: string
    status: string
    user?: { id: string; name: string | null; image: string | null }
    teller?: { id: string; displayName: string; avatar: string | null; isOnline: boolean }
  }
  messages: Array<{ content: string; createdAt: string }>
}

const FORTUNE_TYPE_NAMES: Record<string, { tr: string; en: string }> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Reading' },
  tarot: { tr: 'Tarot', en: 'Tarot Reading' },
  astrology: { tr: 'Astroloji', en: 'Astrology' },
  palmistry: { tr: 'El Falı', en: 'Palm Reading' },
  numerology: { tr: 'Numeroloji', en: 'Numerology' },
  general: { tr: 'Genel', en: 'General' }
}

export default function TellerChatListPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [isTeller, setIsTeller] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push(`/login`)
      return
    }
    checkTellerStatus()
  }, [session, status])

  const checkTellerStatus = async () => {
    try {
      const res = await fetch('/api/fortune-tellers/my-profile')
      if (res.ok) {
        setIsTeller(true)
        fetchSessions('teller')
      } else {
        fetchSessions('user')
      }
    } catch {
      fetchSessions('user')
    }
  }

  const fetchSessions = async (role: string) => {
    try {
      const res = await fetch(`/api/teller-chat?role=${role}`)
      if (res.ok) {
        const data = await res.json()
        setChatSessions(data)
      }
    } catch (err) {
      console.error('Fetch sessions error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  const activeSessions = chatSessions.filter(s => s.status === 'active')
  const closedSessions = chatSessions.filter(s => s.status === 'closed')

  return (
    <div className="min-h-screen bg-[#0a0118] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-purple-400" />
            {language === 'tr' ? 'Sohbetlerim' : 'My Chats'}
          </h1>
          <p className="text-purple-300 mt-2">
            {isTeller
              ? (language === 'tr' ? 'Müşterilerinizle sohbetleriniz' : 'Your chats with clients')
              : (language === 'tr' ? 'Falcılarla sohbetleriniz' : 'Your chats with fortune tellers')}
          </p>
        </motion.div>

        {chatSessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Inbox className="w-16 h-16 text-purple-500/50 mx-auto mb-4" />
            <p className="text-purple-400 text-lg">
              {language === 'tr' ? 'Henüz sohbetiniz yok' : 'No chats yet'}
            </p>
            {!isTeller && (
              <Link
                href={`/live-tellers`}
                className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                {language === 'tr' ? 'Falcılara Göz At' : 'Browse Fortune Tellers'}
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Circle className="w-3 h-3 text-green-500 fill-green-500" />
                  {language === 'tr' ? 'Aktif Sohbetler' : 'Active Chats'}
                </h2>
                <div className="space-y-3">
                  {activeSessions.map((chat, index) => (
                    <ChatSessionCard
                      key={chat.id}
                      chat={chat}
                      isTeller={isTeller}
                      language={language}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Closed Sessions */}
            {closedSessions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Circle className="w-3 h-3 text-gray-500" />
                  {language === 'tr' ? 'Tamamlanan Sohbetler' : 'Completed Chats'}
                </h2>
                <div className="space-y-3">
                  {closedSessions.map((chat, index) => (
                    <ChatSessionCard
                      key={chat.id}
                      chat={chat}
                      isTeller={isTeller}
                      language={language}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ChatSessionCard({
  chat,
  isTeller,
  language,
  index
}: {
  chat: ChatSession
  isTeller: boolean
  language: string
  index: number
}) {
  const otherParty = isTeller ? chat.liveSession.user : chat.liveSession.teller
  const lastMessage = chat.messages[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/teller-chat/${chat.id}`}
        className="block bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-xl border border-purple-500/20 p-4 hover:border-purple-500/40 transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden">
              {(isTeller ? chat.liveSession.user?.image : chat.liveSession.teller?.avatar) ? (
                <img
                  src={isTeller ? chat.liveSession.user?.image || '' : chat.liveSession.teller?.avatar || ''}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-7 h-7 text-white/70" />
              )}
            </div>
            {!isTeller && chat.liveSession.teller?.isOnline && (
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-deep-purple-900" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white truncate">
                {isTeller ? (chat.liveSession.user?.name || 'User') : (chat.liveSession.teller?.displayName || 'Teller')}
              </h3>
              {chat.unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                  {chat.unreadCount}
                </span>
              )}
            </div>
            <p className="text-sm text-purple-400">
              {FORTUNE_TYPE_NAMES[chat.liveSession.fortuneType]?.[language as 'tr' | 'en'] || chat.liveSession.fortuneType}
            </p>
            {lastMessage && (
              <p className="text-sm text-purple-300 truncate mt-1">
                {lastMessage.content || '📷 Resim'}
              </p>
            )}
          </div>

          <div className="text-right">
            <span className={`text-xs px-2 py-1 rounded-full ${
              chat.status === 'active'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {chat.status === 'active'
                ? (language === 'tr' ? 'Aktif' : 'Active')
                : (language === 'tr' ? 'Tamamlandı' : 'Completed')}
            </span>
            <p className="text-xs text-purple-500 mt-1 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3" />
              {new Date(chat.createdAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
