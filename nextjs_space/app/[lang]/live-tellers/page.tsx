'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { Star, Users, Video, MessageCircle, Sparkles, CheckCircle, Clock, Filter, Power, Circle } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import Link from 'next/link'

interface FortuneTeller {
  id: string
  displayName: string
  bio: string | null
  specialties: string[]
  pricePerSession: number
  rating: number
  totalSessions: number
  totalReviews: number
  isOnline: boolean
  isVerified: boolean
  avatar: string | null
  user: {
    name: string
    image: string | null
  }
}

interface TellerStatus {
  isTeller: boolean
  id?: string
  isOnline?: boolean
  applicationStatus?: string
  isBanned?: boolean
  displayName?: string
}

const FORTUNE_TYPES: Record<string, { tr: string; en: string; icon: string }> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee', icon: '☕' },
  tarot: { tr: 'Tarot', en: 'Tarot', icon: '🃏' },
  palm: { tr: 'El Falı', en: 'Palm', icon: '✋' },
  dream: { tr: 'Rüya', en: 'Dream', icon: '🌙' },
  horoscope: { tr: 'Burç', en: 'Horoscope', icon: '⭐' },
  love: { tr: 'Aşk', en: 'Love', icon: '❤️' },
  general: { tr: 'Genel', en: 'General', icon: '🔮' },
}

export default function LiveTellersPage() {
  const { language } = useLanguage()
  const { data: session } = useSession() || {}
  const [tellers, setTellers] = useState<FortuneTeller[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'online'>('all')
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('')
  const [tellerStatus, setTellerStatus] = useState<TellerStatus | null>(null)
  const [togglingOnline, setTogglingOnline] = useState(false)

  useEffect(() => {
    fetchTellers()
    if (session?.user) {
      fetchTellerStatus()
    }
  }, [filter, specialtyFilter, session])

  const fetchTellerStatus = async () => {
    try {
      const res = await fetch('/api/fortune-tellers/toggle-online')
      const data = await res.json()
      setTellerStatus(data)
    } catch (error) {
      console.error('Failed to fetch teller status:', error)
    }
  }

  const toggleOnlineStatus = async () => {
    if (!tellerStatus?.isTeller) return
    setTogglingOnline(true)
    try {
      const res = await fetch('/api/fortune-tellers/toggle-online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: !tellerStatus.isOnline }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTellerStatus(prev => prev ? { ...prev, isOnline: data.isOnline } : null)
      // Refresh tellers list
      fetchTellers()
    } catch (error) {
      console.error('Failed to toggle online status:', error)
    } finally {
      setTogglingOnline(false)
    }
  }

  const fetchTellers = async () => {
    setIsLoading(true)
    try {
      let url = '/api/fortune-tellers?'
      if (filter === 'online') url += 'online=true&'
      if (specialtyFilter) url += `specialty=${specialtyFilter}`
      
      const res = await fetch(url)
      const data = await res.json()
      setTellers(data.tellers || [])
    } catch (error) {
      console.error('Failed to fetch tellers:', error)
      setTellers([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Video className="w-16 h-16 text-gold-400 mx-auto mb-4" />
          <h1 className="font-serif text-3xl sm:text-4xl text-gold-400 mb-2">
            {language === 'tr' ? 'Canlı Falcılar' : 'Live Fortune Tellers'}
          </h1>
          <p className="text-deep-purple-200 max-w-2xl mx-auto">
            {language === 'tr' 
              ? 'Profesyonel falcılarla canlı seans yapın, kişiye özel fal deneyimi yaşayın.' 
              : 'Get live sessions with professional fortune tellers for a personalized experience.'}
          </p>
        </motion.div>

        {/* Teller Status Panel - Only show if user is a teller */}
        {tellerStatus?.isTeller && tellerStatus.applicationStatus === 'approved' && !tellerStatus.isBanned && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`mb-8 p-4 rounded-xl border ${
              tellerStatus.isOnline 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-deep-purple-900/50 border-deep-purple-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  tellerStatus.isOnline 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-deep-purple-800 text-deep-purple-400'
                }`}>
                  <Power className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {tellerStatus.displayName}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Circle className={`w-2 h-2 fill-current ${
                      tellerStatus.isOnline ? 'text-green-400 animate-pulse' : 'text-gray-500'
                    }`} />
                    <span className={tellerStatus.isOnline ? 'text-green-400' : 'text-gray-400'}>
                      {tellerStatus.isOnline 
                        ? (language === 'tr' ? 'Çevrimiçisiniz' : 'You are Online')
                        : (language === 'tr' ? 'Çevrimdışısınız' : 'You are Offline')
                      }
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={toggleOnlineStatus}
                disabled={togglingOnline}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  tellerStatus.isOnline
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    : 'bg-green-500 text-white hover:bg-green-400'
                } disabled:opacity-50`}
              >
                {togglingOnline ? (
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Power className="w-5 h-5" />
                )}
                {tellerStatus.isOnline 
                  ? (language === 'tr' ? 'Çevrimdışı Ol' : 'Go Offline')
                  : (language === 'tr' ? 'Çevrimiçi Ol' : 'Go Online')
                }
              </button>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3 mb-8"
        >
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-gold-600 text-black'
                  : 'bg-deep-purple-900/50 text-deep-purple-200 hover:bg-deep-purple-800'
              }`}
            >
              {language === 'tr' ? 'Tümü' : 'All'}
            </button>
            <button
              onClick={() => setFilter('online')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                filter === 'online'
                  ? 'bg-green-600 text-white'
                  : 'bg-deep-purple-900/50 text-deep-purple-200 hover:bg-deep-purple-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {language === 'tr' ? 'Çevrimiçi' : 'Online'}
            </button>
          </div>

          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="px-4 py-2 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-200 focus:outline-none focus:border-gold-600"
          >
            <option value="">{language === 'tr' ? 'Tüm Uzmanlıklar' : 'All Specialties'}</option>
            {Object.entries(FORTUNE_TYPES).map(([key, val]) => (
              <option key={key} value={key}>{val.icon} {val[language]}</option>
            ))}
          </select>
        </motion.div>

        {/* Tellers Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner message={language === 'tr' ? 'Yükleniyor...' : 'Loading...'} />
          </div>
        ) : tellers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Sparkles className="w-16 h-16 text-deep-purple-600 mx-auto mb-4" />
            <p className="text-deep-purple-300 text-lg">
              {language === 'tr' ? 'Henüz aktif falcı bulunmuyor.' : 'No active fortune tellers yet.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tellers.map((teller, index) => (
              <motion.div
                key={teller.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-deep-purple-900/50 border border-purple-500/30 rounded-2xl overflow-hidden hover:border-gold-500/50 transition-all duration-300"
              >
                {/* Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-gold-500 flex items-center justify-center">
                        {teller.avatar || teller.user.image ? (
                          <img
                            src={teller.avatar || teller.user.image || ''}
                            alt={teller.displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-white">
                            {teller.displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {teller.isOnline && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-deep-purple-900 rounded-full" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg text-gold-400 truncate">{teller.displayName}</h3>
                        {teller.isVerified && (
                          <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-yellow-400 text-sm font-medium">{teller.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-deep-purple-500">|</span>
                        <span className="text-deep-purple-400 text-sm">
                          {teller.totalSessions} {language === 'tr' ? 'seans' : 'sessions'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {teller.bio && (
                    <p className="text-deep-purple-300 text-sm mt-4 line-clamp-2">{teller.bio}</p>
                  )}

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {teller.specialties.slice(0, 4).map((spec) => (
                      <span
                        key={spec}
                        className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full"
                      >
                        {FORTUNE_TYPES[spec]?.icon} {FORTUNE_TYPES[spec]?.[language] || spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-deep-purple-950/50 border-t border-purple-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-gold-400 font-bold text-lg">{teller.pricePerSession}</span>
                    <span className="text-deep-purple-400 text-sm"> {language === 'tr' ? 'kredi' : 'credits'}</span>
                  </div>
                  <Link
                    href={session?.user ? `/${language}/live-tellers/${teller.id}` : `/${language}/login`}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                      teller.isOnline
                        ? 'bg-green-600 text-white hover:bg-green-500'
                        : 'bg-gold-600 text-black hover:bg-gold-500'
                    }`}
                  >
                    {teller.isOnline ? (
                      <>
                        <Video className="w-4 h-4" />
                        {language === 'tr' ? 'Seans Başlat' : 'Start Session'}
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        {language === 'tr' ? 'Randevu Al' : 'Book'}
                      </>
                    )}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Become a Teller CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="bg-gradient-to-r from-gold-600/20 to-purple-600/20 border border-gold-500/30 rounded-2xl p-8">
            <Sparkles className="w-12 h-12 text-gold-400 mx-auto mb-4" />
            <h2 className="font-serif text-2xl text-gold-400 mb-2">
              {language === 'tr' ? 'Siz de Falcı Olun!' : 'Become a Fortune Teller!'}
            </h2>
            <p className="text-deep-purple-200 mb-6 max-w-md mx-auto">
              {language === 'tr' 
                ? 'Yeteneklerinizi paylaşın ve kredi kazanın. Falcı olarak başvurun!' 
                : 'Share your talents and earn credits. Apply to become a fortune teller!'}
            </p>
            <Link
              href={session?.user ? `/${language}/live-tellers/apply` : `/${language}/login`}
              className="inline-block px-8 py-3 bg-gold-600 text-black rounded-lg font-semibold hover:bg-gold-500 transition-colors"
            >
              {language === 'tr' ? 'Başvur' : 'Apply Now'}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
