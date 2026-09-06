'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins, Flame, Gift, Loader2, Sparkles, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import AdWatchModal from '@/components/ad-watch-modal'

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

const ITEM_COLORS: Record<string, { gradient: string; border: string; glow: string }> = {
  'daily': { gradient: 'from-fuchsia-900/30 to-purple-900/30', border: 'border-fuchsia-700/40', glow: 'rgba(168, 85, 247, 0.2)' },
  'tarot': { gradient: 'from-indigo-900/30 to-purple-900/30', border: 'border-indigo-700/40', glow: 'rgba(99, 102, 241, 0.2)' },
  'love': { gradient: 'from-pink-900/30 to-rose-900/30', border: 'border-pink-700/40', glow: 'rgba(244, 63, 94, 0.2)' },
  'career': { gradient: 'from-amber-900/30 to-orange-900/30', border: 'border-amber-700/40', glow: 'rgba(245, 158, 11, 0.2)' },
  'health': { gradient: 'from-emerald-900/30 to-green-900/30', border: 'border-emerald-700/40', glow: 'rgba(16, 185, 129, 0.2)' },
  'default': { gradient: 'from-fuchsia-900/30 to-purple-900/30', border: 'border-fuchsia-700/40', glow: 'rgba(168, 85, 247, 0.2)' },
}

export default function BanaOzelPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
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
    if (status === 'unauthenticated') {
      router.replace('/giris')
      return
    }
    if (session?.user) fetchData()
    else setLoading(false)
  }, [session, status, fetchData, router])

  const [showAdModal, setShowAdModal] = useState(false)
  const [adItem, setAdItem] = useState<BanaOzelItem | null>(null)

  const handleOpenItem = async (item: BanaOzelItem, useAd = false) => {
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
        body: JSON.stringify({ slug: item.slug, useAd }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Bakiye yetersiz → reklam izleyerek açma seçeneği
        if (res.status === 402 && data?.canWatchAd) {
          setAdItem(item)
          setShowAdModal(true)
          setError('')
          setModalLoading(false)
          return
        }
        setError(data.error || 'Bir hata oluştu')
        setModalLoading(false)
        return
      }
      setModalContent(data.content)
      setJetonBalance(typeof data.cfcBalance === 'number' ? data.cfcBalance : data.newBalance)
      if (data.tarotCard) {
        setTarotCard(data.tarotCard)
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

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0118]/80 border-b border-purple-500/20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 rounded-lg hover:bg-purple-900/30 transition-colors">
              <ArrowLeft className="w-5 h-5 text-fuchsia-300" />
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-fuchsia-400" />
              <h1 className="text-lg font-bold text-white">Bana Özel</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {streak.currentStreak > 0 && (
              <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/40 rounded-full px-2.5 py-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-orange-300 text-xs font-bold">{streak.currentStreak}</span>
                <span className="text-orange-300/60 text-[10px] hidden sm:inline">gün</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/40 rounded-full px-2.5 py-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-300 text-sm font-bold">{jetonBalance}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Daily Login Bonus */}
        {!loginBonusClaimed && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClaimLoginBonus}
            disabled={claimingBonus}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-600/20 via-emerald-600/25 to-green-600/20 border-2 border-green-400/50 hover:border-green-300/70 transition-all"
            style={{ boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/40 to-emerald-500/40 border border-green-400/60 flex items-center justify-center">
                <Gift className="w-6 h-6 text-green-300" />
              </div>
              <div className="text-left">
                <span className="text-green-100 text-sm sm:text-base font-bold block">Günlük Giriş Bonusu</span>
                <span className="text-green-300/70 text-xs">Hemen al!</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-yellow-500/30 rounded-full px-3 py-1.5">
              {claimingBonus ? (
                <Loader2 className="w-4 h-4 text-green-300 animate-spin" />
              ) : (
                <>
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-200 text-sm font-bold">+5</span>
                </>
              )}
            </div>
          </motion.button>
        )}

        {/* Items Grid - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {items.map((item, index) => {
            const colors = getItemColors(item.category)
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleOpenItem(item)}
                className={`relative flex flex-col items-center p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${colors.gradient} border ${colors.border} hover:shadow-xl transition-all duration-300 group overflow-hidden`}
                style={{ boxShadow: `0 0 20px ${colors.glow}` }}
              >
                {/* Shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full" />
                
                {/* Icon */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl sm:text-4xl">{item.icon}</span>
                </div>
                
                {/* Name */}
                <span className="text-white text-xs sm:text-sm font-medium text-center line-clamp-2 mb-2 min-h-[2.5rem]">
                  {item.nameTr}
                </span>
                
                {/* Jeton cost */}
                <div className="flex items-center gap-1 bg-black/30 rounded-full px-2.5 py-1">
                  <Coins className="w-3 h-3 text-yellow-400" />
                  <span className="text-yellow-300 text-xs font-bold">{item.jetonCost}</span>
                </div>
              </motion.button>
            )
          })}
        </div>

        {items.length === 0 && !loading && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-fuchsia-400/40 mx-auto mb-3" />
            <p className="text-purple-300/60 text-sm">Henüz fal bulunmuyor</p>
          </div>
        )}
      </div>

      {/* Fortune Popup Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(10, 1, 24, 0.92)' }}
            onClick={() => { if (!modalLoading) setSelectedItem(null) }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
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
                    <h3 className="text-white font-bold text-lg">{selectedItem.nameTr}</h3>
                    <div className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-yellow-300 text-xs">{selectedItem.jetonCost} Jeton Harcandı</span>
                    </div>
                  </div>
                </div>

                {/* Loading */}
                {modalLoading && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
                      <Sparkles className="w-10 h-10 text-fuchsia-400" />
                    </motion.div>
                    <p className="text-fuchsia-300 text-sm mt-3 animate-pulse">Yıldızlar yorumlanıyor...</p>
                  </div>
                )}

                {/* Error */}
                {error && !modalLoading && (
                  <div className="text-center py-8">
                    <p className="text-red-400 text-sm mb-3">{error}</p>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="px-6 py-2 rounded-xl bg-purple-700/50 border border-purple-400/30 text-white text-sm font-medium hover:bg-purple-600/50 transition-colors"
                    >
                      Tamam
                    </button>
                  </div>
                )}

                {/* Tarot card flip */}
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
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-purple-700/50 to-fuchsia-700/50 border border-purple-400/40 text-white font-bold text-sm hover:from-purple-600/60 hover:to-fuchsia-600/60 transition-all"
                      style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)' }}
                    >
                      Tamam
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdWatchModal
        isOpen={showAdModal}
        onClose={() => { setShowAdModal(false); setAdItem(null) }}
        onRewardEarned={() => {
          const target = adItem
          setShowAdModal(false)
          setAdItem(null)
          if (target) handleOpenItem(target, true)
        }}
      />
    </div>
  )
}
