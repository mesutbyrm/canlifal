'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Mail, Lock, User as UserIcon, Sparkles, Globe } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'

export default function RegisterPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('tr')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
          setError(data.error || (language === 'tr' ? 'Bir hata oluştu' : 'An error occurred'))
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
      setError(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred')
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
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Sparkles className="w-12 h-12 text-gold-500" />
            </div>
            <h1 className="font-serif text-3xl text-gold-500 gold-glow mb-2">
              {language === 'tr' ? 'Kayıt Ol' : 'Register'}
            </h1>
            <p className="text-deep-purple-300">
              {language === 'tr' ? 'Yeni hesap oluşturun' : 'Create a new account'}
            </p>
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
                {language === 'tr' ? 'Adınız' : 'Your Name'}
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
                {language === 'tr' ? 'E-posta' : 'Email'}
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
                {language === 'tr' ? 'Şifre' : 'Password'}
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
                {language === 'tr' ? 'Dil Tercihi' : 'Language Preference'}
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
              {isLoading ? <LoadingSpinner /> : (language === 'tr' ? 'Kayıt Ol' : 'Register')}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-deep-purple-300 text-sm">
              {language === 'tr' ? 'Zaten hesabınız var mı?' : 'Already have an account?'}{' '}
              <Link
                href={`/${language}/login`}
                className="text-gold-500 hover:text-gold-400 transition-colors font-medium"
              >
                {language === 'tr' ? 'Giriş Yap' : 'Sign In'}
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
