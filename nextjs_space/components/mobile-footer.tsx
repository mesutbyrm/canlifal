'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'

import { motion } from 'framer-motion'
import { User, Home, Camera, MessageCircle, Coins } from 'lucide-react'
import Image from 'next/image'

export default function MobileFooter() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  
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
      icon: Coins,
      label: language === 'tr' ? 'Jeton Al' : 'Buy Jeton',
      isCenter: false,
      isJeton: true,
    },
    {
      href: `/${language}`,
      icon: Home,
      label: language === 'tr' ? 'Ana Sayfa' : 'Home',
      isCenter: false,
    },
  ]
  
  // FalClub theme colors
  const bgGradient = 'bg-gradient-to-t from-[#0f0520] via-[#1a0a2e] to-[#0f0520] border-fuchsia-400/40'
  const centerBtnGradient = 'bg-gradient-to-br from-fuchsia-500 to-pink-500 shadow-fuchsia-500/40'
  const accentActiveColor = 'text-fuchsia-300'
  const iconColor = 'text-fuchsia-300'
  const iconBgActive = 'bg-fuchsia-500/40'
  const iconBgInactive = 'bg-fuchsia-900/60'
  const ringColor = 'ring-[#0f0520]'
  
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
            className="w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg border-fuchsia-400 shadow-fuchsia-500/30"
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
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-fuchsia-600 to-pink-600">
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
        data-mobile-footer="true"
      >
        {/* Background */}
        <div className={`relative h-16 overflow-visible ${bgGradient} border-t`}>
          {/* Navigation Items */}
          <nav className="relative h-full flex items-center justify-around px-1">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || (item.href === `/${language}` && pathname === `/${language}/`)
              const Icon = item.icon
              const isJeton = 'isJeton' in item && item.isJeton
              
              if (item.isCenter) {
                // Center CAMERA button - bigger, raised above footer
                return (
                  <div key={index} className="flex flex-col items-center w-18 relative">
                    <Link href={item.href} className="absolute -top-9 group">
                      <div 
                        className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center ${centerBtnGradient} shadow-xl ring-4 ${ringColor}`}
                        style={{ boxShadow: '0 0 30px rgba(217, 70, 239, 0.5)' }}
                      >
                        <Camera className="w-9 h-9 text-white group-hover:scale-110 transition-transform" />
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isJeton
                        ? 'bg-amber-500/80 shadow-lg shadow-amber-500/40'
                        : isActive ? iconBgActive : iconBgInactive
                    }`}>
                      <Icon className={`w-4.5 h-4.5 ${
                        isJeton ? 'text-white' : isActive ? accentActiveColor : iconColor
                      }`} />
                    </div>
                    {index === 1 && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-0 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <span className={`text-[9px] font-medium mt-0.5 ${
                    isJeton ? 'text-amber-300' : isActive ? accentActiveColor : iconColor
                  }`}>
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
