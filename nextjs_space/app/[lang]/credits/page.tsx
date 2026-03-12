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
  ExternalLink
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
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const { theme } = useSiteTheme()

  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [userCredits, setUserCredits] = useState(0)

  // Theme colors
  const isFalclub = theme === 'falclub' || theme === 'falci'
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
      case 'papara': return <Wallet className="w-6 h-6" />
      case 'bank_transfer': return <Building2 className="w-6 h-6" />
      default: return <Coins className="w-6 h-6" />
    }
  }

  const handleSelectPackage = (pkg: CreditPackage) => {
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
    setSelectedPackage(pkg)
    setShowPaymentModal(true)
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

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <Loader2 className={`w-8 h-8 ${accentColor} animate-spin`} />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bgColor} py-20 px-4 pb-32`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${iconBgGold} flex items-center justify-center mx-auto mb-4`}>
            <Coins className={`w-8 h-8 ${isFacebook ? 'text-white' : 'text-black'}`} />
          </div>

          <h1 className={`text-3xl md:text-4xl font-bold ${textPrimary} mb-2`}>
            {language === 'tr' ? 'Jeton Satın Al' : 'Buy Credits'}
          </h1>
          <p className={textSecondary}>
            {language === 'tr' ? 'Fal baktırmak için jeton satın alın' : 'Purchase credits for fortune readings'}
          </p>

          {session?.user && (
            <div className={`mt-4 inline-flex items-center gap-2 ${balanceBg} px-4 py-2 rounded-full border`}>
              <Coins className={`w-4 h-4 ${goldColor}`} />
              <span className={textPrimary}>
                {language === 'tr' ? 'Mevcut Bakiye:' : 'Current Balance:'}
              </span>
              <span className={`${goldColor} font-bold`}>{userCredits}</span>
            </div>
          )}
        </motion.div>

        {/* Credit Packages */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelectPackage(pkg)}
              className={`relative cursor-pointer rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-105 ${
                pkg.isFeatured ? cardBgFeatured : cardBg
              }`}
            >
              {pkg.isFeatured && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${badgeBg} text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1`}>
                  <Star className="w-3 h-3" />
                  {language === 'tr' ? 'Popüler' : 'Popular'}
                </div>
              )}

              <div className="text-center">
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${iconBg} flex items-center justify-center mx-auto mb-4`}>
                  <Coins className="w-7 h-7 text-white" />
                </div>

                <h3 className={`text-xl font-bold ${textPrimary} mb-1`}>
                  {language === 'tr' ? pkg.name : (pkg.nameEn || pkg.name)}
                </h3>

                <div className={`text-3xl font-bold ${goldColor} mb-2`}>
                  {pkg.credits}
                  <span className={`text-sm ${textSecondary} ml-1`}>
                    {language === 'tr' ? 'jeton' : 'credits'}
                  </span>
                </div>

                {pkg.bonusCredits > 0 && (
                  <div className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-sm px-2 py-1 rounded-full mb-3">
                    <Gift className="w-3 h-3" />
                    +{pkg.bonusCredits} {language === 'tr' ? 'bonus' : 'bonus'}
                  </div>
                )}

                <div className={`text-2xl font-bold ${textPrimary}`}>
                  {formatPrice(pkg.price, pkg.currency)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Payment Methods Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`rounded-2xl p-6 border ${cardBg}`}
        >
          <h2 className={`text-xl font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
            <Wallet className={`w-5 h-5 ${goldColor}`} />
            {language === 'tr' ? 'Ödeme Yöntemleri' : 'Payment Methods'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`flex items-center gap-3 p-4 rounded-xl border ${cardBg}`}
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${method.type === 'papara' ? 'from-purple-500 to-purple-700' : iconBg} flex items-center justify-center text-white`}>
                  {getMethodIcon(method.type)}
                </div>
                <div>
                  <h3 className={`${textPrimary} font-medium`}>
                    {language === 'tr' ? method.name : (method.nameEn || method.name)}
                  </h3>
                  <p className={`${textSecondary} text-sm`}>
                    {language === 'tr' ? method.description : (method.descriptionEn || method.description)}
                  </p>
                </div>
              </div>
            ))}

            {/* WhatsApp Support */}
            {whatsappSettings?.enabled && (
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-4 rounded-xl border ${cardBg} hover:opacity-80 transition-opacity`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`${textPrimary} font-medium`}>
                    {language === 'tr' ? 'WhatsApp Destek' : 'WhatsApp Support'}
                  </h3>
                  <p className={`${textSecondary} text-sm`}>
                    {language === 'tr' ? 'Hızlı destek için yazın' : 'Contact for quick support'}
                  </p>
                </div>
                <ExternalLink className={`w-4 h-4 ${textSecondary} ml-auto`} />
              </a>
            )}
          </div>
        </motion.div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedPackage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${modalBg} rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border ${modalBorder}`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-bold ${textPrimary}`}>
                  {language === 'tr' ? 'Ödeme Bilgileri' : 'Payment Information'}
                </h2>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Selected Package Summary */}
              <div className={`rounded-xl p-4 mb-6 border ${cardBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${iconBgGold} flex items-center justify-center`}>
                      <Coins className={`w-5 h-5 ${isFacebook ? 'text-white' : 'text-black'}`} />
                    </div>
                    <div>
                      <p className={`${textPrimary} font-medium`}>
                        {language === 'tr' ? selectedPackage.name : (selectedPackage.nameEn || selectedPackage.name)}
                      </p>
                      <p className={`${textSecondary} text-sm`}>
                        {selectedPackage.credits} {language === 'tr' ? 'jeton' : 'credits'}
                        {selectedPackage.bonusCredits > 0 && (
                          <span className="text-green-400"> +{selectedPackage.bonusCredits} bonus</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${goldColor}`}>
                    {formatPrice(selectedPackage.price, selectedPackage.currency)}
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                {paymentMethods.map((method) => {
                  const details = getPaymentDetails(method)
                  const username = (session?.user as { username?: string })?.username || session?.user?.name || ''

                  return (
                    <div key={method.id} className={`rounded-xl border ${cardBg} overflow-hidden`}>
                      {/* Method Header */}
                      <div className={`flex items-center gap-3 p-4 ${method.type === 'papara' ? 'bg-purple-600/20' : 'bg-blue-600/20'}`}>
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${method.type === 'papara' ? 'from-purple-500 to-purple-700' : 'from-blue-500 to-blue-700'} flex items-center justify-center text-white`}>
                          {getMethodIcon(method.type)}
                        </div>
                        <div>
                          <h3 className={`${textPrimary} font-bold`}>
                            {language === 'tr' ? method.name : (method.nameEn || method.name)}
                          </h3>
                          <p className={`${textSecondary} text-sm`}>
                            {language === 'tr' ? method.description : (method.descriptionEn || method.description)}
                          </p>
                        </div>
                      </div>

                      {/* Method Details */}
                      <div className="p-4 space-y-3">
                        {method.type === 'papara' && details && (
                          <>
                            {details.paparaNo && (
                              <div className="flex justify-between items-center">
                                <span className={textSecondary}>Papara No:</span>
                                <div className="flex items-center gap-2">
                                  <span className={`${textPrimary} font-mono font-bold`}>{details.paparaNo}</span>
                                  <button
                                    onClick={() => handleCopy(details.paparaNo, 'papara')}
                                    className={`${accentColor} p-1 rounded hover:bg-white/10`}
                                  >
                                    {copiedField === 'papara' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                            )}
                            {details.accountHolder && (
                              <div className="flex justify-between items-center">
                                <span className={textSecondary}>{language === 'tr' ? 'Ad Soyad:' : 'Name:'}</span>
                                <span className={`${textPrimary} font-medium`}>{details.accountHolder}</span>
                              </div>
                            )}
                          </>
                        )}

                        {method.type === 'bank_transfer' && details && (
                          <>
                            {details.bankName && (
                              <div className="flex justify-between items-center">
                                <span className={textSecondary}>{language === 'tr' ? 'Banka:' : 'Bank:'}</span>
                                <span className={`${textPrimary} font-medium`}>{details.bankName}</span>
                              </div>
                            )}
                            {details.iban && (
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className={textSecondary}>IBAN:</span>
                                  <button
                                    onClick={() => handleCopy(details.iban.replace(/\s/g, ''), 'iban')}
                                    className={`${accentColor} flex items-center gap-1 text-sm`}
                                  >
                                    {copiedField === 'iban' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    {copiedField === 'iban' ? (language === 'tr' ? 'Kopyalandı' : 'Copied') : (language === 'tr' ? 'Kopyala' : 'Copy')}
                                  </button>
                                </div>
                                <div className={`${isFacebook ? 'bg-gray-100' : isCosmic ? 'bg-blue-900/30' : 'bg-purple-900/50'} p-2 rounded ${textPrimary} font-mono text-sm`}>
                                  {details.iban}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Note/Instruction */}
                        <div className={`pt-3 border-t ${isFacebook ? 'border-gray-200' : isCosmic ? 'border-blue-500/20' : 'border-fuchsia-500/20'}`}>
                          <p className="text-yellow-400 text-sm flex items-start gap-2">
                            <span>⚠️</span>
                            <span>
                              {language === 'tr'
                                ? `Açıklama kısmına KULLANICI ADINIZI yazınız: ${username || '(Giriş yapın)'}`
                                : `Write your USERNAME in description: ${username || '(Please login)'}`}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* WhatsApp Support Button */}
                {whatsappSettings?.enabled && (
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 px-6 rounded-xl hover:opacity-90 transition-all"
                  >
                    <MessageCircle className="w-6 h-6" />
                    <span>{language === 'tr' ? 'WhatsApp ile İletişime Geç' : 'Contact via WhatsApp'}</span>
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}

                {/* Info Note */}
                <div className={`text-center ${textSecondary} text-sm mt-4 p-3 rounded-lg ${isFacebook ? 'bg-gray-100' : 'bg-white/5'}`}>
                  <p>
                    {language === 'tr'
                      ? '💡 Ödeme yaptıktan sonra jetonlarınız hesabınıza otomatik olarak tanımlanacaktır. Sorun yaşarsanız WhatsApp üzerinden destek alabilirsiniz.'
                      : '💡 After payment, credits will be automatically added to your account. Contact WhatsApp support if you have any issues.'}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
