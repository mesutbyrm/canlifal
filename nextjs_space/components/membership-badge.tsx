'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

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
}

const TIER_LABELS: Record<string, string> = {
  basic: 'BASIC',
  premium: 'PREMIUM',
  gold: 'GOLD',
  diamond: 'DIAMOND',
  admin: 'ADMIN',
  faluser: 'BASIC',
}

const TIER_COLORS: Record<string, string> = {
  basic: 'from-gray-600 to-gray-500',
  premium: 'from-purple-600 to-purple-500',
  gold: 'from-yellow-600 to-amber-500',
  diamond: 'from-cyan-500 to-blue-500',
  admin: 'from-red-600 to-red-500',
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

export default function MembershipBadge({ membership, size = 'sm', className = '' }: MembershipBadgeProps) {
  const [badges, setBadges] = useState<BadgeData[]>(badgeCache || [])
  const [loaded, setLoaded] = useState(!!badgeCache)

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

  const tier = membership || 'basic'
  const label = TIER_LABELS[tier] || tier.toUpperCase()

  // Find a badge image for this tier
  const tierBadge = badges.find(b => b.tier === tier)

  const sizeConfig = {
    sm: { w: 80, h: 24, text: 'text-[8px]' },
    md: { w: 120, h: 36, text: 'text-[10px]' },
    lg: { w: 160, h: 48, text: 'text-sm' },
  }

  const { w, h, text } = sizeConfig[size]

  // If there's a badge image, show it with text overlay
  if (tierBadge) {
    return (
      <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`} style={{ width: w, height: h }}>
        <Image
          src={tierBadge.imageUrl}
          alt={`${label} rozeti`}
          width={w}
          height={h}
          className="object-contain w-full h-full"
          unoptimized
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
