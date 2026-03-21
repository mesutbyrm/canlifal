'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Coins,
  Building2,
  Star,
  Gift,
  Check,
  Copy,
  Loader2,
  X,
  MessageCircle,
  Wallet,
  ExternalLink,
  CreditCard,
  User,
  Crown
} from 'lucide-react'

interface CreditPackage {
  id: string
  name: string
  nameEn: string | null
  credits: number
  price: number
  currency: string
  bonusCredits: number
  isFeatured: boolean
  isActive: boolean
}

interface PaymentMethod {
  id: string
  type: string
  name: string
  nameEn: string | null
  description: string | null
  descriptionEn: string | null
  isActive: boolean
  config: string | null
}

interface WhatsAppSettings {
  number: string
  message: string
  enabled: boolean
}

export default function CreditsPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const { theme } = useSiteTheme()

  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [userCredits, setUserCredits] = useState(0)
  const [userJetons, setUserJetons] = useState(0)
  const [showPaymentMethodsPopup, setShowPaymentMethodsPopup] = useState(false)
  const [activePaymentPopup, setActivePaymentPopup] = useState<string | null>(null)

  // Theme colors
  const isCosmic = theme === 'cosmic'
  const isFacebook = theme === 'facebook'

  const bgColor = isFacebook ? 'bg-[#f0f2f5]' : isCosmic ? 'bg-[#0a1628]' : 'bg-[#0f0520]'
  const cardBg = isFacebook ? 'bg-white border-gray-200' : isCosmic ? 'bg-white/5 border-blue-500/20' : 'bg-[#1a0a2e] border-fuchsia-500/20'
  const cardBgFeatured = isFacebook ? 'bg-blue-50 border-blue-400' : isCosmic ? 'bg-blue-500/10 border-blue-400/50' : 'bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 border-fuchsia-500/40'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-600' : isCosmic ? 'text-blue-200' : 'text-purple-200'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const goldColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-amber-400' : 'text-amber-400'
  const iconBg = isFacebook ? 'from-blue-500 to-blue-600' : isCosmic ? 'from-blue-500 to-cyan-500' : 'from-fuchsia-500 to-purple-600'
  const iconBgGold = isFacebook ? 'from-blue-500 to-blue-600' : isCosmic ? 'from-amber-400 to-amber-600' : 'from-amber-400 to-amber-600'
  const badgeBg = isFacebook ? 'bg-blue-500' : isCosmic ? 'bg-blue-500' : 'bg-gradient-to-r from-fuchsia-500 to-pink-500'
  const balanceBg = isFacebook ? 'bg-blue-50 border-blue-200' : isCosmic ? 'bg-blue-500/10 border-blue-500/30' : 'bg-fuchsia-500/10 border-fuchsia-500/20'
  const modalBg = isFacebook ? 'bg-white' : isCosmic ? 'bg-[#0d1f3c]' : 'bg-[#1a0a2e]'
  const modalBorder = isFacebook ? 'border-gray-300' : isCosmic ? 'border-blue-500/30' : 'border-fuchsia-500/30'

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (session?.user) {
      fetchUserCredits()
    }
  }, [session])

  const fetchData = async () => {
    try {
      const [packagesRes, methodsRes, settingsRes] = await Promise.all([
        fetch('/api/credit-packages'),
        fetch('/api/payment-methods'),
        fetch('/api/payment-settings')
      ])
      if (packagesRes.ok) {
        const data = await packagesRes.json()
        setPackages(data.filter((p: CreditPackage) => p.isActive))
      }
      if (methodsRes.ok) {
        const data = await methodsRes.json()
        setPaymentMethods(data.filter((m: PaymentMethod) => m.isActive))
      }
      if (settingsRes.ok) {
        const settings = await settingsRes.json()
        const waNumber = settings.whatsapp_number || ''
        const waMessage = settings.whatsapp_message || ''
        const waEnabled = settings.whatsapp_enabled === 'true'
        setWhatsappSettings({ number: waNumber, message: waMessage, enabled: waEnabled })
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserCredits = async () => {
    try {
      const res = await fetch('/api/user/credits')
      if (res.ok) {
        const data = await res.json()
        setUserCredits(data.credits || 0)
        setUserJetons(data.jetonBalance || 0)
      }
    } catch (err) {
      console.error('Fetch credits error:', err)
    }
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'papara': return <Wallet className="w-5 h-5" />
      case 'bank_transfer': return <Building2 className="w-5 h-5" />
      default: return <CreditCard className="w-5 h-5" />
    }
  }

  const handleSelectPackage = (pkg: CreditPackage) => {
    if (!session?.user) {
      router.push(`/giris`)
      return
    }
    setSelectedPackage(pkg)
    setShowPaymentMethodsPopup(true)
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'TRY') return `₺${price.toLocaleString('tr-TR')}`
    return `$${price.toLocaleString('en-US')}`
  }

  const getPaymentDetails = (method: PaymentMethod) => {
    if (!method.config) return null
    try { return JSON.parse(method.config) } catch { return null }
  }

  const username = (session?.user as { username?: string })?.username || session?.user?.name || ''

  const getWhatsAppLink = () => {
    if (!whatsappSettings || !whatsappSettings.number) return '#'
    let message = whatsappSettings.message || `Merhaba, jeton satın almak istiyorum.\nKullanıcı adım: ${username}\nPaket: ${selectedPackage ? `${selectedPackage.credits} Jeton - ${formatPrice(selectedPackage.price, selectedPackage.currency)}` : ''}`
    message = message
      .replace('{username}', username)
      .replace('{package}', selectedPackage ? `${selectedPackage.credits} Jeton - ${formatPrice(selectedPackage.price, selectedPackage.currency)}` : '')
    return `https://wa.me/${whatsappSettings.number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
  }

  const closeAllPopups = () => {
    setShowPaymentMethodsPopup(false)
    setActivePaymentPopup(null)
  }

  const openPaymentDetail = (type: string) => {
    setShowPaymentMethodsPopup(false)
    setActivePaymentPopup(type)
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <Loader2 className={`w-8 h-8 ${accentColor} animate-spin`} />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bgColor} pt-16 pb-20 px-3`}>
      <div className="max-w-md mx-auto">
        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${iconBgGold} flex items-center justify-center mx-auto mb-2`}>
            <Coins className={`w-6 h-6 ${isFacebook ? 'text-white' : 'text-black'}`} />
          </div>
          <h1 className={`text-xl font-bold ${textPrimary} mb-1`}>
            {'Jeton Satın Al'}
          </h1>
          {session?.user && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`inline-flex items-center gap-1.5 ${balanceBg} px-3 py-1.5 rounded-full border text-sm`}>
                <Coins className={`w-3.5 h-3.5 ${goldColor}`} />
                <span className={textSecondary}>Jeton:</span>
                <span className={`${goldColor} font-bold`}>{userJetons}</span>
              </div>
              <div className={`inline-flex items-center gap-1.5 ${balanceBg} px-3 py-1.5 rounded-full border text-sm`}>
                <span className="text-sm">🪙</span>
                <span className={textSecondary}>CFC:</span>
                <span className={`${goldColor} font-bold`}>{userCredits}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Gold Membership Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <button
            onClick={() => router.push(`/uyelik`)}
            className={`w-full py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all active:scale-98 ${
              isFacebook 
                ? 'bg-amber-50 border-amber-400 hover:bg-amber-100' 
                : isCosmic 
                ? 'bg-amber-500/10 border-amber-400/50 hover:bg-amber-500/20' 
                : 'bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-500/40 hover:from-amber-500/20 hover:to-amber-600/20'
            }`}
          >
            <Crown className={`w-5 h-5 ${goldColor}`} />
            <span className={`${goldColor} font-bold`}>
              {'Gold Üyelikler'}
            </span>
            <Star className={`w-4 h-4 ${goldColor}`} />
          </button>
        </motion.div>

        {/* Credit Packages - Compact Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSelectPackage(pkg)}
              className={`relative cursor-pointer rounded-xl p-3 border-2 transition-all duration-200 active:scale-95 ${
                pkg.isFeatured ? cardBgFeatured : cardBg
              }`}
            >
              {pkg.isFeatured && (
                <div className={`absolute -top-2 left-1/2 -translate-x-1/2 ${badgeBg} text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5`}>
                  <Star className="w-2.5 h-2.5" />
                  {'Popüler'}
                </div>
              )}

              <div className="text-center">
                <div className={`text-2xl font-bold ${goldColor}`}>
                  {pkg.credits}
                </div>
                <div className={`text-xs ${textSecondary} mb-1`}>
                  {'jeton'}
                </div>
                {pkg.bonusCredits > 0 && (
                  <div className="text-green-400 text-[10px] font-medium mb-1">
                    +{pkg.bonusCredits} bonus
                  </div>
                )}
                <div className={`text-lg font-bold ${textPrimary}`}>
                  {formatPrice(pkg.price, pkg.currency)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Info Note */}
        <div className={`text-center ${textSecondary} text-xs p-3 rounded-xl ${cardBg} border`}>
          {'👆 Bir paket seçerek ödeme yöntemlerini görüntüleyin'}
        </div>
      </div>

      {/* Payment Methods Selection Popup */}
      <AnimatePresence>
        {showPaymentMethodsPopup && selectedPackage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={closeAllPopups}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${modalBg} rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-hidden border-t sm:border ${modalBorder} flex flex-col`}
            >
              {/* Header - Fixed */}
              <div className={`px-4 sm:px-6 pt-4 pb-3 sm:pt-5 sm:pb-4 border-b ${isFacebook ? 'border-gray-200' : 'border-white/10'}`}>
                {/* Drag indicator for mobile */}
                <div className="w-12 h-1 bg-gray-400/50 rounded-full mx-auto mb-3 sm:hidden" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${iconBgGold} flex items-center justify-center shadow-lg`}>
                      <CreditCard className={`w-5 h-5 sm:w-6 sm:h-6 ${isFacebook ? 'text-white' : 'text-black'}`} />
                    </div>
                    <div>
                      <h2 className={`text-base sm:text-lg font-bold ${textPrimary}`}>
                        {'Ödeme Yöntemi'}
                      </h2>
                      <p className={`text-xs sm:text-sm ${textSecondary}`}>
                        {'Güvenli ödeme seçenekleri'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={closeAllPopups} 
                    className={`p-2 rounded-full transition-colors ${isFacebook ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                {/* Selected Package Summary - Compact Card */}
                <div className={`rounded-2xl p-4 sm:p-5 mb-4 border-2 ${
                  isFacebook 
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300' 
                    : isCosmic 
                    ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-400/40' 
                    : 'bg-gradient-to-r from-amber-500/10 to-fuchsia-500/10 border-amber-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${iconBgGold} flex items-center justify-center shadow-lg`}>
                        <Coins className={`w-6 h-6 sm:w-7 sm:h-7 ${isFacebook ? 'text-white' : 'text-black'}`} />
                      </div>
                      <div>
                        <div className={`text-xl sm:text-2xl font-extrabold ${goldColor}`}>
                          {selectedPackage.credits}
                          <span className={`text-sm sm:text-base font-medium ml-1 ${textSecondary}`}>
                            {'Jeton'}
                          </span>
                        </div>
                        {selectedPackage.bonusCredits > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Gift className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400 text-xs sm:text-sm font-semibold">+{selectedPackage.bonusCredits} bonus</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl sm:text-2xl font-extrabold ${textPrimary}`}>
                        {formatPrice(selectedPackage.price, selectedPackage.currency)}
                      </div>
                      {session?.user && (
                        <div className={`text-xs sm:text-sm ${textSecondary} mt-0.5 flex items-center justify-end gap-1`}>
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[80px] sm:max-w-[120px]">{username}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section Title */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-px flex-1 ${isFacebook ? 'bg-gray-200' : 'bg-white/10'}`} />
                  <span className={`text-xs sm:text-sm ${textSecondary} font-medium px-2`}>
                    {'Ödeme Yöntemleri'}
                  </span>
                  <div className={`h-px flex-1 ${isFacebook ? 'bg-gray-200' : 'bg-white/10'}`} />
                </div>

                {/* Payment Methods Grid */}
                <div className="space-y-3">
                  {/* WhatsApp - Featured */}
                  {whatsappSettings?.enabled && whatsappSettings?.number && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openPaymentDetail('whatsapp')}
                      className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-medium shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-bold text-base sm:text-lg flex items-center gap-2">
                          WhatsApp
                          <span className="bg-white/20 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium">
                            {'Önerilen'}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm opacity-80 truncate">{'Hızlı ve kolay ödeme'}</div>
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
                      </div>
                    </motion.button>
                  )}

                  {/* Other Payment Methods */}
                  {paymentMethods.map((method) => (
                    <motion.button
                      key={method.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openPaymentDetail(method.type)}
                      className={`w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border-2 transition-all ${cardBg} ${
                        isFacebook 
                          ? 'hover:border-gray-300 hover:shadow-md' 
                          : isCosmic 
                          ? 'hover:border-blue-400/50 hover:bg-blue-500/10' 
                          : 'hover:border-fuchsia-400/50 hover:bg-fuchsia-500/10'
                      }`}
                    >
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-white shadow-lg ${
                        method.type === 'papara' 
                          ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
                          : 'bg-gradient-to-br from-blue-500 to-blue-700'
                      }`}>
                        {method.type === 'papara' 
                          ? <Wallet className="w-6 h-6 sm:w-7 sm:h-7" />
                          : <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
                        }
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className={`${textPrimary} font-bold text-base sm:text-lg`}>
                          {method.name}
                        </div>
                        <div className={`${textSecondary} text-xs sm:text-sm truncate`}>
                          {method.description}
                        </div>
                      </div>
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                        isFacebook ? 'bg-gray-100' : 'bg-white/5'
                      }`}>
                        <ExternalLink className={`w-4 h-4 sm:w-5 sm:h-5 ${textSecondary}`} />
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Security Note */}
                <div className={`mt-4 p-3 sm:p-4 rounded-xl flex items-start gap-2 sm:gap-3 ${
                  isFacebook ? 'bg-green-50 border border-green-200' : 'bg-green-500/10 border border-green-500/20'
                }`}>
                  <div className="text-green-500 mt-0.5">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className={`text-xs sm:text-sm font-medium ${isFacebook ? 'text-green-800' : 'text-green-400'}`}>
                      {'Güvenli Ödeme'}
                    </div>
                    <div className={`text-[10px] sm:text-xs ${isFacebook ? 'text-green-600' : 'text-green-400/70'}`}>
                      {'Tüm işlemleriniz güvence altında'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Fixed on mobile */}
              <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t ${isFacebook ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-black/20'}`}>
                <button
                  onClick={closeAllPopups}
                  className={`w-full py-3 sm:py-3.5 rounded-xl font-medium transition-all ${
                    isFacebook 
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {'İptal'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Detail Popup */}
      <AnimatePresence>
        {activePaymentPopup === 'whatsapp' && selectedPackage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50"
            onClick={closeAllPopups}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${modalBg} rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto border-t sm:border ${modalBorder}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <h2 className={`text-lg font-bold ${textPrimary}`}>WhatsApp {'ile Ödeme'}</h2>
                </div>
                <button onClick={closeAllPopups} className="text-gray-400 hover:text-white p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Order Summary */}
              <div className={`rounded-xl p-4 mb-4 border ${cardBg}`}>
                <h3 className={`${textSecondary} text-sm mb-3`}>{'Sipariş Özeti'}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={textSecondary}>{'Jeton Miktarı:'}</span>
                    <span className={`${goldColor} font-bold`}>{selectedPackage.credits}</span>
                  </div>
                  {selectedPackage.bonusCredits > 0 && (
                    <div className="flex justify-between">
                      <span className={textSecondary}>{'Bonus:'}</span>
                      <span className="text-green-400 font-bold">+{selectedPackage.bonusCredits}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                    <span className={textPrimary}>{'Toplam:'}</span>
                    <span className={`${goldColor} font-bold text-lg`}>{formatPrice(selectedPackage.price, selectedPackage.currency)}</span>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className={`rounded-xl p-4 mb-4 border ${cardBg}`}>
                <h3 className={`${textSecondary} text-sm mb-3`}>{'Kullanıcı Bilgisi'}</h3>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${iconBg} flex items-center justify-center`}>
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className={`${textPrimary} font-bold`}>{username || ('Kullanıcı')}</div>
                    <div className={`${textSecondary} text-xs`}>{session?.user?.email || ''}</div>
                  </div>
                </div>
              </div>

              <p className={`${textSecondary} text-sm mb-4`}>
                {'Aşağıdaki butona tıklayarak WhatsApp üzerinden sipariş verebilirsiniz. Mesajınız otomatik olarak hazırlanacak.'}
              </p>

              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 px-6 rounded-xl hover:opacity-90 transition-all text-lg"
              >
                <MessageCircle className="w-6 h-6" />
                <span>{'WhatsApp\'tan Sipariş Ver'}</span>
              </a>

              <button
                onClick={() => {
                  setActivePaymentPopup(null)
                  setShowPaymentMethodsPopup(true)
                }}
                className={`w-full mt-3 py-3 rounded-xl ${textSecondary} hover:opacity-80 transition-all`}
              >
                ← {'Geri Dön'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Papara Detail Popup */}
      <AnimatePresence>
        {activePaymentPopup === 'papara' && selectedPackage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50"
            onClick={closeAllPopups}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${modalBg} rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto border-t sm:border ${modalBorder}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <h2 className={`text-lg font-bold ${textPrimary}`}>Papara {'ile Ödeme'}</h2>
                </div>
                <button onClick={closeAllPopups} className="text-gray-400 hover:text-white p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Order Summary */}
              <div className={`rounded-xl p-4 mb-4 border ${cardBg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`${goldColor} font-bold text-xl`}>{selectedPackage.credits} {'Jeton'}</div>
                    {selectedPackage.bonusCredits > 0 && <div className="text-green-400 text-sm">+{selectedPackage.bonusCredits} bonus</div>}
                  </div>
                  <div className={`${textPrimary} font-bold text-xl`}>{formatPrice(selectedPackage.price, selectedPackage.currency)}</div>
                </div>
              </div>

              {/* Payment Details */}
              {paymentMethods.filter(m => m.type === 'papara').map((method) => {
                const details = getPaymentDetails(method)
                return details && (
                  <div key={method.id} className="space-y-3 mb-4">
                    {details.paparaNo && (
                      <div className={`rounded-xl p-4 border ${cardBg}`}>
                        <div className="flex justify-between items-center">
                          <span className={`${textSecondary}`}>Papara No:</span>
                          <div className="flex items-center gap-2">
                            <span className={`${textPrimary} font-mono font-bold text-lg`}>{details.paparaNo}</span>
                            <button
                              onClick={() => handleCopy(details.paparaNo, 'papara')}
                              className={`${accentColor} p-2 rounded-lg hover:bg-white/10`}
                            >
                              {copiedField === 'papara' ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {details.accountHolder && (
                      <div className={`rounded-xl p-4 border ${cardBg}`}>
                        <div className="flex justify-between items-center">
                          <span className={`${textSecondary}`}>{'Alıcı:'}</span>
                          <span className={`${textPrimary} font-bold`}>{details.accountHolder}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Warning */}
              <div className={`p-4 rounded-xl ${isFacebook ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-500/10 border-yellow-500/30'} border`}>
                <p className="text-yellow-500 font-medium flex items-start gap-2">
                  <span className="text-xl">⚠️</span>
                  <span>
                    {`Açıklama kısmına kullanıcı adınızı yazın: "${username}"`}
                  </span>
                </p>
              </div>

              <button
                onClick={() => {
                  setActivePaymentPopup(null)
                  setShowPaymentMethodsPopup(true)
                }}
                className={`w-full mt-4 py-3 rounded-xl ${textSecondary} hover:opacity-80 transition-all`}
              >
                ← {'Geri Dön'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bank Transfer Detail Popup */}
      <AnimatePresence>
        {activePaymentPopup === 'bank_transfer' && selectedPackage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50"
            onClick={closeAllPopups}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${modalBg} rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto border-t sm:border ${modalBorder}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h2 className={`text-lg font-bold ${textPrimary}`}>{'Banka Transferi'}</h2>
                </div>
                <button onClick={closeAllPopups} className="text-gray-400 hover:text-white p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Order Summary */}
              <div className={`rounded-xl p-4 mb-4 border ${cardBg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`${goldColor} font-bold text-xl`}>{selectedPackage.credits} {'Jeton'}</div>
                    {selectedPackage.bonusCredits > 0 && <div className="text-green-400 text-sm">+{selectedPackage.bonusCredits} bonus</div>}
                  </div>
                  <div className={`${textPrimary} font-bold text-xl`}>{formatPrice(selectedPackage.price, selectedPackage.currency)}</div>
                </div>
              </div>

              {/* Payment Details */}
              {paymentMethods.filter(m => m.type === 'bank_transfer').map((method) => {
                const details = getPaymentDetails(method)
                return details && (
                  <div key={method.id} className="space-y-3 mb-4">
                    {details.bankName && (
                      <div className={`rounded-xl p-4 border ${cardBg}`}>
                        <div className="flex justify-between items-center">
                          <span className={`${textSecondary}`}>{'Banka:'}</span>
                          <span className={`${textPrimary} font-bold`}>{details.bankName}</span>
                        </div>
                      </div>
                    )}
                    {details.accountHolder && (
                      <div className={`rounded-xl p-4 border ${cardBg}`}>
                        <div className="flex justify-between items-center">
                          <span className={`${textSecondary}`}>{'Alıcı:'}</span>
                          <span className={`${textPrimary} font-bold`}>{details.accountHolder}</span>
                        </div>
                      </div>
                    )}
                    {details.iban && (
                      <div className={`rounded-xl p-4 border ${cardBg}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`${textSecondary}`}>IBAN:</span>
                          <button
                            onClick={() => handleCopy(details.iban.replace(/\s/g, ''), 'iban')}
                            className={`${accentColor} flex items-center gap-1 text-sm font-medium`}
                          >
                            {copiedField === 'iban' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            {copiedField === 'iban' ? ('Kopyalandı!') : ('Kopyala')}
                          </button>
                        </div>
                        <div className={`${isFacebook ? 'bg-gray-100' : isCosmic ? 'bg-blue-900/30' : 'bg-purple-900/50'} p-3 rounded-lg ${textPrimary} font-mono text-sm break-all`}>
                          {details.iban}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Warning */}
              <div className={`p-4 rounded-xl ${isFacebook ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-500/10 border-yellow-500/30'} border`}>
                <p className="text-yellow-500 font-medium flex items-start gap-2">
                  <span className="text-xl">⚠️</span>
                  <span>
                    {`Açıklama kısmına kullanıcı adınızı yazın: "${username}"`}
                  </span>
                </p>
              </div>

              <button
                onClick={() => {
                  setActivePaymentPopup(null)
                  setShowPaymentMethodsPopup(true)
                }}
                className={`w-full mt-4 py-3 rounded-xl ${textSecondary} hover:opacity-80 transition-all`}
              >
                ← {'Geri Dön'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}