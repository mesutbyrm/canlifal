'use client'

import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import FortuneCard from '@/components/fortune-card'
import { Camera, Sparkles } from 'lucide-react'

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
          <p className="text-deep-purple-400 text-sm mt-3 flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" />
            {language === 'tr' ? 'Görsel yüklemeli fallar: Kahve Falı, El Falı' : 'Image upload fortunes: Coffee Fortune, Palm Reading'}
          </p>
        </motion.div>

        {/* Featured - Image Upload Fortunes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-gold-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {language === 'tr' ? 'Görsel Analiz ile Fal' : 'Fortune with Image Analysis'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FortuneCard type="coffee" imageSrc="/coffee_fortune_icon.jpg" cost={5} />
            <FortuneCard type="palm" imageSrc="/palm_icon.jpg" cost={8} />
          </div>
        </motion.div>

        {/* Card Based Fortunes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-gold-400 text-sm font-semibold uppercase tracking-wider mb-4">
            {language === 'tr' ? 'Kart Falları' : 'Card Readings'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FortuneCard type="tarot" imageSrc="/tarot_reading_icon.jpg" cost={7} />
            <FortuneCard type="katina" imageSrc="/katina_icon.jpg" cost={6} />
            <FortuneCard type="angel" imageSrc="/angel_icon.jpg" cost={5} />
          </div>
        </motion.div>

        {/* Astrology & Numerology */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-gold-400 text-sm font-semibold uppercase tracking-wider mb-4">
            {language === 'tr' ? 'Astroloji & Numeroloji' : 'Astrology & Numerology'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FortuneCard type="horoscope" imageSrc="/horoscope_icon.jpg" cost={3} />
            <FortuneCard type="birthchart" imageSrc="/birthchart_icon.jpg" cost={10} />
            <FortuneCard type="numerology" imageSrc="/numerology_icon.jpg" cost={4} />
            <FortuneCard type="love" imageSrc="/love_compatibility_icon.jpg" cost={5} />
          </div>
        </motion.div>

        {/* Spiritual & Energy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-gold-400 text-sm font-semibold uppercase tracking-wider mb-4">
            {language === 'tr' ? 'Ruhsal & Enerji' : 'Spiritual & Energy'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FortuneCard type="dream" imageSrc="/dream_interpretation_icon.jpg" cost={5} />
            <FortuneCard type="istikhara" imageSrc="/istikhara_icon.jpg" cost={4} />
            <FortuneCard type="aura" imageSrc="/aura_icon.jpg" cost={6} />
            <FortuneCard type="yesno" imageSrc="/yesno_oracle_icon.jpg" cost={2} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
