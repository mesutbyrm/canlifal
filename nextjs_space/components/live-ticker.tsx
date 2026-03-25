'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { Circle, Coins } from 'lucide-react'

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
    onlineCount: 0,
    onlineTellerCount: 0,
    recentPurchasers: [],
  })
  const [settings, setSettings] = useState<TickerSettings>(defaultSettings)
  const tickerRef = useRef<HTMLDivElement>(null)

  const secondaryText = 'text-white'
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

  // Build scrolling ticker items
  const scrollItems: JSX.Element[] = []

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