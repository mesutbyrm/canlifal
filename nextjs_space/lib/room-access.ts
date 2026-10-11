/**
 * VIP oda şifre koruması — tek kaynak (web + Flutter).
 *
 * - Şifre YALNIZCA roomType === 'VIP' odalarda geçerlidir.
 * - Şifre bcrypt ile saklanır; eski düz metin kayıtlar ilk başarılı girişte
 *   otomatik olarak hash'e çevrilir.
 * - Doğrulama sunucuda yapılır; kullanıcı + oda başına en fazla 3 yanlış deneme.
 * - Başarılı doğrulama 2 saat geçerli, odaya + kullanıcıya + MEVCUT şifreye bağlı
 *   imzalı bir `accessToken` üretir: şifre değişir/kalkarsa jeton geçersiz olur.
 *   (İstemci "onaylandı" bayrağına güvenmez.)
 */
import prisma from '@/lib/db'
import { ROLE_HIERARCHY } from '@/lib/chat-permissions'
import { recordAudit } from '@/lib/audit-log'
import { invalidateCache } from '@/lib/cache'
import {
  ACCESS_TOKEN_TTL_MS,
  APPROVAL_TTL_MS,
  MAX_PASSWORD_ATTEMPTS,
  hashRoomPassword,
  isHashedPassword,
  isPasswordGatedRoom,
  issueRoomAccessToken,
  matchesRoomPassword,
  verifyRoomAccessToken,
} from '@/lib/room-access-crypto'

export {
  ACCESS_TOKEN_TTL_MS,
  APPROVAL_TTL_MS,
  MAX_PASSWORD_ATTEMPTS,
  hashRoomPassword,
  isHashedPassword,
  isPasswordGatedRoom,
  issueRoomAccessToken,
  matchesRoomPassword,
  verifyRoomAccessToken,
}

const GLOBAL_STAFF = ['admin', 'moderator', 'site_manager', 'yonetici']

/** `getCachedChatRoom` önbelleğini (id + slug) temizler. */
export function invalidateChatRoomCache(room: { id: string; slug?: string | null }) {
  try {
    invalidateCache(`chatroom:${room.id}`)
    if (room.slug) invalidateCache(`chatroom:${room.slug}`)
  } catch {
    /* önbellek temizlenemese de kritik değil (15 sn TTL) */
  }
}

export type GatedRoom = {
  slug?: string | null
  id: string
  roomType?: string | null
  password?: string | null
  ownerId?: string | null
}

// ── Yetki muafiyeti: sahip, site yöneticisi, oda içi SOP+ ─────────────────
export async function canBypassRoomGate(
  room: Pick<GatedRoom, 'id' | 'ownerId'>,
  userId: string,
  globalRole?: string | null
): Promise<boolean> {
  if (room.ownerId && room.ownerId === userId) return true
  if (GLOBAL_STAFF.includes(globalRole || '')) return true
  const myRole = await prisma.chatUserRole
    .findUnique({ where: { roomId_userId: { roomId: room.id, userId } }, select: { role: true } })
    .catch(() => null)
  const level = myRole ? ROLE_HIERARCHY[myRole.role as keyof typeof ROLE_HIERARCHY] || 0 : 0
  return level >= ROLE_HIERARCHY['sop']
}

/** Not: tsconfig strict değil → ayrık birleşim yerine tek şekil (opsiyonel alanlar). */
export type PasswordCheck = {
  ok: boolean
  storedPassword?: string
  code?: 'INVALID_ROOM_PASSWORD' | 'PASSWORD_ATTEMPTS_EXHAUSTED'
  remaining?: number
  locked?: boolean
}

export async function getRemainingAttempts(roomId: string, userId: string): Promise<{ remaining: number; locked: boolean }> {
  const row = await prisma.roomPasswordAttempt
    .findUnique({ where: { roomId_userId: { roomId, userId } }, select: { failCount: true } })
    .catch(() => null)
  const used = row?.failCount || 0
  const remaining = Math.max(0, MAX_PASSWORD_ATTEMPTS - used)
  return { remaining, locked: remaining === 0 }
}

/**
 * Şifreyi doğrular ve deneme hakkını düşer. Hak bittiyse şifre HİÇ
 * karşılaştırılmaz (kilit). Başarısız denemeler denetim kaydına yazılır.
 */
export async function verifyRoomPasswordAttempt(
  room: GatedRoom,
  userId: string,
  provided: string,
  ip?: string
): Promise<PasswordCheck> {
  const before = await getRemainingAttempts(room.id, userId)
  if (before.locked) {
    return { ok: false, code: 'PASSWORD_ATTEMPTS_EXHAUSTED', remaining: 0, locked: true }
  }

  const stored = room.password || ''
  const match = !!stored && (await matchesRoomPassword(stored, provided))
  if (match) {
    await prisma.roomPasswordAttempt.deleteMany({ where: { roomId: room.id, userId } }).catch(() => {})
    // Eski düz metin kaydı hash'e çevir (jeton parmak izi yeni değere göre alınır).
    let current = stored
    if (!isHashedPassword(stored)) {
      try {
        const h = await hashRoomPassword(provided)
        await prisma.chatRoom.update({ where: { id: room.id }, data: { password: h } })
        invalidateChatRoomCache(room)
        current = h
      } catch {
        /* hash'e çevrilemedi: düz metin kalır, giriş yine geçerli */
      }
    }
    return { ok: true, storedPassword: current }
  }

  const row = await prisma.roomPasswordAttempt.upsert({
    where: { roomId_userId: { roomId: room.id, userId } },
    update: { failCount: { increment: 1 }, lastAttemptAt: new Date() },
    create: { roomId: room.id, userId, failCount: 1 },
    select: { failCount: true },
  })
  const remaining = Math.max(0, MAX_PASSWORD_ATTEMPTS - row.failCount)
  await recordAudit({
    actorId: userId,
    action: 'room_password_fail',
    targetType: 'ChatRoom',
    targetId: room.id,
    description: `Yanlış oda şifresi (${row.failCount}/${MAX_PASSWORD_ATTEMPTS})`,
    metadata: { remaining },
    ip,
  })
  return {
    ok: false,
    code: remaining === 0 ? 'PASSWORD_ATTEMPTS_EXHAUSTED' : 'INVALID_ROOM_PASSWORD',
    remaining,
    locked: remaining === 0,
  }
}

/**
 * Şifre değişince / kalkınca deneme sayaçları sıfırlanır ve verilmiş giriş
 * izinleri iptal edilir (eski şifreyle alınan izin yeni şifreyi aşmasın).
 */
export async function resetPasswordAttempts(roomId: string): Promise<void> {
  await prisma.roomPasswordAttempt.deleteMany({ where: { roomId } }).catch(() => {})
  await prisma.roomJoinRequest
    .updateMany({ where: { roomId, status: 'accepted' }, data: { status: 'rejected', respondedAt: new Date() } })
    .catch(() => {})
}

export type EntryDecision = {
  ok: boolean
  via?: 'open' | 'bypass' | 'token' | 'approved' | 'password'
  status?: number
  code?: string
  message?: string
  remainingAttempts?: number
  locked?: boolean
}

/**
 * Şifreli VIP odaya (taze) giriş kararı — presence ve join-room ortak kullanır.
 * Sıra: şifre kapısı yok → muaf → imzalı jeton → onaylı giriş izni → şifre.
 */
export async function authorizeVipEntry(params: {
  room: GatedRoom
  userId: string
  globalRole?: string | null
  password?: unknown
  accessToken?: unknown
  ip?: string
}): Promise<EntryDecision> {
  const { room, userId } = params
  if (!isPasswordGatedRoom(room)) return { ok: true, via: 'open' }
  if (await canBypassRoomGate(room, userId, params.globalRole)) return { ok: true, via: 'bypass' }
  if (verifyRoomAccessToken(params.accessToken, room.id, userId, room.password)) return { ok: true, via: 'token' }

  const approved = await prisma.roomJoinRequest.findUnique({
    where: { roomId_requesterId: { roomId: room.id, requesterId: userId } },
    select: { status: true, respondedAt: true },
  })
  if (
    approved?.status === 'accepted' &&
    approved.respondedAt &&
    Date.now() - approved.respondedAt.getTime() < APPROVAL_TTL_MS
  ) {
    return { ok: true, via: 'approved' }
  }

  if (typeof params.password === 'string' && params.password.length > 0) {
    const res = await verifyRoomPasswordAttempt(room, userId, params.password, params.ip)
    if (res.ok) return { ok: true, via: 'password' }
    return {
      ok: false,
      status: 403,
      code: res.code,
      message: res.locked ? 'Giriş hakkınız kalmadı' : `Şifre yanlış. ${res.remaining} hakkınız kaldı.`,
      remainingAttempts: res.remaining,
      locked: res.locked,
    }
  }

  const att = await getRemainingAttempts(room.id, userId)
  return {
    ok: false,
    status: 403,
    code: 'ROOM_PASSWORD_REQUIRED',
    message: 'Bu oda şifrelidir',
    remainingAttempts: att.remaining,
    locked: att.locked,
  }
}
