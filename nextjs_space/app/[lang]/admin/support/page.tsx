'use client'

import AdminBackButton from '@/components/admin-back-button'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LifeBuoy, Loader2, Send, RefreshCw, MessageSquare, X } from 'lucide-react'

interface TicketItem {
  id: string
  userId: string
  subject: string
  category: string
  status: string
  priority: string
  assignedTo: string | null
  lastMessageAt: string
  createdAt: string
  _count?: { messages: number }
}

interface MessageItem {
  id: string
  senderId: string
  senderRole: string
  body: string
  isInternal: boolean
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Açık', pending: 'Beklemede', resolved: 'Çözüldü', closed: 'Kapalı',
}
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-600', pending: 'bg-amber-600', resolved: 'bg-green-600', closed: 'bg-gray-600',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Düşük', normal: 'Normal', high: 'Yüksek', urgent: 'Acil',
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<TicketItem | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message }); setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/admin/support${qs}`)
      const data = await res.json()
      setTickets(data.data || [])
    } catch { showToast('error', 'Talepler yüklenemedi') }
    finally { setLoading(false) }
  }, [statusFilter, showToast])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const openTicket = async (t: TicketItem) => {
    setSelected(t); setDetailLoading(true); setMessages([])
    try {
      const res = await fetch(`/api/support/tickets/${t.id}`)
      const data = await res.json()
      setMessages(data.data?.messages || [])
    } catch { showToast('error', 'Talep detayı yüklenemedi') }
    finally { setDetailLoading(false) }
  }

  const sendReply = async () => {
    if (!selected || !reply.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/support/tickets/${selected.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply, isInternal }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessages(prev => [...prev, data.data])
        setReply(''); setIsInternal(false)
        showToast('success', 'Yanıt gönderildi')
      } else { showToast('error', data.error?.message || data.error || 'Gönderilemedi') }
    } catch { showToast('error', 'Gönderilemedi') }
    finally { setSending(false) }
  }

  const setStatus = async (status: string) => {
    if (!selected) return
    try {
      const res = await fetch(`/api/support/tickets/${selected.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setSelected({ ...selected, status })
        setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, status } : t))
        showToast('success', 'Durum güncellendi')
      }
    } catch { showToast('error', 'Güncellenemedi') }
  }

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

      <div className="max-w-6xl mx-auto">
        <AdminBackButton />
        <div className="flex items-center gap-3 mb-6">
          <LifeBuoy className="w-7 h-7 text-purple-400" />
          <h1 className="text-2xl font-bold">Destek Talepleri</h1>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <option value="">Tüm durumlar</option>
            <option value="open">Açık</option>
            <option value="pending">Beklemede</option>
            <option value="resolved">Çözüldü</option>
            <option value="closed">Kapalı</option>
          </select>
          <button onClick={fetchTickets} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 text-gray-500">Talep bulunamadı.</div>
        ) : (
          <div className="space-y-2">
            {tickets.map(t => (
              <button key={t.id} onClick={() => openTicket(t)}
                className="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg p-4 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] || 'bg-gray-600'}`}>{STATUS_LABELS[t.status] || t.status}</span>
                      <span className="text-xs text-gray-400">{PRIORITY_LABELS[t.priority] || t.priority} • {t.category}</span>
                    </div>
                    <p className="font-medium truncate">{t.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Kullanıcı: {t.userId} • {t._count?.messages ?? 0} mesaj</p>
                  </div>
                  <MessageSquare className="w-5 h-5 text-gray-600 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 flex justify-end" onClick={() => setSelected(null)}>
            <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} transition={{ type: 'tween' }}
              className="w-full max-w-lg bg-gray-950 border-l border-gray-800 h-full overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold">{selected.subject}</h2>
                  <p className="text-xs text-gray-500 mt-1">Kullanıcı: {selected.userId}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {['open', 'pending', 'resolved', 'closed'].map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${selected.status === s ? (STATUS_COLORS[s] || 'bg-gray-600') : 'bg-gray-800 hover:bg-gray-700 text-gray-400'}`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              {detailLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-purple-500 animate-spin" /></div>
              ) : (
                <div className="space-y-3 mb-4">
                  {messages.map(m => (
                    <div key={m.id} className={`rounded-lg p-3 text-sm ${m.isInternal ? 'bg-amber-950/40 border border-amber-800/40' : m.senderRole === 'user' ? 'bg-gray-900' : 'bg-purple-950/40 border border-purple-800/40'}`}>
                      <div className="flex items-center gap-2 mb-1 text-xs text-gray-400">
                        <span className="font-medium">{m.senderRole === 'user' ? 'Kullanıcı' : m.senderRole === 'admin' ? 'Yönetici' : 'Sistem'}</span>
                        {m.isInternal && <span className="text-amber-400">(dahili not)</span>}
                      </div>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                  ))}
                  {messages.length === 0 && <p className="text-gray-500 text-sm">Mesaj yok.</p>}
                </div>
              )}

              <div className="border-t border-gray-800 pt-3">
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} placeholder="Yanıt yazın..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm mb-2" />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                    Dahili not (kullanıcı görmez)
                  </label>
                  <button onClick={sendReply} disabled={sending || !reply.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Gönder
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
