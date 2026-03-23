'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Eye, EyeOff, GripVertical, Plus, Pencil, Trash2,
  X, Loader2, ChevronUp, ChevronDown, ExternalLink, Home
} from 'lucide-react'

interface HomepageButton {
  id: string
  key: string
  label: string
  icon: string
  href: string
  isVisible: boolean
  sortOrder: number
  specialBehavior: string | null
}

const POPULAR_ICONS = [
  '🎮', '🎁', '📹', '👥', '💬', '📖', '🌙', '✨',
  '🔮', '🎨', '🎵', '❤️', '🚀', '🌟', '💡', '🔗',
  '🏠', '🎯', '🛒', '📷', '🎪', '🃏', '🧿', '🪬',
  '☕', '🌈', '💎', '🔔', '📚', '🎲', '🌸', '🦋',
]

const SPECIAL_BEHAVIORS = [
  { value: '', label: 'Normal (Yönlendirme)' },
  { value: 'bana-ozel', label: 'Bana Özel Popup' },
  { value: 'teller', label: 'Falcı (Rol Tabanlı)' },
]

export default function AdminHomepageButtonsPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession() || {}
  const lang = (params?.lang as string) || 'tr'
  const isAdmin = (session?.user as any)?.role === 'admin'

  const [buttons, setButtons] = useState<HomepageButton[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingButton, setEditingButton] = useState<HomepageButton | null>(null)
  const [modalForm, setModalForm] = useState({
    label: '',
    icon: '🔗',
    href: '',
    specialBehavior: '',
  })
  const [modalSaving, setModalSaving] = useState(false)

  const fetchButtons = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/homepage-buttons')
      if (res.ok) {
        const data = await res.json()
        setButtons(data.buttons || [])
      }
    } catch (e) {
      console.error('Fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) fetchButtons()
  }, [isAdmin, fetchButtons])

  // Toggle visibility
  const toggleVisibility = async (btn: HomepageButton) => {
    const newVis = !btn.isVisible
    setButtons((prev) => prev.map((b) => (b.id === btn.id ? { ...b, isVisible: newVis } : b)))
    await fetch('/api/admin/homepage-buttons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: btn.id, isVisible: newVis }),
    })
  }

  // Move up/down
  const moveButton = async (index: number, direction: 'up' | 'down') => {
    const newButtons = [...buttons]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newButtons.length) return
    ;[newButtons[index], newButtons[target]] = [newButtons[target], newButtons[index]]
    const reordered = newButtons.map((b, i) => ({ ...b, sortOrder: i }))
    setButtons(reordered)
    // Batch reorder
    await fetch('/api/admin/homepage-buttons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reorder: reordered.map((b) => ({ id: b.id, sortOrder: b.sortOrder })) }),
    })
  }

  // Delete
  const deleteButton = async (id: string) => {
    if (!confirm('Bu butonu silmek istediğinize emin misiniz?')) return
    setButtons((prev) => prev.filter((b) => b.id !== id))
    await fetch(`/api/admin/homepage-buttons?id=${id}`, { method: 'DELETE' })
  }

  // Open modal
  const openModal = (btn?: HomepageButton) => {
    if (btn) {
      setEditingButton(btn)
      setModalForm({
        label: btn.label,
        icon: btn.icon,
        href: btn.href,
        specialBehavior: btn.specialBehavior || '',
      })
    } else {
      setEditingButton(null)
      setModalForm({ label: '', icon: '🔗', href: '', specialBehavior: '' })
    }
    setShowModal(true)
  }

  // Save button
  const saveButton = async () => {
    if (!modalForm.label.trim() || !modalForm.href.trim()) return
    setModalSaving(true)
    try {
      if (editingButton) {
        const res = await fetch('/api/admin/homepage-buttons', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingButton.id,
            label: modalForm.label.trim(),
            icon: modalForm.icon,
            href: modalForm.href.trim(),
            specialBehavior: modalForm.specialBehavior || null,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setButtons((prev) => prev.map((b) => (b.id === data.button.id ? data.button : b)))
        }
      } else {
        const res = await fetch('/api/admin/homepage-buttons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: modalForm.label.trim(),
            icon: modalForm.icon,
            href: modalForm.href.trim(),
            specialBehavior: modalForm.specialBehavior || null,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setButtons((prev) => [...prev, data.button])
        }
      }
      setShowModal(false)
    } catch (e) {
      console.error('Save button error', e)
    } finally {
      setModalSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Yetkisiz erişim</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Ana Sayfa Butonları</h1>
            <p className="text-gray-500 text-xs">Butonları ekleyin, düzenleyin, sıralayın ve görünürlüğünü yönetin</p>
          </div>
          <a
            href={`/${lang}`}
            target="_blank"
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs hover:bg-fuchsia-600/30 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ana Sayfayı Gör
          </a>
        </div>

        {/* Buttons list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                <Home className="w-5 h-5 text-fuchsia-400" />
                Buton Listesi
              </h2>
              <p className="text-gray-500 text-xs mt-1">
                {buttons.filter(b => b.isVisible).length} aktif / {buttons.length} toplam buton
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Yeni Buton
            </button>
          </div>

          {buttons.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
              <p className="text-gray-500 text-sm">Henüz buton eklenmemiş</p>
              <button
                onClick={() => openModal()}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 rounded-lg text-sm hover:bg-fuchsia-600/30 transition-colors"
              >
                <Plus className="w-4 h-4" /> İlk Butonu Ekle
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {buttons.map((btn, idx) => (
                <motion.div
                  key={btn.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    btn.isVisible
                      ? 'bg-white/[0.03] border-white/[0.08]'
                      : 'bg-red-500/5 border-red-500/15 opacity-60'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span className="text-xl">{btn.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium">{btn.label}</p>
                      {btn.specialBehavior && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[9px] font-medium">
                          {btn.specialBehavior === 'bana-ozel' ? 'Popup' : btn.specialBehavior === 'teller' ? 'Rol' : btn.specialBehavior}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-[10px] truncate">{btn.href} · key: {btn.key}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveButton(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveButton(idx, 'down')}
                      disabled={idx === buttons.length - 1}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleVisibility(btn)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        btn.isVisible
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      {btn.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => openModal(btn)}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteButton(btn.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Preview section */}
        <div className="mt-8">
          <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-fuchsia-400" />
            Ana Sayfa Önizleme
          </h2>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${Math.min(buttons.filter(b => b.isVisible).length, 4)}, 1fr)`,
              }}
            >
              {buttons.filter(b => b.isVisible).map((btn) => (
                <div
                  key={btn.id}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-purple-600/20 to-fuchsia-600/20 border border-purple-400/30"
                >
                  <span className="text-xl mb-1">{btn.icon}</span>
                  <span className="text-[10px] text-purple-200 font-medium text-center leading-tight">{btn.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold text-lg">
                  {editingButton ? 'Buton Düzenle' : 'Yeni Buton Ekle'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Icon picker */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs font-medium mb-2 block">İkon</label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setModalForm((f) => ({ ...f, icon }))}
                      className={`w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition-all ${
                        modalForm.icon === icon
                          ? 'bg-fuchsia-500/20 border-fuchsia-400/50 scale-110'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                {/* Custom emoji input */}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={modalForm.icon}
                    onChange={(e) => setModalForm((f) => ({ ...f, icon: e.target.value }))}
                    className="w-16 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-center text-lg focus:outline-none focus:border-fuchsia-500/50"
                    maxLength={4}
                  />
                  <span className="text-gray-600 text-[10px]">veya özel emoji yazın</span>
                </div>
              </div>

              {/* Label */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs font-medium mb-1.5 block">Buton Adı</label>
                <input
                  type="text"
                  value={modalForm.label}
                  onChange={(e) => setModalForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Örn: Oyun Merkezi"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
                />
              </div>

              {/* Href */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs font-medium mb-1.5 block">Hedef URL/Yol</label>
                <input
                  type="text"
                  value={modalForm.href}
                  onChange={(e) => setModalForm((f) => ({ ...f, href: e.target.value }))}
                  placeholder="Örn: /oyunlar veya /blog"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
                />
                <p className="text-gray-600 text-[10px] mt-1">Site içi yol (/oyunlar) veya dış URL (https://...) kullanabilirsiniz</p>
              </div>

              {/* Special behavior */}
              <div className="mb-6">
                <label className="text-gray-400 text-xs font-medium mb-1.5 block">Özel Davranış</label>
                <select
                  value={modalForm.specialBehavior}
                  onChange={(e) => setModalForm((f) => ({ ...f, specialBehavior: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-fuchsia-500/50 transition-colors"
                >
                  {SPECIAL_BEHAVIORS.map((sb) => (
                    <option key={sb.value} value={sb.value} className="bg-gray-900">
                      {sb.label}
                    </option>
                  ))}
                </select>
                <p className="text-gray-600 text-[10px] mt-1">
                  "Bana Özel Popup" seçerseniz buton tıklandığında popup açılır. "Falcı" seçerseniz kullanıcının rolüne göre farklı davranır.
                </p>
              </div>

              {/* Preview */}
              <div className="mb-6">
                <label className="text-gray-400 text-xs font-medium mb-2 block">Önizleme</label>
                <div className="flex justify-center">
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-purple-600/20 to-fuchsia-600/20 border border-purple-400/30 w-24">
                    <span className="text-2xl mb-1.5">{modalForm.icon}</span>
                    <span className="text-xs font-medium text-center leading-tight text-purple-200">{modalForm.label || 'Buton'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={saveButton}
                  disabled={modalSaving || !modalForm.label.trim() || !modalForm.href.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-fuchsia-600 text-white text-sm font-medium hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {modalSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingButton ? (
                    'Kaydet'
                  ) : (
                    'Ekle'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
