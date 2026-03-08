import Navbar from '@/components/navbar'
import FloatingProfile from '@/components/floating-profile'

export default function LangLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
      <FloatingProfile />
    </div>
  )
}
