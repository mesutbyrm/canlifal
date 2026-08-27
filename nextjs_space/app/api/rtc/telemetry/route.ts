export const dynamic = 'force-dynamic'

/**
 * Faz 15 — POST /api/v1/rtc/telemetry (§76)
 *
 * İstemci (web veya mobil) WebRTC bağlantı kalite metriklerini periyodik olarak
 * buraya gönderir. Tamamen yeni bir uçtur; mevcut sinyalleşme uçlarına
 * (/api/room/signal, /api/video-streams/signal) dokunulmamıştır.
 *
 * Yanit zarfi: yeni uç standardı (apiSuccess / apiError).
 * Tekil veya toplu (batch, en fazla 20 örüntü) gönderim destekler.
 *
 * Gizlilik: IP, çerez veya medya içeriği saklanmaz.
 */

import { NextRequest } from 'next/server'
import { resolveUser } from '@/lib/rbac'
import { apiSuccess, apiError, apiUnauthorized, apiValidation } from '@/lib/api-response'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { recordRtcTelemetry, RtcTelemetryInput } from '@/lib/rtc-telemetry'

const ALLOWED_CONTEXTS = new Set(['live_session', 'voice_room', 'video_stream', 'pk'])
const MAX_BATCH = 20

function pickSample(raw: any, userId: string): RtcTelemetryInput | null {
  if (!raw || typeof raw !== 'object') return null
  const context = typeof raw.context === 'string' ? raw.context : ''
  if (!ALLOWED_CONTEXTS.has(context)) return null

  return {
    userId,
    context,
    contextId: raw.contextId ?? raw.sessionId ?? raw.roomId ?? raw.streamId ?? null,
    peerId: raw.peerId ?? null,
    connectionState: raw.connectionState ?? null,
    iceState: raw.iceState ?? raw.iceConnectionState ?? null,
    reconnectCount: raw.reconnectCount,
    rttMs: raw.rttMs ?? raw.rtt ?? null,
    packetLossPercent: raw.packetLossPercent ?? raw.packetLoss ?? null,
    jitterMs: raw.jitterMs ?? raw.jitter ?? null,
    bitrateKbps: raw.bitrateKbps ?? raw.bitrate ?? null,
    freezeCount: raw.freezeCount,
    freezeDurationMs: raw.freezeDurationMs,
    durationSeconds: raw.durationSeconds ?? raw.duration ?? 0,
    platform: raw.platform ?? null,
    networkType: raw.networkType ?? null,
    metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : null,
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    const limited = await guardRateLimit(req, 'rtc_telemetry', { userId: user.id })
    if (limited) return limited

    let body: any
    try {
      body = await req.json()
    } catch {
      return apiValidation('Geçersiz istek gövdesi')
    }

    const rawSamples: any[] = Array.isArray(body?.samples)
      ? body.samples.slice(0, MAX_BATCH)
      : [body]

    const samples = rawSamples
      .map((r) => pickSample(r, user.id))
      .filter((s): s is RtcTelemetryInput => s !== null)

    if (samples.length === 0) {
      return apiValidation(
        'Geçerli ölçüm bulunamadı. `context` alanı live_session, voice_room, video_stream veya pk olmalı.'
      )
    }

    const results = await Promise.all(samples.map((s) => recordRtcTelemetry(s)))
    const accepted = results.filter(Boolean)

    return apiSuccess({
      accepted: accepted.length,
      rejected: samples.length - accepted.length,
      quality: accepted.map((r: any) => ({
        id: r.id,
        qualityScore: r.qualityScore,
        qualityLevel: r.qualityLevel,
      })),
    })
  } catch (e) {
    console.error('[RtcTelemetry] POST error:', e)
    return apiError('INTERNAL_ERROR', 'Telemetri kaydı alınamadı', 500)
  }
}
