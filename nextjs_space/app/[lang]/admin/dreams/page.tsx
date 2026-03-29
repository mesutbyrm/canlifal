'use client'

import AdminBackButton from '@/components/admin-back-button'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X, Moon, Sparkles, Loader2, Search, Upload, BookOpen, Tag, FolderPlus, Zap, FileSpreadsheet, Download, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '@/components/loading-spinner'
import { DREAM_CATEGORIES } from '@/lib/dream-categories'
import dynamic from 'next/dynamic'
const RichTextEditor = dynamic(() => import('@/components/rich-text-editor'), { ssr: false })

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

const DREAM_CATS_NO_TUMU = DREAM_CATEGORIES.filter(c => c.value !== 'tumu')

export default function AdminDreamsPage() {
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'

  const [dreams, setDreams] = useState<Dream[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiTitle, setAiTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [perPage, setPerPage] = useState<string>('20')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filter states
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPublish, setFilterPublish] = useState<'all' | 'published' | 'draft'>('all')
  const [publishedCount, setPublishedCount] = useState(0)
  const [draftCount, setDraftCount] = useState(0)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [shouldSelectAllAfterLoad, setShouldSelectAllAfterLoad] = useState(false)
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState('')
  const [bulkMoving, setBulkMoving] = useState(false)
  const [bulkPublishing, setBulkPublishing] = useState(false)

  // Inline content editor
  const [expandedDreamId, setExpandedDreamId] = useState<string | null>(null)
  const [inlineContent, setInlineContent] = useState('')
  const [inlineSaving, setInlineSaving] = useState(false)

  // Form states
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Dream | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formSummary, setFormSummary] = useState('')
  const [formKeywords, setFormKeywords] = useState('')
  const [formMetaDesc, setFormMetaDesc] = useState('')
  const [formCategory, setFormCategory] = useState('genel')
  const [formPublished, setFormPublished] = useState(true)

  // Bulk AI generation
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkTopics, setBulkTopics] = useState('')
  const [bulkAiCategory, setBulkAiCategory] = useState('')
  const [bulkAutoPublish, setBulkAutoPublish] = useState(false)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')

  // CSV Import
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null)

  const fetchDreams = useCallback(async (page = 1, search = '', category = 'all', publish = 'all', limit = '20') => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page), limit })
      if (search) qs.set('search', search)
      if (category !== 'all') qs.set('category', category)
      if (publish !== 'all') qs.set('publish', publish)

      const res = await fetch(`/api/admin/dreams?${qs}`)
      if (res.ok) {
        const data = await res.json()
        setDreams(data.dreams || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setPublishedCount(data.publishedCount || 0)
        setDraftCount(data.draftCount || 0)
        setCategoryCounts(data.categoryCounts || {})
      }
    } catch (e) {
      console.error('Failed to fetch dreams', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDreams(currentPage, searchQuery, filterCategory, filterPublish, perPage)
  }, [currentPage, filterCategory, filterPublish, perPage, fetchDreams])

  // Auto-select all after switching to 'all' mode
  useEffect(() => {
    if (shouldSelectAllAfterLoad && !loading && dreams.length > 0) {
      setSelectedIds(dreams.map(d => d.id))
      setShouldSelectAllAfterLoad(false)
    }
  }, [shouldSelectAllAfterLoad, loading, dreams])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchDreams(1, searchQuery, filterCategory, filterPublish, perPage)
  }

  const handlePerPageChange = (val: string) => {
    setPerPage(val)
    setCurrentPage(1)
    setSelectedIds([])
  }

  const handleCategoryFilter = (cat: string) => {
    setFilterCategory(cat)
    setCurrentPage(1)
    setSelectedIds([])
  }

  const handlePublishFilter = (val: 'all' | 'published' | 'draft') => {
    setFilterPublish(val)
    setCurrentPage(1)
    setSelectedIds([])
  }

  // Form handlers
  const openNew = () => {
    setEditing(null)
    setIsNew(true)
    setFormTitle('')
    setFormContent('')
    setFormSummary('')
    setFormKeywords('')
    setFormMetaDesc('')
    setFormCategory('genel')
    setFormPublished(true)
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const openEdit = (dream: Dream) => {
    setEditing(dream)
    setIsNew(false)
    setFormTitle(dream.title)
    setFormContent(dream.content)
    setFormSummary(dream.summary || '')
    setFormKeywords(dream.keywords.join(', '))
    setFormMetaDesc(dream.metaDescription || '')
    setFormCategory(dream.category || 'genel')
    setFormPublished(dream.isPublished)
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const closeForm = () => {
    setShowForm(false)
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
      setTimeout(() => {
        closeForm()
        fetchDreams(currentPage, searchQuery, filterCategory, filterPublish, perPage)
      }, 800)
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
      if (res.ok) fetchDreams(currentPage, searchQuery, filterCategory, filterPublish, perPage)
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
      fetchDreams(currentPage, searchQuery, filterCategory, filterPublish, perPage)
    } catch (e) {
      console.error('Toggle publish error', e)
    }
  }

  // AI Generate single
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
      fetchDreams(currentPage, searchQuery, filterCategory, filterPublish, perPage)
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('AI ile rüya oluşturulamadı')
    } finally {
      setGenerating(false)
    }
  }

  // Bulk AI generation
  const handleBulkGenerate = async () => {
    const topics = bulkTopics.split('\n').map(t => t.trim()).filter(Boolean)
    if (topics.length === 0) return
    if (topics.length > 10) { setBulkMessage('❌ Maksimum 10 konu girin.'); return }
    setBulkGenerating(true)
    setBulkMessage('')
    let successCount = 0
    let failCount = 0
    for (const topic of topics) {
      try {
        const body: any = { title: topic }
        if (bulkAiCategory) body.category = bulkAiCategory
        const res = await fetch('/api/admin/dreams/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          successCount++
          if (bulkAutoPublish) {
            const data = await res.json()
            if (data.dream?.id) {
              await fetch('/api/admin/dreams', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: data.dream.id, isPublished: true }),
              })
            }
          }
        } else failCount++
      } catch { failCount++ }
    }
    setBulkMessage(`✅ ${successCount} rüya tabiri üretildi${failCount > 0 ? `, ${failCount} hata` : ''}`)
    setBulkTopics('')
    fetchDreams(currentPage, searchQuery, filterCategory, filterPublish, perPage)
    setBulkGenerating(false)
  }

  // Bulk selection
  const toggleSelectDream = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleSelectAll = () => {
    if (selectedIds.length === dreams.length && dreams.length > 0) {
      setSelectedIds([])
    } else if (perPage !== 'all' && dreams.length < total) {
      // Switch to show all items first, then select all after reload
      setPerPage('all')
      setCurrentPage(1)
      setShouldSelectAllAfterLoad(true)
    } else {
      setSelectedIds(dreams.map(d => d.id))
    }
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
        fetchDreams(currentPage, searchQuery, filterCategory, filterPublish, perPage)
      }
    } catch (e) { console.error(e) }
    setBulkMoving(false)
  }

  const handleBulkPublish = async (publish: boolean) => {
    if (selectedIds.length === 0) return
    setBulkPublishing(true)
    try {
      const res = await fetch('/api/admin/dreams/bulk-publish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamIds: selectedIds, isPublished: publish }),
      })
      if (res.ok) {
        setSelectedIds([])
        fetchDreams(currentPage, searchQuery, filterCategory, filterPublish, perPage)
      }
    } catch (e) { console.error(e) }
    setBulkPublishing(false)
  }

  // Bulk delete
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      const res = await fetch('/api/admin/dreams/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamIds: selectedIds }),
      })
      if (res.ok) {
        const data = await res.json()
        setSuccess(`✅ ${data.deletedCount} rüya tabiri silindi`)
        setTimeout(() => setSuccess(''), 3000)
        setSelectedIds([])
        setShowDeleteConfirm(false)
        fetchDreams(currentPage, searchQuery, filterCategory, filterPublish, perPage)
      } else {
        setError('Silme işlemi başarısız')
        setTimeout(() => setError(''), 4000)
      }
    } catch (e) { console.error(e); setError('Hata oluştu'); setTimeout(() => setError(''), 4000) }
    setBulkDeleting(false)
  }

  // Inline content editor
  const toggleExpandDream = (dream: Dream) => {
    if (expandedDreamId === dream.id) {
      setExpandedDreamId(null)
    } else {
      setExpandedDreamId(dream.id)
      setInlineContent(dream.content || '')
    }
  }

  const handleInlineSave = async (dreamId: string) => {
    setInlineSaving(true)
    try {
      const res = await fetch('/api/admin/dreams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dreamId, content: inlineContent }),
      })
      if (res.ok) {
        fetchDreams(currentPage, searchQuery, filterCategory, filterPublish, perPage)
        setExpandedDreamId(null)
      }
    } catch (e) { console.error(e) }
    setInlineSaving(false)
  }

  // CSV Import
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) throw new Error('Geçersiz CSV')
      const headers = lines[0].split(';').map(h => h.trim().toLowerCase())
      const results = { success: 0, errors: [] as string[] }
      for (let i = 1; i < lines.length; i++) {
        try {
          const vals = lines[i].split(';').map(v => v.trim())
          const row: any = {}
          headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
          if (!row.title) { results.errors.push(`Satır ${i + 1}: title eksik`); continue }
          const res = await fetch('/api/admin/dreams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: row.title,
              content: row.content || '',
              summary: row.summary || '',
              category: row.category || 'genel',
              keywords: row.keywords ? row.keywords.split(',').map((k: string) => k.trim()) : [],
              isPublished: row.ispublished === 'true' || row.ispublished === '1',
            }),
          })
          if (res.ok) results.success++
          else {
            const d = await res.json()
            results.errors.push(`Satır ${i + 1}: ${d.error || 'Hata'}`)
          }
        } catch (err: any) { results.errors.push(`Satır ${i + 1}: ${err.message}`) }
      }
      setImportResult(results)
      fetchDreams(currentPage, searchQuery, filterCategory, filterPublish, perPage)
    } catch (err: any) { setImportResult({ success: 0, errors: [err.message] }) }
    setImporting(false)
    e.target.value = ''
  }

  const downloadTemplate = () => {
    const csv = 'title;content;summary;category;keywords;isPublished\nRüyada Yılan Görmek;<p>Rüyada yılan görmek...</p>;Kısa özet;hayvanlar;yılan,rüya;true'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'ruya-sablon.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const getCatLabel = (val: string) => DREAM_CATEGORIES.find(c => c.value === val)?.label || val
  const getCatIcon = (val: string) => DREAM_CATEGORIES.find(c => c.value === val)?.icon || '💭'
  const totalAll = publishedCount + draftCount

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950/30 to-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <AdminBackButton className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition" />
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Moon className="w-6 h-6 text-indigo-400" /> Rüya Tabirleri Yönetimi
              </h1>
              <p className="text-sm text-gray-500">{totalAll} rüya tabiri • {Object.keys(categoryCounts).length} kategori</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${lang}/admin/dreams/bulk-import`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition border border-white/10"
            >
              <Upload className="w-4 h-4 text-emerald-400" /> Toplu İçe Aktar
            </Link>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" /> Yeni Rüya Tabiri
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{success}</div>}

        {/* AI Generate Section */}
        {!showForm && (
          <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> AI ile Rüya Tabiri Oluştur
            </h3>
            <p className="text-sm text-gray-400 mb-3">Rüya konusu girin, AI detaylı tabir oluştursun.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiTitle}
                onChange={(e) => setAiTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !generating && handleAiGenerate()}
                placeholder="Örneğin: Yılan görmek, Uçmak, Altın bulmak..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500/50"
              />
              <button
                onClick={handleAiGenerate}
                disabled={generating || !aiTitle.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </div>
          </div>
        )}

        {/* Bulk AI Generation */}
        {!showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
            <button onClick={() => setShowBulkForm(!showBulkForm)} className="w-full flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" /> Toplu Rüya Tabiri Üretici (AI)
              </h3>
              <span className="text-gray-500 text-sm">{showBulkForm ? '▲' : '▼'}</span>
            </button>
            {showBulkForm && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-400">Her satıra bir rüya konusu yazın (maks. 10). AI her biri için detaylı tabir üretecek.</p>
                <textarea
                  value={bulkTopics}
                  onChange={e => setBulkTopics(e.target.value)}
                  placeholder={"Rüyada Yılan Görmek\nRüyada Uçmak\nRüyada Altın Bulmak\nRüyada Deniz Görmek\nRüyada Bebek Görmek"}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 resize-none"
                />
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Kategori</label>
                    <select
                      value={bulkAiCategory}
                      onChange={e => setBulkAiCategory(e.target.value)}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm min-w-[140px]"
                    >
                      <option value="">Otomatik</option>
                      {DREAM_CATS_NO_TUMU.map(c => (
                        <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer px-3 py-2">
                    <input
                      type="checkbox"
                      checked={bulkAutoPublish}
                      onChange={e => setBulkAutoPublish(e.target.checked)}
                      className="rounded border-white/20 bg-white/5"
                    />
                    Otomatik Yayınla
                  </label>
                  <button
                    onClick={handleBulkGenerate}
                    disabled={bulkGenerating || !bulkTopics.trim()}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white text-sm font-medium transition disabled:opacity-50"
                  >
                    {bulkGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Üretiliyor...</> : <><Zap className="w-4 h-4" /> Toplu Üret</>}
                  </button>
                </div>
                {bulkMessage && (
                  <p className={`text-sm ${bulkMessage.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{bulkMessage}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* CSV Import */}
        {!showForm && (
          <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-2xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" /> CSV İçe Aktarma
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Hazırladığınız CSV dosyasını yükleyerek toplu rüya tabiri ekleyin.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <label className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-medium transition cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                {importing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...</>
                ) : (
                  <><Upload className="w-4 h-4" /> CSV Dosyası Seç</>
                )}
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCSVImport}
                  className="hidden"
                  disabled={importing}
                />
              </label>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition border border-white/10"
              >
                <Download className="w-4 h-4" /> Örnek Şablon İndir
              </button>
            </div>
            {importResult && (
              <div className="mt-4 p-4 rounded-xl bg-black/30 border border-white/10">
                {importResult.success > 0 && (
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{importResult.success} rüya tabiri başarıyla içe aktarıldı</span>
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="space-y-1">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="text-xs">{err}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setImportResult(null)} className="mt-3 text-xs text-gray-500 hover:text-gray-400">Kapat</button>
              </div>
            )}
          </div>
        )}

        {/* Search Bar + Per Page */}
        {!showForm && (
          <div className="flex gap-2 mb-4">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Rüya tabiri ara..."
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500/50"
              />
              <button onClick={handleSearch} className="px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/10 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="20">20 / sayfa</option>
              <option value="50">50 / sayfa</option>
              <option value="100">100 / sayfa</option>
              <option value="all">Tümü</option>
            </select>
          </div>
        )}

        {/* Filters */}
        {!showForm && (
          <div className="space-y-3 mb-4">
            {/* Publish Status Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Durum:</span>
              <button onClick={() => handlePublishFilter('all')} className={`px-3 py-1 rounded-full text-xs transition ${filterPublish === 'all' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                Tümü ({totalAll})
              </button>
              <button onClick={() => handlePublishFilter('published')} className={`px-3 py-1 rounded-full text-xs transition ${filterPublish === 'published' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Yayında ({publishedCount})</span>
              </button>
              <button onClick={() => handlePublishFilter('draft')} className={`px-3 py-1 rounded-full text-xs transition ${filterPublish === 'draft' ? 'bg-yellow-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> Taslak ({draftCount})</span>
              </button>
            </div>
            {/* Category Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Kategori:</span>
              <button onClick={() => handleCategoryFilter('all')} className={`px-3 py-1 rounded-full text-xs transition ${filterCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                Tümü
              </button>
              {DREAM_CATS_NO_TUMU.map(cat => {
                const count = categoryCounts[cat.value] || 0
                if (count === 0) return null
                return (
                  <button key={cat.value} onClick={() => handleCategoryFilter(cat.value)} className={`px-3 py-1 rounded-full text-xs transition ${filterCategory === cat.value ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                    {cat.icon} {cat.label} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* FORM */}
        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {isNew ? 'Yeni Rüya Tabiri' : 'Rüya Tabiri Düzenle'}
              </h2>
              <button onClick={closeForm} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title + Category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-400 mb-1 block">Başlık *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Rüyada Yılan Görmek"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                  >
                    {DREAM_CATS_NO_TUMU.map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Özet</label>
                <textarea
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  rows={2}
                  placeholder="Kısa özet..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              {/* Content - WordPress tarzı zengin editör */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">İçerik (WordPress tarzı editör — resim ekleyebilirsiniz) *</label>
                <RichTextEditor
                  value={formContent}
                  onChange={(val: string) => setFormContent(val)}
                  placeholder="Rüya tabiri içeriğini buraya yazın... Resim eklemek için sürükle-bırak veya araç çubuğundaki resim butonunu kullanın."
                  minHeight="350px"
                />
              </div>

              {/* Meta Description + Keywords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Anahtar Kelimeler (virgül ile)</label>
                  <input
                    type="text"
                    value={formKeywords}
                    onChange={(e) => setFormKeywords(e.target.value)}
                    placeholder="yılan, rüya, korku"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formKeywords.split(',').map(k => k.trim()).filter(Boolean).map((kw, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{kw}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">SEO Açıklama (140-160 karakter)</label>
                  <textarea
                    value={formMetaDesc}
                    onChange={(e) => setFormMetaDesc(e.target.value)}
                    rows={2}
                    maxLength={160}
                    placeholder="Google arama sonuçlarında görünecek açıklama..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
                  />
                  <p className={`text-xs mt-1 ${formMetaDesc.length >= 140 && formMetaDesc.length <= 160 ? 'text-green-400' : formMetaDesc.length > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {formMetaDesc.length}/160 karakter {formMetaDesc.length >= 140 && formMetaDesc.length <= 160 ? '✓ İdeal' : ''}
                  </p>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 p-4 bg-white/3 rounded-xl border border-white/5">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPublished}
                    onChange={(e) => setFormPublished(e.target.checked)}
                    className="rounded accent-green-500"
                  />
                  <Eye className="w-4 h-4 text-green-400" /> Yayınla
                </label>
              </div>

              {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
              {success && <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{success}</div>}

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button onClick={closeForm} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition">
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-900/40 border border-indigo-500/30 flex flex-wrap items-center gap-3">
            <span className="text-sm text-indigo-200 font-medium">{selectedIds.length} rüya seçildi</span>
            <div className="h-5 w-px bg-white/20" />
            <button
              onClick={() => handleBulkPublish(true)}
              disabled={bulkPublishing}
              className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> {bulkPublishing ? 'İşleniyor...' : 'Tümünü Yayınla'}
            </button>
            <button
              onClick={() => handleBulkPublish(false)}
              disabled={bulkPublishing}
              className="px-4 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <EyeOff className="w-3.5 h-3.5" /> {bulkPublishing ? 'İşleniyor...' : 'Tümünü Kaldır'}
            </button>
            <div className="h-5 w-px bg-white/20" />
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
            <div className="h-5 w-px bg-white/20" />
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Seçilenleri Sil
            </button>
            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition">
              İptal
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1a0a2e] border border-red-500/30 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-red-500/20"><Trash2 className="w-6 h-6 text-red-400" /></div>
                <div>
                  <h3 className="text-lg font-bold text-white">Toplu Silme Onayı</h3>
                  <p className="text-sm text-gray-400">{selectedIds.length} rüya tabiri silinecek</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto mb-4 space-y-1 max-h-60">
                {dreams.filter(d => selectedIds.includes(d.id)).map(d => (
                  <div key={d.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-sm">
                    <span className={`w-2 h-2 rounded-full ${d.isPublished ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <span className="text-white truncate flex-1">{d.title}</span>
                    <span className="text-xs text-gray-500">{d.category}</span>
                  </div>
                ))}
                {selectedIds.length > dreams.length && (
                  <p className="text-xs text-gray-500 px-3 py-1">... ve {selectedIds.length - dreams.filter(d => selectedIds.includes(d.id)).length} daha</p>
                )}
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                <p className="text-sm text-red-300">⚠️ Bu işlem geri alınamaz! Seçilen tüm rüya tabirleri kalıcı olarak silinecektir.</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
                >
                  {bulkDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Siliniyor...</> : <><Trash2 className="w-4 h-4" /> {selectedIds.length} Rüyayı Sil</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dreams List */}
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : dreams.length === 0 ? (
          <div className="text-center py-20">
            <Moon className="w-12 h-12 text-indigo-500/30 mx-auto mb-4" />
            <p className="text-gray-400">Henüz rüya tabiri eklenmemiş</p>
            <p className="text-sm text-gray-500 mt-2">Yukarıdaki yapay zeka aracı ile hızlıca rüya tabiri oluşturabilirsiniz</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select All */}
            <div className="flex items-center gap-2 px-4 py-2">
              <input
                type="checkbox"
                checked={selectedIds.length === dreams.length && dreams.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded accent-indigo-500"
              />
              <span className="text-xs text-gray-400">
                {perPage !== 'all' && dreams.length < total
                  ? `Tümünü Seç (${total} kayıt yüklenecek)`
                  : `Tümünü Seç (${dreams.length})`}
              </span>
            </div>

            {dreams.map((dream) => (
              <div
                key={dream.id}
                className={`rounded-xl border transition-all ${selectedIds.includes(dream.id) ? 'bg-indigo-900/20 border-indigo-500/40' : 'bg-white/5 border-white/10'}`}
              >
                <div className="p-4 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(dream.id)}
                    onChange={() => toggleSelectDream(dream.id)}
                    className="w-4 h-4 rounded accent-indigo-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${dream.isPublished ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>
                        {dream.isPublished ? 'Yayında' : 'Taslak'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300">
                        {getCatIcon(dream.category || 'genel')} {getCatLabel(dream.category || 'genel')}
                      </span>
                      {dream.isAiGenerated && (
                        <span className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                          <Sparkles className="w-3 h-3" /> AI
                        </span>
                      )}
                      {dream.views > 0 && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> {dream.views}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-medium truncate">{dream.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span>/{dream.slug}</span>
                      <span>{new Date(dream.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                    {dream.keywords && dream.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dream.keywords.slice(0, 4).map((kw, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">{kw}</span>
                        ))}
                        {dream.keywords.length > 4 && <span className="text-[10px] text-gray-600">+{dream.keywords.length - 4}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleExpandDream(dream)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition" title="İçeriği Oku/Düzenle">
                      <BookOpen className={`w-4 h-4 ${expandedDreamId === dream.id ? 'text-indigo-400' : 'text-gray-400'}`} />
                    </button>
                    <button onClick={() => handleTogglePublish(dream)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition" title={dream.isPublished ? 'Gizle' : 'Yayınla'}>
                      {dream.isPublished ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-green-400" />}
                    </button>
                    <button onClick={() => openEdit(dream)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition" title="Tam Düzenle">
                      <Edit className="w-4 h-4 text-blue-400" />
                    </button>
                    <button onClick={() => handleDelete(dream.id)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition" title="Sil">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Inline Content Editor - WordPress tarzı */}
                {expandedDreamId === dream.id && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">İçerik — WordPress tarzı editör, resim ekleyebilirsiniz</span>
                    </div>
                    <RichTextEditor
                      value={inlineContent}
                      onChange={(val: string) => setInlineContent(val)}
                      placeholder="Rüya tabiri içeriği..."
                      minHeight="300px"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleInlineSave(dream.id)}
                        disabled={inlineSaving}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" /> {inlineSaving ? 'Kaydediliyor...' : 'İçeriği Kaydet'}
                      </button>
                      <button
                        onClick={() => setExpandedDreamId(null)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition"
                      >
                        Kapat
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && perPage !== 'all' && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-sm disabled:opacity-30"
            >
              İlk
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-sm disabled:opacity-30"
            >
              ← Önceki
            </button>
            <span className="text-gray-400 text-sm">
              Sayfa {currentPage} / {totalPages} <span className="text-gray-600">({total} sonuç)</span>
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-sm disabled:opacity-30"
            >
              Sonraki →
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-sm disabled:opacity-30"
            >
              Son
            </button>
          </div>
        )}
      </div>
    </div>
  )
}