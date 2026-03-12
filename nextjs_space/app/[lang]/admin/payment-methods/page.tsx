'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Loader2,
  Save,
  Check,
  Wallet,
  MessageCircle,
  Copy
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

interface PaparaConfig {
  paparaNo: string
  accountHolder: string
}

interface BankConfig {
  bankName: string
  accountHolder: string
  iban: string
}

export default function PaymentMethodsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // WhatsApp settings
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [whatsappMessage, setWhatsappMessage] = useState('')
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [savingWhatsapp, setSavingWhatsapp] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      router.push(`/${language}/login`)
      return
    }
    fetchData()
  }, [session, status])

  const fetchData = async () => {
    try {
      const [methodsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/payment-methods'),
        fetch('/api/admin/settings')
      ])

      if (methodsRes.ok) {
        const data = await methodsRes.json()
        setMethods(data)
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json()
        const waNumber = settings.find((s: { key: string }) => s.key === 'whatsapp_number')?.value || ''
        const waMessage = settings.find((s: { key: string }) => s.key === 'whatsapp_message')?.value || ''
        const waEnabled = settings.find((s: { key: string }) => s.key === 'whatsapp_enabled')?.value === 'true'
        setWhatsappNumber(waNumber)
        setWhatsappMessage(waMessage)
        setWhatsappEnabled(waEnabled)
      }
    } catch (err) {
      console.error('Fetch data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'papara':
        return <Wallet className="w-6 h-6" />
      case 'bank_transfer':
        return <Building2 className="w-6 h-6" />
      default:
        return <Wallet className="w-6 h-6" />
    }
  }

  const getConfig = (method: PaymentMethod): PaparaConfig | BankConfig | null => {
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

  const handleSaveWhatsapp = async () => {
    setSavingWhatsapp(true)
    try {
      await Promise.all([
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'whatsapp_number', value: whatsappNumber })
        }),
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'whatsapp_message', value: whatsappMessage })
        }),
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'whatsapp_enabled', value: String(whatsappEnabled) })
        })
      ])
      setSuccess('whatsapp')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      console.error('Save WhatsApp error:', err)
    } finally {
      setSavingWhatsapp(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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
              <Wallet className="w-7 h-7 text-black" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {language === 'tr' ? 'Ödeme Yöntemleri' : 'Payment Methods'}
              </h1>
              <p className="text-purple-300">
                {language === 'tr' ? 'Papara, IBAN ve WhatsApp ayarlarını yönetin' : 'Manage Papara, IBAN and WhatsApp settings'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Payment Methods List */}
        <div className="space-y-6">
          {methods.filter(m => ['papara', 'bank_transfer'].includes(m.type)).map((method, index) => {
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
                        ? method.type === 'papara' ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white' : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
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
                {method.type === 'papara' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-purple-300 text-sm mb-1">
                          Papara No
                        </label>
                        <input
                          type="text"
                          value={(config as PaparaConfig)?.paparaNo || ''}
                          onChange={(e) => handleUpdateConfig(method.type, 'paparaNo', e.target.value)}
                          className="w-full bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
                          placeholder="1234567890"
                        />
                      </div>
                      <div>
                        <label className="block text-purple-300 text-sm mb-1">
                          {language === 'tr' ? 'Ad Soyad' : 'Account Holder'}
                        </label>
                        <input
                          type="text"
                          value={(config as PaparaConfig)?.accountHolder || ''}
                          onChange={(e) => handleUpdateConfig(method.type, 'accountHolder', e.target.value)}
                          className="w-full bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
                          placeholder="Ad Soyad"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveConfig(method.type)}
                      disabled={saving === method.type}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-700 text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      {saving === method.type ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : success === method.type ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {success === method.type ? (language === 'tr' ? 'Kaydedildi!' : 'Saved!') : (language === 'tr' ? 'Kaydet' : 'Save')}
                    </button>
                  </div>
                )}

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
                          placeholder="Garanti Bankası"
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
                        className="w-full bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400 font-mono"
                        placeholder="TR00 0000 0000 0000 0000 0000 00"
                      />
                    </div>
                    <button
                      onClick={() => handleSaveConfig(method.type)}
                      disabled={saving === method.type}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      {saving === method.type ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : success === method.type ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {success === method.type ? (language === 'tr' ? 'Kaydedildi!' : 'Saved!') : (language === 'tr' ? 'Kaydet' : 'Save')}
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}

          {/* WhatsApp Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-green-900/20 rounded-2xl p-6 border border-green-500/30"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  whatsappEnabled ? 'bg-gradient-to-br from-green-500 to-green-700 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">WhatsApp Destek</h3>
                  <p className="text-green-300 text-sm">
                    {language === 'tr' ? 'Müşteri destek hattı' : 'Customer support line'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  whatsappEnabled ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                  whatsappEnabled ? 'left-8' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-green-300 text-sm mb-1">
                  {language === 'tr' ? 'WhatsApp Numara (Başında + ile)' : 'WhatsApp Number (with + prefix)'}
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full bg-green-900/30 border border-green-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-400"
                  placeholder="+905327170173"
                />
              </div>

              <div>
                <label className="block text-green-300 text-sm mb-1">
                  {language === 'tr' ? 'Otomatik Mesaj Şablonu' : 'Auto Message Template'}
                </label>
                <p className="text-gray-400 text-xs mb-2">
                  {language === 'tr' ? '"{username}" kullanıcı adı, "{package}" seçili paket ile değiştirilir' : '"{username}" replaced with username, "{package}" with selected package'}
                </p>
                <textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  rows={5}
                  className="w-full bg-green-900/30 border border-green-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-400"
                  placeholder={`Merhaba
500 TL jeton almak istiyorum
Kullanıcı adım: {username}

Not: Papara veya IBAN ile ödeme yapabilirsiniz.`}
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleSaveWhatsapp}
                  disabled={savingWhatsapp}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-700 text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {savingWhatsapp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : success === 'whatsapp' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {success === 'whatsapp' ? (language === 'tr' ? 'Kaydedildi!' : 'Saved!') : (language === 'tr' ? 'Kaydet' : 'Save')}
                </button>

                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMessage.replace('{username}', 'test').replace('{package}', 'Test Paket'))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-green-400 hover:text-green-300"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {language === 'tr' ? 'Test Et' : 'Test Link'}
                  </a>
                )}
              </div>
            </div>
          </motion.div>

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-yellow-900/20 rounded-2xl p-6 border border-yellow-500/30"
          >
            <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
              💡 {language === 'tr' ? 'Kullanım Bilgisi' : 'Usage Info'}
            </h3>
            <ul className="text-yellow-200 space-y-2 text-sm">
              <li>• {language === 'tr' ? 'Kullanıcılar jeton satın al sayfasında bu ödeme yöntemlerini görecek' : 'Users will see these payment methods on the credits page'}</li>
              <li>• {language === 'tr' ? 'Ödeme açıklamasına kullanıcı adı yazması isteniyor' : 'Users are asked to write their username in payment description'}</li>
              <li>• {language === 'tr' ? 'WhatsApp linki tıklandığında otomatik mesaj gönderilecek' : 'WhatsApp link will send auto message when clicked'}</li>
              <li>• {language === 'tr' ? 'Ödeme onayı sonrası manuel olarak jeton ekleyebilirsiniz' : 'You can manually add credits after payment confirmation'}</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
