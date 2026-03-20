'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Wallet, Check, X, Loader2, Clock, User,
  ChevronDown, ChevronUp, Trophy, Award, Plus, Trash2
} from 'lucide-react'

interface WithdrawalRequest {
  id: string
  amount: number
  amountTL: number
  method: string
  accountDetails: string
  status: string
  adminNote: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    jetonBalance: number
  }
}

interface TellerAward {
  id: string
  awardType: string
  title: string
  startDate: string
  endDate: string
  teller: { id: string; displayName: string; avatar: string | null }
}

interface Teller {
  id: string
  displayName: string
  avatar: string | null
}

export default function AdminWithdrawalsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [awards, setAwards] = useState<TellerAward[]>([])
  const [tellers, setTellers] = useState<Teller[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('pending')
  const [noteMap, setNoteMap] = useState<Record<string, string>>({})

  // Award form
  const [showAwardForm, setShowAwardForm] = useState(false)
  const [awardTellerId, setAwardTellerId] = useState('')
  const [awardType, setAwardType] = useState('medium_of_day')
  const [awardTitle, setAwardTitle] = useState('')
  const [awardSaving, setAwardSaving] = useState(false)

  // Tabs
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'awards'>('withdrawals')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      router.push(`/giris`)
      return
    }
    fetchData()
  }, [session, status])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [wrRes, awRes, tlRes] = await Promise.all([
        fetch('/api/admin/withdrawals'),
        fetch('/api/admin/awards'),
        fetch('/api/admin/live-tellers')
      ])
      if (wrRes.ok) { const d = await wrRes.json(); setWithdrawals(d.requests || []) }
      if (awRes.ok) { const d = await awRes.json(); setAwards(d.awards || []) }
      if (tlRes.ok) { const d = await tlRes.json(); setTellers((d.tellers || []).map((t: any) => ({ id: t.id, displayName: t.displayName, avatar: t.avatar }))) }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleWithdrawalAction = async (requestId: string, action: 'approve' | 'reject') => {
    setActionLoading(requestId)
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, adminNote: noteMap[requestId] || '' })
      })
      if (res.ok) fetchData()
    } catch (e) { console.error(e) }
    finally { setActionLoading(null) }
  }

  const handleCreateAward = async () => {
    if (!awardTellerId || !awardTitle) return
    setAwardSaving(true)
    try {
      const res = await fetch('/api/admin/awards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tellerId: awardTellerId, awardType, title: awardTitle })
      })
      if (res.ok) {
        setAwardTellerId(''); setAwardTitle(''); setShowAwardForm(false)
        fetchData()
      }
    } catch (e) { console.error(e) }
    finally { setAwardSaving(false) }
  }

  const handleDeleteAward = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/awards?id=${id}`, { method: 'DELETE' })
      if (res.ok) fetchData()
    } catch (e) { console.error(e) }
    finally { setActionLoading(null) }
  }

  const filteredWithdrawals = withdrawals.filter(w => filter === 'all' || w.status === filter)

  const METHOD_LABELS: Record<string, string> = {
    bank_transfer: 'Banka Havalesi',
    papara: 'Papara',
    crypto: 'Kripto'
  }

  const AWARD_TYPES: Record<string, string> = {
    medium_of_day: 'Günün Medyumu',
    medium_of_week: 'Haftanın Medyumu',
    medium_of_month: 'Ayın Medyumu'
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
      <div className="max-w-5xl mx-auto">
        <Link href={`/admin`} className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6">
          <ArrowLeft className="w-5 h-5" /> {'Admin Paneli'}
        </Link>

        <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
          <Wallet className="w-7 h-7 text-purple-400" />
          {'Çekim & Ödüller Yönetimi'}
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['withdrawals', 'awards'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-purple-600 text-white' : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
              }`}>
              {tab === 'withdrawals' ? ('Çekim Talepleri') : ('Ödüller')}
              {tab === 'withdrawals' && withdrawals.filter(w => w.status === 'pending').length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-yellow-500 text-black text-[10px] rounded-full font-bold">
                  {withdrawals.filter(w => w.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* WITHDRAWALS TAB */}
        {activeTab === 'withdrawals' && (
          <div>
            <div className="flex gap-2 mb-4">
              {['pending', 'approved', 'rejected', 'all'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f ? 'bg-purple-500 text-white' : 'bg-purple-900/20 text-purple-400 hover:bg-purple-900/40'
                  }`}>
                  {f === 'pending' ? ('Bekleyen') :
                   f === 'approved' ? ('Onaylı') :
                   f === 'rejected' ? ('Reddedilen') :
                   ('Tümü')}
                </button>
              ))}
            </div>

            {filteredWithdrawals.length === 0 ? (
              <div className="text-center py-12 text-purple-400">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>{'Çekim talebi bulunamadı'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWithdrawals.map(wr => (
                  <motion.div key={wr.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center overflow-hidden">
                          {wr.user.image ? <img loading="lazy" src={wr.user.image} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-purple-400" />}
                        </div>
                        <div>
                          <p className="text-white font-medium">{wr.user.name || wr.user.email}</p>
                          <p className="text-xs text-purple-400">{wr.user.email} • Bakiye: {wr.user.jetonBalance} jeton</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        wr.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        wr.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {wr.status === 'pending' ? ('Bekliyor') :
                         wr.status === 'approved' ? ('Onaylı') :
                         ('Reddedildi')}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div><span className="text-purple-400 text-xs">Miktar:</span><p className="text-white font-bold">{wr.amount} jeton</p></div>
                      <div><span className="text-purple-400 text-xs">TL:</span><p className="text-green-400 font-bold">{wr.amountTL} TL</p></div>
                      <div><span className="text-purple-400 text-xs">Yöntem:</span><p className="text-white">{METHOD_LABELS[wr.method] || wr.method}</p></div>
                      <div><span className="text-purple-400 text-xs">Tarih:</span><p className="text-white text-xs">{new Date(wr.createdAt).toLocaleString('tr-TR')}</p></div>
                    </div>
                    <div className="mt-2">
                      <span className="text-purple-400 text-xs">Hesap:</span>
                      <p className="text-white text-sm bg-black/20 rounded-lg p-2 mt-1 break-all">{wr.accountDetails}</p>
                    </div>
                    {wr.status === 'pending' && (
                      <div className="mt-3 space-y-2">
                        <input
                          type="text"
                          placeholder={'Admin notu (isteğe bağlı)'}
                          value={noteMap[wr.id] || ''}
                          onChange={e => setNoteMap(prev => ({ ...prev, [wr.id]: e.target.value }))}
                          className="w-full px-3 py-2 bg-black/20 border border-purple-500/20 rounded-lg text-white text-sm outline-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleWithdrawalAction(wr.id, 'approve')} disabled={actionLoading === wr.id}
                            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50">
                            {actionLoading === wr.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> {'Onayla'}</>}
                          </button>
                          <button onClick={() => handleWithdrawalAction(wr.id, 'reject')} disabled={actionLoading === wr.id}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50">
                            <X className="w-4 h-4" /> {'Reddet'}
                          </button>
                        </div>
                      </div>
                    )}
                    {wr.adminNote && (
                      <p className="mt-2 text-xs text-purple-300 bg-purple-900/30 rounded-lg p-2">\ud83d\udcdd {wr.adminNote}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AWARDS TAB */}
        {activeTab === 'awards' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" /> {'Falcı Ödülleri'}
              </h2>
              <button onClick={() => setShowAwardForm(!showAwardForm)}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> {'Ödül Ver'}
              </button>
            </div>

            {showAwardForm && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-4 mb-4 space-y-3">
                <div>
                  <label className="text-xs text-yellow-400">Falcı</label>
                  <select value={awardTellerId} onChange={e => setAwardTellerId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-black/30 border border-yellow-500/20 rounded-lg text-white text-sm outline-none">
                    <option value="">{'Falcı Seçin'}</option>
                    {tellers.map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-yellow-400">Tür</label>
                  <select value={awardType} onChange={e => setAwardType(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-black/30 border border-yellow-500/20 rounded-lg text-white text-sm outline-none">
                    {Object.entries(AWARD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-yellow-400">{'Başlık'}</label>
                  <input type="text" value={awardTitle} onChange={e => setAwardTitle(e.target.value)}
                    placeholder={'Örn: Günün Medyumu'}
                    className="w-full mt-1 px-3 py-2 bg-black/30 border border-yellow-500/20 rounded-lg text-white text-sm outline-none" />
                </div>
                <button onClick={handleCreateAward} disabled={awardSaving || !awardTellerId || !awardTitle}
                  className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50">
                  {awardSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trophy className="w-4 h-4" /> {'Ödül Oluştur'}</>}
                </button>
              </motion.div>
            )}

            {awards.length === 0 ? (
              <div className="text-center py-12 text-purple-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>{'Henüz ödül yok'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {awards.map(aw => (
                  <div key={aw.id} className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{aw.teller.displayName} — <span className="text-yellow-400">{aw.title}</span></p>
                        <p className="text-xs text-purple-400">{AWARD_TYPES[aw.awardType] || aw.awardType} • {new Date(aw.startDate).toLocaleDateString('tr-TR')} - {new Date(aw.endDate).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteAward(aw.id)} disabled={actionLoading === aw.id}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50">
                      {actionLoading === aw.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
