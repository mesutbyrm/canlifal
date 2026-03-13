'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import { 
  Sparkles, Video, Star, Users, Coins, CheckCircle, Clock,
  AlertCircle, Send, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

const SPECIALTIES = [
  { id: 'tarot', tr: 'Tarot', en: 'Tarot' },
  { id: 'kahve', tr: 'Kahve Falı', en: 'Coffee Reading' },
  { id: 'astroloji', tr: 'Astroloji', en: 'Astrology' },
  { id: 'rüya', tr: 'Rüya Yorumu', en: 'Dream Interpretation' },
  { id: 'el', tr: 'El Falı', en: 'Palm Reading' },
  { id: 'katina', tr: 'Katina', en: 'Katina' },
  { id: 'numeroloji', tr: 'Numeroloji', en: 'Numerology' },
  { id: 'melek', tr: 'Melek Kartları', en: 'Angel Cards' },
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

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [applicationNote, setApplicationNote] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push(`/${lang}/login`)
      return
    }

    // Check if user already has an application
    const checkExisting = async () => {
      try {
        const res = await fetch('/api/fortune-tellers/my-profile')
        if (res.ok) {
          const data = await res.json()
          if (data) {
            setExistingApplication(data)
          }
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
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
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
        body: JSON.stringify({
          displayName,
          bio,
          specialties,
          applicationNote
        })
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

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fuchsia-500"></div>
      </div>
    )
  }

  // If already approved teller, redirect to dashboard
  if (existingApplication?.applicationStatus === 'approved') {
    return (
      <div className="min-h-screen bg-[#0a0118] pt-20 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-2xl p-6 text-center"
          >
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {lang === 'tr' ? 'Zaten Falcısınız!' : 'You are already a Teller!'}
            </h2>
            <p className="text-gray-300 mb-6">
              {lang === 'tr' 
                ? 'Falcı panelinize giderek çalışmaya başlayabilirsiniz.'
                : 'You can start working by going to your teller panel.'}
            </p>
            <Link
              href={`/${lang}/live-tellers/dashboard`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all"
            >
              <Video className="w-5 h-5" />
              {lang === 'tr' ? 'Falcı Paneline Git' : 'Go to Teller Panel'}
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  // If has pending application
  if (existingApplication?.applicationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-[#0a0118] pt-20 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-yellow-900/40 to-amber-900/40 border border-yellow-500/30 rounded-2xl p-6 text-center"
          >
            <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {lang === 'tr' ? 'Başvurunuz İnceleniyor' : 'Application Under Review'}
            </h2>
            <p className="text-gray-300 mb-4">
              {lang === 'tr' 
                ? 'Başvurunuz admin tarafından incelenmektedir. Onaylandığında bilgilendirileceksiniz.'
                : 'Your application is being reviewed by admin. You will be notified when approved.'}
            </p>
            <div className="text-sm text-gray-400">
              {lang === 'tr' ? 'Başvuru tarihi: ' : 'Applied on: '}
              {new Date(existingApplication.createdAt).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // If rejected
  if (existingApplication?.applicationStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-[#0a0118] pt-20 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-red-900/40 to-rose-900/40 border border-red-500/30 rounded-2xl p-6 text-center"
          >
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {lang === 'tr' ? 'Başvurunuz Reddedildi' : 'Application Rejected'}
            </h2>
            <p className="text-gray-300 mb-4">
              {lang === 'tr' 
                ? 'Maalesef başvurunuz onaylanmadı. Daha sonra tekrar başvurabilirsiniz.'
                : 'Unfortunately your application was not approved. You can apply again later.'}
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0118] pt-20 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-2xl p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {lang === 'tr' ? 'Başvurunuz Alındı!' : 'Application Received!'}
            </h2>
            <p className="text-gray-300 mb-6">
              {lang === 'tr' 
                ? 'Başvurunuz başarıyla gönderildi. Admin inceledikten sonra bilgilendirileceksiniz.'
                : 'Your application has been submitted. You will be notified after admin review.'}
            </p>
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 text-fuchsia-300 hover:text-fuchsia-200"
            >
              <ArrowLeft className="w-4 h-4" />
              {lang === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home'}
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  // Application form
  return (
    <div className="min-h-screen bg-[#0a0118] pt-20 pb-28 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {lang === 'tr' ? 'Canlı Falcı Ol' : 'Become a Live Teller'}
          </h1>
          <p className="text-gray-400">
            {lang === 'tr' 
              ? 'Yeteneklerinizi paylaşın, para kazanın'
              : 'Share your talents, earn money'}
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          <div className="bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 border border-purple-500/30 rounded-xl p-4 text-center">
            <Coins className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">
              {lang === 'tr' ? 'Para Kazan' : 'Earn Money'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 border border-purple-500/30 rounded-xl p-4 text-center">
            <Users className="w-8 h-8 text-fuchsia-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">
              {lang === 'tr' ? 'Müşteri Bul' : 'Find Clients'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 border border-purple-500/30 rounded-xl p-4 text-center">
            <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">
              {lang === 'tr' ? 'Ün Kazan' : 'Build Fame'}
            </p>
          </div>
        </motion.div>

        {/* Application Form */}
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="bg-gradient-to-br from-purple-900/30 to-fuchsia-900/30 border border-purple-500/30 rounded-2xl p-6 space-y-6"
        >
          {/* Display Name */}
          <div>
            <label className="block text-fuchsia-300 text-sm font-medium mb-2">
              {lang === 'tr' ? 'Falcı Adınız *' : 'Teller Name *'}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder={lang === 'tr' ? 'Örn: Medyum Ayşe' : 'E.g: Mystic Jane'}
              className="w-full px-4 py-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-fuchsia-300 text-sm font-medium mb-2">
              {lang === 'tr' ? 'Kendinizi Tanıtın' : 'About Yourself'}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder={lang === 'tr' ? 'Deneyimleriniz, yetenekleriniz hakkında...' : 'Your experience, talents...'}
              className="w-full px-4 py-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500 resize-none"
            />
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-fuchsia-300 text-sm font-medium mb-3">
              {lang === 'tr' ? 'Uzmanlık Alanlarınız *' : 'Your Specialties *'}
            </label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((spec) => (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => toggleSpecialty(spec.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    specialties.includes(spec.id)
                      ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white'
                      : 'bg-purple-900/50 text-gray-300 border border-purple-500/30 hover:border-fuchsia-500'
                  }`}
                >
                  {lang === 'tr' ? spec.tr : spec.en}
                </button>
              ))}
            </div>
          </div>

          {/* Application Note */}
          <div>
            <label className="block text-fuchsia-300 text-sm font-medium mb-2">
              {lang === 'tr' ? 'Ek Notlar (Opsiyonel)' : 'Additional Notes (Optional)'}
            </label>
            <textarea
              value={applicationNote}
              onChange={(e) => setApplicationNote(e.target.value)}
              rows={2}
              placeholder={lang === 'tr' ? 'Admin için eklemek istediğiniz notlar...' : 'Notes for admin...'}
              className="w-full px-4 py-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !displayName || specialties.length === 0}
            className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold rounded-xl hover:from-fuchsia-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {lang === 'tr' ? 'Başvuru Gönder' : 'Submit Application'}
              </>
            )}
          </button>
        </motion.form>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-fuchsia-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}
