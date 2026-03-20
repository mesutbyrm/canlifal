'use client'

import { useEffect } from 'react'

export default function ChatRoomLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Hide navbar and mobile footer when chat room is mounted
  useEffect(() => {
    // Hide navbar
    const navbar = document.querySelector('nav')
    const mobileFooter = document.querySelector('[data-mobile-footer]')
    const starBg = document.querySelector('[data-star-bg]')
    
    if (navbar) navbar.style.display = 'none'
    if (mobileFooter) (mobileFooter as HTMLElement).style.display = 'none'
    if (starBg) (starBg as HTMLElement).style.display = 'none'
    
    // Add class to body to prevent scroll
    document.body.style.overflow = 'hidden'
    
    return () => {
      // Restore when leaving
      if (navbar) navbar.style.display = ''
      if (mobileFooter) (mobileFooter as HTMLElement).style.display = ''
      if (starBg) (starBg as HTMLElement).style.display = ''
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div 
      className="fixed inset-0 bg-[#0a0118] overflow-hidden"
      style={{ 
        position: 'fixed',
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        zIndex: 99999,
        width: '100vw',
        height: '100vh'
      }}
    >
      {children}
    </div>
  )
}
