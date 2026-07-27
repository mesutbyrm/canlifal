/**
 * Shared voice-room constants used by both the web app and the Flutter mobile
 * client (via the same backend APIs). Keep these in one place so seat logic
 * stays consistent everywhere.
 */

// Total number of seats (mic slots) in a voice/audio chat room.
// NOTE: changed from 15 -> 11 for web + Flutter parity.
export const SEAT_COUNT = 11

// Highest valid seat index (0-based).
export const MAX_SEAT_INDEX = SEAT_COUNT - 1

/**
 * Returns the first free seat index in [0, SEAT_COUNT) given a set/array of
 * currently occupied seat indexes, or -1 if every seat is taken.
 */
export function findFirstFreeSeat(occupied: Iterable<number>): number {
  const taken = new Set<number>()
  for (const s of occupied) taken.add(s)
  for (let i = 0; i < SEAT_COUNT; i++) {
    if (!taken.has(i)) return i
  }
  return -1
}
