'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { ArrowLeft, Sparkles, LucideIcon } from 'lucide-react'

interface FortunePageLayoutProps {
  title: string
  titleEn: string
  subtitle: string
  subtitleEn: string
  icon: LucideIcon
  cost: number
  children: ReactNode
  showBackButton?: boolean
}

export default function FortunePageLayout({
  title,
  titleEn,
  subtitle,
  subtitleEn,
  icon: Icon,
  cost,
  children,
  showBackButton = true
}: FortunePageLayoutProps) {
  const { language } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-purple-975 to-[#0a0118]">
      {/* Fixed Header */}
      <div className="sticky top-0 z-30 bg-deep-purple-975/95 backdrop-blur-sm border-b border-purple-500/20">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          {showBackButton && (
            <Link
              href={`/${language}`}
              className="flex items-center gap-1.5 text-purple-300 hover:text-gold-400 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'tr' ? 'Ana Sayfa' : 'Home'}</span>
            </Link>
          )}
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-gold-500" />
            <span className="text-white font-medium text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">
              {language === 'tr' ? title : titleEn}
            </span>
          </div>
          <div className="flex items-center gap-1 text-gold-400 text-sm">
            <Sparkles className="w-4 h-4" />
            <span>{cost} CFC</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6 sm:mb-8"
          >
            <div className="flex justify-center mb-3 sm:mb-4">
              <div className="p-3 sm:p-4 rounded-full bg-gold-500/10 border border-gold-500/30">
                <Icon className="w-10 h-10 sm:w-14 sm:h-14 text-gold-500" />
              </div>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl text-gold-500 gold-glow mb-2 sm:mb-3">
              {language === 'tr' ? title : titleEn}
            </h1>
            <p className="text-deep-purple-200 text-sm sm:text-lg max-w-md mx-auto">
              {language === 'tr' ? subtitle : subtitleEn}
            </p>
          </motion.div>

          {/* Main Content Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-mystical-card border border-mystical rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mystical-shadow"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
