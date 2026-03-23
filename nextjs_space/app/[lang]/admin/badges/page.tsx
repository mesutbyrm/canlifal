'use client'

import AdminBackButton from '@/components/admin-back-button'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { ArrowLeft, Plus, Trash2, Save, Shield, Users, Star, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface Badge {
  id: string
  name: string
  icon: string
  color: string
  bgColor: string
  description: string | null
  tier: string | null
  userId: string | null
  isActive: boolean
  sortOrder: number
}

const TIER_OPTIONS = [
  { value: '', label: 'Yok (Bireysel)', labelEn: 'None (Individual)' },
  { value: 'basic', label: 'Basic Üyelik', labelEn: 'Basic Membership' },
  { value: 'premium', label: 'Premium Üyelik', labelEn: 'Premium Membership' },
  { value: 'gold', label: 'Gold Üyelik', labelEn: 'Gold Membership' },
  { value: 'diamond', label: 'Diamond Üyelik', labelEn: 'Diamond Membership' },
]

const EMOJI_SUGGESTIONS = ['🏆', '⭐', '👑', '💎', '🔥', '✨', '🎖️', '🛡️', '💫', '🌟', '🎯', '🏅', '💪', '🎪', '🦄', '❤️', '💜', '💙', '🧡', '💚']

export default function AdminBadgesPage() {
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const [badges, setBadges] = useState<Badge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editBadge, setEditBadge] = useState<Badge | null>(null)
  const [form, setForm] = useState({ name: '', icon: '⭐', color: '#fbbf24', bgColor: '#78350f', description: '', tier: '', userId: '' })

  const isMystical = theme === 'mystical'
  const cardBg = isMystical ? 'bg-[#1a0a2e]/80 border-fuchsia-900/30' : 'bg-white border-gray-200'
  const textColor = isMystical ? 'text-white' : 'text-gray-900'
  const subText = isMystical ? 'text-fuchsia-200' : 'text-gray-500'
  const inputBg = isMystical ? 'bg-[#2a1a3e] border-fuchsia-800/50 text-white' : 'bg-white border-gray-300 text-gray-900'
  const btnPrimary = isMystical ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'

  useEffect(() => { fetchBadges() }, [])

  const fetchBadges = async () => {
    try {
      const res = await fetch('/api/admin/badges')
      if (res.ok) {
        const data = await res.json()
        setBadges(data.badges)
      }
    } catch (e) { console.error(e) }
    setIsLoading(false)
  }

  const handleSave = async () => {
    setSaving('new')
    try {
      const payload = {
        ...form,
        tier: form.tier || null,
        userId: form.userId || null,
        ...(editBadge ? { id: editBadge.id } : {})
      }
      const res = await fetch('/api/admin/badges', {
        method: editBadge ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        await fetchBadges()
        setShowForm(false)
        setEditBadge(null)
        setForm({ name: '', icon: '⭐', color: '#fbbf24', bgColor: '#78350f', description: '', tier: '', userId: '' })
      }
    } catch (e) { console.error(e) }
    setSaving(null)
  }

  const handleToggle = async (badge: Badge) => {
    setSaving(badge.id)
    try {
      await fetch('/api/admin/badges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: badge.id, isActive: !badge.isActive })
      })
      await fetchBadges()
    } catch (e) { console.error(e) }
    setSaving(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu rozeti silmek istediğinize emin misiniz?')) return
    setSaving(id)
    try {
      await fetch(`/api/admin/badges?id=${id}`, { method: 'DELETE' })
      await fetchBadges()
    } catch (e) { console.error(e) }
    setSaving(null)
  }

  const openEdit = (badge: Badge) => {
    setEditBadge(badge)
    setForm({
      name: badge.name,
      icon: badge.icon,
      color: badge.color,
      bgColor: badge.bgColor,
      description: badge.description || '',
      tier: badge.tier || '',
      userId: badge.userId || ''
    })
    setShowForm(true)
  }

  return (
    <div className={`min-h-screen ${isMystical ? 'bg-[#0f0520]' : 'bg-gray-50'} p-4 sm:p-6`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <AdminBackButton className="p-2 rounded-lg ${cardBg} border" />
          <div>
            <h1 className={`text-2xl font-bold ${textColor}`}>
              {'🏆 Rozet Yönetimi'}
            </h1>
            <p className={`text-sm ${subText}`}>
              {'Üyelik rozetlerini ve özel rozetleri yönetin'}
            </p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditBadge(null); setForm({ name: '', icon: '⭐', color: '#fbbf24', bgColor: '#78350f', description: '', tier: '', userId: '' }) }}
            className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg ${btnPrimary}`}
          >
            <Plus className="w-4 h-4" />
            {'Yeni Rozet'}
          </button>
        </div>

        {/* Badge Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`${cardBg} border rounded-xl p-6 mb-6`}>
            <h3 className={`text-lg font-bold mb-4 ${textColor}`}>
              {editBadge ? ('Rozet Düzenle') : ('Yeni Rozet Oluştur')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${subText}`}>{'Rozet Adı'}</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${inputBg}`} placeholder="VIP" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${subText}`}>{'İkon (Emoji)'}</label>
                <div className="flex items-center gap-2">
                  <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className={`w-20 px-3 py-2 rounded-lg border ${inputBg} text-center text-lg`} />
                  <div className="flex flex-wrap gap-1">
                    {EMOJI_SUGGESTIONS.map(e => (
                      <button key={e} onClick={() => setForm({ ...form, icon: e })} className="text-lg hover:scale-125 transition-transform">{e}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${subText}`}>{'Yazı Rengi'}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                  <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className={`flex-1 px-3 py-2 rounded-lg border ${inputBg}`} />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${subText}`}>{'Arkaplan Rengi'}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.bgColor} onChange={e => setForm({ ...form, bgColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                  <input value={form.bgColor} onChange={e => setForm({ ...form, bgColor: e.target.value })} className={`flex-1 px-3 py-2 rounded-lg border ${inputBg}`} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={`block text-sm font-medium mb-1 ${subText}`}>{'Açıklama'}</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${inputBg}`} placeholder={'Opsiyonel açıklama'} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${subText}`}>{'Üyelik Katmanı (Otomatik Atama)'}</label>
                <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}>
                  {TIER_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${subText}`}>{'Kullanıcı ID (Bireysel Atama)'}</label>
                <input value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${inputBg}`} placeholder={'Boş bırakın veya kullanıcı ID girin'} />
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 flex items-center gap-3">
              <span className={`text-sm ${subText}`}>{'Önizleme:'}</span>
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border"
                style={{ color: form.color, backgroundColor: form.bgColor + '33', borderColor: form.color + '66' }}
              >
                <span>{form.icon}</span>
                <span>{form.name || 'Rozet'}</span>
              </span>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving === 'new' || !form.name} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${btnPrimary} disabled:opacity-50`}>
                {saving === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {'Kaydet'}
              </button>
              <button onClick={() => { setShowForm(false); setEditBadge(null) }} className={`px-4 py-2 rounded-lg border ${cardBg} ${textColor}`}>
                {'İptal'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Badge List */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" /></div>
        ) : badges.length === 0 ? (
          <div className={`${cardBg} border rounded-xl p-12 text-center`}>
            <Shield className={`w-12 h-12 mx-auto mb-3 ${subText}`} />
            <p className={textColor}>{'Henüz rozet yok'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {badges.map(badge => (
              <motion.div key={badge.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`${cardBg} border rounded-xl p-4 flex items-center gap-4 ${!badge.isActive ? 'opacity-50' : ''}`}>
                {/* Badge preview */}
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold border flex-shrink-0"
                  style={{ color: badge.color, backgroundColor: badge.bgColor + '33', borderColor: badge.color + '66' }}
                >
                  <span>{badge.icon}</span>
                  <span>{badge.name}</span>
                </span>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {badge.tier && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isMystical ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                        {badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1)} {'Üyelik'}
                      </span>
                    )}
                    {badge.userId && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isMystical ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                        <Users className="w-3 h-3 inline mr-1" />{'Bireysel'}
                      </span>
                    )}
                    {!badge.tier && !badge.userId && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isMystical ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        {'Atanmamış'}
                      </span>
                    )}
                  </div>
                  {badge.description && <p className={`text-xs mt-1 ${subText} truncate`}>{badge.description}</p>}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleToggle(badge)} className="p-1.5 rounded-lg hover:bg-black/10">
                    {saving === badge.id ? <Loader2 className="w-5 h-5 animate-spin" /> :
                      badge.isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                  </button>
                  <button onClick={() => openEdit(badge)} className="p-1.5 rounded-lg hover:bg-black/10">
                    <Star className="w-4 h-4 text-yellow-500" />
                  </button>
                  <button onClick={() => handleDelete(badge.id)} className="p-1.5 rounded-lg hover:bg-red-500/20">
                    <Trash2 className="w-4 h-4 text-red-400" />
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
