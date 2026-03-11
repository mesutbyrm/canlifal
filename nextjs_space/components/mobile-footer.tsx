'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import { User, Gift, Home, Play, MessageCircle } from 'lucide-react'

export default function MobileFooter() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  
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
      icon: Play,
      label: language === 'tr' ? 'Yayın' : 'Stream',
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
  
  return (
    <>
      {/* Spacer to prevent content from being hidden behind footer */}
      <div className="h-24 md:hidden" />
      
      {/* Footer */}
      <motion.footer
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      >
        {/* Clean White Background */}
        <div className="relative h-20 overflow-hidden bg-white border-t border-gray-200 shadow-lg">
          {/* Navigation Items */}
          <nav className="relative h-full flex items-center justify-around px-1">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || (item.href === `/${language}` && pathname === `/${language}/`)
              const Icon = item.icon
              
              if (item.isCenter) {
                // Center play button with special styling
                return (
                  <div key={index} className="flex flex-col items-center w-16">
                    <Link
                      href={item.href}
                      className="relative -mt-6 group"
                    >
                      {/* Blue ring */}
                      <div 
                        className="relative w-14 h-14 rounded-full flex items-center justify-center bg-[#1877f2] shadow-lg"
                      >
                        <Icon 
                          className="w-6 h-6 text-white group-hover:scale-110 transition-transform" 
                          fill="currentColor"
                        />
                      </div>
                    </Link>
                    <span className="text-[10px] font-medium mt-1 text-[#1877f2]">
                      {item.label}
                    </span>
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
                    {/* Icon with Facebook styling */}
                    {index === 0 && (
                      // Profile
                      <div 
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${isActive ? 'bg-[#e7f3ff]' : 'bg-gray-100'}`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-[#1877f2]' : 'text-gray-500'}`} />
                      </div>
                    )}
                    
                    {index === 1 && (
                      // Messages - chat bubble with badge
                      <>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isActive ? 'bg-[#e7f3ff]' : 'bg-gray-100'}`}>
                          <MessageCircle 
                            className={`w-5 h-5 ${isActive ? 'text-[#1877f2]' : 'text-gray-500'}`}
                          />
                        </div>
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-0 bg-[#fa3e3e] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </>
                    )}
                    
                    {index === 3 && (
                      // Gift - credits
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isActive ? 'bg-[#e7f3ff]' : 'bg-gray-100'}`}>
                        <Gift className={`w-5 h-5 ${isActive ? 'text-[#1877f2]' : 'text-gray-500'}`} />
                      </div>
                    )}
                    
                    {index === 4 && (
                      // Home
                      <div 
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${isActive ? 'bg-[#e7f3ff]' : 'bg-gray-100'}`}
                      >
                        <Home className={`w-5 h-5 ${isActive ? 'text-[#1877f2]' : 'text-gray-500'}`} />
                      </div>
                    )}
                  </div>
                  
                  <span className={`text-[10px] font-medium mt-1 ${isActive ? 'text-[#1877f2]' : 'text-gray-500'}`}>
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
