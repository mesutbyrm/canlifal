'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { Sparkles, Star, Moon } from 'lucide-react'
import FortuneCard from '@/components/fortune-card'

export default function HomePage() {
  const { language } = useLanguage()
  const { data: session } = useSession() || {}

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden pt-14 sm:pt-16">
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
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-6 sm:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <div className="flex flex-col items-center mb-4 sm:mb-6">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-gold-500" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-gold-400 gold-glow tracking-wider mt-2"
              >
                FALCI
              </motion.span>
            </div>
            
            {/* Neyse Halin Çıksın Falın - Decorative text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl text-deep-purple-200 italic tracking-wide"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {language === 'tr' ? 'Neyse Halin, Çıksın Falın' : 'Whatever Your State, Let Fortune Await'}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <Link
              href={session?.user ? `/${language}/fortunes` : `/${language}/register`}
              className="inline-block px-6 sm:px-8 md:px-10 py-3 sm:py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-[#1a0b2e] rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all duration-300 font-serif font-bold text-xl sm:text-2xl md:text-3xl shadow-lg hover:shadow-2xl tracking-wider border-2 border-gold-400"
            >
              {language === 'tr' ? 'FAL BAK' : 'GET FORTUNE'}
            </Link>
          </motion.div>
        </div>

        {/* Floating Decorations - responsive positioning */}
        <motion.div
          animate={{ y: [-20, 20, -20] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-24 sm:top-20 left-4 sm:left-10 opacity-20 sm:opacity-30"
        >
          <Star className="w-8 h-8 sm:w-12 sm:h-12 text-gold-400" />
        </motion.div>
        <motion.div
          animate={{ y: [20, -20, 20] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-16 sm:bottom-20 right-4 sm:right-10 opacity-20 sm:opacity-30"
        >
          <Moon className="w-10 h-10 sm:w-16 sm:h-16 text-gold-400" />
        </motion.div>
      </section>

      {/* Fortune Types Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-[#0a0118]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gold-500 gold-glow mb-3 sm:mb-4">
              {language === 'tr' ? 'Mistik Yolunuzu Seçin' : 'Choose Your Mystical Path'}
            </h2>
            <p className="text-deep-purple-200 text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-4">
              {language === 'tr' 
                ? 'Her fal türü, geleceğinizin farklı yönlerini açığa çıkarır'
                : 'Each fortune type reveals different aspects of your future'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
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
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-deep-purple-975">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gold-500 gold-glow">
              {language === 'tr' ? 'Nasıl Çalışır?' : 'How It Works'}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3].map((step) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: step * 0.2 }}
                viewport={{ once: true }}
                className="text-center space-y-3 sm:space-y-4"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gold-600/20 rounded-full flex items-center justify-center border-2 border-gold-600">
                  <span className="text-2xl sm:text-3xl font-serif text-gold-500 font-bold">{step}</span>
                </div>
                <h3 className="font-serif text-lg sm:text-xl text-gold-400">
                  {step === 1 && (language === 'tr' ? 'Fal Türünü Seç' : 'Choose Your Fortune')}
                  {step === 2 && (language === 'tr' ? 'Bilgilerini Gir' : 'Enter Your Details')}
                  {step === 3 && (language === 'tr' ? 'Falını Al' : 'Get Your Reading')}
                </h3>
                <p className="text-deep-purple-300 text-xs sm:text-sm px-2">
                  {step === 1 && (language === 'tr' ? 'Kahve falı, tarot, kurşun dökme ve daha fazlası' : 'Coffee, tarot, lead pouring and more')}
                  {step === 2 && (language === 'tr' ? 'Fincanınızı, sorunuzu veya rüyanızı paylaşın' : 'Share your cup, question, or dream details')}
                  {step === 3 && (language === 'tr' ? 'Yapay zeka destekli kişisel falınızı alın' : 'Receive your AI-powered personalized reading')}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
