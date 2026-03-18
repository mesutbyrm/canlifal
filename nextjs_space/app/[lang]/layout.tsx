import Navbar from '@/components/navbar'
import MobileFooter from '@/components/mobile-footer'
import StarBackground from '@/components/star-background'
import CoBroadcastInviteModal from '@/components/co-broadcast-invite-modal'
import PresenceTracker from '@/components/presence-tracker'
import GiftNotificationBanner from '@/components/gift-notification-banner'
import LoginAnnouncementBanner from '@/components/login-announcement-banner'
import PushNotificationProvider from '@/components/push-notification-provider'
import NotificationPermissionPrompt from '@/components/notification-permission-prompt'
import { ProfilePopupProvider } from '@/components/user-profile-popup'
import DeviceGuard from '@/components/device-guard'
import OneSignalInitializer from '@/components/onesignal-initializer'
import DailyLoginReward from '@/components/daily-login-reward'

export default function LangLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PushNotificationProvider>
      <ProfilePopupProvider>
      <div className="min-h-screen relative">
        {/* Twinkling star background */}
        <StarBackground />
        
        {/* Silent presence tracker for online users */}
        <PresenceTracker />
        
        {/* Navbar first */}
        <Navbar />
        
        {/* Announcement banners - positioned below navbar */}
        <div className="fixed top-14 md:top-16 left-0 right-0" style={{ zIndex: 9999 }}>
          <GiftNotificationBanner />
          <LoginAnnouncementBanner />
        </div>
        
        <main className="pt-16 pb-0 md:pb-0 relative z-10">
          {children}
        </main>
        <MobileFooter />
        <CoBroadcastInviteModal />
        
        {/* Push notification permission prompt */}
        <NotificationPermissionPrompt />
        
        {/* Single device session enforcement */}
        <DeviceGuard />
        
        {/* OneSignal Web Push */}
        <OneSignalInitializer />
        
        {/* Daily Login Reward Popup */}
        <DailyLoginReward />
      </div>
    </ProfilePopupProvider>
    </PushNotificationProvider>
  )
}
