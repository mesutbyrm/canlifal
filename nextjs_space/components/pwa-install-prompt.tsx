'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Download, Share, Plus } from 'lucide-react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(standalone)
    if (standalone) return

    // Check if dismissed recently (24 hours)
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) {
      const dismissedAt = parseInt(dismissed)
      if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) return
    }

    // Check iOS
    const ua = window.navigator.userAgent
    const iosCheck = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(iosCheck)

    if (iosCheck) {
      // Show iOS instructions after 30 seconds
      const timer = setTimeout(() => setShowPrompt(true), 30000)
      return () => clearTimeout(timer)
    }

    // Android/Chrome: Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPromptRef.current = e as BeforeInstallPromptEvent
      // Show after 15 seconds
      setTimeout(() => setShowPrompt(true), 15000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (deferredPromptRef.current) {
      await deferredPromptRef.current.prompt()
      const { outcome } = await deferredPromptRef.current.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      deferredPromptRef.current = null
    }
  }, [])

  const handleDismiss = useCallback(() => {
    setShowPrompt(false)
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
  }, [])

  if (!mounted || isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9999] animate-in slide-in-from-bottom-10 duration-500 md:left-auto md:right-6 md:max-w-sm">
      <div className="relative rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#1a0a2e] to-[#0f0520] p-5 shadow-2xl shadow-purple-900/40 backdrop-blur-xl">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-purple-300/60 hover:text-white transition-colors"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          {/* App icon */}
          <div className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden border border-purple-500/20 shadow-lg">
            <Image
              src="/icons/icon-192x192.png"
              alt="Canlifal uygulama ikonu"
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base mb-1">
              Canlifal&apos;ı Yükle
            </h3>
            <p className="text-purple-200/70 text-sm leading-relaxed">
              Ana ekrana ekle, uygulama gibi kullan!
            </p>
          </div>
        </div>

        {isIOS ? (
          /* iOS Instructions */
          <div className="mt-4 rounded-xl bg-white/5 p-4">
            <p className="text-purple-200/80 text-sm mb-3 font-medium">Nasıl yüklenir:</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-purple-100/80">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Share className="w-4 h-4 text-purple-300" />
                </div>
                <span>Safari&apos;da <strong className="text-white">Paylaş</strong> butonuna basın</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-purple-100/80">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-purple-300" />
                </div>
                <span><strong className="text-white">Ana Ekrana Ekle</strong>&apos;ye dokun</span>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-sm font-semibold shadow-lg"
            >
              Tamam, Anladım
            </button>
          </div>
        ) : (
          /* Android/Chrome Install Button */
          <button
            onClick={handleInstall}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-900/30 active:scale-[0.98] transition-transform"
          >
            <Download className="w-5 h-5" />
            Uygulamayı Yükle
          </button>
        )}
      </div>
    </div>
  )
}
