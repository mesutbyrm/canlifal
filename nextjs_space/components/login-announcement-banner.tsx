'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Announcement {
  id: string
  type: string
  message: string
  color: string
  userId: string | null
  userName: string | null
  createdAt: string
  expiresAt: string
}

export default function LoginAnnouncementBanner() {
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null)
  const [passCount, setPassCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<Announcement[]>([])
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [trigger, setTrigger] = useState(0)

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements')
      if (res.ok) {
        const data: Announcement[] = await res.json()
        const loginAnnouncements = data.filter(a => a.type === 'login')
        const newOnes = loginAnnouncements.filter(a => !seenIdsRef.current.has(a.id))
        if (newOnes.length > 0) {
          queueRef.current = [...queueRef.current, ...newOnes]
          newOnes.forEach(a => seenIdsRef.current.add(a.id))
          setTrigger(prev => prev + 1)
        }
      }
    } catch (e) {
      console.error('Login announcement fetch error:', e)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
    const interval = setInterval(fetchAnnouncements, 15000)
    return () => clearInterval(interval)
  }, [fetchAnnouncements])

  // Process queue
  useEffect(() => {
    if (isAnimating) return
    if (queueRef.current.length === 0) return
    const next = queueRef.current[0]
    setCurrentAnnouncement(next)
    setPassCount(0)
    setIsAnimating(true)
  }, [trigger, isAnimating])

  // Handle animation passes - 2 passes
  useEffect(() => {
    if (!isAnimating || !currentAnnouncement) return

    if (passCount >= 2) {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
      animationTimerRef.current = setTimeout(() => {
        queueRef.current = queueRef.current.filter(a => a.id !== currentAnnouncement.id)
        setCurrentAnnouncement(null)
        setIsAnimating(false)
      }, 500)
      return
    }

    if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    animationTimerRef.current = setTimeout(() => {
      setPassCount(prev => prev + 1)
    }, 6000)

    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    }
  }, [isAnimating, currentAnnouncement, passCount])

  // Cleanup old seen IDs
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (seenIdsRef.current.size > 100) {
        const arr = Array.from(seenIdsRef.current)
        seenIdsRef.current = new Set(arr.slice(-50))
      }
    }, 60000)
    return () => clearInterval(cleanup)
  }, [])

  if (!currentAnnouncement || passCount >= 2) return null

  return (
    <div
      className="w-full overflow-hidden relative"
      style={{
        height: '48px',
        zIndex: 9998,
        background: 'linear-gradient(90deg, #1a0000, #8b0000, #cc0000, #8b0000, #1a0000)',
        backgroundSize: '200% 100%',
        animation: 'loginBannerBgShift 4s linear infinite',
      }}
    >
      {/* Top red border with glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
        background: 'linear-gradient(90deg, transparent, #ff0000, #ff4444, #ff0000, transparent)',
        boxShadow: '0 0 10px rgba(255,0,0,0.6), 0 0 20px rgba(255,0,0,0.3)'
      }} />
      {/* Bottom red border with glow */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{
        background: 'linear-gradient(90deg, transparent, #ff0000, #ff4444, #ff0000, transparent)',
        boxShadow: '0 0 10px rgba(255,0,0,0.6), 0 0 20px rgba(255,0,0,0.3)'
      }} />

      {/* Red shimmer overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,0,0,0.08) 20%, rgba(255,255,255,0.1) 50%, rgba(255,0,0,0.08) 80%, transparent 100%)',
          animation: 'loginShimmerSweep 2.5s ease-in-out infinite',
          backgroundSize: '200% 100%'
        }}
      />

      {/* Scrolling content - right to left */}
      <div
        key={`${currentAnnouncement.id}-pass-${passCount}`}
        className="absolute whitespace-nowrap flex items-center h-full"
        style={{
          animation: 'loginBannerScroll 6s linear forwards',
        }}
      >
        <span className="inline-flex items-center gap-3" style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.5px' }}>
          <span style={{ fontSize: '20px', animation: 'loginPulse 1s ease-in-out infinite' }}>🔴</span>
          <span style={{
            background: 'linear-gradient(90deg, #ff4444, #ffffff, #ff4444, #ffaaaa, #ff4444)',
            backgroundSize: '200% 100%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'loginTextShift 3s linear infinite',
            filter: 'drop-shadow(0 0 8px rgba(255,0,0,0.7)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          }}>
            {currentAnnouncement.message}
          </span>
          <span style={{ fontSize: '20px', animation: 'loginPulse 1s ease-in-out infinite', animationDelay: '0.5s' }}>🔴</span>
        </span>
      </div>

      <style jsx>{`
        @keyframes loginBannerScroll {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        @keyframes loginBannerBgShift {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes loginShimmerSweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes loginPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
        @keyframes loginTextShift {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
