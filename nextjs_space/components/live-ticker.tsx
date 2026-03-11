'use client'

import { useEffect, useState, useRef } from 'react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
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
  recentPurchasers: RecentPurchaser[]
  bigGifts: BigGift[]
}

export default function LiveTicker() {
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const [data, setData] = useState<TickerData>({
    onlineUsers: [],
    onlineCount: 0,
    recentPurchasers: [],
    bigGifts: []
  })
  const tickerRef = useRef<HTMLDivElement>(null)
  
  const isFalci = theme === 'falci'
  const isFalclub = theme === 'falclub'
  const isCosmic = theme === 'cosmic'

  const bgGradient = isFalclub
    ? 'bg-gradient-to-r from-[#0f0520] via-fuchsia-900/30 to-[#0f0520] border-fuchsia-500/30'
    : isFalci
      ? 'bg-gradient-to-r from-[#1a0a2e] via-indigo-900/30 to-[#1a0a2e] border-indigo-500/30'
      : isCosmic
        ? 'bg-gradient-to-r from-[#0a1628] via-blue-900/30 to-[#0a1628] border-blue-500/30'
        : 'bg-gradient-to-r from-[#0a0118] via-purple-900/30 to-[#0a0118] border-purple-500/30'
  const labelGradient = isFalclub
    ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500'
    : isFalci
      ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
      : isCosmic
        ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
        : 'bg-gradient-to-r from-purple-600 to-pink-600'
  const accentColor = isFalclub ? 'text-fuchsia-300' : isFalci ? 'text-indigo-300' : isCosmic ? 'text-amber-300' : 'text-amber-300'
  const secondaryText = isFalclub ? 'text-white' : isFalci ? 'text-white' : isCosmic ? 'text-slate-100' : 'text-gray-100'
  const guestColor = isFalclub ? 'text-fuchsia-200' : isFalci ? 'text-indigo-200' : isCosmic ? 'text-blue-300' : 'text-purple-200'

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
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  // Build ticker items
  const tickerItems: JSX.Element[] = []

  // Online count with blinking text
  if (data.onlineCount > 0) {
    tickerItems.push(
      <div key="online-count" className="inline-flex items-center gap-2 px-3 py-1 mx-2 whitespace-nowrap bg-green-900/30 rounded-full border border-green-500/30">
        <Circle className="w-2.5 h-2.5 text-green-400 fill-green-400 animate-pulse" />
        <span className="text-green-400 text-xs font-bold animate-pulse">online</span>
        <span className="text-green-300 text-xs font-semibold">
          {data.onlineCount} {language === 'tr' ? 'kişi' : 'people'}
        </span>
      </div>
    )
  }

  // Online users
  data.onlineUsers.slice(0, 10).forEach((user, index) => {
    const isGuest = user.isGuest
    const displayName = isGuest ? user.name : (user.username || user.name?.split(' ')[0] || 'Kullanıcı')
    tickerItems.push(
      <div key={`online-${user.id}-${index}`} className="inline-flex items-center gap-1.5 px-2 py-1 mx-1 whitespace-nowrap">
        <Circle className={`w-2 h-2 ${isGuest ? guestColor + ' fill-current' : 'text-green-400 fill-green-400'} animate-pulse`} />
        <span className={`text-[10px] font-medium ${isGuest ? guestColor : secondaryText}`}>{displayName}</span>
      </div>
    )
  })

  // Recent purchasers
  data.recentPurchasers.slice(0, 5).forEach((purchase, index) => {
    tickerItems.push(
      <div key={`purchase-${purchase.id}-${index}`} className="inline-flex items-center gap-1.5 px-2 py-1 mx-1 whitespace-nowrap">
        <Coins className={`w-3 h-3 ${accentColor}`} />
        <span className={`${secondaryText} text-[10px] font-medium`}>
          {purchase.user.username || purchase.user.name?.split(' ')[0] || 'Kullanıcı'}
        </span>
        <span className={`${accentColor} text-[10px] font-bold`}>+{purchase.amount}💰</span>
      </div>
    )
  })

  // Big gifts
  data.bigGifts.slice(0, 3).forEach((gift, index) => {
    const senderName = gift.sender.username || gift.sender.name?.split(' ')[0] || 'Kullanıcı'
    const receiverName = gift.stream.user.username || gift.stream.user.name?.split(' ')[0] || 'Kullanıcı'
    tickerItems.push(
      <div key={`gift-${gift.id}-${index}`} className="inline-flex items-center gap-1.5 px-2 py-1 mx-1 whitespace-nowrap">
        <Crown className={`w-3 h-3 ${isFalclub ? 'text-pink-400' : isCosmic ? 'text-cyan-400' : 'text-pink-400'}`} />
        <span className={`text-[10px] ${guestColor}`}>
          <span className="text-white font-medium">{senderName}</span>→
          <span className="text-lg">{gift.giftType.icon}</span>→
          <span className="text-white font-medium">{receiverName}</span>
        </span>
      </div>
    )
  })

  const duplicatedItems = [...tickerItems, ...tickerItems]

  return (
    <div className={`w-full overflow-hidden ${bgGradient} py-1 border-b`}>
      <div className="flex items-center">
        <div className={`flex-shrink-0 px-2 py-0.5 ${labelGradient} text-white text-[9px] font-bold rounded-r-full flex items-center gap-1 shadow-lg z-10`}>
          <Sparkles className="w-2.5 h-2.5" />
          LIVE
        </div>
        <div className="flex-1 overflow-hidden" ref={tickerRef}>
          <div className="live-ticker-scroll inline-flex">
            {duplicatedItems.length > 0 ? duplicatedItems : (
              <div className="inline-flex items-center gap-2 px-3 py-1 mx-2 whitespace-nowrap">
                <Circle className="w-2.5 h-2.5 text-green-400 fill-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-bold animate-pulse">online</span>
                <span className="text-green-300 text-xs">0 {language === 'tr' ? 'kişi' : 'people'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes live-ticker-rtl {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .live-ticker-scroll {
          animation: live-ticker-rtl 25s linear infinite;
          will-change: transform;
        }
      `}</style>
    </div>
  )
}
