import prisma from '@/lib/db'
import { getPlatformSetting } from '@/lib/agency-commission'
import { emitStreamEvent } from '@/lib/stream-events'
import { createNotificationWithPush } from '@/lib/notify'

/**
 * Media-inactivity auto-close for live video streams.
 *
 * A broadcaster client pings POST /api/video-streams/:streamId/media-heartbeat
 * while it is actually publishing audio/video. If no heartbeat arrives for
 * `stream_media_inactivity_timeout` minutes (default 5), the stream is closed
 * server-side — this also covers the case where the broadcaster app was killed
 * and can no longer close the stream itself.
 *
 * Safety: streams that never sent a heartbeat (lastMediaAt = null) are NEVER
 * closed by this rule, so clients that do not send heartbeats yet keep working
 * exactly as before.
 */

const DEFAULT_TIMEOUT_MINUTES = 5

export async function getMediaInactivityTimeoutMs(): Promise<number> {
  const raw = await getPlatformSetting('stream_media_inactivity_timeout', String(DEFAULT_TIMEOUT_MINUTES))
  const minutes = parseInt(raw)
  if (!Number.isFinite(minutes) || minutes <= 0) return 0 // 0 => disabled
  return minutes * 60 * 1000
}

/** Close a single stream because its media went silent. */
export async function closeStreamForMediaInactivity(
  streamId: string,
  userId: string,
  timeoutMinutes: number
): Promise<void> {
  const now = new Date()

  const res = await prisma.videoStream.updateMany({
    where: { id: streamId, status: 'live' },
    data: { status: 'ended', endedAt: now, autoClosedAt: now },
  })
  if (res.count === 0) return // already closed by someone else

  await prisma.videoStreamViewer.updateMany({
    where: { streamId, leftAt: null },
    data: { leftAt: now },
  })

  emitStreamEvent(streamId, 'streamEnded', {
    type: 'streamEnded',
    streamId,
    reason: 'media_inactivity',
    timeoutMinutes,
    endedAt: now.toISOString(),
  })

  createNotificationWithPush({
    userId,
    type: 'stream_auto_closed',
    title: 'Yayın Otomatik Kapatıldı',
    message: `${timeoutMinutes} dakikadır görüntü/ses alınamadığı için yayınınız otomatik kapatıldı.`,
    data: JSON.stringify({ streamId, reason: 'media_inactivity' }),
  }).catch(() => {})
}

// Throttle the sweep so piggy-backing it on list requests stays cheap.
const SWEEP_INTERVAL_MS = 30 * 1000
let lastSweepAt = 0

/**
 * Close every live stream whose broadcaster media went silent past the timeout.
 * Throttled internally; safe to call on hot paths. Fire-and-forget friendly.
 */
export async function sweepMediaInactiveStreams(): Promise<number> {
  try {
    if (Date.now() - lastSweepAt < SWEEP_INTERVAL_MS) return 0
    lastSweepAt = Date.now()

    const timeoutMs = await getMediaInactivityTimeoutMs()
    if (timeoutMs <= 0) return 0

    const cutoff = new Date(Date.now() - timeoutMs)
    const stale = await prisma.videoStream.findMany({
      where: { status: 'live', lastMediaAt: { not: null, lt: cutoff } },
      select: { id: true, userId: true },
      take: 50,
    })
    if (stale.length === 0) return 0

    const timeoutMinutes = Math.round(timeoutMs / 60000)
    for (const s of stale) {
      await closeStreamForMediaInactivity(s.id, s.userId, timeoutMinutes)
    }
    return stale.length
  } catch (e) {
    console.error('[stream-auto-close] sweep error:', e)
    return 0
  }
}
