'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, Plus, Edit2, Trash2, Save, X, Loader2, Star, Coins,
  CreditCard, Clock, Gift, Percent, BadgeCheck, Users, Search,
  RefreshCw, UserPlus, Calendar, RotateCcw, XCircle, CheckCircle,
  TrendingUp, BarChart3, Filter
} from 'lucide-react'
import { format } from 'date-fns'

interface MembershipPlan {
  id: string
  name: string
  nameEn: string | null
  description: string | null
  descriptionEn: string | null
  tier: string
  durationDays: number
  priceType: string
  price: number
  currency: string
  features: string | null
  bonusJetons: number
  discountPercent: number
  prioritySupport: boolean
  exclusiveBadge: string | null
  sortOrder: number
  isActive: boolean
  isFeatured: boolean
  _count?: { purchases: number }
}

interface MembershipPurchase {
  id: string
  userId: string
  planId: string
  priceType: string
  pricePaid: number
  currency: string
  startsAt: string
  expiresAt: string
  status: string
  createdAt: string
  plan: {
    name: string
    tier: string
    durationDays: number
  }
  user: {
    id: string
    name: string
    email: string
    username: string | null
    image: string | null
    membership: string
    membershipExpiresAt: string | null
  } | null
}

interface PurchaseStats {
  byStatus: { [key: string]: number }
  totalMoneyRevenue: number
  totalJetonSpent: number
}

const TIER_OPTIONS = [
  { value: 'basic', label: 'Basic', color: 'text-gray-400' },
  { value: 'premium', label: 'Premium', color: 'text-blue-400' },
  { value: 'gold', label: 'Gold', color: 'text-amber-400' },
  { value: 'diamond', label: 'Diamond', color: 'text-purple-400' }
]

const PRICE_TYPE_OPTIONS = [
  { value: 'jeton', label: 'Jeton', icon: Coins },
  { value: 'money', label: 'Para (TL)', icon: CreditCard }
]

type TabType = 'plans' | 'purchases'

export default function AdminMembershipsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const { theme } = useSiteTheme()

  const [activeTab, setActiveTab] = useState<TabType>('plans')
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [purchases, setPurchases] = useState<MembershipPurchase[]>([])
  const [purchaseStats, setPurchaseStats] = useState<PurchaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null)
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<MembershipPurchase | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<Array<{ id: string; name: string; email: string; username: string | null }>>([])
  const [grantData, setGrantData] = useState({
    userId: '',
    userName: '',
    planId: '',
    customTier: 'gold',
    durationDays: 30,
    freeGrant: true
  })
  const [extendDays, setExtendDays] = useState(30)

  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    tier: 'gold',
    durationDays: 30,
    priceType: 'jeton',
    price: 100,
    currency: 'TRY',
    features: '',
    bonusJetons: 0,
    discountPercent: 0,
    prioritySupport: false,
    exclusiveBadge: '',
    sortOrder: 0,
    isActive: true,
    isFeatured: false
  })

  // Theme colors
  const isFacebook = theme === 'facebook'
  const isCosmic = theme === 'cosmic'
  const bgColor = isFacebook ? 'bg-[#f0f2f5]' : isCosmic ? 'bg-[#0a1628]' : 'bg-[#0f0520]'
  const cardBg = isFacebook ? 'bg-white border-gray-200' : isCosmic ? 'bg-white/5 border-blue-500/20' : 'bg-[#1a0a2e]/80 border-fuchsia-500/30'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-500' : isCosmic ? 'text-blue-300' : 'text-purple-300'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const inputBg = isFacebook ? 'bg-gray-50 border-gray-300 text-gray-900' : isCosmic ? 'bg-blue-900/30 border-blue-700/50 text-blue-100' : 'bg-purple-900/30 border-fuchsia-500/30 text-white'
  const tabActive = isFacebook ? 'bg-blue-500 text-white' : isCosmic ? 'bg-blue-500 text-white' : 'bg-fuchsia-500 text-white'
  const tabInactive = isFacebook ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : isCosmic ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/30' : 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/30'

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      router.push(`/`)
      return
    }
    fetchPlans()
    fetchPurchases()
  }, [session, status])

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/memberships')
      if (res.ok) {
        setPlans(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchPurchases = async () => {
    try {
      const url = statusFilter === 'all' 
        ? '/api/admin/memberships/purchases' 
        : `/api/admin/memberships/purchases?status=${statusFilter}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setPurchases(data.purchases || [])
        setPurchaseStats(data.stats || null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (activeTab === 'purchases') {
      fetchPurchases()
    }
  }, [statusFilter, activeTab])

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([])
      return
    }
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setUserSearchResults(data.users || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleGrantMembership = async () => {
    if (!grantData.userId) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/memberships/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: grantData.userId,
          planId: grantData.planId || null,
          durationDays: grantData.durationDays,
          customTier: grantData.customTier,
          freeGrant: grantData.freeGrant
        })
      })
      if (res.ok) {
        fetchPurchases()
        setShowGrantModal(false)
        setGrantData({ userId: '', userName: '', planId: '', customTier: 'gold', durationDays: 30, freeGrant: true })
        setSearchQuery('')
        setUserSearchResults([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleExtendMembership = async () => {
    if (!selectedPurchase) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/memberships/purchases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId: selectedPurchase.id,
          action: 'extend',
          extendDays
        })
      })
      if (res.ok) {
        fetchPurchases()
        setShowExtendModal(false)
        setSelectedPurchase(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelMembership = async (purchaseId: string) => {
    if (!confirm('Bu üyeliği iptal etmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch('/api/admin/memberships/purchases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId, action: 'cancel' })
      })
      if (res.ok) {
        fetchPurchases()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleReactivateMembership = async (purchaseId: string) => {
    try {
      const res = await fetch('/api/admin/memberships/purchases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId, action: 'reactivate', extendDays: 30 })
      })
      if (res.ok) {
        fetchPurchases()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const method = editingPlan ? 'PUT' : 'POST'
      const body = editingPlan ? { id: editingPlan.id, ...formData } : formData

      const res = await fetch('/api/admin/memberships', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        fetchPlans()
        setShowForm(false)
        setEditingPlan(null)
        resetForm()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu planı silmek istediğinize emin misiniz?')) return

    try {
      const res = await fetch(`/api/admin/memberships?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchPlans()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      nameEn: plan.nameEn || '',
      description: plan.description || '',
      descriptionEn: plan.descriptionEn || '',
      tier: plan.tier,
      durationDays: plan.durationDays,
      priceType: plan.priceType,
      price: plan.price,
      currency: plan.currency,
      features: plan.features || '',
      bonusJetons: plan.bonusJetons,
      discountPercent: plan.discountPercent,
      prioritySupport: plan.prioritySupport,
      exclusiveBadge: plan.exclusiveBadge || '',
      sortOrder: plan.sortOrder,
      isActive: plan.isActive,
      isFeatured: plan.isFeatured
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      nameEn: '',
      description: '',
      descriptionEn: '',
      tier: 'gold',
      durationDays: 30,
      priceType: 'jeton',
      price: 100,
      currency: 'TRY',
      features: '',
      bonusJetons: 0,
      discountPercent: 0,
      prioritySupport: false,
      exclusiveBadge: '',
      sortOrder: 0,
      isActive: true,
      isFeatured: false
    })
  }

  const getTierColor = (tier: string) => {
    return TIER_OPTIONS.find(t => t.value === tier)?.color || 'text-gray-400'
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <Loader2 className={`w-8 h-8 ${accentColor} animate-spin`} />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bgColor} pt-20 pb-10 px-4`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Crown className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${textPrimary}`}>
                {'Gold Üyelik Yönetimi'}
              </h1>
              <p className={`${textSecondary} text-sm`}>
                {plans.length} {'plan'} • {purchases.length} {'satın alma'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'plans' ? tabActive : tabInactive}`}
          >
            <Crown className="w-4 h-4" />
            {'Planlar'}
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'purchases' ? tabActive : tabInactive}`}
          >
            <Users className="w-4 h-4" />
            {'Satın Alımlar'}
          </button>
        </div>

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { resetForm(); setEditingPlan(null); setShowForm(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-semibold rounded-xl hover:opacity-90 transition-all"
              >
                <Plus className="w-4 h-4" />
                {'Yeni Plan'}
              </button>
            </div>
            <div className="space-y-3">
              {plans.map((plan) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${cardBg} border ${plan.isActive ? '' : 'opacity-60'} rounded-xl p-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                        plan.tier === 'diamond' ? 'from-purple-400 to-purple-600' :
                        plan.tier === 'gold' ? 'from-amber-400 to-amber-600' :
                        plan.tier === 'premium' ? 'from-blue-400 to-blue-600' :
                        'from-gray-400 to-gray-600'
                      } flex items-center justify-center`}>
                        <Crown className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`${textPrimary} font-semibold`}>{plan.name}</span>
                          {plan.isFeatured && (
                            <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3" /> {'Öne Çıkan'}
                            </span>
                          )}
                          {!plan.isActive && (
                            <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                              {'Pasif'}
                            </span>
                          )}
                        </div>
                        <div className={`flex items-center gap-3 text-sm ${textSecondary}`}>
                          <span className={getTierColor(plan.tier)}>{plan.tier.toUpperCase()}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {plan.durationDays} {'gün'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {plan.priceType === 'jeton' ? <Coins className="w-3 h-3 text-amber-400" /> : <CreditCard className="w-3 h-3 text-green-400" />}
                            {plan.price} {plan.priceType === 'jeton' ? 'jeton' : 'TL'}
                          </span>
                          {plan._count && plan._count.purchases > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-green-400">
                                <Users className="w-3 h-3" /> {plan._count.purchases}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(plan)}
                        className={`p-2 ${isFacebook ? 'bg-blue-50 text-blue-600' : isCosmic ? 'bg-blue-500/20 text-blue-400' : 'bg-fuchsia-500/20 text-fuchsia-400'} rounded-lg hover:opacity-80 transition-all`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Features preview */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {plan.bonusJetons > 0 && (
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Gift className="w-3 h-3" /> +{plan.bonusJetons} bonus
                      </span>
                    )}
                    {plan.discountPercent > 0 && (
                      <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Percent className="w-3 h-3" /> %{plan.discountPercent} indirim
                      </span>
                    )}
                    {plan.prioritySupport && (
                      <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" /> VIP Destek
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}

              {plans.length === 0 && (
                <div className={`text-center py-12 ${textSecondary}`}>
                  <Crown className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{'Henüz üyelik planı yok'}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Purchases Tab */}
        {activeTab === 'purchases' && (
          <>
            {/* Stats Cards */}
            {purchaseStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className={`${cardBg} border rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className={`text-sm ${textSecondary}`}>{'Aktif'}</span>
                  </div>
                  <p className={`text-xl font-bold ${textPrimary}`}>{purchaseStats.byStatus.active || 0}</p>
                </div>
                <div className={`${cardBg} border rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <span className={`text-sm ${textSecondary}`}>{'Süresi Dolan'}</span>
                  </div>
                  <p className={`text-xl font-bold ${textPrimary}`}>{purchaseStats.byStatus.expired || 0}</p>
                </div>
                <div className={`${cardBg} border rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className={`text-sm ${textSecondary}`}>{'Jeton Harcanan'}</span>
                  </div>
                  <p className={`text-xl font-bold ${textPrimary}`}>{purchaseStats.totalJetonSpent.toLocaleString()}</p>
                </div>
                <div className={`${cardBg} border rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className={`text-sm ${textSecondary}`}>{'Toplam Gelir'}</span>
                  </div>
                  <p className={`text-xl font-bold ${textPrimary}`}>{(purchaseStats.totalMoneyRevenue / 100).toLocaleString()} TL</p>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGrantModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-semibold rounded-xl hover:opacity-90 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  {'Üyelik Ver'}
                </button>
                <button
                  onClick={fetchPurchases}
                  className={`p-2 ${tabInactive} rounded-xl`}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className={`w-4 h-4 ${textSecondary}`} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`${inputBg} border rounded-lg px-3 py-2 text-sm`}
                >
                  <option value="all">{'Tümü'}</option>
                  <option value="active">{'Aktif'}</option>
                  <option value="expired">{'Süresi Dolan'}</option>
                  <option value="cancelled">{'İptal'}</option>
                </select>
              </div>
            </div>

            {/* Purchases List */}
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <motion.div
                  key={purchase.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${cardBg} border rounded-xl p-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {purchase.user?.image ? (
                        <img loading="lazy" src={purchase.user.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center`}>
                          <Crown className="w-5 h-5 text-black" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`${textPrimary} font-semibold`}>
                            {purchase.user?.name || 'Unknown User'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            purchase.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            purchase.status === 'expired' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {purchase.status === 'active' ? ('Aktif') :
                             purchase.status === 'expired' ? ('Süresi Dolan') :
                             ('İptal')}
                          </span>
                        </div>
                        <div className={`flex items-center gap-3 text-sm ${textSecondary}`}>
                          <span className={getTierColor(purchase.plan?.tier || 'gold')}>
                            {purchase.plan?.name || 'Custom'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(purchase.expiresAt), 'dd/MM/yyyy')}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {purchase.priceType === 'jeton' ? <Coins className="w-3 h-3 text-amber-400" /> : <CreditCard className="w-3 h-3 text-green-400" />}
                            {purchase.pricePaid} {purchase.priceType === 'jeton' ? 'jeton' : 'kuruş'}
                          </span>
                        </div>
                        {purchase.user?.email && (
                          <p className={`text-xs ${textSecondary} opacity-60`}>{purchase.user.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {purchase.status === 'active' && (
                        <>
                          <button
                            onClick={() => { setSelectedPurchase(purchase); setExtendDays(30); setShowExtendModal(true) }}
                            className={`p-2 ${isFacebook ? 'bg-blue-50 text-blue-600' : isCosmic ? 'bg-blue-500/20 text-blue-400' : 'bg-fuchsia-500/20 text-fuchsia-400'} rounded-lg hover:opacity-80 transition-all`}
                            title={'Süre Uzat'}
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancelMembership(purchase.id)}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                            title={'İptal Et'}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {(purchase.status === 'expired' || purchase.status === 'cancelled') && (
                        <button
                          onClick={() => handleReactivateMembership(purchase.id)}
                          className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all"
                          title={'Yeniden Aktifleştir'}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {purchases.length === 0 && (
                <div className={`text-center py-12 ${textSecondary}`}>
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{'Henüz satın alma yok'}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Plan Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`${cardBg} border rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
                    <Crown className="w-5 h-5 text-amber-400" />
                    {editingPlan ? ('Planı Düzenle') : ('Yeni Plan')}
                  </h2>
                  <button onClick={() => setShowForm(false)} className={`p-2 ${textSecondary} hover:${textPrimary}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`${textSecondary} text-sm mb-1 block`}>{'Ad (TR)'}</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                        placeholder="Gold 1 Aylık"
                      />
                    </div>
                    <div>
                      <label className={`${textSecondary} text-sm mb-1 block`}>{'Ad (EN)'}</label>
                      <input
                        type="text"
                        value={formData.nameEn}
                        onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                        className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                        placeholder="Gold 1 Month"
                      />
                    </div>
                  </div>

                  {/* Tier & Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`${textSecondary} text-sm mb-1 block`}>{'Seviye'}</label>
                      <select
                        value={formData.tier}
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                        className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                      >
                        {TIER_OPTIONS.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`${textSecondary} text-sm mb-1 block`}>{'Süre (gün)'}</label>
                      <input
                        type="number"
                        value={formData.durationDays}
                        onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) || 0 })}
                        className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                      />
                    </div>
                  </div>

                  {/* Price Type & Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`${textSecondary} text-sm mb-1 block`}>{'Ödeme Türü'}</label>
                      <select
                        value={formData.priceType}
                        onChange={(e) => setFormData({ ...formData, priceType: e.target.value })}
                        className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                      >
                        {PRICE_TYPE_OPTIONS.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`${textSecondary} text-sm mb-1 block`}>
                        {'Fiyat'} ({formData.priceType === 'jeton' ? 'Jeton' : 'Kuruş'})
                      </label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                        className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                      />
                    </div>
                  </div>

                  {/* Bonus & Discount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`${textSecondary} text-sm mb-1 block`}>{'Bonus Jeton'}</label>
                      <input
                        type="number"
                        value={formData.bonusJetons}
                        onChange={(e) => setFormData({ ...formData, bonusJetons: parseInt(e.target.value) || 0 })}
                        className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                      />
                    </div>
                    <div>
                      <label className={`${textSecondary} text-sm mb-1 block`}>{'İndirim %'}</label>
                      <input
                        type="number"
                        value={formData.discountPercent}
                        onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) || 0 })}
                        className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className={`${textSecondary} text-sm mb-1 block`}>{'Açıklama'}</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`w-full ${inputBg} border rounded-lg px-3 py-2 h-20 resize-none`}
                      placeholder={'Plan açıklaması...'}
                    />
                  </div>

                  {/* Toggles */}
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.prioritySupport}
                        onChange={(e) => setFormData({ ...formData, prioritySupport: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className={`${textSecondary} text-sm`}>{'VIP Destek'}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className={`${textSecondary} text-sm`}>{'Öne Çıkan'}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className={`${textSecondary} text-sm`}>{'Aktif'}</span>
                    </label>
                  </div>

                  {/* Sort Order & Badge */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`${textSecondary} text-sm mb-1 block`}>{'Sıra'}</label>
                      <input
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                        className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                      />
                    </div>
                    <div>
                      <label className={`${textSecondary} text-sm mb-1 block`}>{'Rozet'}</label>
                      <input
                        type="text"
                        value={formData.exclusiveBadge}
                        onChange={(e) => setFormData({ ...formData, exclusiveBadge: e.target.value })}
                        className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                        placeholder="👑"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={saving || !formData.name}
                    className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {'Kaydet'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grant Membership Modal */}
        <AnimatePresence>
          {showGrantModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
              onClick={() => setShowGrantModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`${cardBg} border rounded-2xl p-6 max-w-md w-full`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
                    <UserPlus className="w-5 h-5 text-amber-400" />
                    {'Üyelik Ver'}
                  </h2>
                  <button onClick={() => setShowGrantModal(false)} className={`p-2 ${textSecondary}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* User Search */}
                  <div>
                    <label className={`${textSecondary} text-sm mb-1 block`}>{'Kullanıcı Ara'}</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); searchUsers(e.target.value) }}
                        className={`w-full ${inputBg} border rounded-lg px-3 py-2 pl-10`}
                        placeholder={'İsim veya email...'}
                      />
                      <Search className={`w-4 h-4 ${textSecondary} absolute left-3 top-1/2 -translate-y-1/2`} />
                    </div>
                    {userSearchResults.length > 0 && (
                      <div className={`mt-2 ${cardBg} border rounded-lg max-h-40 overflow-y-auto`}>
                        {userSearchResults.map(user => (
                          <button
                            key={user.id}
                            onClick={() => {
                              setGrantData({ ...grantData, userId: user.id, userName: user.name })
                              setSearchQuery(user.name)
                              setUserSearchResults([])
                            }}
                            className={`w-full p-2 text-left hover:bg-black/20 ${textPrimary} text-sm`}
                          >
                            <p className="font-medium">{user.name}</p>
                            <p className={`text-xs ${textSecondary}`}>{user.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {grantData.userId && (
                      <p className={`mt-2 text-sm ${accentColor}`}>
                        ✓ {'Seçili'}: {grantData.userName}
                      </p>
                    )}
                  </div>

                  {/* Plan Selection */}
                  <div>
                    <label className={`${textSecondary} text-sm mb-1 block`}>{'Plan (Opsiyonel)'}</label>
                    <select
                      value={grantData.planId}
                      onChange={(e) => setGrantData({ ...grantData, planId: e.target.value })}
                      className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                    >
                      <option value="">{'Özel Süre'}</option>
                      {plans.filter(p => p.isActive).map(plan => (
                        <option key={plan.id} value={plan.id}>{plan.name} - {plan.durationDays} {'gün'}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Duration (if no plan selected) */}
                  {!grantData.planId && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`${textSecondary} text-sm mb-1 block`}>{'Seviye'}</label>
                        <select
                          value={grantData.customTier}
                          onChange={(e) => setGrantData({ ...grantData, customTier: e.target.value })}
                          className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                        >
                          {TIER_OPTIONS.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`${textSecondary} text-sm mb-1 block`}>{'Süre (gün)'}</label>
                        <input
                          type="number"
                          value={grantData.durationDays}
                          onChange={(e) => setGrantData({ ...grantData, durationDays: parseInt(e.target.value) || 30 })}
                          className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Free Grant Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grantData.freeGrant}
                      onChange={(e) => setGrantData({ ...grantData, freeGrant: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className={`${textSecondary} text-sm`}>
                      {'Ücretsiz Ver (Jeton düşmez)'}
                    </span>
                  </label>

                  {/* Submit */}
                  <button
                    onClick={handleGrantMembership}
                    disabled={saving || !grantData.userId}
                    className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5" />}
                    {'Üyelik Ver'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extend Membership Modal */}
        <AnimatePresence>
          {showExtendModal && selectedPurchase && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
              onClick={() => setShowExtendModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`${cardBg} border rounded-2xl p-6 max-w-sm w-full`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
                    <Calendar className="w-5 h-5 text-amber-400" />
                    {'Süre Uzat'}
                  </h2>
                  <button onClick={() => setShowExtendModal(false)} className={`p-2 ${textSecondary}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className={textSecondary}>
                    {'Kullanıcı:'} <span className={textPrimary}>{selectedPurchase.user?.name}</span>
                  </p>
                  <p className={textSecondary}>
                    {'Mevcut Bitiş:'} <span className={textPrimary}>{format(new Date(selectedPurchase.expiresAt), 'dd/MM/yyyy')}</span>
                  </p>

                  <div>
                    <label className={`${textSecondary} text-sm mb-1 block`}>{'Eklenecek Gün'}</label>
                    <input
                      type="number"
                      value={extendDays}
                      onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                      className={`w-full ${inputBg} border rounded-lg px-3 py-2`}
                    />
                  </div>

                  <button
                    onClick={handleExtendMembership}
                    disabled={saving || extendDays <= 0}
                    className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                    {'Süre Uzat'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}