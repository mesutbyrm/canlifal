import prisma from '@/lib/db'
import { expireAllStalePKs, PK_TIMEOUT_MS } from '@/lib/pk-expiry'

/**
 * SSE bağlantısı açılır açılmaz gönderilecek "bekleyen/aktif PK" anlık görüntüsü.
 *
 * Neden gerekli: olay veri yolu yalnızca ileriye dönük yayın yapar ve
 * `Last-Event-ID` göndermeyen taze bir istemci `Date.now()`'dan başlar.
 * Bu yüzden bağlantıdan hemen önce oluşmuş bir PK daveti istemciye hiç ulaşmaz.
 * Bu yardımcı, bağlantı anında mevcut durumu bir kez gönderip bu boşluğu kapatır.
 *
 * `sideId` hem oda kimliği hem yayın kimliği olabilir (PKBattle.stream1Id/stream2Id).
 * Hata durumunda akışı bozmamak için null döner.
 */
export async function getPkSnapshotEvent(sideId: string): Promise<Record<string, any> | null> {
  try {
    await expireAllStalePKs()

    const battle = await prisma.pKBattle.findFirst({
      where: {
        OR: [{ stream1Id: sideId }, { stream2Id: sideId }],
        status: { in: ['pending', 'active'] },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (!battle) return null

    const [u1, u2] = await Promise.all([
      prisma.user.findUnique({ where: { id: battle.user1Id }, select: { id: true, name: true, image: true } }),
      prisma.user.findUnique({ where: { id: battle.user2Id }, select: { id: true, name: true, image: true } }),
    ])

    const expiresAt =
      battle.status === 'pending'
        ? new Date(new Date(battle.createdAt).getTime() + PK_TIMEOUT_MS).toISOString()
        : battle.endsAt
          ? new Date(battle.endsAt).toISOString()
          : null

    return {
      type: 'pk',
      action: 'snapshot',
      snapshot: true,
      battleId: battle.id,
      status: battle.status,
      room1Id: battle.stream1Id,
      room2Id: battle.stream2Id,
      user1Id: battle.user1Id,
      user2Id: battle.user2Id,
      challengerName: u1?.name ?? null,
      opponentName: u2?.name ?? null,
      user1: u1,
      user2: u2,
      duration: battle.duration,
      score1: battle.score1,
      score2: battle.score2,
      mode: battle.mode,
      scope: battle.scope,
      startedAt: battle.startedAt ? new Date(battle.startedAt).toISOString() : null,
      endsAt: battle.endsAt ? new Date(battle.endsAt).toISOString() : null,
      expiresAt,
      timeoutSeconds: PK_TIMEOUT_MS / 1000,
    }
  } catch (e) {
    console.error('[pk-snapshot] error:', e)
    return null
  }
}
