'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Eye, EyeOff, ExternalLink, ArrowUp, ArrowDown,
  Loader2, Check, Music2, Search, X, FolderPlus, Tag, Filter,
  Edit2, ChevronDown
} from 'lucide-react'
import AdminBackButton from '@/components/admin-back-button'

interface TikTokCategory {
  id: string
  title: string
  slug: string
  description: string | null
  sortOrder: number
  isActive: boolean
  _count?: { videos: number }
}

interface TikTokVideo {
  id: string
  tiktokUrl: string
  tiktokId: string | null
  title: string | null
  authorName: string | null
  thumbnailUrl: string | null
  embedHtml: string | null
  categoryId: string | null
  category: { id: string; title: string } | null
  sortOrder: number
  isActive: boolean
  createdAt: string
}

const CHEVRON_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239333ea' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"
const selectStyle = { backgroundImage: `url("${CHEVRON_SVG}")`, backgroundRepeat: 'no-repeat' as const, backgroundPosition: 'right 12px center' }

export default function AdminTikTokVideosPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [videos, setVideos] = useState<TikTokVideo[]>([])
  const [categories, setCategories] = useState<TikTokCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState<string>('')

  // Add video states
  const [bulkUrls, setBulkUrls] = useState('')
  const [addCategoryId, setAddCategoryId] = useState<string>('')
  const [adding, setAdding] = useState(false)
  const [addResult, setAddResult] = useState<{ added: number; errors: string[] } | null>(null)
  const [error, setError] = useState('')

  // Category management
  const [showCategoryPanel, setShowCategoryPanel] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')

  // Video category change dropdown
  const [changingCategoryFor, setChangingCategoryFor] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/giris')
    if (status === 'authenticated') {
      fetchVideos()
      fetchCategories()
    }
  }, [status])

  const fetchVideos = async (catId?: string, search?: string) => {
    try {
      const params = new URLSearchParams()
      const cat = catId !== undefined ? catId : filterCategoryId
      const q = search !== undefined ? search : searchQuery
      if (cat) params.set('categoryId', cat)
      if (q) params.set('search', q)
      const res = await fetch(`/api/admin/tiktok-videos?${params}`)
      if (res.ok) {
        const data = await res.json()
        setVideos(data.videos || [])
      }
    } catch {} finally { setLoading(false) }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/tiktok-categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch {}
  }

  const addVideos = async () => {
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(u => u && u.startsWith('http'))
    if (urls.length === 0) return
    setAdding(true)
    setError('')
    setAddResult(null)
    try {
      const res = await fetch('/api/admin/tiktok-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiktokUrls: urls, categoryId: addCategoryId || null }),
      })
      if (res.ok) {
        const data = await res.json()
        setAddResult({ added: data.added, errors: data.errors || [] })
        if (data.added > 0) {
          setBulkUrls('')
          fetchVideos()
        }
      } else {
        const data = await res.json()
        setError(data.error || 'Eklenemedi')
      }
    } catch { setError('Bir hata oluştu') }
    finally { setAdding(false) }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/tiktok-videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive }),
    })
    fetchVideos()
  }

  const deleteVideo = async (id: string) => {
    if (!confirm('Bu videoyu silmek istediğinize emin misiniz?')) return
    await fetch(`/api/admin/tiktok-videos?id=${id}`, { method: 'DELETE' })
    fetchVideos()
  }

  const moveOrder = async (id: string, direction: 'up' | 'down') => {
    const idx = videos.findIndex(v => v.id === id)
    if (idx < 0) return
    const newOrder = direction === 'up' ? Math.max(0, videos[idx].sortOrder - 1) : videos[idx].sortOrder + 1
    await fetch('/api/admin/tiktok-videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, sortOrder: newOrder }),
    })
    fetchVideos()
  }

  const changeVideoCategory = async (videoId: string, categoryId: string | null) => {
    await fetch('/api/admin/tiktok-videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: videoId, categoryId }),
    })
    setChangingCategoryFor(null)
    fetchVideos()
  }

  // Category CRUD
  const createCategory = async () => {
    if (!newCategoryName.trim()) return
    setCreatingCategory(true)
    try {
      const res = await fetch('/api/admin/tiktok-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newCategoryName.trim() }),
      })
      if (res.ok) {
        setNewCategoryName('')
        fetchCategories()
      }
    } catch {} finally { setCreatingCategory(false) }
  }

  const updateCategory = async (id: string) => {
    if (!editCategoryName.trim()) return
    await fetch('/api/admin/tiktok-categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title: editCategoryName.trim() }),
    })
    setEditingCategory(null)
    fetchCategories()
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz? Videolar kategorisiz kalacak.')) return
    await fetch(`/api/admin/tiktok-categories?id=${id}`, { method: 'DELETE' })
    fetchCategories()
    if (filterCategoryId === id) {
      setFilterCategoryId('')
      fetchVideos('', searchQuery)
    }
  }

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    fetchVideos(filterCategoryId, q)
  }

  const handleFilterCategory = (catId: string) => {
    setFilterCategoryId(catId)
    fetchVideos(catId, searchQuery)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
    </div>
  )

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <AdminBackButton />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-red-600">
                <Music2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">TikTok Videoları</h1>
                <p className="text-fuchsia-300 text-sm">{videos.length} video · {categories.length} kategori</p>
              </div>
            </div>
            <button
              onClick={() => setShowCategoryPanel(!showCategoryPanel)}
              className="px-4 py-2 bg-purple-800/50 hover:bg-purple-700/50 border border-purple-500/30 text-white rounded-xl text-sm flex items-center gap-2 transition-colors"
            >
              <Tag className="w-4 h-4" />
              Kategoriler
            </button>
          </div>
        </motion.div>

        {/* Category Management Panel */}
        <AnimatePresence>
          {showCategoryPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-gradient-to-r from-purple-900/40 to-fuchsia-900/20 rounded-xl p-5 border border-purple-500/20">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-fuchsia-400" />
                  Kategori Yönetimi
                </h3>

                {/* Create category */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Yeni kategori adı..."
                    className="flex-1 px-4 py-2.5 bg-deep-purple-900/60 border border-purple-500/30 rounded-lg text-white placeholder-purple-400/60 focus:outline-none focus:border-fuchsia-500/50 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && createCategory()}
                  />
                  <button
                    onClick={createCategory}
                    disabled={creatingCategory || !newCategoryName.trim()}
                    className="px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  >
                    {creatingCategory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Ekle
                  </button>
                </div>

                {/* Category list */}
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center gap-3 px-3 py-2.5 bg-deep-purple-800/40 rounded-lg border border-purple-500/10">
                      {editingCategory === cat.id ? (
                        <>
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-deep-purple-900/60 border border-purple-500/30 rounded text-white text-sm focus:outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && updateCategory(cat.id)}
                            autoFocus
                          />
                          <button onClick={() => updateCategory(cat.id)} className="text-green-400 hover:text-green-300 p-1"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingCategory(null)} className="text-purple-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <Tag className="w-3.5 h-3.5 text-fuchsia-400 flex-shrink-0" />
                          <span className="text-white text-sm flex-1">{cat.title}</span>
                          <span className="text-purple-400/60 text-xs">{cat._count?.videos || 0} video</span>
                          <button onClick={() => { setEditingCategory(cat.id); setEditCategoryName(cat.title) }} className="text-purple-400 hover:text-white p-1 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteCategory(cat.id)} className="text-red-400/70 hover:text-red-300 p-1 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-purple-400/50 text-sm text-center py-3">Henüz kategori eklenmemiş</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filter Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Video ara (başlık, kullanıcı adı, URL)..."
                className="w-full pl-10 pr-4 py-3 bg-deep-purple-900/40 border border-purple-500/20 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-fuchsia-500/40 text-sm"
              />
              {searchQuery && (
                <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400/60 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={filterCategoryId}
              onChange={(e) => handleFilterCategory(e.target.value)}
              className="px-4 py-3 bg-deep-purple-900/40 border border-purple-500/20 rounded-xl text-white text-sm focus:outline-none focus:border-fuchsia-500/40 min-w-[180px] appearance-none cursor-pointer"
              style={selectStyle}
            >
              <option value="">Tüm Kategoriler</option>
              <option value="uncategorized">Kategorisiz</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        </motion.div>

        {/* Add Videos Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-deep-purple-800/50 to-purple-900/30 rounded-xl p-5 border border-purple-500/20 mb-6"
        >
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-fuchsia-400" />
            TikTok Videosu Ekle
            <span className="text-purple-400/60 text-xs font-normal ml-2">Her satıra bir link yapıştırın · Sınırsız ekleme</span>
          </h3>
          <div className="space-y-3">
            <textarea
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder={"https://www.tiktok.com/@kullanici/video/123456789\nhttps://www.tiktok.com/@kullanici2/video/987654321\nhttps://www.tiktok.com/@kullanici3/video/456789123"}
              className="w-full px-4 py-3 bg-deep-purple-900/60 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/40 focus:outline-none focus:border-fuchsia-500/50 text-sm h-32 resize-y font-mono"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={addCategoryId}
                onChange={(e) => setAddCategoryId(e.target.value)}
                className="px-4 py-3 bg-deep-purple-900/60 border border-purple-500/30 rounded-xl text-white text-sm focus:outline-none focus:border-fuchsia-500/50 flex-1 sm:flex-initial sm:min-w-[200px] appearance-none cursor-pointer"
                style={selectStyle}
              >
                <option value="">Kategorisiz</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <button
                onClick={addVideos}
                disabled={adding || !bulkUrls.trim()}
                className="px-6 py-3 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-all"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {adding ? 'Ekleniyor...' : `Ekle (${bulkUrls.split('\n').filter(u => u.trim() && u.trim().startsWith('http')).length} video)`}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          {addResult && (
            <div className="mt-3 p-3 rounded-lg bg-deep-purple-900/40 border border-purple-500/10">
              <p className="text-green-400 text-sm">
                ✅ {addResult.added} video başarıyla eklendi
              </p>
              {addResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {addResult.errors.map((err, i) => (
                    <p key={i} className="text-red-400/80 text-xs">⚠ {err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Video list */}
        <div className="space-y-3">
          <AnimatePresence>
            {videos.map((video, idx) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.03 }}
                className={`rounded-xl p-4 border transition-all ${
                  video.isActive
                    ? 'bg-deep-purple-800/40 border-purple-500/20'
                    : 'bg-deep-purple-900/30 border-purple-500/10 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  {video.thumbnailUrl && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-purple-900/50">
                      <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm line-clamp-2">
                      {video.title || 'Başlıksız Video'}
                    </p>
                    {video.authorName && (
                      <p className="text-fuchsia-300 text-xs mt-1">@{video.authorName}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Category badge / change */}
                      <div className="relative">
                        <button
                          onClick={() => setChangingCategoryFor(changingCategoryFor === video.id ? null : video.id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border border-purple-500/20 hover:border-fuchsia-500/40 transition-colors"
                          style={{ background: video.category ? 'rgba(168,85,247,0.15)' : 'rgba(100,100,100,0.15)' }}
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span className={video.category ? 'text-fuchsia-300' : 'text-purple-400/60'}>
                            {video.category?.title || 'Kategorisiz'}
                          </span>
                          <ChevronDown className="w-2.5 h-2.5 text-purple-400/60" />
                        </button>
                        {changingCategoryFor === video.id && (
                          <div className="absolute top-full left-0 mt-1 bg-deep-purple-900 border border-purple-500/30 rounded-lg shadow-xl z-20 min-w-[160px] py-1 max-h-48 overflow-y-auto">
                            <button
                              onClick={() => changeVideoCategory(video.id, null)}
                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-purple-800/50 transition-colors ${!video.categoryId ? 'text-fuchsia-300' : 'text-purple-300'}`}
                            >
                              Kategorisiz
                            </button>
                            {categories.map(c => (
                              <button
                                key={c.id}
                                onClick={() => changeVideoCategory(video.id, c.id)}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-purple-800/50 transition-colors ${video.categoryId === c.id ? 'text-fuchsia-300' : 'text-purple-300'}`}
                              >
                                {c.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-purple-400/40 text-[10px] truncate max-w-[200px]">{video.tiktokUrl}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => moveOrder(video.id, 'up')} className="p-1.5 rounded-lg hover:bg-purple-800/50 text-purple-400 hover:text-white transition-colors" title="Yukarı">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveOrder(video.id, 'down')} className="p-1.5 rounded-lg hover:bg-purple-800/50 text-purple-400 hover:text-white transition-colors" title="Aşağı">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleActive(video.id, video.isActive)} className={`p-1.5 rounded-lg transition-colors ${video.isActive ? 'hover:bg-yellow-800/30 text-green-400' : 'hover:bg-green-800/30 text-yellow-400'}`} title={video.isActive ? 'Gizle' : 'Göster'}>
                      {video.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <a href={video.tiktokUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-purple-800/50 text-purple-400 hover:text-white transition-colors" title="TikTok'ta aç">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button onClick={() => deleteVideo(video.id)} className="p-1.5 rounded-lg hover:bg-red-800/30 text-red-400 hover:text-red-300 transition-colors" title="Sil">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {videos.length === 0 && (
            <div className="text-center py-12">
              <Music2 className="w-12 h-12 text-purple-500/30 mx-auto mb-3" />
              <p className="text-purple-300/60">
                {searchQuery || filterCategoryId ? 'Arama kriterlerine uygun video bulunamadı' : 'Henüz TikTok videosu eklenmemiş'}
              </p>
              <p className="text-purple-400/40 text-sm mt-1">
                {searchQuery || filterCategoryId ? 'Farklı filtreler deneyin' : 'Yukarıdan TikTok video linkleri ekleyerek başlayın'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
