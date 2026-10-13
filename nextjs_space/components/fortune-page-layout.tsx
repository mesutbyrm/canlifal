'use client'

import { ReactNode, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import PageMetaTags from '@/components/page-meta-tags'
import { useLanguage } from '@/lib/language-context'
import { ArrowLeft, Sparkles, LucideIcon, Coins } from 'lucide-react'

interface FortunePageLayoutProps {
  title: string
  titleEn: string
  subtitle: string
  subtitleEn: string
  icon: LucideIcon
  cost: number
  children: ReactNode
  showBackButton?: boolean
  seoDescription?: string
  heroImage?: string
}

// Map fortune slugs to their hero images
const FORTUNE_IMAGES: Record<string, string> = {
  'kahve-fali': '/fortunes/coffee_hero.webp',
  'tarot-fali': '/fortunes/tarot_hero.webp',
  'el-fali': '/fortunes/palm_hero.webp',
  'ruya-yorumu': '/fortunes/dream_hero.webp',
  'burc-yorumu': '/fortunes/horoscope_hero.webp',
  'ask-uyumu': '/fortunes/love_hero.webp',
  'numeroloji': '/fortunes/numerology_hero.webp',
  'melek-kartlari': '/fortunes/angel_hero.webp',
  'aura-analizi': '/fortunes/aura_hero.webp',
  'dogum-haritasi': '/fortunes/birthchart_hero.webp',
  'evet-hayir': '/fortunes/yesno_hero.webp',
  'katina': '/fortunes/katina_hero.webp',
  'istihare': '/fortunes/angel_hero.webp',
  'kursundokme': '/fortunes/aura_hero.webp',
}

// Floating particles component
function MysticalParticles() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => {
        const size = 2 + (i % 4)
        const left = (i * 5.26) % 100
        const delay = (i * 0.7) % 8
        const dur = 6 + (i % 5) * 2
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              bottom: '-5%',
              background: i % 3 === 0 ? 'rgba(217,170,75,0.6)' : i % 3 === 1 ? 'rgba(192,38,211,0.5)' : 'rgba(255,255,255,0.3)',
              boxShadow: i % 3 === 0 ? '0 0 6px rgba(217,170,75,0.4)' : 'none',
            }}
            animate={{
              y: [0, -800],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1, 0.3],
            }}
            transition={{
              duration: dur,
              repeat: Infinity,
              delay: delay,
              ease: 'easeOut',
            }}
          />
        )
      })}
    </div>
  )
}

export default function FortunePageLayout({
  title,
  titleEn,
  subtitle,
  subtitleEn,
  icon: Icon,
  cost,
  children,
  showBackButton = true,
  seoDescription,
  heroImage,
}: FortunePageLayoutProps) {
  const { language } = useLanguage()
  const pathname = usePathname()
  const cleanPath = pathname?.replace(/^\/(tr|en)/, '') || ''
  const canonicalUrl = `https://canlifal.com${cleanPath}`
  const desc = seoDescription || subtitle

  // Determine hero image from slug if not provided
  const slug = cleanPath.split('/').pop() || ''
  const bgImage = heroImage || FORTUNE_IMAGES[slug] || '/fortunes/tarot.webp'

  return (
    <div className="min-h-screen bg-[#0a0118]">
      <PageMetaTags title={title} description={desc} canonicalUrl={canonicalUrl} />

      {/* ═══ HERO SECTION with background image ═══ */}
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src={bgImage}
            alt={title}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          {/* Multi-layer gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0118]/60 via-[#0a0118]/40 to-[#0a0118]" />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-transparent to-fuchsia-900/30" />
        </div>

        {/* Floating Particles */}
        <MysticalParticles />

        {/* Top Navigation Bar */}
        <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-2">
          {showBackButton && (
            <Link
              href="/"
              className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors backdrop-blur-sm bg-white/10 rounded-full px-3 py-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">{'Geri'}</span>
            </Link>
          )}
          <div className="flex items-center gap-1.5 backdrop-blur-sm bg-white/10 rounded-full px-3 py-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 text-sm font-medium">{cost} Jeton</span>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 px-4 pt-6 pb-10 sm:pt-10 sm:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-center max-w-lg mx-auto"
          >
            {/* Glowing Icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center mb-4"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gold-500/20 blur-xl scale-150" />
                <div className="relative p-4 sm:p-5 rounded-full bg-gradient-to-br from-gold-500/20 to-amber-500/10 border border-gold-500/30 backdrop-blur-sm">
                  <Icon className="w-10 h-10 sm:w-14 sm:h-14 text-gold-400 drop-shadow-[0_0_12px_rgba(217,170,75,0.6)]" />
                </div>
              </div>
            </motion.div>

            {/* Title with glow */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="font-serif text-3xl sm:text-4xl md:text-5xl text-white font-bold mb-3 drop-shadow-[0_2px_20px_rgba(217,170,75,0.3)]"
            >
              <span className="bg-gradient-to-r from-gold-300 via-amber-200 to-gold-400 bg-clip-text text-transparent">
                {title}
              </span>
            </motion.h1>

            {/* Decorative line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mx-auto w-24 h-[2px] bg-gradient-to-r from-transparent via-gold-500/70 to-transparent mb-3"
            />

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-purple-200/90 text-sm sm:text-lg max-w-sm mx-auto leading-relaxed"
            >
              {subtitle}
            </motion.p>
          </motion.div>
        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-[#0a0118]" style={{ borderRadius: '50% 50% 0 0' }} />
      </div>

      {/* ═══ CONTENT SECTION ═══ */}
      <div className="relative z-10 px-3 sm:px-4 -mt-2 pb-8 sm:pb-12">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-fuchsia-600/10 to-purple-600/20 rounded-2xl blur-xl" />
            {/* Main card */}
            <div className="relative bg-gradient-to-b from-[#1a0a2e]/95 to-[#0f0520]/95 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4 sm:p-6 md:p-8 shadow-[0_8px_32px_rgba(88,28,135,0.3)]">
              {children}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
