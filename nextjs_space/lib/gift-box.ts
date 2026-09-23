/**
 * lib/gift-box.ts — Hediye Kutusu çekirdeği (BÖLÜM 22 / B4).
 *
 * Hem canlı yayınlarda (scope='stream') hem sesli sohbet odalarında (scope='room')
 * çalışır. Sunucu tek doğruluk kaynağıdır (§1, §14): istemcinin "görevi yaptım"
 * demesi asla yeterli değildir; görev doğrulaması ve kazanan seçimi backend'de
 * yapılır.
 *
 * Para güvenliği (§15):
 *   - Kutu oluşturulurken toplam tutar oluşturanın jeton bakiyesinden ATOMİK
 *     olarak düşülür (escrow).
 *   - Dağıtım payları kutu açılırken önceden hesaplanır (`splits`), toplamları
 *     daima `totalAmount`'a eşittir (§10 — jeton kaybolmaz/üremez).
 *   - Katılım transaction içinde koşullu UPDATE ile yapılır → aynı anda 20 kişi
 *     katılsa bile tam olarak `winnerCount` kazanan oluşur.
 *   - Kapanış (`settleGiftBox`) `settledAt` kilidi ile tek seferliktir; aynı kutu
 *     iki kez dağıtılamaz/iade edilemez.
 *
 * PK entegrasyonu (§17): kutu ödülü PK skoru ÜRETMEZ. Ödül dağıtımı hiçbir
 * hediye akışını tetiklemez; `applyGiftPkScore` zaten `source:'gift_box'` için
 * erken null döner.
 */

import prisma from '@/lib/db'
import { emitStreamEvent } from '@/lib/stream-events'
import { emitChatEvent } from '@/lib/chat-events'
import { getCachedPlatformSetting } from '@/lib/cache'
import { recordLedger } from '@/lib/ledger'

// ─── Hata kodları (§33) ───
export const GiftBoxErrors = {
  GIFT_BOX_NOT_FOUND: 'GIFT_BOX_NOT_FOUND',
  GIFT_BOX_NOT_ACTIVE: 'GIFT_BOX_NOT_ACTIVE',
  GIFT_BOX_EXPIRED: 'GIFT_BOX_EXPIRED',
  GIFT_BOX_FULL: 'GIFT_BOX_FULL',
  GIFT_BOX_ALREADY_JOINED: 'GIFT_BOX_ALREADY_JOINED',
  GIFT_BOX_TASK_INCOMPLETE: 'GIFT_BOX_TASK_INCOMPLETE',
  GIFT_BOX_OWNER_CANNOT_JOIN: 'GIFT_BOX_OWNER_CANNOT_JOIN',
  GIFT_BOX_ALREADY_OPEN: 'GIFT_BOX_ALREADY_OPEN',
  GIFT_BOX_NOT_IN_ROOM: 'GIFT_BOX_NOT_IN_ROOM',
  GIFT_BOX_BANNED: 'GIFT_BOX_BANNED',
  GIFT_BOX_ACCOUNT_INACTIVE: 'GIFT_BOX_ACCOUNT_INACTIVE',
  GIFT_BOX_NOT_AUTHORIZED: 'GIFT_BOX_NOT_AUTHORIZED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  STREAM_NOT_FOUND: 'STREAM_NOT_FOUND',
  STREAM_ENDED: 'STREAM_ENDED',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const

export const GIFT_BOX_ERROR_MESSAGES: Record<string, string> = {
  GIFT_BOX_NOT_FOUND: 'Hediye kutusu bulunamadı.',
  GIFT_BOX_NOT_ACTIVE: 'Bu hediye kutusu artık aktif değil.',
  GIFT_BOX_EXPIRED: 'Hediye kutusunun süresi doldu.',
  GIFT_BOX_FULL: 'Tüm ödüller dağıtıldı.',
  GIFT_BOX_ALREADY_JOINED: 'Bu kutuya zaten katıldınız.',
  GIFT_BOX_TASK_INCOMPLETE: 'Ödülü kazanmak için önce görevi tamamlamalısınız.',
  GIFT_BOX_OWNER_CANNOT_JOIN: 'Kendi oluşturduğunuz kutuya katılamazsınız.',
  GIFT_BOX_ALREADY_OPEN: 'Bu yayında/odada zaten açık bir hediye kutunuz var.',
  GIFT_BOX_NOT_IN_ROOM: 'Ödül için yayında/odada bulunmanız gerekir.',
  GIFT_BOX_BANNED: 'Hesabınız kısıtlı olduğu için katılamazsınız.',
  GIFT_BOX_ACCOUNT_INACTIVE: 'Hesabınız aktif değil.',
  GIFT_BOX_NOT_AUTHORIZED: 'Bu işlem için yetkiniz yok.',
  INSUFFICIENT_BALANCE: 'Jeton bakiyeniz yetersiz.',
  STREAM_NOT_FOUND: 'Yayın bulunamadı.',
  STREAM_ENDED: 'Yayın sona ermiş.',
  ROOM_NOT_FOUND: 'Oda bulunamadı.',
  VALIDATION_ERROR: 'Geçersiz istek.',
}

// ─── Görev tipleri (§11 — admin panelinden genişletilebilir) ───
export const BUILTIN_TASK_TYPES = [
  'none',
  'follow_creator',
  'follow_broadcaster',
  'follow_user',
  'share',
] as const

export const TASK_LABELS: Record<string, string> = {
  none: 'Görev yok',
  follow_creator: 'Kutu sahibini takip et',
  follow_broadcaster: 'Yayıncıyı takip et',
  follow_user: 'Belirtilen kullanıcıyı takip et',
  share: 'Yayını paylaş',
}

// ─── Yönetilebilir limitler (§9, §19 — kod içine sabit gömülmez) ───
export interface GiftBoxLimits {
  maxAmount: number
  minAmount: number
  maxWinners: number
  maxDurationSec: number
  minDurationSec: number
  allowedDurations: number[]
  extraTaskTypes: string[]
}

function clampInt(v: string, def: number, min: number, max: number): number {
  const n = parseInt(v, 10)
  if (!Number.isFinite(n)) return def
  return Math.min(max, Math.max(min, n))
}

export async function getGiftBoxLimits(): Promise<GiftBoxLimits> {
  const [maxAmount, minAmount, maxWinners, maxDur, minDur, durations, extraTasks] = await Promise.all([
    getCachedPlatformSetting('gift_box_max_amount', '100000'),
    getCachedPlatformSetting('gift_box_min_amount', '10'),
    getCachedPlatformSetting('gift_box_max_winners', '100'),
    getCachedPlatformSetting('gift_box_max_duration_sec', '300'),
    getCachedPlatformSetting('gift_box_min_duration_sec', '5'),
    getCachedPlatformSetting('gift_box_allowed_durations', '5,10,15,30,60,120'),
    getCachedPlatformSetting('gift_box_extra_task_types', ''),
  ])

  const allowed = durations
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isFinite(n) && n > 0)

  return {
    maxAmount: clampInt(maxAmount, 100000, 10, 10_000_000),
    minAmount: clampInt(minAmount, 10, 1, 100000),
    maxWinners: clampInt(maxWinners, 100, 1, 10000),
    maxDurationSec: clampInt(maxDur, 300, 5, 86400),
    minDurationSec: clampInt(minDur, 5, 1, 3600),
    allowedDurations: allowed.length > 0 ? allowed : [5, 10, 15, 30, 60, 120],
    extraTaskTypes: extraTasks.split(',').map(s => s.trim()).filter(Boolean),
  }
}

/**
 * §10 — Bölünemeyen tutarlar için güvenli dağıtım.
 * base = floor(total/n), kalan ilk `r` kazanana +1 olarak eklenir.
 * Dönen dizinin toplamı KESİNLİKLE `total`'a eşittir.
 */
export function computeSplits(total: number, winners: number): number[] {
  const n = Math.trunc(winners)
  const t = Math.trunc(total)
  if (n <= 0 || t <= 0) return []
  const base = Math.floor(t / n)
  const rem = t - base * n
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(base + (i < rem ? 1 : 0))
  return out
}

export function parseSplits(json: string): number[] {
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) ? arr.map(n => Math.trunc(Number(n) || 0)) : []
  } catch {
    return []
  }
}

// ─── Görev doğrulama (§11-§13) — daima sunucuda ───

export interface TaskContext {
  /** Yayın/oda sahibi (yayıncı) */
  broadcasterId: string | null
}

export async function verifyGiftBoxTask(
  box: { taskType: string; taskTargetUserId: string | null; creatorId: string; scope: string; streamId: string | null; roomId: string | null; startsAt: Date },
  userId: string,
  ctx: TaskContext,
): Promise<{ verified: boolean; reason?: string }> {
  const followsTarget = async (targetId: string | null) => {
    if (!targetId) return { verified: false, reason: 'Görev hedefi tanımsız.' }
    if (targetId === userId) return { verified: true }
    const f = await prisma.follow.findFirst({
      where: { followerId: userId, followingId: targetId },
      select: { id: true },
    })
    return f ? { verified: true } : { verified: false, reason: 'Takip şartı sağlanmadı.' }
  }

  switch (box.taskType) {
    case 'none':
      return { verified: true }
    case 'follow_creator':
      return followsTarget(box.creatorId)
    case 'follow_broadcaster':
      return followsTarget(ctx.broadcasterId)
    case 'follow_user':
      return followsTarget(box.taskTargetUserId)
    case 'share': {
      const targetId = box.scope === 'stream' ? box.streamId : box.roomId
      if (!targetId) return { verified: false, reason: 'Paylaşım hedefi tanımsız.' }
      const ev = await prisma.shareEvent.findFirst({
        where: { userId, scope: box.scope, targetId, createdAt: { gte: box.startsAt } },
        select: { id: true },
      })
      return ev ? { verified: true } : { verified: false, reason: 'Paylaşım kaydı bulunamadı.' }
    }
    default:
      // Admin panelinden eklenen özel görev tipleri: doğrulanabilir bir kural
      // tanımlanana kadar otomatik geçerli sayılmaz (güvenli varsayılan).
      return { verified: false, reason: 'Bu görev tipi henüz doğrulanamıyor.' }
  }
}

// ─── Katılım uygunluğu ───
export async function checkGiftBoxEligibility(
  userId: string,
): Promise<{ ok: boolean; code?: string; status?: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true, bannedUntil: true, isFrozen: true },
  })
  if (!user) return { ok: false, code: GiftBoxErrors.GIFT_BOX_NOT_AUTHORIZED, status: 404 }
  if (user.isBanned && (!user.bannedUntil || user.bannedUntil.getTime() > Date.now())) {
    return { ok: false, code: GiftBoxErrors.GIFT_BOX_BANNED, status: 403 }
  }
  if (user.isFrozen) return { ok: false, code: GiftBoxErrors.GIFT_BOX_ACCOUNT_INACTIVE, status: 403 }
  return { ok: true }
}

/** §13-1 — Kullanıcı gerçekten yayında/odada mı? */
export async function isPresent(box: { scope: string; streamId: string | null; roomId: string | null }, userId: string): Promise<boolean> {
  if (box.scope === 'room' && box.roomId) {
    const p = await prisma.chatPresence.findUnique({
      where: { roomId_userId: { roomId: box.roomId, userId } },
      select: { lastSeen: true },
    })
    return !!p && Date.now() - p.lastSeen.getTime() < 5 * 60 * 1000
  }
  if (box.scope === 'stream' && box.streamId) {
    const v = await prisma.videoStreamViewer.findUnique({
      where: { streamId_viewerId: { streamId: box.streamId, viewerId: userId } },
      select: { leftAt: true },
    })
    return !!v && v.leftAt === null
  }
  return false
}

// ─── Serileştirme ───
export interface GiftBoxView {
  id: string
  scope: string
  streamId: string | null
  roomId: string | null
  creatorId: string
  creator?: { id: string; name: string | null; username: string | null; image: string | null } | null
  totalAmount: number
  winnerCount: number
  durationSec: number
  taskType: string
  taskLabel: string
  taskTargetUserId: string | null
  taskTarget?: { id: string; name: string | null; username: string | null; image: string | null } | null
  status: string
  startsAt: string
  endsAt: string
  remainingSec: number
  paidCount: number
  paidAmount: number
  remainingAmount: number
  remainingWinners: number
}

export function serializeGiftBox(box: any): GiftBoxView {
  const remainingSec = Math.max(0, Math.ceil((new Date(box.endsAt).getTime() - Date.now()) / 1000))
  return {
    id: box.id,
    scope: box.scope,
    streamId: box.streamId ?? null,
    roomId: box.roomId ?? null,
    creatorId: box.creatorId,
    creator: box.creator ?? null,
    totalAmount: box.totalAmount,
    winnerCount: box.winnerCount,
    durationSec: box.durationSec,
    taskType: box.taskType,
    taskLabel: TASK_LABELS[box.taskType] || box.taskType,
    taskTargetUserId: box.taskTargetUserId ?? null,
    taskTarget: box.taskTarget ?? null,
    status: box.status,
    startsAt: new Date(box.startsAt).toISOString(),
    endsAt: new Date(box.endsAt).toISOString(),
    remainingSec: box.status === 'active' ? remainingSec : 0,
    paidCount: box.paidCount,
    paidAmount: box.paidAmount,
    remainingAmount: Math.max(0, box.totalAmount - box.paidAmount),
    remainingWinners: Math.max(0, box.winnerCount - box.paidCount),
  }
}

// ─── Realtime (§16) — mevcut SSE veri yolları kullanılır, yeni WS kurulmaz ───
export type GiftBoxEventName =
  | 'gift_box_created'
  | 'gift_box_started'
  | 'gift_box_joined'
  | 'gift_box_task_verified'
  | 'gift_box_winner'
  | 'gift_box_finished'
  | 'gift_box_expired'
  | 'gift_box_cancelled'
  | 'gift_box_reward_distributed'

export function broadcastGiftBox(
  box: { id: string; scope: string; streamId: string | null; roomId: string | null },
  event: GiftBoxEventName,
  payload: Record<string, any> = {},
) {
  const data = { type: 'gift_box', event, boxId: box.id, scope: box.scope, ...payload }
  if (box.scope === 'stream' && box.streamId) emitStreamEvent(box.streamId, 'gift_box', data)
  else if (box.scope === 'room' && box.roomId) emitChatEvent(box.roomId, 'gift_box', data)
}

// ─── Kapanış / iade (§15) — `settledAt` kilidi ile tek seferlik ───
export async function settleGiftBox(
  boxId: string,
  reason: 'expired' | 'cancelled' | 'finished',
): Promise<{ settled: boolean; refunded: number }> {
  const now = new Date()
  const nextStatus = reason === 'cancelled' ? 'cancelled' : reason === 'expired' ? 'expired' : 'finished'

  const result = await prisma.$transaction(async (tx) => {
    // Kilit: yalnızca henüz kapatılmamış kutu kapatılabilir.
    const locked = await tx.giftBox.updateMany({
      where: { id: boxId, settledAt: null },
      data: { settledAt: now, finishedAt: now, status: nextStatus },
    })
    if (locked.count === 0) return { settled: false, refunded: 0, box: null as any }

    const box = await tx.giftBox.findUnique({ where: { id: boxId } })
    if (!box) return { settled: false, refunded: 0, box: null as any }

    const refund = Math.max(0, box.totalAmount - box.paidAmount)
    if (refund > 0) {
      await tx.user.update({
        where: { id: box.creatorId },
        data: { jetonBalance: { increment: refund } },
      })
      await tx.giftBox.update({ where: { id: boxId }, data: { refundedAmount: refund } })
    }
    return { settled: true, refunded: refund, box }
  })

  if (result.settled && result.box) {
    if (result.refunded > 0) {
      await recordLedger({
        debit: { accountType: 'platform_jeton', accountId: 'gift_box_escrow' },
        credit: { accountType: 'user_jeton', accountId: result.box.creatorId },
        amount: result.refunded,
        category: 'refund',
        description: 'Hediye kutusu dağıtılmayan bakiye iadesi',
        referenceType: 'GiftBox',
        referenceId: boxId,
        metadata: { reason },
      }).catch(() => {})
    }
    broadcastGiftBox(result.box, reason === 'cancelled' ? 'gift_box_cancelled' : reason === 'expired' ? 'gift_box_expired' : 'gift_box_finished', {
      paidCount: result.box.paidCount,
      paidAmount: result.box.paidAmount,
      refunded: result.refunded,
    })
  }
  return { settled: result.settled, refunded: result.refunded }
}

/** Süresi dolmuş ama hâlâ 'active' görünen kutuları kapatır (§27 tembel temizlik). */
export async function expireStaleBoxes(filter: { streamId?: string; roomId?: string }): Promise<void> {
  const where: any = { status: 'active', endsAt: { lt: new Date() } }
  if (filter.streamId) where.streamId = filter.streamId
  if (filter.roomId) where.roomId = filter.roomId
  const stale = await prisma.giftBox.findMany({ where, select: { id: true }, take: 20 })
  for (const s of stale) {
    await settleGiftBox(s.id, 'expired').catch(() => {})
  }
}

/** Yayın/oda kapanınca açık kutuları kapatıp iade eder (§27). */
export async function closeGiftBoxesFor(filter: { streamId?: string; roomId?: string }): Promise<void> {
  const where: any = { status: 'active' }
  if (filter.streamId) where.streamId = filter.streamId
  if (filter.roomId) where.roomId = filter.roomId
  const open = await prisma.giftBox.findMany({ where, select: { id: true }, take: 50 })
  for (const o of open) {
    await settleGiftBox(o.id, 'cancelled').catch(() => {})
  }
}
