'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Trophy, Users, Sparkles, Crown, Medal, Star, TrendingUp } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'

interface LeaderboardUser {
  id: string
  name: string
  image?: string
  role?: string
  membership?: string
  count: number
}

const getNameEffectClass = (user: { role?: string; membership?: string }) => {
  if (user.role === 'admin') return 'effect-glitch'
  if (user.membership === 'diamond') return 'effect-neon-glow'
  if (user.membership === 'gold') return 'effect-neon-flicker'
  if (user.membership === 'premium') return 'effect-blink'
  return ''
}

interface LeaderboardData {
  topReferrers: LeaderboardUser[]
  topFortuneUsers: LeaderboardUser[]
  topSharers: LeaderboardUser[]
}

export default function LeaderboardPage() {
  const { language } = useLanguage()
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'referrers' | 'fortunes' | 'sharers'>('referrers')

  useEffect(() => {
    fetch('/api/leaderboards')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-6 h-6 text-yellow-400" />
    if (index === 1) return <Medal className="w-6 h-6 text-gray-300" />
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600" />
    return <span className="w-6 h-6 flex items-center justify-center text-deep-purple-400 font-bold">{index + 1}</span>
  }

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/50'
    if (index === 1) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/50'
    if (index === 2) return 'bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/50'
    return 'bg-deep-purple-900/50 border-deep-purple-700'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
        <LoadingSpinner message={'Yükleniyor...'} />
      </div>
    )
  }

  const tabs = [
    { key: 'referrers', label: 'En Çok Davet', icon: Users },
    { key: 'fortunes', label: 'En Çok Fal', icon: Sparkles },
    { key: 'sharers', label: 'En Çok Paylaşım', icon: TrendingUp },
  ] as const

  const currentData = activeTab === 'referrers' 
    ? data?.topReferrers 
    : activeTab === 'fortunes' 
      ? data?.topFortuneUsers 
      : data?.topSharers

  const getCountLabel = () => {
    if (activeTab === 'referrers') return 'davet'
    if (activeTab === 'fortunes') return 'fal'
    return 'paylaşım'
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Trophy className="w-16 h-16 text-gold-400 mx-auto mb-4" />
          <h1 className="font-serif text-3xl sm:text-4xl text-gold-400 mb-2">
            {'Liderlik Tablosu'}
          </h1>
          <p className="text-deep-purple-200">
            {'En aktif kullanıcılarımız'}
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-8 overflow-x-auto pb-2"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-gold-600 text-black'
                  : 'bg-deep-purple-900/50 text-deep-purple-200 hover:bg-deep-purple-800'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Top 3 Podium */}
        {currentData && currentData.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-end justify-center gap-4 mb-8"
          >
            {/* 2nd Place */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center border-4 border-gray-400">
                <span className="text-2xl font-bold text-gray-700">
                  {currentData[1]?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <p className={`text-deep-purple-200 font-medium truncate max-w-[100px] ${currentData[1] ? getNameEffectClass(currentData[1]) : ''}`} data-text={currentData[1]?.name}>{currentData[1]?.name}</p>
              <p className="text-gray-400 text-sm">{currentData[1]?.count} {getCountLabel()}</p>
              <div className="mt-2 h-16 w-20 bg-gradient-to-t from-gray-600 to-gray-400 rounded-t-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="text-center">
              <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-1" />
              <div className="w-24 h-24 mx-auto mb-2 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center border-4 border-yellow-400 shadow-lg shadow-yellow-500/30">
                <span className="text-3xl font-bold text-yellow-900">
                  {currentData[0]?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <p className={`text-gold-400 font-bold truncate max-w-[120px] ${currentData[0] ? getNameEffectClass(currentData[0]) : ''}`} data-text={currentData[0]?.name}>{currentData[0]?.name}</p>
              <p className="text-yellow-500 text-sm">{currentData[0]?.count} {getCountLabel()}</p>
              <div className="mt-2 h-24 w-24 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center border-4 border-amber-600">
                <span className="text-2xl font-bold text-amber-900">
                  {currentData[2]?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <p className={`text-deep-purple-200 font-medium truncate max-w-[100px] ${currentData[2] ? getNameEffectClass(currentData[2]) : ''}`} data-text={currentData[2]?.name}>{currentData[2]?.name}</p>
              <p className="text-amber-500 text-sm">{currentData[2]?.count} {getCountLabel()}</p>
              <div className="mt-2 h-12 w-20 bg-gradient-to-t from-amber-700 to-amber-500 rounded-t-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">3</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Full List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-deep-purple-900/30 border border-purple-500/20 rounded-xl p-4"
        >
          <div className="space-y-3">
            {currentData?.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`flex items-center gap-4 p-4 rounded-xl border ${getRankBg(index)}`}
              >
                <div className="flex-shrink-0">
                  {getRankIcon(index)}
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-200 font-bold text-lg">
                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-deep-purple-100 font-medium truncate ${getNameEffectClass(user)}`} data-text={user.name}>{user.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gold-400 font-bold text-lg">{user.count}</p>
                  <p className="text-deep-purple-400 text-xs">{getCountLabel()}</p>
                </div>
              </motion.div>
            ))}

            {(!currentData || currentData.length === 0) && (
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-deep-purple-600 mx-auto mb-3" />
                <p className="text-deep-purple-400">
                  {'Henüz veri yok'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
