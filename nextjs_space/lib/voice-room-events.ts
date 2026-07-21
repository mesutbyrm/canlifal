/**
 * Typed real-time event emitters for voice chat rooms.
 *
 * These push onto the SAME in-memory event bus used by chat messages/gifts
 * (see lib/chat-events.ts) under the dedicated `room` event type. The SSE
 * endpoint (/api/chat/rooms/[roomId]/stream) forwards them to every connected
 * client (web AND Flutter) as an SSE payload of `type: 'room_event'`.
 *
 * Adding new event kinds here is safe for the web client because it ignores
 * unknown SSE payload types; Flutter subscribes to `room_event` and switches
 * on the `event` field.
 */
import { emitChatEvent } from '@/lib/chat-events'

export type RoomEventKind =
  | 'user_joined'
  | 'user_left'
  | 'mic_changed'
  | 'seat_changed'
  | 'room_closed'
  | 'owner_changed'

export interface RoomEventPayload {
  event: RoomEventKind
  roomId: string
  userId?: string
  // user_joined / user_left
  name?: string
  image?: string | null
  // mic_changed
  micOn?: boolean
  // seat_changed
  seatIndex?: number
  previousSeatIndex?: number
  // owner_changed
  newOwnerId?: string
  newOwnerName?: string
  ts: number
}

function emit(roomId: string, payload: Omit<RoomEventPayload, 'roomId' | 'ts'>) {
  try {
    emitChatEvent(roomId, 'room', { roomId, ts: Date.now(), ...payload })
  } catch (e) {
    // Never let realtime emission break the primary DB mutation.
    console.error('[voice-room-events] emit failed', e)
  }
}

export function emitUserJoined(roomId: string, userId: string, name?: string, image?: string | null) {
  emit(roomId, { event: 'user_joined', userId, name, image })
}

export function emitUserLeft(roomId: string, userId: string, name?: string) {
  emit(roomId, { event: 'user_left', userId, name })
}

export function emitMicChanged(roomId: string, userId: string, micOn: boolean, name?: string) {
  emit(roomId, { event: 'mic_changed', userId, micOn, name })
}

export function emitSeatChanged(roomId: string, userId: string, seatIndex: number, previousSeatIndex?: number) {
  emit(roomId, { event: 'seat_changed', userId, seatIndex, previousSeatIndex })
}

export function emitRoomClosed(roomId: string) {
  emit(roomId, { event: 'room_closed' })
}

export function emitOwnerChanged(roomId: string, newOwnerId: string, newOwnerName?: string) {
  emit(roomId, { event: 'owner_changed', newOwnerId, newOwnerName })
}
