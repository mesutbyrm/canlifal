'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { Sparkles } from 'lucide-react'

interface FortuneCardProps {
  type: 'coffee' | 'tarot' | 'dream' | 'horoscope' | 'numerology' | 'love' | 'yesno'
  imageSrc: string
  cost: number
}

const FORTUNE_NAMES: Record<string, { en: string; tr: string }> = {
  coffee: { en: 'Coffee Fortune', tr: 'Kahve Falı' },
  tarot: { en: 'Tarot Reading', tr: 'Tarot Falı' },
  dream: { en: 'Dream Interpretation', tr: 'Rüya Tabiri' },
  horoscope: { en: 'Daily Horoscope', tr: 'Günlük Burç' },
  numerology: { en: 'Numerology', tr: 'Numeroloji' },
  love: { en: 'Love Compatibility', tr: 'Aşk Uyumu' },
  yesno: { en: 'Yes/No Oracle', tr: 'Evet/Hayır Falı' },
}

const FORTUNE_DESCRIPTIONS: Record<string, { en: string; tr: string }> = {
  coffee: { en: 'Discover hidden messages in your coffee cup', tr: 'Fincanınızdaki gizli mesajları keşfedin' },
  tarot: { en: 'Let the cards reveal your path', tr: 'Kartlar yolunuzu aydınlatsın' },
  dream: { en: 'Unlock the secrets of your dreams', tr: 'Rüyalarınızın sırlarını çözün' },
  horoscope: { en: 'Your cosmic guidance for today', tr: 'Bugün için kozmik rehberliğiniz' },
  numerology: { en: 'Your numbers reveal your destiny', tr: 'Sayılarınız kaderinizi açığa çıkarır' },
  love: { en: 'Discover your cosmic connection', tr: 'Kozmik bağınızı keşfedin' },
  yesno: { en: 'Quick answers from the universe', tr: 'Evrenden hızlı cevaplar' },
}

export default function FortuneCard({ type, imageSrc, cost }: FortuneCardProps) {
  const { language } = useLanguage()
  const lang = language === 'tr' ? 'tr' : 'en'
  const fortuneName = FORTUNE_NAMES[type]?.[lang] || type
  const fortuneDesc = FORTUNE_DESCRIPTIONS[type]?.[lang] || ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Link href={`/${language}/fortunes/${type}`}>
        <div className="relative bg-mystical-card border border-mystical rounded-lg overflow-hidden mystical-shadow hover:shadow-2xl transition-all duration-300">
          {/* Image */}
          <div className="relative aspect-square bg-deep-purple-900">
            <Image
              src={imageSrc}
              alt={fortuneName}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep-purple-950 via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="p-5 space-y-2">
            <h3 className="font-serif text-xl text-gold-500 gold-glow group-hover:text-gold-400 transition-colors">
              {fortuneName}
            </h3>
            <p className="text-deep-purple-200 text-sm line-clamp-2">
              {fortuneDesc}
            </p>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-500" />
                <span className="text-gold-400 font-medium">{cost} {lang === 'tr' ? 'kredi' : 'credits'}</span>
              </div>
              <span className="text-deep-purple-300 text-sm group-hover:text-gold-400 transition-colors">
                {lang === 'tr' ? 'Keşfet →' : 'Explore →'}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
