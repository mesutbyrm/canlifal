'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, Video, Star, Users, Coins, CheckCircle, Clock,
  AlertCircle, Send, ArrowLeft, Shield, Zap, TrendingUp, Heart,
  Camera, Mic, Wifi, Award, ChevronRight, Info
} from 'lucide-react'
import Link from 'next/link'

const SPECIALTIES = [
  { id: 'tarot', tr: 'Tarot', en: 'Tarot', icon: '🃏' },
  { id: 'kahve', tr: 'Kahve Falı', en: 'Coffee Reading', icon: '☕' },
  { id: 'astroloji', tr: 'Astroloji', en: 'Astrology', icon: '⭐' },
  { id: 'rüya', tr: 'Rüya Yorumu', en: 'Dream Interpretation', icon: '🌙' },
  { id: 'el', tr: 'El Falı', en: 'Palm Reading', icon: '✋' },
  { id: 'katina', tr: 'Katina', en: 'Katina', icon: '🎴' },
  { id: 'numeroloji', tr: 'Numeroloji', en: 'Numerology', icon: '🔢' },
  { id: 'melek', tr: 'Melek Kartları', en: 'Angel Cards', icon: '👼' },
]

const BENEFITS = [
  { icon: Coins, color: 'from-amber-500 to-orange-500', tr: 'Yüksek Kazanç', en: 'High Earnings', desc_tr: 'Her seansdan komisyon kazan', desc_en: 'Earn commission per session' },
  { icon: Users, color: 'from-fuchsia-500 to-pink-500', tr: 'Geniş Kitle', en: 'Large Audience', desc_tr: 'Binlerce aktif kullanıcı', desc_en: 'Thousands of active users' },
  { icon: Zap, color: 'from-yellow-500 to-amber-500', tr: 'Esnek Çalışma', en: 'Flexible Work', desc_tr: 'Dilediğin zaman çalış', desc_en: 'Work whenever you want' },
  { icon: Shield, color: 'from-emerald-500 to-green-500', tr: 'Güvenli Ödeme', en: 'Secure Payment', desc_tr: 'Anında hesabına aktarım', desc_en: 'Instant transfer to account' },
]

const REQUIREMENTS = [
  { icon: Camera, tr: 'Kamera', en: 'Camera' },
  { icon: Mic, tr: 'Mikrofon', en: 'Microphone' },
  { icon: Wifi, tr: 'İnternet', en: 'Internet' },
]

export default function BecomeTellerPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const { language } = useLanguage()
  const lang = (params.lang as string) || language

  const [loading, setLoading] = useState(true)
  const [existingApplication, setExistingApplication] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [applicationNote, setApplicationNote] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push(`/login`)
      return
    }

    const checkExisting = async () => {
      try {
        const res = await fetch('/api/fortune-tellers/my-profile')
        if (res.ok) {
          const data = await res.json()
          if (data) setExistingApplication(data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    checkExisting()
  }, [session, status, router, lang])

  const toggleSpecialty = (id: string) => {
    setSpecialties(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (specialties.length === 0) {
      alert(lang === 'tr' ? 'En az bir uzmanlık alanı seçin' : 'Select at least one specialty')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/fortune-tellers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, bio, specialties, applicationNote })
      })

      if (res.ok) {
        setSuccess(true)
      } else {
        const data = await res.json()
        alert(data.error || 'Bir hata oluştu')
      }
    } catch (e) {
      console.error(e)
      alert('Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const canProceed = currentStep === 1 || (currentStep === 2 && displayName.trim().length > 0) || (currentStep === 3 && specialties.length > 0)

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#150525] to-[#0a0118] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fuchsia-500"></div>
        </div>
      </div>
    )
  }

  // Already approved
  if (existingApplication?.applicationStatus === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#150525] to-[#0a0118] pt-16 sm:pt-20 px-3 sm:px-4 pb-28">
        <div className="max-w-md mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden bg-gradient-to-br from-emerald-900/50 to-green-900/50 border border-emerald-500/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.15),transparent_50%)]" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="relative"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
            </motion.div>
            <h2 className="relative text-xl sm:text-2xl font-bold text-white mb-2">
              {lang === 'tr' ? '🎉 Zaten Falcısınız!' : '🎉 You are a Teller!'}
            </h2>
            <p className="relative text-emerald-200/80 text-sm sm:text-base mb-6">
              {lang === 'tr' 
                ? 'Falcı panelinize giderek canlı yayın başlatabilirsiniz.'
                : 'Go to your teller panel to start live streaming.'}
            </p>
            <Link
              href={`/live-tellers/dashboard`}
              className="relative inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl sm:rounded-2xl hover:from-emerald-600 hover:to-green-600 transition-all shadow-lg shadow-emerald-500/30"
            >
              <Video className="w-5 h-5" />
              {lang === 'tr' ? 'Panele Git' : 'Go to Panel'}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  // Pending
  if (existingApplication?.applicationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#150525] to-[#0a0118] pt-16 sm:pt-20 px-3 sm:px-4 pb-28">
        <div className="max-w-md mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-br from-amber-900/50 to-yellow-900/50 border border-amber-500/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.15),transparent_50%)]" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
            >
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </motion.div>
            <h2 className="relative text-xl sm:text-2xl font-bold text-white mb-2">
              {lang === 'tr' ? '⏳ Başvurunuz İnceleniyor' : '⏳ Under Review'}
            </h2>
            <p className="relative text-amber-200/80 text-sm sm:text-base mb-4">
              {lang === 'tr' 
                ? 'Başvurunuz en kısa sürede değerlendirilecektir.'
                : 'Your application will be reviewed shortly.'}
            </p>
            <div className="relative inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-full text-amber-300 text-sm">
              <Info className="w-4 h-4" />
              {lang === 'tr' ? 'Başvuru: ' : 'Applied: '}
              {new Date(existingApplication.createdAt).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // Rejected
  if (existingApplication?.applicationStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#150525] to-[#0a0118] pt-16 sm:pt-20 px-3 sm:px-4 pb-28">
        <div className="max-w-md mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-br from-red-900/50 to-rose-900/50 border border-red-500/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.15),transparent_50%)]" />
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/30">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            <h2 className="relative text-xl sm:text-2xl font-bold text-white mb-2">
              {lang === 'tr' ? 'Başvurunuz Reddedildi' : 'Application Rejected'}
            </h2>
            <p className="relative text-red-200/80 text-sm sm:text-base mb-4">
              {lang === 'tr' 
                ? 'Maalesef başvurunuz şu an için onaylanamadı.'
                : 'Unfortunately your application could not be approved.'}
            </p>
            <Link href={`/`} className="relative inline-flex items-center gap-2 text-red-300 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              {lang === 'tr' ? 'Ana Sayfa' : 'Home'}
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  // Success
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#150525] to-[#0a0118] pt-16 sm:pt-20 px-3 sm:px-4 pb-28">
        <div className="max-w-md mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden bg-gradient-to-br from-emerald-900/50 to-green-900/50 border border-emerald-500/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center"
          >
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: '-100%', opacity: [0, 1, 0] }}
                  transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
                  className="absolute text-2xl"
                  style={{ left: `${(i * 5) % 100}%` }}
                >
                  {['🎉', '✨', '🌟', '💫'][i % 4]}
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
            >
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </motion.div>
            <h2 className="relative text-xl sm:text-2xl font-bold text-white mb-2">
              {lang === 'tr' ? '🎊 Başvurunuz Alındı!' : '🎊 Application Received!'}
            </h2>
            <p className="relative text-emerald-200/80 text-sm sm:text-base mb-6">
              {lang === 'tr' 
                ? 'En kısa sürede değerlendirilecek ve size bildirilecektir.'
                : 'It will be reviewed and you will be notified shortly.'}
            </p>
            <Link
              href={`/`}
              className="relative inline-flex items-center gap-2 text-emerald-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {lang === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home'}
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  // Application Form with Steps
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#150525] to-[#0a0118] pt-16 sm:pt-20 pb-28 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <motion.div 
            className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/30"
            animate={{ boxShadow: ['0 0 20px rgba(217,70,239,0.3)', '0 0 40px rgba(217,70,239,0.5)', '0 0 20px rgba(217,70,239,0.3)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {lang === 'tr' ? '✨ Canlı Falcı Ol' : '✨ Become a Live Teller'}
          </h1>
          <p className="text-purple-200/70 text-sm sm:text-base">
            {lang === 'tr' ? 'Yeteneklerini paylaş, gelir elde et' : 'Share your talents, earn income'}
          </p>
        </motion.div>

        {/* Step Progress */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8"
        >
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <button
                onClick={() => step < currentStep && setCurrentStep(step)}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === currentStep 
                    ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white scale-110 shadow-lg shadow-fuchsia-500/30' 
                    : step < currentStep
                    ? 'bg-emerald-500 text-white'
                    : 'bg-purple-900/50 text-purple-400 border border-purple-500/30'
                }`}
              >
                {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
              </button>
              {step < 4 && (
                <div className={`w-6 sm:w-10 h-1 mx-1 rounded-full transition-all ${
                  step < currentStep ? 'bg-emerald-500' : 'bg-purple-900/50'
                }`} />
              )}
            </div>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Step 1: Benefits */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {BENEFITS.map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 border border-purple-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-5"
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-3`}>
                      <benefit.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-sm sm:text-base mb-1">
                      {lang === 'tr' ? benefit.tr : benefit.en}
                    </h3>
                    <p className="text-purple-200/60 text-xs sm:text-sm">
                      {lang === 'tr' ? benefit.desc_tr : benefit.desc_en}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Requirements */}
              <div className="bg-purple-900/30 border border-purple-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                <h3 className="text-fuchsia-300 font-semibold text-sm sm:text-base mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {lang === 'tr' ? 'Gereksinimler' : 'Requirements'}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {REQUIREMENTS.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-purple-200 text-sm">
                      <req.icon className="w-4 h-4 text-fuchsia-400" />
                      {lang === 'tr' ? req.tr : req.en}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Name & Bio */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-gradient-to-br from-purple-900/30 to-fuchsia-900/30 border border-purple-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-5"
            >
              <div>
                <label className="block text-fuchsia-300 text-sm font-medium mb-2">
                  {lang === 'tr' ? '🌟 Falcı Adınız *' : '🌟 Teller Name *'}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={lang === 'tr' ? 'Örn: Medyum Ayşe' : 'E.g: Mystic Jane'}
                  className="w-full px-4 py-3 sm:py-4 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-fuchsia-300 text-sm font-medium mb-2">
                  {lang === 'tr' ? '📝 Kendinizi Tanıtın' : '📝 About Yourself'}
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder={lang === 'tr' ? 'Deneyimleriniz, yetenekleriniz...' : 'Your experience, talents...'}
                  className="w-full px-4 py-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 resize-none transition-all"
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Specialties */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-gradient-to-br from-purple-900/30 to-fuchsia-900/30 border border-purple-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6"
            >
              <label className="block text-fuchsia-300 text-sm font-medium mb-4">
                {lang === 'tr' ? '🔮 Uzmanlık Alanlarınız *' : '🔮 Your Specialties *'}
                <span className="text-purple-300/60 text-xs ml-2">
                  ({specialties.length} {lang === 'tr' ? 'seçildi' : 'selected'})
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {SPECIALTIES.map((spec) => (
                  <motion.button
                    key={spec.id}
                    type="button"
                    onClick={() => toggleSpecialty(spec.id)}
                    whileTap={{ scale: 0.95 }}
                    className={`relative p-3 sm:p-4 rounded-xl text-left transition-all ${
                      specialties.includes(spec.id)
                        ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-500/30'
                        : 'bg-purple-900/50 text-purple-200 border border-purple-500/30 hover:border-fuchsia-500'
                    }`}
                  >
                    {specialties.includes(spec.id) && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <span className="text-2xl sm:text-3xl mb-1 block">{spec.icon}</span>
                    <span className="font-medium text-sm sm:text-base">
                      {lang === 'tr' ? spec.tr : spec.en}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-4"
            >
              {/* Summary */}
              <div className="bg-gradient-to-br from-purple-900/30 to-fuchsia-900/30 border border-purple-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4">
                <h3 className="text-fuchsia-300 font-semibold flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  {lang === 'tr' ? 'Başvuru Özeti' : 'Application Summary'}
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-purple-900/30 rounded-xl">
                    <Star className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-purple-300 text-xs">{lang === 'tr' ? 'Falcı Adı' : 'Teller Name'}</p>
                      <p className="text-white font-medium">{displayName || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-purple-900/30 rounded-xl">
                    <Heart className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-purple-300 text-xs">{lang === 'tr' ? 'Uzmanlıklar' : 'Specialties'}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {specialties.map(s => {
                          const spec = SPECIALTIES.find(sp => sp.id === s)
                          return spec && (
                            <span key={s} className="inline-flex items-center gap-1 px-2 py-1 bg-fuchsia-500/20 rounded-full text-xs text-fuchsia-200">
                              {spec.icon} {lang === 'tr' ? spec.tr : spec.en}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Note */}
              <div className="bg-gradient-to-br from-purple-900/30 to-fuchsia-900/30 border border-purple-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <label className="block text-fuchsia-300 text-sm font-medium mb-2">
                  {lang === 'tr' ? '💬 Ek Notlar (Opsiyonel)' : '💬 Additional Notes (Optional)'}
                </label>
                <textarea
                  value={applicationNote}
                  onChange={(e) => setApplicationNote(e.target.value)}
                  rows={2}
                  placeholder={lang === 'tr' ? 'Eklemek istediğiniz notlar...' : 'Any additional notes...'}
                  className="w-full px-4 py-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:border-fuchsia-500 resize-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex-1 py-3 sm:py-4 border border-purple-500/30 text-purple-300 font-semibold rounded-xl hover:bg-purple-900/30 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {lang === 'tr' ? 'Geri' : 'Back'}
            </button>
          )}
          
          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed}
              className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold rounded-xl hover:from-fuchsia-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/20"
            >
              {lang === 'tr' ? 'Devam Et' : 'Continue'}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !displayName || specialties.length === 0}
              className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {lang === 'tr' ? 'Başvuru Gönder' : 'Submit'}
                </>
              )}
            </button>
          )}
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link href={`/`} className="inline-flex items-center gap-2 text-purple-300/70 hover:text-fuchsia-300 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            {lang === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}
