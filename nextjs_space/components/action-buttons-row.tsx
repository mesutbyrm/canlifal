'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { useSectionPresence } from '@/hooks/use-section-presence'
import { useSiteTheme } from '@/lib/theme-context'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BanaOzelPopup from '@/components/bana-ozel-popup'

interface HomepageButton {
  id: string
  key: string
  label: string
  icon: string
  href: string
  sortOrder: number
  specialBehavior: string | null
}

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

// Badge count mapping for known keys
function getBadgeCount(key: string, counts: Record<string, number>, isTeller: boolean, pendingRequestCount: number): number {
  switch (key) {
    case 'games': return counts.games || 0
    case 'gifts': return counts.gifts || 0
    case 'teller': return isTeller ? pendingRequestCount : 0
    case 'social': return counts.social || 0
    case 'chat': return counts.chat || 0
    case 'blog': return counts.blog || 0
    case 'bana-ozel': return (counts.games || 0) + (counts.fortunes || 0)
    default: return 0
  }
}

// Dynamic href based on special behaviors
function getEffectiveHref(btn: HomepageButton, session: any, isTeller: boolean, hasAgency: boolean): string {
  if (btn.specialBehavior === 'teller') {
    if (!session?.user) return '/giris'
    return isTeller ? '/profil' : btn.href
  }
  if (btn.specialBehavior === 'ajans') {
    if (!session?.user) return btn.href
    return hasAgency ? '/ajans-paneli' : btn.href
  }
  if (btn.key === 'gifts' && !session?.user) return '/giris'
  return btn.href
}

// Dynamic label for special buttons
function getEffectiveLabel(btn: HomepageButton, isTeller: boolean, hasAgency: boolean): string {
  if (btn.specialBehavior === 'teller' && isTeller) return 'Falcı Paneli'
  if (btn.specialBehavior === 'ajans' && hasAgency) return 'Ajans Paneli'
  return btn.label
}

// Style mappings per theme
const THEME_STYLES: Record<string, Record<string, string>> = {
  falclub: {
    default: 'bg-[#0f0520]/60 border-purple-500/60 text-purple-300 hover:border-purple-400 hover:bg-purple-900/20',
  },
  falci: {
    default: 'bg-gradient-to-r from-indigo-600/30 to-violet-600/30 border-indigo-400/50 text-indigo-200 hover:border-indigo-300',
  },
  cosmic: {
    default: 'bg-gradient-to-r from-indigo-900/40 to-violet-900/40 border-indigo-500/50 text-indigo-300 hover:border-indigo-400',
  },
}

export default function ActionButtonsRow({ isTeller = false, pendingRequestCount = 0, variant }: ActionButtonsRowProps) {
  const { language } = useLanguage()
  const { data: session } = useSession() || {}
  const { counts } = useSectionPresence()
  const { theme } = useSiteTheme()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showBanaOzel, setShowBanaOzel] = useState(false)
  const [buttons, setButtons] = useState<HomepageButton[]>([])
  const [hasAgency, setHasAgency] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const fetchButtons = async () => {
      try {
        const res = await fetch('/api/homepage-buttons')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.buttons) && data.buttons.length > 0) {
            setButtons(data.buttons)
          }
        }
      } catch {
        // fallback to empty
      }
    }
    fetchButtons()
  }, [])

  // Check if user has an agency membership
  useEffect(() => {
    if (!session?.user) { setHasAgency(false); return }
    const checkAgency = async () => {
      try {
        const res = await fetch('/api/agency/my')
        if (res.ok) {
          const data = await res.json()
          setHasAgency(!!(data.membership || data.ownedAgency))
        }
      } catch { /* ignore */ }
    }
    checkAgency()
  }, [session?.user])

  const resolvedVariant = variant || (theme === 'cosmic' ? 'cosmic' : theme === 'falci' ? 'falci' : 'falclub')
  const themeStyle = THEME_STYLES[resolvedVariant]?.default || THEME_STYLES.falclub.default

  if (!mounted || buttons.length === 0) {
    return <div className="grid grid-cols-4 md:grid-cols-8 gap-2 min-h-[44px]" />
  }

  const handleClick = (btn: HomepageButton) => {
    if (btn.specialBehavior === 'bana-ozel') {
      if (!session?.user) {
        router.push('/giris')
      } else {
        router.push('/bana-ozel')
      }
      return true
    }
    return false
  }

  // Calculate grid columns based on button count
  const colCount = Math.min(buttons.length, 8)

  return (
    <>
      <div className={`grid gap-1.5 sm:gap-2`} style={{ gridTemplateColumns: `repeat(${Math.min(colCount, 4)}, minmax(0, 1fr))` }}>
        {buttons.map((btn) => {
          const badgeCount = getBadgeCount(btn.key, counts as unknown as Record<string, number>, isTeller, pendingRequestCount)
          const effectiveHref = getEffectiveHref(btn, session, isTeller, hasAgency)
          const effectiveLabel = getEffectiveLabel(btn, isTeller, hasAgency)
          const isBanaOzel = btn.specialBehavior === 'bana-ozel'

          if (isBanaOzel) {
            return (
              <button
                key={btn.id}
                onClick={() => handleClick(btn)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 h-11 px-1 sm:px-3 rounded-xl border transition-all duration-300 hover:scale-[1.02] relative ${themeStyle}`}
              >
                <span className="flex-shrink-0 text-sm">{btn.icon}</span>
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight truncate max-w-full">
                  {effectiveLabel}
                </span>
                <LiveBadge count={badgeCount} />
              </button>
            )
          }

          return (
            <Link
              key={btn.id}
              href={effectiveHref}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 h-11 px-1 sm:px-3 rounded-xl border transition-all duration-300 hover:scale-[1.02] relative ${themeStyle}`}
            >
              <span className="flex-shrink-0 text-sm">{btn.icon}</span>
              <span className="text-[10px] sm:text-xs font-medium text-center leading-tight truncate max-w-full">
                {effectiveLabel}
              </span>
              <LiveBadge count={badgeCount} />
            </Link>
          )
        })}
      </div>
      <BanaOzelPopup isOpen={showBanaOzel} onClose={() => setShowBanaOzel(false)} />
    </>
  )
}
