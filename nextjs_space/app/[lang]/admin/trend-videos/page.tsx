'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, FolderPlus, Youtube, Search, ChevronDown, ChevronUp, X, Check, Loader2, ExternalLink, Eye, EyeOff, CheckSquare, Square, Film } from 'lucide-react'
import Image from 'next/image'

interface TrendVideoCategory {
  id: string
  title: string
  slug: string
  description: string | null
  sortOrder: number
  isActive: boolean
  videos: TrendVideo[]
}

interface TrendVideo {
  id: string
  categoryId: string
  title: string
  youtubeId: string
  thumbnailUrl: string | null
  channelName: string | null
  duration: string | null
  viewCount: number
  sortOrder: number
  isActive: boolean
  createdAt: string
}

interface YouTubeSearchResult {
  youtubeId: string
  title: string
  thumbnailUrl: string
  channelName: string
  duration: string
  viewCount: number
  viewCountFormatted: string
  description: string
  selected?: boolean
}

export default function AdminTrendVideos() {
  const { data: session } = useSession() || {}
  const [categories, setCategories] = useState<TrendVideoCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  // New category form
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatTitle, setNewCatTitle] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  // Edit category
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [editCatTitle, setEditCatTitle] = useState('')

  // Video Ekle modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addCatId, setAddCatId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([])
  const [savingVideos, setSavingVideos] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Edit video
  const [editVideoId, setEditVideoId] = useState<string | null>(null)
  const [editVideoTitle, setEditVideoTitle] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/trend-videos')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleExpand = (catId: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(catId) ? next.delete(catId) : next.add(catId)
      return next
    })
  }

  // Create category
  const handleCreateCategory = async () => {
    if (!newCatTitle.trim()) return
    setSavingCat(true)
    try {
      await fetch('/api/admin/trend-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_category', title: newCatTitle, description: newCatDesc })
      })
      setNewCatTitle(''); setNewCatDesc(''); setShowNewCat(false)
      fetchData()
    } catch (e) { console.error(e) }
    finally { setSavingCat(false) }
  }

  // Update category
  const handleUpdateCategory = async (id: string) => {
    try {
      await fetch('/api/admin/trend-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_category', id, title: editCatTitle })
      })
      setEditCatId(null)
      fetchData()
    } catch (e) { console.error(e) }
  }

  const handleToggleCategory = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/trend-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_category', id, isActive: !isActive })
    })
    fetchData()
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Bu kategoriyi ve tüm videolarını silmek istediğinize emin misiniz?')) return
    await fetch('/api/admin/trend-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_category', id })
    })
    fetchData()
  }

  // YouTube search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchError('')
    setSearchResults([])
    try {
      const res = await fetch('/api/admin/trend-videos/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: searchQuery.trim(), maxResults: 50 })
      })
      const data = await res.json()
      if (!res.ok) {
        setSearchError(data.error || 'Arama başarısız')
        return
      }
      // Filter out already added videos
      const existingYoutubeIds = new Set(
        categories.flatMap(c => c.videos.map(v => v.youtubeId))
      )
      const filtered = (data.results || [])
        .filter((r: any) => !existingYoutubeIds.has(r.youtubeId))
        .map((r: any) => ({ ...r, selected: false }))
      setSearchResults(filtered)
      if (filtered.length === 0 && (data.results || []).length > 0) {
        setSearchError('Tüm sonuçlar zaten eklenmiş')
      }
    } catch (e) {
      setSearchError('Bir hata oluştu')
    } finally {
      setSearching(false)
    }
  }

  // Toggle video selection
  const toggleSelect = (idx: number) => {
    setSearchResults(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r))
  }

  const toggleSelectAll = () => {
    const allSelected = searchResults.every(r => r.selected)
    setSearchResults(prev => prev.map(r => ({ ...r, selected: !allSelected })))
  }

  const selectedCount = searchResults.filter(r => r.selected).length

  // Save selected videos
  const handleSaveSelected = async () => {
    if (!addCatId || selectedCount === 0) return
    setSavingVideos(true)
    try {
      const selected = searchResults.filter(r => r.selected)
      await fetch('/api/admin/trend-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_videos_bulk',
          categoryId: addCatId,
          videos: selected.map(v => ({
            title: v.title,
            youtubeId: v.youtubeId,
            thumbnailUrl: v.thumbnailUrl,
            channelName: v.channelName,
            duration: v.duration,
          }))
        })
      })
      setShowAddModal(false)
      setSearchResults([])
      setSearchQuery('')
      fetchData()
    } catch (e) { console.error(e) }
    finally { setSavingVideos(false) }
  }

  const handleToggleVideo = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/trend-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_video', id, isActive: !isActive })
    })
    fetchData()
  }

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Bu videoyu silmek istediğinize emin misiniz?')) return
    await fetch('/api/admin/trend-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_video', id })
    })
    fetchData()
  }

  const handleUpdateVideoTitle = async (id: string) => {
    if (!editVideoTitle.trim()) return
    await fetch('/api/admin/trend-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_video', id, title: editVideoTitle })
    })
    setEditVideoId(null)
    fetchData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
      </div>
    )
  }

  const totalVideos = categories.reduce((sum, c) => sum + c.videos.length, 0)

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Youtube className="w-7 h-7 text-red-500" />
            Trend Videolar
          </h1>
          <p className="text-sm text-white/50 mt-1">{categories.length} kategori, {totalVideos} video</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAddModal(true); setAddCatId(categories[0]?.id || ''); setSearchResults([]); setSearchQuery('') }}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-red-500/20 transition-all"
          >
            <Film className="w-4 h-4" /> Video Ekle
          </button>
          <button
            onClick={() => setShowNewCat(true)}
            className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-fuchsia-500/20 transition-all"
          >
            <FolderPlus className="w-4 h-4" /> Yeni Kategori
          </button>
        </div>
      </div>

      {/* New category form */}
      <AnimatePresence>
        {showNewCat && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <input value={newCatTitle} onChange={e => setNewCatTitle(e.target.value)} placeholder="Kategori başlığı (ör: Komik Videolar)" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-fuchsia-500/50" />
              <input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Açıklama (opsiyonel)" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-fuchsia-500/50" />
              <div className="flex gap-2">
                <button onClick={() => setShowNewCat(false)} className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-lg text-sm">İptal</button>
                <button onClick={handleCreateCategory} disabled={savingCat || !newCatTitle.trim()} className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                  {savingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Oluştur
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      {categories.length === 0 ? (
        <div className="text-center py-16">
          <Youtube className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Henüz kategori eklenmemiş</p>
          <p className="text-white/20 text-sm mt-1">Yeni Kategori butonuna tıklayarak başlayın</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.id} className={`bg-white/5 border rounded-xl overflow-hidden transition-all ${cat.isActive ? 'border-white/10' : 'border-red-500/20 opacity-60'}`}>
              {/* Category header */}
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => toggleExpand(cat.id)}>
                <div className="flex-1 min-w-0">
                  {editCatId === cat.id ? (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <input value={editCatTitle} onChange={e => setEditCatTitle(e.target.value)} className="flex-1 px-3 py-1.5 bg-white/5 border border-fuchsia-500/30 rounded-lg text-white text-sm focus:outline-none" />
                      <button onClick={() => handleUpdateCategory(cat.id)} className="px-3 py-1.5 bg-fuchsia-600 text-white rounded-lg text-xs"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditCatId(null)} className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-white font-semibold text-sm">{cat.title}</h3>
                      {cat.description && <p className="text-white/40 text-xs mt-0.5">{cat.description}</p>}
                    </>
                  )}
                </div>
                <span className="text-xs text-white/40 flex-shrink-0">{cat.videos.length} video</span>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleToggleCategory(cat.id, cat.isActive)} className="p-1.5 rounded-lg hover:bg-white/10" title={cat.isActive ? 'Gizle' : 'Göster'}>
                    {cat.isActive ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-red-400" />}
                  </button>
                  <button onClick={() => { setEditCatId(cat.id); setEditCatTitle(cat.title) }} className="p-1.5 rounded-lg hover:bg-white/10">
                    <Edit className="w-4 h-4 text-blue-400" />
                  </button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 rounded-lg hover:bg-white/10">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
                {expandedCats.has(cat.id) ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </div>

              {/* Videos */}
              <AnimatePresence>
                {expandedCats.has(cat.id) && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-white/5 divide-y divide-white/5">
                      {cat.videos.length === 0 ? (
                        <div className="p-6 text-center text-white/30 text-sm">Henüz video yok</div>
                      ) : cat.videos.map(video => (
                        <div key={video.id} className={`flex items-center gap-3 px-4 py-3 ${!video.isActive ? 'opacity-40' : ''}`}>
                          <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                            {video.thumbnailUrl && <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" sizes="96px" />}
                            {video.duration && <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 rounded">{video.duration}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            {editVideoId === video.id ? (
                              <div className="flex gap-2">
                                <input value={editVideoTitle} onChange={e => setEditVideoTitle(e.target.value)} className="flex-1 px-2 py-1 bg-white/5 border border-fuchsia-500/30 rounded text-white text-xs focus:outline-none" />
                                <button onClick={() => handleUpdateVideoTitle(video.id)} className="px-2 py-1 bg-fuchsia-600 text-white rounded text-xs"><Check className="w-3 h-3" /></button>
                                <button onClick={() => setEditVideoId(null)} className="px-2 py-1 bg-white/10 text-white rounded text-xs"><X className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <>
                                <p className="text-white text-xs font-medium truncate">{video.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {video.channelName && <span className="text-white/40 text-[10px]">{video.channelName}</span>}
                                  <span className="text-white/30 text-[10px]">{video.viewCount.toLocaleString()} görüntülenme</span>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <a href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-white/10">
                              <ExternalLink className="w-3.5 h-3.5 text-white/40" />
                            </a>
                            <button onClick={() => handleToggleVideo(video.id, video.isActive)} className="p-1.5 rounded hover:bg-white/10">
                              {video.isActive ? <Eye className="w-3.5 h-3.5 text-green-400" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />}
                            </button>
                            <button onClick={() => { setEditVideoId(video.id); setEditVideoTitle(video.title) }} className="p-1.5 rounded hover:bg-white/10">
                              <Edit className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                            <button onClick={() => handleDeleteVideo(video.id)} className="p-1.5 rounded hover:bg-white/10">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* ===== VIDEO EKLE MODAL ===== */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-gradient-to-br from-[#1a0a2e] to-[#0d0520] border border-fuchsia-500/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Film className="w-5 h-5 text-red-500" /> Video Ekle
                  </h3>
                  <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-white/10">
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                {/* Category select */}
                <div className="mt-3">
                  <label className="text-xs text-white/50 mb-1 block">Kategori Seçin</label>
                  <select
                    value={addCatId}
                    onChange={e => setAddCatId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-fuchsia-500/50 appearance-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#1a0a2e] text-white">{c.title}</option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="YouTube'da ara (ör: komik, burç, fal)..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all flex-shrink-0"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Ara
                  </button>
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto p-5">
                {searchError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-300 text-sm mb-4">
                    {searchError}
                  </div>
                )}

                {searching && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-red-400 mx-auto mb-2" />
                      <p className="text-white/40 text-sm">YouTube&apos;da aranıyor...</p>
                    </div>
                  </div>
                )}

                {!searching && searchResults.length > 0 && (
                  <div className="space-y-2">
                    {/* Select all / count */}
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
                        {searchResults.every(r => r.selected) ? (
                          <CheckSquare className="w-4 h-4 text-fuchsia-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        Hepsini Seç
                      </button>
                      <span className="text-xs text-white/40">
                        {selectedCount} / {searchResults.length} seçili
                      </span>
                    </div>

                    {searchResults.map((r, idx) => (
                      <div
                        key={idx}
                        onClick={() => toggleSelect(idx)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                          r.selected
                            ? 'bg-fuchsia-500/10 border border-fuchsia-500/30'
                            : 'bg-white/5 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="flex-shrink-0">
                          {r.selected ? (
                            <CheckSquare className="w-5 h-5 text-fuchsia-400" />
                          ) : (
                            <Square className="w-5 h-5 text-white/30" />
                          )}
                        </div>

                        {/* Thumbnail */}
                        <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                          <Image src={r.thumbnailUrl} alt={r.title} fill className="object-cover" sizes="112px" />
                          {r.duration && <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 rounded">{r.duration}</span>}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium line-clamp-2">{r.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-white/40 text-[10px]">{r.channelName}</span>
                            <span className="text-white/30 text-[10px]">• {r.viewCountFormatted} görüntülenme</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!searching && searchResults.length === 0 && !searchError && (
                  <div className="text-center py-12">
                    <Youtube className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30 text-sm">YouTube&apos;da video aramak için yukarıdaki arama kutusunu kullanın</p>
                  </div>
                )}
              </div>

              {/* Footer with save */}
              {selectedCount > 0 && (
                <div className="p-4 border-t border-white/10 flex-shrink-0">
                  <button
                    onClick={handleSaveSelected}
                    disabled={savingVideos || !addCatId}
                    className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    {savingVideos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {savingVideos ? 'Kaydediliyor...' : `${selectedCount} Video Ekle — ${categories.find(c => c.id === addCatId)?.title || ''}`}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
