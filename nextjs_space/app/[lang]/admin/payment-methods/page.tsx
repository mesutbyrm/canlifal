'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  CreditCard,
  Bitcoin,
  Building2,
  Loader2,
  Save,
  Check,
  X,
  Coins
} from 'lucide-react'

interface PaymentMethod {
  id: string
  type: string
  name: string
  nameEn: string | null
  description: string | null
  descriptionEn: string | null
  isActive: boolean
  config: string | null
  sortOrder: number
}

interface BankConfig {
  bankName: string
  accountHolder: string
  iban: string
  accountNumber: string
}

interface BitcoinConfig {
  walletAddress: string
}

export default function PaymentMethodsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      router.push(`/${language}/login`)
      return
    }
    fetchMethods()
  }, [session, status])

  const fetchMethods = async () => {
    try {
      const res = await fetch('/api/admin/payment-methods')
      if (res.ok) {
        const data = await res.json()
        setMethods(data)
      }
    } catch (err) {
      console.error('Fetch methods error:', err)
    } finally {
      setLoading(false)
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

  const getConfig = (method: PaymentMethod): BankConfig | BitcoinConfig | null => {
    if (!method.config) return null
    try {
      return JSON.parse(method.config)
    } catch {
      return null
    }
  }

  const updateMethod = async (method: PaymentMethod) => {
    setSaving(method.type)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(method)
      })
      if (res.ok) {
        setSuccess(method.type)
        setTimeout(() => setSuccess(null), 2000)
      }
    } catch (err) {
      console.error('Update method error:', err)
    } finally {
      setSaving(null)
    }
  }

  const handleToggleActive = (type: string) => {
    setMethods(prev => prev.map(m => {
      if (m.type === type) {
        const updated = { ...m, isActive: !m.isActive }
        updateMethod(updated)
        return updated
      }
      return m
    }))
  }

  const handleUpdateConfig = (type: string, configKey: string, value: string) => {
    setMethods(prev => prev.map(m => {
      if (m.type === type) {
        const currentConfig = getConfig(m) || {}
        const newConfig = { ...currentConfig, [configKey]: value }
        return { ...m, config: JSON.stringify(newConfig) }
      }
      return m
    }))
  }

  const handleSaveConfig = (type: string) => {
    const method = methods.find(m => m.type === type)
    if (method) {
      updateMethod(method)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0118] py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href={`/${language}/admin`}
            className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'tr' ? 'Admin Panel' : 'Admin Panel'}
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-black" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {language === 'tr' ? 'Ödeme Yöntemleri' : 'Payment Methods'}
              </h1>
              <p className="text-purple-300">
                {language === 'tr' ? 'Ödeme yöntemlerini yönetin' : 'Manage payment methods'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Payment Methods List */}
        <div className="space-y-6">
          {methods.map((method, index) => {
            const config = getConfig(method)
            
            return (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-purple-900/20 rounded-2xl p-6 border border-purple-500/30"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      method.isActive
                        ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-black'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {getMethodIcon(method.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{method.name}</h3>
                      <p className="text-purple-300 text-sm">{method.description}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleActive(method.type)}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      method.isActive ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                      method.isActive ? 'left-8' : 'left-1'
                    }`} />
                  </button>
                </div>

                {/* Configuration Fields */}
                {method.type === 'bank_transfer' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-purple-300 text-sm mb-1">
                          {language === 'tr' ? 'Banka Adı' : 'Bank Name'}
                        </label>
                        <input
                          type="text"
                          value={(config as BankConfig)?.bankName || ''}
                          onChange={(e) => handleUpdateConfig(method.type, 'bankName', e.target.value)}
                          className="w-full bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
                          placeholder="Ziraat Bankası"
                        />
                      </div>
                      <div>
                        <label className="block text-purple-300 text-sm mb-1">
                          {language === 'tr' ? 'Hesap Sahibi' : 'Account Holder'}
                        </label>
                        <input
                          type="text"
                          value={(config as BankConfig)?.accountHolder || ''}
                          onChange={(e) => handleUpdateConfig(method.type, 'accountHolder', e.target.value)}
                          className="w-full bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
                          placeholder="Ad Soyad"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-purple-300 text-sm mb-1">IBAN</label>
                      <input
                        type="text"
                        value={(config as BankConfig)?.iban || ''}
                        onChange={(e) => handleUpdateConfig(method.type, 'iban', e.target.value)}
                        className="w-full bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-purple-400"
                        placeholder="TR00 0000 0000 0000 0000 0000 00"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-300 text-sm mb-1">
                        {language === 'tr' ? 'Hesap Numarası (Opsiyonel)' : 'Account Number (Optional)'}
                      </label>
                      <input
                        type="text"
                        value={(config as BankConfig)?.accountNumber || ''}
                        onChange={(e) => handleUpdateConfig(method.type, 'accountNumber', e.target.value)}
                        className="w-full bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                )}

                {method.type === 'bitcoin' && (
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">
                      {language === 'tr' ? 'Bitcoin Cüzdan Adresi' : 'Bitcoin Wallet Address'}
                    </label>
                    <input
                      type="text"
                      value={(config as BitcoinConfig)?.walletAddress || ''}
                      onChange={(e) => handleUpdateConfig(method.type, 'walletAddress', e.target.value)}
                      className="w-full bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-purple-400"
                      placeholder="bc1q..."
                    />
                  </div>
                )}

                {method.type === 'credit_card' && (
                  <div className="bg-purple-800/30 rounded-lg p-4 border border-purple-500/20">
                    <p className="text-purple-300 text-sm">
                      {language === 'tr' 
                        ? 'Kredi kartı ödemeleri için ödeme sistemi entegrasyonu gereklidir. Stripe veya iyzico gibi bir ödeme sağlayıcısı eklenebilir.'
                        : 'Credit card payments require payment system integration. A payment provider like Stripe or iyzico can be added.'}
                    </p>
                  </div>
                )}

                {/* Save Button */}
                {(method.type === 'bank_transfer' || method.type === 'bitcoin') && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleSaveConfig(method.type)}
                      disabled={saving === method.type}
                      className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-bold px-4 py-2 rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50"
                    >
                      {saving === method.type ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : success === method.type ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {saving === method.type 
                        ? (language === 'tr' ? 'Kaydediliyor...' : 'Saving...')
                        : success === method.type
                          ? (language === 'tr' ? 'Kaydedildi!' : 'Saved!')
                          : (language === 'tr' ? 'Kaydet' : 'Save')
                      }
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
