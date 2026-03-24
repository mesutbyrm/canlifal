'use client'

import { useEffect, useRef } from 'react'
import { Crown, Star, Sparkles, Gem, User } from 'lucide-react'

export type MembershipTier = 'faluser' | 'basic' | 'premium' | 'gold' | 'diamond'

interface TierBadgeProps {
  tier: MembershipTier
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showLabel?: boolean
  className?: string
}

interface TierAvatarWrapperProps {
  tier: MembershipTier
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const TIER_CONFIG = {
  faluser: {
    label: 'Canlifal',
    icon: User,
    gradient: 'from-gray-400 to-gray-600',
    bgGradient: 'from-gray-500/20 to-gray-700/20',
    borderClass: 'tier-border-faluser',
    badgeClass: 'tier-badge-faluser',
    textColor: 'text-gray-400',
    glowColor: 'rgba(156, 163, 175, 0.3)',
    emoji: '👤',
  },
  basic: {
    label: 'Basic',
    icon: Star,
    gradient: 'from-blue-400 to-blue-600',
    bgGradient: 'from-blue-500/20 to-blue-700/20',
    borderClass: 'tier-border-basic',
    badgeClass: 'tier-badge-basic',
    textColor: 'text-blue-400',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    emoji: '⭐',
  },
  premium: {
    label: 'Premium',
    icon: Sparkles,
    gradient: 'from-purple-400 via-pink-500 to-purple-600',
    bgGradient: 'from-purple-500/20 via-pink-500/20 to-purple-700/20',
    borderClass: 'tier-border-premium',
    badgeClass: 'tier-badge-premium',
    textColor: 'text-purple-400',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    emoji: '✨',
  },
  gold: {
    label: 'Gold',
    icon: Crown,
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    bgGradient: 'from-yellow-500/20 via-amber-500/20 to-orange-500/20',
    borderClass: 'tier-border-gold',
    badgeClass: 'tier-badge-gold',
    textColor: 'text-amber-400',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    emoji: '👑',
  },
  diamond: {
    label: 'Diamond',
    icon: Gem,
    gradient: 'from-cyan-300 via-blue-400 to-purple-500',
    bgGradient: 'from-cyan-400/20 via-blue-400/20 to-purple-500/20',
    borderClass: 'tier-border-diamond',
    badgeClass: 'tier-badge-diamond',
    textColor: 'text-cyan-300',
    glowColor: 'rgba(34, 211, 238, 0.7)',
    emoji: '💎',
  },
}

const SIZE_CONFIG = {
  sm: { badge: 'w-5 h-5', icon: 'w-3 h-3', text: 'text-xs', avatar: 'w-12 h-12' },
  md: { badge: 'w-6 h-6', icon: 'w-3.5 h-3.5', text: 'text-sm', avatar: 'w-20 h-20' },
  lg: { badge: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-base', avatar: 'w-28 h-28' },
  xl: { badge: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-lg', avatar: 'w-36 h-36' },
}

export function getTierConfig(tier: MembershipTier) {
  return TIER_CONFIG[tier] || TIER_CONFIG.faluser
}

export function TierBadge({ tier, size = 'md', showLabel = false, className = '' }: TierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.faluser
  const sizeConfig = SIZE_CONFIG[size]
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div
        className={`${sizeConfig.badge} rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center ${config.badgeClass}`}
      >
        <Icon className={`${sizeConfig.icon} text-white drop-shadow-lg`} />
      </div>
      {showLabel && (
        <span className={`${sizeConfig.text} font-semibold ${config.textColor}`}>
          {config.label}
        </span>
      )}
    </div>
  )
}

export function TierAvatarWrapper({ tier, children, size = 'lg', className = '' }: TierAvatarWrapperProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.faluser
  const sizeConfig = SIZE_CONFIG[size]
  const particleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tier === 'diamond' || tier === 'gold') {
      const container = particleRef.current
      if (!container) return

      const createParticle = () => {
        const particle = document.createElement('div')
        particle.className = 'tier-particle'
        particle.style.cssText = `
          position: absolute;
          width: ${Math.random() * 6 + 3}px;
          height: ${Math.random() * 6 + 3}px;
          background: ${tier === 'diamond' ? 'linear-gradient(135deg, #22d3ee, #3b82f6, #a855f7)' : 'linear-gradient(135deg, #fbbf24, #f59e0b, #ea580c)'};
          border-radius: 50%;
          pointer-events: none;
          animation: particleFly ${Math.random() * 2 + 1.5}s ease-out forwards;
          left: ${50 + (Math.random() - 0.5) * 20}%;
          top: ${50 + (Math.random() - 0.5) * 20}%;
          box-shadow: 0 0 ${Math.random() * 8 + 4}px ${tier === 'diamond' ? 'rgba(34, 211, 238, 0.8)' : 'rgba(251, 191, 36, 0.8)'};
        `
        container.appendChild(particle)
        setTimeout(() => particle.remove(), 2500)
      }

      const interval = setInterval(createParticle, tier === 'diamond' ? 300 : 500)
      return () => clearInterval(interval)
    }
  }, [tier])

  return (
    <div className={`relative ${className}`}>
      {/* Particle container for gold/diamond */}
      {(tier === 'diamond' || tier === 'gold') && (
        <div
          ref={particleRef}
          className="absolute inset-0 overflow-visible pointer-events-none z-10"
          style={{ transform: 'scale(1.5)' }}
        />
      )}

      {/* Glow effect */}
      <div
        className={`absolute inset-0 rounded-full blur-xl opacity-60 ${config.borderClass}-glow`}
        style={{
          background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
          transform: 'scale(1.2)',
        }}
      />

      {/* Animated border */}
      <div className={`${sizeConfig.avatar} rounded-full p-1 ${config.borderClass}`}>
        <div className="w-full h-full rounded-full overflow-hidden bg-purple-950 p-0.5">
          <div className="w-full h-full rounded-full overflow-hidden bg-purple-900/50">
            {children}
          </div>
        </div>
      </div>

      {/* Tier badge positioned at bottom-right */}
      <div className="absolute -bottom-1 -right-1 z-20">
        <TierBadge tier={tier} size={size === 'xl' ? 'lg' : size === 'lg' ? 'md' : 'sm'} />
      </div>
    </div>
  )
}

export function TierNameBadge({ tier, name, role, chatRole, isLive, className = '' }: { tier: MembershipTier; name: string; role?: string; chatRole?: string; isLive?: boolean; className?: string }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.faluser

  // Determine effect class based on role/tier/context
  const getEffectClass = () => {
    if (role === 'admin') return 'effect-glitch'
    if (chatRole === 'founder') return 'effect-glitch-flash'
    if (chatRole === 'admin' || chatRole === 'op') return 'effect-glitch-flash'
    if (tier === 'diamond') return 'effect-neon-glow'
    if (tier === 'gold') return 'effect-neon-flicker'
    if (tier === 'premium') return 'effect-blink'
    if (isLive) return 'effect-live-pulse'
    return ''
  }

  const effectClass = getEffectClass()
  const needsDataText = effectClass === 'effect-glitch'

  if (tier === 'faluser' && !effectClass) {
    return <span className={`text-white ${className}`}>{name}</span>
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span 
        className={`tier-name-${tier} ${effectClass}`}
        {...(needsDataText ? { 'data-text': name } : {})}
      >
        {name}
      </span>
      {tier !== 'faluser' && <span className="text-base">{config.emoji}</span>}
    </span>
  )
}

export default TierBadge
