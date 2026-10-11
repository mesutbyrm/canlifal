'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSiteTheme } from '@/lib/theme-context'
import { motion } from 'framer-motion'
import AdminBackButton from '@/components/admin-back-button'
import {
  Save, Loader2, Search, RefreshCw, Users, Wallet, TrendingUp, Building2, Percent,
} from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  referral: 'Referans',
  agency_invite: 'Ajans Daveti',
}

const CURRENCY_LABELS: Record<string, string> = {
  credits: 'CFC',
  cfc: 'CFC',
  jeton: 'Jeton',
}

const SOURCE_LABELS: Record<string, string> = {
  admin_credit: 'Admin Yükleme',
  cfc_payment: 'CFC Satın Alma',
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR').format(n || 0)
}

export default function ReferralCommissionAdmin() {
  const { theme } = useSiteTheme()
  // 'facebook' tek açık temadır; diğer tüm temalar koyu
  const isDark = theme !== 'facebook'

  const cardBg = isDark ? 'bg-[#1a0a2e]/80 border-purple-900/30' : 'bg-white border-gray-200'
  const textColor = isDark ? 'text-white' : 'text-gray-900'
  const subText = isDark ? 'text-purple-200' : 'text-gray-500'
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-[#120722] border-purple-800/50 text-white placeholder-purple-400/50' : 'bg-white border-gray-300 text-gray-900'}`

  const [stats, setStats] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [settings, setSettings] = useState<any[]>([])
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 30

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/referral-commission/settings')
      if (!res.ok) return
      const data = await res.json()
      setSettings(data.settings || [])
      const f: Record<string, string> = {}
      ;(data.settings || []).forEach((s: any) => { f[s.key] = String(s.value) })
      setForm(f)
    } catch (e) {
      console.error('settings load error', e)
    }
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (filterType !== 'all') params.set('type', filterType)
      if (search) params.set('q', search)
      const res = await fetch(`/api/admin/referral-commission?${params.toString()}`)
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
      setStats(data.stats || null)
    } catch (e) {
      console.error('list load error', e)
    } finally {
      setLoading(false)
    }
  }, [filterType, search, offset])

  useEffect(() => { loadSettings() }, [loadSettings])
  useEffect(() => { loadList() }, [loadList])

  const saveSettings = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/referral-commission/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: form }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'Kaydedilemedi')
      } else {
        setMessage('✅ Ayarlar kaydedildi')
        loadSettings()
      }
    } catch (e) {
      setMessage('Kaydedilemedi')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 4000)
    }
  }

  const statCards = [
    { icon: Wallet, label: 'Toplam Ödenen', value: fmt(stats?.totalPaid || 0), color: 'from-emerald-500 to-teal-600' },
    { icon: TrendingUp, label: 'Bu Ay Ödenen', value: fmt(stats?.monthlyPaid || 0), color: 'from-purple-500 to-fuchsia-600' },
    { icon: Users, label: 'Referans Komisyonu', value: fmt(stats?.referralPaid || 0), color: 'from-blue-500 to-indigo-600' },
    { icon: Building2, label: 'Ajans Komisyonu', value: fmt(stats?.agencyPaid || 0), color: 'from-amber-500 to-orange-600' },
    { icon: Percent, label: 'Kazanan Kişi', value: fmt(stats?.earnerCount || 0), color: 'from-pink-500 to-rose-600' },
  ]

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0f0520]' : 'bg-gray-50'} px-4 py-6`}>
      <div className="max-w-7xl mx-auto">
        <AdminBackButton />

        <div className="mb-6">
          <h1 className={`text-2xl md:text-3xl font-bold ${textColor}`}>🤝 Referans & Ajans Komisyonu</h1>
          <p className={`text-sm mt-1 ${subText}`}>
            Her jeton/CFC yüklemesinde davet eden kullanıcıya ve ajans sahibine otomatik komisyon ödenir.
          </p>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {statCards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl border p-4 ${cardBg}`}
            >
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center mb-2`}>
                <c.icon className="w-5 h-5 text-white" />
              </div>
              <div className={`text-xl font-bold ${textColor}`}>{c.value}</div>
              <div className={`text-xs ${subText}`}>{c.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Ayarlar */}
        <div className={`rounded-xl border p-5 mb-6 ${cardBg}`}>
          <h2 className={`text-lg font-bold mb-4 ${textColor}`}>⚙️ Komisyon Ayarları</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.map(s => {
              const isBool = s.key.endsWith('_enabled')
              return (
                <div key={s.key}>
                  <label className={`block text-xs mb-1.5 ${subText}`}>{s.label}</label>
                  {isBool ? (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, [s.key]: f[s.key] === 'true' ? 'false' : 'true' }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        form[s.key] === 'true'
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : isDark ? 'bg-[#120722] border-purple-800/50 text-purple-300' : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                    >
                      {form[s.key] === 'true' ? 'Açık' : 'Kapalı'}
                    </button>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      step={s.key.endsWith('_rate') ? '0.1' : '1'}
                      className={inputCls}
                      value={form[s.key] ?? ''}
                      onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Ayarları Kaydet
            </button>
            {message && <span className={`text-sm ${subText}`}>{message}</span>}
          </div>
          <p className={`text-xs mt-3 ${subText}`}>
            Limit alanlarında <strong>0</strong> = sınırsız. Oranlar yüzde (%) cinsindendir.
          </p>
        </div>

        {/* Filtreler */}
        <div className={`rounded-xl border p-4 mb-4 ${cardBg} flex flex-wrap items-center gap-3`}>
          <select
            className={`${inputCls} !w-auto`}
            value={filterType}
            onChange={e => { setOffset(0); setFilterType(e.target.value) }}
          >
            <option value="all">Tüm Türler</option>
            <option value="referral">Referans</option>
            <option value="agency_invite">Ajans Daveti</option>
          </select>
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <input
              className={inputCls}
              placeholder="Kullanıcı adı / e-posta ara..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setOffset(0); setSearch(query) } }}
            />
            <button
              onClick={() => { setOffset(0); setSearch(query) }}
              className="px-3 py-2 rounded-lg bg-purple-600 text-white"
              aria-label="Ara"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={loadList}
            className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 ${isDark ? 'border-purple-800/50 text-purple-200' : 'border-gray-300 text-gray-600'}`}
          >
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>

        {/* Defter */}
        <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : items.length === 0 ? (
            <div className={`p-10 text-center text-sm ${subText}`}>Henüz komisyon kaydı yok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? 'bg-[#120722] text-purple-300' : 'bg-gray-100 text-gray-600'}>
                    <th className="text-left px-4 py-3 font-medium">Kazanan</th>
                    <th className="text-left px-4 py-3 font-medium">Yükleyen</th>
                    <th className="text-left px-4 py-3 font-medium">Tür</th>
                    <th className="text-right px-4 py-3 font-medium">Yükleme</th>
                    <th className="text-right px-4 py-3 font-medium">Oran</th>
                    <th className="text-right px-4 py-3 font-medium">Komisyon</th>
                    <th className="text-left px-4 py-3 font-medium">Kaynak</th>
                    <th className="text-left px-4 py-3 font-medium">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className={isDark ? 'border-t border-purple-900/30' : 'border-t border-gray-200'}>
                      <td className={`px-4 py-3 ${textColor}`}>
                        {it.earner?.name || it.earner?.username || '-'}
                        <div className={`text-xs ${subText}`}>{it.earner?.email || ''}</div>
                      </td>
                      <td className={`px-4 py-3 ${textColor}`}>{it.sourceUser?.name || it.sourceUser?.username || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs ${it.commissionType === 'agency_invite' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {TYPE_LABELS[it.commissionType] || it.commissionType}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right ${textColor}`}>
                        {fmt(it.topupAmount)} {CURRENCY_LABELS[it.topupCurrency] || it.topupCurrency}
                      </td>
                      <td className={`px-4 py-3 text-right ${subText}`}>%{it.rate}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                        +{fmt(it.amount)} {CURRENCY_LABELS[it.currency] || it.currency}
                      </td>
                      <td className={`px-4 py-3 text-xs ${subText}`}>{SOURCE_LABELS[it.sourceType] || it.sourceType}</td>
                      <td className={`px-4 py-3 text-xs ${subText}`}>
                        {new Date(it.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sayfalama */}
        {total > limit && (
          <div className="flex items-center justify-between mt-4">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className={`px-4 py-2 rounded-lg border text-sm disabled:opacity-40 ${isDark ? 'border-purple-800/50 text-purple-200' : 'border-gray-300 text-gray-600'}`}
            >
              Önceki
            </button>
            <span className={`text-sm ${subText}`}>{offset + 1} - {Math.min(offset + limit, total)} / {total}</span>
            <button
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
              className={`px-4 py-2 rounded-lg border text-sm disabled:opacity-40 ${isDark ? 'border-purple-800/50 text-purple-200' : 'border-gray-300 text-gray-600'}`}
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
