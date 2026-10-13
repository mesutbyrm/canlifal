'use client'

import AdminBackButton from '@/components/admin-back-button'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, Loader2, Check, RefreshCw } from 'lucide-react'

interface RiskSignal {
  key: string
  weight: number
  detail: string
}

interface RiskEventItem {
  id: string
  userId: string
  category: string
  score: number
  level: string
  signals: RiskSignal[] | null
  amount: number | null
  currency: string | null
  referenceType: string | null
  referenceId: string | null
  ip: string | null
  reviewed: boolean
  reviewNote: string | null
  createdAt: string
  user: { id: string; name: string | null; username: string | null; email: string | null } | null
}

const LEVEL_LABELS: Record<string, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
}
const LEVEL_COLORS: Record<string, string> = {
  low: 'bg-slate-600',
  medium: 'bg-amber-600',
  high: 'bg-orange-600',
  critical: 'bg-red-600',
}
const CATEGORY_LABELS: Record<string, string> = {
  withdrawal: 'Para Çekme',
  payment_request: 'Yükleme Talebi',
  gift_send: 'Hediye',
  membership: 'Üyelik',
  login: 'Giriş',
}

export default function AdminRiskPage() {
  const [items, setItems] = useState<RiskEventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [reviewedFilter, setReviewedFilter] = useState('false')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [processing, setProcessing] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '50' })
      if (levelFilter) qs.set('level', levelFilter)
      if (categoryFilter) qs.set('category', categoryFilter)
      if (reviewedFilter) qs.set('reviewed', reviewedFilter)
      const res = await fetch(`/api/admin/risk-events?${qs.toString()}`)
      const data = await res.json()
      setItems(data.data || [])
      setTotal(data.meta?.total || 0)
    } catch {
      showToast('error', 'Risk olayları yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [page, levelFilter, categoryFilter, reviewedFilter, showToast])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const markReviewed = async (id: string) => {
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/risk-events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewed: true, reviewNote: notes[id] || '' }),
      })
      if (!res.ok) throw new Error()
      showToast('success', 'Olay incelendi olarak işaretlendi')
      fetchItems()
    } catch {
      showToast('error', 'İşlem başarısız')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <AdminBackButton />

        <div className="flex items-center gap-3 mb-6">
          <ShieldAlert className="w-7 h-7 text-red-400" />
          <div>
            <h1 className="text-2xl font-bold">Risk &amp; Dolandırıcılık</h1>
            <p className="text-sm text-slate-400">
              Finansal işlemlerde otomatik üretilen risk sinyalleri. Bu katman işlemleri
              engellemez, yalnızca inceleme için kayıt tutar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={levelFilter}
            onChange={(e) => {
              setPage(1)
              setLevelFilter(e.target.value)
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tüm seviyeler</option>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setPage(1)
              setCategoryFilter(e.target.value)
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tüm kategoriler</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={reviewedFilter}
            onChange={(e) => {
              setPage(1)
              setReviewedFilter(e.target.value)
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="false">İncelenmemiş</option>
            <option value="true">İncelenmiş</option>
            <option value="">Hepsi</option>
          </select>

          <button
            onClick={fetchItems}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 text-sm transition"
          >
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>

          <div className="ml-auto flex items-center text-sm text-slate-400">
            Toplam: <span className="ml-1 font-semibold text-slate-200">{total}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-slate-500">Kayıt bulunamadı.</div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg"
                >
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span
                      className={`${
                        LEVEL_COLORS[item.level] || 'bg-slate-600'
                      } text-white text-xs font-semibold px-2.5 py-1 rounded-full`}
                    >
                      {LEVEL_LABELS[item.level] || item.level} · {item.score}
                    </span>
                    <span className="text-sm text-slate-300">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    {item.amount != null && (
                      <span className="text-sm text-slate-400">
                        {item.amount} {item.currency || ''}
                      </span>
                    )}
                    <span className="text-sm text-slate-400">
                      {item.user?.name || item.user?.username || item.userId}
                    </span>
                    {item.ip && <span className="text-xs text-slate-600">IP {item.ip}</span>}
                    <span className="ml-auto text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString('tr-TR', { timeZone: 'UTC' })}
                    </span>
                  </div>

                  {Array.isArray(item.signals) && item.signals.length > 0 && (
                    <ul className="space-y-1 mb-3">
                      {item.signals.map((s, idx) => (
                        <li key={idx} className="text-sm text-slate-400">
                          <span className="text-slate-500">+{s.weight}</span>{' '}
                          <span className="text-slate-300">{s.key}</span> — {s.detail}
                        </li>
                      ))}
                    </ul>
                  )}

                  {item.reviewed ? (
                    <div className="text-sm text-green-400">
                      İncelendi{item.reviewNote ? ` — ${item.reviewNote}` : ''}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={notes[item.id] || ''}
                        onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
                        placeholder="İnceleme notu (isteğe bağlı)"
                        className="flex-1 min-w-[200px] bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => markReviewed(item.id)}
                        disabled={processing === item.id}
                        className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg px-4 py-2 text-sm transition"
                      >
                        {processing === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        İncelendi
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="flex justify-center gap-3 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg px-4 py-2 text-sm"
              >
                Önceki
              </button>
              <span className="px-3 py-2 text-sm text-slate-400">Sayfa {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 50 >= total}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg px-4 py-2 text-sm"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-xl text-sm ${
              toast.type === 'success' ? 'bg-green-700' : 'bg-red-700'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
