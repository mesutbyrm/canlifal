'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { Sparkles, LogOut, User, Shield, Globe } from 'lucide-react'

export default function Navbar() {
  const { data: session } = useSession() || {}
  const { language, setLanguage, t } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'tr' : 'en')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-deep-purple-950/80 backdrop-blur-md border-b border-deep-purple-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={`/${language}`} className="flex items-center gap-2 text-gold-600 hover:text-gold-400 transition-colors">
            <Sparkles className="w-6 h-6" />
            <span className="font-serif text-xl font-bold gold-glow">Mystical</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-6">
            {session?.user ? (
              <>
                <Link
                  href={`/${language}/fortunes`}
                  className="text-deep-purple-200 hover:text-gold-400 transition-colors"
                >
                  {t('nav.fortunes')}
                </Link>
                <Link
                  href={`/${language}/dashboard`}
                  className="text-deep-purple-200 hover:text-gold-400 transition-colors"
                >
                  {t('nav.dashboard')}
                </Link>
                {session?.user?.role === 'admin' && (
                  <Link
                    href={`/${language}/admin`}
                    className="text-deep-purple-200 hover:text-gold-400 transition-colors flex items-center gap-1"
                  >
                    <Shield className="w-4 h-4" />
                    {t('nav.admin')}
                  </Link>
                )}
                <div className="flex items-center gap-2 px-3 py-1 bg-deep-purple-900/50 rounded-full border border-gold-600/30">
                  <Sparkles className="w-4 h-4 text-gold-500" />
                  <span className="text-gold-400 font-medium">{session?.user?.credits ?? 0}</span>
                </div>
                <Link
                  href={`/${language}/profile`}
                  className="text-deep-purple-200 hover:text-gold-400 transition-colors"
                >
                  <User className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: `/${language}` })}
                  className="text-deep-purple-200 hover:text-gold-400 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href={`/${language}/login`}
                  className="text-deep-purple-200 hover:text-gold-400 transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href={`/${language}/register`}
                  className="px-4 py-2 bg-gold-600 text-deep-purple-950 rounded-lg hover:bg-gold-500 transition-colors font-medium"
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
            
            {/* Contact Link */}
            <Link
              href={`/${language}/contact`}
              className="text-deep-purple-200 hover:text-gold-400 transition-colors"
            >
              {language === 'tr' ? 'İletişim' : 'Contact'}
            </Link>
            
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-deep-purple-200 hover:text-gold-400 transition-colors px-3 py-1 border border-deep-purple-700 rounded-lg"
              aria-label="Switch Language"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium uppercase">{language}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
