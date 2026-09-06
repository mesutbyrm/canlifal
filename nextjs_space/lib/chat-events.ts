/**
 * In-memory event bus for chat rooms.
 * Replaces DB polling in SSE streams.
 * Messages and presence changes are pushed here,
 * and SSE consumers pull from memory instead of querying DB.
 */

interface ChatEvent {
  /**
   * Benzersiz olay kimliği (BÖLÜM 2). İstemciler (web + Flutter) aynı olayın
   * SSE yeniden bağlanması / `Last-Event-ID` tekrar oynatması yüzünden iki kez
   * işlenmesini engellemek için bu değeri kullanmalıdır. Biçim:
   * `<roomId>:<epochMs>:<sayac>:<rastgele>`
   */
  eventId: string
  timestamp: number
  type: 'message' | 'presence' | 'typing' | 'system' | 'gift' | 'pk' | 'room'
  data: any
}

let eventSeq = 0

/** Olay kimliği üretici — aynı milisaniyede üretilen olaylar için de benzersiz. */
export function nextEventId(roomId: string): string {
  eventSeq = (eventSeq + 1) % 1_000_000
  return `${roomId}:${Date.now()}:${eventSeq}:${Math.random().toString(36).slice(2, 8)}`
}

// Per-room event buffer
const roomEvents = new Map<string, ChatEvent[]>()

const MAX_EVENTS_PER_ROOM = 200
const EVENT_TTL_MS = 2 * 60 * 1000 // 2 minutes

/**
 * Push a chat event into the room's event buffer.
 * Called by message POST, presence POST, etc.
 */
export function emitChatEvent(roomId: string, type: ChatEvent['type'], data: any) {
  const events = roomEvents.get(roomId) || []
  const eventId = nextEventId(roomId)
  // `eventId` hem zarfta hem de payload içinde taşınır; böylece SSE yayınını
  // payload düzeyinde okuyan mevcut istemciler de kopya kontrolü yapabilir.
  if (data && typeof data === 'object' && !Array.isArray(data) && (data as any).eventId === undefined) {
    try { (data as any).eventId = eventId } catch { /* dondurulmuş nesne — yoksay */ }
  }
  events.push({ eventId, timestamp: Date.now(), type, data })
  if (events.length > MAX_EVENTS_PER_ROOM) {
    events.splice(0, events.length - MAX_EVENTS_PER_ROOM)
  }
  roomEvents.set(roomId, events)
}

/**
 * Get all events for a room newer than the given timestamp.
 */
export function getChatEventsSince(roomId: string, sinceTimestamp: number): ChatEvent[] {
  const events = roomEvents.get(roomId) || []
  return events.filter(e => e.timestamp > sinceTimestamp)
}

/**
 * Get latest typing users from the event bus.
 * Returns user IDs/nicknames of users who sent typing events within the last 3 seconds.
 */
export function getTypingUsers(roomId: string, excludeUserId?: string): string[] {
  const cutoff = Date.now() - 3000
  const events = roomEvents.get(roomId) || []
  const typingMap = new Map<string, string>() // userId -> nickname
  for (const e of events) {
    if (e.type === 'typing' && e.timestamp > cutoff) {
      if (excludeUserId && e.data.userId === excludeUserId) continue
      typingMap.set(e.data.userId, e.data.nickname || 'User')
    }
  }
  return Array.from(typingMap.values())
}

// Cleanup old entries every 30 seconds
setInterval(() => {
  const cutoff = Date.now() - EVENT_TTL_MS
  for (const [roomId, events] of roomEvents.entries()) {
    const filtered = events.filter(e => e.timestamp > cutoff)
    if (filtered.length === 0) {
      roomEvents.delete(roomId)
    } else {
      roomEvents.set(roomId, filtered)
    }
  }
}, 30 * 1000)
