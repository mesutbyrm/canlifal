'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, Coins, Clock, Gift, Percent, BadgeCheck, Star,
  Check, Loader2, X, Sparkles, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

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
  isFeatured: boolean
}

interface UserMembership {
  membership: string
  membershipExpiresAt: string | null
  jetonBalance: number
  credits: number
}

export default function MembershipsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const { theme } = useSiteTheme()

  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'jeton' | 'cfc'>('jeton')

  // Theme colors
  const isCosmic = theme === 'cosmic'
  const isFacebook = theme === 'facebook'

  const bgColor = isFacebook ? 'bg-[#f0f2f5]' : isCosmic ? 'bg-[#0a1628]' : 'bg-[#0f0520]'
  const cardBg = isFacebook ? 'bg-white border-gray-200' : isCosmic ? 'bg-white/5 border-blue-500/20' : 'bg-[#1a0a2e]/80 border-fuchsia-500/20'
  const cardBgFeatured = isFacebook ? 'bg-blue-50 border-blue-400' : isCosmic ? 'bg-blue-500/10 border-blue-400/50' : 'bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/40'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-600' : isCosmic ? 'text-blue-200' : 'text-purple-200'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const goldColor = isFacebook ? 'text-amber-600' : 'text-amber-400'
  const modalBg = isFacebook ? 'bg-white' : isCosmic ? 'bg-[#0d1f3c]' : 'bg-[#1a0a2e]'
  const modalBorder = isFacebook ? 'border-gray-300' : isCosmic ? 'border-blue-500/30' : 'border-fuchsia-500/30'

  useEffect(() => {
    fetchPlans()
    if (session?.user) {
      fetchUserMembership()
    }
  }, [session])

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/memberships')
      if (res.ok) setPlans(await res.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const fetchUserMembership = async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setUserMembership({
          membership: data.membership,
          membershipExpiresAt: data.membershipExpiresAt,
          jetonBalance: data.jetonBalance || 0,
          credits: data.credits || 0
        })
      }
    } catch (e) { console.error(e) }
  }

  const handlePurchase = async () => {
    if (!selectedPlan || !session?.user) return

    setPurchasing(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/memberships/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan.id, paymentMethod })
      })

      const data = await res.json()
      if (res.ok) {
        setSuccessMsg(data.message)
        setShowConfirm(false)
        fetchUserMembership()
        setTimeout(() => setSuccessMsg(''), 5000)
      } else {
        setErrorMsg(data.error || 'An error occurred')
      }
    } catch (e) {
      console.error(e)
      setErrorMsg('Network error')
    } finally {
      setPurchasing(false)
    }
  }

  const getTierGradient = (tier: string) => {
    switch (tier) {
      case 'diamond': return 'from-purple-400 to-purple-600'
      case 'gold': return 'from-amber-400 to-amber-600'
      case 'premium': return 'from-blue-400 to-blue-600'
      default: return 'from-gray-400 to-gray-600'
    }
  }

  const formatExpiry = (date: string | null) => {
    if (!date) return null
    const d = new Date(date)
    if (d < new Date()) return null
    return d.toLocaleDateString('tr-TR')
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <Loader2 className={`w-8 h-8 ${accentColor} animate-spin`} />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bgColor} pt-16 pb-24 px-4`}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-3`}>
            <Crown className="w-8 h-8 text-black" />
          </div>
          <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>
            {'Gold \u00dcyelikler'}
          </h1>
          <p className={textSecondary}>
            {'Ayr\u0131cal\u0131kl\u0131 \u00f6zellikler i\u00e7in \u00fcyelik se\u00e7in'}
          </p>
        </motion.div>

        {/* Current Membership Status */}
        {userMembership && userMembership.membership !== 'basic' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl border ${cardBg}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getTierGradient(userMembership.membership)} flex items-center justify-center`}>
                <Crown className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className={`${goldColor} font-bold text-lg uppercase`}>
                  {userMembership.membership}
                </p>
                {formatExpiry(userMembership.membershipExpiresAt) && (
                  <p className={`${textSecondary} text-sm`}>
                    {'Biti\u015f:'} {formatExpiry(userMembership.membershipExpiresAt)}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Balances */}
        {userMembership && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`mb-6 p-3 rounded-xl border ${cardBg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={textSecondary}>{'Jeton Bakiyeniz:'}</span>
              <span className={`${goldColor} font-bold text-lg flex items-center gap-1`}>
                <Coins className="w-4 h-4" /> {userMembership.jetonBalance}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={textSecondary}>{'CFC Bakiyeniz:'}</span>
              <span className={`${accentColor} font-bold text-lg flex items-center gap-1`}>
                <Sparkles className="w-4 h-4" /> {userMembership.credits}
              </span>
            </div>
          </motion.div>
        )}

        {/* Success/Error Messages */}
        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-4 bg-green-500/20 border border-green-500/40 rounded-xl flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-300 text-sm flex-1">{successMsg}</p>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-4 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center gap-3">
              <X className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm flex-1">{errorMsg}</p>
              <button onClick={() => setErrorMsg('')}><X className="w-4 h-4 text-red-400" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Membership Plans */}
        <div className="space-y-4">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl p-5 border-2 transition-all ${plan.isFeatured ? cardBgFeatured : cardBg}`}
            >
              {plan.isFeatured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-600 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" /> {'Pop\u00fcler'}
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getTierGradient(plan.tier)} flex items-center justify-center flex-shrink-0`}>
                  <Crown className="w-7 h-7 text-black" />
                </div>
                <div className="flex-1">
                  <h3 className={`${textPrimary} font-bold text-lg`}>
                    {plan.name}
                  </h3>
                  <p className={`${textSecondary} text-sm mb-3`}>
                    {plan.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`bg-amber-500/20 ${goldColor} text-xs px-2 py-1 rounded-full flex items-center gap-1`}>
                      <Clock className="w-3 h-3" /> {plan.durationDays} {'g\u00fcn'}
                    </span>
                    {plan.bonusJetons > 0 && (
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Gift className="w-3 h-3" /> +{plan.bonusJetons} bonus
                      </span>
                    )}
                    {plan.discountPercent > 0 && (
                      <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Percent className="w-3 h-3" /> %{plan.discountPercent}
                      </span>
                    )}
                    {plan.prioritySupport && (
                      <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" /> VIP
                      </span>
                    )}
                  </div>

                  {/* Price & Buy */}
                  <div className="flex items-center justify-between">
                    <div className={`${goldColor} font-bold text-xl flex items-center gap-1`}>
                      {plan.priceType === 'jeton' ? <Coins className="w-5 h-5" /> : null}
                      {plan.price} {plan.priceType === 'jeton' ? 'Jeton' : 'TL'}
                    </div>
                    <button
                      onClick={() => {
                        if (!session?.user) {
                          router.push(`/login`)
                          return
                        }
                        setSelectedPlan(plan)
                        setShowConfirm(true)
                      }}
                      className={`px-5 py-2 bg-gradient-to-r ${getTierGradient(plan.tier)} text-black font-semibold rounded-xl hover:opacity-90 transition-all active:scale-95`}
                    >
                      {'Sat\u0131n Al'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {plans.length === 0 && (
            <div className="text-center py-12">
              <Crown className={`w-16 h-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
              <p className={textSecondary}>
                {'Hen\u00fcz \u00fcyelik plan\u0131 bulunmuyor'}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Modal */}
        <AnimatePresence>
          {showConfirm && selectedPlan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
              onClick={() => setShowConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`${modalBg} border ${modalBorder} rounded-2xl p-6 max-w-sm w-full`}
              >
                <div className="text-center mb-6">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getTierGradient(selectedPlan.tier)} flex items-center justify-center mx-auto mb-4`}>
                    <Crown className="w-8 h-8 text-black" />
                  </div>
                  <h3 className={`${textPrimary} text-xl font-bold mb-2`}>
                    {'\u00dcyeli\u011fi Onayla'}
                  </h3>
                  <p className={textSecondary}>
                    {selectedPlan.name}
                  </p>
                </div>

                <div className={`${cardBg} rounded-xl p-4 mb-4 border`}>
                  <div className="flex justify-between mb-2">
                    <span className={textSecondary}>{'Süre:'}</span>
                    <span className={textPrimary}>{selectedPlan.durationDays} {'gün'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={textSecondary}>{'Fiyat:'}</span>
                    <span className={`${goldColor} font-bold`}>{selectedPlan.price} {paymentMethod === 'cfc' ? 'CFC' : 'Jeton'}</span>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="mb-4">
                  <p className={`${textSecondary} text-sm mb-2`}>{'Ödeme Yöntemi:'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('jeton')}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${paymentMethod === 'jeton' ? 'border-amber-500 bg-amber-500/10' : `border ${modalBorder} opacity-60`}`}
                    >
                      <Coins className={`w-5 h-5 ${goldColor}`} />
                      <span className={`${textPrimary} text-sm font-medium`}>Jeton</span>
                      {userMembership && (
                        <span className={`text-xs ${userMembership.jetonBalance >= selectedPlan.price ? 'text-green-400' : 'text-red-400'}`}>
                          {userMembership.jetonBalance} {'mevcut'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cfc')}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${paymentMethod === 'cfc' ? 'border-fuchsia-500 bg-fuchsia-500/10' : `border ${modalBorder} opacity-60`}`}
                    >
                      <Sparkles className={`w-5 h-5 ${accentColor}`} />
                      <span className={`${textPrimary} text-sm font-medium`}>CFC</span>
                      {userMembership && (
                        <span className={`text-xs ${userMembership.credits >= selectedPlan.price ? 'text-green-400' : 'text-red-400'}`}>
                          {userMembership.credits} {'mevcut'}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {userMembership && (
                  (paymentMethod === 'jeton' && userMembership.jetonBalance < selectedPlan.price) ||
                  (paymentMethod === 'cfc' && userMembership.credits < selectedPlan.price)
                ) && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-center">
                    <p className="text-red-400 text-sm">
                      {`Yetersiz ${paymentMethod === 'cfc' ? 'CFC' : 'jeton'} bakiyesi`}
                    </p>
                    <Link href={`/credits`} className="text-amber-400 text-sm underline">
                      {'Bakiye yükle'}
                    </Link>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className={`flex-1 py-3 border ${modalBorder} ${textSecondary} rounded-xl hover:opacity-80 transition-all`}
                  >
                    {'İptal'}
                  </button>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing || !!(userMembership && (
                      (paymentMethod === 'jeton' && userMembership.jetonBalance < selectedPlan.price) ||
                      (paymentMethod === 'cfc' && userMembership.credits < selectedPlan.price)
                    ))}
                    className={`flex-1 py-3 bg-gradient-to-r ${getTierGradient(selectedPlan.tier)} text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50`}
                  >
                    {purchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {'Onayla'}
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