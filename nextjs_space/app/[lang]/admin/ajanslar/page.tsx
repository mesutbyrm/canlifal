'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSiteTheme } from '@/lib/theme-context'
import {
  Building2, Users, TrendingUp, Shield, Plus, Search, Check, X, AlertTriangle,
  Ban, ChevronDown, ChevronRight, Eye, Edit, Trash2, RefreshCw, Copy,
  DollarSign, UserPlus, Clock, Award, ArrowLeft, Percent, BarChart3
} from 'lucide-react'
import Link from 'next/link'

interface Agency {
  id: string
  name: string
  description: string | null
  ownerId: string
  ownerName: string
  status: string
  commissionRate: number
  contactEmail: string | null
  contactPhone: string | null
  totalEarnings: number
  totalMembers: number
  activeMembers: number
  performanceScore: number
  penaltyLevel: number
  penaltyNote: string | null
  invitesDisabled: boolean
  approvedAt: string | null
  rejectedReason: string | null
  createdAt: string
  _count: { members: number; earnings: number; inviteCodes: number; penalties: number }
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Bekliyor', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  approved: { label: 'Onaylı', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Check },
  rejected: { label: 'Reddedildi', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: X },
  suspended: { label: 'Askıda', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Ban },
}

const PENALTY_LABELS: Record<number, string> = {
  0: 'Temiz',
  1: 'Uyarı',
  2: 'Davetler Kapalı',
  3: 'Komisyon Düşük',
  4: 'Askıya Alındı',
}

export default function AdminAgenciesPage() {
  const { data: session } = useSession() || {}
  const { theme } = useSiteTheme()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null)
  const [actionModal, setActionModal] = useState<{ type: string; agency: Agency } | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [actionCommission, setActionCommission] = useState(5)
  const [actionPenaltyLevel, setActionPenaltyLevel] = useState(1)
  const [saving, setSaving] = useState(false)

  const isFacebook = theme === 'facebook'
  const isCosmic = theme === 'cosmic'
  const cardBg = isFacebook ? 'bg-white border border-gray-200' : isCosmic ? 'bg-white/5 border border-blue-500/20' : 'bg-[#1a0a2e]/80 border border-fuchsia-500/20'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-500' : isCosmic ? 'text-blue-300' : 'text-purple-300'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const btnPrimary = isFacebook ? 'bg-blue-500 hover:bg-blue-600 text-white' : isCosmic ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'
  const btnDanger = 'bg-red-600 hover:bg-red-500 text-white'
  const inputBg = isFacebook ? 'bg-gray-100 border-gray-300 text-gray-900' : isCosmic ? 'bg-blue-900/40 border-blue-500/30 text-white' : 'bg-purple-900/40 border-fuchsia-500/30 text-white'

  const fetchAgencies = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/admin/agencies?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAgencies(data.agencies)
      }
    } catch (err) {
      console.error('Fetch agencies error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAgencies() }, [statusFilter])

  const handleAction = async (action: string, agencyId: string, extraData?: any) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/agencies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencyId, action, ...extraData }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message || 'İşlem başarılı')
        setActionModal(null)
        setActionReason('')
        fetchAgencies()
      } else {
        alert(data.error || 'Hata oluştu')
      }
    } catch (err) {
      alert('İşlem sırasında hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (agencyId: string) => {
    if (!confirm('Bu ajansı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return
    try {
      const res = await fetch('/api/admin/agencies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencyId }),
      })
      if (res.ok) {
        alert('Ajans silindi')
        fetchAgencies()
      }
    } catch (err) {
      alert('Silme sırasında hata oluştu')
    }
  }

  const pendingCount = agencies.filter(a => a.status === 'pending').length
  const approvedCount = agencies.filter(a => a.status === 'approved').length
  const totalEarnings = agencies.reduce((s, a) => s + a.totalEarnings, 0)
  const totalMembers = agencies.reduce((s, a) => s + a.totalMembers, 0)

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className={`p-2 rounded-lg ${cardBg} hover:opacity-80 transition`}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary} flex items-center gap-2`}>
            <Building2 className={`w-7 h-7 ${accentColor}`} />
            Ajans Yönetimi
          </h1>
          <p className={`${textSecondary} text-sm mt-1`}>Ajans başvuruları, üyelikler ve komisyon yönetimi</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Bekleyen', value: pendingCount, icon: Clock, color: 'text-yellow-400' },
          { label: 'Aktif Ajans', value: approvedCount, icon: Building2, color: 'text-green-400' },
          { label: 'Toplam Kazanç', value: `${Math.floor(totalEarnings)} J`, icon: TrendingUp, color: 'text-fuchsia-400' },
          { label: 'Toplam Üye', value: agencies.reduce((s, a) => s + a.totalMembers, 0), icon: Users, color: 'text-blue-400' },
        ].map((stat, i) => (
          <div key={i} className={`${cardBg} rounded-xl p-4`}>
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <div className={`text-2xl font-bold ${textPrimary}`}>{stat.value}</div>
            <div className={`text-xs ${textSecondary}`}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchAgencies()}
            placeholder="Ajans adı veya sahip ara..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${inputBg} text-sm`}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'pending', 'approved', 'rejected', 'suspended'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                statusFilter === s
                  ? btnPrimary
                  : `${cardBg} ${textSecondary} hover:opacity-80`
              }`}
            >
              {s === '' ? 'Tümü' : STATUS_LABELS[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Agency List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className={`w-6 h-6 ${accentColor} animate-spin`} />
        </div>
      ) : agencies.length === 0 ? (
        <div className={`${cardBg} rounded-xl p-12 text-center`}>
          <Building2 className={`w-12 h-12 ${textSecondary} mx-auto mb-3`} />
          <p className={textSecondary}>Henüz ajans başvurusu yok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agencies.map(agency => {
            const statusInfo = STATUS_LABELS[agency.status] || STATUS_LABELS.pending
            const StatusIcon = statusInfo.icon
            return (
              <motion.div
                key={agency.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${cardBg} rounded-xl p-4 hover:border-fuchsia-400/40 transition-all`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold ${textPrimary} truncate`}>{agency.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                      {agency.penaltyLevel > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          Ceza Lv.{agency.penaltyLevel}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${textSecondary} space-y-0.5`}>
                      <p>Sahip: <span className={textPrimary}>{agency.ownerName}</span></p>
                      {agency.description && <p className="truncate">{agency.description}</p>}
                      <p>Tarih: {new Date(agency.createdAt).toLocaleDateString('tr-TR')}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <div className={`font-bold text-lg ${textPrimary}`}>{agency._count.members}</div>
                      <div className={textSecondary}>Üye</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-bold text-lg ${accentColor}`}>{Math.floor(agency.totalEarnings)}</div>
                      <div className={textSecondary}>Kazanç</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-bold text-lg ${textPrimary}`}>%{agency.commissionRate}</div>
                      <div className={textSecondary}>Komisyon</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {agency.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction('approve', agency.id)}
                          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Onayla
                        </button>
                        <button
                          onClick={() => setActionModal({ type: 'reject', agency })}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reddet
                        </button>
                      </>
                    )}
                    {agency.status === 'approved' && (
                      <>
                        <button
                          onClick={() => { setActionModal({ type: 'update', agency }); setActionCommission(agency.commissionRate) }}
                          className={`px-3 py-1.5 rounded-lg ${btnPrimary} text-xs font-medium flex items-center gap-1`}
                        >
                          <Edit className="w-3.5 h-3.5" /> Düzenle
                        </button>
                        <button
                          onClick={() => setActionModal({ type: 'penalty', agency })}
                          className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Ceza
                        </button>
                        <button
                          onClick={() => setActionModal({ type: 'suspend', agency })}
                          className={`px-3 py-1.5 rounded-lg ${btnDanger} text-xs font-medium flex items-center gap-1`}
                        >
                          <Ban className="w-3.5 h-3.5" /> Askıya Al
                        </button>
                      </>
                    )}
                    {agency.status === 'suspended' && (
                      <button
                        onClick={() => handleAction('reactivate', agency.id)}
                        className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Aktif Et
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(agency.id)}
                      className="px-2 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Action Modal */}
      <AnimatePresence>
        {actionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setActionModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className={`${cardBg} rounded-2xl p-6 w-full max-w-md`}
            >
              <h3 className={`text-lg font-bold ${textPrimary} mb-4`}>
                {actionModal.type === 'reject' && 'Ajansı Reddet'}
                {actionModal.type === 'suspend' && 'Ajansı Askıya Al'}
                {actionModal.type === 'penalty' && 'Ceza Uygula'}
                {actionModal.type === 'update' && 'Ajans Düzenle'}
              </h3>
              <p className={`text-sm ${textSecondary} mb-4`}>
                <span className={textPrimary}>{actionModal.agency.name}</span> ajansı için işlem
              </p>

              {actionModal.type === 'update' && (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className={`text-xs ${textSecondary} mb-1 block`}>Komisyon Oranı (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={actionCommission}
                      onChange={e => setActionCommission(Number(e.target.value))}
                      className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                    />
                  </div>
                </div>
              )}

              {actionModal.type === 'penalty' && (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className={`text-xs ${textSecondary} mb-1 block`}>Ceza Seviyesi</label>
                    <select
                      value={actionPenaltyLevel}
                      onChange={e => setActionPenaltyLevel(Number(e.target.value))}
                      className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm`}
                    >
                      <option value={1}>1 - Uyarı</option>
                      <option value={2}>2 - Davetleri Kapat</option>
                      <option value={3}>3 - Komisyonu Düşür</option>
                      <option value={4}>4 - Askıya Al</option>
                    </select>
                  </div>
                </div>
              )}

              {(actionModal.type === 'reject' || actionModal.type === 'suspend' || actionModal.type === 'penalty') && (
                <div className="mb-4">
                  <label className={`text-xs ${textSecondary} mb-1 block`}>Sebep</label>
                  <textarea
                    value={actionReason}
                    onChange={e => setActionReason(e.target.value)}
                    rows={3}
                    placeholder="Sebep yazın..."
                    className={`w-full px-3 py-2 rounded-lg border ${inputBg} text-sm resize-none`}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setActionModal(null)}
                  className={`flex-1 px-4 py-2 rounded-lg ${cardBg} ${textSecondary} text-sm font-medium`}
                >
                  İptal
                </button>
                <button
                  onClick={() => {
                    if (actionModal.type === 'update') {
                      handleAction('update', actionModal.agency.id, { commissionRate: actionCommission })
                    } else if (actionModal.type === 'penalty') {
                      handleAction('penalty', actionModal.agency.id, { penaltyLevel: actionPenaltyLevel, reason: actionReason })
                    } else {
                      handleAction(actionModal.type, actionModal.agency.id, { reason: actionReason })
                    }
                  }}
                  disabled={saving}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${
                    actionModal.type === 'reject' || actionModal.type === 'suspend' ? btnDanger : btnPrimary
                  } disabled:opacity-50`}
                >
                  {saving ? 'İşleniyor...' : 'Uygula'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
