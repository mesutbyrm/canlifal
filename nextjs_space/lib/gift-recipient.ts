import { seatStaleThreshold } from '@/lib/voice-room-constants'

export class GiftRecipientError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

// Locks are held through the balance transaction: leaving a seat/ending a stream
// cannot interleave between recipient validation and the committed gift.
export async function assertGiftRecipient(tx: any, scope: 'voice' | 'stream', contextId: string, recipientId: string) {
  if (scope === 'voice') {
    const rooms = await tx.$queryRawUnsafe('SELECT "id" FROM "chat_rooms" WHERE "id" = $1 AND "isActive" = true FOR SHARE', contextId)
    if (!rooms.length) throw new GiftRecipientError('ROOM_CLOSED', 'Oda artık aktif değil')
    const seats = await tx.$queryRawUnsafe('SELECT "id" FROM "chat_presences" WHERE "roomId" = $1 AND "userId" = $2 AND "seatIndex" >= 0 AND "lastSeen" >= $3 FOR SHARE', contextId, recipientId, seatStaleThreshold())
    if (!seats.length) throw new GiftRecipientError('RECIPIENT_NOT_SEATED', 'Alıcı aktif bir koltukta olmalıdır')
    return
  }
  const streams = await tx.$queryRawUnsafe('SELECT "userId" FROM "video_streams" WHERE "id" = $1 AND "status" = \'live\' FOR UPDATE', contextId)
  if (!streams.length) throw new GiftRecipientError('STREAM_CLOSED', 'Yayın artık aktif değil')
  if (streams[0].userId === recipientId) return
  const guests = await tx.$queryRawUnsafe('SELECT "id" FROM "live_guest_sessions" WHERE "streamId" = $1 AND "userId" = $2 AND "status" = \'active\' AND "leftAt" IS NULL FOR SHARE', contextId, recipientId)
  if (guests.length) return
  const legacy = await tx.$queryRawUnsafe('SELECT "id" FROM "stream_co_broadcasters" WHERE "streamId" = $1 AND "userId" = $2 AND "status" = \'active\' AND "leftAt" IS NULL FOR SHARE', contextId, recipientId)
  if (!legacy.length) throw new GiftRecipientError('RECIPIENT_NOT_ACTIVE', 'Alıcı yayında aktif bir misafir olmalıdır')
}

export function parseGiftQuantity(value: unknown): number {
  const quantity = value === undefined ? 1 : Number(value)
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new GiftRecipientError('INVALID_QUANTITY', 'Hediye adedi 1 ile 100 arasında tam sayı olmalıdır')
  }
  return quantity
}

export async function lockGiftBalances(tx: any, userIds: (string | null | undefined)[]) {
  // Deterministic lock ordering prevents opposite-direction gifts deadlocking.
  for (const id of [...new Set(userIds.filter((id): id is string => !!id))].sort()) {
    await tx.$queryRawUnsafe('SELECT "id" FROM "users" WHERE "id" = $1 FOR UPDATE', id)
  }
}

export async function saveGiftReceipt(tx: any, recordId: string | null, body: unknown) {
  if (!recordId) return
  await tx.idempotencyRecord.update({ where: { id: recordId }, data: {
    status: 'completed', responseStatus: 200, responseBody: JSON.parse(JSON.stringify(body)),
  } })
}
