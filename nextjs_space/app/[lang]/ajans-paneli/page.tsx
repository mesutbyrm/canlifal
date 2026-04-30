'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSiteTheme } from '@/lib/theme-context'
import {
  Building2, Users, TrendingUp, Copy, Plus, RefreshCw, UserPlus,
  DollarSign, Clock, ChevronRight, Award, Trash2, Check, X, Link as LinkIcon,
  ArrowLeft, BarChart3, AlertTriangle, Share2
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

export default function AgencyPanelPage() {
  const { data: session } = useSession() || {}
  const { theme } = useSiteTheme()
  const [info, setInfo] = useState<AgencyInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [codes, setCodes] = useState<InviteCodeItem[]>([])
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [earningsSummary, setEarningsSummary] = useState<{ weekly: number; monthly: number }>({ weekly: 0, monthly: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'invites' | 'earnings'>('overview')
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
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => { fetchInfo() }, [])
  useEffect(() => {
    if (info?.isOwner || info?.membership?.role === 'manager' || info?.membership?.role === 'owner') {
      fetchMembers()
      fetchCodes()
      fetchEarnings()
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
          {(['overview', 'members', 'invites', 'earnings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                activeTab === tab ? tabActive : tabInactive
              }`}
            >
              {tab === 'overview' ? 'Genel' : tab === 'members' ? 'Üyeler' : tab === 'invites' ? 'Davet Kodları' : 'Kazançlar'}
            </button>
          ))}
        </div>
      )}

      {/* Overview */}
      {activeTab === 'overview' && (
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
          <div className={`${cardBg} rounded-xl p-4`}>
            <h3 className={`font-bold ${textPrimary} mb-2`}>Ajans Bilgileri</h3>
            <div className={`text-sm ${textSecondary} space-y-1`}>
              {agency.description && <p>{agency.description}</p>}
              <p>Komisyon Oranı: <span className={accentColor}>%{agency.commissionRate}</span></p>
              <p>Üye Sayısı: <span className={textPrimary}>{agency.totalMembers || agency._count?.members || 0}</span></p>
              <p>Toplam Kazanç: <span className={textPrimary}>{Math.floor(agency.totalEarnings || 0)} Jeton</span></p>
            </div>
          </div>
        </div>
      )}

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
    </div>
  )
}
