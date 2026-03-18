'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>
    OneSignal?: any
    __onesignal_init_started?: boolean
  }
}

export default function OneSignalInitializer() {
  const { data: session } = useSession() || {}
  const initialized = useRef(false)
  const loggedInUserId = useRef<string | null>(null)

  const getOneSignal = useCallback((): any | null => {
    if (typeof window !== 'undefined' && window.OneSignal) {
      return window.OneSignal
    }
    return null
  }, [])

  const forceResubscribe = useCallback(async (OneSignal: any) => {
    try {
      const sub = OneSignal.User?.PushSubscription
      if (!sub) return

      const token = sub.token
      if (token) return

      if (Notification.permission === 'granted') {
        try {
          await sub.optOut()
          await new Promise(r => setTimeout(r, 1000))
          await sub.optIn()
        } catch (_e) { /* ignore */ }
      } else if (Notification.permission === 'default') {
        try {
          await OneSignal.Slidedown.promptPush()
        } catch (_e) { /* ignore */ }
      }
    } catch (_error) { /* ignore */ }
  }, [])

  const syncUser = useCallback(async (userId: string | undefined | null) => {
    if (!initialized.current) return
    const OneSignal = getOneSignal()
    if (!OneSignal) return

    try {
      if (userId) {
        if (loggedInUserId.current === userId) return
        await OneSignal.login(userId)
        loggedInUserId.current = userId
        setTimeout(() => forceResubscribe(OneSignal), 2000)
      } else {
        if (!loggedInUserId.current) return
        await OneSignal.logout()
        loggedInUserId.current = null
      }
    } catch (_error) { /* ignore */ }
  }, [forceResubscribe, getOneSignal])

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Module-level global guard to prevent double init across React re-renders/strict mode
    if (window.__onesignal_init_started) {
      initialized.current = true
      return
    }
    window.__onesignal_init_started = true

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    if (!appId) return

    // Skip OneSignal on non-production origins (it's configured only for canlifal.com)
    const isProduction = typeof window !== 'undefined' && window.location.hostname === 'canlifal.com'
    if (!isProduction) {
      console.log('OneSignal: skipped on non-production origin')
      return
    }

    window.OneSignalDeferred = window.OneSignalDeferred || []

    window.OneSignalDeferred.push(async function(OneSignal: any) {
      try {
        await OneSignal.init({
          appId,
          serviceWorkerParam: { scope: '/' },
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          notifyButton: { enable: false },
        })

        initialized.current = true

        if (session?.user?.id) {
          await OneSignal.login(session.user.id)
          loggedInUserId.current = session.user.id
        }

        setTimeout(() => forceResubscribe(OneSignal), 2000)
      } catch (_error) { /* ignore init errors */ }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    syncUser(session?.user?.id)
  }, [session?.user?.id, syncUser])

  return null
}
