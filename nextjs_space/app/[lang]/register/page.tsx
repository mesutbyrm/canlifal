'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Mail, Lock, User as UserIcon, Sparkles, Globe } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'

// Google Icon Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

export default function RegisterPage() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('tr')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, preferredLanguage }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error?.includes('already exists')) {
          setError(language === 'tr' ? 'Bu e-posta adresi zaten kayıtlı' : 'This email is already registered')
        } else {
          setError(data.error || t('message.error'))
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
        router.push(`/${language}/login`)
      } else {
        router.push(`/${language}/dashboard`)
      }
    } catch (err) {
      setError(t('message.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setError('')
    try {
      await signIn('google', { 
        redirect: true, 
        callbackUrl: '/dashboard' 
      })
    } catch (err) {
      setError(language === 'tr' ? 'Google ile kayıt başarısız' : 'Google sign-up failed')
      setIsGoogleLoading(false)
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
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Sparkles className="w-12 h-12 text-gold-500" />
            </div>
            <h1 className="font-serif text-3xl text-gold-500 gold-glow mb-2">
              {t('auth.register.title')}
            </h1>
            <p className="text-deep-purple-300">
              {t('auth.register.subtitle')}
            </p>
          </div>

          {/* Google Sign Up Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {isGoogleLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                <GoogleIcon />
                <span>{language === 'tr' ? 'Google ile Kayıt Ol' : 'Sign up with Google'}</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-deep-purple-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1a0b2e] text-deep-purple-400">
                {language === 'tr' ? 'veya e-posta ile' : 'or with email'}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-deep-purple-200 text-sm font-medium">
                {t('form.name')}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-purple-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e?.target?.value ?? '')}
                  className="w-full pl-11 pr-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-400 focus:outline-none focus:border-gold-600 transition-colors"
                  placeholder={language === 'tr' ? 'Adınız' : 'Your name'}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-deep-purple-200 text-sm font-medium">
                {t('form.email')}
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
                {t('form.password')}
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
                {t('form.language')}
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
              {isLoading ? <LoadingSpinner /> : t('nav.register')}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-deep-purple-300 text-sm">
              {t('auth.have_account')}{' '}
              <Link
                href={`/${language}/login`}
                className="text-gold-500 hover:text-gold-400 transition-colors font-medium"
              >
                {t('nav.login')}
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
