'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
import AdminBackButton from '@/components/admin-back-button'
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Coins,
  Coffee,
  Loader2,
  GripVertical,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface FortuneRequestType {
  id: string
  name: string
  nameEn: string
  icon: string
  jetonCost: number
  description: string | null
  sortOrder: number
  isActive: boolean
}

const DEFAULT_ICONS = ['☕', '🔮', '🌟', '✨', '🎴', '💫', '🌙', '⭐', '❓', '💭']

export default function FortuneTypesAdminPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  
  const [types, setTypes] = useState<FortuneRequestType[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingType, setEditingType] = useState<FortuneRequestType | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    icon: '☕',
    jetonCost: 5,
    description: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/giris`)
    }
    fetchTypes()
  }, [status, language, router])

  const fetchTypes = async () => {
    try {
      const res = await fetch('/api/admin/fortune-request-types')
      if (res.ok) {
        const data = await res.json()
        setTypes(data)
      }
    } catch (e) {
      console.error('Error fetching types:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.name || !formData.nameEn || formData.jetonCost < 1) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/admin/fortune-request-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sortOrder: types.length
        })
      })
      
      if (res.ok) {
        await fetchTypes()
        setShowAddModal(false)
        resetForm()
      }
    } catch (e) {
      console.error('Error adding type:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingType) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/admin/fortune-request-types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingType.id,
          ...formData
        })
      })
      
      if (res.ok) {
        await fetchTypes()
        setEditingType(null)
        resetForm()
      }
    } catch (e) {
      console.error('Error updating type:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (type: FortuneRequestType) => {
    try {
      await fetch('/api/admin/fortune-request-types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: type.id,
          isActive: !type.isActive
        })
      })
      await fetchTypes()
    } catch (e) {
      console.error('Error toggling active:', e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu türü silmek istediğinize emin misiniz?')) return
    
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/fortune-request-types?id=${id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        await fetchTypes()
      }
    } catch (e) {
      console.error('Error deleting type:', e)
    } finally {
      setDeleting(null)
    }
  }

  const startEdit = (type: FortuneRequestType) => {
    setEditingType(type)
    setFormData({
      name: type.name,
      nameEn: type.nameEn,
      icon: type.icon,
      jetonCost: type.jetonCost,
      description: type.description || ''
    })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      nameEn: '',
      icon: '☕',
      jetonCost: 5,
      description: ''
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <AdminBackButton variant="link" className="p-2 bg-white/10 rounded-xl text-white hover:bg-white/20" label="" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              {'Fal İstek Türleri'}
            </h1>
            <p className="text-white/60 text-sm">
              {'Canlı yayında kullanılacak fal türlerini yönetin'}
            </p>
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="w-full mb-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {'Yeni Tür Ekle'}
        </button>

        {/* Types List */}
        <div className="space-y-3">
          {types.length === 0 ? (
            <div className="bg-white/10 rounded-xl p-8 text-center">
              <Coffee className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60">
                {'Henüz fal türü eklenmemiş'}
              </p>
            </div>
          ) : (
            types.map((type) => (
              <motion.div
                key={type.id}
                layout
                className={`bg-white/10 rounded-xl p-4 ${!type.isActive ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{type.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{type.name}</p>
                      {type.isActive ? (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Aktif</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">Pasif</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold text-sm flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {type.jetonCost} jeton
                      </span>
                      {type.description && (
                        <span className="text-white/50 text-xs">• {type.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(type)}
                      className={`p-2 rounded-lg ${type.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                    >
                      {type.isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => startEdit(type)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      disabled={deleting === type.id}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg"
                    >
                      {deleting === type.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-5 w-full max-w-md border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  {'Yeni Fal Türü'}
                </h2>
                <button onClick={() => setShowAddModal(false)}>
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Icon Selection */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">İkon</label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center ${formData.icon === icon ? 'bg-amber-500' : 'bg-white/10'}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Turkish Name */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Türkçe İsim</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: Tek Soru"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* English Name */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">İngilizce İsim</label>
                  <input
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder="E.g: Single Question"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Jeton Cost */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Jeton Maliyeti</label>
                  <input
                    type="number"
                    value={formData.jetonCost}
                    onChange={(e) => setFormData({ ...formData, jetonCost: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Açıklama (Opsiyonel)</label>
                  <input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Kısa açıklama"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  onClick={handleAdd}
                  disabled={saving || !formData.name || !formData.nameEn || formData.jetonCost < 1}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {'Kaydet'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingType(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-5 w-full max-w-md border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  {'Türü Düzenle'}
                </h2>
                <button onClick={() => setEditingType(null)}>
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Icon Selection */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">İkon</label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center ${formData.icon === icon ? 'bg-amber-500' : 'bg-white/10'}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Turkish Name */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Türkçe İsim</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* English Name */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">İngilizce İsim</label>
                  <input
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Jeton Cost */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Jeton Maliyeti</label>
                  <input
                    type="number"
                    value={formData.jetonCost}
                    onChange={(e) => setFormData({ ...formData, jetonCost: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Açıklama (Opsiyonel)</label>
                  <input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  onClick={handleUpdate}
                  disabled={saving || !formData.name || !formData.nameEn || formData.jetonCost < 1}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {'Güncelle'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
