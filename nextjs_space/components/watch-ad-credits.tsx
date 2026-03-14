'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { Play, Sparkles, X, Gift, Clock, CheckCircle } from 'lucide-react'

export default function WatchAdCredits() {
  const { data: session, update: updateSession } = useSession() || {}
  const { language } = useLanguage()
  
  const [showModal, setShowModal] = useState(false)
  const [isWatching, setIsWatching] = useState(false)
  const [watchProgress, setWatchProgress] = useState(0)
  const [adContent, setAdContent] = useState('')
  const [adStatus, setAdStatus] = useState<{
    watchedToday: number
    remainingAds: number
    creditsPerAd: number
  } | null>(null)
  const [result, setResult] = useState<{
    success: boolean
    creditsEarned: number
    totalCredits: number
  } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session?.user) {
      fetchAdStatus()
      fetchAdContent()
    }
  }, [session])

  const fetchAdStatus = async () => {
    try {
      const res = await fetch('/api/user/watch-ad')
      if (res.ok) {
        const data = await res.json()
        setAdStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch ad status:', error)
    }
  }

  const fetchAdContent = async () => {
    try {
      const res = await fetch('/api/settings/ads')
      if (res.ok) {
        const data = await res.json()
        setAdContent(data.ads_rewarded || '')
      }
    } catch (error) {
      console.error('Failed to fetch ad content:', error)
    }
  }

  const startWatchingAd = () => {
    if (!adStatus || adStatus.remainingAds <= 0) return
    
    setIsWatching(true)
    setWatchProgress(0)
    setResult(null)
    setError('')
    
    // Simulate watching ad (30 seconds)
    const duration = 30 // seconds
    const interval = setInterval(() => {
      setWatchProgress(prev => {
        const newProgress = prev + (100 / duration)
        if (newProgress >= 100) {
          clearInterval(interval)
          claimReward()
          return 100
        }
        return newProgress
      })
    }, 1000)
  }

  const claimReward = async () => {
    try {
      const res = await fetch('/api/user/watch-ad', {
        method: 'POST'
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setResult({
          success: true,
          creditsEarned: data.creditsEarned,
          totalCredits: data.totalCredits
        })
        // Update session credits
        if (updateSession) {
          updateSession({ credits: data.totalCredits })
        }
        // Refresh ad status
        await fetchAdStatus()
      } else {
        setError(data.error || 'Failed to claim reward')
      }
    } catch (error) {
      setError('Failed to claim reward')
    } finally {
      setIsWatching(false)
    }
  }

  const closeModal = () => {
    if (!isWatching) {
      setShowModal(false)
      setResult(null)
      setError('')
    }
  }

  if (!session?.user) return null

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg font-medium transition-all shadow-lg"
      >
        <Gift className="w-5 h-5" />
        <span>{language === 'tr' ? 'Ücretsiz cFc Kazan' : 'Earn Free cFc'}</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-deep-purple-950 border border-gold-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-xl text-gold-400 flex items-center gap-2">
                  <Gift className="w-6 h-6" />
                  {language === 'tr' ? 'Reklam İzle, cFc Kazan' : 'Watch Ad, Earn cFc'}
                </h2>
                {!isWatching && (
                  <button
                    onClick={closeModal}
                    className="p-1 hover:bg-deep-purple-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-deep-purple-400" />
                  </button>
                )}
              </div>

              {/* Status */}
              {adStatus && !result && !isWatching && (
                <div className="mb-6 p-4 bg-deep-purple-900/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-deep-purple-300">
                      {language === 'tr' ? 'Bugün izlenen' : 'Watched today'}
                    </span>
                    <span className="text-gold-400 font-semibold">
                      {adStatus.watchedToday} / 10
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-deep-purple-300">
                      {language === 'tr' ? 'Kalan hak' : 'Remaining'}
                    </span>
                    <span className="text-green-400 font-semibold">
                      {adStatus.remainingAds}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-deep-purple-300">
                      {language === 'tr' ? 'Reklam başına' : 'Per ad'}
                    </span>
                    <span className="text-gold-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      +{adStatus.creditsPerAd} {language === 'tr' ? 'cFc' : 'cFc'}
                    </span>
                  </div>
                </div>
              )}

              {/* Ad Container */}
              {isWatching && (
                <div className="mb-6">
                  {/* Ad display area */}
                  <div 
                    className="w-full h-64 bg-deep-purple-900 rounded-lg mb-4 flex items-center justify-center overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: adContent || `<div class="text-deep-purple-400 text-center"><p>${language === 'tr' ? 'Reklam yüklüyor...' : 'Loading ad...'}</p></div>` }}
                  />
                  
                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="h-2 bg-deep-purple-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${watchProgress}%` }}
                        className="h-full bg-gradient-to-r from-gold-600 to-gold-400"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-deep-purple-300">
                    <Clock className="w-4 h-4" />
                    <span>{Math.ceil(30 - (watchProgress * 30 / 100))} {language === 'tr' ? 'saniye kaldı' : 'seconds left'}</span>
                  </div>
                </div>
              )}

              {/* Result */}
              {result && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mb-6 p-6 bg-green-900/30 border border-green-500/50 rounded-lg text-center"
                >
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <h3 className="text-green-300 font-medium text-lg mb-2">
                    {language === 'tr' ? 'Tebrikler!' : 'Congratulations!'}
                  </h3>
                  <p className="text-green-200 flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-gold-400" />
                    <span className="text-gold-400 font-bold text-xl">+{result.creditsEarned}</span>
                    <span>{language === 'tr' ? 'cFc kazandınız!' : 'cFc earned!'}</span>
                  </p>
                  <p className="text-deep-purple-400 text-sm mt-2">
                    {language === 'tr' ? 'Toplam cFc:' : 'Total cFc:'} <span className="text-gold-400 font-semibold">{result.totalCredits}</span>
                  </p>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-center">
                  {error}
                </div>
              )}

              {/* Actions */}
              {!isWatching && !result && (
                <div className="space-y-3">
                  {adStatus && adStatus.remainingAds > 0 ? (
                    <button
                      onClick={startWatchingAd}
                      className="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-deep-purple-950 font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <Play className="w-5 h-5" />
                      {language === 'tr' ? 'Reklam İzle (+5 cFc)' : 'Watch Ad (+5 cFc)'}
                    </button>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-deep-purple-400 mb-2">
                        {language === 'tr' 
                          ? 'Bugünlük reklam limitine ulaştınız.' 
                          : 'You reached today\'s ad limit.'}
                      </p>
                      <p className="text-deep-purple-500 text-sm">
                        {language === 'tr' 
                          ? 'Yarın tekrar deneyin!' 
                          : 'Try again tomorrow!'}
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={closeModal}
                    className="w-full py-3 bg-deep-purple-800 text-deep-purple-200 rounded-lg hover:bg-deep-purple-700 transition-all font-medium"
                  >
                    {language === 'tr' ? 'Kapat' : 'Close'}
                  </button>
                </div>
              )}

              {/* Close button after result */}
              {result && (
                <button
                  onClick={closeModal}
                  className="w-full py-3 bg-gold-600 text-deep-purple-950 font-semibold rounded-lg hover:bg-gold-500 transition-all"
                >
                  {language === 'tr' ? 'Tamam' : 'OK'}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
