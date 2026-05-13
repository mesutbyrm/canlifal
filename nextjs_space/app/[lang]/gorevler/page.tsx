'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { useSiteTheme } from '@/lib/theme-context'
import { ArrowLeft, CheckCircle, Gift, Flame, Star, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Mission {
  type: string
  title: string
  description: string
  reward: number
  icon: string
  completed: boolean
  autoComplete: boolean
}

export default function DailyMissionsPage() {
  const { data: session } = useSession() || {}
  const { theme } = useSiteTheme()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [allCompleted, setAllCompleted] = useState(false)
  const [allBonusClaimed, setAllBonusClaimed] = useState(false)
  const [totalReward, setTotalReward] = useState(0)
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 })
  const [claimMsg, setClaimMsg] = useState<string | null>(null)

  const isFacebook = theme === 'facebook'
  const isCosmic = theme === 'cosmic'
  const cardBg = isFacebook ? 'bg-white border border-gray-200' : isCosmic ? 'bg-white/5 border border-blue-500/20' : 'bg-[#1a0a2e]/80 border border-fuchsia-500/20'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-500' : isCosmic ? 'text-blue-300' : 'text-purple-300'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const btnPrimary = isFacebook ? 'bg-blue-500 hover:bg-blue-600 text-white' : isCosmic ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'

  const fetchMissions = async () => {
    try {
      const res = await fetch('/api/daily-missions')
      if (res.ok) {
        const d = await res.json()
        setMissions(d.missions || [])
        setAllCompleted(d.allCompleted)
        setAllBonusClaimed(d.allBonusClaimed)
        setTotalReward(d.totalReward)
        setStreak(d.streak)
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { if (session?.user) fetchMissions() }, [session])

  const claimMission = async (taskType: string) => {
    setClaiming(taskType)
    setClaimMsg(null)
    try {
      const res = await fetch('/api/daily-missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType }),
      })
      const d = await res.json()
      if (res.ok) {
        setClaimMsg(`+${d.creditsEarned} kredi kazanıldı! \u2728`)
        fetchMissions()
      } else {
        setClaimMsg(d.error || 'Hata oluştu')
      }
    } catch { setClaimMsg('Hata oluştu') } finally { setClaiming(null) }
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className={`${cardBg} rounded-2xl p-8 text-center max-w-md`}>
          <p className={textSecondary}>Görevleri görmek için giriş yapın</p>
          <Link href="/giris" className={`mt-4 inline-block px-6 py-3 rounded-xl ${btnPrimary} font-medium`}>Giriş Yap</Link>
        </div>
      </div>
    )
  }

  const completedCount = missions.filter(m => m.completed).length
  const progressPct = missions.length > 0 ? (completedCount / missions.length) * 100 : 0

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className={`p-2 rounded-lg ${cardBg} hover:opacity-80 transition`}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
            \ud83c\udfaf Günlük Görevler
          </h1>
          <p className={`${textSecondary} text-xs`}>Her gün görevleri tamamla, ödül kazan!</p>
        </div>
      </div>

      {/* Streak & Progress */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`${cardBg} rounded-xl p-4 text-center`}>
          <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
          <div className={`text-2xl font-bold ${textPrimary}`}>{streak.currentStreak}</div>
          <div className={`text-[10px] ${textSecondary}`}>Gün Serisi</div>
        </div>
        <div className={`${cardBg} rounded-xl p-4 text-center`}>
          <Star className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
          <div className={`text-2xl font-bold ${textPrimary}`}>{totalReward}</div>
          <div className={`text-[10px] ${textSecondary}`}>Bugün Kazanılan</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={`${cardBg} rounded-xl p-4 mb-6`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${textPrimary}`}>{completedCount}/{missions.length} Görev</span>
          <span className={`text-xs ${accentColor}`}>{Math.round(progressPct)}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-black/20 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isFacebook ? 'bg-blue-500' : isCosmic ? 'bg-blue-500' : 'bg-gradient-to-r from-fuchsia-500 to-purple-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Claim Message */}
      {claimMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${cardBg} rounded-xl p-3 mb-4 text-center`}
        >
          <span className={`text-sm font-medium ${accentColor}`}>{claimMsg}</span>
        </motion.div>
      )}

      {/* Missions */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {missions.map((m, i) => (
            <motion.div
              key={m.type}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`${cardBg} rounded-xl p-4 flex items-center gap-3 ${m.completed ? 'opacity-70' : ''}`}
            >
              <div className="text-2xl flex-shrink-0">{m.icon}</div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold ${textPrimary} flex items-center gap-1.5`}>
                  {m.title}
                  {m.completed && <CheckCircle className="w-4 h-4 text-green-400" />}
                </div>
                <div className={`text-xs ${textSecondary}`}>{m.description}</div>
              </div>
              <div className="text-right flex-shrink-0">
                {m.completed ? (
                  <span className="text-green-400 text-xs font-bold">+{m.reward} \u2705</span>
                ) : (
                  <button
                    onClick={() => claimMission(m.type)}
                    disabled={claiming === m.type}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${btnPrimary} disabled:opacity-50`}
                  >
                    {claiming === m.type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `+${m.reward}`}
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          {/* All Complete Bonus */}
          {allCompleted && !allBonusClaimed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`${cardBg} rounded-xl p-4 text-center ring-2 ${isFacebook ? 'ring-blue-500' : isCosmic ? 'ring-blue-400' : 'ring-fuchsia-500'}`}
            >
              <Gift className={`w-8 h-8 ${accentColor} mx-auto mb-2`} />
              <h3 className={`font-bold ${textPrimary} mb-1`}>Tüm Görevler Tamamlandı! \ud83c\udf89</h3>
              <p className={`text-xs ${textSecondary} mb-3`}>Ekstra 25 kredi bonusınu al</p>
              <button
                onClick={() => claimMission('all_complete_bonus')}
                disabled={claiming === 'all_complete_bonus'}
                className={`px-6 py-2 rounded-xl ${btnPrimary} font-medium text-sm`}
              >
                {claiming === 'all_complete_bonus' ? <Loader2 className="w-4 h-4 animate-spin" /> : '\ud83c\udf81 +25 Kredi Al'}
              </button>
            </motion.div>
          )}

          {allBonusClaimed && (
            <div className={`${cardBg} rounded-xl p-4 text-center`}>
              <p className={`text-sm ${accentColor} font-bold`}>\u2728 Bugünkü tüm görevler ve bonus tamamlandı!</p>
              <p className={`text-xs ${textSecondary} mt-1`}>Yarın yeni görevler seni bekliyor</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
