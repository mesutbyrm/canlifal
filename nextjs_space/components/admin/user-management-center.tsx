'use client'

/**
 * BÖLÜM 21 / A2 — MERKEZİ KULLANICI YÖNETİM MERKEZİ (§1, §2, §40, §49, §51)
 * Tüm panelde TEK modal kullanılır. Her sekme verisini tembel (lazy) yükler.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Loader2, RefreshCw, ShieldAlert, Snowflake, EyeOff, Eye, AlertTriangle, Ban, Check } from 'lucide-react'

export type Section =
  | 'general' | 'activity' | 'rooms' | 'live' | 'fortune' | 'jeton' | 'cfc' | 'gifts'
  | 'earnings' | 'spending' | 'agency' | 'vip' | 'moderation' | 'permissions'
  | 'timeline' | 'media' | 'reports'

const TABS: { key: Section; label: string; perm?: string }[] = [
  { key: 'general', label: 'GENEL' },
  { key: 'activity', label: 'AKTİVİTE' },
  { key: 'rooms', label: 'ODA' },
  { key: 'live', label: 'CANLI YAYIN' },
  { key: 'fortune', label: 'FALCI' },
  { key: 'jeton', label: 'JETON', perm: 'user360.finance.view' },
  { key: 'cfc', label: 'CFC', perm: 'user360.finance.view' },
  { key: 'gifts', label: 'HEDİYELER' },
  { key: 'earnings', label: 'KAZANÇ', perm: 'user360.finance.view' },
  { key: 'spending', label: 'HARCAMA', perm: 'user360.finance.view' },
  { key: 'agency', label: 'AJANS' },
  { key: 'vip', label: 'VIP' },
  { key: 'moderation', label: 'MODERASYON' },
  { key: 'permissions', label: 'YETKİLER' },
  { key: 'timeline', label: 'GEÇMİŞ' },
  { key: 'media', label: 'MEDYA' },
  { key: 'reports', label: 'RAPORLAR' },
]

type Caps = { role: string; is_super_admin: boolean; permissions: string[] }

function fmt(v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Evet' : 'Hayır'
  if (typeof v === 'number') return v.toLocaleString('tr-TR')
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    try { return new Date(v).toLocaleString('tr-TR', { timeZone: 'UTC' }) } catch { return v }
  }
  return String(v)
}

function KV({ data }: { data: Record<string, any> }) {
  const entries = Object.entries(data || {}).filter(([, v]) => typeof v !== 'object' || v === null)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 rounded-lg bg-gray-950/70 px-3 py-2 text-sm">
          <span className="text-gray-400">{k}</span>
          <span className="text-gray-100 text-right break-all">{fmt(v)}</span>
        </div>
      ))}
      {entries.length === 0 && <p className="text-sm text-gray-500">Kayıt yok.</p>}
    </div>
  )
}

function DataTable({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-gray-500">Kayıt yok.</p>
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {})))).filter(
    (c) => rows.every((r) => typeof r?.[c] !== 'object' || r?.[c] === null)
  )
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-950">
          <tr>{cols.map((c) => <th key={c} className="px-3 py-2 text-left font-medium text-gray-400 whitespace-nowrap">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r?.id || i} className="border-t border-gray-800/70">
              {cols.map((c) => <td key={c} className="px-3 py-2 text-gray-200 whitespace-nowrap">{fmt(r?.[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionBody({ payload }: { payload: any }) {
  if (!payload) return <p className="text-sm text-gray-500">Veri yok.</p>
  return (
    <div className="space-y-4">
      {payload.summary && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">Özet</h4>
          <KV data={payload.summary} />
        </div>
      )}
      {Object.entries(payload).map(([k, v]) => {
        if (k === 'summary') return null
        if (Array.isArray(v)) {
          return (
            <div key={k}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">{k}</h4>
              <DataTable rows={v as any[]} />
            </div>
          )
        }
        if (v && typeof v === 'object') {
          return (
            <div key={k}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">{k}</h4>
              <KV data={v as any} />
            </div>
          )
        }
        return null
      })}
      {(() => {
        const flat = Object.fromEntries(Object.entries(payload).filter(([k, v]) => k !== 'summary' && (v === null || typeof v !== 'object')))
        return Object.keys(flat).length ? <KV data={flat} /> : null
      })()}
    </div>
  )
}

export default function UserManagementCenter({
  userId, onClose, initialSection = 'general',
}: { userId: string; onClose: () => void; initialSection?: Section }) {
  const [caps, setCaps] = useState<Caps | null>(null)
  const [tab, setTab] = useState<Section>(initialSection)
  const [cache, setCache] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState('30d')
  const [busy, setBusy] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const can = useCallback(
    (key: string) => !!caps && (caps.is_super_admin || (caps.permissions || []).includes(key)),
    [caps]
  )

  useEffect(() => {
    fetch('/api/me/admin-capabilities')
      .then((r) => r.json())
      .then((j) => setCaps(j?.data || j))
      .catch(() => setCaps(null))
  }, [])

  const load = useCallback(async (section: Section, force = false) => {
    const key = `${section}:${range}`
    if (!force && cache[key]) return
    setLoading(true); setError(null)
    try {
      const r = await fetch(`/api/admin/users/${userId}/360?section=${section}&range=${range}&limit=25`)
      const j = await r.json()
      if (!r.ok || j?.success === false) throw new Error(j?.error?.message || 'Veri alınamadı')
      setCache((c) => ({ ...c, [key]: j?.data ?? j }))
    } catch (e: any) {
      setError(e?.message || 'Veri alınamadı')
    } finally {
      setLoading(false)
    }
  }, [userId, range, cache])

  useEffect(() => { load(tab) }, [tab, range, load])

  const visibleTabs = useMemo(() => TABS.filter((t) => !t.perm || can(t.perm)), [can])

  const payload = cache[`${tab}:${range}`]
  const general = cache[`general:${range}`]
  const header = general?.user || general?.profile || null

  const act = async (action: string, extra: any = {}) => {
    const reason = window.prompt(`"${action}" işlemi için sebep giriniz:`) || ''
    if (!reason.trim()) return
    setBusy(action)
    try {
      const r = await fetch(`/api/admin/users/${userId}/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, confirm: true, ...extra }),
      })
      const j = await r.json()
      setFlash(j?.message || j?.error?.message || (r.ok ? 'İşlem tamamlandı' : 'İşlem başarısız'))
      setCache({})
      load(tab, true)
    } catch (e: any) {
      setFlash(e?.message || 'İşlem başarısız')
    } finally {
      setBusy(null)
      setTimeout(() => setFlash(null), 6000)
    }
  }

  const canAct = can('user360.action.execute')

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-2 sm:p-6" onClick={onClose}>
      <div
        className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-800 bg-gray-950 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-400">Kullanıcı Yönetim Merkezi</p>
            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-gray-400">
              {header?.name || header?.email || userId}
              {header?.role ? ` · ${header.role}` : ''}
              {header?.membership ? ` · ${header.membership}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200"
            >
              <option value="today">Bugün</option>
              <option value="7d">7 gün</option>
              <option value="30d">30 gün</option>
              <option value="90d">90 gün</option>
              <option value="all">Tümü</option>
            </select>
            <button onClick={() => load(tab, true)} className="rounded-lg border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800" title="Yenile">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="rounded-lg border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800" title="Kapat">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {canAct && (
          <div className="flex flex-wrap gap-2 border-b border-gray-800 bg-gray-950/60 px-4 py-2">
            {can('moderation.user.freeze') && (
              <>
                <button disabled={!!busy} onClick={() => act('freeze')} className="flex items-center gap-1 rounded-lg border border-sky-700 px-2.5 py-1 text-xs text-sky-300 hover:bg-sky-900/30 disabled:opacity-50">
                  <Snowflake className="h-3.5 w-3.5" /> Dondur
                </button>
                <button disabled={!!busy} onClick={() => act('unfreeze')} className="flex items-center gap-1 rounded-lg border border-emerald-700 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-900/30 disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" /> Çöz
                </button>
              </>
            )}
            {can('moderation.user.mute') && (
              <button disabled={!!busy} onClick={() => act('warn', { severity: 'warning' })} className="flex items-center gap-1 rounded-lg border border-amber-700 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-900/30 disabled:opacity-50">
                <AlertTriangle className="h-3.5 w-3.5" /> Uyar
              </button>
            )}
            {can('social.discovery.manage') && (
              <>
                <button disabled={!!busy} onClick={() => act('discovery_hide')} className="flex items-center gap-1 rounded-lg border border-gray-700 px-2.5 py-1 text-xs text-gray-300 hover:bg-gray-800 disabled:opacity-50">
                  <EyeOff className="h-3.5 w-3.5" /> Keşfetten Gizle
                </button>
                <button disabled={!!busy} onClick={() => act('discovery_show')} className="flex items-center gap-1 rounded-lg border border-gray-700 px-2.5 py-1 text-xs text-gray-300 hover:bg-gray-800 disabled:opacity-50">
                  <Eye className="h-3.5 w-3.5" /> Keşfette Göster
                </button>
              </>
            )}
            {can('moderation.user.ban') && (
              <button disabled={!!busy} onClick={() => act('ban')} className="flex items-center gap-1 rounded-lg border border-red-700 px-2.5 py-1 text-xs text-red-300 hover:bg-red-900/30 disabled:opacity-50">
                <Ban className="h-3.5 w-3.5" /> Yasakla
              </button>
            )}
            {can('moderation.user.unban') && (
              <button disabled={!!busy} onClick={() => act('unban')} className="flex items-center gap-1 rounded-lg border border-emerald-700 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-900/30 disabled:opacity-50">
                <Check className="h-3.5 w-3.5" /> Yasağı Kaldır
              </button>
            )}
            {busy && <Loader2 className="h-4 w-4 animate-spin text-amber-400" />}
          </div>
        )}

        {flash && <div className="border-b border-gray-800 bg-amber-900/20 px-4 py-2 text-xs text-amber-200">{flash}</div>}

        <div className="flex gap-1 overflow-x-auto border-b border-gray-800 bg-gray-950 px-2 py-1.5">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === t.key ? 'bg-amber-500 text-black' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
            </div>
          )}
          {!loading && error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              <ShieldAlert className="mt-0.5 h-4 w-4" /> {error}
            </div>
          )}
          {!loading && !error && <SectionBody payload={payload} />}
        </div>
      </div>
    </div>
  )
}
