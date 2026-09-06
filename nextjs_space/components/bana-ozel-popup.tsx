'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins, Flame, Gift, Loader2, ChevronRight, Sparkles } from 'lucide-react'
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

interface BanaOzelPopupProps {
  isOpen: boolean
  onClose: () => void
}

export default function BanaOzelPopup({ isOpen, onClose }: BanaOzelPopupProps) {
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
      setLoading(true)
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
    if (isOpen && session?.user) {
      fetchData()
    }
  }, [isOpen, session, fetchData])

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

  const handleBack = () => {
    setSelectedItem(null)
    setModalContent('')
    setTarotCard(null)
    setTarotFlipped(false)
    setError('')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed left-0 right-0 bottom-0 z-[10000] flex items-start sm:items-center justify-center overflow-y-auto"
          style={{ 
            top: '48px', // Start below the announcement banner
            background: 'rgba(10, 1, 24, 0.95)' 
          }}
          onClick={() => { if (!modalLoading) { if (selectedItem) handleBack(); else onClose(); } }}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[95%] md:w-[90%] max-w-lg mx-2 sm:mx-4 my-2 sm:my-4 max-h-[calc(100vh-64px)] sm:max-h-[85vh] overflow-y-auto rounded-2xl relative"
            style={{
              background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1145 50%, #1a0a2e 100%)',
              border: '2px solid rgba(168, 85, 247, 0.5)',
              boxShadow: '0 0 40px rgba(168, 85, 247, 0.3)',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => { if (selectedItem) handleBack(); else onClose(); }}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-purple-900/50 border border-purple-400/30 flex items-center justify-center hover:bg-purple-800/70 transition-colors"
            >
              <X className="w-4 h-4 text-fuchsia-300" />
            </button>

            <div className="p-5">
              {/* Detail view - when an item is selected */}
              <AnimatePresence mode="wait">
                {selectedItem ? (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Item header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600/40 to-fuchsia-600/40 border border-purple-400/50 flex items-center justify-center"
                        style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)' }}
                      >
                        <span className="text-2xl">{selectedItem.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg">
                          {selectedItem.nameTr}
                        </h3>
                        {modalContent && (
                          <div className="flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="text-yellow-300 text-xs">{selectedItem.jetonCost} Jeton {'Harcandı'}</span>
                          </div>
                        )}
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
                          {'Yıldızlar yorumlanıyor...'}
                        </p>
                      </div>
                    )}

                    {/* Error state */}
                    {error && !modalLoading && (
                      <div className="text-center py-8">
                        <p className="text-red-400 text-sm mb-3">{error}</p>
                        <button
                          onClick={handleBack}
                          className="px-6 py-2 rounded-xl bg-purple-700/50 border border-purple-400/30 text-white text-sm font-medium hover:bg-purple-600/50 transition-colors"
                        >
                          {'Geri Dön'}
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

                        <button
                          onClick={handleBack}
                          className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-purple-700/50 to-fuchsia-700/50 border border-purple-400/40 text-white font-bold text-sm hover:from-purple-600/60 hover:to-fuchsia-600/60 transition-all"
                          style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)' }}
                        >
                          {'Geri Dön'}
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-fuchsia-400" />
                        {'Bana Özel'}
                      </h2>
                      <div className="flex items-center gap-2">
                        {streak.currentStreak > 0 && (
                          <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-400/40 rounded-full px-2 py-0.5">
                            <Flame className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-orange-300 text-xs font-bold">{streak.currentStreak}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-400/40 rounded-full px-2.5 py-0.5">
                          <Coins className="w-3.5 h-3.5 text-yellow-400" />
                          <span className="text-yellow-300 text-xs font-bold">{jetonBalance}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-fuchsia-300/70 text-xs mb-3 flex items-center gap-1">
                      <span>✨</span>
                      {'Bir fal türü seçin'}
                      <span>✨</span>
                    </p>

                    {/* Loading */}
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {/* Daily Login Bonus */}
                        {!loginBonusClaimed && (
                          <button
                            onClick={handleClaimLoginBonus}
                            disabled={claimingBonus}
                            className="w-full mb-3 flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-400/40 hover:border-green-300/60 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <Gift className="w-5 h-5 text-green-400" />
                              <span className="text-green-200 text-sm font-medium">
                                {'Günlük Giriş Bonusu'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {claimingBonus ? (
                                <Loader2 className="w-4 h-4 text-green-300 animate-spin" />
                              ) : (
                                <>
                                  <Coins className="w-4 h-4 text-yellow-400" />
                                  <span className="text-yellow-300 text-sm font-bold">+5</span>
                                </>
                              )}
                            </div>
                          </button>
                        )}

                        {/* Items List */}
                        <div className="space-y-2">
                          {items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleOpenItem(item)}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-purple-900/20 border border-purple-500/30 hover:border-fuchsia-400/50 hover:bg-purple-800/30 transition-all group"
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600/40 to-fuchsia-600/40 border border-purple-400/50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                                style={{ boxShadow: '0 0 10px rgba(168, 85, 247, 0.2)' }}
                              >
                                <span className="text-lg">{item.icon}</span>
                              </div>
                              <span className="flex-1 text-left text-white text-sm font-medium truncate">
                                {item.nameTr}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                                <span className="text-yellow-300 text-xs font-bold">{item.jetonCost}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-fuchsia-400/50 flex-shrink-0" />
                            </button>
                          ))}
                        </div>

                        {items.length === 0 && !loading && (
                          <p className="text-purple-300/60 text-sm text-center py-8">
                            {'Henüz içerik yok'}
                          </p>
                        )}
                      </>
                    )}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
