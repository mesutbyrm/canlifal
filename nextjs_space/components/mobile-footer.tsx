'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion } from 'framer-motion'
import { User, Gift, Home, Camera, MessageCircle } from 'lucide-react'

export default function MobileFooter() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Theme-based styling
  const isFalci = theme === 'falci'
  const isFalclub = theme === 'falclub'
  const isCosmic = theme === 'cosmic'
  
  // Hide footer on certain pages
  const hiddenPaths = ['/live-room', '/chat/video', '/login', '/register']
  const shouldHide = hiddenPaths.some(path => pathname?.includes(path))
  
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
      label: '',
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
      <div className="h-20 md:hidden" />
      
      {/* Footer */}
      <motion.footer
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      >
        {/* Background */}
        <div className={`relative h-16 overflow-hidden ${bgGradient} border-t`}>
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
                // Center camera button - fits within footer
                return (
                  <div key={index} className="flex flex-col items-center w-14">
                    <Link
                      href={item.href}
                      className="relative -mt-5 group"
                    >
                      <div 
                        className={`relative w-12 h-12 rounded-full flex items-center justify-center ${centerBtnGradient} shadow-lg ring-3 ${ringColor}`}
                      >
                        <Icon 
                          className="w-6 h-6 text-white group-hover:scale-110 transition-transform" 
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
        
      </motion.footer>
    </>
  )
}
