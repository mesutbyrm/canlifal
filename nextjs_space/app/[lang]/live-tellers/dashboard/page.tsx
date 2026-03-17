'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  Star,
  Clock,
  BadgeCheck,
  User,
  Video,
  Check,
  X,
  MessageCircle,
  CreditCard,
  Calendar,
  Bell,
  Loader2,
  RefreshCw,
  Phone,
  AlertCircle
} from 'lucide-react'

interface Session {
  id: string
  fortuneType: string
  status: string
  creditsCharged: number
  createdAt: string
  startedAt: string | null
  endedAt: string | null
  user: {
    name: string | null
    image: string | null
    email?: string
  }
}

interface TellerProfile {
  id: string
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
  applicationStatus: string
  totalEarnings: number
  // Permissions
  canGoOnline: boolean
  canChat: boolean
  canStartSession: boolean
  canSetPrice: boolean
  canEditProfile: boolean
  canViewEarnings: boolean
  canWithdraw: boolean
  maxSessionsPerDay: number
  commissionRate: number
}

const FORTUNE_TYPE_NAMES: Record<string, { tr: string; en: string }> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Reading' },
  tarot: { tr: 'Tarot', en: 'Tarot Reading' },
  astrology: { tr: 'Astroloji', en: 'Astrology' },
  palmistry: { tr: 'El Falı', en: 'Palm Reading' },
  numerology: { tr: 'Numeroloji', en: 'Numerology' },
  general: { tr: 'Genel Danışmanlık', en: 'General Consultation' }
}

const STATUS_LABELS: Record<string, { tr: string; en: string; color: string }> = {
  pending: { tr: 'Bekliyor', en: 'Pending', color: 'bg-yellow-500/20 text-yellow-400' },
  active: { tr: 'Aktif', en: 'Active', color: 'bg-green-500/20 text-green-400' },
  completed: { tr: 'Tamamlandı', en: 'Completed', color: 'bg-blue-500/20 text-blue-400' },
  cancelled: { tr: 'İptal Edildi', en: 'Cancelled', color: 'bg-red-500/20 text-red-400' }
}

export default function TellerDashboard() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [teller, setTeller] = useState<TellerProfile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [togglingOnline, setTogglingOnline] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push(`/login`)
      return
    }
    fetchTellerData()
  }, [session, status, language])

  const fetchTellerData = async () => {
    try {
      // Get teller profile
      const tellerRes = await fetch('/api/fortune-tellers/my-profile')
      if (!tellerRes.ok) {
        if (tellerRes.status === 404) {
          setError('Falcı profiliniz bulunamadı')
          return
        }
        throw new Error('Failed to fetch teller profile')
      }
      const tellerData = await tellerRes.json()
      setTeller(tellerData)
      setIsOnline(tellerData.isOnline)

      // Get sessions
      const sessionsRes = await fetch(`/api/fortune-tellers/${tellerData.id}/session`)
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        setSessions(sessionsData)
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const toggleOnline = async () => {
    if (!teller) return
    setTogglingOnline(true)
    try {
      const res = await fetch('/api/fortune-tellers/toggle-online', {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        setIsOnline(data.isOnline)
        setTeller(prev => prev ? { ...prev, isOnline: data.isOnline } : null)
      }
    } catch (err) {
      console.error('Toggle online error:', err)
    } finally {
      setTogglingOnline(false)
    }
  }

  const handleSessionAction = async (sessionId: string, action: 'accept' | 'complete' | 'cancel') => {
    setActionLoading(sessionId)
    try {
      const res = await fetch(`/api/fortune-tellers/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (res.ok) {
        // Refresh sessions
        fetchTellerData()
      }
    } catch (err) {
      console.error('Session action error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredSessions = sessions.filter(s => {
    if (activeTab === 'pending') return s.status === 'pending'
    if (activeTab === 'active') return s.status === 'active'
    return s.status === 'completed' || s.status === 'cancelled'
  })

  const pendingCount = sessions.filter(s => s.status === 'pending').length
  const activeCount = sessions.filter(s => s.status === 'active').length

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-white text-xl mb-4">{error}</p>
        <Link
          href={`/live-tellers/apply`}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg"
        >
          {'Falcı Olarak Başvur'}
        </Link>
      </div>
    )
  }

  if (!teller) return null

  return (
    <div className="min-h-screen bg-[#0a0118] py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Page Title with Refresh */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white">
            {'📊 Kontrol Paneli'}
          </h1>
          <button
            onClick={fetchTellerData}
            className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg transition-colors"
            title={'Yenile'}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Status Warning */}
        {teller.applicationStatus !== 'approved' && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-300">
              {teller.applicationStatus === 'pending'
                ? ('Başvurunuz inceleniyor. Onaylandıktan sonra randevu alabilirsiniz.')
                : ('Başvurunuz reddedildi.')}
            </p>
          </div>
        )}

        {/* Profile & Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-xl border border-purple-500/20 p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden">
                  {teller.avatar ? (
                    <img src={teller.avatar} alt={teller.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-white/70" />
                  )}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-deep-purple-900 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  {teller.displayName}
                  {teller.isVerified && <BadgeCheck className="w-5 h-5 text-blue-400" />}
                </h3>
                <div className="flex items-center gap-2 text-sm text-purple-300">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  {teller.rating.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Online Toggle */}
            {teller.canGoOnline !== false ? (
              <button
                onClick={toggleOnline}
                disabled={togglingOnline || teller.applicationStatus !== 'approved'}
                className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  isOnline
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {togglingOnline ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isOnline ? (
                  <>
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    {'Çevrimiçi'}
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 bg-gray-500 rounded-full" />
                    {'Çevrimdışı'}
                  </>
                )}
              </button>
            ) : (
              <div className="w-full py-3 rounded-lg bg-red-500/10 text-red-400 text-sm text-center border border-red-500/20">
                {'⚠️ Online olma yetkiniz kısıtlandı'}
              </div>
            )}
          </motion.div>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-xl border border-purple-500/20 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Video className="w-5 h-5 text-purple-400" />
              {'İstatistikler'}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-purple-300">{'Toplam Seans'}</span>
                <span className="text-white font-semibold">{teller.totalSessions}</span>
              </div>
              {teller.canViewEarnings !== false && (
                <div className="flex justify-between items-center">
                  <span className="text-purple-300">{'Toplam Kazanç'}</span>
                  <span className="text-gold-400 font-semibold">{teller.totalEarnings} jeton</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-purple-300">{'Seans Ücreti'}</span>
                <span className="text-white font-semibold">{teller.pricePerSession} jeton</span>
              </div>
              {teller.commissionRate && (
                <div className="flex justify-between items-center">
                  <span className="text-purple-300">{'Komisyon Oranı'}</span>
                  <span className="text-orange-400 font-semibold">%{teller.commissionRate}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Pending Requests Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-xl border border-purple-500/20 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-400" />
              {'Bekleyen Talepler'}
            </h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{pendingCount}</div>
              <p className="text-purple-300 text-sm">
                {pendingCount > 0
                  ? ('Yeni randevu talebi var!')
                  : ('Henüz talep yok')}
              </p>
              {activeCount > 0 && (
                <p className="text-green-400 text-sm mt-2">
                  {activeCount} {'aktif seans'}
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sessions Tabs */}
        <div className="bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-xl border border-purple-500/20 overflow-hidden">
          <div className="flex border-b border-purple-500/20">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-4 px-4 text-center font-medium transition-colors relative ${
                activeTab === 'pending' ? 'text-white bg-purple-500/20' : 'text-purple-400 hover:text-white'
              }`}
            >
              {'Bekleyenler'}
              {pendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-4 px-4 text-center font-medium transition-colors ${
                activeTab === 'active' ? 'text-white bg-purple-500/20' : 'text-purple-400 hover:text-white'
              }`}
            >
              {'Aktif'}
              {activeCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-green-500 text-black text-xs rounded-full">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-4 px-4 text-center font-medium transition-colors ${
                activeTab === 'history' ? 'text-white bg-purple-500/20' : 'text-purple-400 hover:text-white'
              }`}
            >
              {'Geçmiş'}
            </button>
          </div>

          <div className="p-4">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-purple-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>
                  {activeTab === 'pending'
                    ? ('Bekleyen randevu talebi yok')
                    : activeTab === 'active'
                      ? ('Aktif seans yok')
                      : ('Geçmiş seans yok')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSessions.map(sess => (
                  <motion.div
                    key={sess.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-deep-purple-900/30 rounded-lg border border-purple-500/10 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                          {sess.user.image ? (
                            <img src={sess.user.image} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-white/70" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-white font-medium">
                            {sess.user.name || ('Anonim Kullanıcı')}
                          </h4>
                          <p className="text-sm text-purple-300">
                            {FORTUNE_TYPE_NAMES[sess.fortuneType]?.[language as 'tr' | 'en'] || sess.fortuneType}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[sess.status]?.color || 'bg-gray-500/20 text-gray-400'}`}>
                          {STATUS_LABELS[sess.status]?.[language as 'tr' | 'en'] || sess.status}
                        </span>
                        <p className="text-gold-400 font-semibold mt-1">
                          {sess.creditsCharged} jeton
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-purple-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(sess.createdAt).toLocaleString('tr-TR')}
                      </p>

                      {/* Action Buttons */}
                      {sess.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSessionAction(sess.id, 'accept')}
                            disabled={actionLoading === sess.id}
                            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {actionLoading === sess.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                {'Kabul Et'}
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleSessionAction(sess.id, 'cancel')}
                            disabled={actionLoading === sess.id}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            {'Reddet'}
                          </button>
                        </div>
                      )}

                      {sess.status === 'active' && (
                        <div className="flex gap-2">
                          <Link
                            href={`/live-room/${sess.id}`}
                            className="px-4 py-2 bg-gold-600 hover:bg-gold-500 text-black rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            <Video className="w-4 h-4" />
                            {'Odaya Gir'}
                          </Link>
                          <button
                            onClick={() => handleSessionAction(sess.id, 'complete')}
                            disabled={actionLoading === sess.id}
                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {actionLoading === sess.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                {'Tamamla'}
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
