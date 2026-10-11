'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useSiteTheme } from '@/lib/theme-context'

/**
 * Global back button shown top-left on every page except the homepage.
 * Useful for iOS users who don't have a system back gesture/button.
 */
export default function GlobalBackButton() {
  const router = useRouter()
  const pathname = usePathname() || '/'
  const { theme } = useSiteTheme()

  // Strip /tr|/en prefix to detect homepage
  const stripped = pathname.replace(/^\/(tr|en)(?=\/|$)/, '') || '/'
  const isHome = stripped === '/' || stripped === ''

  if (isHome) return null

  const isFacebook = theme === 'facebook'
  const isCanlidark = theme === 'canlidark'

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <button
      onClick={handleBack}
      aria-label="Geri"
      className={`fixed left-2 top-2 z-[60] w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg active:scale-90 transition-transform ${
        isFacebook
          ? 'bg-white/90 text-gray-800 border border-gray-200'
          : isCanlidark
          ? 'bg-purple-900/70 text-white border border-purple-500/40'
          : 'bg-black/50 text-white border border-white/20'
      }`}
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  )
}
