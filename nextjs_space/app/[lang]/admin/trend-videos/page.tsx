'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit, FolderPlus, Youtube, Search, ChevronDown, ChevronUp, X, Check, Loader2, ExternalLink, GripVertical, Eye, EyeOff } from 'lucide-react'
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

interface YouTubeResult {
  input: string
  youtubeId?: string
  title?: string
  thumbnailUrl?: string
  channelName?: string
  duration?: string
  error?: string
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
  const [editCatDesc, setEditCatDesc] = useState('')

  // Add videos
  const [addVideosCatId, setAddVideosCatId] = useState<string | null>(null)
  const [youtubeUrls, setYoutubeUrls] = useState('')
  const [fetchingYT, setFetchingYT] = useState(false)
  const [ytResults, setYtResults] = useState<YouTubeResult[]>([])
  const [savingVideos, setSavingVideos] = useState(false)

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
        body: JSON.stringify({ action: 'update_category', id, title: editCatTitle, description: editCatDesc })
      })
      setEditCatId(null)
      fetchData()
    } catch (e) { console.error(e) }
  }

  // Toggle category active
  const handleToggleCategory = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/trend-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_category', id, isActive: !isActive })
    })
    fetchData()
  }

  // Delete category
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Bu kategoriyi ve tüm videolarını silmek istediğinize emin misiniz?')) return
    await fetch('/api/admin/trend-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_category', id })
    })
    fetchData()
  }

  // Fetch YouTube info
  const handleFetchYouTube = async () => {
    const urls = youtubeUrls.split('\n').map(u => u.trim()).filter(Boolean)
    if (urls.length === 0) return
    setFetchingYT(true)
    try {
      const res = await fetch('/api/admin/trend-videos/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      })
      if (res.ok) {
        const data = await res.json()
        setYtResults(data.results || [])
      }
    } catch (e) { console.error(e) }
    finally { setFetchingYT(false) }
  }

  // Save fetched videos
  const handleSaveVideos = async () => {
    if (!addVideosCatId) return
    const validVideos = ytResults.filter(r => r.youtubeId && !r.error)
    if (validVideos.length === 0) return
    setSavingVideos(true)
    try {
      await fetch('/api/admin/trend-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_videos_bulk',
          categoryId: addVideosCatId,
          videos: validVideos.map(v => ({
            title: v.title || 'İsimsiz Video',
            youtubeId: v.youtubeId,
            thumbnailUrl: v.thumbnailUrl,
            channelName: v.channelName,
            duration: v.duration,
          }))
        })
      })
      setAddVideosCatId(null); setYoutubeUrls(''); setYtResults([])
      fetchData()
    } catch (e) { console.error(e) }
    finally { setSavingVideos(false) }
  }

  // Toggle video active
  const handleToggleVideo = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/trend-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_video', id, isActive: !isActive })
    })
    fetchData()
  }

  // Delete video
  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Bu videoyu silmek istediğinize emin misiniz?')) return
    await fetch('/api/admin/trend-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_video', id })
    })
    fetchData()
  }

  // Update video title
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

  // Remove a result from ytResults
  const removeYtResult = (idx: number) => {
    setYtResults(prev => prev.filter((_, i) => i !== idx))
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
            Trend Videolar Yönetimi
          </h1>
          <p className="text-sm text-white/50 mt-1">{categories.length} kategori, {totalVideos} video</p>
        </div>
        <button
          onClick={() => setShowNewCat(true)}
          className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-fuchsia-500/20 transition-all"
        >
          <FolderPlus className="w-4 h-4" /> Yeni Kategori
        </button>
      </div>

      {/* New category form */}
      <AnimatePresence>
        {showNewCat && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <input
                value={newCatTitle}
                onChange={e => setNewCatTitle(e.target.value)}
                placeholder="Kategori başlığı (ör: Burç Videoları)"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-fuchsia-500/50"
              />
              <input
                value={newCatDesc}
                onChange={e => setNewCatDesc(e.target.value)}
                placeholder="Açıklama (opsiyonel)"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-fuchsia-500/50"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowNewCat(false)} className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-lg text-sm">İptal</button>
                <button
                  onClick={handleCreateCategory}
                  disabled={savingCat || !newCatTitle.trim()}
                  className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
                >
                  {savingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Oluştur
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
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleExpand(cat.id)}
              >
                <GripVertical className="w-4 h-4 text-white/20 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {editCatId === cat.id ? (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        value={editCatTitle}
                        onChange={e => setEditCatTitle(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white/5 border border-fuchsia-500/30 rounded-lg text-white text-sm focus:outline-none"
                      />
                      <button onClick={() => handleUpdateCategory(cat.id)} className="px-3 py-1.5 bg-fuchsia-600 text-white rounded-lg text-xs">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditCatId(null)} className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs">
                        <X className="w-3.5 h-3.5" />
                      </button>
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
                  <button
                    onClick={() => handleToggleCategory(cat.id, cat.isActive)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    title={cat.isActive ? 'Gizle' : 'Göster'}
                  >
                    {cat.isActive ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-red-400" />}
                  </button>
                  <button
                    onClick={() => { setEditCatId(cat.id); setEditCatTitle(cat.title); setEditCatDesc(cat.description || '') }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-blue-400" />
                  </button>
                  <button
                    onClick={() => { setAddVideosCatId(cat.id); setYoutubeUrls(''); setYtResults([]) }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    title="Video Ekle"
                  >
                    <Plus className="w-4 h-4 text-fuchsia-400" />
                  </button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
                {expandedCats.has(cat.id) ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </div>

              {/* Videos list */}
              <AnimatePresence>
                {expandedCats.has(cat.id) && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/5 divide-y divide-white/5">
                      {cat.videos.length === 0 ? (
                        <div className="p-6 text-center text-white/30 text-sm">Henüz video yok</div>
                      ) : (
                        cat.videos.map(video => (
                          <div key={video.id} className={`flex items-center gap-3 px-4 py-3 ${!video.isActive ? 'opacity-40' : ''}`}>
                            <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                              {video.thumbnailUrl && (
                                <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" sizes="96px" />
                              )}
                              {video.duration && (
                                <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 rounded">{video.duration}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {editVideoId === video.id ? (
                                <div className="flex gap-2">
                                  <input
                                    value={editVideoTitle}
                                    onChange={e => setEditVideoTitle(e.target.value)}
                                    className="flex-1 px-2 py-1 bg-white/5 border border-fuchsia-500/30 rounded text-white text-xs focus:outline-none"
                                  />
                                  <button onClick={() => handleUpdateVideoTitle(video.id)} className="px-2 py-1 bg-fuchsia-600 text-white rounded text-xs"><Check className="w-3 h-3" /></button>
                                  <button onClick={() => setEditVideoId(null)} className="px-2 py-1 bg-white/10 text-white rounded text-xs"><X className="w-3 h-3" /></button>
                                </div>
                              ) : (
                                <>
                                  <p className="text-white text-xs font-medium truncate">{video.title}</p>
                                  {video.channelName && <p className="text-white/40 text-[10px] mt-0.5">{video.channelName}</p>}
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <a
                                href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                                target="_blank" rel="noopener noreferrer"
                                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-white/40" />
                              </a>
                              <button onClick={() => handleToggleVideo(video.id, video.isActive)} className="p-1.5 rounded hover:bg-white/10 transition-colors">
                                {video.isActive ? <Eye className="w-3.5 h-3.5 text-green-400" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />}
                              </button>
                              <button
                                onClick={() => { setEditVideoId(video.id); setEditVideoTitle(video.title) }}
                                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5 text-blue-400" />
                              </button>
                              <button onClick={() => handleDeleteVideo(video.id)} className="p-1.5 rounded hover:bg-white/10 transition-colors">
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Add Videos Modal */}
      <AnimatePresence>
        {addVideosCatId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setAddVideosCatId(null); setYtResults([]) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-[#1a0a2e] to-[#0d0520] border border-fuchsia-500/20 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-red-500" />
                    Video Ekle — {categories.find(c => c.id === addVideosCatId)?.title}
                  </h3>
                  <button onClick={() => { setAddVideosCatId(null); setYtResults([]) }} className="p-1 rounded-lg hover:bg-white/10">
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1">YouTube URL veya Video ID girin (her satıra bir tane)</p>
              </div>

              <div className="p-5 space-y-4">
                <textarea
                  value={youtubeUrls}
                  onChange={e => setYoutubeUrls(e.target.value)}
                  rows={5}
                  placeholder={'https://www.youtube.com/watch?v=abc123\nhttps://youtu.be/xyz456\ndQw4w9WgXcQ'}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-fuchsia-500/50 resize-none font-mono"
                />

                <button
                  onClick={handleFetchYouTube}
                  disabled={fetchingYT || !youtubeUrls.trim()}
                  className="w-full py-2.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  {fetchingYT ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {fetchingYT ? 'Bilgiler çekiliyor...' : 'YouTube Bilgilerini Çek'}
                </button>

                {/* Results */}
                {ytResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-white/60 font-semibold">{ytResults.filter(r => !r.error).length} video bulundu</p>
                    {ytResults.map((r, idx) => (
                      <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl ${r.error ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-white/10'}`}>
                        {r.error ? (
                          <p className="text-red-400 text-xs flex-1">{r.input}: {r.error}</p>
                        ) : (
                          <>
                            <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                              {r.thumbnailUrl && <Image src={r.thumbnailUrl} alt={r.title || ''} fill className="object-cover" sizes="80px" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <input
                                value={r.title || ''}
                                onChange={e => {
                                  const next = [...ytResults]
                                  next[idx] = { ...next[idx], title: e.target.value }
                                  setYtResults(next)
                                }}
                                className="w-full bg-transparent text-white text-xs font-medium focus:outline-none border-b border-transparent focus:border-fuchsia-500/30"
                              />
                              <p className="text-white/30 text-[10px] mt-0.5">{r.channelName} {r.duration && `· ${r.duration}`}</p>
                            </div>
                            <button onClick={() => removeYtResult(idx)} className="p-1 rounded hover:bg-white/10">
                              <X className="w-3.5 h-3.5 text-white/40" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}

                    <button
                      onClick={handleSaveVideos}
                      disabled={savingVideos || ytResults.filter(r => !r.error).length === 0}
                      className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      {savingVideos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {savingVideos ? 'Kaydediliyor...' : `${ytResults.filter(r => !r.error).length} Video Kaydet`}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
