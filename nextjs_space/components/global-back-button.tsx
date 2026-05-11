'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useSiteTheme } from '@/lib/theme-context'

export default function GlobalBackButton() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme } = useSiteTheme()

  const isCanlidark = theme === 'canlidark'
  const isFacebook = theme === 'facebook'
  const isCosmic = theme === 'cosmic'

  // Hide on homepage, login, register pages
  const segments = pathname.split('/').filter(Boolean)
  // pathname like /tr or /en (homepage) → segments = ['tr'] or ['en']
  // pathname like /tr/profil → segments = ['tr', 'profil']
  const isHomePage = segments.length <= 1
  const lastSegment = segments[segments.length - 1] || ''
  const isAuthPage = ['giris', 'kayit-ol', 'sifre-sifirla', 'sifremi-unuttum'].includes(lastSegment)
  const isAdminPage = segments.includes('admin')

  // Don't show on homepage, auth pages, admin pages
  // Also don't show on pages that already have their own back button (mesajlar, profil)
  const pagesWithOwnBackButton = ['mesajlar', 'profil']
  const hasOwnBackButton = pagesWithOwnBackButton.includes(segments[1] || '')

  if (isHomePage || isAuthPage || isAdminPage || hasOwnBackButton) return null

  // For canlidark: show floating back button
  // For other themes: the navbar already provides navigation, but we still show a subtle back button
  return (
    <div className={`${isCanlidark ? '' : 'md:hidden'} fixed top-2 left-2 z-[45]`}>
      <button
        onClick={() => router.back()}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-lg ${
          isCanlidark
            ? 'bg-black/40 border border-purple-500/30 text-purple-300 hover:bg-black/60'
            : isFacebook
              ? 'bg-white/90 border border-gray-200 text-gray-700 hover:bg-white shadow-md'
              : isCosmic
                ? 'bg-black/40 border border-blue-500/30 text-blue-300 hover:bg-black/60'
                : 'bg-black/40 border border-fuchsia-500/30 text-purple-300 hover:bg-black/60'
        }`}
        aria-label="Geri"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    </div>
  )
}
