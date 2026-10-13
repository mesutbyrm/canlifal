import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'
import { activityTotals, ACTIVITY_TTL_MS, spanEnd } from '@/lib/room-activity-math'
import { giftPointAmount } from '@/lib/gift-points'

export const ROOM_ACTIVITY_COVERAGE = 'Faaliyet takibi etkinleştirildikten sonra gözlenen giriş ve koltuk aralıklarıdır. Sessiz kopuşlar son kalp atışından en fazla 60 saniye sonra biter. Konuşma süresi değildir; eski ziyaretler geriye dönük üretilmez. Boşalan oda bir faaliyet oturumunu kapatır.'

/** One room lock serializes observation, seat transitions and closure snapshots. No wallet writes. */
export async function syncRoomActivity(roomId: string, leavingUserId?: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRawUnsafe('SELECT "id" FROM "chat_rooms" WHERE "id" = $1 FOR UPDATE', roomId)
    const room = await tx.chatRoom.findUnique({ where: { id: roomId }, select: { ownerId: true, isActive: true } })
    const now = new Date(), cutoff = new Date(now.getTime() - ACTIVITY_TTL_MS)
    const present = room?.isActive ? await tx.chatPresence.findMany({ where: { roomId, lastSeen: { gt: cutoff } }, select: { userId: true, seatIndex: true, lastSeen: true } }) : []
    const presence = new Map(present.map(p => [p.userId,p]))
    let session = await tx.roomActivitySession.findUnique({ where: { openKey: roomId } })
    const open = await tx.roomActivitySpan.findMany({ where: { roomId, endedAt: null } })
    const continuing = new Set<string>(), changedVisits = new Map<string,string>()
    for (const span of open) {
      const p = presence.get(span.userId)
      const gap = !!p && p.lastSeen.getTime() - span.lastSeenAt.getTime() > ACTIVITY_TTL_MS
      const seatChanged = !!p && !gap && p.seatIndex !== span.seatIndex
      if (!p || gap || seatChanged) {
        const endedAt = seatChanged || leavingUserId === span.userId ? now : spanEnd(span, now)
        await tx.roomActivitySpan.update({ where: { id: span.id }, data: { endedAt, openKey: null, endReason: seatChanged ? 'seat_changed' : leavingUserId === span.userId ? 'leave' : !room?.isActive ? 'room_closed' : 'presence_timeout' } })
        if (seatChanged) changedVisits.set(span.userId, span.visitId)
      } else {
        continuing.add(span.userId)
        if (p.lastSeen > span.lastSeenAt) await tx.roomActivitySpan.update({ where: { id: span.id }, data: { lastSeenAt: p.lastSeen } })
      }
    }
    if (session && continuing.size === 0 && changedVisits.size === 0) {
      const spans = await tx.roomActivitySpan.findMany({ where: { sessionId: session.id } })
      const endedAt = new Date(Math.max(session.startedAt.getTime(), ...spans.map(s => spanEnd(s, now).getTime())))
      const gifts = await tx.chatRoomGift.findMany({ where: { roomId, createdAt: { gte: session.startedAt, lt: endedAt } }, select: { totalPrice: true, pointAmount: true, ownerAmount: true, receiverAmount: true, commissionAmount: true, recipientId: true } })
      const closureReport = {
        ...activityTotals(spans, session.startedAt, endedAt),
        giftCount: gifts.length, grossGiftJeton: gifts.reduce((s,g) => s + g.totalPrice, 0),
        giftPointTotal: gifts.reduce((s,g) => s + giftPointAmount(g), 0),
        netOwnerJeton: gifts.reduce((s,g) => s + (g.ownerAmount ?? (g.recipientId === session!.ownerId ? Math.max(0,g.totalPrice - g.commissionAmount) : 0)) + (g.recipientId === session!.ownerId ? (g.receiverAmount || 0) : 0), 0),
        coverage: ROOM_ACTIVITY_COVERAGE,
      }
      await tx.roomActivitySession.update({ where: { id: session.id }, data: { endedAt, openKey: null, closureReport } })
      session = null
    }
    if (!session && present.length > 0) session = await tx.roomActivitySession.create({ data: { roomId, ownerId: room?.ownerId, openKey: roomId, startedAt: now } })
    if (session) for (const p of present) {
      if (continuing.has(p.userId)) continue
      await tx.roomActivitySpan.create({ data: { sessionId: session.id, roomId, userId: p.userId, openKey: `${roomId}:${p.userId}`, visitId: changedVisits.get(p.userId) || randomUUID(), seatIndex: p.seatIndex, startedAt: now, lastSeenAt: new Date(Math.max(now.getTime(),p.lastSeen.getTime())) } })
    }
    return session
  }, { timeout: 15000 })
}

/** Report observation must not interrupt existing moderation/media/presence operations. */
export async function observeRoomActivity(roomId: string, leavingUserId?: string) {
  try { await syncRoomActivity(roomId, leavingUserId) } catch (error) { console.error('[room-activity] observation failed', error) }
}
