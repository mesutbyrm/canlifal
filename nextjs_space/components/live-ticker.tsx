'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { useSession } from 'next-auth/react'
import { Circle, Coins, Crown } from 'lucide-react'

interface TickerBadge {
  name: string
  icon: string
  color: string
  bgColor: string
}

interface OnlineUser {
  id: string
  name: string
  username: string | null
  image: string | null
  isGuest?: boolean
  isBot?: boolean
  botName?: string | null
  deviceType?: string
  membership?: string
  customBadges?: TickerBadge[]
}

interface RecentPurchaser {
  id: string
  userId: string
  amount: number
  createdAt: string
  user: {
    id: string
    name: string
    username: string | null
    image: string | null
  }
}

interface BigGift {
  id: string
  totalPrice: number
  createdAt: string
  sender: {
    id: string
    name: string
    username: string | null
    image: string | null
  }
  stream: {
    id: string
    title: string
    user: {
      id: string
      name: string
      username: string | null
      image: string | null
    }
  }
  giftType: {
    name: string
    icon: string
  }
}

interface TickerData {
  onlineUsers: OnlineUser[]
  onlineCount: number
  onlineTellerCount: number
  recentPurchasers: RecentPurchaser[]
  bigGifts: BigGift[]
}

interface CustomText {
  id: string
  text: string
  effect: string
  color: string
}

interface TickerSettings {
  buttonText: string
  buttonIcon: string
  buttonLink: string
  buttonVisible: boolean
  scrollDirection: string
  scrollSpeed: number
  bgColor: string
  bgGradient: string
  onlineDisplay: string
  customTexts: CustomText[]
  textEffect: string
}

const defaultSettings: TickerSettings = {
  buttonText: 'Canlı Falcı',
  buttonIcon: '✨',
  buttonLink: '/canli-falcilar',
  buttonVisible: true,
  scrollDirection: 'rtl',
  scrollSpeed: 20,
  bgColor: '',
  bgGradient: '',
  onlineDisplay: 'single',
  customTexts: [],
  textEffect: 'none',
}

export default function LiveTicker() {
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const { data: session } = useSession() || {}
  const [data, setData] = useState<TickerData>({
    onlineUsers: [],
    onlineCount: 0,
    onlineTellerCount: 0,
    recentPurchasers: [],
    bigGifts: []
  })
  const [settings, setSettings] = useState<TickerSettings>(defaultSettings)
  const tickerRef = useRef<HTMLDivElement>(null)

  const secondaryText = 'text-white'
  const guestColor = 'text-fuchsia-200'
  const accentColor = 'text-fuchsia-300'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/homepage-ticker')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (e) {
        console.error('Live ticker fetch error:', e)
      }
    }
    const fetchTickerSettings = async () => {
      try {
        const res = await fetch('/api/homepage-fortune-cards')
        if (res.ok) {
          const json = await res.json()
          if (json.ticker) {
            const t = json.ticker
            setSettings({
              buttonText: t.buttonText || 'Canlı Falcı',
              buttonIcon: t.buttonIcon || '✨',
              buttonLink: t.buttonLink || '/canli-falcilar',
              buttonVisible: t.buttonVisible !== false,
              scrollDirection: t.scrollDirection || 'rtl',
              scrollSpeed: t.scrollSpeed || 20,
              bgColor: t.bgColor || '',
              bgGradient: t.bgGradient || '',
              onlineDisplay: t.onlineDisplay || 'single',
              customTexts: Array.isArray(t.customTexts) ? t.customTexts : [],
              textEffect: t.textEffect || 'none',
            })
          }
        }
      } catch (e) {}
    }

    fetchData()
    fetchTickerSettings()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  // Device type emoji helper
  const getDeviceEmoji = (deviceType?: string) => {
    switch (deviceType) {
      case 'mobile': return '📱'
      case 'tablet': return '📟'
      case 'desktop': return '💻'
      default: return '💻'
    }
  }

  // Membership tier config
  const getMembershipDisplay = (membership?: string) => {
    switch (membership) {
      case 'gold': return { label: 'Gold Üye', emoji: '👑', color: 'text-yellow-400', bgClass: 'bg-yellow-500/20 border-yellow-500/40' }
      case 'premium': return { label: 'Premium Üye', emoji: '⭐', color: 'text-purple-400', bgClass: 'bg-purple-500/20 border-purple-500/40' }
      case 'diamond': return { label: 'Diamond Üye', emoji: '💎', color: 'text-cyan-300', bgClass: 'bg-cyan-500/20 border-cyan-500/40' }
      default: return null
    }
  }

  // Effect class helper for custom texts
  const getEffectClass = (effect: string) => {
    switch (effect) {
      case 'glow': return 'ticker-effect-glow'
      case 'pulse': return 'ticker-effect-pulse'
      case 'rainbow': return 'ticker-effect-rainbow'
      case 'neon': return 'ticker-effect-neon'
      case 'typewriter': return 'ticker-effect-typewriter'
      case 'bounce': return 'ticker-effect-bounce'
      default: return ''
    }
  }

  // Build scrolling ticker items
  const scrollItems: JSX.Element[] = []

  // Online users based on display mode
  if (settings.onlineDisplay !== 'hidden') {
    const users = data.onlineUsers.slice(0, 20)
    if (settings.onlineDisplay === 'triple') {
      // Group users in chunks of 3
      for (let i = 0; i < users.length; i += 3) {
        const group = users.slice(i, i + 3)
        scrollItems.push(
          <div key={`online-group-${i}`} className="inline-flex items-center gap-3 px-3 py-1.5 mx-1 whitespace-nowrap">
            {group.map((user, idx) => {
              const isGuest = user.isGuest
              const isBot = user.isBot
              const displayName = isBot ? (user.botName || user.name) : (isGuest ? user.name : (user.username || user.name?.split(' ')[0] || 'Kullanıcı'))
              const dotColor = isBot ? 'text-orange-400 fill-orange-400' : (isGuest ? guestColor + ' fill-current' : 'text-green-400 fill-green-400')
              const nameColor = isBot ? 'text-orange-300' : (isGuest ? guestColor : secondaryText)
              return (
                <span key={`${user.id}-${idx}`} className="inline-flex items-center gap-1">
                  {isBot ? <span className="text-xs">🤖</span> : <Circle className={`w-2 h-2 ${dotColor} animate-pulse`} />}
                  <span className={`text-xs font-medium ${nameColor}`}>{displayName}</span>
                </span>
              )
            })}
          </div>
        )
      }
    } else {
      // single mode - show individually (original behavior)
      users.forEach((user, index) => {
        const isGuest = user.isGuest
        const isBot = user.isBot
        const displayName = isBot ? (user.botName || user.name) : (isGuest ? user.name : (user.username || user.name?.split(' ')[0] || 'Kullanıcı'))
        const deviceIcon = getDeviceEmoji(user.deviceType)
        const dotColor = isBot ? 'text-orange-400 fill-orange-400' : (isGuest ? guestColor + ' fill-current' : 'text-green-400 fill-green-400')
        const nameColor = isBot ? 'text-orange-300' : (isGuest ? guestColor : secondaryText)
        const membershipDisplay = !isGuest && !isBot ? getMembershipDisplay(user.membership) : null
        const globalEffectClass = settings.textEffect !== 'none' ? getEffectClass(settings.textEffect) : ''

        scrollItems.push(
          <div key={`online-${user.id}-${index}`} className={`inline-flex items-center gap-1.5 px-3 py-1.5 mx-1 whitespace-nowrap ${globalEffectClass}`}>
            {isBot ? (
              <span className="text-xs">🤖</span>
            ) : (
              <Circle className={`w-2.5 h-2.5 ${dotColor} animate-pulse`} />
            )}
            <span className="text-xs opacity-70">{deviceIcon}</span>
            <span className={`text-xs sm:text-sm font-medium ${nameColor}`}>{displayName}</span>
            {membershipDisplay && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${membershipDisplay.bgClass} ${membershipDisplay.color}`}>
                <span>{membershipDisplay.emoji}</span>
                <span className="hidden sm:inline">{membershipDisplay.label}</span>
              </span>
            )}
            {user.customBadges && user.customBadges.length > 0 && user.customBadges.map((badge, bi) => (
              <span
                key={`badge-${bi}`}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border"
                style={{ color: badge.color, backgroundColor: badge.bgColor + '33', borderColor: badge.color + '66' }}
                title={badge.name}
              >
                <span>{badge.icon}</span>
                <span className="hidden sm:inline">{badge.name}</span>
              </span>
            ))}
          </div>
        )
      })
    }
  }

  // Recent purchasers
  data.recentPurchasers.slice(0, 5).forEach((purchase, index) => {
    scrollItems.push(
      <div key={`purchase-${purchase.id}-${index}`} className="inline-flex items-center gap-2 px-3 py-1.5 mx-1 whitespace-nowrap">
        <Coins className={`w-4 h-4 ${accentColor}`} />
        <span className={`${secondaryText} text-xs sm:text-sm font-medium`}>
          {purchase.user.username || purchase.user.name?.split(' ')[0] || 'Kullanıcı'}
        </span>
        <span className={`${accentColor} text-xs sm:text-sm font-bold`}>+{purchase.amount}💰</span>
      </div>
    )
  })

  // Big gifts
  data.bigGifts.slice(0, 3).forEach((gift, index) => {
    const senderName = gift.sender.username || gift.sender.name?.split(' ')[0] || 'Kullanıcı'
    const receiverName = gift.stream.user.username || gift.stream.user.name?.split(' ')[0] || 'Kullanıcı'
    scrollItems.push(
      <div key={`gift-${gift.id}-${index}`} className="inline-flex items-center gap-2 px-3 py-1.5 mx-1 whitespace-nowrap">
        <Crown className={`w-4 h-4 text-pink-400`} />
        <span className={`text-xs sm:text-sm ${guestColor}`}>
          <span className="text-white font-medium">{senderName}</span>→
          <span className="text-xl">{gift.giftType.icon}</span>→
          <span className="text-white font-medium">{receiverName}</span>
        </span>
      </div>
    )
  })

  // Custom scrolling texts from admin
  settings.customTexts.forEach((ct) => {
    const effectClass = ct.effect !== 'none' ? getEffectClass(ct.effect) : (settings.textEffect !== 'none' ? getEffectClass(settings.textEffect) : '')
    scrollItems.push(
      <div key={`custom-${ct.id}`} className={`inline-flex items-center gap-2 px-3 py-1.5 mx-1 whitespace-nowrap ${effectClass}`}>
        <span className="text-xs sm:text-sm font-medium" style={ct.color ? { color: ct.color } : undefined}>
          {ct.text}
        </span>
      </div>
    )
  })

  // Background style
  const bgStyle = useMemo(() => {
    if (settings.bgGradient) return { background: settings.bgGradient }
    if (settings.bgColor) return { background: settings.bgColor }
    return undefined
  }, [settings.bgColor, settings.bgGradient])

  const defaultBgClass = (!settings.bgColor && !settings.bgGradient)
    ? 'bg-gradient-to-r from-[#0a0118] via-[#150828] to-[#0a0118] border-fuchsia-800/40'
    : 'border-fuchsia-800/40'

  const animationName = settings.scrollDirection === 'ltr' ? 'live-ticker-ltr' : 'live-ticker-rtl'
  const animationDuration = `${settings.scrollSpeed || 20}s`

  return (
    <div className={`w-full overflow-hidden ${defaultBgClass} border-b`} style={bgStyle || undefined}>
      <div className="flex items-center h-10 sm:h-12">
        {/* Ticker button - hideable */}
        {settings.buttonVisible && (
          <Link
            href={`/${language}${settings.buttonLink || '/canli-falcilar'}`}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 h-full bg-gradient-to-r from-fuchsia-700/90 to-purple-700/90 text-white text-xs sm:text-sm font-bold hover:from-fuchsia-600 hover:to-purple-600 transition-all"
          >
            <span className="text-sm">{settings.buttonIcon}</span>
            <span className="hidden xs:inline">{settings.buttonText}</span>
            <span className="xs:hidden">{settings.buttonText.split(' ')[0]}</span>
            {data.onlineTellerCount > 0 && (
              <span className="ml-0.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] sm:text-xs font-bold animate-pulse">
                {data.onlineTellerCount}
              </span>
            )}
          </Link>
        )}
        <div className="flex-shrink-0 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-full bg-green-900/40">
          <Circle className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-green-400 fill-green-400 animate-pulse" />
          <span className="text-green-400 text-xs sm:text-sm font-bold">{data.onlineCount}</span>
          <span className="text-green-300 text-[10px] sm:text-xs hidden sm:inline">kişi</span>
        </div>
        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden h-full flex items-center" ref={tickerRef}>
          <div className="live-ticker-scroll inline-flex" style={{ animationName, animationDuration, animationTimingFunction: 'linear', animationIterationCount: 'infinite' }}>
            {scrollItems.length > 0 ? scrollItems : (
              <div className="inline-flex items-center gap-2 px-3 py-1 mx-2 whitespace-nowrap">
                <span className="text-fuchsia-300/50 text-xs">Şu an aktif kullanıcı yok</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes live-ticker-rtl {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes live-ticker-ltr {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .live-ticker-scroll {
          will-change: transform;
        }
        /* Text effects */
        .ticker-effect-glow {
          text-shadow: 0 0 8px rgba(217, 70, 239, 0.8), 0 0 16px rgba(217, 70, 239, 0.5);
        }
        .ticker-effect-pulse {
          animation: ticker-pulse 1.5s ease-in-out infinite;
        }
        @keyframes ticker-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .ticker-effect-rainbow {
          background: linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          background-size: 200% 100%;
          animation: ticker-rainbow 3s linear infinite;
        }
        @keyframes ticker-rainbow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .ticker-effect-neon {
          text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px #0ff, 0 0 40px #0ff, 0 0 60px #0ff;
          color: #fff;
        }
        .ticker-effect-typewriter {
          border-right: 2px solid rgba(255,255,255,0.7);
          animation: ticker-blink 0.8s step-end infinite;
        }
        @keyframes ticker-blink {
          50% { border-color: transparent; }
        }
        .ticker-effect-bounce {
          animation: ticker-bounce 1s ease infinite;
        }
        @keyframes ticker-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}