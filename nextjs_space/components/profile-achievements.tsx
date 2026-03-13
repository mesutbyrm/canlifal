'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import {
  Trophy, Star, Sparkles, Flame, Crown, Gift, Heart, MessageCircle,
  Video, Coins, Coffee, Moon, Zap, Target, Award, Medal, Shield,
  ChevronDown, ChevronUp, Lock, Check, Loader2
} from 'lucide-react'

interface Achievement {
  id: string
  code: string
  nameTr: string
  nameEn: string
  descriptionTr: string
  descriptionEn: string
  icon: string
  category: string
  targetValue: number
  rewardCredits: number
  currentProgress: number
  progressPercent: number
  isCompleted: boolean
  earnedAt: string | null
}

interface AchievementsData {
  achievements: Achievement[]
  grouped: {
    fortune: Achievement[]
    social: Achievement[]
    stream: Achievement[]
    coin: Achievement[]
    activity: Achievement[]
  }
  stats: {
    completed: number
    total: number
    percentage: number
  }
}

interface ProfileAchievementsProps {
  userId: string
  isOwnProfile?: boolean
}

const CATEGORY_INFO = {
  fortune: {
    labelTr: 'Fal Başarıları',
    labelEn: 'Fortune Achievements',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400'
  },
  social: {
    labelTr: 'Sosyal Başarılar',
    labelEn: 'Social Achievements',
    icon: Heart,
    color: 'from-pink-500 to-red-500',
    bgColor: 'bg-pink-500/20',
    textColor: 'text-pink-400'
  },
  stream: {
    labelTr: 'Yayın Başarıları',
    labelEn: 'Stream Achievements',
    icon: Video,
    color: 'from-red-500 to-orange-500',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400'
  },
  coin: {
    labelTr: 'Jeton Başarıları',
    labelEn: 'Coin Achievements',
    icon: Coins,
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400'
  },
  activity: {
    labelTr: 'Aktivite Başarıları',
    labelEn: 'Activity Achievements',
    icon: Zap,
    color: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-500/20',
    textColor: 'text-cyan-400'
  }
}

export default function ProfileAchievements({ userId, isOwnProfile }: ProfileAchievementsProps) {
  const { language } = useLanguage()
  const [data, setData] = useState<AchievementsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetchAchievements()
  }, [userId])

  const fetchAchievements = async () => {
    try {
      const res = await fetch(`/api/user/${userId}/achievements`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (e) {
      console.error('Failed to fetch achievements:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const completedAchievements = data.achievements.filter(a => a.isCompleted)
  const displayedBadges = showAll ? completedAchievements : completedAchievements.slice(0, 6)

  return (
    <div className="mt-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-white font-bold">
            {language === 'tr' ? 'Rozetler & Başarılar' : 'Badges & Achievements'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold text-sm">{data.stats.completed}</span>
          <span className="text-gray-500 text-sm">/ {data.stats.total}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
          initial={{ width: 0 }}
          animate={{ width: `${data.stats.percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      {/* Completed Badges Showcase */}
      {completedAchievements.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {displayedBadges.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                className="relative group"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 p-0.5 achievement-glow cursor-pointer">
                  <div className="w-full h-full rounded-full bg-[#0a0118] flex items-center justify-center text-2xl">
                    {achievement.icon}
                  </div>
                </div>
                {/* Tooltip */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-gray-900 px-3 py-1.5 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-amber-500/30">
                  {language === 'tr' ? achievement.nameTr : achievement.nameEn}
                </div>
                {/* Shine effect */}
                <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                  <div className="achievement-shine" />
                </div>
              </motion.div>
            ))}
          </div>
          {completedAchievements.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 mx-auto"
            >
              {showAll ? (
                <><ChevronUp className="w-4 h-4" /> {language === 'tr' ? 'Daha az göster' : 'Show less'}</>
              ) : (
                <><ChevronDown className="w-4 h-4" /> {language === 'tr' ? `+${completedAchievements.length - 6} daha` : `+${completedAchievements.length - 6} more`}</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Category Sections */}
      <div className="space-y-2">
        {Object.entries(CATEGORY_INFO).map(([category, info]) => {
          const categoryAchievements = data.grouped[category as keyof typeof data.grouped] || []
          const completedInCategory = categoryAchievements.filter((a: Achievement) => a.isCompleted).length
          const isExpanded = expandedCategory === category
          const CategoryIcon = info.icon

          return (
            <div key={category} className="rounded-xl overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className={`w-full flex items-center justify-between p-3 ${info.bgColor} hover:bg-opacity-30 transition-all`}
              >
                <div className="flex items-center gap-2">
                  <CategoryIcon className={`w-4 h-4 ${info.textColor}`} />
                  <span className="text-white font-medium text-sm">
                    {language === 'tr' ? info.labelTr : info.labelEn}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${info.textColor}`}>
                    {completedInCategory}/{categoryAchievements.length}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Category Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-gray-900/50"
                  >
                    <div className="p-3 space-y-2">
                      {categoryAchievements.map((achievement: Achievement) => (
                        <div
                          key={achievement.id}
                          className={`flex items-center gap-3 p-2 rounded-lg ${
                            achievement.isCompleted
                              ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30'
                              : 'bg-gray-800/50 border border-gray-700/50'
                          }`}
                        >
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                            achievement.isCompleted
                              ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                              : 'bg-gray-700'
                          }`}>
                            {achievement.isCompleted ? (
                              achievement.icon
                            ) : (
                              <Lock className="w-4 h-4 text-gray-500" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${
                                achievement.isCompleted ? 'text-amber-300' : 'text-gray-400'
                              }`}>
                                {language === 'tr' ? achievement.nameTr : achievement.nameEn}
                              </span>
                              {achievement.isCompleted && (
                                <Check className="w-3.5 h-3.5 text-green-400" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {language === 'tr' ? achievement.descriptionTr : achievement.descriptionEn}
                            </p>
                            {/* Progress bar for incomplete */}
                            {!achievement.isCompleted && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${info.color}`}
                                    style={{ width: `${achievement.progressPercent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-gray-500">
                                  {achievement.currentProgress}/{achievement.targetValue}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Reward */}
                          {achievement.rewardCredits > 0 && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                              achievement.isCompleted
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-gray-700 text-gray-500'
                            }`}>
                              <Coins className="w-3 h-3" />
                              {achievement.rewardCredits}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
