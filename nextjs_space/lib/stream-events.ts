/**
 * In-memory event store for video stream real-time events.
 * SSE streams poll this for changes (streamMessage, viewerCount, streamEnded).
 */

interface StreamEvent {
  timestamp: number
  type: 'streamMessage' | 'viewerCount' | 'streamEnded' | 'gift'
  data: any
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
  events.push({ timestamp: Date.now(), type, data })
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
