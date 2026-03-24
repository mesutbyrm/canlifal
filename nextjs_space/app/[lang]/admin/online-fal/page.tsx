'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, ArrowLeft, ExternalLink, Layout, GripVertical, ChevronUp, ChevronDown, Eye, EyeOff, Plus, Pencil, Trash2, X, Save } from 'lucide-react'

const colorThemes = [
  { name: 'Mor', bg: 'from-purple-600/30 to-fuchsia-600/30', border: 'border-purple-400/50', text: 'text-purple-200' },
  { name: 'Mavi', bg: 'from-blue-600/30 to-cyan-600/30', border: 'border-blue-400/50', text: 'text-blue-200' },
  { name: 'Yeşil', bg: 'from-emerald-600/30 to-teal-600/30', border: 'border-emerald-400/50', text: 'text-emerald-200' },
  { name: 'Pembe', bg: 'from-pink-600/30 to-rose-600/30', border: 'border-pink-400/50', text: 'text-pink-200' },
  { name: 'Turuncu', bg: 'from-amber-600/30 to-orange-600/30', border: 'border-amber-400/50', text: 'text-amber-200' },
  { name: 'Kırmızı', bg: 'from-red-600/30 to-rose-600/30', border: 'border-red-400/50', text: 'text-red-200' },
  { name: 'İndigo', bg: 'from-indigo-600/30 to-violet-600/30', border: 'border-indigo-400/50', text: 'text-indigo-200' },
  { name: 'Cyan', bg: 'from-cyan-600/30 to-teal-600/30', border: 'border-cyan-400/50', text: 'text-cyan-200' },
]

const iconOptions = ['🎮', '🎁', '📚', '🌙', '💬', '👥', '✨', '🔮', '🎨', '🎵', '❤️', '🚀', '🌟', '💡', '🔗', '🏠']

export default function AdminOnlineFalPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession() || {}
  const lang = (params?.lang as string) || 'tr'
  const isAdmin = ['admin','yonetici','moderator','finans'].includes((session?.user as any)?.role)

  const [sections, setSections] = useState<any[]>([])
  const [buttons, setButtons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingButton, setEditingButton] = useState<any>(null)
  const [buttonForm, setButtonForm] = useState({ label: '', icon: '🔗', href: '', colorIndex: 0 })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [sectionsRes, buttonsRes] = await Promise.all([
        fetch('/api/admin/online-fal/sections'),
        fetch('/api/admin/online-fal/buttons'),
      ])
      if (sectionsRes.ok) {
        const data = await sectionsRes.json()
        setSections(data.sections || [])
      }
      if (buttonsRes.ok) {
        const data = await buttonsRes.json()
        setButtons(data.buttons || [])
      }
    } catch (e) {
      console.error('Fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleSection = async (section: any) => {
    const newVisible = !section.isVisible
    setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, isVisible: newVisible } : s)))
    await fetch('/api/admin/online-fal/sections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: section.id, isVisible: newVisible }),
    })
  }

  const reorderSections = async (index: number, direction: 'up' | 'down') => {
    const arr = [...sections]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= arr.length) return
    ;[arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]]
    const order = arr.map((s, i) => ({ id: s.id, sortOrder: i }))
    setSections(arr.map((s, i) => ({ ...s, sortOrder: i })))
    await fetch('/api/admin/online-fal/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    })
  }

  const toggleButton = async (btn: any) => {
    const newVisible = !btn.isVisible
    setButtons((prev) => prev.map((b) => (b.id === btn.id ? { ...b, isVisible: newVisible } : b)))
    await fetch('/api/admin/online-fal/buttons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: btn.id, isVisible: newVisible }),
    })
  }

  const reorderButtons = async (index: number, direction: 'up' | 'down') => {
    const arr = [...buttons]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= arr.length) return
    ;[arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]]
    setButtons(arr.map((b, i) => ({ ...b, sortOrder: i })))
    for (let i = 0; i < arr.length; i++) {
      await fetch('/api/admin/online-fal/buttons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: arr[i].id, sortOrder: i }),
      })
    }
  }

  const deleteButton = async (id: string) => {
    if (!confirm('Bu butonu silmek istediğinize emin misiniz?')) return
    setButtons((prev) => prev.filter((b) => b.id !== id))
    await fetch(`/api/admin/online-fal/buttons?id=${id}`, { method: 'DELETE' })
  }

  const openModal = (btn?: any) => {
    if (btn) {
      setEditingButton(btn)
      const colorIdx = colorThemes.findIndex((c) => c.bg === btn.bgColor)
      setButtonForm({ label: btn.label, icon: btn.icon, href: btn.href, colorIndex: colorIdx >= 0 ? colorIdx : 0 })
    } else {
      setEditingButton(null)
      setButtonForm({ label: '', icon: '🔗', href: '', colorIndex: 0 })
    }
    setShowModal(true)
  }

  const saveButton = async () => {
    if (!buttonForm.label.trim() || !buttonForm.href.trim()) return
    setSaving(true)
    const color = colorThemes[buttonForm.colorIndex]
    try {
      if (editingButton) {
        const res = await fetch('/api/admin/online-fal/buttons', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingButton.id,
            label: buttonForm.label.trim(),
            icon: buttonForm.icon,
            href: buttonForm.href.trim(),
            bgColor: color.bg,
            borderColor: color.border,
            textColor: color.text,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setButtons((prev) => prev.map((b) => (b.id === data.button.id ? data.button : b)))
        }
      } else {
        const res = await fetch('/api/admin/online-fal/buttons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: buttonForm.label.trim(),
            icon: buttonForm.icon,
            href: buttonForm.href.trim(),
            bgColor: color.bg,
            borderColor: color.border,
            textColor: color.text,
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
      setSaving(false)
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
            <h1 className="text-xl font-bold text-white">Online Fal Sayfası Yönetimi</h1>
            <p className="text-gray-500 text-xs">Sayfa bölümlerini ve butonları yönetin</p>
          </div>
          <a
            href={`/${lang}/online-fal`}
            target="_blank"
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs hover:bg-fuchsia-600/30 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Sayfayı Gör
          </a>
        </div>

        {/* Sections */}
        <div className="mb-8">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <Layout className="w-5 h-5 text-fuchsia-400" />
            Sayfa Bölümleri
          </h2>
          <p className="text-gray-500 text-xs mb-4">Bölümleri göster/gizle ve sırasını değiştirin</p>
          <div className="space-y-2">
            {sections.map((section, idx) => (
              <div
                key={section.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  section.isVisible ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-red-500/5 border-red-500/15 opacity-60'
                }`}
              >
                <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="text-lg">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{section.title}</p>
                  <p className="text-gray-600 text-[10px]">{section.key}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => reorderSections(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => reorderSections(idx, 'down')}
                    disabled={idx === sections.length - 1}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleSection(section)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      section.isVisible
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                    }`}
                  >
                    {section.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                🚀 Hızlı Erişim Butonları
              </h2>
              <p className="text-gray-500 text-xs mt-1">
                Butonları ekleyin, düzenleyin ve nereye yönlendireceğini ayarlayın
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
                <div
                  key={btn.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    btn.isVisible ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-red-500/5 border-red-500/15 opacity-60'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span className="text-lg">{btn.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{btn.label}</p>
                    <p className="text-gray-600 text-[10px] truncate">{btn.href}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => reorderButtons(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => reorderButtons(idx, 'down')}
                      disabled={idx === buttons.length - 1}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleButton(btn)}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
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
              className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 p-6"
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
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setButtonForm((prev) => ({ ...prev, icon }))}
                      className={`w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition-all ${
                        buttonForm.icon === icon
                          ? 'bg-fuchsia-500/20 border-fuchsia-400/50 scale-110'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs font-medium mb-1.5 block">Buton Adı</label>
                <input
                  type="text"
                  value={buttonForm.label}
                  onChange={(e) => setButtonForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="Örn: Oyun Merkezi"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
                />
              </div>

              {/* URL */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs font-medium mb-1.5 block">Hedef URL/Yol</label>
                <input
                  type="text"
                  value={buttonForm.href}
                  onChange={(e) => setButtonForm((prev) => ({ ...prev, href: e.target.value }))}
                  placeholder="Örn: /oyunlar veya /blog"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
                />
                <p className="text-gray-600 text-[10px] mt-1">
                  Site içi yol (/oyunlar) veya dış URL (https://...) kullanabilirsiniz
                </p>
              </div>

              {/* Color theme */}
              <div className="mb-6">
                <label className="text-gray-400 text-xs font-medium mb-2 block">Renk Teması</label>
                <div className="grid grid-cols-4 gap-2">
                  {colorThemes.map((theme, idx) => (
                    <button
                      key={idx}
                      onClick={() => setButtonForm((prev) => ({ ...prev, colorIndex: idx }))}
                      className={`p-2 rounded-lg bg-gradient-to-br ${theme.bg} border ${theme.border} text-center transition-all ${
                        buttonForm.colorIndex === idx ? 'ring-2 ring-fuchsia-400 scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className={`${theme.text} text-[10px] font-medium`}>{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="mb-6">
                <label className="text-gray-400 text-xs font-medium mb-2 block">Önizleme</label>
                <div className="flex justify-center">
                  <div
                    className={`flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br ${colorThemes[buttonForm.colorIndex].bg} border ${colorThemes[buttonForm.colorIndex].border} ${colorThemes[buttonForm.colorIndex].text} w-24`}
                  >
                    <span className="text-2xl mb-1.5">{buttonForm.icon}</span>
                    <span className="text-xs font-medium text-center leading-tight">{buttonForm.label || 'Buton'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={saveButton}
                  disabled={!buttonForm.label.trim() || !buttonForm.href.trim() || saving}
                  className="flex-1 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> {editingButton ? 'Güncelle' : 'Ekle'}
                    </>
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
