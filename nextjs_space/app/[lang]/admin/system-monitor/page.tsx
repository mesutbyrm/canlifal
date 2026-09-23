'use client'

import AdminBackButton from '@/components/admin-back-button'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, Loader2, RefreshCw, Server, Users, Radio, Shield,
  FileText, Database, Wifi, Clock, AlertTriangle, MonitorCheck
} from 'lucide-react'

interface SystemStats {
  timestamp: string
  uptime: number
  dbLatencyMs: number
  users: { total: number | null; online: number | null }
  realtime: {
    activeRooms: number | null
    activeLiveStreams: number | null
    activePkSessions: number | null
    activeVideoStreams: number | null
  }
  activity: {
    riskEventsLastHour: number | null
    auditLogsLastHour: number | null
  }
  rtcTelemetry: {
    count: number
    averageScore: number | null
    averageRtt: number | null
    averageLoss: number | null
    averageJitter: number | null
    totalReconnects: number
    levelDistribution: Record<string, number>
  } | null
}

export default function SystemMonitorPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/system-stats')
      const json = await res.json()
      if (json.success) {
        setStats(json.data)
        setError(null)
      } else {
        setError(json.error?.message || 'Bilinmeyen hata')
      }
    } catch {
      setError('Sunucuya ula\u015F\u0131lamad\u0131')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    if (!autoRefresh) return
    const interval = setInterval(fetchStats, 30000) // 30 sn
    return () => clearInterval(interval)
  }, [fetchStats, autoRefresh])

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (d > 0) return `${d}g ${h}sa ${m}dk`
    if (h > 0) return `${h}sa ${m}dk`
    return `${m}dk`
  }

  const getLatencyColor = (ms: number) => {
    if (ms <= 50) return 'text-emerald-400'
    if (ms <= 150) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getLatencyLabel = (ms: number) => {
    if (ms <= 50) return 'M\u00fckemmel'
    if (ms <= 150) return '\u0130yi'
    if (ms <= 300) return 'Orta'
    return 'Yava\u015F'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AdminBackButton />

        {/* Ba\u015Fl\u0131k */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400">
              <MonitorCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Sistem Durumu</h1>
              <p className="text-sm text-gray-400">Canl\u0131 \u00fcretim izleme metrikleri</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                autoRefresh
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {autoRefresh ? '\u25CF Otomatik (30sn)' : '\u25CB Duraklat\u0131ld\u0131'}
            </button>
            <button
              onClick={() => { setLoading(true); fetchStats() }}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* \u00dcst \u00f6zet sat\u0131r\u0131 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Database className="w-5 h-5" />}
                label="DB Gecikme"
                value={`${stats.dbLatencyMs}ms`}
                color={getLatencyColor(stats.dbLatencyMs)}
                sublabel={getLatencyLabel(stats.dbLatencyMs)}
              />
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                label="\u00c7al\u0131\u015Fma S\u00fcresi"
                value={formatUptime(stats.uptime)}
                color="text-blue-400"
              />
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Toplam Kullan\u0131c\u0131"
                value={stats.users.total?.toLocaleString('tr-TR') ?? '-'}
                color="text-purple-400"
                sublabel={`${stats.users.online ?? 0} \u00e7evrimi\u00e7i`}
              />
              <StatCard
                icon={<Shield className="w-5 h-5" />}
                label="Risk Olaylar\u0131 (1sa)"
                value={String(stats.activity.riskEventsLastHour ?? 0)}
                color={stats.activity.riskEventsLastHour && stats.activity.riskEventsLastHour > 10
                  ? 'text-red-400' : 'text-emerald-400'}
              />
            </div>

            {/* Canl\u0131 aktivite */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Radio className="w-5 h-5 text-red-400" />
                Canl\u0131 Aktivite
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<Wifi className="w-5 h-5" />}
                  label="Sesli Odalar"
                  value={String(stats.realtime.activeRooms ?? 0)}
                  color="text-cyan-400"
                />
                <StatCard
                  icon={<Activity className="w-5 h-5" />}
                  label="Canl\u0131 Fal Oturumlar\u0131"
                  value={String(stats.realtime.activeLiveStreams ?? 0)}
                  color="text-amber-400"
                />
                <StatCard
                  icon={<Server className="w-5 h-5" />}
                  label="PK Oturumlar\u0131"
                  value={String(stats.realtime.activePkSessions ?? 0)}
                  color="text-rose-400"
                />
                <StatCard
                  icon={<Radio className="w-5 h-5" />}
                  label="Video Yay\u0131nlar\u0131"
                  value={String(stats.realtime.activeVideoStreams ?? 0)}
                  color="text-violet-400"
                />
              </div>
            </div>

            {/* Denetim */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Son 1 Saat
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard
                  icon={<FileText className="w-5 h-5" />}
                  label="Denetim Kay\u0131tlar\u0131"
                  value={String(stats.activity.auditLogsLastHour ?? 0)}
                  color="text-gray-300"
                />
                {stats.rtcTelemetry && (
                  <>
                    <StatCard
                      icon={<Activity className="w-5 h-5" />}
                      label="RTC Telemetri"
                      value={String(stats.rtcTelemetry.count)}
                      color="text-blue-300"
                      sublabel={stats.rtcTelemetry.averageScore != null
                        ? `Ort. skor: ${Math.round(stats.rtcTelemetry.averageScore)}`
                        : undefined}
                    />
                    <StatCard
                      icon={<Wifi className="w-5 h-5" />}
                      label="Ort. RTT"
                      value={stats.rtcTelemetry.averageRtt != null
                        ? `${Math.round(stats.rtcTelemetry.averageRtt)}ms`
                        : '-'}
                      color="text-teal-400"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Son g\u00fcncelleme */}
            <p className="text-xs text-gray-500 text-right">
              Son g\u00fcncelleme: {new Date(stats.timestamp).toLocaleTimeString('tr-TR')}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function StatCard({
  icon, label, value, color, sublabel,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
  sublabel?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/60 backdrop-blur border border-gray-700/50 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2 text-gray-400">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
    </motion.div>
  )
}
