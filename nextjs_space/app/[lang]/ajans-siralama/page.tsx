'use client'

import { useEffect, useState } from 'react'
import { useSiteTheme } from '@/lib/theme-context'
import { motion } from 'framer-motion'
import { Trophy, Users, TrendingUp, Star, ArrowLeft, Building2, Crown, Medal } from 'lucide-react'
import Link from 'next/link'

interface RankedAgency {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  totalEarnings: number
  totalMembers: number
  activeMembers: number
  performanceScore: number
  periodEarnings: number
  ownerName: string
  createdAt: string
}

export default function AgencyLeaderboardPage() {
  const { theme } = useSiteTheme()
  const [agencies, setAgencies] = useState<RankedAgency[]>([])
  const [period, setPeriod] = useState<'all' | 'monthly' | 'weekly'>('all')
  const [loading, setLoading] = useState(true)

  const isFacebook = theme === 'facebook'
  const isCosmic = theme === 'cosmic'
  const cardBg = isFacebook ? 'bg-white border border-gray-200' : isCosmic ? 'bg-white/5 border border-blue-500/20' : 'bg-[#1a0a2e]/80 border border-fuchsia-500/20'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-500' : isCosmic ? 'text-blue-300' : 'text-purple-300'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const tabActive = isFacebook ? 'bg-blue-500 text-white' : isCosmic ? 'bg-blue-600 text-white' : 'bg-fuchsia-600 text-white'
  const tabInactive = isFacebook ? 'bg-gray-100 text-gray-600' : isCosmic ? 'bg-blue-900/30 text-blue-300' : 'bg-purple-900/30 text-purple-300'

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/agency/leaderboard?period=${period}&limit=20`)
      if (res.ok) {
        const d = await res.json()
        setAgencies(d.agencies || [])
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchLeaderboard() }, [period])

  const getRankBadge = (rank: number) => {
    if (rank === 0) return { emoji: '🥇', bg: 'bg-gradient-to-r from-yellow-400 to-yellow-600', text: 'text-black' }
    if (rank === 1) return { emoji: '🥈', bg: 'bg-gradient-to-r from-gray-300 to-gray-400', text: 'text-black' }
    if (rank === 2) return { emoji: '🥉', bg: 'bg-gradient-to-r from-orange-500 to-orange-700', text: 'text-white' }
    return { emoji: '', bg: tabInactive, text: textPrimary }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className={`p-2 rounded-lg ${cardBg} hover:opacity-80 transition`}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
            <Trophy className={`w-6 h-6 text-yellow-500`} />
            Ajans Sıralaması
          </h1>
          <p className={`${textSecondary} text-xs`}>En başarılı ajanslar</p>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex gap-1.5 mb-6">
        {([['all', 'Tüm Zamanlar'], ['monthly', 'Bu Ay'], ['weekly', 'Bu Hafta']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key as any)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
              period === key ? tabActive : tabInactive
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className={`w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin`} />
        </div>
      ) : agencies.length === 0 ? (
        <div className={`${cardBg} rounded-2xl p-8 text-center`}>
          <Building2 className={`w-12 h-12 ${textSecondary} mx-auto mb-3`} />
          <p className={`${textSecondary}`}>Henüz sıralamada ajans yok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Top 3 podium */}
          {agencies.length >= 3 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1, 0, 2].map(idx => {
                const a = agencies[idx]
                if (!a) return null
                const badge = getRankBadge(idx)
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`${cardBg} rounded-xl p-3 text-center ${idx === 0 ? 'mt-0 ring-2 ring-yellow-500/50' : 'mt-4'}`}
                  >
                    <div className="text-2xl mb-1">{badge.emoji}</div>
                    <div className={`w-10 h-10 mx-auto rounded-full ${badge.bg} flex items-center justify-center text-lg font-bold ${badge.text} mb-2`}>
                      {a.name.charAt(0)}
                    </div>
                    <div className={`text-xs font-bold ${textPrimary} truncate`}>{a.name}</div>
                    <div className={`text-lg font-bold ${accentColor} mt-1`}>{a.periodEarnings}</div>
                    <div className={`text-[9px] ${textSecondary}`}>Jeton</div>
                    <div className={`text-[9px] ${textSecondary} mt-1`}>
                      <Users className="w-3 h-3 inline mr-0.5" />{a.totalMembers} üye
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Rest of the list */}
          {agencies.map((a, i) => {
            if (agencies.length >= 3 && i < 3) return null
            const badge = getRankBadge(i)
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`${cardBg} rounded-xl p-3 flex items-center gap-3`}
              >
                <div className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded-full ${badge.bg} ${badge.text} flex-shrink-0`}>
                  {i + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {a.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${textPrimary} truncate`}>{a.name}</div>
                  <div className={`text-[10px] ${textSecondary}`}>
                    {a.totalMembers} üye • Skor: {Math.round(a.performanceScore)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${accentColor}`}>{a.periodEarnings} J</div>
                  <div className={`text-[9px] ${textSecondary}`}>
                    {a.activeMembers} aktif
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
