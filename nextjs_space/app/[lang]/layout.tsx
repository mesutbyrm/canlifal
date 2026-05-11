import dynamic from 'next/dynamic'
import {
  ThemeAwareNavbar,
  ThemeAwareMobileFooter,
  ThemeAwareStarBackground,
  ThemeAwareBanners,
  ThemeAwareMainPadding,
} from '@/components/theme-aware-chrome'
import { ProfilePopupProvider } from '@/components/user-profile-popup'

const GlobalBackButton = dynamic(() => import('@/components/global-back-button'), { ssr: false })

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
        <ThemeAwareStarBackground />
        <PresenceTracker />
        <OnboardingTour />
        <ThemeAwareNavbar />
        <GlobalBackButton />

        <ThemeAwareMainPadding>
          <ThemeAwareBanners />
          {children}
        </ThemeAwareMainPadding>
        <ThemeAwareMobileFooter />
        <CoBroadcastInviteModal />
        <DeviceGuard />
        <OneSignalInitializer />
        <DailyLoginReward />
      </div>
    </ProfilePopupProvider>
  )
}
