'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Eye, EyeOff, GripVertical, Plus, Pencil, Trash2, Save,
  X, Loader2, ChevronUp, ChevronDown, ExternalLink, Sparkles
} from 'lucide-react'

interface Section {
  id: string
  key: string
  title: string
  icon: string
  isVisible: boolean
  sortOrder: number
}

interface ButtonItem {
  id: string
  label: string
  icon: string
  href: string
  isVisible: boolean
  sortOrder: number
  bgColor: string
  borderColor: string
  textColor: string
}

const PRESET_COLORS = [
  { name: 'Mor', bg: 'from-purple-600/30 to-fuchsia-600/30', border: 'border-purple-400/50', text: 'text-purple-200' },
  { name: 'Mavi', bg: 'from-blue-600/30 to-cyan-600/30', border: 'border-blue-400/50', text: 'text-blue-200' },
  { name: 'Ye\u015fil', bg: 'from-emerald-600/30 to-teal-600/30', border: 'border-emerald-400/50', text: 'text-emerald-200' },
  { name: 'Pembe', bg: 'from-pink-600/30 to-rose-600/30', border: 'border-pink-400/50', text: 'text-pink-200' },
  { name: 'Turuncu', bg: 'from-amber-600/30 to-orange-600/30', border: 'border-amber-400/50', text: 'text-amber-200' },
  { name: 'K\u0131rm\u0131z\u0131', bg: 'from-red-600/30 to-rose-600/30', border: 'border-red-400/50', text: 'text-red-200' },
  { name: '\u0130ndigo', bg: 'from-indigo-600/30 to-violet-600/30', border: 'border-indigo-400/50', text: 'text-indigo-200' },
  { name: 'Cyan', bg: 'from-cyan-600/30 to-teal-600/30', border: 'border-cyan-400/50', text: 'text-cyan-200' },
]

const POPULAR_ICONS = ['\ud83c\udfae', '\ud83c\udf81', '\ud83d\udcda', '\ud83c\udf19', '\ud83d\udcac', '\ud83d\udc65', '\u2728', '\ud83d\udd2e', '\ud83c\udfa8', '\ud83c\udfb5', '\u2764\ufe0f', '\ud83d\ude80', '\ud83c\udf1f', '\ud83d\udca1', '\ud83d\udd17', '\ud83c\udfe0']

export default function AdminOnlineFalPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession() || {}
  const lang = (params?.lang as string) || 'tr'
  const isAdmin = (session?.user as any)?.role === 'admin'

  const [sections, setSections] = useState<Section[]>([])
  const [buttons, setButtons] = useState<ButtonItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Button modal
  const [showModal, setShowModal] = useState(false)
  const [editingButton, setEditingButton] = useState<ButtonItem | null>(null)
  const [modalForm, setModalForm] = useState({ label: '', icon: '\ud83d\udd17', href: '', colorIndex: 0 })
  const [modalSaving, setModalSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [secRes, btnRes] = await Promise.all([
        fetch('/api/admin/online-fal/sections'),
        fetch('/api/admin/online-fal/buttons'),
      ])
      if (secRes.ok) {
        const d = await secRes.json()
        setSections(d.sections || [])
      }
      if (btnRes.ok) {
        const d = await btnRes.json()
        setButtons(d.buttons || [])
      }
    } catch (e) {
      console.error('Fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) fetchData()
  }, [isAdmin, fetchData])

  // Toggle section visibility
  const toggleSection = async (section: Section) => {
    const newVis = !section.isVisible
    setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, isVisible: newVis } : s)))
    await fetch('/api/admin/online-fal/sections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: section.id, isVisible: newVis }),
    })
  }

  // Move section up/down
  const moveSection = async (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newSections.length) return
    ;[newSections[index], newSections[target]] = [newSections[target], newSections[index]]
    const order = newSections.map((s, i) => ({ id: s.id, sortOrder: i }))
    setSections(newSections.map((s, i) => ({ ...s, sortOrder: i })))
    await fetch('/api/admin/online-fal/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    })
  }

  // Toggle button visibility
  const toggleButton = async (btn: ButtonItem) => {
    const newVis = !btn.isVisible
    setButtons((prev) => prev.map((b) => (b.id === btn.id ? { ...b, isVisible: newVis } : b)))
    await fetch('/api/admin/online-fal/buttons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: btn.id, isVisible: newVis }),
    })
  }

  // Move button up/down
  const moveButton = async (index: number, direction: 'up' | 'down') => {
    const newButtons = [...buttons]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newButtons.length) return
    ;[newButtons[index], newButtons[target]] = [newButtons[target], newButtons[index]]
    setButtons(newButtons.map((b, i) => ({ ...b, sortOrder: i })))
    // Save each reorder
    for (let i = 0; i < newButtons.length; i++) {
      await fetch('/api/admin/online-fal/buttons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newButtons[i].id, sortOrder: i }),
      })
    }
  }

  // Delete button
  const deleteButton = async (id: string) => {
    if (!confirm('Bu butonu silmek istedi\u011finize emin misiniz?')) return
    setButtons((prev) => prev.filter((b) => b.id !== id))
    await fetch(`/api/admin/online-fal/buttons?id=${id}`, { method: 'DELETE' })
  }

  // Open modal for new or edit
  const openModal = (btn?: ButtonItem) => {
    if (btn) {
      setEditingButton(btn)
      const colorIdx = PRESET_COLORS.findIndex((c) => c.bg === btn.bgColor)
      setModalForm({ label: btn.label, icon: btn.icon, href: btn.href, colorIndex: colorIdx >= 0 ? colorIdx : 0 })
    } else {
      setEditingButton(null)
      setModalForm({ label: '', icon: '\ud83d\udd17', href: '', colorIndex: 0 })
    }
    setShowModal(true)
  }

  // Save button (create or update)
  const saveButton = async () => {
    if (!modalForm.label.trim() || !modalForm.href.trim()) return
    setModalSaving(true)
    const color = PRESET_COLORS[modalForm.colorIndex]
    try {
      if (editingButton) {
        const res = await fetch('/api/admin/online-fal/buttons', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingButton.id,
            label: modalForm.label.trim(),
            icon: modalForm.icon,
            href: modalForm.href.trim(),
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
            label: modalForm.label.trim(),
            icon: modalForm.icon,
            href: modalForm.href.trim(),
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
      setModalSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Yetkisiz eri\u015fim</p>
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
            onClick={() => router.push(`/${lang}/admin`)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Online Fal Sayfas\u0131 Y\u00f6netimi</h1>
            <p className="text-gray-500 text-xs">Sayfa b\u00f6l\u00fcmlerini ve butonlar\u0131 y\u00f6netin</p>
          </div>
          <a
            href={`/${lang}/online-fal`}
            target="_blank"
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs hover:bg-fuchsia-600/30 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Sayfay\u0131 G\u00f6r
          </a>
        </div>

        {/* SECTIONS MANAGEMENT */}
        <div className="mb-8">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-fuchsia-400" />
            Sayfa B\u00f6l\u00fcmleri
          </h2>
          <p className="text-gray-500 text-xs mb-4">B\u00f6l\u00fcmleri g\u00f6ster/gizle ve s\u0131ras\u0131n\u0131 de\u011fi\u015ftirin</p>

          <div className="space-y-2">
            {sections.map((section, idx) => (
              <div
                key={section.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  section.isVisible
                    ? 'bg-white/[0.03] border-white/[0.08]'
                    : 'bg-red-500/5 border-red-500/15 opacity-60'
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
                    onClick={() => moveSection(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveSection(idx, 'down')}
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

        {/* BUTTONS MANAGEMENT */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                \ud83d\ude80 H\u0131zl\u0131 Eri\u015fim Butonlar\u0131
              </h2>
              <p className="text-gray-500 text-xs mt-1">Butonlar\u0131 ekleyin, d\u00fczenleyin ve nereye y\u00f6nlendirece\u011fini ayarlay\u0131n</p>
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
              <p className="text-gray-500 text-sm">Hen\u00fcz buton eklenmemi\u015f</p>
              <button
                onClick={() => openModal()}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 rounded-lg text-sm hover:bg-fuchsia-600/30 transition-colors"
              >
                <Plus className="w-4 h-4" /> \u0130lk Butonu Ekle
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {buttons.map((btn, idx) => (
                <div
                  key={btn.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    btn.isVisible
                      ? 'bg-white/[0.03] border-white/[0.08]'
                      : 'bg-red-500/5 border-red-500/15 opacity-60'
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

      {/* BUTTON MODAL */}
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
                  {editingButton ? 'Buton D\u00fczenle' : 'Yeni Buton Ekle'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Icon picker */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs font-medium mb-2 block">\u0130kon</label>
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
              </div>

              {/* Label */}
              <div className="mb-4">
                <label className="text-gray-400 text-xs font-medium mb-1.5 block">Buton Ad\u0131</label>
                <input
                  type="text"
                  value={modalForm.label}
                  onChange={(e) => setModalForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="\u00d6rn: Oyun Merkezi"
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
                  placeholder="\u00d6rn: /games veya /blog"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
                />
                <p className="text-gray-600 text-[10px] mt-1">Site i\u00e7i yol (/games) veya d\u0131\u015f URL (https://...) kullanabilirsiniz</p>
              </div>

              {/* Color picker */}
              <div className="mb-6">
                <label className="text-gray-400 text-xs font-medium mb-2 block">Renk Temas\u0131</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map((color, idx) => (
                    <button
                      key={idx}
                      onClick={() => setModalForm((f) => ({ ...f, colorIndex: idx }))}
                      className={`p-2 rounded-lg bg-gradient-to-br ${color.bg} border ${color.border} text-center transition-all ${
                        modalForm.colorIndex === idx ? 'ring-2 ring-fuchsia-400 scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className={`${color.text} text-[10px] font-medium`}>{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="mb-6">
                <label className="text-gray-400 text-xs font-medium mb-2 block">\u00d6nizleme</label>
                <div className="flex justify-center">
                  <div
                    className={`flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br ${PRESET_COLORS[modalForm.colorIndex].bg} border ${PRESET_COLORS[modalForm.colorIndex].border} ${PRESET_COLORS[modalForm.colorIndex].text} w-24`}
                  >
                    <span className="text-2xl mb-1.5">{modalForm.icon}</span>
                    <span className="text-xs font-medium text-center leading-tight">{modalForm.label || 'Buton'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  \u0130ptal
                </button>
                <button
                  onClick={saveButton}
                  disabled={!modalForm.label.trim() || !modalForm.href.trim() || modalSaving}
                  className="flex-1 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {modalSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><Save className="w-4 h-4" /> {editingButton ? 'G\u00fcncelle' : 'Ekle'}</>
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
