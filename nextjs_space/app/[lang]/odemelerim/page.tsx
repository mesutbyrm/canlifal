'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useSiteTheme } from '@/lib/theme-context'
import {
  ArrowLeft, Loader2, Receipt, AlertCircle, MessageSquareWarning,
  Check, X, Clock, RefreshCw, ChevronDown, Send, ExternalLink,
} from 'lucide-react'

interface PaymentRow {
  id: string
  status: string
  statusLabel: string
  statusColor: string
  productType: string
  productLabel: string
  paymentMethod: string
  paymentMethodLabel: string
  amount: number
  requestedSummary: string | null
  loadedSummary: string | null
  adminMessage: string | null
  adminNote: string | null
  wasCorrected: boolean
  canDispute: boolean
  isFinal: boolean
  transactionId: string | null
  senderName: string | null
  notes: string | null
  createdAt: string
  processedAt: string | null
  processedByName: string | null
  disputeTicketId: string | null
  disputeStatus: string | null
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'corrected', label: 'Düzeltilen' },
  { value: 'rejected', label: 'Reddedilen' },
]

const DISPUTE_STATUS_LABELS: Record<string, string> = {
  open: 'İtirazınız açık',
  pending: 'İtirazınız inceleniyor',
  answered: 'İtirazınız yanıtlandı',
  resolved: 'İtirazınız çözüldü',
  closed: 'İtirazınız kapatıldı',
}

export default function PaymentHistoryPage() {
  const { data: session, status: authStatus } = useSession() || {}
  const router = useRouter()
  const { theme } = useSiteTheme()

  const isCosmic = theme === 'cosmic'
  const isFacebook = theme === 'facebook'

  const pageBg = isFacebook ? 'bg-[#f0f2f5]' : ''
  const cardBg = isFacebook
    ? 'bg-white border-gray-200'
    : isCosmic
    ? 'bg-white/5 border-blue-500/20'
    : 'bg-[#1a0a2e]/80 border-fuchsia-500/20'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-600' : isCosmic ? 'text-blue-200' : 'text-purple-200'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const modalBg = isFacebook ? 'bg-white' : isCosmic ? 'bg-[#0d1f3c]' : 'bg-[#1a0a2e]'
  const inputClass = isFacebook
    ? 'bg-gray-100 border-2 border-gray-300 text-gray-900 focus:border-blue-500 placeholder-gray-400'
    : isCosmic
    ? 'bg-white/5 border-2 border-blue-500/30 text-white focus:border-blue-400 placeholder-blue-300/40'
    : 'bg-white/5 border-2 border-fuchsia-500/30 text-white focus:border-fuchsia-500 placeholder-purple-400/50'
  const btnPrimary = isFacebook
    ? 'bg-blue-500 hover:bg-blue-600 text-white'
    : isCosmic
    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
    : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white'

  const [rows, setRows] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [disputeFor, setDisputeFor] = useState<PaymentRow | null>(null)
  const [disputeText, setDisputeText] = useState('')
  const [disputeSending, setDisputeSending] = useState(false)
  const [disputeError, setDisputeError] = useState('')
  const [disputeDone, setDisputeDone] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payments/notify?limit=50&status=${filter}`)
      if (res.status === 401) {
        router.push('/giris')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setRows(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error('Ödeme geçmişi alınamadı', e)
    } finally {
      setLoading(false)
    }
  }, [filter, router])

  useEffect(() => {
    load()
  }, [load])

  const statusStyle = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-500/15 text-green-500 border-green-500/30'
      case 'red':
        return 'bg-red-500/15 text-red-500 border-red-500/30'
      case 'yellow':
        return 'bg-amber-500/15 text-amber-500 border-amber-500/30'
      case 'blue':
        return 'bg-blue-500/15 text-blue-500 border-blue-500/30'
      case 'orange':
        return 'bg-orange-500/15 text-orange-500 border-orange-500/30'
      default:
        return 'bg-gray-500/15 text-gray-400 border-gray-500/30'
    }
  }

  const statusIcon = (s: string) => {
    if (s === 'approved') return <Check className="w-3.5 h-3.5" />
    if (s === 'rejected' || s === 'cancelled') return <X className="w-3.5 h-3.5" />
    if (s === 'pending') return <Clock className="w-3.5 h-3.5" />
    if (s === 'refunded') return <RefreshCw className="w-3.5 h-3.5" />
    return <AlertCircle className="w-3.5 h-3.5" />
  }

  const openDispute = (row: PaymentRow) => {
    setDisputeFor(row)
    setDisputeText('')
    setDisputeError('')
    setDisputeDone(false)
  }

  const submitDispute = async () => {
    if (!disputeFor) return
    if (disputeText.trim().length < 10) {
      setDisputeError('Lütfen en az 10 karakterlik bir açıklama yazın')
      return
    }
    setDisputeSending(true)
    setDisputeError('')
    try {
      const res = await fetch(`/api/payments/notifications/${disputeFor.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: disputeText.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setDisputeDone(true)
        load()
        setTimeout(() => setDisputeFor(null), 2200)
      } else {
        setDisputeError(data?.error?.message || data?.error || 'İtiraz gönderilemedi')
      }
    } catch {
      setDisputeError('Bağlantı hatası')
    } finally {
      setDisputeSending(false)
    }
  }

  if (authStatus === 'loading' && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className={`w-8 h-8 animate-spin ${accentColor}`} />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${pageBg} px-4 py-6 sm:py-10`}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/jeton"
            className={`p-2 rounded-full ${isFacebook ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-300'}`}
            aria-label="Geri dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Receipt className={`w-6 h-6 ${accentColor}`} />
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Ödeme Geçmişim</h1>
              <p className={`text-xs sm:text-sm ${textSecondary}`}>
                Gönderdiğiniz ödeme bildirimleri ve sonuçları
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                filter === f.value
                  ? isFacebook
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : isCosmic
                    ? 'bg-blue-500/25 border-blue-400 text-white'
                    : 'bg-fuchsia-500/25 border-fuchsia-500 text-white'
                  : `${cardBg} ${textSecondary}`
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className={`w-7 h-7 animate-spin ${accentColor}`} />
          </div>
        ) : rows.length === 0 ? (
          <div className={`${cardBg} border rounded-2xl p-8 text-center`}>
            <Receipt className={`w-10 h-10 mx-auto mb-3 opacity-40 ${textSecondary}`} />
            <p className={`${textPrimary} font-semibold mb-1`}>Henüz ödeme bildiriminiz yok</p>
            <p className={`${textSecondary} text-sm mb-4`}>
              Ödeme yaptıktan sonra bildirim göndererek bakiyenizi yükletebilirsiniz.
            </p>
            <Link href="/jeton" className={`inline-flex items-center gap-1.5 text-sm font-semibold ${accentColor}`}>
              Jeton yükleme sayfası <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const isOpen = expanded === row.id
              return (
                <div key={row.id} className={`${cardBg} border rounded-2xl overflow-hidden`}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                    className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusStyle(row.statusColor)}`}
                        >
                          {statusIcon(row.status)} {row.statusLabel}
                        </span>
                        <span className={`text-[11px] font-medium ${textSecondary}`}>{row.productLabel}</span>
                      </div>
                      <p className={`${textPrimary} font-bold text-base`}>
                        {Number(row.amount).toLocaleString('tr-TR')} ₺
                        {row.requestedSummary && (
                          <span className={`ml-2 text-sm font-normal ${textSecondary}`}>
                            → {row.requestedSummary}
                          </span>
                        )}
                      </p>
                      <p className={`text-xs ${textSecondary}`}>
                        {row.paymentMethodLabel} ·{' '}
                        {new Date(row.createdAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          timeZone: 'Europe/Istanbul',
                        })}
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 flex-shrink-0 mt-1 transition-transform ${textSecondary} ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`px-4 pb-4 pt-1 border-t ${isFacebook ? 'border-gray-200' : 'border-white/10'}`}>
                          {row.adminMessage && (
                            <div
                              className={`mt-3 p-3 rounded-xl text-sm ${
                                isFacebook ? 'bg-gray-50 text-gray-700' : 'bg-white/5 text-gray-200'
                              }`}
                            >
                              {row.adminMessage}
                            </div>
                          )}

                          <dl className="mt-3 space-y-1.5 text-sm">
                            {row.loadedSummary && (
                              <div className="flex justify-between gap-3">
                                <dt className={textSecondary}>Yüklenen</dt>
                                <dd className={`${textPrimary} font-semibold`}>{row.loadedSummary}</dd>
                              </div>
                            )}
                            {row.wasCorrected && (
                              <div className="flex justify-between gap-3">
                                <dt className={textSecondary}>Düzeltme</dt>
                                <dd className="text-blue-500 font-semibold">Tutar düzeltilerek işlendi</dd>
                              </div>
                            )}
                            {row.transactionId && (
                              <div className="flex justify-between gap-3">
                                <dt className={textSecondary}>İşlem No</dt>
                                <dd className={`${textPrimary} break-all`}>{row.transactionId}</dd>
                              </div>
                            )}
                            {row.senderName && (
                              <div className="flex justify-between gap-3">
                                <dt className={textSecondary}>Gönderen</dt>
                                <dd className={textPrimary}>{row.senderName}</dd>
                              </div>
                            )}
                            {row.notes && (
                              <div className="flex justify-between gap-3">
                                <dt className={textSecondary}>Notunuz</dt>
                                <dd className={`${textPrimary} text-right`}>{row.notes}</dd>
                              </div>
                            )}
                            {row.processedAt && (
                              <div className="flex justify-between gap-3">
                                <dt className={textSecondary}>Sonuçlanma</dt>
                                <dd className={textPrimary}>
                                  {new Date(row.processedAt).toLocaleString('tr-TR', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                    timeZone: 'Europe/Istanbul',
                                  })}
                                </dd>
                              </div>
                            )}
                          </dl>

                          {/* İtiraz alanı (spec §84) */}
                          <div className="mt-4">
                            {row.disputeTicketId ? (
                              <div
                                className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                                  isFacebook ? 'bg-amber-50 text-amber-800' : 'bg-amber-500/10 text-amber-300'
                                }`}
                              >
                                <MessageSquareWarning className="w-4 h-4 flex-shrink-0" />
                                <span>
                                  {DISPUTE_STATUS_LABELS[row.disputeStatus || ''] || 'İtirazınız kaydedildi'}
                                </span>
                              </div>
                            ) : row.canDispute ? (
                              <button
                                onClick={() => openDispute(row)}
                                className={`w-full py-2.5 rounded-xl font-semibold text-sm border transition-all ${
                                  isFacebook
                                    ? 'border-red-300 text-red-600 hover:bg-red-50'
                                    : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                                }`}
                              >
                                Bu sonuca itiraz et
                              </button>
                            ) : row.status === 'pending' ? (
                              <p className={`text-xs ${textSecondary}`}>
                                Ödemeniz sonuçlandığında itiraz hakkınız açılır.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* İtiraz modalı */}
      <AnimatePresence>
        {disputeFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={() => !disputeSending && setDisputeFor(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${modalBg} rounded-t-3xl sm:rounded-2xl w-full max-w-md border ${
                isFacebook ? 'border-gray-300' : 'border-white/10'
              } p-5`}
            >
              {disputeDone ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-7 h-7 text-green-400" />
                  </div>
                  <h3 className={`${textPrimary} font-bold mb-1`}>İtirazınız İletildi</h3>
                  <p className={`${textSecondary} text-sm`}>
                    Destek ekibimiz en kısa sürede sizinle iletişime geçecek.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className={`${textPrimary} font-bold text-lg`}>Ödeme İtirazı</h3>
                      <p className={`${textSecondary} text-xs`}>
                        {Number(disputeFor.amount).toLocaleString('tr-TR')} ₺ ·{' '}
                        {disputeFor.productLabel} · {disputeFor.statusLabel}
                      </p>
                    </div>
                    <button
                      onClick={() => setDisputeFor(null)}
                      className={`p-1.5 rounded-full ${isFacebook ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <label className={`${textSecondary} text-sm font-medium mb-2 block`}>
                    Neden itiraz ediyorsunuz?
                  </label>
                  <textarea
                    rows={4}
                    value={disputeText}
                    onChange={(e) => {
                      setDisputeText(e.target.value)
                      setDisputeError('')
                    }}
                    placeholder="Ödemenizle ilgili durumu ayrıntılı anlatın (en az 10 karakter)..."
                    className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all resize-none ${inputClass}`}
                  />

                  {disputeError && (
                    <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-red-400 text-sm">{disputeError}</p>
                    </div>
                  )}

                  <button
                    onClick={submitDispute}
                    disabled={disputeSending}
                    className={`mt-4 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${btnPrimary}`}
                  >
                    {disputeSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {disputeSending ? 'Gönderiliyor...' : 'İtirazı Gönder'}
                  </button>
                  <p className={`mt-2 text-[11px] text-center ${textSecondary}`}>
                    İtirazınız destek talebi olarak açılır, mesajlaşmayı destek sayfasından sürdürebilirsiniz.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
