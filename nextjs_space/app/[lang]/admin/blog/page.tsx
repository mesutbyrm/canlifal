'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Plus, Edit, Trash2, Eye, EyeOff, Save, X, BookOpen, Sparkles, Loader2, FolderPlus, Tag, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Star, TrendingUp, Award, Image as ImageIcon, Clock, Search, BarChart3, MessageCircle, Crown, Zap, Calendar } from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '@/components/loading-spinner'
import AdminBackButton from '@/components/admin-back-button'

interface BlogPost {
  id: string
  slug: string
  titleTr: string
  titleEn: string
  descTr: string
  descEn: string
  contentTr: string
  contentEn: string
  category: string
  keywords: string[]
  isPublished: boolean
  metaDescription: string
  coverImage: string
  readTime: number
  isFeatured: boolean
  isTrending: boolean
  isEditorPick: boolean
  isAiGenerated: boolean
  isPremium: boolean
  zodiacSign: string
  authorName: string
  views: number
  likes: number
  publishedAt: string | null
  scheduledAt: string | null
  createdAt: string
  updatedAt: string
}

interface BlogCategory {
  id: string
  slug: string
  nameTr: string
  nameEn: string
  sortOrder: number
}

type FormState = {
  slug: string; titleTr: string; titleEn: string; descTr: string; descEn: string
  contentTr: string; contentEn: string; category: string; isPublished: boolean
  metaDescription: string; coverImage: string; readTime: number
  isFeatured: boolean; isTrending: boolean; isEditorPick: boolean
  isAiGenerated: boolean; isPremium: boolean; zodiacSign: string
  authorName: string; scheduledAt: string
}

const ZODIAC_SIGNS = [
  { value: '', label: 'Yok' },
  { value: 'koc', label: '♈ Koç' }, { value: 'boga', label: '♉ Boğa' },
  { value: 'ikizler', label: '♊ İkizler' }, { value: 'yengec', label: '♋ Yengeç' },
  { value: 'aslan', label: '♌ Aslan' }, { value: 'basak', label: '♍ Başak' },
  { value: 'terazi', label: '♎ Terazi' }, { value: 'akrep', label: '♏ Akrep' },
  { value: 'yay', label: '♐ Yay' }, { value: 'oglak', label: '♑ Oğlak' },
  { value: 'kova', label: '♒ Kova' }, { value: 'balik', label: '♓ Balık' },
]

const emptyForm: FormState = {
  slug: '', titleTr: '', titleEn: '', descTr: '', descEn: '',
  contentTr: '', contentEn: '', category: 'genel', isPublished: false,
  metaDescription: '', coverImage: '', readTime: 0,
  isFeatured: false, isTrending: false, isEditorPick: false,
  isAiGenerated: false, isPremium: false, zodiacSign: '',
  authorName: 'Canlifal Editör', scheduledAt: '',
}

export default function AdminBlogPage() {
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiTitle, setAiTitle] = useState('')
  const [aiKeywords, setAiKeywords] = useState('')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCatSlug, setNewCatSlug] = useState('')
  const [newCatNameTr, setNewCatNameTr] = useState('')
  const [newCatNameEn, setNewCatNameEn] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; errors: string[]; newCategories: string[] } | null>(null)
  const [form, setForm] = useState<FormState>({ ...emptyForm })
  const [keywordsInput, setKeywordsInput] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [aiMessage, setAiMessage] = useState('')

  // Bulk selection for category change
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState('')
  const [bulkMoving, setBulkMoving] = useState(false)

  // Bulk generation
  const [bulkTopics, setBulkTopics] = useState('')
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkZodiac, setBulkZodiac] = useState('')
  const [bulkAutoPublish, setBulkAutoPublish] = useState(false)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')
  const [showBulkForm, setShowBulkForm] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [postsRes, catsRes] = await Promise.all([
        fetch('/api/admin/blog'),
        fetch('/api/blog/categories'),
      ])
      const postsData = await postsRes.json()
      const catsData = await catsRes.json()
      setPosts(postsData.posts || [])
      setCategories(catsData.categories || [])
    } catch (e) { console.error('Fetch error:', e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openNew = () => {
    setEditing(null)
    setIsNew(true)
    setForm({ ...emptyForm, category: categories[0]?.slug || 'genel' })
    setKeywordsInput('')
    setShowForm(true)
  }

  const openEdit = (post: BlogPost) => {
    setEditing(post)
    setIsNew(false)
    setForm({
      slug: post.slug,
      titleTr: post.titleTr,
      titleEn: post.titleEn || '',
      descTr: post.descTr || '',
      descEn: post.descEn || '',
      contentTr: post.contentTr,
      contentEn: post.contentEn || '',
      category: post.category,
      isPublished: post.isPublished,
      metaDescription: post.metaDescription || '',
      coverImage: post.coverImage || '',
      readTime: post.readTime || 0,
      isFeatured: post.isFeatured || false,
      isTrending: post.isTrending || false,
      isEditorPick: post.isEditorPick || false,
      isAiGenerated: post.isAiGenerated || false,
      isPremium: post.isPremium || false,
      zodiacSign: post.zodiacSign || '',
      authorName: post.authorName || 'Canlifal Editör',
      scheduledAt: post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : '',
    })
    setKeywordsInput((post.keywords || []).join(', '))
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setIsNew(false)
  }

  // AI Generate
  const handleGenerate = async () => {
    if (!aiTitle.trim()) return
    setGenerating(true)
    setAiMessage('')
    try {
      const kws = aiKeywords.trim() ? aiKeywords.split(',').map(k => k.trim()).filter(Boolean) : []
      const res = await fetch('/api/admin/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: aiTitle.trim(), keywords: kws }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Hata')

      setForm({
        slug: data.slug || '',
        titleTr: data.titleTr || '',
        titleEn: data.titleEn || '',
        descTr: data.descTr || '',
        descEn: data.descEn || '',
        contentTr: data.contentTr || '',
        contentEn: data.contentEn || '',
        category: data.category || categories[0]?.slug || 'genel',
        isPublished: false,
        metaDescription: data.metaDescriptionTr || '',
        coverImage: '',
        readTime: data.readTime || 0,
        isFeatured: false,
        isTrending: false,
        isEditorPick: false,
        isAiGenerated: true,
        isPremium: false,
        zodiacSign: '',
        authorName: 'Canlifal AI',
        scheduledAt: '',
      })
      setKeywordsInput((data.keywords || []).join(', '))
      setIsNew(true)
      setEditing(null)
      setShowForm(true)

      const wordCount = (data.contentTr || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
      const faqCount = (data.faqQuestions || []).length
      setAiMessage(`✅ ${wordCount} kelime | ${data.readTime || 0} dk okuma | ${faqCount} SSS sorusu | ${(data.keywords || []).length} anahtar kelime`)

      if (data.newCategoryCreated) {
        const catsRes = await fetch('/api/blog/categories')
        const catsData = await catsRes.json()
        setCategories(catsData.categories || [])
      }
    } catch (err: any) {
      setAiMessage('❌ ' + (err.message || 'Oluşturulamadı'))
    }
    setGenerating(false)
  }

  // Save
  const handleSave = async () => {
    if (!form.slug || !form.titleTr || !form.contentTr) {
      alert('Slug, Başlık (TR) ve İçerik (TR) zorunludur')
      return
    }
    setSaving(true)
    try {
      const keywords = keywordsInput.split(',').map(k => k.trim()).filter(Boolean)
      const payload = { ...form, keywords, scheduledAt: form.scheduledAt || null }
      const url = isNew ? '/api/admin/blog' : `/api/admin/blog/${editing?.id}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Kayıt hatası')
      }
      await fetchData()
      closeForm()
    } catch (err: any) {
      alert(err.message || 'Kayıt hatası')
    }
    setSaving(false)
  }

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Bu yazıyı silmek istediğinize emin misiniz?')) return
    try {
      await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
      await fetchData()
    } catch (e) { console.error(e) }
  }

  // Toggle publish
  const togglePublish = async (post: BlogPost) => {
    try {
      await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !post.isPublished }),
      })
      await fetchData()
    } catch (e) { console.error(e) }
  }

  // Category management
  const handleAddCategory = async () => {
    if (!newCatSlug.trim() || !newCatNameTr.trim()) return
    try {
      const res = await fetch('/api/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: newCatSlug.trim(), nameTr: newCatNameTr.trim(), nameEn: newCatNameEn.trim() || newCatNameTr.trim() }),
      })
      if (res.ok) {
        setNewCatSlug(''); setNewCatNameTr(''); setNewCatNameEn(''); setShowCategoryForm(false)
        const catsRes = await fetch('/api/blog/categories')
        const catsData = await catsRes.json()
        setCategories(catsData.categories || [])
      }
    } catch (e) { console.error(e) }
  }

  // Bulk AI Generation
  const handleBulkGenerate = async () => {
    const topics = bulkTopics.split('\n').map(t => t.trim()).filter(Boolean)
    if (topics.length === 0) return
    if (topics.length > 5) { setBulkMessage('❌ Maksimum 5 konu girin.'); return }
    setBulkGenerating(true)
    setBulkMessage('')
    try {
      const res = await fetch('/api/admin/blog/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics,
          category: bulkCategory || undefined,
          zodiacSign: bulkZodiac || undefined,
          autoPublish: bulkAutoPublish,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        const successCount = data.results?.filter((r: any) => r.success).length || 0
        const failCount = data.results?.filter((r: any) => !r.success).length || 0
        setBulkMessage(`✅ ${successCount} yazı üretildi${failCount > 0 ? `, ${failCount} hata` : ''}`)
        setBulkTopics('')
        fetchData()
      } else {
        setBulkMessage(`❌ ${data.error || 'Hata oluştu'}`)
      }
    } catch (e) {
      console.error(e)
      setBulkMessage('❌ Bağlantı hatası')
    }
    setBulkGenerating(false)
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
      const results = { success: 0, errors: [] as string[], newCategories: [] as string[] }
      for (let i = 1; i < lines.length; i++) {
        try {
          const vals = lines[i].split(';').map(v => v.trim())
          const row: any = {}
          headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
          if (!row.slug || !row.titletr) { results.errors.push(`Satır ${i + 1}: slug veya titleTr eksik`); continue }
          const res = await fetch('/api/admin/blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug: row.slug, titleTr: row.titletr, titleEn: row.titleen || '',
              descTr: row.desctr || '', descEn: row.descen || '',
              contentTr: row.contenttr || '', contentEn: row.contenten || '',
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
      await fetchData()
    } catch (err: any) { setImportResult({ success: 0, errors: [err.message], newCategories: [] }) }
    setImporting(false)
    e.target.value = ''
  }

  const downloadTemplate = () => {
    const csv = 'slug;titleTr;titleEn;descTr;descEn;contentTr;contentEn;category;keywords;isPublished\nornek-yazi;Örnek Başlık;Example Title;Kısa açıklama;Short desc;<p>İçerik</p>;<p>Content</p>;tarot;fal,tarot;true'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'blog-sablon.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const getCategoryLabel = (slug: string) => categories.find(c => c.slug === slug)?.nameTr || slug

  const toggleSelectPost = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPosts.length) setSelectedIds([])
    else setSelectedIds(filteredPosts.map(p => p.id))
  }
  const handleBulkCategoryMove = async () => {
    if (!bulkCategoryTarget || selectedIds.length === 0) return
    setBulkMoving(true)
    try {
      const res = await fetch('/api/admin/blog/bulk-category', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds: selectedIds, category: bulkCategoryTarget }),
      })
      if (res.ok) {
        setSelectedIds([])
        setBulkCategoryTarget('')
        await fetchData()
      }
    } catch (e) { console.error(e) }
    setBulkMoving(false)
  }

  const filteredPosts = filterCategory === 'all' ? posts : posts.filter(p => p.category === filterCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <AdminBackButton className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition" />
            <div>
              <h1 className="text-2xl font-bold text-white">Blog Yönetimi</h1>
              <p className="text-sm text-gray-500">{posts.length} yazı • {categories.length} kategori</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/${lang}/admin/blog/analytics`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition border border-white/10">
              <BarChart3 className="w-4 h-4 text-purple-400" /> Analitik
            </Link>
            <Link href={`/${lang}/admin/blog/comments`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition border border-white/10">
              <MessageCircle className="w-4 h-4 text-green-400" /> Yorumlar
            </Link>
            <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium transition">
              <Plus className="w-4 h-4" /> Yeni Yazı
            </button>
          </div>
        </div>

        {/* AI Generation Card */}
        {!showForm && (
          <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-2xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" /> SEO İçerik Üretici (AI)
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Konu veya başlık girin, AI 800-1500 kelimelik SEO uyumlu, FAQ bölümlü içerik üretsin.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <input
                  value={aiTitle}
                  onChange={e => setAiTitle(e.target.value)}
                  placeholder="Konu veya başlık girin... (ör: 2026 Mart Burç Yorumları)"
                  className="flex-1 min-w-[200px] px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-500"
                  onKeyDown={e => e.key === 'Enter' && !generating && handleGenerate()}
                />
                <input
                  value={aiKeywords}
                  onChange={e => setAiKeywords(e.target.value)}
                  placeholder="Anahtar kelimeler (opsiyonel, virgülle ayırın)"
                  className="w-64 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-500"
                />
                <button
                  onClick={handleGenerate}
                  disabled={generating || !aiTitle.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Üretiliyor...</> : <><Sparkles className="w-4 h-4" /> Üret</>}
                </button>
              </div>
              {aiMessage && (
                <p className={`text-sm ${aiMessage.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{aiMessage}</p>
              )}
            </div>
          </div>
        )}

        {/* Bulk AI Generation */}
        {!showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
            <button
              onClick={() => setShowBulkForm(!showBulkForm)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" /> Toplu İçerik Üretici (AI)
              </h3>
              <span className="text-gray-500 text-sm">{showBulkForm ? '▲' : '▼'}</span>
            </button>
            {showBulkForm && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-400">Her satıra bir konu yazın (maks. 5). AI her biri için SEO uyumlu içerik üretecek.</p>
                <textarea
                  value={bulkTopics}
                  onChange={e => setBulkTopics(e.target.value)}
                  placeholder={"2026 Koç Burcu Mart Yorumu\nKahve Falında Kalp Şekli Ne Anlama Gelir?\nTarot'ta Kule Kartı Rehberi"}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 resize-none"
                />
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Kategori</label>
                    <select
                      value={bulkCategory}
                      onChange={e => setBulkCategory(e.target.value)}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm min-w-[140px]"
                    >
                      <option value="">Otomatik</option>
                      {categories.map(c => (
                        <option key={c.slug} value={c.slug}>{c.nameTr}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Burç</label>
                    <select
                      value={bulkZodiac}
                      onChange={e => setBulkZodiac(e.target.value)}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm min-w-[120px]"
                    >
                      {ZODIAC_SIGNS.map(z => (
                        <option key={z.value} value={z.value}>{z.label}</option>
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

        {/* Category Management */}
        {!showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400" /> Kategoriler
              </h3>
              <button onClick={() => setShowCategoryForm(!showCategoryForm)} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                <FolderPlus className="w-3.5 h-3.5" /> Yeni Kategori
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <span key={c.slug} className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  {c.nameTr}
                </span>
              ))}
            </div>
            {showCategoryForm && (
              <div className="mt-4 flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Slug</label>
                  <input value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm w-36" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Ad (TR)</label>
                  <input value={newCatNameTr} onChange={e => setNewCatNameTr(e.target.value)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm w-36" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Ad (EN)</label>
                  <input value={newCatNameEn} onChange={e => setNewCatNameEn(e.target.value)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm w-36" />
                </div>
                <button onClick={handleAddCategory} className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm">Ekle</button>
              </div>
            )}
          </div>
        )}

        {/* CSV Import */}
        {!showForm && (
          <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-2xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" /> Excel/CSV İçe Aktarma
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Hazırladığınız CSV dosyasını yükleyerek toplu blog yazısı ekleyin. Aynı slug varsa güncellenir.
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
                    <span className="text-sm font-medium">{importResult.success} yazı başarıyla içe aktarıldı</span>
                  </div>
                )}
                {importResult.newCategories.length > 0 && (
                  <p className="text-xs text-emerald-400 mb-2">
                    Yeni kategoriler oluşturuldu: {importResult.newCategories.join(', ')}
                  </p>
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

        {/* Bulk Import Link */}
        {!showForm && (
          <div className="mb-6">
            <Link
              href={`/${lang}/admin/blog/bulk-import`}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-fuchsia-900/40 to-purple-900/40 border border-fuchsia-500/30 text-fuchsia-200 hover:from-fuchsia-900/60 hover:to-purple-900/60 transition-all text-sm font-medium"
            >
              <Upload className="w-5 h-5" />
              Toplu Blog İçe Aktarma (Kategori Seçimli, Önizleme ile)
            </Link>
          </div>
        )}

        {/* FORM */}
        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{isNew ? 'Yeni Blog Yazısı' : 'Yazıyı Düzenle'}</h2>
              <button onClick={closeForm} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Row 1: Slug + Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Slug (URL)</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" placeholder="ornek-yazi-basligi" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Kategori</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                  {categories.map(c => <option key={c.slug} value={c.slug}>{c.nameTr}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Titles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Başlık (TR)</label>
                <input value={form.titleTr} onChange={e => setForm(f => ({ ...f, titleTr: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Başlık (EN)</label>
                <input value={form.titleEn} onChange={e => setForm(f => ({ ...f, titleEn: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              </div>
            </div>

            {/* Row 3: Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Açıklama (TR)</label>
                <textarea value={form.descTr} onChange={e => setForm(f => ({ ...f, descTr: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Açıklama (EN)</label>
                <textarea value={form.descEn} onChange={e => setForm(f => ({ ...f, descEn: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none" />
              </div>
            </div>

            {/* Row 4: Meta Description + Cover Image */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Meta Açıklama (SEO - 140-160 karakter)</label>
                <textarea
                  value={form.metaDescription}
                  onChange={e => setForm(f => ({ ...f, metaDescription: e.target.value }))}
                  rows={2}
                  maxLength={160}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none"
                  placeholder="Google arama sonuçlarında görünecek açıklama..."
                />
                <p className={`text-xs mt-1 ${form.metaDescription.length >= 140 && form.metaDescription.length <= 160 ? 'text-green-400' : form.metaDescription.length > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {form.metaDescription.length}/160 karakter {form.metaDescription.length >= 140 && form.metaDescription.length <= 160 ? '✓ İdeal' : form.metaDescription.length > 0 && form.metaDescription.length < 140 ? '(140-160 arası ideal)' : ''}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Kapak Görseli URL</label>
                <div className="flex gap-2">
                  <input
                    value={form.coverImage}
                    onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                    placeholder="https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Among_Us_cover_art.jpg/250px-Among_Us_cover_art.jpg (opsiyonel)"
                  />
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {form.coverImage ? (
                      <img loading="lazy" src={form.coverImage} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 5: Author + Read Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Yazar Adı</label>
                <input value={form.authorName} onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Okuma Süresi (dk) <span className="text-gray-600">— 0 = otomatik hesapla</span></label>
                <input type="number" min={0} value={form.readTime} onChange={e => setForm(f => ({ ...f, readTime: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              </div>
            </div>

            {/* Content TR */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">İçerik TR (HTML destekli)</label>
              <textarea value={form.contentTr} onChange={e => setForm(f => ({ ...f, contentTr: e.target.value }))} rows={10} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono resize-y" />
              <p className="text-xs text-gray-500 mt-1">
                {form.contentTr.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} kelime
              </p>
            </div>

            {/* Content EN */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">İçerik EN (HTML destekli)</label>
              <textarea value={form.contentEn} onChange={e => setForm(f => ({ ...f, contentEn: e.target.value }))} rows={8} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono resize-y" />
            </div>

            {/* Keywords */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">Anahtar Kelimeler (virgülle ayırın)</label>
              <input value={keywordsInput} onChange={e => setKeywordsInput(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" placeholder="fal, tarot, kahve falı, astroloji" />
              <div className="flex flex-wrap gap-1 mt-2">
                {keywordsInput.split(',').map(k => k.trim()).filter(Boolean).map((kw, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">{kw}</span>
                ))}
              </div>
            </div>

            {/* Toggles Row */}
            <div className="flex flex-wrap items-center gap-6 mb-6 p-4 bg-white/3 rounded-xl border border-white/5">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} className="rounded accent-green-500" />
                <Eye className="w-4 h-4 text-green-400" /> Yayınla
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} className="rounded accent-yellow-500" />
                <Star className="w-4 h-4 text-yellow-400" /> Öne Çıkan
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isTrending} onChange={e => setForm(f => ({ ...f, isTrending: e.target.checked }))} className="rounded accent-orange-500" />
                <TrendingUp className="w-4 h-4 text-orange-400" /> Trend
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isEditorPick} onChange={e => setForm(f => ({ ...f, isEditorPick: e.target.checked }))} className="rounded accent-blue-500" />
                <Award className="w-4 h-4 text-blue-400" /> Editör Seçimi
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isPremium} onChange={e => setForm(f => ({ ...f, isPremium: e.target.checked }))} className="rounded accent-yellow-500" />
                <Crown className="w-4 h-4 text-yellow-400" /> Premium
              </label>
              {form.isAiGenerated && (
                <span className="flex items-center gap-1.5 text-sm text-purple-400">
                  <Sparkles className="w-4 h-4" /> AI Üretimi
                </span>
              )}
            </div>

            {/* Zodiac + Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Burç (Astroloji Modülü)</label>
                <select value={form.zodiacSign} onChange={e => setForm(f => ({ ...f, zodiacSign: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                  {ZODIAC_SIGNS.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Zamanlı Yayın <span className="text-gray-600">(opsiyonel)</span></label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button onClick={closeForm} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition">İptal</button>
            </div>
          </div>
        )}

        {/* Filter by Category */}
        {!showForm && posts.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-gray-500">Filtre:</span>
            <button onClick={() => setFilterCategory('all')} className={`px-3 py-1 rounded-full text-xs transition ${filterCategory === 'all' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Tümü ({posts.length})</button>
            {categories.map(cat => {
              const count = posts.filter(p => p.category === cat.slug).length
              if (count === 0) return null
              return (
                <button key={cat.slug} onClick={() => setFilterCategory(cat.slug)} className={`px-3 py-1 rounded-full text-xs transition ${filterCategory === cat.slug ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                  {cat.nameTr} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-purple-900/40 border border-purple-500/30 flex flex-wrap items-center gap-3">
            <span className="text-sm text-purple-200">{selectedIds.length} yazı seçildi</span>
            <select
              value={bulkCategoryTarget}
              onChange={e => setBulkCategoryTarget(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/10"
            >
              <option value="">Kategori seç...</option>
              {categories.map(c => (
                <option key={c.slug} value={c.slug}>{c.nameTr}</option>
              ))}
            </select>
            <button
              onClick={handleBulkCategoryMove}
              disabled={!bulkCategoryTarget || bulkMoving}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {bulkMoving ? 'Taşınıyor...' : 'Kategoriye Taşı'}
            </button>
            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition">
              İptal
            </button>
          </div>
        )}

        {/* Posts List */}
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Henüz blog yazısı yok</p>
            <p className="text-sm text-gray-500 mt-2">Yukarıdaki yapay zeka aracı ile hızlıca blog oluşturabilirsiniz</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select All */}
            <div className="flex items-center gap-2 px-4 py-2">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredPosts.length && filteredPosts.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded accent-purple-500"
              />
              <span className="text-xs text-gray-400">Tümünü Seç</span>
            </div>
            {filteredPosts.map(post => (
              <div key={post.id} className={`p-4 rounded-xl border flex items-center gap-3 ${selectedIds.includes(post.id) ? 'bg-purple-900/20 border-purple-500/40' : 'bg-white/5 border-white/10'}`}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(post.id)}
                  onChange={() => toggleSelectPost(post.id)}
                  className="w-4 h-4 rounded accent-purple-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${post.isPublished ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>
                      {post.isPublished ? 'Yayında' : 'Taslak'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300">{getCategoryLabel(post.category)}</span>
                    {post.isFeatured && <Star className="w-3.5 h-3.5 text-yellow-400" />}
                    {post.isTrending && <TrendingUp className="w-3.5 h-3.5 text-orange-400" />}
                    {post.isEditorPick && <Award className="w-3.5 h-3.5 text-blue-400" />}
                    {post.isAiGenerated && <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                    {post.isPremium && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                    {post.readTime > 0 && (
                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {post.readTime} dk
                      </span>
                    )}
                    {post.views > 0 && (
                      <span className="text-[10px] text-gray-500">{post.views} görüntülenme</span>
                    )}
                  </div>
                  <h3 className="text-white font-medium truncate">{post.titleTr}</h3>
                  <p className="text-xs text-gray-500 truncate">{post.descTr}</p>
                  {post.keywords && post.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {post.keywords.slice(0, 4).map((kw, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">{kw}</span>
                      ))}
                      {post.keywords.length > 4 && <span className="text-[10px] text-gray-600">+{post.keywords.length - 4}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => togglePublish(post)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition" title={post.isPublished ? 'Yayından Kaldır' : 'Yayınla'}>
                    {post.isPublished ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-green-400" />}
                  </button>
                  <button onClick={() => openEdit(post)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
                    <Edit className="w-4 h-4 text-blue-400" />
                  </button>
                  <button onClick={() => handleDelete(post.id)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}