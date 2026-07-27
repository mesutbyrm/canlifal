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

// How long (ms) a seat stays reserved for its occupant after their last
// heartbeat. Clients (web + Flutter) MUST send a presence heartbeat every
// ~15s. If two heartbeats are missed (>45s) the occupant is treated as gone
// and their seat is freed immediately — this fixes the "seat looks empty but
// I can't sit" ghost-seat bug when a user closes the app / loses network
// without a clean leave. This is intentionally MUCH shorter than the 5-minute
// presence-list window so seats free up fast.
export const SEAT_STALE_MS = 45000

/**
 * Threshold Date for seat-occupancy queries: a seat is only considered taken
 * if its occupant's lastSeen is newer than this. Use everywhere a seat is
 * read/validated so the seat map and the "is seat taken" write-check agree.
 */
export function seatStaleThreshold(): Date {
  return new Date(Date.now() - SEAT_STALE_MS)
}

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
