'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export default function OneSignalInitializer() {
  const { data: session } = useSession() || {}
  const initialized = useRef(false)
  const loggedInUserId = useRef<string | null>(null)

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
      } else {
        if (!loggedInUserId.current) return // already logged out
        await OneSignal.logout()
        loggedInUserId.current = null
        console.log('OneSignal user logged out')
      }
    } catch (error) {
      console.error('OneSignal user sync error:', error)
    }
  }, [])

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
        })

        initialized.current = true
        console.log('OneSignal initialized')

        // If session is already available at init time, login immediately
        if (session?.user?.id) {
          await OneSignal.login(session.user.id)
          loggedInUserId.current = session.user.id
          console.log('OneSignal user logged in:', session.user.id)
        }
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
