'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Plus, Edit, Trash2, Eye, EyeOff, Save, X, BookOpen, Sparkles, Loader2, FolderPlus, Tag, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '@/components/loading-spinner'

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
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCatSlug, setNewCatSlug] = useState('')
  const [newCatNameTr, setNewCatNameTr] = useState('')
  const [newCatNameEn, setNewCatNameEn] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; errors: string[]; newCategories: string[] } | null>(null)

  const emptyPost: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'> = {
    slug: '',
    titleTr: '',
    titleEn: '',
    descTr: '',
    descEn: '',
    contentTr: '',
    contentEn: '',
    category: 'genel',
    keywords: [],
    isPublished: false,
  }

  const [form, setForm] = useState(emptyPost)
  const [keywordsInput, setKeywordsInput] = useState('')

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blog')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch (e) {
      console.error('Failed to fetch posts', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blog/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (e) {
      console.error('Failed to fetch categories', e)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
    fetchCategories()
  }, [fetchPosts, fetchCategories])

  const openNew = () => {
    setForm(emptyPost)
    setKeywordsInput('')
    setEditing(null)
    setIsNew(true)
    setAiTitle('')
  }

  const openEdit = (post: BlogPost) => {
    setForm({
      slug: post.slug,
      titleTr: post.titleTr,
      titleEn: post.titleEn,
      descTr: post.descTr,
      descEn: post.descEn,
      contentTr: post.contentTr,
      contentEn: post.contentEn,
      category: post.category,
      keywords: post.keywords,
      isPublished: post.isPublished,
    })
    setKeywordsInput(post.keywords.join(', '))
    setEditing(post)
    setIsNew(false)
  }

  const closeForm = () => {
    setEditing(null)
    setIsNew(false)
  }

  // AI GENERATE
  const handleAiGenerate = async () => {
    if (!aiTitle.trim() || aiTitle.trim().length < 3) {
      alert('L\u00fctfen en az 3 karakterlik bir ba\u015fl\u0131k girin.')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: aiTitle.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Yapay zeka hatası')
        return
      }
      const data = await res.json()
      setForm({
        slug: data.slug || '',
        titleTr: data.titleTr || aiTitle.trim(),
        titleEn: data.titleEn || '',
        descTr: data.descTr || '',
        descEn: data.descEn || '',
        contentTr: data.contentTr || '',
        contentEn: data.contentEn || '',
        category: data.category || 'genel',
        keywords: data.keywords || [],
        isPublished: false,
      })
      setKeywordsInput((data.keywords || []).join(', '))
      // Refresh categories in case new one was created
      if (data.newCategoryCreated) {
        fetchCategories()
      }
      setIsNew(true)
      setEditing(null)
    } catch (e) {
      console.error(e)
      alert('Yapay zeka bağlantı hatası')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        ...form,
        keywords: keywordsInput.split(',').map(k => k.trim()).filter(Boolean),
      }

      if (isNew) {
        const res = await fetch('/api/admin/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json()
          alert(err.error || 'Hata oluştu')
          return
        }
      } else if (editing) {
        const res = await fetch(`/api/admin/blog/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json()
          alert(err.error || 'Hata oluştu')
          return
        }
      }

      closeForm()
      fetchPosts()
    } catch (e) {
      console.error(e)
      alert('Kaydetme hatası')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Bu yazıyı silmek istediğinize emin misiniz?')) return
    try {
      await fetch(`/api/admin/blog/${postId}`, { method: 'DELETE' })
      fetchPosts()
    } catch (e) {
      console.error(e)
    }
  }

  const togglePublish = async (post: BlogPost) => {
    try {
      await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !post.isPublished }),
      })
      fetchPosts()
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddCategory = async () => {
    if (!newCatSlug || !newCatNameTr) {
      alert('Slug ve Türkçe ad zorunlu')
      return
    }
    try {
      const res = await fetch('/api/admin/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: newCatSlug, nameTr: newCatNameTr, nameEn: newCatNameEn }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Hata')
        return
      }
      setNewCatSlug('')
      setNewCatNameTr('')
      setNewCatNameEn('')
      setShowCategoryForm(false)
      fetchCategories()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteCategory = async (cat: BlogCategory) => {
    if (!confirm(`"${cat.nameTr}" kategorisini silmek istediğinize emin misiniz?`)) return
    try {
      await fetch(`/api/admin/blog/categories?id=${cat.id}`, { method: 'DELETE' })
      fetchCategories()
    } catch (e) {
      console.error(e)
    }
  }

  // CSV Import
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImporting(true)
    setImportResult(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await fetch('/api/admin/blog/import', {
        method: 'POST',
        body: formData,
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setImportResult({ success: 0, errors: [data.error || 'İçe aktarma hatası'], newCategories: [] })
      } else {
        setImportResult({
          success: data.success || 0,
          errors: data.errors || [],
          newCategories: data.newCategories || [],
        })
        fetchPosts()
        fetchCategories()
      }
    } catch (err) {
      console.error(err)
      setImportResult({ success: 0, errors: ['Bağlantı hatası'], newCategories: [] })
    } finally {
      setImporting(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const downloadTemplate = () => {
    const headers = ['slug', 'category', 'titleTr', 'titleEn', 'descTr', 'descEn', 'contentTr', 'contentEn', 'keywords', 'isPublished']
    const sampleRow = [
      'ornek-blog-yazisi',
      'tarot',
      'Örnek Blog Yazısı',
      'Sample Blog Post',
      'Bu bir örnek açıklamadır.',
      'This is a sample description.',
      '<p>Bu örnek içerik HTML desteklidir.</p>',
      '<p>This sample content supports HTML.</p>',
      'tarot, fal, örnek',
      'false'
    ]
    
    const csvContent = [
      headers.join(','),
      sampleRow.map(v => `"${v.replace(/"/g, '""')}"`).join(',')
    ].join('\n')
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'blog-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getCategoryLabel = (slug: string) => {
    const cat = categories.find(c => c.slug === slug)
    return cat ? cat.nameTr : slug
  }

  const showForm = isNew || editing
  const filteredPosts = filterCategory === 'all' ? posts : posts.filter(p => p.category === filterCategory)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href={`/admin`} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-400" />
              Blog Yönetimi
            </h1>
          </div>
          {!showForm && (
            <div className="flex gap-2">
              <button onClick={() => setShowCategoryForm(!showCategoryForm)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition border border-white/10">
                <Tag className="w-4 h-4" /> Kategoriler
              </button>
              <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition">
                <Plus className="w-4 h-4" /> Yeni Yazı
              </button>
            </div>
          )}
        </div>

        {/* Category Management */}
        {showCategoryForm && !showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-400" /> Kategori Yönetimi
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <span className="text-sm text-purple-200">{cat.nameTr}</span>
                  <span className="text-xs text-gray-500">({cat.slug})</span>
                  <button onClick={() => handleDeleteCategory(cat)} className="text-red-400 hover:text-red-300 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Slug</label>
                <input value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm w-36" placeholder="yeni-slug" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Türkçe Ad</label>
                <input value={newCatNameTr} onChange={e => setNewCatNameTr(e.target.value)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm w-36" placeholder="Kategori Adı" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">İngilizce Ad</label>
                <input value={newCatNameEn} onChange={e => setNewCatNameEn(e.target.value)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm w-36" placeholder="Category Name" />
              </div>
              <button onClick={handleAddCategory} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm transition">
                <FolderPlus className="w-4 h-4" /> Ekle
              </button>
            </div>
          </div>
        )}

        {/* AI Generate Section */}
        {!showForm && (
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" /> Yapay Zeka ile Blog Oluştur
            </h3>
            <p className="text-sm text-gray-400 mb-3">Sadece bir başlık yazın, yapay zeka tüm içeriği (slug, kategori, başlıklar, açıklamalar, içerikler, anahtar kelimeler) otomatik oluştursun.</p>
            <div className="flex gap-2">
              <input
                value={aiTitle}
                onChange={e => setAiTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !generating && handleAiGenerate()}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-purple-500/30 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-400"
                placeholder="Blog başlığını yazın... (ör: Tarot kartlarının tarihi)"
                disabled={generating}
              />
              <button
                onClick={handleAiGenerate}
                disabled={generating || !aiTitle.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium transition disabled:opacity-50"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Oluşturuluyor...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Oluştur</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* CSV Import Section */}
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
            
            {/* Import Result */}
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
                <button
                  onClick={() => setImportResult(null)}
                  className="mt-3 text-xs text-gray-500 hover:text-gray-400"
                >
                  Kapat
                </button>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{isNew ? 'Yeni Blog Yazısı' : 'Yazıyı Düzenle'}</h2>
              <button onClick={closeForm} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

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

            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">İçerik TR (HTML destekli)</label>
              <textarea value={form.contentTr} onChange={e => setForm(f => ({ ...f, contentTr: e.target.value }))} rows={8} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono resize-y" />
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">İçerik EN (HTML destekli)</label>
              <textarea value={form.contentEn} onChange={e => setForm(f => ({ ...f, contentEn: e.target.value }))} rows={8} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono resize-y" />
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">Anahtar Kelimeler (virgülle ayırın)</label>
              <input value={keywordsInput} onChange={e => setKeywordsInput(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" placeholder="fal, tarot, kahve falı" />
            </div>

            <div className="flex items-center gap-4 mb-6">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} className="rounded" />
                Yayınla
              </label>
            </div>

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
            {filteredPosts.map(post => (
              <div key={post.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${post.isPublished ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>
                      {post.isPublished ? 'Yayında' : 'Taslak'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300">{getCategoryLabel(post.category)}</span>
                  </div>
                  <h3 className="text-white font-medium truncate">{post.titleTr}</h3>
                  <p className="text-xs text-gray-500 truncate">{post.descTr}</p>
                  {post.keywords.length > 0 && (
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
