'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Sparkles, Star, MessageSquare, Video, Coins, Award } from 'lucide-react'

const TOUR_STEPS = [
  {
    title: 'CanlıFal\'a Hoş Geldin! 🔮',
    description: 'Fal, burç, rüya tabiri ve daha fazlası seni bekliyor. Hızlı bir tur yapalım!',
    icon: <Sparkles className="w-8 h-8 text-purple-400" />,
  },
  {
    title: 'Canlı Falcılar ⭐',
    description: 'Gerçek falcılarla canlı video seans yapabilir, anında fal baktırabilirsin.',
    icon: <Video className="w-8 h-8 text-pink-400" />,
  },
  {
    title: 'Sohbet Odaları 💬',
    description: 'Canlı yayınlara katıl, diğer kullanıcılarla sohbet et ve hediye gönder.',
    icon: <MessageSquare className="w-8 h-8 text-blue-400" />,
  },
  {
    title: 'Jeton Kazan 🪙',
    description: 'Günlük bonuslar, görevler ve başarımlar ile jeton kazan. Jetonlarla falcılardan seans al!',
    icon: <Coins className="w-8 h-8 text-yellow-400" />,
  },
  {
    title: 'Başarımlar & Turnuvalar 🏆',
    description: 'Rozetler topla, haftalık turnuvalara katıl ve sıralamada yüksel!',
    icon: <Award className="w-8 h-8 text-green-400" />,
  },
]

export default function OnboardingTour() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Check localStorage for completion
    try {
      const completed = localStorage.getItem('onboarding_completed')
      if (!completed) {
        // Show after 2 seconds delay
        const timer = setTimeout(() => setShow(true), 2000)
        return () => clearTimeout(timer)
      }
    } catch {}
  }, [])

  const handleClose = () => {
    setShow(false)
    try { localStorage.setItem('onboarding_completed', '1') } catch {}
  }

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) setStep(step + 1)
    else handleClose()
  }

  const handlePrev = () => {
    if (step > 0) setStep(step - 1)
  }

  if (!show) return null

  const currentStep = TOUR_STEPS[step]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-gradient-to-br from-gray-900 to-gray-950 border border-purple-500/30 rounded-2xl p-6 max-w-sm w-full relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button onClick={handleClose} className="absolute top-3 right-3 p-1 text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>

          {/* Step indicator */}
          <div className="flex gap-1 mb-6 justify-center">
            {TOUR_STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === step ? 'w-6 bg-purple-400' : 'w-2 bg-white/20'}`} />
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center">
                {currentStep.icon}
              </div>
              <h2 className="text-lg font-bold text-white mb-2">{currentStep.title}</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{currentStep.description}</p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button onClick={handlePrev} disabled={step === 0}
              className={`p-2 rounded-xl transition-all ${step === 0 ? 'opacity-0 pointer-events-none' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={handleClose} className="text-xs text-gray-500 hover:text-gray-300">Atla</button>
            <button onClick={handleNext}
              className="px-4 py-2 bg-purple-600/50 hover:bg-purple-600/70 rounded-xl text-sm font-medium text-purple-200 flex items-center gap-1 transition-all">
              {step === TOUR_STEPS.length - 1 ? 'Başla!' : 'Devam'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
