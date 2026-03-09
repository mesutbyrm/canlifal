'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import { User, Gift, Eye, Play, MessageCircle } from 'lucide-react'

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
      href: session ? `/${language}/profile/${session.user?.name?.toLowerCase().replace(/\s+/g, '')}` : `/${language}/login`,
      icon: User,
      label: language === 'tr' ? 'Profil' : 'Profile',
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
      href: `/${language}/live-tellers`,
      icon: Play,
      label: language === 'tr' ? 'Canlı' : 'Live',
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
      icon: Eye,
      label: language === 'tr' ? 'Fallar' : 'Fortunes',
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
        {/* Cosmic Background */}
        <div className="relative h-24 overflow-hidden">
          {/* Starry gradient background */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, #0a0118 0%, #1a0a2e 50%, #2d1b4e 100%)',
            }}
          />
          
          {/* Stars effect */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white/60"
                style={{
                  width: Math.random() * 2 + 1 + 'px',
                  height: Math.random() * 2 + 1 + 'px',
                  left: Math.random() * 100 + '%',
                  top: Math.random() * 100 + '%',
                  animation: `twinkle ${Math.random() * 3 + 2}s infinite`,
                }}
              />
            ))}
          </div>
          
          {/* Golden glow at top */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-16"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255, 183, 77, 0.3) 0%, transparent 70%)',
            }}
          />
          
          {/* Navigation Items */}
          <nav className="relative h-full flex items-center justify-around px-2 pt-2">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || (item.href === `/${language}` && pathname === `/${language}/`)
              const Icon = item.icon
              
              if (item.isCenter) {
                // Center play button with special styling
                return (
                  <Link
                    key={index}
                    href={item.href}
                    className="relative -mt-8 group"
                  >
                    {/* Outer golden glow */}
                    <div 
                      className="absolute inset-0 -m-2 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, rgba(255, 183, 77, 0.5) 0%, transparent 70%)',
                        filter: 'blur(8px)',
                      }}
                    />
                    
                    {/* Golden ring */}
                    <div 
                      className="relative w-16 h-16 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #ffd700 0%, #ff9500 50%, #ffd700 100%)',
                        boxShadow: '0 0 20px rgba(255, 183, 77, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
                      }}
                    >
                      {/* Inner circle */}
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #2d1b4e 0%, #1a0a2e 100%)',
                          boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.5)',
                        }}
                      >
                        <Icon 
                          className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" 
                          fill="currentColor"
                        />
                      </div>
                    </div>
                  </Link>
                )
              }
              
              return (
                <Link
                  key={index}
                  href={item.href}
                  className="relative flex flex-col items-center gap-1 py-2 px-3 group"
                >
                  <div className="relative">
                    {/* Icon with special styling based on type */}
                    {index === 0 && (
                      // Profile - golden silhouette
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                          background: isActive 
                            ? 'linear-gradient(135deg, #ffd700 0%, #ff9500 100%)' 
                            : 'linear-gradient(135deg, #c9a227 0%, #8b7355 100%)',
                        }}
                      >
                        <Icon className="w-5 h-5 text-[#0a0118]" fill="currentColor" />
                      </div>
                    )}
                    
                    {index === 1 && (
                      // Messages - chat bubble with badge
                      <div className="relative">
                        <div 
                          className="w-10 h-8 flex items-center justify-center"
                          style={{
                            filter: isActive ? 'drop-shadow(0 0 4px rgba(255, 183, 77, 0.5))' : 'none',
                          }}
                        >
                          <MessageCircle 
                            className={`w-7 h-7 ${isActive ? 'text-amber-400' : 'text-amber-200/70'}`}
                            fill="currentColor"
                          />
                        </div>
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {index === 3 && (
                      // Gift - wrapped gift box
                      <div 
                        className="w-8 h-8 flex items-center justify-center"
                        style={{
                          filter: isActive ? 'drop-shadow(0 0 4px rgba(255, 183, 77, 0.5))' : 'none',
                        }}
                      >
                        <Gift 
                          className={`w-7 h-7 ${isActive ? 'text-amber-400' : 'text-amber-500/80'}`}
                        />
                      </div>
                    )}
                    
                    {index === 4 && (
                      // Eye/Crystal ball - mystical eye
                      <div 
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{
                          background: isActive 
                            ? 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' 
                            : 'linear-gradient(135deg, #5b21b6 0%, #3b0d60 100%)',
                          border: '2px solid',
                          borderColor: isActive ? '#c084fc' : '#7c3aed',
                          boxShadow: isActive ? '0 0 12px rgba(167, 139, 250, 0.5)' : 'none',
                        }}
                      >
                        <Eye 
                          className={`w-5 h-5 ${isActive ? 'text-purple-200' : 'text-purple-300/80'}`}
                        />
                      </div>
                    )}
                  </div>
                  
                  <span className={`text-[10px] font-medium ${isActive ? 'text-amber-400' : 'text-purple-200/60'}`}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>
      </motion.footer>
      
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  )
}
