'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Lock, Sparkles, Check, X } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError(language === 'tr' ? 'Geçersiz veya eksik token' : 'Invalid or missing token')
    }
  }, [token, language])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError(language === 'tr' ? 'Şifre en az 6 karakter olmalı' : 'Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError(language === 'tr' ? 'Şifreler eşleşmiyor' : 'Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/${language}/login`)
        }, 3000)
      } else {
        setError(data.error || (language === 'tr' ? 'Bir hata oluştu' : 'An error occurred'))
      }
    } catch {
      setError(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
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
            {language === 'tr' ? 'Şifre Değiştirildi!' : 'Password Changed!'}
          </h1>
          <p className="text-deep-purple-200 mb-6">
            {language === 'tr' 
              ? 'Şifreniz başarıyla değiştirildi. Giriş sayfasına yönlendiriliyorsunuz...' 
              : 'Your password has been changed. Redirecting to login...'}
          </p>
        </motion.div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0118] to-deep-purple-975 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-deep-purple-900/50 border border-purple-500/30 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="font-serif text-2xl text-red-400 mb-4">
            {language === 'tr' ? 'Geçersiz Link' : 'Invalid Link'}
          </h1>
          <p className="text-deep-purple-200 mb-6">
            {language === 'tr' 
              ? 'Bu sıfırlama linki geçersiz veya süresi dolmuş.' 
              : 'This reset link is invalid or has expired.'}
          </p>
          <Link
            href={`/${language}/forgot-password`}
            className="inline-block px-6 py-3 bg-gold-600 text-black rounded-lg font-medium hover:bg-gold-500"
          >
            {language === 'tr' ? 'Yeni Link Al' : 'Get New Link'}
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
            {language === 'tr' ? 'Yeni Şifre Belirle' : 'Set New Password'}
          </h1>
          <p className="text-deep-purple-300 text-sm">
            {language === 'tr' 
              ? 'Yeni şifrenizi girin.' 
              : 'Enter your new password.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-deep-purple-200 text-sm mb-2">
              {language === 'tr' ? 'Yeni Şifre' : 'New Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-purple-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-deep-purple-950 border border-deep-purple-700 rounded-lg text-deep-purple-100 focus:outline-none focus:border-gold-600"
                placeholder="••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-deep-purple-200 text-sm mb-2">
              {language === 'tr' ? 'Şifre Tekrar' : 'Confirm Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-purple-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-deep-purple-950 border border-deep-purple-700 rounded-lg text-deep-purple-100 focus:outline-none focus:border-gold-600"
                placeholder="••••••"
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
              ? (language === 'tr' ? 'Değiştiriliyor...' : 'Changing...') 
              : (language === 'tr' ? 'Şifreyi Değiştir' : 'Change Password')}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
