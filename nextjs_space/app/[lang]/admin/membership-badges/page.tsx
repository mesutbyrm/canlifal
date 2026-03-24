'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { ArrowLeft, Plus, Trash2, Save, Image as ImageIcon, Loader2, Upload, Edit2, Eye, X, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import NextImage from 'next/image'
import AdminBackButton from '@/components/admin-back-button'

interface MembershipBadge {
  id: string
  name: string
  tier: string
  imageUrl: string
  isActive: boolean
  sortOrder: number
}

const TIER_OPTIONS = [
  { value: 'basic', label: 'Basic', color: 'text-gray-400' },
  { value: 'premium', label: 'Premium', color: 'text-purple-400' },
  { value: 'gold', label: 'Gold', color: 'text-yellow-400' },
  { value: 'diamond', label: 'Diamond', color: 'text-cyan-400' },
  { value: 'admin', label: 'Admin', color: 'text-red-400' },
]

export default function MembershipBadgesPage() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const { colorMode } = useSiteTheme()
  const isLight = colorMode === 'light'

  const [badges, setBadges] = useState<MembershipBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBadge, setEditingBadge] = useState<MembershipBadge | null>(null)
  const [form, setForm] = useState({ name: '', tier: 'gold', imageUrl: '', isActive: true, sortOrder: 0 })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewBadge, setPreviewBadge] = useState<MembershipBadge | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBadges()
  }, [])

  const fetchBadges = async () => {
    try {
      const res = await fetch('/api/admin/membership-badges')
      if (res.ok) {
        const data = await res.json()
        setBadges(data)
      }
    } catch (e) {
      console.error('Fetch badges error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Sadece görsel dosyaları yüklenebilir.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Dosya boyutu 10MB\'den küçük olmalıdır.')
      return
    }

    setUploading(true)
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: true })
      })
      if (!presignedRes.ok) throw new Error('Upload URL alınamadı')
      const { uploadUrl, cloud_storage_path } = await presignedRes.json()

      const signedHeadersMatch = uploadUrl.match(/X-Amz-SignedHeaders=([^&]+)/)
      const signedHeaders = signedHeadersMatch ? decodeURIComponent(signedHeadersMatch[1]) : 'host'
      const headers: Record<string, string> = { 'Content-Type': file.type }
      if (signedHeaders.includes('content-disposition')) {
        headers['Content-Disposition'] = 'attachment'
      }

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file,
      })
      if (!uploadRes.ok) throw new Error('Yükleme başarısız')

      const getUrlRes = await fetch('/api/upload/get-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, isPublic: true })
      })
      if (getUrlRes.ok) {
        const urlData = await getUrlRes.json()
        setForm(prev => ({ ...prev, imageUrl: urlData.url }))
      } else {
        setForm(prev => ({ ...prev, imageUrl: cloud_storage_path }))
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert('Yükleme sırasında hata oluştu.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!form.name || !form.tier || !form.imageUrl) {
      alert('Ad, üyelik türü ve görsel gereklidir.')
      return
    }

    setSaving(true)
    try {
      if (editingBadge) {
        const res = await fetch('/api/admin/membership-badges', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingBadge.id, ...form }),
        })
        if (res.ok) {
          const updated = await res.json()
          setBadges(prev => prev.map(b => b.id === updated.id ? updated : b))
        }
      } else {
        const res = await fetch('/api/admin/membership-badges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const created = await res.json()
          setBadges(prev => [...prev, created])
        }
      }
      resetForm()
    } catch (e) {
      console.error('Save error:', e)
      alert('Kaydetme hatası')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu rozeti silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/admin/membership-badges?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setBadges(prev => prev.filter(b => b.id !== id))
      }
    } catch (e) {
      console.error('Delete error:', e)
    }
  }

  const handleToggleActive = async (badge: MembershipBadge) => {
    try {
      const res = await fetch('/api/admin/membership-badges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: badge.id, isActive: !badge.isActive }),
      })
      if (res.ok) {
        const updated = await res.json()
        setBadges(prev => prev.map(b => b.id === updated.id ? updated : b))
      }
    } catch (e) {
      console.error('Toggle error:', e)
    }
  }

  const startEdit = (badge: MembershipBadge) => {
    setEditingBadge(badge)
    setForm({
      name: badge.name,
      tier: badge.tier,
      imageUrl: badge.imageUrl,
      isActive: badge.isActive,
      sortOrder: badge.sortOrder,
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingBadge(null)
    setForm({ name: '', tier: 'gold', imageUrl: '', isActive: true, sortOrder: 0 })
  }

  const getTierInfo = (tier: string) => TIER_OPTIONS.find(t => t.value === tier) || TIER_OPTIONS[0]

  const bgColor = isLight ? 'bg-white' : ''
  const cardBg = isLight ? 'bg-gray-50 border-gray-200' : 'bg-purple-900/20 border-purple-500/30'
  const textPrimary = isLight ? 'text-gray-900' : 'text-white'
  const textSecondary = isLight ? 'text-gray-600' : 'text-purple-300'
  const inputBg = isLight ? 'bg-white border-gray-300' : 'bg-white/5 border-purple-500/30'

  return (
    <div className={`min-h-screen ${bgColor} p-4 md:p-8`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <AdminBackButton />
            <div>
              <h1 className={`text-2xl font-bold ${textPrimary}`}>Üyelik Rozetleri</h1>
              <p className={`text-sm ${textSecondary}`}>Üyelik türleri için rozet görselleri yönetin</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={18} />
            Yeni Rozet
          </button>
        </div>

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
              onClick={(e) => { if (e.target === e.currentTarget) resetForm() }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-lg rounded-2xl border p-6 ${cardBg} ${isLight ? 'bg-white' : 'bg-[#1a0a2e]'}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-bold ${textPrimary}`}>
                    {editingBadge ? 'Rozet Düzenle' : 'Yeni Rozet Ekle'}
                  </h2>
                  <button onClick={resetForm} className={`p-2 rounded-lg hover:bg-white/10 ${textSecondary}`}>
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className={`text-sm mb-1 block ${textSecondary}`}>Rozet Adı</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Örn: Gold Şerit"
                      className={`w-full px-4 py-2.5 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    />
                  </div>

                  {/* Tier */}
                  <div>
                    <label className={`text-sm mb-1 block ${textSecondary}`}>Üyelik Türü</label>
                    <select
                      value={form.tier}
                      onChange={(e) => setForm(prev => ({ ...prev, tier: e.target.value }))}
                      className={`w-full px-4 py-2.5 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    >
                      {TIER_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className={`text-sm mb-1 block ${textSecondary}`}>Rozet Görseli</label>
                    <div className="flex items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${inputBg} ${textPrimary} hover:bg-purple-500/20 transition-colors`}
                      >
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {uploading ? 'Yükleniyor...' : 'Görsel Yükle'}
                      </button>
                      {form.imageUrl && (
                        <span className="text-green-400 text-sm">✓ Görsel yüklendi</span>
                      )}
                    </div>
                    {/* URL input fallback */}
                    <input
                      type="text"
                      value={form.imageUrl}
                      onChange={(e) => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="veya URL yapıştırın"
                      className={`w-full mt-2 px-4 py-2 rounded-xl border ${inputBg} ${textPrimary} text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    />
                  </div>

                  {/* Preview */}
                  {form.imageUrl && (
                    <div>
                      <label className={`text-sm mb-1 block ${textSecondary}`}>Önizleme</label>
                      <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-black/30">
                        <div className="relative inline-block">
                          <NextImage
                            src={form.imageUrl}
                            alt="Rozet önizleme"
                            width={200}
                            height={60}
                            className="object-contain"
                            unoptimized
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-bold text-sm drop-shadow-lg" style={{ textShadow: '0 0 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)' }}>
                              {getTierInfo(form.tier).label.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <p className={`text-xs ${textSecondary}`}>Üyelik adı görselin üzerine yazılacak</p>
                      </div>
                    </div>
                  )}

                  {/* Sort Order */}
                  <div>
                    <label className={`text-sm mb-1 block ${textSecondary}`}>Sıralama</label>
                    <input
                      type="number"
                      value={form.sortOrder}
                      onChange={(e) => setForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                      className={`w-24 px-4 py-2 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    />
                  </div>

                  {/* Save */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saving || !form.name || !form.imageUrl}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-xl transition-colors"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {editingBadge ? 'Güncelle' : 'Kaydet'}
                    </button>
                    <button
                      onClick={resetForm}
                      className={`px-6 py-2.5 rounded-xl border ${inputBg} ${textPrimary} hover:bg-white/10`}
                    >
                      İptal
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badges List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : badges.length === 0 ? (
          <div className={`text-center py-20 ${textSecondary}`}>
            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Henüz rozet eklenmemiş</p>
            <p className="text-sm mt-1">Üyelik türleri için rozet görselleri ekleyin</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group by tier */}
            {TIER_OPTIONS.map(tierOpt => {
              const tierBadges = badges.filter(b => b.tier === tierOpt.value)
              if (tierBadges.length === 0) return null

              return (
                <div key={tierOpt.value}>
                  <h3 className={`text-lg font-semibold mb-3 ${tierOpt.color}`}>
                    {tierOpt.label} Rozetleri ({tierBadges.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tierBadges.map(badge => (
                      <motion.div
                        key={badge.id}
                        layout
                        className={`rounded-xl border p-4 ${cardBg} ${!badge.isActive ? 'opacity-50' : ''}`}
                      >
                        {/* Badge preview with text overlay */}
                        <div className="relative mb-3 flex justify-center">
                          <div className="relative inline-block">
                            <NextImage
                              src={badge.imageUrl}
                              alt={badge.name}
                              width={200}
                              height={60}
                              className="object-contain"
                              unoptimized
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white font-bold text-sm drop-shadow-lg" style={{ textShadow: '0 0 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)' }}>
                                {tierOpt.label.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${textPrimary}`}>{badge.name}</p>
                            <p className={`text-xs ${textSecondary}`}>Sıra: {badge.sortOrder}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleActive(badge)}
                              className={`p-1.5 rounded-lg transition-colors ${badge.isActive ? 'text-green-400 hover:bg-green-500/20' : 'text-gray-500 hover:bg-gray-500/20'}`}
                              title={badge.isActive ? 'Aktif' : 'Pasif'}
                            >
                              {badge.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                            </button>
                            <button
                              onClick={() => startEdit(badge)}
                              className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(badge.id)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
