'use client'

import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import FortuneCard from '@/components/fortune-card'
import { Camera, Sparkles, Star } from 'lucide-react'

export default function FortunesPage() {
  const { language, t } = useLanguage()

  return (
    <div className="min-h-screen py-20 px-4 bg-[#0a0118]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-gold-400 mb-2">
            {'Fallar'}
          </h1>
          <p className="text-purple-300 max-w-2xl mx-auto">
            {'Mistik dünyaya adım atın ve geleceğinizi keşfedin'}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-purple-400 text-sm">
            <Camera className="w-4 h-4" />
            {'Etkileşimli fallar: Kahve Falı, El Falı, Kurşun Dökme'}
          </div>
        </motion.div>

        {/* Featured - Interactive Fortunes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-gold-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {'Etkileşimli & Görsel Fallar'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FortuneCard type="coffee" imageSrc="/coffee_fortune_icon.jpg" cost={5} />
            <FortuneCard type="palm" imageSrc="/palm_icon.jpg" cost={8} />
            <FortuneCard type="kursundokme" imageSrc="/kursun_dokme_icon.jpg" cost={6} />
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
            {'Kart Falları'}
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
            {'Astroloji & Numeroloji'}
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
            {'Ruhsal & Enerji'}
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
