'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/lib/language-context'
import { Circle, Coins, X, Users, Search } from 'lucide-react'

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

interface TickerData {
  onlineUsers: OnlineUser[]
  onlineCount: number
  onlineTellerCount: number
  recentPurchasers: RecentPurchaser[]
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
  const [data, setData] = useState<TickerData>({
    onlineUsers: [],
    onlineCount: 0,
    onlineTellerCount: 0,
    recentPurchasers: [],
  })
  const [settings, setSettings] = useState<TickerSettings>(defaultSettings)
  const [showOnlineModal, setShowOnlineModal] = useState(false)
  const [onlineSearch, setOnlineSearch] = useState('')
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
              buttonVisible: t.buttonVisible !== 'false' && t.buttonVisible !== false,
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
                {badge.icon && (badge.icon.startsWith('/') || badge.icon.startsWith('http')) ? (
                  <img src={badge.icon} alt={badge.name} className="w-3.5 h-3.5 object-contain" />
                ) : (
                  <span>{badge.icon}</span>
                )}
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
            href={`${settings.buttonLink || '/canli-falcilar'}`}
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
        <button
          onClick={() => { setShowOnlineModal(true); setOnlineSearch('') }}
          className="flex-shrink-0 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-full bg-green-900/40 hover:bg-green-900/60 transition-colors cursor-pointer"
          title="Çevrimiçi kullanıcıları gör"
        >
          <Circle className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-green-400 fill-green-400 animate-pulse" />
          <span className="text-green-400 text-xs sm:text-sm font-bold">{data.onlineCount}</span>
          <span className="text-green-300 text-[10px] sm:text-xs hidden sm:inline">kişi</span>
        </button>
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
      {/* Online Users Modal */}
      {showOnlineModal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={() => setShowOnlineModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full sm:w-[420px] max-h-[80vh] bg-gradient-to-b from-[#1a0a2e] to-[#0d0520] border border-fuchsia-800/50 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-purple-900/40 flex flex-col animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-fuchsia-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Çevrimiçi Kullanıcılar</h3>
                  <p className="text-green-400 text-xs font-medium">{data.onlineCount} kişi aktif</p>
                </div>
              </div>
              <button
                onClick={() => setShowOnlineModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            {/* Search */}
            <div className="px-4 py-3 border-b border-fuchsia-800/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-400/60" />
                <input
                  type="text"
                  placeholder="Kullanıcı ara..."
                  value={onlineSearch}
                  onChange={(e) => setOnlineSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-fuchsia-800/30 rounded-xl text-white text-sm placeholder:text-fuchsia-400/40 focus:outline-none focus:border-fuchsia-600/50 focus:ring-1 focus:ring-fuchsia-600/30"
                />
              </div>
            </div>
            {/* User List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 min-h-[200px] max-h-[50vh] scrollbar-thin scrollbar-thumb-fuchsia-800/40">
              {(() => {
                const filtered = data.onlineUsers.filter((u) => {
                  if (!onlineSearch.trim()) return true
                  const q = onlineSearch.toLowerCase()
                  return (u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.botName?.toLowerCase().includes(q))
                })
                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 text-fuchsia-400/50">
                      <Users className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-sm">{onlineSearch ? 'Kullanıcı bulunamadı' : 'Henüz çevrimiçi kullanıcı yok'}</p>
                    </div>
                  )
                }
                return filtered.map((user, idx) => {
                  const isGuest = user.isGuest
                  const isBot = user.isBot
                  const displayName = isBot ? (user.botName || user.name) : (user.username || user.name || 'Kullanıcı')
                  const membershipDisplay = !isGuest && !isBot ? getMembershipDisplay(user.membership) : null
                  const profileHref = !isGuest && !isBot && user.username ? `/${language}/profil/${user.username}` : null
                  const deviceIcon = getDeviceEmoji(user.deviceType)

                  const content = (
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${profileHref ? 'hover:bg-white/5 cursor-pointer' : ''} transition-colors group`}>
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-600/30 to-purple-600/30 flex items-center justify-center">
                          {user.image ? (
                            <Image src={user.image} alt={displayName} width={40} height={40} className="w-full h-full object-cover" />
                          ) : isBot ? (
                            <span className="text-lg">🤖</span>
                          ) : isGuest ? (
                            <span className="text-lg">👤</span>
                          ) : (
                            <span className="text-white font-bold text-sm">{(displayName || '?')[0].toUpperCase()}</span>
                          )}
                        </div>
                        {/* Online dot */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#1a0a2e] ${isBot ? 'bg-orange-400' : isGuest ? 'bg-fuchsia-400' : 'bg-green-400'}`} />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold truncate ${isBot ? 'text-orange-300' : isGuest ? 'text-fuchsia-200' : 'text-white'}`}>
                            {displayName}
                          </span>
                          {membershipDisplay && (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${membershipDisplay.bgClass} ${membershipDisplay.color}`}>
                              {membershipDisplay.emoji} {membershipDisplay.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-fuchsia-400/60">{deviceIcon}</span>
                          <span className="text-[11px] text-fuchsia-400/60">
                            {isBot ? 'Bot' : isGuest ? 'Misafir' : 'Üye'}
                          </span>
                          {user.customBadges && user.customBadges.length > 0 && user.customBadges.map((badge, bi) => (
                            <span
                              key={`modal-badge-${bi}`}
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-bold"
                              style={{ color: badge.color, backgroundColor: badge.bgColor + '33' }}
                              title={badge.name}
                            >
                              {badge.icon && (badge.icon.startsWith('/') || badge.icon.startsWith('http')) ? (
                                <img src={badge.icon} alt={badge.name} className="w-3 h-3 object-contain" />
                              ) : (
                                <span>{badge.icon}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Arrow for profile */}
                      {profileHref && (
                        <span className="text-fuchsia-400/30 group-hover:text-fuchsia-400/60 transition-colors text-sm">›</span>
                      )}
                    </div>
                  )

                  return profileHref ? (
                    <Link key={`modal-user-${user.id}-${idx}`} href={profileHref} onClick={() => setShowOnlineModal(false)}>
                      {content}
                    </Link>
                  ) : (
                    <div key={`modal-user-${user.id}-${idx}`}>{content}</div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
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
        .ticker-effect-glow > span,
        .ticker-effect-glow {
          text-shadow: 0 0 8px rgba(217, 70, 239, 0.8), 0 0 16px rgba(217, 70, 239, 0.5), 0 0 24px rgba(168, 85, 247, 0.4) !important;
        }
        .ticker-effect-pulse > span,
        .ticker-effect-pulse {
          animation: ticker-pulse 1.5s ease-in-out infinite !important;
        }
        @keyframes ticker-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.97); }
        }
        .ticker-effect-rainbow > span {
          background: linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
          background-size: 200% 100% !important;
          animation: ticker-rainbow 3s linear infinite !important;
        }
        @keyframes ticker-rainbow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .ticker-effect-neon > span,
        .ticker-effect-neon {
          text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px #0ff, 0 0 40px #0ff !important;
          color: #fff !important;
        }
        .ticker-effect-typewriter > span,
        .ticker-effect-typewriter {
          border-right: 2px solid rgba(255,255,255,0.7) !important;
          animation: ticker-blink 0.8s step-end infinite !important;
        }
        @keyframes ticker-blink {
          50% { border-color: transparent; }
        }
        .ticker-effect-bounce {
          animation: ticker-bounce 0.8s ease infinite !important;
        }
        @keyframes ticker-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}