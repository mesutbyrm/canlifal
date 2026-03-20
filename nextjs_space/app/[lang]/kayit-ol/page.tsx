'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Mail, Lock, User as UserIcon, Sparkles, Globe, Gift, Calendar, Clock, AtSign } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('tr')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [referrerName, setReferrerName] = useState('')

  // Check for referral code in URL
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setReferralCode(ref)
      // Validate referral code
      fetch(`/api/referral/validate?code=${ref}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setReferrerName(data.referrerName)
          }
        })
        .catch(console.error)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, username, birthDate, birthTime, preferredLanguage, referralCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error?.includes('already exists')) {
          setError('Bu e-posta adresi zaten kayıtlı')
        } else if (data.error?.includes('Username already taken')) {
          setError('Bu kullanıcı adı zaten kullanılıyor')
        } else {
          setError(data.error || ('Bir hata oluştu'))
        }
        return
      }

      // Auto login after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        router.push(`/giris`)
      } else {
        // Redirect to homepage after successful registration
        router.push(`/`)
      }
    } catch (err) {
      setError('Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-deep-purple-975 to-[#0a0118]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-mystical-card border border-mystical rounded-lg p-8 mystical-shadow">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Sparkles className="w-12 h-12 text-gold-500" />
            </div>
            <h1 className="font-serif text-3xl text-gold-500 gold-glow mb-2">
              {'Kayıt Ol'}
            </h1>
            <p className="text-deep-purple-300">
              {'Yeni hesap oluşturun'}
            </p>
          </div>

          {/* Referral Bonus Banner */}
          {referrerName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-gradient-to-r from-gold-600/20 to-gold-500/10 border border-gold-500/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
                  <Gift className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <p className="text-gold-400 font-medium text-sm">
                    {`${referrerName} seni davet etti!`}
                  </p>
                  <p className="text-gold-300/80 text-xs">
                    {'Kayıt olunca 50 bonus CFC kazanacaksın!'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-deep-purple-200 text-sm font-medium">
                {'Adınız'}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-purple-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e?.target?.value ?? '')}
                  className="w-full pl-11 pr-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-400 focus:outline-none focus:border-gold-600 transition-colors"
                  placeholder={'Adınız'}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-deep-purple-200 text-sm font-medium">
                {'Kullanıcı Adı'} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-purple-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e?.target?.value?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? '')}
                  className="w-full pl-11 pr-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-400 focus:outline-none focus:border-gold-600 transition-colors"
                  placeholder={'kullanici_adi'}
                  required
                  minLength={3}
                  maxLength={30}
                />
              </div>
              <p className="text-deep-purple-400 text-xs">
                {'Sadece küçük harf, rakam ve alt çizgi'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-deep-purple-200 text-sm font-medium">
                  {'Doğum Tarihi'} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-purple-400" />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e?.target?.value ?? '')}
                    className="w-full pl-11 pr-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 focus:outline-none focus:border-gold-600 transition-colors"
                    required
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-deep-purple-200 text-sm font-medium">
                  {'Doğum Saati'} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-purple-400" />
                  <input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e?.target?.value ?? '')}
                    className="w-full pl-11 pr-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 focus:outline-none focus:border-gold-600 transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-deep-purple-200 text-sm font-medium">
                {'E-posta'} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-purple-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e?.target?.value ?? '')}
                  className="w-full pl-11 pr-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-400 focus:outline-none focus:border-gold-600 transition-colors"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-deep-purple-200 text-sm font-medium">
                {'Şifre'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-purple-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e?.target?.value ?? '')}
                  className="w-full pl-11 pr-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-400 focus:outline-none focus:border-gold-600 transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-deep-purple-200 text-sm font-medium">
                {'Dil Tercihi'}
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-purple-400" />
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e?.target?.value ?? 'tr')}
                  className="w-full pl-11 pr-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 focus:outline-none focus:border-gold-600 transition-colors appearance-none cursor-pointer"
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gold-600 text-deep-purple-950 rounded-lg hover:bg-gold-500 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed mystical-shadow"
            >
              {isLoading ? <LoadingSpinner /> : ('Kayıt Ol')}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-deep-purple-300 text-sm">
              {'Zaten hesabınız var mı?'}{' '}
              <Link
                href={`/giris`}
                className="text-gold-500 hover:text-gold-400 transition-colors font-medium"
              >
                {'Giriş Yap'}
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
