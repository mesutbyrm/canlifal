'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sparkles, User, FileText, DollarSign, Check } from 'lucide-react'
import Link from 'next/link'

const FORTUNE_TYPES = [
  { key: 'coffee', tr: 'Kahve Falı', en: 'Coffee Reading', icon: '☕' },
  { key: 'tarot', tr: 'Tarot', en: 'Tarot', icon: '🃏' },
  { key: 'palm', tr: 'El Falı', en: 'Palm Reading', icon: '✋' },
  { key: 'dream', tr: 'Rüya Tabiri', en: 'Dream Interpretation', icon: '🌙' },
  { key: 'horoscope', tr: 'Burç Yorumu', en: 'Horoscope', icon: '⭐' },
  { key: 'love', tr: 'Aşk Falı', en: 'Love Fortune', icon: '❤️' },
  { key: 'general', tr: 'Genel Fal', en: 'General Fortune', icon: '🔮' },
]

export default function ApplyTellerPage() {
  const { language } = useLanguage()
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [pricePerSession, setPricePerSession] = useState(100)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const toggleSpecialty = (key: string) => {
    setSpecialties(prev => 
      prev.includes(key) 
        ? prev.filter(s => s !== key) 
        : [...prev, key]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (specialties.length === 0) {
      setError('En az bir uzmanlık alanı seçin')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/fortune-tellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName || session?.user?.name,
          bio,
          specialties,
          pricePerSession
        })
      })

      if (res.ok) {
        setSuccess(true)
      } else {
        const data = await res.json()
        setError(data.error || ('Bir hata oluştu'))
      }
    } catch {
      setError('Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
        <div className="animate-spin w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0118] to-deep-purple-975 px-4">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-gold-400 mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-gold-400 mb-4">
            {'Giriş Yapın'}
          </h1>
          <Link href={`/login`} className="px-6 py-3 bg-gold-600 text-black rounded-lg font-medium hover:bg-gold-500">
            {'Giriş Yap'}
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0118] to-deep-purple-975 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="font-serif text-3xl text-gold-400 mb-4">
            {'Başvurunuz Alındı!'}
          </h1>
          <p className="text-deep-purple-200 mb-6">
            {'Başvurunuz incelenmek üzere alındı. Onaylandıktan sonra falcı olarak aktif olabilirsiniz.'}
          </p>
          <Link
            href={`/live-tellers`}
            className="inline-block px-6 py-3 bg-gold-600 text-black rounded-lg font-medium hover:bg-gold-500"
          >
            {'Falcılar Sayfasına Dön'}
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Sparkles className="w-12 h-12 text-gold-400 mx-auto mb-4" />
          <h1 className="font-serif text-3xl text-gold-400 mb-2">
            {'Falcı Olarak Başvur'}
          </h1>
          <p className="text-deep-purple-200">
            {'Bilgilerinizi doldurun ve falcı olarak katılın'}
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="bg-deep-purple-900/50 border border-purple-500/30 rounded-2xl p-6 space-y-6"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-deep-purple-200 text-sm mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              {'Görünen Adı'}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={session?.user?.name || ''}
              className="w-full px-4 py-3 bg-deep-purple-950 border border-deep-purple-700 rounded-lg text-deep-purple-100 focus:outline-none focus:border-gold-600"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-deep-purple-200 text-sm mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {'Hakkınızda'}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder={'Kendinizi ve deneyimlerinizi anlatın...'}
              className="w-full px-4 py-3 bg-deep-purple-950 border border-deep-purple-700 rounded-lg text-deep-purple-100 focus:outline-none focus:border-gold-600 resize-none"
            />
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-deep-purple-200 text-sm mb-3">
              {'Uzmanlık Alanlarınız'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FORTUNE_TYPES.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => toggleSpecialty(type.key)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    specialties.includes(type.key)
                      ? 'bg-gold-600/20 border-gold-500 text-gold-400'
                      : 'bg-deep-purple-950 border-deep-purple-700 text-deep-purple-300 hover:border-deep-purple-500'
                  }`}
                >
                  <span className="text-xl mb-1 block">{type.icon}</span>
                  {type[language]}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-deep-purple-200 text-sm mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {'Seans Başına Jeton'}
            </label>
            <input
              type="number"
              value={pricePerSession}
              onChange={(e) => setPricePerSession(Math.max(50, parseInt(e.target.value) || 50))}
              min={50}
              max={500}
              className="w-full px-4 py-3 bg-deep-purple-950 border border-deep-purple-700 rounded-lg text-deep-purple-100 focus:outline-none focus:border-gold-600"
            />
            <p className="text-deep-purple-400 text-xs mt-1">
              {'Minimum 50, maksimum 500 jeton'}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gold-600 text-black rounded-lg font-semibold hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading 
              ? ('Gönderiliyor...') 
              : ('Başvuruyu Gönder')}
          </button>
        </motion.form>
      </div>
    </div>
  )
}
