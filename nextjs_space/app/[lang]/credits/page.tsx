'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Coins,
  CreditCard,
  Bitcoin,
  Building2,
  ArrowLeft,
  Star,
  Gift,
  Check,
  Copy,
  Loader2,
  Sparkles,
  X
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

export default function CreditsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [userCredits, setUserCredits] = useState(0)

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
      const [packagesRes, methodsRes] = await Promise.all([
        fetch('/api/credit-packages'),
        fetch('/api/payment-methods')
      ])
      
      if (packagesRes.ok) {
        const data = await packagesRes.json()
        setPackages(data.filter((p: CreditPackage) => p.isActive))
      }
      
      if (methodsRes.ok) {
        const data = await methodsRes.json()
        setPaymentMethods(data.filter((m: PaymentMethod) => m.isActive))
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
      case 'credit_card':
        return <CreditCard className="w-6 h-6" />
      case 'bitcoin':
        return <Bitcoin className="w-6 h-6" />
      case 'bank_transfer':
        return <Building2 className="w-6 h-6" />
      default:
        return <Coins className="w-6 h-6" />
    }
  }

  const handleSelectPackage = (pkg: CreditPackage) => {
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
    setSelectedPackage(pkg)
    setSelectedMethod(null)
    setShowPaymentModal(true)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePayment = async () => {
    if (!selectedPackage || !selectedMethod) return
    
    setProcessing(true)
    try {
      // For bank transfer and bitcoin, we just show the details
      // For credit card, we would integrate with a payment provider
      if (selectedMethod === 'credit_card') {
        // Placeholder for credit card payment integration
        alert(language === 'tr' 
          ? 'Kredi kartı ödeme entegrasyonu yakında aktif olacak' 
          : 'Credit card payment integration coming soon')
      }
    } finally {
      setProcessing(false)
    }
  }

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'TRY') {
      return `₺${price.toLocaleString('tr-TR')}`
    }
    return `$${price.toLocaleString('en-US')}`
  }

  const getPaymentDetails = (method: PaymentMethod) => {
    if (!method.config) return null
    try {
      return JSON.parse(method.config)
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0118] py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Link
            href={`/${language}`}
            className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'tr' ? 'Ana Sayfa' : 'Home'}
          </Link>
          
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mx-auto mb-4">
            <Coins className="w-8 h-8 text-black" />
          </div>
          
          <h1 className="font-serif text-3xl md:text-4xl text-gold-400 mb-2">
            {language === 'tr' ? 'Jeton Satın Al' : 'Buy Credits'}
          </h1>
          <p className="text-purple-300">
            {language === 'tr' 
              ? 'Fal baktırmak için jeton satın alın' 
              : 'Purchase credits for fortune readings'}
          </p>
          
          {session?.user && (
            <div className="mt-4 inline-flex items-center gap-2 bg-purple-900/30 px-4 py-2 rounded-full border border-purple-500/30">
              <Coins className="w-4 h-4 text-gold-400" />
              <span className="text-white">
                {language === 'tr' ? 'Mevcut Bakiye:' : 'Current Balance:'}
              </span>
              <span className="text-gold-400 font-bold">{userCredits}</span>
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
                pkg.isFeatured
                  ? 'bg-gradient-to-br from-gold-500/20 to-purple-600/20 border-gold-500/50'
                  : 'bg-purple-900/20 border-purple-500/30 hover:border-purple-500/50'
              }`}
            >
              {pkg.isFeatured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gold-500 to-gold-600 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {language === 'tr' ? 'Popüler' : 'Popular'}
                </div>
              )}
              
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
                  <Coins className="w-7 h-7 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-1">
                  {language === 'tr' ? pkg.name : (pkg.nameEn || pkg.name)}
                </h3>
                
                <div className="text-3xl font-bold text-gold-400 mb-2">
                  {pkg.credits}
                  <span className="text-sm text-purple-300 ml-1">
                    {language === 'tr' ? 'jeton' : 'credits'}
                  </span>
                </div>
                
                {pkg.bonusCredits > 0 && (
                  <div className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-sm px-2 py-1 rounded-full mb-3">
                    <Gift className="w-3 h-3" />
                    +{pkg.bonusCredits} {language === 'tr' ? 'bonus' : 'bonus'}
                  </div>
                )}
                
                <div className="text-2xl font-bold text-white">
                  {formatPrice(pkg.price, pkg.currency)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Payment Methods Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-purple-900/20 rounded-2xl p-6 border border-purple-500/30"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gold-400" />
            {language === 'tr' ? 'Ödeme Yöntemleri' : 'Payment Methods'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center gap-3 p-4 bg-purple-800/20 rounded-xl border border-purple-500/20"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white">
                  {getMethodIcon(method.type)}
                </div>
                <div>
                  <h3 className="text-white font-medium">
                    {language === 'tr' ? method.name : (method.nameEn || method.name)}
                  </h3>
                  <p className="text-purple-300 text-sm">
                    {language === 'tr' ? method.description : (method.descriptionEn || method.description)}
                  </p>
                </div>
              </div>
            ))}
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
              className="bg-[#1a0a2e] rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-purple-500/30"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {language === 'tr' ? 'Ödeme Yöntemi Seçin' : 'Select Payment Method'}
                </h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Selected Package Summary */}
              <div className="bg-purple-900/30 rounded-xl p-4 mb-6 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {language === 'tr' ? selectedPackage.name : (selectedPackage.nameEn || selectedPackage.name)}
                      </p>
                      <p className="text-purple-300 text-sm">
                        {selectedPackage.credits} {language === 'tr' ? 'jeton' : 'credits'}
                        {selectedPackage.bonusCredits > 0 && (
                          <span className="text-green-400"> +{selectedPackage.bonusCredits} bonus</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gold-400">
                    {formatPrice(selectedPackage.price, selectedPackage.currency)}
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const details = getPaymentDetails(method)
                  const isSelected = selectedMethod === method.type
                  
                  return (
                    <div key={method.id}>
                      <button
                        onClick={() => setSelectedMethod(isSelected ? null : method.type)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'bg-purple-600/20 border-purple-500'
                            : 'bg-purple-900/20 border-purple-500/30 hover:border-purple-500/50'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isSelected
                            ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-black'
                            : 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                        }`}>
                          {getMethodIcon(method.type)}
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-white font-medium">
                            {language === 'tr' ? method.name : (method.nameEn || method.name)}
                          </h3>
                          <p className="text-purple-300 text-sm">
                            {language === 'tr' ? method.description : (method.descriptionEn || method.description)}
                          </p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-gold-400 bg-gold-400' : 'border-purple-500'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-black" />}
                        </div>
                      </button>

                      {/* Payment Details */}
                      <AnimatePresence>
                        {isSelected && details && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 p-4 bg-purple-800/30 rounded-xl border border-purple-500/20">
                              {method.type === 'bank_transfer' && (
                                <div className="space-y-3">
                                  {details.bankName && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-purple-300">{language === 'tr' ? 'Banka:' : 'Bank:'}</span>
                                      <span className="text-white font-medium">{details.bankName}</span>
                                    </div>
                                  )}
                                  {details.accountHolder && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-purple-300">{language === 'tr' ? 'Hesap Sahibi:' : 'Account Holder:'}</span>
                                      <span className="text-white font-medium">{details.accountHolder}</span>
                                    </div>
                                  )}
                                  {details.iban && (
                                    <div>
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-purple-300">IBAN:</span>
                                        <button
                                          onClick={() => handleCopy(details.iban)}
                                          className="text-gold-400 hover:text-gold-300 flex items-center gap-1 text-sm"
                                        >
                                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                          {copied ? (language === 'tr' ? 'Kopyalandı' : 'Copied') : (language === 'tr' ? 'Kopyala' : 'Copy')}
                                        </button>
                                      </div>
                                      <div className="bg-purple-900/50 p-2 rounded text-white font-mono text-sm break-all">
                                        {details.iban}
                                      </div>
                                    </div>
                                  )}
                                  <div className="pt-2 border-t border-purple-500/20">
                                    <p className="text-yellow-400 text-sm">
                                      ⚠️ {language === 'tr' 
                                        ? `Açıklama kısmına "${session?.user?.email}" yazınız.`
                                        : `Please write "${session?.user?.email}" in the description.`}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {method.type === 'bitcoin' && details.walletAddress && (
                                <div className="space-y-3">
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-purple-300">{language === 'tr' ? 'Cüzdan Adresi:' : 'Wallet Address:'}</span>
                                      <button
                                        onClick={() => handleCopy(details.walletAddress)}
                                        className="text-gold-400 hover:text-gold-300 flex items-center gap-1 text-sm"
                                      >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? (language === 'tr' ? 'Kopyalandı' : 'Copied') : (language === 'tr' ? 'Kopyala' : 'Copy')}
                                      </button>
                                    </div>
                                    <div className="bg-purple-900/50 p-2 rounded text-white font-mono text-sm break-all">
                                      {details.walletAddress}
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-purple-500/20">
                                    <p className="text-yellow-400 text-sm">
                                      ⚠️ {language === 'tr' 
                                        ? 'Ödeme sonrası destek ile iletişime geçin.'
                                        : 'Contact support after payment.'}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {method.type === 'credit_card' && (
                                <div className="text-center py-4">
                                  <Sparkles className="w-12 h-12 text-gold-400 mx-auto mb-3" />
                                  <p className="text-white">
                                    {language === 'tr' 
                                      ? 'Kredi kartı ile güvenli ödeme'
                                      : 'Secure payment with credit card'}
                                  </p>
                                  <button
                                    onClick={handlePayment}
                                    disabled={processing}
                                    className="mt-4 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-bold px-6 py-3 rounded-xl hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50"
                                  >
                                    {processing ? (
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                      language === 'tr' ? 'Ödemeye Devam Et' : 'Proceed to Payment'
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
