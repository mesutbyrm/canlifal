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
      
      {/* Big gift notification banner - highest z-index, above everything */}
      <div className="fixed top-0 left-0 right-0" style={{ zIndex: 9999 }}>
        <GiftNotificationBanner />
      </div>
      <Navbar />
      <main className="pt-16 pb-0 md:pb-0 relative z-10">
        {children}
      </main>
      <MobileFooter />
      <CoBroadcastInviteModal />
    </div>
  )
}
