import Navbar from '@/components/navbar'
import FloatingProfile from '@/components/floating-profile'
import MobileFooter from '@/components/mobile-footer'

export default function LangLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16 pb-0 md:pb-0">
        {children}
      </main>
      <FloatingProfile />
      <MobileFooter />
    </div>
  )
}
