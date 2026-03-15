'use client'

import Link from 'next/link'
import { Gamepad2, Gift, Video, Users, MessageCircle, Sparkles } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { useSectionPresence } from '@/hooks/use-section-presence'
import { useButtonOrder } from '@/hooks/use-button-order'
import { useSiteTheme } from '@/lib/theme-context'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BanaOzelPopup from '@/components/bana-ozel-popup'

interface ActionButtonsRowProps {
  isTeller?: boolean
  pendingRequestCount?: number
  variant?: 'falclub' | 'falci' | 'cosmic'
}

function LiveBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold animate-pulse shadow-lg shadow-red-500/50 z-10">
      {count}
    </span>
  )
}

export default function ActionButtonsRow({ isTeller = false, pendingRequestCount = 0, variant }: ActionButtonsRowProps) {
  const { language } = useLanguage()
  const { data: session } = useSession() || {}
  const { counts } = useSectionPresence()
  const buttonOrder = useButtonOrder()
  const { theme } = useSiteTheme()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showBanaOzel, setShowBanaOzel] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const resolvedVariant = variant || (theme === 'cosmic' ? 'cosmic' : theme === 'falci' ? 'falci' : 'falclub')
  const isCosmic = resolvedVariant === 'cosmic'
  const isFalci = resolvedVariant === 'falci'

  // Button style mappings per theme
  const getButtonStyle = (key: string) => {
    if (isFalci) {
      const styles: Record<string, string> = {
        games: 'bg-gradient-to-r from-indigo-600/30 to-violet-600/30 border-indigo-400/50 text-indigo-200 hover:border-indigo-300',
        gifts: 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border-amber-400/50 text-amber-200 hover:border-amber-300',
        teller: 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-emerald-400/50 text-emerald-200 hover:border-emerald-300',
        social: 'bg-gradient-to-r from-pink-600/30 to-rose-600/30 border-pink-400/50 text-pink-200 hover:border-pink-300',
        chat: 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border-cyan-400/50 text-cyan-200 hover:border-cyan-300',
        'bana-ozel': 'bg-gradient-to-r from-fuchsia-600/30 to-purple-600/30 border-fuchsia-400/50 text-fuchsia-200 hover:border-fuchsia-300',
      }
      return styles[key] || styles.games
    }
    if (isCosmic) {
      const styles: Record<string, string> = {
        games: 'bg-gradient-to-r from-indigo-900/40 to-violet-900/40 border-indigo-500/50 text-indigo-300 hover:border-indigo-400',
        gifts: 'bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-amber-500/50 text-amber-300 hover:border-amber-400',
        teller: 'bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border-emerald-500/50 text-emerald-300 hover:border-emerald-400',
        social: 'bg-gradient-to-r from-pink-900/40 to-rose-900/40 border-pink-500/50 text-pink-300 hover:border-pink-400',
        chat: 'bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border-cyan-500/50 text-cyan-300 hover:border-cyan-400',
        'bana-ozel': 'bg-gradient-to-r from-fuchsia-900/40 to-purple-900/40 border-fuchsia-500/50 text-fuchsia-300 hover:border-fuchsia-400',
      }
      return styles[key] || styles.games
    }
    // falclub
    const styles: Record<string, string> = {
      games: 'bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border-amber-500/50 text-amber-300 hover:border-amber-400',
      gifts: 'bg-gradient-to-r from-fuchsia-900/40 to-purple-900/40 border-fuchsia-500/50 text-fuchsia-300 hover:border-fuchsia-400',
      teller: 'bg-gradient-to-r from-emerald-900/40 to-green-900/40 border-emerald-500/50 text-emerald-300 hover:border-emerald-400',
      social: 'bg-gradient-to-r from-pink-900/40 to-rose-900/40 border-pink-500/50 text-pink-300 hover:border-pink-400',
      chat: 'bg-gradient-to-r from-cyan-900/40 to-teal-900/40 border-cyan-500/50 text-cyan-300 hover:border-cyan-400',
      'bana-ozel': 'bg-gradient-to-r from-violet-900/40 to-fuchsia-900/40 border-violet-500/50 text-violet-300 hover:border-violet-400',
    }
    return styles[key] || styles.games
  }

  const allButtons: Record<string, { key: string; href: string; icon: React.ReactNode; labelTr: string; labelEn: string; badgeCount: number }> = {
    games: {
      key: 'games',
      href: `/${language}/games`,
      icon: <Gamepad2 className="w-4 h-4" />,
      labelTr: 'Oyun Merkezi',
      labelEn: 'Game Center',
      badgeCount: counts.games,
    },
    gifts: {
      key: 'gifts',
      href: session?.user ? `/${language}/gifts` : `/${language}/login`,
      icon: <Gift className="w-4 h-4" />,
      labelTr: 'Hediye Gönder',
      labelEn: 'Send Gift',
      badgeCount: counts.gifts,
    },
    teller: {
      key: 'teller',
      href: session?.user ? (isTeller ? `/${language}/profile` : `/${language}/become-teller`) : `/${language}/login`,
      icon: <Video className="w-4 h-4" />,
      labelTr: isTeller ? 'Falcı Paneli' : 'Canlı Falcı Ol',
      labelEn: isTeller ? 'Teller Panel' : 'Become Live Teller',
      badgeCount: isTeller ? pendingRequestCount : 0,
    },
    social: {
      key: 'social',
      href: `/${language}/social`,
      icon: <Users className="w-4 h-4" />,
      labelTr: 'Sosyal',
      labelEn: 'Social',
      badgeCount: counts.social,
    },
    chat: {
      key: 'chat',
      href: `/${language}/chat`,
      icon: <MessageCircle className="w-4 h-4" />,
      labelTr: 'Fal Sohbet',
      labelEn: 'Fortune Chat',
      badgeCount: counts.chat,
    },
    'bana-ozel': {
      key: 'bana-ozel',
      href: session?.user ? `/${language}/bana-ozel` : `/${language}/login`,
      icon: <Sparkles className="w-4 h-4" />,
      labelTr: 'Bana Özel',
      labelEn: 'For Me',
      badgeCount: counts.games + counts.fortunes,
    },
  }

  const orderedButtons = buttonOrder
    .filter((key) => allButtons[key])
    .map((key) => allButtons[key])

  if (!mounted) {
    return <div className="flex flex-wrap gap-3 min-h-[40px]" />
  }

  const handleButtonClick = (btn: typeof orderedButtons[0]) => {
    if (btn.key === 'bana-ozel') {
      if (!session?.user) {
        router.push(`/${language}/login`)
      } else {
        setShowBanaOzel(true)
      }
      return true
    }
    return false
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {orderedButtons.map((btn) =>
          btn.key === 'bana-ozel' ? (
            <button
              key={btn.key}
              onClick={() => handleButtonClick(btn)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 hover:scale-105 relative ${
                getButtonStyle(btn.key)
              }`}
            >
              {btn.icon}
              <span className="text-sm font-medium">
                {language === 'tr' ? btn.labelTr : btn.labelEn}
              </span>
              <LiveBadge count={btn.badgeCount} />
            </button>
          ) : (
            <Link
              key={btn.key}
              href={btn.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 hover:scale-105 relative ${
                getButtonStyle(btn.key)
              }`}
            >
              {btn.icon}
              <span className="text-sm font-medium">
                {language === 'tr' ? btn.labelTr : btn.labelEn}
              </span>
              <LiveBadge count={btn.badgeCount} />
            </Link>
          )
        )}
      </div>
      <BanaOzelPopup isOpen={showBanaOzel} onClose={() => setShowBanaOzel(false)} />
    </>
  )
}
