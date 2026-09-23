'use client'

import React from 'react'

/**
 * Effect types:
 * 1. blink       - Basit Yanıp Sönme (Premium users)
 * 2. neon-flicker - Flicker Neon (Gold users)
 * 3. glitch-flash - Glitch Flash (Moderators/Chat Admins)
 * 4. neon-glow    - Neon Glow Yanıp Sönme (Diamond users)
 * 5. glitch       - Glitch Efekti (Site Admin/Founders)
 * 6. live-pulse   - Canlı yayın aktif kullanıcılar
 */
export type NameEffect = 'none' | 'blink' | 'neon-flicker' | 'glitch-flash' | 'neon-glow' | 'glitch' | 'live-pulse'

interface EffectTextProps {
  text: string
  effect: NameEffect
  className?: string
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div'
}

/**
 * Determines the appropriate text effect based on user role, membership tier,
 * and context (live stream, chat role, etc.)
 */
export function getNameEffect(opts: {
  role?: string        // user role: 'admin', 'moderator', 'user'
  membership?: string  // membership tier: 'faluser', 'basic', 'premium', 'gold', 'diamond'
  chatRole?: string    // chat room role: 'founder', 'admin', 'op', 'voice'
  isLive?: boolean     // currently in live stream
}): NameEffect {
  const { role, membership, chatRole, isLive } = opts

  // Site admin gets the most impressive effect - Glitch
  if (role === 'admin') return 'glitch'

  // Chat room founders get glitch-flash
  if (chatRole === 'founder') return 'glitch-flash'

  // Chat room admins/moderators get glitch-flash
  if (chatRole === 'admin' || chatRole === 'op') return 'glitch-flash'

  // Diamond members get neon-glow
  if (membership === 'diamond') return 'neon-glow'

  // Gold members get neon-flicker
  if (membership === 'gold') return 'neon-flicker'

  // Premium members get blink
  if (membership === 'premium') return 'blink'

  // Live stream active users
  if (isLive) return 'live-pulse'

  return 'none'
}

/**
 * Maps effect type to CSS class
 */
function getEffectClass(effect: NameEffect): string {
  switch (effect) {
    case 'blink': return 'effect-blink'
    case 'neon-flicker': return 'effect-neon-flicker'
    case 'glitch-flash': return 'effect-glitch-flash'
    case 'neon-glow': return 'effect-neon-glow'
    case 'glitch': return 'effect-glitch'
    case 'live-pulse': return 'effect-live-pulse'
    default: return ''
  }
}

/**
 * EffectText component - wraps text with animated effects
 */
export function EffectText({ text, effect, className = '', as: Tag = 'span' }: EffectTextProps) {
  if (effect === 'none' || !effect) {
    return <Tag className={className}>{text}</Tag>
  }

  const effectClass = getEffectClass(effect)

  // Glitch effect needs data-text attribute for ::before and ::after pseudo-elements
  if (effect === 'glitch') {
    return (
      <Tag className={`${effectClass} ${className}`} data-text={text}>
        {text}
      </Tag>
    )
  }

  return (
    <Tag className={`${effectClass} ${className}`}>
      {text}
    </Tag>
  )
}

/**
 * Quick helper: given user data, render a name with the appropriate effect
 */
export function EffectUsername({
  name,
  role,
  membership,
  chatRole,
  isLive,
  className = '',
  as = 'span',
}: {
  name: string
  role?: string
  membership?: string
  chatRole?: string
  isLive?: boolean
  className?: string
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div'
}) {
  const effect = getNameEffect({ role, membership, chatRole, isLive })
  return <EffectText text={name} effect={effect} className={className} as={as} />
}

export default EffectText
