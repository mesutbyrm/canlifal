'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSiteTheme } from '@/lib/theme-context'
import { ArrowLeft, Save, Loader2, ToggleLeft, ToggleRight, RefreshCw, Bot, MessageSquare, Swords, Users, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface GirLiveConfig {
  enabled: boolean
  welcomeText: string
  rulesText: string
  actions: Record<string, string>
  words: string[]
  whitelist: string[]
}

interface PublicBotConfig {
  jetonPromoEnabled: boolean
  pkStartEnabled: boolean
  pkMidReminderEnabled: boolean
  pkEndEnabled: boolean
  pastPkMotivationEnabled: boolean
  welcomeLeaveEnabled: boolean
  minMessageIntervalSec: number
  templates: Record<string, string>
}

const DEFAULT_PUBLIC: PublicBotConfig = {
  jetonPromoEnabled: true,
  pkStartEnabled: true,
  pkMidReminderEnabled: false,
  pkEndEnabled: true,
  pastPkMotivationEnabled: false,
  welcomeLeaveEnabled: true,
  minMessageIntervalSec: 30,
  templates: {
    pk_start: '⚔️ PK başladı! {hostName} vs {guestName} — hediye göndererek destekleyin!',
    pk_end: '🏆 PK bitti! Kazanan: {winnerName} ({winnerScore} - {loserScore} jeton)',
    pk_draw: '🤝 PK berabere! Her iki tarafı da tebrik edelim!',
    jeton_promo: '💎 Jeton almak için profil → Jeton bölümüne göz atın!',
    welcome: '👋 Hoş geldin {name}!',
    leave: '👋 Görüşmek üzere {name}!',
  },
}

export default function GirLiveBotPage() {
  const { data: session } = useSession() || {}
  const { theme } = useSiteTheme()
  const isCosmic = theme === 'cosmic'
  const isFacebook = theme === 'facebook'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [config, setConfig] = useState<GirLiveConfig | null>(null)
  const [publicConfig, setPublicConfig] = useState<PublicBotConfig>(DEFAULT_PUBLIC)
  const [newWord, setNewWord] = useState('')
  const [newWhitelist, setNewWhitelist] = useState('')

  const cardBg = isFacebook ? 'bg-white border border-gray-200' : isCosmic ? 'bg-blue-950/60 border border-blue-900/30' : 'bg-purple-950/60 border border-fuchsia-900/30'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-600' : isCosmic ? 'text-blue-200' : 'text-purple-200'
  const textMuted = isFacebook ? 'text-gray-400' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const inputBg = isFacebook ? 'bg-gray-100 text-gray-900 border-gray-200' : isCosmic ? 'bg-blue-900/40 text-white border-blue-800/30' : 'bg-purple-900/40 text-white border-fuchsia-800/30'

  const role = (session?.user as any)?.role
  const allowed = ['admin', 'yonetici'].includes(role)

  useEffect(() => {
    if (!allowed) return
    fetch('/api/admin/girlive-bot')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.success) {
          setConfig(d.data.config)
          setPublicConfig({ ...DEFAULT_PUBLIC, ...d.data.publicMessages })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [allowed])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const body: any = {}
      if (config) {
        body.enabled = config.enabled
        body.welcomeText = config.welcomeText
        body.rulesText = config.rulesText
        body.actions = config.actions
        body.words = config.words
        body.whitelist = config.whitelist
      }
      body.publicMessages = publicConfig
      const res = await fetch('/api/admin/girlive-bot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const err = await res.json()
        alert(err.error?.message || 'Kaydetme başarısız')
      }
    } catch {
      alert('Bağlantı hatası')
    } finally {
      setSaving(false)
    }
  }

  if (!allowed) {
    return <div className="flex items-center justify-center min-h-screen"><p className={textPrimary}>Erişim reddedildi</p></div>
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className={`w-8 h-8 animate-spin ${textMuted}`} /></div>
  }

  const Toggle = ({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className={`font-medium ${textPrimary}`}>{label}</p>
        {desc && <p className={`text-xs ${textMuted} mt-0.5`}>{desc}</p>}
      </div>
      <button onClick={() => onChange(!value)} className="flex-shrink-0">
        {value ? <ToggleRight className="w-8 h-8 text-green-500" /> : <ToggleLeft className={`w-8 h-8 ${textMuted}`} />}
      </button>
    </div>
  )

  const TemplateInput = ({ templateKey, label, placeholder }: { templateKey: string; label: string; placeholder?: string }) => (
    <div className="mb-3">
      <label className={`text-xs font-medium ${textSecondary} mb-1 block`}>{label}</label>
      <input
        type="text"
        value={publicConfig.templates[templateKey] || ''}
        onChange={e => setPublicConfig(prev => ({
          ...prev,
          templates: { ...prev.templates, [templateKey]: e.target.value }
        }))}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-lg ${inputBg} border text-sm`}
      />
    </div>
  )

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className={`p-2 rounded-lg ${cardBg} hover:opacity-80`}>
          <ArrowLeft className={`w-5 h-5 ${textPrimary}`} />
        </Link>
        <div className="flex-1">
          <h1 className={`text-2xl font-bold ${textPrimary}`}>🤖 GirLive Bot Yönetimi</h1>
          <p className={`text-sm ${textSecondary}`}>Moderasyon, karşılama, PK ve sohbet bot ayarları</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white transition-all ${
            saved ? 'bg-green-600' : isFacebook ? 'bg-blue-600 hover:bg-blue-700' : isCosmic ? 'bg-blue-600 hover:bg-blue-700' : 'bg-fuchsia-600 hover:bg-fuchsia-700'
          } disabled:opacity-50`}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <span>✓ Kaydedildi</span> : <><Save className="w-4 h-4" /> Kaydet</>}
        </button>
      </div>

      <div className="space-y-6">
        {/* Section 1: Moderasyon Botu */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${cardBg} rounded-xl p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Bot className={`w-5 h-5 ${accentColor}`} />
            <h2 className={`text-lg font-bold ${textPrimary}`}>Moderasyon Botu</h2>
          </div>

          {config && (
            <>
              <Toggle value={config.enabled} onChange={v => setConfig({ ...config, enabled: v })} label="Bot Aktif" desc="Otomatik moderasyon açık/kapalı" />

              <div className="mb-4">
                <label className={`text-xs font-medium ${textSecondary} mb-1 block`}>Hoş Geldin Mesajı</label>
                <textarea
                  value={config.welcomeText}
                  onChange={e => setConfig({ ...config, welcomeText: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg ${inputBg} border text-sm resize-none h-20`}
                  placeholder="Odaya giren kullanıcılara gösterilecek kurallar"
                />
              </div>

              <div className="mb-4">
                <label className={`text-xs font-medium ${textSecondary} mb-1 block`}>Oda Kuralları Metni</label>
                <textarea
                  value={config.rulesText}
                  onChange={e => setConfig({ ...config, rulesText: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg ${inputBg} border text-sm resize-none h-20`}
                  placeholder="Oda kuralları"
                />
              </div>

              {/* Yasaklı Kelimeler */}
              <div className="mb-4">
                <label className={`text-xs font-medium ${textSecondary} mb-2 block`}>
                  Yasaklı Kelimeler ({config.words.length})
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2 max-h-32 overflow-y-auto">
                  {config.words.map((w, i) => (
                    <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isFacebook ? 'bg-red-50 text-red-700' : 'bg-red-900/30 text-red-300'}`}>
                      {w}
                      <button onClick={() => setConfig({ ...config, words: config.words.filter((_, j) => j !== i) })} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newWord}
                    onChange={e => setNewWord(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newWord.trim()) {
                        setConfig({ ...config, words: [...config.words, newWord.trim()] })
                        setNewWord('')
                      }
                    }}
                    placeholder="Kelime ekle..."
                    className={`flex-1 px-3 py-2 rounded-lg ${inputBg} border text-sm`}
                  />
                  <button onClick={() => {
                    if (newWord.trim()) {
                      setConfig({ ...config, words: [...config.words, newWord.trim()] })
                      setNewWord('')
                    }
                  }} className={`px-3 py-2 rounded-lg text-sm font-medium text-white ${isFacebook ? 'bg-blue-600' : isCosmic ? 'bg-blue-600' : 'bg-fuchsia-600'}`}>
                    Ekle
                  </button>
                </div>
              </div>

              {/* Güvenli Kelimeler */}
              <div className="mb-2">
                <label className={`text-xs font-medium ${textSecondary} mb-2 block`}>
                  Güvenli Kelimeler ({config.whitelist.length})
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto">
                  {config.whitelist.map((w, i) => (
                    <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isFacebook ? 'bg-green-50 text-green-700' : 'bg-green-900/30 text-green-300'}`}>
                      {w}
                      <button onClick={() => setConfig({ ...config, whitelist: config.whitelist.filter((_, j) => j !== i) })} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newWhitelist}
                    onChange={e => setNewWhitelist(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newWhitelist.trim()) {
                        setConfig({ ...config, whitelist: [...config.whitelist, newWhitelist.trim()] })
                        setNewWhitelist('')
                      }
                    }}
                    placeholder="Güvenli kelime ekle..."
                    className={`flex-1 px-3 py-2 rounded-lg ${inputBg} border text-sm`}
                  />
                  <button onClick={() => {
                    if (newWhitelist.trim()) {
                      setConfig({ ...config, whitelist: [...config.whitelist, newWhitelist.trim()] })
                      setNewWhitelist('')
                    }
                  }} className={`px-3 py-2 rounded-lg text-sm font-medium text-white ${isFacebook ? 'bg-blue-600' : isCosmic ? 'bg-blue-600' : 'bg-fuchsia-600'}`}>
                    Ekle
                  </button>
                </div>
              </div>

              {/* Ciddiyet → Eylem Eşlemesi */}
              <div className="mb-2">
                <label className={`text-xs font-medium ${textSecondary} mb-2 block`}>Ciddiyet Eylemleri</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(config.actions).map(([severity, action]) => (
                    <div key={severity} className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${textSecondary} w-16 flex-shrink-0 capitalize`}>{severity}</span>
                      <select
                        value={action}
                        onChange={e => setConfig({ ...config, actions: { ...config.actions, [severity]: e.target.value } })}
                        className={`flex-1 px-2 py-1.5 rounded-lg ${inputBg} border text-sm`}>
                        <option value="warn">Uyar</option>
                        <option value="delete">Sil</option>
                        <option value="mute">Sustur</option>
                        <option value="kick">At</option>
                        <option value="ban">Yasakla</option>
                        <option value="ignore">Yoksay</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Section 2: Herkese Açık Bot (PK, Karşılama) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${cardBg} rounded-xl p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className={`w-5 h-5 ${accentColor}`} />
            <h2 className={`text-lg font-bold ${textPrimary}`}>Sohbet Botu (Herkese Açık)</h2>
          </div>

          <Toggle value={publicConfig.welcomeLeaveEnabled} onChange={v => setPublicConfig({ ...publicConfig, welcomeLeaveEnabled: v })}
            label="Karşılama / Uğurlama" desc="Odaya giren/çıkan kullanıcılara otomatik mesaj" />
          <Toggle value={publicConfig.pkStartEnabled} onChange={v => setPublicConfig({ ...publicConfig, pkStartEnabled: v })}
            label="PK Başlangıç Mesajı" desc="PK başladığında sohbete otomatik mesaj" />
          <Toggle value={publicConfig.pkEndEnabled} onChange={v => setPublicConfig({ ...publicConfig, pkEndEnabled: v })}
            label="PK Bitiş Mesajı" desc="PK bittiğinde sonuç mesajı" />
          <Toggle value={publicConfig.pkMidReminderEnabled} onChange={v => setPublicConfig({ ...publicConfig, pkMidReminderEnabled: v })}
            label="PK Ara Hatırlatma" desc="PK sırasında hediye gönderin hatırlatması" />
          <Toggle value={publicConfig.pastPkMotivationEnabled} onChange={v => setPublicConfig({ ...publicConfig, pastPkMotivationEnabled: v })}
            label="PK Motivasyon" desc="Geçmiş PK performansına göre teşvik" />
          <Toggle value={publicConfig.jetonPromoEnabled} onChange={v => setPublicConfig({ ...publicConfig, jetonPromoEnabled: v })}
            label="Jeton Tanıtımı" desc="Periyodik jeton satın alma hatırlatması" />

          <div className="mt-4 mb-3">
            <label className={`text-xs font-medium ${textSecondary} mb-1 block`}>Min. Mesaj Aralığı (saniye)</label>
            <input
              type="number"
              min={5}
              max={3600}
              value={publicConfig.minMessageIntervalSec}
              onChange={e => setPublicConfig({ ...publicConfig, minMessageIntervalSec: parseInt(e.target.value) || 30 })}
              className={`w-32 px-3 py-2 rounded-lg ${inputBg} border text-sm`}
            />
          </div>
        </motion.div>

        {/* Section 3: Mesaj Şablonları */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${cardBg} rounded-xl p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className={`w-5 h-5 ${accentColor}`} />
            <h2 className={`text-lg font-bold ${textPrimary}`}>Mesaj Şablonları</h2>
          </div>
          <p className={`text-xs ${textMuted} mb-4`}>Değişkenler: {'{name}'}, {'{hostName}'}, {'{guestName}'}, {'{winnerName}'}, {'{winnerScore}'}, {'{loserScore}'}</p>

          <TemplateInput templateKey="welcome" label="Karşılama" placeholder="👋 Hoş geldin {name}!" />
          <TemplateInput templateKey="leave" label="Uğurlama" placeholder="👋 Görüşmek üzere {name}!" />
          <TemplateInput templateKey="pk_start" label="PK Başlangıç" placeholder="⚔️ PK başladı! {hostName} vs {guestName}" />
          <TemplateInput templateKey="pk_end" label="PK Bitiş" placeholder="🏆 PK bitti! Kazanan: {winnerName}" />
          <TemplateInput templateKey="pk_draw" label="PK Berabere" placeholder="🤝 PK berabere!" />
          <TemplateInput templateKey="jeton_promo" label="Jeton Tanıtımı" placeholder="💎 Jeton almak için profil → Jeton bölümüne göz atın!" />
        </motion.div>
      </div>
    </div>
  )
}
