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
  CreditCard
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
  const [activePopup, setActivePopup] = useState<string | null>(null) // 'whatsapp', 'papara', 'bank_transfer', etc.

  // Theme colors
  const isCosmic = theme === 'cosmic'
  const isFacebook = theme === 'facebook'

  const bgColor = isFacebook ? 'bg-[#f0f2f5]' : isCosmic ? 'bg-[#0a1628]' : 'bg-[#0f0520]'
  const cardBg = isFacebook ? 'bg-white border-gray-200' : isCosmic ? 'bg-white/5 border-blue-500/20' : 'bg-[#1a0a2e]/80 border-fuchsia-500/20'
  const cardBgFeatured = isFacebook ? 'bg-blue-50 border-blue-400' : isCosmic ? 'bg-blue-500/10 border-blue-400/50' : 'bg-gradient-to-br from-fuchsia-500/15 to-purple-600/15 border-fuchsia-500/40'
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
        fetch('/api/admin/settings')
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
        const waNumber = settings.find((s: { key: string }) => s.key === 'whatsapp_number')?.value || ''
        const waMessage = settings.find((s: { key: string }) => s.key === 'whatsapp_message')?.value || ''
        const waEnabled = settings.find((s: { key: string }) => s.key === 'whatsapp_enabled')?.value === 'true'
        if (waNumber && waEnabled) {
          setWhatsappSettings({ number: waNumber, message: waMessage, enabled: waEnabled })
        }
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
      router.push(`/${language}/login`)
      return
    }
    setSelectedPackage(pkg)
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

  const getWhatsAppLink = () => {
    if (!whatsappSettings) return '#'
    const username = (session?.user as { username?: string })?.username || (session?.user?.name || '')
    let message = whatsappSettings.message
      .replace('{username}', username)
      .replace('{package}', selectedPackage ? `${selectedPackage.credits} Jeton - ${formatPrice(selectedPackage.price, selectedPackage.currency)}` : '')
    return `https://wa.me/${whatsappSettings.number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
  }

  const closePopup = () => setActivePopup(null)

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <Loader2 className={`w-8 h-8 ${accentColor} animate-spin`} />
      </div>
    )
  }

  const username = (session?.user as { username?: string })?.username || session?.user?.name || ''

  return (
    <div className={`min-h-screen ${bgColor} pt-16 pb-24 px-3`}>
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
            {language === 'tr' ? 'Jeton Satın Al' : 'Buy Credits'}
          </h1>
          {session?.user && (
            <div className={`inline-flex items-center gap-1.5 ${balanceBg} px-3 py-1.5 rounded-full border text-sm`}>
              <Coins className={`w-3.5 h-3.5 ${goldColor}`} />
              <span className={textSecondary}>{language === 'tr' ? 'Bakiye:' : 'Balance:'}</span>
              <span className={`${goldColor} font-bold`}>{userCredits}</span>
            </div>
          )}
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
                selectedPackage?.id === pkg.id
                  ? (isFacebook ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500' : isCosmic ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400' : 'bg-fuchsia-500/20 border-fuchsia-400 ring-2 ring-fuchsia-400')
                  : pkg.isFeatured ? cardBgFeatured : cardBg
              }`}
            >
              {pkg.isFeatured && (
                <div className={`absolute -top-2 left-1/2 -translate-x-1/2 ${badgeBg} text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5`}>
                  <Star className="w-2.5 h-2.5" />
                  {language === 'tr' ? 'Popüler' : 'Popular'}
                </div>
              )}

              <div className="text-center">
                <div className={`text-2xl font-bold ${goldColor}`}>
                  {pkg.credits}
                </div>
                <div className={`text-xs ${textSecondary} mb-1`}>
                  {language === 'tr' ? 'jeton' : 'credits'}
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

        {/* Payment Methods Buttons */}
        {selectedPackage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className={`text-center ${textSecondary} text-sm mb-3`}>
              <span className={goldColor}>{selectedPackage.credits} {language === 'tr' ? 'jeton' : 'credits'}</span>
              {selectedPackage.bonusCredits > 0 && <span className="text-green-400"> +{selectedPackage.bonusCredits}</span>}
              <span> = </span>
              <span className={`${textPrimary} font-bold`}>{formatPrice(selectedPackage.price, selectedPackage.currency)}</span>
            </div>

            <h3 className={`${textPrimary} font-semibold text-sm mb-2`}>
              {language === 'tr' ? 'Ödeme Yöntemi Seçin' : 'Select Payment Method'}
            </h3>

            {/* WhatsApp Button */}
            {whatsappSettings?.enabled && (
              <button
                onClick={() => setActivePopup('whatsapp')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-medium transition-all active:scale-98 hover:opacity-90"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold">WhatsApp</div>
                  <div className="text-xs opacity-80">{language === 'tr' ? 'Hızlı destek' : 'Quick support'}</div>
                </div>
                <ExternalLink className="w-4 h-4 opacity-70" />
              </button>
            )}

            {/* Other Payment Methods */}
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setActivePopup(method.type)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-98 ${cardBg} hover:opacity-80`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                  method.type === 'papara' ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'
                }`}>
                  {getMethodIcon(method.type)}
                </div>
                <div className="flex-1 text-left">
                  <div className={`${textPrimary} font-bold`}>
                    {language === 'tr' ? method.name : (method.nameEn || method.name)}
                  </div>
                  <div className={`${textSecondary} text-xs`}>
                    {language === 'tr' ? method.description : (method.descriptionEn || method.description)}
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}

        {!selectedPackage && (
          <div className={`text-center ${textSecondary} text-sm p-4 rounded-xl ${cardBg} border`}>
            {language === 'tr' ? '👆 Önce bir paket seçin' : '👆 Select a package first'}
          </div>
        )}
      </div>

      {/* WhatsApp Popup */}
      <AnimatePresence>
        {activePopup === 'whatsapp' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50"
            onClick={closePopup}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${modalBg} rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto border-t sm:border ${modalBorder}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <h2 className={`text-lg font-bold ${textPrimary}`}>WhatsApp</h2>
                </div>
                <button onClick={closePopup} className="text-gray-400 hover:text-white p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {selectedPackage && (
                <div className={`rounded-lg p-3 mb-4 border ${cardBg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className={`w-4 h-4 ${goldColor}`} />
                      <span className={textPrimary}>{selectedPackage.credits} {language === 'tr' ? 'jeton' : 'credits'}</span>
                      {selectedPackage.bonusCredits > 0 && <span className="text-green-400 text-sm">+{selectedPackage.bonusCredits}</span>}
                    </div>
                    <span className={`${goldColor} font-bold`}>{formatPrice(selectedPackage.price, selectedPackage.currency)}</span>
                  </div>
                </div>
              )}

              <p className={`${textSecondary} text-sm mb-4`}>
                {language === 'tr'
                  ? 'WhatsApp üzerinden bizimle iletişime geçerek jeton satın alabilirsiniz.'
                  : 'Contact us via WhatsApp to purchase credits.'}
              </p>

              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{language === 'tr' ? 'WhatsApp\'ı Aç' : 'Open WhatsApp'}</span>
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Papara Popup */}
      <AnimatePresence>
        {activePopup === 'papara' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50"
            onClick={closePopup}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${modalBg} rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto border-t sm:border ${modalBorder}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <h2 className={`text-lg font-bold ${textPrimary}`}>Papara</h2>
                </div>
                <button onClick={closePopup} className="text-gray-400 hover:text-white p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {selectedPackage && (
                <div className={`rounded-lg p-3 mb-4 border ${cardBg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className={`w-4 h-4 ${goldColor}`} />
                      <span className={textPrimary}>{selectedPackage.credits} {language === 'tr' ? 'jeton' : 'credits'}</span>
                      {selectedPackage.bonusCredits > 0 && <span className="text-green-400 text-sm">+{selectedPackage.bonusCredits}</span>}
                    </div>
                    <span className={`${goldColor} font-bold`}>{formatPrice(selectedPackage.price, selectedPackage.currency)}</span>
                  </div>
                </div>
              )}

              {paymentMethods.filter(m => m.type === 'papara').map((method) => {
                const details = getPaymentDetails(method)
                return details && (
                  <div key={method.id} className="space-y-3">
                    {details.paparaNo && (
                      <div className={`rounded-lg p-3 border ${cardBg}`}>
                        <div className="flex justify-between items-center">
                          <span className={`${textSecondary} text-sm`}>Papara No:</span>
                          <div className="flex items-center gap-2">
                            <span className={`${textPrimary} font-mono font-bold`}>{details.paparaNo}</span>
                            <button
                              onClick={() => handleCopy(details.paparaNo, 'papara')}
                              className={`${accentColor} p-1.5 rounded-lg hover:bg-white/10`}
                            >
                              {copiedField === 'papara' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {details.accountHolder && (
                      <div className={`rounded-lg p-3 border ${cardBg}`}>
                        <div className="flex justify-between items-center">
                          <span className={`${textSecondary} text-sm`}>{language === 'tr' ? 'Ad Soyad:' : 'Name:'}</span>
                          <span className={`${textPrimary} font-medium`}>{details.accountHolder}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              <div className={`mt-4 p-3 rounded-lg ${isFacebook ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-500/10 border-yellow-500/30'} border`}>
                <p className="text-yellow-500 text-sm flex items-start gap-2">
                  <span>⚠️</span>
                  <span>
                    {language === 'tr'
                      ? `Açıklama kısmına: ${username || '(Giriş yapın)'}`
                      : `Description: ${username || '(Login first)'}`}
                  </span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bank Transfer Popup */}
      <AnimatePresence>
        {activePopup === 'bank_transfer' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50"
            onClick={closePopup}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${modalBg} rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto border-t sm:border ${modalBorder}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h2 className={`text-lg font-bold ${textPrimary}`}>{language === 'tr' ? 'Banka Transferi' : 'Bank Transfer'}</h2>
                </div>
                <button onClick={closePopup} className="text-gray-400 hover:text-white p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {selectedPackage && (
                <div className={`rounded-lg p-3 mb-4 border ${cardBg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className={`w-4 h-4 ${goldColor}`} />
                      <span className={textPrimary}>{selectedPackage.credits} {language === 'tr' ? 'jeton' : 'credits'}</span>
                      {selectedPackage.bonusCredits > 0 && <span className="text-green-400 text-sm">+{selectedPackage.bonusCredits}</span>}
                    </div>
                    <span className={`${goldColor} font-bold`}>{formatPrice(selectedPackage.price, selectedPackage.currency)}</span>
                  </div>
                </div>
              )}

              {paymentMethods.filter(m => m.type === 'bank_transfer').map((method) => {
                const details = getPaymentDetails(method)
                return details && (
                  <div key={method.id} className="space-y-3">
                    {details.bankName && (
                      <div className={`rounded-lg p-3 border ${cardBg}`}>
                        <div className="flex justify-between items-center">
                          <span className={`${textSecondary} text-sm`}>{language === 'tr' ? 'Banka:' : 'Bank:'}</span>
                          <span className={`${textPrimary} font-medium`}>{details.bankName}</span>
                        </div>
                      </div>
                    )}
                    {details.accountHolder && (
                      <div className={`rounded-lg p-3 border ${cardBg}`}>
                        <div className="flex justify-between items-center">
                          <span className={`${textSecondary} text-sm`}>{language === 'tr' ? 'Ad Soyad:' : 'Name:'}</span>
                          <span className={`${textPrimary} font-medium`}>{details.accountHolder}</span>
                        </div>
                      </div>
                    )}
                    {details.iban && (
                      <div className={`rounded-lg p-3 border ${cardBg}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`${textSecondary} text-sm`}>IBAN:</span>
                          <button
                            onClick={() => handleCopy(details.iban.replace(/\s/g, ''), 'iban')}
                            className={`${accentColor} flex items-center gap-1 text-sm`}
                          >
                            {copiedField === 'iban' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            {copiedField === 'iban' ? (language === 'tr' ? 'Kopyalandı' : 'Copied') : (language === 'tr' ? 'Kopyala' : 'Copy')}
                          </button>
                        </div>
                        <div className={`${isFacebook ? 'bg-gray-100' : isCosmic ? 'bg-blue-900/30' : 'bg-purple-900/50'} p-2 rounded ${textPrimary} font-mono text-xs break-all`}>
                          {details.iban}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              <div className={`mt-4 p-3 rounded-lg ${isFacebook ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-500/10 border-yellow-500/30'} border`}>
                <p className="text-yellow-500 text-sm flex items-start gap-2">
                  <span>⚠️</span>
                  <span>
                    {language === 'tr'
                      ? `Açıklama kısmına: ${username || '(Giriş yapın)'}`
                      : `Description: ${username || '(Login first)'}`}
                  </span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Note - Fixed at bottom */}
      <div className="fixed bottom-20 left-0 right-0 px-3">
        <div className={`max-w-md mx-auto text-center ${textSecondary} text-xs p-2 rounded-lg ${isFacebook ? 'bg-gray-100' : 'bg-black/50'} backdrop-blur-sm`}>
          {language === 'tr'
            ? '💡 Ödeme sonrası jetonlar otomatik yüklenir'
            : '💡 Credits auto-added after payment'}
        </div>
      </div>
    </div>
  )
}
