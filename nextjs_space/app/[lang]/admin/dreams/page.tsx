'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Plus, Edit, Trash2, Eye, EyeOff, Save, X, Moon, Sparkles, Loader2, Search, BarChart3, Upload, FolderPlus } from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '@/components/loading-spinner'
import { DREAM_CATEGORIES } from '@/lib/dream-categories'

interface Dream {
  id: string
  title: string
  slug: string
  content: string
  summary: string | null
  keywords: string[]
  metaDescription: string | null
  category: string
  views: number
  isPublished: boolean
  isAiGenerated: boolean
  createdAt: string
  updatedAt: string
}

const emptyDream: Omit<Dream, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  slug: '',
  content: '',
  summary: '',
  keywords: [],
  metaDescription: '',
  category: 'genel',
  views: 0,
  isPublished: true,
  isAiGenerated: false,
}

const DREAM_CATS_NO_TUMU = DREAM_CATEGORIES.filter(c => c.value !== 'tumu')

export default function AdminDreamsPage() {
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'

  const [dreams, setDreams] = useState<Dream[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Dream | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiTitle, setAiTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Bulk selection for category
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState('')
  const [bulkMoving, setBulkMoving] = useState(false)
  const [formCategory, setFormCategory] = useState('genel')

  // Form fields
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formSummary, setFormSummary] = useState('')
  const [formKeywords, setFormKeywords] = useState('')
  const [formMetaDesc, setFormMetaDesc] = useState('')
  const [formPublished, setFormPublished] = useState(true)

  const fetchDreams = useCallback(async (page = 1, search = '') => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page) })
      if (search) qs.set('search', search)
      const res = await fetch(`/api/admin/dreams?${qs}`)
      if (res.ok) {
        const data = await res.json()
        setDreams(data.dreams || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      }
    } catch (e) {
      console.error('Failed to fetch dreams', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDreams(currentPage, searchQuery) }, [currentPage, fetchDreams])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchDreams(1, searchQuery)
  }

  const openEditor = (dream?: Dream) => {
    if (dream) {
      setEditing(dream)
      setIsNew(false)
      setFormTitle(dream.title)
      setFormContent(dream.content)
      setFormSummary(dream.summary || '')
      setFormKeywords(dream.keywords.join(', '))
      setFormMetaDesc(dream.metaDescription || '')
      setFormPublished(dream.isPublished)
      setFormCategory(dream.category || 'genel')
    } else {
      setEditing(null)
      setIsNew(true)
      setFormTitle('')
      setFormContent('')
      setFormSummary('')
      setFormKeywords('')
      setFormMetaDesc('')
      setFormPublished(true)
    }
    setError('')
    setSuccess('')
  }

  const closeEditor = () => {
    setEditing(null)
    setIsNew(false)
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      setError('Başlık ve içerik zorunlu')
      return
    }
    setSaving(true)
    setError('')
    try {
      const body: any = {
        title: formTitle.trim(),
        content: formContent.trim(),
        summary: formSummary.trim(),
        keywords: formKeywords.split(',').map(k => k.trim()).filter(Boolean),
        metaDescription: formMetaDesc.trim(),
        category: formCategory,
        isPublished: formPublished,
      }
      if (editing) body.id = editing.id

      const res = await fetch('/api/admin/dreams', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Hata oluştu')
        return
      }
      setSuccess(editing ? 'Güncellendi!' : 'Oluşturuldu!')
      setTimeout(() => { closeEditor(); fetchDreams(currentPage, searchQuery) }, 800)
    } catch {
      setError('Sunucu hatası')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu rüya tabirini silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/admin/dreams?id=${id}`, { method: 'DELETE' })
      if (res.ok) fetchDreams(currentPage, searchQuery)
    } catch (e) {
      console.error('Delete error', e)
    }
  }

  const handleTogglePublish = async (dream: Dream) => {
    try {
      await fetch('/api/admin/dreams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dream.id, isPublished: !dream.isPublished }),
      })
      fetchDreams(currentPage, searchQuery)
    } catch (e) {
      console.error('Toggle publish error', e)
    }
  }

  const handleAiGenerate = async () => {
    if (!aiTitle.trim()) return
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/admin/dreams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: aiTitle.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'AI hatası')
        return
      }
      setAiTitle('')
      setSuccess('AI rüya tabiri oluşturuldu!')
      fetchDreams(currentPage, searchQuery)
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('AI ile rüya oluşturulamadı')
    } finally {
      setGenerating(false)
    }
  }

  const toggleSelectDream = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleSelectAllDreams = () => {
    if (selectedIds.length === dreams.length) setSelectedIds([])
    else setSelectedIds(dreams.map(d => d.id))
  }
  const handleBulkCategoryMove = async () => {
    if (!bulkCategoryTarget || selectedIds.length === 0) return
    setBulkMoving(true)
    try {
      const res = await fetch('/api/admin/dreams/bulk-category', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamIds: selectedIds, category: bulkCategoryTarget }),
      })
      if (res.ok) {
        setSelectedIds([])
        setBulkCategoryTarget('')
        fetchDreams(currentPage, searchQuery)
      }
    } catch (e) { console.error(e) }
    setBulkMoving(false)
  }
  const getCatLabel = (val: string) => DREAM_CATEGORIES.find(c => c.value === val)?.label || val

  const isEditorOpen = isNew || editing !== null

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/${lang}/admin`} className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-400" /> Rüya Tabirleri Yönetimi
            </h1>
            <p className="text-gray-500 text-xs">Toplam: {total} rüya tabiri</p>
          </div>
        </div>

        {/* AI Generate Section */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 mb-6">
          <h3 className="text-sm font-medium text-indigo-300 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI ile Rüya Tabiri Oluştur
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiTitle}
              onChange={(e) => setAiTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
              placeholder="Örneğin: Yılan görmek, Uçmak, Altın bulmak..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500/50"
            />
            <button
              onClick={handleAiGenerate}
              disabled={generating || !aiTitle.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{success}</div>}

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Rüya ara..."
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500/50"
            />
            <button onClick={handleSearch} className="px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/10 transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${lang}/admin/dreams/bulk-import`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Toplu İçe Aktar
            </Link>
            <button
              onClick={() => openEditor()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Yeni Rüya Tabiri
            </button>
          </div>
        </div>

        {/* Editor Modal */}
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  {isNew ? 'Yeni Rüya Tabiri' : 'Rüya Tabiri Düzenle'}
                </h2>
                <button onClick={closeEditor} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Başlık *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Rüyada Yılan Görmek"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Özet</label>
                  <textarea
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    rows={2}
                    placeholder="Kısa özet..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">İçerik (HTML) *</label>
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    rows={12}
                    placeholder="<h2>Rüyada ... Görmek</h2><p>...</p>"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-indigo-500/50 resize-y"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Anahtar Kelimeler (virgül ile)</label>
                    <input
                      type="text"
                      value={formKeywords}
                      onChange={(e) => setFormKeywords(e.target.value)}
                      placeholder="yılan, rüya, korku"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">SEO Açıklama</label>
                    <input
                      type="text"
                      value={formMetaDesc}
                      onChange={(e) => setFormMetaDesc(e.target.value)}
                      placeholder="155 karakter SEO açıklaması"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Kategori</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                    >
                      {DREAM_CATS_NO_TUMU.map(c => (
                        <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-5">
                    <input
                      type="checkbox"
                      checked={formPublished}
                      onChange={(e) => setFormPublished(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-500"
                    />
                    <span className="text-sm text-gray-300">Yayınla</span>
                  </label>
                </div>

                {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
                {success && <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{success}</div>}

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={closeEditor} className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-sm hover:text-white transition-colors">
                    İptal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-900/40 border border-indigo-500/30 flex flex-wrap items-center gap-3">
            <span className="text-sm text-indigo-200">{selectedIds.length} rüya seçildi</span>
            <select
              value={bulkCategoryTarget}
              onChange={e => setBulkCategoryTarget(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/10"
            >
              <option value="">Kategori seç...</option>
              {DREAM_CATS_NO_TUMU.map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
            <button
              onClick={handleBulkCategoryMove}
              disabled={!bulkCategoryTarget || bulkMoving}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {bulkMoving ? 'Taşınıyor...' : 'Kategoriye Taşı'}
            </button>
            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition">
              İptal
            </button>
          </div>
        )}

        {/* Dreams List */}
        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : dreams.length === 0 ? (
          <div className="text-center py-12">
            <Moon className="w-12 h-12 text-indigo-500/30 mx-auto mb-3" />
            <p className="text-gray-400">Henüz rüya tabiri eklenmemiş</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Select All */}
            <div className="flex items-center gap-2 px-3 py-2">
              <input
                type="checkbox"
                checked={selectedIds.length === dreams.length && dreams.length > 0}
                onChange={toggleSelectAllDreams}
                className="w-4 h-4 rounded accent-indigo-500"
              />
              <span className="text-xs text-gray-400">Tümünü Seç</span>
            </div>
            {dreams.map((dream) => (
              <div
                key={dream.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedIds.includes(dream.id) ? 'bg-indigo-900/20 border-indigo-500/40' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(dream.id)}
                  onChange={() => toggleSelectDream(dream.id)}
                  className="w-4 h-4 rounded accent-indigo-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white text-sm font-medium truncate">{dream.title}</h3>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] flex-shrink-0">{getCatLabel(dream.category || 'genel')}</span>
                    {dream.isAiGenerated && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] flex-shrink-0">AI</span>
                    )}
                    {!dream.isPublished && (
                      <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] flex-shrink-0">Taslak</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {dream.views}</span>
                    <span>/{dream.slug}</span>
                    <span>{new Date(dream.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTogglePublish(dream)}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
                    title={dream.isPublished ? 'Gizle' : 'Yayınla'}
                  >
                    {dream.isPublished ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-yellow-400" />}
                  </button>
                  <button
                    onClick={() => openEditor(dream)}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
                    title="Düzenle"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(dream.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-sm disabled:opacity-30"
            >
              Önceki
            </button>
            <span className="text-gray-400 text-sm">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-sm disabled:opacity-30"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
