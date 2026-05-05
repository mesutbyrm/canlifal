'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'

import { motion } from 'framer-motion'
import { User, Home, Camera, MessageCircle, Coins } from 'lucide-react'
import Image from 'next/image'
import { useSiteTheme } from '@/lib/theme-context'
import FramedAvatar from './framed-avatar'

export default function MobileFooter() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const { colorMode } = useSiteTheme()
  const pathname = usePathname()
  const isLight = colorMode === 'light'
  const [unreadCount, setUnreadCount] = useState(0)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [profileFrameUrl, setProfileFrameUrl] = useState<string | null>(null)
  
  // Hide footer on certain pages (including individual chat conversations)
  const hiddenPaths = ['/canli-oda', '/sohbet/video', '/giris', '/kayit-ol']
  const isIndividualChat = pathname ? /\/mesajlar\/[^/]+/.test(pathname) : false
  const shouldHide = hiddenPaths.some(path => pathname?.includes(path)) || isIndividualChat
  
  // Check if we're on messages page or chat room (hide floating profile button there)
  const isMessagesPage = pathname?.includes('/mesajlar')
  const isChatRoom = pathname ? /\/sohbet\/[^/]/.test(pathname) : false
  
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
          const frameUrl = data.adminAssignedFrame?.imageUrl || data.profileFrame?.imageUrl || null
          setProfileFrameUrl(frameUrl)
        }
      } catch (e) {}
    }
    fetchProfile()
  }, [session])
  
  if (shouldHide) return null
  
  const navItems = [
    {
      href: session ? `/profil` : `/giris`,
      icon: User,
      label: 'Profilim',
      isCenter: false,
    },
    {
      href: `/mesajlar`,
      icon: MessageCircle,
      label: 'Mesajlar',
      isCenter: false,
      badge: unreadCount,
    },
    {
      href: session ? `/sohbet/video/setup` : `/giris`,
      icon: Camera,
      label: 'Yayın',
      isCenter: true,
    },
    {
      href: `/jeton`,
      icon: Coins,
      label: 'Jeton Al',
      isCenter: false,
      isJeton: true,
    },
    {
      href: `/`,
      icon: Home,
      label: 'Ana Sayfa',
      isCenter: false,
    },
  ]
  
  // Theme colors - Facebook for light, FalClub for dark
  const bgGradient = isLight 
    ? 'bg-white border-[#E4E6EB]'
    : 'bg-gradient-to-t from-[#0f0520] via-[#1a0a2e] to-[#0f0520] border-fuchsia-400/40'
  const centerBtnGradient = isLight
    ? 'bg-[#1877F2] shadow-[#1877F2]/20'
    : 'bg-gradient-to-br from-fuchsia-500 to-pink-500 shadow-fuchsia-500/40'
  const accentActiveColor = isLight ? 'text-[#1877F2]' : 'text-fuchsia-300'
  const iconColor = isLight ? 'text-[#65676B]' : 'text-fuchsia-300'
  const iconBgActive = isLight ? 'bg-[#1877F2]/10' : 'bg-fuchsia-500/40'
  const iconBgInactive = isLight ? 'bg-transparent' : 'bg-fuchsia-900/60'
  const ringColor = isLight ? 'ring-white' : 'ring-[#0f0520]'
  
  return (
    <>
      {/* Spacer to prevent content from being hidden behind footer */}
      <div className="h-20 md:hidden" />
      
      {/* Floating Profile Button - above footer - HIDDEN on messages page and chat rooms */}
      {session?.user && !isMessagesPage && !isChatRoom && (
        <Link
          href={`/profil/${session.user.id}`}
          className="fixed bottom-[70px] right-3 z-[51] md:hidden"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="shadow-lg"
          >
            <FramedAvatar
              src={profileImage || session.user.image}
              alt={session.user.name || 'Profil'}
              size={48}
              frameUrl={profileFrameUrl}
              fallbackInitial={session.user.name?.charAt(0) || 'U'}
              borderColor={isLight ? 'border-[#1877F2]' : 'border-fuchsia-400'}
            />
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
          <nav className="relative h-full grid grid-cols-5 items-center px-2">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || (item.href === `/` && pathname === `/`)
              const Icon = item.icon
              const isJeton = 'isJeton' in item && item.isJeton
              
              if (item.isCenter) {
                // Center CAMERA button - bigger, raised above footer
                return (
                  <div key={index} className="flex flex-col items-center justify-center relative">
                    <Link href={item.href} className="absolute -top-9 group">
                      <div 
                        className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center ${centerBtnGradient} shadow-xl ring-4 ${ringColor}`}
                        style={{ boxShadow: isLight ? '0 2px 8px rgba(24, 119, 242, 0.3)' : '0 0 30px rgba(217, 70, 239, 0.5)' }}
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
                  className="flex flex-col items-center justify-center py-1.5 group"
                >
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isJeton
                        ? (isLight ? 'bg-[#1877F2] shadow-sm' : 'bg-amber-500/80 shadow-lg shadow-amber-500/40')
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
                    isJeton ? (isLight ? 'text-[#1877F2]' : 'text-amber-300') : isActive ? accentActiveColor : iconColor
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
