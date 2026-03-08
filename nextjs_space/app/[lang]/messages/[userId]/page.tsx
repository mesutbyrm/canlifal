'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
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
  Phone,
  Video,
  Image as ImageIcon,
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${language}/login`)
    } else if (status === 'authenticated') {
      fetchChat()
      // Poll for new messages
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
        router.push(`/${language}/messages`)
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
      locale: language === 'tr' ? tr : enUS
    })
  }

  const formatMessageDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', {
      locale: language === 'tr' ? tr : enUS
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
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <p className="text-purple-400">
          {language === 'tr' ? 'Kullanıcı bulunamadı' : 'User not found'}
        </p>
      </div>
    )
  }

  const groupedMessages = groupMessagesByDate(messages)

  return (
    <div className="min-h-screen bg-[#0a0118] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0a0118]/95 backdrop-blur-md border-b border-purple-900/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push(`/${language}/messages`)} className="p-1">
            <ChevronLeft className="w-6 h-6 text-purple-300" />
          </button>
          <Link
            href={`/${language}/profile/${user.username || user.id}`}
            className="flex items-center gap-3 flex-1"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-900">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg text-purple-300 bg-gradient-to-br from-purple-800 to-pink-800">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-white">{user.name}</p>
              <p className="text-sm text-purple-400">@{user.username || 'user'}</p>
            </div>
          </Link>
          <button className="p-2">
            <MoreVertical className="w-5 h-5 text-purple-300" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto space-y-4">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex justify-center mb-4">
                <span className="bg-purple-900/50 text-purple-300 text-xs px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>
              {msgs.map((message) => {
                const isOwn = message.senderId === session?.user?.id
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-sm'
                          : 'bg-purple-900/50 text-purple-100 rounded-bl-sm'
                      }`}
                    >
                      {message.imageUrl && (
                        <Image
                          src={message.imageUrl}
                          alt="Image"
                          width={200}
                          height={200}
                          className="rounded-lg mb-2"
                        />
                      )}
                      <p className="break-words">{message.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-[10px] ${isOwn ? 'text-purple-200' : 'text-purple-400'}`}>
                          {formatMessageTime(message.createdAt)}
                        </span>
                        {isOwn && message.isRead && (
                          <Check className="w-3 h-3 text-purple-200" />
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
        <div className="sticky bottom-0 bg-[#0a0118] border-t border-purple-900/30 p-4">
          <div className="max-w-lg mx-auto text-center">
            <Lock className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-purple-400">
              {language === 'tr' ? 'Bu kullanıcı mesaj kabul etmiyor' : 'This user is not accepting messages'}
            </p>
          </div>
        </div>
      ) : requiresRequest && !requestSent ? (
        <div className="sticky bottom-0 bg-[#0a0118] border-t border-purple-900/30 p-4">
          <div className="max-w-lg mx-auto text-center">
            <Lock className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-purple-400 mb-3">
              {language === 'tr' ? 'Mesaj göndermek için izin istemeniz gerekiyor' : 'You need to request permission to send messages'}
            </p>
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium"
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              {language === 'tr' ? 'Mesaj İsteği Gönder' : 'Send Message Request'}
            </button>
          </div>
        </div>
      ) : requestSent ? (
        <div className="sticky bottom-0 bg-[#0a0118] border-t border-purple-900/30 p-4">
          <div className="max-w-lg mx-auto text-center">
            <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-purple-400">
              {language === 'tr' ? 'Mesaj isteğiniz gönderildi. Yanıt bekleniyor...' : 'Message request sent. Waiting for response...'}
            </p>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSendMessage}
          className="sticky bottom-0 bg-[#0a0118] border-t border-purple-900/30 p-4"
        >
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={language === 'tr' ? 'Mesaj yaz...' : 'Type a message...'}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full bg-purple-900/30 border border-purple-800 rounded-full py-3 px-4 text-white placeholder-purple-400 focus:outline-none focus:border-purple-600"
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white disabled:opacity-50"
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
              className="bg-[#0a0118] border border-purple-800 rounded-2xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">
                  {language === 'tr' ? 'Mesaj İsteği' : 'Message Request'}
                </h3>
                <button onClick={() => setShowRequestModal(false)}>
                  <X className="w-6 h-6 text-purple-400" />
                </button>
              </div>
              <p className="text-purple-300 mb-4">
                {language === 'tr'
                  ? `${user.name} sadece takipçilerinden mesaj kabul ediyor. Bir mesaj isteği gönderin.`
                  : `${user.name} only accepts messages from followers. Send a message request.`}
              </p>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value.slice(0, 200))}
                placeholder={language === 'tr' ? 'Neden mesaj göndermek istiyorsunuz? (isteğe bağlı)' : 'Why do you want to message? (optional)'}
                className="w-full bg-purple-900/30 border border-purple-700 rounded-lg px-4 py-3 text-white placeholder-purple-400 focus:outline-none focus:border-purple-500 resize-none mb-4"
                rows={3}
                maxLength={200}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-purple-300 hover:text-white"
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  onClick={handleSendRequest}
                  disabled={sending}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {language === 'tr' ? 'Gönder' : 'Send'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
