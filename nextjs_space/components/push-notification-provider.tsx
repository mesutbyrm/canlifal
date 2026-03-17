'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import {
  isPushSupported,
  getPermissionStatus,
  requestNotificationPermission,
  showBrowserNotification,
  playNotificationSound
} from '@/lib/push-notifications'

interface PushNotificationContextType {
  isSupported: boolean
  permission: NotificationPermission | 'unsupported'
  requestPermission: () => Promise<void>
  unreadCount: number
}

const PushNotificationContext = createContext<PushNotificationContextType>({
  isSupported: false,
  permission: 'unsupported',
  requestPermission: async () => {},
  unreadCount: 0
})

export const usePushNotifications = () => useContext(PushNotificationContext)

interface Notification {
  id: string
  type: string
  title?: string
  message: string
  fromUserName?: string
  isRead: boolean
  createdAt: string
}

export default function PushNotificationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession() || {}
  const { language } = useLanguage()
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null)

  // Initialize on mount - no service worker registration here, OneSignal handles its own
  useEffect(() => {
    const supported = isPushSupported()
    setIsSupported(supported)
    
    if (supported) {
      setPermission(getPermissionStatus())
    }
  }, [])

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
  }, [])

  // Get notification title based on type
  const getNotificationTitle = useCallback((notif: Notification): string => {
    if (notif.title) return notif.title
    
    const titles: Record<string, string> = {
      'like': language === 'tr' ? '❤️ Yeni Beğeni' : '❤️ New Like',
      'comment': language === 'tr' ? '💬 Yeni Yorum' : '💬 New Comment',
      'share': language === 'tr' ? '🔄 Paylaşıldı' : '🔄 Shared',
      'session_request': language === 'tr' ? '🔮 Yeni Seans Talebi' : '🔮 New Session Request',
      'session_update': language === 'tr' ? '📺 Seans Güncellendi' : '📺 Session Updated',
      'payment_notification': language === 'tr' ? '💰 Ödeme Bildirimi' : '💰 Payment Notification',
      'payment_approved': language === 'tr' ? '✅ Ödeme Onaylandı' : '✅ Payment Approved',
      'payment_rejected': language === 'tr' ? '❌ Ödeme Reddedildi' : '❌ Payment Rejected',
      'gift': language === 'tr' ? '🎁 Yeni Hediye' : '🎁 New Gift',
      'follow': language === 'tr' ? '👤 Yeni Takipçi' : '👤 New Follower'
    }
    
    return titles[notif.type] || (language === 'tr' ? '🔔 Yeni Bildirim' : '🔔 New Notification')
  }, [language])

  // Get notification URL based on type
  const getNotificationUrl = useCallback((notif: Notification): string => {
    if (notif.type === 'payment_notification' || notif.type === 'payment_approved' || notif.type === 'payment_rejected') {
      return session?.user?.role === 'admin' ? `/admin/credits` : `/memberships`
    }
    if (notif.type === 'session_request' || notif.type === 'session_update') {
      return `/dashboard`
    }
    if (notif.type === 'like' || notif.type === 'comment' || notif.type === 'share') {
      return `/social`
    }
    return `/dashboard`
  }, [language, session?.user?.role])

  // Poll for notifications and show browser notification for new ones
  useEffect(() => {
    if (!session?.user) return
    
    const checkNotifications = async () => {
      try {
        const res = await fetch('/api/notifications')
        if (!res.ok) return
        
        const data = await res.json()
        const newUnreadCount = data.unreadCount || 0
        const notifications: Notification[] = data.notifications || []
        
        // Check if there are new notifications
        if (notifications.length > 0) {
          const newestNotif = notifications[0]
          const newNotificationsCount = newUnreadCount - unreadCount
          
          // Only show notification if it's truly new
          if (lastNotificationId && newestNotif.id !== lastNotificationId && newNotificationsCount > 0) {
            // Play sound
            playNotificationSound()
            
            // Show browser notification if permission granted
            if (permission === 'granted') {
              const title = getNotificationTitle(newestNotif)
              const body = newestNotif.message
              const url = getNotificationUrl(newestNotif)
              
              showBrowserNotification(title, body, {
                tag: `falclub-${newestNotif.type}`,
                url,
                count: newNotificationsCount
              })
            }
          }
          
          setLastNotificationId(newestNotif.id)
        }
        
        setUnreadCount(newUnreadCount)
      } catch (error) {
        console.error('Error checking notifications:', error)
      }
    }
    
    // Initial check
    checkNotifications()
    
    // Poll every 15 seconds
    const interval = setInterval(checkNotifications, 15000)
    
    return () => clearInterval(interval)
  }, [session?.user, permission, lastNotificationId, unreadCount, getNotificationTitle, getNotificationUrl])

  return (
    <PushNotificationContext.Provider value={{ isSupported, permission, requestPermission, unreadCount }}>
      {children}
    </PushNotificationContext.Provider>
  )
}
