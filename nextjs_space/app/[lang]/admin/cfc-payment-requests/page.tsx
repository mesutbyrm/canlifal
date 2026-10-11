'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useSiteTheme } from '@/lib/theme-context'
import { ArrowLeft, Check, X, Clock, Search, Filter, RefreshCw, Loader2, AlertTriangle, Ban } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface CfcRequest {
  id: string
  amount: number
  method: string
  status: string
  senderInfo: string | null
  notes: string | null
  reviewNote: string | null
  reviewedBy: string | null
  createdAt: string
  user: { id: string; name: string; username: string | null; email: string; image: string | null }
}

export default function CfcPaymentRequestsPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const { theme } = useSiteTheme()
  const isCosmic = theme === 'cosmic'
  const isFacebook = theme === 'facebook'

  const [requests, setRequests] = useState<CfcRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [processing, setProcessing] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [actionModal, setActionModal] = useState<{ id: string; action: string } | null>(null)

  const cardBg = isFacebook ? 'bg-white border border-gray-200' : isCosmic ? 'bg-blue-950/60 border border-blue-900/30' : 'bg-purple-950/60 border border-fuchsia-900/30'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-600' : isCosmic ? 'text-blue-200' : 'text-purple-200'
  const textMuted = isFacebook ? 'text-gray-400' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'

  const role = (session?.user as any)?.role
  const allowed = ['admin', 'yonetici', 'finans'].includes(role)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/cfc-payment-requests?status=${statusFilter}&page=${page}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
      }
    } catch (e) {
      console.error('CFC requests fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    if (allowed) fetchRequests()
  }, [allowed, fetchRequests])

  const handleAction = async () => {
    if (!actionModal) return
    setProcessing(actionModal.id)
    try {
      const res = await fetch('/api/admin/cfc-payment-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: actionModal.id, action: actionModal.action, reviewNote }),
      })
      if (res.ok) {
        setActionModal(null)
        setReviewNote('')
        fetchRequests()
      } else {
        const err = await res.json()
        alert(err.error || 'İşlem başarısız')
      }
    } catch (e) {
      alert('Bağlantı hatası')
    } finally {
      setProcessing(null)
    }
  }

  if (!allowed) {
    return <div className="flex items-center justify-center min-h-screen"><p className={textPrimary}>Erişim reddedildi</p></div>
  }

  const statusLabel = (s: string) => {
    switch (s) {
      case 'pending': return { text: 'Bekliyor', color: 'bg-amber-500/20 text-amber-400', icon: Clock }
      case 'approved': return { text: 'Onaylandı', color: 'bg-green-500/20 text-green-400', icon: Check }
      case 'rejected': return { text: 'Reddedildi', color: 'bg-red-500/20 text-red-400', icon: X }
      case 'cancelled': return { text: 'İptal', color: 'bg-gray-500/20 text-gray-400', icon: Ban }
      case 'expired': return { text: 'Süresi Doldu', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle }
      default: return { text: s, color: 'bg-gray-500/20 text-gray-400', icon: Clock }
    }
  }

  const formatDate = (d: string) => {
    const dt = new Date(d)
    return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className={`p-2 rounded-lg ${cardBg} hover:opacity-80`}>
          <ArrowLeft className={`w-5 h-5 ${textPrimary}`} />
        </Link>
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>💎 CFC Ödeme Talepleri</h1>
          <p className={`text-sm ${textSecondary}`}>Toplam {total} talep</p>
        </div>
        <button onClick={() => fetchRequests()} className={`ml-auto p-2 rounded-lg ${cardBg} hover:opacity-80`}>
          <RefreshCw className={`w-4 h-4 ${textMuted} ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['pending', 'approved', 'rejected', 'cancelled', 'expired', 'all'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? (isFacebook ? 'bg-blue-500 text-white' : isCosmic ? 'bg-blue-600 text-white' : 'bg-fuchsia-600 text-white')
                : `${cardBg} ${textSecondary} hover:opacity-80`
            }`}>
            {s === 'all' ? 'Tümü' : statusLabel(s).text}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className={`w-8 h-8 animate-spin ${textMuted}`} /></div>
      ) : requests.length === 0 ? (
        <div className={`${cardBg} rounded-xl p-12 text-center`}>
          <p className={`${textSecondary} text-lg`}>Bu durumda talep bulunmuyor</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const st = statusLabel(req.status)
            const StIcon = st.icon
            return (
              <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`${cardBg} rounded-xl p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                      {req.user.image ? (
                        <Image src={req.user.image} alt={req.user.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                          {(req.user.name || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold ${textPrimary} truncate`}>{req.user.name}</p>
                      <p className={`text-xs ${textMuted} truncate`}>{req.user.username ? `@${req.user.username}` : req.user.email}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xl font-bold ${textPrimary}`}>{req.amount} <span className="text-sm">CFC</span></p>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                      <StIcon className="w-3 h-3" />{st.text}
                    </div>
                  </div>
                </div>

                <div className={`mt-3 grid grid-cols-2 gap-2 text-xs ${textSecondary}`}>
                  <div><span className={textMuted}>Yöntem:</span> {req.method || '-'}</div>
                  <div><span className={textMuted}>Tarih:</span> {formatDate(req.createdAt)}</div>
                  {req.senderInfo && <div className="col-span-2"><span className={textMuted}>Gönderici:</span> {req.senderInfo}</div>}
                  {req.notes && <div className="col-span-2"><span className={textMuted}>Not:</span> {req.notes}</div>}
                  {req.reviewNote && <div className="col-span-2"><span className={textMuted}>İnceleme Notu:</span> {req.reviewNote}</div>}
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setActionModal({ id: req.id, action: 'approve' })}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                      <Check className="w-4 h-4" /> Onayla
                    </button>
                    <button onClick={() => setActionModal({ id: req.id, action: 'reject' })}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                      <X className="w-4 h-4" /> Reddet
                    </button>
                    <button onClick={() => setActionModal({ id: req.id, action: 'cancel' })}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors">
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className={`px-4 py-2 rounded-lg ${cardBg} ${textSecondary} disabled:opacity-40`}>
            ← Önceki
          </button>
          <span className={`${textMuted} text-sm`}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className={`px-4 py-2 rounded-lg ${cardBg} ${textSecondary} disabled:opacity-40`}>
            Sonraki →
          </button>
        </div>
      )}

      {/* Action Modal */}
      <AnimatePresence>
        {actionModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className={`${cardBg} rounded-2xl p-6 max-w-md w-full`}>
              <h3 className={`text-lg font-bold ${textPrimary} mb-4`}>
                {actionModal.action === 'approve' ? '✅ Talebi Onayla' : actionModal.action === 'reject' ? '❌ Talebi Reddet' : '🚫 Talebi İptal Et'}
              </h3>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder="İnceleme notu (opsiyonel)"
                className={`w-full p-3 rounded-lg ${isFacebook ? 'bg-gray-100 text-gray-900' : 'bg-black/30 text-white'} placeholder:text-gray-500 resize-none h-24 mb-4`}
              />
              <div className="flex gap-3">
                <button onClick={() => { setActionModal(null); setReviewNote('') }}
                  className={`flex-1 px-4 py-2 rounded-lg ${cardBg} ${textSecondary} hover:opacity-80`}>
                  Vazgeç
                </button>
                <button onClick={handleAction} disabled={!!processing}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                    actionModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}>
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Onayla'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
