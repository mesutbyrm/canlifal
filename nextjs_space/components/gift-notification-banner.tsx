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

function isImagePath(icon: string): boolean {
  return icon.startsWith('/') || icon.startsWith('http')
}

// Fallback emoji for non-image icons
const GIFT_EMOJI_MAP: Record<string, string> = {
  'Jeton': '🪙',
}

function getGiftEmoji(giftType: string, giftIcon: string): string {
  if (GIFT_EMOJI_MAP[giftType]) return GIFT_EMOJI_MAP[giftType]
  if (!isImagePath(giftIcon)) return giftIcon || '🎁'
  return '🎁'
}

function GiftIconDisplay({ giftIcon, giftType, size = 24 }: { giftIcon: string; giftType: string; size?: number }) {
  if (isImagePath(giftIcon)) {
    return (
      <img 
        src={giftIcon} 
        alt={giftType} 
        width={size} 
        height={size} 
        style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} 
      />
    )
  }
  return <span style={{ fontSize: `${size}px` }}>{getGiftEmoji(giftType, giftIcon)}</span>
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

  const isFalclub = true
  

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
    const interval = setInterval(fetchBigGifts, 30000)
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

    // Each pass takes ~6 seconds
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    animationTimerRef.current = setTimeout(() => {
      setPassCount(prev => prev + 1)
    }, 6000)

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
    ? `${currentNotif.senderName} ➜ ${currentNotif.recipientName} • ${currentNotif.amount.toLocaleString()} Jeton Hediye Attı!`
    : `${currentNotif.senderName} ➜ ${currentNotif.recipientName} • ${currentNotif.amount.toLocaleString()} Jeton ${currentNotif.giftType} Hediye Attı!`

  // FalClub theme gradient
  const bannerBg = 'linear-gradient(90deg, #2d0a4e, #d946ef, #ec4899, #d946ef, #2d0a4e)'

  return (
    <div
      className="w-full overflow-hidden relative"
      style={{
        height: '56px',
        background: bannerBg,
        backgroundSize: '200% 100%',
        animation: 'bannerBgShift 4s linear infinite',
      }}
    >
      {/* Top gold border with glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
        background: 'linear-gradient(90deg, transparent, #FFD700, #FFA500, #FFD700, transparent)',
        boxShadow: '0 0 10px rgba(255,215,0,0.6), 0 0 20px rgba(255,215,0,0.3)'
      }} />
      {/* Bottom gold border with glow */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{
        background: 'linear-gradient(90deg, transparent, #FFD700, #FFA500, #FFD700, transparent)',
        boxShadow: '0 0 10px rgba(255,215,0,0.6), 0 0 20px rgba(255,215,0,0.3)'
      }} />

      {/* Animated sparkle particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => {
          const leftPos = (i * 23 + 5) % 100
          const delay = (i * 0.4) % 3
          const dur = 1.5 + (i % 3) * 0.5
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${leftPos}%`,
                top: '50%',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: '#FFD700',
                boxShadow: '0 0 6px #FFD700, 0 0 12px #FFA500',
                animation: `sparkleFloat ${dur}s ease-in-out ${delay}s infinite`,
                opacity: 0,
              }}
            />
          )
        })}
      </div>

      {/* Gold shimmer overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.08) 20%, rgba(255,255,255,0.12) 50%, rgba(255,215,0,0.08) 80%, transparent 100%)',
          animation: 'shimmerSweep 2.5s ease-in-out infinite',
          backgroundSize: '200% 100%'
        }}
      />

      {/* Scrolling content */}
      <div
        key={`${currentNotif.id}-pass-${passCount}`}
        className="absolute whitespace-nowrap flex items-center h-full"
        style={{
          WebkitAnimation: 'giftBannerScroll 6s linear forwards',
          animation: 'giftBannerScroll 6s linear forwards',
        }}
      >
        <span className="inline-flex items-center gap-3 md:gap-4" style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.5px' }}>
          {/* Left celebration cluster */}
          <span className="inline-flex items-center gap-1">
            <span style={{ fontSize: '20px', WebkitAnimation: 'bounceGift 0.7s ease-in-out infinite', animation: 'bounceGift 0.7s ease-in-out infinite' }}>🎉</span>
            <span style={{ WebkitAnimation: 'pulseGift 1s ease-in-out infinite', animation: 'pulseGift 1s ease-in-out infinite', animationDelay: '0.15s', display: 'inline-flex', alignItems: 'center' }}>
              <GiftIconDisplay giftIcon={currentNotif.giftIcon} giftType={currentNotif.giftType} size={28} />
            </span>
            <span style={{ fontSize: '20px', WebkitAnimation: 'bounceGift 0.7s ease-in-out infinite', animation: 'bounceGift 0.7s ease-in-out infinite', animationDelay: '0.3s' }}>🎊</span>
          </span>

          {/* Main text with gold gradient */}
          <span style={{
            background: 'linear-gradient(90deg, #FFD700, #FFFFFF, #FFD700, #FFA500, #FFD700)',
            backgroundSize: '200% 100%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            WebkitAnimation: 'textGoldShift 3s linear infinite',
            animation: 'textGoldShift 3s linear infinite',
            WebkitFilter: 'drop-shadow(0 0 8px rgba(255,215,0,0.7)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.7)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            textShadow: 'none',
          }}>
            {displayText}
          </span>

          {/* Right celebration cluster */}
          <span className="inline-flex items-center gap-1">
            <span style={{ fontSize: '20px', WebkitAnimation: 'bounceGift 0.7s ease-in-out infinite', animation: 'bounceGift 0.7s ease-in-out infinite', animationDelay: '0.2s' }}>✨</span>
            <span style={{ WebkitAnimation: 'pulseGift 1s ease-in-out infinite', animation: 'pulseGift 1s ease-in-out infinite', display: 'inline-flex', alignItems: 'center' }}>
              <GiftIconDisplay giftIcon={currentNotif.giftIcon} giftType={currentNotif.giftType} size={28} />
            </span>
            <span style={{ fontSize: '20px', WebkitAnimation: 'bounceGift 0.7s ease-in-out infinite', animation: 'bounceGift 0.7s ease-in-out infinite', animationDelay: '0.4s' }}>🌟</span>
          </span>
        </span>
      </div>

      <style jsx>{`
        @-webkit-keyframes giftBannerScroll {
          0% { -webkit-transform: translateX(100vw); transform: translateX(100vw); }
          100% { -webkit-transform: translateX(-100%); transform: translateX(-100%); }
        }
        @keyframes giftBannerScroll {
          0% { -webkit-transform: translateX(100vw); transform: translateX(100vw); }
          100% { -webkit-transform: translateX(-100%); transform: translateX(-100%); }
        }
        @-webkit-keyframes shimmerSweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes shimmerSweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @-webkit-keyframes bannerBgShift {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes bannerBgShift {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @-webkit-keyframes bounceGift {
          0%, 100% { -webkit-transform: translateY(0) scale(1); transform: translateY(0) scale(1); }
          50% { -webkit-transform: translateY(-6px) scale(1.15); transform: translateY(-6px) scale(1.15); }
        }
        @keyframes bounceGift {
          0%, 100% { -webkit-transform: translateY(0) scale(1); transform: translateY(0) scale(1); }
          50% { -webkit-transform: translateY(-6px) scale(1.15); transform: translateY(-6px) scale(1.15); }
        }
        @-webkit-keyframes pulseGift {
          0%, 100% { -webkit-transform: scale(1); transform: scale(1); -webkit-filter: brightness(1); filter: brightness(1); }
          50% { -webkit-transform: scale(1.2); transform: scale(1.2); -webkit-filter: brightness(1.3); filter: brightness(1.3); }
        }
        @keyframes pulseGift {
          0%, 100% { -webkit-transform: scale(1); transform: scale(1); -webkit-filter: brightness(1); filter: brightness(1); }
          50% { -webkit-transform: scale(1.2); transform: scale(1.2); -webkit-filter: brightness(1.3); filter: brightness(1.3); }
        }
        @-webkit-keyframes sparkleFloat {
          0% { opacity: 0; -webkit-transform: translateY(0) scale(0.5); transform: translateY(0) scale(0.5); }
          30% { opacity: 1; -webkit-transform: translateY(-12px) scale(1); transform: translateY(-12px) scale(1); }
          70% { opacity: 1; -webkit-transform: translateY(-20px) scale(0.8); transform: translateY(-20px) scale(0.8); }
          100% { opacity: 0; -webkit-transform: translateY(-28px) scale(0.3); transform: translateY(-28px) scale(0.3); }
        }
        @keyframes sparkleFloat {
          0% { opacity: 0; -webkit-transform: translateY(0) scale(0.5); transform: translateY(0) scale(0.5); }
          30% { opacity: 1; -webkit-transform: translateY(-12px) scale(1); transform: translateY(-12px) scale(1); }
          70% { opacity: 1; -webkit-transform: translateY(-20px) scale(0.8); transform: translateY(-20px) scale(0.8); }
          100% { opacity: 0; -webkit-transform: translateY(-28px) scale(0.3); transform: translateY(-28px) scale(0.3); }
        }
        @-webkit-keyframes textGoldShift {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes textGoldShift {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
