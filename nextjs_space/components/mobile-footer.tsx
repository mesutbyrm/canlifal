'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion } from 'framer-motion'
import { User, Gift, Home, Camera, MessageCircle } from 'lucide-react'
import Image from 'next/image'

export default function MobileFooter() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  
  // Theme detection
  const isCosmic = theme === 'cosmic'
  const isFalci = theme === 'falci'
  const isFalclub = theme === 'falclub'
  
  // Hide footer on certain pages
  const hiddenPaths = ['/live-room', '/chat/video', '/login', '/register']
  const shouldHide = hiddenPaths.some(path => pathname?.includes(path))
  
  // Check if we're on messages page (hide floating profile button there)
  const isMessagesPage = pathname?.includes('/messages')
  
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
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [session])

  useEffect(() => {
    if (!session?.user) return
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile')
        if (res.ok) {
          const data = await res.json()
          if (data.image) setProfileImage(data.image)
        }
      } catch (e) {}
    }
    fetchProfile()
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
  
  // Theme colors
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
      
      {/* Floating Profile Button - above footer - HIDDEN on messages page */}
      {session?.user && !isMessagesPage && (
        <Link
          href={`/${language}/profile/${session.user.id}`}
          className="fixed bottom-[70px] right-3 z-[51] md:hidden"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg ${
              isFalclub ? 'border-fuchsia-400 shadow-fuchsia-500/30' 
              : isFalci ? 'border-indigo-400 shadow-indigo-500/30'
              : isCosmic ? 'border-blue-400 shadow-blue-500/30'
              : 'border-purple-400 shadow-purple-500/30'
            }`}
          >
            {profileImage || session.user.image ? (
              <Image
                src={profileImage || session.user.image || ''}
                alt={session.user.name || 'Profil'}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                isFalclub ? 'bg-gradient-to-br from-fuchsia-600 to-pink-600'
                : isFalci ? 'bg-gradient-to-br from-indigo-600 to-purple-600'
                : isCosmic ? 'bg-gradient-to-br from-blue-600 to-cyan-600'
                : 'bg-gradient-to-br from-purple-600 to-pink-600'
              }`}>
                <span className="text-white font-bold text-sm">
                  {session.user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </motion.div>
        </Link>
      )}

      {/* Footer */}
      <motion.footer
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      >
        {/* Background */}
        <div className={`relative h-16 overflow-visible ${bgGradient} border-t`}>
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
                // Center CAMERA button - bigger, raised above footer
                return (
                  <div key={index} className="flex flex-col items-center w-16 relative">
                    <Link
                      href={item.href}
                      className="absolute -top-8 group"
                    >
                      <div 
                        className={`relative w-16 h-16 rounded-full flex items-center justify-center ${centerBtnGradient} shadow-xl ring-4 ${ringColor}`}
                        style={{ boxShadow: '0 0 25px rgba(217, 70, 239, 0.4)' }}
                      >
                        <Camera 
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
                  className="flex flex-col items-center justify-center w-14 py-1.5 group"
                >
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    {index === 0 && (
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? iconBgActive : iconBgInactive}`}
                      >
                        <Icon className={`w-4.5 h-4.5 ${isActive ? accentActiveColor : iconColor}`} />
                      </div>
                    )}
                    
                    {index === 1 && (
                      <>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? iconBgActive : iconBgInactive}`}>
                          <MessageCircle 
                            className={`w-4.5 h-4.5 ${isActive ? accentActiveColor : iconColor}`}
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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? iconBgActive : iconBgInactive}`}>
                        <Gift className={`w-4.5 h-4.5 ${isActive ? accentActiveColor : iconColor}`} />
                      </div>
                    )}
                    
                    {index === 4 && (
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? iconBgActive : iconBgInactive}`}
                      >
                        <Home className={`w-4.5 h-4.5 ${isActive ? accentActiveColor : iconColor}`} />
                      </div>
                    )}
                  </div>
                  
                  <span className={`text-[9px] font-medium mt-0.5 ${isActive ? accentActiveColor : iconColor}`}>
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
