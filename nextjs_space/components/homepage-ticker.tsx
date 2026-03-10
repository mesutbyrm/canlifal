'use client'

import { useEffect, useState, useRef } from 'react'
import { useLanguage } from '@/lib/language-context'
import { Circle, Coins, Gift, Sparkles, Crown } from 'lucide-react'
import Image from 'next/image'

interface OnlineUser {
  id: string
  name: string
  username: string | null
  image: string | null
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
  recentPurchasers: RecentPurchaser[]
  bigGifts: BigGift[]
}

export default function HomepageTicker() {
  const { language } = useLanguage()
  const [data, setData] = useState<TickerData>({
    onlineUsers: [],
    recentPurchasers: [],
    bigGifts: []
  })
  const tickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/homepage-ticker')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (e) {
        console.error('Ticker fetch error:', e)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const hasData = data.onlineUsers.length > 0 || data.recentPurchasers.length > 0 || data.bigGifts.length > 0

  // Build ticker items
  const tickerItems: JSX.Element[] = []

  // Add online users
  data.onlineUsers.forEach((user, index) => {
    tickerItems.push(
      <div key={`online-${user.id}-${index}`} className="inline-flex items-center gap-2 px-3 py-1 mx-2 whitespace-nowrap">
        <Circle className="w-2 h-2 text-green-400 fill-green-400 animate-pulse" />
        <span className="text-green-400 text-xs font-medium">
          {language === 'tr' ? 'Online' : 'Online'}
        </span>
        <div className="flex items-center gap-1.5">
          {user.image ? (
            <div className="w-5 h-5 rounded-full overflow-hidden">
              <Image src={user.image} alt={user.name || ''} width={20} height={20} className="object-cover" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-green-500/30 flex items-center justify-center">
              <span className="text-[10px] text-green-300">{user.name?.charAt(0) || '?'}</span>
            </div>
          )}
          <span className="text-white text-xs font-semibold">
            {user.username || user.name?.split(' ')[0] || 'Kullanıcı'}
          </span>
        </div>
      </div>
    )
  })

  // Add recent purchasers
  data.recentPurchasers.forEach((purchase, index) => {
    tickerItems.push(
      <div key={`purchase-${purchase.id}-${index}`} className="inline-flex items-center gap-2 px-3 py-1 mx-2 whitespace-nowrap">
        <Coins className="w-4 h-4 text-yellow-400" />
        <span className="text-yellow-400 text-xs font-medium">
          {language === 'tr' ? 'Yeni Jeton' : 'New Credits'}
        </span>
        <div className="flex items-center gap-1.5">
          {purchase.user.image ? (
            <div className="w-5 h-5 rounded-full overflow-hidden">
              <Image src={purchase.user.image} alt={purchase.user.name || ''} width={20} height={20} className="object-cover" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-yellow-500/30 flex items-center justify-center">
              <span className="text-[10px] text-yellow-300">{purchase.user.name?.charAt(0) || '?'}</span>
            </div>
          )}
          <span className="text-white text-xs font-semibold">
            {purchase.user.username || purchase.user.name?.split(' ')[0] || 'Kullanıcı'}
          </span>
          <span className="text-yellow-300 text-xs">+{purchase.amount} 💰</span>
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
        <Crown className="w-4 h-4 text-pink-400" />
        <span className="text-pink-300 text-xs">
          <span className="text-white font-semibold">{senderName}</span>
          {language === 'tr' ? ', ' : ' sent '}
          <span className="text-white font-semibold">{receiverName}</span>
          {language === 'tr' ? "'a en büyük hediye olan " : ' the biggest gift '}
          <span className="text-xl mx-1">{gift.giftType.icon}</span>
          <span className="text-yellow-300 font-bold">{gift.totalPrice.toLocaleString()}</span>
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
          <span className="text-purple-200 text-xs font-medium">{msg.text}</span>
        </div>
      )
    })
  }

  // Duplicate items for seamless loop
  const duplicatedItems = [...tickerItems, ...tickerItems]

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-purple-900/30 py-1.5">
      <div className="flex items-center">
        {/* Label */}
        <div className="flex-shrink-0 px-3 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold rounded-r-full flex items-center gap-1 shadow-lg z-10">
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
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker 10s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
