'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, ArrowLeft, Loader2, Lock, CheckCircle, Star } from 'lucide-react'

interface Achievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  category: string
  targetValue: number
  rewardCredits: number
  currentProgress: number
  progress: number
  isCompleted: boolean
  earnedAt: string | null
}

interface AchievementData {
  achievements: Achievement[]
  categorized: Record<string, Achievement[]>
  completedCount: number
  totalCount: number
  completionPercentage: number
}

const CATEGORY_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  fortune: { label: 'Fal', emoji: '🔮', color: 'from-purple-600 to-indigo-600' },
  social: { label: 'Sosyal', emoji: '🦋', color: 'from-pink-600 to-rose-600' },
  stream: { label: 'Yayın', emoji: '📺', color: 'from-blue-600 to-cyan-600' },
  coin: { label: 'Jeton', emoji: '💰', color: 'from-yellow-600 to-amber-600' },
  activity: { label: 'Aktivite', emoji: '⚡', color: 'from-green-600 to-emerald-600' }
}

export default function AchievementsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [data, setData] = useState<AchievementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/giris')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/user/achievements')
        .then(r => r.json())
        .then(d => { if (!d.error) setData(d) })
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

  const filteredAchievements = data
    ? selectedCategory === 'all'
      ? data.achievements
      : data.categorized[selectedCategory] || []
    : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0118] to-[#1a0533] text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Başarımlarım
            </h1>
            <p className="text-purple-400 text-sm">Rozetlerini topla, ödülleri kazan</p>
          </div>
        </div>

        {/* Overall Progress */}
        {data && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-2xl p-6 border border-yellow-500/20 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <div>
                  <div className="text-2xl font-bold">{data.completedCount}/{data.totalCount}</div>
                  <div className="text-sm text-yellow-300/70">Başarım Tamamlandı</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-yellow-400">%{data.completionPercentage}</div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-1000"
                style={{ width: `${data.completionPercentage}%` }}
              />
            </div>
          </motion.div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-purple-300 hover:bg-white/10'
            }`}
          >
            Tümü
          </button>
          {Object.entries(CATEGORY_INFO).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-purple-300 hover:bg-white/10'
              }`}
            >
              <span>{info.emoji}</span>
              {info.label}
            </button>
          ))}
        </div>

        {/* Achievement Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAchievements.map((achievement, i) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className={`relative rounded-2xl p-5 border transition-all ${
                  achievement.isCompleted
                    ? 'bg-gradient-to-br from-yellow-600/10 to-orange-600/10 border-yellow-500/30 shadow-lg shadow-yellow-500/5'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {achievement.isCompleted && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className={`text-4xl ${achievement.isCompleted ? '' : 'grayscale opacity-50'}`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold mb-1 ${achievement.isCompleted ? 'text-yellow-300' : 'text-purple-200'}`}>
                      {achievement.name}
                    </h4>
                    <p className="text-xs text-purple-400 mb-3">{achievement.description}</p>
                    <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          achievement.isCompleted
                            ? 'bg-gradient-to-r from-yellow-500 to-green-500'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500'
                        }`}
                        style={{ width: `${achievement.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-400">
                        {achievement.currentProgress} / {achievement.targetValue}
                      </span>
                      {achievement.rewardCredits > 0 && (
                        <span className="text-xs text-yellow-400 flex items-center gap-1">
                          <Star className="w-3 h-3" /> {achievement.rewardCredits} jeton
                        </span>
                      )}
                    </div>
                    {achievement.earnedAt && (
                      <div className="text-[10px] text-green-400/70 mt-1">
                        Kazanıldı: {new Date(achievement.earnedAt).toLocaleDateString('tr-TR')}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
