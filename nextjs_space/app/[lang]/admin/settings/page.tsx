'use client'

import AdminBackButton from '@/components/admin-back-button'

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
  Mail,
  Plus,
  X,
  Timer
} from 'lucide-react'

interface PlatformSettings {
  commission_rate: string
  stream_gift_commission: string
  direct_gift_commission: string
  jeton_transfer_commission: string
  default_agency_commission: string
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
  ad_daily_limit_registered: string
  ad_daily_limit_unregistered: string
  ad_credits_per_watch: string
  stream_no_gift_timeout: string
  stream_reopen_cooldown: string
  jeton_unit_price: string
  entry_announcement_enabled: string
  entry_announcement_duration: string
  entry_announcement_style: string
  chat_marquee_enabled: string
  chat_marquee_effect: string
  chat_marquee_speed: string
  chat_marquee_repeat: string
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [settings, setSettings] = useState<PlatformSettings>({
    commission_rate: '20',
    stream_gift_commission: '30',
    direct_gift_commission: '0',
    jeton_transfer_commission: '0',
    default_agency_commission: '5',
    min_withdrawal: '100',
    referral_bonus: '50',
    welcome_credits: '10',
    session_duration_minutes: '5',
    credits_per_minute: '10',
    ad_duration_seconds: '5',
    jeton_tl_rate: '0.5',
    site_email: '',
    admin_email: '',
    support_email: '',
    ad_daily_limit_registered: '10',
    ad_daily_limit_unregistered: '10',
    ad_credits_per_watch: '5',
    stream_no_gift_timeout: '15',
    stream_reopen_cooldown: '30',
    jeton_unit_price: '0.50',
    entry_announcement_enabled: 'true',
    entry_announcement_duration: '2',
    entry_announcement_style: 'fade',
    chat_marquee_enabled: 'true',
    chat_marquee_effect: 'scroll-left',
    chat_marquee_speed: '10',
    chat_marquee_repeat: '0'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [durations, setDurations] = useState<number[]>([5, 10, 15, 20, 25, 30])
  const [newDuration, setNewDuration] = useState('')
  const [durationSaving, setDurationSaving] = useState(false)
  const [durationSaved, setDurationSaved] = useState(false)

  // SEO settings state
  const [seoSettings, setSeoSettings] = useState<Record<string, string>>({
    site_name: '', site_description: '', site_keywords: '', site_logo: '', site_favicon: '', site_og_image: ''
  })
  const [seoSaving, setSeoSaving] = useState(false)
  const [seoSaved, setSeoSaved] = useState(false)

  // OneSignal toggle state
  const [onesignalEnabled, setOnesignalEnabled] = useState(true)
  const [onesignalSaving, setOnesignalSaving] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      router.push(`/giris`)
      return
    }
    fetchSettings()
  }, [session, status])

  const fetchSettings = async () => {
    try {
      const [res, seoRes] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/admin/seo-settings'),
      ])
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        if (data.onesignal_enabled !== undefined) {
          setOnesignalEnabled(data.onesignal_enabled === 'true' || data.onesignal_enabled === '1')
        }
        if (data.live_session_durations) {
          try {
            const parsed = JSON.parse(data.live_session_durations)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setDurations(parsed.map(Number).filter((n: number) => n > 0).sort((a: number, b: number) => a - b))
            }
          } catch {}
        }
      }
      if (seoRes.ok) {
        const seoData = await seoRes.json()
        setSeoSettings(prev => ({ ...prev, ...seoData }))
      }
    } catch (err) {
      console.error('Fetch settings error:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSeoSettings = async () => {
    setSeoSaving(true)
    try {
      const res = await fetch('/api/admin/seo-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seoSettings),
      })
      if (res.ok) {
        setSeoSaved(true)
        setTimeout(() => setSeoSaved(false), 2000)
      }
    } catch (err) {
      console.error('Save SEO settings error:', err)
    } finally {
      setSeoSaving(false)
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
      <div className="min-h-screen  flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  const settingItems = [
    {
      key: 'commission_rate',
      label: 'Falcı Komisyon Oranı (%)',
      description: 'Falcı tip/bahşiş kazançlarından kesilecek platform komisyon oranı',
      icon: Percent,
      min: 0,
      max: 100
    },
    {
      key: 'stream_gift_commission',
      label: 'Canlı Yayın Hediye Komisyonu (%)',
      description: 'Canlı yayında gönderilen hediyelerden kesilecek platform komisyon oranı',
      icon: Percent,
      min: 0,
      max: 100
    },
    {
      key: 'direct_gift_commission',
      label: 'Direkt Hediye Komisyonu (%)',
      description: 'Profil üzerinden gönderilen hediyelerden kesilecek platform komisyon oranı',
      icon: Percent,
      min: 0,
      max: 100
    },
    {
      key: 'jeton_transfer_commission',
      label: 'Jeton Transfer Komisyonu (%)',
      description: 'Kullanıcılar arası jeton transferinden kesilecek komisyon oranı',
      icon: Percent,
      min: 0,
      max: 100
    },
    {
      key: 'default_agency_commission',
      label: 'Varsayılan Ajans Komisyonu (%)',
      description: 'Yeni ajanslar için varsayılan komisyon oranı (ajans bazında değiştirilebilir)',
      icon: Percent,
      min: 0,
      max: 50
    },
    {
      key: 'min_withdrawal',
      label: 'Minimum Çekim Miktarı',
      description: 'Falcıların çekim yapabileceği minimum Jeton',
      icon: CreditCard,
      min: 0,
      max: 10000
    },
    {
      key: 'referral_bonus',
      label: 'Referans Bonusu',
      description: 'Davet eden ve edilen kişiye verilecek CFC',
      icon: Gift,
      min: 0,
      max: 1000
    },
    {
      key: 'welcome_credits',
      label: 'Hoşgeldin CFC',
      description: 'Yeni üyelere verilecek başlangıç CFC',
      icon: CreditCard,
      min: 0,
      max: 1000
    },
    {
      key: 'session_duration_minutes',
      label: 'Canlı Seans Süresi (dk)',
      description: 'Canlı falcı seanslarının varsayılan süresi',
      icon: Clock,
      min: 1,
      max: 60
    },
    {
      key: 'credits_per_minute',
      label: 'Dakika Başı Jeton',
      description: 'Süre uzatma için dakika başına alınacak jeton',
      icon: Coins,
      min: 1,
      max: 100
    },
    {
      key: 'ad_duration_seconds',
      label: 'Reklam Süresi (sn)',
      description: 'Canlı fal öncesi gösterilecek reklam süresi',
      icon: Tv,
      min: 0,
      max: 30
    },
    {
      key: 'jeton_tl_rate',
      label: 'Jeton/TL Oranı',
      description: '1 jeton = kaç TL (örn: 0.5 = 1 jeton 0.50 TL)',
      icon: Coins,
      min: 0.01,
      max: 100
    },
    {
      key: 'site_email',
      label: 'Site E-postası',
      description: 'Kullanıcılara gösterilen ve şifre sıfırlama gibi maillerin gönderileceği adres',
      icon: Mail,
      type: 'email' as const,
      placeholder: 'info@site.com'
    },
    {
      key: 'admin_email',
      label: 'Admin E-postası',
      description: 'Yönetici bildirimleri ve sistem uyarıları için',
      icon: Mail,
      type: 'email' as const,
      placeholder: 'admin@site.com'
    },
    {
      key: 'support_email',
      label: 'Destek E-postası',
      description: 'Kullanıcı destek talepleri ve iletişim için',
      icon: Mail,
      type: 'email' as const,
      placeholder: 'destek@site.com'
    },
    {
      key: 'ad_daily_limit_registered',
      label: 'Kayıtlı Kullanıcı Günlük Reklam Limiti',
      description: 'Kayıtlı kullanıcıların günde izleyebileceği maksimum reklam sayısı',
      icon: Tv,
      min: 0,
      max: 100
    },
    {
      key: 'ad_daily_limit_unregistered',
      label: 'Kayıtsız Kullanıcı Günlük Reklam Limiti',
      description: 'Misafir kullanıcıların günde izleyebileceği maksimum reklam sayısı',
      icon: Tv,
      min: 0,
      max: 100
    },
    {
      key: 'ad_credits_per_watch',
      label: 'Reklam Başına CFC',
      description: 'Her reklam izleme için verilecek CFC miktarı',
      icon: Coins,
      min: 1,
      max: 100
    },
    {
      key: 'stream_no_gift_timeout',
      label: 'Hediye Zaman Aşımı (dk)',
      description: 'Bu süre boyunca hediye gelmezse yayın otomatik kapanır',
      icon: Timer,
      min: 1,
      max: 120
    },
    {
      key: 'stream_reopen_cooldown',
      label: 'Yayın Tekrar Açma Bekleme (dk)',
      description: 'Otomatik kapanan yayın için tekrar açabilme bekleme süresi',
      icon: Clock,
      min: 0,
      max: 1440
    },
    {
      key: 'entry_announcement_duration',
      label: 'Giriş Duyurusu Süresi (sn)',
      description: 'Giriş duyurusu ekranda kalma süresi (saniye)',
      icon: Timer,
      min: 1,
      max: 10
    },
    {
      key: 'jeton_unit_price',
      label: 'Jeton Birim Fiyatı (₺)',
      description: 'Serbest jeton alımında 1 jeton = kaç TRY',
      icon: Coins,
      min: 0.01,
      max: 100,
      step: 0.01
    },
  ]

  return (
    <div className="min-h-screen  py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <AdminBackButton variant="link" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6" label="Admin Paneli" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-purple-400" />
            {'Platform Ayarları'}
          </h1>
          <p className="text-purple-300 mt-2">
            {'Komisyon, bonus ve CFC ayarlarını yönetin'}
          </p>
        </motion.div>

        {/* Duration Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8 bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-xl border border-purple-500/20 p-6"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Timer className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">Canlı Fal Süre Seçenekleri</h3>
              <p className="text-sm text-purple-400">Kullanıcıların seçebileceği seans sürelerini yönetin (dakika)</p>
            </div>
          </div>

          {/* Current durations */}
          <div className="flex flex-wrap gap-2 mb-4">
            {durations.map((d) => (
              <div
                key={d}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/15 border border-purple-500/30 rounded-lg"
              >
                <span className="text-white font-medium text-sm">{d} dk</span>
                <button
                  onClick={() => {
                    const updated = durations.filter(x => x !== d)
                    if (updated.length === 0) return
                    setDurations(updated)
                  }}
                  className="ml-1 text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add new duration */}
          <div className="flex items-center gap-3 mb-4">
            <input
              type="number"
              min={1}
              max={120}
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              placeholder="Yeni süre (dk)"
              className="w-40 px-4 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 placeholder-purple-500/50"
            />
            <button
              onClick={() => {
                const val = parseInt(newDuration)
                if (!val || val <= 0 || val > 120 || durations.includes(val)) return
                setDurations(prev => [...prev, val].sort((a, b) => a - b))
                setNewDuration('')
              }}
              disabled={!newDuration || parseInt(newDuration) <= 0 || durations.includes(parseInt(newDuration))}
              className="px-3 py-2 bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-4 h-4" /> Ekle
            </button>
          </div>

          {/* Save durations */}
          <button
            onClick={async () => {
              setDurationSaving(true)
              try {
                const res = await fetch('/api/admin/settings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ key: 'live_session_durations', value: JSON.stringify(durations) })
                })
                if (res.ok) {
                  setDurationSaved(true)
                  setTimeout(() => setDurationSaved(false), 2000)
                }
              } catch (err) {
                console.error('Save durations error:', err)
              } finally {
                setDurationSaving(false)
              }
            }}
            disabled={durationSaving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
          >
            {durationSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : durationSaved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {durationSaved ? 'Kaydedildi' : 'Süreleri Kaydet'}
          </button>
        </motion.div>

        {/* SEO Ayarları */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-xl border border-purple-500/20 p-6"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Settings className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">SEO & Site Ayarları</h3>
              <p className="text-sm text-purple-400">Site adı, açıklama, anahtar kelime ve logo ayarları</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Site Adı</label>
              <input
                type="text"
                value={seoSettings.site_name}
                onChange={e => setSeoSettings(p => ({ ...p, site_name: e.target.value }))}
                placeholder="Canlifal"
                className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-purple-500/20 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Site Açıklaması</label>
              <textarea
                value={seoSettings.site_description}
                onChange={e => setSeoSettings(p => ({ ...p, site_description: e.target.value }))}
                placeholder="Canlifal - Online fal, rüya tabiri ve astroloji platformu"
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-purple-500/20 text-white text-sm focus:outline-none focus:border-purple-500/50 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Anahtar Kelimeler (virgül ile)</label>
              <input
                type="text"
                value={seoSettings.site_keywords}
                onChange={e => setSeoSettings(p => ({ ...p, site_keywords: e.target.value }))}
                placeholder="fal, rüya tabiri, astroloji, burçlar, tarot, kahve falı"
                className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-purple-500/20 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={seoSettings.site_logo}
                  onChange={e => setSeoSettings(p => ({ ...p, site_logo: e.target.value }))}
                  placeholder="https://canlifal.com/logo.png"
                  className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-purple-500/20 text-white text-sm focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Favicon URL</label>
                <input
                  type="text"
                  value={seoSettings.site_favicon}
                  onChange={e => setSeoSettings(p => ({ ...p, site_favicon: e.target.value }))}
                  placeholder="https://canlifal.com/favicon.ico"
                  className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-purple-500/20 text-white text-sm focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">OG Image URL (sosyal medya paylaşım resmi)</label>
              <input
                type="text"
                value={seoSettings.site_og_image}
                onChange={e => setSeoSettings(p => ({ ...p, site_og_image: e.target.value }))}
                placeholder="https://canlifal.com/og-image.jpg"
                className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-purple-500/20 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={saveSeoSettings}
              disabled={seoSaving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              {seoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : seoSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {seoSaved ? 'Kaydedildi' : 'SEO Ayarlarını Kaydet'}
            </button>
          </div>
        </motion.div>

        {/* OneSignal Push Bildirimleri */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-xl border border-purple-500/20 p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <span className="text-2xl">🔔</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">Push Bildirimleri (OneSignal)</h3>
              <p className="text-sm text-purple-300/70">Kullanıcılara push bildirim gönderme özelliğini açıp kapatın. Aktif olduğunda kullanıcılar siteyi ziyaret ettiğinde &quot;Bildirimlere abone ol&quot; istemi görecektir.</p>
            </div>
            <button
              onClick={async () => {
                setOnesignalSaving(true)
                const newVal = !onesignalEnabled
                try {
                  const res = await fetch('/api/admin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'onesignal_enabled', value: String(newVal) })
                  })
                  if (res.ok) setOnesignalEnabled(newVal)
                } catch (err) {
                  console.error('OneSignal toggle error:', err)
                } finally {
                  setOnesignalSaving(false)
                }
              }}
              disabled={onesignalSaving}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${onesignalEnabled ? 'bg-green-500' : 'bg-gray-600'} ${onesignalSaving ? 'opacity-50' : ''}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${onesignalEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
          </div>
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
                        step={'step' in item ? (item as any).step : undefined}
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
                      {saved === item.key ? ('Kaydedildi') : ('Kaydet')}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Entry Announcement Toggle & Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-deep-purple-800/50 to-purple-900/30 rounded-xl p-6 border border-purple-500/20"
          >
            <h3 className="text-lg font-semibold text-white mb-1">📢 Giriş Duyurusu Ayarları</h3>
            <p className="text-sm text-fuchsia-400 mb-4">Kullanıcı giriş duyurularının görünüm, geçiş efekti ve konum ayarları</p>
            
            <div className="flex flex-wrap items-center gap-4 mb-5">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-purple-200">Durum:</span>
                <button
                  onClick={() => {
                    const newVal = settings.entry_announcement_enabled === 'true' ? 'false' : 'true'
                    setSettings(prev => ({ ...prev, entry_announcement_enabled: newVal }))
                    saveSetting('entry_announcement_enabled', newVal)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    settings.entry_announcement_enabled === 'true'
                      ? 'bg-green-600/20 border-green-500/30 text-green-300'
                      : 'bg-red-600/20 border-red-500/30 text-red-300'
                  }`}
                >
                  {settings.entry_announcement_enabled === 'true' ? '✅ Açık' : '❌ Kapalı'}
                </button>
              </div>

              {/* Display Style Select */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-purple-200">Geçiş Efekti:</span>
                <select
                  value={settings.entry_announcement_style}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, entry_announcement_style: e.target.value }))
                    saveSetting('entry_announcement_style', e.target.value)
                  }}
                  className="px-4 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
                >
                  <option value="fade">🌟 Belir & Kaybol</option>
                  <option value="slide">⬇️ Yukarıdan Kayma</option>
                  <option value="flash">⚡ Parlak Flash</option>
                  <option value="zoom">🔍 Zoom Efekti</option>
                  <option value="bounce">🏀 Zıplama Efekti</option>
                  <option value="typewriter">⌨️ Daktilo Efekti</option>
                  <option value="glow">💡 Neon Glow</option>
                  <option value="shake">📳 Titreme Efekti</option>
                  <option value="wave">🌊 Dalga Efekti</option>
                </select>
              </div>
            </div>

            {/* Live Preview Bar */}
            <div className="mb-5">
              <p className="text-xs text-purple-300 mb-2">📺 Canlı Önizleme:</p>
              <div className="w-full h-12 rounded-lg overflow-hidden relative" style={{
                background: 'linear-gradient(90deg, #1a0000, #8b0000, #cc0000, #8b0000, #1a0000)',
                backgroundSize: '200% 100%',
                animation: 'loginBannerBgShift 4s linear infinite'
              }}>
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #ff0000, #ff4444, #ff0000, transparent)' }} />
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #ff0000, #ff4444, #ff0000, transparent)' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-extrabold" style={{
                    background: 'linear-gradient(90deg, #ff4444, #ffffff, #ff4444)',
                    backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))',
                    animation: `announcePreview_${settings.entry_announcement_style} 3s ease-in-out infinite`
                  }}>
                    🏟️ Kullanıcı Adı siteye giriş yaptı! 🏟️
                  </span>
                </div>
              </div>
            </div>

            {/* Takım Renkleri Info */}
            <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-4 mb-5">
              <p className="text-sm text-purple-200 mb-3 font-medium">🏟️ Takım Renkleri & Logo</p>
              <p className="text-xs text-purple-400 mb-3">Kullanıcının profil ayarlarında seçtiği takıma göre duyuru renkleri ve logosu otomatik değişir.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {/* Turkey Default */}
                <div className="rounded-lg p-2 text-center border border-red-500/30" style={{ background: 'linear-gradient(135deg, #cc0000 0%, #1a0000 50%, #cc0000 100%)' }}>
                  <div className="text-2xl mb-1">🇹🇷</div>
                  <span className="text-[10px] text-white font-bold">Varsayılan</span>
                  <p className="text-[9px] text-red-200">Takımı olmayan</p>
                </div>
                {/* GS */}
                <div className="rounded-lg p-2 text-center border border-yellow-500/30" style={{ background: 'linear-gradient(135deg, #cc0000 0%, #b8860b 50%, #cc0000 100%)' }}>
                  <div className="text-2xl mb-1">🦁</div>
                  <span className="text-[10px] text-yellow-200 font-bold">Galatasaray</span>
                  <p className="text-[9px] text-red-200">Kırmızı-Sarı</p>
                </div>
                {/* FB */}
                <div className="rounded-lg p-2 text-center border border-blue-500/30" style={{ background: 'linear-gradient(135deg, #000066 0%, #b8860b 50%, #000066 100%)' }}>
                  <div className="text-2xl mb-1">🐤</div>
                  <span className="text-[10px] text-yellow-200 font-bold">Fenerbahçe</span>
                  <p className="text-[9px] text-blue-200">Lacivert-Sarı</p>
                </div>
                {/* BJK */}
                <div className="rounded-lg p-2 text-center border border-white/30" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #333 50%, #1a1a1a 100%)' }}>
                  <div className="text-2xl mb-1">🦅</div>
                  <span className="text-[10px] text-white font-bold">Beşiktaş</span>
                  <p className="text-[9px] text-gray-300">Siyah-Beyaz</p>
                </div>
                {/* TS */}
                <div className="rounded-lg p-2 text-center border border-purple-500/30" style={{ background: 'linear-gradient(135deg, #660022 0%, #003366 50%, #660022 100%)' }}>
                  <div className="text-2xl mb-1">⚓</div>
                  <span className="text-[10px] text-pink-200 font-bold">Trabzonspor</span>
                  <p className="text-[9px] text-blue-200">Bordo-Mavi</p>
                </div>
                {/* Others */}
                <div className="rounded-lg p-2 text-center border border-purple-500/20 bg-purple-900/40 flex flex-col items-center justify-center">
                  <div className="text-xl mb-1">⚽</div>
                  <span className="text-[10px] text-purple-300 font-bold">+13 Takım</span>
                  <p className="text-[9px] text-purple-400">Tüm Süper Lig</p>
                </div>
              </div>
            </div>

            {/* Section Placement Visual Mockups */}
            <div>
              <p className="text-sm text-purple-200 mb-3 font-medium">📍 Bölümlerde Görünüm Konumları</p>
              <p className="text-xs text-purple-400 mb-3">Duyuru bandı her bölümde aşağıdaki konumlardan geçer:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Ana Sayfa Mockup */}
                <div className="rounded-xl border border-purple-500/30 overflow-hidden bg-black/30">
                  <div className="bg-gradient-to-r from-purple-600/40 to-fuchsia-600/40 px-3 py-1.5 flex items-center gap-2">
                    <span className="text-sm">🏠</span>
                    <span className="text-xs font-bold text-white">Ana Sayfa</span>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="h-3 rounded bg-purple-800/40 flex items-center px-1"><span className="text-[6px] text-purple-300">Navbar</span></div>
                    <div className="h-4 rounded bg-purple-700/30 flex items-center px-1"><span className="text-[6px] text-purple-300">👥 2 kişi online</span></div>
                    <div className="h-3 rounded-sm animate-pulse flex items-center justify-center" style={{ background: 'linear-gradient(90deg, #cc0000, #ff4444, #cc0000)', fontSize: '5px', color: 'white', fontWeight: 800 }}>
                      ⬅ DUYURU BANDI BURADAN GEÇER ➡
                    </div>
                    <div className="h-6 rounded bg-purple-800/20 flex items-center px-1"><span className="text-[6px] text-purple-400">Butonlar (Falına Bak, Sohbet...)</span></div>
                    <div className="h-4 rounded bg-purple-800/20 flex items-center px-1"><span className="text-[6px] text-purple-400">Canlı Yayınlar</span></div>
                  </div>
                </div>

                {/* Oyunlar Mockup */}
                <div className="rounded-xl border border-purple-500/30 overflow-hidden bg-black/30">
                  <div className="bg-gradient-to-r from-green-600/40 to-emerald-600/40 px-3 py-1.5 flex items-center gap-2">
                    <span className="text-sm">🎮</span>
                    <span className="text-xs font-bold text-white">Oyunlar</span>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="h-3 rounded bg-purple-800/40 flex items-center px-1"><span className="text-[6px] text-purple-300">Navbar</span></div>
                    <div className="h-3 rounded-sm animate-pulse flex items-center justify-center" style={{ background: 'linear-gradient(90deg, #cc0000, #ff4444, #cc0000)', fontSize: '5px', color: 'white', fontWeight: 800 }}>
                      ⬅ DUYURU BANDI ➡
                    </div>
                    <div className="h-4 rounded bg-green-800/20 flex items-center px-1"><span className="text-[6px] text-green-300">🎯 Lobi</span></div>
                    <div className="h-4 rounded bg-green-800/20 flex items-center px-1"><span className="text-[6px] text-green-300">👀 Canlı İzle</span></div>
                    <div className="h-4 rounded bg-green-800/20 flex items-center px-1"><span className="text-[6px] text-green-300">🏆 Turnuvalar</span></div>
                  </div>
                </div>

                {/* Sosyal Mockup */}
                <div className="rounded-xl border border-purple-500/30 overflow-hidden bg-black/30">
                  <div className="bg-gradient-to-r from-pink-600/40 to-rose-600/40 px-3 py-1.5 flex items-center gap-2">
                    <span className="text-sm">👥</span>
                    <span className="text-xs font-bold text-white">Sosyal</span>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="h-3 rounded bg-purple-800/40 flex items-center px-1"><span className="text-[6px] text-purple-300">Navbar</span></div>
                    <div className="h-5 rounded bg-pink-800/20 flex items-center px-1"><span className="text-[6px] text-pink-300">📝 Son Paylaşımlar</span></div>
                    <div className="h-3 rounded-sm animate-pulse flex items-center justify-center" style={{ background: 'linear-gradient(90deg, #cc0000, #ff4444, #cc0000)', fontSize: '5px', color: 'white', fontWeight: 800 }}>
                      ⬅ DUYURU BANDI ➡
                    </div>
                    <div className="h-5 rounded bg-pink-800/20 flex items-center px-1"><span className="text-[6px] text-pink-300">✏️ Paylaşım Yap</span></div>
                  </div>
                </div>

                {/* Blog Mockup */}
                <div className="rounded-xl border border-purple-500/30 overflow-hidden bg-black/30">
                  <div className="bg-gradient-to-r from-blue-600/40 to-indigo-600/40 px-3 py-1.5 flex items-center gap-2">
                    <span className="text-sm">📰</span>
                    <span className="text-xs font-bold text-white">Blog</span>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="h-3 rounded bg-purple-800/40 flex items-center px-1"><span className="text-[6px] text-purple-300">Navbar</span></div>
                    <div className="h-4 rounded bg-blue-800/20 flex items-center px-1"><span className="text-[6px] text-blue-300">Blog Başlığı</span></div>
                    <div className="h-3 rounded-sm animate-pulse flex items-center justify-center" style={{ background: 'linear-gradient(90deg, #cc0000, #ff4444, #cc0000)', fontSize: '5px', color: 'white', fontWeight: 800 }}>
                      ⬅ DUYURU BANDI ➡
                    </div>
                    <div className="h-4 rounded bg-blue-800/20 flex items-center px-1"><span className="text-[6px] text-blue-300">📄 Blog Kartları</span></div>
                  </div>
                </div>

                {/* Rüya Mockup */}
                <div className="rounded-xl border border-purple-500/30 overflow-hidden bg-black/30">
                  <div className="bg-gradient-to-r from-indigo-600/40 to-violet-600/40 px-3 py-1.5 flex items-center gap-2">
                    <span className="text-sm">🌙</span>
                    <span className="text-xs font-bold text-white">Rüya Tabirleri</span>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="h-3 rounded bg-purple-800/40 flex items-center px-1"><span className="text-[6px] text-purple-300">Navbar</span></div>
                    <div className="h-4 rounded bg-indigo-800/20 flex items-center px-1"><span className="text-[6px] text-indigo-300">Rüya Arama</span></div>
                    <div className="h-3 rounded-sm animate-pulse flex items-center justify-center" style={{ background: 'linear-gradient(90deg, #cc0000, #ff4444, #cc0000)', fontSize: '5px', color: 'white', fontWeight: 800 }}>
                      ⬅ DUYURU BANDI ➡
                    </div>
                    <div className="h-4 rounded bg-indigo-800/20 flex items-center px-1"><span className="text-[6px] text-indigo-300">🔮 Rüya Listesi</span></div>
                  </div>
                </div>

                {/* Canlı Yayın Mockup */}
                <div className="rounded-xl border border-purple-500/30 overflow-hidden bg-black/30">
                  <div className="bg-gradient-to-r from-red-600/40 to-orange-600/40 px-3 py-1.5 flex items-center gap-2">
                    <span className="text-sm">📡</span>
                    <span className="text-xs font-bold text-white">Canlı Yayın</span>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="h-8 rounded bg-gray-800/40 flex items-center justify-center"><span className="text-[6px] text-gray-300">🎥 Video Alanı</span></div>
                    <div className="h-3 rounded-sm animate-pulse flex items-center justify-center" style={{ background: 'linear-gradient(90deg, #cc0000, #ff4444, #cc0000)', fontSize: '5px', color: 'white', fontWeight: 800 }}>
                      ⬅ DUYURU BANDI ➡
                    </div>
                    <div className="h-4 rounded bg-gray-800/20 flex items-center px-1"><span className="text-[6px] text-gray-400">💬 Sohbet (kapatılmaz)</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview animation styles for live preview bar */}
            <style jsx>{`
              @keyframes announcePreview_fade {
                0%, 100% { opacity: 0; }
                20%, 80% { opacity: 1; }
              }
              @keyframes announcePreview_slide {
                0% { opacity: 0; transform: translateY(-100%); }
                15%, 85% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-100%); }
              }
              @keyframes announcePreview_flash {
                0% { opacity: 0; filter: brightness(3); transform: scale(1.2); }
                15%, 85% { opacity: 1; filter: brightness(1); transform: scale(1); }
                100% { opacity: 0; filter: brightness(3); transform: scale(1.2); }
              }
              @keyframes announcePreview_zoom {
                0% { opacity: 0; transform: scale(0.3); }
                15% { opacity: 1; transform: scale(1.05); }
                25%, 85% { transform: scale(1); opacity: 1; }
                100% { opacity: 0; transform: scale(0.3); }
              }
              @keyframes announcePreview_bounce {
                0% { opacity: 0; transform: translateY(-30px); }
                15% { opacity: 1; transform: translateY(4px); }
                25% { transform: translateY(-2px); }
                35%, 85% { transform: translateY(0); opacity: 1; }
                100% { opacity: 0; transform: translateY(-30px); }
              }
              @keyframes announcePreview_typewriter {
                0% { clip-path: inset(0 100% 0 0); opacity: 1; }
                50%, 85% { clip-path: inset(0 0 0 0); opacity: 1; }
                100% { clip-path: inset(0 0 0 100%); opacity: 0; }
              }
              @keyframes announcePreview_glow {
                0%, 100% { opacity: 0; text-shadow: none; }
                20% { opacity: 1; text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff; }
                50% { text-shadow: 0 0 20px #ff00ff, 0 0 40px #ff00ff; }
                80% { opacity: 1; text-shadow: 0 0 10px #00ffff; }
              }
              @keyframes announcePreview_shake {
                0%, 100% { opacity: 0; }
                10% { opacity: 1; transform: translateX(-3px); }
                20% { transform: translateX(3px); }
                30% { transform: translateX(-3px); }
                40% { transform: translateX(3px); }
                50%, 85% { transform: translateX(0); opacity: 1; }
              }
              @keyframes announcePreview_wave {
                0%, 100% { opacity: 0; transform: translateY(5px) rotate(-1deg); }
                15% { opacity: 1; transform: translateY(-2px) rotate(1deg); }
                30% { transform: translateY(1px) rotate(-0.5deg); }
                60%, 85% { transform: translateY(0) rotate(0deg); opacity: 1; }
              }
              @keyframes loginBannerBgShift {
                0% { background-position: 0% 0; }
                100% { background-position: 200% 0; }
              }
            `}</style>
          </motion.div>

          {/* Chat Marquee Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-gradient-to-r from-deep-purple-800/50 to-purple-900/30 rounded-xl p-6 border border-purple-500/20"
          >
            <h3 className="text-lg font-semibold text-white mb-1">📜 Sohbet Odası Kayan Yazı Ayarları</h3>
            <p className="text-sm text-fuchsia-400 mb-4">Sohbet odalarındaki kayan yazı bandı ayarları</p>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-purple-200">Durum:</span>
                <button
                  onClick={() => {
                    const newVal = settings.chat_marquee_enabled === 'true' ? 'false' : 'true'
                    setSettings(prev => ({ ...prev, chat_marquee_enabled: newVal }))
                    saveSetting('chat_marquee_enabled', newVal)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    settings.chat_marquee_enabled === 'true'
                      ? 'bg-green-600/20 border-green-500/30 text-green-300'
                      : 'bg-red-600/20 border-red-500/30 text-red-300'
                  }`}
                >
                  {settings.chat_marquee_enabled === 'true' ? '✅ Açık' : '❌ Kapalı'}
                </button>
              </div>

              {/* Effect Type Select */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-purple-200">Efekt:</span>
                <select
                  value={settings.chat_marquee_effect}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, chat_marquee_effect: e.target.value }))
                    saveSetting('chat_marquee_effect', e.target.value)
                  }}
                  className="px-4 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
                >
                  <option value="scroll-left">← Sağdan Sola Kayma</option>
                  <option value="scroll-right">→ Soldan Sağa Kayma</option>
                  <option value="bounce">↔ Sağa Sola Sekme</option>
                  <option value="fade-scroll">✨ Belirerek Kayma</option>
                  <option value="typewriter">⌨️ Daktilo Efekti</option>
                </select>
              </div>

              {/* Speed Input */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-purple-200">Hız (sn):</span>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={settings.chat_marquee_speed}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, chat_marquee_speed: e.target.value }))
                  }}
                  onBlur={() => saveSetting('chat_marquee_speed', settings.chat_marquee_speed)}
                  className="w-20 px-3 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm text-center"
                />
              </div>

              {/* Repeat Count Input */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-purple-200">Tekrar:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.chat_marquee_repeat}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, chat_marquee_repeat: e.target.value }))
                  }}
                  onBlur={() => saveSetting('chat_marquee_repeat', settings.chat_marquee_repeat)}
                  className="w-20 px-3 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm text-center"
                />
                <span className="text-xs text-purple-400">(0 = sonsuz)</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
