'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Play, Pause, Square, RotateCcw, Trophy, Calendar, Loader2, Users, Shield, Edit, Trash2, BarChart3, Target, Award, Swords, ChevronDown, ChevronUp, Clock, Snowflake } from 'lucide-react'
import AdminBackButton from '@/components/admin-back-button'

interface Contest {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  scope: string
  status: string
  scoringMetrics: string
  commissionRate: number | null
  rules: string | null
  minParticipants: number
  maxParticipants: number | null
  entryRequirements: string | null
  startsAt: string | null
  endsAt: string | null
  registrationEndsAt: string | null
  rewards: string | null
  seasonId: string | null
  season: { id: string; name: string } | null
  isPublic: boolean
  isFeatured: boolean
  bannerImage: string | null
  createdAt: string
  _count: { participants: number; teams: number; scoreLogs: number }
}

interface Season {
  id: string
  name: string
  slug: string
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
}

const TYPES = [
  { key: 'individual', label: 'Bireysel' },
  { key: 'broadcaster', label: 'Yayıncı' },
  { key: 'agency', label: 'Ajans' },
  { key: 'room', label: 'Oda' },
  { key: 'team', label: 'Takım' },
  { key: 'duel', label: 'Düello' },
  { key: 'league', label: 'Lig' },
  { key: 'elimination', label: 'Eleme' },
  { key: 'top100', label: 'Top 100' },
]
const SCOPES = [
  { key: 'general', label: 'Genel' },
  { key: 'daily', label: 'Günlük' },
  { key: 'weekly', label: 'Haftalık' },
  { key: 'monthly', label: 'Aylık' },
  { key: 'seasonal', label: 'Sezonluk' },
]
const METRICS = [
  { key: 'stream_minutes', label: 'Yayın süresi' },
  { key: 'gifts_received', label: 'Hediye performansı' },
  { key: 'viewer_count', label: 'İzleyici sayısı' },
  { key: 'activity_points', label: 'Aktivite puanı' },
  { key: 'room_engagement', label: 'Oda etkileşimi' },
  { key: 'gift_sent', label: 'Hediye gönderme' },
  { key: 'chat_messages', label: 'Sohbet mesajları' },
  { key: 'followers_gained', label: 'Yeni takipçi' },
]
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-600 text-gray-200',
  scheduled: 'bg-blue-600/30 text-blue-300',
  active: 'bg-green-600/30 text-green-300',
  paused: 'bg-yellow-600/30 text-yellow-300',
  frozen: 'bg-cyan-600/30 text-cyan-300',
  completed: 'bg-purple-600/30 text-purple-300',
  cancelled: 'bg-red-600/30 text-red-300',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak', scheduled: 'Planlandı', active: 'Aktif', paused: 'Duraklatıldı',
  frozen: 'Donduruldu', completed: 'Tamamlandı', cancelled: 'İptal',
}

export default function CfcArenaAdminPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const [contests, setContests] = useState<Contest[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showSeasonForm, setShowSeasonForm] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: '', type: 'individual', scope: 'general', description: '',
    metrics: [{ metric: 'stream_minutes', weight: 100, label: 'Yayın süresi' }],
    commissionRate: '', rules: '', minParticipants: '2', maxParticipants: '',
    startsAt: '', endsAt: '', registrationEndsAt: '', seasonId: '',
    isPublic: true, isFeatured: false,
    rewards: [{ rank: 1, rewardType: 'badge', rewardValue: '', label: '' }],
  })
  const [seasonForm, setSeasonForm] = useState({ name: '', description: '', startsAt: '', endsAt: '' })

  const fetchContests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (filterStatus) params.set('status', filterStatus)
      if (filterType) params.set('type', filterType)
      const res = await fetch(`/api/admin/cfc-arena?${params}`)
      const json = await res.json()
      if (json.success) {
        setContests(json.data.contests)
        setTotal(json.data.total)
        setSeasons(json.data.seasons || [])
      }
    } catch { }
    setLoading(false)
  }, [page, filterStatus, filterType])

  useEffect(() => { fetchContests() }, [fetchContests])

  const doAction = async (action: string, extra: any = {}) => {
    const key = `${action}_${extra.contestId || ''}`
    setActionLoading(key)
    try {
      const res = await fetch('/api/admin/cfc-arena', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) })
      const json = await res.json()
      if (json.success) {
        fetchContests()
        return json
      } else {
        alert(json.error?.message || 'Hata')
      }
    } catch { alert('İşlem başarısız') }
    finally { setActionLoading(null) }
  }

  const createContest = async () => {
    setSaving(true)
    try {
      const scoringMetrics = form.metrics.filter(m => m.metric && m.weight > 0)
      const rewards = form.rewards.filter(r => r.rewardValue)
      const res = await fetch('/api/admin/cfc-arena', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create', name: form.name, type: form.type, scope: form.scope,
          description: form.description || null,
          scoringMetrics: JSON.stringify(scoringMetrics),
          commissionRate: form.commissionRate ? parseFloat(form.commissionRate) : null,
          rules: form.rules || null,
          minParticipants: parseInt(form.minParticipants) || 2,
          maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : null,
          startsAt: form.startsAt || null, endsAt: form.endsAt || null,
          registrationEndsAt: form.registrationEndsAt || null,
          seasonId: form.seasonId || null,
          isPublic: form.isPublic, isFeatured: form.isFeatured,
          rewards: rewards.length > 0 ? JSON.stringify(rewards) : null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowForm(false)
        setForm({ name: '', type: 'individual', scope: 'general', description: '', metrics: [{ metric: 'stream_minutes', weight: 100, label: 'Yayın süresi' }], commissionRate: '', rules: '', minParticipants: '2', maxParticipants: '', startsAt: '', endsAt: '', registrationEndsAt: '', seasonId: '', isPublic: true, isFeatured: false, rewards: [{ rank: 1, rewardType: 'badge', rewardValue: '', label: '' }] })
        fetchContests()
      } else { alert(json.error?.message || 'Oluşturulamadı') }
    } catch { alert('Hata') }
    setSaving(false)
  }

  const createSeason = async () => {
    setSaving(true)
    try {
      const json = await doAction('create_season', seasonForm)
      if (json?.success) {
        setShowSeasonForm(false)
        setSeasonForm({ name: '', description: '', startsAt: '', endsAt: '' })
      }
    } catch { }
    setSaving(false)
  }

  const loadDetail = async (contestId: string) => {
    if (expandedId === contestId) { setExpandedId(null); return }
    setExpandedId(contestId)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/cfc-arena/${contestId}?section=participants`)
      const json = await res.json()
      if (json.success) setDetailData(json.data)
    } catch { }
    setDetailLoading(false)
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <AdminBackButton />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400" />
            <div>
              <h1 className="text-2xl font-bold">CFC ARENA</h1>
              <p className="text-gray-400 text-sm">Yarışma & Etkinlik Yönetimi</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSeasonForm(true)} className="px-4 py-2 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Sezon Oluştur
            </button>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Yarışma Oluştur
            </button>
          </div>
        </div>

        {/* Seasons bar */}
        {seasons.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center mr-2">Sezonlar:</span>
            {seasons.map(s => (
              <span key={s.id} className={`px-3 py-1 rounded-full text-xs ${s.isActive ? 'bg-green-600/20 text-green-300 border border-green-600/30' : 'bg-gray-800 text-gray-400'}`}>
                {s.name} {s.isActive ? '(Aktif)' : ''}
              </span>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200">
            <option value="">Tüm Durumlar</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200">
            <option value="">Tüm Türler</option>
            {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <span className="text-gray-500 text-sm self-center ml-auto">Toplam: {total}</span>
        </div>

        {/* Contest list */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
        ) : contests.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Henüz yarışma yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contests.map(c => (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-800/50" onClick={() => loadDetail(c.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{c.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[c.status] || 'bg-gray-700'}`}>{STATUS_LABELS[c.status] || c.status}</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{TYPES.find(t => t.key === c.type)?.label || c.type}</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{SCOPES.find(s => s.key === c.scope)?.label || c.scope}</span>
                      {c.isFeatured && <span className="px-2 py-0.5 rounded text-xs bg-amber-600/20 text-amber-300">Öne Çıkan</span>}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      <span><Users className="w-3 h-3 inline" /> {c._count.participants}</span>
                      {c._count.teams > 0 && <span><Shield className="w-3 h-3 inline" /> {c._count.teams} takım</span>}
                      {c.season && <span><Calendar className="w-3 h-3 inline" /> {c.season.name}</span>}
                      {c.commissionRate != null && <span>Komisyon: %{c.commissionRate}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {c.status === 'draft' && <button onClick={e => { e.stopPropagation(); doAction('start', { contestId: c.id }) }} className="p-2 rounded hover:bg-green-600/20 text-green-400" title="Başlat"><Play className="w-4 h-4" /></button>}
                    {c.status === 'active' && <button onClick={e => { e.stopPropagation(); doAction('pause', { contestId: c.id }) }} className="p-2 rounded hover:bg-yellow-600/20 text-yellow-400" title="Duraklat"><Pause className="w-4 h-4" /></button>}
                    {c.status === 'active' && <button onClick={e => { e.stopPropagation(); doAction('freeze', { contestId: c.id }) }} className="p-2 rounded hover:bg-cyan-600/20 text-cyan-400" title="Dondur"><Snowflake className="w-4 h-4" /></button>}
                    {(c.status === 'paused' || c.status === 'frozen') && <button onClick={e => { e.stopPropagation(); doAction('resume', { contestId: c.id }) }} className="p-2 rounded hover:bg-green-600/20 text-green-400" title="Devam"><RotateCcw className="w-4 h-4" /></button>}
                    {['active','paused','frozen'].includes(c.status) && <button onClick={e => { e.stopPropagation(); doAction('complete', { contestId: c.id }) }} className="p-2 rounded hover:bg-purple-600/20 text-purple-400" title="Bitir"><Square className="w-4 h-4" /></button>}
                    {c.status === 'completed' && <button onClick={e => { e.stopPropagation(); doAction('publish_results', { contestId: c.id }) }} className="p-2 rounded hover:bg-amber-600/20 text-amber-400" title="Sonuçları Yayınla"><Award className="w-4 h-4" /></button>}
                    {['active','paused','frozen'].includes(c.status) && <button onClick={e => { e.stopPropagation(); doAction('recalculate', { contestId: c.id }) }} className="p-2 rounded hover:bg-blue-600/20 text-blue-400" title="Skorları Yeniden Hesapla"><BarChart3 className="w-4 h-4" /></button>}
                    <button onClick={e => { e.stopPropagation(); loadDetail(c.id) }} className="p-2 rounded hover:bg-gray-700">
                      {expandedId === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {/* Expanded detail */}
                <AnimatePresence>
                  {expandedId === c.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-800">
                      <div className="p-4 bg-gray-900/50">
                        {detailLoading ? (
                          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>
                        ) : detailData ? (
                          <div>
                            <h4 className="text-sm font-semibold text-amber-400 mb-3">Katılımcılar ({detailData.total || 0})</h4>
                            {detailData.participants?.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead><tr className="text-gray-500 border-b border-gray-800"><th className="text-left py-2 px-2">#</th><th className="text-left py-2 px-2">Katılımcı</th><th className="text-right py-2 px-2">Skor</th><th className="text-left py-2 px-2">Takım</th><th className="text-left py-2 px-2">Durum</th></tr></thead>
                                  <tbody>
                                    {detailData.participants.map((p: any) => (
                                      <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                        <td className="py-2 px-2 text-amber-400 font-mono">{p.rank || '-'}</td>
                                        <td className="py-2 px-2">{p.user?.name || p.displayName || p.userId || '-'}</td>
                                        <td className="py-2 px-2 text-right font-mono">{p.score?.toFixed(1)}</td>
                                        <td className="py-2 px-2">{p.team ? <span style={{ color: p.team.color || undefined }}>{p.team.badgeEmoji || ''} {p.team.name}</span> : '-'}</td>
                                        <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded text-xs ${p.status === 'active' ? 'bg-green-600/20 text-green-300' : p.status === 'disqualified' ? 'bg-red-600/20 text-red-300' : 'bg-gray-700 text-gray-300'}`}>{p.status}</span></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : <p className="text-gray-500 text-sm">Henüz katılımcı yok</p>}
                            {/* Scoring metrics */}
                            <div className="mt-4">
                              <h4 className="text-sm font-semibold text-gray-400 mb-2">Puanlama Metrikleri</h4>
                              <div className="flex flex-wrap gap-2">
                                {(() => { try { return JSON.parse(c.scoringMetrics).map((m: any, i: number) => (<span key={i} className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-300">{m.label || m.metric}: %{m.weight}</span>)) } catch { return <span className="text-gray-500 text-xs">-</span> } })()}
                              </div>
                            </div>
                            {/* Rewards */}
                            {c.rewards && (() => { try { const rw = JSON.parse(c.rewards); return rw.length > 0 ? (<div className="mt-3"><h4 className="text-sm font-semibold text-gray-400 mb-2">Ödüller</h4><div className="flex flex-wrap gap-2">{rw.map((r: any, i: number) => (<span key={i} className="px-2 py-1 rounded bg-amber-600/10 text-xs text-amber-300">#{r.rank}: {r.label || r.rewardValue} ({r.rewardType})</span>))}</div></div>) : null } catch { return null } })()}
                          </div>
                        ) : <p className="text-gray-500">Veri yüklenemedi</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center gap-2 mt-6">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded bg-gray-800 text-gray-300 disabled:opacity-40 text-sm">Önceki</button>
            <span className="text-sm text-gray-400 self-center">Sayfa {page}/{Math.ceil(total / 20)}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded bg-gray-800 text-gray-300 disabled:opacity-40 text-sm">Sonraki</button>
          </div>
        )}
      </div>

      {/* Create contest modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto pt-10 pb-10">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Yeni Yarışma</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-800"><span className="text-gray-400">✕</span></button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {/* Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Yarışma Adı *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="Haftalık Yayıncı Yarışması" />
                </div>

                {/* Type + Scope */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Tür *</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                      {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Kapsam</label>
                    <select value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                      {SCOPES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Açıklama</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                </div>

                {/* Scoring Metrics */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Puanlama Metrikleri *</label>
                  {form.metrics.map((m, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <select value={m.metric} onChange={e => { const mm = [...form.metrics]; mm[i] = { ...mm[i], metric: e.target.value, label: METRICS.find(x => x.key === e.target.value)?.label || e.target.value }; setForm({ ...form, metrics: mm }) }} className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm">
                        {METRICS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
                      </select>
                      <input type="number" value={m.weight} onChange={e => { const mm = [...form.metrics]; mm[i] = { ...mm[i], weight: parseInt(e.target.value) || 0 }; setForm({ ...form, metrics: mm }) }} className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-center" placeholder="%" />
                      {form.metrics.length > 1 && <button onClick={() => setForm({ ...form, metrics: form.metrics.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300 text-xs">✕</button>}
                    </div>
                  ))}
                  <button onClick={() => setForm({ ...form, metrics: [...form.metrics, { metric: 'activity_points', weight: 0, label: 'Aktivite puanı' }] })} className="text-xs text-amber-400 hover:underline">+ Metrik Ekle</button>
                </div>

                {/* Commission */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Yarışma Komisyon Oranı (%) — boş bırakılırsa değişmez</label>
                  <input type="number" value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: e.target.value })} className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="55" />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-sm text-gray-400 mb-1">Başlangıç</label><input type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Bitiş</label><input type="datetime-local" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Kayıt Bitişi</label><input type="datetime-local" value={form.registrationEndsAt} onChange={e => setForm({ ...form, registrationEndsAt: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" /></div>
                </div>

                {/* Participants */}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm text-gray-400 mb-1">Min Katılımcı</label><input type="number" value={form.minParticipants} onChange={e => setForm({ ...form, minParticipants: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Max Katılımcı</label><input type="number" value={form.maxParticipants} onChange={e => setForm({ ...form, maxParticipants: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="Sınırsız" /></div>
                </div>

                {/* Season */}
                {seasons.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Sezon</label>
                    <select value={form.seasonId} onChange={e => setForm({ ...form, seasonId: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                      <option value="">Sezon yok</option>
                      {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Rewards */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ödüller (Rozet, Unvan, Çerçeve, Efekt, Görünürlük)</label>
                  {form.rewards.map((r, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input type="number" value={r.rank} onChange={e => { const rr = [...form.rewards]; rr[i] = { ...rr[i], rank: parseInt(e.target.value) || 1 }; setForm({ ...form, rewards: rr }) }} className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-center" placeholder="#" />
                      <select value={r.rewardType} onChange={e => { const rr = [...form.rewards]; rr[i] = { ...rr[i], rewardType: e.target.value }; setForm({ ...form, rewards: rr }) }} className="w-28 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm">
                        <option value="badge">Rozet</option>
                        <option value="title">Unvan</option>
                        <option value="frame">Çerçeve</option>
                        <option value="effect">Efekt</option>
                        <option value="visibility">Görünürlük</option>
                      </select>
                      <input value={r.rewardValue} onChange={e => { const rr = [...form.rewards]; rr[i] = { ...rr[i], rewardValue: e.target.value }; setForm({ ...form, rewards: rr }) }} className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm" placeholder="Ödül değeri" />
                      <input value={r.label} onChange={e => { const rr = [...form.rewards]; rr[i] = { ...rr[i], label: e.target.value }; setForm({ ...form, rewards: rr }) }} className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm" placeholder="Etiket" />
                    </div>
                  ))}
                  <button onClick={() => setForm({ ...form, rewards: [...form.rewards, { rank: form.rewards.length + 1, rewardType: 'badge', rewardValue: '', label: '' }] })} className="text-xs text-amber-400 hover:underline">+ Ödül Ekle</button>
                </div>

                {/* Rules */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Kurallar</label>
                  <textarea value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="Yarışma kuralları..." />
                </div>

                {/* Toggles */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublic} onChange={e => setForm({ ...form, isPublic: e.target.checked })} className="rounded" /> Herkese Açık</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={e => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" /> Öne Çıkan</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm">İptal</button>
                <button onClick={createContest} disabled={saving || !form.name} className="px-6 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-sm flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Oluştur
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Season form modal */}
      <AnimatePresence>
        {showSeasonForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-400" /> Yeni Sezon</h2>
              <div className="space-y-3">
                <input value={seasonForm.name} onChange={e => setSeasonForm({ ...seasonForm, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="Sezon adı" />
                <textarea value={seasonForm.description} onChange={e => setSeasonForm({ ...seasonForm, description: e.target.value })} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="Açıklama" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="datetime-local" value={seasonForm.startsAt} onChange={e => setSeasonForm({ ...seasonForm, startsAt: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                  <input type="datetime-local" value={seasonForm.endsAt} onChange={e => setSeasonForm({ ...seasonForm, endsAt: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowSeasonForm(false)} className="px-4 py-2 rounded-lg bg-gray-800 text-sm">İptal</button>
                <button onClick={createSeason} disabled={saving || !seasonForm.name} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm">Oluştur</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
