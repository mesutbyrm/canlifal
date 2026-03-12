'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSiteTheme } from '@/lib/theme-context'

interface BigGiftNotification {
  id: string
  senderName: string
  recipientName: string
  giftType: string
  giftIcon: string
  amount: number
  createdAt: string
}

export default function GiftNotificationBanner() {
  const { theme } = useSiteTheme()
  const [notifications, setNotifications] = useState<BigGiftNotification[]>([])
  const [currentNotif, setCurrentNotif] = useState<BigGiftNotification | null>(null)
  const [passCount, setPassCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<BigGiftNotification[]>([])
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isCosmic = theme === 'cosmic'
  const isFacebook = theme === 'facebook'

  // Poll for new big gifts every 15 seconds
  const fetchBigGifts = useCallback(async () => {
    try {
      const res = await fetch('/api/gifts/recent-big')
      if (res.ok) {
        const data: BigGiftNotification[] = await res.json()
        const newNotifs = data.filter(n => !seenIdsRef.current.has(n.id))
        if (newNotifs.length > 0) {
          queueRef.current = [...queueRef.current, ...newNotifs]
          newNotifs.forEach(n => seenIdsRef.current.add(n.id))
          setNotifications(prev => [...prev, ...newNotifs])
        }
      }
    } catch (e) {
      console.error('Gift banner fetch error:', e)
    }
  }, [])

  useEffect(() => {
    fetchBigGifts()
    const interval = setInterval(fetchBigGifts, 15000)
    return () => clearInterval(interval)
  }, [fetchBigGifts])

  // Process queue - show notifications one by one, each passing 2 times
  useEffect(() => {
    if (isAnimating) return
    if (queueRef.current.length === 0) return

    const next = queueRef.current[0]
    setCurrentNotif(next)
    setPassCount(0)
    setIsAnimating(true)
  }, [notifications, isAnimating])

  // Handle animation passes
  useEffect(() => {
    if (!isAnimating || !currentNotif) return

    if (passCount >= 2) {
      // Done with this notification, move to next
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
      animationTimerRef.current = setTimeout(() => {
        queueRef.current = queueRef.current.filter(n => n.id !== currentNotif.id)
        setCurrentNotif(null)
        setIsAnimating(false)
      }, 500)
      return
    }

    // Each pass takes ~4 seconds
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    animationTimerRef.current = setTimeout(() => {
      setPassCount(prev => prev + 1)
    }, 4000)

    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    }
  }, [isAnimating, currentNotif, passCount])

  // Cleanup old seen IDs periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (seenIdsRef.current.size > 100) {
        const arr = Array.from(seenIdsRef.current)
        seenIdsRef.current = new Set(arr.slice(-50))
      }
    }, 60000)
    return () => clearInterval(cleanup)
  }, [])

  if (!currentNotif || passCount >= 2) return null

  const isJeton = currentNotif.giftType === 'Jeton'
  const displayText = isJeton
    ? `${currentNotif.giftIcon} ${currentNotif.senderName} \u2192 ${currentNotif.recipientName} \u2022 ${currentNotif.amount} Jeton Hediye! ${currentNotif.giftIcon}`
    : `${currentNotif.giftIcon} ${currentNotif.senderName} \u2192 ${currentNotif.recipientName} \u2022 ${currentNotif.giftIcon} ${currentNotif.giftType} Hediye Att\u0131! \u2728`

  // Theme-based colors
  const bannerBg = isFacebook
    ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600'
    : isCosmic
    ? 'bg-gradient-to-r from-blue-900/90 via-indigo-800/90 to-blue-900/90'
    : 'bg-gradient-to-r from-purple-900/90 via-fuchsia-800/90 to-purple-900/90'

  const textColor = 'text-white'
  const glowColor = isFacebook
    ? 'drop-shadow-[0_0_10px_rgba(24,119,242,0.8)]'
    : isCosmic
    ? 'drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]'
    : 'drop-shadow-[0_0_10px_rgba(217,70,239,0.8)]'

  const borderColor = isFacebook
    ? 'border-blue-400/50'
    : isCosmic
    ? 'border-blue-400/40'
    : 'border-fuchsia-400/40'

  return (
    <div
      className={`w-full ${bannerBg} border-b ${borderColor} overflow-hidden relative z-40`}
      style={{ height: '44px' }}
    >
      {/* Sparkle overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <span
            key={i}
            className="absolute text-yellow-300 animate-pulse"
            style={{
              left: `${15 + i * 15}%`,
              top: `${i % 2 === 0 ? 20 : 60}%`,
              fontSize: '10px',
              animationDelay: `${i * 0.3}s`,
              opacity: 0.7
            }}
          >
            \u2728
          </span>
        ))}
      </div>

      {/* Scrolling text */}
      <div
        key={`${currentNotif.id}-pass-${passCount}`}
        className={`absolute whitespace-nowrap flex items-center h-full ${textColor} ${glowColor}`}
        style={{
          animation: 'giftScroll 4s linear forwards',
          fontSize: '18px',
          fontWeight: 700,
          letterSpacing: '0.5px'
        }}
      >
        <span className="inline-flex items-center gap-2">
          <span className="animate-bounce inline-block" style={{ animationDuration: '0.6s' }}>
            🎉
          </span>
          <span className="bg-gradient-to-r from-yellow-200 via-white to-yellow-200 bg-clip-text text-transparent"
            style={{ textShadow: 'none', filter: `drop-shadow(0 0 8px rgba(255,215,0,0.6))` }}>
            {displayText}
          </span>
          <span className="animate-bounce inline-block" style={{ animationDuration: '0.6s', animationDelay: '0.3s' }}>
            🎉
          </span>
        </span>
      </div>

      <style jsx>{`
        @keyframes giftScroll {
          0% {
            transform: translateX(100vw);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  )
}
