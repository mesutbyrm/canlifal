'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, ArrowLeft, X, Save, RefreshCw, Zap, Send } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import AdminBackButton from '@/components/admin-back-button'

interface PopupButton {
  label: string
  href: string
  color?: string
}

interface AdminPopup {
  id: string
  title: string
  message: string
  buttons: string | PopupButton[]
  isActive: boolean
  showTo: string
  popupType: string
  priority: number
  maxShowCount: number
  showOnRefresh: boolean
  showDelaySeconds: number
  lastSentAt: string
  createdAt: string
  updatedAt: string
}

const POPUP_TYPES = [
  { value: 'custom', label: 'Özel Popup', icon: '📝' },
  { value: 'live_streams', label: 'Canlı Yayınlar', icon: '📺' },
  { value: 'chat_rooms', label: 'Sohbet Odaları', icon: '💬' },
]

const SHOW_TO_OPTIONS = [
  { value: 'all', label: 'Herkese' },
  { value: 'logged_in', label: 'Sadece Üyeler' },
  { value: 'guests', label: 'Sadece Ziyaretçiler' },
]

const COLOR_OPTIONS = [
  { value: 'from-purple-600 to-fuchsia-600', label: 'Mor' },
  { value: 'from-blue-600 to-indigo-600', label: 'Mavi' },
  { value: 'from-red-600 to-orange-600', label: 'Kırmızı' },
  { value: 'from-emerald-600 to-teal-600', label: 'Yeşil' },
  { value: 'from-amber-600 to-yellow-600', label: 'Sarı' },
  { value: 'from-pink-600 to-rose-600', label: 'Pembe' },
]

const PAGE_OPTIONS = [
  { value: '/', label: 'Ana Sayfa' },
  { value: '/fallar', label: 'Fallar' },
  { value: '/fallar/burc-yorumu', label: 'Burç Yorumu' },
  { value: '/fallar/kahve-fali', label: 'Kahve Falı' },
  { value: '/fallar/tarot-fali', label: 'Tarot Falı' },
  { value: '/fallar/ruya-yorumu', label: 'Rüya Yorumu' },
  { value: '/canli-falcilar', label: 'Canlı Falcılar' },
  { value: '/sohbet/video', label: 'Canlı Yayınlar' },
  { value: '/sohbet', label: 'Sohbet' },
  { value: '/sosyal', label: 'Sosyal Paylaşım' },
  { value: '/oyunlar', label: 'Oyunlar' },
  { value: '/blog', label: 'Blog' },
  { value: '/ruya', label: 'Rüya Tabiri' },
  { value: '/jeton', label: 'Jeton Satın Al' },
  { value: '/hediyeler', label: 'Hediyeler' },
  { value: '/siralama', label: 'Sıralama' },
  { value: '/profil', label: 'Profil' },
]

// Preset auto-fill templates for quick popup creation
const PRESET_TEMPLATES = [
  {
    label: '🔮 Hoş Geldiniz',
    title: 'Hoş Geldiniz! 🔮',
    message: 'Bugün sizi neler bekliyor? Hemen keşfetmeye başlayın!',
    popupType: 'custom',
    buttons: [
      { label: '🌟 Günlük Burcunuz', href: '/fallar/burc-yorumu', color: 'from-purple-600 to-fuchsia-600' },
      { label: '💬 Sohbet Et', href: '/sohbet', color: 'from-blue-600 to-indigo-600' },
    ],
  },
  {
    label: '📺 Canlı Yayın Daveti',
    title: 'Canlı Yayınlar Başladı! 📺',
    message: 'Şu anda canlı yayınlar devam ediyor, hemen katılın!',
    popupType: 'live_streams',
    buttons: [
      { label: '📺 Tüm Yayınları Gör', href: '/sohbet/video', color: 'from-red-600 to-orange-600' },
    ],
  },
  {
    label: '💬 Sohbet Odası Daveti',
    title: 'Sohbet Odaları Aktif! 💬',
    message: 'En popüler odalarda sohbet devam ediyor, siz de katılın!',
    popupType: 'chat_rooms',
    buttons: [
      { label: '💬 Tüm Odalar', href: '/sohbet', color: 'from-blue-600 to-indigo-600' },
    ],
  },
  {
    label: '🎮 Oyun Etkinliği',
    title: 'Oyun Zamanı! 🎮',
    message: 'Eğlenceli oyunlar sizi bekliyor, hemen oynayın ve puanlarınızı artırın!',
    popupType: 'custom',
    buttons: [
      { label: '🎮 Oyunlara Git', href: '/oyunlar', color: 'from-amber-600 to-yellow-600' },
    ],
  },
  {
    label: '⭐ Jeton Kampanyası',
    title: 'Özel Kampanya! ⭐',
    message: 'Jeton satın alın ve ayrıcalıklı özelliklerin keyfini çıkarın!',
    popupType: 'custom',
    buttons: [
      { label: '💎 Jeton Satın Al', href: '/jeton', color: 'from-amber-600 to-yellow-600' },
      { label: '🎁 Hediyeler', href: '/hediyeler', color: 'from-pink-600 to-rose-600' },
    ],
  },
  {
    label: '🔮 Fal Baktırma Daveti',
    title: 'Falınıza Baktırın! 🔮',
    message: 'Canlı falcılarımız sizi bekliyor. Geleceğinizi keşfedin!',
    popupType: 'custom',
    buttons: [
      { label: '👁️ Canlı Fal Baktır', href: '/canli-falcilar', color: 'from-pink-600 to-rose-600' },
      { label: '🔮 Falına Bak', href: '/fallar', color: 'from-purple-600 to-fuchsia-600' },
    ],
  },
  {
    label: '🌙 Rüya Yorumu',
    title: 'Rüyanızı Yorumlayın! 🌙',
    message: 'Gördüğünüz rüyanın anlamını hemen öğrenin.',
    popupType: 'custom',
    buttons: [
      { label: '🌙 Rüya Tabiri', href: '/ruya', color: 'from-indigo-600 to-blue-600' },
    ],
  },
]

const emptyPopup: Omit<AdminPopup, 'id' | 'createdAt' | 'updatedAt' | 'lastSentAt'> = {
  title: '',
  message: '',
  buttons: [],
  isActive: true,
  showTo: 'all',
  popupType: 'custom',
  priority: 0,
  maxShowCount: 1,
  showOnRefresh: false,
  showDelaySeconds: 1,
}

export default function AdminPopupsPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const [popups, setPopups] = useState<AdminPopup[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyPopup)
  const [buttons, setButtons] = useState<PopupButton[]>([])
  const [saving, setSaving] = useState(false)
  const [resending, setResending] = useState<string | null>(null)

  const isAdmin = session?.user && (session.user as any).role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    fetchPopups()
  }, [isAdmin])

  const fetchPopups = async () => {
    try {
      const res = await fetch('/api/admin/popups')
      if (res.ok) {
        const data = await res.json()
        setPopups(data)
      }
    } catch {}
    setLoading(false)
  }

  const openEditor = (popup?: AdminPopup) => {
    if (popup) {
      setEditingId(popup.id)
      const btns = typeof popup.buttons === 'string' ? JSON.parse(popup.buttons) : popup.buttons
      setForm({
        title: popup.title,
        message: popup.message,
        buttons: btns,
        isActive: popup.isActive,
        showTo: popup.showTo,
        popupType: popup.popupType,
        priority: popup.priority,
        maxShowCount: popup.maxShowCount ?? 0,
        showOnRefresh: popup.showOnRefresh ?? true,
        showDelaySeconds: popup.showDelaySeconds ?? 1,
      })
      setButtons(btns)
    } else {
      setEditingId(null)
      setForm({ ...emptyPopup })
      setButtons([])
    }
    setShowEditor(true)
  }

  const applyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setForm({
      ...form,
      title: preset.title,
      message: preset.message,
      popupType: preset.popupType,
    })
    setButtons(preset.buttons)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        buttons: JSON.stringify(buttons),
        maxShowCount: form.maxShowCount,
        showOnRefresh: form.showOnRefresh,
        showDelaySeconds: form.showDelaySeconds,
        ...(editingId && { id: editingId }),
      }
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch('/api/admin/popups', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setShowEditor(false)
        fetchPopups()
      }
    } catch {}
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu popup silinecek, emin misiniz?')) return
    try {
      const res = await fetch(`/api/admin/popups?id=${id}`, { method: 'DELETE' })
      if (res.ok) fetchPopups()
    } catch {}
  }

  const toggleActive = async (popup: AdminPopup) => {
    try {
      await fetch('/api/admin/popups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: popup.id, isActive: !popup.isActive }),
      })
      fetchPopups()
    } catch {}
  }

  const handleResend = async (popup: AdminPopup) => {
    setResending(popup.id)
    try {
      await fetch('/api/admin/popups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: popup.id, action: 'resend' }),
      })
      fetchPopups()
    } catch {}
    setTimeout(() => setResending(null), 1000)
  }

  const addButton = () => {
    setButtons([...buttons, { label: '', href: '/', color: 'from-purple-600 to-fuchsia-600' }])
  }

  const updateButton = (idx: number, field: string, value: string) => {
    const updated = [...buttons]
    updated[idx] = { ...updated[idx], [field]: value }
    setButtons(updated)
  }

  const removeButton = (idx: number) => {
    setButtons(buttons.filter((_, i) => i !== idx))
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <p className="text-white">Yetkisiz erişim</p>
      </div>
    )
  }

  const parseButtons = (b: string | PopupButton[]): PopupButton[] => {
    try {
      return typeof b === 'string' ? JSON.parse(b) : b
    } catch { return [] }
  }

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return d }
  }

  return (
    <div className="min-h-screen bg-[#0a0118] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <AdminBackButton className="p-2 rounded-lg hover:bg-purple-900/30 transition-colors" />
            <div>
              <h1 className="text-2xl font-bold text-white">Popup Yönetimi</h1>
              <p className="text-purple-300/60 text-sm">Kullanıcılara gösterilecek popup&apos;ları yönetin</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openEditor()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-medium shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Yeni Popup
          </motion.button>
        </div>

        {/* Popup List */}
        {loading ? (
          <div className="text-center py-12 text-purple-300/60">Yükleniyor...</div>
        ) : popups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-purple-300/60 text-lg mb-2">Henüz popup oluşturulmamış</p>
            <p className="text-purple-400/40 text-sm">Yeni Popup butonuna tıklayarak başlayın</p>
          </div>
        ) : (
          <div className="space-y-4">
            {popups.map((popup) => {
              const btns = parseButtons(popup.buttons)
              const typeInfo = POPUP_TYPES.find(t => t.value === popup.popupType)
              return (
                <motion.div
                  key={popup.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border transition-colors ${
                    popup.isActive
                      ? 'bg-purple-900/20 border-purple-500/30'
                      : 'bg-gray-900/30 border-gray-700/30 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{typeInfo?.icon || '📝'}</span>
                        <h3 className="font-bold text-white truncate">{popup.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          popup.isActive ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-400'
                        }`}>
                          {popup.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <p className="text-purple-200/60 text-sm truncate mb-2">{popup.message}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300">
                          {SHOW_TO_OPTIONS.find(o => o.value === popup.showTo)?.label || popup.showTo}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300">
                          {typeInfo?.label || popup.popupType}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300">
                          {btns.length} buton
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300">
                          Öncelik: {popup.priority}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300">
                          {popup.maxShowCount === 0 ? 'Sınırsız gösterim' : `Maks ${popup.maxShowCount} kez`}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300">
                          {popup.showOnRefresh ? 'Her yenilemede' : 'Oturum başına 1 kez'}
                        </span>
                        {popup.showDelaySeconds > 1 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300">
                            {popup.showDelaySeconds}sn gecikme
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300">
                          Son gönderim: {formatDate(popup.lastSentAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Resend Button */}
                      <button
                        onClick={() => handleResend(popup)}
                        disabled={resending === popup.id}
                        className={`p-2 rounded-lg transition-colors ${
                          resending === popup.id
                            ? 'bg-green-900/40 text-green-400'
                            : 'hover:bg-amber-900/30 text-amber-400 hover:text-amber-300'
                        }`}
                        title="Tekrar Gönder (kullanıcılara anında düşer)"
                      >
                        {resending === popup.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleActive(popup)}
                        className="p-2 rounded-lg hover:bg-purple-900/30 transition-colors"
                        title={popup.isActive ? 'Deaktif Et' : 'Aktif Et'}
                      >
                        {popup.isActive ? (
                          <ToggleRight className="w-5 h-5 text-green-400" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditor(popup)}
                        className="p-2 rounded-lg hover:bg-purple-900/30 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-purple-300" />
                      </button>
                      <button
                        onClick={() => handleDelete(popup.id)}
                        className="p-2 rounded-lg hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowEditor(false) }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#1a0a2e] border border-purple-500/30 rounded-2xl shadow-2xl mb-20"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
                <h2 className="text-lg font-bold text-white">
                  {editingId ? 'Popup Düzenle' : 'Yeni Popup Oluştur'}
                </h2>
                <button onClick={() => setShowEditor(false)} className="p-1.5 rounded-lg hover:bg-purple-900/30">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Preset Templates */}
                {!editingId && (
                  <div>
                    <label className="text-sm font-medium text-purple-200 mb-2 block flex items-center gap-1">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Hazır Şablonlar
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_TEMPLATES.map((preset, i) => (
                        <button
                          key={i}
                          onClick={() => applyPreset(preset)}
                          className="px-3 py-1.5 rounded-lg bg-purple-900/30 border border-purple-600/30 text-xs text-purple-200 hover:bg-purple-600/30 hover:border-purple-500 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popup Type */}
                <div>
                  <label className="text-sm font-medium text-purple-200 mb-1 block">Popup Türü</label>
                  <div className="grid grid-cols-3 gap-2">
                    {POPUP_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setForm({ ...form, popupType: type.value })}
                        className={`p-2.5 rounded-xl border text-center transition-colors ${
                          form.popupType === type.value
                            ? 'bg-purple-600/30 border-purple-500'
                            : 'bg-purple-900/20 border-purple-700/30 hover:border-purple-500/50'
                        }`}
                      >
                        <span className="text-xl">{type.icon}</span>
                        <p className="text-xs text-purple-200 mt-1">{type.label}</p>
                      </button>
                    ))}
                  </div>
                  {form.popupType === 'live_streams' && (
                    <p className="text-xs text-amber-400/70 mt-1">📺 En çok izlenen 3 canlı yayın otomatik gösterilecek</p>
                  )}
                  {form.popupType === 'chat_rooms' && (
                    <p className="text-xs text-amber-400/70 mt-1">💬 En kalabalık 2 sohbet odası otomatik gösterilecek</p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-purple-200 mb-1 block">Başlık</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-purple-900/30 border border-purple-500/30 text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400"
                    placeholder="Örn: Canlı yayınlar başladı!"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-sm font-medium text-purple-200 mb-1 block">Mesaj</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl bg-purple-900/30 border border-purple-500/30 text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400 resize-none"
                    placeholder="Kullanıcıya gösterilecek mesaj..."
                  />
                </div>

                {/* Show To & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-purple-200 mb-1 block">Kime Gösterilsin</label>
                    <select
                      value={form.showTo}
                      onChange={(e) => setForm({ ...form, showTo: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-purple-900/30 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400"
                    >
                      {SHOW_TO_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-purple-200 mb-1 block">Öncelik (yüksek = önce)</label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 rounded-xl bg-purple-900/30 border border-purple-500/30 text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                {/* Display Settings */}
                <div className="p-4 rounded-xl bg-purple-900/10 border border-purple-700/30 space-y-4">
                  <h4 className="text-sm font-bold text-purple-200 flex items-center gap-2">⚙️ Gösterim Ayarları</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-purple-300 mb-1 block">Maks Gösterim Sayısı</label>
                      <input
                        type="number"
                        min={0}
                        value={form.maxShowCount}
                        onChange={(e) => setForm({ ...form, maxShowCount: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-600/30 text-white text-sm focus:outline-none focus:border-purple-400"
                        placeholder="0"
                      />
                      <p className="text-[10px] text-purple-400/60 mt-1">0 = sınırsız, aksi halde kullanıcı başına max gösterim</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-purple-300 mb-1 block">Gösterim Gecikmesi (sn)</label>
                      <input
                        type="number"
                        min={0}
                        value={form.showDelaySeconds}
                        onChange={(e) => setForm({ ...form, showDelaySeconds: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-600/30 text-white text-sm focus:outline-none focus:border-purple-400"
                        placeholder="1"
                      />
                      <p className="text-[10px] text-purple-400/60 mt-1">Sayfa açıldıktan kaç saniye sonra gösterilsin</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-purple-900/20 border border-purple-700/30">
                    <div>
                      <span className="text-sm text-purple-200">Sayfa Yenilemede Tekrar Göster</span>
                      <p className="text-[10px] text-purple-400/60 mt-0.5">Kapalıysa aynı tarayıcı sekmesinde sadece 1 kez gösterilir</p>
                    </div>
                    <button
                      onClick={() => setForm({ ...form, showOnRefresh: !form.showOnRefresh })}
                      className="transition-colors flex-shrink-0"
                    >
                      {form.showOnRefresh ? (
                        <ToggleRight className="w-8 h-8 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Buttons Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-purple-200">Butonlar (Seçenekler)</label>
                    <button
                      onClick={addButton}
                      className="flex items-center gap-1 text-xs text-purple-300 hover:text-white px-2 py-1 rounded-lg bg-purple-900/30 hover:bg-purple-900/50 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Buton Ekle
                    </button>
                  </div>

                  {buttons.length === 0 ? (
                    <p className="text-purple-400/40 text-xs py-2">Henüz buton eklenmedi. &quot;Buton Ekle&quot; ile seçenek ekleyin.</p>
                  ) : (
                    <div className="space-y-3">
                      {buttons.map((btn, i) => (
                        <div key={i} className="p-3 rounded-xl bg-purple-900/20 border border-purple-700/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-purple-300 font-medium">Buton {i + 1}</span>
                            <button
                              onClick={() => removeButton(i)}
                              className="p-1 rounded hover:bg-red-900/30"
                            >
                              <X className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                          <input
                            value={btn.label}
                            onChange={(e) => updateButton(i, 'label', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-600/30 text-white text-sm placeholder-purple-400/40 focus:outline-none focus:border-purple-400"
                            placeholder="Buton Yazısı (örn: 🔮 Falına Bak)"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={btn.href}
                              onChange={(e) => updateButton(i, 'href', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-600/30 text-white text-sm focus:outline-none focus:border-purple-400"
                            >
                              {PAGE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <select
                              value={btn.color || 'from-purple-600 to-fuchsia-600'}
                              onChange={(e) => updateButton(i, 'color', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-600/30 text-white text-sm focus:outline-none focus:border-purple-400"
                            >
                              {COLOR_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-900/20 border border-purple-700/30">
                  <span className="text-sm text-purple-200">Aktif</span>
                  <button
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    className="transition-colors"
                  >
                    {form.isActive ? (
                      <ToggleRight className="w-8 h-8 text-green-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-500" />
                    )}
                  </button>
                </div>

                {/* Save Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving || !form.title || !form.message}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Oluştur'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
