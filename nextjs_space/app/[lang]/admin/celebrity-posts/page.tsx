'use client'

import AdminBackButton from '@/components/admin-back-button'
import { useState, useEffect, useCallback } from 'react'
import { useSiteTheme } from '@/lib/theme-context'
import {
  Plus, Trash2, Save, Loader2, Search, Instagram, Youtube, Globe,
  Twitter, Play, X, Image as ImageIcon, Edit, Eye, EyeOff, Pin,
  Sparkles, Newspaper, Bot
} from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

interface Celebrity {
  id: string
  name: string
  slug: string
  profileImage: string | null
}

interface CelebPost {
  id: string
  celebrityId: string
  platform: string
  postType: string
  content: string | null
  mediaUrl: string | null
  externalUrl: string | null
  likeCount: number
  commentCount: number
  isActive: boolean
  isPinned: boolean
  createdAt: string
  celebrity: { name: string; slug: string; profileImage: string | null }
}

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
  { value: 'x', label: 'X (Twitter)', icon: Twitter, color: 'from-gray-600 to-gray-800' },
  { value: 'youtube', label: 'YouTube', icon: Youtube, color: 'from-red-500 to-red-700' },
  { value: 'tiktok', label: 'TikTok', icon: Play, color: 'from-cyan-400 to-pink-500' },
  { value: 'haber', label: 'AI Haber', icon: Newspaper, color: 'from-emerald-500 to-teal-600' },
]

const POST_TYPES = [
  { value: 'photo', label: 'Fotoğraf' },
  { value: 'video', label: 'Video' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Hikâye' },
  { value: 'tweet', label: 'Tweet' },
  { value: 'short', label: 'Short' },
]

export default function AdminCelebrityPostsPage() {
  const { theme } = useSiteTheme()
  const isLight = theme === 'facebook'

  const [celebrities, setCelebrities] = useState<Celebrity[]>([])
  const [posts, setPosts] = useState<CelebPost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCelebrity, setSelectedCelebrity] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    celebrityIds: [] as string[], platforms: [] as string[], postType: 'photo',
    content: '', mediaUrl: '', externalUrl: '', isPinned: false,
    // single select for edit mode
    celebrityId: '', platform: 'instagram',
  })

  // AI Generate state
  const [showAiForm, setShowAiForm] = useState(false)
  const [aiCelebrityId, setAiCelebrityId] = useState('')
  const [aiTopic, setAiTopic] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResult, setAiResult] = useState<{ title: string; content: string; summary: string } | null>(null)
  const [aiError, setAiError] = useState('')

  const handleAiGenerate = async () => {
    if (!aiCelebrityId) return
    setAiGenerating(true)
    setAiError('')
    setAiResult(null)
    try {
      const res = await fetch('/api/admin/celebrity-posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celebrityId: aiCelebrityId, topic: aiTopic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Oluşturma başarısız')
      setAiResult(data.generated)
      setShowAiForm(false)
      setAiCelebrityId('')
      setAiTopic('')
      loadPosts()
    } catch (err: any) {
      setAiError(err.message || 'Bir hata oluştu')
    } finally {
      setAiGenerating(false)
    }
  }

  const loadCelebrities = useCallback(async () => {
    try {
      const res = await fetch('/api/celebrities?limit=100')
      const data = await res.json()
      setCelebrities(data.celebrities || [])
    } catch {}
  }, [])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/admin/celebrity-posts?limit=50'
      if (selectedCelebrity) url += `&celebrityId=${selectedCelebrity}`
      if (platformFilter) url += `&platform=${platformFilter}`
      const res = await fetch(url)
      const data = await res.json()
      setPosts(data.posts || [])
    } catch {}
    setLoading(false)
  }, [selectedCelebrity, platformFilter])

  useEffect(() => { loadCelebrities() }, [loadCelebrities])
  useEffect(() => { loadPosts() }, [loadPosts])

  const handleSave = async () => {
    if (editingId) {
      if (!form.celebrityId || !form.platform) return
    } else {
      if (form.celebrityIds.length === 0 || form.platforms.length === 0) return
    }
    setSaving(true)
    try {
      if (editingId) {
        await fetch('/api/admin/celebrity-posts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, celebrityId: form.celebrityId, platform: form.platform, postType: form.postType, content: form.content, mediaUrl: form.mediaUrl, externalUrl: form.externalUrl, isPinned: form.isPinned }),
        })
      } else {
        await fetch('/api/admin/celebrity-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ celebrityIds: form.celebrityIds, platforms: form.platforms, postType: form.postType, content: form.content, mediaUrl: form.mediaUrl, externalUrl: form.externalUrl, isPinned: form.isPinned }),
        })
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ celebrityIds: [], platforms: [], postType: 'photo', content: '', mediaUrl: '', externalUrl: '', isPinned: false, celebrityId: '', platform: 'instagram' })
      loadPosts()
    } catch {}
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu paylaşımı silmek istediğinize emin misiniz?')) return
    try {
      await fetch(`/api/admin/celebrity-posts?id=${id}`, { method: 'DELETE' })
      loadPosts()
    } catch {}
  }

  const handleEdit = (post: CelebPost) => {
    setEditingId(post.id)
    setForm({
      celebrityId: post.celebrityId,
      platform: post.platform,
      celebrityIds: [post.celebrityId],
      platforms: [post.platform],
      postType: post.postType,
      content: post.content || '',
      mediaUrl: post.mediaUrl || '',
      externalUrl: post.externalUrl || '',
      isPinned: post.isPinned,
    })
    setShowForm(true)
  }

  const handleToggleActive = async (post: CelebPost) => {
    try {
      await fetch('/api/admin/celebrity-posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, isActive: !post.isActive }),
      })
      loadPosts()
    } catch {}
  }

  const inputClass = isLight
    ? 'w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm'
    : 'w-full px-3 py-2 rounded-lg border border-purple-500/20 bg-purple-900/20 text-white text-sm placeholder-purple-300/40'
  const cardClass = isLight
    ? 'bg-white border border-gray-200 rounded-xl shadow-sm'
    : 'bg-purple-900/20 border border-purple-500/10 rounded-xl backdrop-blur-sm'
  const labelClass = isLight ? 'text-sm font-medium text-gray-700 mb-1' : 'text-sm font-medium text-purple-300/80 mb-1'

  return (
    <div className={`min-h-screen pb-20 ${isLight ? 'bg-gray-50' : 'bg-gradient-to-br from-[#0a0014] via-[#1a0030] to-[#0d001a]'}`}>
      <div className="max-w-4xl mx-auto px-4 pt-20">
        <AdminBackButton />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Ünlü Paylaşımları Yönetimi
            </h1>
            <p className={`text-sm mt-1 ${isLight ? 'text-gray-500' : 'text-purple-300/60'}`}>
              Ünlülerin sosyal medya paylaşımlarını ekleyin ve yönetin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAiForm(true); setAiError(''); setAiResult(null) }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:from-emerald-500 hover:to-teal-500 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> AI Haber Oluştur
            </button>
            <button
              onClick={() => { setEditingId(null); setForm({ celebrityIds: [], platforms: [], postType: 'photo', content: '', mediaUrl: '', externalUrl: '', isPinned: false, celebrityId: '', platform: 'instagram' }); setShowForm(true) }}
              className="px-4 py-2 bg-fuchsia-600 text-white rounded-xl text-sm font-medium hover:bg-fuchsia-500 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Manuel Ekle
            </button>
          </div>
        </div>

        {/* AI Generate Modal */}
        <AnimatePresence>
          {showAiForm && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !aiGenerating && setShowAiForm(false)}
            >
              <motion.div
                className={`w-full max-w-md rounded-2xl p-6 ${isLight ? 'bg-white' : 'bg-[#1a0030] border border-emerald-500/20'}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                      <Bot className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                    </div>
                    <h2 className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      AI Haber Oluştur
                    </h2>
                  </div>
                  <button onClick={() => !aiGenerating && setShowAiForm(false)} className="p-1.5 rounded-full hover:bg-white/10">
                    <X className={`w-5 h-5 ${isLight ? 'text-gray-500' : 'text-purple-300'}`} />
                  </button>
                </div>

                <p className={`text-sm mb-4 ${isLight ? 'text-gray-500' : 'text-purple-300/60'}`}>
                  Yapay zeka seçtiğiniz ünlü hakkında güncel haber yazısı oluşturacak ve kendi yorumunu ekleyecek.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Ünlü Seçin *</label>
                    <select value={aiCelebrityId} onChange={e => setAiCelebrityId(e.target.value)} className={inputClass}>
                      <option value="">Ünlü seçin</option>
                      {celebrities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Konu / Anahtar Kelime (Opsiyonel)</label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={e => setAiTopic(e.target.value)}
                      className={inputClass}
                      placeholder="Örn: son dizisi, transfer haberleri, konser..."
                    />
                    <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-purple-400/40'}`}>
                      Boş bırakırsanız genel güncel haberler oluşturulur
                    </p>
                  </div>

                  {aiError && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                      {aiError}
                    </div>
                  )}

                  <button
                    onClick={handleAiGenerate}
                    disabled={aiGenerating || !aiCelebrityId}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  >
                    {aiGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Haber oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Haber Oluştur & Paylaş
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Result Banner */}
        <AnimatePresence>
          {aiResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-4 p-4 rounded-xl border ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className={`font-semibold text-sm ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>
                      ✅ AI Haber başarıyla oluşturuldu!
                    </p>
                    <p className={`text-sm mt-1 ${isLight ? 'text-emerald-700' : 'text-emerald-200/70'}`}>
                      <strong>{aiResult.title}</strong>
                    </p>
                    <p className={`text-xs mt-1 ${isLight ? 'text-emerald-600' : 'text-emerald-300/50'}`}>
                      {aiResult.summary}
                    </p>
                  </div>
                </div>
                <button onClick={() => setAiResult(null)} className="p-1 rounded-full hover:bg-white/10 flex-shrink-0">
                  <X className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={selectedCelebrity}
            onChange={(e) => setSelectedCelebrity(e.target.value)}
            className={inputClass + ' max-w-xs'}
          >
            <option value="">Tüm Ünlüler</option>
            {celebrities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className={inputClass + ' max-w-xs'}
          >
            <option value="">Tüm Platformlar</option>
            {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
            >
              <motion.div
                className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 ${isLight ? 'bg-white' : 'bg-[#1a0030] border border-purple-500/20'}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    {editingId ? 'Paylaşım Düzenle' : 'Yeni Paylaşım Ekle'}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full hover:bg-white/10">
                    <X className={`w-5 h-5 ${isLight ? 'text-gray-500' : 'text-purple-300'}`} />
                  </button>
                </div>

                <div className="space-y-4">
                  {editingId ? (
                    /* Single select for editing */
                    <div>
                      <label className={labelClass}>Ünlü *</label>
                      <select value={form.celebrityId} onChange={e => setForm(f => ({ ...f, celebrityId: e.target.value }))} className={inputClass}>
                        <option value="">Ünlü seçin</option>
                        {celebrities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    /* Multi-select for new posts */
                    <div>
                      <label className={labelClass}>Ünlüler * <span className={`text-xs font-normal ${isLight ? 'text-gray-400' : 'text-purple-400/50'}`}>({form.celebrityIds.length} seçili)</span></label>
                      <div className={`max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1 ${isLight ? 'border-gray-300 bg-white' : 'border-purple-500/20 bg-purple-900/20'}`}>
                        <button type="button" onClick={() => setForm(f => ({ ...f, celebrityIds: f.celebrityIds.length === celebrities.length ? [] : celebrities.map(c => c.id) }))} className={`text-[10px] px-2 py-0.5 rounded-full mb-1 ${isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'}`}>
                          {form.celebrityIds.length === celebrities.length ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
                        </button>
                        {celebrities.map(c => (
                          <label key={c.id} className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded-lg transition-colors ${form.celebrityIds.includes(c.id) ? (isLight ? 'bg-fuchsia-50' : 'bg-fuchsia-500/10') : 'hover:bg-white/5'}`}>
                            <input type="checkbox" checked={form.celebrityIds.includes(c.id)} onChange={e => {
                              setForm(f => ({ ...f, celebrityIds: e.target.checked ? [...f.celebrityIds, c.id] : f.celebrityIds.filter(id => id !== c.id) }))
                            }} className="w-3.5 h-3.5 rounded border-purple-500/30" />
                            <span className={`text-sm ${isLight ? 'text-gray-700' : 'text-purple-200/80'}`}>{c.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {editingId ? (
                      <div>
                        <label className={labelClass}>Platform *</label>
                        <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className={inputClass}>
                          {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className={labelClass}>Platformlar * <span className={`text-xs font-normal ${isLight ? 'text-gray-400' : 'text-purple-400/50'}`}>({form.platforms.length})</span></label>
                        <div className="space-y-1">
                          {PLATFORMS.map(p => {
                            const PIcon = p.icon
                            return (
                              <label key={p.value} className={`flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg transition-colors ${form.platforms.includes(p.value) ? (isLight ? 'bg-fuchsia-50' : 'bg-fuchsia-500/10') : 'hover:bg-white/5'}`}>
                                <input type="checkbox" checked={form.platforms.includes(p.value)} onChange={e => {
                                  setForm(f => ({ ...f, platforms: e.target.checked ? [...f.platforms, p.value] : f.platforms.filter(v => v !== p.value) }))
                                }} className="w-3.5 h-3.5 rounded border-purple-500/30" />
                                <PIcon className="w-3.5 h-3.5" />
                                <span className={`text-sm ${isLight ? 'text-gray-700' : 'text-purple-200/80'}`}>{p.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className={labelClass}>Tür</label>
                      <select value={form.postType} onChange={e => setForm(f => ({ ...f, postType: e.target.value }))} className={inputClass}>
                        {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>İçerik</label>
                    <textarea
                      value={form.content}
                      onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                      className={inputClass + ' h-24 resize-none'}
                      placeholder="Paylaşım içeriği..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Medya URL (Resim/Video)</label>
                    <input
                      type="text"
                      value={form.mediaUrl}
                      onChange={e => setForm(f => ({ ...f, mediaUrl: e.target.value }))}
                      className={inputClass}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Orijinal Post Linki</label>
                    <input
                      type="text"
                      value={form.externalUrl}
                      onChange={e => setForm(f => ({ ...f, externalUrl: e.target.value }))}
                      className={inputClass}
                      placeholder="https://instagram.com/p/..."
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isPinned}
                      onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))}
                      className="w-4 h-4 rounded border-purple-500/20"
                    />
                    <span className={`text-sm ${isLight ? 'text-gray-700' : 'text-purple-200/80'}`}>Sabitlenmiş (öne çıkar)</span>
                  </label>
                  <button
                    onClick={handleSave}
                    disabled={saving || (editingId ? !form.celebrityId : (form.celebrityIds.length === 0 || form.platforms.length === 0))}
                    className="w-full py-2.5 bg-fuchsia-600 text-white rounded-xl text-sm font-medium hover:bg-fuchsia-500 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editingId ? 'Güncelle' : `Ekle${!editingId && form.celebrityIds.length > 0 && form.platforms.length > 0 ? ` (${form.celebrityIds.length} × ${form.platforms.length} = ${form.celebrityIds.length * form.platforms.length} paylaşım)` : ''}`}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Posts List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className={`text-center py-12 ${cardClass} p-8`}>
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-purple-500/30" />
            <p className={isLight ? 'text-gray-500' : 'text-purple-300/50'}>Henüz paylaşım eklenmemiş</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const platInfo = PLATFORMS.find(p => p.value === post.platform)
              const PlatIcon = platInfo?.icon || Globe
              return (
                <div key={post.id} className={`${cardClass} p-4 flex items-start gap-4 ${!post.isActive ? 'opacity-50' : ''}`}>
                  {post.mediaUrl ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <Image src={post.mediaUrl} alt="" fill className="object-cover" sizes="80px" />
                    </div>
                  ) : (
                    <div className={`w-20 h-20 rounded-lg flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${platInfo?.color || 'from-gray-500 to-gray-700'}`}>
                      <PlatIcon className="w-8 h-8 text-white/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>{post.celebrity.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r ${platInfo?.color || 'from-gray-500 to-gray-700'} text-white`}>
                        {platInfo?.label || post.platform}
                      </span>
                      {post.isPinned && <Pin className="w-3 h-3 text-amber-400" />}
                    </div>
                    {post.content && (
                      <p className={`text-sm line-clamp-2 ${isLight ? 'text-gray-600' : 'text-purple-200/70'}`}>{post.content}</p>
                    )}
                    <div className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-purple-400/50'}`}>
                      {new Date(post.createdAt).toLocaleDateString('tr-TR')} • {post.likeCount} beğeni • {post.commentCount} yorum
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleToggleActive(post)} className="p-1.5 rounded-lg hover:bg-white/10" title={post.isActive ? 'Gizle' : 'Göster'}>
                      {post.isActive ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                    </button>
                    <button onClick={() => handleEdit(post)} className="p-1.5 rounded-lg hover:bg-white/10" title="Düzenle">
                      <Edit className="w-4 h-4 text-blue-400" />
                    </button>
                    <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded-lg hover:bg-white/10" title="Sil">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
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
