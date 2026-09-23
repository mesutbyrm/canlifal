'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Clock, CheckCircle, Monitor } from 'lucide-react'

interface AdWatchModalProps {
  isOpen: boolean
  onClose: () => void
  onRewardEarned: () => void
}

interface AdNetworkData {
  hasAds: boolean
  adNetwork: {
    id: string
    name: string
    provider: string
    adCode: string | null
    adUnitId: string | null
    appId: string | null
  } | null
}

export default function AdWatchModal({ isOpen, onClose, onRewardEarned }: AdWatchModalProps) {
  const [adData, setAdData] = useState<AdNetworkData | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'watching' | 'complete' | 'no_ads'>('loading')
  const [countdown, setCountdown] = useState(15) // 15 second ad watch
  const [adLoaded, setAdLoaded] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setPhase('loading')
      setCountdown(15)
      setAdLoaded(false)
      fetchAdData()
    }
  }, [isOpen])

  const fetchAdData = async () => {
    try {
      const res = await fetch('/api/ads/active')
      const data = await res.json()
      setAdData(data)
      if (data.hasAds && data.adNetwork) {
        setPhase('ready')
      } else {
        setPhase('no_ads')
      }
    } catch {
      setPhase('no_ads')
    }
  }

  const startWatching = useCallback(() => {
    setPhase('watching')
    setCountdown(15)
  }, [])

  useEffect(() => {
    if (phase !== 'watching') return
    if (countdown <= 0) {
      setPhase('complete')
      // Record ad watch reward
      fetch('/api/ads/reward', { method: 'POST' }).catch(() => {})
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, countdown])

  const handleComplete = () => {
    onRewardEarned()
    onClose()
  }

  // Inject ad code safely
  const renderAdContent = () => {
    if (!adData?.adNetwork) return null
    const { provider, adCode, adUnitId } = adData.adNetwork

    if (provider === 'google_adsense' && adCode) {
      return (
        <div
          className="w-full min-h-[250px] flex items-center justify-center bg-black/30 rounded-lg overflow-hidden"
          dangerouslySetInnerHTML={{ __html: adCode }}
        />
      )
    }

    if (provider === 'custom' && adCode) {
      return (
        <div
          className="w-full min-h-[250px] flex items-center justify-center bg-black/30 rounded-lg overflow-hidden"
          dangerouslySetInnerHTML={{ __html: adCode }}
        />
      )
    }

    // For SDK-based networks, show a placeholder
    return (
      <div className="w-full min-h-[250px] flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg border border-purple-500/30">
        <div className="text-center">
          <Monitor className="w-12 h-12 text-purple-300 mx-auto mb-2" />
          <p className="text-purple-200 text-sm">Reklam yükleniyor...</p>
          <p className="text-purple-400 text-xs mt-1">{adData.adNetwork.name}</p>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-deep-purple-900 border border-purple-500/30 rounded-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
            <h3 className="text-white font-bold">Ücretsiz Fal Hakkı</h3>
            {phase !== 'watching' && (
              <button onClick={onClose} className="text-purple-300 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="p-4">
            {/* Loading */}
            {phase === 'loading' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500 mx-auto" />
                <p className="text-purple-300 mt-3 text-sm">Reklam hazırlanıyor...</p>
              </div>
            )}

            {/* No ads available */}
            {phase === 'no_ads' && (
              <div className="text-center py-8">
                <Monitor className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <p className="text-purple-200">Şu an aktif reklam bulunmuyor</p>
                <p className="text-purple-400 text-sm mt-1">Lütfen daha sonra tekrar deneyin veya CFC satın alın</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded-lg transition-colors"
                >
                  Kapat
                </button>
              </div>
            )}

            {/* Ready to watch */}
            {phase === 'ready' && (
              <div className="text-center py-4">
                <div className="mb-4 p-4 bg-gold-500/10 border border-gold-500/30 rounded-xl">
                  <Play className="w-10 h-10 text-gold-500 mx-auto mb-2" />
                  <p className="text-white font-medium">Reklam izleyerek ücretsiz fal baktırın!</p>
                  <p className="text-purple-300 text-sm mt-1">15 saniyelik bir reklam izleyin ve ücretsiz fal hakkı kazanın</p>
                </div>
                <button
                  onClick={startWatching}
                  className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Reklamı İzle
                </button>
              </div>
            )}

            {/* Watching ad */}
            {phase === 'watching' && (
              <div className="py-2">
                {renderAdContent()}
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Clock className="w-5 h-5 text-gold-500" />
                  <div className="flex-1 bg-purple-900/50 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="h-full bg-gold-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${((15 - countdown) / 15) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-gold-400 font-mono text-sm min-w-[30px]">{countdown}s</span>
                </div>
                <p className="text-center text-purple-400 text-xs mt-2">Reklam bitmeden kapatmayın</p>
              </div>
            )}

            {/* Complete */}
            {phase === 'complete' && (
              <div className="text-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                </motion.div>
                <h4 className="text-white font-bold text-lg">Tebrikler!</h4>
                <p className="text-green-400 mt-1">Ücretsiz fal hakkınızı kazandınız</p>
                <button
                  onClick={handleComplete}
                  className="mt-4 w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors"
                >
                  Falıma Devam Et
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
