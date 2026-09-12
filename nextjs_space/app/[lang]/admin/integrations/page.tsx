'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import AdminBackButton from '@/components/admin-back-button'
import {
  Plug, MessageSquare, Apple, Play, Loader2, Save, Trash2, RefreshCw,
  ShieldCheck, AlertTriangle, Wallet, Send, CheckCircle2, XCircle, KeyRound
} from 'lucide-react'

type FieldInfo = {
  key: string
  label: string
  type?: string
  required?: boolean
  secret?: boolean
  envName?: string | null
  placeholder?: string | null
  help?: string | null
  source: 'db' | 'env' | 'none' | 'plain'
  masked?: string
  value?: string
  hasValue?: boolean
}

type ProviderState = {
  key: string
  displayName: string
  region: string
  implemented: boolean
  enabled: boolean
  priority: number
  configured: boolean
  missingFields: string[]
  supportsOtp: boolean
  supportsSms: boolean
  supportsBalance: boolean
  liveHealthCheck: boolean
  coverage: string
  docsUrl: string
  notes?: string
  fields: FieldInfo[]
  health: {
    status: 'healthy' | 'degraded' | 'disabled' | 'unknown'
    lastSuccessAt: string | null
    lastFailureAt: string | null
    lastTestedAt: string | null
    lastUsedAt: string | null
    lastError: string | null
    successCount: number
    failureCount: number
    fallbackUseCount: number
    avgLatencyMs: number
    cooldownUntil: string | null
    errorRate: number
  }
}

const STATUS_BADGE: Record<string, { dot: string; label: string; cls: string }> = {
  healthy: { dot: '🟢', label: 'Sağlıklı', cls: 'bg-green-500/10 text-green-400 border-green-500/30' },
  degraded: { dot: '🟡', label: 'Sorunlu', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  disabled: { dot: '🔴', label: 'Devre dışı', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
  unknown: { dot: '⚪', label: 'Bilinmiyor', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
}

const SOURCE_LABEL: Record<string, string> = {
  db: 'Panelden kayıtlı (şifreli)',
  env: 'Sunucu ortam değişkeni',
  plain: 'Panelden kayıtlı',
  none: 'Tanımsız',
}

function fmt(d: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('tr-TR') } catch { return '—' }
}

export default function AdminIntegrationsPage() {
  const { data: session, status } = useSession() || {}
  const [tab, setTab] = useState<'sms' | 'apple' | 'google'>('sms')
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [providers, setProviders] = useState<ProviderState[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [vault, setVault] = useState<string>('missing')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [testPhone, setTestPhone] = useState<Record<string, string>>({})

  const [apple, setApple] = useState<any>(null)
  const [appleDraft, setAppleDraft] = useState('')
  const [play, setPlay] = useState<any>(null)
  const [playDraft, setPlayDraft] = useState<Record<string, string>>({})

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const loadSms = useCallback(async () => {
    const res = await fetch('/api/admin/integrations/sms', { cache: 'no-store' })
    if (res.status === 401 || res.status === 403) { setForbidden(true); return }
    const json = await res.json()
    if (json?.success) {
      setProviders(json.data.providers || [])
      setSettings(json.data.settings || {})
      setVault(json.data.vault || 'missing')
    }
  }, [])

  const loadApple = useCallback(async () => {
    const res = await fetch('/api/admin/integrations/apple', { cache: 'no-store' })
    if (res.status === 401 || res.status === 403) { setForbidden(true); return }
    const json = await res.json()
    if (json?.success) setApple(json.data)
  }, [])

  const loadPlay = useCallback(async () => {
    const res = await fetch('/api/admin/integrations/google-play', { cache: 'no-store' })
    if (res.status === 401 || res.status === 403) { setForbidden(true); return }
    const json = await res.json()
    if (json?.success) {
      setPlay(json.data)
      setPlayDraft((d) => ({ ...d, store_products_map: json.data.productsMap || '{}' }))
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try { await Promise.all([loadSms(), loadApple(), loadPlay()]) }
    catch { flash('err', 'Veriler yüklenemedi') }
    finally { setLoading(false) }
  }, [loadSms, loadApple, loadPlay])

  useEffect(() => { if (status !== 'loading') loadAll() }, [status, loadAll])

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

  // ── SMS eylemleri ───────────────────────────────────────────
  const saveSetting = async (patch: Record<string, string>) => {
    setBusy('settings')
    try {
      const res = await fetch('/api/admin/integrations/sms', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (json?.success) { flash('ok', 'Ayarlar kaydedildi'); await loadSms() }
      else flash('err', json?.error?.message || 'Kaydedilemedi')
    } finally { setBusy(null) }
  }

  const patchProvider = async (key: string, patch: any) => {
    setBusy(key)
    try {
      const res = await fetch(`/api/admin/integrations/sms/${key}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (json?.success) { flash('ok', 'Güncellendi'); await loadSms() }
      else flash('err', json?.error?.message || 'Güncellenemedi')
    } finally { setBusy(null) }
  }

  const saveFields = async (p: ProviderState) => {
    const payload: Record<string, string> = {}
    for (const f of p.fields) {
      const v = drafts[`${p.key}.${f.key}`]
      if (v !== undefined && v !== '') payload[f.key] = v
    }
    if (Object.keys(payload).length === 0) { flash('err', 'Değişiklik yok'); return }
    setBusy(p.key)
    try {
      const res = await fetch(`/api/admin/integrations/sms/${p.key}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json?.success) {
        flash('ok', 'Bilgiler şifrelenerek kaydedildi')
        setDrafts((d) => {
          const n = { ...d }
          for (const k of Object.keys(payload)) delete n[`${p.key}.${k}`]
          return n
        })
        await loadSms()
      } else flash('err', json?.error?.message || 'Kaydedilemedi')
    } finally { setBusy(null) }
  }

  const deleteField = async (p: ProviderState, fieldKey: string) => {
    if (!confirm(`"${p.displayName}" sağlayıcısının "${fieldKey}" değeri silinecek. Emin misiniz?`)) return
    if (!confirm('SON ONAY: Bu işlem geri alınamaz. Sağlayıcı yapılandırması eksik kalırsa otomatik olarak devre dışı bırakılır. Devam edilsin mi?')) return
    setBusy(p.key)
    try {
      const res = await fetch(`/api/admin/integrations/sms/${p.key}?field=${encodeURIComponent(fieldKey)}&confirm=DELETE`, { method: 'DELETE' })
      const json = await res.json()
      if (json?.success) { flash('ok', 'Değer silindi'); await loadSms() }
      else flash('err', json?.error?.message || 'Silinemedi')
    } finally { setBusy(null) }
  }

  const runTest = async (p: ProviderState, mode: 'connection' | 'balance' | 'sms') => {
    if (mode === 'sms') {
      const phone = testPhone[p.key]
      if (!phone) { flash('err', 'Test için telefon numarası girin'); return }
      if (!confirm('Gerçek bir test SMS gönderilecek ve ücretlendirilebilir. Devam edilsin mi?')) return
    }
    setBusy(`${p.key}:${mode}`)
    try {
      const res = await fetch(`/api/admin/integrations/sms/${p.key}/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, phone: testPhone[p.key] }),
      })
      const json = await res.json()
      if (json?.success) {
        const d = json.data || {}
        flash('ok', d.message || (d.ok ? 'Test başarılı' : 'Test başarısız') )
      } else flash('err', json?.error?.message || 'Test yapılamadı')
      await loadSms()
    } finally { setBusy(null) }
  }

  // ── Apple / Google eylemleri ────────────────────────────────
  const saveApple = async () => {
    if (!appleDraft.trim()) { flash('err', 'Değer girin'); return }
    setBusy('apple')
    try {
      const res = await fetch('/api/admin/integrations/apple', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_secret: appleDraft }),
      })
      const json = await res.json()
      if (json?.success) { flash('ok', 'Apple bilgisi şifrelenerek kaydedildi'); setAppleDraft(''); await loadApple() }
      else flash('err', json?.error?.message || 'Kaydedilemedi')
    } finally { setBusy(null) }
  }

  const deleteApple = async () => {
    if (!confirm('Apple IAP shared secret silinecek. Emin misiniz?')) return
    if (!confirm('SON ONAY: Silindikten sonra mağaza doğrulama ucu yapılandırma eksikliği nedeniyle kapanır. Devam edilsin mi?')) return
    setBusy('apple')
    try {
      const res = await fetch('/api/admin/integrations/apple?confirm=DELETE', { method: 'DELETE' })
      const json = await res.json()
      if (json?.success) { flash('ok', 'Silindi'); await loadApple() } else flash('err', json?.error?.message || 'Silinemedi')
    } finally { setBusy(null) }
  }

  const savePlay = async () => {
    const payload: Record<string, string> = {}
    for (const k of ['service_account_json', 'package_name', 'store_products_map']) {
      const v = playDraft[k]
      if (v !== undefined && v.trim() !== '') payload[k] = v
    }
    if (Object.keys(payload).length === 0) { flash('err', 'Değişiklik yok'); return }
    setBusy('play')
    try {
      const res = await fetch('/api/admin/integrations/google-play', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json?.success) {
        flash('ok', 'Google Play yapılandırması kaydedildi')
        setPlayDraft((d) => ({ ...d, service_account_json: '' }))
        await loadPlay()
      } else flash('err', json?.error?.message || 'Kaydedilemedi')
    } finally { setBusy(null) }
  }

  const deletePlayField = async (field: string) => {
    if (!confirm(`Google Play "${field}" değeri silinecek. Emin misiniz?`)) return
    if (!confirm('SON ONAY: Bu işlem geri alınamaz ve mağaza doğrulaması kapanabilir. Devam edilsin mi?')) return
    setBusy('play')
    try {
      const res = await fetch(`/api/admin/integrations/google-play?field=${encodeURIComponent(field)}&confirm=DELETE`, { method: 'DELETE' })
      const json = await res.json()
      if (json?.success) { flash('ok', 'Silindi'); await loadPlay() } else flash('err', json?.error?.message || 'Silinemedi')
    } finally { setBusy(null) }
  }

  const tabBtn = (id: typeof tab, label: string, Icon: any) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-3 py-2 sm:px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
        tab === id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <AdminBackButton variant="link" />

        <div className="flex items-center gap-3 mb-2">
          <Plug className="w-7 h-7 text-purple-400" />
          <h1 className="text-xl sm:text-2xl font-bold text-white">Entegrasyonlar / Secret &amp; API Ayarları</h1>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Tüm gizli bilgiler sunucuda şifrelenerek saklanır, panelde yalnızca maskeli gösterilir ve hiçbir zaman geri okunamaz.
        </p>

        <div className={`mb-5 rounded-lg border px-4 py-3 text-sm flex items-start gap-2 ${
          vault === 'dedicated' ? 'bg-green-500/10 border-green-500/30 text-green-300'
            : vault === 'derived' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          <KeyRound className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Şifreleme anahtarı durumu: <b>{vault === 'dedicated' ? 'Adanmış anahtar aktif' : vault === 'derived' ? 'Türetilmiş anahtar (adanmış anahtar önerilir)' : 'Anahtar bulunamadı – kayıt yapılamaz'}</b>
          </span>
        </div>

        {msg && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm border ${
            msg.kind === 'ok' ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
            {msg.text}
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabBtn('sms', 'SMS / OTP', MessageSquare)}
          {tabBtn('apple', 'Apple IAP', Apple)}
          {tabBtn('google', 'Google Play', Play)}
          <button onClick={loadAll} className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>

        {tab === 'sms' && (
          <div className="space-y-6">
            {/* Seçim ayarları */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 sm:p-5">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-purple-400" /> Sağlayıcı Seçim ve Sağlık Ayarları</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <label className="text-sm">
                  <span className="block text-gray-400 mb-1">Seçim modu</span>
                  <select
                    value={settings.selectionMode || 'fallback'}
                    onChange={(e) => setSettings({ ...settings, selectionMode: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="manual">Manuel (tek sağlayıcı)</option>
                    <option value="priority">Öncelik sırası</option>
                    <option value="fallback">Otomatik yedekleme</option>
                    <option value="health">Sağlık bazlı</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block text-gray-400 mb-1">Manuel sağlayıcı</span>
                  <select
                    value={settings.manualProvider || ''}
                    onChange={(e) => setSettings({ ...settings, manualProvider: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">— seçilmedi —</option>
                    {providers.filter((p) => p.implemented).map((p) => <option key={p.key} value={p.key}>{p.displayName}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block text-gray-400 mb-1">Hata oranı eşiği (%)</span>
                  <input type="number" value={settings.errorRateThreshold || '50'}
                    onChange={(e) => setSettings({ ...settings, errorRateThreshold: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </label>
                <label className="text-sm">
                  <span className="block text-gray-400 mb-1">Minimum örnek sayısı</span>
                  <input type="number" value={settings.minSamples || '5'}
                    onChange={(e) => setSettings({ ...settings, minSamples: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </label>
                <label className="text-sm">
                  <span className="block text-gray-400 mb-1">Soğuma süresi (dk)</span>
                  <input type="number" value={settings.cooldownMinutes || '10'}
                    onChange={(e) => setSettings({ ...settings, cooldownMinutes: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </label>
                <label className="text-sm">
                  <span className="block text-gray-400 mb-1">Zaman aşımı (ms)</span>
                  <input type="number" value={settings.timeoutMs || '15000'}
                    onChange={(e) => setSettings({ ...settings, timeoutMs: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </label>
                <label className="text-sm sm:col-span-2 lg:col-span-3">
                  <span className="block text-gray-400 mb-1">OTP mesaj şablonu ({'{code}'} kod ile değiştirilir)</span>
                  <input type="text" value={settings.otpTemplate || ''}
                    onChange={(e) => setSettings({ ...settings, otpTemplate: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </label>
              </div>
              <button
                onClick={() => saveSetting({
                  selectionMode: settings.selectionMode || 'fallback',
                  manualProvider: settings.manualProvider || '',
                  errorRateThreshold: settings.errorRateThreshold || '50',
                  minSamples: settings.minSamples || '5',
                  cooldownMinutes: settings.cooldownMinutes || '10',
                  timeoutMs: settings.timeoutMs || '15000',
                  otpTemplate: settings.otpTemplate || '',
                })}
                disabled={busy === 'settings'}
                className="mt-4 inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
              >
                {busy === 'settings' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Ayarları Kaydet
              </button>
            </div>

            {/* Sağlayıcılar */}
            {providers.map((p) => {
              const badge = STATUS_BADGE[p.health?.status || 'unknown']
              return (
                <div key={p.key} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="text-white font-semibold">{p.displayName}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{p.region === 'TR' ? 'Türkiye' : 'Global'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${badge.cls}`}>{badge.dot} {badge.label}</span>
                    {!p.implemented && (
                      <span className="text-xs px-2 py-0.5 rounded border bg-orange-500/10 text-orange-300 border-orange-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Entegrasyon yazılmadı
                      </span>
                    )}
                    {p.implemented && !p.configured && (
                      <span className="text-xs px-2 py-0.5 rounded border bg-gray-700/40 text-gray-300 border-gray-600">Yapılandırma eksik</span>
                    )}
                    <div className="ml-auto flex items-center gap-3">
                      <label className="text-xs text-gray-400 flex items-center gap-1">
                        Öncelik
                        <input
                          type="number" min={1} max={99} defaultValue={p.priority}
                          onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v !== p.priority) patchProvider(p.key, { priority: v }) }}
                          className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                        />
                      </label>
                      <button
                        onClick={() => patchProvider(p.key, { enabled: !p.enabled })}
                        disabled={busy === p.key || (!p.implemented && !p.enabled)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-40 ${
                          p.enabled ? 'bg-green-600/80 text-white hover:bg-green-600' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        {p.enabled ? 'Aktif' : 'Pasif'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs text-gray-400 mb-4">
                    <div><div className="text-gray-500">OTP</div>{p.supportsOtp ? 'Evet' : 'Hayır'}</div>
                    <div><div className="text-gray-500">SMS</div>{p.supportsSms ? 'Evet' : 'Hayır'}</div>
                    <div><div className="text-gray-500">Kapsama</div>{p.coverage}</div>
                    <div><div className="text-gray-500">Son başarı</div>{fmt(p.health?.lastSuccessAt)}</div>
                    <div><div className="text-gray-500">Son test</div>{fmt(p.health?.lastTestedAt)}</div>
                    <div><div className="text-gray-500">Son kullanım</div>{fmt(p.health?.lastUsedAt)}</div>
                    <div><div className="text-gray-500">Başarı / Hata</div>{p.health?.successCount ?? 0} / {p.health?.failureCount ?? 0}</div>
                    <div><div className="text-gray-500">Hata oranı</div>%{Math.round(p.health?.errorRate ?? 0)}</div>
                    <div><div className="text-gray-500">Ort. gecikme</div>{p.health?.avgLatencyMs ?? 0} ms</div>
                    <div><div className="text-gray-500">Yedeklemede kullanım</div>{p.health?.fallbackUseCount ?? 0}</div>
                    <div className="col-span-2"><div className="text-gray-500">Son hata</div><span className="text-red-300 break-words">{p.health?.lastError || '—'}</span></div>
                  </div>

                  {p.implemented ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {p.fields.map((f) => (
                          <div key={f.key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-300">{f.label}{f.required ? ' *' : ''}</span>
                              <span className="text-[11px] text-gray-500">{SOURCE_LABEL[f.source] || f.source}</span>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type={f.secret ? 'password' : 'text'}
                                autoComplete="new-password"
                                placeholder={f.secret ? (f.hasValue ? (f.masked || '**************') : (f.placeholder || 'Değer girin')) : (f.placeholder || '')}
                                value={drafts[`${p.key}.${f.key}`] ?? (f.secret ? '' : (f.value || ''))}
                                onChange={(e) => setDrafts({ ...drafts, [`${p.key}.${f.key}`]: e.target.value })}
                                className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                              />
                              {f.hasValue && f.source !== 'env' && (
                                <button onClick={() => deleteField(p, f.key)} title="Değeri sil"
                                  className="px-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            {f.help && <p className="text-[11px] text-gray-500 mt-1">{f.help}</p>}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-4">
                        <button onClick={() => saveFields(p)} disabled={busy === p.key}
                          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm">
                          {busy === p.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
                        </button>
                        <button onClick={() => runTest(p, 'connection')} disabled={!!busy}
                          className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-lg text-sm">
                          {busy === `${p.key}:connection` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Bağlantıyı Test Et{!p.liveHealthCheck && ' (yapılandırma)'}
                        </button>
                        {p.supportsBalance && (
                          <button onClick={() => runTest(p, 'balance')} disabled={!!busy}
                            className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-lg text-sm">
                            {busy === `${p.key}:balance` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />} Bakiye Sorgula
                          </button>
                        )}
                        <div className="flex gap-2 items-center ml-auto">
                          <input
                            placeholder="Test telefonu (05xx...)"
                            value={testPhone[p.key] || ''}
                            onChange={(e) => setTestPhone({ ...testPhone, [p.key]: e.target.value })}
                            className="w-44 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                          />
                          <button onClick={() => runTest(p, 'sms')} disabled={!!busy}
                            className="inline-flex items-center gap-2 bg-amber-600/80 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-sm">
                            {busy === `${p.key}:sms` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Test SMS Gönder
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-orange-300/80 flex items-start gap-2">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      Bu sağlayıcı için doğrulanmış bir genel API dokümanı bulunamadığı için entegrasyon yazılmadı. Sahte/uydurma bir entegrasyon eklenmedi; aktif edilemez.
                    </p>
                  )}
                  {p.notes && <p className="text-[11px] text-gray-500 mt-3">{p.notes}</p>}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'apple' && apple && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 sm:p-5">
            <h2 className="text-white font-semibold mb-1 flex items-center gap-2"><Apple className="w-5 h-5 text-gray-300" /> Apple In-App Purchase</h2>
            <p className="text-sm text-gray-400 mb-4">
              Durum: {apple.configured
                ? <span className="text-green-400">Yapılandırılmış</span>
                : <span className="text-red-400">Yapılandırma eksik – mağaza doğrulama ucu kapalı</span>}
            </p>
            {apple.fields.map((f: FieldInfo) => (
              <div key={f.key} className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{f.label} *</span>
                  <span className="text-[11px] text-gray-500">{SOURCE_LABEL[f.source]} · {f.envName}</span>
                </div>
                <div className="flex gap-2">
                  <input type="password" autoComplete="new-password"
                    placeholder={f.hasValue ? (f.masked || '**************') : 'Değer girin'}
                    value={appleDraft} onChange={(e) => setAppleDraft(e.target.value)}
                    className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                  {f.hasValue && f.source === 'db' && (
                    <button onClick={deleteApple} className="px-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={saveApple} disabled={busy === 'apple'}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">
              {busy === 'apple' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
            </button>
          </div>
        )}

        {tab === 'google' && play && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 sm:p-5">
            <h2 className="text-white font-semibold mb-1 flex items-center gap-2"><Play className="w-5 h-5 text-green-400" /> Google Play Billing</h2>
            <p className="text-sm text-gray-400 mb-4">
              Durum: {play.configured
                ? <span className="text-green-400">Yapılandırılmış</span>
                : <span className="text-red-400">Yapılandırma eksik – mağaza doğrulama ucu kapalı</span>}
              {' · '}Tanımlı ürün: {play.productCount >= 0 ? play.productCount : 'geçersiz JSON'}
            </p>

            {play.fields.map((f: FieldInfo) => (
              <div key={f.key} className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{f.label} *</span>
                  <span className="text-[11px] text-gray-500">{SOURCE_LABEL[f.source]} · {f.envName}</span>
                </div>
                <div className="flex gap-2">
                  {f.secret ? (
                    <textarea rows={4} autoComplete="new-password"
                      placeholder={f.hasValue ? (f.masked || '**************') : 'Service account JSON içeriğini yapıştırın'}
                      value={playDraft.service_account_json || ''}
                      onChange={(e) => setPlayDraft({ ...playDraft, service_account_json: e.target.value })}
                      className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono" />
                  ) : (
                    <input type="text" placeholder="com.sirket.uygulama"
                      value={playDraft.package_name ?? (f.value || '')}
                      onChange={(e) => setPlayDraft({ ...playDraft, package_name: e.target.value })}
                      className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                  )}
                  {f.hasValue && f.source !== 'env' && (
                    <button onClick={() => deletePlayField(f.key)} className="px-2 self-start rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="mb-4">
              <span className="block text-sm text-gray-300 mb-1">Mağaza Ürün Eşlemesi (Apple ile ortak)</span>
              <textarea rows={6}
                value={playDraft.store_products_map || ''}
                onChange={(e) => setPlayDraft({ ...playDraft, store_products_map: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs font-mono" />
              <p className="text-[11px] text-gray-500 mt-1">
                Örnek: {'{"jeton_100":{"type":"jeton","amount":100},"cfc_500":{"type":"cfc","amount":500},"gold_30":{"type":"membership","plan":"gold","days":30}}'}
              </p>
            </div>

            <button onClick={savePlay} disabled={busy === 'play'}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">
              {busy === 'play' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
