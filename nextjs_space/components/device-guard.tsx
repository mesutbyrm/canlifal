'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, LogOut, ShieldAlert, KeyRound, UserX, Eye, EyeOff, Check, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

type View = 'alert' | 'password'

export default function DeviceGuard() {
  const { data: session, status, update } = useSession() || {}
  const [kicked, setKicked] = useState(false)
  const [view, setView] = useState<View>('alert')
  const [reclaiming, setReclaiming] = useState(false)
  const [reclaimSuccess, setReclaimSuccess] = useState(false)
  const { language } = useLanguage()

  // Password change state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const checkDevice = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.id) return
    try {
      const res = await fetch('/api/auth/verify-device')
      if (res.ok) {
        const data = await res.json()
        if (!data.valid) {
          setKicked(true)
        }
      }
    } catch {
      // ignore network errors
    }
  }, [status, session?.user?.id])

  useEffect(() => {
    if (status !== 'authenticated') return
    checkDevice()
    const interval = setInterval(checkDevice, 30000)
    return () => clearInterval(interval)
  }, [status, checkDevice])

  // Reset state when modal opens
  useEffect(() => {
    if (kicked) {
      setView('alert')
      setReclaimSuccess(false)
      setReclaiming(false)
      setPwSuccess(false)
      setPwError('')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    }
  }, [kicked])

  const handleSignOut = () => {
    signOut({ callbackUrl: `/${language || 'tr'}/giris` })
  }

  // Kick the other device — reclaim session for this device
  const handleReclaim = async () => {
    setReclaiming(true)
    try {
      const res = await fetch('/api/auth/reclaim-device', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        // Update session with new deviceToken
        await update({ deviceToken: data.deviceToken })
        setReclaimSuccess(true)
        // Close modal after short delay
        setTimeout(() => {
          setKicked(false)
          setReclaimSuccess(false)
        }, 2000)
      }
    } catch {
      // fallback
    } finally {
      setReclaiming(false)
    }
  }

  // Change password
  const handlePasswordChange = async () => {
    setPwError('')
    if (!newPw || newPw.length < 6) {
      setPwError('Yeni şifre en az 6 karakter olmalıdır')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Şifreler eşleşmiyor')
      return
    }
    setPwLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
      })
      const data = await res.json()
      if (!res.ok) {
        setPwError(data.error || 'Şifre değiştirilemedi')
        return
      }
      // Update session with new deviceToken
      await update({ deviceToken: data.deviceToken })
      setPwSuccess(true)
      setTimeout(() => {
        setKicked(false)
        setPwSuccess(false)
      }, 2500)
    } catch {
      setPwError('Bir hata oluştu')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {kicked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-gradient-to-br from-[#1a0a2e] via-[#150828] to-[#0d0520] border border-orange-500/30 rounded-2xl max-w-sm w-full shadow-2xl shadow-orange-500/10 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-b border-orange-500/20 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Güvenlik Uyarısı</h2>
                <p className="text-orange-300/80 text-xs">Şüpheli giriş algılandı</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {view === 'alert' ? (
                <motion.div
                  key="alert"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6"
                >
                  {reclaimSuccess ? (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-400" />
                      </div>
                      <p className="text-green-300 font-semibold text-lg">Diğer cihaz çıkış yapıldı!</p>
                      <p className="text-green-300/60 text-sm mt-1">Artık sadece bu cihaz aktif</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-5">
                        <Smartphone className="w-5 h-5 text-orange-400 flex-shrink-0" />
                        <p className="text-orange-200 text-sm leading-relaxed">
                          Hesabınıza <strong className="text-orange-300">başka bir cihazdan</strong> giriş yapıldı. Eğer bu siz değilseniz hemen önlem alın.
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        {/* Kick the other device */}
                        <button
                          onClick={handleReclaim}
                          disabled={reclaiming}
                          className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-fuchsia-500/20"
                        >
                          {reclaiming ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <UserX className="w-5 h-5" />
                          )}
                          {reclaiming ? 'İşleniyor...' : 'Diğer Cihazı At'}
                        </button>

                        {/* Change password */}
                        <button
                          onClick={() => setView('password')}
                          className="w-full py-3 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-200 font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all"
                        >
                          <KeyRound className="w-5 h-5" />
                          Şifremi Değiştir
                        </button>

                        {/* Sign out */}
                        <button
                          onClick={handleSignOut}
                          className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-medium rounded-xl flex items-center justify-center gap-2.5 transition-all text-sm"
                        >
                          <LogOut className="w-4 h-4" />
                          Çıkış Yap
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-6"
                >
                  {pwSuccess ? (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-400" />
                      </div>
                      <p className="text-green-300 font-semibold text-lg">Şifre değiştirildi!</p>
                      <p className="text-green-300/60 text-sm mt-1">Tüm diğer cihazlar çıkış yapıldı</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-white/60 text-sm mb-4">
                        Şifrenizi değiştirdiğinizde diğer tüm cihazlardan otomatik çıkış yapılır.
                      </p>

                      {/* Current password */}
                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            type={showCurrentPw ? 'text' : 'password'}
                            value={currentPw}
                            onChange={(e) => setCurrentPw(e.target.value)}
                            placeholder="Mevcut Şifre"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-fuchsia-500/50 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                          >
                            {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            type={showNewPw ? 'text' : 'password'}
                            value={newPw}
                            onChange={(e) => setNewPw(e.target.value)}
                            placeholder="Yeni Şifre (en az 6 karakter)"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-fuchsia-500/50 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                          >
                            {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <input
                          type="password"
                          value={confirmPw}
                          onChange={(e) => setConfirmPw(e.target.value)}
                          placeholder="Yeni Şifre (tekrar)"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-fuchsia-500/50"
                        />
                      </div>

                      {pwError && (
                        <p className="text-red-400 text-xs mt-2">{pwError}</p>
                      )}

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => { setView('alert'); setPwError('') }}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-medium rounded-xl text-sm transition-all"
                        >
                          Geri
                        </button>
                        <button
                          onClick={handlePasswordChange}
                          disabled={pwLoading}
                          className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
                        >
                          {pwLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <KeyRound className="w-4 h-4" />
                          )}
                          {pwLoading ? 'Değiştiriliyor...' : 'Değiştir'}
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
