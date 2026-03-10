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

  if (!hasData) return null

  // Build ticker items
  const tickerItems: JSX.Element[] = []

  // Add online users
  data.onlineUsers.forEach((user, index) => {
    tickerItems.push(
      <div key={`online-${user.id}-${index}`} className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30 mx-2 whitespace-nowrap">
        <Circle className="w-2 h-2 text-green-400 fill-green-400 animate-pulse" />
        <span className="text-green-400 text-xs font-medium">
          {language === 'tr' ? 'Online' : 'Online'}
        </span>
        <div className="flex items-center gap-1.5">
          {user.image ? (
            <div className="w-5 h-5 rounded-full overflow-hidden border border-green-400/50">
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
      <div key={`purchase-${purchase.id}-${index}`} className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-full border border-yellow-500/30 mx-2 whitespace-nowrap">
        <Coins className="w-4 h-4 text-yellow-400" />
        <span className="text-yellow-400 text-xs font-medium">
          {language === 'tr' ? 'Yeni Jeton' : 'New Credits'}
        </span>
        <div className="flex items-center gap-1.5">
          {purchase.user.image ? (
            <div className="w-5 h-5 rounded-full overflow-hidden border border-yellow-400/50">
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

  // Add big gifts
  data.bigGifts.forEach((gift, index) => {
    tickerItems.push(
      <div key={`gift-${gift.id}-${index}`} className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 rounded-full border border-pink-500/30 mx-2 whitespace-nowrap animate-pulse">
        <Crown className="w-4 h-4 text-pink-400" />
        <span className="text-pink-400 text-xs font-medium">
          {language === 'tr' ? 'Mega Hediye!' : 'Mega Gift!'}
        </span>
        <div className="flex items-center gap-1">
          {/* Sender */}
          <div className="flex items-center gap-1">
            {gift.sender.image ? (
              <div className="w-5 h-5 rounded-full overflow-hidden border border-pink-400/50">
                <Image src={gift.sender.image} alt={gift.sender.name || ''} width={20} height={20} className="object-cover" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-pink-500/30 flex items-center justify-center">
                <span className="text-[10px] text-pink-300">{gift.sender.name?.charAt(0) || '?'}</span>
              </div>
            )}
            <span className="text-white text-xs font-semibold">
              {gift.sender.username || gift.sender.name?.split(' ')[0] || 'Kullanıcı'}
            </span>
          </div>
          
          <span className="text-pink-300 text-lg mx-1">→</span>
          <span className="text-xl">{gift.giftType.icon}</span>
          <span className="text-pink-300 text-lg mx-1">→</span>
          
          {/* Receiver */}
          <div className="flex items-center gap-1">
            {gift.stream.user.image ? (
              <div className="w-5 h-5 rounded-full overflow-hidden border border-purple-400/50">
                <Image src={gift.stream.user.image} alt={gift.stream.user.name || ''} width={20} height={20} className="object-cover" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center">
                <span className="text-[10px] text-purple-300">{gift.stream.user.name?.charAt(0) || '?'}</span>
              </div>
            )}
            <span className="text-white text-xs font-semibold">
              {gift.stream.user.username || gift.stream.user.name?.split(' ')[0] || 'Kullanıcı'}
            </span>
          </div>
          
          <span className="text-yellow-300 text-xs font-bold ml-1">{gift.totalPrice.toLocaleString()} 💎</span>
        </div>
      </div>
    )
  })

  // Duplicate items for seamless loop
  const duplicatedItems = [...tickerItems, ...tickerItems]

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-purple-900/30 border-y border-purple-500/20 py-2">
      <div className="flex items-center">
        {/* Label */}
        <div className="flex-shrink-0 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-r-full flex items-center gap-1 shadow-lg z-10">
          <Sparkles className="w-3 h-3" />
          {language === 'tr' ? 'CANLI' : 'LIVE'}
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
          animation: ticker 60s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
