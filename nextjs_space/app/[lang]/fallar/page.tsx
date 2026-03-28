'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { Sparkles, X, Coins, Flame, Gift, Loader2, Star } from 'lucide-react'

/* ─── Fortune Circles (same data as homepage) ─── */
const FORTUNE_CARDS = [
  { id: 'coffee', nameTr: 'Kahve Falı', image: 'https://cdn.abacus.ai/images/21ba0a63-b56d-4d57-ba0b-de973fac37bc.png', href: '/fallar/kahve-fali' },
  { id: 'tarot', nameTr: 'Tarot Falı', image: 'https://cdn.abacus.ai/images/ca544a3b-1bab-4e8d-b59b-74c1c45f1a5a.png', href: '/fallar/tarot-fali' },
  { id: 'palm', nameTr: 'El Falı', image: 'https://cdn.abacus.ai/images/b4f2cb29-d97d-45c0-bac0-a1b0defc320b.png', href: '/fallar/el-fali' },
  { id: 'dream', nameTr: 'Rüya Tabiri', image: 'https://cdn.abacus.ai/images/087f00ec-3e0e-4330-be79-a7d11efdf65b.png', href: '/fallar/ruya-yorumu' },
  { id: 'love', nameTr: 'Aşk Uyumu', image: 'https://cdn.abacus.ai/images/63500b4d-2875-46e7-b3ab-720016070d0c.png', href: '/fallar/ask-uyumu' },
  { id: 'horoscope', nameTr: 'Günlük Burç', image: 'https://cdn.abacus.ai/images/fc019303-9170-4a35-a30a-9dafbe6cd0bb.png', href: '/fallar/burc-yorumu' },
  { id: 'numerology', nameTr: 'Numeroloji', image: 'https://cdn.abacus.ai/images/f16750b2-d611-45af-a2ec-bb912ea71c80.png', href: '/fallar/numeroloji' },
  { id: 'angel', nameTr: 'Melek Kartları', image: 'https://cdn.abacus.ai/images/2983a121-7c1b-4d68-9d58-753b8bec3f5c.png', href: '/fallar/melek-kartlari' },
  { id: 'aura', nameTr: 'Aura Okuma', image: '/fortunes/aura.jpg', href: '/fallar/aura-analizi' },
  { id: 'birthchart', nameTr: 'Doğum Haritası', image: '/fortunes/birthchart.jpg', href: '/fallar/dogum-haritasi' },
  { id: 'katina', nameTr: 'Katina Falı', image: '/fortunes/katina.jpg', href: '/fallar/katina' },
  { id: 'yesno', nameTr: 'Evet/Hayır', image: '/fortunes/yesno.jpg', href: '/fallar/evet-hayir' },
  { id: 'kursundokme', nameTr: 'Kurşun Dökme', image: '/fortunes/dream.jpg', href: '/fallar/kursundokme' },
  { id: 'istikhara', nameTr: 'İstihare', image: '/fortunes/angel.jpg', href: '/fallar/istihare' },
]

/* ─── Bana Özel types ─── */
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

export default function FortunesPage() {
  const { language } = useLanguage()
  const { data: session } = useSession() || {}

  /* Fortune popup state */
  const [popupHref, setPopupHref] = useState<string | null>(null)
  const [popupTitle, setPopupTitle] = useState('')

  /* Bana Özel state */
  const [items, setItems] = useState<BanaOzelItem[]>([])
  const [jetonBalance, setJetonBalance] = useState(0)
  const [streak, setStreak] = useState<StreakInfo>({ currentStreak: 0, longestStreak: 0, totalFortunes: 0 })
  const [todayTasks, setTodayTasks] = useState<string[]>([])
  const [boLoading, setBoLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<BanaOzelItem | null>(null)
  const [modalContent, setModalContent] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [tarotCard, setTarotCard] = useState<string | null>(null)
  const [tarotFlipped, setTarotFlipped] = useState(false)
  const [error, setError] = useState('')
  const [claimingBonus, setClaimingBonus] = useState(false)
  const [loginBonusClaimed, setLoginBonusClaimed] = useState(false)

  /* DB fortune cards */
  const [dbCards, setDbCards] = useState<Array<{ id: string; name: string; icon: string; image: string; href: string }>>([])
  useEffect(() => {
    fetch('/api/homepage-fortune-cards').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.cards?.length > 0) setDbCards(d.cards)
    }).catch(() => {})
  }, [])
  const fortuneCards = dbCards.length > 0
    ? dbCards.map(c => ({ id: c.id, nameTr: c.name, image: c.image, href: c.href }))
    : FORTUNE_CARDS

  /* Bana Özel fetch */
  const fetchBanaOzel = useCallback(async () => {
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
    } catch { /* ignore */ } finally {
      setBoLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user) fetchBanaOzel()
    else setBoLoading(false)
  }, [session, fetchBanaOzel])

  /* Bana Özel handlers */
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
      if (!res.ok) { setError(data.error || 'Bir hata oluştu'); setModalLoading(false); return }
      setModalContent(data.content)
      setJetonBalance(data.newBalance)
      if (data.tarotCard) { setTarotCard(data.tarotCard); setTimeout(() => setTarotFlipped(true), 1000) }
    } catch { setError('Bağlantı hatası') } finally { setModalLoading(false) }
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
      if (res.ok) { setJetonBalance(data.newBalance); setLoginBonusClaimed(true) }
    } catch {} finally { setClaimingBonus(false) }
  }

  const openFortunePopup = (fortune: typeof FORTUNE_CARDS[0]) => {
    setPopupHref(`/${language}${fortune.href}`)
    setPopupTitle(fortune.nameTr)
  }

  return (
    <div className="min-h-screen py-16 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">

        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-fuchsia-300 mb-1 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-fuchsia-400" />
            Fallar
          </h1>
          <p className="text-purple-300/70 text-sm">Mistik dünyaya adım atın ve geleceğinizi keşfedin</p>
        </motion.div>

        {/* ─── Fortune Circles Grid ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="falclub-card p-4 sm:p-5 mb-6"
        >
          <h2 className="falclub-section-title mb-4">
            <Star className="w-5 h-5" />
            FALLAR
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-3 sm:gap-4">
            {fortuneCards.map((fortune, idx) => (
              <motion.div
                key={fortune.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04 }}
              >
                <button
                  onClick={() => openFortunePopup(fortune)}
                  className="flex flex-col items-center group w-full"
                >
                  <motion.div
                    className="falclub-icon-circle w-14 h-14 sm:w-16 sm:h-16 transition-all group-hover:scale-110"
                    whileHover={{ scale: 1.15, rotate: 3 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Image
                      src={fortune.image}
                      alt={fortune.nameTr}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                  <span className="text-fuchsia-200 text-[10px] sm:text-xs font-medium mt-1.5 text-center leading-tight">
                    {fortune.nameTr}
                  </span>
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ─── Bana Özel Section ─── */}
        {session?.user && !boLoading && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="falclub-card p-4 sm:p-5"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h2 className="falclub-section-title flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-fuchsia-400" />
                <span>BANA ÖZEL</span>
              </h2>
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
                  <span className="text-yellow-300/60 text-[10px] hidden sm:inline">Jeton</span>
                </div>
              </div>
            </div>

            <p className="text-fuchsia-300/70 text-xs mb-4 flex items-center gap-1.5">
              <span className="text-sm">✨</span>
              Rehberinize Özel Öneriler
              <span className="text-sm">✨</span>
            </p>

            {/* Daily Login Bonus */}
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
                    <span className="text-green-100 text-sm sm:text-base font-bold block">Günlük Giriş Bonusu</span>
                    <span className="text-green-300/70 text-[10px] sm:text-xs">Hemen al!</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-yellow-500/30 rounded-full px-3 py-1.5">
                  {claimingBonus ? (
                    <Loader2 className="w-4 h-4 text-green-300 animate-spin" />
                  ) : (
                    <><Coins className="w-4 h-4 text-yellow-400" /><span className="text-yellow-200 text-sm sm:text-base font-bold">+5</span></>
                  )}
                </div>
              </motion.button>
            )}

            {/* Items Grid - circle style like fortunes */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
              {items.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.04 }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleOpenItem(item)}
                  className="flex flex-col items-center group"
                >
                  <div
                    className="falclub-icon-circle w-14 h-14 sm:w-16 sm:h-16 transition-all group-hover:scale-110"
                  >
                    <span className="text-2xl sm:text-3xl">{item.icon}</span>
                  </div>
                  <span className="text-fuchsia-200 text-[10px] sm:text-xs font-medium mt-1.5 text-center leading-tight">
                    {item.nameTr}
                  </span>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Coins className="w-2.5 h-2.5 text-yellow-400" />
                    <span className="text-yellow-300 text-[9px] sm:text-[10px] font-bold">{item.jetonCost}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* ─── Fortune Popup (iframe modal) ─── */}
      <AnimatePresence>
        {popupHref && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
            style={{ background: 'rgba(10, 1, 24, 0.92)', backdropFilter: 'blur(4px)' }}
            onClick={() => setPopupHref(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl h-[85vh] sm:h-[80vh] rounded-2xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #1a0a2e 0%, #0f0520 100%)',
                border: '2px solid rgba(168, 85, 247, 0.5)',
                boxShadow: '0 0 40px rgba(168, 85, 247, 0.3)',
              }}
            >
              {/* Popup header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/30 bg-[#1a0a2e]/90">
                <h3 className="text-white font-bold text-base truncate flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-fuchsia-400" />
                  {popupTitle}
                </h3>
                <button
                  onClick={() => setPopupHref(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
              {/* Fortune page iframe */}
              <iframe
                src={popupHref}
                className="w-full flex-1 border-none"
                style={{ height: 'calc(100% - 52px)' }}
                title={popupTitle}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bana Özel Result Modal ─── */}
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
                    <button onClick={() => setSelectedItem(null)} className="px-6 py-2 rounded-xl bg-purple-700/50 border border-purple-400/30 text-white text-sm font-medium hover:bg-purple-600/50 transition-colors">Tamam</button>
                  </div>
                )}

                {/* Tarot card flip */}
                {tarotCard && !modalLoading && !error && (
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-40 h-60 relative cursor-pointer" style={{ perspective: '1000px' }} onClick={() => setTarotFlipped(!tarotFlipped)}>
                      <motion.div animate={{ rotateY: tarotFlipped ? 180 : 0 }} transition={{ duration: 0.8 }} className="w-full h-full relative" style={{ transformStyle: 'preserve-3d' }}>
                        <div className="absolute inset-0 rounded-xl flex items-center justify-center" style={{ backfaceVisibility: 'hidden', background: 'linear-gradient(135deg, #4a1a7a 0%, #2d1145 50%, #4a1a7a 100%)', border: '3px solid rgba(168, 85, 247, 0.6)', boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)' }}>
                          <div className="text-center"><span className="text-5xl">🃏</span><p className="text-fuchsia-300 text-xs mt-2 font-medium">Tarot</p></div>
                        </div>
                        <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center p-3" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'linear-gradient(135deg, #1a0a3e 0%, #0d0620 100%)', border: '3px solid rgba(234, 179, 8, 0.6)', boxShadow: '0 0 30px rgba(234, 179, 8, 0.3)' }}>
                          <span className="text-4xl mb-2">⭐</span>
                          <p className="text-yellow-300 text-sm font-bold text-center">{tarotCard}</p>
                          <div className="flex gap-1 mt-2"><span className="text-yellow-400">♦</span><span className="text-yellow-400">♦</span></div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* Content */}
                {modalContent && !modalLoading && !error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: tarotCard ? 1.2 : 0.2 }}>
                    <div className="prose prose-sm prose-invert max-w-none">
                      {modalContent.split('\n').filter(Boolean).map((paragraph, i) => (
                        <p key={i} className="text-purple-100/90 text-sm leading-relaxed mb-3">{paragraph}</p>
                      ))}
                    </div>
                    <button onClick={() => setSelectedItem(null)} className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-purple-700/50 to-fuchsia-700/50 border border-purple-400/40 text-white font-bold text-sm hover:from-purple-600/60 hover:to-fuchsia-600/60 transition-all" style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)' }}>Tamam</button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
