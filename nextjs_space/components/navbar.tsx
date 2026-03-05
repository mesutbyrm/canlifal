'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { Sparkles, LogOut, User, Shield, Globe, MessageCircle, Menu, X } from 'lucide-react'

export default function Navbar() {
  const { data: session } = useSession() || {}
  const { language, setLanguage, t } = useLanguage()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'tr' : 'en')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-deep-purple-950/95 backdrop-blur-md border-b border-deep-purple-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main navbar row */}
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link href={`/${language}`} className="flex items-center gap-2 text-gold-600 hover:text-gold-400 transition-colors flex-shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="font-serif text-lg sm:text-xl font-bold gold-glow">FALCI</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6">
            {session?.user ? (
              <>
                <Link href={`/${language}/fortunes`} className="text-deep-purple-200 hover:text-gold-400 transition-colors text-sm xl:text-base">
                  {t('nav.fortunes')}
                </Link>
                <Link href={`/${language}/chat`} className="text-deep-purple-200 hover:text-gold-400 transition-colors flex items-center gap-1 text-sm xl:text-base">
                  <MessageCircle className="w-4 h-4" />
                  <span>{language === 'tr' ? 'Sohbet' : 'Chat'}</span>
                </Link>
                <Link href={`/${language}/dashboard`} className="text-deep-purple-200 hover:text-gold-400 transition-colors text-sm xl:text-base">
                  {t('nav.dashboard')}
                </Link>
                {session?.user?.role === 'admin' && (
                  <Link href={`/${language}/admin`} className="text-deep-purple-200 hover:text-gold-400 transition-colors flex items-center gap-1 text-sm xl:text-base">
                    <Shield className="w-4 h-4" />
                    {t('nav.admin')}
                  </Link>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-deep-purple-900/50 rounded-full border border-gold-600/30">
                  <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                  <span className="text-gold-400 font-medium text-sm">{session?.user?.credits ?? 0}</span>
                </div>
                <Link href={`/${language}/profile`} className="text-deep-purple-200 hover:text-gold-400 transition-colors">
                  <User className="w-5 h-5" />
                </Link>
                <button onClick={() => signOut({ callbackUrl: `/${language}` })} className="text-deep-purple-200 hover:text-gold-400 transition-colors" aria-label="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link href={`/${language}/login`} className="text-deep-purple-200 hover:text-gold-400 transition-colors text-sm xl:text-base">
                  {t('nav.login')}
                </Link>
                <Link href={`/${language}/register`} className="px-3 py-1.5 bg-gold-600 text-deep-purple-950 rounded-lg hover:bg-gold-500 transition-colors font-medium text-sm xl:text-base">
                  {t('nav.register')}
                </Link>
              </>
            )}
            <Link href={`/${language}/contact`} className="text-deep-purple-200 hover:text-gold-400 transition-colors text-sm xl:text-base">
              {language === 'tr' ? 'İletişim' : 'Contact'}
            </Link>
            <button onClick={toggleLanguage} className="flex items-center gap-1 text-deep-purple-200 hover:text-gold-400 transition-colors px-2.5 py-1 border border-deep-purple-700 rounded-lg" aria-label="Switch Language">
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium uppercase">{language}</span>
            </button>
          </div>

          {/* Tablet Nav (md-lg) */}
          <div className="hidden md:flex lg:hidden items-center gap-3">
            {session?.user ? (
              <>
                <Link href={`/${language}/fortunes`} className="text-deep-purple-200 hover:text-gold-400 transition-colors text-sm">
                  {language === 'tr' ? 'Fallar' : 'Fortunes'}
                </Link>
                <Link href={`/${language}/chat`} className="text-deep-purple-200 hover:text-gold-400 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </Link>
                <Link href={`/${language}/dashboard`} className="text-deep-purple-200 hover:text-gold-400 transition-colors text-sm">
                  {language === 'tr' ? 'Panel' : 'Dashboard'}
                </Link>
                {session?.user?.role === 'admin' && (
                  <Link href={`/${language}/admin`} className="text-deep-purple-200 hover:text-gold-400 transition-colors">
                    <Shield className="w-5 h-5" />
                  </Link>
                )}
                <div className="flex items-center gap-1 px-2 py-0.5 bg-deep-purple-900/50 rounded-full border border-gold-600/30">
                  <Sparkles className="w-3 h-3 text-gold-500" />
                  <span className="text-gold-400 font-medium text-xs">{session?.user?.credits ?? 0}</span>
                </div>
                <Link href={`/${language}/profile`} className="text-deep-purple-200 hover:text-gold-400 transition-colors">
                  <User className="w-5 h-5" />
                </Link>
                <button onClick={() => signOut({ callbackUrl: `/${language}` })} className="text-deep-purple-200 hover:text-gold-400 transition-colors" aria-label="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link href={`/${language}/login`} className="text-deep-purple-200 hover:text-gold-400 transition-colors text-sm">
                  {t('nav.login')}
                </Link>
                <Link href={`/${language}/register`} className="px-3 py-1 bg-gold-600 text-deep-purple-950 rounded-lg hover:bg-gold-500 transition-colors font-medium text-sm">
                  {t('nav.register')}
                </Link>
              </>
            )}
            <button onClick={toggleLanguage} className="flex items-center gap-1 text-deep-purple-200 hover:text-gold-400 transition-colors px-2 py-1 border border-deep-purple-700 rounded-lg" aria-label="Switch Language">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">{language}</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-3">
            {session?.user && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-deep-purple-900/50 rounded-full border border-gold-600/30">
                <Sparkles className="w-3 h-3 text-gold-500" />
                <span className="text-gold-400 font-medium text-xs">{session?.user?.credits ?? 0}</span>
              </div>
            )}
            <button onClick={toggleLanguage} className="text-deep-purple-200 hover:text-gold-400 transition-colors p-1.5 border border-deep-purple-700 rounded-lg" aria-label="Switch Language">
              <Globe className="w-4 h-4" />
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-deep-purple-200 hover:text-gold-400 transition-colors p-1.5" aria-label="Menu">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-deep-purple-800/50 space-y-2">
            {session?.user ? (
              <>
                <Link href={`/${language}/fortunes`} onClick={() => setIsMenuOpen(false)} className="block py-2 px-3 text-deep-purple-200 hover:text-gold-400 hover:bg-deep-purple-900/50 rounded-lg transition-colors">
                  {t('nav.fortunes')}
                </Link>
                <Link href={`/${language}/chat`} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 py-2 px-3 text-deep-purple-200 hover:text-gold-400 hover:bg-deep-purple-900/50 rounded-lg transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  {language === 'tr' ? 'Sohbet' : 'Chat'}
                </Link>
                <Link href={`/${language}/dashboard`} onClick={() => setIsMenuOpen(false)} className="block py-2 px-3 text-deep-purple-200 hover:text-gold-400 hover:bg-deep-purple-900/50 rounded-lg transition-colors">
                  {t('nav.dashboard')}
                </Link>
                {session?.user?.role === 'admin' && (
                  <Link href={`/${language}/admin`} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 py-2 px-3 text-deep-purple-200 hover:text-gold-400 hover:bg-deep-purple-900/50 rounded-lg transition-colors">
                    <Shield className="w-4 h-4" />
                    {t('nav.admin')}
                  </Link>
                )}
                <Link href={`/${language}/profile`} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 py-2 px-3 text-deep-purple-200 hover:text-gold-400 hover:bg-deep-purple-900/50 rounded-lg transition-colors">
                  <User className="w-4 h-4" />
                  {language === 'tr' ? 'Profil' : 'Profile'}
                </Link>
                <Link href={`/${language}/contact`} onClick={() => setIsMenuOpen(false)} className="block py-2 px-3 text-deep-purple-200 hover:text-gold-400 hover:bg-deep-purple-900/50 rounded-lg transition-colors">
                  {language === 'tr' ? 'İletişim' : 'Contact'}
                </Link>
                <button onClick={() => { signOut({ callbackUrl: `/${language}` }); setIsMenuOpen(false); }} className="flex items-center gap-2 w-full py-2 px-3 text-deep-purple-200 hover:text-gold-400 hover:bg-deep-purple-900/50 rounded-lg transition-colors">
                  <LogOut className="w-4 h-4" />
                  {language === 'tr' ? 'Çıkış' : 'Logout'}
                </button>
              </>
            ) : (
              <>
                <Link href={`/${language}/login`} onClick={() => setIsMenuOpen(false)} className="block py-2 px-3 text-deep-purple-200 hover:text-gold-400 hover:bg-deep-purple-900/50 rounded-lg transition-colors">
                  {t('nav.login')}
                </Link>
                <Link href={`/${language}/register`} onClick={() => setIsMenuOpen(false)} className="block py-2 px-3 bg-gold-600 text-deep-purple-950 rounded-lg hover:bg-gold-500 transition-colors font-medium text-center">
                  {t('nav.register')}
                </Link>
                <Link href={`/${language}/contact`} onClick={() => setIsMenuOpen(false)} className="block py-2 px-3 text-deep-purple-200 hover:text-gold-400 hover:bg-deep-purple-900/50 rounded-lg transition-colors">
                  {language === 'tr' ? 'İletişim' : 'Contact'}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
