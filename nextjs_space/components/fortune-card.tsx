'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { Sparkles } from 'lucide-react'

interface FortuneCardProps {
  type: 'coffee' | 'tarot' | 'dream' | 'horoscope' | 'numerology' | 'love' | 'yesno' | 'katina' | 'palm' | 'istikhara' | 'angel' | 'birthchart' | 'aura' | 'kursundokme'
  imageSrc: string
  cost: number
}

const FORTUNE_NAMES: Record<string, string> = {
  coffee: 'Kahve Falı',
  tarot: 'Tarot Falı',
  dream: 'Rüya Tabiri',
  horoscope: 'Günlük Burç',
  numerology: 'Numeroloji',
  love: 'Aşk Uyumu',
  yesno: 'Evet/Hayır Falı',
  katina: 'Katina Falı',
  palm: 'El Falı',
  istikhara: 'İstikhare',
  angel: 'Melek Kartları',
  birthchart: 'Doğum Haritası',
  aura: 'Aura Okuma',
  kursundokme: 'Kurşun Dökme',
}

const FORTUNE_DESCRIPTIONS: Record<string, string> = {
  coffee: 'Fincan fotoğrafı yükleyerek fal baktırın',
  tarot: 'Kartlar yolunuzu aydınlatsın',
  dream: 'Rüyalarınızın sırlarını çözün',
  horoscope: 'Bugün için kozmik rehberliğiniz',
  numerology: 'Sayılarınız kaderinizi açığa çıkarır',
  love: 'Kozmik bağınızı keşfedin',
  yesno: 'Evrenden hızlı cevaplar',
  katina: '32 Katina kartı geleceğinizi açığa çıkarır',
  palm: 'El fotoğrafı yükleyerek kaderinizi okuyun',
  istikhara: 'Manevi rehberlik ve iç huzur',
  angel: 'İlahi melek mesajları alın',
  birthchart: 'Detaylı astrolojik analiz',
  aura: 'Enerji alanınızın renklerini keşfedin',
  kursundokme: 'Telefonu çevirerek kurşun dökün',
}

export default function FortuneCard({ type, imageSrc, cost }: FortuneCardProps) {
  const fortuneName = FORTUNE_NAMES[type] || type
  const fortuneDesc = FORTUNE_DESCRIPTIONS[type] || ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Link href={`/fortunes/${type}`}>
        <div className="relative bg-mystical-card border border-mystical rounded-lg overflow-hidden mystical-shadow hover:shadow-2xl transition-all duration-300">
          {/* Image */}
          <div className="relative aspect-[4/3] sm:aspect-square bg-deep-purple-900">
            <Image
              src={imageSrc}
              alt={fortuneName}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep-purple-950 via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4 md:p-5 space-y-1.5 sm:space-y-2">
            <h3 className="font-serif text-base sm:text-lg md:text-xl lg:text-2xl text-gold-500 gold-glow group-hover:text-gold-400 transition-colors">
              {fortuneName}
            </h3>
            <p className="text-deep-purple-200 text-xs sm:text-sm line-clamp-2">
              {fortuneDesc}
            </p>
            <div className="flex items-center justify-between pt-1 sm:pt-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-gold-500" />
                <span className="text-gold-400 font-medium text-xs sm:text-sm md:text-base">{cost} CFC</span>
              </div>
              <span className="text-deep-purple-300 text-xs sm:text-sm group-hover:text-gold-400 transition-colors">
                {'Keşfet →'}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
