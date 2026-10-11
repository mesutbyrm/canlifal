'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion } from 'framer-motion'
import AdminBackButton from '@/components/admin-back-button'
import AnimationPreviewModal, { PreviewAnimation } from '@/components/admin/animation-preview-modal'
import {
  Plus, Save, Loader2, X, Upload, Eye, Pencil, UserPlus, Power, Trash2, Search, Users, Crown, LayoutGrid,
} from 'lucide-react'

// ---------------------------------------------------------------- sabitler
const CATEGORIES: { value: string; tr: string; en: string }[] = [
  { value: 'entrance', tr: 'Giriş', en: 'Entrance' },
  { value: 'exit', tr: 'Çıkış', en: 'Exit' },
  { value: 'seat', tr: 'Koltuk', en: 'Seat' },
  { value: 'profile', tr: 'Profil', en: 'Profile' },
  { value: 'profile_frame', tr: 'Profil Çerçevesi', en: 'Profile Frame' },
  { value: 'avatar', tr: 'Avatar', en: 'Avatar' },
  { value: 'microphone', tr: 'Mikrofon', en: 'Microphone' },
  { value: 'chat_bubble', tr: 'Sohbet Balonu', en: 'Chat Bubble' },
  { value: 'host', tr: 'Host Devri', en: 'Host' },
  { value: 'gift', tr: 'Hediye', en: 'Gift' },
  { value: 'level_up', tr: 'Seviye Atlama', en: 'Level Up' },
  { value: 'vip', tr: 'VIP', en: 'VIP' },
  { value: 'system', tr: 'Sistem', en: 'System' },
  { value: 'page_transition', tr: 'Sayfa Geçişi', en: 'Page Transition' },
]

/** Kullanıcıya Özel sekmesinde gösterilen kategoriler (spec) */
const USER_CATEGORIES = ['entrance', 'exit', 'profile', 'profile_frame', 'avatar', 'seat', 'microphone', 'vip', 'gift']

const TYPES = ['lottie', 'svga', 'gif', 'video', 'image', 'apng']
const POSITIONS = ['top_left', 'top_center', 'top_right', 'center', 'bottom_left', 'bottom_right', 'seat']
const SCALES = ['small', 'medium', 'large']
const ANCHORS = ['room', 'user', 'seat', 'host']
const RARITIES = ['normal', 'rare', 'epic', 'legendary']
const STATUSES = ['active', 'inactive', 'scheduled', 'archived']
const CONTEXTS = ['voice_room', 'live_stream', 'social', 'profile', 'game_room', 'chat', 'gift', 'login', 'logout', 'mic', 'seat', 'host']

const TIERS: { value: string; tr: string; priority: number }[] = [
  { value: 'basic', tr: 'Normal', priority: 10 },
  { value: 'silver', tr: 'Silver', priority: 20 },
  { value: 'gold', tr: 'Gold', priority: 30 },
  { value: 'premium', tr: 'Premium', priority: 40 },
  { value: 'platinum', tr: 'Platinum', priority: 50 },
  { value: 'diamond', tr: 'Diamond', priority: 60 },
  { value: 'vip', tr: 'VIP', priority: 80 },
  { value: 'svip', tr: 'SVIP', priority: 90 },
  { value: 'admin', tr: 'Admin', priority: 100 },
]

const DURATIONS = [
  { value: 'permanent', tr: 'Süresiz', en: 'Permanent' },
  { value: '1', tr: '1 gün', en: '1 day' },
  { value: '7', tr: '7 gün', en: '7 days' },
  { value: '30', tr: '30 gün', en: '30 days' },
  { value: '90', tr: '90 gün', en: '90 days' },
  { value: 'custom', tr: 'Özel tarih', en: 'Custom date' },
]

const TABS = [
  { key: 'library', tr: 'Kütüphane', en: 'Library', icon: LayoutGrid },
  { key: 'membership', tr: 'Üyelik Eşleştirme', en: 'Membership Mapping', icon: Crown },
  { key: 'user', tr: 'Kullanıcıya Özel', en: 'Per User', icon: UserPlus },
  { key: 'bulk', tr: 'Toplu Atama', en: 'Bulk Assign', icon: Users },
]

type Anim = Record<string, any>

const emptyForm = (): Record<string, any> => ({
  name: '', category: 'entrance', type: 'lottie', assetUrl: '', previewUrl: '', thumbnailUrl: '', soundUrl: '',
  durationMs: 3000, priority: 10, rarity: 'normal', membershipLevel: '', contexts: ['voice_room'],
  position: 'center', scale: 'medium', anchor: 'room', cooldownMs: 0, canSkip: true, status: 'active', sortOrder: 0,
})

export default function SiteAnimationsAdmin() {
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const isTr = String(language) !== 'en'
  // 'facebook' tek açık temadır; diğer tüm temalar koyu — admin panelinin genelindeki kural.
  const isMystical = theme !== 'facebook'

  const cardBg = isMystical ? 'bg-[#1a0a2e]/80 border-purple-900/30' : 'bg-white border-gray-200'
  const textColor = isMystical ? 'text-white' : 'text-gray-900'
  const subText = isMystical ? 'text-purple-200' : 'text-gray-500'
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${isMystical ? 'bg-[#120722] border-purple-800/50 text-white placeholder-purple-400/50' : 'bg-white border-gray-300 text-gray-900'}`

  const [tab, setTab] = useState<string>('library')
  const [stats, setStats] = useState<any>(null)
  const [items, setItems] = useState<Anim[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [query, setQuery] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, any>>(emptyForm())
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTarget = useRef<string>('')

  const [preview, setPreview] = useState<PreviewAnimation | null>(null)

  // ---- veri yukleme
  const loadStats = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/animations/stats')
      if (r.ok) setStats(await r.json())
    } catch { /* sessiz */ }
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filterCat !== 'all') p.set('category', filterCat)
      if (filterStatus !== 'all') p.set('status', filterStatus)
      if (query.trim()) p.set('q', query.trim())
      const r = await fetch(`/api/admin/animations?${p.toString()}`)
      if (r.ok) {
        const d = await r.json()
        setItems(d.items || [])
      }
    } catch { /* sessiz */ } finally { setLoading(false) }
  }, [filterCat, filterStatus, query])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadItems() }, [loadItems])

  // ---- dosya yukleme (mevcut kozmetik admin akısıyla aynı)
  const triggerUpload = (field: string, accept: string) => {
    uploadTarget.current = field
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept
      fileInputRef.current.click()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const field = uploadTarget.current
    if (!file || !field) return
    if (file.size > 20 * 1024 * 1024) {
      alert(isTr ? "Dosya boyutu 20MB'den küçük olmalı." : 'File must be under 20MB.')
      return
    }
    setUploadingField(field)
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream', isPublic: true, folder: 'cosmetic' }),
      })
      if (!presignedRes.ok) throw new Error('presigned failed')
      const { uploadUrl, cloud_storage_path } = await presignedRes.json()
      const m = uploadUrl.match(/X-Amz-SignedHeaders=([^&]+)/)
      const signedHeaders = m ? decodeURIComponent(m[1]) : 'host'
      const headers: Record<string, string> = { 'Content-Type': file.type || 'application/octet-stream' }
      if (signedHeaders.includes('content-disposition')) headers['Content-Disposition'] = 'attachment'
      const up = await fetch(uploadUrl, { method: 'PUT', headers, body: file })
      if (!up.ok) throw new Error('upload failed')
      const getUrlRes = await fetch('/api/upload/get-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, isPublic: true }),
      })
      let url = cloud_storage_path
      if (getUrlRes.ok) url = (await getUrlRes.json()).url
      setForm(prev => ({ ...prev, [field]: url }))
    } catch (err) {
      console.error('[animation upload]', err)
      alert(isTr ? 'Yükleme sırasında hata oluştu.' : 'Error during upload.')
    } finally {
      setUploadingField(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ---- CRUD
  const openNew = () => { setEditId(null); setForm(emptyForm()); setShowForm(true) }
  const openEdit = (a: Anim) => {
    setEditId(a.id)
    setForm({
      ...emptyForm(),
      ...a,
      contexts: Array.isArray(a.contexts) ? a.contexts : [],
      membershipLevel: a.membershipLevel || '',
      previewUrl: a.previewUrl || '', thumbnailUrl: a.thumbnailUrl || '', soundUrl: a.soundUrl || '',
    })
    setShowForm(true)
  }

  const saveAnimation = async () => {
    if (!form.name || !form.category || !form.type || !form.assetUrl) {
      alert(isTr ? 'Ad, kategori, tür ve animasyon dosyası zorunludur.' : 'Name, category, type and asset are required.')
      return
    }
    setSaving(true)
    try {
      const payload: any = { ...form }
      delete payload.id; delete payload.createdAt; delete payload.updatedAt; delete payload.slug
      delete payload._count; delete payload.assignments; delete payload.membershipDefaults
      if (!payload.membershipLevel) delete payload.membershipLevel
      const url = editId ? `/api/admin/animations/${editId}` : '/api/admin/animations'
      const r = await fetch(url, {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error || 'hata')
      setShowForm(false)
      await Promise.all([loadItems(), loadStats()])
    } catch (err: any) {
      alert(err?.message || (isTr ? 'Kaydedilemedi.' : 'Could not save.'))
    } finally { setSaving(false) }
  }

  const toggleStatus = async (a: Anim) => {
    const next = a.status === 'active' ? 'inactive' : 'active'
    const r = await fetch(`/api/admin/animations/${a.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }),
    })
    if (r.ok) { await Promise.all([loadItems(), loadStats()]) }
    else alert(isTr ? 'Durum değiştirilemedi.' : 'Could not change status.')
  }

  const changePriority = async (a: Anim) => {
    const v = prompt(isTr ? 'Öncelik değeri (0-999):' : 'Priority (0-999):', String(a.priority ?? 10))
    if (v === null) return
    const n = Number(v)
    if (!Number.isFinite(n)) return
    const r = await fetch(`/api/admin/animations/${a.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priority: n }),
    })
    if (r.ok) loadItems()
  }

  const removeAnimation = async (a: Anim) => {
    if (!confirm(isTr ? `"${a.name}" silinsin mi? Bu animasyonun tüm atamaları da kaldırılır.` : `Delete "${a.name}"?`)) return
    const r = await fetch(`/api/admin/animations/${a.id}`, { method: 'DELETE' })
    if (r.ok) await Promise.all([loadItems(), loadStats()])
    else alert((await r.json().catch(() => ({})))?.error || (isTr ? 'Silinemedi.' : 'Could not delete.'))
  }

  const assignFromLibrary = (a: Anim) => {
    setBulkAnimationId(a.id)
    setTab('bulk')
  }

  // ---------------------------------------------------------------- ÜYELİK EŞLEŞTİRME
  const [defaults, setDefaults] = useState<any[]>([])
  const [defCategory, setDefCategory] = useState('entrance')
  const loadDefaults = useCallback(async () => {
    const r = await fetch('/api/admin/animations/membership-defaults')
    if (r.ok) setDefaults((await r.json()).items || [])
  }, [])
  useEffect(() => { if (tab === 'membership') loadDefaults() }, [tab, loadDefaults])

  const setDefault = async (tier: string, animationId: string) => {
    if (!animationId) return
    const r = await fetch('/api/admin/animations/membership-defaults', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipTier: tier, category: defCategory, animationId }),
    })
    if (r.ok) { await loadDefaults(); loadStats() }
    else alert((await r.json().catch(() => ({})))?.error || (isTr ? 'Kaydedilemedi.' : 'Could not save.'))
  }

  const clearDefault = async (id: string) => {
    const r = await fetch(`/api/admin/animations/membership-defaults?id=${id}`, { method: 'DELETE' })
    if (r.ok) { await loadDefaults(); loadStats() }
  }

  // ---------------------------------------------------------------- KULLANICIYA ÖZEL
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userAssignments, setUserAssignments] = useState<any[]>([])
  const [userDuration, setUserDuration] = useState('permanent')

  const searchUsers = async (q: string) => {
    setUserQuery(q)
    if (q.trim().length < 2) { setUserResults([]); return }
    const r = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q.trim())}&limit=10`)
    if (r.ok) setUserResults((await r.json()).users || [])
  }

  const loadUserAssignments = useCallback(async (userId: string) => {
    const r = await fetch(`/api/admin/animations/assignments?userId=${userId}`)
    if (r.ok) setUserAssignments((await r.json()).items || [])
  }, [])

  const pickUser = async (u: any) => {
    setSelectedUser(u); setUserResults([]); setUserQuery('')
    await loadUserAssignments(u.id)
  }

  const assignToUser = async (category: string, animationId: string, duration: string) => {
    if (!selectedUser || !animationId) return
    const r = await fetch('/api/admin/animations/assignments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animationId, assignmentType: 'admin_custom', priority: 100, duration, target: { type: 'user', userId: selectedUser.id } }),
    })
    if (r.ok) { await loadUserAssignments(selectedUser.id); loadStats() }
    else alert((await r.json().catch(() => ({})))?.error || (isTr ? 'Atama yapılamadı.' : 'Could not assign.'))
  }

  const removeUserCategory = async (category: string) => {
    if (!selectedUser) return
    if (!confirm(isTr ? 'Bu kategorideki atamalar kaldırılsın mı?' : 'Remove assignments in this category?')) return
    const r = await fetch(`/api/admin/animations/assignments?userId=${selectedUser.id}&category=${category}`, { method: 'DELETE' })
    if (r.ok) { await loadUserAssignments(selectedUser.id); loadStats() }
  }

  // ---------------------------------------------------------------- TOPLU ATAMA
  const [bulkAnimationId, setBulkAnimationId] = useState('')
  const [bulkTarget, setBulkTarget] = useState('user')
  const [bulkMembership, setBulkMembership] = useState('gold')
  const [bulkRoomId, setBulkRoomId] = useState('')
  const [bulkEventLabel, setBulkEventLabel] = useState('')
  const [bulkDuration, setBulkDuration] = useState('permanent')
  const [bulkEndDate, setBulkEndDate] = useState('')
  const [bulkPriority, setBulkPriority] = useState(100)
  const [bulkUsers, setBulkUsers] = useState<any[]>([])
  const [bulkUserQuery, setBulkUserQuery] = useState('')
  const [bulkUserResults, setBulkUserResults] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkResult, setBulkResult] = useState<string | null>(null)

  useEffect(() => {
    if (tab !== 'bulk') return
    fetch('/api/admin/chat-rooms').then(r => r.ok ? r.json() : []).then(d => setRooms(Array.isArray(d) ? d : (d?.rooms || []))).catch(() => {})
  }, [tab])

  const searchBulkUsers = async (q: string) => {
    setBulkUserQuery(q)
    if (q.trim().length < 2) { setBulkUserResults([]); return }
    const r = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q.trim())}&limit=10`)
    if (r.ok) setBulkUserResults((await r.json()).users || [])
  }

  const runBulkAssign = async () => {
    if (!bulkAnimationId) { alert(isTr ? 'Animasyon seçiniz.' : 'Select an animation.'); return }
    const target: any = { type: bulkTarget }
    if (bulkTarget === 'user') {
      if (!bulkUsers.length) { alert(isTr ? 'Kullanıcı seçiniz.' : 'Select a user.'); return }
      target.userId = bulkUsers[0].id
    } else if (bulkTarget === 'users' || bulkTarget === 'event') {
      if (!bulkUsers.length) { alert(isTr ? 'Kullanıcı seçiniz.' : 'Select users.'); return }
      target.userIds = bulkUsers.map(u => u.id)
      if (bulkTarget === 'event') target.eventLabel = bulkEventLabel
    } else if (bulkTarget === 'membership') {
      target.membership = bulkMembership
    } else if (bulkTarget === 'room') {
      if (!bulkRoomId) { alert(isTr ? 'Oda seçiniz.' : 'Select a room.'); return }
      target.roomId = bulkRoomId
    }
    setBulkBusy(true); setBulkResult(null)
    try {
      const r = await fetch('/api/admin/animations/assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animationId: bulkAnimationId, assignmentType: 'admin_custom', priority: bulkPriority,
          duration: bulkDuration, endDate: bulkDuration === 'custom' ? bulkEndDate : undefined, target,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error || 'hata')
      setBulkResult(isTr ? `${d.assigned} atama oluşturuldu.` : `${d.assigned} assignments created.`)
      loadStats()
    } catch (err: any) {
      setBulkResult(err?.message || (isTr ? 'Atama yapılamadı.' : 'Could not assign.'))
    } finally { setBulkBusy(false) }
  }

  // ---------------------------------------------------------------- render yardımcıları
  const catLabel = (v: string) => { const c = CATEGORIES.find(x => x.value === v); return c ? (isTr ? c.tr : c.en) : v }
  const thumb = (a: Anim) => a.thumbnailUrl || a.previewUrl || (['image', 'gif', 'apng'].includes(a.type) ? a.assetUrl : null)

  const statCards = [
    { label: isTr ? 'Toplam Animasyon' : 'Total', value: stats?.total ?? 0, emoji: '🎬' },
    { label: isTr ? 'Aktif' : 'Active', value: stats?.active ?? 0, emoji: '✅' },
    { label: isTr ? 'Pasif' : 'Inactive', value: stats?.inactive ?? 0, emoji: '⏸️' },
    { label: isTr ? 'Giriş' : 'Entrance', value: stats?.entrance ?? 0, emoji: '🚪' },
    { label: isTr ? 'Çıkış' : 'Exit', value: stats?.exit ?? 0, emoji: '👋' },
    { label: isTr ? 'Koltuk' : 'Seat', value: stats?.seat ?? 0, emoji: '🪑' },
    { label: 'VIP', value: stats?.vip ?? 0, emoji: '👑' },
    { label: isTr ? 'Profil Çerçevesi' : 'Profile Frame', value: stats?.profileFrame ?? 0, emoji: '🖼️' },
    { label: isTr ? 'Hediye' : 'Gift', value: stats?.gift ?? 0, emoji: '🎁' },
  ]

  const assetField = (field: string, labelTr: string, labelEn: string, accept: string) => (
    <div>
      <label className={`block text-xs mb-1 ${subText}`}>{isTr ? labelTr : labelEn}</label>
      <div className="flex gap-2">
        <input className={inputCls} value={form[field] || ''} onChange={e => setForm({ ...form, [field]: e.target.value })} placeholder="URL" />
        <button type="button" onClick={() => triggerUpload(field, accept)} disabled={uploadingField === field}
          className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm flex items-center gap-1 shrink-0">
          {uploadingField === field ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen p-4 sm:p-6 ${isMystical ? 'bg-gradient-to-b from-[#0f0520] to-[#1a0a2e]' : 'bg-gray-50'}`}>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

      <div className="max-w-7xl mx-auto">
        {/* Başlık */}
        <div className="flex items-center gap-3 mb-6">
          <AdminBackButton />
          <div>
            <h1 className={`text-2xl font-bold ${textColor}`}>🎨 {isTr ? 'Site Animasyonları' : 'Site Animations'}</h1>
            <p className={`text-sm ${subText}`}>
              {isTr ? 'Merkezi animasyon kütüphanesi, üyelik varsayılanları ve kullanıcı atamaları' : 'Central animation library, membership defaults and user assignments'}
            </p>
          </div>
        </div>

        {/* Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {statCards.map(s => (
            <div key={s.label} className={`rounded-xl border p-3 ${cardBg}`}>
              <div className="text-xl">{s.emoji}</div>
              <div className={`text-2xl font-bold ${textColor}`}>{s.value}</div>
              <div className={`text-[11px] ${subText}`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sekmeler */}
        <div className="flex flex-wrap gap-2 mb-5">
          {TABS.map(t => {
            const Icon = t.icon
            const on = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 border transition ${on ? 'bg-purple-600 text-white border-purple-500' : `${cardBg} ${textColor}`}`}>
                <Icon className="w-4 h-4" /> {isTr ? t.tr : t.en}
              </button>
            )
          })}
          <button onClick={openNew} className="ml-auto px-3 py-2 rounded-lg text-sm flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4" /> {isTr ? 'Animasyon Ekle' : 'Add Animation'}
          </button>
        </div>

        {/* ---------------- KÜTÜPHANE ---------------- */}
        {tab === 'library' && (
          <>
            <div className={`rounded-xl border p-3 mb-4 flex flex-wrap gap-2 ${cardBg}`}>
              <div className="relative flex-1 min-w-[180px]">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${subText}`} />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder={isTr ? 'Animasyon ara...' : 'Search...'}
                  className={`${inputCls} pl-9`} />
              </div>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={`${inputCls} w-auto`}>
                <option value="all">{isTr ? 'Tüm kategoriler' : 'All categories'}</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{isTr ? c.tr : c.en}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`${inputCls} w-auto`}>
                <option value="all">{isTr ? 'Tüm durumlar' : 'All statuses'}</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
            ) : items.length === 0 ? (
              <div className={`rounded-xl border p-10 text-center ${cardBg} ${subText}`}>
                {isTr ? 'Henüz animasyon yok. “Animasyon Ekle” ile başlayın.' : 'No animations yet.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(a => (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border overflow-hidden ${cardBg}`}>
                    <div className="aspect-video relative bg-black/30 flex items-center justify-center">
                      {thumb(a) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb(a)} alt={a.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className={`text-xs ${subText}`}>{a.type?.toUpperCase()}</span>
                      )}
                      <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full ${a.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-white'}`}>
                        {a.status === 'active' ? (isTr ? 'Aktif' : 'Active') : (isTr ? 'Pasif' : 'Inactive')}
                      </span>
                    </div>
                    <div className="p-3">
                      <div className={`font-semibold text-sm ${textColor}`}>{a.name}</div>
                      <div className={`text-[11px] mt-1 ${subText}`}>
                        {catLabel(a.category)} · {a.membershipLevel || (isTr ? 'genel' : 'general')} · {a.durationMs}ms · {isTr ? 'önc.' : 'pri.'}{' '}
                        <button onClick={() => changePriority(a)} className="underline decoration-dotted">{a.priority}</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <button onClick={() => setPreview(a as PreviewAnimation)} className="px-2 py-1 rounded-md text-[11px] bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"><Eye className="w-3 h-3" />{isTr ? 'Önizle' : 'Preview'}</button>
                        <button onClick={() => openEdit(a)} className="px-2 py-1 rounded-md text-[11px] bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"><Pencil className="w-3 h-3" />{isTr ? 'Düzenle' : 'Edit'}</button>
                        <button onClick={() => assignFromLibrary(a)} className="px-2 py-1 rounded-md text-[11px] bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1"><UserPlus className="w-3 h-3" />{isTr ? 'Kullanıcıya Ata' : 'Assign'}</button>
                        <button onClick={() => toggleStatus(a)} className="px-2 py-1 rounded-md text-[11px] bg-gray-600 hover:bg-gray-700 text-white flex items-center gap-1"><Power className="w-3 h-3" />{a.status === 'active' ? (isTr ? 'Pasifleştir' : 'Deactivate') : (isTr ? 'Aktifleştir' : 'Activate')}</button>
                        <button onClick={() => removeAnimation(a)} className="px-2 py-1 rounded-md text-[11px] bg-red-600/80 hover:bg-red-700 text-white flex items-center gap-1"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------------- ÜYELİK EŞLEŞTİRME ---------------- */}
        {tab === 'membership' && (
          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className={`text-sm ${textColor}`}>{isTr ? 'Kategori:' : 'Category:'}</span>
              <select value={defCategory} onChange={e => setDefCategory(e.target.value)} className={`${inputCls} w-auto`}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{isTr ? c.tr : c.en}</option>)}
              </select>
              <span className={`text-xs ${subText}`}>{isTr ? 'Her üyelik seviyesi için varsayılan animasyonu seçin.' : 'Pick the default animation per membership tier.'}</span>
            </div>
            <div className="space-y-2">
              {TIERS.map(t => {
                const row = defaults.find(d => d.membershipTier === t.value && d.category === defCategory)
                const options = items.filter(i => i.category === defCategory)
                return (
                  <div key={t.value} className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border ${isMystical ? 'border-purple-900/40 bg-[#120722]' : 'border-gray-200 bg-gray-50'}`}>
                    <div className={`w-28 font-semibold text-sm ${textColor}`}>{t.tr}</div>
                    <div className={`text-[11px] ${subText} w-20`}>{isTr ? 'öncelik' : 'priority'} {t.priority}</div>
                    <select value={row?.animationId || ''} onChange={e => setDefault(t.value, e.target.value)} className={`${inputCls} flex-1 min-w-[200px]`}>
                      <option value="">{isTr ? '— seçilmedi —' : '— none —'}</option>
                      {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    {row && (
                      <>
                        <button onClick={() => setPreview(row.animation)} className="px-2 py-1 rounded-md text-[11px] bg-purple-600 text-white">{isTr ? 'Önizle' : 'Preview'}</button>
                        <button onClick={() => clearDefault(row.id)} className="px-2 py-1 rounded-md text-[11px] bg-red-600/80 text-white">{isTr ? 'Kaldır' : 'Remove'}</button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            {items.filter(i => i.category === defCategory).length === 0 && (
              <p className={`text-xs mt-3 ${subText}`}>{isTr ? 'Bu kategoride animasyon yok. Önce kütüphaneye ekleyin.' : 'No animations in this category yet.'}</p>
            )}
          </div>
        )}

        {/* ---------------- KULLANICIYA ÖZEL ---------------- */}
        {tab === 'user' && (
          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="relative max-w-md mb-4">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${subText}`} />
              <input value={userQuery} onChange={e => searchUsers(e.target.value)} placeholder={isTr ? 'Kullanıcı ara (isim, kullanıcı adı, e-posta)' : 'Search user'} className={`${inputCls} pl-9`} />
              {userResults.length > 0 && (
                <div className={`absolute z-20 mt-1 w-full rounded-lg border overflow-hidden ${isMystical ? 'bg-[#1a0a2e] border-purple-800' : 'bg-white border-gray-200'}`}>
                  {userResults.map(u => (
                    <button key={u.id} onClick={() => pickUser(u)} className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-600/20 ${textColor}`}>
                      {u.name || u.username} <span className={`text-[11px] ${subText}`}>{u.membership || 'basic'} · {u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!selectedUser ? (
              <p className={`text-sm ${subText}`}>{isTr ? 'Bir kullanıcı seçin.' : 'Select a user.'}</p>
            ) : (
              <>
                <div className={`flex items-center gap-3 mb-4 p-3 rounded-lg ${isMystical ? 'bg-[#120722]' : 'bg-gray-50'}`}>
                  <div className={`font-semibold ${textColor}`}>{selectedUser.name || selectedUser.username}</div>
                  <span className={`text-xs ${subText}`}>{selectedUser.membership || 'basic'} · {selectedUser.role}</span>
                  <button onClick={() => { setSelectedUser(null); setUserAssignments([]) }} className={`ml-auto text-xs ${subText} underline`}>{isTr ? 'Değiştir' : 'Change'}</button>
                </div>

                <div className="space-y-2">
                  {USER_CATEGORIES.map(cat => {
                    const assigned = userAssignments.filter(a => a.category === cat)
                    const options = items.filter(i => i.category === cat)
                    return (
                      <div key={cat} className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border ${isMystical ? 'border-purple-900/40 bg-[#120722]' : 'border-gray-200 bg-gray-50'}`}>
                        <div className={`w-36 text-sm font-semibold ${textColor}`}>{catLabel(cat)}</div>
                        <div className={`text-[11px] flex-1 min-w-[140px] ${subText}`}>
                          {assigned.length ? assigned.map(a => a.animation?.name).join(', ') : (isTr ? 'atama yok' : 'no assignment')}
                        </div>
                        <select defaultValue="" onChange={e => { if (e.target.value) { assignToUser(cat, e.target.value, userDuration); e.target.value = '' } }} className={`${inputCls} w-auto min-w-[170px]`}>
                          <option value="">{assigned.length ? (isTr ? 'Değiştir / Ata' : 'Change / Assign') : (isTr ? 'Ata' : 'Assign')}</option>
                          {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                        <button onClick={() => removeUserCategory(cat)} disabled={!assigned.length}
                          className="px-2 py-1 rounded-md text-[11px] bg-red-600/80 disabled:opacity-40 text-white">{isTr ? 'Kaldır' : 'Remove'}</button>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <span className={`text-xs ${subText}`}>{isTr ? 'Atama süresi:' : 'Duration:'}</span>
                  <select value={userDuration} onChange={e => setUserDuration(e.target.value)} className={`${inputCls} w-auto`}>
                    {DURATIONS.filter(d => d.value !== 'custom').map(d => <option key={d.value} value={d.value}>{isTr ? d.tr : d.en}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------------- TOPLU ATAMA ---------------- */}
        {tab === 'bulk' && (
          <div className={`rounded-xl border p-4 space-y-4 ${cardBg}`}>
            <div>
              <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Animasyon' : 'Animation'}</label>
              <select value={bulkAnimationId} onChange={e => setBulkAnimationId(e.target.value)} className={inputCls}>
                <option value="">{isTr ? '— seçiniz —' : '— select —'}</option>
                {items.map(o => <option key={o.id} value={o.id}>{o.name} ({catLabel(o.category)})</option>)}
              </select>
            </div>

            <div>
              <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Hedef' : 'Target'}</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: 'user', tr: 'Tek kullanıcı', en: 'Single user' },
                  { v: 'users', tr: 'Çoklu kullanıcı', en: 'Multiple users' },
                  { v: 'membership', tr: 'Üyelik seviyesi', en: 'Membership tier' },
                  { v: 'room', tr: 'Belirli oda', en: 'Specific room' },
                  { v: 'event', tr: 'Belirli etkinlik', en: 'Specific event' },
                ].map(o => (
                  <button key={o.v} onClick={() => setBulkTarget(o.v)}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${bulkTarget === o.v ? 'bg-purple-600 text-white border-purple-500' : `${textColor} ${isMystical ? 'border-purple-900/40' : 'border-gray-300'}`}`}>
                    {isTr ? o.tr : o.en}
                  </button>
                ))}
              </div>
            </div>

            {(bulkTarget === 'user' || bulkTarget === 'users' || bulkTarget === 'event') && (
              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Kullanıcılar' : 'Users'}</label>
                <div className="relative max-w-md">
                  <input value={bulkUserQuery} onChange={e => searchBulkUsers(e.target.value)} placeholder={isTr ? 'Kullanıcı ara...' : 'Search user...'} className={inputCls} />
                  {bulkUserResults.length > 0 && (
                    <div className={`absolute z-20 mt-1 w-full rounded-lg border overflow-hidden ${isMystical ? 'bg-[#1a0a2e] border-purple-800' : 'bg-white border-gray-200'}`}>
                      {bulkUserResults.map(u => (
                        <button key={u.id} onClick={() => {
                          setBulkUsers(prev => bulkTarget === 'user' ? [u] : (prev.some(p => p.id === u.id) ? prev : [...prev, u]))
                          setBulkUserResults([]); setBulkUserQuery('')
                        }} className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-600/20 ${textColor}`}>
                          {u.name || u.username} <span className={`text-[11px] ${subText}`}>{u.membership || 'basic'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {bulkUsers.map(u => (
                    <span key={u.id} className="px-2 py-1 rounded-full text-[11px] bg-purple-600/30 text-white flex items-center gap-1">
                      {u.name || u.username}
                      <button onClick={() => setBulkUsers(prev => prev.filter(p => p.id !== u.id))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                {bulkTarget === 'event' && (
                  <input value={bulkEventLabel} onChange={e => setBulkEventLabel(e.target.value)} placeholder={isTr ? 'Etkinlik adı (not olarak kaydedilir)' : 'Event name'} className={`${inputCls} mt-2 max-w-md`} />
                )}
              </div>
            )}

            {bulkTarget === 'membership' && (
              <div className="max-w-xs">
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Üyelik seviyesi' : 'Membership tier'}</label>
                <select value={bulkMembership} onChange={e => setBulkMembership(e.target.value)} className={inputCls}>
                  {TIERS.filter(t => t.value !== 'admin').map(t => <option key={t.value} value={t.value}>{t.tr}</option>)}
                </select>
              </div>
            )}

            {bulkTarget === 'room' && (
              <div className="max-w-md">
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Oda (şu an odada bulunanlara uygulanır)' : 'Room (applies to current members)'}</label>
                <select value={bulkRoomId} onChange={e => setBulkRoomId(e.target.value)} className={inputCls}>
                  <option value="">{isTr ? '— seçiniz —' : '— select —'}</option>
                  {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.nameTr || r.nameEn || r.slug}</option>)}
                </select>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Süre' : 'Duration'}</label>
                <select value={bulkDuration} onChange={e => setBulkDuration(e.target.value)} className={`${inputCls} w-auto`}>
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{isTr ? d.tr : d.en}</option>)}
                </select>
              </div>
              {bulkDuration === 'custom' && (
                <div>
                  <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Bitiş tarihi' : 'End date'}</label>
                  <input type="datetime-local" value={bulkEndDate} onChange={e => setBulkEndDate(e.target.value)} className={`${inputCls} w-auto`} />
                </div>
              )}
              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Öncelik' : 'Priority'}</label>
                <input type="number" value={bulkPriority} onChange={e => setBulkPriority(Number(e.target.value))} className={`${inputCls} w-28`} />
              </div>
            </div>

            <button onClick={runBulkAssign} disabled={bulkBusy}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm flex items-center gap-2 disabled:opacity-50">
              {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isTr ? 'Atamayı Uygula' : 'Apply Assignment'}
            </button>
            {bulkResult && <p className={`text-sm ${textColor}`}>{bulkResult}</p>}
          </div>
        )}
      </div>

      {/* ---------------- FORM ---------------- */}
      {showForm && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className={`w-full max-w-3xl rounded-2xl border p-5 my-8 ${isMystical ? 'bg-[#150a24] border-purple-800/50' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${textColor}`}>{editId ? (isTr ? 'Animasyon Düzenle' : 'Edit Animation') : (isTr ? 'Animasyon Ekle' : 'Add Animation')}</h3>
              <button onClick={() => setShowForm(false)} className={`p-2 rounded-lg ${isMystical ? 'bg-white/5 text-white' : 'bg-gray-100'}`}><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Animasyon Adı' : 'Animation Name'} *</label>
                <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>

              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Kategori' : 'Category'} *</label>
                <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{isTr ? c.tr : c.en}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Animasyon Türü' : 'Animation Type'} *</label>
                <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">{assetField('assetUrl', 'Animasyon Dosyası *', 'Upload Asset *', '.json,.svga,.gif,.mp4,.webm,image/*,video/*')}</div>
              <div>{assetField('previewUrl', 'Önizleme Görseli', 'Upload Preview', 'image/*')}</div>
              <div>{assetField('soundUrl', 'Ses Dosyası', 'Upload Sound', 'audio/*')}</div>
              <div className="sm:col-span-2">{assetField('thumbnailUrl', 'Küçük Görsel (thumbnail)', 'Thumbnail', 'image/*')}</div>

              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Süre (ms)' : 'Duration (ms)'}</label>
                <input type="number" className={inputCls} value={form.durationMs} onChange={e => setForm({ ...form, durationMs: Number(e.target.value) })} />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Öncelik' : 'Priority'}</label>
                <input type="number" className={inputCls} value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Nadirlik' : 'Rarity'}</label>
                <select className={inputCls} value={form.rarity} onChange={e => setForm({ ...form, rarity: e.target.value })}>
                  {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Üyelik' : 'Membership'}</label>
                <select className={inputCls} value={form.membershipLevel} onChange={e => setForm({ ...form, membershipLevel: e.target.value })}>
                  <option value="">{isTr ? 'Herkes' : 'Everyone'}</option>
                  {TIERS.map(t => <option key={t.value} value={t.value}>{t.tr}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Bağlam (Context)' : 'Context'}</label>
                <div className="flex flex-wrap gap-1.5">
                  {CONTEXTS.map(c => {
                    const on = (form.contexts || []).includes(c)
                    return (
                      <button key={c} type="button" onClick={() => setForm({ ...form, contexts: on ? form.contexts.filter((x: string) => x !== c) : [...(form.contexts || []), c] })}
                        className={`px-2 py-1 rounded-md text-[11px] border ${on ? 'bg-purple-600 text-white border-purple-500' : `${textColor} ${isMystical ? 'border-purple-900/40' : 'border-gray-300'}`}`}>
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Konum' : 'Position'}</label>
                <select className={inputCls} value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Ölçek' : 'Scale'}</label>
                <select className={inputCls} value={form.scale} onChange={e => setForm({ ...form, scale: e.target.value })}>
                  {SCALES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Çapa (Anchor)' : 'Anchor'}</label>
                <select className={inputCls} value={form.anchor} onChange={e => setForm({ ...form, anchor: e.target.value })}>
                  {ANCHORS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Bekleme (cooldown ms)' : 'Cooldown (ms)'}</label>
                <input type="number" className={inputCls} value={form.cooldownMs} onChange={e => setForm({ ...form, cooldownMs: Number(e.target.value) })} />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Durum' : 'Status'}</label>
                <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${subText}`}>{isTr ? 'Sıralama' : 'Sort Order'}</label>
                <input type="number" className={inputCls} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={saveAnimation} disabled={saving}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {isTr ? 'Kaydet' : 'Save'}
              </button>
              <button onClick={() => setPreview({ ...(form as PreviewAnimation) })}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" /> {isTr ? 'Önizle' : 'Preview'}
              </button>
              <button onClick={() => setShowForm(false)} className={`px-4 py-2 rounded-lg text-sm ${isMystical ? 'bg-white/5 text-white' : 'bg-gray-100'}`}>
                {isTr ? 'İptal' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimationPreviewModal animation={preview} onClose={() => setPreview(null)} isTr={isTr} />
    </div>
  )
}
