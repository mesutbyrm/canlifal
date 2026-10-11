/**
 * Faz 15 — WebRTC Telemetri (§76) + Gözlemlenebilirlik (§74)
 *
 * Salt gözlem amaçlı bir katmandır. Hiçbir medya taşıma mimarisine, sinyalleşme
 * akışına veya mevcut uç davranışına dokunmaz. Yalnızca istemcinin bildirdiği
 * bağlantı kalite metriklerini normalize eder, 0-100 arası bir kalite skoru
 * üretir ve `RtcTelemetry` tablosuna yazar.
 *
 * Gizlilik: ses/görüntü içeriği, IP adresi veya çerez saklanmaz. Yalnızca
 * sayısal ağ metrikleri ve kaba platform bilgisi tutulur.
 *
 * Kullanım (daima fire-and-forget):
 *   recordRtcTelemetry({ userId, context: 'live_session', rttMs: 82, ... })
 *     .catch(e => console.error('[RtcTelemetry]', e))
 *
 * ASLA throw etmez.
 */

import prisma from '@/lib/db'
import { getCached } from '@/lib/cache'

export type RtcContext = 'live_session' | 'voice_room' | 'video_stream' | 'pk'
export type RtcQualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical'

export interface RtcTelemetryInput {
  userId: string
  context: RtcContext | string
  contextId?: string | null
  peerId?: string | null
  connectionState?: string | null
  iceState?: string | null
  reconnectCount?: number
  rttMs?: number | null
  packetLossPercent?: number | null
  jitterMs?: number | null
  bitrateKbps?: number | null
  freezeCount?: number
  freezeDurationMs?: number
  durationSeconds?: number
  platform?: string | null
  networkType?: string | null
  metadata?: Record<string, any> | null
}

/**
 * Varsayılan kalite eşikleri. `rtc_quality_thresholds` RemoteConfig kaydı ile
 * ezilebilir (60 sn önbellek).
 */
export const DEFAULT_RTC_THRESHOLDS = {
  // RTT (ms) — gidiş-dönüş gecikmesi
  rtt_good: 150,
  rtt_fair: 300,
  rtt_poor: 500,
  rtt_weight: 30,

  // Paket kaybı (%)
  loss_good: 1,
  loss_fair: 3,
  loss_poor: 8,
  loss_weight: 30,

  // Jitter (ms)
  jitter_good: 30,
  jitter_fair: 60,
  jitter_poor: 100,
  jitter_weight: 20,

  // Yeniden bağlanma sayısı
  reconnect_good: 0,
  reconnect_fair: 1,
  reconnect_poor: 3,
  reconnect_weight: 10,

  // Donma (freeze) sayısı
  freeze_good: 0,
  freeze_fair: 2,
  freeze_poor: 5,
  freeze_weight: 10,

  // Seviye sınırları (skor >= değer)
  level_excellent: 85,
  level_good: 70,
  level_fair: 50,
  level_poor: 30,
}

export type RtcThresholds = typeof DEFAULT_RTC_THRESHOLDS

async function getThresholds(): Promise<RtcThresholds> {
  try {
    return await getCached('rtc_quality_thresholds', 60, async () => {
      const row = await prisma.remoteConfig.findUnique({
        where: { key: 'rtc_quality_thresholds' },
      })
      if (!row?.value) return DEFAULT_RTC_THRESHOLDS
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value
      return { ...DEFAULT_RTC_THRESHOLDS, ...(parsed as object) } as RtcThresholds
    })
  } catch {
    return DEFAULT_RTC_THRESHOLDS
  }
}

/**
 * Tek bir metriği kademeli olarak 0..1 arası "sağlık oranına" çevirir.
 * Düşük değer = iyi (RTT, kayıp, jitter, reconnect, freeze için geçerli).
 */
function gradeLowerIsBetter(
  value: number | null | undefined,
  good: number,
  fair: number,
  poor: number
): number | null {
  if (value === null || value === undefined || !isFinite(value)) return null
  const v = Math.max(0, value)
  if (v <= good) return 1
  if (v <= fair) return 1 - (0.3 * (v - good)) / Math.max(1e-6, fair - good)
  if (v <= poor) return 0.7 - (0.4 * (v - fair)) / Math.max(1e-6, poor - fair)
  // poor eşiğinin ötesi: 0.3'ten 0'a doğru yumuşak düşüş
  const over = (v - poor) / Math.max(1e-6, poor)
  return Math.max(0, 0.3 - 0.3 * Math.min(1, over))
}

function levelFromScore(score: number, t: RtcThresholds): RtcQualityLevel {
  if (score >= t.level_excellent) return 'excellent'
  if (score >= t.level_good) return 'good'
  if (score >= t.level_fair) return 'fair'
  if (score >= t.level_poor) return 'poor'
  return 'critical'
}

export interface RtcQualityResult {
  score: number
  level: RtcQualityLevel
  /** Hangi metriklerin skora katkı verdiği — teşhis için */
  breakdown: { key: string; weight: number; health: number; value: number | null }[]
}

/**
 * Metriklerden 0-100 arası kalite skoru üretir.
 * Yalnızca sağlanan metrikler dikkate alınır; eksik metrikler ağırlıktan düşer.
 * Hiç metrik yoksa skor 100 (nötr) döner.
 */
export async function computeRtcQuality(
  input: Pick<
    RtcTelemetryInput,
    'rttMs' | 'packetLossPercent' | 'jitterMs' | 'reconnectCount' | 'freezeCount'
  >
): Promise<RtcQualityResult> {
  const t = await getThresholds()

  const parts: { key: string; weight: number; health: number | null; value: number | null }[] = [
    {
      key: 'rtt',
      weight: t.rtt_weight,
      value: input.rttMs ?? null,
      health: gradeLowerIsBetter(input.rttMs, t.rtt_good, t.rtt_fair, t.rtt_poor),
    },
    {
      key: 'packet_loss',
      weight: t.loss_weight,
      value: input.packetLossPercent ?? null,
      health: gradeLowerIsBetter(
        input.packetLossPercent,
        t.loss_good,
        t.loss_fair,
        t.loss_poor
      ),
    },
    {
      key: 'jitter',
      weight: t.jitter_weight,
      value: input.jitterMs ?? null,
      health: gradeLowerIsBetter(input.jitterMs, t.jitter_good, t.jitter_fair, t.jitter_poor),
    },
    {
      key: 'reconnect',
      weight: t.reconnect_weight,
      value: input.reconnectCount ?? null,
      health: gradeLowerIsBetter(
        input.reconnectCount,
        t.reconnect_good,
        t.reconnect_fair,
        t.reconnect_poor
      ),
    },
    {
      key: 'freeze',
      weight: t.freeze_weight,
      value: input.freezeCount ?? null,
      health: gradeLowerIsBetter(
        input.freezeCount,
        t.freeze_good,
        t.freeze_fair,
        t.freeze_poor
      ),
    },
  ]

  const present = parts.filter((p) => p.health !== null)
  if (present.length === 0) {
    return { score: 100, level: 'excellent', breakdown: [] }
  }

  const totalWeight = present.reduce((s, p) => s + p.weight, 0)
  const weighted = present.reduce((s, p) => s + p.weight * (p.health as number), 0)
  const score = Math.round((weighted / Math.max(1e-6, totalWeight)) * 100)
  const clamped = Math.max(0, Math.min(100, score))

  return {
    score: clamped,
    level: levelFromScore(clamped, t),
    breakdown: present.map((p) => ({
      key: p.key,
      weight: p.weight,
      health: Math.round((p.health as number) * 100) / 100,
      value: p.value,
    })),
  }
}

// Aşırı büyük/anlamsız değerleri kırp — kötü niyetli istemciye karşı savunma
function clampNum(v: any, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : parseFloat(v)
  if (!isFinite(n)) return null
  return Math.max(min, Math.min(max, n))
}

function clampInt(v: any, min: number, max: number, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseInt(v, 10)
  if (!isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

function safeStr(v: any, max = 64): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s) return null
  return s.slice(0, max)
}

/**
 * Telemetri kaydını normalize edip veritabanına yazar.
 * ASLA throw etmez — hata durumunda null döner.
 */
export async function recordRtcTelemetry(input: RtcTelemetryInput) {
  try {
    if (!input?.userId || !input?.context) return null

    const rttMs = clampNum(input.rttMs, 0, 60_000)
    const packetLossPercent = clampNum(input.packetLossPercent, 0, 100)
    const jitterMs = clampNum(input.jitterMs, 0, 60_000)
    const bitrateKbps = clampNum(input.bitrateKbps, 0, 1_000_000)
    const reconnectCount = clampInt(input.reconnectCount, 0, 10_000)
    const freezeCount = clampInt(input.freezeCount, 0, 100_000)
    const freezeDurationMs = clampInt(input.freezeDurationMs, 0, 24 * 60 * 60 * 1000)
    const durationSeconds = clampInt(input.durationSeconds, 0, 24 * 60 * 60)

    const quality = await computeRtcQuality({
      rttMs,
      packetLossPercent,
      jitterMs,
      reconnectCount,
      freezeCount,
    })

    // metadata'yı küçük tut (kötüye kullanım önleme)
    let metadata: any = null
    if (input.metadata && typeof input.metadata === 'object') {
      const raw = JSON.stringify(input.metadata)
      metadata = raw.length <= 4000 ? input.metadata : { truncated: true }
    }

    return await prisma.rtcTelemetry.create({
      data: {
        userId: input.userId,
        context: safeStr(input.context, 32) || 'unknown',
        contextId: safeStr(input.contextId, 64),
        peerId: safeStr(input.peerId, 64),
        connectionState: safeStr(input.connectionState, 24),
        iceState: safeStr(input.iceState, 24),
        reconnectCount,
        rttMs,
        packetLossPercent,
        jitterMs,
        bitrateKbps,
        freezeCount,
        freezeDurationMs,
        durationSeconds,
        qualityScore: quality.score,
        qualityLevel: quality.level,
        platform: safeStr(input.platform, 16),
        networkType: safeStr(input.networkType, 16),
        metadata: metadata ?? undefined,
      },
    })
  } catch (e) {
    console.error('[RtcTelemetry] kayıt hatası:', e)
    return null
  }
}

export interface RtcTelemetryQuery {
  page?: number
  limit?: number
  context?: string
  contextId?: string
  userId?: string
  qualityLevel?: string
  platform?: string
  /** Son N saat içindeki kayıtlar */
  hours?: number
}

/** Sayfalanmış telemetri listesi. */
export async function getRtcTelemetry(opts: RtcTelemetryQuery = {}) {
  const page = Math.max(1, opts.page || 1)
  const limit = Math.min(200, Math.max(1, opts.limit || 50))

  const where: any = {}
  if (opts.context) where.context = opts.context
  if (opts.contextId) where.contextId = opts.contextId
  if (opts.userId) where.userId = opts.userId
  if (opts.qualityLevel) where.qualityLevel = opts.qualityLevel
  if (opts.platform) where.platform = opts.platform
  if (opts.hours && opts.hours > 0) {
    where.createdAt = { gte: new Date(Date.now() - opts.hours * 3600_000) }
  }

  const [items, total] = await Promise.all([
    prisma.rtcTelemetry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.rtcTelemetry.count({ where }),
  ])

  return { items, total, page, limit }
}

export interface RtcTelemetrySummary {
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

/**
 * §74 gözlemlenebilirlik özeti: son N saatteki ortalama kalite metrikleri ve
 * seviye/bağlam/platform dağılımı.
 */
export async function getRtcTelemetrySummary(
  hours = 24,
  filters: Pick<RtcTelemetryQuery, 'context' | 'platform'> = {}
): Promise<RtcTelemetrySummary> {
  const since = new Date(Date.now() - Math.max(1, hours) * 3600_000)
  const where: any = { createdAt: { gte: since } }
  if (filters.context) where.context = filters.context
  if (filters.platform) where.platform = filters.platform

  const [agg, byLevel, byContext, byPlatform] = await Promise.all([
    prisma.rtcTelemetry.aggregate({
      where,
      _count: { _all: true },
      _avg: {
        rttMs: true,
        packetLossPercent: true,
        jitterMs: true,
        bitrateKbps: true,
        qualityScore: true,
      },
      _sum: { reconnectCount: true, freezeCount: true },
    }),
    prisma.rtcTelemetry.groupBy({ by: ['qualityLevel'], where, _count: { _all: true } }),
    prisma.rtcTelemetry.groupBy({ by: ['context'], where, _count: { _all: true } }),
    prisma.rtcTelemetry.groupBy({ by: ['platform'], where, _count: { _all: true } }),
  ])

  const round = (v: number | null | undefined, d = 1) =>
    v === null || v === undefined ? null : Math.round(v * 10 ** d) / 10 ** d

  const toMap = (rows: any[], key: string) => {
    const out: Record<string, number> = {}
    for (const r of rows) out[r[key] ?? 'unknown'] = r._count?._all ?? 0
    return out
  }

  return {
    windowHours: hours,
    sampleCount: agg._count._all,
    averages: {
      rttMs: round(agg._avg.rttMs),
      packetLossPercent: round(agg._avg.packetLossPercent, 2),
      jitterMs: round(agg._avg.jitterMs),
      bitrateKbps: round(agg._avg.bitrateKbps),
      qualityScore: round(agg._avg.qualityScore, 0),
    },
    totals: {
      reconnects: agg._sum.reconnectCount ?? 0,
      freezes: agg._sum.freezeCount ?? 0,
    },
    levelCounts: toMap(byLevel, 'qualityLevel'),
    contextCounts: toMap(byContext, 'context'),
    platformCounts: toMap(byPlatform, 'platform'),
  }
}
