'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check } from 'lucide-react'
import { usePushNotifications } from './push-notification-provider'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'

export default function NotificationPermissionPrompt() {
  const { data: session } = useSession() || {}
  const { language } = useLanguage()
  const { isSupported, permission, requestPermission } = usePushNotifications()
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Don't show if not logged in, not supported, already granted/denied, or dismissed
    if (!session?.user || !isSupported || permission !== 'default' || dismissed) {
      setShowPrompt(false)
      return
    }
    
    // Check if user has dismissed before (localStorage)
    const wasDismissed = localStorage.getItem('notification-prompt-dismissed')
    if (wasDismissed) {
      setDismissed(true)
      return
    }
    
    // Show prompt after 5 seconds
    const timer = setTimeout(() => {
      setShowPrompt(true)
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [session?.user, isSupported, permission, dismissed])

  const handleAllow = async () => {
    setLoading(true)
    try {
      await requestPermission()
    } catch (e) {
      console.error('Notification permission error:', e)
    } finally {
      setLoading(false)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('notification-prompt-dismissed', 'true')
    setDismissed(true)
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[10000] bg-gradient-to-br from-[#1a0a2e] to-[#2d1b4e] border border-fuchsia-500/30 rounded-2xl p-4 shadow-2xl"
        style={{ boxShadow: '0 0 30px rgba(217, 70, 239, 0.3)' }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 text-fuchsia-400/60 hover:text-fuchsia-300 hover:bg-fuchsia-500/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-500/30 to-pink-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-fuchsia-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-white font-bold mb-1">
              {'Bildirimleri Aç'}
            </h3>
            <p className="text-fuchsia-300/80 text-sm mb-3">
              {'Yeni mesajlar, ödemeler ve falcı isteklerinden anında haberdar ol!'}
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleAllow}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-60 disabled:cursor-wait rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {loading ? 'Bekleniyor...' : 'İzin Ver'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-fuchsia-900/40 hover:bg-fuchsia-900/60 rounded-lg text-fuchsia-300 text-sm font-medium transition-colors"
              >
                {'Sonra'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
