'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, Search, Coins, TrendingUp, TrendingDown,
  Gift, Users, Plus, Minus, X, Award, DollarSign,
  ArrowUpRight, ArrowDownRight, Crown, Star, Wallet
} from 'lucide-react'

interface OverviewData {
  totalCfc: number
  totalJeton: number
  totalRevenue: number
  totalTellerEarnings: number
  totalGiftSpent: number
  totalSessionSpent: number
  totalCommission: number
  platformProfit: number
}

interface RankedUser {
  user: { id: string; name: string; username?: string; email: string; image?: string }
  totalReceived?: number
  totalSent?: number
  totalQuantity?: number
  giftCount?: number
}

interface HolderUser {
  id: string
  name: string
  username?: string
  email: string
  image?: string
  jetonBalance: number
  credits: number
}

interface UserSearchResult {
  id: string
  name: string
  username: string | null
  email: string
  jetonBalance: number
  credits: number
}

type ActiveTab = 'overview' | 'top-gift-receivers' | 'top-gift-senders' | 'top-jeton-holders' | 'top-cfc-holders'

export default function AdminFinancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [rankedUsers, setRankedUsers] = useState<RankedUser[]>([])
  const [holders, setHolders] = useState<HolderUser[]>([])

  // Adjust modal
  const [adjustModal, setAdjustModal] = useState<{ user: HolderUser | RankedUser['user'] & { jetonBalance?: number; credits?: number } } | null>(null)
  const [adjustCurrency, setAdjustCurrency] = useState<'jeton' | 'cfc'>('jeton')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  // Search modal for manual add
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      router.push(`/login`)
      return
    }
    fetchData(activeTab)
  }, [session, status, activeTab])

  const fetchData = useCallback(async (tab: ActiveTab) => {
    setLoading(true)
    try {
      const section = tab === 'overview' ? 'overview' : tab
      const res = await fetch(`/api/admin/finance?section=${section}`)
      const data = await res.json()

      if (tab === 'overview') {
        setOverview(data)
      } else if (tab === 'top-jeton-holders' || tab === 'top-cfc-holders') {
        setHolders(data)
      } else {
        setRankedUsers(data)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=10`)
      const data = await res.json()
      setSearchResults(data.users || data || [])
    } catch { setSearchResults([]) }
    finally { setSearching(false) }
  }

  const handleAdjust = async (isAdd: boolean) => {
    if (!adjustModal || !adjustAmount) return
    setAdjusting(true)
    try {
      const userId = 'user' in adjustModal ? (adjustModal.user as HolderUser).id : ''
      const amount = isAdd ? Math.abs(Number(adjustAmount)) : -Math.abs(Number(adjustAmount))
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount, currency: adjustCurrency, reason: adjustReason }),
      })
      if (res.ok) {
        setAdjustModal(null)
        setAdjustAmount('')
        setAdjustReason('')
        fetchData(activeTab)
      }
    } catch (err) {
      console.error('Adjust error:', err)
    } finally {
      setAdjusting(false)
    }
  }

  const handleQuickAdd = async (user: UserSearchResult) => {
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
    setAdjustModal({ user: { ...user, username: user.username || undefined, image: undefined } })
  }

  const formatNumber = (n: number) => n.toLocaleString('tr-TR')
  const formatCurrency = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Genel Bakış', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'top-gift-receivers', label: 'En Çok Hediye Alan', icon: <Gift className="w-4 h-4" /> },
    { key: 'top-gift-senders', label: 'En Çok Hediye Atan', icon: <ArrowUpRight className="w-4 h-4" /> },
    { key: 'top-jeton-holders', label: 'En Çok Jeton', icon: <Coins className="w-4 h-4" /> },
    { key: 'top-cfc-holders', label: 'En Çok CFC', icon: <Crown className="w-4 h-4" /> },
  ]

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0118]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0118] text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
            💰 Finans Yönetimi
          </h1>
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl hover:from-purple-500 hover:to-fuchsia-500 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Jeton/CFC Ekle/Çıkar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-purple-600/50 border border-purple-400/50 text-purple-200'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && overview && <OverviewSection data={overview} formatNumber={formatNumber} formatCurrency={formatCurrency} />}
              {activeTab === 'top-gift-receivers' && <RankingSection title="En Çok Hediye Alanlar" data={rankedUsers} type="receiver" onAdjust={(u) => setAdjustModal({ user: u.user })} formatNumber={formatNumber} />}
              {activeTab === 'top-gift-senders' && <RankingSection title="En Çok Hediye Atanlar" data={rankedUsers} type="sender" onAdjust={(u) => setAdjustModal({ user: u.user })} formatNumber={formatNumber} />}
              {activeTab === 'top-jeton-holders' && <HoldersSection title="En Çok Jetona Sahip Kullanıcılar" data={holders} type="jeton" onAdjust={(u) => { setAdjustModal({ user: u }); setAdjustCurrency('jeton') }} formatNumber={formatNumber} />}
              {activeTab === 'top-cfc-holders' && <HoldersSection title="En Çok CFC'ye Sahip Kullanıcılar" data={holders} type="cfc" onAdjust={(u) => { setAdjustModal({ user: u }); setAdjustCurrency('cfc') }} formatNumber={formatNumber} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Adjust Modal */}
      <AnimatePresence>
        {adjustModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setAdjustModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-purple-200">Bakiye Düzenle</h3>
                <button onClick={() => setAdjustModal(null)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-white/5 rounded-xl p-3 mb-4">
                <p className="text-sm text-gray-300">{(adjustModal.user as HolderUser).name || 'Kullanıcı'}</p>
                <p className="text-xs text-gray-500">{(adjustModal.user as HolderUser).email}</p>
                {(adjustModal.user as HolderUser).jetonBalance !== undefined && (
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="text-yellow-400">Jeton: {formatNumber((adjustModal.user as HolderUser).jetonBalance || 0)}</span>
                    <span className="text-blue-400">CFC: {formatNumber((adjustModal.user as HolderUser).credits || 0)}</span>
                  </div>
                )}
              </div>

              {/* Currency Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setAdjustCurrency('jeton')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    adjustCurrency === 'jeton' ? 'bg-yellow-600/40 border border-yellow-400/50 text-yellow-200' : 'bg-white/5 border border-white/10 text-gray-400'
                  }`}
                >
                  🪙 Jeton
                </button>
                <button
                  onClick={() => setAdjustCurrency('cfc')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    adjustCurrency === 'cfc' ? 'bg-blue-600/40 border border-blue-400/50 text-blue-200' : 'bg-white/5 border border-white/10 text-gray-400'
                  }`}
                >
                  💎 CFC
                </button>
              </div>

              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Miktar giriniz"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-400/50 focus:outline-none mb-3"
              />

              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Sebep (isteğe bağlı)"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-400/50 focus:outline-none mb-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => handleAdjust(true)}
                  disabled={adjusting || !adjustAmount}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all text-sm font-bold disabled:opacity-50"
                >
                  {adjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Ekle
                </button>
                <button
                  onClick={() => handleAdjust(false)}
                  disabled={adjusting || !adjustAmount}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl hover:from-red-500 hover:to-rose-500 transition-all text-sm font-bold disabled:opacity-50"
                >
                  {adjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minus className="w-4 h-4" />}
                  Çıkar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-purple-200">Kullanıcı Ara</h3>
                <button onClick={() => setShowSearch(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); searchUsers(e.target.value) }}
                  placeholder="İsim, email veya kullanıcı adı..."
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-400/50 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {searching && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  </div>
                )}
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleQuickAdd(user)}
                    className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.username ? `@${user.username}` : user.email}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-yellow-400">🪙 {formatNumber(user.jetonBalance)}</p>
                      <p className="text-blue-400">💎 {formatNumber(user.credits)}</p>
                    </div>
                  </button>
                ))}
                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-center text-gray-500 py-4 text-sm">Kullanıcı bulunamadı</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ========= Sub Components =========

function OverviewSection({ data, formatNumber, formatCurrency }: { data: OverviewData; formatNumber: (n: number) => string; formatCurrency: (n: number) => string }) {
  const isProfit = data.platformProfit >= 0

  return (
    <div className="space-y-6">
      {/* Kâr / Zarar Banner */}
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className={`relative overflow-hidden rounded-2xl p-6 border ${
          isProfit
            ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-500/30'
            : 'bg-gradient-to-r from-red-900/40 to-rose-900/40 border-red-500/30'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isProfit ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            {isProfit ? <TrendingUp className="w-8 h-8 text-green-400" /> : <TrendingDown className="w-8 h-8 text-red-400" />}
          </div>
          <div>
            <p className="text-sm text-gray-300">
              {isProfit ? '✅ Siteniz KÂRDA' : '⚠️ Siteniz ZARARDA'}
            </p>
            <p className={`text-3xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(Math.abs(data.platformProfit))}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Yayıncı yüzdeleri düşüldükten sonraki net durum
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-green-400" />}
          label="Toplam Gelir (TRY)"
          value={formatCurrency(data.totalRevenue)}
          color="green"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-orange-400" />}
          label="Yayıncı Kazançları"
          value={formatNumber(data.totalTellerEarnings) + ' jeton'}
          color="orange"
        />
        <StatCard
          icon={<Coins className="w-5 h-5 text-yellow-400" />}
          label="Toplam Jeton"
          value={formatNumber(data.totalJeton)}
          color="yellow"
        />
        <StatCard
          icon={<Crown className="w-5 h-5 text-blue-400" />}
          label="Toplam CFC"
          value={formatNumber(data.totalCfc)}
          color="blue"
        />
        <StatCard
          icon={<Gift className="w-5 h-5 text-pink-400" />}
          label="Hediye Harcamaları"
          value={formatNumber(data.totalGiftSpent) + ' jeton'}
          color="pink"
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-amber-400" />}
          label="Seans Harcamaları"
          value={formatNumber(data.totalSessionSpent) + ' jeton'}
          color="amber"
        />
        <StatCard
          icon={<Wallet className="w-5 h-5 text-purple-400" />}
          label="Komisyon Geliri"
          value={formatNumber(data.totalCommission) + ' jeton'}
          color="purple"
        />
        <StatCard
          icon={<Award className="w-5 h-5 text-cyan-400" />}
          label="Net Durum"
          value={formatCurrency(data.platformProfit)}
          color={isProfit ? 'green' : 'red'}
        />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'from-green-900/30 to-green-900/10 border-green-500/20',
    orange: 'from-orange-900/30 to-orange-900/10 border-orange-500/20',
    yellow: 'from-yellow-900/30 to-yellow-900/10 border-yellow-500/20',
    blue: 'from-blue-900/30 to-blue-900/10 border-blue-500/20',
    pink: 'from-pink-900/30 to-pink-900/10 border-pink-500/20',
    amber: 'from-amber-900/30 to-amber-900/10 border-amber-500/20',
    purple: 'from-purple-900/30 to-purple-900/10 border-purple-500/20',
    cyan: 'from-cyan-900/30 to-cyan-900/10 border-cyan-500/20',
    red: 'from-red-900/30 to-red-900/10 border-red-500/20',
  }
  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.purple} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  )
}

function RankingSection({ title, data, type, onAdjust, formatNumber }: {
  title: string
  data: RankedUser[]
  type: 'receiver' | 'sender'
  onAdjust: (u: RankedUser) => void
  formatNumber: (n: number) => string
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-purple-200 mb-4 flex items-center gap-2">
        {type === 'receiver' ? <Gift className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
        {title}
      </h2>

      {data.length === 0 ? (
        <p className="text-center text-gray-500 py-10">Henüz veri yok</p>
      ) : (
        <div className="space-y-2">
          {data.map((item, i) => (
            <motion.div
              key={item.user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                  i === 0 ? 'bg-yellow-500/30 text-yellow-300' :
                  i === 1 ? 'bg-gray-400/30 text-gray-300' :
                  i === 2 ? 'bg-amber-700/30 text-amber-400' :
                  'bg-white/10 text-gray-400'
                }`}>
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{item.user.name}</p>
                  <p className="text-xs text-gray-500">{item.user.username ? `@${item.user.username}` : item.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-yellow-400">
                    {formatNumber(type === 'receiver' ? (item.totalReceived || 0) : (item.totalSent || 0))} jeton
                  </p>
                  <p className="text-xs text-gray-500">{item.giftCount || 0} hediye</p>
                </div>
                <button
                  onClick={() => onAdjust(item)}
                  className="p-1.5 bg-purple-600/30 border border-purple-400/30 rounded-lg hover:bg-purple-600/50 transition-all"
                  title="Bakiye düzenle"
                >
                  <Coins className="w-3.5 h-3.5 text-purple-300" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function HoldersSection({ title, data, type, onAdjust, formatNumber }: {
  title: string
  data: HolderUser[]
  type: 'jeton' | 'cfc'
  onAdjust: (u: HolderUser) => void
  formatNumber: (n: number) => string
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-purple-200 mb-4 flex items-center gap-2">
        {type === 'jeton' ? <Coins className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
        {title}
      </h2>

      {data.length === 0 ? (
        <p className="text-center text-gray-500 py-10">Henüz veri yok</p>
      ) : (
        <div className="space-y-2">
          {data.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                  i === 0 ? 'bg-yellow-500/30 text-yellow-300' :
                  i === 1 ? 'bg-gray-400/30 text-gray-300' :
                  i === 2 ? 'bg-amber-700/30 text-amber-400' :
                  'bg-white/10 text-gray-400'
                }`}>
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.username ? `@${user.username}` : user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-sm font-bold ${type === 'jeton' ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {type === 'jeton' ? `🪙 ${formatNumber(user.jetonBalance)}` : `💎 ${formatNumber(user.credits)}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {type === 'jeton' ? `CFC: ${formatNumber(user.credits)}` : `Jeton: ${formatNumber(user.jetonBalance)}`}
                  </p>
                </div>
                <button
                  onClick={() => onAdjust(user)}
                  className="p-1.5 bg-purple-600/30 border border-purple-400/30 rounded-lg hover:bg-purple-600/50 transition-all"
                  title="Bakiye düzenle"
                >
                  <Coins className="w-3.5 h-3.5 text-purple-300" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
