'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Mail, Sparkles, ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const { language } = useLanguage()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (res.ok) {
        setSent(true)
      } else {
        setError(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred')
      }
    } catch {
      setError(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0118] to-deep-purple-975 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-deep-purple-900/50 border border-purple-500/30 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="font-serif text-2xl text-gold-400 mb-4">
            {language === 'tr' ? 'E-posta Gönderildi!' : 'Email Sent!'}
          </h1>
          <p className="text-deep-purple-200 mb-6">
            {language === 'tr' 
              ? 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama linki gönderildi.' 
              : 'If this email is registered, a password reset link has been sent.'}
          </p>
          <Link
            href={`/login`}
            className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'tr' ? 'Giriş sayfasına dön' : 'Back to login'}
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0118] to-deep-purple-975 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-deep-purple-900/50 border border-purple-500/30 rounded-2xl p-8"
      >
        <div className="text-center mb-8">
          <Sparkles className="w-12 h-12 text-gold-400 mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-gold-400 mb-2">
            {language === 'tr' ? 'Şifremi Unuttum' : 'Forgot Password'}
          </h1>
          <p className="text-deep-purple-300 text-sm">
            {language === 'tr' 
              ? 'E-posta adresinizi girin, size sıfırlama linki gönderelim.' 
              : 'Enter your email and we\'ll send you a reset link.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-deep-purple-200 text-sm mb-2">
              {language === 'tr' ? 'E-posta' : 'Email'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-purple-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-deep-purple-950 border border-deep-purple-700 rounded-lg text-deep-purple-100 focus:outline-none focus:border-gold-600"
                placeholder="ornek@email.com"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gold-600 text-black rounded-lg font-medium hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading 
              ? (language === 'tr' ? 'Gönderiliyor...' : 'Sending...') 
              : (language === 'tr' ? 'Sıfırlama Linki Gönder' : 'Send Reset Link')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href={`/login`}
            className="inline-flex items-center gap-2 text-deep-purple-300 hover:text-gold-400 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'tr' ? 'Giriş sayfasına dön' : 'Back to login'}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
