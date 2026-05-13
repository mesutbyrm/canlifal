'use client'

import AdminBackButton from '@/components/admin-back-button'
import { useState, useEffect, useCallback } from 'react'
import { useSiteTheme } from '@/lib/theme-context'
import {
  Plus, Trash2, Save, Users, Star, Loader2, Search,
  BadgeCheck, Edit, Film, Music, Trophy, Youtube, Instagram, Tv,
  ToggleLeft, ToggleRight, X, Eye, EyeOff
} from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

interface Celebrity {
  id: string
  name: string
  slug: string
  category: string
  bio: string | null
  profileImage: string | null
  coverImage: string | null
  isVerified: boolean
  isActive: boolean
  followerCount: number
  birthDate: string | null
  birthPlace: string | null
  zodiacSign: string | null
  socialLinks: string | null
  achievements: string | null
  _count?: { followers: number }
}

const CATEGORIES = [
  { value: 'oyuncu', label: 'Oyuncu', icon: Film },
  { value: 'sarkici', label: 'Şarkıcı', icon: Music },
  { value: 'futbolcu', label: 'Futbolcu', icon: Trophy },
  { value: 'youtuber', label: 'YouTuber', icon: Youtube },
  { value: 'influencer', label: 'Influencer', icon: Instagram },
  { value: 'yonetmen', label: 'Yönetmen', icon: Tv },
  { value: 'diger', label: 'Diğer', icon: Star },
]

const ZODIAC_SIGNS = [
  'Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak',
  'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'
]

const emptyForm = {
  name: '', category: 'oyuncu', bio: '', profileImage: '', coverImage: '',
  birthDate: '', birthPlace: '', zodiacSign: '',
  socialLinks: { instagram: '', youtube: '', tiktok: '', twitter: '', website: '' },
  achievements: [''],
}

export default function AdminCelebritiesPage() {
  const { theme } = useSiteTheme()
  const isLight = theme === 'facebook'

  const [celebrities, setCelebrities] = useState<Celebrity[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [message, setMessage] = useState({ text: '', type: '' })

  const fetchCelebrities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCategory !== 'all') params.set('category', filterCategory)
      if (searchQuery) params.set('search', searchQuery)
      params.set('limit', '100')
      const res = await fetch(`/api/admin/celebrities?${params}`)
      const data = await res.json()
      setCelebrities(data.celebrities || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filterCategory, searchQuery])

  useEffect(() => { fetchCelebrities() }, [fetchCelebrities])

  const showMessage = (text: string, type: string) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const handleNew = () => {
    setEditId(null)
    setForm({ ...emptyForm, socialLinks: { ...emptyForm.socialLinks }, achievements: [''] })
    setShowForm(true)
  }

  const handleEdit = (celeb: Celebrity) => {
    setEditId(celeb.id)
    const socialLinks = celeb.socialLinks ? JSON.parse(celeb.socialLinks) : emptyForm.socialLinks
    const achievements = celeb.achievements ? JSON.parse(celeb.achievements) : ['']
    setForm({
      name: celeb.name,
      category: celeb.category,
      bio: celeb.bio || '',
      profileImage: celeb.profileImage || '',
      coverImage: celeb.coverImage || '',
      birthDate: celeb.birthDate ? celeb.birthDate.split('T')[0] : '',
      birthPlace: celeb.birthPlace || '',
      zodiacSign: celeb.zodiacSign || '',
      socialLinks: { ...emptyForm.socialLinks, ...socialLinks },
      achievements: achievements.length > 0 ? achievements : [''],
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      showMessage('İsim zorunludur', 'error')
      return
    }
    setSaving(true)
    try {
      const socialLinks = Object.fromEntries(
        Object.entries(form.socialLinks).filter(([_, v]) => v)
      )
      const achievements = form.achievements.filter((a: string) => a.trim())
      const body: any = {
        name: form.name,
        category: form.category,
        bio: form.bio || null,
        profileImage: form.profileImage || null,
        coverImage: form.coverImage || null,
        birthDate: form.birthDate || null,
        birthPlace: form.birthPlace || null,
        zodiacSign: form.zodiacSign || null,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        achievements: achievements.length > 0 ? achievements : null,
      }

      if (editId) {
        body.id = editId
        await fetch('/api/admin/celebrities', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        showMessage('Ünlü güncellendi', 'success')
      } else {
        await fetch('/api/admin/celebrities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        showMessage('Ünlü eklendi', 'success')
      }
      setShowForm(false)
      fetchCelebrities()
    } catch (err) {
      showMessage('Hata oluştu', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (celeb: Celebrity) => {
    try {
      await fetch('/api/admin/celebrities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: celeb.id, isActive: !celeb.isActive }),
      })
      fetchCelebrities()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ünlüyü silmek istediğinize emin misiniz?')) return
    try {
      await fetch(`/api/admin/celebrities?id=${id}`, { method: 'DELETE' })
      showMessage('Ünlü silindi', 'success')
      fetchCelebrities()
    } catch (err) {
      showMessage('Silme hatası', 'error')
    }
  }

  const bgCard = isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-purple-500/10'
  const textPrimary = isLight ? 'text-gray-900' : 'text-white'
  const textSecondary = isLight ? 'text-gray-500' : 'text-purple-300/70'
  const inputCls = isLight
    ? 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400'
    : 'bg-white/5 border-purple-500/20 text-white placeholder-purple-400/50'

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isLight ? 'bg-gray-50' : 'bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a]'}`}>
      <div className="max-w-6xl mx-auto">
        <AdminBackButton />

        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-2xl font-bold ${textPrimary} flex items-center gap-2`}>
            <Star className="w-6 h-6 text-fuchsia-400" />
            Ünlü Yönetimi
          </h1>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Ünlü
          </button>
        </div>

        {/* Message */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-4 p-3 rounded-xl text-sm font-medium ${
                message.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
            <input
              type="text"
              placeholder="Ünlü ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl border ${inputCls} focus:outline-none focus:border-fuchsia-500/50`}
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className={`px-4 py-2 rounded-xl border ${inputCls} focus:outline-none focus:border-fuchsia-500/50`}
          >
            <option value="all">Tüm Kategoriler</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border p-6 ${bgCard}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-lg font-semibold ${textPrimary}`}>
                    {editId ? 'Ünlü Düzenle' : 'Yeni Ünlü Ekle'}
                  </h2>
                  <button onClick={() => setShowForm(false)} className={textSecondary}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Name & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`text-sm font-medium ${textSecondary} mb-1 block`}>İsim *</label>
                      <input
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className={`w-full px-4 py-2 rounded-xl border ${inputCls} focus:outline-none focus:border-fuchsia-500/50`}
                        placeholder="Ünlünün adı"
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${textSecondary} mb-1 block`}>Kategori *</label>
                      <select
                        value={form.category}
                        onChange={e => setForm({ ...form, category: e.target.value })}
                        className={`w-full px-4 py-2 rounded-xl border ${inputCls} focus:outline-none focus:border-fuchsia-500/50`}
                      >
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className={`text-sm font-medium ${textSecondary} mb-1 block`}>Biyografi</label>
                    <textarea
                      value={form.bio}
                      onChange={e => setForm({ ...form, bio: e.target.value })}
                      rows={3}
                      className={`w-full px-4 py-2 rounded-xl border ${inputCls} focus:outline-none focus:border-fuchsia-500/50`}
                      placeholder="Ünlü hakkında bilgi..."
                    />
                  </div>

                  {/* Images */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`text-sm font-medium ${textSecondary} mb-1 block`}>Profil Resmi URL</label>
                      <input
                        value={form.profileImage}
                        onChange={e => setForm({ ...form, profileImage: e.target.value })}
                        className={`w-full px-4 py-2 rounded-xl border ${inputCls} focus:outline-none focus:border-fuchsia-500/50`}
                        placeholder="https://i.ytimg.com/vi/HihM9FTAmts/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCema0vLvi7Luq4qY2zSn8h244CwA"
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${textSecondary} mb-1 block`}>Kapak Resmi URL</label>
                      <input
                        value={form.coverImage}
                        onChange={e => setForm({ ...form, coverImage: e.target.value })}
                        className={`w-full px-4 py-2 rounded-xl border ${inputCls} focus:outline-none focus:border-fuchsia-500/50`}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  {/* Birth info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={`text-sm font-medium ${textSecondary} mb-1 block`}>Doğum Tarihi</label>
                      <input
                        type="date"
                        value={form.birthDate}
                        onChange={e => setForm({ ...form, birthDate: e.target.value })}
                        className={`w-full px-4 py-2 rounded-xl border ${inputCls} focus:outline-none focus:border-fuchsia-500/50`}
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${textSecondary} mb-1 block`}>Doğum Yeri</label>
                      <input
                        value={form.birthPlace}
                        onChange={e => setForm({ ...form, birthPlace: e.target.value })}
                        className={`w-full px-4 py-2 rounded-xl border ${inputCls} focus:outline-none focus:border-fuchsia-500/50`}
                        placeholder="İstanbul"
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${textSecondary} mb-1 block`}>Burç</label>
                      <select
                        value={form.zodiacSign}
                        onChange={e => setForm({ ...form, zodiacSign: e.target.value })}
                        className={`w-full px-4 py-2 rounded-xl border ${inputCls} focus:outline-none focus:border-fuchsia-500/50`}
                      >
                        <option value="">Seçiniz</option>
                        {ZODIAC_SIGNS.map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div>
                    <label className={`text-sm font-medium ${textSecondary} mb-2 block`}>Sosyal Medya</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(form.socialLinks).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className={`text-xs font-medium w-16 ${textSecondary} capitalize`}>{key}</span>
                          <input
                            value={val as string}
                            onChange={e => setForm({ ...form, socialLinks: { ...form.socialLinks, [key]: e.target.value } })}
                            className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${inputCls} focus:outline-none focus:border-fuchsia-500/50`}
                            placeholder={`https://${key}.com/...`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Achievements */}
                  <div>
                    <label className={`text-sm font-medium ${textSecondary} mb-2 block`}>Başarılar</label>
                    {form.achievements.map((ach: string, i: number) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input
                          value={ach}
                          onChange={e => {
                            const newAch = [...form.achievements]
                            newAch[i] = e.target.value
                            setForm({ ...form, achievements: newAch })
                          }}
                          className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${inputCls} focus:outline-none focus:border-fuchsia-500/50`}
                          placeholder="Örn: Altın Küre Ödülü"
                        />
                        {form.achievements.length > 1 && (
                          <button
                            onClick={() => setForm({ ...form, achievements: form.achievements.filter((_: any, j: number) => j !== i) })}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setForm({ ...form, achievements: [...form.achievements, ''] })}
                      className="text-fuchsia-400 hover:text-fuchsia-300 text-sm flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Başarı Ekle
                    </button>
                  </div>

                  {/* Save */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-500 disabled:opacity-50 transition-colors"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {editId ? 'Güncelle' : 'Kaydet'}
                    </button>
                    <button
                      onClick={() => setShowForm(false)}
                      className={`px-4 py-2.5 rounded-xl border ${bgCard} ${textSecondary} hover:opacity-80 transition-colors`}
                    >
                      İptal
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
          </div>
        ) : celebrities.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
            <p className={`${textSecondary} text-lg`}>Henüz ünlü eklenmemiş</p>
          </div>
        ) : (
          <div className="space-y-3">
            {celebrities.map(celeb => (
              <motion.div
                key={celeb.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-center gap-4 p-4 rounded-xl border ${bgCard} ${!celeb.isActive ? 'opacity-50' : ''}`}
              >
                {/* Avatar */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  {celeb.profileImage ? (
                    <Image src={celeb.profileImage} alt={celeb.name} fill className="object-cover" sizes="48px" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-fuchsia-600 to-purple-700 flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{celeb.name.charAt(0)}</span>
                    </div>
                  )}
                  {celeb.isVerified && (
                    <div className="absolute -bottom-0.5 -right-0.5 bg-[#0a0014] rounded-full">
                      <BadgeCheck className="w-4 h-4 text-blue-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold truncate ${textPrimary}`}>{celeb.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-fuchsia-500/20 text-fuchsia-300">
                      {CATEGORIES.find(c => c.value === celeb.category)?.label || celeb.category}
                    </span>
                  </div>
                  <div className={`text-xs ${textSecondary} flex items-center gap-3 mt-0.5`}>
                    <span>{celeb._count?.followers || celeb.followerCount} takipçi</span>
                    {celeb.zodiacSign && <span>• {celeb.zodiacSign}</span>}
                    <span>• {celeb.slug}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(celeb)}
                    className={`p-2 rounded-lg transition-colors ${celeb.isActive ? 'text-green-400 hover:bg-green-500/10' : 'text-red-400 hover:bg-red-500/10'}`}
                    title={celeb.isActive ? 'Aktif' : 'Pasif'}
                  >
                    {celeb.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(celeb)}
                    className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(celeb.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
