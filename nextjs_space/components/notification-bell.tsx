'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, X, Heart, MessageCircle, Share2, Video, CheckCircle, CreditCard, Coins, BellRing, BellOff, Eye } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
interface Notification {
  id: string
  type: string
  title?: string
  message: string
  fromUserId?: string
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
  // Browser notification status (read-only, OneSignal handles the actual push)
  const isSupported = typeof window !== 'undefined' && 'Notification' in window
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  useEffect(() => {
    if (isSupported) setPermission(Notification.permission)
  }, [])
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

  const handleEnableNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const result = await Notification.requestPermission()
      setPermission(result)
    }
  }

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
  }, [])

  // When notification panel opens, immediately clear badge and mark all as read
  const prevIsOpenRef = useRef(false)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current && unreadCount > 0) {
      setUnreadCount(0) // Instantly remove badge
      markAllAsRead()   // Persist to server
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen, unreadCount, markAllAsRead])

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
    // Payment notifications - navigate to admin credits page
    if (notif.type === 'payment_notification' || notif.type === 'payment_approved' || notif.type === 'payment_rejected') {
      // Admin goes to credits management, user goes to memberships
      if (session?.user?.role === 'admin') {
        router.push(`/admin/credits`)
      } else {
        router.push(`/uyelik`)
      }
    } else if (notif.type === 'session_update' || notif.type === 'session_request') {
      if (parsedData?.action === 'accept' && parsedData?.sessionId) {
        router.push(`/canli-oda/${parsedData.sessionId}`)
      } else if (parsedData?.sessionId) {
        router.push(`/canli-oda/${parsedData.sessionId}`)
      } else {
        router.push(`/panel`)
      }
    } else if (notif.type === 'stream_live' || notif.type === 'stream_start') {
      const streamId = parsedData?.streamId
      if (streamId) {
        router.push(`/sohbet/video?stream=${streamId}`)
      } else {
        router.push(`/sohbet/video`)
      }
    } else if (notif.type === 'profile_view' && notif.fromUserId) {
      router.push(`/profil/${notif.fromUserId}`)
    } else if (notif.type === 'like' || notif.type === 'comment' || notif.type === 'share' || notif.postId) {
      router.push(`/sosyal${notif.postId ? `?postId=${notif.postId}` : ''}`)
    } else {
      router.push(`/panel`)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-pink-400" />
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-400" />
      case 'share': return <Share2 className="w-4 h-4 text-green-400" />
      case 'session_update': return <Video className="w-4 h-4 text-fuchsia-400" />
      case 'session_request': return <Video className="w-4 h-4 text-green-400" />
      case 'payment_notification': return <CreditCard className="w-4 h-4 text-yellow-400" />
      case 'payment_approved': return <Coins className="w-4 h-4 text-green-400" />
      case 'payment_rejected': return <CreditCard className="w-4 h-4 text-red-400" />
      case 'profile_view': return <Eye className="w-4 h-4 text-cyan-400" />
      case 'stream_live': case 'stream_start': return <Video className="w-4 h-4 text-red-400" />
      default: return <Bell className="w-4 h-4 text-fuchsia-300" />
    }
  }

  const getNotificationText = (notif: Notification) => {
    const senderName = notif.fromUserName || ('Birisi')
    if (notif.type === 'session_update' || notif.type === 'session_request') {
      return notif.title || notif.message
    }
    switch (notif.type) {
      case 'like': return `${senderName} paylaşımını beğendi`
      case 'comment': return `${senderName} yorum yaptı`
      case 'share': return `${senderName} paylaştı`
      case 'follow': return `${senderName} seni takip etmeye başladı`
      case 'unfollow': return `${senderName} seni takipten çıktı`
      case 'profile_view': return `${senderName} profilini görüntüledi`
      case 'message': return `${senderName} sana mesaj gönderdi`
      case 'stream_start': case 'stream_live': return `${senderName} canlı yayın başlattı`
      case 'gift': case 'gift_received': return `${senderName} ${notif.message || 'hediye gönderdi'}`
      default: return notif.fromUserName ? `${senderName} ${notif.message}` : notif.message
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Şimdi'
    if (mins < 60) return `${mins} ${'dk'}`
    if (hours < 24) return `${hours} ${'saat'}`
    return `${days} ${'gün'}`
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
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm max-h-[60vh] flex flex-col falclub-card overflow-hidden rounded-2xl"
              style={{ boxShadow: '0 0 40px rgba(217, 70, 239, 0.3)' }}
            >
              {/* Header */}
              <div className="px-3 py-2.5 border-b border-fuchsia-500/20 flex justify-between items-center flex-shrink-0 bg-[#1a0a2e]/95">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-fuchsia-400" />
                  <h3 className="text-fuchsia-200 font-bold text-sm">
                    {'Bildirimler'}
                  </h3>
                  {unreadCount > 0 && (
                    <span className="bg-pink-500/20 text-pink-300 text-xs px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} {'yeni'}
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
                      {'Okundu'}
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
              
              {/* Browser Notification Toggle */}
              {isSupported && permission !== 'granted' && (
                <div className="px-3 py-2 border-b border-fuchsia-500/20 bg-fuchsia-900/20">
                  {permission === 'denied' ? (
                    <div className="flex items-center gap-2 text-red-400">
                      <BellOff className="w-3.5 h-3.5" />
                      <span className="text-xs">Bildirimler kapalı</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleEnableNotifications}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 rounded-lg text-white text-xs font-medium transition-all"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      Bildirimleri Aç
                    </button>
                  )}
                </div>
              )}

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <Bell className="w-10 h-10 text-fuchsia-500/30 mx-auto mb-3" />
                    <p className="text-fuchsia-400/60">
                      {'Bildirim yok'}
                    </p>
                    <p className="text-fuchsia-500/30 text-sm mt-1">
                      {'Yeni bildirimler burada görünecek'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-fuchsia-500/10">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`px-3 py-2.5 hover:bg-fuchsia-500/10 transition-colors cursor-pointer ${
                          !notif.isRead ? 'bg-fuchsia-500/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="shrink-0 p-1.5 bg-fuchsia-500/15 border border-fuchsia-500/20 rounded-full">
                            {getIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/90 break-words leading-snug line-clamp-2">
                              {getNotificationText(notif)}
                            </p>
                            <p className="text-[10px] text-fuchsia-400/50 mt-0.5">
                              {formatTime(notif.createdAt)}
                            </p>
                          </div>
                          {!notif.isRead && (
                            <div className="shrink-0 w-2 h-2 bg-pink-400 rounded-full shadow-lg shadow-pink-500/50" />
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
