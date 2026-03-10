import Navbar from '@/components/navbar'
import FloatingProfile from '@/components/floating-profile'
import MobileFooter from '@/components/mobile-footer'
import StarBackground from '@/components/star-background'

export default function LangLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen relative">
      {/* Twinkling star background */}
      <StarBackground />
      
      <Navbar />
      <main className="pt-16 pb-0 md:pb-0 relative z-10">
        {children}
      </main>
      <FloatingProfile />
      <MobileFooter />
    </div>
  )
}
