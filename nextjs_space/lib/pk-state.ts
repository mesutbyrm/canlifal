/**
 * lib/pk-state.ts — PK için tek kanonik durum makinesi ve otomatik kapatma yardımcıları.
 *
 * Hem canlı yayın PK'sı (`/api/video-streams/pk`) hem de sesli oda PK'sı
 * (`/api/chat/rooms/[roomId]/pk`) aynı `PKBattle` tablosunu kullanır:
 *   stream1Id / stream2Id → canlı yayında streamId, sesli odada roomId.
 *
 * Bu dosya şunları merkezîleştirir:
 *   1. İzinli durum geçişleri (illegal geçişler backend'de reddedilir)
 *   2. Sonuç hesabı (kazanan taraf / berabere)
 *   3. Süresi dolan aktif PK'ların otomatik bitirilmesi
 *   4. Yayın kapanması / oda kapanması / taraf ayrılması durumunda otomatik bitirme
 *
 * Veritabanındaki status değerleri DEĞİŞTİRİLMEDİ (geriye dönük uyum):
 *   pending | active | completed | cancelled | rejected | expired
 */

import prisma from '@/lib/db'
import { emitChatEvent } from '@/lib/chat-events'
import { emitStreamEvent } from '@/lib/stream-events'

export type PkStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'expired'

/** Şartnamedeki mantıksal adların veritabanı karşılıkları. */
export const PK_STATE_ALIASES: Record<string, PkStatus> = {
  REQUESTED: 'pending',
  PENDING: 'pending',
  ACCEPTED: 'active',
  ACTIVE: 'active',
  ENDED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
}

export const PK_TERMINAL_STATUSES: PkStatus[] = ['completed', 'cancelled', 'rejected', 'expired']

/** İzinli geçişler. Burada olmayan her geçiş yasaktır. */
const PK_TRANSITIONS: Record<PkStatus, PkStatus[]> = {
  pending: ['active', 'rejected', 'cancelled', 'expired'],
  active: ['completed'],
  completed: [],
  cancelled: [],
  rejected: [],
  expired: [],
}

const STATUS_LABEL_TR: Record<string, string> = {
  pending: 'beklemede',
  active: 'aktif',
  completed: 'bitmiş',
  cancelled: 'iptal edilmiş',
  rejected: 'reddedilmiş',
  expired: 'süresi dolmuş',
}

/**
 * Geçiş geçerli mi? Geçerliyse null, değilse Türkçe hata mesajı döner.
 */
export function checkPkTransition(from: string, to: PkStatus): string | null {
  const current = (from || '') as PkStatus
  const allowed = PK_TRANSITIONS[current]
  if (!allowed) return `Bilinmeyen PK durumu: ${from}`
  if (current === to) return `PK zaten ${STATUS_LABEL_TR[to] ?? to}`
  if (!allowed.includes(to)) {
    return `Bu işlem yapılamaz: PK durumu "${STATUS_LABEL_TR[current] ?? current}", "${STATUS_LABEL_TR[to] ?? to}" olamaz`
  }
  return null
}

/** Skorlardan kazananı hesaplar. */
export function computePkOutcome(battle: { score1: number; score2: number; user1Id: string; user2Id: string }) {
  if (battle.score1 > battle.score2) return { winnerId: battle.user1Id, winnerSide: 1, isDraw: false }
  if (battle.score2 > battle.score1) return { winnerId: battle.user2Id, winnerSide: 2, isDraw: false }
  return { winnerId: null as string | null, winnerSide: null as number | null, isDraw: true }
}

/** Her iki tarafa da (hem chat hem stream veri yoluna) olay yayınlar. */
export function emitPkToBothSides(battle: { stream1Id: string; stream2Id: string }, payload: any) {
  for (const id of [battle.stream1Id, battle.stream2Id]) {
    try { emitStreamEvent(id, 'pk', payload) } catch { /* sesli oda PK'sı */ }
    try { emitChatEvent(id, 'pk', payload) } catch { /* yayın PK'sı */ }
  }
}

type BattleRow = {
  id: string
  status: string
  stream1Id: string
  stream2Id: string
  user1Id: string
  user2Id: string
  score1: number
  score2: number
}

/**
 * Aktif bir PK'yı bitirir. Yalnızca `active` durumundakiler etkilenir
 * (optimistic lock ile yarış koşulu engellenir).
 *
 * @param reason PK_ENDED nedeni: TIME_UP | HOST_LEFT | ROOM_CLOSED | LIVE_ENDED |
 *               CONNECTION_LOST | ADMIN_ENDED | MANUAL
 */
export async function finishPkBattle(battle: BattleRow, reason: string) {
  const outcome = computePkOutcome(battle)
  try {
    const updated = await prisma.pKBattle.update({
      where: { id: battle.id, status: 'active' },
      data: {
        status: 'completed',
        endedAt: new Date(),
        winnerId: outcome.winnerId,
        winnerSide: outcome.winnerSide,
        isDraw: outcome.isDraw,
      },
    })

    emitPkToBothSides(battle, {
      type: 'pk',
      battleId: battle.id,
      action: 'completed',
      eventType: 'PK_ENDED',
      reason,
      room1Id: battle.stream1Id,
      room2Id: battle.stream2Id,
      user1Id: battle.user1Id,
      user2Id: battle.user2Id,
      score1: updated.score1,
      score2: updated.score2,
      winnerId: outcome.winnerId,
      winnerSide: outcome.winnerSide,
      isDraw: outcome.isDraw,
      status: 'completed',
    })
    return updated
  } catch {
    // Başka bir istek bitirmiş olabilir — sessizce geç.
    return null
  }
}

/** Bekleyen bir PK'yı verilen nedenle kapatır (iptal/red/süre dolumu dışı otomatik kapanışlar). */
export async function abortPendingPk(battle: BattleRow, status: 'cancelled' | 'expired', reason: string) {
  try {
    await prisma.pKBattle.update({
      where: { id: battle.id, status: 'pending' },
      data: { status, endedAt: new Date() },
    })
    emitPkToBothSides(battle, {
      type: 'pk',
      battleId: battle.id,
      action: status,
      eventType: status === 'cancelled' ? 'PK_REQUEST_CANCELLED' : 'PK_EXPIRED',
      reason,
      room1Id: battle.stream1Id,
      room2Id: battle.stream2Id,
      user1Id: battle.user1Id,
      user2Id: battle.user2Id,
      status,
    })
    return true
  } catch {
    return false
  }
}

const BATTLE_SELECT = {
  id: true, status: true, stream1Id: true, stream2Id: true,
  user1Id: true, user2Id: true, score1: true, score2: true,
} as const

/**
 * Süresi dolmuş aktif PK'ları backend tarafında bitirir.
 * İstemcinin "end" çağırmasına gerek kalmaz; sayaç sunucu saatiyle kanoniktir.
 */
export async function finalizeExpiredActivePKs(): Promise<number> {
  try {
    const now = new Date()
    const stale = await prisma.pKBattle.findMany({
      where: { status: 'active', endsAt: { not: null, lte: now } },
      select: BATTLE_SELECT,
      take: 50,
    })
    let count = 0
    for (const b of stale) {
      const done = await finishPkBattle(b as BattleRow, 'TIME_UP')
      if (done) count++
    }
    return count
  } catch (e) {
    console.error('finalizeExpiredActivePKs error:', e)
    return 0
  }
}

/**
 * Verilen yayın/oda kimliklerine ait bekleyen veya aktif tüm PK'ları kapatır.
 * Yayın sona erdiğinde, oda kapandığında veya sunucu ayrıldığında çağrılır.
 */
export async function endPksForSide(sideIds: string[], reason: string): Promise<number> {
  const ids = sideIds.filter(Boolean)
  if (ids.length === 0) return 0
  try {
    const battles = await prisma.pKBattle.findMany({
      where: {
        status: { in: ['pending', 'active'] },
        OR: [{ stream1Id: { in: ids } }, { stream2Id: { in: ids } }],
      },
      select: BATTLE_SELECT,
    })
    let count = 0
    for (const b of battles) {
      if (b.status === 'active') {
        if (await finishPkBattle(b as BattleRow, reason)) count++
      } else if (await abortPendingPk(b as BattleRow, 'cancelled', reason)) {
        count++
      }
    }
    return count
  } catch (e) {
    console.error('endPksForSide error:', e)
    return 0
  }
}

/**
 * Bir PK'nın tarafları hâlâ yayında/odada mı? Değilse PK otomatik kapatılır.
 * GET isteklerinde tembel (lazy) temizlik olarak kullanılır — ek zamanlayıcı gerekmez.
 */
export async function ensurePkSidesAlive(battle: BattleRow): Promise<boolean> {
  if (battle.status !== 'pending' && battle.status !== 'active') return true
  const ids = [battle.stream1Id, battle.stream2Id]
  try {
    const [streams, rooms] = await Promise.all([
      prisma.videoStream.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } }),
      prisma.chatRoom.findMany({ where: { id: { in: ids } }, select: { id: true, isActive: true } }),
    ])
    const streamMap = new Map(streams.map((s) => [s.id, s]))
    const roomMap = new Map(rooms.map((r) => [r.id, r]))

    for (const id of ids) {
      const s = streamMap.get(id)
      const r = roomMap.get(id)
      // Taraf hiçbir tabloda yoksa (silinmiş kayıt) veya kapanmışsa PK yaşayamaz.
      const alive = (s ? s.status === 'live' : false) || (r ? r.isActive : false)
      if (!alive) {
        const reason = s ? 'LIVE_ENDED' : r ? 'ROOM_CLOSED' : 'HOST_LEFT'
        if (battle.status === 'active') await finishPkBattle(battle, reason)
        else await abortPendingPk(battle, 'cancelled', reason)
        return false
      }
    }
    return true
  } catch (e) {
    console.error('ensurePkSidesAlive error:', e)
    return true
  }
}

/** Bir kullanıcının bekleyen/aktif PK'sı var mı? (çift PK engeli) */
export async function findBlockingPk(userIds: string[], sideIds: string[]) {
  return prisma.pKBattle.findFirst({
    where: {
      status: { in: ['pending', 'active'] },
      OR: [
        { user1Id: { in: userIds } },
        { user2Id: { in: userIds } },
        { stream1Id: { in: sideIds } },
        { stream2Id: { in: sideIds } },
      ],
    },
    select: BATTLE_SELECT,
  })
}
