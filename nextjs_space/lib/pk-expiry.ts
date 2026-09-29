import prisma from '@/lib/db'
import { emitChatEvent } from '@/lib/chat-events'
import { emitStreamEvent } from '@/lib/stream-events'

/**
 * PK timeout in milliseconds.
 * If a PK request is not accepted within this time, it auto-expires.
 */
export const PK_TIMEOUT_MS = 60_000 // 60 seconds

/**
 * Check if a pending PK battle has expired (60s timeout).
 * If expired, update its status to 'expired' and emit events.
 * Returns the battle (possibly updated) or null.
 */
export async function expirePendingPK(battle: {
  id: string
  status: string
  createdAt: Date
  stream1Id: string
  stream2Id: string
  user1Id: string
  user2Id: string
} | null): Promise<typeof battle | null> {
  if (!battle) return null
  if (battle.status !== 'pending') return battle

  const elapsed = Date.now() - new Date(battle.createdAt).getTime()
  if (elapsed < PK_TIMEOUT_MS) return battle // Still within timeout

  // Expired — auto-cancel
  try {
    const updated = await prisma.pKBattle.update({
      where: { id: battle.id, status: 'pending' }, // Optimistic lock
      data: { status: 'expired', endedAt: new Date() },
    })

    // Emit expiry events to both rooms/streams
    const expireData = {
      battleId: battle.id,
      action: 'expired',
      room1Id: battle.stream1Id,
      room2Id: battle.stream2Id,
      user1Id: battle.user1Id,
      user2Id: battle.user2Id,
      status: 'expired',
      message: 'PK isteği zaman aşımına uğradı (60 saniye)',
    }

    // Try chat events (for chat room PKs)
    try {
      emitChatEvent(battle.stream1Id, 'pk', expireData)
      emitChatEvent(battle.stream2Id, 'pk', expireData)
    } catch { /* stream PK, not chat */ }

    // Try stream events (for video stream PKs)
    try {
      emitStreamEvent(battle.stream1Id, 'pk', expireData)
      emitStreamEvent(battle.stream2Id, 'pk', expireData)
    } catch { /* chat PK, not stream */ }

    console.log(`PK ${battle.id} expired after ${Math.round(elapsed / 1000)}s`)
    return { ...battle, status: 'expired' } as any
  } catch (e) {
    // If update fails (already changed by another request), just return null
    console.error('PK expiry update error:', e)
    return null
  }
}

/**
 * Expire all stale pending PKs globally.
 * Can be called periodically or on any PK-related request.
 */
// Global tarama her GET/SSE turunda çalışıyordu; süreç başına seyreltilir.
const SWEEP_MIN_INTERVAL_MS = 3000
let lastExpireSweepAt = 0

export async function expireAllStalePKs(opts?: { force?: boolean }): Promise<number> {
  const nowMs = Date.now()
  if (!opts?.force && nowMs - lastExpireSweepAt < SWEEP_MIN_INTERVAL_MS) return 0
  lastExpireSweepAt = nowMs
  const cutoff = new Date(nowMs - PK_TIMEOUT_MS)
  try {
    const stalePKs = await prisma.pKBattle.findMany({
      where: {
        status: 'pending',
        createdAt: { lt: cutoff },
      },
      select: {
        id: true, status: true, createdAt: true,
        stream1Id: true, stream2Id: true,
        user1Id: true, user2Id: true,
      },
    })

    let expired = 0
    for (const pk of stalePKs) {
      const result = await expirePendingPK(pk)
      if (result && (result as any).status === 'expired') expired++
    }
    return expired
  } catch (e) {
    console.error('expireAllStalePKs error:', e)
    return 0
  }
}