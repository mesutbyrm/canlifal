'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

export type BadgeType = 'basic' | 'premium' | 'gold' | 'diamond'
export type EffectType = 'sparkles' | 'pulse' | 'rainbow' | 'fire' | 'glow' | 'none'

interface UserBadgeProps {
  badge: BadgeType
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animate?: boolean
}

const BADGE_CONFIG: Record<BadgeType, { 
  label: string
  labelTr: string
  bgPosition: string
  colors: string[]
  glowColor: string
}> = {
  basic: {
    label: 'Basic',
    labelTr: 'Basic',
    bgPosition: '0% 50%',
    colors: ['#6b7280', '#9ca3af', '#d1d5db'],
    glowColor: 'rgba(156, 163, 175, 0.6)'
  },
  premium: {
    label: 'Premium',
    labelTr: 'Premium',
    bgPosition: '33% 50%',
    colors: ['#7c3aed', '#a855f7', '#c084fc'],
    glowColor: 'rgba(168, 85, 247, 0.6)'
  },
  gold: {
    label: 'Gold',
    labelTr: 'Gold',
    bgPosition: '66% 50%',
    colors: ['#d97706', '#f59e0b', '#fbbf24'],
    glowColor: 'rgba(251, 191, 36, 0.6)'
  },
  diamond: {
    label: 'Diamond',
    labelTr: 'Diamond',
    bgPosition: '100% 50%',
    colors: ['#06b6d4', '#38bdf8', '#7dd3fc'],
    glowColor: 'rgba(56, 189, 248, 0.6)'
  }
}

const SIZE_CONFIG = {
  sm: { container: 'w-6 h-6', image: 24, label: 'text-[10px]' },
  md: { container: 'w-8 h-8', image: 32, label: 'text-xs' },
  lg: { container: 'w-12 h-12', image: 48, label: 'text-sm' }
}

export function UserBadge({ badge, size = 'md', showLabel = false, animate = true }: UserBadgeProps) {
  const config = BADGE_CONFIG[badge]
  const sizeConfig = SIZE_CONFIG[size]
  
  // Badge position in sprite (0=basic, 1=premium, 2=gold, 3=diamond)
  const badgeIndex = ['basic', 'premium', 'gold', 'diamond'].indexOf(badge)
  const xOffset = badgeIndex * 25 // Each badge is roughly 25% of image width
  
  return (
    <div className="inline-flex items-center gap-1">
      <motion.div
        className={`relative ${sizeConfig.container} flex-shrink-0`}
        animate={animate ? {
          filter: [
            `drop-shadow(0 0 4px ${config.glowColor})`,
            `drop-shadow(0 0 8px ${config.glowColor})`,
            `drop-shadow(0 0 4px ${config.glowColor})`
          ]
        } : {}}
        transition={animate ? {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        } : {}}
      >
        <div 
          className="w-full h-full bg-cover bg-no-repeat"
          style={{
            backgroundImage: 'url(/badges/all-badges.jpg)',
            backgroundPosition: config.bgPosition,
            backgroundSize: '400% 100%'
          }}
        />
      </motion.div>
      {showLabel && (
        <span 
          className={`font-semibold ${sizeConfig.label}`}
          style={{ color: config.colors[1] }}
        >
          {config.label}
        </span>
      )}
    </div>
  )
}

// Profile effect component that wraps user avatar
interface ProfileEffectProps {
  effect: EffectType
  children: React.ReactNode
  className?: string
}

export function ProfileEffect({ effect, children, className = '' }: ProfileEffectProps) {
  if (effect === 'none') {
    return <div className={className}>{children}</div>
  }

  const effectStyles: Record<EffectType, string> = {
    sparkles: 'animate-sparkle-border',
    pulse: 'animate-pulse-glow',
    rainbow: 'animate-rainbow-border',
    fire: 'animate-fire-glow',
    glow: 'animate-soft-glow',
    none: ''
  }

  return (
    <div className={`relative ${className}`}>
      <div className={`absolute inset-0 rounded-full ${effectStyles[effect]}`} />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// Display multiple badges
interface UserBadgesDisplayProps {
  badges: BadgeType[]
  size?: 'sm' | 'md' | 'lg'
  maxDisplay?: number
}

export function UserBadgesDisplay({ badges, size = 'sm', maxDisplay = 3 }: UserBadgesDisplayProps) {
  if (!badges || badges.length === 0) return null
  
  const displayBadges = badges.slice(0, maxDisplay)
  const remaining = badges.length - maxDisplay
  
  return (
    <div className="flex items-center gap-0.5">
      {displayBadges.map((badge, i) => (
        <UserBadge key={`${badge}-${i}`} badge={badge} size={size} />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-400 ml-1">+{remaining}</span>
      )}
    </div>
  )
}

// Helper to parse badges from JSON string
export function parseBadges(badgesString: string | null | undefined): BadgeType[] {
  if (!badgesString) return []
  try {
    const parsed = JSON.parse(badgesString)
    return Array.isArray(parsed) ? parsed.filter(b => 
      ['basic', 'premium', 'gold', 'diamond'].includes(b)
    ) : []
  } catch {
    return []
  }
}

// Helper to stringify badges
export function stringifyBadges(badges: BadgeType[]): string {
  return JSON.stringify(badges)
}
