import prisma from '@/lib/db'
import { emitTellerEvent } from '@/lib/room-events'

/**
 * Canlı fal seans yaşam döngüsü — atomik durum geçişleri.
 *
 * FORTUNE-001: kabul / tamamla / iptal okuma-kontrol-güncelle yerine
 * `updateMany(where: { id, status })` ile yapılır; aynı anda gelen iki istekten
 * yalnız biri geçişi yapar (çift oda, çift kazanç, çift iade olmaz).
 *
 * FORTUNE-002: yanıtlanmayan `pending` istekler [PENDING_SESSION_TTL_MS]
 * sonunda iptal edilir ve jeton iade edilir; falcının listesine bir daha
 * gelmez. (Mobil bekleme ekranı 180 sn; falcı tarafı 175 sn sonra gizler.)
 */
export const PENDING_SESSION_TTL_MS = 180_000

export function pendingCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - PENDING_SESSION_TTL_MS)
}

/** Deterministik oda kimliği — aynı seans her zaman aynı odaya gider. */
export function roomIdForSession(sessionId: string): string {
  return `room_${sessionId}`
}

/**
 * `from` durumlarından birindeyse seansı `data` ile günceller; geçişi bu çağrı
 * yaptıysa `refundTo` kullanıcısına `refundAmount` jeton iade eder (aynı
 * işlemde). Dönen değer: geçiş bu çağrıyla mı yapıldı.
 */
export async function transitionLiveSession(params: {
  sessionId: string
  from: string[]
  data: Record<string, unknown>
  refundTo?: string
  refundAmount?: number
}): Promise<boolean> {
  const { sessionId, from, data, refundTo, refundAmount } = params
  return prisma.$transaction(async (tx) => {
    const res = await tx.liveSession.updateMany({
      where: { id: sessionId, status: { in: from } },
      data,
    })
    if (res.count !== 1) return false
    if (refundTo && refundAmount && refundAmount > 0) {
      await tx.user.update({
        where: { id: refundTo },
        data: { jetonBalance: { increment: refundAmount } },
      })
    }
    return true
  })
}

/**
 * Süresi dolmuş bekleyen istekleri iptal eder + iade eder. Hata fırlatmaz
 * (çağıran SSE/GET akışı bozulmasın). Dönen değer: iptal edilen seans sayısı.
 */
export async function expireStalePendingSessions(opts: {
  tellerId?: string
  userId?: string
}): Promise<number> {
  try {
    const stale = await prisma.liveSession.findMany({
      where: {
        status: 'pending',
        createdAt: { lt: pendingCutoff() },
        ...(opts.tellerId ? { tellerId: opts.tellerId } : {}),
        ...(opts.userId ? { userId: opts.userId } : {}),
      },
      select: { id: true, tellerId: true, userId: true, creditsCharged: true },
      take: 50,
    })
    let expired = 0
    for (const s of stale) {
      const done = await transitionLiveSession({
        sessionId: s.id,
        from: ['pending'],
        data: { status: 'cancelled', endedAt: new Date() },
        refundTo: s.userId,
        refundAmount: s.creditsCharged,
      })
      if (!done) continue
      expired++
      emitTellerEvent(s.tellerId, 'session_cancelled', {
        sessionId: s.id,
        action: 'expired',
      })
    }
    return expired
  } catch (e) {
    console.error('[live-session] expire pending error:', e)
    return 0
  }
}
