'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSiteTheme } from '@/lib/theme-context'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Star, BarChart3, Lightbulb, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Analytics {
  summary: {
    totalSessions30d: number
    totalEarnings30d: number
    avgDuration: number
    avgRating: number
    thisWeekSessions: number
    thisWeekEarnings: number
    earningsChange: number
  }
  bestHours: { hour: number; count: number }[]
  dailySessions: { date: string; count: number; earnings: number }[]
  recentReviews: { rating: number; comment: string | null; createdAt: string }[]
  tips: string[]
}

export default function TellerAnalyticsPage() {
  const { data: session } = useSession() || {}
  const { theme } = useSiteTheme()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  const isFacebook = theme === 'facebook'
  const isCosmic = theme === 'cosmic'
  const cardBg = isFacebook ? 'bg-white border border-gray-200' : isCosmic ? 'bg-white/5 border border-blue-500/20' : 'bg-[#1a0a2e]/80 border border-fuchsia-500/20'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-500' : isCosmic ? 'text-blue-300' : 'text-purple-300'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const barColor = isFacebook ? 'bg-blue-500' : isCosmic ? 'bg-blue-500' : 'bg-fuchsia-500'

  useEffect(() => {
    if (session?.user) {
      fetch('/api/teller/analytics')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setData(d) })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [session])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className={`w-8 h-8 ${accentColor} animate-spin`} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className={`${cardBg} rounded-2xl p-8 text-center max-w-md`}>
          <BarChart3 className={`w-12 h-12 ${textSecondary} mx-auto mb-3`} />
          <p className={textSecondary}>Analitik verileri yüklenemedi veya falcı profiliniz yok.</p>
          <Link href="/profil" className={`mt-4 inline-block ${accentColor} underline text-sm`}>Profil'e Dön</Link>
        </div>
      </div>
    )
  }

  const { summary, bestHours, dailySessions, recentReviews, tips } = data
  const maxDailyCount = Math.max(...dailySessions.map(d => d.count), 1)

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profil" className={`p-2 rounded-lg ${cardBg} hover:opacity-80 transition`}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
            <BarChart3 className={`w-6 h-6 ${accentColor}`} />
            Performans Analitikleri
          </h1>
          <p className={`${textSecondary} text-xs`}>Son 30 günlük özet</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Seans', value: summary.totalSessions30d, icon: '\ud83d\udcca', sub: '30 gün' },
          { label: 'Kazanç', value: `${summary.totalEarnings30d} J`, icon: '\ud83d\udcb0', sub: '30 gün' },
          { label: 'Ort. Süre', value: `${summary.avgDuration} dk`, icon: '\u23f1\ufe0f', sub: 'seans başı' },
          { label: 'Puan', value: summary.avgRating.toFixed(1), icon: '\u2b50', sub: 'son dönem' },
        ].map((s, i) => (
          <div key={i} className={`${cardBg} rounded-xl p-3 text-center`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`text-lg font-bold ${textPrimary}`}>{s.value}</div>
            <div className={`text-[9px] ${textSecondary}`}>{s.label} ({s.sub})</div>
          </div>
        ))}
      </div>

      {/* Weekly Comparison */}
      <div className={`${cardBg} rounded-xl p-4 mb-4`}>
        <h3 className={`font-bold ${textPrimary} text-sm mb-3`}>Bu Hafta vs Geçen Hafta</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className={`text-2xl font-bold ${textPrimary}`}>{summary.thisWeekEarnings} J</div>
            <div className={`text-xs ${textSecondary}`}>{summary.thisWeekSessions} seans</div>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${
            summary.earningsChange >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {summary.earningsChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {summary.earningsChange >= 0 ? '+' : ''}{summary.earningsChange}%
          </div>
        </div>
      </div>

      {/* Daily Chart */}
      <div className={`${cardBg} rounded-xl p-4 mb-4`}>
        <h3 className={`font-bold ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
          <BarChart3 className={`w-4 h-4 ${accentColor}`} />
          Son 7 Gün Seans
        </h3>
        <div className="flex items-end gap-1" style={{ height: '100px' }}>
          {dailySessions.map((d, i) => {
            const h = maxDailyCount > 0 ? (d.count / maxDailyCount) * 100 : 0
            const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'short' })
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className={`${cardBg} px-2 py-1 rounded text-[9px] font-bold ${textPrimary} whitespace-nowrap shadow-lg`}>
                    {d.count} seans / {d.earnings} J
                  </div>
                </div>
                <div
                  className={`w-full rounded-t ${barColor} ${d.count > 0 ? 'min-h-[3px]' : ''} opacity-80 hover:opacity-100 transition`}
                  style={{ height: `${Math.max(h, d.count > 0 ? 3 : 0)}%` }}
                />
                <span className={`text-[8px] ${textSecondary} mt-1`}>{dayLabel}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Best Hours */}
        <div className={`${cardBg} rounded-xl p-4`}>
          <h3 className={`font-bold ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
            <Clock className={`w-4 h-4 ${accentColor}`} />
            En İyi Saatler
          </h3>
          {bestHours.length > 0 && bestHours[0].count > 0 ? (
            <div className="space-y-2">
              {bestHours.filter(h => h.count > 0).map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${textPrimary} w-14`}>{String(h.hour).padStart(2, '0')}:00</span>
                  <div className="flex-1 h-2 rounded-full bg-black/20 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${(h.count / bestHours[0].count) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs ${accentColor} w-8 text-right`}>{h.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-xs ${textSecondary} text-center py-4`}>Henüz yeterli veri yok</p>
          )}
        </div>

        {/* AI Tips */}
        <div className={`${cardBg} rounded-xl p-4`}>
          <h3 className={`font-bold ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
            <Lightbulb className={`w-4 h-4 text-yellow-400`} />
            Öneriler
          </h3>
          <div className="space-y-2">
            {tips.map((tip, i) => (
              <div key={i} className={`flex gap-2 text-xs ${textSecondary}`}>
                <span className="flex-shrink-0">\ud83d\udca1</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Reviews */}
      {recentReviews.length > 0 && (
        <div className={`${cardBg} rounded-xl p-4`}>
          <h3 className={`font-bold ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
            <Star className={`w-4 h-4 text-yellow-400`} />
            Son Yorumlar
          </h3>
          <div className="space-y-2">
            {recentReviews.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex gap-0.5 flex-shrink-0">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : textSecondary}`} />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${textPrimary} ${!r.comment ? 'italic opacity-50' : ''}`}>
                    {r.comment || 'Yorum yazılmamış'}
                  </p>
                  <p className={`text-[9px] ${textSecondary}`}>{new Date(r.createdAt).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
