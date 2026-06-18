/**
 * In-memory event bus for live fortune session rooms.
 * SSE streams poll this for real-time message and session updates.
 * Replaces 3s polling with near-instant event delivery.
 */

interface RoomEvent {
  timestamp: number
  type: 'message' | 'timer_started' | 'time_extended' | 'session_ended' | 'ping' | 'system'
  data: any
}

interface TellerEvent {
  timestamp: number
  type: 'session_request' | 'session_cancelled'
  data: any
}

// Per-session event buffer for room messages
const sessionEvents = new Map<string, RoomEvent[]>()

// Per-teller event buffer for incoming requests
const tellerEvents = new Map<string, TellerEvent[]>()

const MAX_EVENTS = 100
const EVENT_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Push a room event (message, timer, etc.)
 */
export function emitRoomEvent(sessionId: string, type: RoomEvent['type'], data: any) {
  const events = sessionEvents.get(sessionId) || []
  events.push({ timestamp: Date.now(), type, data })
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS)
  }
  sessionEvents.set(sessionId, events)
}

/**
 * Get room events since a timestamp
 */
export function getRoomEventsSince(sessionId: string, sinceTimestamp: number): RoomEvent[] {
  const events = sessionEvents.get(sessionId) || []
  return events.filter(e => e.timestamp > sinceTimestamp)
}

/**
 * Push a teller event (incoming session request)
 */
export function emitTellerEvent(tellerId: string, type: TellerEvent['type'], data: any) {
  const events = tellerEvents.get(tellerId) || []
  events.push({ timestamp: Date.now(), type, data })
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS)
  }
  tellerEvents.set(tellerId, events)
}

/**
 * Get teller events since a timestamp
 */
export function getTellerEventsSince(tellerId: string, sinceTimestamp: number): TellerEvent[] {
  const events = tellerEvents.get(tellerId) || []
  return events.filter(e => e.timestamp > sinceTimestamp)
}

/**
 * Clear session events (on session end)
 */
export function clearRoomEvents(sessionId: string) {
  sessionEvents.delete(sessionId)
}

// Cleanup old entries periodically
setInterval(() => {
  const cutoff = Date.now() - EVENT_TTL_MS
  for (const [id, events] of sessionEvents.entries()) {
    const filtered = events.filter(e => e.timestamp > cutoff)
    if (filtered.length === 0) sessionEvents.delete(id)
    else sessionEvents.set(id, filtered)
  }
  for (const [id, events] of tellerEvents.entries()) {
    const filtered = events.filter(e => e.timestamp > cutoff)
    if (filtered.length === 0) tellerEvents.delete(id)
    else tellerEvents.set(id, filtered)
  }
}, 60 * 1000)
