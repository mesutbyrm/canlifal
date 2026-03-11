'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion } from 'framer-motion'
import { User, Gift, Home, Camera, MessageCircle, Circle, Coins, Crown, Sparkles } from 'lucide-react'
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

export default function MobileFooter() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [tickerData, setTickerData] = useState<TickerData>({
    onlineUsers: [],
    onlineCount: 0,
    recentPurchasers: [],
    bigGifts: []
  })
  const tickerRef = useRef<HTMLDivElement>(null)
  
  // Theme-based styling
  const isFalci = theme === 'falci'
  const isFalclub = theme === 'falclub'
  const isCosmic = theme === 'cosmic'
  
  // Hide footer on certain pages
  const hiddenPaths = ['/live-room', '/chat/video', '/login', '/register']
  const shouldHide = hiddenPaths.some(path => pathname?.includes(path))
  
  // Fetch ticker data
  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const res = await fetch('/api/homepage-ticker')
        if (res.ok) {
          const json = await res.json()
          setTickerData(json)
        }
      } catch (e) {
        console.error('Footer ticker fetch error:', e)
      }
    }
    
    fetchTickerData()
    const interval = setInterval(fetchTickerData, 10000)
    return () => clearInterval(interval)
  }, [])
  
  useEffect(() => {
    if (!session?.user) return
    
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messages?unreadCount=true')
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.unreadCount || 0)
        }
      } catch (e) {
        // ignore
      }
    }
    
    fetchUnread()
    const interval = setInterval(fetchUnread, 15000)
    return () => clearInterval(interval)
  }, [session])
  
  if (shouldHide) return null
  
  const navItems = [
    {
      href: session ? `/${language}/profile` : `/${language}/login`,
      icon: User,
      label: language === 'tr' ? 'Profilim' : 'Profile',
      isCenter: false,
    },
    {
      href: `/${language}/messages`,
      icon: MessageCircle,
      label: language === 'tr' ? 'Mesajlar' : 'Messages',
      isCenter: false,
      badge: unreadCount,
    },
    {
      href: session ? `/${language}/chat/video/setup` : `/${language}/login`,
      icon: Camera,
      label: '', // No label for center button
      isCenter: true,
    },
    {
      href: `/${language}/credits`,
      icon: Gift,
      label: language === 'tr' ? 'Kredi' : 'Credits',
      isCenter: false,
    },
    {
      href: `/${language}`,
      icon: Home,
      label: language === 'tr' ? 'Ana Sayfa' : 'Home',
      isCenter: false,
    },
  ]
  
  // Theme colors for ticker
  const tickerBg = isFalclub
    ? 'bg-gradient-to-r from-[#0f0520] via-fuchsia-900/30 to-[#0f0520]'
    : isFalci
      ? 'bg-gradient-to-r from-[#1a0a2e] via-indigo-900/30 to-[#1a0a2e]'
      : isCosmic
        ? 'bg-gradient-to-r from-[#0a1628] via-blue-900/30 to-[#0a1628]'
        : 'bg-gradient-to-r from-[#0a0118] via-purple-900/30 to-[#0a0118]'
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
  
  // Build ticker items
  const buildTickerItems = () => {
    const items: JSX.Element[] = []
    
    // Add online count with blinking "online" text
    if (tickerData.onlineCount > 0) {
      items.push(
        <div key="online-count" className="inline-flex items-center gap-2 px-3 py-1 mx-2 whitespace-nowrap bg-green-900/30 rounded-full border border-green-500/30">
          <Circle className="w-2.5 h-2.5 text-green-400 fill-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-bold animate-pulse">
            online
          </span>
          <span className="text-green-300 text-xs font-semibold">
            {tickerData.onlineCount} {language === 'tr' ? 'kişi' : 'people'}
          </span>
        </div>
      )
    }
    
    // Add online users
    tickerData.onlineUsers.slice(0, 10).forEach((user, index) => {
      const isGuest = user.isGuest
      const displayName = isGuest ? user.name : (user.username || user.name?.split(' ')[0] || 'Kullanıcı')
      
      items.push(
        <div key={`online-${user.id}-${index}`} className="inline-flex items-center gap-1.5 px-2 py-1 mx-1 whitespace-nowrap">
          <Circle className={`w-2 h-2 ${isGuest ? guestColor + ' fill-current' : 'text-green-400 fill-green-400'} animate-pulse`} />
          <span className={`text-[10px] font-medium ${isGuest ? guestColor : secondaryText}`}>
            {displayName}
          </span>
        </div>
      )
    })
    
    // Add recent purchasers
    tickerData.recentPurchasers.slice(0, 5).forEach((purchase, index) => {
      items.push(
        <div key={`purchase-${purchase.id}-${index}`} className="inline-flex items-center gap-1.5 px-2 py-1 mx-1 whitespace-nowrap">
          <Coins className={`w-3 h-3 ${accentColor}`} />
          <span className={`${secondaryText} text-[10px] font-medium`}>
            {purchase.user.username || purchase.user.name?.split(' ')[0] || 'Kullanıcı'}
          </span>
          <span className={`${accentColor} text-[10px] font-bold`}>+{purchase.amount}💰</span>
        </div>
      )
    })
    
    // Add big gifts
    tickerData.bigGifts.slice(0, 3).forEach((gift, index) => {
      const senderName = gift.sender.username || gift.sender.name?.split(' ')[0] || 'Kullanıcı'
      const receiverName = gift.stream.user.username || gift.stream.user.name?.split(' ')[0] || 'Kullanıcı'
      
      items.push(
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
    
    return items
  }
  
  const tickerItems = buildTickerItems()
  const duplicatedItems = [...tickerItems, ...tickerItems]
  
  // Theme colors with improved visibility
  const bgGradient = isFalclub
    ? 'bg-gradient-to-t from-[#0f0520] via-[#1a0a2e] to-[#0f0520] border-fuchsia-400/40'
    : isFalci
      ? 'bg-gradient-to-t from-[#1a0a2e] via-[#2d1b47] to-[#1a0a2e] border-indigo-400/40'
      : isCosmic 
        ? 'bg-gradient-to-t from-[#0a1628] via-[#0d1b2a] to-[#0a1628] border-blue-400/40'
        : 'bg-gradient-to-t from-[#0a0118] via-[#1a0b2e] to-[#0a0118] border-purple-400/40'
  const centerBtnGradient = isFalclub
    ? 'bg-gradient-to-br from-fuchsia-500 to-pink-500 shadow-fuchsia-500/40'
    : isFalci
      ? 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-indigo-500/40'
      : isCosmic
        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 shadow-blue-500/40'
        : 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/40'
  const accentActiveColor = isFalclub ? 'text-fuchsia-300' : isFalci ? 'text-indigo-300' : isCosmic ? 'text-amber-300' : 'text-amber-300'
  const iconColor = isFalclub ? 'text-fuchsia-300' : isFalci ? 'text-indigo-300' : isCosmic ? 'text-blue-300' : 'text-purple-200'
  const iconBgActive = isFalclub ? 'bg-fuchsia-500/40' : isFalci ? 'bg-indigo-500/40' : isCosmic ? 'bg-blue-500/40' : 'bg-purple-500/40'
  const iconBgInactive = isFalclub ? 'bg-fuchsia-900/60' : isFalci ? 'bg-indigo-900/60' : isCosmic ? 'bg-blue-900/60' : 'bg-purple-900/60'
  const ringColor = isFalclub ? 'ring-[#0f0520]' : isFalci ? 'ring-[#1a0a2e]' : isCosmic ? 'ring-[#0a1628]' : 'ring-[#0a0118]'
  
  return (
    <>
      {/* Spacer to prevent content from being hidden behind footer */}
      <div className="h-32 md:hidden" />
      
      {/* Footer */}
      <motion.footer
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      >
        {/* Scrolling Ticker */}
        <div className={`w-full overflow-hidden ${tickerBg} py-1 border-t border-b ${isFalclub ? 'border-fuchsia-500/30' : isFalci ? 'border-indigo-500/30' : isCosmic ? 'border-blue-500/30' : 'border-purple-500/30'}`}>
          <div className="flex items-center">
            {/* Label */}
            <div className={`flex-shrink-0 px-2 py-0.5 ${labelGradient} text-white text-[9px] font-bold rounded-r-full flex items-center gap-1 shadow-lg z-10`}>
              <Sparkles className="w-2.5 h-2.5" />
              LIVE
            </div>
            
            {/* Scrolling content */}
            <div className="flex-1 overflow-hidden" ref={tickerRef}>
              <div className="footer-ticker inline-flex">
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
        </div>
        
        {/* Background */}
        <div className={`relative h-20 overflow-hidden ${bgGradient} border-t`}>
          {/* Starry effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="absolute w-0.5 h-0.5 bg-white rounded-full animate-twinkle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                }}
              />
            ))}
          </div>
          
          {/* Navigation Items */}
          <nav className="relative h-full flex items-center justify-around px-1">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || (item.href === `/${language}` && pathname === `/${language}/`)
              const Icon = item.icon
              
              if (item.isCenter) {
                // Center camera button with special styling - larger than others, no label
                return (
                  <div key={index} className="flex flex-col items-center w-20">
                    <Link
                      href={item.href}
                      className="relative -mt-8 group"
                    >
                      {/* Gradient ring */}
                      <div 
                        className={`relative w-16 h-16 rounded-full flex items-center justify-center ${centerBtnGradient} shadow-lg ring-4 ${ringColor}`}
                      >
                        <Icon 
                          className="w-8 h-8 text-white group-hover:scale-110 transition-transform" 
                        />
                      </div>
                    </Link>
                  </div>
                )
              }
              
              return (
                <Link
                  key={index}
                  href={item.href}
                  className="flex flex-col items-center justify-center w-16 py-2 group"
                >
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    {/* Icon with theme styling */}
                    {index === 0 && (
                      // Profile
                      <div 
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${isActive ? iconBgActive : iconBgInactive}`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? accentActiveColor : iconColor}`} />
                      </div>
                    )}
                    
                    {index === 1 && (
                      // Messages - chat bubble with badge
                      <>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isActive ? iconBgActive : iconBgInactive}`}>
                          <MessageCircle 
                            className={`w-5 h-5 ${isActive ? accentActiveColor : iconColor}`}
                          />
                        </div>
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-0 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </>
                    )}
                    
                    {index === 3 && (
                      // Gift - credits
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isActive ? iconBgActive : iconBgInactive}`}>
                        <Gift className={`w-5 h-5 ${isActive ? accentActiveColor : iconColor}`} />
                      </div>
                    )}
                    
                    {index === 4 && (
                      // Home
                      <div 
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${isActive ? iconBgActive : iconBgInactive}`}
                      >
                        <Home className={`w-5 h-5 ${isActive ? accentActiveColor : iconColor}`} />
                      </div>
                    )}
                  </div>
                  
                  <span className={`text-[10px] font-medium mt-1 ${isActive ? accentActiveColor : iconColor}`}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>
        
        <style jsx>{`
          @keyframes footer-ticker-rtl {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          .footer-ticker {
            animation: footer-ticker-rtl 25s linear infinite;
            will-change: transform;
          }
        `}</style>
      </motion.footer>
    </>
  )
}
