'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  Settings,
  Save,
  Percent,
  Gift,
  CreditCard,
  Loader2,
  Check,
  Clock,
  Coins,
  Tv,
  Mail
} from 'lucide-react'

interface PlatformSettings {
  commission_rate: string
  min_withdrawal: string
  referral_bonus: string
  welcome_credits: string
  session_duration_minutes: string
  credits_per_minute: string
  ad_duration_seconds: string
  jeton_tl_rate: string
  site_email: string
  admin_email: string
  support_email: string
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [settings, setSettings] = useState<PlatformSettings>({
    commission_rate: '20',
    min_withdrawal: '100',
    referral_bonus: '50',
    welcome_credits: '10',
    session_duration_minutes: '5',
    credits_per_minute: '10',
    ad_duration_seconds: '5',
    jeton_tl_rate: '0.5',
    site_email: '',
    admin_email: '',
    support_email: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      router.push(`/login`)
      return
    }
    fetchSettings()
  }, [session, status])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (err) {
      console.error('Fetch settings error:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSetting = async (key: string, value: string) => {
    setSaving(key)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })
      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: value }))
        setSaved(key)
        setTimeout(() => setSaved(null), 2000)
      }
    } catch (err) {
      console.error('Save setting error:', err)
    } finally {
      setSaving(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  const settingItems = [
    {
      key: 'commission_rate',
      label: language === 'tr' ? 'Komisyon Oranı (%)' : 'Commission Rate (%)',
      description: language === 'tr' ? 'Falcı kazançlarından kesilecek komisyon oranı' : 'Commission rate deducted from teller earnings',
      icon: Percent,
      min: 0,
      max: 100
    },
    {
      key: 'min_withdrawal',
      label: language === 'tr' ? 'Minimum Çekim Miktarı' : 'Minimum Withdrawal',
      description: language === 'tr' ? 'Falcıların çekim yapabileceği minimum CFC' : 'Minimum CFC for teller withdrawal',
      icon: CreditCard,
      min: 0,
      max: 10000
    },
    {
      key: 'referral_bonus',
      label: language === 'tr' ? 'Referans Bonusu' : 'Referral Bonus',
      description: language === 'tr' ? 'Davet eden ve edilen kişiye verilecek CFC' : 'CFC given to referrer and referred user',
      icon: Gift,
      min: 0,
      max: 1000
    },
    {
      key: 'welcome_credits',
      label: language === 'tr' ? 'Hoşgeldin CFC' : 'Welcome CFC',
      description: language === 'tr' ? 'Yeni üyelere verilecek başlangıç CFC' : 'Starting CFC for new users',
      icon: CreditCard,
      min: 0,
      max: 1000
    },
    {
      key: 'session_duration_minutes',
      label: language === 'tr' ? 'Canlı Seans Süresi (dk)' : 'Live Session Duration (min)',
      description: language === 'tr' ? 'Canlı falcı seanslarının varsayılan süresi' : 'Default duration for live fortune teller sessions',
      icon: Clock,
      min: 1,
      max: 60
    },
    {
      key: 'credits_per_minute',
      label: language === 'tr' ? 'Dakika Başı Jeton' : 'Jetons Per Minute',
      description: language === 'tr' ? 'Süre uzatma için dakika başına alınacak jeton' : 'Jetons charged per minute for session extension',
      icon: Coins,
      min: 1,
      max: 100
    },
    {
      key: 'ad_duration_seconds',
      label: language === 'tr' ? 'Reklam Süresi (sn)' : 'Ad Duration (sec)',
      description: language === 'tr' ? 'Canlı fal öncesi gösterilecek reklam süresi' : 'Ad display duration before live session starts',
      icon: Tv,
      min: 0,
      max: 30
    },
    {
      key: 'jeton_tl_rate',
      label: language === 'tr' ? 'Jeton/TL Oranı' : 'Jeton/TL Rate',
      description: language === 'tr' ? '1 jeton = kaç TL (örn: 0.5 = 1 jeton 0.50 TL)' : '1 jeton = how many TL (e.g., 0.5 = 1 jeton is 0.50 TL)',
      icon: Coins,
      min: 0.01,
      max: 100
    },
    {
      key: 'site_email',
      label: language === 'tr' ? 'Site E-postası' : 'Site Email',
      description: language === 'tr' ? 'Kullanıcılara gösterilen ve şifre sıfırlama gibi maillerin gönderileceği adres' : 'Displayed to users and used for password reset emails',
      icon: Mail,
      type: 'email' as const,
      placeholder: 'info@site.com'
    },
    {
      key: 'admin_email',
      label: language === 'tr' ? 'Admin E-postası' : 'Admin Email',
      description: language === 'tr' ? 'Yönetici bildirimleri ve sistem uyarıları için' : 'For admin notifications and system alerts',
      icon: Mail,
      type: 'email' as const,
      placeholder: 'admin@site.com'
    },
    {
      key: 'support_email',
      label: language === 'tr' ? 'Destek E-postası' : 'Support Email',
      description: language === 'tr' ? 'Kullanıcı destek talepleri ve iletişim için' : 'For user support requests and contact',
      icon: Mail,
      type: 'email' as const,
      placeholder: 'destek@site.com'
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a0118] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/admin`}
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {language === 'tr' ? 'Admin Paneli' : 'Admin Panel'}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-purple-400" />
            {language === 'tr' ? 'Platform Ayarları' : 'Platform Settings'}
          </h1>
          <p className="text-purple-300 mt-2">
            {language === 'tr' ? 'Komisyon, bonus ve CFC ayarlarını yönetin' : 'Manage commission, bonus and CFC settings'}
          </p>
        </motion.div>

        <div className="space-y-4">
          {settingItems.map((item, index) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-xl border border-purple-500/20 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{item.label}</h3>
                  <p className="text-sm text-purple-400 mb-4">{item.description}</p>
                  
                  <div className="flex items-center gap-3">
                    {(item as any).type === 'select' && (item as any).options ? (
                      <select
                        value={settings[item.key as keyof PlatformSettings]}
                        onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.value }))}
                        className="w-64 px-4 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      >
                        {((item as any).options as Array<{ value: string; label: string }>).map((opt: any) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (item as any).type === 'email' ? (
                      <input
                        type="email"
                        placeholder={'placeholder' in item ? (item as any).placeholder : ''}
                        value={settings[item.key as keyof PlatformSettings]}
                        onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.value }))}
                        className="w-64 px-4 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 placeholder-purple-500/50"
                      />
                    ) : (
                      <input
                        type="number"
                        min={'min' in item ? item.min : undefined}
                        max={'max' in item ? item.max : undefined}
                        value={settings[item.key as keyof PlatformSettings]}
                        onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.value }))}
                        className="w-32 px-4 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                    )}
                    <button
                      onClick={() => saveSetting(item.key, settings[item.key as keyof PlatformSettings])}
                      disabled={saving === item.key}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      {saving === item.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : saved === item.key ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {saved === item.key ? (language === 'tr' ? 'Kaydedildi' : 'Saved') : (language === 'tr' ? 'Kaydet' : 'Save')}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
