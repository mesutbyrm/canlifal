'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, Plus, Edit2, Trash2, Save, X, Loader2, Star, Coins,
  CreditCard, Clock, Gift, Percent, BadgeCheck, Users
} from 'lucide-react'

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

export default function AdminMembershipsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null)
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

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      router.push(`/${language}`)
      return
    }
    fetchPlans()
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
    if (!confirm(language === 'tr' ? 'Bu plan\u0131 silmek istedi\u011finize emin misiniz?' : 'Are you sure you want to delete this plan?')) return

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
      <div className="min-h-screen bg-[#0f0520] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0520] pt-20 pb-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Crown className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {language === 'tr' ? 'Gold \u00dcyelik Y\u00f6netimi' : 'Membership Management'}
              </h1>
              <p className="text-purple-300 text-sm">{plans.length} {language === 'tr' ? 'plan' : 'plans'}</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setEditingPlan(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-semibold rounded-xl hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            {language === 'tr' ? 'Yeni Plan' : 'New Plan'}
          </button>
        </div>

        {/* Plans List */}
        <div className="space-y-3">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-[#1a0a2e]/80 border ${plan.isActive ? 'border-fuchsia-500/30' : 'border-gray-600/30 opacity-60'} rounded-xl p-4`}
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
                      <span className="text-white font-semibold">{plan.name}</span>
                      {plan.isFeatured && (
                        <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" /> {language === 'tr' ? '\u00d6ne \u00c7\u0131kan' : 'Featured'}
                        </span>
                      )}
                      {!plan.isActive && (
                        <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                          {language === 'tr' ? 'Pasif' : 'Inactive'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-purple-300">
                      <span className={getTierColor(plan.tier)}>{plan.tier.toUpperCase()}</span>
                      <span>\u2022</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {plan.durationDays} {language === 'tr' ? 'g\u00fcn' : 'days'}
                      </span>
                      <span>\u2022</span>
                      <span className="flex items-center gap-1">
                        {plan.priceType === 'jeton' ? <Coins className="w-3 h-3 text-amber-400" /> : <CreditCard className="w-3 h-3 text-green-400" />}
                        {plan.price} {plan.priceType === 'jeton' ? 'jeton' : 'TL'}
                      </span>
                      {plan._count && plan._count.purchases > 0 && (
                        <>
                          <span>\u2022</span>
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
                    className="p-2 bg-fuchsia-500/20 text-fuchsia-400 rounded-lg hover:bg-fuchsia-500/30 transition-all"
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
            <div className="text-center py-12 text-purple-300">
              <Crown className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{language === 'tr' ? 'Hen\u00fcz \u00fcyelik plan\u0131 yok' : 'No membership plans yet'}</p>
            </div>
          )}
        </div>

        {/* Form Modal */}
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
                className="bg-[#1a0a2e] border border-fuchsia-500/30 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    {editingPlan ? (language === 'tr' ? 'Plan\u0131 D\u00fczenle' : 'Edit Plan') : (language === 'tr' ? 'Yeni Plan' : 'New Plan')}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="p-2 text-purple-300 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-purple-300 text-sm mb-1 block">{language === 'tr' ? 'Ad (TR)' : 'Name (TR)'}</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-purple-900/30 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white"
                        placeholder="Gold 1 Ayl\u0131k"
                      />
                    </div>
                    <div>
                      <label className="text-purple-300 text-sm mb-1 block">{language === 'tr' ? 'Ad (EN)' : 'Name (EN)'}</label>
                      <input
                        type="text"
                        value={formData.nameEn}
                        onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                        className="w-full bg-purple-900/30 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white"
                        placeholder="Gold 1 Month"
                      />
                    </div>
                  </div>

                  {/* Tier & Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-purple-300 text-sm mb-1 block">{language === 'tr' ? 'Seviye' : 'Tier'}</label>
                      <select
                        value={formData.tier}
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                        className="w-full bg-purple-900/30 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white"
                      >
                        {TIER_OPTIONS.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-purple-300 text-sm mb-1 block">{language === 'tr' ? 'S\u00fcre (g\u00fcn)' : 'Duration (days)'}</label>
                      <input
                        type="number"
                        value={formData.durationDays}
                        onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) || 0 })}
                        className="w-full bg-purple-900/30 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  {/* Price Type & Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-purple-300 text-sm mb-1 block">{language === 'tr' ? '\u00d6deme T\u00fcr\u00fc' : 'Payment Type'}</label>
                      <select
                        value={formData.priceType}
                        onChange={(e) => setFormData({ ...formData, priceType: e.target.value })}
                        className="w-full bg-purple-900/30 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white"
                      >
                        {PRICE_TYPE_OPTIONS.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-purple-300 text-sm mb-1 block">
                        {language === 'tr' ? 'Fiyat' : 'Price'} ({formData.priceType === 'jeton' ? 'Jeton' : 'Kuru\u015f'})
                      </label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                        className="w-full bg-purple-900/30 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  {/* Bonus & Discount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-purple-300 text-sm mb-1 block">{language === 'tr' ? 'Bonus Jeton' : 'Bonus Jetons'}</label>
                      <input
                        type="number"
                        value={formData.bonusJetons}
                        onChange={(e) => setFormData({ ...formData, bonusJetons: parseInt(e.target.value) || 0 })}
                        className="w-full bg-purple-900/30 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-purple-300 text-sm mb-1 block">{language === 'tr' ? '\u0130ndirim %' : 'Discount %'}</label>
                      <input
                        type="number"
                        value={formData.discountPercent}
                        onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) || 0 })}
                        className="w-full bg-purple-900/30 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-purple-300 text-sm mb-1 block">{language === 'tr' ? 'A\u00e7\u0131klama' : 'Description'}</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-purple-900/30 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white h-20 resize-none"
                      placeholder={language === 'tr' ? 'Plan a\u00e7\u0131klamas\u0131...' : 'Plan description...'}
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
                      <span className="text-purple-200 text-sm">{language === 'tr' ? 'VIP Destek' : 'Priority Support'}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-purple-200 text-sm">{language === 'tr' ? '\u00d6ne \u00c7\u0131kan' : 'Featured'}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-purple-200 text-sm">{language === 'tr' ? 'Aktif' : 'Active'}</span>
                    </label>
                  </div>

                  {/* Sort Order & Badge */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-purple-300 text-sm mb-1 block">{language === 'tr' ? 'S\u0131ra' : 'Sort Order'}</label>
                      <input
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full bg-purple-900/30 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-purple-300 text-sm mb-1 block">{language === 'tr' ? 'Rozet' : 'Badge'}</label>
                      <input
                        type="text"
                        value={formData.exclusiveBadge}
                        onChange={(e) => setFormData({ ...formData, exclusiveBadge: e.target.value })}
                        className="w-full bg-purple-900/30 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white"
                        placeholder="\ud83d\udc51"
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
                    {language === 'tr' ? 'Kaydet' : 'Save'}
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
