'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Loader2, Shield, CheckCircle, XCircle, Clock, ArrowLeft, Eye, FileText, User
} from 'lucide-react'

interface VerificationTeller {
  id: string; userId: string; displayName: string; avatar: string | null;
  username: string | null; email: string; verificationDocUrl: string | null;
  verificationStatus: string; verificationNote: string | null; isVerified: boolean;
}

export default function AdminKimlikDogrulamaPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tellers, setTellers] = useState<VerificationTeller[]>([])
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [statusFilter, setStatusFilter] = useState('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [previewDoc, setPreviewDoc] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user || !['admin','yonetici','moderator'].includes((session.user as any).role)) return
    fetchData()
  }, [session, statusFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/teller-verification?status=${statusFilter}`)
      const data = await res.json()
      setTellers(data.tellers || [])
      if (data.stats) setStats(data.stats)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleAction = async (tellerId: string, action: 'approve' | 'reject') => {
    setActionLoading(tellerId)
    try {
      await fetch('/api/admin/teller-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tellerId, action, note: noteText }),
      })
      setNoteText('')
      fetchData()
    } catch (e) { console.error(e) }
    finally { setActionLoading(null) }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="w-6 h-6 text-blue-400" /> Kimlik Doğrulama</h1>
          <p className="text-xs text-gray-400">Falcı kimlik belgesi doğrulama yönetimi</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button onClick={() => setStatusFilter('pending')} className={`p-3 rounded-xl text-center transition-all ${statusFilter === 'pending' ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/5 border border-white/10'}`}>
          <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-yellow-400">{stats.pending}</p>
          <p className="text-[10px] text-gray-400">Bekleyen</p>
        </button>
        <button onClick={() => setStatusFilter('approved')} className={`p-3 rounded-xl text-center transition-all ${statusFilter === 'approved' ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}>
          <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-green-400">{stats.approved}</p>
          <p className="text-[10px] text-gray-400">Onaylı</p>
        </button>
        <button onClick={() => setStatusFilter('rejected')} className={`p-3 rounded-xl text-center transition-all ${statusFilter === 'rejected' ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/5 border border-white/10'}`}>
          <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-red-400">{stats.rejected}</p>
          <p className="text-[10px] text-gray-400">Reddedilen</p>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
      ) : tellers.length === 0 ? (
        <p className="text-center text-gray-500 py-20">Bu kategoride falcı yok</p>
      ) : (
        <div className="space-y-3">
          {tellers.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden">
                    {t.avatar ? <Image src={t.avatar} alt="" width={40} height={40} className="object-cover w-full h-full" /> : <User className="w-5 h-5 text-gray-500 m-auto mt-2.5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t.displayName}</p>
                    <p className="text-[10px] text-gray-500">@{t.username || '—'} · {t.email}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                  t.verificationStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                  t.verificationStatus === 'approved' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                  {t.verificationStatus === 'pending' ? 'Bekliyor' : t.verificationStatus === 'approved' ? 'Onaylı' : 'Reddedildi'}
                </span>
              </div>

              {/* Belge görüntüleme */}
              {t.verificationDocUrl && (
                <div className="mb-3">
                  <button onClick={() => setPreviewDoc(t.verificationDocUrl)} className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300">
                    <FileText className="w-4 h-4" /> Belgeyi Görüntüle
                  </button>
                </div>
              )}

              {t.verificationNote && (
                <p className="text-xs text-gray-400 mb-3 bg-white/5 rounded-lg p-2">📝 {t.verificationNote}</p>
              )}

              {/* Actions */}
              {statusFilter === 'pending' && (
                <div className="flex gap-2">
                  <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Not (isteğe bağlı)" 
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-purple-400/50" />
                  <button onClick={() => handleAction(t.id, 'approve')} disabled={actionLoading === t.id}
                    className="px-4 py-2 bg-green-600/50 hover:bg-green-600/70 rounded-lg text-xs font-medium text-green-200 transition-all disabled:opacity-50">
                    {actionLoading === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 inline mr-1" />Onayla</>}
                  </button>
                  <button onClick={() => handleAction(t.id, 'reject')} disabled={actionLoading === t.id}
                    className="px-4 py-2 bg-red-600/50 hover:bg-red-600/70 rounded-lg text-xs font-medium text-red-200 transition-all disabled:opacity-50">
                    <XCircle className="w-4 h-4 inline mr-1" />Reddet
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="max-w-2xl max-h-[80vh] overflow-auto bg-gray-900 rounded-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-3">
              <h3 className="text-sm font-bold">Kimlik Belgesi</h3>
              <button onClick={() => setPreviewDoc(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="relative w-full" style={{ minHeight: 300 }}>
              <Image src={previewDoc} alt="Kimlik Belgesi" fill className="object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
