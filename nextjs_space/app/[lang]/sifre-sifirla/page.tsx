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
      setError('Geçersiz veya eksik token')
    }
  }, [token, language])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı')
      return
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/sifre-sifirla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/giris`)
        }, 3000)
      } else {
        setError(data.error || ('Bir hata oluştu'))
      }
    } catch {
      setError('Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center  px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-deep-purple-900/50 border border-purple-500/30 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="font-serif text-2xl text-gold-400 mb-4">
            {'Şifre Değiştirildi!'}
          </h1>
          <p className="text-deep-purple-200 mb-6">
            {'Şifreniz başarıyla değiştirildi. Giriş sayfasına yönlendiriliyorsunuz...'}
          </p>
        </motion.div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center  px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-deep-purple-900/50 border border-purple-500/30 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="font-serif text-2xl text-red-400 mb-4">
            {'Geçersiz Link'}
          </h1>
          <p className="text-deep-purple-200 mb-6">
            {'Bu sıfırlama linki geçersiz veya süresi dolmuş.'}
          </p>
          <Link
            href={`/sifremi-unuttum`}
            className="inline-block px-6 py-3 bg-gold-600 text-black rounded-lg font-medium hover:bg-gold-500"
          >
            {'Yeni Link Al'}
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center  px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-deep-purple-900/50 border border-purple-500/30 rounded-2xl p-8"
      >
        <div className="text-center mb-8">
          <Sparkles className="w-12 h-12 text-gold-400 mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-gold-400 mb-2">
            {'Yeni Şifre Belirle'}
          </h1>
          <p className="text-deep-purple-300 text-sm">
            {'Yeni şifrenizi girin.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-deep-purple-200 text-sm mb-2">
              {'Yeni Şifre'}
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
              {'Şifre Tekrar'}
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
              ? ('Değiştiriliyor...') 
              : ('Şifreyi Değiştir')}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
