'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSiteTheme } from '@/lib/theme-context'
import { motion } from 'framer-motion'
import AdminBackButton from '@/components/admin-back-button'
import {
  Plus, Save, Loader2, X, Pencil, Power, Trash2, Search, Megaphone, MousePointerClick, Eye, RefreshCw, Download,
} from 'lucide-react'

const AD_TYPES = [
  { value: 'banner', label: 'Banner' },
  { value: 'interstitial', label: 'Geçiş Reklamı' },
  { value: 'rewarded', label: 'Ödüllü Video' },
  { value: 'native', label: 'Doğal Reklam' },
  { value: 'pre_roll', label: 'Yayın Öncesi Video' },
]

const AD_POSITIONS = [
  { value: 'top', label: 'Üst' },
  { value: 'bottom', label: 'Alt' },
  { value: 'inline', label: 'İçerik Arası' },
  { value: 'overlay', label: 'Üst Katman' },
  { value: 'sidebar', label: 'Yan Panel' },
]

const AD_PLATFORMS = [
  { value: 'all', label: 'Tümü' },
  { value: 'web', label: 'Sadece Web' },
  { value: 'mobile', label: 'Sadece Mobil' },
]

const MEMBERSHIP_TIERS = ['basic', 'silver', 'gold', 'premium', 'platinum', 'diamond', 'vip', 'svip']

type Placement = Record<string, any>

const emptyForm = (): Record<string, any> => ({
  name: '', placementKey: '', description: '', adNetworkId: '', adType: 'banner',
  position: 'inline', platform: 'all', isActive: false, sortOrder: 0, customCode: '',
  frequencyCap: 0, hideForMembership: [] as string[],
})

export default function AdPlacementsAdmin() {
  const { theme } = useSiteTheme()
  // 'facebook' tek açık temadır; diğer tüm temalar koyu
  const isDark = theme !== 'facebook'

  const cardBg = isDark ? 'bg-[#1a0a2e]/80 border-purple-900/30' : 'bg-white border-gray-200'
  const textColor = isDark ? 'text-white' : 'text-gray-900'
  const subText = isDark ? 'text-purple-200' : 'text-gray-500'
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-[#120722] border-purple-800/50 text-white placeholder-purple-400/50' : 'bg-white border-gray-300 text-gray-900'}`

  const [stats, setStats] = useState<any>(null)
  const [items, setItems] = useState<Placement[]>([])
  const [networks, setNetworks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterActive, setFilterActive] = useState('all')
  const [query, setQuery] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, any>>(emptyForm())

  const flash = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ad-placements/stats')
      if (res.ok) setStats(await res.json())
    } catch (e) { console.error(e) }
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filterType !== 'all') p.set('adType', filterType)
      if (filterActive !== 'all') p.set('isActive', filterActive)
      if (query.trim()) p.set('q', query.trim())
      const res = await fetch(`/api/admin/ad-placements?${p.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [filterType, filterActive, query])

  const loadNetworks = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ad-networks')
      if (res.ok) {
        const data = await res.json()
        setNetworks(Array.isArray(data) ? data : [])
      }
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { loadStats(); loadNetworks() }, [loadStats, loadNetworks])
  useEffect(() => { loadItems() }, [loadItems])

  const openCreate = () => { setEditId(null); setForm(emptyForm()); setShowForm(true) }

  const openEdit = (p: Placement) => {
    setEditId(p.id)
    setForm({
      name: p.name || '',
      placementKey: p.placementKey || '',
      description: p.description || '',
      adNetworkId: p.adNetworkId || '',
      adType: p.adType || 'banner',
      position: p.position || 'inline',
      platform: p.platform || 'all',
      isActive: !!p.isActive,
      sortOrder: p.sortOrder ?? 0,
      customCode: p.customCode || '',
      frequencyCap: p.frequencyCap ?? 0,
      hideForMembership: Array.isArray(p.targeting?.hideForMembership) ? p.targeting.hideForMembership : [],
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name?.trim()) { flash('Yerleşim adı zorunlu'); return }
    setSaving(true)
    try {
      const payload: any = {
        name: form.name,
        description: form.description || null,
        adNetworkId: form.adNetworkId || null,
        adType: form.adType,
        position: form.position || null,
        platform: form.platform,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
        customCode: form.customCode || null,
        frequencyCap: Number(form.frequencyCap) || 0,
        targeting: form.hideForMembership?.length ? { hideForMembership: form.hideForMembership } : null,
      }
      if (!editId) payload.placementKey = form.placementKey || form.name

      const res = await fetch(editId ? `/api/admin/ad-placements/${editId}` : '/api/admin/ad-placements', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { flash(data?.error || 'Kaydedilemedi'); return }
      flash(editId ? 'Yerleşim güncellendi' : 'Yerleşim oluşturuldu')
      setShowForm(false)
      loadItems(); loadStats()
    } catch (e) {
      console.error(e); flash('Bir hata oluştu')
    } finally { setSaving(false) }
  }

  const toggleActive = async (p: Placement) => {
    try {
      const res = await fetch(`/api/admin/ad-placements/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !p.isActive }),
      })
      if (res.ok) { loadItems(); loadStats() } else flash('Durum değiştirilemedi')
    } catch (e) { console.error(e) }
  }

  const remove = async (p: Placement) => {
    if (!confirm(`"${p.name}" yerleşimi silinsin mi?`)) return
    try {
      const res = await fetch(`/api/admin/ad-placements/${p.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { flash(data?.error || 'Silinemedi'); return }
      flash('Yerleşim silindi'); loadItems(); loadStats()
    } catch (e) { console.error(e) }
  }

  const resetStats = async (p: Placement) => {
    try {
      const res = await fetch(`/api/admin/ad-placements/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetStats: true }),
      })
      if (res.ok) { flash('Sayaçlar sıfırlandı'); loadItems(); loadStats() }
    } catch (e) { console.error(e) }
  }

  const seedDefaults = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/ad-placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_defaults' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { flash(data?.error || 'Yüklenemedi'); return }
      flash(`${data.created} varsayılan yerleşim eklendi`)
      loadItems(); loadStats()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const toggleTier = (tier: string) => {
    setForm((f: any) => {
      const cur: string[] = f.hideForMembership || []
      return { ...f, hideForMembership: cur.includes(tier) ? cur.filter(t => t !== tier) : [...cur, tier] }
    })
  }

  const statCards = [
    { label: 'Toplam Yerleşim', value: stats?.total ?? 0, icon: Megaphone },
    { label: 'Aktif', value: stats?.active ?? 0, icon: Power },
    { label: 'Gösterim', value: stats?.impressions ?? 0, icon: Eye },
    { label: 'Tıklama', value: stats?.clicks ?? 0, icon: MousePointerClick },
    { label: 'TO (CTR)', value: `%${stats?.ctr ?? 0}`, icon: MousePointerClick },
  ]

  return (
    <div className={`min-h-screen p-4 md:p-8 ${isDark ? 'bg-[#0f0520]' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        <AdminBackButton />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${textColor}`}>📢 Reklam Yerleşimleri</h1>
            <p className={`text-sm mt-1 ${subText}`}>Hangi reklamın sitenin neresinde gösterileceğini yönetin.</p>
          </div>
          <div className="flex gap-2">
            {(stats?.missingDefaults ?? 0) > 0 && (
              <button onClick={seedDefaults} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50">
                <Download className="w-4 h-4" /> Varsayılanları Yükle ({stats.missingDefaults})
              </button>
            )}
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium">
              <Plus className="w-4 h-4" /> Yeni Yerleşim
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-100 text-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {statCards.map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 ${cardBg}`}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${isDark ? 'text-purple-300' : 'text-purple-600'}`} />
                <span className={`text-xs ${subText}`}>{s.label}</span>
              </div>
              <div className={`text-2xl font-bold ${textColor}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className={`rounded-xl border p-4 mb-4 ${cardBg}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${subText}`} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ara: isim veya anahtar"
                className={`${inputCls} pl-9`} />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={inputCls}>
              <option value="all">Tüm tipler</option>
              {AD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className={inputCls}>
              <option value="all">Tüm durumlar</option>
              <option value="true">Sadece aktif</option>
              <option value="false">Sadece pasif</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
        ) : items.length === 0 ? (
          <div className={`rounded-xl border p-10 text-center ${cardBg}`}>
            <Megaphone className={`w-10 h-10 mx-auto mb-3 ${subText}`} />
            <p className={`${textColor} font-medium mb-1`}>Henüz reklam yerleşimi yok</p>
            <p className={`text-sm ${subText}`}>&quot;Varsayılanları Yükle&quot; ile 8 hazır yerleşimi ekleyebilirsiniz.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((p) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-4 ${cardBg}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`font-semibold ${textColor}`}>{p.name}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.isActive ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40' : 'bg-gray-600/20 text-gray-400 border border-gray-500/40'}`}>
                        {p.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-200 border border-purple-500/40">
                        {AD_TYPES.find(t => t.value === p.adType)?.label || p.adType}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-200 border border-blue-500/40">
                        {AD_PLATFORMS.find(t => t.value === p.platform)?.label || p.platform}
                      </span>
                    </div>
                    <code className={`text-xs ${subText}`}>{p.placementKey}</code>
                    {p.description && <p className={`text-sm mt-1 ${subText}`}>{p.description}</p>}
                    <div className={`text-xs mt-2 flex flex-wrap gap-x-4 gap-y-1 ${subText}`}>
                      <span>Ağ: {p.adNetwork?.name || (p.customCode ? 'Özel kod' : 'Atanmadı')}</span>
                      <span>Konum: {AD_POSITIONS.find(x => x.value === p.position)?.label || '—'}</span>
                      <span>Gösterim: {p.impressions ?? 0}</span>
                      <span>Tıklama: {p.clicks ?? 0}</span>
                      {p.frequencyCap > 0 && <span>Günlük limit: {p.frequencyCap}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => toggleActive(p)} title={p.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                      className={`p-2 rounded-lg ${p.isActive ? 'bg-emerald-600/20 text-emerald-300' : 'bg-gray-600/20 text-gray-400'} hover:opacity-80`}>
                      <Power className="w-4 h-4" />
                    </button>
                    <button onClick={() => resetStats(p)} title="Sayaçları sıfırla"
                      className="p-2 rounded-lg bg-blue-600/20 text-blue-300 hover:opacity-80">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(p)} title="Düzenle"
                      className="p-2 rounded-lg bg-purple-600/20 text-purple-300 hover:opacity-80">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(p)} title="Sil"
                      className="p-2 rounded-lg bg-red-600/20 text-red-300 hover:opacity-80">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className={`w-full max-w-2xl my-8 rounded-2xl border p-5 ${cardBg}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-bold ${textColor}`}>
                  {editId ? 'Yerleşimi Düzenle' : 'Yeni Reklam Yerleşimi'}
                </h2>
                <button onClick={() => setShowForm(false)} className={`p-1.5 rounded-lg ${subText} hover:opacity-70`}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className={`block text-xs mb-1 ${subText}`}>Yerleşim Adı *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ana Sayfa Banner" className={inputCls} />
                </div>

                {!editId && (
                  <div className="md:col-span-2">
                    <label className={`block text-xs mb-1 ${subText}`}>Yerleşim Anahtarı</label>
                    <input value={form.placementKey} onChange={(e) => setForm({ ...form, placementKey: e.target.value })}
                      placeholder="home_banner (boş bırakılırsa isimden üretilir)" className={inputCls} />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className={`block text-xs mb-1 ${subText}`}>Açıklama</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2} className={inputCls} />
                </div>

                <div>
                  <label className={`block text-xs mb-1 ${subText}`}>Reklam Tipi</label>
                  <select value={form.adType} onChange={(e) => setForm({ ...form, adType: e.target.value })} className={inputCls}>
                    {AD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs mb-1 ${subText}`}>Konum</label>
                  <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inputCls}>
                    {AD_POSITIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs mb-1 ${subText}`}>Platform</label>
                  <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className={inputCls}>
                    {AD_PLATFORMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs mb-1 ${subText}`}>Reklam Ağı</label>
                  <select value={form.adNetworkId} onChange={(e) => setForm({ ...form, adNetworkId: e.target.value })} className={inputCls}>
                    <option value="">Atanmadı (özel kod kullan)</option>
                    {networks.map((n: any) => (
                      <option key={n.id} value={n.id}>{n.name}{n.isActive ? '' : ' (pasif)'}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs mb-1 ${subText}`}>Sıra</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className={inputCls} />
                </div>

                <div>
                  <label className={`block text-xs mb-1 ${subText}`}>Günlük Gösterim Limiti (0 = sınırsız)</label>
                  <input type="number" min={0} value={form.frequencyCap}
                    onChange={(e) => setForm({ ...form, frequencyCap: e.target.value })} className={inputCls} />
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-xs mb-1 ${subText}`}>Yerleşime Özel Reklam Kodu</label>
                  <textarea value={form.customCode} onChange={(e) => setForm({ ...form, customCode: e.target.value })}
                    rows={3} placeholder="Boş bırakılırsa seçili reklam ağının kodu kullanılır"
                    className={`${inputCls} font-mono text-xs`} />
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-xs mb-2 ${subText}`}>Bu üyeliklere reklam gösterme</label>
                  <div className="flex flex-wrap gap-2">
                    {MEMBERSHIP_TIERS.map(tier => {
                      const on = (form.hideForMembership || []).includes(tier)
                      return (
                        <button key={tier} type="button" onClick={() => toggleTier(tier)}
                          className={`px-3 py-1 rounded-full text-xs border ${on
                            ? 'bg-purple-600 text-white border-purple-500'
                            : isDark ? 'bg-[#120722] text-purple-200 border-purple-800/50' : 'bg-white text-gray-600 border-gray-300'}`}>
                          {tier}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-2">
                  <input id="placement-active" type="checkbox" checked={!!form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
                  <label htmlFor="placement-active" className={`text-sm ${textColor}`}>Yerleşim aktif</label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setShowForm(false)}
                  className={`px-4 py-2 rounded-lg text-sm border ${isDark ? 'border-purple-800/50 text-purple-200' : 'border-gray-300 text-gray-600'}`}>
                  İptal
                </button>
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Kaydet
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
