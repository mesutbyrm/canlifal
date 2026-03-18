'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export default function OneSignalInitializer() {
  const { data: session } = useSession() || {}
  const initialized = useRef(false)
  const loggedInUserId = useRef<string | null>(null)

  // Force re-subscribe: opt out then opt in to get a fresh push token
  const forceResubscribe = useCallback(async (OneSignal: any) => {
    try {
      const sub = OneSignal.User?.PushSubscription
      if (!sub) return

      // Check if we have a valid push token
      const token = sub.token
      if (token) {
        console.log('OneSignal: already has valid push token')
        return
      }

      // No token — force re-subscribe
      console.log('OneSignal: no push token, forcing re-subscribe...')
      
      // If permission is granted, force opt-out then opt-in to trigger new subscription
      if (Notification.permission === 'granted') {
        try {
          await sub.optOut?.()
          await new Promise(r => setTimeout(r, 1000))
          await sub.optIn?.()
          console.log('OneSignal: forced re-subscribe completed')
        } catch (e) {
          console.log('OneSignal: re-subscribe attempt:', e)
        }
      } else if (Notification.permission === 'default') {
        // Permission not yet asked — prompt the user
        try {
          await OneSignal.Slidedown?.promptPush?.()
          console.log('OneSignal: prompted user for push permission')
        } catch (e) {
          console.log('OneSignal: prompt skipped:', e)
        }
      }
    } catch (error) {
      console.error('OneSignal forceResubscribe error:', error)
    }
  }, [])

  // Sync user login/logout with OneSignal
  const syncUser = useCallback(async (userId: string | undefined | null) => {
    if (!initialized.current) return
    try {
      const OneSignalModule = await import('react-onesignal')
      const OneSignal = OneSignalModule.default

      if (userId) {
        if (loggedInUserId.current === userId) return // already logged in
        await OneSignal.login(userId)
        loggedInUserId.current = userId
        console.log('OneSignal user logged in:', userId)

        // After login, ensure push subscription is active
        setTimeout(() => forceResubscribe(OneSignal), 2000)
      } else {
        if (!loggedInUserId.current) return // already logged out
        await OneSignal.logout()
        loggedInUserId.current = null
        console.log('OneSignal user logged out')
      }
    } catch (error) {
      console.error('OneSignal user sync error:', error)
    }
  }, [forceResubscribe])

  // Initialize OneSignal SDK once
  useEffect(() => {
    if (initialized.current) return
    if (typeof window === 'undefined') return

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    if (!appId) {
      console.warn('OneSignal App ID not configured')
      return
    }

    const initOneSignal = async () => {
      try {
        const OneSignalModule = await import('react-onesignal')
        const OneSignal = OneSignalModule.default

        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
          serviceWorkerParam: { scope: '/' },
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          // @ts-ignore - notifyButton types are overly strict in react-onesignal
          notifyButton: { enable: false },
        })

        initialized.current = true
        console.log('OneSignal initialized')

        // If session is already available at init time, login immediately
        if (session?.user?.id) {
          await OneSignal.login(session.user.id)
          loggedInUserId.current = session.user.id
          console.log('OneSignal user logged in:', session.user.id)
        }

        // After init, try to establish push subscription
        setTimeout(() => forceResubscribe(OneSignal), 3000)
      } catch (error) {
        console.error('OneSignal initialization error:', error)
      }
    }

    // Delay initialization to avoid interfering with page load
    const timer = setTimeout(initOneSignal, 3000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-sync user when session changes (handles login/logout after init)
  useEffect(() => {
    syncUser(session?.user?.id)
  }, [session?.user?.id, syncUser])

  return null
}
