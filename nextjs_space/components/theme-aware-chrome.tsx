'use client'

import dynamic from 'next/dynamic'
import { useSiteTheme } from '@/lib/theme-context'
import Navbar from '@/components/navbar'
import MobileFooter from '@/components/mobile-footer'
import StarBackground from '@/components/star-background'
import GiftNotificationBanner from '@/components/gift-notification-banner'
import LoginAnnouncementBanner from '@/components/login-announcement-banner'
// useSiteTheme import retained for ThemeAwareNavbar/MobileFooter/MainPadding

export function ThemeAwareNavbar() {
  const { theme } = useSiteTheme()
  if (theme === 'canlidark') return null
  return <Navbar />
}

export function ThemeAwareMobileFooter() {
  const { theme } = useSiteTheme()
  if (theme === 'canlidark') return null
  return <MobileFooter />
}

export function ThemeAwareStarBackground() {
  return <StarBackground />
}

export function ThemeAwareBanners() {
  return (
    <div className="sticky top-14 md:top-16 left-0 right-0" style={{ zIndex: 50 }}>
      <GiftNotificationBanner />
      <LoginAnnouncementBanner />
    </div>
  )
}

export function ThemeAwareMainPadding({ children }: { children: React.ReactNode }) {
  const { theme } = useSiteTheme()
  const isCanlidark = theme === 'canlidark'
  return (
    <main className={isCanlidark ? 'relative z-10' : 'pt-14 md:pt-16 pb-0 md:pb-0 relative z-10'}>
      {children}
    </main>
  )
}
