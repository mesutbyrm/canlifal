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
  cfc_transfer_commission: string
  jeton_transfer_min: string
  cfc_transfer_min: string
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

  live_matches_enabled: string
  tiktok_section_enabled: string

  chat_marquee_enabled: string
  chat_marquee_effect: string
  chat_marquee_speed: string
  chat_marquee_repeat: string

  // Voice Room Settings
  vr_gift_receiver_percent: string
  vr_room_owner_percent: string
  vr_site_commission_percent: string
  vr_music_owner_percent: string
  vr_vip_music_owner_percent: string
  vr_free_room_max_users: string
  vr_normal_room_max_users: string
  vr_vip_room_max_users: string
  vr_seat_count: string
  bana_ozel_ad_daily_limit: string

  // Multi-Guest
  live_guest_max_slots: string
  live_guest_request_ttl_sec: string
  live_guest_invite_ttl_sec: string
  live_guest_removed_cooldown_sec: string

  // PK
  pk_default_duration: string
  pk_min_duration: string
  pk_max_duration: string
  pk_cooldown_sec: string
  pk_max_manual_points: string
  pk_max_participants_per_side: string
  pk_stream_enabled: string
  pk_room_enabled: string

  // Gift Box
  gift_box_min_amount: string
  gift_box_max_amount: string
  gift_box_min_duration_sec: string
  gift_box_max_duration_sec: string
  gift_box_max_winners: string
  gift_box_allowed_durations: string
  gift_box_extra_task_types: string
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
    cfc_transfer_commission: '0',
    jeton_transfer_min: '100',
    cfc_transfer_min: '100',
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

    live_matches_enabled: 'true',
    tiktok_section_enabled: 'true',

    chat_marquee_enabled: 'true',
    chat_marquee_effect: 'scroll-left',
    chat_marquee_speed: '10',
    chat_marquee_repeat: '0',

    // Voice Room Settings
    vr_gift_receiver_percent: '70',
    vr_room_owner_percent: '30',
    vr_site_commission_percent: '50',
    vr_music_owner_percent: '50',
    vr_vip_music_owner_percent: '70',
    vr_free_room_max_users: '15',
    vr_normal_room_max_users: '100',
    vr_vip_room_max_users: '500',
    vr_seat_count: '15',
    bana_ozel_ad_daily_limit: '0',

    live_guest_max_slots: '8',
    live_guest_request_ttl_sec: '90',
    live_guest_invite_ttl_sec: '60',
    live_guest_removed_cooldown_sec: '300',

    pk_default_duration: '180',
    pk_min_duration: '60',
    pk_max_duration: '600',
    pk_cooldown_sec: '0',
    pk_max_manual_points: '10',
    pk_max_participants_per_side: '4',
    pk_stream_enabled: 'true',
    pk_room_enabled: 'true',

    gift_box_min_amount: '10',
    gift_box_max_amount: '100000',
    gift_box_min_duration_sec: '5',
    gift_box_max_duration_sec: '300',
    gift_box_max_winners: '100',
    gift_box_allowed_durations: '5,10,15,30,60,120',
    gift_box_extra_task_types: '',
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
        setSettings(prev => ({ ...prev, ...data, vr_seat_count: data.vr_seat_count ?? '15', bana_ozel_ad_daily_limit: data.bana_ozel_ad_daily_limit ?? '0' }))
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
      key: 'cfc_transfer_commission',
      label: 'CFC Transfer Komisyonu (%)',
      description: 'Kullanıcılar arası CFC transferinden (Hediye Yolla) kesilecek komisyon oranı',
      icon: Percent,
      min: 0,
      max: 100
    },
    {
      key: 'jeton_transfer_min',
      label: 'En Az Jeton Transferi',
      description: 'Hediye Yolla ile gönderilebilecek en düşük jeton miktarı',
      icon: Percent,
      min: 1,
      max: 100000
    },
    {
      key: 'cfc_transfer_min',
      label: 'En Az CFC Transferi',
      description: 'Hediye Yolla ile gönderilebilecek en düşük CFC miktarı',
      icon: Percent,
      min: 1,
      max: 100000
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
      label: 'Hoş Geldin CFC',
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

          {/* Live Matches Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52 }}
            className="bg-gradient-to-r from-deep-purple-800/50 to-purple-900/30 rounded-xl p-6 border border-purple-500/20"
          >
            <h3 className="text-lg font-semibold text-white mb-1">⚽ Canlı Maçlar</h3>
            <p className="text-sm text-fuchsia-400 mb-4">Ana sayfada canlı maç skorlarının gösterilip gösterilmeyeceğini ayarlayın</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-purple-200">Durum:</span>
              <button
                onClick={() => {
                  const newVal = settings.live_matches_enabled === 'true' ? 'false' : 'true'
                  setSettings(prev => ({ ...prev, live_matches_enabled: newVal }))
                  saveSetting('live_matches_enabled', newVal)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  settings.live_matches_enabled === 'true'
                    ? 'bg-green-600/20 border-green-500/30 text-green-300'
                    : 'bg-red-600/20 border-red-500/30 text-red-300'
                }`}
              >
                {settings.live_matches_enabled === 'true' ? '✅ Gösteriliyor' : '❌ Gizli'}
              </button>
            </div>
          </motion.div>

          {/* TikTok Section Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.53 }}
            className="bg-gradient-to-r from-deep-purple-800/50 to-purple-900/30 rounded-xl p-6 border border-purple-500/20"
          >
            <h3 className="text-lg font-semibold text-white mb-1">🎵 TikTok Videoları</h3>
            <p className="text-sm text-fuchsia-400 mb-4">Ana sayfada TikTok video bölümünün gösterilip gösterilmeyeceğini ayarlayın</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-purple-200">Durum:</span>
              <button
                onClick={() => {
                  const newVal = settings.tiktok_section_enabled === 'true' ? 'false' : 'true'
                  setSettings(prev => ({ ...prev, tiktok_section_enabled: newVal }))
                  saveSetting('tiktok_section_enabled', newVal)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  settings.tiktok_section_enabled === 'true'
                    ? 'bg-green-600/20 border-green-500/30 text-green-300'
                    : 'bg-red-600/20 border-red-500/30 text-red-300'
                }`}
              >
                {settings.tiktok_section_enabled === 'true' ? '✅ Gösteriliyor' : '❌ Gizli'}
              </button>
            </div>
          </motion.div>

          {/* Voice Room Revenue Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.54 }}
            className="bg-gradient-to-r from-deep-purple-800/50 to-purple-900/30 rounded-xl p-6 border border-purple-500/20"
          >
            <h3 className="text-lg font-semibold text-white mb-1">🎤 Sesli Sohbet Oda Ayarları</h3>
            <p className="text-sm text-fuchsia-400 mb-4">Hediye dağılım oranları, müzik isteği komisyonları ve oda kapasiteleri</p>
            
            <div className="space-y-6">
              {/* Gift Distribution */}
              <div>
                <h4 className="text-sm font-semibold text-purple-300 mb-3">🎁 Hediye Dağılımı</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { key: 'vr_gift_receiver_percent', label: 'Hediye Alan (%)' },
                    { key: 'vr_room_owner_percent', label: 'Oda Sahibi (%)' },
                    { key: 'vr_site_commission_percent', label: 'Site Komisyonu (%)' },
                  ].map(item => (
                    <div key={item.key} className="flex flex-col gap-1">
                      <span className="text-xs text-purple-200">{item.label}</span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={settings[item.key as keyof PlatformSettings]}
                          onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.value }))}
                          className="w-20 px-3 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500"
                        />
                        <button
                          onClick={() => saveSetting(item.key, settings[item.key as keyof PlatformSettings])}
                          disabled={saving === item.key}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg text-sm"
                        >
                          {saving === item.key ? '...' : saved === item.key ? '✓' : 'Kaydet'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-purple-400 mt-2">Örnek: 1000 jeton hediye → Alan: %70=700, Sahibi: %30=300. Sonra her paydan %50 komisyon → Alan: 350, Sahibi: 150, Site: 500</p>
              </div>

              {/* Music Revenue */}
              <div>
                <h4 className="text-sm font-semibold text-purple-300 mb-3">🎵 Müzik İsteği Gelir Paylaşımı</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'vr_music_owner_percent', label: 'Normal Oda - Sahibi Payı (%)' },
                    { key: 'vr_vip_music_owner_percent', label: 'VIP Oda - Sahibi Payı (%)' },
                  ].map(item => (
                    <div key={item.key} className="flex flex-col gap-1">
                      <span className="text-xs text-purple-200">{item.label}</span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={settings[item.key as keyof PlatformSettings]}
                          onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.value }))}
                          className="w-20 px-3 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500"
                        />
                        <button
                          onClick={() => saveSetting(item.key, settings[item.key as keyof PlatformSettings])}
                          disabled={saving === item.key}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg text-sm"
                        >
                          {saving === item.key ? '...' : saved === item.key ? '✓' : 'Kaydet'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-purple-400 mt-2">Ücretsiz odalarda müzik geliri tamamen siteye gider. Normal/VIP odalarda kalan kısım siteye gider.</p>
              </div>

              {/* Bana Özel reklam limiti */}
              <div>
                <h4 className="text-sm font-semibold text-purple-300 mb-3">📺 &quot;Bana Özel&quot; Reklam İzleme Limiti</h4>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-purple-200">Bakiyesi yetmeyen kullanıcının günde kaç kez reklam izleyerek açabileceği</span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={settings.bana_ozel_ad_daily_limit}
                      onChange={(e) => setSettings(prev => ({ ...prev, bana_ozel_ad_daily_limit: e.target.value }))}
                      className="w-24 px-3 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => saveSetting('bana_ozel_ad_daily_limit', settings.bana_ozel_ad_daily_limit)}
                      disabled={saving === 'bana_ozel_ad_daily_limit'}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg text-sm"
                    >
                      {saving === 'bana_ozel_ad_daily_limit' ? '...' : saved === 'bana_ozel_ad_daily_limit' ? '✓' : 'Kaydet'}
                    </button>
                  </div>
                  <p className="text-xs text-purple-400 mt-2">
                    <strong>0 = sınırsız</strong> (varsayılan). Ödeme sırası: önce CFC, yetmezse Jeton,
                    ikisi de yetmezse reklam izleyerek ücretsiz açma.
                  </p>
                </div>
              </div>

              {/* Koltuk Sayısı — BÖLÜM 2 */}
              <div>
                <h4 className="text-sm font-semibold text-purple-300 mb-3">🪑 Varsayılan Koltuk Sayısı</h4>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-purple-200">Sesli odalarda mikrofon koltuğu sayısı (2–15)</span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="2"
                      max="15"
                      value={settings.vr_seat_count}
                      onChange={(e) => setSettings(prev => ({ ...prev, vr_seat_count: e.target.value }))}
                      className="w-24 px-3 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => saveSetting('vr_seat_count', settings.vr_seat_count)}
                      disabled={saving === 'vr_seat_count'}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg text-sm"
                    >
                      {saving === 'vr_seat_count' ? '...' : saved === 'vr_seat_count' ? '✓' : 'Kaydet'}
                    </button>
                  </div>
                  <p className="text-xs text-purple-400 mt-2">
                    Dağılım: 1 oda sahibi + en fazla 10 misafir + en fazla 4 ayrıcalıklı koltuk
                    (admin / yönetici / moderatör veya Gold ve üstü üyelikler). Bir odada bu değer
                    oda ayarlarından ayrıca değiştirilebilir.
                  </p>
                </div>
              </div>

              {/* Max Users */}
              <div>
                <h4 className="text-sm font-semibold text-purple-300 mb-3">👥 Oda Kapasiteleri</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { key: 'vr_free_room_max_users', label: 'Ücretsiz Oda' },
                    { key: 'vr_normal_room_max_users', label: 'Normal Oda' },
                    { key: 'vr_vip_room_max_users', label: 'VIP Oda' },
                  ].map(item => (
                    <div key={item.key} className="flex flex-col gap-1">
                      <span className="text-xs text-purple-200">{item.label}</span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={settings[item.key as keyof PlatformSettings]}
                          onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.value }))}
                          className="w-24 px-3 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500"
                        />
                        <button
                          onClick={() => saveSetting(item.key, settings[item.key as keyof PlatformSettings])}
                          disabled={saving === item.key}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg text-sm"
                        >
                          {saving === item.key ? '...' : saved === item.key ? '✓' : 'Kaydet'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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

          {/* §19 Multi-Guest Ayarları */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-deep-purple-800/40 rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">👥 Multi-Guest Ayarları</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'live_guest_max_slots', label: 'Maks. Misafir Sayısı', hint: '2-8 arası' },
                { key: 'live_guest_request_ttl_sec', label: 'İstek Zaman Aşımı (sn)', hint: 'Varsayılan: 90' },
                { key: 'live_guest_invite_ttl_sec', label: 'Davet Zaman Aşımı (sn)', hint: 'Varsayılan: 60' },
                { key: 'live_guest_removed_cooldown_sec', label: 'Çıkarılma Bekleme Süresi (sn)', hint: '0 = bekleme yok' },
              ].map(item => (
                <div key={item.key} className="flex flex-col gap-1">
                  <label className="text-sm text-purple-300">{item.label}</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" value={settings[item.key as keyof PlatformSettings]} onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.value }))} className="w-24 px-3 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm text-center" />
                    <button onClick={() => saveSetting(item.key, settings[item.key as keyof PlatformSettings])} disabled={saving === item.key} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm disabled:opacity-50">{saving === item.key ? '...' : saved === item.key ? '✓' : 'Kaydet'}</button>
                  </div>
                  <span className="text-xs text-purple-400">{item.hint}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* §19 PK Ayarları */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="bg-deep-purple-800/40 rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">⚔️ PK Ayarları</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'pk_default_duration', label: 'Varsayılan Süre (sn)', hint: 'Varsayılan: 180' },
                { key: 'pk_min_duration', label: 'Min. Süre (sn)', hint: 'Varsayılan: 60' },
                { key: 'pk_max_duration', label: 'Maks. Süre (sn)', hint: 'Varsayılan: 600' },
                { key: 'pk_cooldown_sec', label: 'Cooldown (sn)', hint: '0 = cooldown yok' },
                { key: 'pk_max_manual_points', label: 'Maks. Manuel Puan', hint: 'Varsayılan: 10' },
                { key: 'pk_max_participants_per_side', label: 'Taraf Başına Maks. Katılımcı', hint: '1-8' },
              ].map(item => (
                <div key={item.key} className="flex flex-col gap-1">
                  <label className="text-sm text-purple-300">{item.label}</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" value={settings[item.key as keyof PlatformSettings]} onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.value }))} className="w-24 px-3 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm text-center" />
                    <button onClick={() => saveSetting(item.key, settings[item.key as keyof PlatformSettings])} disabled={saving === item.key} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm disabled:opacity-50">{saving === item.key ? '...' : saved === item.key ? '✓' : 'Kaydet'}</button>
                  </div>
                  <span className="text-xs text-purple-400">{item.hint}</span>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-sm text-purple-300">Canlı Yayın PK</label>
                <button onClick={() => { const v = settings.pk_stream_enabled === 'true' ? 'false' : 'true'; setSettings(prev => ({ ...prev, pk_stream_enabled: v })); saveSetting('pk_stream_enabled', v) }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${settings.pk_stream_enabled === 'true' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600/50 hover:bg-red-500 text-red-200'}`}>{settings.pk_stream_enabled === 'true' ? '✅ Açık' : '❌ Kapalı'}</button>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-purple-300">Sesli Oda PK</label>
                <button onClick={() => { const v = settings.pk_room_enabled === 'true' ? 'false' : 'true'; setSettings(prev => ({ ...prev, pk_room_enabled: v })); saveSetting('pk_room_enabled', v) }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${settings.pk_room_enabled === 'true' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600/50 hover:bg-red-500 text-red-200'}`}>{settings.pk_room_enabled === 'true' ? '✅ Açık' : '❌ Kapalı'}</button>
              </div>
            </div>
          </motion.div>

          {/* §19 Hediye Kutusu Ayarları */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-deep-purple-800/40 rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">🎁 Hediye Kutusu Ayarları</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'gift_box_min_amount', label: 'Min. Jeton', hint: 'Varsayılan: 10' },
                { key: 'gift_box_max_amount', label: 'Maks. Jeton', hint: 'Varsayılan: 100000' },
                { key: 'gift_box_min_duration_sec', label: 'Min. Süre (sn)', hint: 'Varsayılan: 5' },
                { key: 'gift_box_max_duration_sec', label: 'Maks. Süre (sn)', hint: 'Varsayılan: 300' },
                { key: 'gift_box_max_winners', label: 'Maks. Kazanan Sayısı', hint: 'Varsayılan: 100' },
              ].map(item => (
                <div key={item.key} className="flex flex-col gap-1">
                  <label className="text-sm text-purple-300">{item.label}</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" value={settings[item.key as keyof PlatformSettings]} onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.value }))} className="w-24 px-3 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm text-center" />
                    <button onClick={() => saveSetting(item.key, settings[item.key as keyof PlatformSettings])} disabled={saving === item.key} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm disabled:opacity-50">{saving === item.key ? '...' : saved === item.key ? '✓' : 'Kaydet'}</button>
                  </div>
                  <span className="text-xs text-purple-400">{item.hint}</span>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-sm text-purple-300">İzin Verilen Süreler (virgülle ayrılmış saniye)</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={settings.gift_box_allowed_durations} onChange={(e) => setSettings(prev => ({ ...prev, gift_box_allowed_durations: e.target.value }))} className="flex-1 px-3 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm" placeholder="5,10,15,30,60,120" />
                  <button onClick={() => saveSetting('gift_box_allowed_durations', settings.gift_box_allowed_durations)} disabled={saving === 'gift_box_allowed_durations'} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm disabled:opacity-50">{saving === 'gift_box_allowed_durations' ? '...' : saved === 'gift_box_allowed_durations' ? '✓' : 'Kaydet'}</button>
                </div>
                <span className="text-xs text-purple-400">Örnek: 5,10,15,30,60,120</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-purple-300">Ek Görev Türleri (virgülle ayrılmış)</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={settings.gift_box_extra_task_types} onChange={(e) => setSettings(prev => ({ ...prev, gift_box_extra_task_types: e.target.value }))} className="flex-1 px-3 py-2 bg-deep-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm" placeholder="custom_task1,custom_task2" />
                  <button onClick={() => saveSetting('gift_box_extra_task_types', settings.gift_box_extra_task_types)} disabled={saving === 'gift_box_extra_task_types'} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm disabled:opacity-50">{saving === 'gift_box_extra_task_types' ? '...' : saved === 'gift_box_extra_task_types' ? '✓' : 'Kaydet'}</button>
                </div>
                <span className="text-xs text-purple-400">Boş bırakırsan yalnız yerleşik görevler (none, follow_creator, follow_broadcaster, follow_user, share)</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}