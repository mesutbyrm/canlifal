'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Section detection for announcements
function detectSection(path: string | null): string | null {
  if (!path) return null
  const lowerPath = path.toLowerCase()
  
  if (lowerPath.includes('/chat')) return 'chat'
  if (lowerPath.includes('/fortune') || lowerPath.includes('/fal') || lowerPath.includes('/tarot') || 
      lowerPath.includes('/coffee') || lowerPath.includes('/dream') || lowerPath.includes('/palm') ||
      lowerPath.includes('/horoscope') || lowerPath.includes('/numerology') || lowerPath.includes('/aura') ||
      lowerPath.includes('/angel') || lowerPath.includes('/katina') || lowerPath.includes('/yesno') ||
      lowerPath.includes('/love') || lowerPath.includes('/birthchart')) return 'fortunes'
  if (lowerPath.includes('/game')) return 'games'
  if (lowerPath.includes('/social')) return 'social'
  if (lowerPath.includes('/gift')) return 'gifts'
  if (lowerPath.includes('/blog')) return 'blog'
  if (lowerPath.includes('/live-teller')) return 'live-tellers'
  if (lowerPath.includes('/membership')) return 'memberships'
  if (lowerPath.includes('/profile')) return 'profile'
  if (lowerPath.includes('/dashboard')) return 'dashboard'
  if (lowerPath === '/' || lowerPath === '/tr' || lowerPath === '/en') return 'home'
  
  return null
}

// This component silently tracks user presence across all pages
export default function PresenceTracker() {
  const pathname = usePathname()
  const { data: session } = useSession() || {}
  const [mounted, setMounted] = useState(false)
  const lastAnnouncedSectionRef = useRef<string | null>(null)

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

  // Create section entry announcement for logged-in VIP/staff users
  const announceSectionEntry = useCallback(async () => {
    if (!session?.user) return
    
    const currentSection = detectSection(pathname)
    if (!currentSection) return
    
    // Don't announce the same section again (in-memory check)
    if (lastAnnouncedSectionRef.current === currentSection) return
    
    // Update last announced section
    lastAnnouncedSectionRef.current = currentSection
    
    try {
      await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: pathname,
          section: currentSection
        }),
      })
    } catch (error) {
      // Silent fail
    }
  }, [session?.user, pathname])

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

  // Announce section entry when path changes
  useEffect(() => {
    if (!mounted) return
    
    // Small delay to ensure page has loaded
    const timer = setTimeout(() => {
      announceSectionEntry()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [mounted, pathname, announceSectionEntry])

  return null // This component renders nothing
}
