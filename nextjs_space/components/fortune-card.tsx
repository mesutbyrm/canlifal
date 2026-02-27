'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { Sparkles } from 'lucide-react'

interface FortuneCardProps {
  type: 'coffee' | 'tarot' | 'dream'
  imageSrc: string
  cost: number
}

export default function FortuneCard({ type, imageSrc, cost }: FortuneCardProps) {
  const { language, t } = useLanguage()

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
              alt={t(`fortune.${type}.name`)}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep-purple-950 via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="p-6 space-y-3">
            <h3 className="font-serif text-2xl text-gold-500 gold-glow group-hover:text-gold-400 transition-colors">
              {t(`fortune.${type}.name`)}
            </h3>
            <p className="text-deep-purple-200 text-sm">
              {t(`fortune.${type}.description`)}
            </p>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-500" />
                <span className="text-gold-400 font-medium">{cost} {t('nav.credits')}</span>
              </div>
              <span className="text-deep-purple-300 text-sm group-hover:text-gold-400 transition-colors">
                {language === 'tr' ? 'Keşfet →' : 'Explore →'}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
