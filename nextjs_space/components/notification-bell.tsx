'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, X, Heart, MessageCircle, Share2, Video, CheckCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
  id: string
  type: string
  title?: string
  message: string
  fromUserName?: string
  postId?: string
  data?: string
  isRead: boolean
  createdAt: string
}

export default function NotificationBell() {
  const { data: session } = useSession() || {}
  const { language } = useLanguage()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null)

  const playNotificationSound = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (e) {
      console.log('Audio not supported')
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        if (data.notifications.length > 0) {
          const newestId = data.notifications[0].id
          if (lastNotificationId && newestId !== lastNotificationId && data.unreadCount > unreadCount) {
            playNotificationSound()
          }
          setLastNotificationId(newestId)
        }
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [session?.user, lastNotificationId, unreadCount])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark notifications:', error)
    }
  }, [unreadCount])

  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsRead()
    }
  }, [isOpen])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleNotificationClick = (notif: Notification) => {
    setIsOpen(false)
    let parsedData: any = null
    if (notif.data) {
      try { parsedData = JSON.parse(notif.data) } catch (e) {}
    }
    if (notif.type === 'session_update' || notif.type === 'session_request') {
      if (parsedData?.action === 'accept' && parsedData?.sessionId) {
        router.push(`/${language}/live-room/${parsedData.sessionId}`)
      } else if (parsedData?.sessionId) {
        router.push(`/${language}/live-room/${parsedData.sessionId}`)
      } else {
        router.push(`/${language}/dashboard`)
      }
    } else if (notif.type === 'like' || notif.type === 'comment' || notif.type === 'share' || notif.postId) {
      router.push(`/${language}/social${notif.postId ? `?postId=${notif.postId}` : ''}`)
    } else {
      router.push(`/${language}/dashboard`)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-pink-400" />
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-400" />
      case 'share': return <Share2 className="w-4 h-4 text-green-400" />
      case 'session_update': return <Video className="w-4 h-4 text-fuchsia-400" />
      case 'session_request': return <Video className="w-4 h-4 text-green-400" />
      default: return <Bell className="w-4 h-4 text-fuchsia-300" />
    }
  }

  const getNotificationText = (notif: Notification) => {
    const senderName = notif.fromUserName || (language === 'tr' ? 'Birisi' : 'Someone')
    if (notif.type === 'session_update' || notif.type === 'session_request') {
      return notif.title || notif.message
    }
    switch (notif.type) {
      case 'like': return `${senderName} ${language === 'tr' ? 'payla\u015f\u0131m\u0131n\u0131 be\u011fendi' : 'liked your post'}`
      case 'comment': return `${senderName} ${language === 'tr' ? 'yorum yapt\u0131' : 'commented on your post'}`
      case 'share': return `${senderName} ${language === 'tr' ? 'payla\u015ft\u0131' : 'shared your post'}`
      default: return notif.message
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return language === 'tr' ? '\u015eimdi' : 'Now'
    if (mins < 60) return `${mins} ${language === 'tr' ? 'dk' : 'min'}`
    if (hours < 24) return `${hours} ${language === 'tr' ? 'saat' : 'h'}`
    return `${days} ${language === 'tr' ? 'g\u00fcn' : 'd'}`
  }

  if (!session?.user) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-fuchsia-300 hover:text-fuchsia-200 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Full-screen Modal Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 md:pt-24 px-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[75vh] flex flex-col falclub-card overflow-hidden"
              style={{ boxShadow: '0 0 40px rgba(217, 70, 239, 0.3)' }}
            >
              {/* Header */}
              <div className="p-4 border-b border-fuchsia-500/20 flex justify-between items-center flex-shrink-0 bg-[#1a0a2e]/95">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-fuchsia-400" />
                  <h3 className="text-fuchsia-200 font-bold text-lg">
                    {language === 'tr' ? 'Bildirimler' : 'Notifications'}
                  </h3>
                  {unreadCount > 0 && (
                    <span className="bg-pink-500/20 text-pink-300 text-xs px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} {language === 'tr' ? 'yeni' : 'new'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-fuchsia-400/70 hover:text-fuchsia-300 transition-colors flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {language === 'tr' ? 'Okundu' : 'Read all'}
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-fuchsia-500/15 rounded-lg text-fuchsia-400/60 hover:text-fuchsia-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <Bell className="w-10 h-10 text-fuchsia-500/30 mx-auto mb-3" />
                    <p className="text-fuchsia-400/60">
                      {language === 'tr' ? 'Bildirim yok' : 'No notifications'}
                    </p>
                    <p className="text-fuchsia-500/30 text-sm mt-1">
                      {language === 'tr' ? 'Yeni bildirimler burada g\u00f6r\u00fcnecek' : 'New notifications will appear here'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-fuchsia-500/10">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-4 hover:bg-fuchsia-500/10 transition-colors cursor-pointer ${
                          !notif.isRead ? 'bg-fuchsia-500/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 p-2 bg-fuchsia-500/15 border border-fuchsia-500/20 rounded-full">
                            {getIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/90 break-words leading-relaxed">
                              {getNotificationText(notif)}
                            </p>
                            <p className="text-xs text-fuchsia-400/50 mt-1.5">
                              {formatTime(notif.createdAt)}
                            </p>
                          </div>
                          {!notif.isRead && (
                            <div className="shrink-0 w-2.5 h-2.5 bg-pink-400 rounded-full mt-1 shadow-lg shadow-pink-500/50" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
