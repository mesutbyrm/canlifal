'use client'

import { useEffect, useState, useRef } from 'react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { Circle, Coins, Gift, Sparkles, Crown } from 'lucide-react'
import Image from 'next/image'

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

export default function HomepageTicker() {
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const [data, setData] = useState<TickerData>({
    onlineUsers: [],
    onlineCount: 0,
    recentPurchasers: [],
    bigGifts: []
  })
  const [flashGift, setFlashGift] = useState<BigGift | null>(null)
  const [flashCount, setFlashCount] = useState(0)
  const lastGiftIdRef = useRef<string | null>(null)
  const tickerRef = useRef<HTMLDivElement>(null)
  
  // Theme-based styling with improved readability
  const isCosmic = theme === 'cosmic'
  const bgGradient = isCosmic 
    ? 'bg-gradient-to-r from-[#0a1628] via-blue-900/30 to-[#0a1628] border-blue-400/40'
    : 'bg-gradient-to-r from-[#0a0118] via-purple-900/30 to-[#0a0118] border-purple-400/40'
  const labelGradient = isCosmic
    ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
    : 'bg-gradient-to-r from-purple-600 to-pink-600'
  const accentColor = isCosmic ? 'text-amber-300' : 'text-amber-300'
  const secondaryText = isCosmic ? 'text-slate-100' : 'text-gray-100'
  const guestColor = isCosmic ? 'text-blue-300' : 'text-purple-200'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/homepage-ticker')
        if (res.ok) {
          const json = await res.json()
          
          // Check for new gift
          if (json.bigGifts && json.bigGifts.length > 0) {
            const latestGift = json.bigGifts[0]
            if (lastGiftIdRef.current !== latestGift.id) {
              lastGiftIdRef.current = latestGift.id
              // Trigger flash effect
              setFlashGift(latestGift)
              setFlashCount(0)
            }
          }
          
          setData(json)
        }
      } catch (e) {
        console.error('Ticker fetch error:', e)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 10000) // Refresh every 10 seconds for faster gift detection
    return () => clearInterval(interval)
  }, [])

  // Flash effect - 5 times
  useEffect(() => {
    if (flashGift && flashCount < 5) {
      const timer = setTimeout(() => {
        setFlashCount(prev => prev + 1)
      }, 400)
      return () => clearTimeout(timer)
    } else if (flashCount >= 5) {
      // End flash effect
      setTimeout(() => {
        setFlashGift(null)
        setFlashCount(0)
      }, 500)
    }
  }, [flashGift, flashCount])

  const hasData = data.onlineUsers.length > 0 || data.recentPurchasers.length > 0 || data.bigGifts.length > 0

  // Build ticker items
  const tickerItems: JSX.Element[] = []

  // Add online count as first item - prominent scrolling count
  if (data.onlineCount > 0) {
    tickerItems.push(
      <div key="online-count" className="inline-flex items-center gap-2 px-4 py-1.5 mx-2 whitespace-nowrap bg-green-900/30 rounded-full border border-green-500/30">
        <Circle className="w-3 h-3 text-green-400 fill-green-400 animate-pulse" />
        <span className="text-green-400 text-sm font-bold">
          {data.onlineCount} {language === 'tr' ? 'kişi sitede' : 'people online'}
        </span>
        <span className="text-green-400">👥</span>
      </div>
    )
  }

  // Add online users with their names (including guests as "faluser")
  data.onlineUsers.forEach((user, index) => {
    const isGuest = user.isGuest
    const displayName = isGuest ? user.name : (user.username || user.name?.split(' ')[0] || 'Kullanıcı')
    
    tickerItems.push(
      <div key={`online-${user.id}-${index}`} className="inline-flex items-center gap-2 px-3 py-1 mx-2 whitespace-nowrap">
        <Circle className={`w-2 h-2 ${isGuest ? guestColor + ' fill-current' : 'text-green-400 fill-green-400'} animate-pulse`} />
        <span className={`${isGuest ? guestColor : 'text-green-400'} text-xs font-medium`}>
          {isGuest 
            ? (language === 'tr' ? 'Ziyaretçi' : 'Visitor')
            : (language === 'tr' ? 'Giriş yaptı' : 'Logged in')
          }
        </span>
        <div className="flex items-center gap-1.5">
          {user.image && !isGuest ? (
            <div className="w-5 h-5 rounded-full overflow-hidden">
              <Image src={user.image} alt={user.name || ''} width={20} height={20} className="object-cover" />
            </div>
          ) : (
            <div className={`w-5 h-5 rounded-full ${isGuest ? (isCosmic ? 'bg-blue-500/30' : 'bg-purple-500/30') : 'bg-green-500/30'} flex items-center justify-center`}>
              <span className={`text-[10px] ${isGuest ? (isCosmic ? 'text-blue-300' : 'text-purple-300') : 'text-green-300'}`}>
                {isGuest ? '👤' : (user.name?.charAt(0) || '?')}
              </span>
            </div>
          )}
          <span className={`text-xs font-semibold ${isGuest ? (isCosmic ? 'text-blue-300' : 'text-purple-300') : secondaryText}`}>
            {displayName}
          </span>
        </div>
      </div>
    )
  })

  // Add recent purchasers
  data.recentPurchasers.forEach((purchase, index) => {
    tickerItems.push(
      <div key={`purchase-${purchase.id}-${index}`} className="inline-flex items-center gap-2 px-3 py-1 mx-2 whitespace-nowrap">
        <Coins className={`w-4 h-4 ${accentColor}`} />
        <span className={`${accentColor} text-xs font-medium`}>
          {language === 'tr' ? 'Yeni Jeton' : 'New Credits'}
        </span>
        <div className="flex items-center gap-1.5">
          {purchase.user.image ? (
            <div className="w-5 h-5 rounded-full overflow-hidden">
              <Image src={purchase.user.image} alt={purchase.user.name || ''} width={20} height={20} className="object-cover" />
            </div>
          ) : (
            <div className={`w-5 h-5 rounded-full ${isCosmic ? 'bg-blue-500/20' : 'bg-gold-500/20'} flex items-center justify-center`}>
              <span className={`text-[10px] ${accentColor}`}>{purchase.user.name?.charAt(0) || '?'}</span>
            </div>
          )}
          <span className={`${secondaryText} text-xs font-semibold`}>
            {purchase.user.username || purchase.user.name?.split(' ')[0] || 'Kullanıcı'}
          </span>
          <span className={`${accentColor} text-xs font-bold`}>+{purchase.amount} 💰</span>
        </div>
      </div>
    )
  })

  // Add big gifts - format: "hediyeyi atan kişi şu kişiye en büyük hediye olan ... attı"
  data.bigGifts.forEach((gift, index) => {
    const senderName = gift.sender.username || gift.sender.name?.split(' ')[0] || 'Kullanıcı'
    const receiverName = gift.stream.user.username || gift.stream.user.name?.split(' ')[0] || 'Kullanıcı'
    
    tickerItems.push(
      <div key={`gift-${gift.id}-${index}`} className="inline-flex items-center gap-2 px-3 py-1 mx-2 whitespace-nowrap">
        <Crown className={`w-4 h-4 ${isCosmic ? 'text-cyan-400' : 'text-pink-400'}`} />
        <span className={`${isCosmic ? 'text-blue-300' : 'text-purple-300'} text-xs`}>
          <span className="text-white font-semibold">{senderName}</span>
          {language === 'tr' ? ', ' : ' sent '}
          <span className="text-white font-semibold">{receiverName}</span>
          {language === 'tr' ? "'a en büyük hediye olan " : ' the biggest gift '}
          <span className="text-xl mx-1">{gift.giftType.icon}</span>
          <span className={`${accentColor} font-bold`}>{gift.totalPrice.toLocaleString()}</span>
          {language === 'tr' ? ' attı!' : '!'}
        </span>
      </div>
    )
  })

  // Add placeholder items if no data
  if (!hasData) {
    // Add some placeholder items to show the ticker is working
    const placeholderMessages = language === 'tr' 
      ? [
          { icon: '🔮', text: 'Falcı platformuna hoş geldiniz!' },
          { icon: '✨', text: 'Canlı yayınlara katılın' },
          { icon: '🌟', text: 'Jeton satın alarak hediye gönderin' },
          { icon: '💫', text: 'Fallarınızı paylaşın' },
          { icon: '🎁', text: 'Arkadaşlarınıza hediye gönderin' },
        ]
      : [
          { icon: '🔮', text: 'Welcome to the fortune platform!' },
          { icon: '✨', text: 'Join live streams' },
          { icon: '🌟', text: 'Buy credits to send gifts' },
          { icon: '💫', text: 'Share your fortunes' },
          { icon: '🎁', text: 'Send gifts to friends' },
        ]

    placeholderMessages.forEach((msg, index) => {
      tickerItems.push(
        <div key={`placeholder-${index}`} className="inline-flex items-center gap-2 px-3 py-1 mx-2 whitespace-nowrap">
          <span className="text-lg">{msg.icon}</span>
          <span className={`${isCosmic ? 'text-blue-300' : 'text-purple-300'} text-xs font-medium`}>{msg.text}</span>
        </div>
      )
    })
  }

  // Duplicate items for seamless loop
  const duplicatedItems = [...tickerItems, ...tickerItems]

  // If flash effect is active, show special gift display
  if (flashGift) {
    const isVisible = flashCount % 2 === 0
    const senderName = flashGift.sender.username || flashGift.sender.name?.split(' ')[0] || 'Kullanıcı'
    const receiverName = flashGift.stream.user.username || flashGift.stream.user.name?.split(' ')[0] || 'Kullanıcı'
    
    return (
      <div className={`w-full overflow-hidden ${isCosmic ? 'bg-gradient-to-r from-blue-900/50 via-cyan-900/30 to-blue-900/50 border-blue-500/30' : 'bg-gradient-to-r from-purple-900/50 via-pink-900/30 to-purple-900/50 border-purple-500/30'} py-2 border-b`}>
        <div className="flex items-center justify-center gap-3">
          {/* Flashing gift sender profile */}
          <div className={`flex items-center gap-3 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-20'}`}>
            <Crown className={`w-5 h-5 ${accentColor}`} />
            <div className="flex items-center gap-2">
              {flashGift.sender.image ? (
                <div className={`w-8 h-8 rounded-full overflow-hidden border-2 ${isCosmic ? 'border-blue-500' : 'border-gold-500'} animate-pulse`}>
                  <Image src={flashGift.sender.image} alt={senderName} width={32} height={32} className="object-cover" />
                </div>
              ) : (
                <div className={`w-8 h-8 rounded-full ${isCosmic ? 'bg-blue-500/30 border-blue-500' : 'bg-purple-500/30 border-gold-500'} flex items-center justify-center border-2 animate-pulse`}>
                  <span className={`text-sm ${accentColor} font-bold`}>{senderName[0]}</span>
                </div>
              )}
              <span className="text-white font-bold">{senderName}</span>
            </div>
            <span className={accentColor}>{language === 'tr' ? "→" : "→"}</span>
            <span className="text-2xl">{flashGift.giftType.icon}</span>
            <span className={`${accentColor} font-bold`}>{flashGift.totalPrice.toLocaleString()}</span>
            <span className={accentColor}>{language === 'tr' ? "→" : "→"}</span>
            <span className="text-white font-semibold">{receiverName}</span>
            <span className={`${isCosmic ? 'text-blue-300' : 'text-purple-300'} text-sm`}>{language === 'tr' ? ' attı!' : ' sent!'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full overflow-hidden ${bgGradient} py-1.5 border-b`}>
      <div className="flex items-center">
        {/* Label */}
        <div className={`flex-shrink-0 px-3 py-0.5 ${labelGradient} text-white text-[10px] font-bold rounded-r-full flex items-center gap-1 shadow-lg z-10`}>
          <Sparkles className="w-3 h-3" />
          {language === 'tr' ? 'SOSYAL' : 'SOCIAL'}
        </div>
        
        {/* Scrolling content */}
        <div className="flex-1 overflow-hidden" ref={tickerRef}>
          <div className="animate-ticker inline-flex">
            {duplicatedItems}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes ticker-rtl {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker-rtl 30s linear infinite;
          will-change: transform;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
