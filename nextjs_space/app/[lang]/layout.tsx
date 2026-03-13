import Navbar from '@/components/navbar'
import MobileFooter from '@/components/mobile-footer'
import StarBackground from '@/components/star-background'
import CoBroadcastInviteModal from '@/components/co-broadcast-invite-modal'
import PresenceTracker from '@/components/presence-tracker'
import GiftNotificationBanner from '@/components/gift-notification-banner'

export default function LangLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen relative">
      {/* Twinkling star background */}
      <StarBackground />
      
      {/* Silent presence tracker for online users */}
      <PresenceTracker />
      
      {/* Navbar first */}
      <Navbar />
      
      {/* Big gift notification banner - positioned below navbar, highest z-index */}
      <div className="fixed top-14 md:top-16 left-0 right-0" style={{ zIndex: 9999 }}>
        <GiftNotificationBanner />
      </div>
      
      <main className="pt-16 pb-0 md:pb-0 relative z-10">
        {children}
      </main>
      <MobileFooter />
      <CoBroadcastInviteModal />
    </div>
  )
}
