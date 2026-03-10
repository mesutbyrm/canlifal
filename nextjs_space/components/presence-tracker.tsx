'use client'

import { useEffect, useCallback, useState } from 'react'
import { usePathname } from 'next/navigation'

// This component silently tracks user presence across all pages
export default function PresenceTracker() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  const getVisitorId = useCallback((): { visitorId: string | null; isNewSession: boolean } => {
    if (typeof window === 'undefined') return { visitorId: null, isNewSession: false }
    
    let visitorId = localStorage.getItem('falci_visitor_id')
    let isNewSession = false
    
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('falci_visitor_id', visitorId)
      isNewSession = true
    }
    
    const lastVisitDate = localStorage.getItem('falci_last_visit_date')
    const today = new Date().toDateString()
    if (lastVisitDate !== today) {
      localStorage.setItem('falci_last_visit_date', today)
      isNewSession = true
    }
    
    return { visitorId, isNewSession }
  }, [])

  const updatePresence = useCallback(async (forceNewSession = false) => {
    const { visitorId, isNewSession } = getVisitorId()
    if (!visitorId) return

    try {
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          visitorId, 
          path: pathname,
          isNewSession: forceNewSession || isNewSession
        }),
      })
    } catch (error) {
      // Silent fail
    }
  }, [getVisitorId, pathname])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    // Initial update
    updatePresence()

    // Update every 30 seconds
    const interval = setInterval(updatePresence, 30000)

    // Update on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [mounted, updatePresence])

  return null // This component renders nothing
}
