'use client'

/**
 * BÖLÜM 20 — Üyelik Yönetimi (§2).
 * Kademeler · Yetenek matrisi · Üyelik atama/hediye · Raporlar
 * Buradaki her değişiklik APK güncellemesi olmadan web + mobilde geçerli olur.
 */
import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import AdminBackButton from '@/components/admin-back-button'
import {
  Crown, Loader2, Save, RefreshCw, Gift, BarChart3, Layers, Grid3x3,
  CheckCircle2, XCircle, AlertTriangle, Plus, Trash2, CalendarDays,
} from 'lucide-react'

type Tier = {
  key: string; name: string; nameEn: string; rank: number; color: string
  gradient: string | null; icon: string; description: string | null
  discoveryWeight: number; isActive: boolean; sortOrder: number; userCount?: number
}
type Feature = {
  key: string; name: string; nameEn: string; category: string
  description: string | null; valueType: string; unit: string | null
  isActive: boolean; sortOrder: number
}
type Row = {
  tierKey: string; featureKey: string; enabled: boolean
  limitValue: number | null; dailyLimit: number | null; monthlyLimit: number | null
  durationDays: number | null; priority: number; assetRef: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  profile: 'Profil & Kozmetik',
  entrance: 'Giriş / Çıkış Efektleri',
  message: 'Mesaj Sistemi',
  privacy: 'Gizlilik',
  discovery: 'Görünürlük & Keşfet',
  room: 'Oda Erişimi',
  event: 'Etkinlikler',
  support: 'Destek',
  progression: 'Başarım & Sezon',
  general: 'Genel',
}

function cellKey(t: string, f: string) { return `${t}|${f}` }

export default function AdminMembershipFeaturesPage() {
  const { data: session, status } = useSession() || {}
  const [tab, setTab] = useState<'tiers' | 'matrix' | 'grants' | 'reports' | 'events'>('matrix')
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const [tiers, setTiers] = useState<Tier[]>([])
  const [features, setFeatures] = useState<Feature[]>([])
  const [rows, setRows] = useState<Record<string, Row>>({})
  const [dirty, setDirty] = useState<Record<string, Row>>({})
  const [category, setCategory] = useState<string>('all')
  const [tierDraft, setTierDraft] = useState<Record<string, Partial<Tier>>>({})

  const [grantForm, setGrantForm] = useState({ userId: '', tierKey: 'gold', durationDays: '30', source: 'admin', giverId: '', note: '' })
  const [grants, setGrants] = useState<any[]>([])
  const [report, setReport] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [eventForm, setEventForm] = useState({
    title: '', description: '', minTierKey: '', allowedTiers: [] as string[],
    startsAt: '', endsAt: '', priority: '0', ctaUrl: '',
  })

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text }); setTimeout(() => setMsg(null), 5000)
  }

  const loadMatrix = useCallback(async () => {
    const res = await fetch('/api/admin/membership-features', { cache: 'no-store' })
    if (res.status === 401 || res.status === 403) { setForbidden(true); return }
    const json = await res.json()
    if (json?.success) {
      setTiers(json.data.tiers || [])
      setFeatures(json.data.features || [])
      const map: Record<string, Row> = {}
      for (const r of json.data.rows || []) map[cellKey(r.tierKey, r.featureKey)] = r
      setRows(map)
      setDirty({})
    }
  }, [])

  const loadTiers = useCallback(async () => {
    const res = await fetch('/api/admin/membership-tiers', { cache: 'no-store' })
    if (res.status === 401 || res.status === 403) { setForbidden(true); return }
    const json = await res.json()
    if (json?.success) setTiers(json.data.tiers || [])
  }, [])

  const loadGrants = useCallback(async () => {
    const res = await fetch('/api/admin/membership-grants?limit=50', { cache: 'no-store' })
    if (!res.ok) return
    const json = await res.json()
    if (json?.success) setGrants(json.data.grants || [])
  }, [])

  const loadEvents = useCallback(async () => {
    const res = await fetch('/api/admin/membership-events', { cache: 'no-store' })
    if (!res.ok) return
    const json = await res.json()
    if (json?.success) setEvents(json.data.events || [])
  }, [])

  const loadReport = useCallback(async () => {
    const res = await fetch('/api/admin/membership-reports', { cache: 'no-store' })
    if (!res.ok) return
    const json = await res.json()
    if (json?.success) setReport(json.data)
  }, [])

  const createEvent = async () => {
    if (!eventForm.title.trim()) { flash('err', 'Başlık gerekli'); return }
    setBusy('event')
    try {
      const res = await fetch('/api/admin/membership-events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description || null,
          ctaUrl: eventForm.ctaUrl || null,
          startsAt: eventForm.startsAt || new Date().toISOString(),
          endsAt: eventForm.endsAt || new Date(Date.now() + 7 * 86400000).toISOString(),
          minTierKey: eventForm.minTierKey || null,
          allowedTiers: eventForm.allowedTiers,
          priority: Number(eventForm.priority) || 0,
        }),
      })
      const json = await res.json()
      if (json?.success) {
        flash('ok', 'Etkinlik oluşturuldu')
        setEventForm({ title: '', description: '', minTierKey: '', allowedTiers: [], startsAt: '', endsAt: '', priority: '0', ctaUrl: '' })
        await loadEvents()
      } else flash('err', json?.error?.message || 'Etkinlik oluşturulamadı')
    } catch { flash('err', 'Etkinlik oluşturulamadı') }
    finally { setBusy(null) }
  }

  const toggleEvent = async (ev: any) => {
    try {
      const res = await fetch('/api/admin/membership-events', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ev.id, isActive: !ev.isActive }),
      })
      const json = await res.json()
      if (json?.success) await loadEvents()
      else flash('err', 'Güncellenemedi')
    } catch { flash('err', 'Güncellenemedi') }
  }

  const removeEvent = async (id: string) => {
    if (!confirm('Bu etkinlik silinsin mi?')) return
    try {
      const res = await fetch(`/api/admin/membership-events?id=${encodeURIComponent(id)}&confirm=DELETE`, { method: 'DELETE' })
      const json = await res.json()
      if (json?.success) { flash('ok', 'Etkinlik silindi'); await loadEvents() }
      else flash('err', 'Silinemedi')
    } catch { flash('err', 'Silinemedi') }
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    try { await Promise.all([loadMatrix(), loadTiers(), loadGrants(), loadReport(), loadEvents()]) }
    catch { flash('err', 'Veriler yüklenemedi') }
    finally { setLoading(false) }
  }, [loadMatrix, loadTiers, loadGrants, loadReport, loadEvents])

  useEffect(() => { if (status !== 'loading') loadAll() }, [status, loadAll])

  const getCell = (t: string, f: string): Row => {
    const k = cellKey(t, f)
    return dirty[k] || rows[k] || {
      tierKey: t, featureKey: f, enabled: false, limitValue: null, dailyLimit: null,
      monthlyLimit: null, durationDays: null, priority: 0, assetRef: null,
    }
  }

  const patchCell = (t: string, f: string, patch: Partial<Row>) => {
    const k = cellKey(t, f)
    const base = getCell(t, f)
    setDirty((d) => ({ ...d, [k]: { ...base, ...patch } }))
  }

  const saveMatrix = async () => {
    const cells = Object.values(dirty)
    if (!cells.length) { flash('err', 'Kaydedilecek değişiklik yok'); return }
    setBusy('matrix')
    try {
      const res = await fetch('/api/admin/membership-features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cells }),
      })
      const json = await res.json()
      if (json?.success) { flash('ok', `${cells.length} hücre kaydedildi — web ve mobilde anında geçerli`); await loadMatrix() }
      else flash('err', json?.error?.message || 'Kaydedilemedi')
    } finally { setBusy(null) }
  }

  const saveTier = async (key: string) => {
    const patch = tierDraft[key]
    if (!patch || !Object.keys(patch).length) return
    setBusy(`tier:${key}`)
    try {
      const res = await fetch('/api/admin/membership-tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...patch }),
      })
      const json = await res.json()
      if (json?.success) { flash('ok', `${key.toUpperCase()} kademesi güncellendi`); setTierDraft((d) => ({ ...d, [key]: {} })); await loadTiers() }
      else flash('err', json?.error?.message || 'Kaydedilemedi')
    } finally { setBusy(null) }
  }

  const submitGrant = async () => {
    if (!grantForm.userId.trim()) { flash('err', 'Kullanıcı ID zorunlu'); return }
    setBusy('grant')
    try {
      const res = await fetch('/api/admin/membership-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: grantForm.userId.trim(),
          tierKey: grantForm.tierKey,
          durationDays: parseInt(grantForm.durationDays, 10) || null,
          source: grantForm.source,
          giverId: grantForm.giverId.trim() || undefined,
          note: grantForm.note.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (json?.success) { flash('ok', 'Üyelik atandı'); setGrantForm((f) => ({ ...f, userId: '', note: '' })); await Promise.all([loadGrants(), loadReport()]) }
      else flash('err', json?.error?.message || 'Atanamadı')
    } finally { setBusy(null) }
  }

  const runExpirySweep = async () => {
    setBusy('sweep')
    try {
      const res = await fetch('/api/cron/membership-expiry', { method: 'POST' })
      const json = await res.json()
      if (json?.success) { flash('ok', `${json.data.processed} üyelik Basic'e düşürüldü (kozmetik veriler korundu)`); await loadReport() }
      else flash('err', json?.error?.message || 'Çalıştırılamadı')
    } finally { setBusy(null) }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (forbidden || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6 text-center">
        <p className="text-red-400">Bu sayfa yalnızca süper admin yetkisine açıktır.</p>
      </div>
    )
  }

  const categories = Array.from(new Set(features.map((f) => f.category)))
  const shownFeatures = category === 'all' ? features : features.filter((f) => f.category === category)
  const dirtyCount = Object.keys(dirty).length

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-24">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AdminBackButton />

        <div className="flex items-center gap-3 mt-4 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/30">
            <Crown className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Üyelik Yönetimi</h1>
            <p className="text-sm text-gray-400">Kademeler, yetenekler ve limitler — değişiklikler uygulama güncellemesi gerektirmez.</p>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-lg border text-sm flex items-center gap-2 ${
            msg.kind === 'ok' ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {msg.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {([
            ['matrix', 'Yetenek Matrisi', Grid3x3],
            ['tiers', 'Kademeler', Layers],
            ['grants', 'Üyelik Atama', Gift],
            ['events', 'Etkinlikler', CalendarDays],
            ['reports', 'Raporlar', BarChart3],
          ] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-2 border transition ${
                tab === k ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <button onClick={loadAll} className="px-3 py-2 rounded-lg text-sm bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200 ml-auto">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* ───────────── Yetenek matrisi ───────────── */}
        {tab === 'matrix' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm">
                <option value="all">Tüm kategoriler ({features.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABEL[c] || c}</option>
                ))}
              </select>
              <button onClick={saveMatrix} disabled={!dirtyCount || busy === 'matrix'}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                {busy === 'matrix' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Kaydet{dirtyCount ? ` (${dirtyCount})` : ''}
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-gray-900/80 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-3 font-medium text-gray-300">Özellik</th>
                    {tiers.map((t) => (
                      <th key={t.key} className="px-3 py-3 text-center font-medium" style={{ color: t.color }}>
                        <div>{t.icon} {t.name}</div>
                        <div className="text-[10px] text-gray-500 font-normal">r{t.rank}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shownFeatures.map((f, i) => (
                    <tr key={f.key} className={i % 2 ? 'bg-gray-900/30' : ''}>
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-medium text-gray-200">{f.name}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{f.key}</div>
                        <div className="text-[11px] text-gray-600">{CATEGORY_LABEL[f.category] || f.category} · {f.valueType}{f.unit ? ` (${f.unit})` : ''}</div>
                      </td>
                      {tiers.map((t) => {
                        const c = getCell(t.key, f.key)
                        const isDirty = !!dirty[cellKey(t.key, f.key)]
                        return (
                          <td key={t.key} className={`px-2 py-2.5 text-center align-top ${isDirty ? 'bg-purple-500/10' : ''}`}>
                            <button onClick={() => patchCell(t.key, f.key, { enabled: !c.enabled })}
                              className={`w-7 h-7 rounded-md border flex items-center justify-center mx-auto ${
                                c.enabled ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-gray-800 border-gray-700 text-gray-600'
                              }`} title={c.enabled ? 'Açık' : 'Kapalı'}>
                              {c.enabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </button>
                            {c.enabled && f.valueType === 'number' && (
                              <div className="mt-1.5 space-y-1">
                                <input type="number" value={c.limitValue ?? ''} placeholder="limit"
                                  onChange={(e) => patchCell(t.key, f.key, { limitValue: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
                                  className="w-16 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-[11px] text-center" />
                                <input type="number" value={c.dailyLimit ?? ''} placeholder="günlük"
                                  onChange={(e) => patchCell(t.key, f.key, { dailyLimit: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
                                  className="w-16 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-[11px] text-center" />
                              </div>
                            )}
                            {c.enabled && (f.valueType === 'asset' || f.valueType === 'string') && (
                              <input value={c.assetRef ?? ''} placeholder="görsel/efekt"
                                onChange={(e) => patchCell(t.key, f.key, { assetRef: e.target.value || null })}
                                className="mt-1.5 w-20 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-[11px] text-center" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">
              Bir kademede açık olmayan yetenek, üst kademelerde açıksa kalıtımla devreye girer.
              Boş limit = sınırsız. Kayıttan sonra önbellek otomatik temizlenir.
            </p>
          </div>
        )}

        {/* ───────────── Kademeler ───────────── */}
        {tab === 'tiers' && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tiers.map((t) => {
              const d = tierDraft[t.key] || {}
              const val = <K extends keyof Tier>(k: K): any => (d[k] !== undefined ? d[k] : t[k])
              const set = (k: keyof Tier, v: any) => setTierDraft((s) => ({ ...s, [t.key]: { ...(s[t.key] || {}), [k]: v } }))
              return (
                <div key={t.key} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{t.icon}</span>
                      <div>
                        <div className="font-semibold" style={{ color: t.color }}>{t.name}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{t.key} · r{t.rank}</div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300">{t.userCount ?? 0} üye</span>
                  </div>

                  <label className="block text-xs text-gray-400">Görünen ad
                    <input value={val('name')} onChange={(e) => set('name', e.target.value)}
                      className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100" />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs text-gray-400">Renk
                      <input value={val('color')} onChange={(e) => set('color', e.target.value)}
                        className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100" />
                    </label>
                    <label className="block text-xs text-gray-400">Simge
                      <input value={val('icon')} onChange={(e) => set('icon', e.target.value)}
                        className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100" />
                    </label>
                  </div>

                  <label className="block text-xs text-gray-400">Keşfet ağırlığı (1.0 = nötr)
                    <input type="number" step="0.05" min="0.1" max="5" value={val('discoveryWeight')}
                      onChange={(e) => set('discoveryWeight', parseFloat(e.target.value))}
                      className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100" />
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <input type="checkbox" checked={!!val('isActive')} onChange={(e) => set('isActive', e.target.checked)} />
                    Aktif
                  </label>

                  <button onClick={() => saveTier(t.key)} disabled={!Object.keys(d).length || busy === `tier:${t.key}`}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-40 flex items-center justify-center gap-2">
                    {busy === `tier:${t.key}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ───────────── Üyelik atama ───────────── */}
        {tab === 'grants' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Üyelik ata / hediye et</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-xs text-gray-400">Kullanıcı ID
                  <input value={grantForm.userId} onChange={(e) => setGrantForm((f) => ({ ...f, userId: e.target.value }))}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm" />
                </label>
                <label className="block text-xs text-gray-400">Kademe
                  <select value={grantForm.tierKey} onChange={(e) => setGrantForm((f) => ({ ...f, tierKey: e.target.value }))}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm">
                    {tiers.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
                  </select>
                </label>
                <label className="block text-xs text-gray-400">Süre (gün)
                  <input type="number" value={grantForm.durationDays} onChange={(e) => setGrantForm((f) => ({ ...f, durationDays: e.target.value }))}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm" />
                </label>
                <label className="block text-xs text-gray-400">Kaynak
                  <select value={grantForm.source} onChange={(e) => setGrantForm((f) => ({ ...f, source: e.target.value }))}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm">
                    <option value="admin">Yönetici ataması</option>
                    <option value="gift">Hediye</option>
                    <option value="purchase">Satın alma</option>
                    <option value="renewal">Yenileme</option>
                  </select>
                </label>
                {grantForm.source === 'gift' && (
                  <label className="block text-xs text-gray-400">Hediye eden ID
                    <input value={grantForm.giverId} onChange={(e) => setGrantForm((f) => ({ ...f, giverId: e.target.value }))}
                      className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm" />
                  </label>
                )}
                <label className="block text-xs text-gray-400">Not
                  <input value={grantForm.note} onChange={(e) => setGrantForm((f) => ({ ...f, note: e.target.value }))}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm" />
                </label>
              </div>
              <button onClick={submitGrant} disabled={busy === 'grant'}
                className="px-4 py-2 rounded-lg text-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-40 flex items-center gap-2">
                {busy === 'grant' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />} Uygula
              </button>
              <p className="text-[11px] text-gray-500">Aynı kademe yenilemesinde kalan süreye eklenir. Jeton/CFC bakiyelerine dokunulmaz.</p>
            </div>

            <div className="rounded-xl border border-gray-800 overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-900/80">
                  <tr>
                    <th className="text-left px-3 py-2">Kullanıcı</th>
                    <th className="text-left px-3 py-2">Kademe</th>
                    <th className="text-left px-3 py-2">Önceki</th>
                    <th className="text-left px-3 py-2">Kaynak</th>
                    <th className="text-left px-3 py-2">Bitiş</th>
                    <th className="text-left px-3 py-2">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {grants.map((g) => (
                    <tr key={g.id} className="border-t border-gray-800/70">
                      <td className="px-3 py-2">{g.receiver?.name || g.receiverId}</td>
                      <td className="px-3 py-2 font-medium">{g.tierKey}</td>
                      <td className="px-3 py-2 text-gray-500">{g.previousTier || '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{g.source}</td>
                      <td className="px-3 py-2 text-gray-400">{g.expiresAt ? new Date(g.expiresAt).toLocaleDateString('tr-TR') : 'süresiz'}</td>
                      <td className="px-3 py-2">{g.status}</td>
                    </tr>
                  ))}
                  {!grants.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Kayıt yok</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ───────────── Kademeye özel etkinlikler (§17) ───────────── */}
        {tab === 'events' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Yeni etkinlik</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Etkinlik başlığı" className="px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm" />
                <input value={eventForm.ctaUrl} onChange={(e) => setEventForm({ ...eventForm, ctaUrl: e.target.value })}
                  placeholder="Yönlendirme bağlantısı (opsiyonel)" className="px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm" />
                <input type="datetime-local" value={eventForm.startsAt} onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm" />
                <input type="datetime-local" value={eventForm.endsAt} onChange={(e) => setEventForm({ ...eventForm, endsAt: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm" />
                <select value={eventForm.minTierKey} onChange={(e) => setEventForm({ ...eventForm, minTierKey: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm">
                  <option value="">Herkese açık</option>
                  {tiers.map((t) => <option key={t.key} value={t.key}>{t.name} ve üstü</option>)}
                </select>
                <input value={eventForm.priority} onChange={(e) => setEventForm({ ...eventForm, priority: e.target.value })}
                  placeholder="Öncelik (0)" className="px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm" />
                <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Açıklama" rows={2} className="px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm sm:col-span-2" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400">Yalnızca seçili kademeler (boş bırakılırsa üstteki kural geçerli):</span>
                {tiers.map((t) => {
                  const on = eventForm.allowedTiers.includes(t.key)
                  return (
                    <button key={t.key} type="button"
                      onClick={() => setEventForm({
                        ...eventForm,
                        allowedTiers: on ? eventForm.allowedTiers.filter((x) => x !== t.key) : [...eventForm.allowedTiers, t.key],
                      })}
                      className={`px-2.5 py-1 rounded-full text-xs border ${on ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' : 'bg-gray-950 border-gray-800 text-gray-400'}`}>
                      {t.name}
                    </button>
                  )
                })}
              </div>
              <button onClick={createEvent} disabled={busy === 'event'}
                className="mt-3 px-4 py-2 rounded-lg text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-40 flex items-center gap-2">
                {busy === 'event' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Etkinlik oluştur
              </button>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <h3 className="font-semibold mb-3">Etkinlikler ({events.length})</h3>
              {events.length === 0 ? (
                <p className="text-sm text-gray-500">Henüz etkinlik yok.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((ev) => (
                    <div key={ev.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-950/60 border border-gray-800 px-3 py-2">
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-sm font-medium">{ev.title}</div>
                        <div className="text-[11px] text-gray-500">
                          {new Date(ev.startsAt).toLocaleString('tr-TR')} → {new Date(ev.endsAt).toLocaleString('tr-TR')}
                          {ev.minTierKey ? ` · min: ${ev.minTierKey}` : ''}
                          {ev.allowedTiers?.length ? ` · ${ev.allowedTiers.join(', ')}` : ''}
                        </div>
                      </div>
                      <button onClick={() => toggleEvent(ev)}
                        className={`px-2.5 py-1 rounded-full text-xs border ${ev.isActive ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                        {ev.isActive ? 'Aktif' : 'Pasif'}
                      </button>
                      <button onClick={() => removeEvent(ev.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ───────────── Raporlar ───────────── */}
        {tab === 'reports' && report && (
          <div className="space-y-5">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
              {[
                ['Aktif VIP', report.summary.activeVip],
                ['Süresi dolmuş (bekleyen)', report.summary.expiredPending],
                ['Son 24s işlem', report.summary.grantsLast24h],
                ['Son 30g işlem', report.summary.grantsLast30d],
                ['Profil ziyareti', report.summary.profileVisitsTotal],
              ].map(([label, v]) => (
                <div key={String(label)} className="rounded-xl border border-gray-800 bg-gray-900/50 p-3">
                  <div className="text-xs text-gray-400">{label}</div>
                  <div className="text-2xl font-bold mt-1">{String(v)}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <h3 className="font-semibold mb-3">Kademe dağılımı</h3>
              <div className="space-y-2">
                {report.distribution.map((d: any) => (
                  <div key={d.tierKey} className="flex items-center gap-3">
                    <span className="w-24 text-sm" style={{ color: d.color }}>{d.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, (d.userCount / Math.max(1, report.distribution.reduce((s: number, x: any) => s + x.userCount, 0))) * 100)}%`,
                        backgroundColor: d.color,
                      }} />
                    </div>
                    <span className="w-16 text-right text-sm text-gray-300">{d.userCount}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="font-semibold mb-3">Yaşam döngüsü (30 gün)</h3>
                <ul className="text-sm space-y-1.5 text-gray-300">
                  <li>Yükseltme: <b>{report.lifecycle.upgrades}</b> (%{report.lifecycle.upgradeRate})</li>
                  <li>Düşürme: <b>{report.lifecycle.downgrades}</b> (%{report.lifecycle.downgradeRate})</li>
                  <li>Yenileme / elde tutma: <b>{report.lifecycle.renewals}</b> (%{report.lifecycle.retentionRate})</li>
                  <li>Hediye üyelik: <b>{report.lifecycle.gifts}</b></li>
                  <li>Yeni VIP: <b>{report.lifecycle.newVip}</b></li>
                  <li>En çok geçilen kademe: <b>{report.lifecycle.mostUpgradedTier?.tierKey || '—'}</b></li>
                </ul>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="font-semibold mb-3">Süresi yaklaşanlar</h3>
                <ul className="text-sm space-y-1.5 text-gray-300">
                  <li>3 gün içinde: <b>{report.expiring.in3Days}</b></li>
                  <li>7 gün içinde: <b>{report.expiring.in7Days}</b></li>
                  <li>30 gün içinde: <b>{report.expiring.in30Days}</b></li>
                </ul>
                <button onClick={runExpirySweep} disabled={busy === 'sweep'}
                  className="mt-3 px-3 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-40 flex items-center gap-2">
                  {busy === 'sweep' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Süre bitiş taramasını çalıştır
                </button>
              </div>
            </div>

            {/* §24 Günlük VIP raporu (30 gün) */}
            {!!report.daily?.length && (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="font-semibold mb-3">Günlük VIP hareketi (30 gün)</h3>
                <div className="flex items-end gap-1 h-28">
                  {report.daily.map((d: any) => {
                    const max = Math.max(1, ...report.daily.map((x: any) => x.total))
                    return (
                      <div key={d.date} className="flex-1 flex flex-col justify-end items-center group relative" title={`${d.date}: ${d.total} işlem, ${d.upgrades} yükseltme, ${d.gifts} hediye`}>
                        <div className="w-full rounded-t bg-purple-500/70" style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total ? 3 : 1 }} />
                      </div>
                    )
                  })}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-gray-500">
                  <span>{report.daily[0]?.date}</span>
                  <span>{report.daily[report.daily.length - 1]?.date}</span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Toplam: <b>{report.daily.reduce((s: number, d: any) => s + d.total, 0)}</b> · Yükseltme:{' '}
                  <b>{report.daily.reduce((s: number, d: any) => s + d.upgrades, 0)}</b> · Hediye:{' '}
                  <b>{report.daily.reduce((s: number, d: any) => s + d.gifts, 0)}</b>
                </div>
              </div>
            )}

            {/* §24 Aylık VIP raporu (12 ay) */}
            {!!report.monthly?.length && (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 overflow-x-auto">
                <h3 className="font-semibold mb-3">Aylık VIP raporu (12 ay)</h3>
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 text-xs">
                      <th className="py-1.5">Ay</th>
                      <th className="py-1.5 text-right">İşlem</th>
                      <th className="py-1.5 text-right">Yükseltme</th>
                      <th className="py-1.5 text-right">Düşürme</th>
                      <th className="py-1.5 text-right">Hediye</th>
                      <th className="py-1.5 text-right">Tekil kullanıcı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.monthly.map((m: any) => (
                      <tr key={m.month} className="border-t border-gray-800">
                        <td className="py-1.5">{m.month}</td>
                        <td className="py-1.5 text-right">{m.total}</td>
                        <td className="py-1.5 text-right text-emerald-300">{m.upgrades}</td>
                        <td className="py-1.5 text-right text-red-300">{m.downgrades}</td>
                        <td className="py-1.5 text-right text-pink-300">{m.gifts}</td>
                        <td className="py-1.5 text-right text-gray-300">{m.uniqueUsers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* §18/§19 VIP sezon puanı */}
            {report.vipXp && (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="font-semibold mb-3">VIP sezon puanı</h3>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 mb-3">
                  <div className="rounded-lg bg-gray-800/60 px-3 py-2">
                    <div className="text-[11px] text-gray-400">Toplam XP</div>
                    <div className="font-semibold">{Number(report.vipXp.totalXp || 0).toLocaleString('tr-TR')}</div>
                  </div>
                  <div className="rounded-lg bg-gray-800/60 px-3 py-2">
                    <div className="text-[11px] text-gray-400">XP kazanan kullanıcı</div>
                    <div className="font-semibold">{report.vipXp.usersWithXp || 0}</div>
                  </div>
                </div>
                {!!report.vipXp.top?.length && (
                  <ol className="space-y-1.5 text-sm">
                    {report.vipXp.top.map((u: any, i: number) => (
                      <li key={u.id} className="flex items-center gap-3">
                        <span className="w-5 text-center text-xs text-gray-400">{i + 1}</span>
                        <span className="flex-1 truncate">{u.name}</span>
                        <span className="text-[11px] text-gray-500">{u.membership}</span>
                        <span className="text-cyan-300 font-semibold">{Number(u.vipXp).toLocaleString('tr-TR')}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <h3 className="font-semibold mb-3">VIP özellik kullanımı</h3>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 text-sm">
                {Object.entries(report.featureUsage).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-gray-800/60 px-3 py-2">
                    <div className="text-[11px] text-gray-400">{k}</div>
                    <div className="font-semibold">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
