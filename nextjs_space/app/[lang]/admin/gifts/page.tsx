'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '@/lib/language-context'
import {
  Gift, Plus, Search, Save, Trash2, Edit, X, Upload,
  Music, Volume2, Sparkles, Image as ImageIcon, Film,
  ArrowLeft, RefreshCw, Maximize, Minimize2, Square,
} from 'lucide-react'

// ═══════════════════════════════════════════════════
// Sade hediye kataloğu
// Admin yalnızca: dosya, isim, emoji, açıklama, aktif/pasif, küçük önizleme,
// panel ikonu, ses efekti, müzik, jeton fiyatı ve görüntüleme türünü seçer.
// Süre, animasyon türü, parçacık, konum, sıralama ve görünürlük sunucuda
// yüklenen medyaya göre otomatik ayarlanır (lib/gift-admin.ts).
// ═══════════════════════════════════════════════════

type DisplayMode = 'full' | 'half' | 'small'

interface GiftItem {
  id: string
  name: string
  icon: string
  description?: string | null
  price: number
  isActive: boolean
  assetUrl?: string | null
  assetType?: string | null
  assetMimeType?: string | null
  assetWidth?: number | null
  assetHeight?: number | null
  assetDurationMs?: number | null
  cloudStoragePath?: string | null
  thumbnailUrl?: string | null
  thumbnailCloudPath?: string | null
  iconImageUrl?: string | null
  iconImageCloudPath?: string | null
  soundUrl?: string | null
  soundCloudPath?: string | null
  musicUrl?: string | null
  musicCloudPath?: string | null
  displayArea?: string | null
  isFullscreen?: boolean
  tier?: string | null
  mediaType?: string | null
  assetFormat?: string | null
  [key: string]: any
}

interface Draft extends Partial<GiftItem> {
  displayMode: DisplayMode
  hasEmbeddedAudio?: boolean | null
}

const JETON_PRESETS = [1, 10, 99, 499, 999, 5000, 10000, 50000, 100000]

const DISPLAY_MODES: { value: DisplayMode; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: 'full', label: 'Tam ekran', hint: 'Ekranı komple kaplar', icon: <Maximize size={18} /> },
  { value: 'half', label: 'Yarım ekran', hint: 'Ekranın yarısına kadar', icon: <Square size={18} /> },
  { value: 'small', label: 'Küçük', hint: 'Ekranın ortasında, parçacık efektli', icon: <Minimize2 size={18} /> },
]

const ACCEPT_ASSET = 'image/png,image/jpeg,image/webp,image/gif,image/apng,image/svg+xml,video/mp4,video/webm,application/json,.json'
const ACCEPT_IMAGE = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
const ACCEPT_AUDIO = 'audio/mpeg,audio/mp3,audio/wav,audio/ogg'

function displayModeOf(g: Partial<GiftItem>): DisplayMode {
  const area = String(g.displayArea || '').toUpperCase()
  if (area === 'FULL_SCREEN' || g.isFullscreen) return 'full'
  if (area === 'HALF_SCREEN') return 'half'
  if (area) return 'small'
  if (g.tier === 'huge') return 'full'
  if (g.tier === 'big') return 'half'
  if (isVideoUrl(g.assetUrl) || g.assetType === 'video') return 'full'
  return 'small'
}

function isVideoUrl(u?: string | null) {
  const s = (u || '').toLowerCase().split('?')[0]
  return s.endsWith('.mp4') || s.endsWith('.webm')
}

function fileKind(g: Partial<GiftItem>): string {
  const s = (g.assetUrl || '').toLowerCase().split('?')[0]
  const ext = s.includes('.') ? s.substring(s.lastIndexOf('.') + 1) : ''
  if (ext === 'json') return 'LOTTIE'
  if (ext) return ext.toUpperCase()
  return (g.assetType || 'görsel').toUpperCase()
}

function fmtDuration(ms?: number | null) {
  if (!ms || ms <= 0) return null
  const s = ms / 1000
  return s >= 10 ? `${Math.round(s)} sn` : `${s.toFixed(1)} sn`
}

function nameFromFile(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_\-.]+/g, ' ').trim()
  return base ? base.charAt(0).toLocaleUpperCase('tr-TR') + base.slice(1) : ''
}

// ── Upload helper ──
async function uploadGiftFile(file: File | Blob, fileName: string, contentType: string, purpose: string): Promise<{ cloudPath: string; publicUrl: string }> {
  const res = await fetch('/api/admin/gift-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType, purpose }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Yükleme bağlantısı alınamadı')
  }
  const { uploadUrl, cloud_storage_path, publicUrl } = await res.json()
  const headers: Record<string, string> = { 'Content-Type': contentType }
  if (uploadUrl.includes('content-disposition')) headers['Content-Disposition'] = 'attachment'
  const up = await fetch(uploadUrl, { method: 'PUT', body: file, headers })
  if (!up.ok) throw new Error('Dosya yüklenemedi')
  return { cloudPath: cloud_storage_path, publicUrl: publicUrl || cloud_storage_path }
}

// ── Media probing (tarayıcıda, yerel dosyadan) ──
interface ProbeResult {
  width?: number
  height?: number
  durationMs?: number
  hasAudio?: boolean | null
  poster?: Blob | null
}

function probeVideo(file: File): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'auto'
    v.muted = true
    v.playsInline = true
    v.src = url
    let done = false
    const finish = (r: ProbeResult) => {
      if (done) return
      done = true
      URL.revokeObjectURL(url)
      resolve(r)
    }
    const timer = setTimeout(() => finish({}), 15000)
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(0.5, (v.duration || 1) / 2)
    }
    v.onseeked = () => {
      clearTimeout(timer)
      const anyV = v as any
      const hasAudio: boolean | null =
        typeof anyV.mozHasAudio === 'boolean' ? anyV.mozHasAudio
          : typeof anyV.webkitAudioDecodedByteCount === 'number' ? anyV.webkitAudioDecodedByteCount > 0 || null
            : anyV.audioTracks ? anyV.audioTracks.length > 0
              : null
      const base: ProbeResult = {
        width: v.videoWidth || undefined,
        height: v.videoHeight || undefined,
        durationMs: Number.isFinite(v.duration) ? Math.round(v.duration * 1000) : undefined,
        hasAudio,
      }
      try {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, 320 / Math.max(v.videoWidth || 1, v.videoHeight || 1))
        canvas.width = Math.max(1, Math.round((v.videoWidth || 1) * scale))
        canvas.height = Math.max(1, Math.round((v.videoHeight || 1) * scale))
        canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((b) => finish({ ...base, poster: b }), 'image/png')
      } catch {
        finish(base)
      }
    }
    v.onerror = () => { clearTimeout(timer); finish({}) }
  })
}

function probeImage(file: File): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); resolve({}) }
    img.src = url
  })
}

async function probeLottie(file: File): Promise<ProbeResult> {
  try {
    const j = JSON.parse(await file.text())
    const fr = Number(j.fr) || 0
    const frames = (Number(j.op) || 0) - (Number(j.ip) || 0)
    return {
      width: Number(j.w) || undefined,
      height: Number(j.h) || undefined,
      durationMs: fr > 0 && frames > 0 ? Math.round((frames / fr) * 1000) : undefined,
    }
  } catch {
    return {}
  }
}

function contentTypeOf(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'json') return 'application/json'
  if (ext === 'mp4') return 'video/mp4'
  if (ext === 'webm') return 'video/webm'
  return 'application/octet-stream'
}

// ── Small UI pieces ──
function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition ${on ? 'bg-green-500' : 'bg-white/20'} ${disabled ? 'opacity-50' : ''}`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function MediaPreview({ url, className }: { url?: string | null; className?: string }) {
  if (!url) return <div className={`flex items-center justify-center bg-white/5 text-white/30 ${className}`}><ImageIcon size={20} /></div>
  if (isVideoUrl(url)) return <video src={url} className={`object-contain bg-black/40 ${className}`} muted loop autoPlay playsInline />
  if (url.toLowerCase().split('?')[0].endsWith('.json')) {
    return <div className={`flex items-center justify-center bg-white/5 text-xs text-white/60 ${className}`}>Lottie</div>
  }
  return <img src={url} alt="" className={`object-contain bg-white/5 ${className}`} onError={(e) => (e.currentTarget.style.opacity = '0.2')} />
}

function UploadButton({ label, accept, busy, onFile }: { label: string; accept: string; busy?: boolean; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-xs flex items-center gap-1 whitespace-nowrap"
      >
        {busy ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />} {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onFile(f)
        }}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function AdminGiftCatalogPage() {
  const { language } = useLanguage()
  const lang = language || 'tr'
  const [gifts, setGifts] = useState<GiftItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [editing, setEditing] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [duplicateId, setDuplicateId] = useState<string | null>(null)

  const fetchGifts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200', sortBy: 'price', sortDir: 'asc' })
      if (search) params.set('search', search)
      if (filterActive) params.set('isActive', filterActive)
      const res = await fetch(`/api/admin/gifts?${params}`)
      const data = await res.json()
      const list: GiftItem[] = data.gifts || []
      list.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, 'tr'))
      setGifts(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, filterActive])

  useEffect(() => { fetchGifts() }, [fetchGifts])

  const set = (patch: Partial<Draft>) => setEditing((prev) => (prev ? { ...prev, ...patch } : prev))

  const openNew = () => {
    setMsg('')
    setDuplicateId(null)
    setEditing({ name: '', icon: '🎁', description: '', price: 1, isActive: true, displayMode: 'small' })
  }

  const openEdit = (g: GiftItem) => {
    setMsg('')
    setDuplicateId(null)
    setEditing({ ...g, displayMode: displayModeOf(g), hasEmbeddedAudio: null })
  }

  // ── Ana dosya yükleme: isim, küçük resim, süre, tür otomatik ──
  const handleAssetFile = async (file: File) => {
    if (!editing) return
    setBusy('asset')
    setMsg('')
    try {
      const ct = contentTypeOf(file)
      const isVideo = ct.startsWith('video/')
      const isLottie = ct === 'application/json'
      const probe = isVideo ? await probeVideo(file) : isLottie ? await probeLottie(file) : await probeImage(file)
      const { cloudPath, publicUrl } = await uploadGiftFile(file, file.name, ct, 'asset')
      const patch: Partial<Draft> = {
        assetUrl: publicUrl,
        cloudStoragePath: cloudPath,
        assetType: isVideo ? 'video' : isLottie ? 'lottie' : ct === 'image/gif' ? 'gif' : 'image',
        assetMimeType: ct,
        assetWidth: probe.width ?? null,
        assetHeight: probe.height ?? null,
        assetDurationMs: probe.durationMs ?? null,
        hasEmbeddedAudio: isVideo ? probe.hasAudio ?? null : false,
      }
      if (!editing.name?.trim()) patch.name = nameFromFile(file.name)
      if (!editing.id) patch.displayMode = isVideo ? 'full' : 'small'
      // Küçük önizleme: video için ilk kareden, görselde dosyanın kendisi.
      if (!editing.thumbnailUrl) {
        if (isVideo && probe.poster) {
          const thumbName = `${file.name.replace(/\.[^.]+$/, '')}-poster.png`
          const t = await uploadGiftFile(probe.poster, thumbName, 'image/png', 'thumbnail')
          patch.thumbnailUrl = t.publicUrl
          patch.thumbnailCloudPath = t.cloudPath
        } else if (!isVideo && !isLottie) {
          patch.thumbnailUrl = publicUrl
          patch.thumbnailCloudPath = cloudPath
        }
      }
      if (!editing.iconImageUrl && !isVideo && !isLottie) {
        patch.iconImageUrl = publicUrl
        patch.iconImageCloudPath = cloudPath
      }
      set(patch)
    } catch (err: any) {
      setMsg(`❌ ${err.message}`)
    } finally {
      setBusy(null)
    }
  }

  const handleSideFile = async (
    file: File,
    purpose: 'thumbnail' | 'icon' | 'sound' | 'music',
    urlKey: keyof Draft,
    pathKey: keyof Draft,
  ) => {
    setBusy(purpose)
    setMsg('')
    try {
      const { cloudPath, publicUrl } = await uploadGiftFile(file, file.name, contentTypeOf(file), purpose)
      set({ [urlKey]: publicUrl, [pathKey]: cloudPath } as Partial<Draft>)
    } catch (err: any) {
      setMsg(`❌ ${err.message}`)
    } finally {
      setBusy(null)
    }
  }

  const handleSave = async () => {
    if (!editing) return
    const name = editing.name?.trim()
    const price = Number(editing.price)
    if (!name) return setMsg('❌ Hediye adı zorunlu')
    if (!Number.isInteger(price) || price < 1 || price > 100000) return setMsg('❌ Jeton fiyatı 1 ile 100.000 arasında olmalı')
    if (!editing.assetUrl) return setMsg('❌ Hediye dosyasını yükleyin')

    setSaving(true)
    setMsg('')
    setDuplicateId(null)
    try {
      const isNew = !editing.id
      const body = {
        name,
        icon: editing.icon || '🎁',
        description: editing.description || null,
        price,
        isActive: editing.isActive ?? true,
        displayMode: editing.displayMode,
        assetUrl: editing.assetUrl,
        assetType: editing.assetType,
        assetMimeType: editing.assetMimeType,
        assetWidth: editing.assetWidth ?? null,
        assetHeight: editing.assetHeight ?? null,
        assetDurationMs: editing.assetDurationMs ?? null,
        thumbnailUrl: editing.thumbnailUrl || null,
        iconImageUrl: editing.iconImageUrl || null,
        soundUrl: editing.soundUrl || null,
        musicUrl: editing.musicUrl || null,
        // Dosyalar yeni yüklendiyse depolama anahtarlarını da gönder.
        ...(editing.cloudStoragePath ? { cloudStoragePath: editing.cloudStoragePath } : {}),
        ...(editing.thumbnailCloudPath && editing.thumbnailUrl ? { thumbnailCloudPath: editing.thumbnailCloudPath } : {}),
        ...(editing.iconImageCloudPath && editing.iconImageUrl ? { iconImageCloudPath: editing.iconImageCloudPath } : {}),
        ...(editing.soundCloudPath && editing.soundUrl ? { soundCloudPath: editing.soundCloudPath } : {}),
        ...(editing.musicCloudPath && editing.musicUrl ? { musicCloudPath: editing.musicCloudPath } : {}),
      }
      const res = await fetch(isNew ? '/api/admin/gifts' : `/api/admin/gifts/${editing.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409 && data.existingId) setDuplicateId(data.existingId)
        throw new Error(data.error || 'Kaydedilemedi')
      }
      setEditing(null)
      setMsg('✅ Kaydedildi — tüm uygulamalarda birkaç saniye içinde güncellenir')
      fetchGifts()
    } catch (err: any) {
      setMsg(`❌ ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (g: GiftItem) => {
    setGifts((prev) => prev.map((x) => (x.id === g.id ? { ...x, isActive: !g.isActive } : x)))
    const res = await fetch(`/api/admin/gifts/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !g.isActive }),
    }).catch(() => null)
    if (!res?.ok) {
      setMsg('❌ Durum değiştirilemedi')
      fetchGifts()
    }
  }

  const handleDelete = async (g: GiftItem) => {
    if (!confirm(`"${g.name}" silinsin mi? Hediye uygulamadan tamamen kaldırılır.`)) return
    const res = await fetch(`/api/admin/gifts/${g.id}`, { method: 'DELETE' }).catch(() => null)
    if (!res?.ok) {
      setMsg('❌ Hediye silinemedi')
      return
    }
    setMsg(`🗑️ "${g.name}" silindi`)
    if (editing?.id === g.id) setEditing(null)
    fetchGifts()
  }

  const openDuplicate = async () => {
    if (!duplicateId) return
    const res = await fetch(`/api/admin/gifts/${duplicateId}`)
    if (res.ok) openEdit(await res.json())
  }

  const isVideo = editing ? editing.assetType === 'video' || isVideoUrl(editing.assetUrl) : false
  const autoDuration = editing ? fmtDuration(editing.assetDurationMs) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <a href={`/${lang}/admin`} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
          <ArrowLeft size={20} />
        </a>
        <Gift className="text-purple-400" size={28} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Hediye Kataloğu</h1>
          <p className="text-white/50 text-sm">Dosyayı yükleyin — süre, önizleme ve animasyon otomatik ayarlanır. Hediyeler jeton fiyatına göre sıralanır.</p>
        </div>
        <button
          onClick={openNew}
          className="ml-auto px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-medium flex items-center gap-2"
        >
          <Plus size={16} /> Yeni Hediye
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hediye ara..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tümü</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
        <button onClick={fetchGifts} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm flex items-center gap-2">
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      {msg && !editing && <p className="mb-4 text-sm text-white/80">{msg}</p>}

      {/* Gift list — always price ascending */}
      {loading ? (
        <p className="text-white/50 text-sm">Yükleniyor...</p>
      ) : gifts.length === 0 ? (
        <p className="text-white/50 text-sm">Hediye bulunamadı.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {gifts.map((g) => {
            const mode = displayModeOf(g)
            return (
              <div
                key={g.id}
                className={`rounded-xl border p-3 flex gap-3 ${g.isActive ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/[0.02] opacity-60'}`}
              >
                <MediaPreview url={g.thumbnailUrl || g.iconImageUrl || g.assetUrl} className="w-16 h-16 rounded-lg shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span>{g.icon}</span>
                    <span className="font-medium truncate">{g.name}</span>
                  </div>
                  <p className="text-amber-300 text-sm font-semibold">🪙 {g.price.toLocaleString('tr-TR')}</p>
                  <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-white/60">
                    <span className="px-1.5 py-0.5 rounded bg-white/10">{fileKind(g)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/10">
                      {mode === 'full' ? 'Tam ekran' : mode === 'half' ? 'Yarım ekran' : 'Küçük'}
                    </span>
                    {fmtDuration(g.assetDurationMs) && <span className="px-1.5 py-0.5 rounded bg-white/10">{fmtDuration(g.assetDurationMs)}</span>}
                    {g.soundUrl && <span className="px-1.5 py-0.5 rounded bg-white/10">🔊</span>}
                    {g.musicUrl && <span className="px-1.5 py-0.5 rounded bg-white/10">🎵</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between gap-2">
                  <Toggle on={g.isActive} onChange={() => toggleActive(g)} />
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(g)} className="p-1.5 rounded bg-white/10 hover:bg-white/20" title="Düzenle">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(g)} className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300" title="Sil">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-4">
          <div className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl p-4 md:p-6 my-4">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">{editing.id ? 'Hediyeyi düzenle' : 'Yeni hediye'}</h2>
              <button onClick={() => setEditing(null)} className="ml-auto p-1.5 rounded hover:bg-white/10"><X size={18} /></button>
            </div>

            {/* 1. Dosya */}
            <section className="mb-5">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Film size={16} /> Hediye dosyası</h3>
              <div className="flex gap-3 items-start">
                <MediaPreview url={editing.assetUrl} className="w-32 h-32 rounded-lg shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <UploadButton label={editing.assetUrl ? 'Dosyayı değiştir' : 'Dosya yükle'} accept={ACCEPT_ASSET} busy={busy === 'asset'} onFile={handleAssetFile} />
                  <p className="text-xs text-white/50">PNG, JPG, WebP, GIF, SVG, MP4, WebM veya Lottie (JSON). İsim, küçük resim ve süre dosyadan alınır.</p>
                  {editing.assetUrl && (
                    <div className="flex flex-wrap gap-1 text-[11px] text-white/70">
                      <span className="px-2 py-0.5 rounded bg-white/10">Tür: {fileKind(editing)}</span>
                      {editing.assetWidth && editing.assetHeight && (
                        <span className="px-2 py-0.5 rounded bg-white/10">{editing.assetWidth}×{editing.assetHeight}</span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-white/10">
                        Süre: {autoDuration ?? (isVideo ? 'video uzunluğu' : '3 sn')}
                      </span>
                      {isVideo && editing.hasEmbeddedAudio === true && <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-300">Videonun kendi sesi çalınır</span>}
                      {isVideo && editing.hasEmbeddedAudio === false && <span className="px-2 py-0.5 rounded bg-white/10">Videoda ses yok</span>}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Temel bilgiler */}
            <section className="mb-5 grid grid-cols-1 sm:grid-cols-[1fr_96px] gap-3">
              <div>
                <label className="text-xs text-white/60 mb-1 block">Hediye adı</label>
                <input
                  value={editing.name || ''}
                  onChange={(e) => set({ name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  placeholder="Örn. Aslan"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Emoji ikonu</label>
                <input
                  value={editing.icon || ''}
                  onChange={(e) => set({ icon: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-center"
                  placeholder="🎁"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-white/60 mb-1 block">Açıklama</label>
                <textarea
                  value={editing.description || ''}
                  onChange={(e) => set({ description: e.target.value })}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-white/60 mb-1 block">Jeton fiyatı (1 – 100.000)</label>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={editing.price ?? ''}
                  onChange={(e) => set({ price: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {JETON_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set({ price: p })}
                      className={`px-2 py-1 rounded text-xs ${editing.price === p ? 'bg-amber-500 text-black' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                      {p.toLocaleString('tr-TR')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <Toggle on={editing.isActive ?? true} onChange={(v) => set({ isActive: v })} />
                <span className="text-sm">{editing.isActive ?? true ? 'Aktif — uygulamada görünür' : 'Pasif — uygulamada gizli'}</span>
              </div>
            </section>

            {/* 3. Görüntüleme türü */}
            <section className="mb-5">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Sparkles size={16} /> Görüntüleme türü</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DISPLAY_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => set({ displayMode: m.value })}
                    className={`text-left rounded-xl border p-3 transition ${editing.displayMode === m.value ? 'border-purple-400 bg-purple-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center gap-2 font-medium text-sm">{m.icon} {m.label}</div>
                    <p className="text-xs text-white/50 mt-1">{m.hint}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* 4. Önizleme & panel ikonu */}
            <section className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><ImageIcon size={16} /> Küçük önizleme</h3>
                <div className="flex items-center gap-2">
                  <MediaPreview url={editing.thumbnailUrl} className="w-14 h-14 rounded-lg" />
                  <UploadButton label="Değiştir" accept={ACCEPT_IMAGE} busy={busy === 'thumbnail'} onFile={(f) => handleSideFile(f, 'thumbnail', 'thumbnailUrl', 'thumbnailCloudPath')} />
                  {editing.thumbnailUrl && (
                    <button type="button" onClick={() => set({ thumbnailUrl: null, thumbnailCloudPath: null })} className="p-1.5 rounded hover:bg-white/10" title="Kaldır"><X size={14} /></button>
                  )}
                </div>
                <p className="text-[11px] text-white/40 mt-1">Boşsa videonun ilk karesinden otomatik oluşturulur.</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><ImageIcon size={16} /> Panel ikonu</h3>
                <div className="flex items-center gap-2">
                  <MediaPreview url={editing.iconImageUrl} className="w-14 h-14 rounded-lg" />
                  <UploadButton label="Değiştir" accept={ACCEPT_IMAGE} busy={busy === 'icon'} onFile={(f) => handleSideFile(f, 'icon', 'iconImageUrl', 'iconImageCloudPath')} />
                  {editing.iconImageUrl && (
                    <button type="button" onClick={() => set({ iconImageUrl: null, iconImageCloudPath: null })} className="p-1.5 rounded hover:bg-white/10" title="Kaldır"><X size={14} /></button>
                  )}
                </div>
                <p className="text-[11px] text-white/40 mt-1">Boşsa küçük önizleme kullanılır.</p>
              </div>
            </section>

            {/* 5. Ses */}
            <section className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Volume2 size={16} /> Ses efekti</h3>
                <div className="flex items-center gap-2">
                  <UploadButton label={editing.soundUrl ? 'Değiştir' : 'Ekle'} accept={ACCEPT_AUDIO} busy={busy === 'sound'} onFile={(f) => handleSideFile(f, 'sound', 'soundUrl', 'soundCloudPath')} />
                  {editing.soundUrl && (
                    <>
                      <audio src={editing.soundUrl} controls className="h-8 max-w-[160px]" />
                      <button type="button" onClick={() => set({ soundUrl: null, soundCloudPath: null })} className="p-1.5 rounded hover:bg-white/10" title="Kaldır"><X size={14} /></button>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-white/40 mt-1">Videonun kendi sesi varsa o çalar; ses efekti isteğe bağlıdır.</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Music size={16} /> Hediye müziği</h3>
                <div className="flex items-center gap-2">
                  <UploadButton label={editing.musicUrl ? 'Değiştir' : 'Ekle'} accept={ACCEPT_AUDIO} busy={busy === 'music'} onFile={(f) => handleSideFile(f, 'music', 'musicUrl', 'musicCloudPath')} />
                  {editing.musicUrl && (
                    <>
                      <audio src={editing.musicUrl} controls className="h-8 max-w-[160px]" />
                      <button type="button" onClick={() => set({ musicUrl: null, musicCloudPath: null })} className="p-1.5 rounded hover:bg-white/10" title="Kaldır"><X size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* 6. Otomatik ayarlar (bilgi) */}
            <section className="mb-5 rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-white/60 space-y-1">
              <p>⚙️ Otomatik: animasyon türü ve süre dosyaya göre ({autoDuration ?? (isVideo ? 'video uzunluğu' : '3 sn')}).</p>
              <p>✨ Parçacık efekti yalnızca küçük hediyelerde açık.</p>
              <p>🎤 📹 ⚔️ Sesli odalarda, canlı yayınlarda ve tüm PK'larda gönderilebilir.</p>
              <p>🔢 Sıralama her zaman jeton fiyatına göre (1 → 100.000).</p>
            </section>

            {msg && <p className="mb-3 text-sm">{msg}</p>}
            {duplicateId && (
              <button type="button" onClick={openDuplicate} className="mb-3 text-sm underline text-purple-300">
                Mevcut hediyeyi düzenle
              </button>
            )}

            <div className="flex flex-wrap gap-2 justify-end">
              {editing.id && (
                <button
                  type="button"
                  onClick={() => handleDelete(editing as GiftItem)}
                  className="mr-auto px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-sm flex items-center gap-2"
                >
                  <Trash2 size={14} /> Sil
                </button>
              )}
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !!busy}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
