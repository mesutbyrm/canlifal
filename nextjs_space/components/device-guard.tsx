'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, LogOut } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

export default function DeviceGuard() {
  const { data: session, status } = useSession() || {}
  const [kicked, setKicked] = useState(false)
  const { language } = useLanguage()

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
    // Check every 30 seconds
    checkDevice()
    const interval = setInterval(checkDevice, 30000)
    return () => clearInterval(interval)
  }, [status, checkDevice])

  const handleSignOut = () => {
    signOut({ callbackUrl: `/${language || 'tr'}/giris` })
  }

  return (
    <AnimatePresence>
      {kicked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-[#1a0a2e] to-[#0d0520] border border-orange-500/40 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {'Başka Cihazda Oturum Açıldı'}
            </h2>
            <p className="text-orange-300 text-sm mb-6">
              {'Hesabınız başka bir telefonda/cihazda açıldı. Aynı anda sadece bir cihazda oturum açık olabilir.'}
            </p>
            <button
              onClick={handleSignOut}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {'Giriş Sayfasına Dön'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
