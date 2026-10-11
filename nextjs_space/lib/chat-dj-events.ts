import prisma from '@/lib/db'
import { publishEvent, registerBridgeHandler, touchBridge, type IncomingEvent } from './realtime-bridge'

/**
 * YENI MİMARİ (YouTube IFrame/embed):
 * Artık ham audio stream URL'si çözümlenmiyor (yt-dlp / Piped / Invidious BİRAKILDI).
 * Backend'in görevi sadece: videoId + startedAt + duration tutmak ve SSE üzerinden
 * yayınlamak. İstemci (Flutter/web) YouTube'un resmi embed oynatıcısıyla
 * `https://www.youtube.com/embed/{videoId}?autoplay=1&start={elapsed}` çalar.
 * Böylece YouTube CDN'inden doğrudan akış olur; extraction/proxy/429 sorunu kalmaz.
 */
function buildEmbedUrl(videoId: string, startSeconds: number): string {
  const s = Math.max(0, Math.floor(startSeconds))
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${s}&enablejsapi=1&playsinline=1`
}

/**
 * In-memory DJ event store. SSE streams poll this for changes.
 * Key: roomId, Value: { timestamp, payload }
 */
const djEventStore = new Map<string, { timestamp: number; payload: any }>()

/**
 * Build the full DJ payload for a room (used by SSE + REST endpoints).
 */
export async function buildDjPayload(roomId: string) {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: {
      currentMusicVideoId: true,
      currentMusicTitle: true,
      currentMusicStartedAt: true,
      currentMusicDuration: true,
    }
  })

  // Parse queue
  const requests = await prisma.chatMessage.findMany({
    where: {
      roomId,
      content: { startsWith: '[SONG_REQUEST' },
    },
    orderBy: { createdAt: 'asc' },
    take: 30,
    include: {
      user: { select: { id: true, name: true, username: true } }
    }
  })

  const queue = requests.map(msg => {
    const isPaid = msg.content.startsWith('[SONG_REQUEST_PAID]')
    const isPlayed = msg.content.includes('[PLAYED]')
    if (isPlayed) return null

    const prefix = isPaid ? '[SONG_REQUEST_PAID] ' : '[SONG_REQUEST_FREE] '
    const data = msg.content.replace(prefix, '')
    const parts = data.split('|')

    const typeTag = isPaid ? (parts[5] || 'AUDIO') : (parts[3] || 'AUDIO')
    return {
      id: msg.id,
      videoId: parts[0] || '',
      title: parts[1] || '',
      dedication: isPaid ? (parts[2] || '') : '',
      note: isPaid ? (parts[3] || '') : '',
      duration: isPaid ? (parts[4] || '') : (parts[2] || ''),
      requestType: typeTag === 'VIDEO' ? 'video' : 'audio',
      isPaid,
      userId: msg.userId,
      userName: msg.user?.name || msg.user?.username || 'Anonim',
      createdAt: msg.createdAt,
    }
  }).filter(Boolean)

  queue.sort((a: any, b: any) => {
    if (a.isPaid && !b.isPaid) return -1
    if (!a.isPaid && b.isPaid) return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const playing = !!room?.currentMusicVideoId

  // Senkron için: startedAt'tan geçen süreyi hesapla. Tüm istemciler aynı
  // videoId'yi aynı elapsed konumdan yükler → cihazlar arası senkron (~1-2 sn).
  const startedAtDate = room?.currentMusicStartedAt || null
  const startedAtMs = startedAtDate ? new Date(startedAtDate).getTime() : null
  const elapsedSeconds = startedAtMs ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)) : 0

  const embedUrl = room?.currentMusicVideoId
    ? buildEmbedUrl(room.currentMusicVideoId, elapsedSeconds)
    : null

  const nowPlaying = room?.currentMusicVideoId ? {
    videoId: room.currentMusicVideoId,
    title: room.currentMusicTitle || '',
    startedAt: startedAtDate,
    startedAtMs,
    elapsedSeconds,
    duration: room.currentMusicDuration || '',
    embedUrl,
  } : null

  return {
    type: 'dj' as const,
    event: 'QUEUE_UPDATED',
    playing,
    nowPlaying,
    // Geriye dönük uyumluluk: musicUrl artık embed URL'sidir (ham stream değil).
    musicUrl: embedUrl,
    embedUrl,
    musicQueue: queue,
    // Flutter alias — aynı tam dizi
    queue,
    queueLength: queue.length,
  }
}

/**
 * Emit a DJ update event for a room.
 * This stores the event in memory; SSE streams pick it up on next poll cycle.
 */
export async function emitDjUpdate(roomId: string) {
  try {
    const payload = await buildDjPayload(roomId)
    djEventStore.set(roomId, { timestamp: Date.now(), payload })
    const eventId = `${roomId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
    publishEvent('dj', roomId, 'dj', eventId, payload)
  } catch (error) {
    console.error('emitDjUpdate error:', error)
  }
}

/**
 * Baska bir sunucu orneginden gelen DJ olayini yerel depoya yazar.
 * Zaman damgasi olarak YEREL varis ani kullanilir; boylece istemcinin
 * `since` imleci yuzunden olay dusmez.
 */
export function __ingestRemoteDjEvent(ev: IncomingEvent) {
  if (!ev?.data) return
  djEventStore.set(ev.scope, { timestamp: Date.now(), payload: ev.data })
}

registerBridgeHandler('dj', __ingestRemoteDjEvent)

/**
 * Get the latest DJ event for a room if it's newer than the given timestamp.
 * Returns null if no new event.
 */
export function getLatestDjEvent(roomId: string, sinceTimestamp: number): any | null {
  touchBridge()
  const entry = djEventStore.get(roomId)
  if (entry && entry.timestamp > sinceTimestamp) {
    return entry.payload
  }
  return null
}

// Cleanup old entries every 5 minutes
const djCleanupTimer = setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000
  for (const [key, val] of djEventStore.entries()) {
    if (val.timestamp < cutoff) djEventStore.delete(key)
  }
}, 5 * 60 * 1000)
if (typeof djCleanupTimer.unref === 'function') djCleanupTimer.unref()
