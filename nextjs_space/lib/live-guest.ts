/**
 * lib/live-guest.ts — Multi-Guest (çoklu misafir) çekirdeği.
 *
 * BÖLÜM 22 / B1. Mevcut `LiveGuestSession` + `LiveGuestInvite` modelleri
 * üzerine kurulur (yeni tablo açılmaz, §22). Sunucu tek doğruluk kaynağıdır:
 * istemcinin "kabul edildim" demesine asla güvenilmez (§1).
 *
 * Durum makinesi (talep/davet):
 *   pending → accepted | rejected | cancelled | expired
 *   accepted → (guest session açılır) → removed  (yayından çıkarılınca)
 *
 * Oturum durumu: active → left | removed
 */

import prisma from '@/lib/db'
import { emitStreamEvent } from '@/lib/stream-events'
import { getCachedPlatformSetting } from '@/lib/cache'
import { staffCan } from '@/lib/permissions'

// ─── Hata kodları (§33) ───
export const GuestErrors = {
  GUEST_REQUEST_EXPIRED: 'GUEST_REQUEST_EXPIRED',
  GUEST_REQUEST_NOT_FOUND: 'GUEST_REQUEST_NOT_FOUND',
  GUEST_REQUEST_ALREADY_RESOLVED: 'GUEST_REQUEST_ALREADY_RESOLVED',
  GUEST_ALREADY_JOINED: 'GUEST_ALREADY_JOINED',
  GUEST_ALREADY_REQUESTED: 'GUEST_ALREADY_REQUESTED',
  GUEST_SLOT_FULL: 'GUEST_SLOT_FULL',
  GUEST_SLOT_TAKEN: 'GUEST_SLOT_TAKEN',
  GUEST_NOT_AUTHORIZED: 'GUEST_NOT_AUTHORIZED',
  GUEST_NOT_APPROVED: 'GUEST_NOT_APPROVED',
  GUEST_NOT_FOUND: 'GUEST_NOT_FOUND',
  GUEST_DISABLED: 'GUEST_DISABLED',
  GUEST_REMOVED_COOLDOWN: 'GUEST_REMOVED_COOLDOWN',
  GUEST_BANNED: 'GUEST_BANNED',
  GUEST_ACCOUNT_INACTIVE: 'GUEST_ACCOUNT_INACTIVE',
  STREAM_NOT_FOUND: 'STREAM_NOT_FOUND',
  STREAM_ENDED: 'STREAM_ENDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const

export type GuestErrorCode = (typeof GuestErrors)[keyof typeof GuestErrors]

export const GUEST_ERROR_MESSAGES: Record<string, string> = {
  GUEST_REQUEST_EXPIRED: 'Talebin süresi doldu.',
  GUEST_REQUEST_NOT_FOUND: 'Talep bulunamadı.',
  GUEST_REQUEST_ALREADY_RESOLVED: 'Bu talep zaten sonuçlandırılmış.',
  GUEST_ALREADY_JOINED: 'Zaten misafir olarak yayındasınız.',
  GUEST_ALREADY_REQUESTED: 'Bekleyen bir talebiniz zaten var.',
  GUEST_SLOT_FULL: 'Misafir kontenjanı dolu.',
  GUEST_SLOT_TAKEN: 'Bu pozisyon dolu.',
  GUEST_NOT_AUTHORIZED: 'Bu işlem için yetkiniz yok.',
  GUEST_NOT_APPROVED: 'Yayın sahibinin onayı olmadan katılamazsınız.',
  GUEST_NOT_FOUND: 'Misafir bulunamadı.',
  GUEST_DISABLED: 'Bu yayında misafirlik kapalı.',
  GUEST_REMOVED_COOLDOWN: 'Bu yayından çıkarıldınız, bir süre tekrar talep gönderemezsiniz.',
  GUEST_BANNED: 'Hesabınız kısıtlı olduğu için misafir olamazsınız.',
  GUEST_ACCOUNT_INACTIVE: 'Hesabınız aktif değil.',
  STREAM_NOT_FOUND: 'Yayın bulunamadı.',
  STREAM_ENDED: 'Yayın sona ermiş.',
  VALIDATION_ERROR: 'Geçersiz istek.',
}

// ─── Yönetilebilir limitler (§19 — kod içine sabit gömülmez) ───
export interface GuestLimits {
  maxGuests: number
  requestTtlSec: number
  inviteTtlSec: number
  removedCooldownSec: number
}

export async function getGuestLimits(): Promise<GuestLimits> {
  const [maxGuests, requestTtl, inviteTtl, cooldown] = await Promise.all([
    getCachedPlatformSetting('live_guest_max_slots', '8'),
    getCachedPlatformSetting('live_guest_request_ttl_sec', '90'),
    getCachedPlatformSetting('live_guest_invite_ttl_sec', '60'),
    getCachedPlatformSetting('live_guest_removed_cooldown_sec', '300'),
  ])
  const clamp = (v: string, def: number, min: number, max: number) => {
    const n = parseInt(v, 10)
    if (!Number.isFinite(n)) return def
    return Math.min(max, Math.max(min, n))
  }
  return {
    maxGuests: clamp(maxGuests, 8, 2, 8),
    requestTtlSec: clamp(requestTtl, 90, 15, 600),
    inviteTtlSec: clamp(inviteTtl, 60, 15, 600),
    removedCooldownSec: clamp(cooldown, 300, 0, 86400),
  }
}

/** Aktif misafir sayısına göre gösterilecek grid boyutu (2/4/6/8). */
export function gridSlotsFor(count: number, maxGuests: number): number {
  const steps = [2, 4, 6, 8].filter(s => s <= maxGuests)
  for (const s of steps) if (count <= s) return s
  return maxGuests
}

export interface GuestView {
  id: string
  streamId: string
  userId: string
  name: string
  username: string | null
  image: string | null
  slot: number
  status: string
  isMuted: boolean
  isVideoOff: boolean
  mutedByHost: boolean
  videoOffByHost: boolean
  source: string
  joinedAt: Date
  lastSeenAt: Date
}

export async function listGuests(streamId: string): Promise<GuestView[]> {
  const sessions = await prisma.liveGuestSession.findMany({
    where: { streamId, status: 'active' },
    orderBy: { slot: 'asc' },
  })
  if (!sessions.length) return []
  const users = await prisma.user.findMany({
    where: { id: { in: sessions.map(s => s.userId) } },
    select: { id: true, name: true, username: true, image: true },
  })
  const userMap = new Map(users.map(u => [u.id, u]))
  return sessions.map(s => {
    const u = userMap.get(s.userId)
    return {
      id: s.id,
      streamId: s.streamId,
      userId: s.userId,
      name: u?.name || u?.username || 'Kullanıcı',
      username: u?.username || null,
      image: u?.image || null,
      slot: s.slot,
      status: s.status,
      isMuted: s.isMuted,
      isVideoOff: s.isVideoOff,
      mutedByHost: s.mutedByHost,
      videoOffByHost: s.videoOffByHost,
      source: s.source,
      joinedAt: s.joinedAt,
      lastSeenAt: s.lastSeenAt,
    }
  })
}

/** İlk boş pozisyonu döndürür (1..maxGuests), yoksa null. */
export async function nextFreeSlot(streamId: string, maxGuests: number): Promise<number | null> {
  const taken = await prisma.liveGuestSession.findMany({
    where: { streamId, status: 'active' },
    select: { slot: true },
  })
  const used = new Set(taken.map(t => t.slot))
  for (let i = 1; i <= maxGuests; i++) if (!used.has(i)) return i
  return null
}

/** Süresi dolmuş bekleyen talep/davetleri kapatır (polling yerine tembel temizlik). */
export async function expireStalePending(streamId?: string): Promise<number> {
  const res = await prisma.liveGuestInvite.updateMany({
    where: {
      status: 'pending',
      expiresAt: { lt: new Date() },
      ...(streamId ? { streamId } : {}),
    },
    data: { status: 'expired', respondedAt: new Date() },
  })
  return res.count
}

/**
 * Misafir listesini yayındaki herkese duyurur (§24).
 * event: guest_joined | guest_left | guest_removed | guest_muted |
 *        guest_camera_off | guest_position_changed | guest_grid_changed
 */
const lastGridSlots = new Map<string, number>()

export async function broadcastGuests(
  streamId: string,
  event: string,
  extra: Record<string, any> = {}
): Promise<{ guests: GuestView[]; gridSlots: number; maxGuests: number }> {
  const { maxGuests } = await getGuestLimits()
  const guests = await listGuests(streamId)
  const gridSlots = gridSlotsFor(guests.length, maxGuests)
  emitStreamEvent(streamId, 'guest', {
    type: 'guest',
    event,
    streamId,
    count: guests.length,
    maxGuests,
    gridSlots,
    guests,
    ...extra,
  })
  // Grid boyutu değiştiyse ayrıca duyur (§24 guest_grid_changed)
  const prev = lastGridSlots.get(streamId)
  if (prev !== gridSlots) {
    lastGridSlots.set(streamId, gridSlots)
    if (prev !== undefined) {
      emitStreamEvent(streamId, 'guest', {
        type: 'guest',
        event: 'guest_grid_changed',
        streamId,
        count: guests.length,
        maxGuests,
        gridSlots,
        previousGridSlots: prev,
      })
    }
  }
  return { guests, gridSlots, maxGuests }
}

/** Yayın sahibine bekleyen talep sayısı (§2). */
export async function pendingRequestCount(streamId: string): Promise<number> {
  return prisma.liveGuestInvite.count({
    where: { streamId, kind: 'request', status: 'pending', expiresAt: { gt: new Date() } },
  })
}

/**
 * Misafir olmaya uygunluk (§20 abuse/fraud).
 * - banlı / dondurulmuş hesap katilamaz
 * - yayından çıkarılan kullanıcı cooldown süresince tekrar talep gönderemez
 * Aşırı agresif değildir: yalnızca kesin sinyallere bakar.
 */
export async function checkGuestEligibility(
  streamId: string,
  userId: string,
  cooldownSec: number
): Promise<{ ok: boolean; code?: string; status?: number; retryAfterSec?: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true, bannedUntil: true, isFrozen: true },
  })
  if (!user) return { ok: false, code: GuestErrors.GUEST_NOT_FOUND, status: 404 }
  if (user.isBanned && (!user.bannedUntil || user.bannedUntil.getTime() > Date.now())) {
    return { ok: false, code: GuestErrors.GUEST_BANNED, status: 403 }
  }
  if (user.isFrozen) return { ok: false, code: GuestErrors.GUEST_ACCOUNT_INACTIVE, status: 403 }

  if (cooldownSec > 0) {
    const removed = await prisma.liveGuestSession.findUnique({
      where: { streamId_userId: { streamId, userId } },
      select: { status: true, leftAt: true },
    })
    if (removed?.status === 'removed' && removed.leftAt) {
      const elapsed = (Date.now() - removed.leftAt.getTime()) / 1000
      if (elapsed < cooldownSec) {
        return {
          ok: false,
          code: GuestErrors.GUEST_REMOVED_COOLDOWN,
          status: 429,
          retryAfterSec: Math.ceil(cooldownSec - elapsed),
        }
      }
    }
  }
  return { ok: true }
}

/** Talep/davet olayını duyurur (liste yükü olmadan, küçük payload — §30). */
export function emitGuestRequestEvent(streamId: string, event: string, payload: Record<string, any>) {
  emitStreamEvent(streamId, 'guest', { type: 'guest', event, streamId, ...payload })
}

/**
 * Yayın sahibi mi, yoksa platform moderatörü mü?
 * Yalnızca sunucuda kontrol edilir (§21).
 */
export const MODERATOR_ROLES = ['admin', 'yonetici', 'moderator', 'moderatör', 'destek']

export async function resolveGuestAuthority(
  userId: string,
  streamOwnerId: string
): Promise<{ isHost: boolean; isModerator: boolean; canManage: boolean; role: string | null }> {
  if (userId === streamOwnerId) {
    return { isHost: true, isModerator: false, canManage: true, role: null }
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  const role = user?.role || null
  // Granüler RBAC: sabit rol listesi geri düşüş olarak korunur,
  // ayrıca DB'den atanmış `moderation.room.manage` yetkisi de geçerlidir (§21).
  const isModerator = await staffCan(role, userId, 'moderation.room.manage', MODERATOR_ROLES)
  return { isHost: false, isModerator, canManage: isModerator, role }
}

/**
 * Bir yayın/oda kapandığında misafirlik durumunu güvenle temizler (§27).
 * Aktif oturumları kapatır, bekleyen talepleri süresi dolmuş yapar.
 */
export async function closeGuestStateForStream(streamId: string, reason = 'stream_ended') {
  const [sessions, invites] = await prisma.$transaction([
    prisma.liveGuestSession.updateMany({
      where: { streamId, status: 'active' },
      data: { status: 'left', leftAt: new Date() },
    }),
    prisma.liveGuestInvite.updateMany({
      where: { streamId, status: 'pending' },
      data: { status: 'expired', respondedAt: new Date() },
    }),
  ])
  if (sessions.count || invites.count) {
    emitGuestRequestEvent(streamId, 'guest_state_closed', {
      reason,
      closedSessions: sessions.count,
      expiredRequests: invites.count,
    })
  }
  return { closedSessions: sessions.count, expiredRequests: invites.count }
}
