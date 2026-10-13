'use client'

import AdminBackButton from '@/components/admin-back-button'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Loader2, RefreshCw, Wifi, Gauge, TimerReset, Radio } from 'lucide-react'

interface TelemetryItem {
  id: string
  userId: string
  context: string
  contextId: string | null
  peerId: string | null
  connectionState: string | null
  iceState: string | null
  reconnectCount: number
  rttMs: number | null
  packetLossPercent: number | null
  jitterMs: number | null
  bitrateKbps: number | null
  freezeCount: number
  freezeDurationMs: number
  durationSeconds: number
  qualityScore: number | null
  qualityLevel: string | null
  platform: string | null
  networkType: string | null
  createdAt: string
  user: { id: string; name: string | null; username: string | null } | null
}

interface Summary {
  windowHours: number
  sampleCount: number
  averages: {
    rttMs: number | null
    packetLossPercent: number | null
    jitterMs: number | null
    bitrateKbps: number | null
    qualityScore: number | null
  }
  totals: { reconnects: number; freezes: number }
  levelCounts: Record<string, number>
  contextCounts: Record<string, number>
  platformCounts: Record<string, number>
}

const LEVEL_LABELS: Record<string, string> = {
  excellent: 'Mükemmel',
  good: 'İyi',
  fair: 'Orta',
  poor: 'Zayıf',
  critical: 'Kritik',
}
const LEVEL_COLORS: Record<string, string> = {
  excellent: 'bg-emerald-600',
  good: 'bg-teal-600',
  fair: 'bg-amber-600',
  poor: 'bg-orange-600',
  critical: 'bg-red-600',
}
const CONTEXT_LABELS: Record<string, string> = {
  live_session: 'Canlı Fal Oturumu',
  voice_room: 'Sesli Oda',
  video_stream: 'Video Yayını',
  pk: 'PK Düellö',
}
const PLATFORM_LABELS: Record<string, string> = {
  web: 'Web',
  android: 'Android',
  ios: 'iOS',
  unknown: 'Bilinmiyor',
}

function fmt(v: number | null | undefined, suffix = '') {
  if (v === null || v === undefined) return '—'
  return `${v}${suffix}`
}

export default function AdminRtcTelemetryPage() {
  const [items, setItems] = useState<TelemetryItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [hours, setHours] = useState('24')
  const [contextFilter, setContextFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '50', hours })
      if (contextFilter) qs.set('context', contextFilter)
      if (levelFilter) qs.set('level', levelFilter)
      if (platformFilter) qs.set('platform', platformFilter)
      const res = await fetch(`/api/admin/rtc-telemetry?${qs.toString()}`)
      const data = await res.json()
      setItems(data?.data?.items || [])
      setSummary(data?.data?.summary || null)
      setTotal(data?.data?.meta?.total || 0)
    } catch {
      showToast('error', 'Telemetri verileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [page, hours, contextFilter, levelFilter, platformFilter, showToast])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const totalPages = Math.max(1, Math.ceil(total / 50))

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <AdminBackButton />

        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-7 h-7 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">Bağlantı Kalitesi Telemetrisi</h1>
            <p className="text-sm text-slate-400">
              Canlı görüşme ve yayınlarda istemcilerin bildirdiği ağ kalite ölçümleri. Bu
              katman salt gözlemdir; medya akışına müdahale etmez. Ses/görüntü içeriği veya
              IP adresi saklanmaz.
            </p>
          </div>
        </div>

        {/* Özet kartları */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Gauge className="w-3.5 h-3.5" /> Ort. Kalite
              </div>
              <div className="text-2xl font-bold text-cyan-300">
                {fmt(summary.averages.qualityScore)}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <TimerReset className="w-3.5 h-3.5" /> Ort. Gecikme
              </div>
              <div className="text-2xl font-bold">{fmt(summary.averages.rttMs, ' ms')}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Wifi className="w-3.5 h-3.5" /> Paket Kaybı
              </div>
              <div className="text-2xl font-bold">
                {fmt(summary.averages.packetLossPercent, ' %')}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs mb-1">Ort. Jitter</div>
              <div className="text-2xl font-bold">{fmt(summary.averages.jitterMs, ' ms')}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs mb-1">Yeniden Bağlanma</div>
              <div className="text-2xl font-bold text-amber-300">{summary.totals.reconnects}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs mb-1">Örneklem</div>
              <div className="text-2xl font-bold">{summary.sampleCount}</div>
            </div>
          </motion.div>
        )}

        {/* Seviye dağılımı */}
        {summary && Object.keys(summary.levelCounts).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(summary.levelCounts).map(([lvl, count]) => (
              <span
                key={lvl}
                className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                  LEVEL_COLORS[lvl] || 'bg-slate-600'
                }`}
              >
                {LEVEL_LABELS[lvl] || lvl}: {count}
              </span>
            ))}
          </div>
        )}

        {/* Filtreler */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={hours}
            onChange={(e) => {
              setPage(1)
              setHours(e.target.value)
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="1">Son 1 saat</option>
            <option value="6">Son 6 saat</option>
            <option value="24">Son 24 saat</option>
            <option value="168">Son 7 gün</option>
            <option value="720">Son 30 gün</option>
          </select>

          <select
            value={contextFilter}
            onChange={(e) => {
              setPage(1)
              setContextFilter(e.target.value)
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tüm bağlamlar</option>
            <option value="live_session">Canlı Fal Oturumu</option>
            <option value="voice_room">Sesli Oda</option>
            <option value="video_stream">Video Yayını</option>
            <option value="pk">PK Düellö</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => {
              setPage(1)
              setLevelFilter(e.target.value)
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tüm seviyeler</option>
            <option value="excellent">Mükemmel</option>
            <option value="good">İyi</option>
            <option value="fair">Orta</option>
            <option value="poor">Zayıf</option>
            <option value="critical">Kritik</option>
          </select>

          <select
            value={platformFilter}
            onChange={(e) => {
              setPage(1)
              setPlatformFilter(e.target.value)
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tüm platformlar</option>
            <option value="web">Web</option>
            <option value="android">Android</option>
            <option value="ios">iOS</option>
          </select>

          <button
            onClick={fetchItems}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
            <Radio className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">
              Seçili aralıkta telemetri kaydı yok. İstemciler ölçüm göndermeye başladığında
              kayıtlar burada görünecek.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <motion.div
                key={it.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4"
              >
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white ${
                      LEVEL_COLORS[it.qualityLevel || ''] || 'bg-slate-600'
                    }`}
                  >
                    {LEVEL_LABELS[it.qualityLevel || ''] || it.qualityLevel || '—'}
                    {it.qualityScore !== null ? ` · ${it.qualityScore}` : ''}
                  </span>
                  <span className="text-sm text-slate-300">
                    {CONTEXT_LABELS[it.context] || it.context}
                  </span>
                  <span className="text-sm text-slate-400">
                    {it.user?.name || it.user?.username || it.userId}
                  </span>
                  {it.platform && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {PLATFORM_LABELS[it.platform] || it.platform}
                    </span>
                  )}
                  {it.networkType && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {it.networkType}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-slate-500">
                    {new Date(it.createdAt).toLocaleString('tr-TR', { timeZone: 'UTC' })}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
                  <div>
                    <div className="text-[11px] text-slate-500">Gecikme</div>
                    <div className="font-medium">{fmt(it.rttMs, ' ms')}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Paket Kaybı</div>
                    <div className="font-medium">{fmt(it.packetLossPercent, ' %')}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Jitter</div>
                    <div className="font-medium">{fmt(it.jitterMs, ' ms')}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Bit Hızı</div>
                    <div className="font-medium">{fmt(it.bitrateKbps, ' kbps')}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Yeniden Bağl.</div>
                    <div className="font-medium">{it.reconnectCount}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Donma</div>
                    <div className="font-medium">{it.freezeCount}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Süre</div>
                    <div className="font-medium">{it.durationSeconds} sn</div>
                  </div>
                </div>

                {(it.connectionState || it.iceState || it.contextId) && (
                  <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                    {it.connectionState && <span>Bağlantı: {it.connectionState}</span>}
                    {it.iceState && <span>ICE: {it.iceState}</span>}
                    {it.contextId && <span>Kimlik: {it.contextId}</span>}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Sayfalama */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              Önceki
            </button>
            <span className="text-sm text-slate-400">
              Sayfa {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              Sonraki
            </button>
          </div>
        )}

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${
                toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
