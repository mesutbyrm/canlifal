'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { useSession } from 'next-auth/react'
import { Circle, Coins, Crown, Sparkles } from 'lucide-react'

interface OnlineUser {
  id: string
  name: string
  username: string | null
  image: string | null
  isGuest?: boolean
  isBot?: boolean
  botName?: string | null
  deviceType?: string
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
  const tickerRef = useRef<HTMLDivElement>(null)
  
  const bgGradient = 'bg-gradient-to-r from-[#0f0520] via-fuchsia-900/30 to-[#0f0520] border-fuchsia-500/30'
  const labelGradient = 'bg-gradient-to-r from-fuchsia-500 to-pink-500'
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
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  // Build scrolling ticker items
  const scrollItems: JSX.Element[] = []

  // Device type emoji helper
  const getDeviceEmoji = (deviceType?: string) => {
    switch (deviceType) {
      case 'mobile': return '\ud83d\udcf1'
      case 'tablet': return '\ud83d\udcdf'
      case 'desktop': return '\ud83d\udcbb'
      default: return '\ud83d\udcbb'
    }
  }

  // Online users - show all with names for registered, anonymous for guests
  data.onlineUsers.slice(0, 20).forEach((user, index) => {
    const isGuest = user.isGuest
    const isBot = user.isBot
    const displayName = isBot ? (user.botName || user.name) : (isGuest ? user.name : (user.username || user.name?.split(' ')[0] || 'Kullan\u0131c\u0131'))
    const deviceIcon = getDeviceEmoji(user.deviceType)
    const dotColor = isBot ? 'text-orange-400 fill-orange-400' : (isGuest ? guestColor + ' fill-current' : 'text-green-400 fill-green-400')
    const nameColor = isBot ? 'text-orange-300' : (isGuest ? guestColor : secondaryText)
    
    scrollItems.push(
      <div key={`online-${user.id}-${index}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 mx-1 whitespace-nowrap">
        {isBot ? (
          <span className="text-xs">\ud83e\udd16</span>
        ) : (
          <Circle className={`w-2.5 h-2.5 ${dotColor} animate-pulse`} />
        )}
        <span className="text-xs opacity-70">{deviceIcon}</span>
        <span className={`text-xs sm:text-sm font-medium ${nameColor}`}>{displayName}</span>
      </div>
    )
  })

  // Recent purchasers
  data.recentPurchasers.slice(0, 5).forEach((purchase, index) => {
    scrollItems.push(
      <div key={`purchase-${purchase.id}-${index}`} className="inline-flex items-center gap-2 px-3 py-1.5 mx-1 whitespace-nowrap">
        <Coins className={`w-4 h-4 ${accentColor}`} />
        <span className={`${secondaryText} text-xs sm:text-sm font-medium`}>
          {purchase.user.username || purchase.user.name?.split(' ')[0] || 'Kullan\u0131c\u0131'}
        </span>
        <span className={`${accentColor} text-xs sm:text-sm font-bold`}>+{purchase.amount}\ud83d\udcb0</span>
      </div>
    )
  })

  // Big gifts
  data.bigGifts.slice(0, 3).forEach((gift, index) => {
    const senderName = gift.sender.username || gift.sender.name?.split(' ')[0] || 'Kullan\u0131c\u0131'
    const receiverName = gift.stream.user.username || gift.stream.user.name?.split(' ')[0] || 'Kullan\u0131c\u0131'
    scrollItems.push(
      <div key={`gift-${gift.id}-${index}`} className="inline-flex items-center gap-2 px-3 py-1.5 mx-1 whitespace-nowrap">
        <Crown className={`w-4 h-4 text-pink-400`} />
        <span className={`text-xs sm:text-sm ${guestColor}`}>
          <span className="text-white font-medium">{senderName}</span>\u2192
          <span className="text-xl">{gift.giftType.icon}</span>\u2192
          <span className="text-white font-medium">{receiverName}</span>
        </span>
      </div>
    )
  })

  // Only show items once - no duplication
  return (
    <div className={`w-full overflow-hidden ${bgGradient} border-b`}>
      {/* Row 1: Canlı Falcı button + Online count + scrolling ticker */}
      <div className="flex items-center h-10 sm:h-12">
        <Link
          href={`/${language}/live-tellers`}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 h-full bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white text-xs sm:text-sm font-bold hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden xs:inline">{language === 'tr' ? 'Canlı Falcı' : 'Live Teller'}</span>
          <span className="xs:hidden">{language === 'tr' ? 'Canlı' : 'Live'}</span>
          {data.onlineTellerCount > 0 && (
            <span className="ml-0.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] sm:text-xs font-bold animate-pulse">
              {data.onlineTellerCount}
            </span>
          )}
        </Link>
        <div className="flex-shrink-0 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-full bg-green-900/40">
          <Circle className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-green-400 fill-green-400 animate-pulse" />
          <span className="text-green-400 text-xs sm:text-sm font-bold">{data.onlineCount}</span>
          <span className="text-green-300 text-[10px] sm:text-xs hidden sm:inline">{language === 'tr' ? 'ki\u015fi' : 'online'}</span>
        </div>
        {/* Scrolling ticker fills remaining space - items shown once */}
        <div className="flex-1 overflow-hidden h-full flex items-center" ref={tickerRef}>
          <div className="live-ticker-scroll inline-flex">
            {scrollItems.length > 0 ? scrollItems : (
              <div className="inline-flex items-center gap-2 px-3 py-1 mx-2 whitespace-nowrap">
                <span className="text-fuchsia-300/50 text-xs">{language === 'tr' ? '\u015eu an aktif kullan\u0131c\u0131 yok' : 'No active users'}</span>
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
        .live-ticker-scroll {
          animation: live-ticker-rtl 20s linear infinite;
          will-change: transform;
        }
      `}</style>
    </div>
  )
}
