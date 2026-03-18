'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Moon, Calendar, Brain, Flame, ArrowLeft, Loader2, Star, Eye } from 'lucide-react'
import Link from 'next/link'

interface DreamStats {
  totalDreams: number
  totalDiaryEntries: number
  currentStreak: number
  topSymbols: { symbol: string; count: number }[]
  monthlyData: { month: string; count: number }[]
  moodData: { mood: string; count: number }[]
  dayOfWeekData: { day: string; count: number }[]
  lucidityData: { level: number; count: number }[]
  recentDreams: { id: string; date: string; preview: string }[]
}

const MOOD_EMOJIS: Record<string, string> = {
  'mutlu': '😊', 'happy': '😊',
  'huzurlu': '😌', 'peaceful': '😌',
  'korkulu': '😰', 'scared': '😰',
  'heyecanli': '🤩', 'excited': '🤩',
  'uzgun': '😢', 'sad': '😢',
  'karmasik': '🤔', 'confused': '🤔',
  'nostaljik': '🥺', 'nostalgic': '🥺',
  'endiseli': '😟', 'anxious': '😟',
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Oca', '02': 'Şub', '03': 'Mar', '04': 'Nis',
  '05': 'May', '06': 'Haz', '07': 'Tem', '08': 'Ağu',
  '09': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara'
}

export default function DreamStatsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [stats, setStats] = useState<DreamStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/dream-stats')
        .then(r => r.json())
        .then(data => {
          if (!data.error) setStats(data)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [status])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0118] to-[#1a0533] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  const maxMonthly = stats ? Math.max(...stats.monthlyData.map(d => d.count), 1) : 1
  const maxDayOfWeek = stats ? Math.max(...stats.dayOfWeekData.map(d => d.count), 1) : 1

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0118] to-[#1a0533] text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              Rüya İstatistiklerim
            </h1>
            <p className="text-purple-400 text-sm">Rüya dünyandaki yolculuğun</p>
          </div>
        </div>

        {!stats || (stats.totalDreams === 0 && stats.totalDiaryEntries === 0) ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Moon className="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-purple-300 mb-2">Henüz veri yok</h2>
            <p className="text-purple-400/70 mb-6">Rüya tabiri yaptır veya rüya günlüğüne kayıt ekle</p>
            <Link href="/ruya" className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium transition">
              İlk Rüyanı Yorumlat
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Moon, label: 'Toplam Yorum', value: stats.totalDreams, color: 'from-purple-600 to-indigo-600' },
                { icon: Calendar, label: 'Günlük Kayıt', value: stats.totalDiaryEntries, color: 'from-blue-600 to-cyan-600' },
                { icon: Flame, label: 'Seri', value: `${stats.currentStreak} gün`, color: 'from-orange-600 to-red-600' },
                { icon: Star, label: 'En Çok Sembol', value: stats.topSymbols[0]?.symbol || '-', color: 'from-yellow-600 to-amber-600' },
              ].map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 shadow-lg`}
                >
                  <card.icon className="w-6 h-6 mb-2 opacity-80" />
                  <div className="text-2xl font-bold">{card.value}</div>
                  <div className="text-xs opacity-80">{card.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Monthly Chart */}
            {stats.monthlyData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Aylık Rüya Yorumları
                </h3>
                <div className="flex items-end gap-2 h-40">
                  {stats.monthlyData.map((d, i) => {
                    const height = (d.count / maxMonthly) * 100
                    const monthParts = d.month.split('-')
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-purple-300">{d.count}</span>
                        <div className="w-full bg-white/5 rounded-t-lg relative" style={{ height: '120px' }}>
                          <div
                            className="absolute bottom-0 w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all"
                            style={{ height: `${Math.max(height, 5)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-purple-400">{MONTH_NAMES[monthParts[1]] || monthParts[1]}</span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Day of Week */}
            {stats.dayOfWeekData.some(d => d.count > 0) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Haftanın Günlerine Göre
                </h3>
                <div className="space-y-2">
                  {stats.dayOfWeekData.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm text-purple-300 w-24">{d.day}</span>
                      <div className="flex-1 bg-white/5 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max((d.count / maxDayOfWeek) * 100, 8)}%` }}
                        >
                          <span className="text-xs font-medium">{d.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Top Symbols */}
            {stats.topSymbols.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-pink-400" />
                  En Sık Görülen Semboller
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.topSymbols.map((s, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl border border-purple-500/20 flex items-center gap-2"
                    >
                      <span className="text-sm font-medium capitalize">{s.symbol}</span>
                      <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{s.count}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Mood Distribution */}
            {stats.moodData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-green-400" />
                  Ruh Hali Dağılımı
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {stats.moodData.map((m, i) => (
                    <div key={i} className="text-center p-3 bg-white/5 rounded-xl">
                      <div className="text-3xl mb-1">{MOOD_EMOJIS[m.mood.toLowerCase()] || '😶'}</div>
                      <div className="text-sm capitalize text-purple-300">{m.mood}</div>
                      <div className="text-lg font-bold">{m.count}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Lucidity Chart */}
            {stats.lucidityData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                  Lusid Rüya Seviyeleri
                </h3>
                <div className="flex items-end gap-3 h-32">
                  {[1, 2, 3, 4, 5].map(level => {
                    const item = stats.lucidityData.find(d => d.level === level)
                    const count = item?.count || 0
                    const maxLucidity = Math.max(...stats.lucidityData.map(d => d.count), 1)
                    const height = (count / maxLucidity) * 100
                    return (
                      <div key={level} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-purple-300">{count}</span>
                        <div className="w-full bg-white/5 rounded-t-lg relative" style={{ height: '100px' }}>
                          <div
                            className="absolute bottom-0 w-full bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg"
                            style={{ height: `${Math.max(height, 5)}%` }}
                          />
                        </div>
                        <span className="text-xs text-purple-400">Lv.{level}</span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Recent Dreams */}
            {stats.recentDreams.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Son Rüya Yorumları</h3>
                <div className="space-y-3">
                  {stats.recentDreams.map((dream, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-xl">
                      <div className="text-xs text-purple-400 mb-1">
                        {new Date(dream.date).toLocaleDateString('tr-TR')}
                      </div>
                      <p className="text-sm text-purple-200">{dream.preview || 'Rüya yorumu'}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
