import dynamic from 'next/dynamic'
import Navbar from '@/components/navbar'
import MobileFooter from '@/components/mobile-footer'
import StarBackground from '@/components/star-background'
import GiftNotificationBanner from '@/components/gift-notification-banner'
import LoginAnnouncementBanner from '@/components/login-announcement-banner'
import { ProfilePopupProvider } from '@/components/user-profile-popup'

// Non-critical components loaded dynamically (not visible on initial render)
const CoBroadcastInviteModal = dynamic(() => import('@/components/co-broadcast-invite-modal'), { ssr: false })
const PresenceTracker = dynamic(() => import('@/components/presence-tracker'), { ssr: false })
const OnboardingTour = dynamic(() => import('@/components/onboarding-tour'), { ssr: false })
const DeviceGuard = dynamic(() => import('@/components/device-guard'), { ssr: false })
const OneSignalInitializer = dynamic(() => import('@/components/onesignal-initializer'), { ssr: false })
const DailyLoginReward = dynamic(() => import('@/components/daily-login-reward'), { ssr: false })

export default function LangLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      <ProfilePopupProvider>
      <div className="min-h-screen relative">
        {/* Twinkling star background */}
        <StarBackground />
        
        {/* Silent presence tracker for online users */}
        <PresenceTracker />
        
        {/* Onboarding tour for first-time users */}
        <OnboardingTour />
        
        {/* Navbar first */}
        <Navbar />
        
        <main className="pt-14 md:pt-16 pb-0 md:pb-0 relative z-10">
          {/* Announcement banners - inside main flow, below navbar */}
          <div className="sticky top-14 md:top-16 left-0 right-0" style={{ zIndex: 50 }}>
            <GiftNotificationBanner />
            <LoginAnnouncementBanner />
          </div>
          {children}
        </main>
        <MobileFooter />
        <CoBroadcastInviteModal />
        
        {/* Single device session enforcement */}
        <DeviceGuard />
        
        {/* OneSignal Web Push */}
        <OneSignalInitializer />
        
        {/* Daily Login Reward Popup */}
        <DailyLoginReward />
      </div>
    </ProfilePopupProvider>
  )
}
