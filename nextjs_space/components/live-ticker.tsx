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

  // Online users - show all with names for registered, anonymous for guests
  data.onlineUsers.slice(0, 20).forEach((user, index) => {
    const isGuest = user.isGuest
    const displayName = isGuest ? user.name : (user.username || user.name?.split(' ')[0] || 'Kullan\u0131c\u0131')
    scrollItems.push(
      <div key={`online-${user.id}-${index}`} className="inline-flex items-center gap-1.5 px-2 py-1 mx-1 whitespace-nowrap">
        <Circle className={`w-2 h-2 ${isGuest ? guestColor + ' fill-current' : 'text-green-400 fill-green-400'} animate-pulse`} />
        <span className={`text-[10px] font-medium ${isGuest ? guestColor : secondaryText}`}>{displayName}</span>
      </div>
    )
  })

  // Recent purchasers
  data.recentPurchasers.slice(0, 5).forEach((purchase, index) => {
    scrollItems.push(
      <div key={`purchase-${purchase.id}-${index}`} className="inline-flex items-center gap-1.5 px-2 py-1 mx-1 whitespace-nowrap">
        <Coins className={`w-3 h-3 ${accentColor}`} />
        <span className={`${secondaryText} text-[10px] font-medium`}>
          {purchase.user.username || purchase.user.name?.split(' ')[0] || 'Kullan\u0131c\u0131'}
        </span>
        <span className={`${accentColor} text-[10px] font-bold`}>+{purchase.amount}\ud83d\udcb0</span>
      </div>
    )
  })

  // Big gifts
  data.bigGifts.slice(0, 3).forEach((gift, index) => {
    const senderName = gift.sender.username || gift.sender.name?.split(' ')[0] || 'Kullan\u0131c\u0131'
    const receiverName = gift.stream.user.username || gift.stream.user.name?.split(' ')[0] || 'Kullan\u0131c\u0131'
    scrollItems.push(
      <div key={`gift-${gift.id}-${index}`} className="inline-flex items-center gap-1.5 px-2 py-1 mx-1 whitespace-nowrap">
        <Crown className={`w-3 h-3 text-pink-400`} />
        <span className={`text-[10px] ${guestColor}`}>
          <span className="text-white font-medium">{senderName}</span>\u2192
          <span className="text-lg">{gift.giftType.icon}</span>\u2192
          <span className="text-white font-medium">{receiverName}</span>
        </span>
      </div>
    )
  })

  // Only show items once - no duplication
  return (
    <div className={`w-full overflow-hidden ${bgGradient} border-b`}>
      {/* Row 1: Canlı Falcı button + Online count + scrolling ticker */}
      <div className="flex items-center h-7 sm:h-8">
        <Link
          href={`/${language}/live-tellers`}
          className="flex-shrink-0 flex items-center gap-1 px-2 sm:px-3 h-full bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white text-[10px] sm:text-[11px] font-bold hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          <Sparkles className="w-3 h-3" />
          <span className="hidden xs:inline">{language === 'tr' ? 'Canlı Falcı' : 'Live Teller'}</span>
          <span className="xs:hidden">{language === 'tr' ? 'Canlı' : 'Live'}</span>
          {data.onlineTellerCount > 0 && (
            <span className="ml-0.5 px-1 sm:px-1.5 py-0 rounded-full bg-green-500 text-white text-[9px] sm:text-[10px] font-bold animate-pulse">
              {data.onlineTellerCount}
            </span>
          )}
        </Link>
        <div className="flex-shrink-0 inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 h-full bg-green-900/40">
          <Circle className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-green-400 fill-green-400 animate-pulse" />
          <span className="text-green-400 text-[10px] sm:text-[11px] font-bold">{data.onlineCount}</span>
          <span className="text-green-300 text-[9px] sm:text-[10px] hidden sm:inline">{language === 'tr' ? 'ki\u015fi' : 'online'}</span>
        </div>
        {/* Scrolling ticker fills remaining space - items shown once */}
        <div className="flex-1 overflow-hidden h-full flex items-center" ref={tickerRef}>
          <div className="live-ticker-scroll inline-flex">
            {scrollItems.length > 0 ? scrollItems : (
              <div className="inline-flex items-center gap-2 px-3 py-1 mx-2 whitespace-nowrap">
                <span className="text-fuchsia-300/50 text-[10px]">{language === 'tr' ? '\u015eu an aktif kullan\u0131c\u0131 yok' : 'No active users'}</span>
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
