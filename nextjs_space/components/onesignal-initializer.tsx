'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

export default function OneSignalInitializer() {
  const { data: session } = useSession() || {}
  const initialized = useRef(false)

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
      } catch (error) {
        console.error('OneSignal initialization error:', error)
      }
    }

    // Delay initialization to avoid interfering with page load
    const timer = setTimeout(initOneSignal, 3000)
    return () => clearTimeout(timer)
  }, [])

  // Login/logout user with OneSignal when session changes
  useEffect(() => {
    if (!initialized.current) return

    const syncUser = async () => {
      try {
        const OneSignalModule = await import('react-onesignal')
        const OneSignal = OneSignalModule.default

        if (session?.user?.id) {
          // Set external user ID so server can target this user
          await OneSignal.login(session.user.id)
          console.log('OneSignal user logged in:', session.user.id)
        } else {
          await OneSignal.logout()
          console.log('OneSignal user logged out')
        }
      } catch (error) {
        console.error('OneSignal user sync error:', error)
      }
    }

    syncUser()
  }, [session?.user?.id])

  return null
}
