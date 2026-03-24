'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  User,
  Circle,
  Loader2,
  X,
  Check,
  CheckCheck
} from 'lucide-react'

interface Message {
  id: string
  senderId: string
  senderType: string
  content: string
  messageType: string
  imageUrl: string | null
  isRead: boolean
  createdAt: string
}

interface ChatData {
  chatSession: {
    id: string
    status: string
    userId: string
    tellerId: string
    liveSession: {
      id: string
      fortuneType: string
      status: string
      user: { id: string; name: string | null; image: string | null }
      teller: { id: string; userId: string; displayName: string; avatar: string | null; isOnline: boolean }
    }
  }
  messages: Message[]
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession() || {}
  const { language } = useLanguage()
  const sessionId = params?.sessionId as string

  const [chatData, setChatData] = useState<ChatData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isTeller = chatData?.chatSession.liveSession.teller.userId === session?.user?.id

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push(`/giris`)
      return
    }
    fetchChatData()
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchChatData, 3000)
    return () => clearInterval(interval)
  }, [session, status, sessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchChatData = async () => {
    try {
      const res = await fetch(`/api/teller-chat/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setChatData(data)
        setMessages(data.messages)
      } else if (res.status === 404) {
        router.push(`/falci-sohbet`)
      }
    } catch (err) {
      console.error('Fetch chat error:', err)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/teller-chat/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageText })
      })

      if (res.ok) {
        const newMessage = await res.json()
        setMessages(prev => [...prev, newMessage])
        setMessageText('')
      }
    } catch (err) {
      console.error('Send message error:', err)
    } finally {
      setSending(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      // Get presigned URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: true
        })
      })

      if (!presignedRes.ok) throw new Error('Failed to get upload URL')

      const { uploadUrl, cloud_storage_path } = await presignedRes.json()

      // Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })

      // Get public URL
      const urlRes = await fetch('/api/upload/get-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, isPublic: true })
      })

      if (!urlRes.ok) throw new Error('Failed to get file URL')
      const { url: imageUrl } = await urlRes.json()

      // Send message with image
      const res = await fetch(`/api/teller-chat/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '',
          messageType: 'image',
          imageUrl
        })
      })

      if (res.ok) {
        const newMessage = await res.json()
        setMessages(prev => [...prev, newMessage])
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  if (!chatData) return null

  const otherPartyUser = chatData.chatSession.liveSession.user
  const otherPartyTeller = chatData.chatSession.liveSession.teller
  const isClosed = chatData.chatSession.status === 'closed'

  return (
    <div className="min-h-screen  flex flex-col">
      {/* Header */}
      <div className="bg-deep-purple-900/80 backdrop-blur-sm border-b border-purple-500/20 p-4 sticky top-16 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href={`/falci-sohbet`}
            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-purple-400" />
          </Link>

          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden">
              {(isTeller ? otherPartyUser.image : otherPartyTeller.avatar) ? (
                <img
                  src={isTeller ? otherPartyUser.image || '' : otherPartyTeller.avatar || ''}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-white/70" />
              )}
            </div>
            {!isTeller && otherPartyTeller.isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-deep-purple-900" />
            )}
          </div>

          <div className="flex-1">
            <h2 className="font-semibold text-white">
              {isTeller ? otherPartyUser.name : otherPartyTeller.displayName}
            </h2>
            <p className="text-sm text-purple-400 flex items-center gap-1">
              {!isTeller && (
                <>
                  <Circle className={`w-2 h-2 fill-current ${
                    otherPartyTeller.isOnline ? 'text-green-400' : 'text-gray-500'
                  }`} />
                  {otherPartyTeller.isOnline
                    ? ('Çevrimiçi')
                    : ('Çevrimdışı')}
                </>
              )}
            </p>
          </div>

          {isClosed && (
            <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-sm rounded-full">
              {'Sohbet Kapandı'}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-purple-400">
              {'Henüz mesaj yok. Sohbete başlayın!'}
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.senderId === session?.user?.id
              const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {showAvatar ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {isMe ? (
                        session?.user?.image ? (
                          <img loading="lazy" src={session.user.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-white/70" />
                        )
                      ) : (
                        (isTeller ? otherPartyUser.image : otherPartyTeller.avatar) ? (
                          <img
                            src={isTeller ? otherPartyUser.image || '' : otherPartyTeller.avatar || ''}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-white/70" />
                        )
                      )}
                    </div>
                  ) : (
                    <div className="w-8 flex-shrink-0" />
                  )}

                  <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {msg.messageType === 'image' && msg.imageUrl ? (
                      <div className={`rounded-2xl overflow-hidden border ${
                        isMe ? 'bg-purple-600 border-purple-500' : 'bg-deep-purple-800 border-purple-500/30'
                      }`}>
                        <img
                          src={msg.imageUrl}
                          alt=""
                          className="max-w-full max-h-80 object-contain"
                        />
                      </div>
                    ) : (
                      <div className={`px-4 py-2 rounded-2xl ${
                        isMe
                          ? 'bg-purple-600 text-white rounded-br-sm'
                          : 'bg-deep-purple-800 text-purple-100 border border-purple-500/30 rounded-bl-sm'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    )}
                    <div className={`flex items-center gap-1 mt-1 text-xs text-purple-500 ${isMe ? 'justify-end' : ''}`}>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {isMe && (
                        msg.isRead ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      {!isClosed ? (
        <div className="bg-deep-purple-900/80 backdrop-blur-sm border-t border-purple-500/20 p-4">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="p-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-full transition-colors disabled:opacity-50"
            >
              {uploadingImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5" />
              )}
            </button>

            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={'Mesajınız...'}
              className="flex-1 px-4 py-3 bg-deep-purple-800/50 border border-purple-500/30 rounded-full text-white placeholder-purple-400 focus:outline-none focus:border-purple-500"
            />

            <button
              type="submit"
              disabled={!messageText.trim() || sending}
              className="p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-full transition-colors disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-deep-purple-900/80 backdrop-blur-sm border-t border-purple-500/20 p-4">
          <p className="text-center text-purple-400">
            {'Bu sohbet tamamlanmıştır.'}
          </p>
        </div>
      )}
    </div>
  )
}
