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
    support_email: '',
    ad_daily_limit_registered: '10',
    ad_daily_limit_unregistered: '10',
    ad_credits_per_watch: '5'
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
      label: 'Komisyon Oranı (%)',
      description: 'Falcı kazançlarından kesilecek komisyon oranı',
      icon: Percent,
      min: 0,
      max: 100
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
        </div>
      </div>
    </div>
  )
}
