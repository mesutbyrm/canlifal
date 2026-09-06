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
  // BÖLÜM 2 — oda sunuculuğu (host) değişimi
  | 'host_changed'
  // Konuşma isteği (el kaldırma) akışı
  | 'voice_request'
  | 'hand_raised'
  | 'voice_request_cancelled'
  | 'voice_request_accepted'
  | 'voice_request_rejected'
  | 'voice_request_blocked'
  | 'voice_request_unblocked'
  // PK daveti
  | 'pk_invite'
  | 'pk_requested'

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
  /** BÖLÜM 2 — koltuğun türü: owner | guest | privileged */
  seatKind?: 'owner' | 'guest' | 'privileged'
  /** BÖLÜM 2 — odanın o anki etkin koltuk sayısı */
  seatCount?: number
  /** BÖLÜM 2 — host_changed */
  isHost?: boolean
  /** BÖLÜM 2 — kopya kontrolü için benzersiz olay kimliği (otomatik eklenir) */
  eventId?: string
  // owner_changed
  newOwnerId?: string
  newOwnerName?: string
  // voice_request*
  userName?: string
  avatar?: string | null
  requestId?: string
  message?: string
  reason?: string
  handledBy?: string
  handledByName?: string
  expiresAt?: string | null
  // pk_invite
  battleId?: string
  battle?: any
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

export function emitSeatChanged(
  roomId: string,
  userId: string,
  seatIndex: number,
  previousSeatIndex?: number,
  extra?: { seatKind?: 'owner' | 'guest' | 'privileged'; seatCount?: number; name?: string }
) {
  emit(roomId, { event: 'seat_changed', userId, seatIndex, previousSeatIndex, ...extra })
}

/**
 * BÖLÜM 2 — oda sunuculuğu (host) değişti: bir kullanıcı host koltuğuna oturdu
 * veya host yetkisi başkasına geçti. `isHost=false` host'un bıraktığını belirtir.
 */
export function emitHostChanged(roomId: string, userId: string, isHost: boolean, name?: string) {
  emit(roomId, { event: 'host_changed', userId, isHost, name })
}

export function emitRoomClosed(roomId: string) {
  emit(roomId, { event: 'room_closed' })
}

// ──────────── Konuşma isteği (el kaldırma) olayları ────────────

export interface SpeakRequestUser {
  userId: string
  userName?: string
  avatar?: string | null
}

/**
 * Kullanıcı konuşma isteği (el kaldırma) gönderdi.
 * Oda sahibi / admin / yetkili roller anlık popup için bunu dinler.
 * Geriye dönük uyumluluk için hem `voice_request` hem `hand_raised` yayınlanır
 * (Flutter tarafında iki isimden biri dinleniyor olabilir).
 */
export function emitVoiceRequest(
  roomId: string,
  user: SpeakRequestUser,
  extra?: { requestId?: string; message?: string }
) {
  const base = { userId: user.userId, userName: user.userName, avatar: user.avatar ?? null, ...extra }
  emit(roomId, { event: 'voice_request', name: user.userName, image: user.avatar ?? null, ...base })
  emit(roomId, { event: 'hand_raised', name: user.userName, image: user.avatar ?? null, ...base })
}

export function emitVoiceRequestCancelled(roomId: string, user: SpeakRequestUser, requestId?: string) {
  emit(roomId, {
    event: 'voice_request_cancelled',
    userId: user.userId,
    userName: user.userName,
    avatar: user.avatar ?? null,
    requestId
  })
}

export function emitVoiceRequestAccepted(
  roomId: string,
  user: SpeakRequestUser,
  opts?: { requestId?: string; handledBy?: string; handledByName?: string; seatIndex?: number; message?: string }
) {
  emit(roomId, {
    event: 'voice_request_accepted',
    userId: user.userId,
    userName: user.userName,
    avatar: user.avatar ?? null,
    message: opts?.message ?? 'Konuşma isteğiniz onaylandı.',
    ...opts
  })
}

export function emitVoiceRequestRejected(
  roomId: string,
  user: SpeakRequestUser,
  opts?: { requestId?: string; handledBy?: string; handledByName?: string; reason?: string; message?: string }
) {
  emit(roomId, {
    event: 'voice_request_rejected',
    userId: user.userId,
    userName: user.userName,
    avatar: user.avatar ?? null,
    message: opts?.message ?? 'Konuşma isteğiniz reddedildi.',
    ...opts
  })
}

export function emitVoiceRequestBlocked(
  roomId: string,
  user: SpeakRequestUser,
  opts?: { handledBy?: string; handledByName?: string; reason?: string; expiresAt?: string | null; message?: string }
) {
  emit(roomId, {
    event: 'voice_request_blocked',
    userId: user.userId,
    userName: user.userName,
    avatar: user.avatar ?? null,
    message: opts?.message ?? 'Bu odada konuşma isteği gönderme izniniz kaldırıldı.',
    ...opts
  })
}

export function emitVoiceRequestUnblocked(roomId: string, user: SpeakRequestUser, handledBy?: string) {
  emit(roomId, {
    event: 'voice_request_unblocked',
    userId: user.userId,
    userName: user.userName,
    avatar: user.avatar ?? null,
    handledBy,
    message: 'Konuşma isteği engeliniz kaldırıldı.'
  })
}

/**
 * PK daveti oluşturuldu — karşı oda sahibine anlık popup.
 * `pk_invite` ve `pk_requested` iki isimle de yayınlanır.
 */
export function emitPkInvite(roomId: string, battle: any, opts?: { userId?: string; userName?: string }) {
  const payload = { battleId: battle?.id, battle, userId: opts?.userId, userName: opts?.userName }
  emit(roomId, { event: 'pk_invite', ...payload })
  emit(roomId, { event: 'pk_requested', ...payload })
}

export function emitOwnerChanged(roomId: string, newOwnerId: string, newOwnerName?: string) {
  emit(roomId, { event: 'owner_changed', newOwnerId, newOwnerName })
}
