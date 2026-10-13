'use client'

import { useState, useEffect } from 'react'
import { FOUNDER_LABEL_UPPER, isFounderAccount } from '@/lib/founder'

interface BadgeData {
  id: string
  name: string
  tier: string
  imageUrl: string
}

interface MembershipBadgeProps {
  membership: string // basic, premium, gold, diamond, admin
  size?: 'sm' | 'md' | 'lg'
  className?: string
  role?: string | null
  isFounder?: boolean | null
}

const TIER_LABELS: Record<string, string> = {
  basic: 'BASIC',
  premium: 'PREMIUM',
  gold: 'GOLD',
  diamond: 'DIAMOND',
  admin: FOUNDER_LABEL_UPPER,
  yonetici: FOUNDER_LABEL_UPPER,
  founder: FOUNDER_LABEL_UPPER,
  faluser: 'BASIC',
}

const TIER_COLORS: Record<string, string> = {
  basic: 'from-gray-600 to-gray-500',
  premium: 'from-purple-600 to-purple-500',
  gold: 'from-yellow-600 to-amber-500',
  diamond: 'from-cyan-500 to-blue-500',
  admin: 'from-amber-500 via-yellow-400 to-amber-600',
  yonetici: 'from-amber-500 via-yellow-400 to-amber-600',
  founder: 'from-amber-500 via-yellow-400 to-amber-600',
  faluser: 'from-gray-600 to-gray-500',
}

// Global badge cache
let badgeCache: BadgeData[] | null = null
let badgeFetchPromise: Promise<BadgeData[]> | null = null

function fetchBadges(): Promise<BadgeData[]> {
  if (badgeCache) return Promise.resolve(badgeCache)
  if (badgeFetchPromise) return badgeFetchPromise

  badgeFetchPromise = fetch('/api/membership-badges')
    .then(res => res.ok ? res.json() : [])
    .then((data: BadgeData[]) => {
      badgeCache = data
      // Refresh cache every 5 minutes
      setTimeout(() => { badgeCache = null; badgeFetchPromise = null }, 5 * 60 * 1000)
      return data
    })
    .catch(() => {
      badgeFetchPromise = null
      return []
    })

  return badgeFetchPromise
}

export default function MembershipBadge({ membership, size = 'sm', className = '', role, isFounder }: MembershipBadgeProps) {
  const [badges, setBadges] = useState<BadgeData[]>(badgeCache || [])
  const [loaded, setLoaded] = useState(!!badgeCache)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (!badgeCache) {
      fetchBadges().then(data => {
        setBadges(data)
        setLoaded(true)
      })
    } else {
      setLoaded(true)
    }
  }, [])

  const founder = isFounderAccount({ role, isFounder }) || membership === 'admin' || membership === 'yonetici' || membership === 'founder'
  const rawTier = founder ? 'founder' : (membership || 'basic')
  // Map faluser to basic for badge lookup
  const tier = rawTier === 'faluser' ? 'basic' : rawTier
  const label = founder ? FOUNDER_LABEL_UPPER : (TIER_LABELS[tier] || tier.toUpperCase())

  // Find a badge image for this tier (kurucu rozeti yoksa admin rozetine düşer)
  const tierBadge = founder
    ? (badges.find(b => b.tier === 'founder') || badges.find(b => b.tier === 'admin'))
    : badges.find(b => b.tier === tier)

  const sizeConfig = {
    sm: { w: 80, h: 24, text: 'text-[8px]' },
    md: { w: 120, h: 36, text: 'text-[10px]' },
    lg: { w: 160, h: 48, text: 'text-sm' },
  }

  const { w, h, text } = sizeConfig[size]

  // If there's a badge image, show it with text overlay
  if (tierBadge && !imgError) {
    return (
      <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`} style={{ width: w, height: h }}>
        <img
          src={tierBadge.imageUrl}
          alt={`${label} rozeti`}
          width={w}
          height={h}
          className="object-contain w-full h-full"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-white font-bold ${text} tracking-wider`}
            style={{ textShadow: '0 0 6px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.6)' }}
          >
            {label}
          </span>
        </div>
      </div>
    )
  }

  // Fallback: simple gradient badge pill
  const gradient = TIER_COLORS[tier] || TIER_COLORS.basic
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full bg-gradient-to-r ${gradient} ${text} font-bold text-white tracking-wider ${className}`}>
      {label}
    </span>
  )
}

// Export for preloading
export function preloadMembershipBadges() {
  fetchBadges()
}
