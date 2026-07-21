/**
 * Canonical TRTC room identity helpers.
 *
 * IMPORTANT: Both the web client and the Flutter client MUST use the exact
 * same TRTC room id string so that they land in the same TRTC room and can
 * hear each other. Historically the web client computed this on the client
 * side as `voice_room_<chatRoomId>`. We now centralise it here and expose it
 * from the backend (see /api/trtc/token and /api/chat/rooms/[roomId]/state)
 * so no client hardcodes its own convention.
 */

/** Build the canonical TRTC (string) room id for a voice chat room. */
export function voiceTrtcRoomId(chatRoomId: string): string {
  // Keep backwards compatible with the existing web convention.
  if (!chatRoomId) return ''
  return chatRoomId.startsWith('voice_room_') ? chatRoomId : `voice_room_${chatRoomId}`
}

/**
 * Deterministic hash of a (string) user id → stable numeric UID.
 * Some TRTC SDK code paths need a numeric uid; this mirrors the logic that
 * was previously duplicated inside the voice endpoint so it stays identical
 * across web and Flutter.
 */
export function userIdToNumericUid(uid: string): number {
  let hash = 0
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash + uid.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 1000000000
}
