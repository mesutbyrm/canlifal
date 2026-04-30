'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSiteTheme } from '@/lib/theme-context'
import {
  Building2, Users, TrendingUp, Copy, Plus, RefreshCw, UserPlus,
  DollarSign, Clock, ChevronRight, Award, Trash2, Check, X, Link as LinkIcon,
  ArrowLeft, BarChart3, AlertTriangle, Share2, Wallet, Loader2
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
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'invites' | 'earnings' | 'withdrawals'>('overview')
  const [creating, setCreating] = useState(false)
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(0)
  const [newCodeDays, setNewCodeDays] = useState(7)
  const [copied, setCopied] = useState('')

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
      if (res.ok) { const d = await res.json(); setMembers(d.members) }
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
          <h1 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
            <Building2 className={`w-6 h-6 ${accentColor}`} />
            {agency.name}
          </h1>
          <p className={`${textSecondary} text-xs`}>
            {agency.status === 'approved' ? 'Aktif Ajans' : agency.status === 'pending' ? 'Onay Bekliyor' : agency.status}
            {agency.penaltyLevel > 0 && ` • Ceza Seviyesi: ${agency.penaltyLevel}`}
          </p>
        </div>
      </div>

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
          {(['overview', 'members', 'invites', 'earnings', 'withdrawals'] as const).map(tab => {
            const labels: Record<string, string> = { overview: 'Genel', members: 'Üyeler', invites: 'Davet Kodları', earnings: 'Kazançlar', withdrawals: 'Çekim Talepleri' }
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
        <div className="space-y-3">
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
                  {' • '}
                  {new Date(m.joinedAt).toLocaleDateString('tr-TR')}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${accentColor}`}>{Math.floor(m.totalEarnings)} J</div>
                <div className={`text-[10px] ${m.isActive ? 'text-green-400' : 'text-red-400'}`}>
                  {m.isActive ? 'Aktif' : 'Pasif'}
                </div>
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
    </div>
  )
}
