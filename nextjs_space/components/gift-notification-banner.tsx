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
  const [currentNotif, setCurrentNotif] = useState<BigGiftNotification | null>(null)
  const [passCount, setPassCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<BigGiftNotification[]>([])
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [newNotifTrigger, setNewNotifTrigger] = useState(0)

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
          setNewNotifTrigger(prev => prev + 1)
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

  // Process queue
  useEffect(() => {
    if (isAnimating) return
    if (queueRef.current.length === 0) return

    const next = queueRef.current[0]
    setCurrentNotif(next)
    setPassCount(0)
    setIsAnimating(true)
  }, [newNotifTrigger, isAnimating])

  // Handle animation passes - 2 passes
  useEffect(() => {
    if (!isAnimating || !currentNotif) return

    if (passCount >= 2) {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
      animationTimerRef.current = setTimeout(() => {
        queueRef.current = queueRef.current.filter(n => n.id !== currentNotif.id)
        setCurrentNotif(null)
        setIsAnimating(false)
      }, 500)
      return
    }

    // Each pass takes ~5 seconds
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    animationTimerRef.current = setTimeout(() => {
      setPassCount(prev => prev + 1)
    }, 5000)

    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    }
  }, [isAnimating, currentNotif, passCount])

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

  if (!currentNotif || passCount >= 2) return null

  const isJeton = currentNotif.giftType === 'Jeton'
  const displayText = isJeton
    ? `${currentNotif.giftIcon} ${currentNotif.senderName} \u279C ${currentNotif.recipientName} \u2022 ${currentNotif.amount} Jeton Hediye! ${currentNotif.giftIcon}`
    : `${currentNotif.giftIcon} ${currentNotif.senderName} \u279C ${currentNotif.recipientName} \u2022 ${currentNotif.giftIcon} ${currentNotif.giftType} Hediye Att\u0131! \u2728`

  const bannerBg = isFacebook
    ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600'
    : isCosmic
    ? 'bg-gradient-to-r from-indigo-900 via-blue-800 to-indigo-900'
    : 'bg-gradient-to-r from-purple-900 via-fuchsia-700 to-purple-900'

  const borderColor = isFacebook
    ? 'border-yellow-400'
    : isCosmic
    ? 'border-yellow-400/60'
    : 'border-yellow-400/60'

  return (
    <div
      className={`w-full ${bannerBg} border-b-2 border-t-2 ${borderColor} overflow-hidden relative`}
      style={{ height: '52px', zIndex: 9999 }}
    >
      {/* Gold sparkle shimmer */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.15) 25%, transparent 50%, rgba(255,215,0,0.15) 75%, transparent 100%)',
          animation: 'shimmer 2s linear infinite',
          backgroundSize: '200% 100%'
        }}
      />

      {/* Scrolling text */}
      <div
        key={`${currentNotif.id}-pass-${passCount}`}
        className="absolute whitespace-nowrap flex items-center h-full"
        style={{
          animation: 'giftScroll 5s linear forwards',
        }}
      >
        <span className="inline-flex items-center gap-3" style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '0.5px' }}>
          <span className="animate-bounce inline-block" style={{ animationDuration: '0.6s', fontSize: '26px' }}>
            \ud83c\udf89
          </span>
          <span style={{
            background: 'linear-gradient(90deg, #FFD700, #FFFFFF, #FFD700, #FFA500, #FFD700)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.8)) drop-shadow(0 0 4px rgba(255,255,255,0.5))',
          }}>
            {displayText}
          </span>
          <span className="animate-bounce inline-block" style={{ animationDuration: '0.6s', animationDelay: '0.3s', fontSize: '26px' }}>
            \ud83c\udf89
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
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
