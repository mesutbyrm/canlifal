'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { Plus, Trash2, Save, Loader2, X, ToggleLeft, ToggleRight, Upload } from 'lucide-react'
import { motion } from 'framer-motion'
import NextImage from 'next/image'
import AdminBackButton from '@/components/admin-back-button'

export interface CosmeticField {
  name: string
  labelTr: string
  labelEn: string
  type: 'text' | 'number' | 'textarea' | 'select' | 'asset' | 'datetime'
  options?: { value: string; labelTr: string; labelEn: string }[]
  placeholder?: string
  accept?: string
  full?: boolean
}

export interface CosmeticCatalogConfig {
  endpoint: string
  titleTr: string
  titleEn: string
  emoji: string
  descTr: string
  descEn: string
  fields: CosmeticField[]
  previewField?: string
  defaults?: Record<string, any>
}

export const TIER_OPTIONS = [
  { value: 'free', labelTr: 'Ücretsiz (Herkes)', labelEn: 'Free (Everyone)' },
  { value: 'gold', labelTr: 'Gold Üyelik', labelEn: 'Gold Membership' },
  { value: 'admin_only', labelTr: 'Sadece Admin Ataması', labelEn: 'Admin Assign Only' },
]

type Item = Record<string, any>

export default function CosmeticCatalogAdmin({ config }: { config: CosmeticCatalogConfig }) {
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const isTr = language === 'tr'

  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetField = useRef<string>('')

  const isMystical = theme === 'mystical'
  const cardBg = isMystical ? 'bg-[#1a0a2e]/80 border-purple-900/30' : 'bg-white border-gray-200'
  const textColor = isMystical ? 'text-white' : 'text-gray-900'
  const subText = isMystical ? 'text-purple-200' : 'text-gray-500'
  const inputBg = isMystical ? 'bg-[#2a1a3e] border-purple-800/50 text-white' : 'bg-white border-gray-300 text-gray-900'
  const btnPrimary = isMystical ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'

  const buildDefaults = (): Record<string, any> => {
    const d: Record<string, any> = { sortOrder: items.length + 1, ...(config.defaults || {}) }
    for (const f of config.fields) {
      if (d[f.name] === undefined) {
        d[f.name] = f.type === 'number' ? 0 : (f.type === 'select' ? (f.options?.[0]?.value ?? '') : '')
      }
    }
    return d
  }

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    try {
      const res = await fetch(config.endpoint)
      if (res.ok) {
        const data = await res.json()
        setItems(Array.isArray(data) ? data : (data.items || data.data?.items || []))
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = editItem ? { ...form, id: editItem.id } : form
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        await fetchItems()
        setShowForm(false)
        setEditItem(null)
        setForm({})
      } else {
        const e = await res.json().catch(() => ({}))
        alert(e.error || (isTr ? 'Kaydetme başarısız' : 'Save failed'))
      }
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(isTr ? 'Silmek istediğinize emin misiniz?' : 'Are you sure you want to delete?')) return
    try {
      const res = await fetch(`${config.endpoint}?id=${id}`, { method: 'DELETE' })
      if (res.ok) fetchItems()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const toggleActive = async (item: Item) => {
    try {
      await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isActive: !item.isActive }),
      })
      fetchItems()
    } catch (err) {
      console.error('Toggle error:', err)
    }
  }

  const openEdit = (item: Item) => {
    setEditItem(item)
    const f: Record<string, any> = {}
    for (const fld of config.fields) f[fld.name] = item[fld.name] ?? (fld.type === 'number' ? 0 : '')
    setForm(f)
    setShowForm(true)
  }

  const openNew = () => {
    setEditItem(null)
    setForm(buildDefaults())
    setShowForm(true)
  }

  const triggerUpload = (fieldName: string, accept: string) => {
    uploadTargetField.current = fieldName
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept
      fileInputRef.current.click()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const field = uploadTargetField.current
    if (!file || !field) return
    if (file.size > 20 * 1024 * 1024) {
      alert(isTr ? 'Dosya boyutu 20MB\'den küçük olmalı.' : 'File must be under 20MB.')
      return
    }
    setUploadingField(field)
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream', isPublic: true }),
      })
      if (!presignedRes.ok) throw new Error('presigned failed')
      const { uploadUrl, cloud_storage_path } = await presignedRes.json()
      const signedHeadersMatch = uploadUrl.match(/X-Amz-SignedHeaders=([^&]+)/)
      const signedHeaders = signedHeadersMatch ? decodeURIComponent(signedHeadersMatch[1]) : 'host'
      const headers: Record<string, string> = { 'Content-Type': file.type || 'application/octet-stream' }
      if (signedHeaders.includes('content-disposition')) headers['Content-Disposition'] = 'attachment'
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers, body: file })
      if (!uploadRes.ok) throw new Error('upload failed')
      const getUrlRes = await fetch('/api/upload/get-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, isPublic: true }),
      })
      let url = cloud_storage_path
      if (getUrlRes.ok) url = (await getUrlRes.json()).url
      setForm(prev => ({ ...prev, [field]: url }))
    } catch (err) {
      console.error('Upload error:', err)
      alert(isTr ? 'Yükleme sırasında hata oluştu.' : 'Error during upload.')
    } finally {
      setUploadingField(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const renderField = (fld: CosmeticField) => {
    const label = isTr ? fld.labelTr : fld.labelEn
    const val = form[fld.name] ?? ''
    const common = `w-full px-3 py-2 rounded-lg border ${inputBg}`
    return (
      <div key={fld.name} className={fld.full ? 'md:col-span-2' : ''}>
        <label className={`block text-sm mb-1 ${subText}`}>{label}</label>
        {fld.type === 'text' && (
          <input value={val} placeholder={fld.placeholder} onChange={e => setForm({ ...form, [fld.name]: e.target.value })} className={common} />
        )}
        {fld.type === 'number' && (
          <input type="number" value={val} onChange={e => setForm({ ...form, [fld.name]: parseInt(e.target.value) || 0 })} className={common} />
        )}
        {fld.type === 'textarea' && (
          <textarea value={val} placeholder={fld.placeholder} rows={4} onChange={e => setForm({ ...form, [fld.name]: e.target.value })} className={common} />
        )}
        {fld.type === 'datetime' && (
          <input type="datetime-local" value={val ? String(val).slice(0, 16) : ''} onChange={e => setForm({ ...form, [fld.name]: e.target.value ? new Date(e.target.value).toISOString() : null })} className={common} />
        )}
        {fld.type === 'select' && (
          <select value={val} onChange={e => setForm({ ...form, [fld.name]: e.target.value })} className={common}>
            {(fld.options || []).map(o => (
              <option key={o.value} value={o.value}>{isTr ? o.labelTr : o.labelEn}</option>
            ))}
          </select>
        )}
        {fld.type === 'asset' && (
          <div className="flex gap-2">
            <input value={val} placeholder={fld.placeholder || 'https://...'} onChange={e => setForm({ ...form, [fld.name]: e.target.value })} className={`flex-1 px-3 py-2 rounded-lg border ${inputBg}`} />
            <button type="button" onClick={() => triggerUpload(fld.name, fld.accept || 'image/*')} disabled={uploadingField === fld.name}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${isMystical ? 'bg-purple-700 hover:bg-purple-600 text-white border-purple-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'} border`}>
              {uploadingField === fld.name ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploadingField === fld.name ? (isTr ? 'Yükleniyor...' : 'Uploading...') : (isTr ? 'Yükle' : 'Upload')}
            </button>
          </div>
        )}
      </div>
    )
  }

  const previewUrl = (item: Item) => config.previewField ? item[config.previewField] : null
  const isImageAsset = (url?: string) => url && /\.(png|jpe?g|gif|webp|svg)$/i.test(url)

  return (
    <div className="min-h-screen p-4 md:p-8">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <AdminBackButton className={`p-2 rounded-lg ${cardBg} border`} />
          <div>
            <h1 className={`text-2xl font-bold ${textColor}`}>{config.emoji} {isTr ? config.titleTr : config.titleEn}</h1>
            <p className={subText}>{isTr ? config.descTr : config.descEn}</p>
          </div>
          <button onClick={openNew} className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg ${btnPrimary}`}>
            <Plus size={18} /> {isTr ? 'Yeni Ekle' : 'Add New'}
          </button>
        </div>

        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`${cardBg} border rounded-xl p-6 mb-8`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-bold ${textColor}`}>
                {editItem ? (isTr ? 'Düzenle' : 'Edit') : (isTr ? 'Yeni Kayıt' : 'New Record')}
              </h2>
              <button onClick={() => { setShowForm(false); setEditItem(null) }}><X className={subText} size={20} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.fields.map(renderField)}
            </div>
            {config.previewField && form[config.previewField] && isImageAsset(form[config.previewField]) && (
              <div className="mt-4">
                <p className={`text-sm mb-2 ${subText}`}>{isTr ? 'Önizleme:' : 'Preview:'}</p>
                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-black/20">
                  <NextImage src={form[config.previewField]} alt="Preview" width={96} height={96} className="object-contain w-full h-full" unoptimized />
                </div>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${btnPrimary}`}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isTr ? 'Kaydet' : 'Save'}
              </button>
              <button onClick={() => { setShowForm(false); setEditItem(null) }} className={`px-4 py-2 rounded-lg border ${cardBg}`}>
                <span className={subText}>{isTr ? 'İptal' : 'Cancel'}</span>
              </button>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-400" size={32} /></div>
        ) : items.length === 0 ? (
          <div className={`text-center py-12 ${subText}`}>{isTr ? 'Henüz kayıt yok. “Yeni Ekle” ile başlayın.' : 'No records yet. Start with “Add New”.'}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-12">
            {items.map(item => (
              <motion.div key={item.id} whileHover={{ scale: 1.03 }} className={`${cardBg} border rounded-xl p-4 text-center relative ${!item.isActive ? 'opacity-50' : ''}`}>
                <div className="relative w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                  {isImageAsset(previewUrl(item)) ? (
                    <NextImage src={previewUrl(item)} alt={item.name} width={64} height={64} className="object-contain" unoptimized />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-600/40 to-pink-600/40 flex items-center justify-center text-2xl">{config.emoji}</div>
                  )}
                </div>
                <p className={`text-sm font-medium ${textColor} truncate`}>{item.name || item.key}</p>
                {item.tier && (
                  <p className={`text-xs ${subText}`}>{TIER_OPTIONS.find(t => t.value === item.tier)?.[isTr ? 'labelTr' : 'labelEn'] || item.tier}</p>
                )}
                <div className="flex justify-center gap-2 mt-2">
                  <button onClick={() => toggleActive(item)} className="p-1 hover:opacity-80" title={item.isActive ? 'Devre dışı' : 'Aktif'}>
                    {item.isActive ? <ToggleRight className="text-green-400" size={18} /> : <ToggleLeft className="text-gray-400" size={18} />}
                  </button>
                  <button onClick={() => openEdit(item)} className="p-1 hover:opacity-80" title="Düzenle"><Save className="text-blue-400" size={16} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1 hover:opacity-80" title="Sil"><Trash2 className="text-red-400" size={16} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
