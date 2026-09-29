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
import { getCachedPlatformSetting } from '@/lib/cache'

export type PkStatus =
  | 'pending'
  | 'starting'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'expired'

/**
 * "Yaşayan" PK durumları — sorgu filtrelerinde ['pending','active'] yerine
 * bu sabit kullanılmalıdır (starting/paused da hâlâ açık bir PK'dır).
 */
export const PK_LIVE_STATUSES: PkStatus[] = ['pending', 'starting', 'active', 'paused']
/** Henüz kabul edilmemiş (davet aşamasındaki) durumlar. */
export const PK_PENDING_STATUSES: PkStatus[] = ['pending', 'starting']
/** Skor yazılabilen / sayaç işleyen durumlar. */
export const PK_RUNNING_STATUSES: PkStatus[] = ['active', 'paused']

/** Şartnamedeki mantıksal adların veritabanı karşılıkları. */
export const PK_STATE_ALIASES: Record<string, PkStatus> = {
  REQUESTED: 'pending',
  PENDING: 'pending',
  ACCEPTED: 'active',
  STARTING: 'starting',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'completed',
  FINISHED: 'completed',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
}

export const PK_TERMINAL_STATUSES: PkStatus[] = ['completed', 'cancelled', 'rejected', 'expired']

/** İzinli geçişler. Burada olmayan her geçiş yasaktır. */
const PK_TRANSITIONS: Record<PkStatus, PkStatus[]> = {
  pending: ['starting', 'active', 'rejected', 'cancelled', 'expired'],
  starting: ['active', 'cancelled', 'expired'],
  active: ['paused', 'completed'],
  paused: ['active', 'completed'],
  completed: [],
  cancelled: [],
  rejected: [],
  expired: [],
}

const STATUS_LABEL_TR: Record<string, string> = {
  pending: 'beklemede',
  starting: 'başlıyor',
  active: 'aktif',
  paused: 'duraklatılmış',
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
      where: { id: battle.id, status: { in: ['active', 'paused'] } } as any,
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
      where: { id: battle.id, status: { in: ['pending', 'starting'] } } as any,
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
      where: {
        status: 'active',
        OR: [
          { endsAt: { not: null, lte: now } },
          // Eski kayıtlar: endsAt yazılmadan kabul edilmiş PK'lar sonsuza dek
          // "aktif" kalıp yeni PK'ları engelliyordu. startedAt/createdAt + duration ile kapatılır.
          { endsAt: null },
        ],
      },
      select: { ...BATTLE_SELECT, endsAt: true, startedAt: true, createdAt: true, duration: true },
      take: 50,
    })
    let count = 0
    for (const b of stale) {
      const row = b as any
      if (!row.endsAt) {
        const base = row.startedAt || row.createdAt
        const dur = (row.duration && row.duration > 0 ? row.duration : 180) * 1000
        // Eski kayıtlarda ek 30 sn tolerans bırakılır
        if (!base || new Date(base).getTime() + dur + 30_000 > now.getTime()) continue
      }
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
        status: { in: PK_LIVE_STATUSES },
        OR: [{ stream1Id: { in: ids } }, { stream2Id: { in: ids } }, { scopeRoomId: { in: ids } }],
      },
      select: BATTLE_SELECT,
    })
    let count = 0
    for (const b of battles) {
      if (b.status === 'active' || b.status === 'paused') {
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
  if (!PK_LIVE_STATUSES.includes(battle.status as PkStatus)) return true
  // Aynı oda içi (kullanıcı-vs-kullanıcı) PK'da iki taraf da aynı kimliktir.
  const ids = Array.from(new Set([battle.stream1Id, battle.stream2Id]))
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
        if (battle.status === 'active' || battle.status === 'paused') await finishPkBattle(battle, reason)
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
      status: { in: PK_LIVE_STATUSES },
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

/* ───────────────────────── Bölüm 22 / B3 ─────────────────────────
 * STARTING / PAUSED durumları, çok taraflı katılımcılar ve
 * aynı-oda-içi (kullanıcı vs kullanıcı) PK yardımcıları.
 * ---------------------------------------------------------------- */

export type PkMode = '1v1' | '1v2' | '1v3' | '2v2' | 'team'
export type PkScope = 'stream' | 'room' | 'room_user' | 'guest'

/** side1/side2 katılımcı sayılarından mod adını üretir. */
export function derivePkMode(side1Count: number, side2Count: number): string {
  if (side1Count <= 1 && side2Count <= 1) return '1v1'
  if (side1Count === 1 && side2Count === 2) return '1v2'
  if (side1Count === 1 && side2Count === 3) return '1v3'
  if (side1Count === 2 && side2Count === 2) return '2v2'
  return 'team'
}

/**
 * Bir PK'ya katılımcı satırları yazar (kaptanlar dahil).
 * Zaten var olan kullanıcılar sessizce atlanır.
 */
export async function addPkParticipants(
  battleId: string,
  entries: { userId: string; side: 1 | 2; seatNumber?: number | null; isCaptain?: boolean }[],
) {
  const seen = new Set<string>()
  for (const e of entries) {
    if (!e?.userId || seen.has(e.userId)) continue
    seen.add(e.userId)
    try {
      await prisma.pkBattleParticipant.create({
        data: {
          battleId,
          userId: e.userId,
          side: e.side,
          seatNumber: e.seatNumber ?? null,
          isCaptain: !!e.isCaptain,
        },
      })
    } catch { /* @@unique([battleId,userId]) — zaten ekli */ }
  }
}

/** Bir PK'nın katılımcılarını kullanıcı bilgileriyle birlikte döner. */
export async function listPkParticipants(battleId: string) {
  const rows = await prisma.pkBattleParticipant.findMany({
    where: { battleId },
    orderBy: [{ side: 'asc' }, { createdAt: 'asc' }],
  })
  if (rows.length === 0) return []
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, name: true, username: true, image: true },
  })
  const map = new Map(users.map((u) => [u.id, u]))
  return rows.map((r) => ({
    userId: r.userId,
    side: r.side,
    seatNumber: r.seatNumber,
    points: r.points,
    isCaptain: r.isCaptain,
    name: map.get(r.userId)?.name ?? null,
    username: map.get(r.userId)?.username ?? null,
    image: map.get(r.userId)?.image ?? null,
  }))
}

type PausableBattle = BattleRow & { endsAt?: Date | null; pausedAt?: Date | null; pausedMs?: number | null }

/** Aktif PK'yı duraklatır; kalan süre dondurulur. */
export async function pausePkBattle(battle: PausableBattle, reason = 'MANUAL') {
  const now = new Date()
  let updated
  try {
    updated = await prisma.pKBattle.update({
      where: { id: battle.id, status: 'active' } as any,
      data: { status: 'paused', pausedAt: now } as any,
    })
  } catch {
    return null
  }
  const remainingMs = updated.endsAt ? Math.max(0, new Date(updated.endsAt).getTime() - now.getTime()) : null
  emitPkToBothSides(battle, {
    type: 'pk',
    battleId: battle.id,
    action: 'paused',
    eventType: 'PK_PAUSED',
    reason,
    room1Id: battle.stream1Id,
    room2Id: battle.stream2Id,
    score1: updated.score1,
    score2: updated.score2,
    status: 'paused',
    pausedAt: now.toISOString(),
    remainingMs,
    serverNow: now.toISOString(),
  })
  return updated
}

/** Duraklatılmış PK'yı sürdürür; bitiş zamanı duraklatılan kadar ötelenir. */
export async function resumePkBattle(battle: PausableBattle, reason = 'MANUAL') {
  const fresh = await prisma.pKBattle.findUnique({ where: { id: battle.id } })
  if (!fresh || fresh.status !== 'paused') return null
  const now = new Date()
  const pausedAt = (fresh as any).pausedAt as Date | null
  const deltaMs = pausedAt ? Math.max(0, now.getTime() - new Date(pausedAt).getTime()) : 0
  const newEndsAt = fresh.endsAt ? new Date(new Date(fresh.endsAt).getTime() + deltaMs) : null
  let updated
  try {
    updated = await prisma.pKBattle.update({
      where: { id: battle.id, status: 'paused' } as any,
      data: {
        status: 'active',
        pausedAt: null,
        pausedMs: { increment: deltaMs },
        ...(newEndsAt ? { endsAt: newEndsAt } : {}),
      } as any,
    })
  } catch {
    return null
  }
  emitPkToBothSides(battle, {
    type: 'pk',
    battleId: battle.id,
    action: 'resumed',
    eventType: 'PK_RESUMED',
    reason,
    room1Id: battle.stream1Id,
    room2Id: battle.stream2Id,
    score1: updated.score1,
    score2: updated.score2,
    status: 'active',
    endsAt: updated.endsAt ? new Date(updated.endsAt).toISOString() : null,
    endTime: updated.endsAt ? new Date(updated.endsAt).toISOString() : null,
    pausedMs: (updated as any).pausedMs ?? 0,
    serverNow: now.toISOString(),
  })
  return updated
}

/**
 * `starting` (geri sayım) aşamasındaki PK'yı gerçekten başlatır.
 * Sayaç bu anda kurulur; kanonik bitiş zamanı sunucu saatiyle yazılır.
 */
export async function startPkBattle(battle: BattleRow & { duration?: number | null }, reason = 'MANUAL') {
  const now = new Date()
  const fresh = await prisma.pKBattle.findUnique({ where: { id: battle.id } })
  if (!fresh || fresh.status !== 'starting') return null
  const endsAt = new Date(now.getTime() + (fresh.duration && fresh.duration > 0 ? fresh.duration : 180) * 1000)
  let updated
  try {
    updated = await prisma.pKBattle.update({
      where: { id: battle.id, status: 'starting' } as any,
      data: { status: 'active', startedAt: now, endsAt },
    })
  } catch {
    return null
  }
  emitPkToBothSides(battle, {
    type: 'pk',
    battleId: battle.id,
    action: 'started',
    eventType: 'PK_STARTED',
    reason,
    room1Id: battle.stream1Id,
    room2Id: battle.stream2Id,
    user1Id: battle.user1Id,
    user2Id: battle.user2Id,
    score1: updated.score1,
    score2: updated.score2,
    duration: updated.duration,
    status: 'active',
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    endTime: endsAt.toISOString(),
    serverNow: now.toISOString(),
  })
  return updated
}

/* ───── §19 PK Admin Ayarları ───── */

export async function getPkLimits() {
  const [
    defaultDuration,
    minDuration,
    maxDuration,
    cooldownSec,
    maxManualPoints,
    maxParticipantsPerSide,
    streamPkEnabled,
    roomPkEnabled,
  ] = await Promise.all([
    getCachedPlatformSetting('pk_default_duration', '180'),
    getCachedPlatformSetting('pk_min_duration', '60'),
    getCachedPlatformSetting('pk_max_duration', '600'),
    getCachedPlatformSetting('pk_cooldown_sec', '0'),
    getCachedPlatformSetting('pk_max_manual_points', '10'),
    getCachedPlatformSetting('pk_max_participants_per_side', '4'),
    getCachedPlatformSetting('pk_stream_enabled', 'true'),
    getCachedPlatformSetting('pk_room_enabled', 'true'),
  ])
  return {
    defaultDuration: Math.max(10, Math.min(3600, parseInt(defaultDuration) || 180)),
    minDuration: Math.max(10, parseInt(minDuration) || 60),
    maxDuration: Math.max(60, parseInt(maxDuration) || 600),
    cooldownSec: Math.max(0, parseInt(cooldownSec) || 0),
    maxManualPoints: Math.max(1, parseInt(maxManualPoints) || 10),
    maxParticipantsPerSide: Math.max(1, Math.min(8, parseInt(maxParticipantsPerSide) || 4)),
    streamPkEnabled: streamPkEnabled !== 'false',
    roomPkEnabled: roomPkEnabled !== 'false',
  }
}
