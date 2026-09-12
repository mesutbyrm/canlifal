'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, Users, TrendingUp, Coins, Radio, Shield, Crown, BarChart3, Activity, UserPlus, Gift } from 'lucide-react'
import Link from 'next/link'

interface AnalyticsData {
  users: {
    total: number; dau: number; wau: number; mau: number; online: number
    banned: number; frozen: number; retentionRate: number
    newToday: number; newWeek: number; newMonth: number
  }
  memberships: Record<string, number>
  platform: {
    activeAgencies: number; activeTellers: number; activeBroadcasters: number
    activeRooms: number; activeLiveStreams: number
  }
  economy: {
    jetonInToday: number; jetonOutToday: number
    cfcInToday: number; cfcOutToday: number
    giftsToday: number; vipConversionsMonth: number
  }
  generatedAt: string
}

const MEMBERSHIP_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  svip: { label: 'SVIP', emoji: '👑', color: 'text-red-400' },
  diamond: { label: 'Diamond', emoji: '💎', color: 'text-cyan-400' },
  premium: { label: 'Premium', emoji: '⭐', color: 'text-purple-400' },
  gold: { label: 'Gold', emoji: '🧱', color: 'text-yellow-400' },
  silver: { label: 'Silver', emoji: '🥈', color: 'text-gray-300' },
  basic: { label: 'Basic', emoji: '👤', color: 'text-gray-500' },
}

export default function PlatformAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/platform-analytics')
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <p className="text-gray-400">Veriler yüklenemedi</p>
    </div>
  )

  const d = data

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-800 text-gray-400">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">📊 Platform Analitik</h1>
            <p className="text-sm text-gray-400">KPI & performans metrikleri</p>
          </div>
        </div>

        {/* User Metrics */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
          <Users className="w-4 h-4" /> Kullanıcı Metrikleri
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <KPICard label="Toplam" value={d.users.total.toLocaleString()} icon={Users} color="text-blue-400" />
          <KPICard label="DAU (Bugün)" value={d.users.dau.toLocaleString()} icon={Activity} color="text-green-400" />
          <KPICard label="WAU (7 gün)" value={d.users.wau.toLocaleString()} icon={TrendingUp} color="text-emerald-400" />
          <KPICard label="MAU (30 gün)" value={d.users.mau.toLocaleString()} icon={BarChart3} color="text-teal-400" />
          <KPICard label="Çevrimiçi" value={d.users.online.toLocaleString()} icon={Radio} color="text-green-300" highlight />
          <KPICard label="Yeni (Bugün)" value={d.users.newToday.toLocaleString()} icon={UserPlus} color="text-fuchsia-400" />
          <KPICard label="Yeni (Hafta)" value={d.users.newWeek.toLocaleString()} icon={UserPlus} color="text-fuchsia-300" />
          <KPICard label="Yeni (Ay)" value={d.users.newMonth.toLocaleString()} icon={UserPlus} color="text-fuchsia-200" />
          <KPICard label="Retention" value={`%${d.users.retentionRate}`} icon={TrendingUp} color="text-amber-400" />
          <KPICard label="Banlı / Donuk" value={`${d.users.banned} / ${d.users.frozen}`} icon={Shield} color="text-red-400" />
        </div>

        {/* Membership Breakdown */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
          <Crown className="w-4 h-4" /> Üyelik Dağılımı
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {['svip', 'diamond', 'premium', 'gold', 'silver', 'basic'].map(tier => {
            const info = MEMBERSHIP_LABELS[tier] || { label: tier, emoji: '', color: 'text-gray-400' }
            return (
              <div key={tier} className="bg-gray-900/80 border border-gray-800/60 rounded-xl p-3 text-center">
                <div className="text-lg mb-0.5">{info.emoji}</div>
                <div className={`text-lg font-bold ${info.color}`}>{(d.memberships[tier] || 0).toLocaleString()}</div>
                <div className="text-[10px] text-gray-500">{info.label}</div>
              </div>
            )
          })}
        </div>

        {/* Platform Activity */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
          <Radio className="w-4 h-4" /> Platform Aktivitesi
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <KPICard label="Aktif Ajanslar" value={d.platform.activeAgencies.toLocaleString()} icon={Shield} color="text-emerald-400" />
          <KPICard label="Aktif Falcılar" value={d.platform.activeTellers.toLocaleString()} icon={Activity} color="text-purple-400" />
          <KPICard label="Yayıncılar" value={d.platform.activeBroadcasters.toLocaleString()} icon={Radio} color="text-pink-400" />
          <KPICard label="Aktif Odalar" value={d.platform.activeRooms.toLocaleString()} icon={Users} color="text-blue-400" />
          <KPICard label="Canlı Yayınlar" value={d.platform.activeLiveStreams.toLocaleString()} icon={Radio} color="text-red-400" highlight />
        </div>

        {/* Economy */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
          <Coins className="w-4 h-4" /> Ekonomi (Bugün)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <KPICard label="Jeton Girişi" value={d.economy.jetonInToday.toLocaleString()} icon={Coins} color="text-green-400" />
          <KPICard label="Jeton Çıkışı" value={d.economy.jetonOutToday.toLocaleString()} icon={Coins} color="text-red-400" />
          <KPICard label="CFC Girişi" value={d.economy.cfcInToday.toLocaleString()} icon={Coins} color="text-emerald-400" />
          <KPICard label="CFC Çıkışı" value={d.economy.cfcOutToday.toLocaleString()} icon={Coins} color="text-orange-400" />
          <KPICard label="Hediye Hareketi" value={d.economy.giftsToday.toLocaleString()} icon={Gift} color="text-pink-400" />
          <KPICard label="VIP Dönüşüm (Ay)" value={d.economy.vipConversionsMonth.toLocaleString()} icon={Crown} color="text-amber-400" />
        </div>

        <p className="text-xs text-gray-600 text-center mt-8">
          Son güncelleme: {new Date(d.generatedAt).toLocaleString('tr-TR')}
        </p>
      </div>
    </div>
  )
}

function KPICard({ label, value, icon: Icon, color, highlight }: {
  label: string; value: string; icon: React.ElementType; color: string; highlight?: boolean
}) {
  return (
    <div className={`bg-gray-900/80 border rounded-xl p-3 ${highlight ? 'border-green-500/30' : 'border-gray-800/60'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[11px] text-gray-400">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  )
}
