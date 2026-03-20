'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import CfcJetonInfoPopup from '@/components/cfc-jeton-info-popup'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Star,
  Clock,
  BadgeCheck,
  MessageCircle,
  Calendar,
  CreditCard,
  User,
  Sparkles,
  Video,
  Send,
  Check,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react'

interface Teller {
  id: string
  userId: string
  displayName: string
  bio: string | null
  avatar: string | null
  specialties: string[]
  pricePerSession: number
  rating: number
  totalSessions: number
  isOnline: boolean
  isVerified: boolean
  isActive: boolean
  createdAt: string
  user: {
    name: string | null
    image: string | null
  }
  reviews: Array<{
    id: string
    rating: number
    comment: string | null
    createdAt: string
    session: {
      user: {
        name: string | null
      }
    }
  }>
}

const FORTUNE_TYPES = [
  { id: 'coffee', name: { tr: 'Kahve Falı', en: 'Coffee Reading' } },
  { id: 'tarot', name: { tr: 'Tarot', en: 'Tarot Reading' } },
  { id: 'astrology', name: { tr: 'Astroloji', en: 'Astrology' } },
  { id: 'palmistry', name: { tr: 'El Falı', en: 'Palm Reading' } },
  { id: 'numerology', name: { tr: 'Numeroloji', en: 'Numerology' } },
  { id: 'general', name: { tr: 'Genel Danışmanlık', en: 'General Consultation' } }
]

export default function TellerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession() || {}
  const { language } = useLanguage()
  const tellerId = params?.tellerId as string

  const [teller, setTeller] = useState<Teller | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Booking state
  const [showBooking, setShowBooking] = useState(false)
  const [selectedFortuneType, setSelectedFortuneType] = useState('general')
  const [selectedDuration, setSelectedDuration] = useState(10) // Default 10 minutes
  const [creditsPerMinute, setCreditsPerMinute] = useState(10) // Default 10 jetons/min
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [showCfcPopup, setShowCfcPopup] = useState(false)
  const [userJetons, setUserJetons] = useState(0)
  
  // Waiting state
  const [isWaiting, setIsWaiting] = useState(false)
  const [waitingSessionId, setWaitingSessionId] = useState<string | null>(null)
  const [showAd, setShowAd] = useState(false)
  const [adCountdown, setAdCountdown] = useState(5)
  const [adDuration, setAdDuration] = useState(5)
  const [durationOptions, setDurationOptions] = useState<number[]>([5, 10, 15, 20, 25, 30])
  const [sessionStatus, setSessionStatus] = useState<string>('pending')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (tellerId) {
      fetchTeller()
      if (session?.user) {
        fetchUserCredits()
      }
    }
    
    // Fetch settings via public API
    fetch('/api/settings/public?keys=ad_duration_seconds,credits_per_minute,live_session_durations')
      .then(res => res.json())
      .then(data => {
        if (data.ad_duration_seconds) {
          const v = parseInt(data.ad_duration_seconds) || 5
          setAdDuration(v)
          setAdCountdown(v)
        }
        if (data.credits_per_minute) {
          setCreditsPerMinute(parseInt(data.credits_per_minute) || 10)
        }
        if (data.live_session_durations) {
          try {
            const parsed = JSON.parse(data.live_session_durations)
            if (Array.isArray(parsed) && parsed.length > 0) {
              const sorted = parsed.map(Number).filter((n: number) => n > 0).sort((a: number, b: number) => a - b)
              setDurationOptions(sorted)
              // If current selection not in options, default to first
              setSelectedDuration((prev: number) => sorted.includes(prev) ? prev : sorted[0])
            }
          } catch {}
        }
      })
      .catch(() => {})
    
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [tellerId, session])

  // Poll session status when waiting
  const checkSessionStatus = useCallback(async () => {
    if (!waitingSessionId) return
    
    try {
      const res = await fetch(`/api/room/${waitingSessionId}`)
      if (!res.ok) return
      
      const data = await res.json()
      
      if (data.status === 'active' && data.roomId) {
        // Session accepted, redirect to room
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        router.push(`/live-room/${waitingSessionId}`)
      } else if (data.status === 'cancelled') {
        // Session was cancelled/rejected
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        setIsWaiting(false)
        setWaitingSessionId(null)
        setSessionStatus('cancelled')
        setBookingError('Falcı randevunuzu reddetti')
      }
    } catch (error) {
      console.error('Error checking session status:', error)
    }
  }, [waitingSessionId, language, router])

  useEffect(() => {
    if (isWaiting && waitingSessionId && !showAd) {
      pollIntervalRef.current = setInterval(checkSessionStatus, 2000)
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      }
    }
  }, [isWaiting, waitingSessionId, showAd, checkSessionStatus])

  // Ad countdown effect
  useEffect(() => {
    if (showAd && adCountdown > 0) {
      const timer = setTimeout(() => setAdCountdown(adCountdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (showAd && adCountdown === 0) {
      setShowAd(false)
    }
  }, [showAd, adCountdown])

  const fetchTeller = async () => {
    try {
      const res = await fetch(`/api/fortune-tellers/${tellerId}`)
      if (!res.ok) {
        setError('Falcı bulunamadı')
        return
      }
      const data = await res.json()
      setTeller(data)
    } catch (err) {
      console.error('Fetch teller error:', err)
      setError('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserCredits = async () => {
    try {
      const res = await fetch('/api/user/credits')
      if (res.ok) {
        const data = await res.json()
        setUserJetons(data.jetonBalance || 0)
      }
    } catch (err) {
      console.error('Fetch jetons error:', err)
    }
  }

  // Calculate total cost based on selected duration
  const totalCost = selectedDuration * creditsPerMinute

  const handleBookSession = async () => {
    if (!session?.user) {
      router.push(`/login`)
      return
    }

    if (!teller) return

    if (userJetons < totalCost) {
      setBookingError('Yetersiz jeton bakiyesi')
      return
    }

    setBookingLoading(true)
    setBookingError('')

    try {
      const res = await fetch(`/api/fortune-tellers/${tellerId}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fortuneType: selectedFortuneType,
          duration: selectedDuration 
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Booking failed')
      }

      const data = await res.json()
      setUserJetons((prev: number) => prev - totalCost)
      
      // Show ad first, then waiting screen
      setWaitingSessionId(data.sessionId)
      setAdCountdown(adDuration)
      setShowAd(true)
      setIsWaiting(true)
      setSessionStatus('pending')
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setBookingError(errorMessage)
    } finally {
      setBookingLoading(false)
    }
  }

  // Cancel waiting
  const handleCancelWaiting = async () => {
    if (!waitingSessionId) return
    
    try {
      await fetch(`/api/fortune-tellers/sessions/${waitingSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      })
    } catch (error) {
      console.error('Error cancelling session:', error)
    }
    
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    setIsWaiting(false)
    setWaitingSessionId(null)
    setShowAd(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  if (error || !teller) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-white text-xl mb-4">{error || ('Falcı bulunamadı')}</p>
        <Link
          href={`/live-tellers`}
          className="text-purple-400 hover:text-purple-300 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          {'Geri Dön'}
        </Link>
      </div>
    )
  }

  const filteredFortuneTypes = FORTUNE_TYPES.filter(
    ft => teller.specialties.includes(ft.id) || ft.id === 'general'
  )

  return (
    <div className="min-h-screen bg-[#0a0118] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href={`/live-tellers`}
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {'Tüm Falcılar'}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-2xl border border-purple-500/20 overflow-hidden"
        >
          {/* Header Section */}
          <div className="relative p-6 md:p-8 border-b border-purple-500/20">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden border-4 border-purple-500/30">
                  {teller.avatar || teller.user.image ? (
                    <img
                      src={teller.avatar || teller.user.image || ''}
                      alt={teller.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-white/70" />
                  )}
                </div>
                {/* Online Status */}
                <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-deep-purple-900 ${
                  teller.isOnline ? 'bg-green-500' : 'bg-gray-500'
                }`}>
                  {teller.isOnline && (
                    <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {teller.displayName}
                  </h1>
                  {teller.isVerified && (
                    <BadgeCheck className="w-6 h-6 text-blue-400" />
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-purple-300 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    teller.isOnline
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {teller.isOnline
                      ? ('● Çevrimiçi')
                      : ('○ Çevrimdışı')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    {teller.rating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    {teller.totalSessions} {'seans'}
                  </span>
                </div>

                {/* Specialties */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {teller.specialties.map(spec => (
                    <span
                      key={spec}
                      className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                    >
                      {FORTUNE_TYPES.find(ft => ft.id === spec)?.name[language as 'tr' | 'en'] || spec}
                    </span>
                  ))}
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 text-lg">
                  <CreditCard className="w-5 h-5 text-gold-400" />
                  <span className="text-gold-400 font-semibold">
                    {teller.pricePerSession} {'jeton/seans'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          {teller.bio && (
            <div className="p-6 md:p-8 border-b border-purple-500/20">
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                {'Hakkımda'}
              </h2>
              <p className="text-purple-200 leading-relaxed whitespace-pre-wrap">
                {teller.bio}
              </p>
            </div>
          )}

          {/* Booking Section */}
          <div className="p-6 md:p-8 border-b border-purple-500/20">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              {'Randevu Al'}
            </h2>

            {isWaiting ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                {/* Ad Overlay */}
                <AnimatePresence>
                  {showAd && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 bg-gradient-to-br from-purple-900 to-pink-900 rounded-xl flex flex-col items-center justify-center p-6"
                    >
                      <div className="text-center">
                        <Sparkles className="w-16 h-16 text-gold-400 mx-auto mb-4 animate-pulse" />
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {'Reklam'}
                        </h3>
                        <p className="text-purple-200 mb-4">
                          {'Canlı fal deneyiminiz birazdan başlayacak!'}
                        </p>
                        <div className="w-full max-w-xs mx-auto h-32 bg-gradient-to-r from-gold-600/20 to-purple-600/20 rounded-lg flex items-center justify-center border border-gold-500/30 mb-4">
                          <span className="text-gold-400 text-lg font-semibold">
                            🔮 falcı premium 🔮
                          </span>
                        </div>
                        <div className="text-purple-300 text-sm">
                          {'Reklam'}: {adCountdown}s
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Waiting Screen */}
                <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-6 text-center">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-gold-400 animate-spin" />
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {'Lütfen Bekleyiniz...'}
                  </h3>
                  <p className="text-purple-200 mb-4">
                    {`${teller.displayName} randevunuzu onayladığında otomatik olarak odaya bağlanacaksınız.`}
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 text-purple-300 mb-6">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span className="text-sm">
                      {'Falcı bekleniyor...'}
                    </span>
                  </div>
                  
                  <button
                    onClick={handleCancelWaiting}
                    className="px-6 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                  >
                    <X className="w-4 h-4" />
                    {'İptal Et'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {/* Fortune Type Selection */}
                <div>
                  <label className="block text-sm text-purple-300 mb-2">
                    {'Fal Türü Seçin'}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filteredFortuneTypes.map(ft => (
                      <button
                        key={ft.id}
                        onClick={() => setSelectedFortuneType(ft.id)}
                        className={`px-4 py-3 rounded-lg border transition-all text-sm ${
                          selectedFortuneType === ft.id
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:border-purple-500/50'
                        }`}
                      >
                        {ft.name[language as 'tr' | 'en']}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Selection */}
                <div>
                  <label className="block text-sm text-purple-300 mb-2">
                    {'Süre Seçin'}
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {durationOptions.map((mins) => {
                      const cost = mins * creditsPerMinute
                      const canAfford = !session?.user || userJetons >= cost
                      return (
                        <button
                          key={mins}
                          onClick={() => setSelectedDuration(mins)}
                          disabled={!canAfford}
                          className={`px-3 py-3 rounded-lg border transition-all text-center ${
                            selectedDuration === mins
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-500 text-white'
                              : canAfford
                                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:border-purple-500/50'
                                : 'bg-gray-800/50 border-gray-700/30 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <div className="text-lg font-bold">{mins}</div>
                          <div className="text-[10px] opacity-75">{'dakika'}</div>
                          <div className="text-xs mt-1 text-yellow-400">{cost}₺</div>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-purple-400 mt-2 text-center">
                    {`${creditsPerMinute} jeton/dakika • Toplam: ${totalCost} jeton`}
                  </p>
                </div>

                {/* Credits Info */}
                {session?.user && (
                  <div className="flex items-center justify-between p-4 bg-deep-purple-900/50 rounded-lg">
                    <span className="text-purple-300">
                      {'Mevcut Jetonunuz:'}
                    </span>
                    <span className={`font-semibold ${
                      userJetons >= totalCost ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {userJetons} {'jeton'}
                    </span>
                    <button onClick={() => setShowCfcPopup(true)} className="text-purple-400 hover:text-purple-300 text-xs underline ml-1">?</button>
                  </div>
                )}

                {bookingError && (
                  <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                    {bookingError}
                  </div>
                )}

                {/* Book Button */}
                <button
                  onClick={handleBookSession}
                  disabled={bookingLoading || !teller.isOnline || (session?.user && userJetons < totalCost)}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {bookingLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {!session?.user
                        ? ('Giriş Yap & Randevu Al')
                        : !teller.isOnline
                          ? ('Falcı Çevrimdışı')
                          : userJetons < totalCost
                            ? ('Yetersiz Jeton')
                            : (`Randevu Al (${totalCost} Jeton - ${selectedDuration} dk)`)}
                    </>
                  )}
                </button>

                {!teller.isOnline && (
                  <p className="text-center text-sm text-purple-400">
                    {'Falcı şu an çevrimdışı. Çevrimiçi olduğunda randevu alabilirsiniz.'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reviews Section - Enhanced */}
          <div className="p-6 md:p-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-400" />
              {'Değerlendirmeler'}
              <span className="text-sm text-purple-400 font-normal">
                ({teller.reviews.length})
              </span>
            </h2>

            {teller.reviews.length > 0 && (() => {
              const avg = teller.reviews.reduce((s, r) => s + r.rating, 0) / teller.reviews.length
              const dist = [5,4,3,2,1].map(star => ({
                star,
                count: teller.reviews.filter(r => r.rating === star).length,
                pct: Math.round((teller.reviews.filter(r => r.rating === star).length / teller.reviews.length) * 100)
              }))
              return (
                <div className="bg-purple-900/20 border border-purple-700/20 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">{avg.toFixed(1)}</div>
                      <div className="flex items-center gap-0.5 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(avg) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                        ))}
                      </div>
                      <div className="text-purple-400 text-xs mt-1">{teller.reviews.length} değerlendirme</div>
                    </div>
                    <div className="flex-1 space-y-1">
                      {dist.map(d => (
                        <div key={d.star} className="flex items-center gap-2 text-xs">
                          <span className="text-purple-300 w-3">{d.star}</span>
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <div className="flex-1 h-2 bg-purple-900/50 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                          </div>
                          <span className="text-purple-400 w-6 text-right">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}

            {teller.reviews.length === 0 ? (
              <p className="text-purple-400 text-center py-8">
                {'Henüz değerlendirme yok'}
              </p>
            ) : (
              <div className="space-y-3">
                {teller.reviews.map(review => (
                  <div
                    key={review.id}
                    className="p-4 bg-purple-900/20 rounded-xl border border-purple-700/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-fuchsia-600/30 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-fuchsia-300" />
                        </div>
                        <span className="text-white font-medium text-sm">
                          {review.session.user.name || 'Anonim'}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-purple-200 text-sm mt-1">{review.comment}</p>
                    )}
                    <p className="text-purple-500 text-xs mt-2">
                      {new Date(review.createdAt).toLocaleDateString(
                        'tr-TR',
                        { year: 'numeric', month: 'long', day: 'numeric' }
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
      {showCfcPopup && <CfcJetonInfoPopup isOpen={showCfcPopup} onClose={() => setShowCfcPopup(false)} />}
    </div>
  )
}
