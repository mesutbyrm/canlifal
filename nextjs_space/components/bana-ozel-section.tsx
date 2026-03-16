'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins, Flame, Gift, Loader2, Sparkles } from 'lucide-react'

interface BanaOzelItem {
  id: string
  slug: string
  nameTr: string
  nameEn: string
  icon: string
  jetonCost: number
  category: string
  isActive: boolean
  sortOrder: number
}

interface StreakInfo {
  currentStreak: number
  longestStreak: number
  totalFortunes: number
}

// Color schemes for different item categories
const ITEM_COLORS: Record<string, { gradient: string; border: string; glow: string }> = {
  'daily': { gradient: 'from-amber-600/30 to-orange-600/30', border: 'border-amber-400/50', glow: 'rgba(251, 191, 36, 0.3)' },
  'tarot': { gradient: 'from-purple-600/30 to-fuchsia-600/30', border: 'border-purple-400/50', glow: 'rgba(168, 85, 247, 0.3)' },
  'love': { gradient: 'from-pink-600/30 to-rose-600/30', border: 'border-pink-400/50', glow: 'rgba(236, 72, 153, 0.3)' },
  'career': { gradient: 'from-blue-600/30 to-cyan-600/30', border: 'border-blue-400/50', glow: 'rgba(59, 130, 246, 0.3)' },
  'health': { gradient: 'from-green-600/30 to-emerald-600/30', border: 'border-green-400/50', glow: 'rgba(34, 197, 94, 0.3)' },
  'default': { gradient: 'from-violet-600/30 to-indigo-600/30', border: 'border-violet-400/50', glow: 'rgba(139, 92, 246, 0.3)' },
}

export default function BanaOzelSection() {
  const { data: session } = useSession() || {}
  const { language } = useLanguage()
  const [items, setItems] = useState<BanaOzelItem[]>([])
  const [jetonBalance, setJetonBalance] = useState(0)
  const [streak, setStreak] = useState<StreakInfo>({ currentStreak: 0, longestStreak: 0, totalFortunes: 0 })
  const [todayTasks, setTodayTasks] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<BanaOzelItem | null>(null)
  const [modalContent, setModalContent] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [tarotCard, setTarotCard] = useState<string | null>(null)
  const [tarotFlipped, setTarotFlipped] = useState(false)
  const [error, setError] = useState('')
  const [claimingBonus, setClaimingBonus] = useState(false)
  const [loginBonusClaimed, setLoginBonusClaimed] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/bana-ozel')
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        setJetonBalance(data.jetonBalance || 0)
        setStreak(data.streak || { currentStreak: 0, longestStreak: 0, totalFortunes: 0 })
        setTodayTasks(data.todayTasks || [])
        setLoginBonusClaimed((data.todayTasks || []).includes('login'))
      }
    } catch {
      console.error('Failed to load bana ozel data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user) fetchData()
    else setLoading(false)
  }, [session, fetchData])

  const handleOpenItem = async (item: BanaOzelItem) => {
    setSelectedItem(item)
    setModalContent('')
    setTarotCard(null)
    setTarotFlipped(false)
    setError('')
    setModalLoading(true)

    try {
      const res = await fetch('/api/bana-ozel/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: item.slug }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Bir hata oluştu')
        setModalLoading(false)
        return
      }
      setModalContent(data.content)
      setJetonBalance(data.newBalance)
      if (data.tarotCard) {
        setTarotCard(data.tarotCard)
        // Auto-flip tarot card after 1s
        setTimeout(() => setTarotFlipped(true), 1000)
      }
    } catch {
      setError('Bağlantı hatası')
    } finally {
      setModalLoading(false)
    }
  }

  const handleClaimLoginBonus = async () => {
    setClaimingBonus(true)
    try {
      const res = await fetch('/api/jeton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'daily_login' }),
      })
      const data = await res.json()
      if (res.ok) {
        setJetonBalance(data.newBalance)
        setLoginBonusClaimed(true)
      }
    } catch {
      console.error('Failed to claim login bonus')
    } finally {
      setClaimingBonus(false)
    }
  }

  const getItemColors = (category: string) => {
    return ITEM_COLORS[category] || ITEM_COLORS.default
  }

  if (!session?.user || loading) return null
  if (items.length === 0) return null

  return (
    <>
      {/* BANA ÖZEL Section */}
      <div className="falclub-card p-3 sm:p-4">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h2 className="falclub-section-title flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-fuchsia-400" />
            <span>{language === 'tr' ? 'BANA ÖZEL' : 'PERSONALIZED'}</span>
          </h2>
          <div className="flex items-center gap-2">
            {/* Streak badge */}
            {streak.currentStreak > 0 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/40 rounded-full px-2.5 py-1"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-orange-300 text-xs font-bold">{streak.currentStreak}</span>
                <span className="text-orange-300/60 text-[10px] hidden sm:inline">{language === 'tr' ? 'gün' : 'days'}</span>
              </motion.div>
            )}
            {/* Jeton balance */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/40 rounded-full px-2.5 py-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-300 text-sm font-bold">{jetonBalance}</span>
              <span className="text-yellow-300/60 text-[10px] hidden sm:inline">Jeton</span>
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-fuchsia-300/70 text-xs mb-4 flex items-center gap-1.5">
          <span className="text-sm">✨</span>
          {language === 'tr' ? 'Rehberinize Özel Öneriler' : 'Personalized Recommendations'}
          <span className="text-sm">✨</span>
        </p>

        {/* Daily Login Bonus - Enhanced */}
        {!loginBonusClaimed && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClaimLoginBonus}
            disabled={claimingBonus}
            className="w-full mb-4 flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gradient-to-r from-green-600/20 via-emerald-600/25 to-green-600/20 border-2 border-green-400/50 hover:border-green-300/70 transition-all shadow-lg"
            style={{ boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-green-500/40 to-emerald-500/40 border border-green-400/60 flex items-center justify-center">
                <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-green-300" />
              </div>
              <div className="text-left">
                <span className="text-green-100 text-sm sm:text-base font-bold block">
                  {language === 'tr' ? 'Günlük Giriş Bonusu' : 'Daily Login Bonus'}
                </span>
                <span className="text-green-300/70 text-[10px] sm:text-xs">
                  {language === 'tr' ? 'Hemen al!' : 'Claim now!'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-yellow-500/30 rounded-full px-3 py-1.5">
              {claimingBonus ? (
                <Loader2 className="w-4 h-4 text-green-300 animate-spin" />
              ) : (
                <>
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-200 text-sm sm:text-base font-bold">+5</span>
                </>
              )}
            </div>
          </motion.button>
        )}

        {/* Items Grid - Responsive 2x2 on mobile, 3x on tablet, 4x on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {items.map((item, index) => {
            const colors = getItemColors(item.category)
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleOpenItem(item)}
                className={`relative flex flex-col items-center p-3 sm:p-4 rounded-xl bg-gradient-to-br ${colors.gradient} border ${colors.border} hover:shadow-lg transition-all duration-300 group overflow-hidden`}
                style={{ boxShadow: `0 0 15px ${colors.glow}` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full" 
                  style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
                />
                
                {/* Icon */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl sm:text-3xl">{item.icon}</span>
                </div>
                
                {/* Name */}
                <span className="text-white text-xs sm:text-sm font-medium text-center line-clamp-2 mb-2 min-h-[2.5rem]">
                  {language === 'tr' ? item.nameTr : item.nameEn}
                </span>
                
                {/* Jeton cost badge */}
                <div className="flex items-center gap-1 bg-black/30 rounded-full px-2 py-0.5">
                  <Coins className="w-3 h-3 text-yellow-400" />
                  <span className="text-yellow-300 text-[10px] sm:text-xs font-bold">{item.jetonCost}</span>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Shimmer animation style */}
        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(10, 1, 24, 0.9)' }}
            onClick={() => { if (!modalLoading) setSelectedItem(null) }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl relative"
              style={{
                background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1145 50%, #1a0a2e 100%)',
                border: '2px solid rgba(168, 85, 247, 0.5)',
                boxShadow: '0 0 40px rgba(168, 85, 247, 0.3)',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-purple-900/50 border border-purple-400/30 flex items-center justify-center hover:bg-purple-800/70 transition-colors"
              >
                <X className="w-4 h-4 text-fuchsia-300" />
              </button>

              <div className="p-5">
                {/* Item header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600/40 to-fuchsia-600/40 border border-purple-400/50 flex items-center justify-center"
                    style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)' }}
                  >
                    <span className="text-2xl">{selectedItem.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg">
                      {language === 'tr' ? selectedItem.nameTr : selectedItem.nameEn}
                    </h3>
                    <div className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-yellow-300 text-xs">{selectedItem.jetonCost} Jeton {language === 'tr' ? 'Harcandı' : 'Spent'}</span>
                    </div>
                  </div>
                </div>

                {/* Loading state */}
                {modalLoading && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    >
                      <Sparkles className="w-10 h-10 text-fuchsia-400" />
                    </motion.div>
                    <p className="text-fuchsia-300 text-sm mt-3 animate-pulse">
                      {language === 'tr' ? 'Yıldızlar yorumlanıyor...' : 'Reading the stars...'}
                    </p>
                  </div>
                )}

                {/* Error state */}
                {error && !modalLoading && (
                  <div className="text-center py-8">
                    <p className="text-red-400 text-sm mb-3">{error}</p>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="px-6 py-2 rounded-xl bg-purple-700/50 border border-purple-400/30 text-white text-sm font-medium hover:bg-purple-600/50 transition-colors"
                    >
                      {language === 'tr' ? 'Tamam' : 'OK'}
                    </button>
                  </div>
                )}

                {/* Tarot card with flip animation */}
                {tarotCard && !modalLoading && !error && (
                  <div className="flex flex-col items-center mb-4">
                    <div
                      className="w-40 h-60 relative cursor-pointer"
                      style={{ perspective: '1000px' }}
                      onClick={() => setTarotFlipped(!tarotFlipped)}
                    >
                      <motion.div
                        animate={{ rotateY: tarotFlipped ? 180 : 0 }}
                        transition={{ duration: 0.8 }}
                        className="w-full h-full relative"
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        {/* Card Back */}
                        <div
                          className="absolute inset-0 rounded-xl flex items-center justify-center"
                          style={{
                            backfaceVisibility: 'hidden',
                            background: 'linear-gradient(135deg, #4a1a7a 0%, #2d1145 50%, #4a1a7a 100%)',
                            border: '3px solid rgba(168, 85, 247, 0.6)',
                            boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)',
                          }}
                        >
                          <div className="text-center">
                            <span className="text-5xl">🃏</span>
                            <p className="text-fuchsia-300 text-xs mt-2 font-medium">Tarot</p>
                          </div>
                        </div>
                        {/* Card Front */}
                        <div
                          className="absolute inset-0 rounded-xl flex flex-col items-center justify-center p-3"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            background: 'linear-gradient(135deg, #1a0a3e 0%, #0d0620 100%)',
                            border: '3px solid rgba(234, 179, 8, 0.6)',
                            boxShadow: '0 0 30px rgba(234, 179, 8, 0.3)',
                          }}
                        >
                          <span className="text-4xl mb-2">⭐</span>
                          <p className="text-yellow-300 text-sm font-bold text-center">{tarotCard}</p>
                          <div className="flex gap-1 mt-2">
                            <span className="text-yellow-400">♦</span>
                            <span className="text-yellow-400">♦</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* Content */}
                {modalContent && !modalLoading && !error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: tarotCard ? 1.2 : 0.2 }}
                  >
                    <div className="prose prose-sm prose-invert max-w-none">
                      {modalContent.split('\n').filter(Boolean).map((paragraph, i) => (
                        <p key={i} className="text-purple-100/90 text-sm leading-relaxed mb-3">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-purple-700/50 to-fuchsia-700/50 border border-purple-400/40 text-white font-bold text-sm hover:from-purple-600/60 hover:to-fuchsia-600/60 transition-all"
                      style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)' }}
                    >
                      {language === 'tr' ? 'Tamam' : 'Done'}
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
