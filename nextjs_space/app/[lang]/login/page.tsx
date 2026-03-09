'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Mail, Lock, Sparkles } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'

export default function LoginPage() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(language === 'tr' ? 'Geçersiz e-posta veya şifre' : 'Invalid email or password')
      } else {
        router.push(`/${language}`)
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
              {language === 'tr' ? 'Giriş Yap' : 'Sign In'}
            </h1>
            <p className="text-deep-purple-300">
              {language === 'tr' ? 'Hesabınıza giriş yapın' : 'Sign in to your account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

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
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href={`/${language}/forgot-password`}
                className="text-deep-purple-400 hover:text-gold-400 text-sm transition-colors"
              >
                {language === 'tr' ? 'Şifremi Unuttum' : 'Forgot Password?'}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gold-600 text-deep-purple-950 rounded-lg hover:bg-gold-500 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed mystical-shadow"
            >
              {isLoading ? <LoadingSpinner /> : (language === 'tr' ? 'Giriş Yap' : 'Sign In')}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-deep-purple-300 text-sm">
              {language === 'tr' ? 'Hesabınız yok mu?' : "Don't have an account?"}{' '}
              <Link
                href={`/${language}/register`}
                className="text-gold-500 hover:text-gold-400 transition-colors font-medium"
              >
                {language === 'tr' ? 'Kayıt Ol' : 'Register'}
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
