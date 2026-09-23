'use client'

import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import {
  Crown, Shield, Star, Gem, Zap, Award, Flame, Heart,
  Rocket, Sparkles, Coffee, Moon, Sun, Music, Camera
} from 'lucide-react'

export type SpecialBadgeType = 
  | 'vip' | 'beta_tester' | 'early_supporter' | 'verified'
  | 'top_spender' | 'top_gifter' | 'streamer_star' | 'fortune_master'
  | 'social_king' | 'loyal_member' | 'event_winner' | 'moderator'
  | 'diamond'

interface SpecialBadge {
  type: SpecialBadgeType
  earnedAt?: string
}

interface ProfileSpecialBadgesProps {
  badges: SpecialBadge[]
  size?: 'sm' | 'md' | 'lg'
}

const BADGE_CONFIG: Record<SpecialBadgeType, {
  nameTr: string
  nameEn: string
  icon: React.ElementType
  gradient: string
  glow: string
  animation?: string
}> = {
  vip: {
    nameTr: 'VIP Üye',
    nameEn: 'VIP Member',
    icon: Crown,
    gradient: 'from-amber-400 via-yellow-500 to-orange-400',
    glow: 'shadow-amber-500/50',
    animation: 'badge-pulse-gold'
  },
  beta_tester: {
    nameTr: 'Beta Test Kullanıcısı',
    nameEn: 'Beta Tester',
    icon: Rocket,
    gradient: 'from-cyan-400 via-blue-500 to-purple-500',
    glow: 'shadow-blue-500/50',
    animation: 'badge-float'
  },
  early_supporter: {
    nameTr: 'Erken Destekçi',
    nameEn: 'Early Supporter',
    icon: Heart,
    gradient: 'from-pink-400 via-rose-500 to-red-500',
    glow: 'shadow-pink-500/50',
    animation: 'badge-heartbeat'
  },
  verified: {
    nameTr: 'Doğrulanmış',
    nameEn: 'Verified',
    icon: Shield,
    gradient: 'from-blue-400 to-cyan-400',
    glow: 'shadow-blue-500/50',
    animation: 'badge-shine'
  },
  top_spender: {
    nameTr: 'En Çok Harcayan',
    nameEn: 'Top Spender',
    icon: Gem,
    gradient: 'from-purple-400 via-violet-500 to-indigo-500',
    glow: 'shadow-purple-500/50',
    animation: 'badge-sparkle'
  },
  top_gifter: {
    nameTr: 'Cömert Bağışçı',
    nameEn: 'Top Gifter',
    icon: Sparkles,
    gradient: 'from-rose-400 via-pink-500 to-fuchsia-500',
    glow: 'shadow-pink-500/50',
    animation: 'badge-bounce'
  },
  streamer_star: {
    nameTr: 'Yayın Yıldızı',
    nameEn: 'Streamer Star',
    icon: Star,
    gradient: 'from-red-400 via-orange-500 to-yellow-500',
    glow: 'shadow-orange-500/50',
    animation: 'badge-rotate-star'
  },
  fortune_master: {
    nameTr: 'Fal Ustası',
    nameEn: 'Fortune Master',
    icon: Moon,
    gradient: 'from-indigo-400 via-purple-500 to-pink-500',
    glow: 'shadow-indigo-500/50',
    animation: 'badge-glow'
  },
  social_king: {
    nameTr: 'Sosyal Kral',
    nameEn: 'Social King',
    icon: Crown,
    gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    glow: 'shadow-emerald-500/50',
    animation: 'badge-pulse'
  },
  loyal_member: {
    nameTr: 'Sadık Üye',
    nameEn: 'Loyal Member',
    icon: Award,
    gradient: 'from-amber-300 via-yellow-400 to-amber-500',
    glow: 'shadow-yellow-500/50',
    animation: 'badge-shine'
  },
  event_winner: {
    nameTr: 'Etkinlik Kazananı',
    nameEn: 'Event Winner',
    icon: Flame,
    gradient: 'from-orange-400 via-red-500 to-rose-500',
    glow: 'shadow-red-500/50',
    animation: 'badge-flame'
  },
  moderator: {
    nameTr: 'Moderatör',
    nameEn: 'Moderator',
    icon: Shield,
    gradient: 'from-green-400 via-emerald-500 to-teal-500',
    glow: 'shadow-green-500/50',
    animation: 'badge-pulse'
  },
  diamond: {
    nameTr: 'Elmas Üye',
    nameEn: 'Diamond Member',
    icon: Gem,
    gradient: 'from-cyan-300 via-blue-400 to-purple-500',
    glow: 'shadow-cyan-500/50',
    animation: 'badge-sparkle'
  }
}

const SIZE_CONFIG = {
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-xs' },
  md: { container: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-sm' },
  lg: { container: 'w-12 h-12', icon: 'w-6 h-6', text: 'text-base' }
}

export function SpecialBadge({ type, size = 'md' }: { type: SpecialBadgeType; size?: 'sm' | 'md' | 'lg' }) {
  const { language } = useLanguage()
  const config = BADGE_CONFIG[type]
  if (!config) return null
  const sizeConfig = SIZE_CONFIG[size]
  const Icon = config.icon

  return (
    <div className="relative group">
      <motion.div
        whileHover={{ scale: 1.1 }}
        className={`${sizeConfig.container} rounded-full bg-gradient-to-br ${config.gradient} p-0.5 shadow-lg ${config.glow} ${config.animation || ''}`}
      >
        <div className="w-full h-full rounded-full bg-purple-950/80 flex items-center justify-center">
          <Icon className={`${sizeConfig.icon} text-white drop-shadow-lg`} />
        </div>
      </motion.div>
      
      {/* Tooltip */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 px-3 py-1.5 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-purple-500/30 pointer-events-none">
        {config.nameTr}
      </div>
    </div>
  )
}

export default function ProfileSpecialBadges({ badges, size = 'md' }: ProfileSpecialBadgesProps) {
  const { language } = useLanguage()

  if (!badges || badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-3">
      {badges.map((badge, index) => (
        <motion.div
          key={badge.type}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.1, type: 'spring', stiffness: 300 }}
        >
          <SpecialBadge type={badge.type} size={size} />
        </motion.div>
      ))}
    </div>
  )
}
