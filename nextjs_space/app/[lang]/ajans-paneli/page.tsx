'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSiteTheme } from '@/lib/theme-context'
import {
  Building2, Users, TrendingUp, Copy, Plus, RefreshCw, UserPlus,
  DollarSign, Clock, ChevronRight, Award, Trash2, Check, X, Link as LinkIcon,
  ArrowLeft, BarChart3, AlertTriangle, Share2, Wallet, Loader2, Pencil, UserMinus,
  LogOut, MessageSquare
} from 'lucide-react'
import Link from 'next/link'

interface AgencyInfo {
  membership: {
    id: string
    role: string
    totalEarnings: number
    joinedAt: string
    agency: {
      id: string
      name: string
      description: string | null
      status: string
      commissionRate: number
      totalEarnings: number
      totalMembers: number
      activeMembers: number
      performanceScore: number
      penaltyLevel: number
      invitesDisabled: boolean
      _count: { members: number; earnings: number }
    }
  } | null
  ownedAgency: any
  isOwner: boolean
  pendingLeaveRequest: any
}

interface Member {
  id: string
  role: string
  totalEarnings: number
  joinedAt: string
  isActive: boolean
  user: { id: string; name: string; username: string | null; image: string | null; lastActiveAt: string | null }
}

interface InviteCodeItem {
  id: string
  code: string
  maxUses: number
  usedCount: number
  isActive: boolean
  expiresAt: string | null
  createdAt: string
}

interface Earning {
  id: string
  amount: number
  sourceType: string
  originalAmount: number
  commissionRate: number
  createdAt: string
}

interface DailyChartItem {
  date: string
  amount: number
}

interface SourceBreakdownItem {
  source: string
  amount: number
  count: number
}

interface MemberPerformanceItem {
  userId: string
  name: string
  username: string | null
  image: string | null
  totalEarnings: number
  transactionCount: number
}

interface WithdrawalReq {
  id: string
  userId: string
  amount: number
  amountTL: number
  method: string
  accountDetails: string | null
  status: string
  agencyNote: string | null
  adminNote: string | null
  createdAt: string
  user: { id: string; name: string | null; email: string; image: string | null; jetonBalance: number } | null
}

export default function AgencyPanelPage() {
  const { data: session } = useSession() || {}
  const { theme } = useSiteTheme()
  const [info, setInfo] = useState<AgencyInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [codes, setCodes] = useState<InviteCodeItem[]>([])
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [earningsSummary, setEarningsSummary] = useState<{ weekly: number; monthly: number }>({ weekly: 0, monthly: 0 })
  const [dailyChart, setDailyChart] = useState<DailyChartItem[]>([])
  const [sourceBreakdown, setSourceBreakdown] = useState<SourceBreakdownItem[]>([])
  const [memberPerformance, setMemberPerformance] = useState<MemberPerformanceItem[]>([])
  const [chartRange, setChartRange] = useState<'week' | 'month'>('week')
  const [withdrawals, setWithdrawals] = useState<WithdrawalReq[]>([])
  const [wdActionLoading, setWdActionLoading] = useState<string | null>(null)
  const [wdNoteMap, setWdNoteMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'invites' | 'earnings' | 'wallet' | 'live' | 'growth' | 'withdrawals'>('overview')
  const [creating, setCreating] = useState(false)
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(0)
  const [newCodeDays, setNewCodeDays] = useState(7)
  const [copied, setCopied] = useState('')
  // Rename agency
  const [editingName, setEditingName] = useState(false)
  const [newAgencyName, setNewAgencyName] = useState('')
  const [newAgencyDesc, setNewAgencyDesc] = useState('')
  const [savingName, setSavingName] = useState(false)
  // Add member
  const [addUsername, setAddUsername] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  // Leave requests
  // §19 — Canlı takip
  const [liveData, setLiveData] = useState<any>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  // §20 — Gelişim paneli
  const [growthData, setGrowthData] = useState<any>(null)
  const [growthLoading, setGrowthLoading] = useState(false)
  // §12 — Aday değerlendirme
  const [scoreUserId, setScoreUserId] = useState('')
  const [scoreData, setScoreData] = useState<any>(null)
  const [scoreLoading, setScoreLoading] = useState(false)

  // §13/§15 — Ajans cüzdanı
  const [wallet, setWallet] = useState<any>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [trTarget, setTrTarget] = useState('')
  const [trAmount, setTrAmount] = useState('')
  const [trReason, setTrReason] = useState('')
  const [trSending, setTrSending] = useState(false)

  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [leaveActionLoading, setLeaveActionLoading] = useState<string | null>(null)
  // User leave request
  const [leaveReason, setLeaveReason] = useState('')
  const [submittingLeave, setSubmittingLeave] = useState(false)
  const [showLeaveForm, setShowLeaveForm] = useState(false)

  const isFacebook = theme === 'facebook'
  const isCosmic = theme === 'cosmic'
  const cardBg = isFacebook ? 'bg-white border border-gray-200' : isCosmic ? 'bg-white/5 border border-blue-500/20' : 'bg-[#1a0a2e]/80 border border-fuchsia-500/20'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-500' : isCosmic ? 'text-blue-300' : 'text-purple-300'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const btnPrimary = isFacebook ? 'bg-blue-500 hover:bg-blue-600 text-white' : isCosmic ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'
  const inputBg = isFacebook ? 'bg-gray-100 border-gray-300 text-gray-900' : isCosmic ? 'bg-blue-900/40 border-blue-500/30 text-white' : 'bg-purple-900/40 border-fuchsia-500/30 text-white'
  const tabActive = isFacebook ? 'bg-blue-500 text-white' : isCosmic ? 'bg-blue-600 text-white' : 'bg-fuchsia-600 text-white'
  const tabInactive = isFacebook ? 'bg-gray-100 text-gray-600' : isCosmic ? 'bg-blue-900/30 text-blue-300' : 'bg-purple-900/30 text-purple-300'

  const fetchInfo = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/agency/my')
      if (res.ok) setInfo(await res.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/agency/members')
      if (res.ok) {
        const d = await res.json()
        setMembers(d.members)
        setLeaveRequests(d.leaveRequests || [])
      }
    } catch (e) { console.error(e) }
  }

  const fetchCodes = async () => {
    try {
      const res = await fetch('/api/agency/invite')
      if (res.ok) { const d = await res.json(); setCodes(d.codes) }
    } catch (e) { console.error(e) }
  }

  const fetchEarnings = async () => {
    try {
      const res = await fetch('/api/agency/earnings')
      if (res.ok) {
        const d = await res.json()
        setEarnings(d.earnings)
        setEarningsSummary(d.summary)
        setDailyChart(d.dailyChart || [])
        setSourceBreakdown(d.sourceBreakdown || [])
        setMemberPerformance(d.memberPerformance || [])
      }
    } catch (e) { console.error(e) }
  }

  const fetchLiveStatus = async () => {
    try { setLiveLoading(true); const res = await fetch('/api/agency/live-status'); const d = await res.json(); if (res.ok && d.success) setLiveData(d.data) } catch (e) { console.error(e) } finally { setLiveLoading(false) }
  }
  const fetchGrowth = async () => {
    try { setGrowthLoading(true); const res = await fetch('/api/agency/growth'); const d = await res.json(); if (res.ok && d.success) setGrowthData(d.data) } catch (e) { console.error(e) } finally { setGrowthLoading(false) }
  }
  const fetchApplicantScore = async (uid: string) => {
    if (!uid) return
    try { setScoreLoading(true); setScoreData(null); const res = await fetch('/api/agency/applicant-score/' + uid); const d = await res.json(); if (res.ok && d.success) setScoreData(d.data); else alert(d?.error?.message || 'Skor alınamadı') } catch { alert('Hata oluştu') } finally { setScoreLoading(false) }
  }

  const fetchWallet = async () => {
    try {
      setWalletLoading(true)
      const res = await fetch('/api/agency/wallet')
      const d = await res.json()
      if (res.ok && d.success) setWallet(d.data)
    } catch (e) { console.error(e) } finally { setWalletLoading(false) }
  }

  const handleTransfer = async (confirmed = false) => {
    const amt = Math.floor(Number(trAmount || 0))
    if (!trTarget || !amt || amt <= 0) { alert('Üye ve geçerli bir miktar seçin'); return }
    setTrSending(true)
    try {
      const res = await fetch('/api/agency/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: trTarget, amount: amt, reason: trReason, confirm: confirmed }),
      })
      const d = await res.json()
      if (res.status === 409 && d?.requiresConfirmation) {
        if (confirm(d.confirmationMessage || 'Bu işlemi onaylıyor musunuz?')) {
          setTrSending(false)
          return handleTransfer(true)
        }
        return
      }
      if (res.ok && d.success) {
        alert(d.message || 'Jeton gönderildi')
        setTrAmount(''); setTrReason('')
        fetchWallet()
      } else {
        alert(d?.error?.message || 'İşlem başarısız')
      }
    } catch { alert('Hata oluştu') } finally { setTrSending(false) }
  }

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch('/api/agency/withdrawals')
      if (res.ok) { const d = await res.json(); setWithdrawals(d.requests || []) }
    } catch (e) { console.error(e) }
  }

  const handleWithdrawalAction = async (requestId: string, action: 'approve' | 'reject') => {
    setWdActionLoading(requestId)
    try {
      const res = await fetch('/api/agency/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, note: wdNoteMap[requestId] || '' }),
      })
      if (res.ok) {
        fetchWithdrawals()
      } else {
        const d = await res.json()
        alert(d.error || 'İşlem başarısız')
      }
    } catch { alert('Hata oluştu') } finally { setWdActionLoading(null) }
  }

  useEffect(() => { fetchInfo() }, [])
  useEffect(() => {
    if (info?.isOwner || info?.membership?.role === 'manager' || info?.membership?.role === 'owner') {
      fetchMembers()
      fetchCodes()
      fetchEarnings()
      fetchWithdrawals()
      fetchWallet()
      fetchLiveStatus()
      fetchGrowth()
    }
  }, [info])

  const createInviteCode = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/agency/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUses: newCodeMaxUses, expiresInDays: newCodeDays })
      })
      if (res.ok) {
        fetchCodes()
        alert('Davet kodu oluşturuldu!')
      } else {
        const d = await res.json()
        alert(d.error || 'Hata oluştu')
      }
    } catch (e) { alert('Hata oluştu') } finally { setCreating(false) }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(''), 2000)
  }

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/ajans?kod=${code}`
    navigator.clipboard.writeText(url)
    setCopied(`link-${code}`)
    setTimeout(() => setCopied(''), 2000)
  }

  // Rename agency
  const handleRenameAgency = async () => {
    setSavingName(true)
    try {
      const res = await fetch('/api/agency/my', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAgencyName, description: newAgencyDesc }),
      })
      const d = await res.json()
      if (res.ok) {
        setEditingName(false)
        fetchInfo()
      } else {
        alert(d.error || 'Hata oluştu')
      }
    } catch { alert('Hata oluştu') } finally { setSavingName(false) }
  }

  // Add member
  const handleAddMember = async () => {
    if (!addUsername.trim()) return
    setAddingMember(true)
    try {
      const res = await fetch('/api/agency/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: addUsername.trim() }),
      })
      const d = await res.json()
      if (res.ok) {
        setAddUsername('')
        fetchMembers()
        fetchInfo()
        alert(d.message || 'Üye eklendi')
      } else {
        alert(d.error || 'Hata oluştu')
      }
    } catch { alert('Hata oluştu') } finally { setAddingMember(false) }
  }

  // Remove member
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Bu üyeyi ajansdan çıkarmak istediğinize emin misiniz?')) return
    setRemovingMember(memberId)
    try {
      const res = await fetch(`/api/agency/members?memberId=${memberId}`, { method: 'DELETE' })
      const d = await res.json()
      if (res.ok) {
        fetchMembers()
        fetchInfo()
      } else {
        alert(d.error || 'Hata oluştu')
      }
    } catch { alert('Hata oluştu') } finally { setRemovingMember(null) }
  }

  // Handle leave request (approve/reject)
  const handleLeaveAction = async (requestId: string, action: 'approve' | 'reject') => {
    setLeaveActionLoading(requestId)
    try {
      const res = await fetch('/api/agency/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requestId }),
      })
      const d = await res.json()
      if (res.ok) {
        fetchMembers()
        fetchInfo()
      } else {
        alert(d.error || 'Hata oluştu')
      }
    } catch { alert('Hata oluştu') } finally { setLeaveActionLoading(null) }
  }

  // Submit leave request (member)
  const handleSubmitLeave = async () => {
    setSubmittingLeave(true)
    try {
      const res = await fetch('/api/agency/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: leaveReason }),
      })
      const d = await res.json()
      if (res.ok) {
        setShowLeaveForm(false)
        setLeaveReason('')
        fetchInfo()
        alert(d.message || 'Talep gönderildi')
      } else {
        alert(d.error || 'Hata oluştu')
      }
    } catch { alert('Hata oluştu') } finally { setSubmittingLeave(false) }
  }

  // Cancel leave request
  const handleCancelLeave = async () => {
    try {
      const res = await fetch('/api/agency/leave', { method: 'DELETE' })
      if (res.ok) {
        fetchInfo()
        alert('Çıkış talebi iptal edildi')
      }
    } catch { alert('Hata oluştu') }
  }

  const agency = info?.membership?.agency || info?.ownedAgency
  const isManager = info?.membership?.role === 'owner' || info?.membership?.role === 'manager'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className={`w-8 h-8 ${accentColor} animate-spin`} />
      </div>
    )
  }

  if (!agency) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className={`${cardBg} rounded-2xl p-8 text-center max-w-md`}>
          <Building2 className={`w-16 h-16 ${textSecondary} mx-auto mb-4`} />
          <h2 className={`text-xl font-bold ${textPrimary} mb-2`}>Ajansınız Yok</h2>
          <p className={`${textSecondary} mb-6`}>Henüz bir ajansa üye değilsiniz veya ajans başvurunuz bekleniyor.</p>
          <Link href="/ajans" className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl ${btnPrimary} font-medium`}>
            <UserPlus className="w-5 h-5" />
            Ajans Bul veya Ajans Ol
          </Link>
        </div>
      </div>
    )
  }

  const SOURCE_LABELS: Record<string, string> = {
    chat_gift: 'Sohbet Hediyesi',
    stream_gift: 'Yayın Hediyesi',
    direct_gift: 'Direkt Hediye',
    tip: 'Bahşiş',
    bonus: 'Bonus',
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className={`p-2 rounded-lg ${cardBg} hover:opacity-80 transition`}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          {editingName ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newAgencyName}
                onChange={e => setNewAgencyName(e.target.value)}
                placeholder="Ajans Adı"
                className={`w-full px-3 py-2 rounded-lg border text-sm font-bold ${inputBg}`}
              />
              <input
                type="text"
                value={newAgencyDesc}
                onChange={e => setNewAgencyDesc(e.target.value)}
                placeholder="Açıklama (opsiyonel)"
                className={`w-full px-3 py-1.5 rounded-lg border text-xs ${inputBg}`}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRenameAgency}
                  disabled={savingName || newAgencyName.trim().length < 2}
                  className={`px-3 py-1.5 rounded-lg ${btnPrimary} text-xs font-medium flex items-center gap-1 disabled:opacity-50`}
                >
                  {savingName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Kaydet
                </button>
                <button onClick={() => setEditingName(false)} className={`px-3 py-1.5 rounded-lg ${tabInactive} text-xs`}>
                  İptal
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
                <Building2 className={`w-6 h-6 ${accentColor}`} />
                {agency.name}
                {info?.isOwner && (
                  <button
                    onClick={() => { setNewAgencyName(agency.name); setNewAgencyDesc(agency.description || ''); setEditingName(true) }}
                    className={`p-1 rounded-lg hover:opacity-80 transition ${tabInactive}`}
                    title="Ajans ismini düzenle"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </h1>
              <p className={`${textSecondary} text-xs`}>
                {agency.status === 'approved' ? 'Aktif Ajans' : agency.status === 'pending' ? 'Onay Bekliyor' : agency.status}
                {agency.penaltyLevel > 0 && ` • Ceza Seviyesi: ${agency.penaltyLevel}`}
              </p>
            </>
          )}
        </div>
      </div>

      {/* User Leave Request Section (non-owner members) */}
      {info?.membership && !info?.isOwner && info?.membership?.role !== 'owner' && (
        <div className={`${cardBg} rounded-xl p-4 mb-6`}>
          {info.pendingLeaveRequest ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-400">
                <Clock className="w-5 h-5" />
                <span className="font-medium text-sm">Çıkış talebiniz beklemede</span>
              </div>
              <p className={`text-xs ${textSecondary}`}>
                Ajans yönetimi talebinizi onayladığında otomatik olarak ayrılacaksınız.
              </p>
              <button
                onClick={handleCancelLeave}
                className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 text-xs font-medium hover:bg-red-600/30 transition"
              >
                Talebi İptal Et
              </button>
            </div>
          ) : showLeaveForm ? (
            <div className="space-y-3">
              <h3 className={`font-medium ${textPrimary} text-sm flex items-center gap-2`}>
                <LogOut className="w-4 h-4 text-red-400" />
                Ajanstan Çıkış Talebi
              </h3>
              <textarea
                value={leaveReason}
                onChange={e => setLeaveReason(e.target.value)}
                placeholder="Ayrılma nedeniniz (opsiyonel)..."
                rows={2}
                className={`w-full px-3 py-2 rounded-lg border text-xs ${inputBg}`}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitLeave}
                  disabled={submittingLeave}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingLeave ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  Talep Gönder
                </button>
                <button onClick={() => setShowLeaveForm(false)} className={`px-3 py-2 rounded-lg ${tabInactive} text-xs`}>
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowLeaveForm(true)}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium transition"
            >
              <LogOut className="w-4 h-4" />
              Ajanstan Ayrılmak İstiyorum
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Üyeler', value: agency.totalMembers || agency._count?.members || 0, icon: Users, color: 'text-blue-400' },
          { label: 'Toplam Kazanç', value: `${Math.floor(agency.totalEarnings || 0)} J`, icon: TrendingUp, color: 'text-green-400' },
          { label: 'Komisyon', value: `%${agency.commissionRate}`, icon: DollarSign, color: 'text-fuchsia-400' },
          { label: 'Haftalık', value: `${Math.floor(earningsSummary.weekly)} J`, icon: BarChart3, color: 'text-yellow-400' },
        ].map((stat, i) => (
          <div key={i} className={`${cardBg} rounded-xl p-3 text-center`}>
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
            <div className={`text-lg font-bold ${textPrimary}`}>{stat.value}</div>
            <div className={`text-[10px] ${textSecondary}`}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      {isManager && (
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {(['overview', 'members', 'invites', 'earnings', 'wallet', 'live', 'growth', 'withdrawals'] as const).map(tab => {
            const labels: Record<string, string> = { overview: 'Genel', members: 'Üyeler', invites: 'Davet Kodları', earnings: 'Kazançlar', wallet: 'Cüzdan', live: 'Canlı Takip', growth: 'Gelişim', withdrawals: 'Çekim Talepleri' }
            const pendingWd = withdrawals.filter(w => w.status === 'pending').length
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition relative ${
                  activeTab === tab ? tabActive : tabInactive
                }`}
              >
                {labels[tab]}
                {tab === 'withdrawals' && pendingWd > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">{pendingWd}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Overview */}
      {activeTab === 'overview' && (() => {
        const SOURCE_COLORS: Record<string, string> = {
          chat_gift: 'bg-blue-500',
          stream_gift: 'bg-fuchsia-500',
          direct_gift: 'bg-green-500',
          tip: 'bg-yellow-500',
          bonus: 'bg-purple-500',
        }
        const SOURCE_LABELS_MAP: Record<string, string> = {
          chat_gift: 'Sohbet Hediyesi',
          stream_gift: 'Yayın Hediyesi',
          direct_gift: 'Direkt Hediye',
          tip: 'Bahşiş',
          bonus: 'Bonus',
        }
        const chartData = chartRange === 'week' ? dailyChart.slice(-7) : dailyChart
        const maxChartVal = Math.max(...chartData.map(d => d.amount), 1)
        const totalSourceAmount = sourceBreakdown.reduce((s, b) => s + b.amount, 0)

        return (
        <div className="space-y-4">
          {agency.penaltyLevel > 0 && (
            <div className={`${cardBg} rounded-xl p-4 border-orange-500/40`}>
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-bold">Ceza Durumu: Seviye {agency.penaltyLevel}</span>
              </div>
              <p className={`text-xs ${textSecondary}`}>
                {agency.penaltyLevel === 1 && 'Uyarı aldınız. Lütfen kurallara uyun.'}
                {agency.penaltyLevel === 2 && 'Davet sisteminiz devre dışı bırakıldı.'}
                {agency.penaltyLevel === 3 && 'Komisyon oranınız yarıya düşürüldü.'}
                {agency.penaltyLevel >= 4 && 'Ajansınız askıya alındı.'}
              </p>
            </div>
          )}

          {/* Agency Info */}
          <div className={`${cardBg} rounded-xl p-4`}>
            <h3 className={`font-bold ${textPrimary} mb-2`}>Ajans Bilgileri</h3>
            <div className={`text-sm ${textSecondary} space-y-1`}>
              {agency.description && <p>{agency.description}</p>}
              <p>Komisyon Oranı: <span className={accentColor}>%{agency.commissionRate}</span></p>
              <p>Üye Sayısı: <span className={textPrimary}>{agency.totalMembers || agency._count?.members || 0}</span></p>
              <p>Toplam Kazanç: <span className={textPrimary}>{Math.floor(agency.totalEarnings || 0)} Jeton</span></p>
            </div>
          </div>

          {/* Earnings Chart */}
          <div className={`${cardBg} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-bold ${textPrimary} flex items-center gap-2`}>
                <BarChart3 className={`w-5 h-5 ${accentColor}`} />
                Kazanç Grafiği
              </h3>
              <div className="flex gap-1">
                {(['week', 'month'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setChartRange(r)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-medium transition ${
                      chartRange === r ? tabActive : tabInactive
                    }`}
                  >
                    {r === 'week' ? '7 Gün' : '30 Gün'}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="space-y-1">
                {/* Y axis values */}
                <div className="flex justify-between text-[9px] mb-1" style={{ color: 'inherit' }}>
                  <span className={textSecondary}>0</span>
                  <span className={textSecondary}>{Math.floor(maxChartVal / 2)} J</span>
                  <span className={textSecondary}>{maxChartVal} J</span>
                </div>
                {/* Bars */}
                <div className="flex items-end gap-[2px]" style={{ height: '120px' }}>
                  {chartData.map((d, i) => {
                    const h = maxChartVal > 0 ? (d.amount / maxChartVal) * 100 : 0
                    const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                          <div className={`${cardBg} px-2 py-1 rounded text-[9px] font-bold ${textPrimary} whitespace-nowrap shadow-lg`}>
                            {d.amount} J
                          </div>
                        </div>
                        <div
                          className={`w-full rounded-t transition-all duration-300 ${
                            isFacebook ? 'bg-blue-500' : isCosmic ? 'bg-blue-500' : 'bg-fuchsia-500'
                          } ${d.amount > 0 ? 'min-h-[2px]' : ''} opacity-80 hover:opacity-100`}
                          style={{ height: `${Math.max(h, d.amount > 0 ? 2 : 0)}%` }}
                        />
                        {chartRange === 'week' && (
                          <span className={`text-[8px] ${textSecondary} mt-1 truncate w-full text-center`}>{dayLabel}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                {chartRange === 'month' && (
                  <div className="flex justify-between text-[8px] mt-1">
                    <span className={textSecondary}>{chartData[0] ? new Date(chartData[0].date + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) : ''}</span>
                    <span className={textSecondary}>{chartData[chartData.length - 1] ? new Date(chartData[chartData.length - 1].date + 'T12:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) : ''}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={`text-center py-6 ${textSecondary} text-sm`}>Henüz kazanç verisi yok</div>
            )}
          </div>

          {/* Source Breakdown & Member Performance Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source Breakdown */}
            <div className={`${cardBg} rounded-xl p-4`}>
              <h3 className={`font-bold ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
                <DollarSign className={`w-4 h-4 ${accentColor}`} />
                Kaynak Dağılımı (30 Gün)
              </h3>
              {sourceBreakdown.length > 0 ? (
                <div className="space-y-2">
                  {sourceBreakdown.sort((a, b) => b.amount - a.amount).map((s, i) => {
                    const pct = totalSourceAmount > 0 ? (s.amount / totalSourceAmount) * 100 : 0
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={textPrimary}>{SOURCE_LABELS_MAP[s.source] || s.source}</span>
                          <span className={accentColor}>{s.amount} J ({Math.round(pct)}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${SOURCE_COLORS[s.source] || 'bg-gray-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className={`text-xs ${textSecondary} text-center py-4`}>Veri yok</p>
              )}
            </div>

            {/* Top Performers */}
            <div className={`${cardBg} rounded-xl p-4`}>
              <h3 className={`font-bold ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
                <Award className={`w-4 h-4 ${accentColor}`} />
                En İyi Üyeler (30 Gün)
              </h3>
              {memberPerformance.length > 0 ? (
                <div className="space-y-2">
                  {memberPerformance.map((mp, i) => (
                    <div key={mp.userId} className="flex items-center gap-2">
                      <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full ${
                        i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-300 text-black' : i === 2 ? 'bg-orange-600 text-white' : `${tabInactive}`
                      }`}>
                        {i + 1}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                        {mp.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium ${textPrimary} truncate`}>{mp.name}</div>
                        <div className={`text-[9px] ${textSecondary}`}>{mp.transactionCount} işlem</div>
                      </div>
                      <div className={`text-xs font-bold ${accentColor}`}>{mp.totalEarnings} J</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-xs ${textSecondary} text-center py-4`}>Veri yok</p>
              )}
            </div>
          </div>
        </div>
        )
      })()}

      {/* Members */}
      {activeTab === 'members' && isManager && (
        <div className="space-y-4">
          {/* Add Member Form */}
          <div className={`${cardBg} rounded-xl p-4`}>
            <h3 className={`font-medium ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
              <UserPlus className={`w-4 h-4 ${accentColor}`} />
              Üye Ekle
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={addUsername}
                onChange={e => setAddUsername(e.target.value)}
                placeholder="Kullanıcı adı girin..."
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${inputBg}`}
                onKeyDown={e => e.key === 'Enter' && handleAddMember()}
              />
              <button
                onClick={handleAddMember}
                disabled={addingMember || !addUsername.trim()}
                className={`px-4 py-2 rounded-lg ${btnPrimary} text-sm font-medium flex items-center gap-1.5 disabled:opacity-50`}
              >
                {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Ekle
              </button>
            </div>
          </div>

          {/* Leave Requests */}
          {leaveRequests.length > 0 && (
            <div className={`${cardBg} rounded-xl p-4`}>
              <h3 className={`font-medium ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
                <LogOut className="w-4 h-4 text-orange-400" />
                Çıkış Talepleri
                <span className="ml-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold">{leaveRequests.length}</span>
              </h3>
              <div className="space-y-2">
                {leaveRequests.map((lr: any) => (
                  <div key={lr.id} className={`p-3 rounded-xl bg-black/20 space-y-2`}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-xs">
                        {lr.user?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${textPrimary} truncate`}>{lr.user?.name}</div>
                        <div className={`text-[10px] ${textSecondary}`}>
                          @{lr.user?.username} • {new Date(lr.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                    </div>
                    {lr.reason && (
                      <p className={`text-xs ${textSecondary} flex items-start gap-1`}>
                        <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {lr.reason}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLeaveAction(lr.id, 'approve')}
                        disabled={leaveActionLoading === lr.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium disabled:opacity-50"
                      >
                        {leaveActionLoading === lr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Onayla
                      </button>
                      <button
                        onClick={() => handleLeaveAction(lr.id, 'reject')}
                        disabled={leaveActionLoading === lr.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium disabled:opacity-50"
                      >
                        {leaveActionLoading === lr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member List */}
          {members.length === 0 ? (
            <div className={`${cardBg} rounded-xl p-8 text-center`}>
              <Users className={`w-10 h-10 ${textSecondary} mx-auto mb-2`} />
              <p className={textSecondary}>Henüz üye yok</p>
            </div>
          ) : members.map(m => (
            <div key={m.id} className={`${cardBg} rounded-xl p-3 flex items-center gap-3`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {m.user.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${textPrimary} text-sm truncate`}>{m.user.name}</div>
                <div className={`text-[10px] ${textSecondary}`}>
                  {m.role === 'owner' ? 'Sahip' : m.role === 'manager' ? 'Yönetici' : 'Üye'}
                  {m.user.username && ` • @${m.user.username}`}
                  {' • '}
                  {new Date(m.joinedAt).toLocaleDateString('tr-TR')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className={`text-sm font-bold ${accentColor}`}>{Math.floor(m.totalEarnings)} J</div>
                  <div className={`text-[10px] ${m.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {m.isActive ? 'Aktif' : 'Pasif'}
                  </div>
                </div>
                {/* Remove button (not for owner) */}
                {m.role !== 'owner' && m.user.id !== agency?.ownerId && (
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    disabled={removingMember === m.id}
                    className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition disabled:opacity-50"
                    title="Üyeyi çıkar"
                  >
                    {removingMember === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Codes */}
      {activeTab === 'invites' && isManager && (
        <div className="space-y-4">
          {/* Create new code */}
          {!agency.invitesDisabled && (
            <div className={`${cardBg} rounded-xl p-4`}>
              <h3 className={`font-medium ${textPrimary} text-sm mb-3`}>Yeni Davet Kodu Oluştur</h3>
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-[120px]">
                  <label className={`text-[10px] ${textSecondary} block mb-1`}>Maks. Kullanım (0=sınırsız)</label>
                  <input
                    type="number" min={0} value={newCodeMaxUses}
                    onChange={e => setNewCodeMaxUses(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`}
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className={`text-[10px] ${textSecondary} block mb-1`}>Geçerlilik (gün)</label>
                  <input
                    type="number" min={1} value={newCodeDays}
                    onChange={e => setNewCodeDays(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`}
                  />
                </div>
                <button
                  onClick={createInviteCode}
                  disabled={creating}
                  className={`px-4 py-2 rounded-lg ${btnPrimary} text-sm font-medium flex items-center gap-1.5 disabled:opacity-50`}
                >
                  <Plus className="w-4 h-4" />
                  {creating ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </div>
          )}

          {agency.invitesDisabled && (
            <div className={`${cardBg} rounded-xl p-4 border-orange-500/40`}>
              <div className="flex items-center gap-2 text-orange-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium text-sm">Davet sistemi ceza nedeniyle devre dışı</span>
              </div>
            </div>
          )}

          {/* Code list */}
          <div className="space-y-2">
            {codes.map(c => (
              <div key={c.id} className={`${cardBg} rounded-xl p-3 flex items-center gap-3`}>
                <div className="flex-1 min-w-0">
                  <div className={`font-mono font-bold ${textPrimary} text-sm`}>{c.code}</div>
                  <div className={`text-[10px] ${textSecondary}`}>
                    {c.usedCount}/{c.maxUses === 0 ? '∞' : c.maxUses} kullanım
                    {c.expiresAt && ` • ${new Date(c.expiresAt).toLocaleDateString('tr-TR')}'e kadar`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => copyCode(c.code)}
                    className={`p-2 rounded-lg ${cardBg} hover:opacity-80 transition`}
                    title="Kodu kopyala"
                  >
                    {copied === c.code ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyLink(c.code)}
                    className={`p-2 rounded-lg ${cardBg} hover:opacity-80 transition`}
                    title="Davet linkini kopyala"
                  >
                    {copied === `link-${c.code}` ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earnings */}
      {activeTab === 'earnings' && isManager && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className={`${cardBg} rounded-xl p-3 text-center`}>
              <div className={`text-lg font-bold ${accentColor}`}>{Math.floor(earningsSummary.weekly)} J</div>
              <div className={`text-[10px] ${textSecondary}`}>Bu Hafta</div>
            </div>
            <div className={`${cardBg} rounded-xl p-3 text-center`}>
              <div className={`text-lg font-bold ${accentColor}`}>{Math.floor(earningsSummary.monthly)} J</div>
              <div className={`text-[10px] ${textSecondary}`}>Bu Ay</div>
            </div>
          </div>
          <div className="space-y-2">
            {earnings.length === 0 ? (
              <div className={`${cardBg} rounded-xl p-8 text-center`}>
                <DollarSign className={`w-10 h-10 ${textSecondary} mx-auto mb-2`} />
                <p className={textSecondary}>Henüz kazanç yok</p>
              </div>
            ) : earnings.map(e => (
              <div key={e.id} className={`${cardBg} rounded-xl p-3 flex items-center justify-between`}>
                <div>
                  <div className={`text-sm ${textPrimary}`}>{SOURCE_LABELS[e.sourceType] || e.sourceType}</div>
                  <div className={`text-[10px] ${textSecondary}`}>
                    Orijinal: {Math.floor(e.originalAmount)} J • %{e.commissionRate} • {new Date(e.createdAt).toLocaleDateString('tr-TR')}
                  </div>
                </div>
                <div className={`font-bold ${accentColor}`}>+{Math.floor(e.amount)} J</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdrawal Requests */}
      {activeTab === 'withdrawals' && isManager && (
        <div className="space-y-4">
          <div className={`${cardBg} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className={`w-5 h-5 ${accentColor}`} />
              <h3 className={`font-bold ${textPrimary}`}>Çekim Talepleri</h3>
            </div>
            <p className={`text-xs ${textSecondary}`}>
              Üyelerinizin çekim taleplerini onaylayın veya reddedin. Onayladıktan sonra admin onayına gider.
            </p>
          </div>

          {withdrawals.length === 0 ? (
            <div className={`${cardBg} rounded-xl p-8 text-center`}>
              <Wallet className={`w-10 h-10 ${textSecondary} mx-auto mb-2`} />
              <p className={textSecondary}>Henüz çekim talebi yok</p>
            </div>
          ) : withdrawals.map(wd => {
            const STATUS_LABELS: Record<string, { label: string; color: string }> = {
              pending: { label: 'Ajans Onayı Bekliyor', color: 'text-yellow-400' },
              agency_approved: { label: 'Admin Onayı Bekliyor', color: 'text-blue-400' },
              approved: { label: 'Onaylandı', color: 'text-green-400' },
              rejected: { label: 'Reddedildi', color: 'text-red-400' },
              completed: { label: 'Tamamlandı', color: 'text-green-400' },
            }
            const st = STATUS_LABELS[wd.status] || { label: wd.status, color: textSecondary }
            let parsedAccount: any = null
            try { parsedAccount = wd.accountDetails ? JSON.parse(wd.accountDetails) : null } catch {}

            return (
              <div key={wd.id} className={`${cardBg} rounded-xl p-4 space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                      {wd.user?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${textPrimary}`}>{wd.user?.name || 'Bilinmeyen'}</div>
                      <div className={`text-[10px] ${textSecondary}`}>{new Date(wd.createdAt).toLocaleDateString('tr-TR')}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${st.color}`}>{st.label}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className={`text-lg font-bold ${textPrimary}`}>{wd.amount}</div>
                    <div className={`text-[10px] ${textSecondary}`}>Jeton</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${textPrimary}`}>{wd.amountTL.toFixed(2)}</div>
                    <div className={`text-[10px] ${textSecondary}`}>TL</div>
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${textPrimary} capitalize`}>{wd.method === 'bank_transfer' ? 'Banka' : wd.method}</div>
                    <div className={`text-[10px] ${textSecondary}`}>Yöntem</div>
                  </div>
                </div>

                {parsedAccount && (
                  <div className={`text-xs ${textSecondary} p-2 rounded-lg bg-black/20`}>
                    {parsedAccount.iban && <p>IBAN: {parsedAccount.iban}</p>}
                    {parsedAccount.name && <p>Ad: {parsedAccount.name}</p>}
                    {parsedAccount.papara && <p>Papara: {parsedAccount.papara}</p>}
                  </div>
                )}

                {wd.status === 'pending' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Not (opsiyonel)"
                      value={wdNoteMap[wd.id] || ''}
                      onChange={e => setWdNoteMap(prev => ({ ...prev, [wd.id]: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border text-xs ${inputBg}`}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleWithdrawalAction(wd.id, 'approve')}
                        disabled={wdActionLoading === wd.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium disabled:opacity-50"
                      >
                        {wdActionLoading === wd.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Onayla
                      </button>
                      <button
                        onClick={() => handleWithdrawalAction(wd.id, 'reject')}
                        disabled={wdActionLoading === wd.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium disabled:opacity-50"
                      >
                        {wdActionLoading === wd.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        Reddet
                      </button>
                    </div>
                  </div>
                )}

                {wd.agencyNote && (
                  <div className={`text-xs ${textSecondary}`}>📝 Ajans notu: {wd.agencyNote}</div>
                )}
                {wd.adminNote && (
                  <div className={`text-xs ${textSecondary}`}>🔑 Admin notu: {wd.adminNote}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* §13/§15 — Ajans Cüzdanı */}
      {activeTab === 'wallet' && isManager && (
        <div className="space-y-4">
          {walletLoading && !wallet ? (
            <div className="flex justify-center py-10"><Loader2 className={`w-6 h-6 animate-spin ${accentColor}`} /></div>
          ) : !wallet ? (
            <div className={`${cardBg} rounded-xl p-6 text-center text-sm ${textSecondary}`}>Cüzdan bilgisi alınamadı.</div>
          ) : (
            <>
              <div className={`${cardBg} rounded-xl p-4`}>
                <h3 className={`font-medium ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
                  <Wallet className={`w-4 h-4 ${accentColor}`} /> Ajans Bakiyesi
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Mevcut Bakiye', value: `${wallet.wallet?.jetonBalance ?? 0} J`, color: 'text-green-400' },
                    { label: 'Toplam Yüklenen', value: `${wallet.wallet?.totalTopUp ?? 0} J`, color: accentColor },
                    { label: 'Toplam Bonus', value: `${wallet.wallet?.totalBonus ?? 0} J`, color: 'text-yellow-400' },
                    { label: 'Üyelere Gönderilen', value: `${wallet.wallet?.totalTransferred ?? 0} J`, color: 'text-blue-400' },
                  ].map((x, i) => (
                    <div key={i} className="rounded-lg bg-black/20 p-3 text-center">
                      <div className={`text-base font-bold ${x.color}`}>{x.value}</div>
                      <div className={`text-[10px] ${textSecondary}`}>{x.label}</div>
                    </div>
                  ))}
                </div>
                <div className={`mt-3 text-[11px] ${textSecondary} space-y-1`}>
                  <div>Ajans seviyesi: <span className={textPrimary}>{String(wallet.agency?.level || 'bronze').toUpperCase()}</span> • Yükleme bonusu: <span className={textPrimary}>%{wallet.bonus_rate ?? 0}</span> • Kur: <span className={textPrimary}>1 TL = {wallet.tl_to_jeton_rate ?? 0} jeton</span></div>
                  {wallet.wallet?.isLocked && (
                    <div className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Cüzdan kilitli{wallet.wallet?.lockReason ? `: ${wallet.wallet.lockReason}` : ''}</div>
                  )}
                  <div className="flex items-start gap-1 text-orange-400">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    Bu bakiye yalnızca üyelere jeton göndermek için kullanılabilir; nakde çevrilemez ve geri iade edilmez.
                  </div>
                </div>
              </div>

              <div className={`${cardBg} rounded-xl p-4`}>
                <h3 className={`font-medium ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
                  <Share2 className={`w-4 h-4 ${accentColor}`} /> Üyeye Jeton Gönder
                </h3>
                <div className="space-y-2">
                  <select value={trTarget} onChange={e => setTrTarget(e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`}>
                    <option value="">Üye seçin...</option>
                    {members.filter(m => m.isActive).map(m => (
                      <option key={m.id} value={m.user.id}>{m.user.name}{m.user.username ? ` (@${m.user.username})` : ''}</option>
                    ))}
                  </select>
                  <input type="number" min={1} value={trAmount} onChange={e => setTrAmount(e.target.value)} placeholder="Jeton miktarı" className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
                  <input type="text" value={trReason} onChange={e => setTrReason(e.target.value)} placeholder="Açıklama (opsiyonel)" className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
                  {trTarget && Number(trAmount) > 0 && (
                    <div className="rounded-lg bg-black/20 p-3 text-[11px] space-y-1">
                      <div className={textSecondary}>Kullanıcı: <span className={textPrimary}>{members.find(m => m.user.id === trTarget)?.user?.name || '-'}</span></div>
                      <div className={textSecondary}>Ajans bakiyesi: <span className={textPrimary}>{wallet.wallet?.jetonBalance ?? 0} J</span></div>
                      <div className={textSecondary}>Gönderilecek: <span className={textPrimary}>{Math.floor(Number(trAmount))} J</span></div>
                      <div className={textSecondary}>Kalan bakiye: <span className={(wallet.wallet?.jetonBalance ?? 0) - Math.floor(Number(trAmount)) < 0 ? 'text-red-400' : textPrimary}>{(wallet.wallet?.jetonBalance ?? 0) - Math.floor(Number(trAmount))} J</span></div>
                    </div>
                  )}
                  <button
                    onClick={() => handleTransfer(false)}
                    disabled={trSending || !trTarget || !(Number(trAmount) > 0)}
                    className={`w-full px-4 py-2 rounded-lg ${btnPrimary} text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50`}
                  >
                    {trSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    Jeton Gönder
                  </button>
                </div>
              </div>

              <div className={`${cardBg} rounded-xl p-4`}>
                <h3 className={`font-medium ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
                  <Clock className={`w-4 h-4 ${accentColor}`} /> Cüzdan Hareketleri
                </h3>
                {(wallet.transactions || []).length === 0 ? (
                  <div className={`text-xs ${textSecondary} text-center py-4`}>Henüz hareket yok.</div>
                ) : (
                  <div className="space-y-2">
                    {(wallet.transactions || []).map((t: any) => {
                      const labels: Record<string, string> = { topup: 'Bakiye Yükleme', bonus: 'Yükleme Bonusu', transfer: 'Üyeye Gönderim', adjust_credit: 'Düzeltme (Ekleme)', adjust_debit: 'Düzeltme (Düşüm)' }
                      const plus = t.direction === 'credit'
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-black/20">
                          <div className="min-w-0">
                            <div className={`text-xs font-medium ${textPrimary}`}>{labels[t.type] || t.type}</div>
                            <div className={`text-[10px] ${textSecondary} overflow-hidden text-ellipsis whitespace-nowrap`}>
                              {new Date(t.createdAt).toLocaleString('tr-TR')}
                              {t.targetUserName ? ` • ${t.targetUserName}` : ''}
                              {t.reason ? ` • ${t.reason}` : ''}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-xs font-bold ${plus ? 'text-green-400' : 'text-red-400'}`}>{plus ? '+' : '-'}{t.amount} J</div>
                            <div className={`text-[10px] ${textSecondary}`}>Bakiye: {t.balanceAfter}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* §19 — Canlı Takip */}
      {activeTab === 'live' && isManager && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-medium ${textPrimary} text-sm flex items-center gap-2`}>📡 Canlı Takip</h3>
            <button onClick={fetchLiveStatus} className={`text-xs ${accentColor} flex items-center gap-1`}><RefreshCw className="w-3 h-3" /> Yenile</button>
          </div>
          {liveLoading && !liveData ? (
            <div className="flex justify-center py-10"><Loader2 className={`w-6 h-6 animate-spin ${accentColor}`} /></div>
          ) : !liveData ? (
            <div className={`${cardBg} rounded-xl p-6 text-center text-sm ${textSecondary}`}>Veri alınamadı.</div>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: 'Toplam', value: liveData.summary.total, color: textPrimary },
                  { label: '🟢 Yayında', value: liveData.summary.live_streaming, color: 'text-green-400' },
                  { label: '🔵 Sesli', value: liveData.summary.voice_room, color: 'text-blue-400' },
                  { label: '🟡🟣 Odada', value: liveData.summary.room_active, color: 'text-yellow-400' },
                  { label: '⚪ Çevrimdışı', value: liveData.summary.offline, color: 'text-gray-400' },
                ].map((x, i) => (
                  <div key={i} className="rounded-lg bg-black/20 p-2 text-center">
                    <div className={`text-sm font-bold ${x.color}`}>{x.value}</div>
                    <div className={`text-[9px] ${textSecondary}`}>{x.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {(liveData.members || []).map((m: any) => (
                  <div key={m.userId} className={`${cardBg} rounded-xl p-3 flex items-center gap-3`}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {m.image ? <img src={m.image} className="w-9 h-9 rounded-full object-cover" alt="" /> : (m.name?.charAt(0) || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium ${textPrimary} flex items-center gap-1.5`}>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{m.name}</span>
                        <span className="text-[10px] opacity-60">@{m.username}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[11px]">{m.statusEmoji}</span>
                        <span className={`text-[10px] ${textSecondary}`}>{m.statusLabel}</span>
                        {m.detail?.durationMinutes !== undefined && <span className={`text-[10px] ${accentColor}`}>{m.detail.durationMinutes} dk</span>}
                        {m.detail?.viewerCount !== undefined && <span className={`text-[10px] ${textSecondary}`}>👁 {m.detail.viewerCount}</span>}
                        {m.detail?.lastSeenMinutes !== undefined && <span className={`text-[10px] ${textSecondary}`}>({m.detail.lastSeenMinutes < 60 ? `${m.detail.lastSeenMinutes} dk önce` : m.detail.lastSeenMinutes < 1440 ? `${Math.round(m.detail.lastSeenMinutes / 60)} saat önce` : `${Math.round(m.detail.lastSeenMinutes / 1440)} gün önce`})</span>}
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${m.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400' : m.role === 'manager' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>{m.role}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* §20 — Gelişim Merkezi */}
      {activeTab === 'growth' && isManager && (
        <div className="space-y-4">
          {growthLoading && !growthData ? (
            <div className="flex justify-center py-10"><Loader2 className={`w-6 h-6 animate-spin ${accentColor}`} /></div>
          ) : !growthData ? (
            <div className={`${cardBg} rounded-xl p-6 text-center text-sm ${textSecondary}`}>Veri alınamadı.</div>
          ) : (
            <>
              <div className={`${cardBg} rounded-xl p-4`}>
                <h3 className={`font-medium ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
                  <TrendingUp className={`w-4 h-4 ${accentColor}`} /> Bu Ay Özeti
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Yayın Süresi', value: `${growthData.thisMonth.streamMinutes} dk`, change: growthData.thisMonth.streamMinutesChange },
                    { label: 'Aktif Yayıncı', value: growthData.thisMonth.activeBroadcasters, sub: `Önceki ay: ${growthData.thisMonth.lastMonthBroadcasters}` },
                    { label: 'Yeni Üye', value: growthData.thisMonth.newMembers, color: 'text-green-400' },
                    { label: 'Ayrılan', value: growthData.thisMonth.leftMembers, color: 'text-red-400' },
                    { label: 'Kazanç', value: `${Math.floor(growthData.thisMonth.earnings)} J`, change: growthData.thisMonth.earningsChange },
                    { label: 'Performans', value: `${growthData.performance || 0}/100`, color: accentColor },
                    { label: 'Büyüme', value: `${growthData.growthRate > 0 ? '+' : ''}${growthData.growthRate}%`, color: growthData.growthRate >= 0 ? 'text-green-400' : 'text-red-400' },
                    { label: 'Seviye', value: String(growthData.data?.agency?.level || growthData.agency?.level || 'bronze').toUpperCase(), color: 'text-yellow-400' },
                  ].map((x: any, i) => (
                    <div key={i} className="rounded-lg bg-black/20 p-2.5 text-center">
                      <div className={`text-sm font-bold ${x.color || textPrimary}`}>{x.value}</div>
                      <div className={`text-[9px] ${textSecondary}`}>{x.label}</div>
                      {x.change !== undefined && <div className={`text-[9px] ${x.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>{x.change > 0 ? '+' : ''}{x.change}%</div>}
                      {x.sub && <div className={`text-[9px] ${textSecondary}`}>{x.sub}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {growthData.nextLevelCriteria && (
                <div className={`${cardBg} rounded-xl p-4`}>
                  <h3 className={`font-medium ${textPrimary} text-sm mb-3 flex items-center gap-2`}>
                    <Award className={`w-4 h-4 text-yellow-400`} /> Sonraki Seviye: {growthData.nextLevelCriteria.label}
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(growthData.nextLevelCriteria.criteria).map(([key, c]: [string, any]) => {
                      const labels: Record<string, string> = { minEarning: 'Toplam Kazanç (J)', minBroadcasters: 'Aktif Yayıncı', minStreamMinutes: 'Aylık Yayın (dk)' }
                      const pct = c.required > 0 ? Math.min(100, Math.round((c.current / c.required) * 100)) : 100
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className={textSecondary}>{labels[key] || key}</span>
                            <span className={c.met ? 'text-green-400' : textPrimary}>{c.current} / {c.required} {c.met ? '✓' : ''}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-black/30">
                            <div className={`h-full rounded-full ${c.met ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {growthData.topPerformers?.length > 0 && (
                <div className={`${cardBg} rounded-xl p-4`}>
                  <h3 className={`font-medium ${textPrimary} text-sm mb-3`}>🏆 En Başarılı Yayıncılar</h3>
                  <div className="space-y-1.5">
                    {growthData.topPerformers.map((m: any, i: number) => (
                      <div key={m.userId} className="flex items-center gap-2 p-2 rounded-lg bg-black/20">
                        <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : textSecondary}`}>{i + 1}</span>
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {m.image ? <img src={m.image} className="w-7 h-7 rounded-full object-cover" alt="" /> : (m.name?.charAt(0) || '?')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[11px] font-medium ${textPrimary} overflow-hidden text-ellipsis whitespace-nowrap`}>{m.name}</div>
                          <div className={`text-[10px] ${textSecondary}`}>{m.streamCount} yayın • {m.streamMinutes} dk</div>
                        </div>
                        <div className={`text-xs font-bold ${accentColor}`}>{Math.floor(m.totalEarnings)} J</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {growthData.needsImprovement?.length > 0 && (
                <div className={`${cardBg} rounded-xl p-4`}>
                  <h3 className={`font-medium ${textPrimary} text-sm mb-3`}>📈 Geliştirilmesi Gereken</h3>
                  <div className="space-y-1">
                    {growthData.needsImprovement.map((m: any) => (
                      <div key={m.userId} className="flex items-center gap-2 p-2 rounded-lg bg-black/20">
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-[10px] font-bold">{m.name?.charAt(0) || '?'}</div>
                        <span className={`text-[11px] ${textPrimary} flex-1 overflow-hidden text-ellipsis whitespace-nowrap`}>{m.name}</span>
                        <span className={`text-[10px] ${textSecondary}`}>Bu ay yayın yok</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* §12 — Aday Değerlendirme */}
              <div className={`${cardBg} rounded-xl p-4`}>
                <h3 className={`font-medium ${textPrimary} text-sm mb-3 flex items-center gap-2`}>🔍 Aday Değerlendirme (§12)</h3>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={scoreUserId} onChange={e => setScoreUserId(e.target.value)} placeholder="Kullanıcı ID giriniz..." className={`flex-1 px-3 py-2 rounded-lg border text-sm ${inputBg}`} />
                  <button onClick={() => fetchApplicantScore(scoreUserId)} disabled={scoreLoading || !scoreUserId.trim()} className={`px-4 py-2 rounded-lg ${btnPrimary} text-sm font-medium disabled:opacity-50`}>
                    {scoreLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Değerlendir'}
                  </button>
                </div>
                {scoreData && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">{scoreData.user?.name?.charAt(0) || '?'}</div>
                      <div>
                        <div className={`text-sm font-medium ${textPrimary}`}>{scoreData.user?.name}</div>
                        <div className={`text-[10px] ${textSecondary}`}>@{scoreData.user?.username} • {scoreData.user?.accountAgeDays} gün önce katıldı • {scoreData.user?.followers} takipçi</div>
                      </div>
                    </div>
                    {scoreData.currentAgency && (
                      <div className="rounded-lg bg-orange-500/10 p-2 text-[11px] text-orange-400">⚠ Mevcut ajans: {scoreData.currentAgency.agencyName} ({scoreData.currentAgency.role})</div>
                    )}
                    <div className="space-y-1.5">
                      {(scoreData.dimensions || []).map((d: any) => (
                        <div key={d.key}>
                          <div className="flex items-center justify-between text-[11px] mb-0.5">
                            <span className={textSecondary}>{d.label}</span>
                            <span className={d.score >= 60 ? 'text-green-400' : d.score >= 30 ? 'text-yellow-400' : 'text-red-400'}>{d.score}/100 — {d.detail}</span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-black/30">
                            <div className={`h-full rounded-full ${d.score >= 60 ? 'bg-green-500' : d.score >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${d.score}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className={`rounded-xl p-3 text-center ${scoreData.verdictColor === 'green' ? 'bg-green-500/10' : scoreData.verdictColor === 'yellow' ? 'bg-yellow-500/10' : scoreData.verdictColor === 'orange' ? 'bg-orange-500/10' : 'bg-red-500/10'}`}>
                      <div className={`text-lg font-bold ${scoreData.verdictColor === 'green' ? 'text-green-400' : scoreData.verdictColor === 'yellow' ? 'text-yellow-400' : scoreData.verdictColor === 'orange' ? 'text-orange-400' : 'text-red-400'}`}>{scoreData.overallScore}/100</div>
                      <div className={`text-sm font-medium ${textPrimary}`}>{scoreData.verdict}</div>
                      <div className={`text-[10px] ${textSecondary} mt-1`}>{scoreData.disclaimer}</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
