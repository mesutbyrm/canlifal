'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import BanaOzelPopup from '@/components/bana-ozel-popup'

interface Announcement {
  id: string
  type: string
  message: string
  color: string
  userId: string | null
  userName: string | null
  maxPasses: number
  createdAt: string
  expiresAt: string
}

// Canary SVG for Fenerbahçe (wings spread)
const FenerbahceCanary = () => (
  <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    {/* Body */}
    <ellipse cx="32" cy="34" rx="10" ry="12" fill="#FFD700" />
    {/* Head */}
    <circle cx="32" cy="20" r="8" fill="#FFD700" />
    {/* Eye */}
    <circle cx="35" cy="18" r="1.5" fill="#1a1a6e" />
    {/* Beak */}
    <polygon points="40,20 46,22 40,24" fill="#FF8C00" />
    {/* Left wing spread */}
    <path d="M22,30 Q8,18 4,24 Q10,28 14,34 Q16,36 22,36 Z" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5" />
    <path d="M20,28 Q6,14 2,20 Q8,24 12,30" fill="none" stroke="#FFC107" strokeWidth="1" />
    {/* Right wing spread */}
    <path d="M42,30 Q56,18 60,24 Q54,28 50,34 Q48,36 42,36 Z" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5" />
    <path d="M44,28 Q58,14 62,20 Q56,24 52,30" fill="none" stroke="#FFC107" strokeWidth="1" />
    {/* Tail */}
    <path d="M28,46 Q26,54 22,58 Q32,54 42,58 Q38,54 36,46 Z" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5" />
    {/* Belly */}
    <ellipse cx="32" cy="38" rx="6" ry="6" fill="#FFEC8B" opacity="0.6" />
    {/* Feet */}
    <line x1="28" y1="46" x2="26" y2="54" stroke="#FF8C00" strokeWidth="1.5" />
    <line x1="36" y1="46" x2="38" y2="54" stroke="#FF8C00" strokeWidth="1.5" />
  </svg>
);

// Turkish football team color schemes
const TEAM_COLORS: Record<string, { bg: string; border: string; text: string; shimmer: string; emoji: React.ReactNode }> = {
  'Galatasaray': {
    bg: 'linear-gradient(90deg, #1a0000, #8b0000, #cc0000, #b8860b, #cc0000, #8b0000, #1a0000)',
    border: 'linear-gradient(90deg, transparent, #ff0000, #ffd700, #ff0000, transparent)',
    text: 'linear-gradient(90deg, #ff4444, #ffd700, #ff4444, #ffee88, #ff4444)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.1) 20%, rgba(255,255,255,0.12) 50%, rgba(255,0,0,0.1) 80%, transparent 100%)',
    emoji: '🦁'
  },
  'Fenerbahçe': {
    bg: 'linear-gradient(90deg, #0a0a1a, #000066, #1a1aff, #b8860b, #1a1aff, #000066, #0a0a1a)',
    border: 'linear-gradient(90deg, transparent, #0000cc, #ffd700, #0000cc, transparent)',
    text: 'linear-gradient(90deg, #4444ff, #ffd700, #4444ff, #ffee88, #4444ff)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(0,0,255,0.1) 20%, rgba(255,215,0,0.12) 50%, rgba(0,0,255,0.1) 80%, transparent 100%)',
    emoji: <FenerbahceCanary />
  },
  'Beşiktaş': {
    bg: 'linear-gradient(90deg, #0a0a0a, #1a1a1a, #333333, #ffffff20, #333333, #1a1a1a, #0a0a0a)',
    border: 'linear-gradient(90deg, transparent, #ffffff, #888888, #ffffff, transparent)',
    text: 'linear-gradient(90deg, #ffffff, #cccccc, #ffffff, #eeeeee, #ffffff)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 80%, transparent 100%)',
    emoji: '🦅'
  },
  'Trabzonspor': {
    bg: 'linear-gradient(90deg, #1a0010, #660022, #990033, #003366, #990033, #660022, #1a0010)',
    border: 'linear-gradient(90deg, transparent, #cc0044, #3366cc, #cc0044, transparent)',
    text: 'linear-gradient(90deg, #ff4466, #6699ff, #ff4466, #88bbff, #ff4466)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(204,0,68,0.1) 20%, rgba(51,102,204,0.12) 50%, rgba(204,0,68,0.1) 80%, transparent 100%)',
    emoji: '⚓'
  },
  'Adana Demirspor': {
    bg: 'linear-gradient(90deg, #001020, #003366, #0066cc, #ff6600, #0066cc, #003366, #001020)',
    border: 'linear-gradient(90deg, transparent, #0066cc, #ff8800, #0066cc, transparent)',
    text: 'linear-gradient(90deg, #4499ff, #ffaa44, #4499ff, #ffcc88, #4499ff)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(0,102,204,0.1) 20%, rgba(255,136,0,0.12) 50%, rgba(0,102,204,0.1) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'Antalyaspor': {
    bg: 'linear-gradient(90deg, #1a0000, #8b0000, #cc0000, #ffffff20, #cc0000, #8b0000, #1a0000)',
    border: 'linear-gradient(90deg, transparent, #cc0000, #ffffff, #cc0000, transparent)',
    text: 'linear-gradient(90deg, #ff4444, #ffffff, #ff4444, #ffcccc, #ff4444)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,0,0,0.08) 20%, rgba(255,255,255,0.1) 50%, rgba(255,0,0,0.08) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'Alanyaspor': {
    bg: 'linear-gradient(90deg, #001a00, #006600, #009900, #ff8800, #009900, #006600, #001a00)',
    border: 'linear-gradient(90deg, transparent, #00cc00, #ffaa00, #00cc00, transparent)',
    text: 'linear-gradient(90deg, #44ff44, #ffcc44, #44ff44, #ffee88, #44ff44)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(0,204,0,0.1) 20%, rgba(255,170,0,0.12) 50%, rgba(0,204,0,0.1) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'Başakşehir': {
    bg: 'linear-gradient(90deg, #1a0500, #803300, #cc5500, #001a66, #cc5500, #803300, #1a0500)',
    border: 'linear-gradient(90deg, transparent, #ff6600, #3344cc, #ff6600, transparent)',
    text: 'linear-gradient(90deg, #ff8844, #6677ff, #ff8844, #99aaff, #ff8844)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,102,0,0.1) 20%, rgba(51,68,204,0.12) 50%, rgba(255,102,0,0.1) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'Gaziantep FK': {
    bg: 'linear-gradient(90deg, #1a0000, #660000, #990000, #1a1a1a, #990000, #660000, #1a0000)',
    border: 'linear-gradient(90deg, transparent, #cc0000, #333333, #cc0000, transparent)',
    text: 'linear-gradient(90deg, #ff4444, #cccccc, #ff4444, #ffffff, #ff4444)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(204,0,0,0.1) 20%, rgba(255,255,255,0.1) 50%, rgba(204,0,0,0.1) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'Hatayspor': {
    bg: 'linear-gradient(90deg, #1a0000, #8b0000, #cc0000, #ffffff20, #cc0000, #8b0000, #1a0000)',
    border: 'linear-gradient(90deg, transparent, #cc0000, #ffffff, #cc0000, transparent)',
    text: 'linear-gradient(90deg, #ff4444, #ffffff, #ff4444, #ffcccc, #ff4444)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,0,0,0.08) 20%, rgba(255,255,255,0.1) 50%, rgba(255,0,0,0.08) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'Kasimpasa': {
    bg: 'linear-gradient(90deg, #001020, #002244, #003366, #ffffff20, #003366, #002244, #001020)',
    border: 'linear-gradient(90deg, transparent, #0066cc, #ffffff, #0066cc, transparent)',
    text: 'linear-gradient(90deg, #4499ff, #ffffff, #4499ff, #ccddff, #4499ff)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(0,102,204,0.1) 20%, rgba(255,255,255,0.1) 50%, rgba(0,102,204,0.1) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'Kayserispor': {
    bg: 'linear-gradient(90deg, #1a1000, #806600, #b89000, #1a0000, #b89000, #806600, #1a1000)',
    border: 'linear-gradient(90deg, transparent, #ffcc00, #cc0000, #ffcc00, transparent)',
    text: 'linear-gradient(90deg, #ffdd44, #ff4444, #ffdd44, #ffee88, #ffdd44)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,204,0,0.1) 20%, rgba(204,0,0,0.1) 50%, rgba(255,204,0,0.1) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'Konyaspor': {
    bg: 'linear-gradient(90deg, #001a00, #004400, #006600, #ffffff20, #006600, #004400, #001a00)',
    border: 'linear-gradient(90deg, transparent, #00aa00, #ffffff, #00aa00, transparent)',
    text: 'linear-gradient(90deg, #44ff44, #ffffff, #44ff44, #ccffcc, #44ff44)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(0,170,0,0.1) 20%, rgba(255,255,255,0.1) 50%, rgba(0,170,0,0.1) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'MKE Ankaragucu': {
    bg: 'linear-gradient(90deg, #001020, #001a44, #002266, #b8860b, #002266, #001a44, #001020)',
    border: 'linear-gradient(90deg, transparent, #0044cc, #ffd700, #0044cc, transparent)',
    text: 'linear-gradient(90deg, #4477ff, #ffd700, #4477ff, #ffee88, #4477ff)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(0,68,204,0.1) 20%, rgba(255,215,0,0.12) 50%, rgba(0,68,204,0.1) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'Pendikspor': {
    bg: 'linear-gradient(90deg, #1a0010, #660022, #990044, #ffffff20, #990044, #660022, #1a0010)',
    border: 'linear-gradient(90deg, transparent, #cc0066, #ffffff, #cc0066, transparent)',
    text: 'linear-gradient(90deg, #ff4488, #ffffff, #ff4488, #ffccdd, #ff4488)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(204,0,102,0.1) 20%, rgba(255,255,255,0.1) 50%, rgba(204,0,102,0.1) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'Rizespor': {
    bg: 'linear-gradient(90deg, #001a10, #004422, #006633, #003366, #006633, #004422, #001a10)',
    border: 'linear-gradient(90deg, transparent, #00aa44, #0066cc, #00aa44, transparent)',
    text: 'linear-gradient(90deg, #44ff88, #4499ff, #44ff88, #88ffcc, #44ff88)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(0,170,68,0.1) 20%, rgba(0,102,204,0.1) 50%, rgba(0,170,68,0.1) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'Samsunspor': {
    bg: 'linear-gradient(90deg, #1a0000, #8b0000, #cc0000, #ffffff20, #cc0000, #8b0000, #1a0000)',
    border: 'linear-gradient(90deg, transparent, #cc0000, #ffffff, #cc0000, transparent)',
    text: 'linear-gradient(90deg, #ff4444, #ffffff, #ff4444, #ffcccc, #ff4444)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,0,0,0.08) 20%, rgba(255,255,255,0.1) 50%, rgba(255,0,0,0.08) 80%, transparent 100%)',
    emoji: '⚽'
  },
  'Sivasspor': {
    bg: 'linear-gradient(90deg, #1a0000, #8b0000, #cc0000, #ffffff20, #cc0000, #8b0000, #1a0000)',
    border: 'linear-gradient(90deg, transparent, #cc0000, #ffffff, #cc0000, transparent)',
    text: 'linear-gradient(90deg, #ff4444, #ffffff, #ff4444, #ffcccc, #ff4444)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,0,0,0.08) 20%, rgba(255,255,255,0.1) 50%, rgba(255,0,0,0.08) 80%, transparent 100%)',
    emoji: '⚽'
  },
}

// Default: Turkey National Team 🇹🇷 (for users without a team)
const DEFAULT_COLORS = {
  bg: 'linear-gradient(90deg, #1a0000, #c8102e, #e30a17, #c8102e, #1a0000)',
  border: 'linear-gradient(90deg, transparent, #e30a17, #ffffff, #e30a17, transparent)',
  text: 'linear-gradient(90deg, #ff4444, #ffffff, #e30a17, #ffffff, #ff4444)',
  shimmer: 'linear-gradient(90deg, transparent 0%, rgba(227,10,23,0.08) 20%, rgba(255,255,255,0.15) 50%, rgba(227,10,23,0.08) 80%, transparent 100%)',
  emoji: '🇹🇷'
}

const GIFT_COLORS = {
  bg: 'linear-gradient(90deg, #1a0020, #4a0080, #8b00cc, #ff6600, #8b00cc, #4a0080, #1a0020)',
  border: 'linear-gradient(90deg, transparent, #ff00ff, #ffd700, #ff00ff, transparent)',
  text: 'linear-gradient(90deg, #ff66ff, #ffd700, #ff66ff, #ffee88, #ff66ff)',
  shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,0,255,0.1) 20%, rgba(255,215,0,0.15) 50%, rgba(255,0,255,0.1) 80%, transparent 100%)',
  emoji: '🎁' as React.ReactNode
}

function getTeamColors(color: string) {
  if (color === 'gift') return GIFT_COLORS
  if (color.startsWith('team:')) {
    const teamName = color.substring(5)
    return TEAM_COLORS[teamName] || DEFAULT_COLORS
  }
  return DEFAULT_COLORS
}

const SESSION_STORAGE_KEY = 'shown_announcement_ids'

function getSessionSeenIds(): Set<string> {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (stored) return new Set(JSON.parse(stored))
  } catch {}
  return new Set()
}

function saveSessionSeenIds(ids: Set<string>) {
  try {
    // Keep last 200 to avoid bloat
    const arr = Array.from(ids)
    const trimmed = arr.length > 200 ? arr.slice(-200) : arr
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(trimmed))
  } catch {}
}

export default function LoginAnnouncementBanner() {
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null)
  const [passCount, setPassCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<Announcement[]>([])
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [trigger, setTrigger] = useState(0)
  const [showBanaOzel, setShowBanaOzel] = useState(false)
  const initializedRef = useRef(false)
  const [announcementEnabled, setAnnouncementEnabled] = useState(true)
  const [announcementDuration, setAnnouncementDuration] = useState(2) // seconds
  const [announcementStyle, setAnnouncementStyle] = useState<string>('fade')

  // Load seen IDs from sessionStorage on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      const sessionSeen = getSessionSeenIds()
      sessionSeen.forEach(id => seenIdsRef.current.add(id))
    }
  }, [])

  // Fetch announcement display settings from platform settings
  useEffect(() => {
    const fetchAnnouncementSettings = async () => {
      try {
        const res = await fetch('/api/public/announcement-settings')
        if (res.ok) {
          const data = await res.json()
          if (data.entry_announcement_enabled !== undefined) {
            setAnnouncementEnabled(data.entry_announcement_enabled === 'true')
          }
          if (data.entry_announcement_duration) {
            setAnnouncementDuration(parseInt(data.entry_announcement_duration) || 2)
          }
          if (data.entry_announcement_style) {
            setAnnouncementStyle(data.entry_announcement_style)
          }
        }
      } catch {}
    }
    fetchAnnouncementSettings()
  }, [])

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements')
      if (res.ok) {
        const data: Announcement[] = await res.json()
        const loginAnnouncements = data.filter(a => a.type === 'login' || a.type === 'section_entry' || a.type === 'gift_announcement')
        const newOnes = loginAnnouncements.filter(a => !seenIdsRef.current.has(a.id))
        if (newOnes.length > 0) {
          queueRef.current = [...queueRef.current, ...newOnes]
          newOnes.forEach(a => {
            seenIdsRef.current.add(a.id)
          })
          // Persist to sessionStorage so refresh doesn't re-show
          saveSessionSeenIds(seenIdsRef.current)
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

  // Handle animation passes - uses maxPasses from announcement
  useEffect(() => {
    if (!isAnimating || !currentAnnouncement) return

    const maxP = currentAnnouncement.maxPasses || 1
    if (passCount >= maxP) {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
      animationTimerRef.current = setTimeout(() => {
        queueRef.current = queueRef.current.filter(a => a.id !== currentAnnouncement.id)
        setCurrentAnnouncement(null)
        setIsAnimating(false)
      }, 500)
      return
    }

    if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    // Show for announcementDuration seconds then move to next pass
    animationTimerRef.current = setTimeout(() => {
      setPassCount(prev => prev + 1)
    }, announcementDuration * 1000)

    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
    }
  }, [isAnimating, currentAnnouncement, passCount, announcementDuration])

  // Cleanup old seen IDs (keep in sync with sessionStorage)
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (seenIdsRef.current.size > 200) {
        const arr = Array.from(seenIdsRef.current)
        seenIdsRef.current = new Set(arr.slice(-100))
        saveSessionSeenIds(seenIdsRef.current)
      }
    }, 60000)
    return () => clearInterval(cleanup)
  }, [])

  if (!announcementEnabled) return null
  if (!currentAnnouncement || passCount >= (currentAnnouncement.maxPasses || 1)) return null

  const colors = getTeamColors(currentAnnouncement.color)
  const isBanaOzelAnnouncement = currentAnnouncement.message.toLowerCase().includes('bana özel') || currentAnnouncement.message.toLowerCase().includes('bana ozel')

  const handleBannerClick = () => {
    if (isBanaOzelAnnouncement) {
      setShowBanaOzel(true)
    }
  }

  return (
    <>
    <div
      className={`w-full overflow-hidden relative ${isBanaOzelAnnouncement ? 'cursor-pointer' : ''}`}
      onClick={handleBannerClick}
      style={{
        height: '24px',
        zIndex: 9998,
        background: colors.bg,
        backgroundSize: '200% 100%',
        animation: 'loginBannerBgShift 4s linear infinite',
      }}
    >
      {/* Top border with glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{
        background: colors.border,
        boxShadow: '0 0 6px rgba(255,255,255,0.2), 0 0 12px rgba(255,255,255,0.1)'
      }} />
      {/* Bottom border with glow */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
        background: colors.border,
        boxShadow: '0 0 6px rgba(255,255,255,0.2), 0 0 12px rgba(255,255,255,0.1)'
      }} />

      {/* Shimmer overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: colors.shimmer,
          animation: 'loginShimmerSweep 2.5s ease-in-out infinite',
          backgroundSize: '200% 100%'
        }}
      />

      {/* Animated content - centered */}
      <div
        key={`${currentAnnouncement.id}-pass-${passCount}`}
        className="absolute inset-0 flex items-center justify-center whitespace-nowrap px-4"
        style={{
          animation: `loginBanner${
             announcementStyle === 'slide' ? 'Slide' : 
             announcementStyle === 'slideLeft' ? 'SlideLeft' : 
             announcementStyle === 'slideRight' ? 'SlideRight' : 
             announcementStyle === 'flash' ? 'FlashBright' : 
             announcementStyle === 'zoom' ? 'Zoom' : 
             announcementStyle === 'bounce' ? 'Bounce' : 
             announcementStyle === 'typewriter' ? 'Typewriter' : 
             announcementStyle === 'glow' ? 'Glow' : 
             announcementStyle === 'shake' ? 'Shake' : 
             announcementStyle === 'wave' ? 'Wave' : 
             announcementStyle === 'flipX' ? 'FlipX' : 
             announcementStyle === 'elastic' ? 'Elastic' : 
             'Flash'} ${announcementDuration}s ease-in-out forwards`,
        }}
      >
        <span className="inline-flex items-center gap-2 max-w-full overflow-hidden" style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.3px' }}>
          <span style={{ fontSize: '13px' }}>{colors.emoji}</span>
          <span className="truncate" style={{
            background: colors.text,
            backgroundSize: '200% 100%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          }}>
            {currentAnnouncement.message}
          </span>
          <span style={{ fontSize: '13px' }}>{colors.emoji}</span>
        </span>
      </div>

      <style jsx>{`
        @keyframes loginBannerFlash {
          0% { opacity: 0; transform: scale(0.95); }
          10% { opacity: 1; transform: scale(1); }
          85% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.95); }
        }
        @keyframes loginBannerSlide {
          0% { opacity: 0; transform: translateY(-100%); }
          10% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-100%); }
        }
        @keyframes loginBannerFlashBright {
          0% { opacity: 0; transform: scale(1.2); filter: brightness(2); }
          10% { opacity: 1; transform: scale(1); filter: brightness(1.5); }
          20% { filter: brightness(1); }
          80% { opacity: 1; filter: brightness(1); }
          90% { filter: brightness(1.5); }
          100% { opacity: 0; transform: scale(1.1); filter: brightness(2); }
        }
        @keyframes loginBannerZoom {
          0% { opacity: 0; transform: scale(0.3); }
          10% { opacity: 1; transform: scale(1.05); }
          18% { transform: scale(1); }
          85% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.3); }
        }
        @keyframes loginBannerBounce {
          0% { opacity: 0; transform: translateY(-40px); }
          10% { opacity: 1; transform: translateY(5px); }
          18% { transform: translateY(-3px); }
          25% { transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-40px); }
        }
        @keyframes loginBannerTypewriter {
          0% { clip-path: inset(0 100% 0 0); opacity: 1; }
          40% { clip-path: inset(0 0 0 0); opacity: 1; }
          85% { clip-path: inset(0 0 0 0); opacity: 1; }
          100% { clip-path: inset(0 0 0 100%); opacity: 0; }
        }
        @keyframes loginBannerGlow {
          0% { opacity: 0; filter: drop-shadow(0 0 0px transparent); }
          10% { opacity: 1; filter: drop-shadow(0 0 12px rgba(0,255,255,0.8)); }
          30% { filter: drop-shadow(0 0 20px rgba(255,0,255,0.8)); }
          50% { filter: drop-shadow(0 0 12px rgba(0,255,255,0.8)); }
          70% { filter: drop-shadow(0 0 20px rgba(255,0,255,0.8)); }
          85% { opacity: 1; filter: drop-shadow(0 0 12px rgba(0,255,255,0.8)); }
          100% { opacity: 0; filter: drop-shadow(0 0 0px transparent); }
        }
        @keyframes loginBannerShake {
          0% { opacity: 0; }
          5% { opacity: 1; transform: translateX(-4px); }
          10% { transform: translateX(4px); }
          15% { transform: translateX(-4px); }
          20% { transform: translateX(4px); }
          25% { transform: translateX(-2px); }
          30% { transform: translateX(2px); }
          35%, 85% { transform: translateX(0); opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes loginBannerWave {
          0% { opacity: 0; transform: translateY(6px) rotate(-1deg); }
          10% { opacity: 1; transform: translateY(-3px) rotate(1deg); }
          25% { transform: translateY(2px) rotate(-0.5deg); }
          40% { transform: translateY(-1px) rotate(0.5deg); }
          55%, 85% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { opacity: 0; transform: translateY(6px) rotate(-1deg); }
        }
        @keyframes loginBannerSlideLeft {
          0% { opacity: 0; transform: translateX(-100%); }
          12%, 85% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(100%); }
        }
        @keyframes loginBannerSlideRight {
          0% { opacity: 0; transform: translateX(100%); }
          12%, 85% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-100%); }
        }
        @keyframes loginBannerFlipX {
          0% { opacity: 0; transform: perspective(400px) rotateY(90deg); }
          12% { opacity: 1; transform: perspective(400px) rotateY(-10deg); }
          22% { transform: perspective(400px) rotateY(5deg); }
          32%, 85% { transform: perspective(400px) rotateY(0deg); opacity: 1; }
          100% { opacity: 0; transform: perspective(400px) rotateY(90deg); }
        }
        @keyframes loginBannerElastic {
          0% { opacity: 0; transform: scaleX(0.3); }
          10% { opacity: 1; transform: scaleX(1.1); }
          20% { transform: scaleX(0.9); }
          30% { transform: scaleX(1.05); }
          40%, 85% { transform: scaleX(1); opacity: 1; }
          100% { opacity: 0; transform: scaleX(0.3); }
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
    <BanaOzelPopup isOpen={showBanaOzel} onClose={() => setShowBanaOzel(false)} />
    </>
  )
}
