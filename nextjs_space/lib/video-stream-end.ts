import prisma from '@/lib/db'
import { emitStreamEvent } from '@/lib/stream-events'
import { endPksForSide } from '@/lib/pk-state'
import { closeGuestStateForStream } from '@/lib/live-guest'
import { closeGiftBoxesFor } from '@/lib/gift-box'
import { staffCan } from '@/lib/permissions'

/** Yayını kapatabilen yetkililer (yayın sahibi dışında). */
export async function canStaffEndStream(role: string | null | undefined, userId: string | null | undefined) {
  return staffCan(role, userId, 'moderation.room.manage', ['admin', 'yonetici', 'kurucu', 'moderator'])
}

/**
 * Yayın bittiğinde yapılması gerekenlerin tamamı: izleyicilere/yayıncıya
 * `streamEnded` olayı, izleyicileri çıkarma, PK, misafirlik ve hediye
 * kutularını kapatma. Yalnız durumu `ended` yapmak yetmez: o zaman yayıncı
 * ve izleyiciler yayının bittiğini öğrenemez.
 */
export async function finalizeStreamEnd(streamId: string) {
  emitStreamEvent(streamId, 'streamEnded', {
    type: 'streamEnded',
    event: 'STREAM_ENDED',
    streamId,
  })
  await prisma.videoStreamViewer.updateMany({
    where: { streamId, leftAt: null },
    data: { leftAt: new Date() },
  })
  await endPksForSide([streamId], 'LIVE_ENDED').catch(() => {})
  await closeGuestStateForStream(streamId, 'LIVE_ENDED').catch(() => {})
  await closeGiftBoxesFor({ streamId }).catch(() => {})
}
