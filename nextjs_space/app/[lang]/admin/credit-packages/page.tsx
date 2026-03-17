'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  Package,
  Plus,
  Edit2,
  Trash2,
  Star,
  Loader2,
  X,
  Check,
  Gift,
  ChevronUp,
  ChevronDown,
  GripVertical
} from 'lucide-react'

interface CreditPackage {
  id: string
  name: string
  nameEn: string | null
  credits: number
  price: number
  currency: string
  bonusCredits: number
  isFeatured: boolean
  isActive: boolean
  sortOrder: number
}

export default function CreditPackagesPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    credits: 100,
    price: 99,
    currency: 'TRY',
    bonusCredits: 0,
    isFeatured: false,
    sortOrder: 0
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      router.push(`/login`)
      return
    }
    fetchPackages()
  }, [session, status])

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/admin/credit-packages')
      if (res.ok) {
        const data = await res.json()
        setPackages(data)
      }
    } catch (err) {
      console.error('Fetch packages error:', err)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingPackage(null)
    setFormData({
      name: '',
      nameEn: '',
      credits: 100,
      price: 99,
      currency: 'TRY',
      bonusCredits: 0,
      isFeatured: false,
      sortOrder: packages.length
    })
    setShowModal(true)
  }

  const openEditModal = (pkg: CreditPackage) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      nameEn: pkg.nameEn || '',
      credits: pkg.credits,
      price: pkg.price,
      currency: pkg.currency,
      bonusCredits: pkg.bonusCredits,
      isFeatured: pkg.isFeatured,
      sortOrder: pkg.sortOrder
    })
    setShowModal(true)
  }

  const showMessage = (type: 'error' | 'success', msg: string) => {
    if (type === 'error') {
      setError(msg)
      setTimeout(() => setError(null), 5000)
    } else {
      setSuccess(msg)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const url = editingPackage
        ? `/api/admin/credit-packages/${editingPackage.id}`
        : '/api/admin/credit-packages'
      const method = editingPackage ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        fetchPackages()
        setShowModal(false)
        showMessage('success', 'Paket başarıyla kaydedildi!')
      } else {
        const data = await res.json()
        showMessage('error', data.error || ('Kaydetme hatası'))
      }
    } catch (err) {
      console.error('Save error:', err)
      showMessage('error', 'Bağlantı hatası')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu paketi silmek istediğinize emin misiniz?')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/credit-packages/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchPackages()
        showMessage('success', 'Paket silindi!')
      } else {
        const data = await res.json()
        showMessage('error', data.error || ('Silme hatası'))
      }
    } catch (err) {
      console.error('Delete error:', err)
      showMessage('error', 'Bağlantı hatası')
    }
  }

  const toggleActive = async (pkg: CreditPackage) => {
    try {
      const res = await fetch(`/api/admin/credit-packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pkg.isActive })
      })
      if (res.ok) {
        fetchPackages()
        showMessage('success', pkg.isActive 
          ? ('Paket devre dışı bırakıldı')
          : ('Paket aktif edildi'))
      }
    } catch (err) {
      console.error('Toggle error:', err)
    }
  }

  const movePackage = async (index: number, direction: 'up' | 'down') => {
    if (reordering) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= packages.length) return

    setReordering(true)
    const newPackages = [...packages]
    const temp = newPackages[index]
    newPackages[index] = newPackages[newIndex]
    newPackages[newIndex] = temp

    // Update sort orders
    try {
      await Promise.all([
        fetch(`/api/admin/credit-packages/${newPackages[index].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: index })
        }),
        fetch(`/api/admin/credit-packages/${newPackages[newIndex].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: newIndex })
        })
      ])
      fetchPackages()
    } catch (err) {
      console.error('Reorder error:', err)
      showMessage('error', 'Sıralama hatası')
    } finally {
      setReordering(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0118] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <Link
          href={`/admin`}
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {'Admin Paneli'}
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-gold-400" />
              {'CFC Paketleri'}
            </h1>
            <p className="text-purple-300 mt-2">
              {'Satışa sunulan CFC paketlerini yönetin'}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg flex items-center gap-2 hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            {'Yeni Paket'}
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 flex items-center gap-2">
            <X className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 flex items-center gap-2">
            <Check className="w-5 h-5" />
            {success}
          </div>
        )}

        {packages.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-purple-500/50 mx-auto mb-4" />
            <p className="text-purple-400">
              {'Henüz paket oluşturulmamış'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-xl border ${
                  pkg.isFeatured ? 'border-gold-400/50' : 'border-purple-500/20'
                } p-6 ${!pkg.isActive ? 'opacity-60' : ''}`}
              >
                {pkg.isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold-500 text-black text-xs font-bold rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {'ÖNE ÇIKAN'}
                  </div>
                )}

                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-white">
                    {pkg.name}
                  </h3>
                  <div className="text-3xl font-bold text-gold-400 mt-2">
                    {pkg.credits}
                    {pkg.bonusCredits > 0 && (
                      <span className="text-lg text-green-400"> +{pkg.bonusCredits}</span>
                    )}
                  </div>
                  <p className="text-purple-300 text-sm">{'CFC'}</p>
                </div>

                <div className="text-center mb-4">
                  <span className="text-2xl font-bold text-white">
                    {pkg.price.toLocaleString()} {pkg.currency}
                  </span>
                </div>

                {pkg.bonusCredits > 0 && (
                  <div className="flex items-center justify-center gap-1 mb-4 text-green-400 text-sm">
                    <Gift className="w-4 h-4" />
                    +{pkg.bonusCredits} {'bonus'}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-purple-500/20">
                  {/* Reorder buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => movePackage(index, 'up')}
                      disabled={index === 0 || reordering}
                      className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={'Yukarı taşı'}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => movePackage(index, 'down')}
                      disabled={index === packages.length - 1 || reordering}
                      className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={'Aşağı taşı'}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-purple-500 ml-1">#{index + 1}</span>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(pkg)}
                      className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg transition-colors"
                      title={'Düzenle'}
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => toggleActive(pkg)}
                      className={`p-2 rounded-lg transition-colors ${
                        pkg.isActive
                          ? 'text-green-400 hover:bg-green-500/20'
                          : 'text-gray-400 hover:bg-gray-500/20'
                      }`}
                      title={pkg.isActive ? ('Devre dışı bırak') : ('Aktif et')}
                    >
                      {pkg.isActive ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(pkg.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                      title={'Sil'}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-deep-purple-900 rounded-xl border border-purple-500/30 p-6 w-full max-w-md"
            >
              <h2 className="text-xl font-bold text-white mb-6">
                {editingPackage
                  ? ('Paketi Düzenle')
                  : ('Yeni Paket Oluştur')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-purple-300 mb-1">
                    {'Paket Adı (Türkçe)'}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-deep-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="Örn: Başlangıç Paketi"
                  />
                </div>

                <div>
                  <label className="block text-sm text-purple-300 mb-1">
                    {'Paket Adı (İngilizce)'}
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
                    className="w-full px-4 py-2 bg-deep-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Starter Pack"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-purple-300 mb-1">
                      {'CFC Miktarı'}
                    </label>
                    <input
                      type="number"
                      value={formData.credits}
                      onChange={(e) => setFormData(prev => ({ ...prev, credits: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-deep-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-purple-300 mb-1">
                      {'Bonus CFC'}
                    </label>
                    <input
                      type="number"
                      value={formData.bonusCredits}
                      onChange={(e) => setFormData(prev => ({ ...prev, bonusCredits: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-deep-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-purple-300 mb-1">
                      {'Fiyat'}
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-deep-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-purple-300 mb-1">
                      {'Para Birimi'}
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-4 py-2 bg-deep-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="TRY">TRY (₺)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                      className="w-4 h-4 accent-gold-500"
                    />
                    <span className="text-purple-300">
                      {'Öne Çıkan'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-purple-300 hover:text-white transition-colors"
                >
                  {'İptal'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name || !formData.credits || !formData.price}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {'Kaydet'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
