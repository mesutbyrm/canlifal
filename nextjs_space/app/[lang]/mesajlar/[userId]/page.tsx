'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronLeft,
  Send,
  Loader2,
  Lock,
  UserPlus,
  MoreVertical,
  X,
  Check
} from 'lucide-react'
import { format } from 'date-fns'
import { tr, enUS } from 'date-fns/locale'

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  imageUrl: string | null
  isRead: boolean
  createdAt: string
}

interface ChatUser {
  id: string
  name: string
  username: string | null
  image: string | null
  messagePrivacy: string
}

export default function ChatPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const userId = params.userId as string

  const [user, setUser] = useState<ChatUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [canMessage, setCanMessage] = useState(true)
  const [requiresRequest, setRequiresRequest] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isFalclub = theme === 'falclub'
  const isFalci = theme === 'falci'
  const isCosmic = theme === 'cosmic'

  // Theme colors
  const bgColor = isFalclub ? 'bg-[#0f0520]' : isFalci ? 'bg-[#1a0a2e]' : isCosmic ? 'bg-[#0a1628]' : 'bg-[#0a0118]'
  const headerBg = isFalclub ? 'bg-[#0f0520]/95' : isFalci ? 'bg-[#1a0a2e]/95' : isCosmic ? 'bg-[#0a1628]/95' : 'bg-[#0a0118]/95'
  const borderColor = isFalclub ? 'border-fuchsia-900/30' : isFalci ? 'border-indigo-900/30' : isCosmic ? 'border-blue-900/30' : 'border-purple-900/30'
  const accentColor = isFalclub ? 'text-fuchsia-300' : isFalci ? 'text-indigo-300' : isCosmic ? 'text-blue-300' : 'text-purple-300'
  const inputBg = isFalclub ? 'bg-fuchsia-900/30 border-fuchsia-700/50' : isFalci ? 'bg-indigo-900/30 border-indigo-700/50' : isCosmic ? 'bg-blue-900/30 border-blue-700/50' : 'bg-purple-900/30 border-purple-800'
  const myMsgBg = isFalclub ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600' : isFalci ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : isCosmic ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-gradient-to-r from-purple-600 to-pink-600'
  const otherMsgBg = isFalclub ? 'bg-fuchsia-900/40' : isFalci ? 'bg-indigo-900/40' : isCosmic ? 'bg-blue-900/40' : 'bg-purple-900/50'
  const sendBtnBg = isFalclub ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600' : isFalci ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : isCosmic ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-gradient-to-r from-purple-600 to-pink-600'
  const avatarGradient = isFalclub ? 'from-fuchsia-800 to-pink-800' : isFalci ? 'from-indigo-800 to-purple-800' : isCosmic ? 'from-blue-800 to-cyan-800' : 'from-purple-800 to-pink-800'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/giris`)
    } else if (status === 'authenticated') {
      fetchChat()
      pollIntervalRef.current = setInterval(fetchChat, 3000)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [status, userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchChat = async () => {
    try {
      const res = await fetch(`/api/messages/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setMessages(data.messages)
        setCanMessage(data.canMessage)
        setRequiresRequest(data.requiresRequest)
      } else if (res.status === 404) {
        router.push(`/mesajlar`)
      }
    } catch (error) {
      console.error('Error fetching chat:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/messages/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
      } else {
        const error = await res.json()
        if (error.error === 'Message request required') {
          setShowRequestModal(true)
        } else {
          alert(error.error)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleSendRequest = async () => {
    setSending(true)
    try {
      const res = await fetch('/api/messages/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: userId,
          message: requestMessage
        })
      })

      if (res.ok) {
        setRequestSent(true)
        setShowRequestModal(false)
        setRequiresRequest(true)
      } else {
        const error = await res.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Error sending request:', error)
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (date: string) => {
    return format(new Date(date), 'HH:mm', {
      locale: tr
    })
  }

  const formatMessageDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', {
      locale: tr
    })
  }

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {}
    messages.forEach(msg => {
      const date = formatMessageDate(msg.createdAt)
      if (!groups[date]) groups[date] = []
      groups[date].push(msg)
    })
    return groups
  }

  if (loading || status === 'loading') {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <Loader2 className={`w-8 h-8 ${accentColor} animate-spin`} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <p className="text-white/70">
          {'Kullanıcı bulunamadı'}
        </p>
      </div>
    )
  }

  const groupedMessages = groupMessagesByDate(messages)

  return (
    <div className={`h-screen ${bgColor} flex flex-col overflow-hidden pt-[60px]`}>
      {/* Header - compact */}
      <div className={`flex-shrink-0 ${headerBg} backdrop-blur-sm ${borderColor} border-b z-40`}>
        <div className="max-w-lg mx-auto px-3 py-2 flex items-center gap-2">
          <button onClick={() => router.push(`/mesajlar`)} className="p-1">
            <ChevronLeft className="w-5 h-5 text-white/80" />
          </button>
          <Link
            href={`/profil/${user.username || user.id}`}
            className="flex items-center gap-2 flex-1"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-sm text-white bg-gradient-to-br ${avatarGradient}`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{user.name}</p>
              <p className="text-xs text-white/50">@{user.username || 'user'}</p>
            </div>
          </Link>
          <button className="p-1">
            <MoreVertical className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* Messages - sender LEFT, other RIGHT */}
      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        <div className="max-w-lg mx-auto space-y-3">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex justify-center mb-3">
                <span className={`${otherMsgBg} text-white/70 text-[10px] px-2.5 py-0.5 rounded-full`}>
                  {date}
                </span>
              </div>
              {msgs.map((message) => {
                const isOwn = message.senderId === session?.user?.id
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl ${
                        isOwn
                          ? `${myMsgBg} text-white rounded-br-sm`
                          : `${otherMsgBg} text-white/90 rounded-bl-sm`
                      }`}
                    >
                      {message.imageUrl && (
                        <Image
                          src={message.imageUrl}
                          alt="Image"
                          width={200}
                          height={200}
                          className="rounded-lg mb-1.5"
                        />
                      )}
                      <p className="break-words text-sm">{message.content}</p>
                      <div className={`flex items-center gap-1 mt-0.5 justify-end`}>
                        <span className="text-[10px] text-white/60">
                          {formatMessageTime(message.createdAt)}
                        </span>
                        {isOwn && message.isRead && (
                          <Check className="w-3 h-3 text-white/60" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input or Restriction */}
      {!canMessage ? (
        <div className={`flex-shrink-0 ${headerBg} ${borderColor} border-t p-3`}>
          <div className="max-w-lg mx-auto text-center">
            <Lock className={`w-6 h-6 ${accentColor} mx-auto mb-1`} />
            <p className="text-white/70 text-sm">
              {'Bu kullanıcı mesaj kabul etmiyor'}
            </p>
          </div>
        </div>
      ) : requiresRequest && !requestSent ? (
        <div className={`flex-shrink-0 ${headerBg} ${borderColor} border-t p-3`}>
          <div className="max-w-lg mx-auto text-center">
            <Lock className={`w-6 h-6 ${accentColor} mx-auto mb-1`} />
            <p className="text-white/70 text-sm mb-2">
              {'Mesaj göndermek için izin istemeniz gerekiyor'}
            </p>
            <button
              onClick={() => setShowRequestModal(true)}
              className={`px-5 py-1.5 ${sendBtnBg} text-white rounded-full text-sm font-medium`}
            >
              <UserPlus className="w-3.5 h-3.5 inline mr-1.5" />
              {'Mesaj İsteği Gönder'}
            </button>
          </div>
        </div>
      ) : requestSent ? (
        <div className={`flex-shrink-0 ${headerBg} ${borderColor} border-t p-3`}>
          <div className="max-w-lg mx-auto text-center">
            <Check className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-white/70 text-sm">
              {'Mesaj isteğiniz gönderildi. Yanıt bekleniyor...'}
            </p>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSendMessage}
          className={`flex-shrink-0 ${headerBg} ${borderColor} border-t p-2`}
        >
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={'Mesaj yaz...'}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className={`w-full ${inputBg} border rounded-full py-2.5 px-4 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50`}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className={`p-2.5 ${sendBtnBg} rounded-full text-white disabled:opacity-50`}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      )}

      {/* Message Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowRequestModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${bgColor} ${borderColor} border rounded-2xl p-5 max-w-md w-full`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white">
                  {'Mesaj İsteği'}
                </h3>
                <button onClick={() => setShowRequestModal(false)}>
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
              <p className="text-white/70 text-sm mb-3">
                {`${user.name} sadece takipçilerinden mesaj kabul ediyor. Bir mesaj isteği gönderin.`}
              </p>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value.slice(0, 200))}
                placeholder={'Neden mesaj göndermek istiyorsunuz? (isteğe bağlı)'}
                className={`w-full ${inputBg} border rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 resize-none mb-3`}
                rows={3}
                maxLength={200}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="px-3 py-1.5 text-white/60 hover:text-white text-sm"
                >
                  {'İptal'}
                </button>
                <button
                  onClick={handleSendRequest}
                  disabled={sending}
                  className={`px-5 py-1.5 ${sendBtnBg} text-white rounded-lg text-sm font-medium flex items-center gap-1.5`}
                >
                  {sending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {'Gönder'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
