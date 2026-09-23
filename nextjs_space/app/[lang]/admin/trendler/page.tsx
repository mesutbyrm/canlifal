'use client'

import { useState, useEffect } from 'react'
import { useSiteTheme } from '@/lib/theme-context'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { TrendingUp, Plus, Pencil, Trash2, Save, X, Pin, Eye, Heart, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Trend {
  id: string
  title: string
  slug: string
  category: string
  description: string | null
  image: string | null
  icon: string | null
  trendScore: number
  viewCount: number
  likeCount: number
  isActive: boolean
  isPinned: boolean
  relatedUrl: string | null
  tags: string | null
  endDate: string | null
}

const CATEGORIES = [
  { value: 'burc', label: 'Burçlar' },
  { value: 'fal', label: 'Fallar' },
  { value: 'unlu', label: 'Ünlüler' },
  { value: 'genel', label: 'Genel' },
  { value: 'oyun', label: 'Oyunlar' },
  { value: 'etkinlik', label: 'Etkinlikler' },
]

const emptyTrend = {
  id: '', title: '', slug: '', category: 'genel', description: '', image: '', icon: '',
  trendScore: 0, isActive: true, isPinned: false, relatedUrl: '', tags: '', endDate: '',
  viewCount: 0, likeCount: 0
}

export default function AdminTrendlerPage() {
  const { theme } = useSiteTheme()
  const { data: session } = useSession() || {}
  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Trend | null>(null)
  const [filter, setFilter] = useState('hepsi')
  const [saving, setSaving] = useState(false)

  const isDark = theme === 'mystical' || theme === 'canlidark' || theme === 'falclub' || theme === 'cosmic'
  const cardBg = isDark ? 'bg-[#1a0a2e]/80 border-fuchsia-900/30' : 'bg-white border-gray-200'
  const inputCls = isDark
    ? 'bg-[#0d0520] border-fuchsia-900/30 text-white placeholder-purple-400 focus:ring-fuchsia-500/50'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-fuchsia-500/50'

  const fetchTrends = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/trends?category=${filter}`)
      const data = await res.json()
      setTrends(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => { fetchTrends() }, [filter])

  const generateSlug = (title: string) => {
    return title.toLowerCase()
      .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
      .replace(/Ç/g, 'c').replace(/Ğ/g, 'g').replace(/İ/g, 'i').replace(/Ö/g, 'o').replace(/Ş/g, 's').replace(/Ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const handleSave = async () => {
    if (!editing || !editing.title || !editing.category) return
    setSaving(true)
    try {
      const body = {
        ...editing,
        slug: editing.slug || generateSlug(editing.title),
        tags: editing.tags || null,
      }
      const res = await fetch('/api/admin/trends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        setEditing(null)
        fetchTrends()
      }
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu trendi silmek istediğinize emin misiniz?')) return
    try {
      await fetch(`/api/admin/trends?id=${id}`, { method: 'DELETE' })
      fetchTrends()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-transparent' : 'bg-gray-50'} p-4 sm:p-6 pb-24`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className={`p-2 rounded-xl ${cardBg} border`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              🔥 Trend Yönetimi
            </h1>
            <p className={`text-sm ${isDark ? 'text-purple-300/60' : 'text-gray-500'}`}>
              Platform trendlerini yönetin
            </p>
          </div>
          <button
            onClick={() => setEditing(emptyTrend as any)}
            className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-fuchsia-500/25 transition-all"
          >
            <Plus className="w-4 h-4" /> Yeni Trend
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
          <button
            onClick={() => setFilter('hepsi')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${filter === 'hepsi' ? (isDark ? 'bg-fuchsia-600 text-white' : 'bg-fuchsia-500 text-white') : (isDark ? 'bg-[#1a0a2e]/60 text-purple-300 border border-fuchsia-900/30' : 'bg-white text-gray-600 border')}`}
          >
            Hepsi
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${filter === cat.value ? (isDark ? 'bg-fuchsia-600 text-white' : 'bg-fuchsia-500 text-white') : (isDark ? 'bg-[#1a0a2e]/60 text-purple-300 border border-fuchsia-900/30' : 'bg-white text-gray-600 border')}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Edit Modal */}
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${cardBg} border rounded-2xl p-6 mb-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editing.id ? 'Trend Düzenle' : 'Yeni Trend Ekle'}
              </h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-red-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-gray-600'}`}>Başlık *</label>
                <input
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value, slug: editing.id ? editing.slug : generateSlug(e.target.value) })}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
                  placeholder="Trend başlığı"
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-gray-600'}`}>Slug</label>
                <input
                  value={editing.slug}
                  onChange={e => setEditing({ ...editing, slug: e.target.value })}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
                  placeholder="otomatik-olusturulur"
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-gray-600'}`}>Kategori *</label>
                <select
                  value={editing.category}
                  onChange={e => setEditing({ ...editing, category: e.target.value })}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-gray-600'}`}>Simge (Emoji)</label>
                <input
                  value={editing.icon || ''}
                  onChange={e => setEditing({ ...editing, icon: e.target.value })}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
                  placeholder="🔥"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-gray-600'}`}>Açıklama</label>
                <textarea
                  value={editing.description || ''}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
                  placeholder="Trend açıklaması..."
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-gray-600'}`}>Görsel URL</label>
                <input
                  value={editing.image || ''}
                  onChange={e => setEditing({ ...editing, image: e.target.value })}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-gray-600'}`}>İlgili Sayfa URL</label>
                <input
                  value={editing.relatedUrl || ''}
                  onChange={e => setEditing({ ...editing, relatedUrl: e.target.value })}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
                  placeholder="/trendler/ornek"
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-gray-600'}`}>Trend Puanı</label>
                <input
                  type="number"
                  value={editing.trendScore}
                  onChange={e => setEditing({ ...editing, trendScore: parseInt(e.target.value) || 0 })}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-gray-600'}`}>Etiketler (JSON)</label>
                <input
                  value={editing.tags || ''}
                  onChange={e => setEditing({ ...editing, tags: e.target.value })}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
                  placeholder='["astroloji", "burc"]'
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-gray-600'}`}>Bitiş Tarihi</label>
                <input
                  type="date"
                  value={editing.endDate ? editing.endDate.split('T')[0] : ''}
                  onChange={e => setEditing({ ...editing, endDate: e.target.value || null })}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.isActive}
                    onChange={e => setEditing({ ...editing, isActive: e.target.checked })}
                    className="rounded border-fuchsia-500 text-fuchsia-600 focus:ring-fuchsia-500"
                  />
                  <span className={`text-sm ${isDark ? 'text-purple-200' : 'text-gray-700'}`}>Aktif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.isPinned}
                    onChange={e => setEditing({ ...editing, isPinned: e.target.checked })}
                    className="rounded border-amber-500 text-amber-600 focus:ring-amber-500"
                  />
                  <span className={`text-sm ${isDark ? 'text-purple-200' : 'text-gray-700'}`}>Öne Çıkar</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditing(null)} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'text-purple-300 hover:bg-fuchsia-900/20' : 'text-gray-600 hover:bg-gray-100'}`}>
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editing.title}
                className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:shadow-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Trends List */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" />
          </div>
        ) : trends.length === 0 ? (
          <div className={`text-center py-16 ${cardBg} border rounded-2xl`}>
            <TrendingUp className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-purple-400/30' : 'text-gray-300'}`} />
            <p className={`${isDark ? 'text-purple-300' : 'text-gray-500'}`}>Henüz trend eklenmemiş</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trends.map(trend => (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`${cardBg} border rounded-xl p-4 flex items-center gap-4`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${trend.isActive ? 'bg-gradient-to-br from-fuchsia-600/20 to-purple-600/20' : 'bg-gray-500/20'}`}>
                  {trend.icon || '🔥'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {trend.title}
                    </h3>
                    {trend.isPinned && <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {!trend.isActive && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Pasif</span>}
                  </div>
                  <div className={`flex items-center gap-3 text-xs mt-0.5 ${isDark ? 'text-purple-300/50' : 'text-gray-400'}`}>
                    <span>{CATEGORIES.find(c => c.value === trend.category)?.label}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{trend.viewCount}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{trend.likeCount}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{trend.trendScore}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditing(trend)}
                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-fuchsia-900/30 text-purple-300' : 'hover:bg-gray-100 text-gray-500'}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(trend.id)}
                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
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
