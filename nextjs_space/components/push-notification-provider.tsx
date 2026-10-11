'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  isPushSupported,
  getPermissionStatus,
  requestNotificationPermission
} from '@/lib/push-notifications'

interface PushNotificationContextType {
  isSupported: boolean
  permission: NotificationPermission | 'unsupported'
  requestPermission: () => Promise<void>
}

const PushNotificationContext = createContext<PushNotificationContextType>({
  isSupported: false,
  permission: 'unsupported',
  requestPermission: async () => {},
})

export const usePushNotifications = () => useContext(PushNotificationContext)

export default function PushNotificationProvider({ children }: { children: ReactNode }) {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')

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

  return (
    <PushNotificationContext.Provider value={{ isSupported, permission, requestPermission }}>
      {children}
    </PushNotificationContext.Provider>
  )
}
