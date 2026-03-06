'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, X, Heart, MessageCircle, Share2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
  id: string
  type: 'like' | 'comment' | 'share'
  message: string
  fromUserName?: string
  postId?: string
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
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Play notification sound using Web Audio API
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
        
        // Check for new notifications and play sound
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
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30 seconds
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

  // Mark all as read when dropdown opens
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsRead()
    }
  }, [isOpen])

  const handleNotificationClick = (notif: Notification) => {
    setIsOpen(false)
    if (notif.postId) {
      router.push(`/${language}/social?postId=${notif.postId}`)
    } else {
      router.push(`/${language}/social`)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-400" />
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-400" />
      case 'share': return <Share2 className="w-4 h-4 text-green-400" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return language === 'tr' ? 'Şimdi' : 'Now'
    if (mins < 60) return `${mins} ${language === 'tr' ? 'dk' : 'min'}`
    if (hours < 24) return `${hours} ${language === 'tr' ? 'saat' : 'h'}`
    return `${days} ${language === 'tr' ? 'gün' : 'd'}`
  }

  if (!session?.user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-purple-300 hover:text-gold-400 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-[#1a0b2e] border border-purple-500/30 rounded-xl shadow-2xl z-50"
            >
              <div className="p-3 border-b border-purple-500/20 flex justify-between items-center">
                <h3 className="text-gold-400 font-semibold">
                  {language === 'tr' ? 'Bildirimler' : 'Notifications'}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-purple-400 hover:text-gold-400"
                  >
                    {language === 'tr' ? 'Tümünü okundu işaretle' : 'Mark all read'}
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="p-6 text-center text-purple-400">
                  {language === 'tr' ? 'Bildirim yok' : 'No notifications'}
                </div>
              ) : (
                <div className="divide-y divide-purple-500/10">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 hover:bg-purple-500/10 transition-colors cursor-pointer ${
                        !notif.isRead ? 'bg-purple-500/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-full">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">
                            <span className="font-semibold text-gold-400">
                              {notif.fromUserName || 'Birisi'}
                            </span>
                            {' '}
                            {notif.type === 'like' && (language === 'tr' ? 'paylaşımını beğendi' : 'liked your post')}
                            {notif.type === 'comment' && (language === 'tr' ? 'yorum yaptı' : 'commented')}
                            {notif.type === 'share' && (language === 'tr' ? 'paylaştı' : 'shared')}
                          </p>
                          <p className="text-xs text-purple-400 mt-1">
                            {formatTime(notif.createdAt)}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <div className="w-2 h-2 bg-gold-400 rounded-full" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
