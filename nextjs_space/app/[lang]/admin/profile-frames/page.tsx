'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { ArrowLeft, Plus, Trash2, Save, Image as ImageIcon, Loader2, Search, UserPlus, X, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import NextImage from 'next/image'

interface ProfileFrame {
  id: string
  name: string
  imageUrl: string
  tier: string
  isActive: boolean
  sortOrder: number
}

interface SearchUser {
  id: string
  name: string | null
  username: string | null
  image: string | null
  membership: string | null
  profileFrameId: string | null
  adminAssignedFrameId: string | null
}

const TIER_OPTIONS = [
  { value: 'free', label: 'Ücretsiz (Herkes)', labelEn: 'Free (Everyone)' },
  { value: 'gold', label: 'Gold Üyelik', labelEn: 'Gold Membership' },
  { value: 'admin_only', label: 'Sadece Admin Ataması', labelEn: 'Admin Assign Only' },
]

export default function AdminProfileFramesPage() {
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const [frames, setFrames] = useState<ProfileFrame[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editFrame, setEditFrame] = useState<ProfileFrame | null>(null)
  const [form, setForm] = useState({ name: '', imageUrl: '', tier: 'gold', sortOrder: 0 })

  // User assignment
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [selectedFrameForAssign, setSelectedFrameForAssign] = useState('')

  const isMystical = theme === 'mystical'
  const cardBg = isMystical ? 'bg-[#1a0a2e]/80 border-fuchsia-900/30' : 'bg-white border-gray-200'
  const textColor = isMystical ? 'text-white' : 'text-gray-900'
  const subText = isMystical ? 'text-fuchsia-200' : 'text-gray-500'
  const inputBg = isMystical ? 'bg-[#2a1a3e] border-fuchsia-800/50 text-white' : 'bg-white border-gray-300 text-gray-900'
  const btnPrimary = isMystical ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'

  useEffect(() => { fetchFrames() }, [])

  const fetchFrames = async () => {
    try {
      const res = await fetch('/api/admin/profile-frames')
      if (res.ok) {
        const data = await res.json()
        setFrames(data)
      }
    } catch (err) {
      console.error('Fetch frames error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name || !form.imageUrl) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/profile-frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFrame ? { ...form, id: editFrame.id } : form)
      })
      if (res.ok) {
        fetchFrames()
        setShowForm(false)
        setEditFrame(null)
        setForm({ name: '', imageUrl: '', tier: 'gold', sortOrder: 0 })
      }
    } catch (err) {
      console.error('Save frame error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'tr' ? 'Bu çerçeveyi silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this frame?')) return
    try {
      const res = await fetch(`/api/admin/profile-frames?id=${id}`, { method: 'DELETE' })
      if (res.ok) fetchFrames()
    } catch (err) {
      console.error('Delete frame error:', err)
    }
  }

  const toggleActive = async (frame: ProfileFrame) => {
    try {
      await fetch('/api/admin/profile-frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: frame.id, name: frame.name, imageUrl: frame.imageUrl, tier: frame.tier, sortOrder: frame.sortOrder, isActive: !frame.isActive })
      })
      fetchFrames()
    } catch (err) {
      console.error('Toggle error:', err)
    }
  }

  const searchUsers = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.users || data)
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearching(false)
    }
  }

  const assignFrame = async (userId: string) => {
    if (!selectedFrameForAssign) return
    setAssigning(userId)
    try {
      const res = await fetch('/api/admin/profile-frames/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, frameId: selectedFrameForAssign === 'remove' ? null : selectedFrameForAssign })
      })
      if (res.ok) {
        searchUsers() // refresh
        alert(language === 'tr' ? 'Çerçeve atandı!' : 'Frame assigned!')
      }
    } catch (err) {
      console.error('Assign error:', err)
    } finally {
      setAssigning(null)
    }
  }

  const openEdit = (frame: ProfileFrame) => {
    setEditFrame(frame)
    setForm({ name: frame.name, imageUrl: frame.imageUrl, tier: frame.tier, sortOrder: frame.sortOrder })
    setShowForm(true)
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/${language}/admin`}>
            <motion.button whileHover={{ scale: 1.05 }} className={`p-2 rounded-lg ${cardBg} border`}>
              <ArrowLeft className={textColor} size={20} />
            </motion.button>
          </Link>
          <div>
            <h1 className={`text-2xl font-bold ${textColor}`}>
              {language === 'tr' ? '🖼️ Profil Çerçeve Yönetimi' : '🖼️ Profile Frame Management'}
            </h1>
            <p className={subText}>
              {language === 'tr' ? 'Kullanıcı profil çerçevelerini yönetin ve atayın' : 'Manage and assign user profile frames'}
            </p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditFrame(null); setForm({ name: '', imageUrl: '', tier: 'gold', sortOrder: frames.length + 1 }) }}
            className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg ${btnPrimary}`}
          >
            <Plus size={18} /> {language === 'tr' ? 'Yeni Çerçeve' : 'New Frame'}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`${cardBg} border rounded-xl p-6 mb-8`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-bold ${textColor}`}>
                {editFrame ? (language === 'tr' ? 'Çerçeve Düzenle' : 'Edit Frame') : (language === 'tr' ? 'Yeni Çerçeve Ekle' : 'Add New Frame')}
              </h2>
              <button onClick={() => { setShowForm(false); setEditFrame(null) }}>
                <X className={subText} size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm mb-1 ${subText}`}>{language === 'tr' ? 'İsim' : 'Name'}</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                  placeholder="Kelebek Çerçeve 1"
                />
              </div>
              <div>
                <label className={`block text-sm mb-1 ${subText}`}>{language === 'tr' ? 'Görsel URL' : 'Image URL'}</label>
                <input
                  value={form.imageUrl}
                  onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                  placeholder="/frames/frame-butterfly-1.png"
                />
              </div>
              <div>
                <label className={`block text-sm mb-1 ${subText}`}>Tier</label>
                <select
                  value={form.tier}
                  onChange={e => setForm({ ...form, tier: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                >
                  {TIER_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{language === 'tr' ? t.label : t.labelEn}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm mb-1 ${subText}`}>{language === 'tr' ? 'Sıralama' : 'Sort Order'}</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
                />
              </div>
            </div>
            {/* Preview */}
            {form.imageUrl && (
              <div className="mt-4 flex items-center gap-4">
                <p className={`text-sm ${subText}`}>{language === 'tr' ? 'Önizleme:' : 'Preview:'}</p>
                <div className="relative w-20 h-20">
                  <NextImage src={form.imageUrl} alt="Preview" width={80} height={80} className="object-contain" unoptimized />
                </div>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${btnPrimary}`}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {language === 'tr' ? 'Kaydet' : 'Save'}
              </button>
              <button onClick={() => { setShowForm(false); setEditFrame(null) }} className={`px-4 py-2 rounded-lg border ${cardBg}`}>
                <span className={subText}>{language === 'tr' ? 'İptal' : 'Cancel'}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Frames Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-fuchsia-400" size={32} /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
            {frames.map(frame => (
              <motion.div
                key={frame.id}
                whileHover={{ scale: 1.03 }}
                className={`${cardBg} border rounded-xl p-4 text-center relative ${!frame.isActive ? 'opacity-50' : ''}`}
              >
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <NextImage src={frame.imageUrl} alt={frame.name} width={64} height={64} className="object-contain" unoptimized />
                </div>
                <p className={`text-sm font-medium ${textColor} truncate`}>{frame.name}</p>
                <p className={`text-xs ${subText}`}>
                  {TIER_OPTIONS.find(t => t.value === frame.tier)?.[language === 'tr' ? 'label' : 'labelEn'] || frame.tier}
                </p>
                <div className="flex justify-center gap-2 mt-2">
                  <button onClick={() => toggleActive(frame)} className="p-1 hover:opacity-80" title={frame.isActive ? 'Devre dışı bırak' : 'Aktifleştir'}>
                    {frame.isActive ? <ToggleRight className="text-green-400" size={18} /> : <ToggleLeft className="text-gray-400" size={18} />}
                  </button>
                  <button onClick={() => openEdit(frame)} className="p-1 hover:opacity-80" title="Düzenle">
                    <Save className="text-blue-400" size={16} />
                  </button>
                  <button onClick={() => handleDelete(frame.id)} className="p-1 hover:opacity-80" title="Sil">
                    <Trash2 className="text-red-400" size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* User Assignment Section */}
        <div className={`${cardBg} border rounded-xl p-6`}>
          <h2 className={`text-lg font-bold ${textColor} mb-4 flex items-center gap-2`}>
            <UserPlus size={20} /> {language === 'tr' ? 'Kullanıcıya Çerçeve Ata' : 'Assign Frame to User'}
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchUsers()}
              className={`flex-1 px-3 py-2 rounded-lg border ${inputBg}`}
              placeholder={language === 'tr' ? 'Kullanıcı adı veya e-posta ara...' : 'Search username or email...'}
            />
            <button onClick={searchUsers} disabled={searching} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${btnPrimary}`}>
              {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {language === 'tr' ? 'Ara' : 'Search'}
            </button>
          </div>

          {/* Frame selection for assignment */}
          <div className="mb-4">
            <label className={`block text-sm mb-1 ${subText}`}>{language === 'tr' ? 'Atanacak Çerçeve' : 'Frame to Assign'}</label>
            <select
              value={selectedFrameForAssign}
              onChange={e => setSelectedFrameForAssign(e.target.value)}
              className={`w-full md:w-1/2 px-3 py-2 rounded-lg border ${inputBg}`}
            >
              <option value="">{language === 'tr' ? 'Çerçeve seçin...' : 'Select frame...'}</option>
              <option value="remove">{language === 'tr' ? '❌ Çerçeveyi Kaldır' : '❌ Remove Frame'}</option>
              {frames.filter(f => f.isActive).map(f => (
                <option key={f.id} value={f.id}>{f.name} ({TIER_OPTIONS.find(t => t.value === f.tier)?.[language === 'tr' ? 'label' : 'labelEn']})</option>
              ))}
            </select>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map(user => (
                <div key={user.id} className={`flex items-center gap-3 p-3 rounded-lg border ${cardBg}`}>
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-900/50 flex-shrink-0">
                    {user.image ? (
                      <NextImage src={user.image} alt="" width={40} height={40} className="object-cover w-full h-full" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-fuchsia-300 text-lg">👤</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${textColor} truncate`}>{user.name || 'İsimsiz'}</p>
                    <p className={`text-xs ${subText} truncate`}>@{user.username} · {user.membership || 'basic'}</p>
                    {user.adminAssignedFrameId && (
                      <p className="text-xs text-yellow-400">Admin çerçeve: {user.adminAssignedFrameId}</p>
                    )}
                  </div>
                  <button
                    onClick={() => assignFrame(user.id)}
                    disabled={!selectedFrameForAssign || assigning === user.id}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${btnPrimary} disabled:opacity-50`}
                  >
                    {assigning === user.id ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    {language === 'tr' ? 'Ata' : 'Assign'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
