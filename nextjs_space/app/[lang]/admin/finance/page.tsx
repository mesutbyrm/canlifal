'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Loader2, Search, Coins, TrendingUp, TrendingDown,
  Gift, Users, Plus, Minus, X, Award, DollarSign,
  ArrowUpRight, ArrowDownRight, Crown, Star, Wallet,
  Settings, Percent, Save, CheckCircle, Calendar,
  Eye, Edit3, MessageSquare, Video, User as UserIcon
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
  manualProfitAdjustment: number
  breakdown?: {
    streamGiftSpent: number
    chatGiftSpent: number
    tellerGiftSpent: number
    sessionSpent: number
    banaOzelSpent: number
    membershipSpent: number
    banaOzelCount: number
    membershipCount: number
  }
  commissions?: {
    streamCommission: number
    sessionCommission: number
    chatCommission: number
    totalBurnedJetons: number
    commissionRate: number
    broadcasterCommRate: number
  }
  jetonSpendBreakdown?: Record<string, { amount: number; count: number }>
  jetonIncomeBreakdown?: Record<string, { amount: number; count: number }>
}

interface CommissionSettings {
  commission_rate: string
  broadcaster_commission_rate: string
  chat_room_default_commission_rate: string
  manual_profit_adjustment: string
}

interface RankedUser {
  user: { id: string; name: string; username?: string; email: string; image?: string }
  totalReceived?: number
  totalSent?: number
  totalQuantity?: number
  giftCount?: number
  totalEarnings?: number
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

interface GiftHistoryItem {
  id: string
  type: 'chat_room' | 'stream' | 'teller'
  amount: number
  quantity: number
  commission: number
  createdAt: string
  giftName: string
  giftIcon: string
  sender: { id: string; name: string; username?: string; image?: string } | null
  receiver: { id: string; name: string; username?: string; image?: string } | null
  sourceName: string
  sourceSlug?: string | null
}

interface UserFinancialProfile {
  user: { id: string; name: string; username?: string; email: string; image?: string; credits: number; jetonBalance: number; role: string; membership: string; createdAt: string; _count: { fortunes: number } }
  financials: {
    totalGiftsSent: number; totalGiftsReceived: number; giftsSentCount: number;
    giftsReceivedCount: number; sessionSpending: number; tellerEarnings: number; tellerSessions: number;
  }
  recentTransactions: { id: string; amount: number; type: string; description: string; createdAt: string; balanceBefore: number; balanceAfter: number }[]
}

interface UserSearchResult {
  id: string; name: string; username: string | null; email: string; jetonBalance: number; credits: number
}

type ActiveTab = 'overview' | 'commission-settings' | 'gift-history' | 'top-earners' | 'top-gift-receivers' | 'top-gift-senders' | 'top-jeton-holders' | 'top-cfc-holders'

export default function AdminFinancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [rankedUsers, setRankedUsers] = useState<RankedUser[]>([])
  const [holders, setHolders] = useState<HolderUser[]>([])
  const [giftHistory, setGiftHistory] = useState<GiftHistoryItem[]>([])

  type PeriodType = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  const [period, setPeriod] = useState<PeriodType>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings | null>(null)

  // Adjust modal
  const [adjustModal, setAdjustModal] = useState<{ user: HolderUser | RankedUser['user'] & { jetonBalance?: number; credits?: number } } | null>(null)
  const [adjustCurrency, setAdjustCurrency] = useState<'jeton' | 'cfc'>('jeton')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  // Profit adjust modal
  const [showProfitAdjust, setShowProfitAdjust] = useState(false)
  const [profitAmount, setProfitAmount] = useState('')
  const [profitReason, setProfitReason] = useState('')
  const [profitAdjusting, setProfitAdjusting] = useState(false)

  // Search modal
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // User profile popup
  const [userProfile, setUserProfile] = useState<UserFinancialProfile | null>(null)
  const [userProfileLoading, setUserProfileLoading] = useState(false)
  const [editField, setEditField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      router.push(`/giris`)
      return
    }
    fetchData(activeTab)
  }, [session, status, activeTab, period, customFrom, customTo])

  const fetchData = useCallback(async (tab: ActiveTab) => {
    setLoading(true)
    try {
      let url = `/api/admin/finance?section=${tab}&period=${period}`
      if (period === 'custom' && customFrom) {
        url += `&from=${customFrom}`
        if (customTo) url += `&to=${customTo}`
      }
      const res = await fetch(url)
      const data = await res.json()

      if (tab === 'overview') setOverview(data)
      else if (tab === 'commission-settings') setCommissionSettings(data)
      else if (tab === 'gift-history') setGiftHistory(data.gifts || [])
      else if (tab === 'top-jeton-holders' || tab === 'top-cfc-holders') setHolders(data)
      else setRankedUsers(data)
    } catch (err) { console.error('Fetch error:', err) }
    finally { setLoading(false) }
  }, [period, customFrom, customTo])

  const openUserProfile = async (userId: string) => {
    setUserProfileLoading(true)
    setUserProfile(null)
    try {
      const res = await fetch(`/api/admin/finance?section=user-profile&userId=${userId}`)
      const data = await res.json()
      if (data.user) setUserProfile(data)
    } catch (err) { console.error(err) }
    finally { setUserProfileLoading(false) }
  }

  const handleEditBalance = async (userId: string, currency: 'jeton' | 'cfc', amount: number) => {
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount, currency, reason: 'Admin düzenlemesi' }),
      })
      if (res.ok) {
        openUserProfile(userId)
        fetchData(activeTab)
      }
    } catch (err) { console.error(err) }
    setEditField(null)
    setEditValue('')
  }

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
      if (res.ok) { setAdjustModal(null); setAdjustAmount(''); setAdjustReason(''); fetchData(activeTab) }
    } catch (err) { console.error(err) }
    finally { setAdjusting(false) }
  }

  const handleQuickAdd = async (user: UserSearchResult) => {
    setShowSearch(false); setSearchQuery(''); setSearchResults([])
    setAdjustModal({ user: { ...user, username: user.username || undefined, image: undefined } })
  }

  const handleProfitAdjust = async (isAdd: boolean) => {
    if (!profitAmount) return
    setProfitAdjusting(true)
    try {
      const amount = isAdd ? Math.abs(Number(profitAmount)) : -Math.abs(Number(profitAmount))
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust-profit', amount, reason: profitReason }),
      })
      if (res.ok) { setShowProfitAdjust(false); setProfitAmount(''); setProfitReason(''); fetchData('overview') }
    } catch (err) { console.error(err) }
    finally { setProfitAdjusting(false) }
  }

  const formatNumber = (n: number) => n.toLocaleString('tr-TR')
  const formatCurrency = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
  const formatDate = (d: string) => new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // Clickable user name component
  const ClickableUser = ({ user, showImage }: { user: { id: string; name: string; username?: string; image?: string | null } | null; showImage?: boolean }) => {
    if (!user) return <span className="text-gray-500">-</span>
    return (
      <button onClick={() => openUserProfile(user.id)} className="flex items-center gap-2 hover:bg-white/10 rounded-lg px-1.5 py-0.5 transition-all text-left group">
        {showImage && user.image && (
          <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
            <Image src={user.image} alt={user.name} fill className="object-cover" />
          </div>
        )}
        <span className="text-sm text-purple-300 group-hover:text-purple-100 underline decoration-dotted underline-offset-2">
          {user.name || user.username || 'Kullanıcı'}
        </span>
      </button>
    )
  }

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Genel Bakış', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'gift-history', label: 'Hediye Geçmişi', icon: <Gift className="w-4 h-4" /> },
    { key: 'top-earners', label: 'En Çok Kazanan', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'commission-settings', label: 'Komisyon Ayarları', icon: <Settings className="w-4 h-4" /> },
    { key: 'top-gift-receivers', label: 'Hediye Alan', icon: <Gift className="w-4 h-4" /> },
    { key: 'top-gift-senders', label: 'Hediye Atan', icon: <ArrowUpRight className="w-4 h-4" /> },
    { key: 'top-jeton-holders', label: 'Jeton Sıralaması', icon: <Coins className="w-4 h-4" /> },
    { key: 'top-cfc-holders', label: 'CFC Sıralaması', icon: <Crown className="w-4 h-4" /> },
  ]

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center "><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
  }

  return (
    <div className="min-h-screen  text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">💰 Finans Yönetimi</h1>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowProfitAdjust(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl hover:from-amber-500 hover:to-yellow-500 transition-all text-sm font-medium">
              <DollarSign className="w-4 h-4" /> Kâr/Zarar Düzenle
            </button>
            <button onClick={() => setShowSearch(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl hover:from-purple-500 hover:to-fuchsia-500 transition-all text-sm font-medium">
              <Plus className="w-4 h-4" /> Jeton Ekle/Çıkar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-purple-600/50 border border-purple-400/50 text-purple-200'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Date Period Filter */}
        {!['commission-settings', 'top-jeton-holders', 'top-cfc-holders'].includes(activeTab) && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400 mr-1">Tarih Aralığı:</span>
              {(['all', 'daily', 'weekly', 'monthly', 'yearly', 'custom'] as const).map((p) => {
                const labels: Record<string, string> = { all: 'Tümü', daily: 'Bugün', weekly: 'Son 7 Gün', monthly: 'Bu Ay', yearly: 'Bu Yıl', custom: 'Özel Tarih' }
                return (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      period === p ? 'bg-amber-600/40 border border-amber-400/50 text-amber-200' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}>
                    {labels[p]}
                  </button>
                )
              })}
            </div>
            {period === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400">Başlangıç:</label>
                  <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-amber-400/50 focus:outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400">Bitiş:</label>
                  <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-amber-400/50 focus:outline-none" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {activeTab === 'overview' && overview && <OverviewSection data={overview} formatNumber={formatNumber} formatCurrency={formatCurrency} onAdjustProfit={() => setShowProfitAdjust(true)} />}
              {activeTab === 'commission-settings' && commissionSettings && <CommissionSettingsSection settings={commissionSettings} onUpdate={() => fetchData('commission-settings')} />}
              {activeTab === 'gift-history' && <GiftHistorySection gifts={giftHistory} formatNumber={formatNumber} formatDate={formatDate} ClickableUser={ClickableUser} />}
              {activeTab === 'top-earners' && <EarnersSection data={rankedUsers} formatNumber={formatNumber} ClickableUser={ClickableUser} onAdjust={(u) => setAdjustModal({ user: u.user })} />}
              {activeTab === 'top-gift-receivers' && <RankingSection title="En Çok Hediye Alanlar" data={rankedUsers} type="receiver" onAdjust={(u) => setAdjustModal({ user: u.user })} formatNumber={formatNumber} ClickableUser={ClickableUser} />}
              {activeTab === 'top-gift-senders' && <RankingSection title="En Çok Hediye Atanlar" data={rankedUsers} type="sender" onAdjust={(u) => setAdjustModal({ user: u.user })} formatNumber={formatNumber} ClickableUser={ClickableUser} />}
              {activeTab === 'top-jeton-holders' && <HoldersSection title="En Çok Jetona Sahip Kullanıcılar" data={holders} type="jeton" onAdjust={(u) => { setAdjustModal({ user: u }); setAdjustCurrency('jeton') }} formatNumber={formatNumber} ClickableUser={ClickableUser} />}
              {activeTab === 'top-cfc-holders' && <HoldersSection title="En Çok CFC Sahibi Kullanıcılar" data={holders} type="cfc" onAdjust={(u) => { setAdjustModal({ user: u }); setAdjustCurrency('cfc') }} formatNumber={formatNumber} ClickableUser={ClickableUser} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ===== MODALS ===== */}

      {/* Adjust Balance Modal */}
      <AnimatePresence>
        {adjustModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setAdjustModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-purple-200">Bakiye Düzenle</h3>
                <button onClick={() => setAdjustModal(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-white/5 rounded-xl p-3 mb-4">
                <p className="text-sm text-gray-300">{(adjustModal.user as HolderUser).name || 'Kullanıcı'}</p>
                <p className="text-xs text-gray-500">{(adjustModal.user as HolderUser).email}</p>
              </div>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setAdjustCurrency('jeton')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${adjustCurrency === 'jeton' ? 'bg-yellow-600/40 border border-yellow-400/50 text-yellow-200' : 'bg-white/5 border border-white/10 text-gray-400'}`}>🪙 Jeton</button>
                <button onClick={() => setAdjustCurrency('cfc')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${adjustCurrency === 'cfc' ? 'bg-blue-600/40 border border-blue-400/50 text-blue-200' : 'bg-white/5 border border-white/10 text-gray-400'}`}>💎 CFC</button>
              </div>
              <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="Miktar" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-400/50 focus:outline-none mb-3" />
              <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Sebep (isteğe bağlı)" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-400/50 focus:outline-none mb-3" />
              <div className="flex gap-3">
                <button onClick={() => handleAdjust(true)} disabled={adjusting || !adjustAmount} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all text-sm font-bold disabled:opacity-50">
                  {adjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ekle
                </button>
                <button onClick={() => handleAdjust(false)} disabled={adjusting || !adjustAmount} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl hover:from-red-500 hover:to-rose-500 transition-all text-sm font-bold disabled:opacity-50">
                  {adjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minus className="w-4 h-4" />} Çıkar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowSearch(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-purple-200">Kullanıcı Ara</h3>
                <button onClick={() => setShowSearch(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); searchUsers(e.target.value) }} placeholder="İsim, email veya kullanıcı adı..." className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-400/50 focus:outline-none" autoFocus />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searching && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-purple-400" /></div>}
                {searchResults.map((user) => (
                  <button key={user.id} onClick={() => handleQuickAdd(user)} className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-left">
                    <div><p className="text-sm font-medium text-white">{user.name}</p><p className="text-xs text-gray-400">{user.username ? `@${user.username}` : user.email}</p></div>
                    <div className="text-right text-xs"><p className="text-yellow-400">🪙 {formatNumber(user.jetonBalance)}</p><p className="text-blue-400">💎 {formatNumber(user.credits)}</p></div>
                  </button>
                ))}
                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && <p className="text-center text-gray-500 py-4 text-sm">Kullanıcı bulunamadı</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profit Adjust Modal */}
      <AnimatePresence>
        {showProfitAdjust && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowProfitAdjust(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-[#1a0a2e] border border-amber-500/30 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-amber-200">💰 Kâr/Zarar Düzenleme</h3>
                <button onClick={() => setShowProfitAdjust(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-gray-400 mb-4">Genel kâr/zarar hesabına manuel ekleme/çıkarma yapın. Tutar TRY cinsindendir.</p>
              <input type="number" value={profitAmount} onChange={(e) => setProfitAmount(e.target.value)} placeholder="Tutar (TRY)" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-amber-400/50 focus:outline-none mb-3" />
              <input type="text" value={profitReason} onChange={(e) => setProfitReason(e.target.value)} placeholder="Sebep (isteğe bağlı)" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-amber-400/50 focus:outline-none mb-4" />
              <div className="flex gap-3">
                <button onClick={() => handleProfitAdjust(true)} disabled={profitAdjusting || !profitAmount} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-sm font-bold disabled:opacity-50">
                  {profitAdjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Kâr Ekle
                </button>
                <button onClick={() => handleProfitAdjust(false)} disabled={profitAdjusting || !profitAmount} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl text-sm font-bold disabled:opacity-50">
                  {profitAdjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minus className="w-4 h-4" />} Zarar Ekle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== USER PROFILE POPUP ===== */}
      <AnimatePresence>
        {(userProfile || userProfileLoading) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setUserProfile(null); setEditField(null) }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
              {userProfileLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
              ) : userProfile && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-purple-200">👤 Kullanıcı Profili</h3>
                    <button onClick={() => { setUserProfile(null); setEditField(null) }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>

                  {/* User Info */}
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3">
                      {userProfile.user.image && (
                        <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                          <Image src={userProfile.user.image} alt="" fill className="object-cover" />
                        </div>
                      )}
                      <div>
                        <p className="text-lg font-bold text-white">{userProfile.user.name}</p>
                        <p className="text-xs text-gray-400">{userProfile.user.username ? `@${userProfile.user.username}` : ''} • {userProfile.user.email}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 rounded-full text-purple-300">{userProfile.user.role}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 rounded-full text-amber-300">{userProfile.user.membership}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Balances - Editable */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Jeton Balance */}
                    <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-yellow-400/80">🪙 Jeton</p>
                        <button onClick={() => { setEditField('jeton'); setEditValue(String(userProfile.user.jetonBalance)) }} className="text-gray-500 hover:text-yellow-400"><Edit3 className="w-3 h-3" /></button>
                      </div>
                      {editField === 'jeton' ? (
                        <div className="flex gap-1 mt-1">
                          <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full px-2 py-1 bg-black/30 border border-yellow-500/30 rounded text-sm text-white focus:outline-none" autoFocus />
                          <button onClick={() => handleEditBalance(userProfile.user.id, 'jeton', Number(editValue) - userProfile.user.jetonBalance)} className="px-2 py-1 bg-yellow-600/50 rounded text-xs text-yellow-200">✓</button>
                        </div>
                      ) : (
                        <p className="text-xl font-bold text-yellow-400">{formatNumber(userProfile.user.jetonBalance)}</p>
                      )}
                    </div>
                    {/* CFC Balance */}
                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-blue-400/80">💎 CFC</p>
                        <button onClick={() => { setEditField('cfc'); setEditValue(String(userProfile.user.credits)) }} className="text-gray-500 hover:text-blue-400"><Edit3 className="w-3 h-3" /></button>
                      </div>
                      {editField === 'cfc' ? (
                        <div className="flex gap-1 mt-1">
                          <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full px-2 py-1 bg-black/30 border border-blue-500/30 rounded text-sm text-white focus:outline-none" autoFocus />
                          <button onClick={() => handleEditBalance(userProfile.user.id, 'cfc', Number(editValue) - userProfile.user.credits)} className="px-2 py-1 bg-blue-600/50 rounded text-xs text-blue-200">✓</button>
                        </div>
                      ) : (
                        <p className="text-xl font-bold text-blue-400">{formatNumber(userProfile.user.credits)}</p>
                      )}
                    </div>
                  </div>

                  {/* Financial Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500 uppercase">Hediye Gönderdi</p>
                      <p className="text-sm font-bold text-pink-400">{formatNumber(userProfile.financials.totalGiftsSent)} jeton</p>
                      <p className="text-[10px] text-gray-500">{userProfile.financials.giftsSentCount} hediye</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500 uppercase">Hediye Aldı</p>
                      <p className="text-sm font-bold text-green-400">{formatNumber(userProfile.financials.totalGiftsReceived)} jeton</p>
                      <p className="text-[10px] text-gray-500">{userProfile.financials.giftsReceivedCount} hediye</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500 uppercase">Seans Harcaması</p>
                      <p className="text-sm font-bold text-amber-400">{formatNumber(userProfile.financials.sessionSpending)} jeton</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500 uppercase">Falcı Kazancı</p>
                      <p className="text-sm font-bold text-emerald-400">{formatNumber(userProfile.financials.tellerEarnings)} jeton</p>
                      <p className="text-[10px] text-gray-500">{userProfile.financials.tellerSessions} seans</p>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  {userProfile.recentTransactions.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2 font-medium">Son İşlemler</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {userProfile.recentTransactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 bg-white/5 rounded-lg text-xs">
                            <div>
                              <span className={tx.amount > 0 ? 'text-green-400' : 'text-red-400'}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
                              <span className="text-gray-500 ml-2">{tx.description}</span>
                            </div>
                            <span className="text-gray-600 text-[10px]">{formatDate(tx.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ========= Sub Components =========

function OverviewSection({ data, formatNumber, formatCurrency, onAdjustProfit }: { data: OverviewData; formatNumber: (n: number) => string; formatCurrency: (n: number) => string; onAdjustProfit: () => void }) {
  const isProfit = data.platformProfit >= 0
  const bd = data.breakdown
  const cm = data.commissions

  // Jeton harcama türleri label map
  const spendLabels: Record<string, string> = {
    spend: 'Bana Özel', gift: 'Hediye', purchase: 'Satın Alma', stream: 'Canlı Yayın',
    fortune: 'Fal', membership: 'Üyelik', room: 'Oda Oluşturma', session: 'Canlı Seans',
    dream: 'Rüya Yorumu', bana_ozel: 'Bana Özel', live_session: 'Canlı Seans',
  }
  const incomeLabels: Record<string, string> = {
    purchase: 'Satın Alma', daily_bonus: 'Günlük Bonus', streak_bonus: 'Seri Bonusu',
    task: 'Görev Bonusu', welcome: 'Hoşgeldin', referral: 'Referans', gift_received: 'Hediye Alındı',
    admin: 'Admin Ekleme', refund: 'İade',
  }

  return (
    <div className="space-y-6">
      {/* Kâr/Zarar Ana Kartı */}
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className={`relative overflow-hidden rounded-2xl p-6 border ${isProfit ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-500/30' : 'bg-gradient-to-r from-red-900/40 to-rose-900/40 border-red-500/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isProfit ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {isProfit ? <TrendingUp className="w-8 h-8 text-green-400" /> : <TrendingDown className="w-8 h-8 text-red-400" />}
            </div>
            <div>
              <p className="text-sm text-gray-300">{isProfit ? '✅ Siteniz KÂRDA' : '⚠️ Siteniz ZARARDA'}</p>
              <p className={`text-3xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(Math.abs(data.platformProfit))}</p>
              <p className="text-xs text-gray-400 mt-1">Yayıncı/falcı yüzdeleri düşüldükten sonraki net durum</p>
            </div>
          </div>
          <button onClick={onAdjustProfit} className="hidden md:flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all text-xs font-medium text-gray-300">
            <DollarSign className="w-3.5 h-3.5" /> Manuel Düzenle
          </button>
        </div>
      </motion.div>

      {/* Genel Bakış Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Coins className="w-5 h-5 text-yellow-400" />} label="Dolaşımdaki Jeton" value={formatNumber(data.totalJeton)} color="yellow" />
        <StatCard icon={<Crown className="w-5 h-5 text-blue-400" />} label="Dolaşımdaki CFC" value={formatNumber(data.totalCfc)} color="blue" />
        <StatCard icon={<DollarSign className="w-5 h-5 text-green-400" />} label="Toplam Gelir (TRY)" value={formatCurrency(data.totalRevenue)} color="green" />
        <StatCard icon={<Users className="w-5 h-5 text-orange-400" />} label="Yayıncı/Falcı Kazançları" value={formatNumber(data.totalTellerEarnings) + ' jeton'} color="orange" />
        <StatCard icon={<Gift className="w-5 h-5 text-pink-400" />} label="Hediye Harcamaları" value={formatNumber(data.totalGiftSpent) + ' jeton'} color="pink" />
        <StatCard icon={<Star className="w-5 h-5 text-amber-400" />} label="Seans Harcamaları" value={formatNumber(data.totalSessionSpent) + ' jeton'} color="amber" />
        <StatCard icon={<Wallet className="w-5 h-5 text-purple-400" />} label="Komisyon Geliri" value={formatNumber(data.totalCommission) + ' jeton'} color="purple" />
        <StatCard icon={<Award className="w-5 h-5 text-cyan-400" />} label="Net Durum" value={formatCurrency(data.platformProfit)} color={isProfit ? 'green' : 'red'} />
      </div>

      {/* Jeton Harcama Kaynakları Detaylı */}
      {bd && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-purple-200 mb-4 flex items-center gap-2">
            <ArrowDownRight className="w-4 h-4 text-red-400" /> Jeton Harcama Kaynakları (Nereden Harcandı?)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MiniStat label="🎁 Yayın Hediyeleri" value={formatNumber(bd.streamGiftSpent)} sub="jeton" />
            <MiniStat label="💬 Sohbet Hediyeleri" value={formatNumber(bd.chatGiftSpent)} sub="jeton" />
            <MiniStat label="⭐ Falcı Hediyeleri" value={formatNumber(bd.tellerGiftSpent)} sub="jeton" />
            <MiniStat label="📹 Canlı Seanslar" value={formatNumber(bd.sessionSpent)} sub="jeton" />
            <MiniStat label="✨ Bana Özel" value={formatNumber(bd.banaOzelSpent)} sub={`${bd.banaOzelCount} kullanım`} />
            <MiniStat label="👑 Üyelik Satışları" value={formatNumber(bd.membershipSpent)} sub={`${bd.membershipCount} satış`} />
          </div>
        </div>
      )}

      {/* Komisyon Detayları */}
      {cm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-green-200 mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-green-400" /> Siteye Kalan Gelirler (Komisyon & Yakılan Jetonlar)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MiniStat label={`📹 Yayın Komisyonu (%${cm.broadcasterCommRate})`} value={formatNumber(cm.streamCommission)} sub="jeton" highlight />
            <MiniStat label={`⭐ Seans Komisyonu (%${cm.commissionRate})`} value={formatNumber(cm.sessionCommission)} sub="jeton" highlight />
            <MiniStat label="💬 Sohbet Komisyonu" value={formatNumber(cm.chatCommission)} sub="jeton" highlight />
            <MiniStat label="🔥 Yakılan Jetonlar" value={formatNumber(cm.totalBurnedJetons)} sub="Bana Özel + Üyelik" highlight />
          </div>
          <p className="text-[10px] text-gray-500 mt-3">💡 Yakılan jetonlar: Herhangi bir kullanıcıya gitmeyen, tamamen siteye kalan jeton harcamaları</p>
        </div>
      )}

      {/* Jeton Harcama & Gelir Detayları (JetonTransaction bazlı) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.jetonSpendBreakdown && Object.keys(data.jetonSpendBreakdown).length > 0 && (
          <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-red-300 mb-3 flex items-center gap-2">
              <Minus className="w-4 h-4" /> Jeton Çıkışları (İşlem Bazlı)
            </h3>
            <div className="space-y-2">
              {Object.entries(data.jetonSpendBreakdown).sort((a, b) => b[1].amount - a[1].amount).map(([type, info]) => (
                <div key={type} className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-xs text-gray-300">{spendLabels[type] || type}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-400">{formatNumber(info.amount)}</span>
                    <span className="text-[10px] text-gray-500 ml-1">({info.count}x)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.jetonIncomeBreakdown && Object.keys(data.jetonIncomeBreakdown).length > 0 && (
          <div className="bg-green-900/10 border border-green-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-green-300 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Jeton Girişleri (İşlem Bazlı)
            </h3>
            <div className="space-y-2">
              {Object.entries(data.jetonIncomeBreakdown).sort((a, b) => b[1].amount - a[1].amount).map(([type, info]) => (
                <div key={type} className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-xs text-gray-300">{incomeLabels[type] || type}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-400">{formatNumber(info.amount)}</span>
                    <span className="text-[10px] text-gray-500 ml-1">({info.count}x)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 border border-white/10'}`}>
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'from-green-900/30 to-green-900/10 border-green-500/20', orange: 'from-orange-900/30 to-orange-900/10 border-orange-500/20',
    yellow: 'from-yellow-900/30 to-yellow-900/10 border-yellow-500/20', blue: 'from-blue-900/30 to-blue-900/10 border-blue-500/20',
    pink: 'from-pink-900/30 to-pink-900/10 border-pink-500/20', amber: 'from-amber-900/30 to-amber-900/10 border-amber-500/20',
    purple: 'from-purple-900/30 to-purple-900/10 border-purple-500/20', cyan: 'from-cyan-900/30 to-cyan-900/10 border-cyan-500/20',
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

// Gift History Section - shows sender, receiver, source
function GiftHistorySection({ gifts, formatNumber, formatDate, ClickableUser }: {
  gifts: GiftHistoryItem[]; formatNumber: (n: number) => string; formatDate: (d: string) => string;
  ClickableUser: React.ComponentType<{ user: any; showImage?: boolean }>
}) {
  const sourceLabel = (type: string) => {
    if (type === 'chat_room') return { icon: <MessageSquare className="w-3 h-3" />, label: 'Sohbet Odası', color: 'text-blue-400' }
    if (type === 'stream') return { icon: <Video className="w-3 h-3" />, label: 'Canlı Yayın', color: 'text-pink-400' }
    return { icon: <Star className="w-3 h-3" />, label: 'Canlı Falcı', color: 'text-purple-400' }
  }
  return (
    <div>
      <h2 className="text-lg font-bold text-purple-200 mb-4 flex items-center gap-2"><Gift className="w-5 h-5" /> Hediye Geçmişi</h2>
      {gifts.length === 0 ? (
        <p className="text-center text-gray-500 py-10">Henüz hediye verisi yok</p>
      ) : (
        <div className="space-y-2">
          {gifts.map((gift) => {
            const src = sourceLabel(gift.type)
            return (
              <motion.div key={`${gift.type}-${gift.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/8 transition-all">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0">{gift.giftIcon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <ClickableUser user={gift.sender} showImage />
                        <span className="text-gray-500 text-xs">→</span>
                        <ClickableUser user={gift.receiver} showImage />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`flex items-center gap-1 text-[10px] ${src.color}`}>{src.icon} {gift.sourceName}</span>
                        <span className="text-[10px] text-gray-600">{formatDate(gift.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-400">{formatNumber(gift.amount)} jeton</p>
                    {gift.commission > 0 && <p className="text-[10px] text-green-400/70">Komisyon: {formatNumber(gift.commission)}</p>}
                    <p className="text-[10px] text-gray-500">{gift.quantity}x {gift.giftName}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Top Earners Section
function EarnersSection({ data, formatNumber, ClickableUser, onAdjust }: {
  data: RankedUser[]; formatNumber: (n: number) => string;
  ClickableUser: React.ComponentType<{ user: any; showImage?: boolean }>;
  onAdjust: (u: RankedUser) => void
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-purple-200 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> En Çok Kazananlar</h2>
      <p className="text-xs text-gray-400 mb-4">Hediye, seans ve canlı yayın kazançları dahil toplam gelir sıralaması</p>
      {data.length === 0 ? (
        <p className="text-center text-gray-500 py-10">Henüz veri yok</p>
      ) : (
        <div className="space-y-2">
          {data.map((item, i) => (
            <motion.div key={item.user.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                  i === 0 ? 'bg-yellow-500/30 text-yellow-300' : i === 1 ? 'bg-gray-400/30 text-gray-300' : i === 2 ? 'bg-amber-700/30 text-amber-400' : 'bg-white/10 text-gray-400'
                }`}>{i + 1}</span>
                <ClickableUser user={item.user} showImage />
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold text-emerald-400">{formatNumber(item.totalEarnings || 0)} jeton</p>
                <button onClick={() => onAdjust(item)} className="p-1.5 bg-purple-600/30 border border-purple-400/30 rounded-lg hover:bg-purple-600/50 transition-all" title="Bakiye düzenle">
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

function CommissionSettingsSection({ settings, onUpdate }: { settings: CommissionSettings; onUpdate: () => void }) {
  const [values, setValues] = useState(settings)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => { setValues(settings) }, [settings])

  const handleSave = async (key: string, value: string) => {
    setSaving(key)
    try {
      const res = await fetch('/api/admin/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update-commission', key, value }) })
      if (res.ok) { setSaved(key); onUpdate(); setTimeout(() => setSaved(null), 2000) }
    } catch (err) { console.error(err) }
    finally { setSaving(null) }
  }

  const commissionItems = [
    { key: 'commission_rate', label: 'Canlı Falcı Seans Komisyonu', description: 'Seans bittiğinde falcının kazancından kesilen oran. Ör: %50 = yarısı siteye, yarısı falcıya.', icon: '🔮', color: 'purple',
      suggestions: [{ value: 20, label: 'Düşük' }, { value: 50, label: 'Yarı Yarıya' }, { value: 30, label: 'Standart' }] },
    { key: 'broadcaster_commission_rate', label: 'Canlı Yayıncı Hediye Komisyonu', description: 'Canlı yayında gönderilen hediyelerden platform payı.', icon: '📺', color: 'pink',
      suggestions: [{ value: 20, label: 'Düşük' }, { value: 30, label: 'Standart' }, { value: 50, label: 'Yarı Yarıya' }] },
    { key: 'chat_room_default_commission_rate', label: 'Sohbet Odası Hediye Komisyonu', description: 'Sohbet odalarında gönderilen hediyelerden varsayılan platform payı.', icon: '💬', color: 'blue',
      suggestions: [{ value: 10, label: 'Düşük' }, { value: 20, label: 'Standart' }, { value: 30, label: 'Yüksek' }] },
  ]

  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    purple: { bg: 'from-purple-900/30 to-purple-900/10', border: 'border-purple-500/20', text: 'text-purple-300' },
    pink: { bg: 'from-pink-900/30 to-pink-900/10', border: 'border-pink-500/20', text: 'text-pink-300' },
    blue: { bg: 'from-blue-900/30 to-blue-900/10', border: 'border-blue-500/20', text: 'text-blue-300' },
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-purple-200 mb-4 flex items-center gap-2"><Percent className="w-5 h-5" /> Komisyon Oranları</h2>
      <div className="space-y-4">
        {commissionItems.map((item) => {
          const colors = colorMap[item.color] || colorMap.purple
          const currentVal = values[item.key as keyof CommissionSettings] || '0'
          return (
            <div key={item.key} className={`bg-gradient-to-br ${colors.bg} ${colors.border} border rounded-2xl p-5`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h3 className={`text-sm font-bold ${colors.text}`}>{item.label}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 relative">
                  <input type="number" min="0" max="100" value={currentVal}
                    onChange={(e) => setValues({ ...values, [item.key]: e.target.value })}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white text-lg font-bold focus:border-purple-400/50 focus:outline-none" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                </div>
                <button onClick={() => handleSave(item.key, currentVal)} disabled={saving === item.key}
                  className={`px-4 py-3 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${
                    saved === item.key ? 'bg-green-600/50 text-green-200' : 'bg-purple-600/50 hover:bg-purple-600/70 text-purple-200'
                  }`}>
                  {saving === item.key ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === item.key ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved === item.key ? 'Kaydedildi' : 'Kaydet'}
                </button>
              </div>
              <div className="flex gap-2">
                {item.suggestions.map((s) => (
                  <button key={s.value} onClick={() => setValues({ ...values, [item.key]: String(s.value) })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      currentVal === String(s.value) ? `${colors.text} bg-white/10 border border-white/20` : 'text-gray-500 bg-white/5 border border-white/5 hover:bg-white/10 hover:text-gray-300'
                    }`}>
                    %{s.value} - {s.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Ranking Section (gift receivers / senders)
function RankingSection({ title, data, type, onAdjust, formatNumber, ClickableUser }: {
  title: string; data: RankedUser[]; type: 'receiver' | 'sender';
  onAdjust: (u: RankedUser) => void; formatNumber: (n: number) => string;
  ClickableUser: React.ComponentType<{ user: any; showImage?: boolean }>
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-purple-200 mb-4 flex items-center gap-2">
        {type === 'receiver' ? <Gift className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />} {title}
      </h2>
      {data.length === 0 ? (
        <p className="text-center text-gray-500 py-10">Henüz veri yok</p>
      ) : (
        <div className="space-y-2">
          {data.map((item, i) => (
            <motion.div key={item.user.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                  i === 0 ? 'bg-yellow-500/30 text-yellow-300' : i === 1 ? 'bg-gray-400/30 text-gray-300' : i === 2 ? 'bg-amber-700/30 text-amber-400' : 'bg-white/10 text-gray-400'
                }`}>{i + 1}</span>
                <ClickableUser user={item.user} showImage />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-yellow-400">{formatNumber(type === 'receiver' ? (item.totalReceived || 0) : (item.totalSent || 0))} jeton</p>
                  <p className="text-[10px] text-gray-500">{formatNumber(item.giftCount || 0)} hediye</p>
                </div>
                <button onClick={() => onAdjust(item)} className="p-1.5 bg-purple-600/30 border border-purple-400/30 rounded-lg hover:bg-purple-600/50 transition-all" title="Bakiye düzenle">
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

// Holders Section (jeton / cfc holders)
function HoldersSection({ title, data, type, onAdjust, formatNumber, ClickableUser }: {
  title: string; data: HolderUser[]; type: 'jeton' | 'cfc';
  onAdjust: (u: HolderUser) => void; formatNumber: (n: number) => string;
  ClickableUser: React.ComponentType<{ user: any; showImage?: boolean }>
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-purple-200 mb-4 flex items-center gap-2">
        {type === 'jeton' ? <Coins className="w-5 h-5" /> : <Crown className="w-5 h-5" />} {title}
      </h2>
      {data.length === 0 ? (
        <p className="text-center text-gray-500 py-10">Henüz veri yok</p>
      ) : (
        <div className="space-y-2">
          {data.map((user, i) => (
            <motion.div key={user.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                  i === 0 ? 'bg-yellow-500/30 text-yellow-300' : i === 1 ? 'bg-gray-400/30 text-gray-300' : i === 2 ? 'bg-amber-700/30 text-amber-400' : 'bg-white/10 text-gray-400'
                }`}>{i + 1}</span>
                <ClickableUser user={{ id: user.id, name: user.name, username: user.username, image: user.image }} showImage />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-sm font-bold ${type === 'jeton' ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {type === 'jeton' ? '🪙' : '💎'} {formatNumber(type === 'jeton' ? user.jetonBalance : user.credits)}
                  </p>
                </div>
                <button onClick={() => onAdjust(user)} className="p-1.5 bg-purple-600/30 border border-purple-400/30 rounded-lg hover:bg-purple-600/50 transition-all" title="Bakiye düzenle">
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
