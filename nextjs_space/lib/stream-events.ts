/**
 * In-memory event store for video stream real-time events.
 * SSE streams poll this for changes (streamMessage, viewerCount, streamEnded).
 */

interface StreamEvent {
  /**
   * Benzersiz olay kimliği (F6 — spec 28). İstemciler SSE yeniden bağlanması /
   * tekrar oynatma yüzünden aynı olayı iki kez işlememek için bu değeri kullanır.
   */
  eventId: string
  timestamp: number
  type: 'streamMessage' | 'viewerCount' | 'streamEnded' | 'gift' | 'pk' | 'guest'
  data: any
}

let streamEventSeq = 0

/** Aynı milisaniyede bile benzersiz olay kimliği üretir. */
function nextStreamEventId(streamId: string): string {
  streamEventSeq = (streamEventSeq + 1) % 1_000_000
  return `${streamId}:${Date.now()}:${streamEventSeq}:${Math.random().toString(36).slice(2, 8)}`
}

// Per-stream event buffer: stores last N events per stream
const streamEventStore = new Map<string, StreamEvent[]>()

const MAX_EVENTS_PER_STREAM = 100
const EVENT_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Push an event into the stream's event buffer.
 */
export function emitStreamEvent(streamId: string, type: StreamEvent['type'], data: any) {
  const events = streamEventStore.get(streamId) || []
  const eventId = nextStreamEventId(streamId)
  // eventId'yi payload içine de enjekte et (mevcut istemciler için).
  if (data && typeof data === 'object' && !Array.isArray(data) && (data as any).eventId === undefined) {
    try { (data as any).eventId = eventId } catch { /* frozen — yoksay */ }
  }
  events.push({ eventId, timestamp: Date.now(), type, data })
  // Trim to max
  if (events.length > MAX_EVENTS_PER_STREAM) {
    events.splice(0, events.length - MAX_EVENTS_PER_STREAM)
  }
  streamEventStore.set(streamId, events)
}

/**
 * Get all events for a stream newer than the given timestamp.
 */
export function getStreamEventsSince(streamId: string, sinceTimestamp: number): StreamEvent[] {
  const events = streamEventStore.get(streamId) || []
  return events.filter(e => e.timestamp > sinceTimestamp)
}

/**
 * Cleanup old entries periodically.
 */
setInterval(() => {
  const cutoff = Date.now() - EVENT_TTL_MS
  for (const [streamId, events] of streamEventStore.entries()) {
    const filtered = events.filter(e => e.timestamp > cutoff)
    if (filtered.length === 0) {
      streamEventStore.delete(streamId)
    } else {
      streamEventStore.set(streamId, filtered)
    }
  }
}, 60 * 1000)
