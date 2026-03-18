'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import {
  isPushSupported,
  getPermissionStatus,
  requestNotificationPermission
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

export default function PushNotificationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession() || {}
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [unreadCount, setUnreadCount] = useState(0)

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

  // Poll for unread count only — push notifications are handled by OneSignal
  useEffect(() => {
    if (!session?.user) return
    
    const checkNotifications = async () => {
      try {
        const res = await fetch('/api/notifications')
        if (!res.ok) return
        
        const data = await res.json()
        setUnreadCount(data.unreadCount || 0)
      } catch (error) {
        console.error('Error checking notifications:', error)
      }
    }
    
    // Initial check
    checkNotifications()
    
    // Poll every 15 seconds
    const interval = setInterval(checkNotifications, 15000)
    
    return () => clearInterval(interval)
  }, [session?.user])

  return (
    <PushNotificationContext.Provider value={{ isSupported, permission, requestPermission, unreadCount }}>
      {children}
    </PushNotificationContext.Provider>
  )
}
