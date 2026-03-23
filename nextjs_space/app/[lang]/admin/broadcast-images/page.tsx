'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Edit2, Image, Save, X, GripVertical, Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import NextImage from 'next/image'
import AdminBackButton from '@/components/admin-back-button'

interface BroadcastImage {
  id: string
  name: string
  imageUrl: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export default function AdminBroadcastImagesPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const language = (params?.lang as string) || 'tr'
  const { t } = useLanguage()
  
  const [images, setImages] = useState<BroadcastImage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingImage, setEditingImage] = useState<BroadcastImage | null>(null)
  
  // Form state
  const [formName, setFormName] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formSortOrder, setFormSortOrder] = useState(0)
  
  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/broadcast-images')
      if (res.ok) {
        const data = await res.json()
        setImages(data)
      }
    } catch (e) {
      console.error('Error fetching images:', e)
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    if (status === 'authenticated') {
      fetchImages()
    } else if (status === 'unauthenticated') {
      router.push(`/giris`)
    }
  }, [status, fetchImages, router, language])
  
  const handleAddImage = async () => {
    if (!formName.trim() || !formImageUrl.trim()) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/admin/broadcast-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          imageUrl: formImageUrl,
          sortOrder: formSortOrder
        })
      })
      
      if (res.ok) {
        await fetchImages()
        setShowAddModal(false)
        resetForm()
      }
    } catch (e) {
      console.error('Error adding image:', e)
    } finally {
      setSaving(false)
    }
  }
  
  const handleUpdateImage = async () => {
    if (!editingImage || !formName.trim() || !formImageUrl.trim()) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/admin/broadcast-images', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingImage.id,
          name: formName,
          imageUrl: formImageUrl,
          sortOrder: formSortOrder
        })
      })
      
      if (res.ok) {
        await fetchImages()
        setEditingImage(null)
        resetForm()
      }
    } catch (e) {
      console.error('Error updating image:', e)
    } finally {
      setSaving(false)
    }
  }
  
  const handleToggleActive = async (image: BroadcastImage) => {
    try {
      const res = await fetch('/api/admin/broadcast-images', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: image.id,
          isActive: !image.isActive
        })
      })
      
      if (res.ok) {
        await fetchImages()
      }
    } catch (e) {
      console.error('Error toggling image:', e)
    }
  }
  
  const handleDeleteImage = async (id: string) => {
    if (!confirm('Bu resmi silmek istediğinize emin misiniz?')) return
    
    try {
      const res = await fetch(`/api/admin/broadcast-images?id=${id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        await fetchImages()
      }
    } catch (e) {
      console.error('Error deleting image:', e)
    }
  }
  
  const resetForm = () => {
    setFormName('')
    setFormImageUrl('')
    setFormSortOrder(0)
  }
  
  const openEditModal = (image: BroadcastImage) => {
    setEditingImage(image)
    setFormName(image.name)
    setFormImageUrl(image.imageUrl)
    setFormSortOrder(image.sortOrder)
  }
  
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[#0a0118] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0118]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AdminBackButton variant="link" className="p-2 hover:bg-white/10 rounded-full transition" label="" />
            <div className="flex items-center gap-2">
              <Image className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold">
                {'Yayın Resimleri'}
              </h1>
            </div>
          </div>
          
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold text-sm hover:from-purple-400 hover:to-pink-400 transition"
          >
            <Plus className="w-4 h-4" />
            {'Resim Ekle'}
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <p className="text-white/60 text-sm mb-6">
          {'Yayıncıların ekran görüntüsü olarak kullanabileceği resimleri buradan yönetebilirsiniz. Yayıncılar sadece bu listedeki aktif resimleri seçebilir.'}
        </p>
        
        {images.length === 0 ? (
          <div className="text-center py-16">
            <Image className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">
              {'Henüz resim eklenmemiş'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative bg-white/5 rounded-xl overflow-hidden border transition ${
                  image.isActive ? 'border-purple-500/30' : 'border-white/10 opacity-50'
                }`}
              >
                {/* Image Preview */}
                <div className="aspect-video relative bg-black/30">
                  <NextImage
                    src={image.imageUrl}
                    alt={image.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  
                  {/* Status Badge */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                    image.isActive 
                      ? 'bg-green-500/80 text-white' 
                      : 'bg-red-500/80 text-white'
                  }`}>
                    {image.isActive 
                      ? ('Aktif')
                      : ('Pasif')
                    }
                  </div>
                  
                  {/* Sort Order Badge */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-full text-xs font-medium flex items-center gap-1">
                    <GripVertical className="w-3 h-3" />
                    #{image.sortOrder}
                  </div>
                </div>
                
                {/* Info */}
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate">{image.name}</h3>
                  <p className="text-white/40 text-xs mt-1 truncate">{image.imageUrl}</p>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleToggleActive(image)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        image.isActive
                          ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {image.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {image.isActive 
                        ? ('Gizle')
                        : ('Göster')
                      }
                    </button>
                    
                    <button
                      onClick={() => openEditModal(image)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingImage) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowAddModal(false); setEditingImage(null); resetForm(); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md border border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">
                  {editingImage 
                    ? ('Resmi Düzenle')
                    : ('Yeni Resim Ekle')
                  }
                </h2>
                <button
                  onClick={() => { setShowAddModal(false); setEditingImage(null); resetForm(); }}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {'Resim Adı'}
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder={'Örn: Mor Arka Plan'}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {'Resim URL'}
                  </label>
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={e => setFormImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                {/* Image Preview */}
                {formImageUrl && (
                  <div className="aspect-video relative bg-black/30 rounded-xl overflow-hidden">
                    <NextImage
                      src={formImageUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {'Sıralama'}
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={e => setFormSortOrder(parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <button
                  onClick={editingImage ? handleUpdateImage : handleAddImage}
                  disabled={saving || !formName.trim() || !formImageUrl.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-400 hover:to-pink-400 transition"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {editingImage 
                        ? ('Güncelle')
                        : ('Ekle')
                      }
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
