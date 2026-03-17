'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { ArrowLeft, Plus, Trash2, Save, FileText, Loader2, ToggleLeft, ToggleRight, GripVertical, Eye, EyeOff, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { motion, Reorder } from 'framer-motion'

interface SitePage {
  id: string
  title: string
  titleEn: string | null
  slug: string
  content: string
  contentEn: string | null
  isPublished: boolean
  showInFooter: boolean
  showInHeader: boolean
  sortOrder: number
}

export default function AdminSitePagesPage() {
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const [pages, setPages] = useState<SitePage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editPage, setEditPage] = useState<SitePage | null>(null)
  const [form, setForm] = useState({ title: '', titleEn: '', slug: '', content: '', contentEn: '', isPublished: true, showInFooter: true, showInHeader: false })

  const isMystical = theme === 'mystical'
  const cardBg = isMystical ? 'bg-[#1a0a2e]/80 border-fuchsia-900/30' : 'bg-white border-gray-200'
  const textColor = isMystical ? 'text-white' : 'text-gray-900'
  const subText = isMystical ? 'text-fuchsia-200' : 'text-gray-500'
  const inputBg = isMystical ? 'bg-[#2a1a3e] border-fuchsia-800/50 text-white' : 'bg-white border-gray-300 text-gray-900'
  const btnPrimary = isMystical ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'

  useEffect(() => { fetchPages() }, [])

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/admin/site-pages?admin=true')
      if (res.ok) {
        const data = await res.json()
        setPages(data.pages)
      }
    } catch (e) { console.error(e) }
    setIsLoading(false)
  }

  const autoSlug = (title: string) => {
    return title.toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }

  const handleSave = async () => {
    setSaving('new')
    try {
      const payload = {
        ...form,
        slug: form.slug || autoSlug(form.title),
        ...(editPage ? { id: editPage.id } : {})
      }
      const res = await fetch('/api/admin/site-pages', {
        method: editPage ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        await fetchPages()
        setShowForm(false)
        setEditPage(null)
        setForm({ title: '', titleEn: '', slug: '', content: '', contentEn: '', isPublished: true, showInFooter: true, showInHeader: false })
      } else {
        const data = await res.json()
        alert(data.error || 'Error')
      }
    } catch (e) { console.error(e) }
    setSaving(null)
  }

  const handleTogglePublish = async (page: SitePage) => {
    setSaving(page.id)
    try {
      await fetch('/api/admin/site-pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: page.id, isPublished: !page.isPublished })
      })
      await fetchPages()
    } catch (e) { console.error(e) }
    setSaving(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'tr' ? 'Bu sayfayı silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this page?')) return
    setSaving(id)
    try {
      await fetch(`/api/admin/site-pages?id=${id}`, { method: 'DELETE' })
      await fetchPages()
    } catch (e) { console.error(e) }
    setSaving(null)
  }

  const openEdit = (page: SitePage) => {
    setEditPage(page)
    setForm({
      title: page.title,
      titleEn: page.titleEn || '',
      slug: page.slug,
      content: page.content,
      contentEn: page.contentEn || '',
      isPublished: page.isPublished,
      showInFooter: page.showInFooter,
      showInHeader: page.showInHeader
    })
    setShowForm(true)
  }

  const handleReorder = useCallback(async (newPages: SitePage[]) => {
    setPages(newPages)
    const items = newPages.map((p, i) => ({ id: p.id, sortOrder: i }))
    try {
      await fetch('/api/admin/site-pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorder: true, items })
      })
    } catch (e) { console.error(e) }
  }, [])

  return (
    <div className={`min-h-screen ${isMystical ? 'bg-[#0f0520]' : 'bg-gray-50'} p-4 sm:p-6`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/${language}/admin`} className={`p-2 rounded-lg ${cardBg} border`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-2xl font-bold ${textColor}`}>
              {language === 'tr' ? '📄 Sayfa Yönetimi' : '📄 Page Management'}
            </h1>
            <p className={`text-sm ${subText}`}>
              {language === 'tr' ? 'Site sayfalarını ekleyin, düzenleyin ve sıralayın' : 'Add, edit, and reorder site pages'}
            </p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditPage(null); setForm({ title: '', titleEn: '', slug: '', content: '', contentEn: '', isPublished: true, showInFooter: true, showInHeader: false }) }}
            className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg ${btnPrimary}`}
          >
            <Plus className="w-4 h-4" />
            {language === 'tr' ? 'Yeni Sayfa' : 'New Page'}
          </button>
        </div>

        {/* Page Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`${cardBg} border rounded-xl p-6 mb-6`}>
            <h3 className={`text-lg font-bold mb-4 ${textColor}`}>
              {editPage ? (language === 'tr' ? 'Sayfa Düzenle' : 'Edit Page') : (language === 'tr' ? 'Yeni Sayfa Oluştur' : 'Create New Page')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${subText}`}>{language === 'tr' ? 'Sayfa Başlığı (TR)' : 'Page Title (TR)'}</label>
                <input value={form.title} onChange={e => { setForm({ ...form, title: e.target.value, slug: form.slug || autoSlug(e.target.value) }) }} className={`w-full px-3 py-2 rounded-lg border ${inputBg}`} placeholder="Hakkımızda" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${subText}`}>{language === 'tr' ? 'Sayfa Başlığı (EN)' : 'Page Title (EN)'}</label>
                <input value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${inputBg}`} placeholder="About Us" />
              </div>
              <div className="sm:col-span-2">
                <label className={`block text-sm font-medium mb-1 ${subText}`}>Slug (URL)</label>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${subText}`}>/sayfa/</span>
                  <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className={`flex-1 px-3 py-2 rounded-lg border ${inputBg}`} placeholder="hakkimizda" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={`block text-sm font-medium mb-1 ${subText}`}>{language === 'tr' ? 'İçerik (TR) - HTML desteklenir' : 'Content (TR) - HTML supported'}</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={8} className={`w-full px-3 py-2 rounded-lg border ${inputBg} font-mono text-sm`} placeholder="<h2>Hakkımızda</h2>\n<p>İçerik buraya...</p>" />
              </div>
              <div className="sm:col-span-2">
                <label className={`block text-sm font-medium mb-1 ${subText}`}>{language === 'tr' ? 'İçerik (EN) - Opsiyonel' : 'Content (EN) - Optional'}</label>
                <textarea value={form.contentEn} onChange={e => setForm({ ...form, contentEn: e.target.value })} rows={4} className={`w-full px-3 py-2 rounded-lg border ${inputBg} font-mono text-sm`} placeholder="<h2>About Us</h2>\n<p>Content here...</p>" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} className="rounded" />
                  <span className={`text-sm ${textColor}`}>{language === 'tr' ? 'Yayında' : 'Published'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.showInFooter} onChange={e => setForm({ ...form, showInFooter: e.target.checked })} className="rounded" />
                  <span className={`text-sm ${textColor}`}>{language === 'tr' ? 'Footer\'da Göster' : 'Show in Footer'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.showInHeader} onChange={e => setForm({ ...form, showInHeader: e.target.checked })} className="rounded" />
                  <span className={`text-sm ${textColor}`}>{language === 'tr' ? 'Header\'da Göster' : 'Show in Header'}</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving === 'new' || !form.title || !form.content} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${btnPrimary} disabled:opacity-50`}>
                {saving === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {language === 'tr' ? 'Kaydet' : 'Save'}
              </button>
              <button onClick={() => { setShowForm(false); setEditPage(null) }} className={`px-4 py-2 rounded-lg border ${cardBg} ${textColor}`}>
                {language === 'tr' ? 'İptal' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Page List with Drag & Drop */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" /></div>
        ) : pages.length === 0 ? (
          <div className={`${cardBg} border rounded-xl p-12 text-center`}>
            <FileText className={`w-12 h-12 mx-auto mb-3 ${subText}`} />
            <p className={textColor}>{language === 'tr' ? 'Henüz sayfa yok' : 'No pages yet'}</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={pages} onReorder={handleReorder} className="space-y-3">
            {pages.map(page => (
              <Reorder.Item key={page.id} value={page}>
                <div className={`${cardBg} border rounded-xl p-4 flex items-center gap-4 ${!page.isPublished ? 'opacity-60' : ''}`}>
                  <GripVertical className={`w-5 h-5 ${subText} cursor-grab flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${textColor}`}>{page.title}</span>
                      {page.titleEn && <span className={`text-xs ${subText}`}>/ {page.titleEn}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${subText}`}>/sayfa/{page.slug}</span>
                      {page.showInFooter && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isMystical ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-blue-100 text-blue-700'}`}>Footer</span>
                      )}
                      {page.showInHeader && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isMystical ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>Header</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleTogglePublish(page)} className="p-1.5 rounded-lg hover:bg-black/10" title={page.isPublished ? 'Yayından kaldır' : 'Yayınla'}>
                      {saving === page.id ? <Loader2 className="w-5 h-5 animate-spin" /> :
                        page.isPublished ? <Eye className="w-5 h-5 text-green-500" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
                    </button>
                    <button onClick={() => openEdit(page)} className="p-1.5 rounded-lg hover:bg-black/10">
                      <FileText className="w-4 h-4 text-blue-400" />
                    </button>
                    <Link href={`/${language}/sayfa/${page.slug}`} target="_blank" className="p-1.5 rounded-lg hover:bg-black/10">
                      <ExternalLink className="w-4 h-4 text-fuchsia-400" />
                    </Link>
                    <button onClick={() => handleDelete(page.id)} className="p-1.5 rounded-lg hover:bg-red-500/20">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  )
}
