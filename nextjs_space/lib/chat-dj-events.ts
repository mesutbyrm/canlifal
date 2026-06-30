import prisma from '@/lib/db'
import { resolveYoutubeStream } from '@/lib/youtube-stream-resolver'

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
  const nowPlaying = room?.currentMusicVideoId ? {
    videoId: room.currentMusicVideoId,
    title: room.currentMusicTitle || '',
    startedAt: room.currentMusicStartedAt,
    duration: room.currentMusicDuration || '',
  } : null

  // musicUrl çözümle: paylaşılan resolver (çoklu Piped + Invidious) kullan,
  // başarısız olursa YouTube watch URL'sine düş.
  let musicUrl: string | null = null
  if (room?.currentMusicVideoId) {
    musicUrl = `https://www.youtube.com/watch?v=${room.currentMusicVideoId}`
    try {
      const resolved = await resolveYoutubeStream(room.currentMusicVideoId)
      if (resolved?.audioUrl) musicUrl = resolved.audioUrl
      else if (resolved?.videoUrl) musicUrl = resolved.videoUrl
    } catch { /* çözümleme başarısız → YouTube URL'sini koru */ }
  }

  return {
    type: 'dj' as const,
    event: 'QUEUE_UPDATED',
    playing,
    nowPlaying,
    musicUrl,
    musicQueue: queue,
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
  } catch (error) {
    console.error('emitDjUpdate error:', error)
  }
}

/**
 * Get the latest DJ event for a room if it's newer than the given timestamp.
 * Returns null if no new event.
 */
export function getLatestDjEvent(roomId: string, sinceTimestamp: number): any | null {
  const entry = djEventStore.get(roomId)
  if (entry && entry.timestamp > sinceTimestamp) {
    return entry.payload
  }
  return null
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000
  for (const [key, val] of djEventStore.entries()) {
    if (val.timestamp < cutoff) djEventStore.delete(key)
  }
}, 5 * 60 * 1000)
