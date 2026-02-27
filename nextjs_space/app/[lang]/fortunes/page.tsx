'use client'

import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import FortuneCard from '@/components/fortune-card'

export default function FortunesPage() {
  const { language, t } = useLanguage()

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-6xl text-gold-500 gold-glow mb-4">
            {t('nav.fortunes')}
          </h1>
          <p className="text-deep-purple-200 text-lg max-w-2xl mx-auto">
            {language === 'tr' ? 'Mistik dünyaya adım atın ve geleceğinizi keşfedin' : 'Step into the mystical world and discover your future'}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          <FortuneCard
            type="coffee"
            imageSrc="/coffee_fortune_icon.jpg"
            cost={5}
          />
          <FortuneCard
            type="tarot"
            imageSrc="/tarot_reading_icon.jpg"
            cost={7}
          />
          <FortuneCard
            type="dream"
            imageSrc="/dream_interpretation_icon.jpg"
            cost={5}
          />
          <FortuneCard
            type="horoscope"
            imageSrc="/horoscope_icon.jpg"
            cost={3}
          />
          <FortuneCard
            type="numerology"
            imageSrc="/numerology_icon.jpg"
            cost={4}
          />
          <FortuneCard
            type="love"
            imageSrc="/love_compatibility_icon.jpg"
            cost={5}
          />
          <FortuneCard
            type="yesno"
            imageSrc="/yesno_oracle_icon.jpg"
            cost={2}
          />
        </div>
      </div>
    </div>
  )
}
