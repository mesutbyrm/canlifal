'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSiteTheme } from '@/lib/theme-context'
import { motion } from 'framer-motion'
import AdminBackButton from '@/components/admin-back-button'
import { Save, Loader2, RefreshCw, Plus, Trash2, Coins, Sparkles, Percent, Lock, Unlock } from 'lucide-react'

const CURRENCY_OPTIONS = [
  { value: 'all', label: 'Tümü' },
  { value: 'jeton', label: 'Jeton' },
  { value: 'cfc', label: 'CFC' },
]

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Tüm Kaynaklar' },
  { value: 'admin_credit', label: 'Admin Yükleme' },
  { value: 'cfc_payment', label: 'CFC Satın Alma' },
  { value: 'package', label: 'Paket Satın Alma' },
]

const emptyTier = {
  label: '',
  minAmount: '10000',
  bonusPercent: '5',
  currency: 'all',
  sourceType: 'all',
  maxBonus: '0',
  isActive: true,
  sortOrder: '0',
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR').format(n || 0)
}

export default function CurrencySettingsAdmin() {
  const { theme } = useSiteTheme()
  const isDark = theme !== 'facebook'

  const cardBg = isDark ? 'bg-[#1a0a2e]/80 border-purple-900/30' : 'bg-white border-gray-200'
  const textColor = isDark ? 'text-white' : 'text-gray-900'
  const subText = isDark ? 'text-purple-200' : 'text-gray-500'
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-[#120722] border-purple-800/50 text-white placeholder-purple-400/50' : 'bg-white border-gray-300 text-gray-900'}`

  const [tab, setTab] = useState<'branding' | 'bonus'>('branding')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [settings, setSettings] = useState<any[]>([])
  const [form, setForm] = useState<Record<string, string>>({})

  const [tiers, setTiers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [tierForm, setTierForm] = useState<any>({ ...emptyTier })

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [s, t] = await Promise.all([
        fetch('/api/admin/currency-settings').then((r) => r.json()),
        fetch('/api/admin/topup-bonus-tiers').then((r) => r.json()),
      ])
      if (Array.isArray(s?.settings)) {
        setSettings(s.settings)
        const f: Record<string, string> = {}
        s.settings.forEach((x: any) => (f[x.key] = String(x.value ?? '')))
        setForm(f)
      }
      if (Array.isArray(t?.tiers)) {
        setTiers(t.tiers)
        setStats(t.stats || null)
      }
    } catch (e) {
      setMessage('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const saveSettings = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/currency-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: form }),
      })
      const data = await res.json()
      setMessage(res.ok ? '✅ Para birimi ayarları kaydedildi' : `❌ ${data?.error || 'Kaydedilemedi'}`)
      if (res.ok) loadAll()
    } catch {
      setMessage('❌ Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const openCreate = () => {
    setEditId(null)
    setTierForm({ ...emptyTier })
    setShowModal(true)
  }

  const openEdit = (t: any) => {
    setEditId(t.id)
    setTierForm({
      label: t.label || '',
      minAmount: String(t.minAmount),
      bonusPercent: String(t.bonusPercent),
      currency: t.currency,
      sourceType: t.sourceType,
      maxBonus: String(t.maxBonus),
      isActive: t.isActive,
      sortOrder: String(t.sortOrder),
    })
    setShowModal(true)
  }

  const saveTier = async () => {
    setSaving(true)
    setMessage('')
    try {
      const payload = {
        label: tierForm.label || null,
        minAmount: Number(tierForm.minAmount),
        bonusPercent: Number(tierForm.bonusPercent),
        currency: tierForm.currency,
        sourceType: tierForm.sourceType,
        maxBonus: Number(tierForm.maxBonus),
        isActive: !!tierForm.isActive,
        sortOrder: Number(tierForm.sortOrder),
      }
      const res = await fetch(
        editId ? `/api/admin/topup-bonus-tiers/${editId}` : '/api/admin/topup-bonus-tiers',
        {
          method: editId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (res.ok) {
        setShowModal(false)
        setMessage('✅ Kademe kaydedildi')
        loadAll()
      } else {
        setMessage(`❌ ${data?.error || 'Kaydedilemedi'}`)
      }
    } catch {
      setMessage('❌ Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const toggleTier = async (t: any) => {
    await fetch(`/api/admin/topup-bonus-tiers/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !t.isActive }),
    })
    loadAll()
  }

  const deleteTier = async (t: any) => {
    if (!confirm(`"${t.label || t.minAmount}" kademesi silinsin mi?`)) return
    const res = await fetch(`/api/admin/topup-bonus-tiers/${t.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setMessage(`❌ ${d?.error || 'Silinemedi'}`)
    }
    loadAll()
  }

  const seedDefaults = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/topup-bonus-tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seed_defaults' }),
    })
    const d = await res.json().catch(() => ({}))
    setMessage(res.ok ? `✅ ${d.created} varsayılan kademe oluşturuldu` : `❌ ${d?.error || 'Oluşturulamadı'}`)
    setSaving(false)
    loadAll()
  }

  const jetonIcon = form['currency_jeton_icon'] || '/currency/jeton.svg'
  const cfcIcon = form['currency_cfc_icon'] || '/currency/cfc.svg'

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0f0520]' : 'bg-gray-50'} p-4 sm:p-6`}>
      <div className="max-w-6xl mx-auto">
        <AdminBackButton />

        <div className="mb-6">
          <h1 className={`text-2xl sm:text-3xl font-bold ${textColor} flex items-center gap-2`}>
            <Coins className="w-7 h-7 text-yellow-400" /> Para Birimi & Yükleme Bonusu
          </h1>
          <p className={`text-sm mt-1 ${subText}`}>
            Jeton ve CFC isimlerini/ikonlarını değiştirin, kademeli yüzdelik yükleme bonusu tanımlayın.
          </p>
        </div>

        {/* Kural kartı */}
        <div className={`rounded-xl border p-4 mb-6 ${isDark ? 'bg-[#1a0a2e]/60 border-purple-900/40' : 'bg-white border-gray-200'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3">
              <Unlock className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <div className={`font-semibold ${textColor}`}>{form['currency_jeton_name'] || 'Jeton'} — paraya çevrilebilir</div>
                <div className={`text-xs ${subText}`}>Satın alma ve hediye/yayın kazancı ile elde edilir. Asla ödül olarak verilmez.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-300 mt-0.5" />
              <div>
                <div className={`font-semibold ${textColor}`}>{form['currency_cfc_name'] || 'CFC'} — paraya çevrilemez</div>
                <div className={`text-xs ${subText}`}>Fal/Tarot, Bana Özel ve oyunlarda harcanır. Tüm ödül ve komisyonlar CFC ödenir.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sekmeler */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { id: 'branding', label: '🏷️ İsim & İkon' },
            { id: 'bonus', label: '📈 Bonus Kademeleri' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-purple-600 text-white'
                  : isDark
                  ? 'bg-[#1a0a2e] text-purple-200 border border-purple-900/40'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={loadAll}
            className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-[#1a0a2e] text-purple-200 border border-purple-900/40' : 'bg-white text-gray-700 border border-gray-200'}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {message && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-purple-900/30 text-purple-100' : 'bg-gray-100 text-gray-800'}`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : tab === 'branding' ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border p-5 ${cardBg}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={jetonIcon} alt="Jeton ikonu" className="w-16 h-16" />
                <div className={`text-sm ${subText}`}>
                  <div className={`font-semibold ${textColor}`}>{form['currency_jeton_name'] || 'Jeton'}</div>
                  <div>Önizleme</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cfcIcon} alt="CFC ikonu" className="w-16 h-16" />
                <div className={`text-sm ${subText}`}>
                  <div className={`font-semibold ${textColor}`}>{form['currency_cfc_name'] || 'CFC'}</div>
                  <div>Önizleme</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {settings.map((s) => (
                <div key={s.key}>
                  <label className={`block text-xs mb-1 ${subText}`}>{s.label}</label>
                  <div className="flex gap-2">
                    <input
                      className={inputCls}
                      value={form[s.key] ?? ''}
                      onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
                      placeholder={s.defaultValue}
                    />
                    {s.key.endsWith('_color') && (
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(form[s.key] || '') ? form[s.key] : '#ffffff'}
                        onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
                        className="w-11 h-[38px] rounded-lg border border-purple-800/50 bg-transparent cursor-pointer"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={saveSettings}
              disabled={saving}
              className="mt-5 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Toplam Kademe', value: fmt(stats?.total || 0), icon: Percent },
                { label: 'Aktif', value: fmt(stats?.active || 0), icon: Sparkles },
                { label: 'En Yüksek Bonus', value: `%${stats?.maxPercent || 0}`, icon: Percent },
                { label: 'En Düşük Eşik', value: stats?.lowestThreshold ? fmt(stats.lowestThreshold) : '—', icon: Coins },
              ].map((c, i) => (
                <div key={i} className={`rounded-xl border p-3 ${cardBg}`}>
                  <c.icon className="w-4 h-4 text-purple-400 mb-1" />
                  <div className={`text-lg font-bold ${textColor}`}>{c.value}</div>
                  <div className={`text-[11px] ${subText}`}>{c.label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" /> Kademe Ekle
              </button>
              {tiers.length === 0 && (
                <button onClick={seedDefaults} disabled={saving} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium disabled:opacity-50">
                  Varsayılanları Yükle (%5 / %7 / %10)
                </button>
              )}
            </div>

            <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
              {tiers.length === 0 ? (
                <div className={`p-8 text-center text-sm ${subText}`}>Henüz bonus kademesi tanımlanmamış.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={isDark ? 'bg-purple-900/20' : 'bg-gray-50'}>
                      <tr className={subText}>
                        <th className="text-left px-4 py-3 font-medium">Kademe</th>
                        <th className="text-right px-4 py-3 font-medium">Alt Sınır</th>
                        <th className="text-right px-4 py-3 font-medium">Bonus</th>
                        <th className="text-left px-4 py-3 font-medium">Para Birimi</th>
                        <th className="text-left px-4 py-3 font-medium">Kaynak</th>
                        <th className="text-right px-4 py-3 font-medium">Tavan</th>
                        <th className="text-center px-4 py-3 font-medium">Durum</th>
                        <th className="text-right px-4 py-3 font-medium">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map((t) => (
                        <tr key={t.id} className={isDark ? 'border-t border-purple-900/30' : 'border-t border-gray-100'}>
                          <td className={`px-4 py-3 ${textColor}`}>{t.label || '—'}</td>
                          <td className={`px-4 py-3 text-right ${textColor}`}>{fmt(t.minAmount)}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-400">%{t.bonusPercent}</td>
                          <td className={`px-4 py-3 ${subText}`}>{CURRENCY_OPTIONS.find((c) => c.value === t.currency)?.label || t.currency}</td>
                          <td className={`px-4 py-3 ${subText}`}>{SOURCE_OPTIONS.find((c) => c.value === t.sourceType)?.label || t.sourceType}</td>
                          <td className={`px-4 py-3 text-right ${subText}`}>{t.maxBonus > 0 ? fmt(t.maxBonus) : 'Sınırsız'}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleTier(t)}
                              className={`px-2 py-1 rounded text-[11px] font-medium ${t.isActive ? 'bg-emerald-600/20 text-emerald-300' : 'bg-gray-600/20 text-gray-400'}`}
                            >
                              {t.isActive ? 'Aktif' : 'Pasif'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button onClick={() => openEdit(t)} className="px-2 py-1 rounded text-[11px] bg-purple-600/30 text-purple-200 mr-1">Düzenle</button>
                            <button onClick={() => deleteTier(t)} className="px-2 py-1 rounded text-[11px] bg-red-600/20 text-red-300">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <p className={`text-xs mt-3 ${subText}`}>
              Bir yükleme birden fazla kademeye uyarsa en yüksek alt sınıra sahip kademe uygulanır. Bonus, yüklemenin
              yapıldığı para biriminde verilir.
            </p>
          </motion.div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl border p-5 max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#160829] border-purple-900/50' : 'bg-white border-gray-200'}`}
            >
              <h3 className={`text-lg font-bold mb-4 ${textColor}`}>{editId ? 'Kademe Düzenle' : 'Yeni Kademe'}</h3>

              <div className="space-y-3">
                <div>
                  <label className={`block text-xs mb-1 ${subText}`}>Etiket</label>
                  <input className={inputCls} value={tierForm.label} onChange={(e) => setTierForm({ ...tierForm, label: e.target.value })} placeholder="10.000 ve üzeri" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs mb-1 ${subText}`}>Alt sınır (yükleme tutarı)</label>
                    <input className={inputCls} type="number" value={tierForm.minAmount} onChange={(e) => setTierForm({ ...tierForm, minAmount: e.target.value })} />
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${subText}`}>Bonus oranı (%)</label>
                    <input className={inputCls} type="number" step="0.1" value={tierForm.bonusPercent} onChange={(e) => setTierForm({ ...tierForm, bonusPercent: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs mb-1 ${subText}`}>Para birimi</label>
                    <select className={inputCls} value={tierForm.currency} onChange={(e) => setTierForm({ ...tierForm, currency: e.target.value })}>
                      {CURRENCY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${subText}`}>Kaynak</label>
                    <select className={inputCls} value={tierForm.sourceType} onChange={(e) => setTierForm({ ...tierForm, sourceType: e.target.value })}>
                      {SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs mb-1 ${subText}`}>Bonus tavanı (0 = sınırsız)</label>
                    <input className={inputCls} type="number" value={tierForm.maxBonus} onChange={(e) => setTierForm({ ...tierForm, maxBonus: e.target.value })} />
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${subText}`}>Sıra</label>
                    <input className={inputCls} type="number" value={tierForm.sortOrder} onChange={(e) => setTierForm({ ...tierForm, sortOrder: e.target.value })} />
                  </div>
                </div>
                <label className={`flex items-center gap-2 text-sm ${textColor}`}>
                  <input type="checkbox" checked={!!tierForm.isActive} onChange={(e) => setTierForm({ ...tierForm, isActive: e.target.checked })} />
                  Aktif
                </label>
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={saveTier} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
                </button>
                <button onClick={() => setShowModal(false)} className={`px-4 py-2.5 rounded-lg text-sm ${isDark ? 'bg-[#241040] text-purple-200' : 'bg-gray-100 text-gray-700'}`}>
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
