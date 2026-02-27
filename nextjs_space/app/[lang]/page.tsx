'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { Sparkles, Star, Moon } from 'lucide-react'
import FortuneCard from '@/components/fortune-card'

export default function HomePage() {
  const { language, t } = useLanguage()
  const { data: session } = useSession() || {}

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero_background.jpg"
            alt="Hero Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-deep-purple-950/80 via-deep-purple-950/60 to-[#0a0118]" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Sparkles className="w-20 h-20 text-gold-500" />
              </motion.div>
            </div>
            <h1 className="font-serif text-5xl md:text-7xl text-gold-500 gold-glow">
              {t('landing.hero.title')}
            </h1>
            <p className="text-xl md:text-2xl text-deep-purple-200">
              {t('landing.hero.subtitle')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Link
              href={session?.user ? `/${language}/fortunes` : `/${language}/register`}
              className="inline-block px-8 py-4 bg-gold-600 text-deep-purple-950 rounded-lg hover:bg-gold-500 transition-all duration-300 font-semibold text-lg mystical-shadow hover:shadow-2xl"
            >
              {t('landing.hero.cta')}
            </Link>
          </motion.div>
        </div>

        {/* Floating Decorations */}
        <motion.div
          animate={{ y: [-20, 20, -20] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-10 opacity-30"
        >
          <Star className="w-12 h-12 text-gold-400" />
        </motion.div>
        <motion.div
          animate={{ y: [20, -20, 20] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-20 right-10 opacity-30"
        >
          <Moon className="w-16 h-16 text-gold-400" />
        </motion.div>
      </section>

      {/* Fortune Types Section */}
      <section className="py-20 px-4 bg-[#0a0118]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-serif text-4xl md:text-5xl text-gold-500 gold-glow mb-4">
              {language === 'tr' ? 'Üç Mistik Yoldan Birini Seçin' : 'Choose Your Mystical Path'}
            </h2>
            <p className="text-deep-purple-200 text-lg max-w-2xl mx-auto">
              {language === 'tr' 
                ? 'Her fal türü, geleceğinizin farklı yönlerini açığa çıkarır'
                : 'Each fortune type reveals different aspects of your future'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
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
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-deep-purple-975">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-serif text-4xl md:text-5xl text-gold-500 gold-glow">
              {t('landing.features.title')}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((step) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: step * 0.2 }}
                viewport={{ once: true }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 mx-auto bg-gold-600/20 rounded-full flex items-center justify-center border-2 border-gold-600">
                  <span className="text-3xl font-serif text-gold-500 font-bold">{step}</span>
                </div>
                <h3 className="font-serif text-xl text-gold-400">
                  {t(`landing.features.step${step}`)}
                </h3>
                <p className="text-deep-purple-300 text-sm">
                  {step === 1 && (language === 'tr' ? 'Kahve falı, tarot veya rüya yorumundan birini seçin' : 'Select from coffee, tarot, or dream interpretation')}
                  {step === 2 && (language === 'tr' ? 'Fincanınızı, sorunuzu veya rüyanızı paylaşın' : 'Share your cup, question, or dream details')}
                  {step === 3 && (language === 'tr' ? 'Yapay zeka destekli, kişiselleştirilmiş falınızı alın' : 'Receive your AI-powered personalized reading')}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
