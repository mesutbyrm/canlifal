'use client'

import AdminBackButton from '@/components/admin-back-button'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BadgeCheck, Loader2, Check, X, RefreshCw, ExternalLink } from 'lucide-react'

interface VerificationItem {
  id: string
  userId: string
  type: string
  status: string
  fullName: string | null
  documentType: string | null
  documentUrls: any
  note: string | null
  reviewNote: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  identity: 'Kimlik', broadcaster: 'Yayıncı', agency: 'Ajans',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede', approved: 'Onaylandı', rejected: 'Reddedildi',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-600', approved: 'bg-green-600', rejected: 'bg-red-600',
}

export default function AdminVerificationPage() {
  const [items, setItems] = useState<VerificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message }); setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/verification?status=${statusFilter}`)
      const data = await res.json()
      setItems(data.data || [])
    } catch { showToast('error', 'Kuyruk yüklenemedi') }
    finally { setLoading(false) }
  }, [statusFilter, showToast])

  useEffect(() => { fetchItems() }, [fetchItems])

  const review = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id)
    try {
      const res = await fetch('/api/admin/verification', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, reviewNote: reviewNotes[id] || '' }),
      })
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== id))
        showToast('success', action === 'approve' ? 'Onaylandı' : 'Reddedildi')
      } else { showToast('error', 'İşlem başarısız') }
    } catch { showToast('error', 'İşlem başarısız') }
    finally { setProcessing(null) }
  }

  const urls = (d: any): string[] => Array.isArray(d) ? d : (d && typeof d === 'object' ? Object.values(d).filter(v => typeof v === 'string') as string[] : [])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">
        <AdminBackButton />
        <div className="flex items-center gap-3 mb-6">
          <BadgeCheck className="w-7 h-7 text-purple-400" />
          <h1 className="text-2xl font-bold">Doğrulama Talepleri</h1>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <option value="pending">Beklemede</option>
            <option value="approved">Onaylandı</option>
            <option value="rejected">Reddedildi</option>
            <option value="all">Tümü</option>
          </select>
          <button onClick={fetchItems} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-500">Kayıt bulunamadı.</div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-600'}`}>{STATUS_LABELS[item.status] || item.status}</span>
                  <span className="text-xs text-gray-400">{TYPE_LABELS[item.type] || item.type}</span>
                </div>
                <p className="font-medium">{item.fullName || '(isim yok)'}</p>
                <p className="text-xs text-gray-500 mt-0.5">Kullanıcı: {item.userId}{item.documentType ? ` • Belge: ${item.documentType}` : ''}</p>
                {item.note && <p className="text-sm text-gray-300 mt-2">{item.note}</p>}

                {urls(item.documentUrls).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {urls(item.documentUrls).map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-purple-300">
                        <ExternalLink className="w-3 h-3" /> Belge {i + 1}
                      </a>
                    ))}
                  </div>
                )}

                {item.status === 'pending' ? (
                  <div className="mt-3 space-y-2">
                    <input value={reviewNotes[item.id] || ''} onChange={e => setReviewNotes(p => ({ ...p, [item.id]: e.target.value }))}
                      placeholder="İnceleme notu (opsiyonel)"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => review(item.id, 'approve')} disabled={processing === item.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm">
                        {processing === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Onayla
                      </button>
                      <button onClick={() => review(item.id, 'reject')} disabled={processing === item.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm">
                        <X className="w-4 h-4" /> Reddet
                      </button>
                    </div>
                  </div>
                ) : item.reviewNote ? (
                  <p className="text-xs text-gray-400 mt-2">İnceleme notu: {item.reviewNote}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
