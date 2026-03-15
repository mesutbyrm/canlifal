'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Edit, Trash2, Eye, EyeOff, Save, X, BookOpen } from 'lucide-react'
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

const CATEGORIES = [
  { value: 'kahve-fali', labelTr: 'Kahve Falı', labelEn: 'Coffee Reading' },
  { value: 'tarot', labelTr: 'Tarot', labelEn: 'Tarot' },
  { value: 'burc', labelTr: 'Burç', labelEn: 'Horoscope' },
  { value: 'genel', labelTr: 'Genel', labelEn: 'General' },
]

export default function AdminBlogPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params?.lang as string) || 'tr'
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)

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

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const openNew = () => {
    setForm(emptyPost)
    setKeywordsInput('')
    setEditing(null)
    setIsNew(true)
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

  const showForm = isNew || editing

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href={`/${lang}/admin`} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-400" />
              Blog Yönetimi
            </h1>
          </div>
          {!showForm && (
            <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition">
              <Plus className="w-4 h-4" /> Yeni Yazı
            </button>
          )}
        </div>

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
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.labelTr}</option>)}
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

        {/* Posts List */}
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Henüz blog yazısı yok</p>
            <button onClick={openNew} className="mt-4 text-purple-400 hover:text-purple-300 text-sm">+ İlk yazını oluştur</button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${post.isPublished ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>
                      {post.isPublished ? 'Yayında' : 'Taslak'}
                    </span>
                    <span className="text-xs text-gray-500">{post.category}</span>
                  </div>
                  <h3 className="text-white font-medium truncate">{post.titleTr}</h3>
                  <p className="text-xs text-gray-500 truncate">{post.descTr}</p>
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
