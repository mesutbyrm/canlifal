'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Home, Sparkles, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import TellerIncomingRequest from '@/components/teller-incoming-request'

// Independent layout for live teller dashboard - no navbar from main site
export default function LiveTellerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const language = (params.lang as string) || 'tr'

  return (
    <div className="min-h-screen bg-[#0a0118]">
      {/* Independent header for teller dashboard */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-deep-purple-950/95 backdrop-blur-sm border-b border-purple-800">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left - Logo/Brand */}
          <Link href={`/${language}`} className="flex items-center gap-2 text-gold-500 hover:text-gold-400">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold text-sm">
              {language === 'tr' ? 'Falcı Paneli' : 'Teller Panel'}
            </span>
          </Link>

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            <Link
              href={`/${language}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-300 hover:text-white hover:bg-purple-800/50 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'tr' ? 'Ana Sayfa' : 'Home'}</span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: `/${language}` })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'tr' ? 'Çıkış' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content with padding for fixed header */}
      <main className="pt-14">
        {children}
      </main>

      {/* Incoming request modal for fortune tellers */}
      <TellerIncomingRequest />
    </div>
  )
}
